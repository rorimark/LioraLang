import { registerDeckIpcHandlers } from "./ipc/decks.js";
import { registerHubIpcHandlers } from "./ipc/hub.js";
import { registerStudyIpcHandlers } from "./ipc/study.js";
import { registerAppIpcHandlers } from "./ipc/app.js";
import { registerUpdateIpcHandlers } from "./ipc/updates.js";
import { registerWindowIpcHandlers } from "./ipc/window.js";

export const registerIpcHandlers = (dependencies) => {
  registerDeckIpcHandlers(dependencies);
  registerHubIpcHandlers(dependencies);
  registerStudyIpcHandlers(dependencies);
  registerAppIpcHandlers(dependencies);
  registerUpdateIpcHandlers(dependencies);
  registerWindowIpcHandlers(dependencies);
};
