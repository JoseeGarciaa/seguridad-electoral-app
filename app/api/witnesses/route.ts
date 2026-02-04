import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { hashPassword, requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req, ["leader"]);
  if (auth.error) return auth.error;

  const leaderId = auth.user!.leaderId;
  if (!leaderId) {
    return NextResponse.json({ error: "Leader no vinculado" }, { status: 400 });
  }

  const { full_name, email, phone, document_number } = await req.json();
  if (!full_name || !email || !document_number) {
    return NextResponse.json({ error: "full_name, email y document_number son requeridos" }, { status: 400 });
  }

  const delegateId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(document_number);

  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO delegates (
         id, full_name, email, phone, document_number, role, department, municipality, leader_id
       ) VALUES ($1, $2, $3, $4, $5, 'delegate', '', '', $6)`,
      [delegateId, full_name, email, phone ?? null, document_number, leaderId],
    );

    await client.query(
      `INSERT INTO users (
         id, email, password_hash, role, delegate_id, leader_id, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, 'delegate', $4, $5, true, now(), now())`,
      [userId, email, passwordHash, delegateId, leaderId],
    );

    await client.query("COMMIT");
    return NextResponse.json({ delegate_id: delegateId, user_id: userId });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
