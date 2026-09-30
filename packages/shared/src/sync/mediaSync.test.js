import { describe, expect, it, vi } from "vitest";
import { pullMissingMedia, pushDeckMedia } from "./mediaSync";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const words = [
  { source: "asparagus", image: { assetId: A, alt: "" } },
  { source: "bread", image: { assetId: B, alt: "" } },
  { source: "cheese", image: { assetId: A, alt: "again" } },
  { source: "house", image: null },
];

const createMediaRepository = (stored = {}) => ({
  getImage: vi.fn(async (assetId) => (stored[assetId] ? { blob: stored[assetId] } : null)),
  findMissing: vi.fn(async (ids) => ids.filter((id) => !stored[id])),
  storeRemoteImage: vi.fn(async (assetId, blob) => {
    stored[assetId] = blob;
  }),
});

describe("pushDeckMedia", () => {
  it("uploads each picture once and skips what the account already holds", async () => {
    const syncApi = { uploadMediaAsset: vi.fn(async () => ({})) };
    const mediaRepository = createMediaRepository({ [A]: "blob-a", [B]: "blob-b" });

    const uploaded = await pushDeckMedia({ syncApi, mediaRepository, deckWords: words, uploadedIds: [B] });

    expect(syncApi.uploadMediaAsset).toHaveBeenCalledTimes(1);
    expect(syncApi.uploadMediaAsset).toHaveBeenCalledWith({ assetId: A, blob: "blob-a" });
    expect([...uploaded].sort()).toEqual([A, B]);
  });

  it("does not claim a picture this device does not have", async () => {
    const syncApi = { uploadMediaAsset: vi.fn() };
    const uploaded = await pushDeckMedia({
      syncApi,
      mediaRepository: createMediaRepository({}),
      deckWords: words,
    });

    expect(syncApi.uploadMediaAsset).not.toHaveBeenCalled();
    expect(uploaded.size).toBe(0);
  });

  it("stops the push when an upload fails, so the package is not sent ahead of it", async () => {
    const syncApi = { uploadMediaAsset: vi.fn(async () => Promise.reject(new Error("offline"))) };

    await expect(
      pushDeckMedia({ syncApi, mediaRepository: createMediaRepository({ [A]: "x" }), deckWords: words }),
    ).rejects.toThrow("offline");
  });
});

describe("pullMissingMedia", () => {
  it("fetches only what is missing and keeps going past one that fails", async () => {
    const mediaRepository = createMediaRepository({ [A]: "have" });
    const syncApi = {
      downloadMediaAsset: vi.fn(async (assetId) => {
        if (assetId === B) {
          throw new Error("Object not found");
        }

        return `blob-${assetId[0]}`;
      }),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const fetched = await pullMissingMedia({ syncApi, mediaRepository, referencedIds: [A, B, C, C] });

    expect(syncApi.downloadMediaAsset).toHaveBeenCalledTimes(2);
    expect(fetched).toEqual([C]);
    expect(mediaRepository.storeRemoteImage).toHaveBeenCalledWith(C, "blob-c");
    warn.mockRestore();
  });

  it("stops when the device goes offline", async () => {
    const offline = new Error("Failed to fetch");
    const syncApi = { downloadMediaAsset: vi.fn(async () => Promise.reject(offline)) };

    await expect(
      pullMissingMedia({
        syncApi,
        mediaRepository: createMediaRepository({}),
        referencedIds: [A],
        isOfflineError: (error) => error === offline,
      }),
    ).rejects.toBe(offline);
  });

  it("respects the per-run limit", async () => {
    const syncApi = { downloadMediaAsset: vi.fn(async () => "blob") };
    const fetched = await pullMissingMedia({
      syncApi,
      mediaRepository: createMediaRepository({}),
      referencedIds: [A, B, C],
      limit: 2,
    });

    expect(fetched).toHaveLength(2);
  });
});
