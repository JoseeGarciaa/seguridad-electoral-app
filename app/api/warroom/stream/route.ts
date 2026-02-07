import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { subscribeWarRoomUpdates } from "@/lib/warroom-events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      sendEvent("ready", { ts: Date.now() })

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"))
      }, 25_000)

      const unsubscribe = subscribeWarRoomUpdates((payload) => {
        sendEvent("update", payload ?? { ts: Date.now() })
      })

      const cleanup = () => {
        clearInterval(keepAlive)
        unsubscribe()
        controller.close()
      }

      req.signal.addEventListener("abort", cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
