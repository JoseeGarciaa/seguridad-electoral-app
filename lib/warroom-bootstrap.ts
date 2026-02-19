import { pool } from "@/lib/pg"
import { subscribeWarRoomUpdates } from "@/lib/warroom-events"

type BootstrapUser = {
  role?: string | null
  delegateId?: string | null
  email?: string | null
}

type BootstrapOptions = {
  timeoutMs?: number
  cacheTtlMs?: number
  allowEmptyPayload?: boolean
}

const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 1200
const DEFAULT_BOOTSTRAP_CACHE_TTL_MS = 20_000
const bootstrapCache = new Map<string, { ts: number; payload: ReturnType<typeof emptyBootstrapPayload> }>()
let bootstrapCacheInvalidationSubscribed = false

function ensureBootstrapCacheInvalidation() {
  if (bootstrapCacheInvalidationSubscribed) return
  bootstrapCacheInvalidationSubscribed = true
  subscribeWarRoomUpdates(() => {
    bootstrapCache.clear()
  })
}

function emptyBootstrapPayload() {
  return {
    stats: {
      reports: 0,
      activeDelegates: 0,
      totalLocations: 0,
      reportedLocations: 0,
      coverage: 0,
      lastUpdated: new Date().toISOString(),
    },
    candidates: [],
    parties: [],
    feed: [],
    alerts: [],
    municipalities: [],
    evidences: [],
  }
}

async function safeQuery<T>(queryText: string, params: any[] = [], fallback: T[] = []): Promise<T[]> {
  if (!pool) return fallback
  try {
    const result = await pool.query(queryText, params)
    return result.rows as T[]
  } catch (error: any) {
    if (error?.code === "42P01" || error?.code === "42703") {
      return fallback
    }
    throw error
  }
}

function buildCacheKey(user: BootstrapUser | null, delegateId: string | null) {
  return `${user?.role ?? "anon"}:${delegateId ?? "global"}`
}

async function fetchWarRoomBootstrapData(user: BootstrapUser | null) {
  const payload = emptyBootstrapPayload()

  if (!user || !pool) {
    return payload
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId ?? null : null

  if (isWitness && !delegateId && user.email) {
    try {
      const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
      delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
    } catch (error) {
      console.warn("bootstrap delegate fallback lookup failed", error)
    }
  }

  if (isWitness && !delegateId) {
    return payload
  }

  const nowIso = new Date().toISOString()
  const isAdmin = user.role === "admin"
  const delegateParams = delegateId ? [delegateId] : []

  const statsQuery = delegateId
    ? `
      SELECT
        (SELECT COUNT(*) FROM vote_reports vr WHERE vr.delegate_id = $1) AS reports,
        (SELECT COUNT(DISTINCT delegate_id) FROM delegate_polling_assignments WHERE delegate_id = $1) AS active_delegates,
        (SELECT COUNT(*) FROM delegate_polling_assignments WHERE delegate_id = $1) AS total_locations,
        (SELECT COUNT(DISTINCT polling_station_code) FROM vote_reports vr2 WHERE vr2.delegate_id = $1 AND vr2.polling_station_code IS NOT NULL) AS reported_locations
    `
    : `
      SELECT
        (SELECT COUNT(*) FROM vote_reports) AS reports,
        (SELECT COUNT(DISTINCT delegate_id) FROM delegate_polling_assignments) AS active_delegates,
        (SELECT COUNT(*) FROM delegate_polling_assignments) AS total_locations,
        (SELECT COUNT(DISTINCT delegate_assignment_id) FROM vote_reports WHERE delegate_assignment_id IS NOT NULL) AS reported_locations
    `

  const feedQuery = delegateId
    ? `
      SELECT vr.id,
             COALESCE(d.full_name, 'Delegado') AS user_name,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             COALESCE(vr.municipality, 'Sin municipio') AS municipality,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      WHERE vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 10
    `
    : `
      SELECT vr.id,
             COALESCE(d.full_name, 'Delegado') AS user_name,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             COALESCE(vr.municipality, 'Sin municipio') AS municipality,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 10
    `

  const municipalitiesQuery = delegateId
    ? `
      SELECT
        COALESCE(vr.municipality, 'Sin municipio') AS name,
        COUNT(*)::int AS reported,
        GREATEST(COUNT(*)::int, 1) AS total,
        100::int AS coverage
      FROM vote_reports vr
      WHERE vr.delegate_id = $1
      GROUP BY COALESCE(vr.municipality, 'Sin municipio')
      ORDER BY reported DESC
      LIMIT 24
    `
    : `
      WITH reported AS (
        SELECT COALESCE(municipality, 'Sin municipio') AS municipality,
               COUNT(*)::int AS reported
        FROM vote_reports
        GROUP BY COALESCE(municipality, 'Sin municipio')
      ), assigned AS (
        SELECT COALESCE(municipality, 'Sin municipio') AS municipality,
               COUNT(*)::int AS assigned
        FROM delegate_polling_assignments
        GROUP BY COALESCE(municipality, 'Sin municipio')
      )
      SELECT COALESCE(a.municipality, r.municipality) AS name,
             COALESCE(r.reported, 0) AS reported,
             GREATEST(COALESCE(a.assigned, 0), COALESCE(r.reported, 0), 1) AS total,
             ROUND(
               (COALESCE(r.reported, 0)::numeric / GREATEST(COALESCE(a.assigned, 0), COALESCE(r.reported, 0), 1)) * 100
             )::int AS coverage
      FROM assigned a
      FULL OUTER JOIN reported r ON r.municipality = a.municipality
      ORDER BY coverage DESC NULLS LAST, reported DESC
      LIMIT 24
    `

  const evidencesQuery = delegateId
    ? `
      SELECT vr.id,
             COALESCE(vr.polling_station_code, 'Puesto sin codigo') AS puesto,
             COALESCE(vr.municipality, '') AS municipality,
             COALESCE(vr.address, '') AS address,
             vr.reported_at,
             vr.photo_url,
             COALESCE(d.full_name, 'Delegado') AS delegate_name,
             COALESCE(dpa.polling_station_number, 0) AS mesa_num
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE vr.photo_url IS NOT NULL
        AND vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 12
    `
    : `
      SELECT vr.id,
             COALESCE(vr.polling_station_code, 'Puesto sin codigo') AS puesto,
             COALESCE(vr.municipality, '') AS municipality,
             COALESCE(vr.address, '') AS address,
             vr.reported_at,
             vr.photo_url,
             COALESCE(d.full_name, 'Delegado') AS delegate_name,
             COALESCE(dpa.polling_station_number, 0) AS mesa_num
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE vr.photo_url IS NOT NULL
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 12
    `

  const alertsQuery = delegateId
    ? `
      SELECT e.id,
             e.title,
             e.description,
             e.uploaded_at,
             e.tags,
             COALESCE(d.full_name, 'Delegado') AS delegate_name
      FROM evidences e
      LEFT JOIN delegates d ON d.id = e.uploaded_by_id
      WHERE e.type = 'alert'
        AND LOWER(COALESCE(e.status, 'open')) NOT IN ('resolved', 'verified')
        AND ($1::boolean OR NOT (COALESCE(e.tags, '{}'::text[]) @> ARRAY['audience:admin']::text[]))
        AND e.uploaded_by_id = $2
      ORDER BY e.uploaded_at DESC
      LIMIT 8
    `
    : `
      SELECT e.id,
             e.title,
             e.description,
             e.uploaded_at,
             e.tags,
             COALESCE(d.full_name, 'Delegado') AS delegate_name
      FROM evidences e
      LEFT JOIN delegates d ON d.id = e.uploaded_by_id
      WHERE e.type = 'alert'
        AND LOWER(COALESCE(e.status, 'open')) NOT IN ('resolved', 'verified')
        AND ($1::boolean OR NOT (COALESCE(e.tags, '{}'::text[]) @> ARRAY['audience:admin']::text[]))
      ORDER BY e.uploaded_at DESC
      LIMIT 8
    `

  const candidateQuery = delegateId
    ? `
      SELECT c.id, c.full_name, c.party, c.color, SUM(vd.votes)::bigint AS votes
      FROM vote_details vd
      JOIN vote_reports vr ON vr.id = vd.vote_report_id
      JOIN candidates c ON c.id = vd.candidate_id
      WHERE vr.delegate_id = $1
      GROUP BY c.id, c.full_name, c.party, c.color
      ORDER BY votes DESC
      LIMIT 8
    `
    : `
      SELECT c.id, c.full_name, c.party, c.color, SUM(vd.votes)::bigint AS votes
      FROM vote_details vd
      JOIN candidates c ON c.id = vd.candidate_id
      GROUP BY c.id, c.full_name, c.party, c.color
      ORDER BY votes DESC
      LIMIT 8
    `

  const partyVotesQuery = delegateId
    ? `
      WITH party_candidate AS (
        SELECT COALESCE(c.party, 'Sin partido') AS party,
               SUM(vd.votes)::bigint AS candidate_votes
        FROM vote_details vd
        JOIN vote_reports vr ON vr.id = vd.vote_report_id
        JOIN candidates c ON c.id = vd.candidate_id
        WHERE vr.delegate_id = $1
        GROUP BY COALESCE(c.party, 'Sin partido')
      ), party_list AS (
        SELECT COALESCE(vpd.party, 'Sin partido') AS party,
               SUM(vpd.votes)::bigint AS list_votes
        FROM vote_party_details vpd
        JOIN vote_reports vr ON vr.id = vpd.vote_report_id
        WHERE vr.delegate_id = $1
        GROUP BY COALESCE(vpd.party, 'Sin partido')
      )
      SELECT COALESCE(pc.party, pl.party) AS party,
             COALESCE(pc.candidate_votes, 0) AS candidate_votes,
             COALESCE(pl.list_votes, 0) AS list_votes
      FROM party_candidate pc
      FULL OUTER JOIN party_list pl ON pl.party = pc.party
      ORDER BY (COALESCE(pc.candidate_votes, 0) + COALESCE(pl.list_votes, 0)) DESC
      LIMIT 8
    `
    : `
      WITH party_candidate AS (
        SELECT COALESCE(c.party, 'Sin partido') AS party,
               SUM(vd.votes)::bigint AS candidate_votes
        FROM vote_details vd
        JOIN candidates c ON c.id = vd.candidate_id
        GROUP BY COALESCE(c.party, 'Sin partido')
      ), party_list AS (
        SELECT COALESCE(vpd.party, 'Sin partido') AS party,
               SUM(vpd.votes)::bigint AS list_votes
        FROM vote_party_details vpd
        GROUP BY COALESCE(vpd.party, 'Sin partido')
      )
      SELECT COALESCE(pc.party, pl.party) AS party,
             COALESCE(pc.candidate_votes, 0) AS candidate_votes,
             COALESCE(pl.list_votes, 0) AS list_votes
      FROM party_candidate pc
      FULL OUTER JOIN party_list pl ON pl.party = pc.party
      ORDER BY (COALESCE(pc.candidate_votes, 0) + COALESCE(pl.list_votes, 0)) DESC
      LIMIT 8
    `

  const partyTopCandidatesQuery = delegateId
    ? `
      WITH party_votes AS (
        SELECT COALESCE(c.party, 'Sin partido') AS party,
               c.id,
               c.full_name,
               SUM(vd.votes)::bigint AS votes
        FROM vote_details vd
        JOIN vote_reports vr ON vr.id = vd.vote_report_id
        JOIN candidates c ON c.id = vd.candidate_id
        WHERE vr.delegate_id = $1
        GROUP BY COALESCE(c.party, 'Sin partido'), c.id, c.full_name
      ), ranked AS (
        SELECT party,
               id,
               full_name,
               votes,
               ROW_NUMBER() OVER (PARTITION BY party ORDER BY votes DESC) AS row_num,
               COUNT(*) OVER (PARTITION BY party) AS candidate_count
        FROM party_votes
      )
      SELECT party, id, full_name, votes, candidate_count
      FROM ranked
      WHERE row_num <= 3
      ORDER BY party ASC, votes DESC
    `
    : `
      WITH party_votes AS (
        SELECT COALESCE(c.party, 'Sin partido') AS party,
               c.id,
               c.full_name,
               SUM(vd.votes)::bigint AS votes
        FROM vote_details vd
        JOIN candidates c ON c.id = vd.candidate_id
        GROUP BY COALESCE(c.party, 'Sin partido'), c.id, c.full_name
      ), ranked AS (
        SELECT party,
               id,
               full_name,
               votes,
               ROW_NUMBER() OVER (PARTITION BY party ORDER BY votes DESC) AS row_num,
               COUNT(*) OVER (PARTITION BY party) AS candidate_count
        FROM party_votes
      )
      SELECT party, id, full_name, votes, candidate_count
      FROM ranked
      WHERE row_num <= 3
      ORDER BY party ASC, votes DESC
    `

  const alertsParams = delegateId ? [isAdmin, delegateId] : [isAdmin]

  try {
    const [statsRows, feedRows, municipalityRows, evidenceRows, alertRows, candidateRows, partyRows, partyTopRows] = await Promise.all([
      safeQuery<any>(statsQuery, delegateParams),
      safeQuery<any>(feedQuery, delegateParams),
      safeQuery<any>(municipalitiesQuery, delegateParams),
      safeQuery<any>(evidencesQuery, delegateParams),
      safeQuery<any>(alertsQuery, alertsParams),
      safeQuery<any>(candidateQuery, delegateParams),
      safeQuery<any>(partyVotesQuery, delegateParams),
      safeQuery<any>(partyTopCandidatesQuery, delegateParams),
    ])

    const statsRow = statsRows[0] ?? {}
    const reports = Number(statsRow.reports ?? 0)
    const activeDelegates = Number(statsRow.active_delegates ?? 0)
    const totalLocations = Number(statsRow.total_locations ?? 0)
    const reportedLocations = Number(statsRow.reported_locations ?? 0)
    const reportedForCoverage = isAdmin ? reports : reportedLocations

    payload.stats = {
      reports,
      activeDelegates,
      totalLocations,
      reportedLocations,
      coverage: totalLocations > 0 ? Math.round((reportedForCoverage / totalLocations) * 100) : 0,
      lastUpdated: nowIso,
    }

    payload.feed = feedRows.map((row) => {
      const reportedAt = row.reported_at ? new Date(row.reported_at as string).toISOString() : nowIso
      return {
        id: String(row.id ?? `${reportedAt}-${row.location}`),
        user: String(row.user_name ?? "Delegado"),
        action: "Acta subida",
        location: `${String(row.location ?? "Puesto")}${row.municipality ? ` · ${String(row.municipality)}` : ""}`,
        reportedAt,
        type: "evidence" as const,
      }
    })

    payload.municipalities = municipalityRows.map((row) => {
      const coverage = Number(row.coverage ?? 0)
      const status = coverage >= 85 ? "green" : coverage >= 50 ? "yellow" : "red"
      return {
        name: String(row.name ?? "Sin municipio"),
        coverage,
        reported: Number(row.reported ?? 0),
        total: Number(row.total ?? 0),
        status,
      }
    })

    payload.evidences = evidenceRows.map((row) => {
      const reportedAt = row.reported_at ? new Date(row.reported_at as string).toISOString() : nowIso
      return {
        id: String(row.id ?? `${row.puesto}-${reportedAt}`),
        puesto: String(row.puesto ?? "Puesto"),
        mesa: row.mesa_num ? `Mesa ${row.mesa_num}` : String(row.address ?? row.municipality ?? ""),
        user: String(row.delegate_name ?? "Delegado"),
        time: reportedAt,
        status: "verified" as const,
        photoUrl: (row.photo_url as string | null) ?? null,
      }
    })

    payload.alerts = alertRows.map((row, index) => {
      const tags = Array.isArray(row.tags) ? (row.tags as string[]) : []
      const levelTag = tags.find((tag) => typeof tag === "string" && tag.startsWith("level:"))
      const levelValue = levelTag?.split(":")[1]?.toLowerCase() ?? "alta"
      const severity = levelValue === "crítica" ? "critical" : levelValue === "alta" ? "warning" : "info"
      const detail = String(row.description ?? "").trim()
      const reportedBy = String(row.delegate_name ?? "Delegado")

      return {
        id: String(row.id ?? `bootstrap-alert-${index}`),
        severity,
        title: String(row.title ?? "Alerta manual"),
        message: detail || `Alerta manual registrada por ${reportedBy}`,
        time: row.uploaded_at ? new Date(row.uploaded_at as string).toISOString() : nowIso,
        status: "abierta" as const,
        category: "alerta",
      }
    })

    const totalCandidateVotes = candidateRows.reduce((acc, row) => acc + Number(row.votes ?? 0), 0)
    payload.candidates = candidateRows.map((row) => {
      const votes = Number(row.votes ?? 0)
      return {
        id: String(row.id),
        name: String(row.full_name ?? ""),
        party: (row.party as string | null) ?? null,
        votes,
        percentage: totalCandidateVotes === 0 ? 0 : Number(((votes / totalCandidateVotes) * 100).toFixed(1)),
        color: (row.color as string | null) ?? null,
      }
    })

    const partyTopMap = new Map<string, { candidateCount: number; topCandidates: Array<{ id: string; name: string; votes: number }> }>()
    for (const row of partyTopRows) {
      const partyName = String(row.party ?? "Sin partido")
      const existing = partyTopMap.get(partyName) ?? { candidateCount: 0, topCandidates: [] }
      existing.candidateCount = Math.max(existing.candidateCount, Number(row.candidate_count ?? 0))
      existing.topCandidates.push({
        id: String(row.id),
        name: String(row.full_name ?? "Candidato"),
        votes: Number(row.votes ?? 0),
      })
      partyTopMap.set(partyName, existing)
    }

    const totalPartyVotes = partyRows.reduce(
      (acc, row) => acc + Number(row.candidate_votes ?? 0) + Number(row.list_votes ?? 0),
      0,
    )
    payload.parties = partyRows.map((row) => {
      const partyName = String(row.party ?? "Sin partido")
      const candidateVotes = Number(row.candidate_votes ?? 0)
      const listVotes = Number(row.list_votes ?? 0)
      const totalVotes = candidateVotes + listVotes
      const top = partyTopMap.get(partyName)

      return {
        party: partyName,
        candidateVotes,
        listVotes,
        totalVotes,
        percentage: totalPartyVotes === 0 ? 0 : Number(((totalVotes / totalPartyVotes) * 100).toFixed(1)),
        candidateCount: top?.candidateCount ?? 0,
        topCandidates: (top?.topCandidates ?? []).sort((a, b) => b.votes - a.votes).slice(0, 3),
      }
    })

  } catch (error: any) {
    if (error?.code !== "42P01" && error?.code !== "42703") {
      console.error("warroom bootstrap error", error)
    }
  }

  return payload
}

export async function getWarRoomBootstrapData(user: BootstrapUser | null, options: BootstrapOptions = {}) {
  ensureBootstrapCacheInvalidation()

  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(250, Math.trunc(options.timeoutMs!)) : DEFAULT_BOOTSTRAP_TIMEOUT_MS
  const requestedCacheTtlMs = Number.isFinite(options.cacheTtlMs) ? Math.max(0, Math.trunc(options.cacheTtlMs!)) : DEFAULT_BOOTSTRAP_CACHE_TTL_MS
  const cacheTtlMs = user?.role === "admin" ? 0 : requestedCacheTtlMs
  const allowEmptyPayload = options.allowEmptyPayload ?? true

  const delegateId = user?.delegateId ?? null
  const cacheKey = buildCacheKey(user, delegateId)
  const cached = bootstrapCache.get(cacheKey)
  const now = Date.now()

  if (cacheTtlMs > 0 && cached && now - cached.ts < cacheTtlMs) {
    return cached.payload
  }

  const timeoutPromise = new Promise<ReturnType<typeof emptyBootstrapPayload> | null>((resolve) => {
    setTimeout(() => {
      resolve(cached?.payload ?? (allowEmptyPayload ? emptyBootstrapPayload() : null))
    }, timeoutMs)
  })

  const fetchPromise = fetchWarRoomBootstrapData(user)
    .then((payload) => {
      if (cacheTtlMs > 0) {
        bootstrapCache.set(cacheKey, { ts: Date.now(), payload })
      }
      return payload
    })
    .catch((error) => {
      console.warn("warroom bootstrap fetch fallback", error)
      return cached?.payload ?? (allowEmptyPayload ? emptyBootstrapPayload() : null)
    })

  return Promise.race([fetchPromise, timeoutPromise])
}

export function warmWarRoomBootstrapData(user: BootstrapUser | null) {
  void getWarRoomBootstrapData(user, { timeoutMs: 2_500, allowEmptyPayload: true })
}