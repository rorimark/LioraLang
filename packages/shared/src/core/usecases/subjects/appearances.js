// Optional presentation variants selected by an existing deck field. No new
// classification level, stored flag or component branch is needed.
const cache = new WeakMap();
const merge = (base, patch) => Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(patch)])].map(key => {
  const next = patch[key];
  return [key, next === undefined ? base[key] : next && typeof next === "object" && !Array.isArray(next) && base[key] && typeof base[key] === "object"
    ? merge(base[key], next) : next];
}));
const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const resolveSubjectProfile = (profile, deckFields = {}) => {
  if (!profile?.appearanceField || !profile.appearances) return profile;
  const value = String(deckFields?.[profile.appearanceField] || "").trim().toLowerCase().replace(/\s+/g, " ");
  const variant = profile.appearances.find(item => item.aliases.some(alias => value === alias ||
    (value.startsWith(`${alias} `) && /^\d+(?:\.\d+)*$/.test(value.slice(alias.length + 1)))));
  if (!variant) return profile;
  if (!cache.has(profile)) cache.set(profile, new Map());
  const variants = cache.get(profile);
  if (!variants.has(variant)) variants.set(variant, freeze(merge(profile, variant.overrides)));
  return variants.get(variant);
};
