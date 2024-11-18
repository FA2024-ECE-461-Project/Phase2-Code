import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: "postgresql",
    schema: "./server/db/schemas/*",
    dbCredentials: {
      host: process.env.DATABASE_HOST!,
      database: process.env.DATABASE_NAME!,
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD!,
      port: 5432,
      ssl: {
        rejectUnauthorized: false, // Temporarily bypass SSL validation
      },
    },
  });
  