import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"
import { subscribeWarRoomUpdates } from "@/lib/warroom-events"
import { buildOfficialComparison, ensureMesaFactLookupIndex } from "@/lib/mesa-fact"

const VOTE_REPORTS_CACHE_TTL_MS = 20_000
const voteReportsCache = new Map<string, { ts: number; payload: any }>()
let voteReportsIndexEnsured = false
let voteReportsCacheInvalidationSubscribed = false

const NON_PREFERENTIAL_PARTIES = ["colombia renaciente", "pacto historico", "centro democratico"]

const normalizeText = (value: string | null | undefined) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const isSyntheticPartyCandidate = (detail: { fullName?: string | null; party?: string | null; position?: string | null }) => {
  const partyName = normalizeText(detail.party)
  if (!partyName) return false
  if (NON_PREFERENTIAL_PARTIES.some((party) => partyName.includes(party))) return false
  const positionName = normalizeText(detail.position)
  if (positionName !== "citrep" && positionName !== "camara de representantes") return false
  return normalizeText(detail.fullName) === partyName
}

function clearVoteReportsCache() {
  voteReportsCache.clear()
}

function ensureVoteReportsCacheInvalidation() {
  if (voteReportsCacheInvalidationSubscribed) return
  voteReportsCacheInvalidationSubscribed = true
  subscribeWarRoomUpdates((payload) => {
    if (!payload?.type || payload.type === "votes" || payload.type === "evidence" || payload.type === "assignment") {
      clearVoteReportsCache()
    }
  })
}

export async function GET(req: Request) {
  ensureVoteReportsCacheInvalidation()

  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return Response.json({ error: "DB no disponible" }, { status: 503 })
  }

  let delegateId = user.delegateId
  if ((user.role === "delegate" || user.role === "witness") && !delegateId && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }

  if ((user.role === "delegate" || user.role === "witness") && !delegateId) {
    return Response.json({ error: "Perfil de testigo incompleto" }, { status: 403 })
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  const where = isWitness ? "WHERE vr.delegate_id = $1" : ""
  const params = isWitness ? [delegateId] : []
  const cacheKey = `${user.id}:${user.role}:${delegateId ?? "global"}`

  const cached = voteReportsCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < VOTE_REPORTS_CACHE_TTL_MS) {
    return Response.json(cached.payload)
  }

  const query = `
    SELECT
      vr.id,
      vr.delegate_id,
      vr.delegate_assignment_id,
      COALESCE(d.full_name, 'Delegado') AS delegate_name,
      a.polling_station_number,
      vr.polling_station_code,
      vr.department,
      vr.municipality,
      vr.address,
      vr.total_votes,
      vr.reported_at,
      vr.notes,
      mf.votantes AS official_votantes,
      mf.total_oficial AS official_total_oficial,
      json_agg(
        json_build_object(
          'candidateId', c.id,
          'fullName', c.full_name,
          'party', c.party,
          'position', c.position,
          'ballotNumber', c.ballot_number,
          'color', c.color,
          'votes', vd.votes
        )
        ORDER BY c.position, c.ballot_number NULLS LAST, c.full_name
      ) FILTER (WHERE vd.candidate_id IS NOT NULL) AS details
    FROM vote_reports vr
    LEFT JOIN delegates d ON d.id = vr.delegate_id
    LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
    LEFT JOIN LATERAL (
      SELECT
        mf.votantes,
        mf.votantes AS total_oficial
      FROM mesa_fact mf
      WHERE REGEXP_REPLACE(LOWER(TRIM(mf.puesto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station))), '\\s+', ' ', 'g')
      AND (
        NULLIF(TRIM(COALESCE(vr.department, '')), '') IS NULL
        OR REGEXP_REPLACE(LOWER(TRIM(mf.depto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(vr.department)), '\\s+', ' ', 'g')
      )
      AND (
        NULLIF(TRIM(COALESCE(vr.municipality, '')), '') IS NULL
        OR REGEXP_REPLACE(LOWER(TRIM(mf.municipio)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(vr.municipality)), '\\s+', ' ', 'g')
      )
      AND mf.mesa = COALESCE(
        a.polling_station_number,
        CASE WHEN vr.polling_station_code ~ '^[0-9]+$' THEN vr.polling_station_code::int ELSE NULL END
      )
      ORDER BY mf.mesaid
      LIMIT 1
    ) mf ON true
    LEFT JOIN vote_details vd ON vd.vote_report_id = vr.id
    LEFT JOIN candidates c ON c.id = vd.candidate_id
    ${where}
    GROUP BY vr.id, d.full_name, a.polling_station_number, mf.votantes, mf.total_oficial
    ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
    LIMIT 300
  `

  try {
    if (!voteReportsIndexEnsured) {
      voteReportsIndexEnsured = true
      void ensureMesaFactLookupIndex().catch((error) => {
        voteReportsIndexEnsured = false
        console.warn("vote-reports mesa_fact index ensure failed", error)
      })
    }
    const { rows } = await pool.query(query, params)
    const payload = {
      items: rows.map((row: any) => ({
        ...(() => {
          const totalVotes = Number(row.total_votes ?? 0)
          const totalOficial = row.official_total_oficial === null || row.official_total_oficial === undefined
            ? null
            : Number(row.official_total_oficial)
          const votantes = row.official_votantes === null || row.official_votantes === undefined
            ? null
            : Number(row.official_votantes)

          return {
            officialComparison: buildOfficialComparison(totalVotes, totalOficial, votantes),
          }
        })(),
        id: row.id as string,
        delegateId: row.delegate_id as string | null,
        assignmentId: row.delegate_assignment_id as string | null,
        delegateName: row.delegate_name as string | null,
        tableNumber: row.polling_station_number !== null && row.polling_station_number !== undefined
          ? Number(row.polling_station_number)
          : null,
        pollingStation: row.polling_station_code as string | null,
        department: row.department as string | null,
        municipality: row.municipality as string | null,
        address: row.address as string | null,
        totalVotes: Number(row.total_votes ?? 0),
        reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : null,
        notes: row.notes as string | null,
        details: Array.isArray(row.details)
          ? row.details.filter(Boolean).map((detail: any) => ({
              ...detail,
              ballotNumber: isSyntheticPartyCandidate(detail) ? null : detail.ballotNumber,
            }))
          : [],
      })),
      viewerRole: user.role,
    }
    voteReportsCache.set(cacheKey, { ts: Date.now(), payload })
    return Response.json(payload)
  } catch (error: any) {
    console.error("vote-reports list error", error)
    return Response.json({ error: "No se pudo cargar reportes" }, { status: 500 })
  }
}
