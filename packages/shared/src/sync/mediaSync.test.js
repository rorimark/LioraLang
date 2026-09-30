import { describe, expect, it, vi } from "vitest";
import { cleanUpRemoteMedia, pullMissingMedia, pushDeckMedia } from "./mediaSync";

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

describe("cleanUpRemoteMedia", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-10-01T00:00:00Z");
  const storedDaysAgo = (days) => new Date(now - days * DAY).toISOString();

  it("removes only old pictures that no local deck and no account deck uses", async () => {
    const D = "d".repeat(64);
    const syncApi = { deleteMediaAssets: vi.fn(async () => {}) };
    const loadRemoteReferencedIds = vi.fn(async () => [B]);

    const removed = await cleanUpRemoteMedia({
      syncApi,
      remoteMedia: [
        { id: A, createdAt: storedDaysAgo(30) }, // used by a local deck
        { id: B, createdAt: storedDaysAgo(30) }, // used by a deck in the account
        { id: C, createdAt: storedDaysAgo(30) }, // used by nothing
        { id: D, createdAt: storedDaysAgo(2) }, // used by nothing, but too new
        { id: "notes.txt", createdAt: storedDaysAgo(30) },
      ],
      localReferencedIds: [A],
      loadRemoteReferencedIds,
      nowMs: now,
    });

    expect(removed).toEqual([C]);
    expect(syncApi.deleteMediaAssets).toHaveBeenCalledWith([C]);
  });

  it("does not read the account's decks when there is nothing to remove", async () => {
    const loadRemoteReferencedIds = vi.fn();
    const syncApi = { deleteMediaAssets: vi.fn() };

    await cleanUpRemoteMedia({
      syncApi,
      remoteMedia: [{ id: A, createdAt: storedDaysAgo(30) }],
      localReferencedIds: [A],
      loadRemoteReferencedIds,
      nowMs: now,
    });

    expect(loadRemoteReferencedIds).not.toHaveBeenCalled();
    expect(syncApi.deleteMediaAssets).not.toHaveBeenCalled();
  });

  it("keeps everything when the account's decks cannot be read", async () => {
    const syncApi = { deleteMediaAssets: vi.fn() };

    await expect(
      cleanUpRemoteMedia({
        syncApi,
        remoteMedia: [{ id: C, createdAt: storedDaysAgo(30) }],
        loadRemoteReferencedIds: async () => Promise.reject(new Error("offline")),
        nowMs: now,
      }),
    ).rejects.toThrow("offline");
    expect(syncApi.deleteMediaAssets).not.toHaveBeenCalled();
  });
});
