import { pool } from "@/lib/pg"

const OFFICIAL_TOLERANCE_PERCENT = 0.05

type MesaFactRow = {
  mesaid: number
  depto: string
  municipio: string
  zona: string
  puesto: string
  mesa: number
  votantes: number
  votos_validos: number
  votos_nulos: number
  no_marcados: number
  blancos: number
  total_oficial: number
}

let lookupIndexEnsured = false

export async function ensureMesaFactLookupIndex() {
  if (!pool || lookupIndexEnsured) return

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mesa_fact_lookup
    ON mesa_fact (depto, municipio, puesto, mesa)
  `)

  lookupIndexEnsured = true
}

function toMesaFact(row: any) {
  return {
    mesaid: Number(row.mesaid),
    depto: row.depto as string,
    municipio: row.municipio as string,
    zona: row.zona as string,
    puesto: row.puesto as string,
    mesa: Number(row.mesa),
    votantes: Number(row.votantes ?? 0),
    votos_validos: Number(row.votos_validos ?? 0),
    votos_nulos: Number(row.votos_nulos ?? 0),
    no_marcados: Number(row.no_marcados ?? 0),
    blancos: Number(row.blancos ?? 0),
    total_oficial: Number(row.total_oficial ?? 0),
  }
}

export function buildOfficialComparison(totalReported: number, totalOficial: number | null, votantes: number | null) {
  const hasOfficialData = totalOficial !== null
  const expectedMin = totalOficial === null ? null : Math.ceil(totalOficial * (1 - OFFICIAL_TOLERANCE_PERCENT))
  const expectedMax = totalOficial === null ? null : Math.floor(totalOficial * (1 + OFFICIAL_TOLERANCE_PERCENT))
  const diferencia = totalOficial === null ? null : totalReported - totalOficial
  const overVoting = votantes === null ? false : totalReported > votantes
  const mismatch = totalOficial === null ? false : totalReported !== totalOficial
  const increaseAlert = expectedMax === null ? false : totalReported > expectedMax
  const decreaseAlert = expectedMin === null ? false : totalReported < expectedMin
  const outOfExpectedRange = increaseAlert || decreaseAlert
  const participacion = votantes && votantes > 0 ? Number(((totalReported / votantes) * 100).toFixed(2)) : null
  const officialNotice = hasOfficialData
    ? null
    : "Sin información oficial histórica para el puesto y mesa reportados."

  return {
    totalReported,
    totalOficial,
    votantes,
    expectedMin,
    expectedMax,
    diferencia,
    participacion,
    overVoting,
    mismatch,
    increaseAlert,
    decreaseAlert,
    outOfExpectedRange,
    hasOfficialData,
    officialNotice,
  }
}

export async function getMesaFactByMesaId(mesaid: number) {
  if (!pool) return null
  await ensureMesaFactLookupIndex()

  const res = await pool.query<MesaFactRow>(
    `SELECT
       mesaid,
       depto,
       municipio,
       zona,
       puesto,
       mesa,
       votantes,
       votos_validos,
       votos_nulos,
       no_marcados,
       blancos,
       votantes AS total_oficial
     FROM mesa_fact
     WHERE mesaid = $1
     LIMIT 1`,
    [mesaid],
  )

  if (!res.rowCount) return null
  return toMesaFact(res.rows[0])
}

export async function getVoteReportMesaComparison(reportId: string) {
  if (!pool) return null
  await ensureMesaFactLookupIndex()

  const res = await pool.query(
    `SELECT
       vr.id,
       vr.total_votes,
       mf.mesaid,
       mf.depto,
       mf.municipio,
       mf.zona,
       mf.puesto,
       mf.mesa,
       mf.votantes,
       mf.votos_validos,
       mf.votos_nulos,
       mf.no_marcados,
       mf.blancos,
       mf.votantes AS total_oficial
     FROM vote_reports vr
     LEFT JOIN delegate_polling_assignments a ON a.id = vr.delegate_assignment_id
     LEFT JOIN LATERAL (
       SELECT *
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
     WHERE vr.id = $1
     LIMIT 1`,
    [reportId],
  )

  if (!res.rowCount) return null

  const row = res.rows[0]
  const totalVotes = Number(row.total_votes ?? 0)
  const hasOfficialData = row.mesaid !== null && row.mesaid !== undefined
  const officialMesa = hasOfficialData ? toMesaFact(row) : null
  const totalOficial = officialMesa ? officialMesa.total_oficial : null
  const votantes = officialMesa ? officialMesa.votantes : null

  return {
    reportId: row.id as string,
    officialMesa,
    comparison: buildOfficialComparison(totalVotes, totalOficial, votantes),
  }
}
