import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const isAdmin = user.role === "admin"
  const isDelegate = user.role === "delegate" || user.role === "witness"
  if (!isAdmin && !isDelegate) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!pool) {
    return Response.json({ error: "DB no disponible" }, { status: 503 })
  }

  const search = new URL(req.url).searchParams.get("search")?.trim() ?? ""

  const client = await pool.connect()
  try {
    let delegateId = user.delegateId
    if (!delegateId && isDelegate && user.email) {
      const fallback = await client.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [
        user.email,
      ])
      delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
    }
    if (isDelegate && !delegateId) {
      return Response.json({ error: "Perfil de testigo incompleto" }, { status: 403 })
    }

    type ComplianceRow = {
      id: string
      full_name: string
      email: string
      municipality: string | null
      assigned: number | string
      reported: number | string
      missing: number | string
      last_reported_at: string | null
    }

    if (isAdmin) {
      const values: any[] = []
      const filters: string[] = []

      if (search) {
        values.push(`%${search.toLowerCase()}%`)
        filters.push(
          `(LOWER(d.full_name) LIKE $${values.length} OR LOWER(d.email) LIKE $${values.length} OR LOWER(COALESCE(d.municipality, '')) LIKE $${values.length})`,
        )
      }

      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

      const listQuery = `
        WITH assigned AS (
          SELECT delegate_id, COUNT(*) AS assigned
          FROM delegate_polling_assignments
          GROUP BY delegate_id
        ), reported AS (
          SELECT delegate_id, COUNT(DISTINCT delegate_assignment_id) AS reported, MAX(reported_at) AS last_reported_at
          FROM vote_reports
          WHERE delegate_assignment_id IS NOT NULL
          GROUP BY delegate_id
        )
        SELECT d.id,
               d.full_name,
               d.email,
               d.municipality,
               COALESCE(a.assigned, 0) AS assigned,
               COALESCE(r.reported, 0) AS reported,
               GREATEST(COALESCE(a.assigned, 0) - COALESCE(r.reported, 0), 0) AS missing,
               r.last_reported_at
        FROM delegates d
        LEFT JOIN assigned a ON a.delegate_id = d.id
        LEFT JOIN reported r ON r.delegate_id = d.id
        ${where}
        ORDER BY missing DESC, assigned DESC, d.full_name ASC
        LIMIT 500
      `

      const summaryQuery = `
        WITH assigned AS (
          SELECT COUNT(*) AS assigned
          FROM delegate_polling_assignments
        ), reported AS (
          SELECT COUNT(DISTINCT delegate_assignment_id) AS reported
          FROM vote_reports
          WHERE delegate_assignment_id IS NOT NULL
        )
        SELECT
          (SELECT assigned FROM assigned) AS assigned,
          (SELECT reported FROM reported) AS reported
      `

      const [listRes, summaryRes] = await Promise.all([
        client.query<ComplianceRow>(listQuery, values),
        client.query(summaryQuery),
      ])

      const assigned = Number(summaryRes.rows[0]?.assigned ?? 0)
      const reported = Number(summaryRes.rows[0]?.reported ?? 0)
      const missing = Math.max(assigned - reported, 0)
      const coveragePct = assigned === 0 ? 0 : Math.round((reported / assigned) * 100)

      return Response.json({
        summary: {
          assigned,
          reported,
          missing,
          coveragePct,
        },
        items: listRes.rows.map((row: ComplianceRow) => ({
          id: row.id as string,
          name: row.full_name as string,
          email: row.email as string,
          municipality: row.municipality as string | null,
          assigned: Number(row.assigned ?? 0),
          reported: Number(row.reported ?? 0),
          missing: Number(row.missing ?? 0),
          lastReportedAt: row.last_reported_at ? new Date(row.last_reported_at).toISOString() : null,
        })),
        viewerRole: user.role,
      })
    }

    const assignedRes = await client.query(
      `SELECT COUNT(*) AS assigned
         FROM delegate_polling_assignments
        WHERE delegate_id = $1`,
      [delegateId],
    )
    const reportedRes = await client.query(
      `SELECT COUNT(DISTINCT delegate_assignment_id) AS reported
         FROM vote_reports
        WHERE delegate_id = $1 AND delegate_assignment_id IS NOT NULL`,
      [delegateId],
    )

    const assigned = Number(assignedRes.rows[0]?.assigned ?? 0)
    const reported = Number(reportedRes.rows[0]?.reported ?? 0)
    const missing = Math.max(assigned - reported, 0)
    const coveragePct = assigned === 0 ? 0 : Math.round((reported / assigned) * 100)

    return Response.json({
      summary: {
        assigned,
        reported,
        missing,
        coveragePct,
      },
      items: [],
      viewerRole: user.role,
    })
  } catch (error: any) {
    console.error("Compliance GET error", error)
    return Response.json({ error: "No se pudo obtener cumplimiento", detail: String(error?.message ?? error) }, { status: 500 })
  } finally {
    client.release()
  }
}

