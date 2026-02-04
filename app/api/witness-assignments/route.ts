import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req, ["leader"]);
  if (auth.error) return auth.error;

  const leaderId = auth.user!.leaderId;
  if (!leaderId) {
    return NextResponse.json({ error: "Leader no vinculado" }, { status: 400 });
  }

  const { delegate_id, divipole_location_id, polling_station, polling_station_number } = await req.json();
  if (!delegate_id || !divipole_location_id) {
    return NextResponse.json({ error: "delegate_id y divipole_location_id requeridos" }, { status: 400 });
  }

  const { rowCount } = await pool!.query(
    `INSERT INTO delegate_polling_assignments (id, delegate_id, divipole_location_id, polling_station, polling_station_number)
     SELECT gen_random_uuid(), d.id, $2, $3, $4
     FROM delegates d
     WHERE d.id = $1 AND d.leader_id = $5`,
    [delegate_id, divipole_location_id, polling_station ?? null, polling_station_number ?? null, leaderId],
  );

  if (!rowCount) {
    return NextResponse.json({ error: "Delegate no pertenece al líder" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
