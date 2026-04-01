import { useEffect } from "react";

const ensureDescriptionTag = () => {
  const existingTag = document.querySelector('meta[name="description"]');

  if (existingTag) {
    return existingTag;
  }

  const descriptionTag = document.createElement("meta");
  descriptionTag.setAttribute("name", "description");
  document.head.append(descriptionTag);
  return descriptionTag;
};

export const usePageMeta = ({
  title = "LioraLang",
  description = "",
}) => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = title;

    if (!description) {
      return;
    }

    ensureDescriptionTag().setAttribute("content", description);
  }, [description, title]);
};
