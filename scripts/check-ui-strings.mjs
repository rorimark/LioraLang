// Finds interface text written straight into JSX: element text and the
// attributes people read (aria-label, placeholder, title, alt, label).
// Everything a person reads goes through t(), so every interface language
// has it. Also checks the other way: every message key written in the code
// ("learn.done.title", or the fixed start of `stickers.${key}.title`) is in
// the English catalogue, so a typo cannot show a raw key. Run: pnpm check:i18n
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const espree = createRequire(require.resolve("eslint"))("espree");

const ROOTS = ["src", "packages/shared/src"];
// The landing has its own copy and is not part of the app's languages yet.
const SKIP = [/LandingMockPanel/, /pages\/landing/, /pages\/share/, /\.test\./, /node_modules/];
const READ_ATTRIBUTES = new Set(["aria-label", "placeholder", "title", "alt", "label", "aria-description"]);
// Not words: the brand, and marks that read the same in every language.
const ALLOWED = new Set(["LioraLang", "·", "—", "–", "…", "/", "→", "×", "+", "−", "%", "#", "?", "Liora"]);

const files = [];
const scripts = [];
const walk = (dir) => {
  readdirSync(dir).forEach((name) => {
    const full = path.join(dir, name);

    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (SKIP.some((pattern) => pattern.test(full))) {
      // not app interface
    } else if (full.endsWith(".jsx")) {
      files.push(full);
    } else if (full.endsWith(".js") && !full.includes(`${path.sep}messages${path.sep}`)) {
      scripts.push(full);
    }
  });
};
[...ROOTS, "electron/main"].forEach(walk);

const { default: english } = await import(path.resolve("packages/shared/src/lib/i18n/messages/en.js"));
const PLURAL_FORMS = new Set(["zero", "one", "two", "few", "many", "other"]);
const isPlural = (value) =>
  value && typeof value === "object" && typeof value.other === "string" &&
  Object.keys(value).every((key) => PLURAL_FORMS.has(key));
const leaves = new Set();
const collect = (node, prefix) =>
  Object.entries(node).forEach(([key, value]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string" || isPlural(value)) {
      leaves.add(pathKey);
    } else if (value && typeof value === "object") {
      collect(value, pathKey);
    }
  });
collect(english, "");
const namespaces = new Set(Object.keys(english));
const looksLikeKey = (text) =>
  /^[a-z][\w-]*(\.[\w-]+)+$/i.test(text) && namespaces.has(text.split(".")[0]);
const keyProblems = [];
const calleeName = (callee) => callee?.name || callee?.property?.name || "";
// Where a string is a message key: an argument of t() or errorText(), a
// state setter that stores a key, or a key / labelKey / i18nKey field.
const holdsKey = (parent) =>
  (parent?.type === "CallExpression" && /^(t|errorText|set[A-Z]\w*)$/.test(calleeName(parent.callee))) ||
  (parent?.type === "Property" && ["key", "labelKey", "titleKey", "i18nKey"].includes(parent.key?.name));
const isKeyPrefix = (text) => [...leaves].some((key) => key.startsWith(`${text}.`));
const checkKeys = (file, node, parent) => {
  if (
    node.type === "Literal" &&
    typeof node.value === "string" &&
    holdsKey(parent) &&
    looksLikeKey(node.value) &&
    !leaves.has(node.value) &&
    !isKeyPrefix(node.value)
  ) {
    keyProblems.push(`${file}:${node.loc.start.line}  no message "${node.value}"`);
  }

  if (node.type === "TemplateLiteral" && node.expressions.length > 0) {
    const start = node.quasis[0].value.cooked;

    if (looksLikeKey(start.replace(/\.$/, "")) && ![...leaves].some((key) => key.startsWith(start))) {
      keyProblems.push(`${file}:${node.loc.start.line}  no message starts with "${start}"`);
    }
  }
};

const hasWords = (text) => /\p{L}{2,}/u.test(text) && !ALLOWED.has(text.trim());
const problems = [];

[...files, ...scripts].forEach((file) => {
  const source = readFileSync(file, "utf8");
  const isJsx = file.endsWith(".jsx");
  let ast;

  try {
    ast = espree.parse(source, { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true }, loc: true });
  } catch (error) {
    problems.push(`${file}: could not parse (${error.message})`);
    return;
  }

  const visit = (node, parent) => {
    if (!node || typeof node.type !== "string") {
      return;
    }

    checkKeys(file, node, parent);

    if (isJsx && node.type === "JSXText" && hasWords(node.value)) {
      problems.push(`${file}:${node.loc.start.line}  text  "${node.value.trim().slice(0, 60)}"`);
    }

    if (
      isJsx &&
      node.type === "JSXAttribute" &&
      READ_ATTRIBUTES.has(node.name?.name) &&
      node.value?.type === "Literal" &&
      hasWords(String(node.value.value))
    ) {
      problems.push(`${file}:${node.loc.start.line}  ${node.name.name}="${String(node.value.value).slice(0, 60)}"`);
    }

    Object.values(node).forEach((child) => {
      if (Array.isArray(child)) {
        child.forEach((item) => visit(item, node));
      } else if (child && typeof child === "object" && child.type) {
        visit(child, node);
      }
    });
  };

  visit(ast);
});

if (problems.length > 0 || keyProblems.length > 0) {
  if (problems.length > 0) {
    console.error(`Untranslated interface text (${problems.length}):\n${problems.join("\n")}`);
  }

  if (keyProblems.length > 0) {
    console.error(`Message keys missing from the English catalogue (${keyProblems.length}):\n${keyProblems.join("\n")}`);
  }

  process.exit(1);
}

console.log(
  `Interface text check passed: ${files.length} components, ${scripts.length} scripts, every key in the catalogue.`,
);
