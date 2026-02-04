import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { assertStatus, requireSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  const { status } = await req.json();
  try {
    assertStatus(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT status FROM candidate_commitments WHERE id = $1 FOR UPDATE",
      [params.id],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await client.query(
      `UPDATE candidate_commitments
       SET status = $1,
           fulfilled_at = CASE WHEN $1 = 'fulfilled' THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $2`,
      [status, params.id],
    );

    await client.query(
      `INSERT INTO commitment_status_audit (id, commitment_id, previous_status, new_status, changed_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [params.id, current.rows[0].status, status, auth.user!.id],
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
