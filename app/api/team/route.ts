import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  members: [
    {
      id: "TM-1",
      name: "Ana Torres",
      email: "ana@example.com",
      phone: "3001234567",
      municipality: "Bogotá",
      role: "coordinator",
      status: "active",
      zone: "01",
      assignedPollingStations: 4,
      reportsSubmitted: 12,
      lastActive: new Date().toISOString(),
      avatar: null,
    },
    {
      id: "TM-2",
      name: "Carlos Méndez",
      email: "carlos@example.com",
      phone: null,
      municipality: "Soledad",
      role: "witness",
      status: "active",
      zone: "05",
      assignedPollingStations: 2,
      reportsSubmitted: 3,
      lastActive: null,
      avatar: null,
    },
  ],
  stats: { total: 2, active: 2, witnesses: 1, coordinators: 1 },
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const role = searchParams.get("role") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 300), 500)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(d.full_name) LIKE $${values.length} OR LOWER(d.email) LIKE $${values.length} OR LOWER(COALESCE(d.municipality, '')) LIKE $${values.length})`)
  }
  if (role) {
    values.push(role)
    filters.push(`tp.role = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`tp.status = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT
      d.id,
      d.full_name,
      d.email,
      d.phone,
      d.municipality,
      tp.role,
      tp.status,
      tp.zone,
      tp.assigned_polling_stations,
      tp.reports_submitted,
      tp.last_active_at,
      tp.avatar_url
    FROM team_profiles tp
    JOIN delegates d ON d.id = tp.delegate_id
    ${where}
    ORDER BY tp.updated_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE role = 'witness') AS witnesses,
      COUNT(*) FILTER (WHERE role = 'coordinator') AS coordinators
    FROM team_profiles
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving team fallback data")
    return NextResponse.json(fallbackData)
  }

  try {
    const client = await pool.connect()
    try {
      const [listRes, statsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery),
      ])

      return NextResponse.json({
        members: listRes.rows.map((row) => ({
          id: row.id as string,
          name: row.full_name as string,
          email: row.email as string,
          phone: row.phone as string | null,
          municipality: row.municipality as string | null,
          role: row.role as string,
          status: row.status as string,
          zone: row.zone as string | null,
          assignedPollingStations: Number(row.assigned_polling_stations ?? 0),
          reportsSubmitted: Number(row.reports_submitted ?? 0),
          lastActive: row.last_active_at ? new Date(row.last_active_at).toISOString() : null,
          avatar: row.avatar_url as string | null,
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          active: Number(statsRes.rows[0]?.active ?? 0),
          witnesses: Number(statsRes.rows[0]?.witnesses ?? 0),
          coordinators: Number(statsRes.rows[0]?.coordinators ?? 0),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Team GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}

type MemberPayload = {
  full_name: string
  document_number: string
  email: string
  phone?: string | null
  role?: string | null
  zone?: string | null
  municipality?: string | null
  department?: string | null
  department_code?: string | null
  municipality_code?: string | null
  supervisor_email?: string | null
  status?: string | null
  polling_station_code?: string | null
  polling_station_number?: number | null
  polling_station_numbers?: number[] | null
}

async function resolveSupervisor(client: any, email?: string | null): Promise<string | null> {
  if (!email) return null
  const res = await client.query(`SELECT id FROM delegates WHERE email = $1`, [email])
  return res.rows[0]?.id ?? null
}

async function upsertDelegateAndProfile(client: any, payload: MemberPayload) {
  const supervisorId = await resolveSupervisor(client, payload.supervisor_email)
  const role = payload.role ?? "witness"
  const status = payload.status ?? "active"
  const normalizedNumbers = Array.isArray(payload.polling_station_numbers)
    ? payload.polling_station_numbers
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0)
    : []
  const tableNumber = normalizedNumbers.length
    ? normalizedNumbers[0]
    : payload.polling_station_number === 0
    ? 0
    : payload.polling_station_number ?? null

  const delegateInsert = `
    INSERT INTO delegates (
      full_name, email, phone, document_number, role, department, municipality, zone,
      department_code, municipality_code, polling_station_code, polling_station_number, supervisor_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      department = EXCLUDED.department,
      municipality = EXCLUDED.municipality,
      zone = EXCLUDED.zone,
      department_code = EXCLUDED.department_code,
      municipality_code = EXCLUDED.municipality_code,
      polling_station_code = EXCLUDED.polling_station_code,
      polling_station_number = EXCLUDED.polling_station_number,
      supervisor_id = EXCLUDED.supervisor_id,
      updated_at = now()
    RETURNING id
  `

  const delegateValues = [
    payload.full_name,
    payload.email,
    payload.phone ?? null,
    payload.document_number,
    role,
    payload.department,
    payload.municipality,
    payload.zone ?? null,
    payload.department_code ?? null,
    payload.municipality_code ?? null,
    payload.polling_station_code ?? null,
    tableNumber,
    supervisorId,
  ]

  const delegateRes = await client.query(delegateInsert, delegateValues)
  const delegateId = delegateRes.rows[0].id as string

  const profileInsert = `
    INSERT INTO team_profiles (delegate_id, role, status, zone, assigned_polling_stations)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (delegate_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      zone = EXCLUDED.zone,
      assigned_polling_stations = EXCLUDED.assigned_polling_stations,
      updated_at = now()
  `
  const assignments = normalizedNumbers.length
    ? normalizedNumbers
    : tableNumber !== null && tableNumber !== undefined
    ? [tableNumber]
    : []

  await client.query(`DELETE FROM delegate_polling_assignments WHERE delegate_id = $1`, [delegateId])

  for (const num of assignments) {
    await client.query(
      `INSERT INTO delegate_polling_assignments (delegate_id, polling_station, polling_station_number)
       VALUES ($1,$2,$3)
       ON CONFLICT (delegate_id, polling_station, polling_station_number) DO NOTHING`,
      [delegateId, payload.polling_station_code ?? null, num]
    )
  }

  await client.query(profileInsert, [delegateId, role, status, payload.zone ?? null, assignments.length])
}

export async function POST(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible en modo demo" }, { status: 503 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const mode = body?.mode ?? "single"
  const rows: MemberPayload[] = mode === "bulk" ? body?.rows ?? [] : [body?.member]

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Sin datos para crear" }, { status: 400 })
  }

  for (const row of rows) {
    if (!row?.full_name || !row?.email || !row?.document_number || !row?.department || !row?.municipality) {
      return NextResponse.json({ error: "Faltan campos obligatorios (nombre, email, documento, departamento, municipio)" }, { status: 400 })
    }
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const row of rows) {
      await upsertDelegateAndProfile(client, row)
    }
    await client.query("COMMIT")
    return NextResponse.json({ inserted: rows.length })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Team POST error", error)
    return NextResponse.json({ error: "No se pudo crear el miembro" }, { status: 500 })
  } finally {
    client.release()
  }
}
