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

  const { rows } = await pool!.query(
    `INSERT INTO leaders (id, candidate_id, full_name, email, phone, department_code, municipality_code)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [candidate_id, full_name, email ?? null, phone ?? null, department_code ?? null, municipality_code ?? null],
  );

  return NextResponse.json({ ok: true, leader: rows[0] ?? null });
}

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const values: any[] = [candidateId];
  let searchFilter = "";

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    searchFilter = `
      AND (
        LOWER(l.full_name) LIKE $${values.length}
        OR LOWER(COALESCE(l.email, '')) LIKE $${values.length}
        OR LOWER(COALESCE(l.phone, '')) LIKE $${values.length}
      )`;
  }

  const { rows } = await pool!.query(
    `SELECT
       l.*,
       c.full_name AS candidate_name,
       d.name AS department_name,
       m.name AS municipality_name,
       COALESCE(pr.promised_votes_total, 0) AS promised_votes_total,
       COALESCE(pr.commitments_count, 0) AS commitments_count,
       COALESCE(ca.assigned_votes_total, 0) AS assigned_votes_total,
       COALESCE(ca.assigned_witnesses_total, 0) AS assigned_witnesses_total,
       COALESCE(ac.admin_commitments_count, 0) AS admin_commitments_count
     FROM leaders l
     JOIN candidates c ON c.id = l.candidate_id
     LEFT JOIN departments d ON d.code = l.department_code
     LEFT JOIN municipalities m ON m.code = l.municipality_code
     LEFT JOIN (
       SELECT
         leader_id,
         SUM(promised_votes)::int AS promised_votes_total,
         COUNT(*)::int AS commitments_count
       FROM leader_commitment_promises
       GROUP BY leader_id
     ) pr ON pr.leader_id = l.id
     LEFT JOIN (
       SELECT
         leader_id,
         SUM(assigned_votes)::int AS assigned_votes_total,
         SUM(assigned_witnesses)::int AS assigned_witnesses_total
       FROM leader_commune_assignments
       GROUP BY leader_id
     ) ca ON ca.leader_id = l.id
     LEFT JOIN (
       SELECT
         leader_id,
         COUNT(*)::int AS admin_commitments_count
       FROM leader_admin_commitments
       GROUP BY leader_id
     ) ac ON ac.leader_id = l.id
     WHERE ($1::uuid IS NULL OR l.candidate_id = $1)
     ${searchFilter}
     ORDER BY l.created_at DESC`,
    values,
  );

  return NextResponse.json(rows);
}
