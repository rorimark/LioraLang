import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const getSession = vi.fn();
const client = { auth: { getSession }, functions: { invoke } };

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => client,
  hasSupabaseConfig: () => true,
}));

const httpError = (status, body) => ({
  name: "FunctionsHttpError",
  context: { status, json: async () => body },
});

describe("suggestWord", () => {
  beforeEach(() => {
    invoke.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
  });

  const load = async () => (await import("./createSupabaseWordSuggestApi")).createSupabaseWordSuggestApi();

  it("sends the request to the function and returns its suggestion", async () => {
    invoke.mockResolvedValue({ data: { suggestion: { target: "bilet" } }, error: null });
    const api = await load();
    const signal = new AbortController().signal;

    await expect(api.suggestWord({ text: "ticket" }, { signal })).resolves.toEqual({ target: "bilet" });
    expect(invoke).toHaveBeenCalledWith("suggest-word", { body: { text: "ticket" }, signal, timeout: 15000 });
  });

  it("asks nobody when no one is signed in", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const api = await load();

    await expect(api.suggestWord({ text: "ticket" })).rejects.toMatchObject({ code: "signin" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([
    [httpError(401, { error: "signin" }), "signin"],
    [httpError(429, { error: "quota" }), "quota"],
    [httpError(429, { error: "busy" }), "busy"],
    [httpError(503, { error: "unconfigured" }), "unavailable"],
    [{ name: "FunctionsFetchError" }, "offline"],
  ])("tells why there is no suggestion", async (error, code) => {
    invoke.mockResolvedValue({ data: null, error });
    const api = await load();

    await expect(api.suggestWord({ text: "ticket" })).rejects.toMatchObject({ code });
  });

  it("says a cancelled request was cancelled", async () => {
    const controller = new AbortController();
    invoke.mockImplementation(async () => {
      controller.abort();
      return { data: null, error: { name: "FunctionsFetchError" } };
    });
    const api = await load();

    await expect(api.suggestWord({ text: "ticket" }, { signal: controller.signal })).rejects.toMatchObject({ code: "aborted" });
  });

  it("asks for a list, a topic and a hint as tasks, with room for the longer ones", async () => {
    const api = await load();
    invoke.mockResolvedValueOnce({ data: { result: { cards: [{ index: 0, target: "chleb" }] } }, error: null });
    await expect(api.suggestList({ rows: [{ source: "bread" }] })).resolves.toEqual([{ index: 0, target: "chleb" }]);
    expect(invoke.mock.calls[0][1]).toMatchObject({ body: { task: "list", rows: [{ source: "bread" }] }, timeout: 45000 });

    invoke.mockResolvedValueOnce({ data: { result: { name: "Kitchen", cards: [] } }, error: null });
    await expect(api.suggestTopic({ topic: "kitchen" })).resolves.toEqual({ name: "Kitchen", cards: [] });

    invoke.mockResolvedValueOnce({ data: { result: { hint: "Sounds like a billet." } }, error: null });
    await expect(api.suggestHint({ word: "bilet" })).resolves.toBe("Sounds like a billet.");
    expect(invoke.mock.calls[2][1]).toMatchObject({ body: { task: "hint" }, timeout: 15000 });
  });
});

