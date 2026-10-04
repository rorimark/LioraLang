import { BRAND_NAME } from "../../config/brand.js";
// A name for this device that its owner will recognise in a list of their
// devices: the browser and the system, or the app and the system. Proper
// names only, so it reads the same in every interface language.

const SYSTEMS = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Windows/, "Windows"],
  // iPadOS asks for desktop sites and says "Macintosh"; a touch screen
  // gives it away.
  [/Macintosh|Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
const BROWSERS = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/Firefox|FxiOS/, "Firefox"],
  [/Chrome|CriOS|Chromium/, "Chrome"],
  [/Safari/, "Safari"],
];

const pick = (list, userAgent) => list.find(([pattern]) => pattern.test(userAgent))?.[1] || "";

export const describeDevice = ({ userAgent = "", maxTouchPoints = 0, isDesktopApp = false } = {}) => {
  const agent = String(userAgent || "");
  let system = pick(SYSTEMS, agent);

  if (system === "macOS" && Number(maxTouchPoints) > 1) {
    system = "iPad";
  }

  const client = isDesktopApp ? BRAND_NAME : pick(BROWSERS, agent);
  return [client, system].filter(Boolean).join(" · ") || (isDesktopApp ? BRAND_NAME : "");
};

export const describeThisDevice = ({ isDesktopApp = false } = {}) =>
  typeof navigator === "undefined"
    ? ""
    : describeDevice({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        isDesktopApp,
      });
