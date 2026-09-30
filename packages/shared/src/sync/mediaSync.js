import { collectWordImageAssetIds } from "@shared/core/usecases/importExport";

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

// Sends the pictures a deck's words use that the account does not hold
// yet. Returns every id the account now holds.
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
