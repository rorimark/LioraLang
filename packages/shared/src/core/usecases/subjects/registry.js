// Explicit catalog, shared by the client and the server. Adding a subject
// requires a profile and one catalog entry, not changes to every consumer.
import { LANGUAGE_PROFILE } from "./profiles/language.js";
import { PROGRAMMING_PROFILE } from "./profiles/programming.js";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const createSubjectRegistry = (profiles, defaultId = "language") => {
  const entries = new Map();
  for (const profile of profiles) {
    if (!/^[a-z][a-z0-9_-]*$/.test(profile.id) || entries.has(profile.id)) throw new Error("Invalid or duplicate subject profile");
    if (!profile.directions?.length || !profile.entryFields || !profile.deckFields) throw new Error(`Incomplete subject profile: ${profile.id}`);
    for (const field of [...Object.values(profile.entryFields), ...Object.values(profile.deckFields)]) {
      if (!["text", "code", "choice"].includes(field.type)) throw new Error(`Unsupported field type: ${field.type}`);
      if (field.type === "choice" ? !field.values?.length : !(field.maxLength > 0)) throw new Error("Invalid subject field");
    }
    entries.set(profile.id, freeze(profile));
  }
  if (!entries.has(defaultId)) throw new Error("Missing default subject");
  return Object.freeze({
    ids: Object.freeze([...entries.keys()]),
    has: (id) => entries.has(id || defaultId),
    get: (id) => entries.get(id || defaultId),
    defaultId,
  });
};

export const subjectRegistry = createSubjectRegistry([LANGUAGE_PROFILE, PROGRAMMING_PROFILE]);
