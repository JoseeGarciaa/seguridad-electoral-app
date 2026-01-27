/* Create or update an admin user */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const email = process.env.ADMIN_EMAIL || "admin@seguridad-electoral.com";
const password = process.env.ADMIN_PASSWORD || "Admin1234!";
const rounds = Number(process.env.BCRYPT_ROUNDS || 10);

async function main() {
  const hash = await bcrypt.hash(password, rounds);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password_hash: hash,
      role: "admin",
      is_active: true,
      must_reset_password: false,
    },
    create: {
      email,
      password_hash: hash,
      role: "admin",
      is_active: true,
      must_reset_password: false,
    },
  });

  console.log("Admin upserted", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((err) => {
    console.error("Error creating admin", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
