import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { assertPositiveInt, getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"
import { getStorageProvider, uploadFile } from "@/lib/storage"
import { emitWarRoomUpdate } from "@/lib/warroom-events"

let hasDivipoleColumn: boolean | null = null
let hasVotePartyDetails: boolean | null = null
let hasAssignmentDivipole: boolean | null = null
let candidateHasPosition: boolean | null = null
let candidateHasParty: boolean | null = null
let hasEvidencesTable: boolean | null = null
let hasVoteReportAssignmentUnique: boolean | null = null

const dataUrlRegex = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/i

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string; ext: string } | null {
  const match = dataUrlRegex.exec(dataUrl)
  if (!match?.groups?.data || !match.groups.mime) return null
  const buffer = Buffer.from(match.groups.data, "base64")
  const mime = match.groups.mime
  const ext = mime.split("/")[1] || "bin"
  return { buffer, mime, ext }
}

function sanitizeFilename(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_") || "e14"
}

async function ensureEvidencesTable(): Promise<boolean> {
  if (hasEvidencesTable !== null) return hasEvidencesTable
  const res = await pool!.query(`SELECT to_regclass('public.evidences') AS oid`)
  if (res.rows[0]?.oid) {
    hasEvidencesTable = true
    return true
  }

  await pool!.query(
    `CREATE TABLE IF NOT EXISTS public.evidences (
       id uuid NOT NULL PRIMARY KEY,
       type text NOT NULL,
       title text NOT NULL,
       description text NULL,
       municipality text NULL,
       polling_station text NULL,
       uploaded_by_id uuid NULL,
       status text NOT NULL,
       url text NOT NULL,
       tags text[] NULL,
       vote_report_id uuid NULL,
       uploaded_at timestamptz DEFAULT now() NOT NULL,
       CONSTRAINT evidences_vote_report_id_fkey FOREIGN KEY (vote_report_id) REFERENCES public.vote_reports(id) ON DELETE SET NULL,
       CONSTRAINT evidences_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.delegates(id) ON DELETE SET NULL
     )`,
  )

  hasEvidencesTable = true
  return true
}

async function ensureDivipoleColumn(): Promise<boolean> {
  if (hasDivipoleColumn !== null) return hasDivipoleColumn
  const res = await pool!.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vote_reports' AND column_name = 'divipole_location_id'
      LIMIT 1`,
  )
  hasDivipoleColumn = Boolean(res.rowCount)
  return hasDivipoleColumn
}

async function ensureAssignmentDivipoleColumn(): Promise<boolean> {
  if (hasAssignmentDivipole !== null) return hasAssignmentDivipole
  const res = await pool!.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'delegate_polling_assignments' AND column_name = 'divipole_location_id'
      LIMIT 1`,
  )
  hasAssignmentDivipole = Boolean(res.rowCount)
  return hasAssignmentDivipole
}

async function ensureCandidateColumns(): Promise<{ position: boolean; party: boolean }> {
  if (candidateHasPosition !== null && candidateHasParty !== null) {
    return { position: candidateHasPosition, party: candidateHasParty }
  }
  const res = await pool!.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'candidates'
        AND column_name IN ('position', 'party')`,
  )
  candidateHasPosition = res.rows.some((r) => r.column_name === "position")
  candidateHasParty = res.rows.some((r) => r.column_name === "party")
  return { position: candidateHasPosition, party: candidateHasParty }
}

async function ensureVotePartyDetails(): Promise<boolean> {
  if (hasVotePartyDetails !== null) return hasVotePartyDetails
  const res = await pool!.query(`SELECT to_regclass('public.vote_party_details') AS oid`)
  hasVotePartyDetails = Boolean(res.rows[0]?.oid)
  return hasVotePartyDetails
}

async function ensureVoteReportAssignmentUnique(): Promise<boolean> {
  if (hasVoteReportAssignmentUnique !== null) return hasVoteReportAssignmentUnique
  const res = await pool!.query(
    `SELECT 1
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
      WHERE c.relname = 'vote_reports'
        AND i.indisunique
        AND array_length(i.indkey, 1) = 1
        AND a.attname = 'delegate_assignment_id'
      LIMIT 1`,
  )
  hasVoteReportAssignmentUnique = Boolean(res.rowCount)
  return hasVoteReportAssignmentUnique
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value)
}

export async function POST(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  let client: any = null

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "delegate" && user.role !== "witness") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    let delegateId = user.delegateId
    if (!delegateId && pool && user.email) {
      const fallback = await pool.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
      delegateId = (fallback.rows[0]?.id as string | undefined) ?? null
    }
    if (!delegateId) {
      return NextResponse.json({ error: "Perfil de testigo incompleto" }, { status: 403 })
    }
    const payload = await req.json()
    const delegate_assignment_id = typeof payload?.delegate_assignment_id === "string" ? payload.delegate_assignment_id : ""
    const notes = typeof payload?.notes === "string" ? payload.notes : null
    const details = Array.isArray(payload?.details) ? payload.details : []
    const photos = Array.isArray(payload?.photos) ? payload.photos : []
    const existing_photo_urls = payload?.existing_photo_urls
    const divipoleRaw = payload?.divipole_location_id
    const parsedDivipole = divipoleRaw === null || divipoleRaw === undefined || divipoleRaw === ""
      ? null
      : Number(divipoleRaw)

    if (parsedDivipole !== null && !Number.isFinite(parsedDivipole)) {
      return NextResponse.json({ error: "divipole_location_id invalido" }, { status: 400 })
    }

    if (!delegate_assignment_id || details.length === 0) {
      return NextResponse.json({ error: "delegate_assignment_id y details requeridos" }, { status: 400 })
    }

    const existingPhotos = Array.isArray(existing_photo_urls)
      ? existing_photo_urls.filter((p: any) => typeof p === "string" && p.length > 0)
      : []

    if (photos.length === 0 && existingPhotos.length === 0) {
      return NextResponse.json({ error: "Debe incluir al menos una foto del E14" }, { status: 400 })
    }
    if (photos.length > 4) {
      return NextResponse.json({ error: "Máximo 4 fotos por mesa" }, { status: 400 })
    }

    if (!isUuid(delegate_assignment_id)) {
      return NextResponse.json({ error: "delegate_assignment_id invalido" }, { status: 400 })
    }

    const owns = await pool!.query(
      `SELECT 1 FROM delegate_polling_assignments WHERE id = $1 AND delegate_id = $2`,
      [delegate_assignment_id, delegateId],
    )
    if (!owns.rowCount) {
      return NextResponse.json({ error: "Asignación inválida" }, { status: 403 })
    }

    const includeAssignmentDivipole = await ensureAssignmentDivipoleColumn()
    const assignmentQuery = includeAssignmentDivipole
      ? `SELECT 
           a.divipole_location_id,
           a.polling_station,
           a.polling_station_number,
           d.department                AS delegate_department,
           d.municipality              AS delegate_municipality,
           d.address                   AS delegate_address,
           d.polling_station_code      AS delegate_polling_station_code,
           d.polling_station_number    AS delegate_polling_station_number,
           dl.departamento             AS dl_department,
           dl.municipio                AS dl_municipality,
           dl.puesto                   AS dl_puesto,
           dl.direccion                AS dl_address
         FROM delegate_polling_assignments a
         JOIN delegates d ON d.id = a.delegate_id
         LEFT JOIN divipole_locations dl ON dl.id = a.divipole_location_id
         WHERE a.id = $1 AND a.delegate_id = $2`
      : `SELECT 
           NULL::bigint AS divipole_location_id,
           a.polling_station,
           a.polling_station_number,
           d.department                AS delegate_department,
           d.municipality              AS delegate_municipality,
           d.address                   AS delegate_address,
           d.polling_station_code      AS delegate_polling_station_code,
           d.polling_station_number    AS delegate_polling_station_number,
           NULL::text                  AS dl_department,
           NULL::text                  AS dl_municipality,
           NULL::text                  AS dl_puesto,
           NULL::text                  AS dl_address
         FROM delegate_polling_assignments a
         JOIN delegates d ON d.id = a.delegate_id
         WHERE a.id = $1 AND a.delegate_id = $2`

    const assignmentInfo = await pool!.query(assignmentQuery, [delegate_assignment_id, delegateId])

    if (!assignmentInfo.rowCount) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    const assignmentRow = assignmentInfo.rows[0]
    const resolvedDepartment = assignmentRow.dl_department ?? assignmentRow.delegate_department ?? "Sin departamento"
    const resolvedMunicipality = assignmentRow.dl_municipality ?? assignmentRow.delegate_municipality ?? "Sin municipio"
    const resolvedPollingStation =
      assignmentRow.polling_station ??
      assignmentRow.delegate_polling_station_code ??
      assignmentRow.dl_puesto ??
      null
    const resolvedAddress = assignmentRow.dl_address ?? assignmentRow.delegate_address ?? ""
    const resolvedDivipoleId = includeAssignmentDivipole
      ? assignmentRow.divipole_location_id ?? parsedDivipole ?? null
      : null

    const includeDivipole = await ensureDivipoleColumn()
    const hasAssignmentUnique = await ensureVoteReportAssignmentUnique()

    client = await pool!.connect()
    await client.query("BEGIN")

    const canWritePartyDetails = await ensureVotePartyDetails()

    const insertQuery = includeDivipole
      ? `INSERT INTO vote_reports (
           id, delegate_id, delegate_assignment_id, divipole_location_id, polling_station_code, department, municipality, address, total_votes, reported_at, notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,now(),$9)
         RETURNING id`
      : `INSERT INTO vote_reports (
           id, delegate_id, delegate_assignment_id, polling_station_code, department, municipality, address, total_votes, reported_at, notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),$8)
         RETURNING id`

    const updateQuery = includeDivipole
      ? `UPDATE vote_reports
         SET delegate_id = $1,
           divipole_location_id = $3,
           polling_station_code = $4,
           department = $5,
           municipality = $6,
           address = $7,
           notes = $8,
           reported_at = now()
       WHERE delegate_assignment_id = $2
       RETURNING id`
      : `UPDATE vote_reports
         SET delegate_id = $1,
           polling_station_code = $3,
           department = $4,
           municipality = $5,
           address = $6,
           notes = $7,
           reported_at = now()
       WHERE delegate_assignment_id = $2
       RETURNING id`

    const upsertQuery = includeDivipole
      ? `INSERT INTO vote_reports (
           id, delegate_id, delegate_assignment_id, divipole_location_id, polling_station_code, department, municipality, address, total_votes, reported_at, notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,now(),$9)
         ON CONFLICT (delegate_assignment_id) DO UPDATE
           SET delegate_id = EXCLUDED.delegate_id,
               divipole_location_id = EXCLUDED.divipole_location_id,
               polling_station_code = EXCLUDED.polling_station_code,
               department = EXCLUDED.department,
               municipality = EXCLUDED.municipality,
               address = EXCLUDED.address,
               notes = EXCLUDED.notes,
               reported_at = now()
         RETURNING id`
      : `INSERT INTO vote_reports (
           id, delegate_id, delegate_assignment_id, polling_station_code, department, municipality, address, total_votes, reported_at, notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,now(),$8)
         ON CONFLICT (delegate_assignment_id) DO UPDATE
           SET delegate_id = EXCLUDED.delegate_id,
               polling_station_code = EXCLUDED.polling_station_code,
               department = EXCLUDED.department,
               municipality = EXCLUDED.municipality,
               address = EXCLUDED.address,
               notes = EXCLUDED.notes,
               reported_at = now()
         RETURNING id`

    const reportId = crypto.randomUUID()
    const upsertParams = includeDivipole
      ? [
          reportId,
          delegateId,
          delegate_assignment_id,
          resolvedDivipoleId,
          resolvedPollingStation,
          resolvedDepartment,
          resolvedMunicipality,
          resolvedAddress,
          notes ?? null,
        ]
      : [
          reportId,
          delegateId,
          delegate_assignment_id,
          resolvedPollingStation,
          resolvedDepartment,
          resolvedMunicipality,
          resolvedAddress,
          notes ?? null,
        ]
    let upserted = { rowCount: 0, rows: [] as any[] }
    if (hasAssignmentUnique) {
      try {
        upserted = await client.query(upsertQuery, upsertParams)
      } catch (error: any) {
        if (error?.code !== "42P10") throw error
        hasVoteReportAssignmentUnique = false
        await client.query("ROLLBACK")
        await client.query("BEGIN")
      }
    }
    if (!hasVoteReportAssignmentUnique) {
      const updateParams = includeDivipole
        ? [
            delegateId,
            delegate_assignment_id,
            resolvedDivipoleId,
            resolvedPollingStation,
            resolvedDepartment,
            resolvedMunicipality,
            resolvedAddress,
            notes ?? null,
          ]
        : [
            delegateId,
            delegate_assignment_id,
            resolvedPollingStation,
            resolvedDepartment,
            resolvedMunicipality,
            resolvedAddress,
            notes ?? null,
          ]
      upserted = await client.query(updateQuery, updateParams)
      if (upserted.rowCount === 0) {
        upserted = await client.query(insertQuery, upsertParams)
      }
    }
    const finalReportId = (upserted.rows[0]?.id as string | undefined) ?? reportId

    await client.query(`DELETE FROM vote_details WHERE vote_report_id = $1`, [finalReportId])
    if (canWritePartyDetails) {
      await client.query(`DELETE FROM vote_party_details WHERE vote_report_id = $1`, [finalReportId])
    }

    const aggregatedByCandidate = new Map<string, number>()
    for (const d of details) {
      const candidateId = typeof d?.candidate_id === "string" ? d.candidate_id : ""
      const votes = Number(d?.votes)
      if (!isUuid(candidateId)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "candidate_id invalido" }, { status: 400 })
      }
      try {
        assertPositiveInt(votes, "votes")
      } catch (error: any) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      const current = aggregatedByCandidate.get(candidateId) ?? 0
      aggregatedByCandidate.set(candidateId, current + votes)
    }

    const candidateIds = Array.from(aggregatedByCandidate.keys())
    if (!candidateIds.length) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "No hay candidatos con votos" }, { status: 400 })
    }

    const candidateCols = await ensureCandidateColumns()
    const selectFields = ["id"]
    if (candidateCols.position) selectFields.push("position")
    if (candidateCols.party) selectFields.push("party")

    const candidateMeta = await client.query(
      `SELECT ${selectFields.join(", ")} FROM candidates WHERE id = ANY($1::uuid[])`,
      [candidateIds],
    )

    if (candidateMeta.rowCount !== candidateIds.length) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Algun candidato no existe en la tabla candidates" }, { status: 400 })
    }

    const metaById = new Map<string, { position: string; party: string }>()
    for (const row of candidateMeta.rows) {
      metaById.set(row.id as string, {
        position: candidateCols.position ? (row.position as string ?? "") : "",
        party: candidateCols.party ? (row.party as string ?? "") : "",
      })
    }

    let total = 0
    for (const [candidateId, votes] of aggregatedByCandidate.entries()) {
      total += votes
      const detailId = crypto.randomUUID()
      await client.query(
        `INSERT INTO vote_details (id, vote_report_id, candidate_id, votes)
         VALUES ($1, $2, $3, $4)`,
        [detailId, finalReportId, candidateId, votes],
      )
    }

    const canWritePartyDetailsInsert = await ensureVotePartyDetails()
    if (canWritePartyDetailsInsert) {
      const aggregatedByParty = new Map<string, { position: string; party: string; votes: number }>()
      for (const [candidateId, votes] of aggregatedByCandidate.entries()) {
        const meta = metaById.get(candidateId)
        const position = meta?.position?.trim() || "Sin cargo"
        const party = meta?.party?.trim() || "Sin partido"
        const key = `${position}__${party}`
        const current = aggregatedByParty.get(key)?.votes ?? 0
        aggregatedByParty.set(key, { position, party, votes: current + votes })
      }

      for (const [, record] of aggregatedByParty.entries()) {
        const detailId = crypto.randomUUID()
        await client.query(
          `INSERT INTO vote_party_details (id, vote_report_id, "position", party, votes)
           VALUES ($1, $2, $3, $4, $5)`,
          [detailId, finalReportId, record.position, record.party, record.votes],
        )
      }
    }

    const hasEvidences = await ensureEvidencesTable()
    const uploadedUrls: string[] = []
    const hasNewPhotos = Array.isArray(photos) && photos.length > 0

    if (hasNewPhotos && hasEvidences) {
      await client.query(`DELETE FROM evidences WHERE vote_report_id = $1`, [finalReportId])
    }

    const storageProvider = getStorageProvider()

    if (hasNewPhotos) {
      for (const [index, photo] of photos.entries()) {
      if (typeof photo !== "string" || !photo.startsWith("data:")) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Formato de foto inválido" }, { status: 400 })
      }
      const parsed = parseDataUrl(photo)
      if (!parsed || !parsed.mime.startsWith("image/")) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Formato de imagen inválido" }, { status: 400 })
      }

      let finalUrl = photo
      if (storageProvider !== "local") {
        const baseName = sanitizeFilename(resolvedPollingStation ?? "mesa")
        const filename = `${baseName}-${index + 1}.${parsed.ext}`
        const uploaded = await uploadFile(parsed.buffer, filename, `vote-reports/${finalReportId}`)
        finalUrl = uploaded.url
      }

        uploadedUrls.push(finalUrl)

        if (hasEvidences) {
          const evidenceId = crypto.randomUUID()
          await client.query(
            `INSERT INTO evidences (
               id, type, title, description, municipality, polling_station, uploaded_by_id,
               status, url, tags, vote_report_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              evidenceId,
              "image",
              `E14 ${resolvedPollingStation ?? "Mesa"} ${index + 1}`,
              null,
              resolvedMunicipality,
              resolvedPollingStation,
              delegateId,
              "pending",
              finalUrl,
              ["e14"],
              finalReportId,
            ],
          )
        }
      }
    }

    await client.query(`UPDATE vote_reports SET total_votes = $1 WHERE id = $2`, [total, finalReportId])
    if (uploadedUrls[0]) {
      await client.query(`UPDATE vote_reports SET photo_url = $1 WHERE id = $2`, [uploadedUrls[0], finalReportId])
    } else if (existingPhotos.length > 0) {
      await client.query(`UPDATE vote_reports SET photo_url = COALESCE(photo_url, $1) WHERE id = $2`, [existingPhotos[0], finalReportId])
    }
    await client.query("COMMIT")

    emitWarRoomUpdate({ ts: Date.now(), type: "votes", source: "vote-report" })

    return NextResponse.json({ report_id: finalReportId, total_votes: total, photos: uploadedUrls, evidencesSaved: hasEvidences })
  } catch (error: any) {
    if (client) {
      try {
        await client.query("ROLLBACK")
      } catch {
        // ignore rollback failures
      }
    }
    console.error("vote-report POST error", error)
    const message = error?.message || "No se pudo guardar el reporte de votos"
    return NextResponse.json({ error: message, detail: String(error?.code ?? ""), stack: error?.stack ?? "" }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}
