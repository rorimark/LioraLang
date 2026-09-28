const { spawnSync } = require("node:child_process");
const result = spawnSync(
  require("electron"),
  ["electron/scripts/verify-srs.js"],
  {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
