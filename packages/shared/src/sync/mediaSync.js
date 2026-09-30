import { collectWordImageAssetIds } from "@shared/core/usecases/importExport";
import { isMediaAssetId } from "@shared/core/usecases/cardContent";

// Pictures in account sync. A deck package carries only which picture each
// word uses; the bytes are objects of their own in the account's storage,
// named by their SHA-256. That keeps a deck edit from re-sending every
// picture, lets one picture serve many decks, and means two devices adding
// the same picture never conflict: the name is the content.
//
// A deck's conflicts are settled as before, on the deck. A picture cannot
// conflict, and replacing or removing one is an edit of the word, which
// syncs with the deck.

// Pictures fetched per sync run; the rest follow on the next runs, so a
// large library on a new device never holds one run for minutes.
export const MEDIA_DOWNLOADS_PER_RUN = 150;

// A picture the account holds but nothing uses is removed only after this
// long: an upload always goes ahead of the package that points at it, and
// another device may still be on its way to sending that package.
export const MEDIA_CLEANUP_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

// Sends the pictures a deck's words use that the account does not hold
// (`uploadedIds`: what the account's storage lists now). Returns every id
// the account holds afterwards.
export const pushDeckMedia = async ({ syncApi, mediaRepository, deckWords, uploadedIds = [] }) => {
  const uploaded = new Set(uploadedIds);

  if (!mediaRepository) {
    return uploaded;
  }

  for (const assetId of collectWordImageAssetIds(deckWords)) {
    if (uploaded.has(assetId)) {
      continue;
    }

    const image = await mediaRepository.getImage(assetId, "full");

    // A picture this device never received cannot be sent from here; the
    // device that has it sends it.
    if (!image?.blob) {
      continue;
    }

    await syncApi.uploadMediaAsset({ assetId, blob: image.blob });
    uploaded.add(assetId);
  }

  return uploaded;
};

// Fetches the pictures local words point at and this device lacks. One
// that fails stays missing, its word shows without it, and the next run
// tries again; being offline stops the run like any other sync step.
export const pullMissingMedia = async ({
  syncApi,
  mediaRepository,
  referencedIds = [],
  isOfflineError = () => false,
  limit = MEDIA_DOWNLOADS_PER_RUN,
}) => {
  if (!mediaRepository || referencedIds.length === 0) {
    return [];
  }

  const missing = (await mediaRepository.findMissing([...new Set(referencedIds)])).slice(0, limit);
  const fetched = [];

  for (const assetId of missing) {
    try {
      const blob = await syncApi.downloadMediaAsset(assetId);
      await mediaRepository.storeRemoteImage(assetId, blob);
      fetched.push(assetId);
    } catch (error) {
      if (isOfflineError(error)) {
        throw error;
      }

      console.warn(`[LioraLang] Picture ${assetId} is not available yet`, error);
    }
  }

  return fetched;
};

// Removes the account's pictures that nothing uses: no local deck, and no
// deck the account holds (its latest package). Only pictures older than the
// grace period are candidates, and the account's packages are read only
// when there is a candidate. Returns the ids removed.
export const cleanUpRemoteMedia = async ({
  syncApi,
  remoteMedia = [],
  localReferencedIds = [],
  loadRemoteReferencedIds,
  nowMs = Date.now(),
  graceMs = MEDIA_CLEANUP_GRACE_MS,
}) => {
  const localReferenced = new Set(localReferencedIds);
  const candidates = remoteMedia
    .filter((item) => isMediaAssetId(item?.id) && !localReferenced.has(item.id))
    .filter((item) => {
      const storedAtMs = Date.parse(item?.createdAt || "");
      return Number.isFinite(storedAtMs) && nowMs - storedAtMs >= graceMs;
    })
    .map((item) => item.id);

  if (candidates.length === 0) {
    return [];
  }

  const remoteReferenced = new Set(await loadRemoteReferencedIds());
  const unused = candidates.filter((assetId) => !remoteReferenced.has(assetId));

  if (unused.length > 0) {
    await syncApi.deleteMediaAssets(unused);
  }

  return unused;
};
