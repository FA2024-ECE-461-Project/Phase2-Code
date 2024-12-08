import { Hono } from "hono";
import { logger } from "hono/logger";
import { packageRoutes } from "./routes/packageRoutes";
import { metadataRoutes } from "./routes/packages";
import { resetRoutes } from "./routes/resetRoutes";
import { serveStatic } from "hono/bun";
import { writeLogToFile } from "./customizedApiLogger";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file in the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = new Hono();

// Add a logger middleware
app.use("*", logger(writeLogToFile(process.env.SERVER_LOG_FILE || "server.log")));

// Add a route to packages
// Can add more routes here
const apiRoutes = app
  .basePath("/api")
  .route("/package", packageRoutes)
  .route("/packages", metadataRoutes)
  .route("/reset", resetRoutes);
// .route('/authenticate', authRoutes)
// .route('/track', trackingRoutes)

// Add a static file server
// if the request is not matched by any other route, serve the static files
app.get("*", serveStatic({ root: "./frontend/dist" }));
app.get("*", serveStatic({ path: "./frontend/dist/index.html" }));

export default app;
export type ApiRoutes = typeof apiRoutes; // will be used in the frontend/client side code when frontend seeks to call backend APIs
