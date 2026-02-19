import { NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"
import { subscribeWarRoomUpdates } from "@/lib/warroom-events"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CACHE_TTL_MS = 30_000
const cache = new Map<string, { ts: number; payload: { candidates: any[]; parties: any[] } }>()
let cacheInvalidationSubscribed = false

function ensureCandidatesCacheInvalidation() {
  if (cacheInvalidationSubscribed) return
  cacheInvalidationSubscribed = true
  subscribeWarRoomUpdates(() => {
    cache.clear()
  })
}

async function safeQuery<T>(
  queryText: string,
  params: any[] = [],
  fallback: T[] = [],
): Promise<T[]> {
  if (!pool) return fallback
  try {
    const result = await pool.query(queryText, params)
    return result.rows as T[]
  } catch (err: any) {
    if (err?.code === "42P01" || err?.code === "42703" || err?.code === "57014") {
      return fallback
    }
    console.warn("warroom candidates query fallback", err)
    return fallback
  }
}

export async function GET(req: Request) {
  ensureCandidatesCacheInvalidation()

  const url = new URL(req.url)
  const realtimeMode = url.searchParams.get("realtime") === "1"

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ candidates: [], parties: [] })
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }

  if (isWitness && !delegateId) {
    return NextResponse.json({ candidates: [], parties: [] })
  }

  const cacheKey = `${user.role}:${delegateId ?? "global"}`
  const cached = cache.get(cacheKey)
  if (!realtimeMode && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload)
  }

  const delegateParams = delegateId ? [delegateId] : []

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

  try {
    const [candidateRows, partyCandidateRows, partyListRows, partyCandidateDetailRows] = await Promise.all([
      safeQuery<any>(candidateQuery, delegateParams),
      safeQuery<any>(partyCandidateQuery, delegateParams),
      safeQuery<any>(partyListVoteQuery, delegateParams),
      safeQuery<any>(partyCandidateDetailQuery, delegateParams),
    ])

    const totalVotes = candidateRows.reduce((acc, row) => acc + Number(row.votes ?? 0), 0)
    const candidates = candidateRows.map((row) => ({
      id: String(row.id),
      name: (row.full_name as string) ?? "",
      party: (row.party as string) ?? null,
      votes: Number(row.votes ?? 0),
      percentage: totalVotes === 0 ? 0 : Number(((Number(row.votes ?? 0) / totalVotes) * 100).toFixed(1)),
      color: (row.color as string) ?? null,
    }))

    const partyMap = new Map<string, { party: string; candidateVotes: number; listVotes: number; candidateCount: number; candidates: { id: string; name: string; votes: number }[] }>()

    for (const row of partyCandidateRows) {
      const partyName = ((row.party as string) ?? "Sin partido").trim() || "Sin partido"
      const existing = partyMap.get(partyName)
      if (existing) {
        existing.candidateVotes = Number(row.candidate_votes ?? 0)
      } else {
        partyMap.set(partyName, {
          party: partyName,
          candidateVotes: Number(row.candidate_votes ?? 0),
          listVotes: 0,
          candidateCount: 0,
          candidates: [],
        })
      }
    }

    for (const row of partyListRows) {
      const partyName = ((row.party as string) ?? "Sin partido").trim() || "Sin partido"
      const existing = partyMap.get(partyName)
      if (existing) {
        existing.listVotes = Number(row.list_votes ?? 0)
      } else {
        partyMap.set(partyName, {
          party: partyName,
          candidateVotes: 0,
          listVotes: Number(row.list_votes ?? 0),
          candidateCount: 0,
          candidates: [],
        })
      }
    }

    for (const row of partyCandidateDetailRows) {
      const partyName = ((row.party as string) ?? "Sin partido").trim() || "Sin partido"
      const existing = partyMap.get(partyName)
      const candidateRecord = {
        id: String(row.id),
        name: ((row.full_name as string) ?? "Candidato").trim() || "Candidato",
        votes: Number(row.votes ?? 0),
      }
      if (existing) {
        existing.candidateCount = Math.max(existing.candidateCount, Number(row.candidate_count ?? 0))
        existing.candidates.push(candidateRecord)
      } else {
        partyMap.set(partyName, {
          party: partyName,
          candidateVotes: 0,
          listVotes: 0,
          candidateCount: Number(row.candidate_count ?? 0),
          candidates: [candidateRecord],
        })
      }
    }

    const totalPartyVotes = Array.from(partyMap.values()).reduce(
      (acc, row) => acc + row.candidateVotes + row.listVotes,
      0,
    )

    const parties = Array.from(partyMap.values())
      .map((row) => {
        const total = row.candidateVotes + row.listVotes
        const topCandidates = row.candidates
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 3)
        return {
          party: row.party,
          candidateVotes: row.candidateVotes,
          listVotes: row.listVotes,
          totalVotes: total,
          percentage: totalPartyVotes === 0 ? 0 : Number(((total / totalPartyVotes) * 100).toFixed(1)),
          candidateCount: row.candidateCount || row.candidates.length,
          topCandidates,
        }
      })
      .sort((a, b) => b.totalVotes - a.totalVotes)

    const payload = { candidates, parties }
    if (!realtimeMode) {
      cache.set(cacheKey, { ts: Date.now(), payload })
    }

    return NextResponse.json(payload)
  } catch (err: any) {
    console.error("warroom candidates error", err)
    if (err?.code === "42P01" || err?.code === "42703") {
      return NextResponse.json({ candidates: [], parties: [] })
    }
    return NextResponse.json({ error: "No se pudo cargar comparativo" }, { status: 500 })
  }
}
