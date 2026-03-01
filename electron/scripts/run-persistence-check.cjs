const { spawnSync } = require("node:child_process");

const electronPath = require("electron");
const result = spawnSync(
  electronPath,
  ["electron/scripts/verify-persistence.js"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
    },
  },
);

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
