import { useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { makeThumbnail } from "./prepareImage.js";

// A stored picture as a URL an <img> can show. Pictures live in the local
// database, never behind a web address, so they show offline. Each URL is
// shared by everything showing the same picture and released a little after
// the last one stops, so flipping between cards does not reload it.

const RELEASE_DELAY_MS = 30_000;
const entries = new Map();

const entryKey = (assetId, variant) => `${assetId}:${variant}`;

const scheduleRelease = (key) => {
  const entry = entries.get(key);

  if (!entry || entry.refs > 0) {
    return;
  }

  clearTimeout(entry.releaseTimer);
  entry.releaseTimer = setTimeout(() => {
    const current = entries.get(key);

    if (current && current.refs === 0) {
      if (current.url) {
        URL.revokeObjectURL(current.url);
      }

      entries.delete(key);
    }
  }, RELEASE_DELAY_MS);
};

// A picture that came from a file or another device has no small copy yet;
// the full one stands in, and the small one is made once, quietly.
const backfillThumbnail = async (mediaRepository, assetId, fullBlob) => {
  try {
    const thumb = await makeThumbnail(fullBlob);
    await mediaRepository.saveThumbnail?.(assetId, thumb);
  } catch {
    // The full picture keeps standing in.
  }
};

const loadEntry = (mediaRepository, assetId, variant) => {
  const key = entryKey(assetId, variant);
  const existing = entries.get(key);

  if (existing) {
    return existing;
  }

  const entry = { refs: 0, url: "", releaseTimer: null, promise: null };
  entry.promise = (async () => {
    let image = await mediaRepository.getImage(assetId, variant);

    if (!image && variant === "thumb") {
      image = await mediaRepository.getImage(assetId, "full");

      if (image?.blob) {
        void backfillThumbnail(mediaRepository, assetId, image.blob);
      }
    }

    if (!image?.blob) {
      entries.delete(key);
      return "";
    }

    entry.url = URL.createObjectURL(image.blob);
    return entry.url;
  })().catch(() => {
    entries.delete(key);
    return "";
  });
  entries.set(key, entry);
  return entry;
};

export const useMediaImageUrl = (assetId, variant = "full") => {
  const mediaRepository = usePlatformService("mediaRepository");
  const [state, setState] = useState({ key: "", url: "", status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const key = assetId ? entryKey(assetId, variant) : "";

  // A picture still on its way from another device appears when it lands.
  useEffect(() => {
    if (!assetId || !mediaRepository?.subscribeMediaUpdated) {
      return undefined;
    }

    return mediaRepository.subscribeMediaUpdated(() => setAttempt((value) => value + 1));
  }, [assetId, mediaRepository]);

  useEffect(() => {
    if (!key || !mediaRepository) {
      return undefined;
    }

    let isCurrent = true;
    const entry = loadEntry(mediaRepository, assetId, variant);
    entry.refs += 1;
    clearTimeout(entry.releaseTimer);

    entry.promise.then((url) => {
      if (isCurrent) {
        setState({ key, url, status: url ? "ready" : "missing" });
      }
    });

    return () => {
      isCurrent = false;
      entry.refs -= 1;
      scheduleRelease(key);
    };
  }, [assetId, attempt, key, mediaRepository, variant]);

  if (!key) {
    return { url: "", status: "idle" };
  }

  return state.key === key ? state : { url: "", status: "loading" };
};
