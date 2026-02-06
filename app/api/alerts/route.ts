import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { getCurrentUser, DELEGATE_ROLE } from "@/lib/auth"
import { getStorageProvider, uploadFile } from "@/lib/storage"

const dataUrlRegex = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/i
let hasEvidencesTable: boolean | null = null

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string; ext: string } | null {
  const match = dataUrlRegex.exec(dataUrl)
  if (!match?.groups?.data || !match.groups.mime) return null
  const buffer = Buffer.from(match.groups.data, "base64")
  const mime = match.groups.mime
  const ext = mime.split("/")[1] || "bin"
  return { buffer, mime, ext }
}

// POST /api/alerts - create manual alert with optional photos; stored in evidences as type "alert"
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const isWitness = user.role === DELEGATE_ROLE || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    try {
      const fallback = await pool?.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
      delegateId = (fallback?.rows[0]?.id as string | undefined) ?? null
    } catch (err) {
      console.warn("delegate fallback lookup failed", err)
    }
  }
  if (isWitness && !delegateId) {
    return NextResponse.json({ error: "Perfil de testigo electoral incompleto" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const {
    scopeType,
    pollingStationCode,
    mesaLabel,
    municipality,
    department,
    notes,
    photos = [],
    level,
  } = body as {
    scopeType?: "puesto" | "mesa"
    pollingStationCode?: string
    mesaLabel?: string
    municipality?: string | null
    department?: string | null
    notes?: string
    photos?: string[]
    level?: "crítica" | "alta" | "media"
  }

  if (!scopeType) {
    return NextResponse.json({ error: "scopeType requerido" }, { status: 400 })
  }

  const normalizedLevel: "crítica" | "alta" | "media" = level === "crítica" || level === "media" ? level : "alta"

  await ensureEvidencesTable()

  const storageProvider = getStorageProvider()
  const uploadedUrls: string[] = []

  for (const [idx, photo] of photos.entries()) {
    if (typeof photo !== "string" || !photo.startsWith("data:")) continue
    const parsed = parseDataUrl(photo)
    if (!parsed) continue
    const filename = `${sanitizeFilename(mesaLabel || pollingStationCode || "alerta")}-${Date.now()}-${idx}.${parsed.ext}`
    try {
      const uploaded = await uploadFile(parsed.buffer, filename, "evidences/alerts")
      uploadedUrls.push(uploaded.url)
    } catch (err) {
      console.error("upload alert photo failed", err)
    }
  }

  const title = notes?.trim() ? notes.trim().slice(0, 80) : "Alerta manual"
  const detail = notes?.trim() || ""
  const evidenceId = crypto.randomUUID()
  const tags = [
    `scope:${scopeType}`,
    `level:${normalizedLevel}`,
    department ? `dept:${department}` : null,
    pollingStationCode ? `puesto:${pollingStationCode}` : null,
    mesaLabel ? `mesa:${mesaLabel}` : null,
  ].filter(Boolean)

  try {
    const client = await pool.connect()
    try {
      const insertQuery = `
        INSERT INTO evidences (
          id, type, title, description, municipality, polling_station, uploaded_by_id,
          status, url, tags, vote_report_id
        ) VALUES ($1, 'alert', $2, $3, $4, $5, $6, $7, $8, $9, NULL)
        RETURNING uploaded_at
      `

      const values = [
        evidenceId,
        title,
        detail,
        municipality ?? null,
        pollingStationCode ?? null,
        delegateId,
        "open",
        uploadedUrls[0] ?? "",
        tags,
      ]

      const { rows } = await client.query(insertQuery, values)
      const uploadedAt = rows[0]?.uploaded_at as string | null
      const delegateName = user.name ?? user.email ?? "Delegado"

      const item = {
        id: evidenceId,
        title,
        level: normalizedLevel,
        category: scopeType === "mesa" ? "mesa" : "puesto",
        municipality: municipality ?? pollingStationCode ?? "Sin municipio",
        department: department ?? null,
        time: uploadedAt ?? new Date().toISOString(),
        status: "abierta" as const,
        detail,
        delegateName,
        photos: uploadedUrls,
      }

      return NextResponse.json(item)
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Alerts POST error", error)
    return NextResponse.json({ error: error?.message ?? "No se pudo crear la alerta" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !body.id || !body.status) {
    return NextResponse.json({ error: "id y status requeridos" }, { status: 400 })
  }

  const statusMap: Record<string, string> = {
    abierta: "open",
    atendida: "in_progress",
    resuelta: "resolved",
  }

  const desired = statusMap[String(body.status).toLowerCase()]
  if (!desired) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 })
  }

  await ensureEvidencesTable()

  try {
    const client = await pool.connect()
    try {
      const { rowCount, rows } = await client.query(
        `UPDATE evidences SET status = $2 WHERE id = $1 AND type = 'alert' RETURNING id, status`,
        [body.id, desired],
      )

      if (rowCount === 0) {
        return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 })
      }

      const dbStatus = (rows[0]?.status as string | null) ?? desired
      const mapped = dbStatus === "resolved" || dbStatus === "verified" ? "resuelta" : dbStatus === "in_progress" ? "atendida" : "abierta"

      return NextResponse.json({ id: body.id, status: mapped })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Alerts PATCH error", error)
    return NextResponse.json({ error: "No se pudo actualizar la alerta" }, { status: 500 })
  }
}

function sanitizeFilename(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_") || "alert"
}

async function ensureEvidencesTable(): Promise<boolean> {
  if (hasEvidencesTable !== null) return hasEvidencesTable
  const res = await pool!.query(`SELECT to_regclass('public.evidences') AS oid`)
  if (res.rows[0]?.oid) {
    hasEvidencesTable = true
    return true
  }
  await pool!.query(
    `CREATE TABLE IF NOT EXISTS public.evidences (
       id uuid NOT NULL PRIMARY KEY,
       type text NOT NULL,
       title text NOT NULL,
       description text NULL,
       municipality text NULL,
       polling_station text NULL,
       uploaded_by_id uuid NULL,
       status text NOT NULL,
       url text NOT NULL,
       tags text[] NULL,
       vote_report_id uuid NULL,
       uploaded_at timestamptz DEFAULT now() NOT NULL,
       CONSTRAINT evidences_vote_report_id_fkey FOREIGN KEY (vote_report_id) REFERENCES public.vote_reports(id) ON DELETE SET NULL,
       CONSTRAINT evidences_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.delegates(id) ON DELETE SET NULL
     )`,
  )
  hasEvidencesTable = true
  return true
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const level = searchParams.get("level") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 400)

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    try {
      const fallback = await pool?.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
      delegateId = (fallback?.rows[0]?.id as string | undefined) ?? null
    } catch (err) {
      console.warn("delegate fallback lookup failed", err)
    }
  }
  if (isWitness && !delegateId) {
    return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 }, viewerRole: user.role ?? null })
  }

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(
      `(LOWER(COALESCE(vr.municipality,'')) LIKE $${values.length} OR LOWER(COALESCE(vr.polling_station_code,'')) LIKE $${values.length} OR LOWER(COALESCE(d.full_name, '')) LIKE $${values.length})`
    )
  }
  if (level) {
    values.push(level)
    filters.push(`'media' = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`'abierta' = $${values.length}`)
  }
  if (delegateId) {
    values.push(delegateId)
    filters.push(`vr.delegate_id = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT vr.id,
           vr.polling_station_code,
           vr.municipality,
           vr.reported_at,
           vr.total_votes,
           COALESCE(d.full_name, 'Delegado') AS delegate_name
    FROM vote_reports vr
    LEFT JOIN delegates d ON d.id = vr.delegate_id
    ${where}
    ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      0 AS criticas,
      COUNT(*) AS abiertas
    FROM vote_reports vr
    ${delegateId ? "WHERE vr.delegate_id = $1" : ""}
  `

  if (!pool) {
    return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 }, viewerRole: user.role ?? null })
  }

  try {
    const client = await pool.connect()
    try {
      await ensureEvidencesTable()
      const [listRes, statsRes, alertsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery, delegateId ? [delegateId] : []),
        client.query(
          `SELECT e.id, e.title, e.description, e.municipality, e.polling_station, e.uploaded_at, e.tags, e.url, e.status,
            COALESCE(d.full_name, 'Delegado') AS delegate_name
             FROM evidences e
             LEFT JOIN delegates d ON d.id = e.uploaded_by_id
            WHERE type = 'alert'
            ORDER BY uploaded_at DESC
            LIMIT 200`,
        ),
      ])

      const voteReportAlerts = listRes.rows.map((row) => ({
        id: row.id as string,
        title: `Nuevo reporte de votos (${row.delegate_name ?? "Delegado"})`,
        level: "media" as const,
        category: "votos",
        municipality: (row.municipality as string | null) ?? "Sin municipio",
        time: row.reported_at ? new Date(row.reported_at).toISOString() : null,
        status: "abierta" as const,
        detail: `Mesa ${row.polling_station_code ?? "Sin código"} · Total votos ${Number(row.total_votes ?? 0)}`,
        delegateName: row.delegate_name as string,
      }))

      const manualAlerts = alertsRes.rows.map((row) => {
        const tags: string[] | null = (row.tags as any) ?? null
        const tagLevel = tags?.find((t) => typeof t === "string" && t.startsWith("level:"))
        const tagDept = tags?.find((t) => typeof t === "string" && t.startsWith("dept:"))
        const level = tagLevel ? (tagLevel.split(":")[1] as "crítica" | "alta" | "media") : "alta"
        const department = tagDept ? tagDept.split(":").slice(1).join(":") : null
        const rawStatus = (row.status as string | null)?.toLowerCase() ?? "open"
        const status: "abierta" | "atendida" | "resuelta" =
          rawStatus === "resolved" || rawStatus === "verified"
            ? "resuelta"
            : rawStatus === "in_progress"
              ? "atendida"
              : "abierta"

        const photo = (row.url as string | null) ?? null

        return {
          id: row.id as string,
          title: row.title as string,
          level,
          category: "alerta",
          municipality: (row.municipality as string | null) ?? row.polling_station ?? "Sin municipio",
          department,
          time: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
          status,
          detail: row.description as string,
          delegateName: row.delegate_name as string,
          photos: photo ? [photo] : [],
        }
      })

      const combined = [...manualAlerts, ...voteReportAlerts].sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0
        const tb = b.time ? new Date(b.time).getTime() : 0
        return tb - ta
      })

      const manualCriticas = manualAlerts.filter((m) => m.level === "crítica").length
      const manualAbiertas = manualAlerts.filter((m) => m.status !== "resuelta").length
      const total = Number(statsRes.rows[0]?.total ?? 0) + manualAlerts.length
      return NextResponse.json({
        items: combined,
        stats: {
          total,
          criticas: Number(statsRes.rows[0]?.criticas ?? 0) + manualCriticas,
          abiertas: Number(statsRes.rows[0]?.abiertas ?? 0) + manualAbiertas,
        },
        viewerRole: user.role ?? null,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Alerts GET error", error)
    if ((error as any)?.code === "42P01") {
      return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 }, viewerRole: user.role ?? null })
    }
    return NextResponse.json({ error: "No se pudo cargar alertas" }, { status: 500 })
  }
}
