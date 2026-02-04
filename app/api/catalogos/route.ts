import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"

type Cargo = { id: string; nombre: string }
type Partido = { id: string; nombre: string; cargoId: string }
type Candidato = {
  id: string
  nombre: string
  partidoId: string
  cargoId: string
  ballot_number: number | null
  full_name: string | null
  position: string | null
  region: string | null
  color: string | null
  department_code: string | null
  party: string | null
}

const fallback = { cargos: [] as Cargo[], partidos: [] as Partido[], candidatos: [] as Candidato[] }

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "sin-id"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ ...fallback, warning: "DB no disponible" }, { status: 503 })
  }

  const client = await pool.connect()
  try {
    const query = `
      SELECT id, ballot_number, full_name, position, region, color, position_id, department_code, party
      FROM candidates
      ORDER BY position, ballot_number
    `

    const { rows } = await client.query(query)

    const cargosMap = new Map<string, Cargo>()
    const partidosMap = new Map<string, Partido>()

    const candidatos: Candidato[] = rows.map((row) => {
      const cargoNombre = (row.position as string | null) ?? "Cargo sin nombre"
      const cargoId = (row.position_id as string | null) ?? slugify(cargoNombre)

      if (!cargosMap.has(cargoId)) {
        cargosMap.set(cargoId, { id: cargoId, nombre: cargoNombre })
      }

      const partyNombre = (row.party as string | null) ?? "Independiente"
      const partidoId = `${cargoId}:${slugify(partyNombre)}`

      if (!partidosMap.has(partidoId)) {
        partidosMap.set(partidoId, { id: partidoId, nombre: partyNombre, cargoId })
      }

      return {
        id: row.id as string,
        nombre: (row.full_name as string | null) ?? cargoNombre,
        partidoId,
        cargoId,
        ballot_number: row.ballot_number as number | null,
        full_name: row.full_name as string | null,
        position: row.position as string | null,
        region: row.region as string | null,
        color: row.color as string | null,
        department_code: row.department_code as string | null,
        party: row.party as string | null,
      }
    })

    return NextResponse.json({ cargos: Array.from(cargosMap.values()), partidos: Array.from(partidosMap.values()), candidatos })
  } catch (error) {
    console.error("Catalogos GET error", error)
    return NextResponse.json({ ...fallback, error: "No se pudieron cargar los catalogos" }, { status: 500 })
  } finally {
    client.release()
  }
}