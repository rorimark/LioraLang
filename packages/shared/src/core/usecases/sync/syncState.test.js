import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYNC_PREFERENCES,
  getProfileRuntimeState,
  mergeSyncRuntimeState,
  normalizeSyncRuntimeState,
} from "./syncState.js";

describe("syncState", () => {
  it("normalizes missing values with safe defaults", () => {
    const state = normalizeSyncRuntimeState({});

    expect(state.preferences).toEqual(DEFAULT_SYNC_PREFERENCES);
    expect(state.activeProfileScope).toBe("guest:default");
  });

  it("keeps nested profile runtime state when merging patches", () => {
    const nextState = mergeSyncRuntimeState(
      {
        deviceId: "a-device",
        profiles: {
          "user:abc": {
            lastDeviceSeq: 4,
            lastPulledProgressServerSeq: 9,
          },
        },
      },
      {
        preferences: {
          autoSync: false,
        },
      },
    );

    expect(getProfileRuntimeState(nextState, "user:abc").lastDeviceSeq).toBe(4);
    expect(nextState.preferences.autoSync).toBe(false);
  });
});
