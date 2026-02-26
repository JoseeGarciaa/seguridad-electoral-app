const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const q = await c.query(`select position, count(*)::int as total from public.candidates group by position order by position`);
  console.table(q.rows);
  await c.end();
})();
