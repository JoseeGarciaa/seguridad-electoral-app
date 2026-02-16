import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    { success: false, error: "Registro deshabilitado. Solo el administrador puede crear cuentas." },
    { status: 403 },
  );
}
