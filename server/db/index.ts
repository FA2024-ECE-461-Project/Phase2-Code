import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Create a connection pool to the RDS database
const pool = new Pool({
    host: "trustworthy-registry-db.cb04wqeiekix.us-east-2.rds.amazonaws.com",
    port: 5432,
    database: "postgres", // Use "postgres" if the database "trustworthy-registry-db" doesn't exist
    user: "team8",
    password: "ECE461.team8.aws",
    ssl: { rejectUnauthorized: false }, // Ensure SSL connection
  });
export const db = drizzle({ client: pool });
