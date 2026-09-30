import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import {
  createWebDeckRepository,
  createWebMediaRepository,
  createWebSettingsRepository,
  createWebSyncLocalRepository,
} from "@shared/platform/web/model";
import { createSyncRepository } from "./createSyncRepository";

// Two devices on one account, one after the other, against an in-memory
// account: the real web repositories and IndexedDB on each side.

const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (char) => char.charCodeAt(0),
);
const PNG_ID = createHash("sha256").update(PNG).digest("hex");
const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const resetDevice = async () => {
  await closeWebDbConnection();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("lioralang-web");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
};

const createAccount = () => {
  const decks = new Map();
  const files = new Map();
  const media = new Map();

  const syncApi = {
    isConfigured: () => true,
    registerDevice: async () => ({}),
    listProgressEvents: async () => [],
    pushProgressEvents: async () => [],
    listLibraryDecks: async () => [...decks.values()].map((deck) => ({ ...deck })),
    async upsertLibraryDeck({ deck, packageObject }) {
      const current = decks.get(deck.syncId);
      const version = (current?.latestVersion || 0) + 1;
      const filePath = `${USER_ID}/${deck.syncId}/v${version}.lioradeck`;
      files.set(filePath, JSON.stringify(packageObject));
      decks.set(deck.syncId, {
        syncId: deck.syncId,
        deckKind: "account",
        hubDeckId: "",
        title: deck.name,
        contentHash: deck.contentHash,
        latestVersion: version,
        deletedAt: "",
        updatedAt: new Date().toISOString(),
        latestPackage: { filePath },
      });
      return { syncId: deck.syncId, version, filePath };
    },
    markLibraryDeckDeleted: async () => {},
    createLibraryDeckDownloadUrl: async (filePath) => `https://account.test/${filePath}`,
    listMediaAssets: async () => [...media.entries()].map(([id, item]) => ({ id, createdAt: item.createdAt })),
    uploadMediaAsset: vi.fn(async ({ assetId, blob }) => {
      media.set(assetId, { bytes: new Uint8Array(await blob.arrayBuffer()), createdAt: new Date().toISOString() });
      return {};
    }),
    downloadMediaAsset: async (assetId) => new Blob([media.get(assetId).bytes]),
    deleteMediaAssets: vi.fn(async (ids) => ids.forEach((id) => media.delete(id))),
  };

  const fetchPackage = async (url) => {
    const filePath = String(url).replace("https://account.test/", "");
    return new Response(files.get(filePath), { status: files.has(filePath) ? 200 : 404 });
  };

  return { syncApi, media, fetchPackage };
};

const createDevice = (account) => {
  const deckRepository = createWebDeckRepository();
  const mediaRepository = createWebMediaRepository();
  const syncLocalRepository = createWebSyncLocalRepository();
  const syncRepository = createSyncRepository({
    syncApi: account.syncApi,
    authRepository: {
      getSnapshot: async () => ({ isAuthenticated: true, user: { id: USER_ID } }),
      subscribe: () => () => {},
    },
    deckRepository,
    mediaRepository,
    settingsRepository: createWebSettingsRepository(),
    syncLocalRepository,
    platform: "web",
  });

  return { deckRepository, mediaRepository, syncLocalRepository, syncRepository };
};

describe("pictures across devices", () => {
  let account;

  beforeEach(async () => {
    await resetDevice();
    account = createAccount();
    vi.stubGlobal("fetch", vi.fn(account.fetchPackage));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await resetDevice();
  });

  it("sends a picture once, brings it to a new device, and clears it from the account once nothing uses it", async () => {
    // Device A adds a word with a picture and syncs.
    const deviceA = createDevice(account);
    await deviceA.mediaRepository.saveImage({ full: { blob: new Blob([PNG], { type: "image/png" }) } });
    await deviceA.deckRepository.saveDeck({
      name: "Food",
      targetLanguage: "Polish",
      pictureSide: "source",
      words: [{ source: "", target: "szparag", image: { assetId: PNG_ID, alt: "Green stalks" } }],
    });
    await deviceA.syncRepository.runNow();
    const statusA = await deviceA.syncRepository.getStatus();

    expect(statusA.lastErrorMessage).toBe("");
    expect(account.media.has(PNG_ID)).toBe(true);
    expect(account.syncApi.uploadMediaAsset).toHaveBeenCalledTimes(1);

    // A second run sends nothing again.
    await deviceA.syncRepository.runNow();
    expect(account.syncApi.uploadMediaAsset).toHaveBeenCalledTimes(1);

    // Device B starts empty and receives the deck and its picture.
    await resetDevice();
    const deviceB = createDevice(account);
    await deviceB.syncRepository.runNow();
    const statusB = await deviceB.syncRepository.getStatus();
    const [deck] = await deviceB.deckRepository.listDecks();
    const [word] = await deviceB.deckRepository.getDeckWords(deck.id);

    expect(statusB.lastErrorMessage).toBe("");
    expect(deck.pictureSide).toBe("source");
    expect(word.image).toEqual({ assetId: PNG_ID, alt: "Green stalks" });
    expect(await deviceB.mediaRepository.getImage(PNG_ID)).not.toBeNull();

    // Device B removes the word. A week later the daily
    // cleanup finds nothing using it and removes it from the account.
    await deviceB.deckRepository.saveDeck({
      deckId: deck.id,
      name: "Food",
      targetLanguage: "Polish",
      words: [],
    });
    await deviceB.syncRepository.runNow();
    expect(account.media.has(PNG_ID)).toBe(true);

    account.media.get(PNG_ID).createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await deviceB.syncLocalRepository.setProfileState(`user:${USER_ID}`, {
      lastMediaCleanupAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await deviceB.syncRepository.runNow();

    expect(account.syncApi.deleteMediaAssets).toHaveBeenCalledWith([PNG_ID]);
    expect(account.media.has(PNG_ID)).toBe(false);
  });
});
