const { Client } = require("pg");
const cs = process.env.DATABASE_URL;
const client = new Client({
  connectionString: cs,
  ssl: (cs || "").includes("localhost") || (cs || "").includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const q1 = await client.query("select departamento, count(*) as n from divipole_locations group by departamento order by n desc limit 20");
  console.log("departamentos top:", q1.rows);
  const q2 = await client.query("select count(*)::int as c from divipole_locations where comuna is not null and btrim(comuna)<>''");
  console.log("con comuna:", q2.rows[0]);
  const q3 = await client.query("select departamento, municipio, comuna from divipole_locations where comuna is not null and btrim(comuna)<>'' order by id desc limit 20");
  console.log("sample comunas:", q3.rows);
  await client.end();
})().catch(async (e) => {
  console.error(e);
  try { await client.end(); } catch {}
  process.exit(1);
});
