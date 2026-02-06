import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, DELEGATE_ROLE } from "@/lib/auth"
import { pool } from "@/lib/pg"

let hasAssignmentDivipole: boolean | null = null

async function ensureAssignmentDivipoleColumn(): Promise<boolean> {
  if (hasAssignmentDivipole !== null) return hasAssignmentDivipole
  const res = await pool!.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'delegate_polling_assignments'
        AND column_name = 'divipole_location_id'
      LIMIT 1`,
  )
  hasAssignmentDivipole = Boolean(res.rowCount)
  return hasAssignmentDivipole
}

const fallbackData = {
  items: [
    { id: "DEMO-ASSIGN-1", label: "PU-12 · Mesa 3", municipio: "Bogotá", total_voters: 0 },
    { id: "DEMO-ASSIGN-2", label: "PU-12 · Mesa 4", municipio: "Bogotá", total_voters: 0 },
  ] as Array<{ id: string; label: string; municipio?: string | null; total_voters?: number | null }>,
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let delegateId = user.delegateId
  // Allow any session that has a delegateId (some environments store role as "witness")
  if (!delegateId && pool && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }
  if (!delegateId) {
    return NextResponse.json({ error: "Perfil de testigo electoral incompleto" }, { status: 403 })
  }

  if (!pool) {
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }

  const includeDivipole = await ensureAssignmentDivipoleColumn()
  const query = includeDivipole
    ? `
      SELECT
        a.id,
        COALESCE(a.polling_station, dl.puesto) AS polling_station,
        a.polling_station_number,
        COALESCE(dl.municipio, d.municipality) AS municipality,
        COALESCE(dl.departamento, d.department) AS department,
        dl.total AS total_voters,
        dl.direccion AS address
      FROM delegate_polling_assignments a
      JOIN delegates d ON d.id = a.delegate_id
      LEFT JOIN divipole_locations dl ON dl.id = a.divipole_location_id
      WHERE a.delegate_id = $1
      ORDER BY COALESCE(a.polling_station, dl.puesto), a.polling_station_number
    `
    : `
      SELECT a.id,
             a.polling_station,
             a.polling_station_number,
             d.municipality AS municipality,
             d.department AS department,
             NULL::int AS total_voters,
             NULL::text AS address
      FROM delegate_polling_assignments a
      JOIN delegates d ON d.id = a.delegate_id
      WHERE a.delegate_id = $1
      ORDER BY a.polling_station, a.polling_station_number
    `

  const client = await pool.connect()
  try {
    const { rows } = await client.query(query, [delegateId])
    const items = rows.map((row) => {
      const station = (row.polling_station as string | null) ?? "Puesto asignado"
      const mesaNum = row.polling_station_number === null || row.polling_station_number === undefined
        ? ""
        : `Mesa ${row.polling_station_number}`
      const label = mesaNum ? `${station} · ${mesaNum}` : station
      return {
        id: String(row.id),
        label,
        municipio: (row.municipality as string | null) ?? null,
        department: (row.department as string | null) ?? null,
        total_voters: (row.total_voters as number | null) ?? null,
        address: (row.address as string | null) ?? null,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Mesas asignadas error", error)
    return NextResponse.json({ ...fallbackData, error: "No se pudieron cargar las mesas asignadas" }, { status: 500 })
  } finally {
    client.release()
  }
}
