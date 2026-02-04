import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: Request) {
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

  const query = `
    SELECT
      vr.id,
      vr.delegate_id,
      vr.delegate_assignment_id,
      vr.polling_station_code,
      vr.department,
      vr.municipality,
      vr.address,
      vr.total_votes,
      vr.reported_at,
      vr.notes,
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
    LEFT JOIN vote_details vd ON vd.vote_report_id = vr.id
    LEFT JOIN candidates c ON c.id = vd.candidate_id
    ${where}
    GROUP BY vr.id
    ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
    LIMIT 300
  `

  try {
    const { rows } = await pool.query(query, params)
    return Response.json({
      items: rows.map((row: any) => ({
        id: row.id as string,
        delegateId: row.delegate_id as string | null,
        assignmentId: row.delegate_assignment_id as string | null,
        pollingStation: row.polling_station_code as string | null,
        department: row.department as string | null,
        municipality: row.municipality as string | null,
        address: row.address as string | null,
        totalVotes: Number(row.total_votes ?? 0),
        reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : null,
        notes: row.notes as string | null,
        details: Array.isArray(row.details) ? row.details.filter(Boolean) : [],
      })),
    })
  } catch (error: any) {
    console.error("vote-reports list error", error)
    return Response.json({ error: "No se pudo cargar reportes" }, { status: 500 })
  }
}
