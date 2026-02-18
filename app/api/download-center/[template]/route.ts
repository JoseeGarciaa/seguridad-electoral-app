import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"
import { buildOfficialComparison, ensureMesaFactLookupIndex } from "@/lib/mesa-fact"

export const runtime = "nodejs"

type TemplateKey = "reporte-completo" | "alertas" | "testigos-electorales"

const TEMPLATE_FILENAME: Record<TemplateKey, string> = {
  "reporte-completo": "reporte-completo-detallado",
  alertas: "descarga-alertas",
  "testigos-electorales": "testigos-electorales",
}

function sanitizeFileName(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

function withWorksheetFormatting(worksheet: XLSX.WorkSheet, rows: Array<Record<string, any>>, headers: string[]) {
  const colWidths = headers.map((header) => {
    const maxContent = rows.reduce((max, row) => {
      const value = row[header]
      const text = value === null || value === undefined ? "" : String(value)
      return Math.max(max, text.length)
    }, header.length)
    return { wch: Math.min(Math.max(maxContent + 3, 14), 60) }
  })

  worksheet["!cols"] = colWidths
  if (headers.length > 0) {
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: 0, c: headers.length - 1 },
      }),
    }
  }
}

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Array<Record<string, any>>,
  preferredHeaders?: string[],
) {
  if (!rows.length) {
    const empty = [{ Mensaje: "Sin datos para exportar" }]
    const sheet = XLSX.utils.json_to_sheet(empty)
    withWorksheetFormatting(sheet, empty, ["Mensaje"])
    XLSX.utils.book_append_sheet(workbook, sheet, name)
    return
  }

  const headers = preferredHeaders && preferredHeaders.length > 0
    ? preferredHeaders
    : Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers })
  withWorksheetFormatting(sheet, rows, headers)
  XLSX.utils.book_append_sheet(workbook, sheet, name)
}

async function buildReporteCompletoWorkbook() {
  const workbook = XLSX.utils.book_new()

  const candidatesPartyColumnCheck = await pool!.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'party' LIMIT 1`,
  )
  const hasCandidatesParty = candidatesPartyColumnCheck.rows.length > 0
  const candidatePartyExpr = hasCandidatesParty ? "c.party" : "NULL::text"

  const [municipalitySummary, pollingSummary, detailRows, partyRows] = await Promise.all([
    pool!.query(`
      SELECT
        vr.department AS "Departamento",
        vr.municipality AS "Municipio",
        SUM(vr.total_votes)::int AS "Total votos municipio",
        COUNT(vr.id)::int AS "Mesas reportadas"
      FROM vote_reports vr
      GROUP BY vr.department, vr.municipality
      ORDER BY vr.department, vr.municipality
    `),
    pool!.query(`
      SELECT
        vr.department AS "Departamento",
        vr.municipality AS "Municipio",
        COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto') AS "Puesto de votación",
        SUM(vr.total_votes)::int AS "Total votos puesto",
        COUNT(vr.id)::int AS "Mesas reportadas"
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      GROUP BY vr.department, vr.municipality, COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto')
      ORDER BY vr.department, vr.municipality, "Puesto de votación"
    `),
    pool!.query(`
      SELECT
        vr.department AS "Departamento",
        vr.municipality AS "Municipio",
        COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto') AS "Puesto de votación",
        a.polling_station_number AS "Mesa",
        vr.total_votes::int AS "Votos mesa",
        ${candidatePartyExpr} AS "Partido",
        c.full_name AS "Candidato",
        c.position AS "Cargo",
        c.ballot_number AS "Tarjetón",
        vd.votes::int AS "Votos candidato",
        COALESCE(d.full_name, 'Delegado') AS "Testigo electoral",
        COALESCE(d.phone, '') AS "Celular testigo electoral",
        vr.reported_at AS "Fecha y hora"
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN vote_details vd ON vd.vote_report_id = vr.id
      LEFT JOIN candidates c ON c.id = vd.candidate_id
      ORDER BY vr.reported_at DESC, vr.department, vr.municipality
      LIMIT 12000
    `),
    pool!.query(`
      SELECT
        vr.department AS "Departamento",
        vr.municipality AS "Municipio",
        COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto') AS "Puesto de votación",
        a.polling_station_number AS "Mesa",
        vpd.position AS "Cargo",
        vpd.party AS "Partido",
        vpd.votes::int AS "Votos partido",
        COALESCE(d.full_name, 'Delegado') AS "Testigo electoral",
        COALESCE(d.phone, '') AS "Celular testigo electoral",
        vr.reported_at AS "Fecha y hora"
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN vote_party_details vpd ON vpd.vote_report_id = vr.id
      ORDER BY vr.reported_at DESC, vr.department, vr.municipality
      LIMIT 12000
    `),
  ])

  appendSheet(workbook, "Resumen Municipio", municipalitySummary.rows)
  appendSheet(workbook, "Resumen Puesto", pollingSummary.rows)
  appendSheet(workbook, "Detalle Candidatos", detailRows.rows)
  appendSheet(workbook, "Detalle Partidos", partyRows.rows)

  return workbook
}

function levelFromTags(tags: string[] | null | undefined) {
  if (!Array.isArray(tags)) return "alta"
  const tag = tags.find((item) => typeof item === "string" && item.startsWith("level:"))
  return tag ? tag.split(":").slice(1).join(":") : "alta"
}

function departmentFromTags(tags: string[] | null | undefined) {
  if (!Array.isArray(tags)) return null
  const tag = tags.find((item) => typeof item === "string" && item.startsWith("dept:"))
  return tag ? tag.split(":").slice(1).join(":") : null
}

function alertMessageFromComparison(comparison: ReturnType<typeof buildOfficialComparison>) {
  if (!comparison.hasOfficialData) {
    return comparison.officialNotice ?? "Sin información oficial histórica para comparación"
  }
  if (comparison.overVoting && comparison.increaseAlert) return "Sobrevotación e incremento fuera de rango"
  if (comparison.overVoting && comparison.decreaseAlert) return "Sobrevotación y disminución fuera de rango"
  if (comparison.increaseAlert) return "Incremento de votantes"
  if (comparison.decreaseAlert) return "Disminución de votantes"
  if (comparison.mismatch) return "Diferencia entre reportado y oficial"
  return "Alerta de validación"
}

async function buildAlertasWorkbook() {
  const workbook = XLSX.utils.book_new()
  await ensureMesaFactLookupIndex()

  const [puestoTotalsRes, voteReportsRes, manualAlertsRes] = await Promise.all([
    pool!.query(`
      SELECT
        vr.department,
        vr.municipality,
        COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto') AS polling_station,
        SUM(vr.total_votes)::int AS puesto_total_votes
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      GROUP BY vr.department, vr.municipality, COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto')
    `),
    pool!.query(`
      SELECT
        vr.id,
        vr.department,
        vr.municipality,
        COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station, 'Sin puesto') AS polling_station,
        a.polling_station_number,
        vr.total_votes,
        vr.reported_at,
        COALESCE(d.full_name, 'Delegado') AS delegate_name,
        COALESCE(d.phone, '') AS delegate_phone,
        mf.votantes AS official_votantes,
        mf.total_oficial AS official_total_oficial
      FROM vote_reports vr
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      LEFT JOIN delegates d ON d.id = vr.delegate_id
      LEFT JOIN LATERAL (
        SELECT
          mf.votantes,
          mf.votantes AS total_oficial
        FROM mesa_fact mf
        WHERE REGEXP_REPLACE(LOWER(TRIM(mf.puesto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(COALESCE(NULLIF(vr.polling_station_code, ''), a.polling_station))), '\\s+', ' ', 'g')
          AND (
            NULLIF(TRIM(COALESCE(vr.department, '')), '') IS NULL
            OR REGEXP_REPLACE(LOWER(TRIM(mf.depto)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(vr.department)), '\\s+', ' ', 'g')
          )
          AND (
            NULLIF(TRIM(COALESCE(vr.municipality, '')), '') IS NULL
            OR REGEXP_REPLACE(LOWER(TRIM(mf.municipio)), '\\s+', ' ', 'g') = REGEXP_REPLACE(LOWER(TRIM(vr.municipality)), '\\s+', ' ', 'g')
          )
          AND mf.mesa = COALESCE(
            a.polling_station_number,
            CASE WHEN vr.polling_station_code ~ '^[0-9]+$' THEN vr.polling_station_code::int ELSE NULL END
          )
        ORDER BY mf.mesaid
        LIMIT 1
      ) mf ON true
      ORDER BY vr.reported_at DESC
      LIMIT 12000
    `),
    pool!.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.municipality,
        e.polling_station,
        e.tags,
        e.uploaded_at,
        COALESCE(d.full_name, 'Delegado') AS delegate_name,
        COALESCE(d.phone, '') AS delegate_phone,
        vr.department,
        vr.total_votes AS mesa_votes,
        a.polling_station_number
      FROM evidences e
      LEFT JOIN delegates d ON d.id = e.uploaded_by_id
      LEFT JOIN vote_reports vr ON vr.id = e.vote_report_id
      LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
      WHERE e.type = 'alert'
      ORDER BY e.uploaded_at DESC
      LIMIT 12000
    `),
  ])

  const puestoTotals = new Map<string, number>()
  for (const row of puestoTotalsRes.rows) {
    const key = `${row.department ?? ""}|${row.municipality ?? ""}|${row.polling_station ?? ""}`
    puestoTotals.set(key, Number(row.puesto_total_votes ?? 0))
  }

  const voteAlertRows = voteReportsRes.rows
    .flatMap((row): Array<Record<string, any>> => {
      const totalReported = Number(row.total_votes ?? 0)
      const totalOficial = row.official_total_oficial === null || row.official_total_oficial === undefined
        ? null
        : Number(row.official_total_oficial)
      const votantes = row.official_votantes === null || row.official_votantes === undefined
        ? null
        : Number(row.official_votantes)
      const comparison = buildOfficialComparison(totalReported, totalOficial, votantes)

      if (!comparison.hasOfficialData && !comparison.officialNotice) return []
      if (comparison.hasOfficialData && !comparison.outOfExpectedRange && !comparison.overVoting) return []

      const puestoKey = `${row.department ?? ""}|${row.municipality ?? ""}|${row.polling_station ?? ""}`
      return [{
        "Tipo alerta": comparison.increaseAlert
          ? "Incremento"
          : comparison.decreaseAlert
            ? "Disminución"
            : comparison.overVoting
              ? "Sobrevotación"
              : "Validación",
        Departamento: row.department ?? "",
        Municipio: row.municipality ?? "",
        "Puesto de votación": row.polling_station ?? "Sin puesto",
        Mesa: row.polling_station_number ?? "",
        "Votos totales puesto": puestoTotals.get(puestoKey) ?? "",
        "Votos mesa": totalReported,
        "Mensaje alerta": alertMessageFromComparison(comparison),
        "Testigo electoral": row.delegate_name ?? "",
        "Celular testigo electoral": row.delegate_phone ?? "",
        "Fecha y hora": row.reported_at,
      }]
    })

  const manualRows = manualAlertsRes.rows.map((row) => {
    const department = row.department ?? departmentFromTags(row.tags as string[] | null | undefined) ?? ""
    const municipality = row.municipality ?? ""
    const pollingStation = row.polling_station ?? "Sin puesto"
    const key = `${department}|${municipality}|${pollingStation}`

    return {
      "Tipo alerta": levelFromTags(row.tags as string[] | null | undefined),
      Departamento: department,
      Municipio: municipality,
      "Puesto de votación": pollingStation,
      Mesa: row.polling_station_number ?? "",
      "Votos totales puesto": puestoTotals.get(key) ?? "",
      "Votos mesa": row.mesa_votes ?? "",
      "Mensaje alerta": row.description || row.title || "Alerta reportada",
      "Testigo electoral": row.delegate_name ?? "",
      "Celular testigo electoral": row.delegate_phone ?? "",
      "Fecha y hora": row.uploaded_at,
    }
  })

  appendSheet(workbook, "Alertas Reportadas", [...voteAlertRows, ...manualRows])
  return workbook
}

async function buildTestigosWorkbook() {
  const workbook = XLSX.utils.book_new()

  const divipoleColumnCheck = await pool!.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments' AND column_name = 'divipole_location_id' LIMIT 1`,
  )
  const hasDivipoleLocationId = divipoleColumnCheck.rows.length > 0
  const divipoleJoin = hasDivipoleLocationId
    ? `LEFT JOIN divipole_locations dl ON dl.id = a.divipole_location_id`
    : ``
  const departmentExpr = hasDivipoleLocationId
    ? `COALESCE(dl.departamento, d.department, vr.department, 'Sin departamento')`
    : `COALESCE(d.department, vr.department, 'Sin departamento')`
  const municipalityExpr = hasDivipoleLocationId
    ? `COALESCE(dl.municipio, d.municipality, vr.municipality, 'Sin municipio')`
    : `COALESCE(d.municipality, vr.municipality, 'Sin municipio')`
  const pollingStationExpr = hasDivipoleLocationId
    ? `COALESCE(dl.puesto, a.polling_station, vr.polling_station_code, 'Sin puesto')`
    : `COALESCE(a.polling_station, vr.polling_station_code, 'Sin puesto')`

  const delegateRes = await pool!.query(`
      SELECT
        ${departmentExpr} AS "Departamento",
        ${municipalityExpr} AS "Municipio",
        ${pollingStationExpr} AS "Puesto de votación",
        COALESCE(d.full_name, 'Delegado') AS "Testigo electoral",
        COALESCE(d.phone, '') AS "Celular testigo electoral",
        COUNT(a.id)::int AS "Mesas asignadas",
        COUNT(vr.id)::int AS "Mesas reportadas",
        GREATEST(COUNT(a.id) - COUNT(vr.id), 0)::int AS "Mesas sin reportar",
        COALESCE(SUM(vr.total_votes), 0)::int AS "Total votos reportados"
      FROM delegate_polling_assignments a
      JOIN delegates d ON d.id = a.delegate_id
      ${divipoleJoin}
      LEFT JOIN vote_reports vr ON vr.delegate_assignment_id = a.id
      GROUP BY
        ${departmentExpr},
        ${municipalityExpr},
        ${pollingStationExpr},
        COALESCE(d.full_name, 'Delegado'),
        COALESCE(d.phone, '')
      ORDER BY 1, 2, 3, 4
    `)

  appendSheet(workbook, "Testigos electorales", delegateRes.rows)

  return workbook
}

async function workbookByTemplate(template: TemplateKey) {
  if (template === "reporte-completo") return buildReporteCompletoWorkbook()
  if (template === "alertas") return buildAlertasWorkbook()
  return buildTestigosWorkbook()
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ template: string }> },
) {
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

  const { template } = await context.params
  const parsedTemplate = template as TemplateKey
  if (!(parsedTemplate in TEMPLATE_FILENAME)) {
    return NextResponse.json({ error: "Plantilla no soportada" }, { status: 404 })
  }

  try {
    const workbook = await workbookByTemplate(parsedTemplate)
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = `${sanitizeFileName(TEMPLATE_FILENAME[parsedTemplate])}-${timestamp}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("download-center export error", error)
    const message = error instanceof Error && error.message ? error.message : "No se pudo generar la plantilla"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
