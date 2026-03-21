import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { assertPositiveInt, requireSession } from "@/lib/auth";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const { commitment_id, promised_votes } = await req.json();
  try {
    assertPositiveInt(promised_votes, "promised_votes");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await pool!.query(
    `INSERT INTO leader_commitment_promises (leader_id, commitment_id, promised_votes)
     VALUES ($1, $2, $3)
     ON CONFLICT (leader_id, commitment_id)
     DO UPDATE SET promised_votes = EXCLUDED.promised_votes, updated_at = now()`,
    [id, commitment_id, promised_votes],
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  const { rows } = await pool!.query(
    `SELECT p.*, c.title, c.status
     FROM leader_commitment_promises p
     JOIN candidate_commitments c ON c.id = p.commitment_id
     WHERE p.leader_id = $1`,
    [id],
  );

  return NextResponse.json(rows);
}
