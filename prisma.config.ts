import { defineConfig } from "@prisma/config"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido. Configura la variable de entorno.")
}

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})
