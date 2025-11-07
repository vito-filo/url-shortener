import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import pg from "pg";

const ca = process.env.DATABASE_CA_CERT;

const pool = new pg.Pool({
  connectionString: process.env.PRISMA_CUSTOM_URL!,
  ssl: {
    rejectUnauthorized: true,
    ca,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
