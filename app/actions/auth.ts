"use server";

import { db } from "@/lib/db";
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

// Crea un usuario demo si no existe para evitar bloqueos en ambientes sin seed.
async function ensureDemoUser() {
  const demoEmail = "demo@seguridad-electoral.com";
  const demoPassword = "demo1234";

  const existing = await db.user.findUnique({ where: { email: demoEmail } });
  if (existing) return existing;

  const hashedPassword = await hashPassword(demoPassword);

  return db.user.create({
    data: {
      email: demoEmail,
      password_hash: hashedPassword,
      name: "Usuario Demo",
      role: "delegate",
      profile: { create: { role_extended: "volunteer" } },
    },
  });
}

export async function login(formData: FormData): Promise<AuthResult> {
  const rawEmail = (formData.get("email") as string | null) ?? "";
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  if (!email || !password) {
    return { success: false, error: "Email y contraseña son requeridos" };
  }

  try {
    // Garantiza un usuario demo disponible si la base aún no tiene seed.
    await ensureDemoUser();

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
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
  const rawEmail = (formData.get("email") as string | null) ?? "";
  const rawPassword = (formData.get("password") as string | null) ?? "";
  const name = (formData.get("name") as string | null) ?? null;
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();

  if (!email || !password) {
    return { success: false, error: "Email y contraseña son requeridos" };
  }

  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "El email ya está registrado" };
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        name: name || null,
        role: "delegate",
        profile: {
          create: {
            role_extended: "volunteer",
          },
        },
      },
    });

    const token = await createSession(user.id);
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
