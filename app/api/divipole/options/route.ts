import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const emptyData = { departments: [], municipalities: [], puestos: [] }

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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const dept = searchParams.get("dept")?.trim() || null
  const muni = searchParams.get("muni")?.trim() || null

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
        return NextResponse.json({
          departments: rows.map((r) => ({ code: r.dd, name: r.departamento })),
        })
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
        return NextResponse.json({
          municipalities: rows.map((r) => ({ code: r.mm, name: r.municipio, departmentCode: r.dd })),
        })
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

      return NextResponse.json({
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
          takenTables: [],
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("divipole options error", error)
    return NextResponse.json(emptyData)
  }
}
