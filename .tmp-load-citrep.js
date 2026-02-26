const fs = require('fs');
const { Client } = require('pg');
const envLine = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const connectionString = envLine.split('=')[1];

const parties = [
  'MFOPDNS',
  'ASOCAFEVIC',
  'ASMEDDIT',
  'CORPOREDDEH',
  'COMITE DE CACAOTEROS DEL MUNICIPIO DE EL TARRA',
  'ASOCIACION DE VICTIMAS CAMINOS DE ESPERANZA LAS MERCEDEZ',
];

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    await c.query('BEGIN');

    await c.query(`
      DELETE FROM public.candidates
      WHERE LOWER(position) IN (LOWER('Cámara de Representantes'), LOWER('Camara de Representantes'), LOWER('CITREP'))
    `);

    for (const party of parties) {
      for (const ballot of [501, 502]) {
        await c.query(
          `
          INSERT INTO public.candidates (ballot_number, full_name, position, region, color, department_code, party)
          VALUES ($1, $2, 'CITREP', NULL, '#64748B', '54', $3)
          `,
          [ballot, `${party} - CANDIDATO ${ballot}`, party],
        );
      }
    }

    await c.query('COMMIT');

    const check = await c.query(`
      SELECT position, party, ballot_number, full_name, region, department_code
      FROM public.candidates
      WHERE LOWER(position) = LOWER('CITREP')
      ORDER BY party, ballot_number
    `);

    console.table(check.rows);
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
