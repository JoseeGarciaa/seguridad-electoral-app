import { NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"

export const runtime = "nodejs"

type E14Row = {
  report_id: string
  photo_url: string
  department: string
  municipality: string
  polling_station: string
  mesa: number | null
  reported_at: string | null
}

const pollingStationExpr = `COALESCE(NULLIF(TRIM(vr.polling_station_code), ''), NULLIF(TRIM(a.polling_station), ''), 'Sin puesto')`
const mesaExpr = `COALESCE(a.polling_station_number, CASE WHEN COALESCE(NULLIF(TRIM(vr.polling_station_code), ''), '') ~ '^[0-9]+$' THEN vr.polling_station_code::int ELSE NULL END)`

function sanitizeFileName(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

function cleanParam(value: string | null) {
  const parsed = value?.trim() ?? ""
  return parsed.length ? parsed : null
}

function imageFormatFromMime(mime: string) {
  if (mime.includes("png")) return "PNG"
  return "JPEG"
}

async function imageToDataUrl(url: string): Promise<{ dataUrl: string; mime: string }> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status})`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = (response.headers.get("content-type") || "").toLowerCase()
  const extension = url.toLowerCase().split("?")[0]

  const mime = contentType.includes("png") || extension.endsWith(".png")
    ? "image/png"
    : "image/jpeg"

  return {
    mime,
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
  }
}

async function getOptions(searchParams: URLSearchParams) {
  const department = cleanParam(searchParams.get("department"))
  const municipality = cleanParam(searchParams.get("municipality"))
  const pollingStation = cleanParam(searchParams.get("pollingStation"))

  const client = await pool!.connect()
  try {
    const departmentsRes = await client.query<{ value: string }>(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento') AS value
       FROM vote_reports vr
       WHERE vr.photo_url IS NOT NULL AND TRIM(vr.photo_url) <> ''
       ORDER BY 1`,
    )

    let municipalities: string[] = []
    if (department) {
      const municipalitiesRes = await client.query<{ value: string }>(
        `SELECT DISTINCT COALESCE(NULLIF(TRIM(vr.municipality), ''), 'Sin municipio') AS value
         FROM vote_reports vr
         WHERE vr.photo_url IS NOT NULL
           AND TRIM(vr.photo_url) <> ''
           AND LOWER(COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento')) = LOWER($1)
         ORDER BY 1`,
        [department],
      )
      municipalities = municipalitiesRes.rows.map((row) => row.value)
    }

    let pollingStations: string[] = []
    if (department && municipality) {
      const pollingRes = await client.query<{ value: string }>(
        `SELECT DISTINCT ${pollingStationExpr} AS value
         FROM vote_reports vr
         LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
         WHERE vr.photo_url IS NOT NULL
           AND TRIM(vr.photo_url) <> ''
           AND LOWER(COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento')) = LOWER($1)
           AND LOWER(COALESCE(NULLIF(TRIM(vr.municipality), ''), 'Sin municipio')) = LOWER($2)
         ORDER BY 1`,
        [department, municipality],
      )
      pollingStations = pollingRes.rows.map((row) => row.value)
    }

    let mesas: number[] = []
    if (department && municipality && pollingStation) {
      const mesasRes = await client.query<{ value: number }>(
        `SELECT DISTINCT ${mesaExpr} AS value
         FROM vote_reports vr
         LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
         WHERE vr.photo_url IS NOT NULL
           AND TRIM(vr.photo_url) <> ''
           AND LOWER(COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento')) = LOWER($1)
           AND LOWER(COALESCE(NULLIF(TRIM(vr.municipality), ''), 'Sin municipio')) = LOWER($2)
           AND LOWER(${pollingStationExpr}) = LOWER($3)
           AND ${mesaExpr} IS NOT NULL
         ORDER BY 1`,
        [department, municipality, pollingStation],
      )
      mesas = mesasRes.rows.map((row) => Number(row.value)).filter(Number.isFinite)
    }

    return {
      departments: departmentsRes.rows.map((row) => ({ value: row.value, label: row.value })),
      municipalities: municipalities.map((value) => ({ value, label: value })),
      pollingStations: pollingStations.map((value) => ({ value, label: value })),
      mesas: mesas.map((value) => ({ value: String(value), label: String(value) })),
    }
  } finally {
    client.release()
  }
}

async function buildPdf(searchParams: URLSearchParams) {
  const department = cleanParam(searchParams.get("department"))
  const municipality = cleanParam(searchParams.get("municipality"))
  const pollingStation = cleanParam(searchParams.get("pollingStation"))
  const mesaParam = cleanParam(searchParams.get("mesa"))
  const mesa = mesaParam ? Number(mesaParam) : null

  if (!department) {
    return NextResponse.json({ error: "Debes seleccionar un departamento" }, { status: 400 })
  }

  if (mesaParam && (!Number.isInteger(mesa) || Number(mesa) <= 0)) {
    return NextResponse.json({ error: "Mesa inválida" }, { status: 400 })
  }

  const values: Array<string | number> = [department]
  const clauses: string[] = [
    "vr.photo_url IS NOT NULL",
    "TRIM(vr.photo_url) <> ''",
    "LOWER(COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento')) = LOWER($1)",
  ]

  if (municipality) {
    values.push(municipality)
    clauses.push(`LOWER(COALESCE(NULLIF(TRIM(vr.municipality), ''), 'Sin municipio')) = LOWER($${values.length})`)
  }

  if (pollingStation) {
    values.push(pollingStation)
    clauses.push(`LOWER(${pollingStationExpr}) = LOWER($${values.length})`)
  }

  if (mesa !== null && Number.isInteger(mesa)) {
    values.push(mesa)
    clauses.push(`${mesaExpr} = $${values.length}`)
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""

  const { rows } = await pool!.query<E14Row>(
    `SELECT
       vr.id AS report_id,
       vr.photo_url,
       COALESCE(NULLIF(TRIM(vr.department), ''), 'Sin departamento') AS department,
       COALESCE(NULLIF(TRIM(vr.municipality), ''), 'Sin municipio') AS municipality,
       ${pollingStationExpr} AS polling_station,
       ${mesaExpr} AS mesa,
       vr.reported_at
     FROM vote_reports vr
     LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
     ${whereSql}
     ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC`,
    values,
  )

  if (!rows.length) {
    return NextResponse.json({ error: "No hay imágenes E14 para los filtros seleccionados" }, { status: 404 })
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 24
  const contentWidth = pageWidth - margin * 2
  const imageMaxWidth = contentWidth

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]

    if (index > 0) {
      doc.addPage("letter", "portrait")
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text("Formulario E14", margin, 34)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    let cursorY = 52
    const headerLines = [
      `Departamento: ${row.department}`,
      `Municipio: ${row.municipality}`,
      `Puesto de votación: ${row.polling_station}`,
      `Mesa: ${row.mesa ?? "Sin mesa"}`,
    ]

    for (const text of headerLines) {
      const wrapped = doc.splitTextToSize(text, contentWidth)
      const lines = Array.isArray(wrapped) ? wrapped : [String(wrapped)]
      doc.text(lines, margin, cursorY)
      cursorY += lines.length * 12 + 2
    }

    doc.setDrawColor(180)
    const separatorY = cursorY + 2
    doc.line(margin, separatorY, pageWidth - margin, separatorY)

    const imageTop = separatorY + 12
    const imageMaxHeight = pageHeight - imageTop - margin

    try {
      const { dataUrl, mime } = await imageToDataUrl(row.photo_url)
      const imageProps = doc.getImageProperties(dataUrl)

      const ratio = Math.min(imageMaxWidth / imageProps.width, imageMaxHeight / imageProps.height)
      const renderWidth = imageProps.width * ratio
      const renderHeight = imageProps.height * ratio
      const x = (pageWidth - renderWidth) / 2
      const y = imageTop + (imageMaxHeight - renderHeight) / 2

      doc.addImage(dataUrl, imageFormatFromMime(mime), x, y, renderWidth, renderHeight, undefined, "FAST")
    } catch {
      doc.setTextColor(185, 28, 28)
      doc.setFontSize(11)
      doc.text("No se pudo cargar la imagen de este registro", margin, imageTop + 24)
      doc.setTextColor(0, 0, 0)
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const suffix = [department, municipality, pollingStation, mesa ? String(mesa) : null].filter(Boolean).join("-")
  const fileName = sanitizeFileName(`e14-${suffix || "filtros"}-${timestamp}`) + ".pdf"
  const pdfBytes = doc.output("arraybuffer")

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  })
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

  const action = cleanParam(req.nextUrl.searchParams.get("action")) ?? "options"

  try {
    if (action === "download") {
      return await buildPdf(req.nextUrl.searchParams)
    }

    const payload = await getOptions(req.nextUrl.searchParams)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("download formularios error", error)
    return NextResponse.json({ error: error?.message ?? "No se pudo completar la operación" }, { status: 500 })
  }
}
