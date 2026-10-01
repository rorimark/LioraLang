import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const reportDeck = vi.fn();

vi.mock("@shared/providers", () => ({
  usePlatformService: () => ({ reportDeck }),
}));

const load = async () => (await import("./useReportDeck")).useReportDeck;

describe("useReportDeck", () => {
  it("sends nothing without a reason, then says what the server answered", async () => {
    const useReportDeck = await load();
    const { result } = renderHook(() => useReportDeck("deck-1"));

    await act(async () => {
      await result.current.send();
    });
    expect(reportDeck).not.toHaveBeenCalled();

    reportDeck.mockResolvedValueOnce("hidden");
    act(() => {
      result.current.open();
      result.current.setReason("spam");
      result.current.setNote("x".repeat(600));
    });
    await act(async () => {
      await result.current.send();
    });

    expect(reportDeck).toHaveBeenCalledWith({ deckId: "deck-1", reason: "spam", note: "x".repeat(500) });
    expect(result.current.outcome).toBe("hidden");
  });

  it("names why a report could not be sent", async () => {
    const useReportDeck = await load();
    const { result } = renderHook(() => useReportDeck("deck-1"));

    reportDeck.mockRejectedValueOnce(Object.assign(new Error("verify"), { code: "report_verify" }));
    act(() => result.current.setReason("other"));
    await act(async () => {
      await result.current.send();
    });
    expect(result.current.outcome).toBe("verify");

    reportDeck.mockRejectedValueOnce(new Error("boom"));
    await act(async () => {
      await result.current.send();
    });
    expect(result.current.outcome).toBe("failed");
  });
});
