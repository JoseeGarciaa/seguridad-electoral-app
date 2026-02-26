const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const tables = await c.query(`select table_name from information_schema.tables where table_schema='public' and (lower(table_name) like '%citrep%' or lower(table_name) like '%paz%' or lower(table_name) like '%candidate%') order by table_name`);
  console.table(tables.rows);
  await c.end();
})().catch((e)=>{console.error(e); process.exit(1);});
