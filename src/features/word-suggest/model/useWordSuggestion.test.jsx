import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const suggestWord = vi.fn();
let signedIn = true;
let wordSuggestions = true;
let aiEnabled = true;
const authRepository = {
  isConfigured: () => true,
  getSnapshot: async () => ({ isAuthenticated: signedIn }),
  subscribe: () => () => {},
};

vi.mock("@shared/providers", () => ({
  usePlatformService: (name) => (name === "wordSuggestRepository" ? { suggestWord } : authRepository),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => ({ appPreferences: { aiAssistant: { enabled: aiEnabled }, aiFeatures: { wordSuggestions, reviewHints: false } } }),
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
    wordSuggestions = true;
    aiEnabled = true;
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

  it.each(["function", "master"])("cancels a running suggestion via %s and discards its late response", async (toggle) => {
    let resolve;
    suggestWord.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const draft = { ...empty, source: `cancel${word}` };
    const { result, rerender, onFill } = await render(draft);
    await waitFor(() => expect(suggestWord).toHaveBeenCalled());
    const signal = suggestWord.mock.calls[0][1].signal;
    if (toggle === "master") aiEnabled = false;
    else wordSuggestions = false;
    rerender({ draft });
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ target: "late translation" }));
    expect(result.current.hasFills).toBe(false);
    act(() => result.current.acceptAll());
    expect(onFill).not.toHaveBeenCalled();
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

  it("confirms the default level and adds tags, once", async () => {
    suggestWord.mockResolvedValue({ target: "chleb", level: "A1", partOfSpeech: "noun", tags: ["food"] });
    const { result, onFill, rerender } = await render({ ...empty, source: `bread${word}`, tagsInput: "" });

    await waitFor(() => expect(result.current.hasFills).toBe(true), { timeout: 2000 });
    expect(result.current.fills).toEqual({ target: "chleb", level: "A1", part_of_speech: "noun", tagsInput: "food" });

    act(() => {
      result.current.acceptAll();
    });
    rerender({ draft: { ...empty, source: `bread${word}`, target: "chleb", level: "A1", part_of_speech: "noun", tagsInput: "food" } });

    expect(onFill).toHaveBeenCalledTimes(1);
    expect(result.current.hasFills).toBe(false);
    expect([...result.current.suggestedFields].sort()).toEqual(["level", "part_of_speech", "tagsInput", "target"]);
  });

  it("asks a busy service again for the same word", async () => {
    suggestWord
      .mockRejectedValueOnce(Object.assign(new Error("busy"), { code: "busy" }))
      .mockResolvedValue({ target: "bramka" });
    const { result } = await render({ ...empty, source: `gate${word}` });

    await waitFor(() => expect(result.current.fills.target).toBe("bramka"), { timeout: 6000 });
    expect(suggestWord).toHaveBeenCalledTimes(2);
  }, 10000);
});
