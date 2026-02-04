import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["delegate"]);
  if (auth.error) return auth.error;

  const delegateId = auth.user!.delegateId;
  const { rows } = await pool!.query(
    `SELECT a.*, dl.departamento, dl.municipio, dl.puesto, dl.mesas
     FROM delegate_polling_assignments a
     LEFT JOIN divipole_locations dl ON dl.id = a.divipole_location_id
     WHERE a.delegate_id = $1`,
    [delegateId],
  );

  return NextResponse.json(rows);
}
