import { prisma } from "./prisma"

// Prisma client export to replace the previous in-memory mock.
export const db = prisma

export default db
