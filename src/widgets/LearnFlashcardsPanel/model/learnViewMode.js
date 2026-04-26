export const LEARN_VIEW_MODE_SRS = "srs";
export const LEARN_VIEW_MODE_BROWSE = "browse";

export const LEARN_DEFAULT_STUDY_MODE_SRS = "srs";
export const LEARN_DEFAULT_STUDY_MODE_REVIEW = "review";

export const resolvePreferredLearnViewMode = (defaultStudyMode = "") => {
  return defaultStudyMode === LEARN_DEFAULT_STUDY_MODE_SRS
    ? LEARN_VIEW_MODE_SRS
    : LEARN_VIEW_MODE_BROWSE;
};

export const resolveLoopedBrowseIndex = ({
  currentIndex = 0,
  total = 0,
  direction = 1,
} = {}) => {
  const totalCards = Math.max(0, Number(total) || 0);

  if (totalCards === 0) {
    return -1;
  }

  const normalizedIndex = Number.isInteger(currentIndex)
    ? Math.min(Math.max(currentIndex, 0), totalCards - 1)
    : 0;
  const step = direction < 0 ? -1 : 1;

  return (normalizedIndex + step + totalCards) % totalCards;
};
