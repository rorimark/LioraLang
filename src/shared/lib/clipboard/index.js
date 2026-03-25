const hasNavigatorClipboard = () =>
  typeof navigator !== "undefined" &&
  navigator?.clipboard &&
  typeof navigator.clipboard.writeText === "function";

const fallbackCopyToClipboard = (text) => {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
};

export const copyTextToClipboard = async (text) => {
  const normalizedText = typeof text === "string" ? text.trim() : "";

  if (!normalizedText) {
    return false;
  }

  if (hasNavigatorClipboard()) {
    try {
      await navigator.clipboard.writeText(normalizedText);
      return true;
    } catch {
      return fallbackCopyToClipboard(normalizedText);
    }
  }

  return fallbackCopyToClipboard(normalizedText);
};
