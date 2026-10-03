import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_FEATURES, DEFAULT_AI_FEATURES } from "@shared/config/aiFeatures";
import { useAiAccess } from "./useAiAccess";

const mock = vi.hoisted(() => ({ preferences: {}, stop: vi.fn() }));
const repository = {};
const auth = { isConfigured: () => true, getSnapshot: async () => ({ isAuthenticated: true }), subscribe: () => mock.stop };
vi.mock("@shared/providers", () => ({ usePlatformService: (name) => name === "authRepository" ? auth : repository }));
vi.mock("@shared/lib/appPreferences", () => ({ useAppPreferences: () => ({ appPreferences: mock.preferences }) }));

describe("AI access by function", () => {
  beforeEach(() => { mock.preferences = { aiFeatures: { ...DEFAULT_AI_FEATURES } }; mock.stop.mockReset(); });
  it.each(AI_FEATURES.map(({ id }) => id))("blocks %s while another function remains available", async (feature) => {
    mock.preferences.aiFeatures[feature] = false;
    const disabled = renderHook(() => useAiAccess({ feature }));
    expect(disabled.result.current.isWanted).toBe(false);
    expect(disabled.result.current.isReady).toBe(false);
    const other = AI_FEATURES.find(({ id }) => id !== feature).id;
    const enabled = renderHook(() => useAiAccess({ feature: other }));
    await waitFor(() => expect(enabled.result.current.isReady).toBe(true));
  });
  it("revokes access immediately when its setting changes", async () => {
    const { result, rerender } = renderHook(() => useAiAccess({ feature: "conceptSuggestions" }));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    mock.preferences = { aiFeatures: { ...DEFAULT_AI_FEATURES, conceptSuggestions: false } };
    rerender();
    expect(result.current.isReady).toBe(false);
    expect(result.current.isWanted).toBe(false);
    expect(mock.stop).toHaveBeenCalled();
  });
  it("fails closed for an unknown function", () => {
    expect(renderHook(() => useAiAccess({ feature: "unknown" })).result.current.isWanted).toBe(false);
  });
});
