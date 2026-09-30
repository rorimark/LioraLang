import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createLearnSessionSettingsDefaults } from "../../model/learnSessionSettings";
import { LearnSessionSettingsDialog } from "./LearnSessionSettingsDialog";

const createControl = (overrides = {}) => ({
  isOpen: true,
  learnViewMode: "browse",
  sessionSettings: createLearnSessionSettingsDefaults(),
  currentDeck: { name: "Travel", sourceLanguage: "English", targetLanguage: "Polish" },
  onClose: vi.fn(),
  onSwitchToSrsMode: vi.fn(),
  onSwitchToBrowseMode: vi.fn(),
  onDirectionModeChange: vi.fn(),
  onDailyGoalChange: vi.fn(),
  onAutoFlipDelayChange: vi.fn(),
  onShuffleModeChange: vi.fn(),
  onRepeatWrongCardsChange: vi.fn(),
  onShowExamplesChange: vi.fn(),
  onShowLevelChange: vi.fn(),
  onShowPartOfSpeechChange: vi.fn(),
  ...overrides,
});

describe("LearnSessionSettingsDialog", () => {
  it("shows queue controls only in SRS and keeps mode and direction actions connected", () => {
    const control = createControl();
    const { rerender } = render(<LearnSessionSettingsDialog sessionControl={control} />);
    expect(screen.queryByRole("radiogroup", { name: "Shuffle" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Spaced repetition" }));
    expect(control.onSwitchToSrsMode).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("radio", { name: "Polish → English" }));
    expect(control.onDirectionModeChange).toHaveBeenCalledWith("target_to_source");

    rerender(<LearnSessionSettingsDialog sessionControl={{ ...control, learnViewMode: "srs" }} />);
    expect(screen.getByRole("radiogroup", { name: "Shuffle" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Repeat missed cards sooner" })).toBeInTheDocument();
  });

  it("uses deck sides including pictures and sends preference events from the shared controls", () => {
    const control = createControl({
      currentDeck: { name: "Travel", pictureSide: "source", targetLanguage: "Polish", tertiaryLanguage: "German" },
    });
    render(<LearnSessionSettingsDialog sessionControl={control} />);
    expect(screen.getByRole("radio", { name: "Picture → Polish + German" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase Daily goal" }));
    expect(control.onDailyGoalChange).toHaveBeenCalledWith({ target: { name: "dailyGoal", value: "25" } });
    fireEvent.click(screen.getByRole("switch", { name: "Examples" }));
    expect(control.onShowExamplesChange).toHaveBeenCalledOnce();
    const timer = screen.getByRole("radiogroup", { name: "Flip by itself after" });
    fireEvent.click(within(timer).getByRole("radio", { name: "2 sec" }));
    expect(control.onAutoFlipDelayChange).toHaveBeenCalledOnce();
  });

  it("traps keyboard focus, closes on Escape and restores focus and page scrolling", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    document.body.style.overflow = "auto";
    const control = createControl();
    const { rerender } = render(<LearnSessionSettingsDialog sessionControl={control} />);
    const close = screen.getByRole("button", { name: "Close session settings" });
    const back = screen.getByRole("button", { name: "Back to cards" });
    await waitFor(() => expect(close).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(back).toHaveFocus();
    fireEvent.keyDown(back, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Escape" });
    expect(control.onClose).toHaveBeenCalledOnce();
    rerender(<LearnSessionSettingsDialog sessionControl={{ ...control, isOpen: false }} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });
});
