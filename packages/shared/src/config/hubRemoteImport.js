export const HUB_STORAGE_BUCKET = "decks";

const SUPABASE_HOST_SUFFIX = ".supabase.co";
const HUB_SIGNED_STORAGE_PATH_SEGMENT = `/storage/v1/object/sign/${HUB_STORAGE_BUCKET}/`;

export const toOrigin = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "";
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return "";
  }
};

const toUrlInstance = (value) => {
  if (value instanceof URL) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
};

export const isTrustedHubStorageUrl = (value, configuredOrigin = "") => {
  const parsedUrl = toUrlInstance(value);

  if (!parsedUrl) {
    return false;
  }

  if (!parsedUrl.pathname.includes(HUB_SIGNED_STORAGE_PATH_SEGMENT)) {
    return false;
  }

  const normalizedConfiguredOrigin = toOrigin(configuredOrigin);

  if (normalizedConfiguredOrigin) {
    return parsedUrl.origin === normalizedConfiguredOrigin;
  }

  return (
    parsedUrl.protocol === "https:" &&
    parsedUrl.hostname.endsWith(SUPABASE_HOST_SUFFIX)
  );
};
