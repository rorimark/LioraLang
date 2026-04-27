import { describe, expect, it } from "vitest";
import {
  buildUserProfileScope,
  GUEST_PROFILE_SCOPE,
  getUserIdFromProfileScope,
  normalizeProfileScope,
} from "./profileScope.js";

describe("profileScope", () => {
  it("builds a normalized user scope", () => {
    expect(buildUserProfileScope("ABC-123 ")).toBe("user:abc-123");
  });

  it("falls back to guest for invalid values", () => {
    expect(normalizeProfileScope("weird")).toBe(GUEST_PROFILE_SCOPE);
  });

  it("extracts the user id from a user scope", () => {
    expect(getUserIdFromProfileScope("user:abc-123")).toBe("abc-123");
  });
});
