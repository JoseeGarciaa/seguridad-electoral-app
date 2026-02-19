import { NextResponse } from "next/server";
import { getPool } from "@/lib/pg";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { warmWarRoomBootstrapData } from "@/lib/warroom-bootstrap";

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

  try {
    const { rows } = await db.query(
      "SELECT id, email, password_hash, role, delegate_id, is_active FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    const user = rows[0];

    if (!user || user.is_active === false) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    warmWarRoomBootstrapData({
      role: user.role as string,
      delegateId: (user.delegate_id as string | null) ?? null,
      email: (user.email as string | null) ?? email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Error al iniciar sesión" },
      { status: 500 },
    );
  }
}
