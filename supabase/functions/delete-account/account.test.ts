import { describe, expect, it } from "vitest";
import { inBatches, isConfirmed, listFilesUnder } from "./account.ts";

describe("delete-account", () => {
  it("is confirmed only by the account's own email address", () => {
    expect(isConfirmed(" Mark@Example.com ", "mark@example.com")).toBe(true);
    expect(isConfirmed("someone@example.com", "mark@example.com")).toBe(false);
    expect(isConfirmed("", "mark@example.com")).toBe(false);
    expect(isConfirmed(undefined, "mark@example.com")).toBe(false);
    expect(isConfirmed("delete", "")).toBe(true);
  });

  it("finds every file under the person's folder, at any depth and past a page", async () => {
    const tree: Record<string, Array<{ name: string; id: string | null }>> = {
      user: [
        { name: "decks", id: null },
        { name: "profile.json", id: "1" },
      ],
      "user/decks": [
        { name: "media", id: null },
        ...Array.from({ length: 1000 }, (_, index) => ({ name: `d${index}.json`, id: `d${index}` })),
        { name: "last.json", id: "x" },
      ],
      "user/decks/media": [{ name: "a.webp", id: "m" }],
    };
    const list = async (prefix: string, offset: number) => (tree[prefix] || []).slice(offset, offset + 1000);
    const files = await listFilesUnder("user", list);

    expect(files).toHaveLength(1003);
    expect(new Set(files).size).toBe(1003);
    expect(files).toContain("user/decks/media/a.webp");
    expect(files).toContain("user/decks/last.json");
    expect(files).toContain("user/profile.json");
  });

  it("removes in batches", () => {
    expect(inBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
