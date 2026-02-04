import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "./pg";

function getPool() {
  if (!pool) throw new Error("DATABASE_URL no configurado");
  return pool;
}

let hasUserLeaderId: boolean | null = null

const SESSION_COOKIE_NAME = "seguridad_electoral_session";
const SESSION_DURATION_DAYS = 7;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

async function ensureUserLeaderColumn(): Promise<boolean> {
  if (hasUserLeaderId !== null) return hasUserLeaderId;
  const db = getPool();
  const res = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'leader_id'
      LIMIT 1`,
  );
  hasUserLeaderId = Boolean(res.rowCount);
  return hasUserLeaderId;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(userId: string): Promise<string> {
  const db = getPool();
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const sessionId = crypto.randomUUID();
  await db.query(
    "INSERT INTO auth_sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)",
    [sessionId, userId, token, expiresAt],
  );

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
  const db = getPool();
  const token = await getSessionToken();
  if (!token) return null;

  const { rows } = await db.query(
    `SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.email, u.role, u.is_active, u.last_login_at, u.must_reset_password, u.delegate_id
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
     LIMIT 1`,
    [token],
  );

  const row = rows[0];
  if (!row) return null;

  const expiresAt = new Date(row.expires_at);
  if (expiresAt < new Date()) {
    await db.query("DELETE FROM auth_sessions WHERE id = $1", [row.session_id]);
    return null;
  }

  return {
    id: row.user_id,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    must_reset_password: row.must_reset_password,
    delegateId: row.delegate_id,
  };
}

export async function logout() {
  const db = getPool();
  const token = await getSessionToken();
  if (token) {
    await db.query("DELETE FROM auth_sessions WHERE token = $1", [token]);
  }
  await deleteSessionCookie();
}

export type SessionRole = "admin" | "leader" | "delegate";

export async function requireSession(
  req: NextRequest,
  roles?: SessionRole[],
): Promise<{ user?: { id: string; email: string; role: SessionRole; delegateId: string | null; leaderId: string | null }; error?: NextResponse }>
{
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const includeLeader = await ensureUserLeaderColumn();
  const leaderSelect = includeLeader ? "u.leader_id" : "NULL::uuid AS leader_id";

  const db = getPool();
  const { rows } = await db.query(
    `SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.email, u.role, u.delegate_id, ${leaderSelect}
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
     LIMIT 1`,
    [token],
  );

  const row = rows[0];
  if (!row) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const expiresAt = new Date(row.expires_at);
  if (expiresAt < new Date()) {
    await db.query("DELETE FROM auth_sessions WHERE id = $1", [row.session_id]);
    return { error: NextResponse.json({ error: "Session expired" }, { status: 401 }) };
  }

  const user = {
    id: row.user_id as string,
    email: row.email as string,
    role: row.role as SessionRole,
    delegateId: row.delegate_id as string | null,
    leaderId: row.leader_id as string | null,
  };

  if (roles && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export function assertPositiveInt(value: any, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} debe ser entero >= 0`);
  }
}

export function assertStatus(value: string) {
  if (!["pending", "fulfilled"].includes(value)) {
    throw new Error("Estado inválido");
  }
}

export type UserRole = "admin" | "coordinator" | "leader" | "volunteer" | "delegate" | "witness";

// Canonical role for testigo electoral / delegate flows
export const DELEGATE_ROLE: UserRole = "delegate";
export const TESTIGO_ELECTORAL_ROLE: UserRole = DELEGATE_ROLE;

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
