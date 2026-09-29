import { createElement } from "react";

// A message may set a number in bold as **12**: this turns such a message
// into text and <strong> parts, so translators can move the bold part to
// wherever their grammar puts it.
export const withEmphasis = (message) =>
  String(message)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? createElement("strong", { key: index }, part.slice(2, -2)) : part,
    );
