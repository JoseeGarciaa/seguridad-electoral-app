import { NextResponse } from "next/server";
import { getPool } from "@/lib/pg";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  let db;
  try {
    db = getPool();
  } catch (err) {
    console.error("DATABASE_URL no configurado", err);
    return NextResponse.json(
      { success: false, error: "Error de configuración del servidor" },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload inválido" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "Email y contraseña son requeridos" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  try {
    const existing = await db.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, is_active, must_reset_password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, false, now(), now())`,
      [userId, email, hashedPassword, "delegate"],
    );

    const token = await createSession(userId);
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar usuario" },
      { status: 500 },
    );
  }
}
