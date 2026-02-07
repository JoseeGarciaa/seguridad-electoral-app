import { EventEmitter } from "node:events"

export type WarRoomUpdatePayload = {
  ts: number
  source?: string
  type?: "votes" | "alert" | "evidence" | "assignment"
}

const emitter = new EventEmitter()
emitter.setMaxListeners(0)

export function emitWarRoomUpdate(payload: WarRoomUpdatePayload = { ts: Date.now() }) {
  emitter.emit("update", payload)
}

export function subscribeWarRoomUpdates(handler: (payload: WarRoomUpdatePayload) => void) {
  emitter.on("update", handler)
  return () => emitter.off("update", handler)
}
