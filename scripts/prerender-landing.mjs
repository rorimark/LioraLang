// Writes the landing as static HTML, one page per language, after the web
// build: / for English, /ru/index.html, /de/index.html… Each page carries
// its own title, description, canonical address, hreflang links to every
// other language, social cards and structured data, and the landing
// itself, rendered by React (src/app/prerender/landingPrerender.jsx).
//
// The app's own shell is kept as app.html, the page every other address
// is served (vercel.json). In the browser the live landing replaces the
// static copy in the same frame (replacePrerenderedLanding).
//
// Also writes robots.txt and sitemap.xml.
//
// Usage: node scripts/prerender-landing.mjs   (after vite build and the
// SSR build of landingPrerender.jsx into dist-ssr; see build:web)

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SSR_DIST = path.join(ROOT, "dist-ssr");

// The site's address. One place to change when the site moves to its own
// domain; SITE_URL in the build environment wins.
const SITE_URL = (process.env.SITE_URL || "https://liora-lang.vercel.app").replace(/\/+$/, "");

const LANDING_CHUNK = "src/pages/landing/ui/LandingPage.jsx";
const AUTHOR = { name: "Mark Storchovyi", url: "https://mark-storchovyi.com" };

const OG_LOCALES = {
  en: "en_US",
  uk: "uk_UA",
  ru: "ru_RU",
  pl: "pl_PL",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  it: "it_IT",
  pt: "pt_BR",
  tr: "tr_TR",
  cs: "cs_CZ",
  ja: "ja_JP",
};

const pagePath = (locale) => (locale === "en" ? "/" : `/${locale}`);
const pageUrl = (locale) => (locale === "en" ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// JSON inside <script>: nothing in it may close the tag.
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

// The landing's stylesheets and scripts, from Vite's manifest: the lazy
// landing chunk and everything it imports, so the static page is styled
// and the live one loads without a second round trip.
const collectLandingAssets = (manifest) => {
  const css = new Set();
  const scripts = new Set();
  const seen = new Set();

  const visit = (key) => {
    const chunk = manifest[key];

    if (!chunk || seen.has(key)) {
      return;
    }

    seen.add(key);
    scripts.add(`/${chunk.file}`);
    (chunk.css || []).forEach((file) => css.add(`/${file}`));
    (chunk.imports || []).forEach(visit);
  };

  if (!manifest[LANDING_CHUNK]) {
    throw new Error(`The landing chunk ${LANDING_CHUNK} is missing from the build manifest`);
  }

  visit(LANDING_CHUNK);
  // The entry's own files are already in the template.
  const entry = manifest["index.html"];
  (entry?.css || []).forEach((file) => css.delete(`/${file}`));
  scripts.delete(`/${entry?.file}`);

  return { css: [...css], scripts: [...scripts] };
};

// Before the first paint: the theme the app last showed (or the system's),
// and, on / only, the visitor's own language if it is not English. Search
// engines ask in English and have no stored choice, so they stay on /.
const buildBootScript = (locale, locales) => {
  const redirect =
    locale === "en"
      ? `var supported=${JSON.stringify(locales)};var choice="auto";try{choice=localStorage.getItem("lioralang.locale")||"auto"}catch(e){}var code=supported.indexOf(choice)>=0?choice:null;if(!code){var langs=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(var i=0;i<langs.length&&!code;i++){var base=String(langs[i]||"").toLowerCase().split(/[-_]/)[0];if(supported.indexOf(base)>=0)code=base}}if(code&&code!=="en"&&location.pathname==="/"){location.replace("/"+code+location.search+location.hash);return}`
      : "";

  return `(function(){${redirect}var theme=null;try{theme=localStorage.getItem("lioralang.theme")}catch(e){}if(!theme&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";if(theme==="dark")document.documentElement.setAttribute("theme","dark")})();`;
};

const buildStructuredData = (locale, meta, faq) => [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Liora",
    url: pageUrl(locale),
    description: meta.description,
    inLanguage: locale,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Windows, macOS, iOS, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    image: `${SITE_URL}/icons/icon-512.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Liora",
    url: `${SITE_URL}/`,
    inLanguage: locale,
  },
];

const buildHead = ({ locale, locales, meta, faq, assets }) => {
  const url = pageUrl(locale);
  const image = `${SITE_URL}/og/landing-${locale}.png`;
  const alternates = locales
    .map((code) => `<link rel="alternate" hreflang="${code}" href="${pageUrl(code)}" />`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl("en")}" />`);
  const ogAlternates = locales
    .filter((code) => code !== locale)
    .map((code) => `<meta property="og:locale:alternate" content="${OG_LOCALES[code]}" />`);

  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...alternates,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Liora" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="${OG_LOCALES[locale]}" />`,
    ...ogAlternates,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...assets.css.map((href) => `<link rel="stylesheet" href="${href}" />`),
    ...assets.scripts.map((href) => `<link rel="modulepreload" href="${href}" />`),
    // The static copy shows every section at once; the app's root waits
    // behind it until the live landing takes over.
    `<style>html.has-prerender #root{display:none}#landing-prerender [data-reveal]{opacity:1;transform:none}</style>`,
    `<script>${buildBootScript(locale, locales)}</script>`,
    `<script type="application/ld+json">${jsonForScript(buildStructuredData(locale, meta, faq))}</script>`,
  ].join("\n    ");
};

const buildPage = ({ template, locale, locales, meta, faq, html, assets }) => {
  // React hoists its own preload links into the markup; they belong in
  // the head.
  const hoisted = [];
  const body = html.replace(/<link [^>]*rel="preload"[^>]*\/>/g, (tag) => {
    hoisted.push(tag);
    return "";
  });

  const page = template
    .replace(/<html lang="[^"]*">/, `<html lang="${locale}" class="has-prerender">`)
    .replace(/<title>[^<]*<\/title>/, [buildHead({ locale, locales, meta, faq, assets }), ...hoisted].join("\n    "))
    .replace('<div id="root"></div>', `<div id="landing-prerender">${body}</div>\n    <div id="root"></div>`);

  if (page === template || !page.includes('id="landing-prerender"')) {
    throw new Error("The HTML template no longer has the expected <html>, <title> and #root");
  }

  return page;
};

const buildSitemap = (locales) => {
  const alternates = [
    ...locales.map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${pageUrl(code)}" />`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("en")}" />`,
  ].join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const urls = locales
    .map(
      (code) =>
        `  <url>\n    <loc>${pageUrl(code)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
};

// The app itself is for people who use it, not for search: its pages are
// a sign-in and a personal library. Shared decks stay open to crawlers.
const buildRobots = () =>
  `User-agent: *\nAllow: /\nDisallow: /app/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

const main = async () => {
  const template = readFileSync(path.join(DIST, "index.html"), "utf8");
  const manifest = JSON.parse(readFileSync(path.join(DIST, "asset-manifest.json"), "utf8"));
  const assets = collectLandingAssets(manifest);
  const { render, LANDING_LOCALES: locales } = await import(
    pathToFileURL(path.join(SSR_DIST, "landingPrerender.js")).href
  );

  // The app's shell, for every address that is not the landing.
  writeFileSync(path.join(DIST, "app.html"), template);

  for (const locale of locales) {
    const { html, meta, faq } = await render(locale);
    const page = buildPage({ template, locale, locales, meta, faq, html, assets });
    const directory = locale === "en" ? DIST : path.join(DIST, locale);

    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "index.html"), page);
    console.log(`prerender: ${pagePath(locale)} (${Math.round(page.length / 1024)} kB)`);
  }

  writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(locales));
  writeFileSync(path.join(DIST, "robots.txt"), buildRobots());
  rmSync(SSR_DIST, { recursive: true, force: true });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
