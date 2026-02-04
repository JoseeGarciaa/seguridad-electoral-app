import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
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

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let delegateId = user.delegateId
  if ((user.role === "delegate" || user.role === "witness") && !delegateId && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }

  if ((user.role === "delegate" || user.role === "witness") && !delegateId) {
    return NextResponse.json({ error: "Perfil de testigo incompleto" }, { status: 403 })
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  const where = isWitness ? "vr.id = $1 AND vr.delegate_id = $2" : "vr.id = $1"
  const values = isWitness ? [reportId, delegateId] : [reportId]

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

    let photosRes = { rows: [] as any[] }
    try {
      photosRes = await pool.query(
        `SELECT e.id, e.title, e.url, e.status, e.uploaded_at, e.municipality, e.polling_station,
                e.uploaded_by_id, COALESCE(d.full_name, 'Delegado') AS uploaded_by
           FROM evidences e
           LEFT JOIN delegates d ON d.id = e.uploaded_by_id
          WHERE e.vote_report_id = $1
          ORDER BY e.uploaded_at DESC`,
        [reportId],
      )
    } catch (err: any) {
      if (err?.code !== "42P01") throw err
    }

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
      photos: (photosRes.rows.length ? photosRes.rows.map((r) => ({
        id: r.id as string,
        title: (r.title as string) ?? "Foto",
        url: r.url as string,
        status: r.status as string,
        uploadedAt: r.uploaded_at as string,
        municipality: (r.municipality as string) ?? null,
        pollingStation: (r.polling_station as string) ?? null,
        uploadedBy: (r.uploaded_by as string) ?? null,
        uploadedById: (r.uploaded_by_id as string) ?? null,
      })) : (row.photo_url ? [{
        id: row.id as string,
        title: "E14",
        url: row.photo_url as string,
        status: "pending",
        uploadedAt: row.reported_at as string,
        municipality: (row.municipality as string) ?? null,
        pollingStation: (row.polling_station_code as string) ?? null,
        uploadedBy: null,
        uploadedById: null,
      }] : [])),
    })
  } catch (error: any) {
    console.error("vote-report detail error", error)
    return NextResponse.json({ error: "No se pudo cargar el reporte" }, { status: 500 })
  }
}