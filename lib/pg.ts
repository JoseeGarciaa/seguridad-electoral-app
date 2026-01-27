import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// Reuse the pool in dev to avoid exhausting connections. If DATABASE_URL is
// missing we leave the pool as null so callers can fall back gracefully.
const globalForPool = globalThis as unknown as { pgPool?: Pool | null };

export const pool: Pool | null = connectionString
  ? globalForPool.pgPool ?? new Pool({ connectionString })
  : null;

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}

export default pool;
