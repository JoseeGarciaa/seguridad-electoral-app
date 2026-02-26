const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const counts = await c.query(`select p.name as position, count(*)::int as total from electoral_candidates c join electoral_positions p on p.id=c.position_id group by p.name order by p.name`);
  console.log('electoral_candidates by position');
  console.table(counts.rows);
  const citrepParties = await c.query(`select coalesce(c.party,'(null)') as party, count(*)::int as total from electoral_candidates c join electoral_positions p on p.id=c.position_id where lower(p.name) like '%citrep%' group by c.party order by c.party`);
  console.log('CITREP parties');
  console.table(citrepParties.rows);
  await c.end();
})().catch((e)=>{console.error(e); process.exit(1);});
