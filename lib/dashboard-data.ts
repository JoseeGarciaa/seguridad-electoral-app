import { pool } from "./pg"

export type DashboardStat = {
  name: string
  value: string
  description?: string
  change?: string | null
  changeType?: "positive" | "negative"
}

export type CoverageItem = {
  name: string
  coverage: number
  puestos: number
  status: "green" | "yellow" | "red"
}

export type CoverageSummary = {
  green: number
  yellow: number
  red: number
}

export type AlertItem = {
  id: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  time: string
}

export type ActivityItem = {
  id: string
  type: "alert" | "assignment" | "vote"
  title: string
  detail: string
  time: string
}

export type VoteCandidateDetail = {
  candidateId: string
  fullName: string | null
  party: string | null
  position: string | null
  ballotNumber: number | null
  color: string | null
  votes: number
}

export type VoteReportSummary = {
  id: string
  pollingStation: string | null
  municipality: string | null
  department: string | null
  totalVotes: number
  reportedAt: string | null
  details: VoteCandidateDetail[]
}

const numberFormatter = new Intl.NumberFormat("es-CO")

async function safeCount(query: string, params: any[] = [], fallback = 0): Promise<number> {
  try {
    const { rows } = await pool.query<{ c: string }>(query, params)
    return Number(rows[0]?.c ?? fallback)
  } catch (err: any) {
    if (err?.code === "42P01") return fallback // tabla no existe
    throw err
  }
}

async function safeSum(query: string, params: any[] = [], fallback = 0): Promise<number> {
  try {
    const { rows } = await pool.query<{ s: string }>(query, params)
    return Number(rows[0]?.s ?? fallback)
  } catch (err: any) {
    if (err?.code === "42P01") return fallback
    throw err
  }
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  if (!pool) {
    return [
      { name: "Reportes de votos", value: "0", description: "Mesas reportadas", change: null },
      { name: "Votos registrados", value: "0", description: "Total acumulado", change: null },
      { name: "Evidencias cargadas", value: "0", description: "Fotos y documentos", change: null },
      { name: "Alertas activas", value: "0", description: "Requieren atención", change: null, changeType: "negative" },
    ]
  }

  const [reportsCount, totalVotes, evidencesCount, activeAlerts] = await Promise.all([
    safeCount("SELECT COUNT(*) AS c FROM vote_reports"),
    safeSum("SELECT COALESCE(SUM(total_votes),0) AS s FROM vote_reports"),
    safeCount("SELECT COUNT(*) AS c FROM evidences"),
    safeCount("SELECT COUNT(*) AS c FROM evidences WHERE status != 'verified'"),
  ])

  return [
    {
      name: "Reportes de votos",
      value: numberFormatter.format(reportsCount),
      description: "Mesas reportadas",
      change: null,
    },
    {
      name: "Votos registrados",
      value: numberFormatter.format(totalVotes),
      description: "Total acumulado",
      change: null,
    },
    {
      name: "Evidencias cargadas",
      value: numberFormatter.format(evidencesCount),
      description: "Fotos y documentos",
      change: null,
    },
    {
      name: "Alertas activas",
      value: numberFormatter.format(activeAlerts),
      description: "Requieren atención",
      change: null,
      changeType: "negative",
    },
  ]
}

export async function getRecentVoteReports(opts?: { delegateId?: string | null; limit?: number }): Promise<VoteReportSummary[]> {
  if (!pool) return []
  const limit = opts?.limit ?? 6
  const delegateId = opts?.delegateId ?? null
  const isFiltered = Boolean(delegateId)

  const where = isFiltered ? "WHERE vr.delegate_id = $1" : ""
  const params = isFiltered ? [delegateId, limit] : [limit]
  const limitParam = isFiltered ? "$2" : "$1"

  const query = `
    SELECT
      vr.id,
      vr.polling_station_code,
      vr.department,
      vr.municipality,
      vr.total_votes,
      vr.reported_at,
      json_agg(
        json_build_object(
          'candidateId', c.id,
          'fullName', c.full_name,
          'party', c.party,
          'position', c.position,
          'ballotNumber', c.ballot_number,
          'color', c.color,
          'votes', vd.votes
        )
        ORDER BY c.position, c.ballot_number NULLS LAST, c.full_name
      ) FILTER (WHERE vd.candidate_id IS NOT NULL) AS details
    FROM vote_reports vr
    LEFT JOIN vote_details vd ON vd.vote_report_id = vr.id
    LEFT JOIN candidates c ON c.id = vd.candidate_id
    ${where}
    GROUP BY vr.id
    ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
    LIMIT ${limitParam}
  `

  try {
    const { rows } = await pool.query(query, params)
    return rows.map((row: any) => ({
      id: row.id as string,
      pollingStation: row.polling_station_code as string | null,
      municipality: row.municipality as string | null,
      department: row.department as string | null,
      totalVotes: Number(row.total_votes ?? 0),
      reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : null,
      details: Array.isArray(row.details) ? row.details.filter(Boolean) : [],
    }))
  } catch (err: any) {
    if (err?.code === "42P01") return []
    throw err
  }
}

export async function getCoverageOverview(limit = 12): Promise<{ items: CoverageItem[]; summary: CoverageSummary }> {
  type CoverageRow = { departamento: string; puestos: string }

  if (!pool) {
    return { items: [], summary: { green: 0, yellow: 0, red: 0 } }
  }

  const { rows } = await pool.query<CoverageRow>(
    `SELECT departamento, COUNT(*) AS puestos
     FROM divipole_locations
     GROUP BY departamento
     ORDER BY puestos DESC
     LIMIT $1`,
    [limit],
  )

  // No hay relación directa con asignaciones en el DDL, asumimos 0 asignados
  const items = rows.map((row) => {
    const puestos = Number(row.puestos)
    const assigned = 0
    const coverage = puestos === 0 ? 0 : Math.round((assigned / puestos) * 100)
    const status: CoverageItem["status"] = coverage >= 85 ? "green" : coverage >= 50 ? "yellow" : "red"
    return {
      name: row.departamento,
      coverage,
      puestos,
      status,
    }
  })

  const summary = items.reduce<CoverageSummary>((acc, item) => {
    const key: keyof CoverageSummary = item.status
    acc[key] += 1
    return acc
  }, { green: 0, yellow: 0, red: 0 })

  return { items, summary }
}

export async function getRecentAlerts(
  opts?: { delegateId?: string | null; limit?: number }
): Promise<{ items: AlertItem[]; activeCount: number }> {
  const limit = opts?.limit ?? 6
  const delegateId = opts?.delegateId ?? null

 
  async function safeCount(query: string, params: any[] = [], fallback = 0): Promise<number> {
    try {
      const { rows } = await pool.query<{ c: string }>(query, params)
      return Number(rows[0]?.c ?? fallback)
    } catch (err: any) {
      if (err?.code === "42P01") return fallback // tabla no existe en esta instancia
      throw err
    }
  }
  if (!pool) {
    return { items: [], activeCount: 0 }
  }

  const alertsQuery = delegateId
    ? `SELECT id, title, description AS message, status AS severity, uploaded_at AS time
       FROM evidences
       WHERE uploaded_by_id = $1
       ORDER BY uploaded_at DESC
       LIMIT $2`
    : `SELECT id, title, description AS message, status AS severity, uploaded_at AS time
       FROM evidences
       ORDER BY uploaded_at DESC
       LIMIT $1`

  const params = delegateId ? [delegateId, limit] : [limit]
  try {
    const { rows } = await pool.query(alertsQuery, params)

    const mapped: AlertItem[] = rows.map((row) => {
      const rawTime = (row.time as any) ?? null
      const timeValue = rawTime instanceof Date
        ? rawTime.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
        : rawTime
          ? new Date(rawTime).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
          : ""

      return {
        id: String(row.id),
        severity: "medium",
        title: (row.title as string) ?? "Alerta",
        message: (row.message as string) ?? "",
        time: timeValue,
      }
    })

    const activeCount = delegateId
      ? mapped.length
      : await safeCount("SELECT COUNT(*) AS c FROM evidences WHERE status != 'verified'")

    return { items: mapped, activeCount }
  } catch (err: any) {
    if (err?.code === "42P01") {
      return { items: [], activeCount: 0 }
    }
    throw err
  }
}

export async function getActivityFeed(limit = 8): Promise<ActivityItem[]> {
  // Como el DDL no define alerts ni vote_records, devolvemos feed vacío
  const events: ActivityItem[] = []
  return events.slice(0, limit)
}

export async function getWitnessDashboardStats(delegateId: string | null): Promise<DashboardStat[]> {
  if (!delegateId || !pool) {
    return [
      { name: "Puesto asignado", value: "Sin puesto asignado", description: "Puesto asignado" },
      { name: "Reportes enviados", value: "0", description: "Enviados por ti" },
      { name: "Votos reportados", value: "0", description: "Total acumulado" },
      { name: "Alertas activas", value: "0", description: "Generadas por tu gestión", changeType: "negative" },
    ]
  }

  type AssignmentRow = {
    polling_station: string | null
    polling_station_number: string | null
    puesto: string | null
    municipio: string | null
    departamento: string | null
  }

  const reportesPromise = safeCount(
    `SELECT COUNT(*) AS c FROM vote_reports WHERE delegate_id = $1`,
    [delegateId],
  )
  const votosPromise = safeSum(
    `SELECT COALESCE(SUM(total_votes),0) AS s FROM vote_reports WHERE delegate_id = $1`,
    [delegateId],
  )
  const ultimoReportePromise = (async () => {
    try {
      const { rows } = await pool.query<{ last: string | null }>(
        `SELECT MAX(reported_at) AS last FROM vote_reports WHERE delegate_id = $1`,
        [delegateId],
      )
      return rows[0]?.last ?? null
    } catch (err: any) {
      if (err?.code === "42P01") return null
      throw err
    }
  })()
  const alertasPromise = safeCount(
    `SELECT COUNT(*) AS c FROM evidences WHERE uploaded_by_id = $1 AND status != 'verified'`,
    [delegateId],
  )

  const assignments = await (async () => {
    try {
      const { rows } = await pool.query<AssignmentRow>(
        `SELECT polling_station, polling_station_number, dl.puesto, dl.municipio, dl.departamento
           FROM delegate_polling_assignments dpa
           LEFT JOIN divipole_locations dl ON dl.id = dpa.divipole_location_id
          WHERE dpa.delegate_id = $1
          ORDER BY dpa.id`,
        [delegateId],
      )
      return rows
    } catch (err: any) {
      // Some deployments may not have divipole_location_id; fallback to the base table columns only.
      if (err?.code === "42703") {
        const { rows } = await pool.query<AssignmentRow>(
          `SELECT polling_station, polling_station_number, NULL::text AS puesto, NULL::text AS municipio, NULL::text AS departamento
             FROM delegate_polling_assignments
            WHERE delegate_id = $1
            ORDER BY id`,
          [delegateId],
        )
        return rows
      }
      throw err
    }
  })()

  const [reportesCount, alertasCount, totalVotos, ultimoReporte] = await Promise.all([
    reportesPromise,
    alertasPromise,
    votosPromise,
    ultimoReportePromise,
  ])

  const mesasCount = assignments.length
  const primary = assignments[0] || null

  // Prefer the human-friendly puesto name; fallback to polling_station code
  const stationName = primary?.puesto || primary?.polling_station || null
  let resolvedPuestoName: string | null = null
  if (!primary?.puesto && primary?.polling_station) {
    try {
      const { rows } = await pool.query<{ puesto: string | null }>(
        `SELECT puesto FROM divipole_locations WHERE id::text = $1 OR pp = $1 LIMIT 1`,
        [primary.polling_station],
      )
      resolvedPuestoName = rows[0]?.puesto ?? null
    } catch (err: any) {
      if (err?.code !== "42P01") throw err
    }
  }
  const locationLabelParts = [primary?.municipio, primary?.departamento].filter(Boolean)
  const locationLabel = locationLabelParts.join(" · ")
  const mesasLabel = mesasCount > 0 ? (mesasCount === 1 ? "1 mesa" : `${mesasCount} mesas`) : "Sin mesas"
  const composedDescription = [locationLabel, mesasLabel].filter(Boolean).join(" • ") || "Puesto asignado"
  const assignedValue = resolvedPuestoName || stationName || "Sin puesto asignado"

  const reportes = numberFormatter.format(reportesCount)
  const votos = numberFormatter.format(totalVotos)
  const ultimoLabel = ultimoReporte
    ? new Date(ultimoReporte).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
    : "Sin reportes"
  const alertas = numberFormatter.format(alertasCount)

  return [
    { name: "Puesto asignado", value: assignedValue, description: composedDescription },
    { name: "Reportes enviados", value: reportes, description: `Último: ${ultimoLabel}` },
    { name: "Votos reportados", value: votos, description: "Total acumulado" },
    { name: "Alertas activas", value: alertas, description: "Generadas por tu gestión", changeType: "negative" },
  ]
}