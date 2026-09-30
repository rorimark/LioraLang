import {
  bytesToBase64,
  isMediaAssetId,
  MAX_MEDIA_ASSET_BYTES,
  normalizeWordImage,
  sha256Hex,
  sniffImageMimeType,
} from "@shared/core/usecases/cardContent";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
} from "../db";

// Pictures in the browser's database. A picture is stored once under the
// SHA-256 of its bytes and words point at it, so the same picture in two
// decks, or arriving twice from sync, is one record.
//
// A picture nobody points at any more is removed a day after it was last
// touched: long enough that one chosen in a form and not yet saved, or one
// just downloaded for a deck being written, is never swept away.

const UNUSED_GRACE_MS = 24 * 60 * 60 * 1000;
const subscribers = new Set();

export const notifyMediaUpdated = () => {
  subscribers.forEach((listener) => listener());
};

export const subscribeMediaUpdated = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const toBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

// Bytes are kept as an ArrayBuffer rather than a Blob: every browser stores
// one reliably, and older Safari did not always do so for Blobs.
const toStoredBuffer = (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const toBlob = (buffer, mimeType) => new Blob([new Uint8Array(buffer)], { type: mimeType });

const checkBytes = (bytes) => {
  if (!bytes || bytes.length === 0 || bytes.length > MAX_MEDIA_ASSET_BYTES) {
    throw new Error("Picture is empty or too large");
  }

  const mimeType = sniffImageMimeType(bytes);

  if (!mimeType) {
    throw new Error("File is not a supported picture");
  }

  return mimeType;
};

const putRecord = async (record) => {
  await runReadwriteTransaction(WEB_DB_STORES.mediaAssets, async ({ getStore }) => {
    const store = getStore(WEB_DB_STORES.mediaAssets);
    const existing = await idbRequest(store.get(record.id));

    store.put({
      ...existing,
      ...record,
      thumbBytes: record.thumbBytes || existing?.thumbBytes || null,
      thumbMimeType: record.thumbMimeType || existing?.thumbMimeType || "",
      touchedAtMs: Date.now(),
    });
  });
};

// Stores bytes and returns the name they are stored under.
export const storeMediaBytes = async ({ bytes, width = 0, height = 0, thumb = null }) => {
  const mimeType = checkBytes(bytes);
  const id = await sha256Hex(bytes);

  await putRecord({
    id,
    mimeType,
    width: Math.round(Number(width) || 0),
    height: Math.round(Number(height) || 0),
    byteSize: bytes.length,
    bytes: toStoredBuffer(bytes),
    thumbBytes: thumb?.blob ? toStoredBuffer(await toBytes(thumb.blob)) : null,
    thumbMimeType: thumb?.blob ? thumb.mimeType || thumb.blob.type || "" : "",
  });

  return { id, mimeType };
};

const getRecord = (assetId) =>
  runReadonlyTransaction(WEB_DB_STORES.mediaAssets, async ({ getStore }) =>
    idbRequest(getStore(WEB_DB_STORES.mediaAssets).get(assetId)),
  );

// The pictures a deck's words use, as the package format carries them.
export const readMediaForExport = async (assetIds) => {
  const media = [];

  for (const assetId of assetIds) {
    const record = await getRecord(assetId);

    if (record?.bytes) {
      const bytes = new Uint8Array(record.bytes);
      media.push({
        id: record.id,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        byteSize: bytes.length,
        data: bytesToBase64(bytes),
      });
    }
  }

  return media;
};

// Stores the pictures a package brought, and says under which names.
export const storeImportedMedia = async (mediaEntries = []) => {
  const idMap = new Map();
  const available = new Set();

  for (const entry of mediaEntries) {
    try {
      const { id } = await storeMediaBytes({ bytes: entry.bytes, width: entry.width, height: entry.height });
      idMap.set(entry.declaredId, id);
      available.add(id);
    } catch (error) {
      console.warn("[LioraLang] Skipped a picture from the package", error);
    }
  }

  if (available.size > 0) {
    notifyMediaUpdated();
  }

  return { idMap, available };
};

export const findExistingMediaIds = async (assetIds) => {
  const ids = [...new Set(assetIds)].filter(isMediaAssetId);

  return runReadonlyTransaction(WEB_DB_STORES.mediaAssets, async ({ getStore }) => {
    const store = getStore(WEB_DB_STORES.mediaAssets);
    const keys = await Promise.all(ids.map((id) => idbRequest(store.getKey(id))));
    return new Set(keys.filter(Boolean));
  });
};

export const collectUnusedMedia = async () => {
  const cutoffMs = Date.now() - UNUSED_GRACE_MS;

  await runReadwriteTransaction([WEB_DB_STORES.words, WEB_DB_STORES.mediaAssets], async ({ getStore }) => {
    const [words, assets] = await Promise.all([
      idbRequest(getStore(WEB_DB_STORES.words).getAll()),
      idbRequest(getStore(WEB_DB_STORES.mediaAssets).getAll()),
    ]);
    const referenced = new Set(words.map((word) => normalizeWordImage(word?.image)?.assetId).filter(Boolean));
    const mediaStore = getStore(WEB_DB_STORES.mediaAssets);

    assets.forEach((asset) => {
      if (!referenced.has(asset.id) && Number(asset.touchedAtMs || 0) < cutoffMs) {
        mediaStore.delete(asset.id);
      }
    });
  });
};

export const createWebMediaRepository = () => ({
  async saveImage({ full, thumb } = {}) {
    if (!full?.blob) {
      throw new Error("No picture to save");
    }

    const bytes = await toBytes(full.blob);
    const { id, mimeType } = await storeMediaBytes({
      bytes,
      width: full.width,
      height: full.height,
      thumb,
    });

    return { assetId: id, mimeType, width: full.width, height: full.height };
  },

  async getImage(assetId, variant = "full") {
    if (!isMediaAssetId(assetId)) {
      return null;
    }

    const record = await getRecord(assetId);

    if (!record) {
      return null;
    }

    if (variant === "thumb") {
      return record.thumbBytes
        ? { blob: toBlob(record.thumbBytes, record.thumbMimeType), mimeType: record.thumbMimeType, width: 0, height: 0 }
        : null;
    }

    return record.bytes
      ? { blob: toBlob(record.bytes, record.mimeType), mimeType: record.mimeType, width: record.width, height: record.height }
      : null;
  },

  async saveThumbnail(assetId, thumb) {
    if (!isMediaAssetId(assetId) || !thumb?.blob) {
      return;
    }

    const thumbBytes = toStoredBuffer(await toBytes(thumb.blob));

    await runReadwriteTransaction(WEB_DB_STORES.mediaAssets, async ({ getStore }) => {
      const store = getStore(WEB_DB_STORES.mediaAssets);
      const record = await idbRequest(store.get(assetId));

      if (record) {
        store.put({ ...record, thumbBytes, thumbMimeType: thumb.mimeType || thumb.blob.type || "" });
      }
    });
  },

  async findMissing(assetIds = []) {
    const existing = await findExistingMediaIds(assetIds);
    return [...new Set(assetIds)].filter((id) => isMediaAssetId(id) && !existing.has(id));
  },

  // Bytes from another device: kept only if they are the picture they
  // claim to be.
  async storeRemoteImage(assetId, blob) {
    const bytes = await toBytes(blob);
    const hash = await sha256Hex(bytes);

    if (hash !== assetId) {
      throw new Error("Downloaded picture does not match its name");
    }

    await storeMediaBytes({ bytes });
    notifyMediaUpdated();
  },

  subscribeMediaUpdated,
});
