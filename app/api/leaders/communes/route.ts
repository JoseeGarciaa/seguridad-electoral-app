import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/pg";
import { requireSession } from "@/lib/auth";

type CommuneRow = {
  comuna: string;
  municipio: string;
  department_code: string | null;
  municipality_code: string | null;
  voters_current: number;
  tables_current: number;
};

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

export async function GET(req: NextRequest) {
  const auth = await requireSession(req, ["admin"]);
  if (auth.error) return auth.error;

  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL no configurado" }, { status: 503 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const values: Array<string> = ["NORTE DE SANTANDER", "54"];
  let searchFilter = "";

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    searchFilter = `
      AND (
        LOWER(dl.comuna) LIKE $${values.length}
        OR LOWER(dl.municipio) LIKE $${values.length}
      )`;
  }

  const { rows } = await pool.query<CommuneRow>(
    `WITH commune_agg AS (
       WITH north_department_codes AS (
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
         OR NULLIF(TRIM(dl.dd), '') = $2
       )
         AND NULLIF(TRIM(dl.comuna), '') IS NOT NULL
         ${searchFilter}
       GROUP BY TRIM(dl.comuna), TRIM(dl.municipio)
     )
     SELECT
       ca.comuna,
       ca.municipio,
       COALESCE(dep_by_code.code, dep_by_name.code, ca.dd) AS department_code,
       COALESCE(mu_by_code_full.code, mu_by_code_short.code, mu_by_name.code) AS municipality_code,
       ca.voters_current,
       ca.tables_current
     FROM commune_agg ca
     LEFT JOIN departments dep_by_code
       ON dep_by_code.code = ca.dd
     LEFT JOIN departments dep_by_name
       ON ${normalizeSql("dep_by_name.name")} = ${normalizeSql("$1::text")}
     LEFT JOIN municipalities mu_by_code_full
       ON mu_by_code_full.code = COALESCE(ca.dd, '') || COALESCE(ca.mm, '')
     LEFT JOIN municipalities mu_by_code_short
       ON mu_by_code_short.code = ca.mm
     LEFT JOIN municipalities mu_by_name
       ON ${normalizeSql("mu_by_name.name")} = ${normalizeSql("ca.municipio")}
      AND (
        mu_by_name.department_code = COALESCE(dep_by_code.code, dep_by_name.code, ca.dd)
        OR COALESCE(dep_by_code.code, dep_by_name.code, ca.dd) IS NULL
      )
     ORDER BY ca.municipio, ca.comuna`,
    values,
  );

  return NextResponse.json(rows);
}
