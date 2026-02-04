import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/auth"
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
  assignment_id: string
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
  delegate_polling_station_code: string | null
  delegate_polling_station_number: number | null
  delegate_municipality: string | null
  delegate_department: string | null
  delegate_address: string | null
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["delegate"])
  if (auth.error) return auth.error

  if (!pool) {
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0 } })
  }

  const delegateId = auth.user!.delegateId
  if (!delegateId) {
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0 } })
  }

  const query = `
    SELECT dpa.id AS assignment_id,
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
           del.polling_station_code AS delegate_polling_station_code,
           del.polling_station_number AS delegate_polling_station_number,
           del.municipality AS delegate_municipality,
           del.department AS delegate_department,
           del.address AS delegate_address
    FROM delegate_polling_assignments dpa
    LEFT JOIN divipole_locations dl ON dl.id = dpa.divipole_location_id
    LEFT JOIN delegates del ON del.id = dpa.delegate_id
    WHERE dpa.delegate_id = $1
    ORDER BY COALESCE(dl.municipio, del.municipality), COALESCE(dl.puesto, dpa.polling_station, del.polling_station_code)
  `

  const { rows } = await pool.query<Row>(query, [delegateId])

  // Si no hay asignaciones formales, intenta usar los datos básicos del delegado para mostrar su puesto/mesa
  if (rows.length === 0) {
    const delegateRow = await pool.query<{
      id: string
      department: string | null
      municipality: string | null
      address: string | null
      polling_station_code: string | null
      polling_station_number: number | null
    }>(
      `SELECT id, department, municipality, address, polling_station_code, polling_station_number
       FROM delegates WHERE id = $1`,
      [delegateId]
    )

    const d = delegateRow.rows[0]
    if (d) {
      const mesasCount = Number(d.polling_station_number ?? 1)
      const fallbackFeature: Feature = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {
          id: delegateId,
          departamento: d.department ?? "",
          municipio: d.municipality ?? "",
          puesto: d.polling_station_code ?? "Puesto asignado",
          direccion: d.address,
          mesas: mesasCount,
          total: 0,
          hombres: 0,
          mujeres: 0,
          delegateAssigned: true,
        },
      }
      return NextResponse.json({
        features: [fallbackFeature],
        totals: { total_puestos: 1, total_mesas: mesasCount, with_coords: 0 },
      })
    }
  }

  let features: Feature[] = rows.map((row) => {
    const mesasCount = Number(row.mesas ?? row.polling_station_number ?? row.delegate_polling_station_number ?? 1)
    return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [Number(row.longitud ?? 0), Number(row.latitud ?? 0)] as [number, number],
    },
    properties: {
      id: row.assignment_id,
      departamento: row.departamento ?? row.delegate_department ?? "",
      municipio: row.municipio ?? row.delegate_municipality ?? "",
      puesto:
        row.puesto ??
        row.polling_station ??
        row.delegate_polling_station_code ??
        "Puesto asignado",
      direccion: row.direccion ?? row.delegate_address ?? null,
      mesas: mesasCount,
      total: Number(row.total ?? 0),
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
      const mesasCount = Number(row.mesas ?? row.polling_station_number ?? row.delegate_polling_station_number ?? 1)
      acc.total_mesas += mesasCount
      if (row.latitud !== null && row.longitud !== null) acc.with_coords += 1
      return acc
    },
    { total_puestos: 0, total_mesas: 0, with_coords: 0 }
  )

  // Si seguimos sin features útiles, vuelve a usar el delegado como fuente
  if (features.length === 0 || totals.total_puestos === 0) {
    const delegateRow = await pool.query<{
      id: string
      department: string | null
      municipality: string | null
      address: string | null
      polling_station_code: string | null
      polling_station_number: number | null
    }>(
      `SELECT id, department, municipality, address, polling_station_code, polling_station_number
       FROM delegates WHERE id = $1`,
      [delegateId]
    )

    const d = delegateRow.rows[0]
    if (d) {
      const mesasCount = Number(d.polling_station_number ?? 1)
      features = [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {
            id: delegateId,
            departamento: d.department ?? "",
            municipio: d.municipality ?? "",
            puesto: d.polling_station_code ?? "Puesto asignado",
            direccion: d.address,
            mesas: mesasCount,
            total: 0,
            hombres: 0,
            mujeres: 0,
            delegateAssigned: true,
          },
        },
      ]
      return NextResponse.json({ features, totals: { total_puestos: 1, total_mesas: mesasCount, with_coords: 0 } })
    }
  }

  return NextResponse.json({ features, totals })
}
