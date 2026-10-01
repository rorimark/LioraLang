// The landing is served as static HTML, written at build time for each
// language (scripts/prerender-landing.mjs), so it can be read before any
// script runs. The static copy sits in #landing-prerender and the app's
// own root stays hidden behind the has-prerender class until the live
// landing is ready to take its place.

export const PRERENDER_ROOT_ID = "landing-prerender";
export const PRERENDER_CLASS = "has-prerender";

const removeStaticCopy = () => {
  document.getElementById(PRERENDER_ROOT_ID)?.remove();
  document.documentElement.classList.remove(PRERENDER_CLASS);
};

// The live landing takes over, in the same frame: the static copy goes,
// the live one shows at the same scroll, and the sections already on
// screen stay shown rather than appearing a second time.
export const replacePrerenderedLanding = (livePage) => {
  if (typeof document === "undefined") {
    return;
  }

  const staticRoot = document.getElementById(PRERENDER_ROOT_ID);

  if (!staticRoot) {
    return;
  }

  const scrollTop = staticRoot.querySelector(".landing-page")?.scrollTop || 0;
  removeStaticCopy();

  if (!livePage) {
    return;
  }

  livePage.scrollTop = scrollTop;
  livePage.querySelectorAll("[data-reveal]").forEach((element) => {
    const rect = element.getBoundingClientRect();

    if (rect.top < window.innerHeight && rect.bottom > 0) {
      element.setAttribute("data-revealed", "");
    }
  });
};

// Any page but the landing never uses the static copy: an offline start or
// a link into the app may still be served the landing's HTML.
export const discardPrerenderedLanding = () => {
  if (typeof document !== "undefined") {
    removeStaticCopy();
  }
};
