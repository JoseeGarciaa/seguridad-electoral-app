import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const { candidate_id, title, description } = await req.json();
  if (!candidate_id || !title) {
    return NextResponse.json({ error: "candidate_id y title requeridos" }, { status: 400 });
  }

  const { rows } = await pool!.query(
    `INSERT INTO candidate_commitments (id, candidate_id, title, description)
     VALUES (gen_random_uuid(), $1, $2, $3)
     RETURNING *`,
    [candidate_id, title, description ?? null],
  );

  return NextResponse.json(rows[0]);
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  const { rows } = await pool!.query(
    `SELECT * FROM candidate_commitments
     WHERE ($1::uuid IS NULL OR candidate_id = $1)
     ORDER BY created_at DESC`,
    [candidateId],
  );

  return NextResponse.json(rows);
}
