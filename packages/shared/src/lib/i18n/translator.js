// Pure: a message catalogue in, a t() out. A message is a string with
// {placeholders}, or an object of plural forms picked by Intl.PluralRules
// for the language (one / few / many / other, as each language has them).
// Numbers are written the language's way. A key missing in a language
// falls back to English, then to the key itself, so nothing is ever blank.

const PLACEHOLDER = /\{(\w+)\}/g;

const lookup = (messages, key) =>
  String(key)
    .split(".")
    .reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), messages);

export const createTranslator = ({ locale, messages, fallbackMessages }) => {
  const plurals = new Intl.PluralRules(locale);
  const numbers = new Intl.NumberFormat(locale);

  const format = (template, params) =>
    String(template).replace(PLACEHOLDER, (match, name) => {
      if (!params || !(name in params)) {
        return match;
      }

      const value = params[name];
      return typeof value === "number" && Number.isFinite(value) ? numbers.format(value) : String(value ?? "");
    });

  const pick = (message, params) => {
    if (message && typeof message === "object") {
      const count = Number(params?.count ?? 0);
      const form = message[plurals.select(count)] ?? message.other;
      return typeof form === "string" ? form : undefined;
    }

    return typeof message === "string" ? message : undefined;
  };

  return (key, params) => {
    const template = pick(lookup(messages, key), params) ?? pick(lookup(fallbackMessages, key), params) ?? key;
    return format(template, params);
  };
};

const PLURAL_FORMS = new Set(["zero", "one", "two", "few", "many", "other"]);

// A plural message is an object of forms only, with an "other" among them.
// ("partOfSpeech" has an "other" too, but it is a section, not a plural.)
export const isPluralMessage = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  typeof value.other === "string" &&
  Object.keys(value).every((key) => PLURAL_FORMS.has(key));

// Every key path of a catalogue, with its message: what the parity test
// walks.
export const flattenMessages = (messages, prefix = "") =>
  Object.entries(messages || {}).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const isPlural = isPluralMessage(value);

    if (value && typeof value === "object" && !isPlural) {
      return flattenMessages(value, path);
    }

    return [[path, value]];
  });

export const placeholdersOf = (message) => {
  const forms = message && typeof message === "object" ? Object.values(message) : [message];
  const names = new Set();

  forms.forEach((form) => {
    for (const match of String(form).matchAll(PLACEHOLDER)) {
      names.add(match[1]);
    }
  });

  return [...names].sort();
};
