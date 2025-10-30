import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const prisma = globalForPrisma.prisma || new PrismaClient();

console.log("Node Env:", process.env.NODE_ENV);
console.log("Database URL:", process.env.DATABASE_URL);
console.log("Postgres Prisma URL:", process.env.POSTGRES_PRISMA_URL);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
