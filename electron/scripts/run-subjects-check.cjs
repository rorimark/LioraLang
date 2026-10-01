const { spawnSync } = require("node:child_process");

const electronPath = require("electron");
const result = spawnSync(electronPath, ["electron/scripts/verify-subjects.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
  },
});

process.exit(typeof result.status === "number" ? result.status : 1);
