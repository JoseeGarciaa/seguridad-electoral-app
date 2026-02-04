import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["leader"]);
  if (auth.error) return auth.error;

  const leaderId = auth.user!.leaderId;
  if (!leaderId) {
    return NextResponse.json({ error: "Leader no vinculado" }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("date_from");
  const to = sp.get("date_to");

  const client = await pool!.connect();
  try {
    const promisedRow = (
      await client.query(
        `SELECT COALESCE(SUM(p.promised_votes), 0) AS promised_enabled_votes
         FROM leader_commitment_promises p
         JOIN candidate_commitments c ON c.id = p.commitment_id
         WHERE p.leader_id = $1 AND c.status = 'fulfilled'`,
        [leaderId],
      )
    ).rows[0];

    const reportedRow = (
      await client.query(
        `SELECT COALESCE(SUM(d.votes), 0) AS reported_votes
         FROM vote_reports vr
         JOIN vote_details d ON d.vote_report_id = vr.id
         JOIN delegates del ON del.id = vr.delegate_id
         WHERE del.leader_id = $1
           AND ($2::timestamptz IS NULL OR vr.reported_at >= $2)
           AND ($3::timestamptz IS NULL OR vr.reported_at <= $3)`,
        [leaderId, from, to],
      )
    ).rows[0];

    const assignedWitnessesRow = (
      await client.query(`SELECT COUNT(*)::int AS c FROM delegates WHERE leader_id = $1`, [leaderId])
    ).rows[0];

    const activeWitnessesRow = (
      await client.query(
        `SELECT COUNT(DISTINCT vr.delegate_id)::int AS c
         FROM vote_reports vr
         JOIN delegates del ON del.id = vr.delegate_id
         WHERE del.leader_id = $1
           AND ($2::timestamptz IS NULL OR vr.reported_at >= $2)
           AND ($3::timestamptz IS NULL OR vr.reported_at <= $3)`,
        [leaderId, from, to],
      )
    ).rows[0];

    const assignedTablesRow = (
      await client.query(
        `SELECT COALESCE(SUM(dl.mesas), 0) AS c
         FROM delegate_polling_assignments a
         JOIN delegates del ON del.id = a.delegate_id
         JOIN divipole_locations dl ON dl.id = a.divipole_location_id
         WHERE del.leader_id = $1`,
        [leaderId],
      )
    ).rows[0];

    const reportedTablesRow = (
      await client.query(
        `SELECT COUNT(DISTINCT vr.delegate_assignment_id)::int AS c
         FROM vote_reports vr
         JOIN delegates del ON del.id = vr.delegate_id
         WHERE del.leader_id = $1
           AND ($2::timestamptz IS NULL OR vr.reported_at >= $2)
           AND ($3::timestamptz IS NULL OR vr.reported_at <= $3)`,
        [leaderId, from, to],
      )
    ).rows[0];

    const promised = Number(promisedRow.promised_enabled_votes ?? 0);
    const reported = Number(reportedRow.reported_votes ?? 0);
    const completion_pct = promised === 0 ? 0 : (reported * 100.0) / promised;

    return NextResponse.json({
      promised_enabled_votes: promised,
      reported_votes: reported,
      completion_pct,
      assigned_witnesses_count: Number(assignedWitnessesRow.c ?? 0),
      active_witnesses_count: Number(activeWitnessesRow.c ?? 0),
      assigned_tables_count: Number(assignedTablesRow.c ?? 0),
      reported_tables_count: Number(reportedTablesRow.c ?? 0),
    });
  } finally {
    client.release();
  }
}
