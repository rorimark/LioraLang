import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex, sha256HexFallback } from "./sha256.js";

const nodeHash = (bytes) => createHash("sha256").update(bytes).digest("hex");

describe("sha256", () => {
  it("matches Node's digest for empty, short and multi-block input", () => {
    [0, 3, 55, 56, 64, 1000, 70_001].forEach((length) => {
      const bytes = new Uint8Array(length).map((_, index) => (index * 7) % 256);
      expect(sha256HexFallback(bytes), `length ${length}`).toBe(nodeHash(bytes));
    });
  });

  it("gives the same name through the platform digest", async () => {
    const bytes = new TextEncoder().encode("asparagus");
    expect(await sha256Hex(bytes)).toBe(nodeHash(bytes));
  });
});
