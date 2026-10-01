import { useI18n } from "@shared/lib/i18n";

// What a suggestion adds beyond the fields in sight: the details, which
// may be folded away. "noun · A2 · 2 examples · travel".
// The tags a suggestion adds, without the ones the field already had.
const newTags = (before, after) => {
  if (!after) {
    return "";
  }

  const had = new Set(
    String(before || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  );
  return after
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag && !had.has(tag.toLowerCase()))
    .join(", ");
};

export const useSuggestionSummary = (suggest) => {
  const { t, partOfSpeechName } = useI18n();
  const fills = suggest?.fills || {};
  const examples = fills.examplesInput ? fills.examplesInput.split("\n").filter(Boolean).length : 0;

  return [
    fills.part_of_speech ? partOfSpeechName(fills.part_of_speech) : "",
    fills.level || "",
    examples ? t("suggest.examples", { count: examples }) : "",
    newTags(suggest?.tagsBefore, fills.tagsInput),
  ].filter(Boolean);
};
