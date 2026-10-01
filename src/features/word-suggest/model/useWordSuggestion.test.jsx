import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const suggestWord = vi.fn();
let signedIn = true;
const authRepository = {
  isConfigured: () => true,
  getSnapshot: async () => ({ isAuthenticated: signedIn }),
  subscribe: () => () => {},
};

vi.mock("@shared/providers", () => ({
  usePlatformService: (name) => (name === "wordSuggestRepository" ? { suggestWord } : authRepository),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => ({ appPreferences: { deckDefaults: { wordSuggestions: true } } }),
}));

const deck = { sourceLanguage: "English", targetLanguage: "Polish", tertiaryLanguage: "", pictureSide: "", usesWordLevels: true };
const empty = { source: "", target: "", tertiary: "", level: "A1", part_of_speech: "", examplesInput: "" };
let word = 0;

const render = async (initialDraft) => {
  const { useWordSuggestion } = await import("./useWordSuggestion");
  const onFill = vi.fn();
  const hook = renderHook(({ draft }) => useWordSuggestion({ draft, deck, defaults: empty, onFill }), {
    initialProps: { draft: initialDraft },
  });
  return { ...hook, onFill };
};

describe("useWordSuggestion", () => {
  beforeEach(() => {
    suggestWord.mockReset();
    signedIn = true;
    word += 1;
  });

  it("asks once the typing pauses and offers only the open fields", async () => {
    const text = `ticket${word}`;
    suggestWord.mockResolvedValue({ target: "bilet", level: "A2", partOfSpeech: "noun", examples: ["One.", "Two."] });
    const { result, onFill } = await render({ ...empty, source: text, part_of_speech: "verb" });

    await waitFor(() => expect(result.current.hasFills).toBe(true), { timeout: 2000 });
    expect(suggestWord).toHaveBeenCalledTimes(1);
    expect(suggestWord.mock.calls[0][0]).toMatchObject({ text, side: "source", targetLanguage: "Polish" });
    // The part of speech was chosen; the level is still the untouched default.
    expect(result.current.fills).toEqual({ target: "bilet", level: "A2", examplesInput: "One.\nTwo." });

    act(() => {
      result.current.acceptAll();
    });

    expect(onFill).toHaveBeenCalledWith({ target: "bilet", level: "A2", examplesInput: "One.\nTwo." });
  });

  it("never offers to replace what was typed", async () => {
    suggestWord.mockResolvedValue({ target: "bilet" });
    const { result } = await render({ ...empty, source: `pass${word}`, target: "przepustka" });

    await waitFor(() => expect(suggestWord).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.fills.target).toBeUndefined();
  });

  it("asks nobody while signed out", async () => {
    signedIn = false;
    const { result } = await render({ ...empty, source: `gate${word}` });

    await waitFor(() => expect(result.current.needsSignIn).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(suggestWord).not.toHaveBeenCalled();
  });

  it("offers a correction for a misspelling instead of filling anything", async () => {
    suggestWord.mockResolvedValue({ recognized: false, correction: "receive" });
    const { result, onFill } = await render({ ...empty, source: `recieve${word}` });

    await waitFor(() => expect(result.current.correction).toBe("receive"), { timeout: 2000 });
    expect(result.current.hasFills).toBe(false);

    act(() => {
      result.current.acceptCorrection();
    });

    expect(onFill).toHaveBeenCalledWith({ source: "receive" });
  });
});
