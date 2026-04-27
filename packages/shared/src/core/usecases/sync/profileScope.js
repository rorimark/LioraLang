const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const GUEST_PROFILE_SCOPE = "guest:default";
export const USER_PROFILE_SCOPE_PREFIX = "user:";

export const normalizeProfileScope = (value) => {
  const normalizedValue = toCleanString(value);

  if (!normalizedValue) {
    return GUEST_PROFILE_SCOPE;
  }

  if (normalizedValue === GUEST_PROFILE_SCOPE) {
    return GUEST_PROFILE_SCOPE;
  }

  if (normalizedValue.startsWith(USER_PROFILE_SCOPE_PREFIX)) {
    const userId = toCleanString(normalizedValue.slice(USER_PROFILE_SCOPE_PREFIX.length)).toLowerCase();

    if (userId) {
      return `${USER_PROFILE_SCOPE_PREFIX}${userId}`;
    }
  }

  return GUEST_PROFILE_SCOPE;
};

export const buildUserProfileScope = (userId) => {
  const normalizedUserId = toCleanString(userId).toLowerCase();

  if (!normalizedUserId) {
    return GUEST_PROFILE_SCOPE;
  }

  return `${USER_PROFILE_SCOPE_PREFIX}${normalizedUserId}`;
};

export const getUserIdFromProfileScope = (profileScope) => {
  const normalizedScope = normalizeProfileScope(profileScope);

  if (!normalizedScope.startsWith(USER_PROFILE_SCOPE_PREFIX)) {
    return "";
  }

  return normalizedScope.slice(USER_PROFILE_SCOPE_PREFIX.length);
};

export const isGuestProfileScope = (profileScope) => {
  return normalizeProfileScope(profileScope) === GUEST_PROFILE_SCOPE;
};
