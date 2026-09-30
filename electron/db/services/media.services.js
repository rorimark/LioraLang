import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { getDatabase } from "../db.js";
import {
  bytesToBase64,
  isMediaAssetId,
  MAX_MEDIA_ASSET_BYTES,
  normalizeWordImage,
  sniffImageMimeType,
} from "../../../packages/shared/src/core/usecases/cardContent/index.js";

// Pictures in the desktop database, beside the words that point at them.
// A picture is one row named by the SHA-256 of its bytes, so it is stored
// once however many words use it, and it travels with the database: backups
// and a moved database folder carry the pictures along.
//
// A picture nobody points at any more is removed a day after it was last
// touched, never sooner: one chosen in a form and not yet saved stays.

const UNUSED_GRACE_SQL = "-1 day";
const THUMB_MIME_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

const toBuffer = (value) => {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  return null;
};

const sha256Hex = (buffer) => createHash("sha256").update(buffer).digest("hex");

const checkBytes = (buffer) => {
  if (!buffer || buffer.length === 0 || buffer.length > MAX_MEDIA_ASSET_BYTES) {
    throw new Error("Picture is empty or too large");
  }

  const mimeType = sniffImageMimeType(buffer);

  if (!mimeType) {
    throw new Error("File is not a supported picture");
  }

  return mimeType;
};

const toDimension = (value) => Math.max(0, Math.round(Number(value) || 0));

// Stores bytes and returns the name they are stored under. The name is
// computed here, never taken from the caller.
export const storeMediaBytes = ({ bytes, width = 0, height = 0, thumb = null }) => {
  const buffer = toBuffer(bytes);
  const mimeType = checkBytes(buffer);
  const id = sha256Hex(buffer);
  const thumbBuffer = toBuffer(thumb?.bytes);
  const thumbMimeType = thumbBuffer && THUMB_MIME_TYPES.has(sniffImageMimeType(thumbBuffer))
    ? sniffImageMimeType(thumbBuffer)
    : "";

  getDatabase()
    .prepare(
      `
        INSERT INTO media_assets (id, mime_type, width, height, byte_size, data, thumb_mime_type, thumb_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          width = CASE WHEN excluded.width > 0 THEN excluded.width ELSE media_assets.width END,
          height = CASE WHEN excluded.height > 0 THEN excluded.height ELSE media_assets.height END,
          thumb_mime_type = COALESCE(excluded.thumb_mime_type, media_assets.thumb_mime_type),
          thumb_data = COALESCE(excluded.thumb_data, media_assets.thumb_data),
          touched_at = CURRENT_TIMESTAMP
      `,
    )
    .run(
      id,
      mimeType,
      toDimension(width),
      toDimension(height),
      buffer.length,
      buffer,
      thumbMimeType || null,
      thumbMimeType ? thumbBuffer : null,
    );

  return { id, mimeType };
};

export const saveImage = ({ full, thumb } = {}) => {
  const { id, mimeType } = storeMediaBytes({
    bytes: full?.bytes,
    width: full?.width,
    height: full?.height,
    thumb,
  });

  return { assetId: id, mimeType, width: toDimension(full?.width), height: toDimension(full?.height) };
};

export const getImage = (assetId, variant = "full") => {
  if (!isMediaAssetId(assetId)) {
    return null;
  }

  const row = getDatabase()
    .prepare(
      `
        SELECT mime_type AS mimeType, width, height, data, thumb_mime_type AS thumbMimeType, thumb_data AS thumbData
        FROM media_assets
        WHERE id = ?
      `,
    )
    .get(assetId);

  if (!row) {
    return null;
  }

  if (variant === "thumb") {
    return row.thumbData ? { bytes: row.thumbData, mimeType: row.thumbMimeType, width: 0, height: 0 } : null;
  }

  return { bytes: row.data, mimeType: row.mimeType, width: row.width, height: row.height };
};

export const saveThumbnail = (assetId, thumb) => {
  const buffer = toBuffer(thumb?.bytes);
  const mimeType = buffer ? sniffImageMimeType(buffer) : "";

  if (!isMediaAssetId(assetId) || !THUMB_MIME_TYPES.has(mimeType)) {
    return;
  }

  getDatabase()
    .prepare("UPDATE media_assets SET thumb_mime_type = ?, thumb_data = ? WHERE id = ?")
    .run(mimeType, buffer, assetId);
};

export const findExistingMediaIds = (assetIds = []) => {
  const ids = [...new Set(assetIds)].filter(isMediaAssetId);

  if (ids.length === 0) {
    return new Set();
  }

  const placeholders = ids.map(() => "?").join(", ");
  return new Set(
    getDatabase()
      .prepare(`SELECT id FROM media_assets WHERE id IN (${placeholders})`)
      .all(...ids)
      .map((row) => row.id),
  );
};

export const findMissingMedia = (assetIds = []) => {
  const existing = findExistingMediaIds(assetIds);
  return [...new Set(assetIds)].filter((id) => isMediaAssetId(id) && !existing.has(id));
};

// Bytes from another device: kept only if they are the picture they claim
// to be.
export const storeRemoteImage = (assetId, bytes) => {
  const buffer = toBuffer(bytes);

  if (!buffer || sha256Hex(buffer) !== assetId) {
    throw new Error("Downloaded picture does not match its name");
  }

  storeMediaBytes({ bytes: buffer });
};

// The pictures a deck's words use, as the package format carries them.
export const readMediaForExport = (assetIds = []) => {
  const ids = [...new Set(assetIds)].filter(isMediaAssetId);

  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  return getDatabase()
    .prepare(
      `SELECT id, mime_type AS mimeType, width, height, byte_size AS byteSize, data FROM media_assets WHERE id IN (${placeholders})`,
    )
    .all(...ids)
    .map((row) => ({
      id: row.id,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      byteSize: row.byteSize,
      data: bytesToBase64(new Uint8Array(row.data.buffer, row.data.byteOffset, row.data.byteLength)),
    }));
};

// Stores the pictures a package brought, and says under which names.
export const storeImportedMedia = (mediaEntries = []) => {
  const idMap = new Map();
  const available = new Set();

  mediaEntries.forEach((entry) => {
    try {
      const { id } = storeMediaBytes({ bytes: entry.bytes, width: entry.width, height: entry.height });
      idMap.set(entry.declaredId, id);
      available.add(id);
    } catch (error) {
      console.warn("[LioraLang] Skipped a picture from the package", error);
    }
  });

  return { idMap, available };
};

export const collectUnusedMedia = () => {
  const db = getDatabase();
  const referenced = new Set(
    db
      .prepare("SELECT image_json AS imageJson FROM words WHERE image_json IS NOT NULL")
      .all()
      .map((row) => normalizeWordImage(row.imageJson)?.assetId)
      .filter(Boolean),
  );
  const candidates = db
    .prepare(`SELECT id FROM media_assets WHERE touched_at < datetime('now', '${UNUSED_GRACE_SQL}')`)
    .all()
    .map((row) => row.id)
    .filter((id) => !referenced.has(id));

  if (candidates.length === 0) {
    return 0;
  }

  const remove = db.prepare("DELETE FROM media_assets WHERE id = ?");
  db.transaction(() => candidates.forEach((id) => remove.run(id)))();
  return candidates.length;
};

export const toImageJson = (image) => {
  const normalized = normalizeWordImage(image);
  return normalized ? JSON.stringify(normalized) : null;
};
