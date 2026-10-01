import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const suggestHint = vi.fn();
const authRepository = {
  isConfigured: () => true,
  getSnapshot: async () => ({ isAuthenticated: true }),
  subscribe: () => () => {},
};

vi.mock("@shared/providers", () => ({
  usePlatformService: (name) => (name === "wordSuggestRepository" ? { suggestHint } : authRepository),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => ({ appPreferences: { deckDefaults: { wordSuggestions: true } } }),
}));

describe("useMissedWordHint", () => {
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
