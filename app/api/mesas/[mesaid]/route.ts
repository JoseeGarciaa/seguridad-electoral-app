import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/pg"
import { getMesaFactByMesaId } from "@/lib/mesa-fact"

function parseMesaId(value: string) {
  if (!/^[0-9]+$/.test(value)) return null
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null
  return parsed
}

export async function GET(_: Request, context: { params: Promise<{ mesaid: string }> }) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { mesaid: mesaidParam } = await context.params
  const mesaid = parseMesaId(mesaidParam ?? "")
  if (!mesaid) {
    return NextResponse.json({ error: "mesaid invalido" }, { status: 400 })
  }

  try {
    const mesa = await getMesaFactByMesaId(mesaid)

    if (!mesa) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 })
    }

    return NextResponse.json(mesa)
  } catch (error) {
    console.error("mesa_fact lookup error", error)
    return NextResponse.json({ error: "No se pudo consultar la mesa" }, { status: 500 })
  }
}
