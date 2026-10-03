import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const suggestHint = vi.fn();
let reviewHints = true;
const authRepository = {
  isConfigured: () => true,
  getSnapshot: async () => ({ isAuthenticated: true }),
  subscribe: () => () => {},
};

vi.mock("@shared/providers", () => ({
  usePlatformService: (name) => (name === "wordSuggestRepository" ? { suggestHint } : authRepository),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => ({ appPreferences: { aiFeatures: { wordSuggestions: true, reviewHints } } }),
}));

describe("useMissedWordHint", () => {
  it("does not request an explanation when review hints are off", async () => {
    reviewHints = false;
    suggestHint.mockClear();
    const { useMissedWordHint } = await import("./useMissedWordHint");
    const { result } = renderHook(() => useMissedWordHint({ word: { source: "test", target: "test" }, deck: { sourceLanguage: "Polish", targetLanguage: "English" } }));
    expect(result.current.request).toBeNull();
    expect(suggestHint).not.toHaveBeenCalled();
    reviewHints = true;
  });
  it("asks once for a word, however often the deck object is rebuilt", async () => {
    suggestHint.mockResolvedValue("Sounds like a billet.");
    const { useMissedWordHint } = await import("./useMissedWordHint");
    const word = { source: "bilet", target: "ticket" };
    const hook = renderHook(({ deck }) => useMissedWordHint({ word, deck }), {
      initialProps: { deck: { sourceLanguage: "Polish", targetLanguage: "English" } },
    });

    await waitFor(() => expect(hook.result.current.hint).toBe("Sounds like a billet."));
    hook.rerender({ deck: { sourceLanguage: "Polish", targetLanguage: "English" } });
    hook.rerender({ deck: { sourceLanguage: "Polish", targetLanguage: "English" } });

    expect(suggestHint).toHaveBeenCalledTimes(1);
    expect(suggestHint.mock.calls[0][0]).toMatchObject({ word: "bilet", wordLanguage: "Polish", translation: "ticket" });
  });
});
