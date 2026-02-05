import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// Prefer SSL for remote DBs (e.g. Railway); keep disabled for localhost to avoid handshake failures.
const shouldUseSSL = Boolean(
  connectionString &&
    !connectionString.includes("localhost") &&
    !connectionString.includes("127.0.0.1"),
);

// Reuse the pool in dev to avoid exhausting connections. If DATABASE_URL is
// missing we leave the pool as null so callers can fall back gracefully.
const globalForPool = globalThis as unknown as { pgPool?: Pool | null };

export const pool: Pool | null = connectionString
  ? globalForPool.pgPool ?? new Pool({ connectionString, ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined })
  : null;

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("DATABASE_URL no configurado");
  }
  return pool;
}

export default pool;
