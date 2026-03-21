import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"
import { subscribeWarRoomUpdates } from "@/lib/warroom-events"
import { buildOfficialComparison } from "@/lib/mesa-fact"

export const dynamic = "force-dynamic"
export const revalidate = 0

let warRoomIndexesEnsured = false
const WARROOM_CACHE_TTL_MS = 30_000
const WARROOM_STALE_CACHE_FAST_MS = 120_000
const WARROOM_QUERY_TIMEOUT_MS = 1_800

type WarRoomPayload = {
  stats: {
    reports: number
    activeDelegates: number
    totalLocations: number
    reportedLocations: number
    coverage: number
    lastUpdated: string
  }
  candidates: any[]
  parties: any[]
  feed: any[]
  alerts: any[]
  municipalities: any[]
  evidences: any[]
}

const warRoomPayloadCache = new Map<string, { ts: number; payload: WarRoomPayload }>()
let cacheInvalidationSubscribed = false

function ensureRealtimeCacheInvalidation() {
  if (cacheInvalidationSubscribed) return
  cacheInvalidationSubscribed = true
  subscribeWarRoomUpdates(() => {
    warRoomPayloadCache.clear()
  })
}

async function ensureWarRoomIndexes() {
  if (!pool || warRoomIndexesEnsured) return

  await Promise.all([
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_reports_reported_created ON vote_reports (reported_at DESC, created_at DESC)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_reports_delegate_reported_created ON vote_reports (delegate_id, reported_at DESC, created_at DESC)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_reports_delegate_station ON vote_reports (delegate_id, polling_station_code)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_reports_municipality ON vote_reports (municipality)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_details_report_candidate ON vote_details (vote_report_id, candidate_id)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_party_details_report ON vote_party_details (vote_report_id)`),
    pool.query(`CREATE INDEX IF NOT EXISTS idx_delegate_assignments_delegate ON delegate_polling_assignments (delegate_id)`),
  ])

  warRoomIndexesEnsured = true
}

function emptyPayload(): WarRoomPayload {
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

async function safeQuery<T>(
  queryText: string,
  params: any[] = [],
  fallback: T[] = [],
): Promise<T[]> {
  if (!pool) return fallback
  try {
    const result = await pool.query({
      text: queryText,
      values: params,
    } as any)
    return (result as any).rows as T[]
  } catch (err: any) {
    if (err?.code === "42P01" || err?.code === "42703" || err?.code === "57014") {
      return fallback
    }
    console.warn("warroom query fallback", err)
    return fallback
  }
}

export async function GET(req: NextRequest) {
  ensureRealtimeCacheInvalidation()

  const realtimeMode = req.nextUrl.searchParams.get("realtime") === "1"

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }
  if (isWitness && !delegateId) {
    return NextResponse.json(emptyPayload())
  }

  const cacheKey = `${user.role}:${delegateId ?? "global"}`
  const now = Date.now()
  const cached = warRoomPayloadCache.get(cacheKey)
  if (!realtimeMode && cached && now - cached.ts < WARROOM_CACHE_TTL_MS) {
    return NextResponse.json(cached.payload)
  }

  const fastMode = req.nextUrl.searchParams.get("fast") === "1"
  if (fastMode) {
    if (cached && now - cached.ts < WARROOM_STALE_CACHE_FAST_MS) {
      return NextResponse.json(cached.payload)
    }
    return NextResponse.json(emptyPayload())
  }

  const delegateParams = delegateId ? [delegateId] : []
  const enableVoteRangeAlerts = true

  if (!warRoomIndexesEnsured) {
    void ensureWarRoomIndexes().catch((err) => {
      console.error("warroom index init error", err)
    })
  }

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

  const partyCandidateQuery = delegateId
    ? `
      SELECT COALESCE(c.party, 'Sin partido') AS party,
             SUM(vd.votes)::bigint AS candidate_votes
      FROM vote_details vd
      JOIN vote_reports vr ON vr.id = vd.vote_report_id
      JOIN candidates c ON c.id = vd.candidate_id
      WHERE vr.delegate_id = $1
      GROUP BY COALESCE(c.party, 'Sin partido')
      ORDER BY candidate_votes DESC
    `
    : `
      SELECT COALESCE(c.party, 'Sin partido') AS party,
             SUM(vd.votes)::bigint AS candidate_votes
      FROM vote_details vd
      JOIN candidates c ON c.id = vd.candidate_id
      GROUP BY COALESCE(c.party, 'Sin partido')
      ORDER BY candidate_votes DESC
    `

  const partyListVoteQuery = delegateId
    ? `
      SELECT COALESCE(vpd.party, 'Sin partido') AS party,
             SUM(vpd.votes)::bigint AS list_votes
      FROM vote_party_details vpd
      JOIN vote_reports vr ON vr.id = vpd.vote_report_id
      WHERE vr.delegate_id = $1
      GROUP BY COALESCE(vpd.party, 'Sin partido')
      ORDER BY list_votes DESC
    `
    : `
      SELECT COALESCE(vpd.party, 'Sin partido') AS party,
             SUM(vpd.votes)::bigint AS list_votes
      FROM vote_party_details vpd
      GROUP BY COALESCE(vpd.party, 'Sin partido')
      ORDER BY list_votes DESC
    `

  const partyCandidateDetailQuery = delegateId
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

  const feedQuery = delegateId
    ? `
      SELECT vr.id, COALESCE(d.full_name, 'Delegado') AS user_name, vr.municipality, vr.department,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      WHERE vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 20
    `
    : `
      SELECT vr.id, COALESCE(d.full_name, 'Delegado') AS user_name, vr.municipality, vr.department,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 20
    `

  const municipalitiesQuery = delegateId
    ? `
      WITH reported AS (
        SELECT COALESCE(municipality, 'Sin municipio') AS municipality,
               COUNT(*)::int AS reported
        FROM vote_reports
        WHERE delegate_id = $1
        GROUP BY COALESCE(municipality, 'Sin municipio')
      ), assigned AS (
        SELECT COALESCE(municipality, 'Sin municipio') AS municipality,
               COUNT(*)::int AS assigned
        FROM delegate_polling_assignments
        WHERE delegate_id = $1
        GROUP BY COALESCE(municipality, 'Sin municipio')
      )
      SELECT COALESCE(a.municipality, r.municipality) AS name,
             COALESCE(r.reported, 0) AS reported,
             GREATEST(COALESCE(a.assigned, 0), COALESCE(r.reported, 0), 1) AS total,
             ROUND(
               (
                 COALESCE(r.reported, 0)::numeric
                 / GREATEST(COALESCE(a.assigned, 0), COALESCE(r.reported, 0), 1)
               ) * 100
             ) AS coverage
      FROM assigned a
      FULL OUTER JOIN reported r ON r.municipality = a.municipality
      ORDER BY coverage DESC NULLS LAST, reported DESC
      LIMIT 60
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
               (
                 COALESCE(r.reported, 0)::numeric
                 / GREATEST(COALESCE(a.assigned, 0), COALESCE(r.reported, 0), 1)
               ) * 100
             ) AS coverage
      FROM assigned a
      FULL OUTER JOIN reported r ON r.municipality = a.municipality
      ORDER BY coverage DESC NULLS LAST, reported DESC
      LIMIT 60
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
      WHERE vr.photo_url IS NOT NULL AND vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 24
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
      LIMIT 24
    `

  const missingPhotoQuery = delegateId
    ? `SELECT COUNT(*) AS missing_photo FROM vote_reports WHERE delegate_id = $1 AND photo_url IS NULL`
    : `SELECT COUNT(*) AS missing_photo FROM vote_reports WHERE photo_url IS NULL`

  const voteRangeAlertsQuery = delegateId
    ? `
      WITH recent_reports AS (
        SELECT
          vr.id,
          vr.total_votes,
          vr.polling_station_code,
          vr.municipality,
          vr.department,
          vr.reported_at,
          vr.created_at,
          a.polling_station,
          a.polling_station_number
        FROM vote_reports vr
        LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
        WHERE vr.delegate_id = $1
        ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
        LIMIT 80
      )
      SELECT
        rr.id,
        rr.total_votes,
        rr.polling_station_code,
        rr.municipality,
        rr.reported_at,
        mf.votantes,
        mf.votantes AS total_oficial
      FROM recent_reports rr
      LEFT JOIN LATERAL (
        SELECT *
        FROM mesa_fact mf
        WHERE REGEXP_REPLACE(LOWER(TRIM(mf.puesto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(COALESCE(NULLIF(rr.polling_station_code, ''), rr.polling_station))), '\\s+', ' ', 'g')
        AND (
          NULLIF(TRIM(COALESCE(rr.department, '')), '') IS NULL
          OR REGEXP_REPLACE(LOWER(TRIM(mf.depto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(rr.department)), '\\s+', ' ', 'g')
        )
        AND (
          NULLIF(TRIM(COALESCE(rr.municipality, '')), '') IS NULL
          OR REGEXP_REPLACE(LOWER(TRIM(mf.municipio)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(rr.municipality)), '\\s+', ' ', 'g')
        )
        AND mf.mesa = COALESCE(
          rr.polling_station_number,
          CASE WHEN rr.polling_station_code ~ '^[0-9]+$' THEN rr.polling_station_code::int ELSE NULL END
        )
        ORDER BY mf.mesaid
        LIMIT 1
      ) mf ON true
      ORDER BY rr.reported_at DESC NULLS LAST, rr.created_at DESC
    `
    : `
      WITH recent_reports AS (
        SELECT
          vr.id,
          vr.total_votes,
          vr.polling_station_code,
          vr.municipality,
          vr.department,
          vr.reported_at,
          vr.created_at,
          a.polling_station,
          a.polling_station_number
        FROM vote_reports vr
        LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
        ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
        LIMIT 80
      )
      SELECT
        rr.id,
        rr.total_votes,
        rr.polling_station_code,
        rr.municipality,
        rr.reported_at,
        mf.votantes,
        mf.votantes AS total_oficial
      FROM recent_reports rr
      LEFT JOIN LATERAL (
        SELECT *
        FROM mesa_fact mf
        WHERE REGEXP_REPLACE(LOWER(TRIM(mf.puesto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(COALESCE(NULLIF(rr.polling_station_code, ''), rr.polling_station))), '\\s+', ' ', 'g')
        AND (
          NULLIF(TRIM(COALESCE(rr.department, '')), '') IS NULL
          OR REGEXP_REPLACE(LOWER(TRIM(mf.depto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(rr.department)), '\\s+', ' ', 'g')
        )
        AND (
          NULLIF(TRIM(COALESCE(rr.municipality, '')), '') IS NULL
          OR REGEXP_REPLACE(LOWER(TRIM(mf.municipio)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(rr.municipality)), '\\s+', ' ', 'g')
        )
        AND mf.mesa = COALESCE(
          rr.polling_station_number,
          CASE WHEN rr.polling_station_code ~ '^[0-9]+$' THEN rr.polling_station_code::int ELSE NULL END
        )
        ORDER BY mf.mesaid
        LIMIT 1
      ) mf ON true
      ORDER BY rr.reported_at DESC NULLS LAST, rr.created_at DESC
    `

  const manualAlertsQuery = delegateId
    ? `
      SELECT e.id,
             e.title,
             e.description,
             e.uploaded_at,
             e.tags,
             e.status,
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
             e.status,
             COALESCE(d.full_name, 'Delegado') AS delegate_name
      FROM evidences e
      LEFT JOIN delegates d ON d.id = e.uploaded_by_id
      WHERE e.type = 'alert'
        AND LOWER(COALESCE(e.status, 'open')) NOT IN ('resolved', 'verified')
        AND ($1::boolean OR NOT (COALESCE(e.tags, '{}'::text[]) @> ARRAY['audience:admin']::text[]))
      ORDER BY e.uploaded_at DESC
      LIMIT 8
    `

  const manualAlertParams = delegateId ? [user.role === "admin", delegateId] : [user.role === "admin"]

  try {
    const [
      statsRows,
      feedRows,
      evidenceRows,
      photoMissRows,
      voteRangeRows,
      manualAlertsRows,
    ] = await Promise.all([
      safeQuery<any>(statsQuery, delegateParams),
      safeQuery<any>(feedQuery, delegateParams),
      safeQuery<any>(evidencesQuery, delegateParams),
      safeQuery<any>(missingPhotoQuery, delegateParams),
      enableVoteRangeAlerts
        ? safeQuery<any>(voteRangeAlertsQuery, delegateParams)
        : Promise.resolve([]),
      safeQuery<any>(manualAlertsQuery, manualAlertParams),
    ])

    let muniRows = await safeQuery<any>(municipalitiesQuery, delegateParams)
    if (muniRows.length === 0) {
      const fallbackMunicipalities = delegateId
        ? `
          SELECT municipality AS name,
                 COUNT(*) AS reported,
                 COUNT(*) AS total,
                 100 AS coverage
          FROM vote_reports
          WHERE delegate_id = $1
          GROUP BY municipality
          ORDER BY reported DESC
          LIMIT 60
        `
        : `
          SELECT municipality AS name,
                 COUNT(*) AS reported,
                 COUNT(*) AS total,
                 100 AS coverage
          FROM vote_reports
          GROUP BY municipality
          ORDER BY reported DESC
          LIMIT 60
        `
      muniRows = await safeQuery<any>(fallbackMunicipalities, delegateParams)
    }

    const municipalityMap = new Map<string, { name: string; reported: number; total: number }>()
    for (const row of muniRows) {
      const rawName = String(row.name ?? "").trim()
      const name = rawName.length > 0 ? rawName : "Sin municipio"
      const key = name.toLowerCase()
      const reported = Number(row.reported ?? 0)
      const total = Number(row.total ?? 0)
      const current = municipalityMap.get(key)
      if (!current) {
        municipalityMap.set(key, { name, reported, total })
        continue
      }
      municipalityMap.set(key, {
        name: current.name,
        reported: Math.max(current.reported, reported),
        total: Math.max(current.total, total),
      })
    }

    const uniqueMunicipalityRows = Array.from(municipalityMap.values()).map((row) => ({
      ...row,
      coverage: row.total === 0 ? 0 : Math.round((row.reported / row.total) * 100),
    }))

    const statsRow = statsRows[0] ?? {}
    const derivedReportedLocations = uniqueMunicipalityRows.reduce((acc, row) => acc + Number(row.reported ?? 0), 0)
    const derivedTotalLocations = uniqueMunicipalityRows.reduce((acc, row) => acc + Number(row.total ?? 0), 0)
    const reportCount = Number(statsRow?.reports ?? 0) || derivedReportedLocations
    const safeReportedLocations = Number(statsRow?.reported_locations ?? 0) || derivedReportedLocations
    const safeTotalLocations = Number(statsRow?.total_locations ?? 0) || derivedTotalLocations
    const reportedForCoverage = user.role === "admin" ? reportCount : safeReportedLocations
    const statsPayload = {
      reports: reportCount,
      activeDelegates: Number(statsRow?.active_delegates ?? 0),
      totalLocations: safeTotalLocations,
      reportedLocations: safeReportedLocations,
      coverage:
        safeTotalLocations === 0
          ? 0
          : Math.round((reportedForCoverage / safeTotalLocations) * 100),
      lastUpdated: new Date().toISOString(),
    }

    const candidates: Array<{
      id: string
      name: string
      party: string | null
      votes: number
      percentage: number
      color: string | null
    }> = []

    const parties: Array<{
      party: string
      candidateVotes: number
      listVotes: number
      totalVotes: number
      percentage: number
      candidateCount: number
      topCandidates: Array<{ id: string; name: string; votes: number }>
    }> = []

    const feedMap = new Map<string, {
      id: string
      user: string
      action: string
      location: string
      reportedAt: string
      type: "evidence"
    }>()
    for (const row of feedRows) {
      const id = String(row.id ?? "")
      const location = `${row.location ?? "Puesto"} · ${row.municipality ?? ""}`
      const reportedAt = row.reported_at ? new Date(row.reported_at as string).toISOString() : new Date().toISOString()
      const key = id || `${reportedAt}::${location}::${String(row.user_name ?? "Delegado")}`
      const nextItem = {
        id: id || key,
        user: (row.user_name as string) ?? "Delegado",
        action: "Acta subida",
        location,
        reportedAt,
        type: "evidence" as const,
      }
      const current = feedMap.get(key)
      if (!current) {
        feedMap.set(key, nextItem)
        continue
      }
      if (new Date(nextItem.reportedAt).getTime() > new Date(current.reportedAt).getTime()) {
        feedMap.set(key, nextItem)
      }
    }
    const feed = Array.from(feedMap.values())
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .slice(0, 20)

    const municipalities = uniqueMunicipalityRows.map((row) => {
      const coverage = Number(row.coverage ?? 0)
      const status: "green" | "yellow" | "red" = coverage >= 85 ? "green" : coverage >= 50 ? "yellow" : "red"
      return {
        name: (row.name as string) ?? "",
        coverage,
        reported: Number(row.reported ?? 0),
        total: Number(row.total ?? 0),
        status,
      }
    })

    const evidencesMap = new Map<string, {
      id: string
      puesto: string
      mesa: string
      user: string
      time: string
      status: "verified"
      photoUrl: string | null
    }>()
    for (const row of evidenceRows) {
      const id = String(row.id ?? "")
      const puesto = (row.puesto as string) ?? "Puesto"
      const mesa = row.mesa_num ? `Mesa ${row.mesa_num}` : row.address || row.municipality || ""
      const time = row.reported_at ? new Date(row.reported_at as string).toISOString() : new Date().toISOString()
      const nextItem = {
        id: id || `${puesto}::${mesa}::${time}`,
        puesto,
        mesa,
        user: (row.delegate_name as string) ?? "Delegado",
        time,
        status: "verified" as const,
        photoUrl: (row.photo_url as string) ?? null,
      }
      const key = id || `${puesto.toLowerCase()}::${mesa.toLowerCase()}::${time}`
      const current = evidencesMap.get(key)
      if (!current) {
        evidencesMap.set(key, nextItem)
        continue
      }
      const currentTs = new Date(current.time).getTime()
      const nextTs = new Date(nextItem.time).getTime()
      if (nextTs > currentTs || (!current.photoUrl && !!nextItem.photoUrl)) {
        evidencesMap.set(key, nextItem)
      }
    }
    const evidences = Array.from(evidencesMap.values())
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 24)

    const missingPhoto = Number(photoMissRows[0]?.missing_photo ?? 0)
    const lowCoverageAlerts = municipalities
      .filter((m) => m.coverage < 50)
      .slice(0, 5)
      .map((m, idx) => ({
        id: `low-${idx}`,
        severity: "critical" as const,
        title: "Cobertura critica",
        message: `${m.name} con ${m.coverage}% de cobertura (${m.reported}/${m.total})`,
        time: statsPayload.lastUpdated,
      }))

    const warningCoverageAlerts = municipalities
      .filter((m) => m.coverage >= 50 && m.coverage < 85)
      .slice(0, 5)
      .map((m, idx) => ({
        id: `warn-${idx}`,
        severity: "warning" as const,
        title: "Cobertura media",
        message: `${m.name} con ${m.coverage}% de cobertura`,
        time: statsPayload.lastUpdated,
      }))

    const photoAlerts = missingPhoto > 0
      ? [
          {
            id: "photo-missing",
            severity: "warning" as const,
            title: "Reportes sin foto",
            message: missingPhoto.toString() + " reportes sin evidencia fotografica",
            time: statsPayload.lastUpdated,
          },
        ]
      : []

    const manualAlerts = manualAlertsRows
      .map((row, idx) => {
        const tags = Array.isArray(row.tags) ? (row.tags as string[]) : []
        const levelTag = tags.find((tag) => typeof tag === "string" && tag.startsWith("level:"))
        const levelValue = levelTag?.split(":")[1]?.toLowerCase() ?? "alta"
        const severity = levelValue === "crítica" ? "critical" : levelValue === "alta" ? "warning" : "info"
        const detail = String(row.description ?? "").trim()
        const reporter = String(row.delegate_name ?? "Delegado")

        return {
          id: String(row.id ?? `manual-${idx}`),
          severity,
          title: String(row.title ?? "Alerta manual"),
          message: detail || `Alerta manual registrada por ${reporter}`,
          time: row.uploaded_at ? new Date(row.uploaded_at as string).toISOString() : statsPayload.lastUpdated,
          status: "abierta" as const,
          category: "alerta",
        }
      })
      .slice(0, 8)

    const voteRangeAlerts = voteRangeRows
      .flatMap((row, idx) => {
        const totalReported = Number(row.total_votes ?? 0)
        const totalOficial = row.total_oficial === null || row.total_oficial === undefined ? null : Number(row.total_oficial)
        const votantes = row.votantes === null || row.votantes === undefined ? null : Number(row.votantes)
        const comparison = buildOfficialComparison(totalReported, totalOficial, votantes)

        if (!comparison.hasOfficialData) return []
        if (!comparison.outOfExpectedRange && !comparison.overVoting) return []

        const severity = comparison.overVoting || comparison.increaseAlert ? "critical" as const : "warning" as const
        const title = comparison.increaseAlert
          ? "Incremento de votación"
          : comparison.decreaseAlert
            ? "Disminución de votación"
            : "Sobrevotación"

        return [{
          id: `vote-range-${idx}-${row.id}`,
          severity,
          title,
          message: `Mesa ${row.polling_station_code ?? "Sin código"} · Reportado ${comparison.totalReported} · Oficial ${comparison.totalOficial} · Rango ±5% ${comparison.expectedMin}-${comparison.expectedMax}`,
          time: row.reported_at ? new Date(row.reported_at as string).toISOString() : statsPayload.lastUpdated,
        }]
      })
      .slice(0, 6)

    const alerts = [...manualAlerts, ...voteRangeAlerts, ...lowCoverageAlerts, ...warningCoverageAlerts, ...photoAlerts]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)

    const payload = {
      stats: statsPayload,
      candidates,
      parties,
      feed,
      alerts,
      municipalities,
      evidences,
    }

    if (!realtimeMode) {
      warRoomPayloadCache.set(cacheKey, { ts: Date.now(), payload })
    }
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error("warroom error", err)
    if (err?.code === "42P01" || err?.code === "42703") {
      return NextResponse.json(emptyPayload())
    }
    return NextResponse.json({ error: "No se pudo cargar War Room" }, { status: 500 })
  }
}
