// How a synced device reads in the account: what it is (the hardware and
// system people recognise), what runs LioraLang on it, and how recently it
// was used. Pure, so the list can be tested without a browser.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Not seen for this long, a device is most likely gone: offered for
// removal in its own group.
export const INACTIVE_AFTER_MS = 60 * DAY;
// Seen this recently, it is in use right now.
const ACTIVE_NOW_MS = 5 * MINUTE;

const SYSTEMS = {
  macOS: { title: "Mac", kind: "computer" },
  Windows: { title: "Windows", kind: "computer" },
  Linux: { title: "Linux", kind: "computer" },
  ChromeOS: { title: "Chromebook", kind: "computer" },
  iPhone: { title: "iPhone", kind: "phone" },
  Android: { title: "Android", kind: "phone" },
  iPad: { title: "iPad", kind: "tablet" },
};

// Names were once just "Web browser" and "Desktop app"; they still read,
// as what they are, until that device syncs again with a real name.
export const describeDeviceIdentity = (device) => {
  const [client = "", system = ""] = String(device?.deviceName || "").split(" · ");
  const known = SYSTEMS[system] || null;
  const isApp = device?.platform === "desktop";

  return {
    title: known?.title || "",
    kind: known?.kind || "computer",
    client: isApp ? "" : client && client !== "Web browser" ? client : "",
    isApp,
  };
};

const toMs = (value) => {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? ms : NaN;
};

// "now", "3 hours ago", "yesterday", or a date once it is a month back.
export const describeActivity = (lastSeenAt, nowMs) => {
  const seenMs = toMs(lastSeenAt);

  if (!Number.isFinite(seenMs)) {
    return { state: "unknown" };
  }

  const age = Math.max(0, nowMs - seenMs);

  if (age < ACTIVE_NOW_MS) {
    return { state: "now", age };
  }

  if (age < HOUR) {
    return { state: "recent", age, value: -Math.round(age / MINUTE), unit: "minute" };
  }

  if (age < DAY) {
    return { state: "recent", age, value: -Math.round(age / HOUR), unit: "hour" };
  }

  if (age < 30 * DAY) {
    return { state: "recent", age, value: -Math.round(age / DAY), unit: "day" };
  }

  return { state: age >= INACTIVE_AFTER_MS ? "inactive" : "old", age, date: lastSeenAt };
};

// This device first, then the others by how recently they were used, and
// the ones gone quiet for months apart.
export const groupDevices = (devices, nowMs) => {
  const list = (Array.isArray(devices) ? devices : []).map((device) => ({
    ...device,
    identity: describeDeviceIdentity(device),
    activity: describeActivity(device.lastSeenAt, nowMs),
  }));
  const bySeen = (a, b) => (toMs(b.lastSeenAt) || 0) - (toMs(a.lastSeenAt) || 0);
  const others = list.filter((device) => !device.isCurrent).sort(bySeen);

  return {
    current: list.find((device) => device.isCurrent) || null,
    active: others.filter((device) => device.activity.state !== "inactive"),
    inactive: others.filter((device) => device.activity.state === "inactive"),
  };
};
