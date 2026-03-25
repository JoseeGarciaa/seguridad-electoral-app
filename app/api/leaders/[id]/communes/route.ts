import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { assertPositiveInt, requireSession } from "@/lib/auth";

type LeaderCommuneAssignmentRow = {
  assignment_id: string;
  commune_id: string;
  commune_name: string;
  divipole_comuna: string | null;
  municipality_code: string;
  municipality_name: string | null;
  department_code: string | null;
  department_name: string | null;
  assigned_votes: number;
  assigned_witnesses: number;
  status: string;
  voters_current: number;
  tables_current: number;
};

const ALLOWED_STATUS = new Set(["active", "paused", "closed"]);

const normalizeSql = (valueExpr: string) => `
  UPPER(
    REGEXP_REPLACE(
      TRANSLATE(TRIM(COALESCE(${valueExpr}, '')), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL no configurado" }, { status: 503 });
  }

  const { id } = await context.params;

  const { rows } = await pool.query<LeaderCommuneAssignmentRow>(
    `SELECT
       lca.id AS assignment_id,
       ac.id AS commune_id,
       ac.name AS commune_name,
       ac.divipole_comuna,
       ac.municipality_code,
       m.name AS municipality_name,
       ac.department_code,
       d.name AS department_name,
       lca.assigned_votes,
       lca.assigned_witnesses,
       lca.status,
       ac.voters_current,
       ac.tables_current
     FROM leader_commune_assignments lca
     JOIN admin_communes ac ON ac.id = lca.commune_id
     LEFT JOIN municipalities m ON m.code = ac.municipality_code
     LEFT JOIN departments d ON d.code = ac.department_code
     WHERE lca.leader_id = $1
     ORDER BY m.name NULLS LAST, ac.name`,
    [id],
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL no configurado" }, { status: 503 });
  }

  const { id } = await context.params;
  const { comuna, municipio, assigned_votes, assigned_witnesses, status } = await req.json();

  if (!comuna || !String(comuna).trim()) {
    return NextResponse.json({ error: "comuna es requerida" }, { status: 400 });
  }

  if (!municipio || !String(municipio).trim()) {
    return NextResponse.json({ error: "municipio es requerido" }, { status: 400 });
  }

  try {
    assertPositiveInt(assigned_votes, "assigned_votes");
    assertPositiveInt(assigned_witnesses, "assigned_witnesses");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const safeStatus = String(status ?? "active").trim().toLowerCase();
  if (!ALLOWED_STATUS.has(safeStatus)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const communeFromDivipole = await client.query<{
      comuna: string;
      municipio: string;
      dd: string | null;
      mm: string | null;
      voters_current: number;
      tables_current: number;
    }>(
      `WITH north_department_codes AS (
         SELECT d.code
         FROM departments d
         WHERE ${normalizeSql("d.name")} = ${normalizeSql("$1::text")}
       )
       SELECT
         TRIM(dl.comuna) AS comuna,
         TRIM(dl.municipio) AS municipio,
         MIN(NULLIF(TRIM(dl.dd), '')) AS dd,
         MIN(NULLIF(TRIM(dl.mm), '')) AS mm,
         COALESCE(SUM(dl.total), 0)::int AS voters_current,
         COALESCE(SUM(dl.mesas), 0)::int AS tables_current
       FROM divipole_locations dl
       WHERE (
           ${normalizeSql("dl.departamento")} = ${normalizeSql("$1::text")}
           OR NULLIF(TRIM(dl.dd), '') IN (SELECT code FROM north_department_codes)
           OR NULLIF(TRIM(dl.dd), '') = '54'
         )
         AND ${normalizeSql("dl.comuna")} = ${normalizeSql("$2::text")}
         AND ${normalizeSql("dl.municipio")} = ${normalizeSql("$3::text")}
       GROUP BY TRIM(dl.comuna), TRIM(dl.municipio)
       LIMIT 1`,
      ["NORTE DE SANTANDER", String(comuna).trim(), String(municipio).trim()],
    );

    const divipole = communeFromDivipole.rows[0];
    if (!divipole) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No se encontró la comuna en divipole_locations para Norte de Santander" },
        { status: 404 },
      );
    }

    const municipalityLookup = await client.query<{
      municipality_code: string;
      department_code: string | null;
    }>(
      `SELECT
         m.code AS municipality_code,
         m.department_code
       FROM municipalities m
       WHERE m.code = COALESCE($1, '') || COALESCE($2, '')
          OR m.code = $2
          OR ${normalizeSql("m.name")} = ${normalizeSql("$3::text")}
       ORDER BY
         CASE
           WHEN m.code = COALESCE($1, '') || COALESCE($2, '') THEN 1
           WHEN m.code = $2 THEN 2
           WHEN ${normalizeSql("m.name")} = ${normalizeSql("$3::text")} THEN 3
           ELSE 9
         END,
         m.code
       LIMIT 1`,
      [divipole.dd, divipole.mm, divipole.municipio],
    );

    const municipality = municipalityLookup.rows[0];
    if (!municipality?.municipality_code) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No se pudo resolver municipality_code para la comuna seleccionada" },
        { status: 400 },
      );
    }

    const departmentCode = municipality.department_code ?? divipole.dd ?? null;

    const adminCommuneResult = await client.query<{ id: string }>(
      `INSERT INTO admin_communes (
         department_code,
         municipality_code,
         name,
         divipole_comuna,
         voters_current,
         tables_current,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (municipality_code, name)
       DO UPDATE SET
         department_code = EXCLUDED.department_code,
         divipole_comuna = EXCLUDED.divipole_comuna,
         voters_current = EXCLUDED.voters_current,
         tables_current = EXCLUDED.tables_current,
         updated_at = now()
       RETURNING id`,
      [
        departmentCode,
        municipality.municipality_code,
        divipole.comuna,
        divipole.comuna,
        Number(divipole.voters_current ?? 0),
        Number(divipole.tables_current ?? 0),
      ],
    );

    const communeId = adminCommuneResult.rows[0]?.id;
    if (!communeId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No se pudo crear/encontrar la comuna administrativa" }, { status: 500 });
    }

    await client.query(
      `INSERT INTO leader_commune_assignments (
         leader_id,
         commune_id,
         assigned_votes,
         assigned_witnesses,
         status,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (leader_id, commune_id)
       DO UPDATE SET
         assigned_votes = EXCLUDED.assigned_votes,
         assigned_witnesses = EXCLUDED.assigned_witnesses,
         status = EXCLUDED.status,
         updated_at = now()`,
      [id, communeId, assigned_votes, assigned_witnesses, safeStatus],
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("leaders/[id]/communes POST error", error);
    return NextResponse.json({ error: "No se pudo guardar la asignación de comuna" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL no configurado" }, { status: 503 });
  }

  const { id } = await context.params;
  const { commune_id } = await req.json();

  if (!commune_id) {
    return NextResponse.json({ error: "commune_id es requerido" }, { status: 400 });
  }

  await pool.query(
    `DELETE FROM leader_commune_assignments
     WHERE leader_id = $1 AND commune_id = $2`,
    [id, commune_id],
  );

  return NextResponse.json({ ok: true });
}
