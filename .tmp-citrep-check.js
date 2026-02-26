const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
if (!envLine) throw new Error('DATABASE_URL no encontrado en .env.local');
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const q1 = await c.query(`select coalesce(position,'(null)') as position, count(*)::int as total from candidates group by 1 order by 1`);
  console.log('POSITIONS');
  console.table(q1.rows);
  const q2 = await c.query(`select coalesce(position,'(null)') as position, coalesce(party,'(null)') as party, count(*)::int as total from candidates where lower(coalesce(position,'')) like '%citrep%' or lower(coalesce(position,'')) like '%paz%' group by 1,2 order by 1,2`);
  console.log('CITREP/Paz parties');
  console.table(q2.rows);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
