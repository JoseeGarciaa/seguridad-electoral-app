import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
import { pool } from "@/lib/pg"

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const reportId = params?.id
  if (!reportId || !isUuid(reportId)) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 })
  }

  const session = await requireSession(req, ["delegate", "admin", "leader"])
  if (session.error) return session.error

  const user = session.user!
  if (user.role === "delegate" && !user.delegateId) {
    return NextResponse.json({ error: "Perfil de testigo incompleto" }, { status: 403 })
  }

  const where = user.role === "delegate" ? "vr.id = $1 AND vr.delegate_id = $2" : "vr.id = $1"
  const values = user.role === "delegate" ? [reportId, user.delegateId] : [reportId]

  try {
    const reportRes = await pool.query(
      `SELECT vr.id, vr.delegate_id, vr.delegate_assignment_id, vr.polling_station_code, vr.department, vr.municipality, vr.address,
              vr.total_votes, vr.reported_at, vr.notes
         FROM vote_reports vr
        WHERE ${where}
        LIMIT 1`,
      values,
    )

    if (!reportRes.rowCount) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 })
    }

    const detailsRes = await pool.query(
      `SELECT vd.candidate_id, vd.votes,
              c.full_name, c.party, c.position, c.ballot_number, c.color
         FROM vote_details vd
         JOIN candidates c ON c.id = vd.candidate_id
        WHERE vd.vote_report_id = $1
        ORDER BY c.position, c.ballot_number NULLS LAST, c.full_name`,
      [reportId],
    )

    const photosRes = await pool.query(
      `SELECT e.id, e.title, e.url, e.status, e.uploaded_at, e.municipality, e.polling_station,
              e.uploaded_by_id, COALESCE(d.full_name, 'Delegado') AS uploaded_by
         FROM evidences e
         LEFT JOIN delegates d ON d.id = e.uploaded_by_id
        WHERE e.vote_report_id = $1
        ORDER BY e.uploaded_at DESC`,
      [reportId],
    )

    const row = reportRes.rows[0]

    return NextResponse.json({
      id: row.id as string,
      pollingStation: (row.polling_station_code as string) ?? null,
      department: (row.department as string) ?? null,
      municipality: (row.municipality as string) ?? null,
      address: (row.address as string) ?? null,
      totalVotes: Number(row.total_votes ?? 0),
      reportedAt: row.reported_at as string,
      notes: (row.notes as string) ?? null,
      details: detailsRes.rows.map((r) => ({
        candidateId: r.candidate_id as string,
        votes: Number(r.votes ?? 0),
        fullName: (r.full_name as string) ?? null,
        party: (r.party as string) ?? null,
        position: (r.position as string) ?? null,
        ballotNumber: r.ballot_number === null || r.ballot_number === undefined ? null : Number(r.ballot_number),
        color: (r.color as string) ?? null,
      })),
      photos: photosRes.rows.map((r) => ({
        id: r.id as string,
        title: (r.title as string) ?? "Foto",
        url: r.url as string,
        status: r.status as string,
        uploadedAt: r.uploaded_at as string,
        municipality: (r.municipality as string) ?? null,
        pollingStation: (r.polling_station as string) ?? null,
        uploadedBy: (r.uploaded_by as string) ?? null,
        uploadedById: (r.uploaded_by_id as string) ?? null,
      })),
    })
  } catch (error: any) {
    console.error("vote-report detail error", error)
    return NextResponse.json({ error: "No se pudo cargar el reporte" }, { status: 500 })
  }
}