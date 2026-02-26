const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const q1 = await c.query(`select position, count(*) as total from candidates group by position order by total desc`);
  console.log('POSITIONS');
  console.table(q1.rows);
  const q2 = await c.query(`select ballot_number, full_name, party, position, region, color, department_code from candidates order by position, ballot_number limit 120`);
  console.log('SAMPLE');
  console.table(q2.rows);
  await c.end();
})();
