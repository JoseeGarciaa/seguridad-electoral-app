import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["delegate"]);
  if (auth.error) return auth.error;

  const delegateId = auth.user!.delegateId;
  const { rows } = await pool!.query(
    `SELECT vr.*, json_agg(json_build_object('candidate_id', d.candidate_id, 'votes', d.votes)) AS details
     FROM vote_reports vr
     LEFT JOIN vote_details d ON d.vote_report_id = vr.id
     WHERE vr.delegate_id = $1
     GROUP BY vr.id
     ORDER BY vr.reported_at DESC`,
    [delegateId],
  );

  return NextResponse.json(rows);
}
