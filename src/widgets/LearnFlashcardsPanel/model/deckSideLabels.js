import { getSubjectProfile } from "@shared/core/usecases/subjects";

// What each side of a deck is called on the desk: its language, or
// "Picture" for a side that holds pictures. Further languages join the
// answer side with a plus. A subject that names its sides (a question and
// its answer) uses those names.
export const resolveDeckSideLabels = (deck = {}, { t, languageName }) => {
  const { sideLabels } = getSubjectProfile(deck?.subject);

  if (sideLabels) {
    return { source: t(sideLabels.source), target: t(sideLabels.target) };
  }

  const clean = (value) => String(value || "").trim();
  const picture = t("learn.picture");
  const source = deck?.pictureSide === "source"
    ? picture
    : clean(deck?.sourceLanguage)
      ? languageName(clean(deck.sourceLanguage))
      : t("learn.sourceLanguage");
  const extraLanguages = [deck?.pictureSide === "target" ? "" : deck?.targetLanguage, deck?.tertiaryLanguage]
    .map(clean)
    .filter(Boolean)
    .map(languageName);
  const target = deck?.pictureSide === "target"
    ? [picture, ...extraLanguages].join(" + ")
    : extraLanguages.join(" + ") || t("learn.targetLanguage");

  return { source, target };
};
