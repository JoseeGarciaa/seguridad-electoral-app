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

const numberFormatter = new Intl.NumberFormat("es-CO")

export async function getDashboardStats(): Promise<DashboardStat[]> {
  const puestosPromise = pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM divipole_locations")
  const assignmentsPromise = pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM delegate_polling_assignments")
  const reportsPromise = pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM vote_reports")

  const [puestosRes, assignmentsRes, reportsRes] = await Promise.all([
    puestosPromise,
    assignmentsPromise,
    reportsPromise,
  ])

  const puestos = Number(puestosRes.rows[0]?.count ?? 0)
  const assignments = Number(assignmentsRes.rows[0]?.count ?? 0)
  const verifiedReports = Number(reportsRes.rows[0]?.count ?? 0)
  const activeAlerts = 0 // alerts table no existe en el DDL

  return [
    {
      name: "Puestos de Votación",
      value: numberFormatter.format(puestos),
      description: "Cobertura DIVIPOLE",
      change: null,
    },
    {
      name: "Asignaciones de Testigo",
      value: numberFormatter.format(assignments),
      description: "Asignaciones activas",
      change: null,
    },
    {
      name: "Reportes Verificados",
      value: numberFormatter.format(verifiedReports),
      description: "Últimas 24h",
      change: null,
    },
    {
      name: "Alertas Activas",
      value: numberFormatter.format(activeAlerts),
      description: "Requieren atención",
      change: null,
      changeType: "negative",
    },
  ]
}

export async function getCoverageOverview(limit = 12): Promise<{ items: CoverageItem[]; summary: CoverageSummary }> {
  type CoverageRow = { departamento: string; puestos: string }

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
    const status = coverage >= 85 ? "green" : coverage >= 50 ? "yellow" : "red"
    return {
      name: row.departamento,
      coverage,
      puestos,
      status,
    }
  })

  const summary = items.reduce<CoverageSummary>(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { green: 0, yellow: 0, red: 0 }
  )

  return { items, summary }
}

export async function getRecentAlerts(limit = 6): Promise<{ items: AlertItem[]; activeCount: number }> {
  // No existe tabla alerts en el DDL; devolvemos vacío para evitar fallas
  return { items: [], activeCount: 0 }
}

export async function getActivityFeed(limit = 8): Promise<ActivityItem[]> {
  // Como el DDL no define alerts ni vote_records, devolvemos feed vacío
  const events: ActivityItem[] = []
  return events.slice(0, limit)
}