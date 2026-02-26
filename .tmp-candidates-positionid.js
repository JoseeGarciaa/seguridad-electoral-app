const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const cols = await c.query(`select column_name from information_schema.columns where table_schema='public' and table_name='candidates' order by ordinal_position`);
  console.log('candidates cols');
  console.table(cols.rows);
  const ids = await c.query(`select coalesce(position_id::text,'(null)') as position_id, coalesce(position,'(null)') as position, count(*)::int as total from candidates group by 1,2 order by total desc`);
  console.log('candidates by position_id/position');
  console.table(ids.rows);
  const sample = await c.query(`select id, full_name, party, ballot_number, position_id, position from candidates order by created_at desc nulls last limit 20`);
  console.log('sample');
  console.table(sample.rows);
  await c.end();
})().catch((e)=>{console.error(e); process.exit(1);});
