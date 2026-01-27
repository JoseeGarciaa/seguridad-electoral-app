import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, DELEGATE_ROLE } from "@/lib/auth"
import { pool } from "@/lib/pg"

const fallbackData = { items: [] as Array<{ id: string; label: string; municipio?: string | null }> }

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isDelegate = user.role === DELEGATE_ROLE
  const delegateId = isDelegate ? user.delegateId : null
  if (!isDelegate) {
    return NextResponse.json({ error: "Solo testigos electorales pueden ver mesas asignadas" }, { status: 403 })
  }
  if (!delegateId) {
    return NextResponse.json({ error: "Perfil de testigo electoral incompleto" }, { status: 403 })
  }

  if (!pool) {
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }

  const query = `
    SELECT id, polling_station, polling_station_number, NULL::text AS municipality
    FROM delegate_polling_assignments
    WHERE delegate_id = $1
    ORDER BY polling_station, polling_station_number
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
