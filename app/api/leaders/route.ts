import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const { candidate_id, full_name, email, phone, department_code, municipality_code } = await req.json();
  if (!candidate_id || !full_name) {
    return NextResponse.json({ error: "candidate_id y full_name requeridos" }, { status: 400 });
  }

  await pool!.query(
    `INSERT INTO leaders (id, candidate_id, full_name, email, phone, department_code, municipality_code)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
    [candidate_id, full_name, email ?? null, phone ?? null, department_code ?? null, municipality_code ?? null],
  );

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  const { rows } = await pool!.query(
    `SELECT l.*, c.full_name AS candidate_name
     FROM leaders l
     JOIN candidates c ON c.id = l.candidate_id
     WHERE ($1::uuid IS NULL OR l.candidate_id = $1)
     ORDER BY l.created_at DESC`,
    [candidateId],
  );

  return NextResponse.json(rows);
}
