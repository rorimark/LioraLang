import { beforeEach, describe, expect, it, vi } from "vitest";

const setUserAgent = (value) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value,
    configurable: true,
  });
};

const createDesktopBridge = () => {
  const onImportDeckFileRequested = vi.fn();
  const importDeckFromJson = vi.fn();

  return {
    pickImportDeckJson: vi.fn(),
    importDeckFromJson,
    importDeckFromUrl: vi.fn(),
    exportDeckPackage: vi.fn(),
    exportDeckToJson: vi.fn(),
    onImportDeckFileRequested,
  };
};

const importDesktopApi = async () => {
  const module = await import("./desktopApi.js");
  return module.desktopApi;
};

describe("desktopApi", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete window.electronAPI;
    setUserAgent("Mozilla/5.0");
  });

  it("falls back to JSON deck loading outside Electron", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 10,
            source: "guidebook",
            target: "przewodnik",
            examples: ["Pack a guidebook"],
          },
        ],
      }),
    );

    const desktopApi = await importDesktopApi();
    const words = await desktopApi.getDeckWords("local-json");

    expect(words).toEqual([
      {
        id: 10,
        externalId: "",
        source: "guidebook",
        target: "przewodnik",
        tertiary: "",
        level: "A1",
        part_of_speech: "other",
        tags: [],
        examples: ["Pack a guidebook"],
      },
    ]);
  });

  it("forwards JSON import payloads to the Electron bridge", async () => {
    const electronAPI = createDesktopBridge();
    electronAPI.importDeckFromJson.mockResolvedValue({ importedCount: 5 });
    window.electronAPI = electronAPI;

    const desktopApi = await importDesktopApi();
    await desktopApi.importDeckFromJson("Imported deck");
    await desktopApi.importDeckFromJson({ deckName: "Parsed deck", fileText: "{}" });

    expect(electronAPI.importDeckFromJson).toHaveBeenNthCalledWith(1, {
      deckName: "Imported deck",
    });
    expect(electronAPI.importDeckFromJson).toHaveBeenNthCalledWith(2, {
      deckName: "Parsed deck",
      fileText: "{}",
    });
  });

  it("queues pending import-file requests until the UI consumes them", async () => {
    let importListener = null;
    const electronAPI = {
      ...createDesktopBridge(),
      onImportDeckFileRequested: vi.fn((callback) => {
        importListener = callback;
      }),
    };
    window.electronAPI = electronAPI;

    const desktopApi = await importDesktopApi();

    expect(desktopApi.hasPendingImportDeckFileRequest()).toBe(false);

    importListener?.({ filePath: "/tmp/deck.lioradeck" });

    expect(desktopApi.hasPendingImportDeckFileRequest()).toBe(true);
    expect(desktopApi.consumePendingImportDeckFileRequest()).toEqual({
      filePath: "/tmp/deck.lioradeck",
    });

    desktopApi.acknowledgeImportDeckFileRequest("/tmp/deck.lioradeck");
    expect(desktopApi.hasPendingImportDeckFileRequest()).toBe(false);
  });

  it("throws a desktop-specific error if Electron is present but the preload bridge is missing", async () => {
    setUserAgent("Mozilla/5.0 Electron/40.6.1");

    const desktopApi = await importDesktopApi();

    await expect(desktopApi.verifyIntegrity()).rejects.toThrow(
      "Desktop API is unavailable in this window. Restart the app.",
    );
  });
});
