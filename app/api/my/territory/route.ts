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
    votersPerMesa?: number | null
    delegateAssigned?: boolean
    delegateName?: string | null
    delegateEmail?: string | null
    delegatePhone?: string | null
    hasCoords?: boolean
    reportedMesas?: number
  }
}

type Row = {
  id: string
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
  zz: string | null
  comuna: string | null
  assignment_id: string | null
  delegate_id: string | null
  delegate_name: string | null
  delegate_email: string | null
  delegate_phone: string | null
  reported_mesas: number | null
}

type TotalsRow = {
  total_puestos: number
  total_mesas: number
  with_coords: number
  total_voters: number
  reported_mesas: number
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
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0 } })
  }

  let delegateId = user.delegateId
  if (!delegateId && isDelegate && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }
  if (isDelegate && !delegateId) {
    return NextResponse.json({ features: [], totals: { total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0 } })
  }

  const url = new URL(req.url)
  const departmentFilter = url.searchParams.get("department")
  const municipalityFilter = url.searchParams.get("municipality")
  const search = url.searchParams.get("search")
  const limitParam = Number(url.searchParams.get("limit") ?? 15000)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1000), 50000) : 15000

  // Algunos despliegues no tienen la columna divipole_location_id en delegate_polling_assignments; evitar romper si falta.
  const divipoleColumnCheck = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments' AND column_name = 'divipole_location_id' LIMIT 1`,
  )
  const hasDivipoleLocationId = divipoleColumnCheck.rows.length > 0

  const conditions: string[] = []
  const values: Array<string | number | null> = []
  let delegateParamIndex: number | null = null

  if (departmentFilter) {
    values.push(departmentFilter)
    conditions.push(`LOWER(dl.departamento) = LOWER($${values.length})`)
  }
  if (municipalityFilter) {
    values.push(municipalityFilter)
    conditions.push(`LOWER(dl.municipio) = LOWER($${values.length})`)
  }
  if (search) {
    values.push(`%${search}%`)
    const idx = values.length
    conditions.push(
      `(` +
        `LOWER(dl.puesto) LIKE LOWER($${idx}) OR ` +
        `LOWER(dl.municipio) LIKE LOWER($${idx}) OR ` +
        `LOWER(dl.departamento) LIKE LOWER($${idx}) OR ` +
        `LOWER(dl.direccion) LIKE LOWER($${idx})` +
      `)`,
    )
  }

  if (!isAdmin) {
    values.push(delegateId)
    delegateParamIndex = values.length
    conditions.push(`la.delegate_id = $${values.length}`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const reportsCte = hasDivipoleLocationId
    ? `reports AS (
      SELECT COALESCE(vr.divipole_location_id, dpa.divipole_location_id) AS divipole_location_id,
             COUNT(*)::int AS reported_mesas
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE COALESCE(vr.divipole_location_id, dpa.divipole_location_id) IS NOT NULL
      ${delegateParamIndex ? `AND vr.delegate_id = $${delegateParamIndex}` : ""}
      GROUP BY COALESCE(vr.divipole_location_id, dpa.divipole_location_id)
    )`
    : `reports AS (
      SELECT LOWER(COALESCE(vr.polling_station_code, dpa.polling_station)) AS polling_station_lower,
             COUNT(*)::int AS reported_mesas
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE COALESCE(vr.polling_station_code, dpa.polling_station) IS NOT NULL
      ${delegateParamIndex ? `AND vr.delegate_id = $${delegateParamIndex}` : ""}
      GROUP BY LOWER(COALESCE(vr.polling_station_code, dpa.polling_station))
    )`

  const assignmentsCte = `
    WITH latest_assignments AS (
      SELECT DISTINCT ON (${hasDivipoleLocationId ? "divipole_location_id" : "LOWER(polling_station)"})
        id,
        delegate_id,
        polling_station,
        polling_station_number,
        ${hasDivipoleLocationId ? "divipole_location_id" : "LOWER(polling_station) AS polling_station_lower"},
        updated_at,
        created_at
      FROM delegate_polling_assignments
      WHERE ${hasDivipoleLocationId ? "divipole_location_id IS NOT NULL" : "polling_station IS NOT NULL"}
      ${delegateParamIndex ? `AND delegate_id = $${delegateParamIndex}` : ""}
      ORDER BY ${hasDivipoleLocationId ? "divipole_location_id" : "LOWER(polling_station)"}, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    ${reportsCte}
  `

  const assignmentJoin = isAdmin
    ? `LEFT JOIN latest_assignments la ON ${hasDivipoleLocationId ? "dl.id = la.divipole_location_id" : "(LOWER(dl.puesto) = la.polling_station_lower OR LOWER(dl.pp) = la.polling_station_lower)"}`
    : `JOIN latest_assignments la ON ${hasDivipoleLocationId ? "dl.id = la.divipole_location_id" : "(LOWER(dl.puesto) = la.polling_station_lower OR LOWER(dl.pp) = la.polling_station_lower)"}`

  const featuresQuery = `
    ${assignmentsCte}
    SELECT dl.id,
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
           dl.zz,
           dl.comuna,
           la.id AS assignment_id,
           del.id AS delegate_id,
           del.full_name AS delegate_name,
           del.email AS delegate_email,
           del.phone AS delegate_phone,
           ${hasDivipoleLocationId ? "COALESCE(rep.reported_mesas, 0)::int" : "COALESCE(rep.reported_mesas, 0)::int"} AS reported_mesas
      FROM divipole_locations dl
      ${assignmentJoin}
      LEFT JOIN delegates del ON del.id = la.delegate_id
         ${hasDivipoleLocationId
           ? "LEFT JOIN reports rep ON rep.divipole_location_id = dl.id"
           : "LEFT JOIN reports rep ON rep.polling_station_lower IS NOT NULL AND (rep.polling_station_lower = LOWER(dl.puesto) OR rep.polling_station_lower = LOWER(dl.pp))"}
      ${whereClause}
      ORDER BY dl.departamento, dl.municipio, dl.puesto
      LIMIT $${values.length + 1}
  `

  const totalsQuery = `
    ${assignmentsCte}
    SELECT COUNT(*)::int AS total_puestos,
           COALESCE(SUM(dl.mesas), 0)::int AS total_mesas,
           COALESCE(SUM(CASE WHEN dl.latitud IS NOT NULL AND dl.longitud IS NOT NULL AND (dl.latitud <> 0 OR dl.longitud <> 0) THEN 1 ELSE 0 END), 0)::int AS with_coords,
           COALESCE(SUM(dl.total), 0)::int AS total_voters,
           ${hasDivipoleLocationId ? "COALESCE(SUM(rep.reported_mesas), 0)::int" : "COALESCE(SUM(rep.reported_mesas), 0)::int"} AS reported_mesas
      FROM divipole_locations dl
      ${assignmentJoin}
         ${hasDivipoleLocationId
           ? "LEFT JOIN reports rep ON rep.divipole_location_id = dl.id"
           : "LEFT JOIN reports rep ON rep.polling_station_lower IS NOT NULL AND (rep.polling_station_lower = LOWER(dl.puesto) OR rep.polling_station_lower = LOWER(dl.pp))"}
      ${whereClause}
  `

  const client = await pool.connect()
  try {
    await client.query("SET statement_timeout TO 5000")
    const [featuresResult, totalsResult] = await Promise.all([
      client.query<Row>(featuresQuery, [...values, limit]),
      client.query<TotalsRow>(totalsQuery, values),
    ])

    const rows = featuresResult.rows
    const totalsRow = totalsResult.rows[0]

  const features: Feature[] = rows.map((row) => {
    const mesasCount = Number(row.mesas ?? 0)
    const totalVoters = Number(row.total ?? 0)
    const votersPerMesa = mesasCount > 0 ? totalVoters / mesasCount : null

    const hasCoords = row.latitud !== null && row.longitud !== null && (Number(row.latitud) !== 0 || Number(row.longitud) !== 0)

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(row.longitud ?? 0), Number(row.latitud ?? 0)] as [number, number],
      },
      properties: {
        id: String(row.id),
        departamento: row.departamento ?? "",
        municipio: row.municipio ?? "",
        puesto: row.puesto ?? "",
        direccion: row.direccion ?? null,
        mesas: mesasCount,
        total: totalVoters,
        hombres: Number(row.hombres ?? 0),
        mujeres: Number(row.mujeres ?? 0),
        dd: row.dd,
        mm: row.mm,
        pp: row.pp,
        votersPerMesa,
        delegateAssigned: Boolean(row.delegate_id),
        delegateName: row.delegate_name,
        delegateEmail: row.delegate_email,
        delegatePhone: row.delegate_phone,
        hasCoords,
        reportedMesas: Number(row.reported_mesas ?? 0),
      },
    }
  })

    const totals = totalsRow
      ? {
          total_puestos: Number(totalsRow.total_puestos ?? 0),
          total_mesas: Number(totalsRow.total_mesas ?? 0),
          with_coords: Number(totalsRow.with_coords ?? 0),
          total_voters: Number(totalsRow.total_voters ?? 0),
          reported_mesas: Number(totalsRow.reported_mesas ?? 0),
        }
      : rows.reduce(
          (acc, row) => {
            acc.total_puestos += 1
            const mesasCount = Number(row.mesas ?? 0)
            const totalVoters = Number(row.total ?? 0)
            const hasCoords = row.latitud !== null && row.longitud !== null && (Number(row.latitud) !== 0 || Number(row.longitud) !== 0)
            const reportedMesas = Number((row as any).reported_mesas ?? 0)
            acc.total_mesas += mesasCount
            acc.with_coords += hasCoords ? 1 : 0
            acc.total_voters += totalVoters
            acc.reported_mesas += reportedMesas
            return acc
          },
          { total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0, reported_mesas: 0 },
        )

    return NextResponse.json({ features, totals })
  } finally {
    try {
      await client.query("SET statement_timeout TO DEFAULT")
    } catch (err) {
      console.error("territory reset timeout error", err)
    }
    client.release()
  }
}
