import {
  APP_NAME,
  escapeHtml,
  normalizeTextArray,
  resolveDeckShareContext,
  toCleanString,
} from "./_deckShareMeta.js";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_TAGS = 4;

const truncateText = (value, maxLength) => {
  const normalizedValue = toCleanString(value);

  if (!normalizedValue || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1).trimEnd()}…`;
};

const buildTagBadges = (tags) =>
  tags
    .slice(0, MAX_TAGS)
    .map((tag, index) => {
      const x = 88 + index * 178;

      return `
        <rect x="${x}" y="386" width="154" height="44" rx="22" fill="#252525" stroke="#313131" />
        <text x="${x + 77}" y="414" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="600" fill="#d3d0cb">${escapeHtml(truncateText(tag, 14))}</text>
      `;
    })
    .join("");

const buildImageSvg = ({
  deckTitle,
  pageDescription,
  deck,
}) => {
  const safeTitle = escapeHtml(truncateText(deckTitle, 44));
  const safeDescription = escapeHtml(truncateText(pageDescription, 120));
  const wordsCount = Number.isFinite(Number(deck?.words_count)) ? Number(deck.words_count) : 0;
  const sourceLanguage = toCleanString(deck?.source_language);
  const targetLanguages = normalizeTextArray(deck?.target_languages);
  const tags = normalizeTextArray(deck?.tags);
  const languageLine =
    sourceLanguage && targetLanguages.length > 0
      ? `${sourceLanguage} → ${targetLanguages.join(", ")}`
      : sourceLanguage || targetLanguages.join(", ");
  const safeLanguageLine = escapeHtml(truncateText(languageLine, 36));
  const safeStats = escapeHtml(
    wordsCount > 0 ? `${wordsCount} words` : "Community deck",
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#141414"/>
  <rect x="44" y="44" width="1112" height="542" rx="28" fill="#1f1f1f" stroke="#2d2d2d" stroke-width="2"/>
  <rect x="88" y="88" width="74" height="74" rx="22" fill="#7d99f3"/>
  <text x="125" y="135" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="32" font-weight="800" fill="#f7f5f2">LL</text>

  <rect x="916" y="88" width="196" height="56" rx="28" fill="#191919" stroke="#303030"/>
  <text x="1014" y="123" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24" font-weight="600" fill="#d3d0cb">${safeStats}</text>

  <text x="88" y="220" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="58" font-weight="800" fill="#f4f2ee">${safeTitle}</text>
  <text x="88" y="272" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="28" font-weight="600" fill="#9fa8bc">${safeLanguageLine}</text>
  <text x="88" y="330" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="29" font-weight="500" fill="#b5b0a8">${safeDescription}</text>

  ${buildTagBadges(tags)}

  <rect x="88" y="474" width="1024" height="68" rx="22" fill="#171717" stroke="#2b2b2b"/>
  <text x="124" y="517" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="26" font-weight="600" fill="#ece8e1">${APP_NAME}</text>
  <text x="1112" y="517" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24" font-weight="500" fill="#8f8b84">Shared community deck</text>
</svg>`;
};

export default async function handler(request, response) {
  const { deckTitle, pageDescription, deck } = await resolveDeckShareContext(request);
  const svg = buildImageSvg({
    deckTitle,
    pageDescription,
    deck,
  });

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  response.status(200).send(svg);
}
