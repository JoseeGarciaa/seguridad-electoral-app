const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];
(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  const q = await c.query(`
    select column_name, is_nullable, data_type
    from information_schema.columns
    where table_schema='public' and table_name='candidates'
    order by ordinal_position
  `);
  console.table(q.rows);
  await c.end();
})();
