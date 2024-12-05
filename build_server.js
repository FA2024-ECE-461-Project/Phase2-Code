const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "es2022",
    outfile: "server.js",
  })
  .catch(() => process.exit(1));
