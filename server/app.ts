import { Hono } from "hono";
import { logger } from "hono/logger";
import { packageRoutes } from "./routes/packageRoutes";
import { metadataRoutes } from "./routes/packages";
import { resetRoutes } from "./routes/resetRoutes";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Add a logger middleware
app.use("*", logger());

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
export type ApiRoutes = typeof apiRoutes;
