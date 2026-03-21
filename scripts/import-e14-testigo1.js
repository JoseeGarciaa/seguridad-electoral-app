const fs = require("fs")
const fsp = require("fs/promises")
const path = require("path")
const { randomUUID } = require("crypto")
const { Client } = require("pg")

function parseArgs(argv) {
  const args = { execute: false, profile: "testigo1", roots: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--execute") {
      args.execute = true
      continue
    }
    if (token === "--profile") {
      args.profile = String(argv[index + 1] || "").trim()
      index += 1
      continue
    }
    args.roots.push(token)
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
    const value = line.slice(separatorIndex + 1).trim()
    if (key && !process.env[key]) process.env[key] = value
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/%/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[—–_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function sanitizeFilename(fileName) {
  const ext = path.extname(fileName)
  const base = path.basename(fileName, ext)
  const safeBase = base.replace(/[^a-zA-Z0-9.-]+/g, "_") || "archivo"
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, "") || ".pdf"
  return `${safeBase}${safeExt}`
}

function getEmailLocalPart(value) {
  const email = String(value || "").trim().toLowerCase()
  if (!email.includes("@")) return email
  return email.split("@")[0]
}

function extractMunicipalityName(folderName) {
  return String(folderName || "")
    .replace(/^\d+\s*[_—–-]+\s*/u, "")
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .replace(/[_—–-]+/g, " ")
    .trim()
}

function extractStationInfo(folderName) {
  const raw = String(folderName || "").trim()
  const codeMatch = raw.match(/^(\d{1,3})\s*[_—–-]+\s*/u)
  const code = codeMatch ? String(Number(codeMatch[1])) : null
  const name = raw.replace(/^(\d{1,3})\s*[_—–-]+\s*/u, "").replace(/[_—–-]+/g, " ").trim()
  return { raw, code, name }
}

function extractMesaNumber(fileName) {
  const base = path.basename(fileName, path.extname(fileName))
  const match = base.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function scoreAssignmentMatch(item, assignment) {
  const sameMunicipality = item.municipalityNorm === assignment.municipalityNorm
  const sameMesa = item.mesaNumber === assignment.mesaNumber
  if (!sameMunicipality || !sameMesa) return -1

  let score = 100
  if (item.stationNameNorm && assignment.stationNameNorm && item.stationNameNorm === assignment.stationNameNorm) score += 100
  if (item.stationRawNorm && assignment.stationRawNorm && item.stationRawNorm === assignment.stationRawNorm) score += 80
  if (item.stationCode && assignment.stationCode && item.stationCode === assignment.stationCode) score += 70
  if (item.stationNameNorm && assignment.stationNameNorm) {
    if (assignment.stationNameNorm.includes(item.stationNameNorm) || item.stationNameNorm.includes(assignment.stationNameNorm)) {
      score += 25
    }
  }
  return score
}

async function collectPdfItems(rootPaths) {
  const items = []
  for (const rootPath of rootPaths) {
    const municipalityFolder = path.basename(rootPath)
    const municipalityName = extractMunicipalityName(municipalityFolder)
    const municipalityNorm = normalizeText(municipalityName)
    const stationEntries = await fsp.readdir(rootPath, { withFileTypes: true })
    for (const stationEntry of stationEntries) {
      if (!stationEntry.isDirectory()) continue
      const stationInfo = extractStationInfo(stationEntry.name)
      const stationPath = path.join(rootPath, stationEntry.name)
      const fileEntries = await fsp.readdir(stationPath, { withFileTypes: true })
      for (const fileEntry of fileEntries) {
        if (!fileEntry.isFile()) continue
        if (path.extname(fileEntry.name).toLowerCase() !== ".pdf") continue
        const mesaNumber = extractMesaNumber(fileEntry.name)
        if (!mesaNumber) continue
        items.push({
          municipalityFolder,
          municipalityName,
          municipalityNorm,
          stationFolder: stationEntry.name,
          stationName: stationInfo.name,
          stationNameNorm: normalizeText(stationInfo.name),
          stationRawNorm: normalizeText(stationEntry.name),
          stationCode: stationInfo.code,
          mesaNumber,
          fileName: fileEntry.name,
          filePath: path.join(stationPath, fileEntry.name),
        })
      }
    }
  }
  return items
}

async function ensureEvidencesTable(client) {
  await client.query(
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
}

async function resolveProfile(client, profile) {
  const sql = `
    SELECT
      u.id AS user_id,
      u.email AS user_email,
      u.role AS user_role,
      d.id AS delegate_id,
      d.full_name,
      d.email AS delegate_email,
      NULL::text AS delegate_role,
      d.municipality,
      d.department
    FROM users u
    LEFT JOIN delegates d ON d.id = u.delegate_id
    WHERE LOWER(split_part(COALESCE(u.email, ''), '@', 1)) = LOWER($1)
       OR LOWER(split_part(COALESCE(d.email, ''), '@', 1)) = LOWER($1)
       OR LOWER(COALESCE(u.email, '')) = LOWER($1)
       OR LOWER(COALESCE(d.email, '')) = LOWER($1)
    ORDER BY u.created_at ASC
  `
  const result = await client.query(sql, [profile])
  if (result.rowCount !== 1) {
    throw new Error(`Se esperaban 1 coincidencia para el perfil ${profile}, encontradas ${result.rowCount}`)
  }
  const row = result.rows[0]
  if (!row.delegate_id) throw new Error(`El perfil ${profile} no tiene delegate_id asociado`)
  return {
    userId: row.user_id,
    userEmail: row.user_email,
    userRole: row.user_role,
    delegateId: row.delegate_id,
    delegateEmail: row.delegate_email,
    delegateRole: row.delegate_role,
    fullName: row.full_name,
  }
}

async function getAssignments(client, delegateId) {
  const query = `
    SELECT
      a.id,
      a.polling_station,
      a.polling_station_number,
      a.divipole_location_id,
      d.department AS delegate_department,
      d.municipality AS delegate_municipality,
      d.address AS delegate_address,
      dl.pp AS puesto_code,
      dl.puesto,
      dl.municipio AS divipole_municipality,
      dl.departamento AS divipole_department,
      dl.direccion AS divipole_address,
      vr.id AS vote_report_id
    FROM delegate_polling_assignments a
    JOIN delegates d ON d.id = a.delegate_id
    LEFT JOIN divipole_locations dl ON dl.id = a.divipole_location_id
    LEFT JOIN vote_reports vr ON vr.delegate_assignment_id = a.id
    WHERE a.delegate_id = $1
    ORDER BY COALESCE(dl.municipio, d.municipality), COALESCE(a.polling_station, dl.puesto), a.polling_station_number
  `
  const result = await client.query(query, [delegateId])
  return result.rows.map((row) => {
    const stationDisplay = row.polling_station || row.puesto || "Puesto asignado"
    const municipality = row.divipole_municipality || row.delegate_municipality || ""
    const department = row.divipole_department || row.delegate_department || ""
    const address = row.divipole_address || row.delegate_address || ""
    const stationCode = row.puesto_code ? String(Number(row.puesto_code)) : null
    const mesaNumber = row.polling_station_number === null || row.polling_station_number === undefined
      ? null
      : Number(row.polling_station_number)
    return {
      id: row.id,
      voteReportId: row.vote_report_id || null,
      divipoleLocationId: row.divipole_location_id || null,
      municipality,
      municipalityNorm: normalizeText(municipality),
      department,
      address,
      stationDisplay,
      stationNameNorm: normalizeText(String(row.puesto || row.polling_station || "")),
      stationRawNorm: normalizeText(stationDisplay),
      stationCode,
      mesaNumber,
      pollingStation: row.polling_station || null,
    }
  }).filter((row) => row.mesaNumber !== null)
}

function matchItemsToAssignments(items, assignments) {
  const matched = []
  const unmatched = []
  const ambiguous = []

  for (const item of items) {
    const scored = assignments
      .map((assignment) => ({ assignment, score: scoreAssignmentMatch(item, assignment) }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => right.score - left.score)

    if (scored.length === 0) {
      unmatched.push(item)
      continue
    }

    const [best, second] = scored
    if (second && best.score === second.score) {
      ambiguous.push({ item, candidates: scored.slice(0, 5) })
      continue
    }

    matched.push({ item, assignment: best.assignment, score: best.score })
  }

  return { matched, unmatched, ambiguous }
}

async function ensureLocalFileCopy(sourcePath, assignmentId, fileName) {
  const safeName = sanitizeFilename(fileName)
  const relativeFolder = path.join("public", "vote-evidence", "import-e14", assignmentId)
  const absoluteFolder = path.join(process.cwd(), relativeFolder)
  await fsp.mkdir(absoluteFolder, { recursive: true })
  const targetPath = path.join(absoluteFolder, safeName)
  await fsp.copyFile(sourcePath, targetPath)
  return {
    url: `/vote-evidence/import-e14/${assignmentId}/${encodeURIComponent(safeName)}`,
    absolutePath: targetPath,
  }
}

async function upsertEvidence(client, profile, match) {
  const label = `${match.assignment.stationDisplay} · Mesa ${match.assignment.mesaNumber}`
  const title = `E14 ${label}`
  const tags = ["e14", "pdf", "import-e14", `assignment:${match.assignment.id}`, `mesa:${match.assignment.mesaNumber}`]

  const existing = await client.query(
    `SELECT id, url
       FROM evidences
      WHERE uploaded_by_id = $1
        AND polling_station = $2
        AND title = $3
        AND type = 'document'
      LIMIT 1`,
    [profile.delegateId, label, title],
  )

  const uploaded = await ensureLocalFileCopy(match.item.filePath, match.assignment.id, match.item.fileName)

  if (existing.rowCount > 0) {
    await client.query(
      `UPDATE evidences
          SET municipality = $1,
              status = 'pending',
              url = $2,
              tags = $3,
              updated_at = now()
        WHERE id = $4`,
      [match.assignment.municipality, uploaded.url, tags, existing.rows[0].id],
    )
    return { action: "updated", evidenceId: existing.rows[0].id, url: uploaded.url }
  }

  const inserted = await client.query(
    `INSERT INTO evidences (
       id, type, title, description, municipality, polling_station, uploaded_by_id,
       status, url, tags, vote_report_id
     ) VALUES ($1, 'document', $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
     RETURNING id`,
    [
      randomUUID(),
      title,
      `Importado masivamente desde carpeta externa para ${getEmailLocalPart(profile.userEmail || profile.delegateEmail || profile.fullName)}`,
      match.assignment.municipality,
      label,
      profile.delegateId,
      uploaded.url,
      tags,
      match.assignment.voteReportId,
    ],
  )

  return { action: "inserted", evidenceId: inserted.rows[0].id, url: uploaded.url }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvFile(path.join(process.cwd(), ".env.local"))

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurado")
  if (!args.profile) throw new Error("Debes indicar --profile")
  if (args.roots.length === 0) throw new Error("Debes indicar al menos una carpeta raíz")

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    const profile = await resolveProfile(client, args.profile)
    const assignments = await getAssignments(client, profile.delegateId)
    const items = await collectPdfItems(args.roots)
    const results = matchItemsToAssignments(items, assignments)

    console.log(JSON.stringify({
      mode: args.execute ? "execute" : "dry-run",
      profile: {
        userEmail: profile.userEmail,
        delegateEmail: profile.delegateEmail,
        fullName: profile.fullName,
        delegateId: profile.delegateId,
      },
      totals: {
        pdfs: items.length,
        assignments: assignments.length,
        matched: results.matched.length,
        unmatched: results.unmatched.length,
        ambiguous: results.ambiguous.length,
      },
      sampleUnmatched: results.unmatched.slice(0, 10).map((item) => ({
        municipality: item.municipalityName,
        stationFolder: item.stationFolder,
        mesaNumber: item.mesaNumber,
        fileName: item.fileName,
      })),
      sampleAmbiguous: results.ambiguous.slice(0, 5).map((entry) => ({
        item: {
          municipality: entry.item.municipalityName,
          stationFolder: entry.item.stationFolder,
          mesaNumber: entry.item.mesaNumber,
          fileName: entry.item.fileName,
        },
        candidates: entry.candidates.map((candidate) => ({
          assignmentId: candidate.assignment.id,
          stationDisplay: candidate.assignment.stationDisplay,
          municipality: candidate.assignment.municipality,
          mesaNumber: candidate.assignment.mesaNumber,
          score: candidate.score,
        })),
      })),
    }, null, 2))

    if (!args.execute) return
    if (results.unmatched.length > 0 || results.ambiguous.length > 0) {
      throw new Error("No se ejecuta la importación mientras existan PDFs sin match o con match ambiguo")
    }

    await ensureEvidencesTable(client)
    await client.query("BEGIN")
    const actions = { inserted: 0, updated: 0 }
    for (const match of results.matched) {
      const outcome = await upsertEvidence(client, profile, match)
      actions[outcome.action] += 1
    }
    await client.query("COMMIT")

    console.log(JSON.stringify({
      completed: true,
      inserted: actions.inserted,
      updated: actions.updated,
    }, null, 2))
  } catch (error) {
    try {
      await client.query("ROLLBACK")
    } catch {
      // noop
    }
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})