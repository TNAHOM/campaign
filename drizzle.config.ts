// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql', // Explicitly specify PostgreSQL
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use `url` instead of `connectionString`
  },
});