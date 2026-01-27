import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  inbox: [
    {
      id: "MSG-1",
      sender: "Coordinación",
      channel: "whatsapp",
      preview: "Recordatorio de reunión",
      content: "Nos vemos a las 4pm en la sede",
      time: new Date().toISOString(),
      unread: true,
    },
  ],
  broadcasts: [
    {
      id: "BC-1",
      title: "Convocatoria voluntarios",
      channel: "sms",
      reach: 1200,
      status: "enviado",
      scheduledAt: null,
    },
  ],
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const channel = searchParams.get("channel") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 400)

  const filters: string[] = []
  const values: any[] = []

  if (channel) {
    values.push(channel)
    filters.push(`LOWER(channel) = LOWER($${values.length})`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const inboxQuery = `
    SELECT id, sender, channel, preview, content, received_at, unread
    FROM communication_messages
    ${where}
    ORDER BY received_at DESC
    LIMIT ${limit}
  `

  const broadcastsQuery = `
    SELECT id, title, channel, reach, status, scheduled_at
    FROM broadcasts
    ORDER BY updated_at DESC
    LIMIT 200
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving communications fallback data")
    return NextResponse.json(fallbackData)
  }

  try {
    const client = await pool.connect()
    try {
      const [inboxRes, broadcastsRes] = await Promise.all([
        client.query(inboxQuery, values),
        client.query(broadcastsQuery),
      ])

      return NextResponse.json({
        inbox: inboxRes.rows.map((row) => ({
          id: row.id as string,
          sender: row.sender as string,
          channel: row.channel as string,
          preview: row.preview as string,
          content: row.content as string | null,
          time: row.received_at ? new Date(row.received_at).toISOString() : null,
          unread: Boolean(row.unread),
        })),
        broadcasts: broadcastsRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          channel: row.channel as string,
          reach: Number(row.reach ?? 0),
          status: row.status as string,
          scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Communications GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
