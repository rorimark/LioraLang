import { useEffect } from "react";

// Marks [data-reveal] elements inside the landing as visible the first time
// they scroll into view, so the CSS can ease them in. Without
// IntersectionObserver, or with reduced motion, everything is shown at once.
export const useRevealOnScroll = (rootRef) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const targets = Array.from(root.querySelectorAll("[data-reveal]"));
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => target.setAttribute("data-revealed", ""));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [rootRef]);
};
