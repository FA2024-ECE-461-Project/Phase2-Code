import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Create a connection pool to the RDS database
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: 5432,
  database: process.env.DATABASE_NAME, // Use "postgres" if the database "trustworthy-registry-db" doesn't exist
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Ensure SSL connection
});
export const db = drizzle({ client: pool });
