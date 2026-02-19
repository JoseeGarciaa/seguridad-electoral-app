import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const emptyData = { departments: [], municipalities: [], puestos: [] }
const DIVIPOLE_OPTIONS_CACHE_TTL_MS = 5 * 60_000
const divipoleOptionsCache = new Map<string, { ts: number; payload: any }>()

type DepartmentRow = { dd: string; departamento: string }
type MunicipalityRow = { dd: string; mm: string; municipio: string }
type PuestoRow = {
  id: string
  location_ids: string[]
  dd: string
  mm: string
  pp: string
  departamento: string
  municipio: string
  puesto: string
  direccion: string | null
  mesas: number
  total: number
  latitud: number | null
  longitud: number | null
}

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const dept = searchParams.get("dept")?.trim() || null
  const muni = searchParams.get("muni")?.trim() || null
  const cacheKey = `${dept ?? "*"}:${muni ?? "*"}`

  const cached = divipoleOptionsCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < DIVIPOLE_OPTIONS_CACHE_TTL_MS) {
    return NextResponse.json(cached.payload)
  }

  if (!pool) {
    console.warn("DATABASE_URL not set; divipole options returning empty data")
    return NextResponse.json(emptyData)
  }

  try {
    const client = await pool.connect()
    try {
      if (!dept) {
        const { rows } = await client.query<DepartmentRow>(
          `SELECT
             dd,
             MIN(TRIM(departamento)) AS departamento
           FROM divipole_locations
           WHERE dd IS NOT NULL AND dd <> ''
           GROUP BY dd
           ORDER BY MIN(TRIM(departamento))`
        )
        const payload = {
          departments: rows.map((r) => ({ code: r.dd, name: r.departamento })),
        }
        divipoleOptionsCache.set(cacheKey, { ts: Date.now(), payload })
        return NextResponse.json(payload)
      }

      if (dept && !muni) {
        const { rows } = await client.query<MunicipalityRow>(
          `SELECT
             dd,
             UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM(municipio), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             ) AS mm,
             MIN(TRIM(municipio)) AS municipio
           FROM divipole_locations
           WHERE dd = $1 AND municipio IS NOT NULL AND TRIM(municipio) <> ''
           GROUP BY
             dd,
             UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM(municipio), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             )
           ORDER BY MIN(TRIM(municipio))`,
          [dept]
        )
        const payload = {
          municipalities: rows.map((r) => ({ code: r.mm, name: r.municipio, departmentCode: r.dd })),
        }
        divipoleOptionsCache.set(cacheKey, { ts: Date.now(), payload })
        return NextResponse.json(payload)
      }

      // Puestos completos por municipio: deduplicamos por nombre normalizado (espacios/acentos/caso).
      const { rows } = await client.query<PuestoRow>(
        `WITH source_rows AS (
           SELECT
             id,
             dd,
             mm,
             COALESCE(NULLIF(TRIM(pp), ''), TRIM(puesto)) AS pp,
             TRIM(departamento) AS departamento,
             TRIM(municipio) AS municipio,
             TRIM(puesto) AS puesto,
             direccion,
             mesas,
             total,
             latitud,
             longitud
           FROM divipole_locations
           WHERE dd = $1
             AND UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM(municipio), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             ) = UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM($2), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             )
             AND puesto IS NOT NULL
             AND TRIM(puesto) <> ''
         ),
         normalized_source AS (
           SELECT
             *,
             UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM(municipio), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             ) AS municipio_key,
             UPPER(
               REGEXP_REPLACE(
                 TRANSLATE(TRIM(puesto), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
                 '\\s+',
                 ' ',
                 'g'
               )
             ) AS puesto_key
           FROM source_rows
         ),
         grouped_puestos AS (
           SELECT
             MIN(id)::text AS id,
             ARRAY_AGG(id::text ORDER BY id) AS location_ids,
             dd,
             MIN(mm) AS mm,
             MIN(pp) AS pp,
             MIN(departamento) AS departamento,
             MIN(municipio) AS municipio,
             MIN(puesto) AS puesto,
             MIN(direccion) AS direccion,
             MAX(mesas) AS mesas,
             MAX(total) AS total,
             MAX(latitud) AS latitud,
             MAX(longitud) AS longitud
           FROM normalized_source
           GROUP BY dd, municipio_key, puesto_key
         )
         SELECT
           id,
           location_ids,
           dd,
           mm,
           pp,
           departamento,
           municipio,
           puesto,
           direccion,
           mesas,
           total,
           latitud,
           longitud
         FROM grouped_puestos
         ORDER BY puesto`,
        [dept, muni]
      )

      const dpaColumnsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments'`
      )
      const dpaCols = new Set<string>(dpaColumnsRes.rows.map((r: any) => r.column_name))
      const hasDpaLocationId = dpaCols.has("divipole_location_id")

      const takenByPuesto = new Map<string, Set<number>>()

      if (rows.length > 0) {
        if (hasDpaLocationId) {
          const locationIds = Array.from(new Set(rows.flatMap((r) => r.location_ids ?? []).filter(Boolean)))
          if (locationIds.length > 0) {
            const takenRes = await client.query<{ location_id: string; polling_station_number: number }>(
              `SELECT divipole_location_id::text AS location_id, polling_station_number
               FROM delegate_polling_assignments
               WHERE divipole_location_id::text = ANY($1::text[])
                 AND polling_station_number IS NOT NULL`,
              [locationIds]
            )

            const byLocation = new Map<string, Set<number>>()
            for (const row of takenRes.rows) {
              const tableNumber = Number(row.polling_station_number)
              if (!Number.isInteger(tableNumber)) continue
              const bucket = byLocation.get(row.location_id) ?? new Set<number>()
              bucket.add(tableNumber)
              byLocation.set(row.location_id, bucket)
            }

            for (const puesto of rows) {
              const key = normalizeName(puesto.puesto)
              const bucket = takenByPuesto.get(key) ?? new Set<number>()
              for (const locationId of puesto.location_ids ?? []) {
                const used = byLocation.get(locationId)
                if (!used) continue
                for (const tableNumber of used) bucket.add(tableNumber)
              }
              takenByPuesto.set(key, bucket)
            }
          }
        }

        if (!hasDpaLocationId) {
          const stationNames = Array.from(new Set(rows.map((r) => r.puesto).filter(Boolean)))
          if (stationNames.length > 0) {
            const takenRes = await client.query<{ polling_station: string; polling_station_number: number }>(
              `SELECT polling_station, polling_station_number
               FROM delegate_polling_assignments
               WHERE polling_station = ANY($1::text[])
                 AND polling_station_number IS NOT NULL`,
              [stationNames]
            )

            for (const row of takenRes.rows) {
              const key = normalizeName(row.polling_station)
              const tableNumber = Number(row.polling_station_number)
              if (!key || !Number.isInteger(tableNumber)) continue
              const bucket = takenByPuesto.get(key) ?? new Set<number>()
              bucket.add(tableNumber)
              takenByPuesto.set(key, bucket)
            }
          }
        }
      }

      const payload = {
        puestos: rows.map((r) => ({
          id: r.id,
          code: r.puesto, // usamos nombre de puesto como "código" lógico para evitar colisiones por pp
          name: r.puesto,
          departmentCode: r.dd,
          municipalityCode: r.mm,
          department: r.departamento,
          municipality: r.municipio,
          address: r.direccion,
          mesas: r.mesas,
          total: r.total,
          lat: r.latitud,
          lng: r.longitud,
          takenTables: Array.from(takenByPuesto.get(normalizeName(r.puesto)) ?? []).sort((a, b) => a - b),
        })),
      }
      divipoleOptionsCache.set(cacheKey, { ts: Date.now(), payload })
      return NextResponse.json(payload)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("divipole options error", error)
    return NextResponse.json(emptyData)
  }
}
