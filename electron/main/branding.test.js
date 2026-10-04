import { describe, expect, it, vi } from "vitest";
import { applyPublicBrand } from "./branding.js";

describe("desktop public branding", () => {
  it.each([
    "/Users/example/Library/Application Support/LioraLang",
    "C:\\Users\\example\\AppData\\Roaming\\LioraLang",
    "/Users/example/Library/Application Support/liora-lang",
    "/custom/existing-data",
  ])("keeps existing storage at %s when Electron changes its default", (existingPath) => {
    let userDataPath = existingPath;
    const app = {
      getPath: vi.fn(() => userDataPath),
      setName: vi.fn(() => { userDataPath = "/new-default/Liora"; }),
      setPath: vi.fn((key, value) => { if (key === "userData") userDataPath = value; }),
    };
    applyPublicBrand(app);
    expect(app.setName).toHaveBeenCalledWith("Liora");
    expect(app.setPath).toHaveBeenCalledWith("userData", existingPath);
    expect(userDataPath).toBe(existingPath);
  });
});
