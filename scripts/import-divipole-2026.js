const fs = require("fs")
const path = require("path")
const { Client } = require("pg")
const XLSX = require("xlsx")

const DEFAULT_EXCEL_PATH = "D:\\divipole 2026\\Divipola_Elecciones_Congreso_2026_32_departamentos.xlsx"
const DEFAULT_SHEET_NAME = "divipola"

function parseArgs(argv) {
  const args = {
    file: DEFAULT_EXCEL_PATH,
    sheet: DEFAULT_SHEET_NAME,
    pruneUnreferenced: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--file") {
      args.file = String(argv[index + 1] || "").trim() || DEFAULT_EXCEL_PATH
      index += 1
      continue
    }
    if (token === "--sheet") {
      args.sheet = String(argv[index + 1] || "").trim() || DEFAULT_SHEET_NAME
      index += 1
      continue
    }
    if (token === "--no-prune-unreferenced") {
      args.pruneUnreferenced = false
      continue
    }
  }

  return args
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue
    const separatorIndex = line.indexOf("=")
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && !process.env[key]) process.env[key] = value
  }
}

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length ? text : null
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return 0
  const raw = String(value).trim()
  if (!raw) return 0
  const cleaned = raw.replace(/\./g, "").replace(/,/g, ".")
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function toFloat(value) {
  if (value === null || value === undefined || value === "") return null
  const raw = String(value).trim()
  if (!raw) return null
  const cleaned = raw.replace(/,/g, ".")
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function readDivipolaRows(excelPath, sheetName) {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`No existe el archivo Excel: ${excelPath}`)
  }

  const workbook = XLSX.readFile(excelPath)
  const availableSheets = workbook.SheetNames
  if (!availableSheets.includes(sheetName)) {
    throw new Error(`La hoja '${sheetName}' no existe. Hojas disponibles: ${availableSheets.join(", ")}`)
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

  return rows
    .map((row) => ({
      page: toInt(row.page),
      row_y: toInt(row.row_y),
      dd: normalizeText(row.dd),
      mm: normalizeText(row.mm),
      zz: normalizeText(row.zz),
      pp: normalizeText(row.pp),
      departamento: normalizeText(row.departamento),
      municipio: normalizeText(row.municipio),
      puesto: normalizeText(row.puesto),
      comuna: normalizeText(row.comuna),
      direccion: normalizeText(row.direccion),
      mujeres_coord: toInt(row.mujeres_coord),
      hombres_coord: toInt(row.hombres_coord),
      total_coord: toInt(row.total_coord),
      mesas_domingo: toInt(row.mesas_domingo),
      latitud: toFloat(row.latitud),
      longitud: toFloat(row.longitud),
      citrep: normalizeText(row.citrep),
      mesas_lunes_jueves_exterior: toInt(row.mesas_lunes_jueves_exterior),
      mesas_viernes_exterior: toInt(row.mesas_viernes_exterior),
      mesas_sabado_exterior: toInt(row.mesas_sabado_exterior),
      mujeres_censo: toInt(row.mujeres_censo),
      hombres_censo: toInt(row.hombres_censo),
      total_censo_adscrito: toInt(row.total_censo_adscrito),
      agrupados_lunes_sabado: normalizeText(row.agrupados_lunes_sabado),
    }))
    .filter((row) => row.dd && row.mm && row.zz && row.pp && row.departamento && row.municipio && row.puesto)
}

async function ensureDivipoleTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.divipole_locations (
      id bigserial PRIMARY KEY,
      dd text NOT NULL,
      mm text NOT NULL,
      zz text NOT NULL,
      pp text NOT NULL,
      departamento text NOT NULL,
      municipio text NOT NULL,
      puesto text NOT NULL,
      direccion text NULL,
      comuna text NULL,
      mujeres int4 DEFAULT 0 NOT NULL,
      hombres int4 DEFAULT 0 NOT NULL,
      total int4 DEFAULT 0 NOT NULL,
      mesas int4 DEFAULT 0 NOT NULL,
      latitud float8 NULL,
      longitud float8 NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT divipole_locations_dd_mm_zz_pp_key UNIQUE (dd, mm, zz, pp)
    )
  `)

  await client.query(`
    ALTER TABLE public.divipole_locations
      ADD COLUMN IF NOT EXISTS page int4 NULL,
      ADD COLUMN IF NOT EXISTS row_y int4 NULL,
      ADD COLUMN IF NOT EXISTS mujeres_coord int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS hombres_coord int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS total_coord int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS mesas_domingo int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS citrep text NULL,
      ADD COLUMN IF NOT EXISTS mesas_lunes_jueves_exterior int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS mesas_viernes_exterior int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS mesas_sabado_exterior int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS mujeres_censo int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS hombres_censo int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS total_censo_adscrito int4 DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS agrupados_lunes_sabado text NULL
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS divipole_locations_coords_idx
    ON public.divipole_locations USING btree (latitud, longitud)
    WHERE ((latitud IS NOT NULL) AND (longitud IS NOT NULL))
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS divipole_locations_departamento_municipio_idx
    ON public.divipole_locations USING btree (lower(departamento), lower(municipio))
  `)
}

async function upsertRows(client, rows) {
  await client.query(`
    CREATE TEMP TABLE IF NOT EXISTS tmp_divipole_keys (
      dd text NOT NULL,
      mm text NOT NULL,
      zz text NOT NULL,
      pp text NOT NULL,
      PRIMARY KEY (dd, mm, zz, pp)
    ) ON COMMIT DROP
  `)

  const batchSize = 250

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    const values = []
    const placeholders = []

    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index]
      const base = index * 25
      placeholders.push(`(${new Array(25).fill(0).map((_, i) => `$${base + i + 1}`).join(", ")})`)
      values.push(
        row.page,
        row.row_y,
        row.dd,
        row.mm,
        row.zz,
        row.pp,
        row.departamento,
        row.municipio,
        row.puesto,
        row.comuna,
        row.direccion,
        row.mujeres_coord,
        row.hombres_coord,
        row.total_coord,
        row.mesas_domingo,
        row.latitud,
        row.longitud,
        row.citrep,
        row.mesas_lunes_jueves_exterior,
        row.mesas_viernes_exterior,
        row.mesas_sabado_exterior,
        row.mujeres_censo,
        row.hombres_censo,
        row.total_censo_adscrito,
        row.agrupados_lunes_sabado,
      )
    }

    const keyPlaceholders = []
    const keyValues = []
    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index]
      const base = index * 4
      keyPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`)
      keyValues.push(row.dd, row.mm, row.zz, row.pp)
    }

    await client.query(
      `
        INSERT INTO tmp_divipole_keys (dd, mm, zz, pp)
        VALUES ${keyPlaceholders.join(",\n")}
        ON CONFLICT (dd, mm, zz, pp) DO NOTHING
      `,
      keyValues,
    )

    await client.query(
      `
        INSERT INTO public.divipole_locations (
          page, row_y, dd, mm, zz, pp, departamento, municipio, puesto, comuna, direccion,
          mujeres_coord, hombres_coord, total_coord, mesas_domingo, latitud, longitud, citrep,
          mesas_lunes_jueves_exterior, mesas_viernes_exterior, mesas_sabado_exterior,
          mujeres_censo, hombres_censo, total_censo_adscrito, agrupados_lunes_sabado
        )
        VALUES ${placeholders.join(",\n")}
        ON CONFLICT (dd, mm, zz, pp)
        DO UPDATE SET
          page = EXCLUDED.page,
          row_y = EXCLUDED.row_y,
          departamento = EXCLUDED.departamento,
          municipio = EXCLUDED.municipio,
          puesto = EXCLUDED.puesto,
          comuna = EXCLUDED.comuna,
          direccion = EXCLUDED.direccion,
          mujeres = EXCLUDED.mujeres_coord,
          hombres = EXCLUDED.hombres_coord,
          total = EXCLUDED.total_coord,
          mesas = EXCLUDED.mesas_domingo,
          mujeres_coord = EXCLUDED.mujeres_coord,
          hombres_coord = EXCLUDED.hombres_coord,
          total_coord = EXCLUDED.total_coord,
          mesas_domingo = EXCLUDED.mesas_domingo,
          latitud = EXCLUDED.latitud,
          longitud = EXCLUDED.longitud,
          citrep = EXCLUDED.citrep,
          mesas_lunes_jueves_exterior = EXCLUDED.mesas_lunes_jueves_exterior,
          mesas_viernes_exterior = EXCLUDED.mesas_viernes_exterior,
          mesas_sabado_exterior = EXCLUDED.mesas_sabado_exterior,
          mujeres_censo = EXCLUDED.mujeres_censo,
          hombres_censo = EXCLUDED.hombres_censo,
          total_censo_adscrito = EXCLUDED.total_censo_adscrito,
          agrupados_lunes_sabado = EXCLUDED.agrupados_lunes_sabado,
          updated_at = now()
      `,
      values,
    )
  }
}

async function pruneLegacyRows(client) {
  const result = await client.query(`
    DELETE FROM public.divipole_locations d
    WHERE NOT EXISTS (
      SELECT 1
      FROM tmp_divipole_keys t
      WHERE t.dd = d.dd AND t.mm = d.mm AND t.zz = d.zz AND t.pp = d.pp
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.delegate_polling_assignments a
      WHERE a.divipole_location_id = d.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.vote_reports vr
      WHERE vr.divipole_location_id = d.id
    )
  `)

  return result.rowCount || 0
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"))
  loadEnvFile(path.join(process.cwd(), ".env"))

  const args = parseArgs(process.argv.slice(2))
  const rows = readDivipolaRows(args.file, args.sheet)
  if (!rows.length) throw new Error("No se encontraron filas validas para importar")

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurado")
  }

  const client = new Client({
    connectionString,
    ssl:
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    await client.query("BEGIN")
    await ensureDivipoleTable(client)
    await upsertRows(client, rows)
    const pruned = args.pruneUnreferenced ? await pruneLegacyRows(client) : 0
    await client.query("COMMIT")

    const summary = await client.query(
      `
        SELECT
          count(*)::int AS total_rows,
          count(*) FILTER (WHERE latitud IS NOT NULL AND longitud IS NOT NULL)::int AS rows_with_coords,
          count(*) FILTER (WHERE comuna IS NOT NULL AND btrim(comuna) <> '')::int AS rows_with_comuna
        FROM public.divipole_locations
      `,
    )

    console.log("Importacion DIVIPOLE 2026 completada")
    console.log(`Archivo: ${args.file}`)
    console.log(`Hoja: ${args.sheet}`)
    console.log(`Filas procesadas: ${rows.length}`)
    console.log(`Filas historicas eliminadas (sin referencias): ${pruned}`)
    console.log("Resumen tabla:", summary.rows[0])
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("Error importando DIVIPOLE 2026:", error)
  process.exit(1)
})
