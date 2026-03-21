import { NextRequest, NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import path from "path"
import { pool } from "@/lib/pg"

const LOCAL_UPLOADS_ROOT = process.env.LOCAL_UPLOADS_ROOT || "./public/vote-evidence"
const LOCAL_UPLOADS_BASE_URL = process.env.LOCAL_UPLOADS_BASE_URL || "/vote-evidence"

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
}

const dataUrlRegex = /^data:([^;]+);base64,(.+)$/i

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrlRegex.exec(dataUrl)
  if (!match || !match[1] || !match[2]) return null
  return {
    buffer: Buffer.from(match[2], "base64"),
    mime: match[1],
  }
}

function normalizeRelativePath(rawPath: string): string {
  let normalized = rawPath.trim()
  if (!normalized) return ""

  normalized = normalized.replace(/\\/g, "/")
  normalized = normalized.replace(/^https?:\/\/[^/]+/i, "")

  const decoded = decodeURIComponent(normalized)
  const fromBaseUrl = decoded.startsWith(LOCAL_UPLOADS_BASE_URL)
    ? decoded.slice(LOCAL_UPLOADS_BASE_URL.length)
    : decoded.startsWith("/vote-evidence")
      ? decoded.slice("/vote-evidence".length)
      : decoded

  return fromBaseUrl.replace(/^\/+/, "")
}

function buildBinaryResponse(file: Buffer, filenameOrPath: string, contentTypeOverride?: string) {
  const ext = path.extname(filenameOrPath).toLowerCase()
  const contentType = contentTypeOverride || contentTypes[ext] || "application/octet-stream"
  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

async function findFileCandidate(root: string, originalName: string): Promise<string | null> {
  const targetName = originalName.toLowerCase()
  const timestamp = originalName.match(/\d{10,}/)?.[0] ?? null
  const stack: string[] = [root]
  let timestampMatch: string | null = null

  while (stack.length > 0) {
    const current = stack.pop()!
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }

      const lowerName = entry.name.toLowerCase()
      if (lowerName === targetName) return full
      if (!timestampMatch && timestamp && lowerName.includes(timestamp)) {
        timestampMatch = full
      }
    }
  }

  return timestampMatch
}

async function tryResolveFromDatabase(filename: string): Promise<{ buffer: Buffer; contentType?: string } | null> {
  if (!pool) return null

  try {
    const result = await pool.query(
      `WITH matched_reports AS (
          SELECT DISTINCT vote_report_id
          FROM evidences
          WHERE url ILIKE $1
            AND vote_report_id IS NOT NULL
          LIMIT 10
        )
        SELECT e.url, vr.photo_url AS report_photo_url
        FROM evidences e
        LEFT JOIN vote_reports vr ON vr.id = e.vote_report_id
        WHERE e.url ILIKE $1
           OR vr.photo_url ILIKE $1
           OR e.vote_report_id IN (SELECT vote_report_id FROM matched_reports)
        ORDER BY e.uploaded_at DESC
        LIMIT 20`,
      [`%${filename}%`],
    )

    const candidates = result.rows.flatMap((row) => {
      const urls = [row.url as string | null, row.report_photo_url as string | null]
      return urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    })

    for (const candidate of candidates) {
      if (candidate.startsWith("data:")) {
        const parsed = parseDataUrl(candidate)
        if (!parsed) continue
        return { buffer: parsed.buffer, contentType: parsed.mime }
      }

      if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        const res = await fetch(candidate)
        if (!res.ok) continue
        const arrayBuffer = await res.arrayBuffer()
        return {
          buffer: Buffer.from(arrayBuffer),
          contentType: res.headers.get("content-type") ?? undefined,
        }
      }

      const relative = normalizeRelativePath(candidate)
      if (!relative) continue
      const root = path.resolve(process.cwd(), LOCAL_UPLOADS_ROOT)
      const diskPath = path.resolve(root, relative)
      if (!diskPath.startsWith(root)) continue
      try {
        const file = await readFile(diskPath)
        return { buffer: file }
      } catch {
        continue
      }
    }
  } catch (error) {
    console.error("storage local db fallback error", error)
  }

  return null
}

export async function GET(req: NextRequest) {
  const requestedPath = req.nextUrl.searchParams.get("path")
  if (!requestedPath) {
    return NextResponse.json({ error: "path requerido" }, { status: 400 })
  }

  const relativePath = normalizeRelativePath(requestedPath)
  if (!relativePath) {
    return NextResponse.json({ error: "path inválido" }, { status: 400 })
  }

  const root = path.resolve(process.cwd(), LOCAL_UPLOADS_ROOT)
  const target = path.resolve(root, relativePath)
  const filename = path.basename(relativePath)

  if (!target.startsWith(root)) {
    return NextResponse.json({ error: "path inválido" }, { status: 400 })
  }

  try {
    const file = await readFile(target)
    return buildBinaryResponse(file, target)
  } catch {
    const candidatePath = await findFileCandidate(root, filename)
    if (candidatePath) {
      try {
        const file = await readFile(candidatePath)
        return buildBinaryResponse(file, candidatePath)
      } catch {
      }
    }

    const dbResolved = await tryResolveFromDatabase(filename)
    if (dbResolved) {
      return buildBinaryResponse(dbResolved.buffer, filename, dbResolved.contentType)
    }

    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
  }
}