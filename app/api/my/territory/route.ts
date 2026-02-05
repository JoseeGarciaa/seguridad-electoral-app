import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"

type Feature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    id: string
    departamento: string
    municipio: string
    puesto: string
    direccion: string | null
    mesas: number
    total: number
    hombres: number
    mujeres: number
    dd?: string | null
    mm?: string | null
    pp?: string | null
    delegateAssigned?: boolean
  }
}

type Row = {
  report_id: string
  assignment_id: string | null
  departamento: string | null
  municipio: string | null
  puesto: string | null
  direccion: string | null
  mesas: number | null
  total: number | null
  hombres: number | null
  mujeres: number | null
  latitud: number | null
  longitud: number | null
  dd: string | null
  mm: string | null
  pp: string | null
  polling_station: string | null
  polling_station_number: number | null
  report_department: string | null
  report_municipality: string | null
  report_address: string | null
  report_polling_station_code: string | null
  total_votes: number | null
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = user.role === "admin"
  const isDelegate = user.role === "delegate" || user.role === "witness"
  if (!isAdmin && !isDelegate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!pool) {
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0 } })
  }

  let delegateId = user.delegateId
  if (!delegateId && isDelegate && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }
  if (isDelegate && !delegateId) {
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0 } })
  }

  const query = `
    SELECT vr.id AS report_id,
           dpa.id AS assignment_id,
           dl.departamento,
           dl.municipio,
           dl.puesto,
           dl.direccion,
           dl.mesas,
           dl.total,
           dl.hombres,
           dl.mujeres,
           dl.latitud,
           dl.longitud,
           dl.dd,
           dl.mm,
           dl.pp,
           dpa.polling_station,
           dpa.polling_station_number,
           vr.department AS report_department,
           vr.municipality AS report_municipality,
           vr.address AS report_address,
           vr.polling_station_code AS report_polling_station_code,
           vr.total_votes
    FROM vote_reports vr
    LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
    LEFT JOIN divipole_locations dl ON dl.id = dpa.divipole_location_id
    WHERE ($1::uuid IS NULL OR vr.delegate_id = $1)
    ORDER BY COALESCE(dl.municipio, vr.municipality), COALESCE(dl.puesto, dpa.polling_station, vr.polling_station_code)
  `

  const { rows } = await pool.query<Row>(query, [isAdmin ? null : delegateId])

  const features: Feature[] = rows.map((row) => {
    const mesasCount = Number(row.mesas ?? row.polling_station_number ?? 1)
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(row.longitud ?? 0), Number(row.latitud ?? 0)] as [number, number],
      },
      properties: {
        id: row.report_id,
        departamento: row.departamento ?? row.report_department ?? "",
        municipio: row.municipio ?? row.report_municipality ?? "",
        puesto: row.puesto ?? row.polling_station ?? row.report_polling_station_code ?? "Puesto reportado",
        direccion: row.direccion ?? row.report_address ?? null,
        mesas: mesasCount,
        total: Number(row.total_votes ?? 0),
        hombres: Number(row.hombres ?? 0),
        mujeres: Number(row.mujeres ?? 0),
        dd: row.dd,
        mm: row.mm,
        pp: row.pp,
        delegateAssigned: true,
      },
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.total_puestos += 1
      const mesasCount = Number(row.mesas ?? row.polling_station_number ?? 1)
      acc.total_mesas += mesasCount
      if (row.latitud !== null && row.longitud !== null) acc.with_coords += 1
      acc.total_votes += Number(row.total_votes ?? 0)
      return acc
    },
    { total_puestos: 0, total_mesas: 0, with_coords: 0, total_votes: 0 }
  )
  return NextResponse.json({ features, totals })
}
