"use server";

import { getPool } from "@/lib/pg";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  logout as logoutUser,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function login(formData: FormData): Promise<AuthResult> {
  let db;
  try {
    db = getPool();
  } catch (err) {
    console.error("DATABASE_URL no configurado", err);
    return { success: false, error: "Error de configuración del servidor" };
  }

  const rawEmail = (formData.get("email") as string | null) ?? "";
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  if (!email || !password) {
    return { success: false, error: "Email y contraseña son requeridos" };
  }

  try {
    const { rows } = await db.query(
      "SELECT id, password_hash, role, is_active FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    const user = rows[0];

    if (!user || user.is_active === false) {
      return { success: false, error: "Credenciales inválidas" };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: "Credenciales inválidas" };
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Error al iniciar sesión" };
  }
}

export async function register(formData: FormData): Promise<AuthResult> {
  let db;
  try {
    db = getPool();
  } catch (err) {
    console.error("DATABASE_URL no configurado", err);
    return { success: false, error: "Error de configuración del servidor" };
  }
  const rawEmail = (formData.get("email") as string | null) ?? "";
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  if (!email || !password) {
    return { success: false, error: "Email y contraseña son requeridos" };
  }

  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const existing = await db.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return { success: false, error: "El email ya está registrado" };
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

    return { success: true };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "Error al registrar usuario" };
  }
}

export async function logout() {
  await logoutUser();
  redirect("/login");
}
