import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const client = {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })) },
  storage: { from: vi.fn(() => ({ upload })) },
};

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => client,
  hasSupabaseConfig: () => true,
}));

describe("uploadMediaAsset", () => {
  beforeEach(() => {
    upload.mockReset();
  });

  // Given a Blob, the storage client sends the Blob's own type, which the
  // bucket refuses; the picture must go up as bytes typed octet-stream.
  it("sends the picture's bytes as application/octet-stream", async () => {
    upload.mockResolvedValue({ error: null });
    const { createSupabaseSyncApi } = await import("./createSupabaseSyncApi");
    const api = createSupabaseSyncApi();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });

    const result = await api.uploadMediaAsset({ assetId: "a".repeat(64), blob });

    expect(result).toEqual({ filePath: `user-1/media/${"a".repeat(64)}`, alreadyStored: false });
    const [, body, options] = upload.mock.calls[0];
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(body)]).toEqual([1, 2, 3]);
    expect(options).toMatchObject({ contentType: "application/octet-stream", upsert: false });
  });

  it("treats a picture already stored as stored", async () => {
    upload.mockResolvedValue({ error: { message: "The resource already exists", statusCode: "409" } });
    const { createSupabaseSyncApi } = await import("./createSupabaseSyncApi");
    const api = createSupabaseSyncApi();

    const result = await api.uploadMediaAsset({ assetId: "b".repeat(64), blob: new Blob([new Uint8Array([9])]) });

    expect(result.alreadyStored).toBe(true);
  });
});
