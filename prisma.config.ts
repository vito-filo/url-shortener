import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load environment variables from multiple files
dotenv.config({ path: ".env.local", override: false });
dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: false });
dotenv.config({ path: ".env", override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("POSTGRES_PRISMA_URL"),
  },
});
