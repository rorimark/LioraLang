import { describe, expect, it } from "vitest";
import { isInteractiveEventTarget } from "./keyboardTarget";

const target = html => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root.querySelector("[data-target]");
};
describe("study shortcut target ownership", () => {
  it.each([
    '<button role="combobox" data-target>Deck</button>',
    '<button><svg data-target></svg></button>',
    '<a href="/app/decks"><span data-target>Decks</span></a>',
    '<input data-target>', '<textarea data-target></textarea>',
    '<div contenteditable="true"><span data-target>Text</span></div>',
    '<div role="listbox" data-target></div>',
  ])("leaves control keys alone: %s", html => {
    expect(isInteractiveEventTarget(target(html))).toBe(true);
  });
  it("keeps configured shortcuts on the card and desk", () => {
    expect(isInteractiveEventTarget(target('<button class="flashcard"><span data-target>Question</span></button>'))).toBe(false);
    expect(isInteractiveEventTarget(target('<main data-target></main>'))).toBe(false);
    expect(isInteractiveEventTarget(null)).toBe(false);
  });
});
