import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import type { PoolClient } from "pg"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"

type Cargo = { id: string; nombre: string }
type Partido = { id: string; nombre: string; cargoId: string }
type Candidato = {
  id: string
  nombre: string
  partidoId: string
  cargoId: string
  ballot_number: number | null
  full_name: string | null
  position: string | null
  region: string | null
  color: string | null
  department_code: string | null
  party: string | null
}

const fallback = { cargos: [] as Cargo[], partidos: [] as Partido[], candidatos: [] as Candidato[] }
const CATALOGOS_CACHE_TTL_MS = 5 * 60_000
let catalogosCache: { ts: number; payload: typeof fallback } | null = null

const NON_PREFERENTIAL_PARTIES: Array<{ tokens: string[] }> = [
  { tokens: ["colombia", "renaciente"] },
  { tokens: ["pacto", "historico"] },
  { tokens: ["centro", "democratico"] },
]

const normalizeText = (value: string | null | undefined) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const partyNameContainsTokens = (normalizedPartyName: string, tokens: string[]) => {
  const words = new Set(normalizedPartyName.split(/\s+/).filter(Boolean))
  return tokens.every((token) => words.has(token))
}

const isForcedNonPreferentialParty = (partyName: string | null | undefined) => {
  const normalizedPartyName = normalizeText(partyName)
  if (!normalizedPartyName) return false
  return NON_PREFERENTIAL_PARTIES.some(({ tokens }) => partyNameContainsTokens(normalizedPartyName, tokens))
}

const isSyntheticExtraTargetPosition = (position: string | null | undefined) => {
  const normalized = normalizeText(position)
  return normalized === "citrep" || normalized === "camara de representantes"
}

const isSyntheticPartyCandidate = (row: { full_name: string | null; party: string | null; position: string | null }) => {
  const partyName = typeof row.party === "string" ? row.party.trim() : ""
  if (!partyName || isForcedNonPreferentialParty(partyName)) return false
  if (!isSyntheticExtraTargetPosition(row.position)) return false
  return normalizeText(row.full_name) === normalizeText(partyName)
}

async function ensureSyntheticPartyCandidates(
  client: PoolClient,
  rows: Array<{
    id: string
    ballot_number: number | null
    full_name: string | null
    position: string | null
    region: string | null
    color: string | null
    position_id: string | null
    department_code: string | null
    party: string | null
  }>,
) {
  const grouped = new Map<
    string,
    {
      party: string
      position: string
      position_id: string | null
      department_code: string | null
      region: string | null
      color: string | null
      maxBallot: number
      hasSyntheticCandidate: boolean
    }
  >()

  rows.forEach((row) => {
    const party = typeof row.party === "string" ? row.party.trim() : ""
    const position = typeof row.position === "string" ? row.position.trim() : ""
    if (!party || !position) return
    if (!isSyntheticExtraTargetPosition(position)) return
    if (isForcedNonPreferentialParty(party)) return

    const key = `${normalizeText(position)}::${normalizeText(party)}`
    const current = grouped.get(key)
    const ballotNumber = Number.isFinite(row.ballot_number) ? Number(row.ballot_number) : 0
    const hasSyntheticCandidate = normalizeText(row.full_name) === normalizeText(party)

    if (!current) {
      grouped.set(key, {
        party,
        position,
        position_id: row.position_id,
        department_code: row.department_code,
        region: row.region,
        color: row.color,
        maxBallot: ballotNumber,
        hasSyntheticCandidate,
      })
      return
    }

    current.maxBallot = Math.max(current.maxBallot, ballotNumber)
    if (!current.position_id && row.position_id) current.position_id = row.position_id
    if (!current.department_code && row.department_code) current.department_code = row.department_code
    if (!current.region && row.region) current.region = row.region
    if (!current.color && row.color) current.color = row.color
    if (hasSyntheticCandidate) current.hasSyntheticCandidate = true
  })

  const missing = Array.from(grouped.values()).filter((item) => !item.hasSyntheticCandidate)
  if (!missing.length) return false

  for (const item of missing) {
    await client.query(
      `INSERT INTO candidates (id, ballot_number, full_name, position, region, color, position_id, department_code, party)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        crypto.randomUUID(),
        null,
        item.party,
        item.position,
        item.region,
        item.color ?? "#64748B",
        item.position_id,
        item.department_code,
        item.party,
      ],
    )
  }

  return true
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "sin-id"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!pool) {
    return NextResponse.json({ ...fallback, warning: "DB no disponible" }, { status: 503 })
  }

  const now = Date.now()
  if (catalogosCache && now - catalogosCache.ts < CATALOGOS_CACHE_TTL_MS) {
    return NextResponse.json(catalogosCache.payload)
  }

  const client = await pool.connect()
  try {
    const query = `
      SELECT id, ballot_number, full_name, position, region, color, position_id, department_code, party
      FROM candidates
      ORDER BY position, ballot_number
    `

    let { rows } = await client.query(query)
    const insertedSyntheticCandidates = await ensureSyntheticPartyCandidates(client, rows)
    if (insertedSyntheticCandidates) {
      ;({ rows } = await client.query(query))
    }

    const cargosMap = new Map<string, Cargo>()
    const partidosMap = new Map<string, Partido>()

    const candidatos: Candidato[] = rows.map((row) => {
      const syntheticPartyCandidate = isSyntheticPartyCandidate({
        full_name: row.full_name as string | null,
        party: row.party as string | null,
        position: row.position as string | null,
      })
      const cargoNombre = (row.position as string | null) ?? "Cargo sin nombre"
      const cargoId = (row.position_id as string | null) ?? slugify(cargoNombre)

      if (!cargosMap.has(cargoId)) {
        cargosMap.set(cargoId, { id: cargoId, nombre: cargoNombre })
      }

      const partyNombre = (row.party as string | null) ?? "Independiente"
      const partidoId = `${cargoId}:${slugify(partyNombre)}`

      if (!partidosMap.has(partidoId)) {
        partidosMap.set(partidoId, { id: partidoId, nombre: partyNombre, cargoId })
      }

      return {
        id: row.id as string,
        nombre: (row.full_name as string | null) ?? cargoNombre,
        partidoId,
        cargoId,
        ballot_number: syntheticPartyCandidate ? null : (row.ballot_number as number | null),
        full_name: row.full_name as string | null,
        position: row.position as string | null,
        region: row.region as string | null,
        color: row.color as string | null,
        department_code: row.department_code as string | null,
        party: row.party as string | null,
      }
    })

    const payload = { cargos: Array.from(cargosMap.values()), partidos: Array.from(partidosMap.values()), candidatos }
    catalogosCache = { ts: Date.now(), payload }
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Catalogos GET error", error)
    return NextResponse.json({ ...fallback, error: "No se pudieron cargar los catalogos" }, { status: 500 })
  } finally {
    client.release()
  }
}