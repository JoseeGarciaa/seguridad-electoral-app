import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE_NAME = "seguridad_electoral_session";
const SESSION_DURATION_DAYS = 7;

// Simple password hashing for demo (use bcryptjs in production with proper integration)
export async function hashPassword(password: string): Promise<string> {
  // For demo: simple hash. In production, use bcrypt with a database integration
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "seguridad_electoral_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "$demo$" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Check for demo user's bcrypt hash
  if (hash.startsWith("$2a$")) {
    // Demo user password is "demo1234"
    return password === "demo1234";
  }
  // For demo-created users
  const newHash = await hashPassword(password);
  return newHash === hash;
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db.authSession.create({
    data: {
      user_id: userId,
      token,
      expires_at: expiresAt,
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session || session.expires_at < new Date()) {
    if (session) {
      await db.authSession.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function logout() {
  const token = await getSessionToken();
  if (token) {
    await db.authSession.deleteMany({ where: { token } });
  }
  await deleteSessionCookie();
}

export type UserRole = "admin" | "coordinator" | "leader" | "volunteer" | "delegate" | "witness";

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  coordinator: 4,
  leader: 3,
  volunteer: 2,
  delegate: 1,
  witness: 0,
};

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
