import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const candidateId = sp.get("candidate_id");
  const from = sp.get("date_from");
  const to = sp.get("date_to");

  const promisedRow = (
    await pool!.query(
      `SELECT COALESCE(SUM(p.promised_votes), 0) AS promised_enabled_votes
       FROM leader_commitment_promises p
       JOIN candidate_commitments c ON c.id = p.commitment_id
       WHERE c.status = 'fulfilled'
         AND ($1::uuid IS NULL OR c.candidate_id = $1)`,
      [candidateId],
    )
  ).rows[0];

  const reportedRow = (
    await pool!.query(
      `SELECT COALESCE(SUM(d.votes), 0) AS reported_votes
       FROM vote_reports vr
       JOIN vote_details d ON d.vote_report_id = vr.id
       WHERE ($1::timestamptz IS NULL OR vr.reported_at >= $1)
         AND ($2::timestamptz IS NULL OR vr.reported_at <= $2)
         AND ($3::uuid IS NULL OR d.candidate_id = $3)`,
      [from, to, candidateId],
    )
  ).rows[0];

  const promised = Number(promisedRow.promised_enabled_votes ?? 0);
  const reported = Number(reportedRow.reported_votes ?? 0);
  const completion_pct = promised === 0 ? 0 : (reported * 100.0) / promised;

  return NextResponse.json({
    promised_enabled_votes: promised,
    reported_votes: reported,
    completion_pct,
  });
}
