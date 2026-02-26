const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const q = await c.query(`select distinct party from candidates order by party`);
  console.table(q.rows);
  await c.end();
})().catch((e)=>{console.error(e); process.exit(1);});
