import { describe, expect, it } from "vitest";
import { describeDevice } from "./describeDevice";

const UA = {
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
  electronWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LioraLang/1.0 Chrome/128.0 Electron/32.0 Safari/537.36",
};

describe("describeDevice", () => {
  it("names the browser and the system", () => {
    expect(describeDevice({ userAgent: UA.chromeMac })).toBe("Chrome · macOS");
    expect(describeDevice({ userAgent: UA.safariIphone })).toBe("Safari · iPhone");
    expect(describeDevice({ userAgent: UA.edgeWin })).toBe("Edge · Windows");
    expect(describeDevice({ userAgent: UA.firefoxLinux })).toBe("Firefox · Linux");
    expect(describeDevice({ userAgent: UA.chromeAndroid })).toBe("Chrome · Android");
  });

  it("recognises an iPad that asks for desktop sites", () => {
    expect(describeDevice({ userAgent: UA.ipadDesktop, maxTouchPoints: 5 })).toBe("Safari · iPad");
    expect(describeDevice({ userAgent: UA.ipadDesktop, maxTouchPoints: 0 })).toBe("Safari · macOS");
  });

  it("names the desktop app by the app, not its engine", () => {
    expect(describeDevice({ userAgent: UA.electronWin, isDesktopApp: true })).toBe("LioraLang · Windows");
  });

  it("returns nothing it cannot recognise", () => {
    expect(describeDevice({ userAgent: "" })).toBe("");
  });
});
