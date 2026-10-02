import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import process from "node:process";
import { describe, expect, it, vi } from "vitest";

const workerSource = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
const setup = (cachedResponse) => {
  const listeners = {};
  const match = vi.fn().mockResolvedValue(cachedResponse);
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  vm.runInNewContext(workerSource, {
    URL, fetch,
    caches: { match },
    self: { location: { origin: "https://example.test" }, addEventListener: (name, fn) => { listeners[name] = fn; } },
  });
  const request = (pathname) => {
    let response;
    listeners.fetch({ request: { method: "GET", mode: "cors", url: `https://example.test${pathname}` }, respondWith: (value) => { response = value; } });
    return response;
  };
  return { match, fetch, request };
};

describe("offline build assets", () => {
  it("uses precached hashed files across Origin variants without a network request", async () => {
    const cached = { body: "stylesheet" };
    const worker = setup(cached);
    expect(await worker.request("/assets/word-a1b2.css")).toBe(cached);
    expect(worker.match).toHaveBeenCalledWith(expect.objectContaining({ url: "https://example.test/assets/word-a1b2.css" }), { ignoreVary: true });
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it("keeps Vary matching for responses outside the static build", async () => {
    const worker = setup({ body: "other" });
    await worker.request("/manifest.webmanifest");
    expect(worker.match).toHaveBeenCalledWith(expect.any(Object), { ignoreVary: false });
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });
});
