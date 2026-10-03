import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConceptSuggestion } from "./useConceptSuggestion";
const mock = vi.hoisted(() => ({ suggestConcept: vi.fn(), ready: true }));
vi.mock("./useAiAccess", () => ({ useAiAccess: ({ enabled }) => ({ isWanted: enabled, isReady: enabled && mock.ready, needsSignIn: enabled && !mock.ready, language: "English", repository: mock }) }));
const deck = { id: 1, subject: "programming", subjectFields: { technology: "JS", contentLanguage: "Polish" } };
const answer = [{ source: "Closure?", target: "A function retaining lexical scope.", subjectFields: { difficulty: "medium" } }];
const setup = () => { const onApply = vi.fn(); return { ...renderHook((props) => useConceptSuggestion({ ...props, onApply }), { initialProps: { deck, draft: { source: "Closure?" } } }), onApply }; };
describe("concept suggestion lifecycle", () => {
  beforeEach(() => { mock.suggestConcept.mockReset(); mock.ready = true; });
  it("asks only explicitly, applies only on acceptance, then dismisses", async () => {
    mock.suggestConcept.mockResolvedValue(answer);
    const { result, onApply } = setup();
    expect(mock.suggestConcept).not.toHaveBeenCalled();
    await act(() => result.current.ask());
    expect(result.current.status).toBe("suggested");
    expect(onApply).not.toHaveBeenCalled();
    act(() => result.current.take(0));
    expect(onApply).toHaveBeenCalledWith({ target: answer[0].target, subjectFields: { difficulty: "medium" } });
    expect(result.current.status).toBe("idle");
  });
  it("uses the deck language, requires a choice on old decks and invalidates a language change", async () => {
    mock.suggestConcept.mockResolvedValue(answer);
    const { result, rerender } = setup();
    await act(() => result.current.ask());
    expect(mock.suggestConcept.mock.calls[0][0].writeIn).toBe("Polish");
    rerender({ deck: { ...deck, subjectFields: { technology: "JS" } }, draft: { source: "Closure?" } });
    expect(result.current.status).toBe("languageRequired");
    expect(result.current.canAsk).toBe(false);
    expect(result.current.cards).toEqual([]);
  });
  it("ignores late responses after edits or deck changes, even if abort is ignored", async () => {
    let resolve;
    mock.suggestConcept.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { result, rerender, onApply } = setup();
    let pending;
    act(() => { pending = result.current.ask(); });
    expect(result.current.status).toBe("thinking");
    rerender({ deck: { ...deck, id: 2 }, draft: { source: "Closure?", target: "Mine" } });
    expect(mock.suggestConcept.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => { resolve(answer); await pending; });
    expect(result.current.status).toBe("idle");
    act(() => result.current.take(0));
    expect(onApply).not.toHaveBeenCalled();
  });
  it("aborts on unmount", () => {
    mock.suggestConcept.mockImplementation(() => new Promise(() => {}));
    const { result, unmount } = setup();
    act(() => { void result.current.ask(); });
    unmount();
    expect(mock.suggestConcept.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("shows quota, offline, and empty results without changing the form", async () => {
    const { result, onApply } = setup();
    for (const code of ["quota", "offline", "busy", "error"]) {
      mock.suggestConcept.mockRejectedValue({ code });
      await act(() => result.current.ask());
      expect(result.current.status).toBe(code);
    }
    mock.suggestConcept.mockResolvedValue([]);
    await act(() => result.current.ask());
    expect(result.current.status).toBe("empty");
    expect(onApply).not.toHaveBeenCalled();
  });
  it("does not ask when offline or signed out", async () => {
    mock.ready = false;
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("signin"));
    await act(() => result.current.ask());
    expect(mock.suggestConcept).not.toHaveBeenCalled();
  });
});
