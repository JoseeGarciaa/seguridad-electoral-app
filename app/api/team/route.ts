import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { hashPassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL no está configurada" }, { status: 500 })
  }

  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const role = searchParams.get("role") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 300), 500)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    const placeholder = `$${values.length}`
    filters.push(
      `(LOWER(full_name) LIKE ${placeholder} OR LOWER(email) LIKE ${placeholder} OR LOWER(COALESCE(municipality, '')) LIKE ${placeholder} OR LOWER(COALESCE(zone, '')) LIKE ${placeholder})`,
    )
  }
  if (role) {
    values.push(role)
    filters.push(`role = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`status = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  try {
    const client = await pool.connect()
    try {
      const tableRes = await client.query("SELECT to_regclass('public.team_profiles') AS reg")
      const hasTeamProfiles = Boolean(tableRes.rows[0]?.reg)

      const delegateColumnsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegates'`
      )
      const delegateCols = new Set<string>(delegateColumnsRes.rows.map((r: any) => r.column_name))
      const hasDepartment = delegateCols.has("department")
      const hasDeptCode = delegateCols.has("department_code")
      const hasMunicipalityCode = delegateCols.has("municipality_code")
      const hasPollingStationCode = delegateCols.has("polling_station_code")
      const hasPollingStationNumber = delegateCols.has("polling_station_number")
      const hasDocumentNumber = delegateCols.has("document_number")
      const hasSupervisor = delegateCols.has("supervisor_id")

      const baseQuery = `
        WITH base AS (
          SELECT
            d.id,
            d.full_name,
            d.email,
            d.phone,
            ${hasDepartment ? "COALESCE(d.department, loc.departamento)" : "loc.departamento"} AS department,
            COALESCE(d.municipality, loc.municipio) AS municipality,
            ${hasDeptCode ? "COALESCE(d.department_code, loc.dd)" : "loc.dd"} AS department_code,
            ${hasMunicipalityCode ? "COALESCE(d.municipality_code, loc.mm)" : "loc.mm"} AS municipality_code,
            ${hasTeamProfiles ? "COALESCE(tp.role, 'witness')" : "'witness'"} AS role,
            ${hasTeamProfiles ? "COALESCE(tp.status, 'active')" : "'active'"} AS status,
            ${hasTeamProfiles ? "tp.zone" : "NULL"} AS zone,
            ${hasTeamProfiles ? "COALESCE(tp.assigned_polling_stations, COALESCE(a.assigned_count, 0))" : "COALESCE(a.assigned_count, 0)"} AS assigned_polling_stations,
            ${hasTeamProfiles ? "COALESCE(tp.reports_submitted, COALESCE(r.reports_count, 0))" : "COALESCE(r.reports_count, 0)"} AS reports_submitted,
            ${hasTeamProfiles ? "COALESCE(tp.last_active_at, r.last_reported_at, d.updated_at)" : "COALESCE(r.last_reported_at, d.updated_at)"} AS last_active,
            ${hasTeamProfiles ? "tp.avatar_url" : "NULL"} AS avatar_url,
            ${hasPollingStationCode ? "COALESCE(loc.pp, d.polling_station_code)" : "loc.pp"} AS polling_station_code,
            ${hasPollingStationNumber ? "COALESCE(d.polling_station_number, a.primary_num)" : "a.primary_num"} AS polling_station_number,
            ${hasDocumentNumber ? "d.document_number" : "NULL"} AS document_number,
            ${hasSupervisor ? "sup.email" : "NULL"} AS supervisor_email,
            loc.id AS polling_station_id,
            loc.puesto AS polling_station_name,
            loc.direccion AS polling_station_address,
            loc.mesas AS polling_station_mesas
          FROM delegates d
          ${hasSupervisor ? "LEFT JOIN delegates sup ON sup.id = d.supervisor_id" : ""}
          ${hasTeamProfiles ? "LEFT JOIN team_profiles tp ON tp.delegate_id = d.id" : ""}
          LEFT JOIN (
            SELECT
              delegate_id,
              COUNT(*) AS assigned_count,
              ARRAY_AGG(DISTINCT polling_station) FILTER (WHERE polling_station IS NOT NULL) AS polling_codes,
              ARRAY_AGG(polling_station_number ORDER BY polling_station_number) FILTER (WHERE polling_station_number IS NOT NULL) AS polling_nums,
              MIN(polling_station_number) FILTER (WHERE polling_station_number IS NOT NULL) AS primary_num
            FROM delegate_polling_assignments
            GROUP BY delegate_id
          ) a ON a.delegate_id = d.id
          ${hasDeptCode && hasMunicipalityCode && hasPollingStationCode
            ? "LEFT JOIN divipole_locations loc ON loc.dd = d.department_code AND loc.mm = d.municipality_code AND loc.pp = COALESCE(d.polling_station_code, a.polling_codes[1])"
            : `LEFT JOIN divipole_locations loc ON loc.pp = ${hasPollingStationCode ? "d.polling_station_code" : "a.polling_codes[1]"}`}
          LEFT JOIN (
            SELECT delegate_id, COUNT(*) AS reports_count, MAX(reported_at) AS last_reported_at
            FROM vote_reports
            GROUP BY delegate_id
          ) r ON r.delegate_id = d.id
        )
      `

      const listQuery = `
        ${baseQuery}
        SELECT *
        FROM base
        ${where}
        ORDER BY last_active DESC NULLS LAST, full_name ASC
        LIMIT ${limit}
      `

      const statsQuery = `
        ${baseQuery}
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE role = 'witness') AS witnesses,
          COUNT(*) FILTER (WHERE role = 'coordinator') AS coordinators
        FROM base
      `

      const [listRes, statsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery),
      ])

      return NextResponse.json({
        members: listRes.rows.map((row) => {
          const pollingStationCode = Array.isArray(row.polling_codes) && row.polling_codes.length
            ? row.polling_codes[0]
            : row.polling_station_code ?? null
          const pollingStationNumber = Array.isArray(row.polling_nums) && row.polling_nums.length
            ? row.polling_nums[0]
            : row.polling_station_number ?? null
          const pollingStationNumbers = Array.isArray(row.polling_nums)
            ? (row.polling_nums as number[]).filter((n) => Number.isInteger(n))
            : Number.isInteger(row.polling_station_number)
            ? [Number(row.polling_station_number)]
            : []

          return {
            id: row.id as string,
            name: row.full_name as string,
            email: row.email as string,
            phone: row.phone as string | null,
            municipality: row.municipality as string | null,
            department: row.department as string | null,
            departmentCode: row.department_code as string | null,
            municipalityCode: row.municipality_code as string | null,
            role: row.role as string,
            status: row.status as string,
            zone: row.zone as string | null,
            assignedPollingStations: Number(row.assigned_polling_stations ?? 0),
            reportsSubmitted: Number(row.reports_submitted ?? 0),
            lastActive: row.last_active ? new Date(row.last_active).toISOString() : null,
            avatar: row.avatar_url as string | null,
            documentNumber: row.document_number as string | null,
            supervisorEmail: row.supervisor_email as string | null,
            pollingStationId: row.polling_station_id as string | null,
            pollingStationName: row.polling_station_name as string | null,
            pollingStationAddress: row.polling_station_address as string | null,
            pollingStationMesas: Number(row.polling_station_mesas ?? 0) || null,
            pollingStationCode,
            pollingStationNumber,
            pollingStationNumbers,
          }
        }),
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
  } catch (error: any) {
    console.error("Team GET error", error)
    return NextResponse.json({ error: "No se pudo obtener el equipo", detail: String(error?.message ?? error) }, { status: 500 })
  }
}

type MemberPayload = {
  full_name: string
  document_number: string
  email: string
  password?: string | null
  phone?: string | null
  role?: string | null
  zone?: string | null
  municipality?: string | null
  department?: string | null
  address?: string | null
  department_code?: string | null
  municipality_code?: string | null
  supervisor_email?: string | null
  status?: string | null
  polling_station_code?: string | null
  polling_station_number?: number | null
  polling_station_numbers?: number[] | null
  polling_station_id?: string | null
}

async function upsertUserForDelegate(
  client: any,
  delegateId: string,
  email: string,
  password: string | null | undefined,
  role: string | null | undefined,
  status: string | null | undefined,
) {
  const userRole = role === "admin" ? "admin" : "delegate"
  const isActive = status !== "inactive"

  const existing = await client.query(`SELECT id FROM users WHERE delegate_id = $1 OR email = $2 LIMIT 1`, [delegateId, email])
  const userId = (existing.rows[0]?.id as string | undefined) ?? crypto.randomUUID()
  const hasUser = Boolean(existing.rowCount)
  const passwordHash = password ? await hashPassword(password) : null

  if (hasUser) {
    const updates: string[] = []
    const values: any[] = []

    if (passwordHash) {
      values.push(passwordHash)
      updates.push(`password_hash = $${values.length}`)
    }

    values.push(email)
    updates.push(`email = $${values.length}`)

    values.push(userRole)
    updates.push(`role = $${values.length}`)

    values.push(isActive)
    updates.push(`is_active = $${values.length}`)

    values.push(false)
    updates.push(`must_reset_password = $${values.length}`)

    values.push(userId)

    const updateSql = `UPDATE users SET ${updates.join(", ")}, updated_at = now() WHERE id = $${values.length}`
    await client.query(updateSql, values)
  } else {
    if (!passwordHash) {
      throw new Error("Se requiere contraseña para crear el usuario")
    }

    await client.query(
      `INSERT INTO users (id, email, password_hash, role, delegate_id, is_active, must_reset_password, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,false, now(), now())`,
      [userId, email, passwordHash, userRole, delegateId, isActive],
    )
  }
}

type DelegateMeta = {
  hasRole: boolean
  hasZone: boolean
  hasSupervisor: boolean
  hasDeptCode: boolean
  hasMunicipalityCode: boolean
  hasPollingStationCode: boolean
  hasPollingStationNumber: boolean
  hasDelegatePollingStationId: boolean
  hasAddress: boolean
  hasTeamProfiles: boolean
  hasDpaLocationId: boolean
}

async function resolveSupervisor(client: any, email?: string | null): Promise<string | null> {
  if (!email) return null
  const res = await client.query(`SELECT id FROM delegates WHERE email = $1`, [email])
  return res.rows[0]?.id ?? null
}

async function validateCodes(
  client: any,
  deptCode: string | null,
  muniCode: string | null,
  required: boolean,
): Promise<{ deptCode: string | null; muniCode: string | null }> {
  let validDept = deptCode
  let validMuni = muniCode

  // Prefer divipole_locations because it is the source for the dropdowns
  try {
    if (deptCode) {
      const r = await client.query(`SELECT 1 FROM divipole_locations WHERE dd = $1 LIMIT 1`, [deptCode])
      if (!r.rowCount) validDept = null
    }

    if (deptCode && muniCode) {
      const r = await client.query(`SELECT 1 FROM divipole_locations WHERE dd = $1 AND mm = $2 LIMIT 1`, [deptCode, muniCode])
      if (!r.rowCount) validMuni = null
    }
  } catch (err) {
    console.warn("validateCodes divipole_locations fallback", err)
  }

  // Cross-check legacy tables to avoid foreign key violations
  const deptToCheck = validDept ?? deptCode
  if (deptToCheck) {
    const r = await client
      .query(`SELECT 1 FROM departments WHERE code = $1 LIMIT 1`, [deptToCheck])
      .catch(() => ({ rowCount: 0 }))
    validDept = r.rowCount ? deptToCheck : null
  }

  const muniToCheck = validMuni ?? muniCode
  if (muniToCheck) {
    const r = await client
      .query(`SELECT 1 FROM municipalities WHERE code = $1 LIMIT 1`, [muniToCheck])
      .catch(() => ({ rowCount: 0 }))
    validMuni = r.rowCount ? muniToCheck : null
  }

  if (required && (!deptCode || !muniCode)) {
    throw new Error("Selecciona departamento y municipio válidos")
  }

  // If reference tables are missing rows, proceed without codes to avoid FK errors.
  return { deptCode: validDept, muniCode: validMuni }
}

async function upsertDelegateAndProfile(client: any, payload: MemberPayload, meta: DelegateMeta) {
  const supervisorId = meta.hasSupervisor ? await resolveSupervisor(client, payload.supervisor_email) : null
  const role = meta.hasRole ? payload.role ?? "witness" : null
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
  const assignmentNumbers = normalizedNumbers.length
    ? Array.from(new Set(normalizedNumbers))
    : tableNumber === null || tableNumber === undefined
    ? []
    : [tableNumber]
  const pollingStationId = payload.polling_station_id ?? null

  if (meta.hasDpaLocationId && pollingStationId === null && assignmentNumbers.length) {
    throw new Error("Selecciona un puesto de votación válido")
  }

  const { deptCode, muniCode } = await validateCodes(
    client,
    meta.hasDeptCode ? payload.department_code ?? null : null,
    meta.hasMunicipalityCode ? payload.municipality_code ?? null : null,
    true,
  )
  const existingRes = await client.query(`SELECT id FROM delegates WHERE email = $1 LIMIT 1`, [payload.email])
  const delegateId = (existingRes.rows[0]?.id as string | undefined) ?? crypto.randomUUID()
  const isUpdate = Boolean(existingRes.rows[0]?.id)

  const delegateColumns = [
    "id",
    "full_name",
    "email",
    "phone",
    "document_number",
    "department",
    "municipality",
  ] as const

  const columns: string[] = [...delegateColumns]
  const values: any[] = [
    delegateId,
    payload.full_name,
    payload.email,
    payload.phone ?? null,
    payload.document_number,
    payload.department,
    payload.municipality,
  ]

  if (meta.hasRole) {
    columns.push("role")
    values.push(role)
  }
  if (meta.hasZone) {
    columns.push("zone")
    values.push(payload.zone ?? null)
  }
  if (meta.hasAddress) {
    columns.push("address")
    values.push(payload.address ?? null)
  }
  if (meta.hasDeptCode) {
    columns.push("department_code")
    values.push(deptCode)
  }
  if (meta.hasMunicipalityCode) {
    columns.push("municipality_code")
    values.push(muniCode)
  }
  if (meta.hasPollingStationCode) {
    columns.push("polling_station_code")
    values.push(payload.polling_station_code ?? null)
  }
  if (meta.hasDelegatePollingStationId) {
    columns.push("polling_station_id")
    values.push(pollingStationId)
  }
  if (meta.hasPollingStationNumber) {
    columns.push("polling_station_number")
    values.push(tableNumber)
  }
  if (meta.hasSupervisor) {
    columns.push("supervisor_id")
    values.push(supervisorId)
  }

  const valueByColumn = Object.fromEntries(columns.map((c, idx) => [c, values[idx]])) as Record<string, any>
  let savedDelegateId = delegateId

  if (isUpdate) {
    const updateColumns = columns.filter((c) => c !== "id")
    const updateValues = updateColumns.map((c) => valueByColumn[c])
    const updateAssignments = updateColumns.map((c, i) => `${c} = $${i + 1}`)
    const updateSql = `
      UPDATE delegates
      SET ${updateAssignments.join(", ")}, updated_at = now()
      WHERE id = $${updateValues.length + 1}
      RETURNING id
    `
    const res = await client.query(updateSql, [...updateValues, savedDelegateId])
    savedDelegateId = res.rows[0]?.id ?? savedDelegateId
  } else {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(",")
    const insertSql = `
      INSERT INTO delegates (${columns.join(",")})
      VALUES (${placeholders})
      RETURNING id
    `
    const res = await client.query(insertSql, values)
    savedDelegateId = res.rows[0]?.id ?? savedDelegateId
  }

  const firstAssignment = normalizedNumbers.length
    ? normalizedNumbers[0]
    : tableNumber !== null && tableNumber !== undefined
    ? tableNumber
    : null

  const assignments = assignmentNumbers

  if (meta.hasTeamProfiles) {
    const updateProfileSql = `
      UPDATE team_profiles
      SET role = $2,
          status = $3,
          zone = $4,
          assigned_polling_stations = $5,
          updated_at = now()
      WHERE delegate_id = $1
      RETURNING id
    `
    const updateProfile = await client.query(updateProfileSql, [
      savedDelegateId,
      role ?? "witness",
      status,
      payload.zone ?? null,
      assignments.length,
    ])

    if (!updateProfile.rowCount) {
      const insertProfile = `
        INSERT INTO team_profiles (delegate_id, role, status, zone, assigned_polling_stations)
        VALUES ($1,$2,$3,$4,$5)
      `
      await client.query(insertProfile, [savedDelegateId, role ?? "witness", status, payload.zone ?? null, assignments.length])
    }
  }

  await client.query(`DELETE FROM delegate_polling_assignments WHERE delegate_id = $1`, [savedDelegateId])
  if (assignments.length) {
    const conflict = await client.query(
      meta.hasDpaLocationId
        ? `SELECT polling_station_number FROM delegate_polling_assignments
           WHERE divipole_location_id = $1 AND polling_station_number = ANY($2)`
        : `SELECT polling_station_number FROM delegate_polling_assignments
           WHERE polling_station = $1 AND polling_station_number = ANY($2)`,
      [meta.hasDpaLocationId ? pollingStationId : payload.polling_station_code ?? null, assignments]
    )
    if (conflict.rowCount) {
      throw new Error("Algunas mesas ya están asignadas a otro testigo")
    }

    for (const num of assignments) {
      const assignmentId = crypto.randomUUID()
      await client.query(
        meta.hasDpaLocationId
          ? `INSERT INTO delegate_polling_assignments (id, delegate_id, polling_station, polling_station_number, divipole_location_id)
             VALUES ($1,$2,$3,$4,$5)`
          : `INSERT INTO delegate_polling_assignments (id, delegate_id, polling_station, polling_station_number)
             VALUES ($1,$2,$3,$4)`,
        meta.hasDpaLocationId
          ? [assignmentId, savedDelegateId, payload.polling_station_code ?? null, num, pollingStationId]
          : [assignmentId, savedDelegateId, payload.polling_station_code ?? null, num]
      )
    }
  }

  await upsertUserForDelegate(client, savedDelegateId, payload.email, payload.password, role, status)
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
    if (!row?.department_code || !row?.municipality_code) {
      return NextResponse.json({ error: "Selecciona departamento y municipio" }, { status: 400 })
    }
    if (!row?.password || row.password.length < 6) {
      return NextResponse.json({ error: "Contraseña requerida (mínimo 6 caracteres)" }, { status: 400 })
    }
  }

  const client = await pool.connect()
  try {
    const delegateColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegates'`
    )
    const delegateCols = new Set<string>(delegateColumnsRes.rows.map((r: any) => r.column_name))
    const teamProfilesRes = await client.query("SELECT to_regclass('public.team_profiles') AS reg")
    const dpaColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments'`
    )
    const dpaCols = new Set<string>(dpaColumnsRes.rows.map((r: any) => r.column_name))
    const meta: DelegateMeta = {
      hasRole: delegateCols.has("role"),
      hasZone: delegateCols.has("zone"),
      hasSupervisor: delegateCols.has("supervisor_id"),
      hasDeptCode: delegateCols.has("department_code"),
      hasMunicipalityCode: delegateCols.has("municipality_code"),
      hasPollingStationCode: delegateCols.has("polling_station_code"),
      hasPollingStationNumber: delegateCols.has("polling_station_number"),
      hasDelegatePollingStationId: delegateCols.has("polling_station_id"),
      hasAddress: delegateCols.has("address"),
      hasTeamProfiles: Boolean(teamProfilesRes.rows[0]?.reg),
      hasDpaLocationId: dpaCols.has("divipole_location_id"),
    }

    await client.query("BEGIN")
    for (const row of rows) {
      await upsertDelegateAndProfile(client, row, meta)
    }
    await client.query("COMMIT")
    return NextResponse.json({ inserted: rows.length })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Team POST error", error)
    const message = String(error?.message ?? error)
    const status = message.includes("Selecciona departamento y municipio") ? 400 : 500
    return NextResponse.json({ error: "No se pudo crear el miembro", detail: message }, { status })
  } finally {
    client.release()
  }
}

export async function PATCH(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const id = body?.id as string | undefined
  const changes = body?.changes ?? {}
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 })

  if (changes.password !== undefined && (typeof changes.password !== "string" || changes.password.length < 6)) {
    return NextResponse.json({ error: "Contraseña inválida: mínimo 6 caracteres" }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    const delegateColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegates'`
    )
    const delegateCols = new Set<string>(delegateColumnsRes.rows.map((r: any) => r.column_name))
    const teamProfilesRes = await client.query("SELECT to_regclass('public.team_profiles') AS reg")
    const dpaColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments'`
    )
    const dpaCols = new Set<string>(dpaColumnsRes.rows.map((r: any) => r.column_name))
    const meta: DelegateMeta = {
      hasRole: delegateCols.has("role"),
      hasZone: delegateCols.has("zone"),
      hasSupervisor: delegateCols.has("supervisor_id"),
      hasDeptCode: delegateCols.has("department_code"),
      hasMunicipalityCode: delegateCols.has("municipality_code"),
      hasPollingStationCode: delegateCols.has("polling_station_code"),
      hasPollingStationNumber: delegateCols.has("polling_station_number"),
      hasDelegatePollingStationId: delegateCols.has("polling_station_id"),
      hasAddress: delegateCols.has("address"),
      hasTeamProfiles: Boolean(teamProfilesRes.rows[0]?.reg),
      hasDpaLocationId: dpaCols.has("divipole_location_id"),
    }

    const delegateUpdates: string[] = []
    const delegateValues: any[] = []

    const pushUpdate = (col: string, value: any) => {
      delegateValues.push(value)
      delegateUpdates.push(`${col} = $${delegateValues.length}`)
    }

    if (changes.full_name) pushUpdate("full_name", changes.full_name)
    if (changes.email) pushUpdate("email", changes.email)
    if (changes.phone !== undefined) pushUpdate("phone", changes.phone)
    if (changes.department) pushUpdate("department", changes.department)
    if (changes.municipality) pushUpdate("municipality", changes.municipality)
    if (meta.hasZone && changes.zone !== undefined) pushUpdate("zone", changes.zone)
    if (meta.hasAddress && changes.address !== undefined) pushUpdate("address", changes.address)

    const existingDelegateRes = await client.query(
      `SELECT polling_station_code, polling_station_number FROM delegates WHERE id = $1 LIMIT 1`,
      [id]
    )
    const existingDelegate = existingDelegateRes.rows[0] ?? {}
    const existingAssignmentsRes = await client.query(
      meta.hasDpaLocationId
        ? `SELECT polling_station, polling_station_number, divipole_location_id FROM delegate_polling_assignments WHERE delegate_id = $1`
        : `SELECT polling_station, polling_station_number FROM delegate_polling_assignments WHERE delegate_id = $1`,
      [id]
    )
    const existingAssignmentCode = existingAssignmentsRes.rows[0]?.polling_station ?? existingDelegate.polling_station_code ?? null
    const existingAssignmentLocationId = meta.hasDpaLocationId
      ? existingAssignmentsRes.rows[0]?.divipole_location_id ?? null
      : null
    const existingAssignmentNums = existingAssignmentsRes.rows
      .map((r: any) => Number(r.polling_station_number))
      .filter((n) => Number.isInteger(n))

    const { deptCode } = meta.hasDeptCode && changes.department_code !== undefined
      ? await validateCodes(client, changes.department_code ?? null, null)
      : { deptCode: undefined }
    const { muniCode } = meta.hasMunicipalityCode && changes.municipality_code !== undefined
      ? await validateCodes(client, null, changes.municipality_code ?? null)
      : { muniCode: undefined }

    const nextDept = changes.department_code !== undefined ? deptCode : undefined
    const nextMuni = changes.municipality_code !== undefined ? muniCode : undefined

    const sanitizedNumbers = Array.isArray(changes.polling_station_numbers)
      ? changes.polling_station_numbers
          .map((n: any) => Number(n))
          .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0)
      : changes.polling_station_number !== undefined
      ? [Number(changes.polling_station_number)].filter((n) => Number.isInteger(n))
      : existingAssignmentNums

    const nextCode = changes.polling_station_code !== undefined ? changes.polling_station_code : existingAssignmentCode
    const nextLocationId = meta.hasDpaLocationId
      ? changes.polling_station_id !== undefined
        ? changes.polling_station_id
        : existingAssignmentLocationId
      : null
    const assignmentNumbers = sanitizedNumbers.length ? Array.from(new Set(sanitizedNumbers)) : []
    const primaryNumber = assignmentNumbers[0] ?? null

    if (meta.hasDeptCode && nextDept !== undefined) {
      pushUpdate("department_code", nextDept)
    }
    if (meta.hasMunicipalityCode && nextMuni !== undefined) {
      pushUpdate("municipality_code", nextMuni)
    }
    if (meta.hasPollingStationCode) {
      pushUpdate("polling_station_code", nextCode ?? null)
    }
    if (meta.hasPollingStationNumber) {
      pushUpdate("polling_station_number", primaryNumber)
    }
    if (meta.hasDelegatePollingStationId) {
      pushUpdate("polling_station_id", nextLocationId ?? null)
    }

    await client.query("BEGIN")
    if (delegateUpdates.length) {
      delegateValues.push(id)
      const updateSql = `UPDATE delegates SET ${delegateUpdates.join(",")}, updated_at = now() WHERE id = $${delegateValues.length}`
      await client.query(updateSql, delegateValues)
    }

    if (!meta.hasTeamProfiles && changes.status === "inactive") {
      await client.query(`DELETE FROM delegates WHERE id = $1`, [id])
      await client.query("COMMIT")
      return NextResponse.json({ deleted: true })
    }

    if (meta.hasTeamProfiles) {
      const role = meta.hasRole ? changes.role ?? "witness" : "witness"
      const status = changes.status ?? "active"
      const zone = changes.zone ?? null
      await client.query(
        `INSERT INTO team_profiles (delegate_id, role, status, zone, assigned_polling_stations)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (delegate_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, zone = EXCLUDED.zone, assigned_polling_stations = EXCLUDED.assigned_polling_stations, updated_at = now()`,
        [id, role, status, zone, assignmentNumbers.length]
      )
    }

    await client.query(`DELETE FROM delegate_polling_assignments WHERE delegate_id = $1`, [id])
    if ((meta.hasDpaLocationId ? nextLocationId : nextCode) && assignmentNumbers.length) {
      if (meta.hasDpaLocationId && !nextLocationId) {
        throw new Error("Selecciona un puesto de votación válido")
      }
      const conflict = await client.query(
        meta.hasDpaLocationId
          ? `SELECT polling_station_number FROM delegate_polling_assignments
             WHERE divipole_location_id = $1 AND polling_station_number = ANY($2) AND delegate_id <> $3`
          : `SELECT polling_station_number FROM delegate_polling_assignments
             WHERE polling_station = $1 AND polling_station_number = ANY($2) AND delegate_id <> $3`,
        [meta.hasDpaLocationId ? nextLocationId : nextCode, assignmentNumbers, id]
      )
      if (conflict.rowCount) {
        throw new Error("Algunas mesas ya están asignadas a otro testigo")
      }

      for (const num of assignmentNumbers) {
        const assignmentId = crypto.randomUUID()
        await client.query(
          meta.hasDpaLocationId
            ? `INSERT INTO delegate_polling_assignments (id, delegate_id, polling_station, polling_station_number, divipole_location_id)
               VALUES ($1,$2,$3,$4,$5)`
            : `INSERT INTO delegate_polling_assignments (id, delegate_id, polling_station, polling_station_number)
               VALUES ($1,$2,$3,$4)`,
          meta.hasDpaLocationId
            ? [assignmentId, id, nextCode, num, nextLocationId]
            : [assignmentId, id, nextCode, num]
        )
      }
    }

    const hasTeamProfiles = meta.hasTeamProfiles
    const baseQuery = `
      WITH base AS (
        SELECT
          d.id,
          d.full_name,
          d.email,
          d.phone,
          d.municipality,
          ${hasTeamProfiles ? "COALESCE(tp.role, 'witness')" : "'witness'"} AS role,
          ${hasTeamProfiles ? "COALESCE(tp.status, 'active')" : "'active'"} AS status,
          ${hasTeamProfiles ? "tp.zone" : "NULL"} AS zone,
          ${hasTeamProfiles ? "COALESCE(tp.assigned_polling_stations, COALESCE(a.assigned_count, 0))" : "COALESCE(a.assigned_count, 0)"} AS assigned_polling_stations,
          ${hasTeamProfiles ? "COALESCE(tp.reports_submitted, COALESCE(r.reports_count, 0))" : "COALESCE(r.reports_count, 0)"} AS reports_submitted,
          ${hasTeamProfiles ? "COALESCE(tp.last_active_at, r.last_reported_at, d.updated_at)" : "COALESCE(r.last_reported_at, d.updated_at)"} AS last_active,
          ${hasTeamProfiles ? "tp.avatar_url" : "NULL"} AS avatar_url,
          COALESCE(a.polling_codes, ARRAY[]::text[]) AS polling_codes,
          COALESCE(a.polling_nums, ARRAY[]::int[]) AS polling_nums
        FROM delegates d
        ${hasTeamProfiles ? "LEFT JOIN team_profiles tp ON tp.delegate_id = d.id" : ""}
        LEFT JOIN (
          SELECT delegate_id,
                 COUNT(*) AS assigned_count,
                 array_agg(DISTINCT polling_station) FILTER (WHERE polling_station IS NOT NULL) AS polling_codes,
                 array_agg(DISTINCT polling_station_number) FILTER (WHERE polling_station_number IS NOT NULL) AS polling_nums
          FROM delegate_polling_assignments
          GROUP BY delegate_id
        ) a ON a.delegate_id = d.id
        LEFT JOIN (
          SELECT delegate_id, COUNT(*) AS reports_count, MAX(reported_at) AS last_reported_at
          FROM vote_reports
          GROUP BY delegate_id
        ) r ON r.delegate_id = d.id
      )
      SELECT * FROM base WHERE id = $1 LIMIT 1
    `

    const result = await client.query(baseQuery, [id])
    await client.query("COMMIT")

    const row = result.rows[0]
    if (row) {
      await upsertUserForDelegate(
        client,
        id,
        row.email,
        changes.password ?? null,
        changes.role ?? row.role,
        changes.status ?? row.status,
      )
    }

    const member = row
      ? {
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
          lastActive: row.last_active ? new Date(row.last_active).toISOString() : null,
          avatar: row.avatar_url as string | null,
        }
      : null

    return NextResponse.json({ member })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Team PATCH error", error)
    return NextResponse.json({ error: "No se pudo actualizar", detail: String(error?.message ?? error) }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const id = body?.id as string | undefined
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 })

  const client = await pool.connect()
  try {
    const teamProfilesRes = await client.query("SELECT to_regclass('public.team_profiles') AS reg")
    const hasTeamProfiles = Boolean(teamProfilesRes.rows[0]?.reg)

    await client.query("BEGIN")
    if (hasTeamProfiles) {
      await client.query(`UPDATE team_profiles SET status = 'inactive', updated_at = now() WHERE delegate_id = $1`, [id])
      await client.query(`UPDATE delegates SET updated_at = now() WHERE id = $1`, [id])
    } else {
      await client.query(`DELETE FROM delegates WHERE id = $1`, [id])
    }
    await client.query("COMMIT")
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Team DELETE error", error)
    return NextResponse.json({ error: "No se pudo eliminar", detail: String(error?.message ?? error) }, { status: 500 })
  } finally {
    client.release()
  }
}
