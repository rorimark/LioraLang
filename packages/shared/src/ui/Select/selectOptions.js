import { Children, isValidElement } from "react";

// A Select takes its options the way a native <select> does, as <option>
// children, so replacing one is a one-word change. This reads them into
// plain objects.
const toText = (node) => {
  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(toText).join("");
  }

  return isValidElement(node) ? toText(node.props.children) : "";
};

export const readSelectOptions = (children) => {
  const options = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (child.type === "option") {
      const label = toText(child.props.children);
      const value = child.props.value ?? label;

      options.push({
        value: String(value),
        label,
        disabled: Boolean(child.props.disabled),
      });
      return;
    }

    if (child.type === "optgroup" || child.type === Symbol.for("react.fragment")) {
      options.push(...readSelectOptions(child.props.children));
    }
  });

  return options;
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");

// Options whose label contains every typed word.
export const filterSelectOptions = (options, query) => {
  const words = normalize(query).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return options;
  }

  return options.filter((option) => {
    const label = normalize(option.label);
    return words.every((word) => label.includes(word));
  });
};

// Typing on a closed or open list jumps to the next option starting with
// what was typed, after the current one, wrapping around.
export const findTypeaheadIndex = (options, typed, fromIndex = -1) => {
  const prefix = normalize(typed);

  if (!prefix || options.length === 0) {
    return -1;
  }

  for (let step = 1; step <= options.length; step += 1) {
    const index = (fromIndex + step + options.length) % options.length;
    const option = options[index];

    if (!option.disabled && normalize(option.label).startsWith(prefix)) {
      return index;
    }
  }

  return -1;
};

// The next enabled option in a direction, staying put at the ends.
export const stepSelectIndex = (options, fromIndex, direction) => {
  let index = fromIndex;

  for (let step = 0; step < options.length; step += 1) {
    const next = index + direction;

    if (next < 0 || next >= options.length) {
      return index;
    }

    index = next;

    if (!options[index].disabled) {
      return index;
    }
  }

  return fromIndex;
};
