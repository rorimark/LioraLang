import { buildRatingPreview, normalizeReviewCard, DEFAULT_SRS_SETTINGS, DEFAULT_STUDY_SETTINGS } from "@shared/core/usecases/srs";

export const LANDING_NEW_CARD_PREVIEW = buildRatingPreview({
  card: normalizeReviewCard({}),
  srsSettings: DEFAULT_SRS_SETTINGS,
  studySettings: DEFAULT_STUDY_SETTINGS,
  nowMs: 0,
});
