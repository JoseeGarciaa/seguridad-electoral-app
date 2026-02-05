import { NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"

function emptyPayload() {
  return {
    stats: {
      reports: 0,
      activeDelegates: 0,
      totalLocations: 0,
      reportedLocations: 0,
      coverage: 0,
      lastUpdated: new Date().toISOString(),
    },
    candidates: [],
    feed: [],
    alerts: [],
    municipalities: [],
    evidences: [],
  }
}

async function safeQuery<T>(
  client: { query: <R>(queryText: string, params?: any[]) => Promise<{ rows: R[] }> },
  queryText: string,
  params: any[] = [],
  fallback: T[] = [],
): Promise<T[]> {
  try {
    const { rows } = await client.query<T>(queryText, params)
    return rows
  } catch (err: any) {
    if (err?.code === "42P01" || err?.code === "42703") {
      return fallback
    }
    throw err
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
    delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
  }
  if (isWitness && !delegateId) {
    return NextResponse.json(emptyPayload())
  }
  const delegateParams = delegateId ? [delegateId] : []

  const statsQuery = delegateId
    ? `
      SELECT
        (SELECT COUNT(*) FROM vote_reports vr WHERE vr.delegate_id = $1) AS reports,
        (SELECT COUNT(DISTINCT delegate_id) FROM delegate_polling_assignments WHERE delegate_id = $1) AS active_delegates,
        (SELECT COUNT(*) FROM delegate_polling_assignments WHERE delegate_id = $1) AS total_locations,
        (SELECT COUNT(DISTINCT polling_station_code) FROM vote_reports vr2 WHERE vr2.delegate_id = $1 AND vr2.polling_station_code IS NOT NULL) AS reported_locations
    `
    : `
      SELECT
        (SELECT COUNT(*) FROM vote_reports) AS reports,
        (SELECT COUNT(DISTINCT delegate_id) FROM delegate_polling_assignments) AS active_delegates,
        (SELECT COUNT(*) FROM divipole_locations) AS total_locations,
        (SELECT COUNT(DISTINCT polling_station_code) FROM vote_reports WHERE polling_station_code IS NOT NULL) AS reported_locations
    `

  const candidateQuery = delegateId
    ? `
      SELECT c.id, c.full_name, c.party, c.color, SUM(vd.votes)::bigint AS votes
      FROM vote_details vd
      JOIN vote_reports vr ON vr.id = vd.vote_report_id
      JOIN candidates c ON c.id = vd.candidate_id
      WHERE vr.delegate_id = $1
      GROUP BY c.id, c.full_name, c.party, c.color
      ORDER BY votes DESC
      LIMIT 8
    `
    : `
      SELECT c.id, c.full_name, c.party, c.color, SUM(vd.votes)::bigint AS votes
      FROM vote_details vd
      JOIN candidates c ON c.id = vd.candidate_id
      GROUP BY c.id, c.full_name, c.party, c.color
      ORDER BY votes DESC
      LIMIT 8
    `

  const feedQuery = delegateId
    ? `
      SELECT vr.id, COALESCE(d.full_name, 'Delegado') AS user_name, vr.municipality, vr.department,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      WHERE vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 20
    `
    : `
      SELECT vr.id, COALESCE(d.full_name, 'Delegado') AS user_name, vr.municipality, vr.department,
             COALESCE(vr.polling_station_code, vr.address, 'Puesto sin codigo') AS location,
             vr.reported_at
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 20
    `

  const municipalitiesQuery = delegateId
    ? `
      WITH assigned AS (
        SELECT COALESCE(dl.municipio, dpa.municipality, 'Municipio') AS municipality,
               COALESCE(dl.mesas, 1) AS mesas
        FROM delegate_polling_assignments dpa
        LEFT JOIN divipole_locations dl ON dl.id = dpa.divipole_location_id
        WHERE dpa.delegate_id = $1
      ), reported AS (
        SELECT municipality, COUNT(*) AS reported_mesas
        FROM vote_reports
        WHERE delegate_id = $1
        GROUP BY municipality
      )
      SELECT a.municipality AS name,
             COALESCE(r.reported_mesas, 0) AS reported,
             COALESCE(SUM(a.mesas), 0) AS total,
             CASE WHEN COALESCE(SUM(a.mesas), 0) = 0 THEN 0
                  ELSE ROUND((COALESCE(r.reported_mesas, 0)::numeric / SUM(a.mesas)) * 100)
             END AS coverage
      FROM assigned a
      LEFT JOIN reported r ON r.municipality = a.municipality
      GROUP BY a.municipality, r.reported_mesas
      ORDER BY coverage DESC NULLS LAST
      LIMIT 60
    `
    : `
      WITH totals AS (
        SELECT municipio AS municipality, SUM(mesas) AS total_mesas
        FROM divipole_locations
        GROUP BY municipio
      ), reported AS (
        SELECT municipality, COUNT(*) AS reported_mesas
        FROM vote_reports
        GROUP BY municipality
      )
      SELECT t.municipality AS name,
             COALESCE(r.reported_mesas, 0) AS reported,
             t.total_mesas AS total,
             CASE WHEN t.total_mesas = 0 THEN 0
                  ELSE ROUND((COALESCE(r.reported_mesas, 0)::numeric / t.total_mesas) * 100)
             END AS coverage
      FROM totals t
      LEFT JOIN reported r ON r.municipality = t.municipality
      ORDER BY coverage DESC NULLS LAST
      LIMIT 60
    `

  const evidencesQuery = delegateId
    ? `
      SELECT vr.id,
             COALESCE(vr.polling_station_code, 'Puesto sin codigo') AS puesto,
             COALESCE(vr.municipality, '') AS municipality,
             COALESCE(vr.address, '') AS address,
             vr.reported_at,
             vr.photo_url,
             COALESCE(d.full_name, 'Delegado') AS delegate_name,
             COALESCE(dpa.polling_station_number, 0) AS mesa_num
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE vr.photo_url IS NOT NULL AND vr.delegate_id = $1
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 24
    `
    : `
      SELECT vr.id,
             COALESCE(vr.polling_station_code, 'Puesto sin codigo') AS puesto,
             COALESCE(vr.municipality, '') AS municipality,
             COALESCE(vr.address, '') AS address,
             vr.reported_at,
             vr.photo_url,
             COALESCE(d.full_name, 'Delegado') AS delegate_name,
             COALESCE(dpa.polling_station_number, 0) AS mesa_num
      FROM vote_reports vr
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN delegate_polling_assignments dpa ON dpa.id = vr.delegate_assignment_id
      WHERE vr.photo_url IS NOT NULL
      ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
      LIMIT 24
    `

  const missingPhotoQuery = delegateId
    ? `SELECT COUNT(*) AS missing_photo FROM vote_reports WHERE delegate_id = $1 AND photo_url IS NULL`
    : `SELECT COUNT(*) AS missing_photo FROM vote_reports WHERE photo_url IS NULL`

  const client = await pool.connect()
  try {
    const [statsRows, candidateRows, feedRows, evidenceRows, photoMissRows] = await Promise.all([
      safeQuery<any>(client, statsQuery, delegateParams),
      safeQuery<any>(client, candidateQuery, delegateParams),
      safeQuery<any>(client, feedQuery, delegateParams),
      safeQuery<any>(client, evidencesQuery, delegateParams),
      safeQuery<any>(client, missingPhotoQuery, delegateParams),
    ])

    let muniRows = await safeQuery<any>(client, municipalitiesQuery, delegateParams)
    if (muniRows.length === 0) {
      const fallbackMunicipalities = delegateId
        ? `
          SELECT municipality AS name,
                 COUNT(*) AS reported,
                 COUNT(*) AS total,
                 100 AS coverage
          FROM vote_reports
          WHERE delegate_id = $1
          GROUP BY municipality
          ORDER BY reported DESC
          LIMIT 60
        `
        : `
          SELECT municipality AS name,
                 COUNT(*) AS reported,
                 COUNT(*) AS total,
                 100 AS coverage
          FROM vote_reports
          GROUP BY municipality
          ORDER BY reported DESC
          LIMIT 60
        `
      muniRows = await safeQuery<any>(client, fallbackMunicipalities, delegateParams)
    }

    const statsRow = statsRows[0] ?? {}
    const statsPayload = {
      reports: Number(statsRow?.reports ?? 0),
      activeDelegates: Number(statsRow?.active_delegates ?? 0),
      totalLocations: Number(statsRow?.total_locations ?? 0),
      reportedLocations: Number(statsRow?.reported_locations ?? 0),
      coverage:
        Number(statsRow?.total_locations ?? 0) === 0
          ? 0
          : Math.round((Number(statsRow?.reported_locations ?? 0) / Number(statsRow?.total_locations ?? 1)) * 100),
      lastUpdated: new Date().toISOString(),
    }

    const totalVotes = candidateRows.reduce((acc, row) => acc + Number(row.votes ?? 0), 0)
    const candidates = candidateRows.map((row) => ({
      id: row.id as string,
      name: (row.full_name as string) ?? "",
      party: (row.party as string) ?? null,
      votes: Number(row.votes ?? 0),
      percentage: totalVotes === 0 ? 0 : Number(((Number(row.votes ?? 0) / totalVotes) * 100).toFixed(1)),
      color: (row.color as string) ?? null,
    }))

    const feed = feedRows.map((row) => ({
      id: String(row.id),
      user: (row.user_name as string) ?? "Delegado",
      action: "Acta subida",
      location: `${row.location ?? "Puesto"} · ${row.municipality ?? ""}`,
      reportedAt: row.reported_at ? new Date(row.reported_at as string).toISOString() : new Date().toISOString(),
      type: "evidence" as const,
    }))

    const municipalities = muniRows.map((row) => {
      const coverage = Number(row.coverage ?? 0)
      const status: "green" | "yellow" | "red" = coverage >= 85 ? "green" : coverage >= 50 ? "yellow" : "red"
      return {
        name: (row.name as string) ?? "",
        coverage,
        reported: Number(row.reported ?? 0),
        total: Number(row.total ?? 0),
        status,
      }
    })

    const evidences = evidenceRows.map((row) => ({
      id: String(row.id),
      puesto: (row.puesto as string) ?? "Puesto",
      mesa: row.mesa_num ? `Mesa ${row.mesa_num}` : row.address || row.municipality || "",
      user: (row.delegate_name as string) ?? "Delegado",
      time: row.reported_at ? new Date(row.reported_at as string).toISOString() : new Date().toISOString(),
      status: "verified" as const,
      photoUrl: (row.photo_url as string) ?? null,
    }))

    const missingPhoto = Number(photoMissRows[0]?.missing_photo ?? 0)
    const lowCoverageAlerts = municipalities
      .filter((m) => m.coverage < 50)
      .slice(0, 5)
      .map((m, idx) => ({
        id: `low-${idx}`,
        severity: "critical" as const,
        title: "Cobertura critica",
        message: `${m.name} con ${m.coverage}% de cobertura (${m.reported}/${m.total})`,
        time: statsPayload.lastUpdated,
      }))

    const warningCoverageAlerts = municipalities
      .filter((m) => m.coverage >= 50 && m.coverage < 85)
      .slice(0, 5)
      .map((m, idx) => ({
        id: `warn-${idx}`,
        severity: "warning" as const,
        title: "Cobertura media",
        message: `${m.name} con ${m.coverage}% de cobertura`,
        time: statsPayload.lastUpdated,
      }))

    const photoAlerts = missingPhoto > 0
      ? [
          {
            id: "photo-missing",
            severity: "warning" as const,
            title: "Reportes sin foto",
            message: missingPhoto.toString() + " reportes sin evidencia fotografica",
            time: statsPayload.lastUpdated,
          },
        ]
      : []

    const alerts = [...lowCoverageAlerts, ...warningCoverageAlerts, ...photoAlerts].slice(0, 10)

    return NextResponse.json({
      stats: statsPayload,
      candidates,
      feed,
      alerts,
      municipalities,
      evidences,
    })
  } catch (err: any) {
    console.error("warroom error", err)
    if (err?.code === "42P01" || err?.code === "42703") {
      return NextResponse.json(emptyPayload())
    }
    return NextResponse.json({ error: "No se pudo cargar War Room" }, { status: 500 })
  } finally {
    client.release()
  }
}
