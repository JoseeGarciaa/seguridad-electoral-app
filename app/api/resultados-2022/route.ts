import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"

type Scope = "departments" | "municipalities" | "puestos" | "mesas" | "results"

type MesaFactRow = {
  mesaid: string
  depto: string
  municipio: string
  zona: string
  puesto: string
  mesa: number
  votantes: number
  votos_validos: number
  votos_nulos: number
  no_marcados: number
  blancos: number
}

function normalizeParam(value: string | null): string | null {
  const raw = value?.trim() ?? ""
  return raw.length > 0 ? raw : null
}

function pushNormalizedEquals(
  where: string[],
  params: Array<string | number>,
  field: "depto" | "municipio" | "puesto",
  value: string | null,
) {
  if (!value) return
  params.push(value)
  const paramIndex = params.length
  where.push(
    `REGEXP_REPLACE(LOWER(TRIM(${field})), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM($${paramIndex})), '\\s+', ' ', 'g')`,
  )
}

function pushMesaEquals(where: string[], params: Array<string | number>, mesa: string | null) {
  if (!mesa) return
  const mesaNumber = Number(mesa)
  if (!Number.isInteger(mesaNumber) || mesaNumber < 0) return
  params.push(mesaNumber)
  const paramIndex = params.length
  where.push(`mesa = $${paramIndex}`)
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const searchParams = req.nextUrl.searchParams
  const scope = (searchParams.get("scope") ?? "results") as Scope
  const department = normalizeParam(searchParams.get("department"))
  const municipality = normalizeParam(searchParams.get("municipality"))
  const puesto = normalizeParam(searchParams.get("puesto"))
  const mesa = normalizeParam(searchParams.get("mesa"))

  try {
    if (scope === "departments") {
      const { rows } = await pool.query<{ name: string }>(
        `SELECT DISTINCT TRIM(depto) AS name
         FROM mesa_fact
         WHERE TRIM(depto) <> ''
         ORDER BY name`,
      )
      return NextResponse.json({ items: rows.map((row) => row.name).filter(Boolean) })
    }

    if (scope === "municipalities") {
      const where: string[] = ["TRIM(municipio) <> ''"]
      const params: Array<string | number> = []
      pushNormalizedEquals(where, params, "depto", department)

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""
      const { rows } = await pool.query<{ name: string }>(
        `SELECT DISTINCT TRIM(municipio) AS name
         FROM mesa_fact
         ${whereClause}
         ORDER BY name`,
        params,
      )
      return NextResponse.json({ items: rows.map((row) => row.name).filter(Boolean) })
    }

    if (scope === "puestos") {
      const where: string[] = ["TRIM(puesto) <> ''"]
      const params: Array<string | number> = []
      pushNormalizedEquals(where, params, "depto", department)
      pushNormalizedEquals(where, params, "municipio", municipality)

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""
      const { rows } = await pool.query<{ name: string }>(
        `SELECT DISTINCT TRIM(puesto) AS name
         FROM mesa_fact
         ${whereClause}
         ORDER BY name`,
        params,
      )
      return NextResponse.json({ items: rows.map((row) => row.name).filter(Boolean) })
    }

    if (scope === "mesas") {
      const where: string[] = []
      const params: Array<string | number> = []
      pushNormalizedEquals(where, params, "depto", department)
      pushNormalizedEquals(where, params, "municipio", municipality)
      pushNormalizedEquals(where, params, "puesto", puesto)

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""
      const { rows } = await pool.query<{ mesa: number }>(
        `SELECT DISTINCT mesa
         FROM mesa_fact
         ${whereClause}
         ORDER BY mesa`,
        params,
      )
      return NextResponse.json({ items: rows.map((row) => Number(row.mesa)) })
    }

    const where: string[] = []
    const params: Array<string | number> = []

    if (!department || !municipality || !puesto || !mesa) {
      return NextResponse.json({
        total: 0,
        items: [],
        hint: "Selecciona departamento, municipio, puesto y mesa para consultar resultados.",
      })
    }

    pushNormalizedEquals(where, params, "depto", department)
    pushNormalizedEquals(where, params, "municipio", municipality)
    pushNormalizedEquals(where, params, "puesto", puesto)
    pushMesaEquals(where, params, mesa)

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const rowsRes = await pool.query<MesaFactRow>(
      `SELECT
         mesaid::text,
         depto,
         municipio,
         zona,
         puesto,
         mesa,
         votantes,
         votos_validos,
         votos_nulos,
         no_marcados,
         blancos
       FROM mesa_fact
       ${whereClause}
       ORDER BY mesa`,
      params,
    )

    const total = rowsRes.rows.length
    return NextResponse.json({
      total,
      items: rowsRes.rows.map((row) => ({
        mesaid: row.mesaid,
        depto: row.depto,
        municipio: row.municipio,
        zona: row.zona,
        puesto: row.puesto,
        mesa: Number(row.mesa),
        votantes: Number(row.votantes),
        votos_validos: Number(row.votos_validos),
        votos_nulos: Number(row.votos_nulos),
        no_marcados: Number(row.no_marcados),
        blancos: Number(row.blancos),
      })),
    })
  } catch (error) {
    console.error("resultados-2022 API error", error)
    return NextResponse.json({ error: "No se pudieron cargar resultados 2022" }, { status: 500 })
  }
}
