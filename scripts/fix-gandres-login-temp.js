const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

(async () => {
  const connectionString = process.env.DATABASE_URL;
  const email = "gandres.rf@gmail.com";
  const password = "admin1234";
  const client = new Client({ connectionString });
  await client.connect();

  const hash = await bcrypt.hash(password, 10);
  const existing = await client.query(
    `SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
    [email],
  );

  if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, is_active, must_reset_password, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin', true, false, NOW(), NOW())`,
      [randomUUID(), email, hash],
    );
  } else {
    await client.query(
      `UPDATE users
          SET password_hash = $1,
              role = 'admin',
              is_active = true,
              must_reset_password = false,
              updated_at = NOW()
        WHERE id = $2`,
      [hash, existing.rows[0].id],
    );
  }

  const { rows } = await client.query(
    `SELECT id, email, role, is_active FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
    [email],
  );

  console.log(JSON.stringify({ ok: true, user: rows[0] }));
  await client.end();
})();
