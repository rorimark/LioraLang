import { LANGUAGE_OPTIONS } from "@shared/config/languages";

// The landing's questions, answered in the page's language. The same list
// goes into the static page as FAQPage data for search engines
// (src/app/prerender/landingPrerender.jsx), so the two never differ.

// The AI assistant's free daily allowance: the server's own
// (word_suggestion_daily_allowance in supabase/migrations).
export const AI_DAILY_SUGGESTIONS = 300;

const FAQ_KEYS = ["subjects", "why", "free", "srs", "offline", "languages"];

export const buildFaqItems = ({ t, languageName }) => {
  const languages = LANGUAGE_OPTIONS.map((name) => languageName(name)).join(", ");

  return FAQ_KEYS.map((key) => ({
    key,
    question: t(`landing.faq.items.${key}.q`),
    answer: t(`landing.faq.items.${key}.a`, { count: AI_DAILY_SUGGESTIONS, languages }),
  }));
};
