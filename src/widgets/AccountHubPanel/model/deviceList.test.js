import { describe, expect, it } from "vitest";
import { describeActivity, describeDeviceIdentity, groupDevices } from "./deviceList";

const NOW = Date.parse("2026-09-30T12:00:00Z");

describe("describeDeviceIdentity", () => {
  it("names the hardware and the browser", () => {
    expect(describeDeviceIdentity({ deviceName: "Safari · iPhone", platform: "web" })).toEqual({
      title: "iPhone",
      kind: "phone",
      client: "Safari",
      isApp: false,
    });
    expect(describeDeviceIdentity({ deviceName: "Chrome · macOS", platform: "web" }).title).toBe("Mac");
    expect(describeDeviceIdentity({ deviceName: "Safari · iPad", platform: "web" }).kind).toBe("tablet");
  });

  it("marks the desktop app as the app, whatever its engine", () => {
    expect(describeDeviceIdentity({ deviceName: "LioraLang · Windows", platform: "desktop" })).toEqual({
      title: "Windows",
      kind: "computer",
      client: "",
      isApp: true,
    });
  });

  it("keeps an old generic name without inventing a system", () => {
    expect(describeDeviceIdentity({ deviceName: "Web browser", platform: "web" })).toEqual({
      title: "",
      kind: "computer",
      client: "",
      isApp: false,
    });
  });
});

describe("describeActivity", () => {
  it("says now, then minutes, hours and days", () => {
    expect(describeActivity("2026-09-30T11:58:00Z", NOW).state).toBe("now");
    expect(describeActivity("2026-09-30T11:20:00Z", NOW)).toMatchObject({ value: -40, unit: "minute" });
    expect(describeActivity("2026-09-30T07:00:00Z", NOW)).toMatchObject({ value: -5, unit: "hour" });
    expect(describeActivity("2026-09-28T12:00:00Z", NOW)).toMatchObject({ value: -2, unit: "day" });
  });

  it("gives a date after a month, and calls two months quiet inactive", () => {
    expect(describeActivity("2026-08-20T12:00:00Z", NOW).state).toBe("old");
    expect(describeActivity("2026-06-02T12:00:00Z", NOW).state).toBe("inactive");
    expect(describeActivity("", NOW).state).toBe("unknown");
  });
});

describe("groupDevices", () => {
  it("puts this device first and the long-quiet ones apart", () => {
    const groups = groupDevices(
      [
        { deviceId: "a", deviceName: "Safari · iPhone", lastSeenAt: "2026-09-12T08:00:00Z" },
        { deviceId: "b", deviceName: "Chrome · macOS", lastSeenAt: "2026-09-30T11:59:00Z", isCurrent: true },
        { deviceId: "c", deviceName: "Web browser", lastSeenAt: "2026-06-02T11:00:00Z" },
        { deviceId: "d", deviceName: "LioraLang · Windows", platform: "desktop", lastSeenAt: "2026-09-28T18:00:00Z" },
      ],
      NOW,
    );

    expect(groups.current.deviceId).toBe("b");
    expect(groups.active.map((device) => device.deviceId)).toEqual(["d", "a"]);
    expect(groups.inactive.map((device) => device.deviceId)).toEqual(["c"]);
  });
});
