import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schemas/*",
  dbCredentials: {
    host: "trustworthy-registry-db.cb04wqeiekix.us-east-2.rds.amazonaws.com",
    database: "postgres",
    user: "team8",
    password: "ECE461.team8.aws",
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // Temporarily bypass SSL validation
    },
  },
});

// psql "host=trustworthy-registry-db.cb04wqeiekix.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=team8 password=ECE461.team8.aws sslmode=require"
