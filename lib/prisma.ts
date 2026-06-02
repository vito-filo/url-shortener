import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import pg from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const caCert = process.env.DATABASE_CA_CERT;
const ssl = caCert
  ? { rejectUnauthorized: true, ca: Buffer.from(caCert, "base64").toString("utf-8") }
  : false;

const pool = new pg.Pool({
  connectionString: process.env.PRISMA_CUSTOM_URL!,
  ssl,
});
const adapter = new PrismaPg(pool);
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
