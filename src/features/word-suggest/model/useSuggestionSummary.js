import { useI18n } from "@shared/lib/i18n";

// What a suggestion adds beyond the fields in sight: the details, which
// may be folded away. "noun · A2 · 2 examples".
export const useSuggestionSummary = (suggest) => {
  const { t, partOfSpeechName } = useI18n();
  const fills = suggest?.fills || {};
  const examples = fills.examplesInput ? fills.examplesInput.split("\n").filter(Boolean).length : 0;

  return [
    fills.part_of_speech ? partOfSpeechName(fills.part_of_speech) : "",
    fills.level || "",
    examples ? t("suggest.examples", { count: examples }) : "",
  ].filter(Boolean);
};
