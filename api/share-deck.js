import {
  APP_NAME,
  escapeAttribute,
  escapeHtml,
  resolveDeckShareContext,
} from "./_deckShareMeta.js";

const buildShareHtml = ({
  title,
  description,
  shareUrl,
  browseUrl,
  imageUrl,
  shouldAutoRedirect = true,
}) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeAttribute(description);
  const safeShareUrl = escapeAttribute(shareUrl);
  const safeBrowseUrl = escapeAttribute(browseUrl);
  const safeImageUrl = escapeAttribute(imageUrl);
  const redirectScript = shouldAutoRedirect
    ? `
    <script>
      window.location.replace(${JSON.stringify(browseUrl)});
    </script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${APP_NAME}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeShareUrl}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />
    <link rel="canonical" href="${safeBrowseUrl}" />
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #141414;
        color: #f4f2ee;
        font: 500 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(420px, calc(100vw - 32px));
        padding: 24px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        background: #1f1f1f;
        box-shadow: 0 18px 48px rgba(0,0,0,0.32);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
        line-height: 1.2;
      }
      p {
        margin: 0 0 18px;
        color: rgba(244,242,238,0.72);
      }
      a {
        color: inherit;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(125, 153, 243, 0.5);
        background: rgba(125, 153, 243, 0.14);
      }
    </style>
    ${redirectScript}
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>${escapeHtml(description)}</p>
      <a href="${safeBrowseUrl}">Open in ${APP_NAME}</a>
    </main>
  </body>
</html>`;
};

const previewCrawlerPattern =
  /(bot|crawler|spider|preview|facebookexternalhit|telegrambot|twitterbot|discordbot|slackbot|whatsapp|linkedinbot|vkshare|skypeuripreview|applebot)/i;

const isPreviewCrawler = (request) => {
  const userAgent = request.headers["user-agent"];
  const normalizedUserAgent = Array.isArray(userAgent) ? userAgent.join(" ") : String(userAgent || "");

  return previewCrawlerPattern.test(normalizedUserAgent);
};

export default async function handler(request, response) {
  const {
    pageTitle,
    pageDescription,
    browseUrl,
    shareUrl,
    imageUrl,
  } = await resolveDeckShareContext(request);

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  response.status(200).send(
    buildShareHtml({
      title: pageTitle,
      description: pageDescription,
      shareUrl,
      browseUrl,
      imageUrl,
      shouldAutoRedirect: !isPreviewCrawler(request),
    }),
  );
}
