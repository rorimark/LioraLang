import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDeckEditRoute } from "@shared/config/routes";

const navigateMock = vi.fn();
const useParamsMock = vi.fn();
const usePlatformServiceMock = vi.fn();
const useAppPreferencesMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
  useParams: () => useParamsMock(),
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock("@shared/providers", () => ({
  usePlatformService: (...args) => usePlatformServiceMock(...args),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => useAppPreferencesMock(),
}));

const change = (handler, name, value) => handler({ target: { name, value } });

const savedResult = (payload, deckId = 55) => ({
  deck: { id: deckId, name: payload.name },
  words: payload.words.map((word, index) => ({ ...word, id: word.id || 100 + index })),
});

const storedDeck = {
  id: 12,
  name: "Travel deck",
  description: "",
  sourceLanguage: "English",
  targetLanguage: "Polish",
  tertiaryLanguage: "",
  usesWordLevels: true,
  tagsJson: JSON.stringify(["travel"]),
};

const storedWord = {
  id: 90,
  externalId: "w-90",
  source: "ticket",
  target: "bilet",
  level: "A1",
  part_of_speech: "noun",
  tags: ["transport", "booking"],
  examples: ["Buy a ticket", "Show the ticket"],
};

const renderEditor = async () => {
  const { useDeckEditorPanel } = await import("./useDeckEditorPanel.js");
  return renderHook(() => useDeckEditorPanel());
};

describe("useDeckEditorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParamsMock.mockReturnValue({});
    useAppPreferencesMock.mockReturnValue({
      appPreferences: {
        deckDefaults: {
          sourceLanguage: "English",
          targetLanguage: "Polish",
          level: "B1",
          partOfSpeech: "verb",
          tags: ["starter"],
        },
      },
    });
  });

  describe("create mode", () => {
    it("creates the deck with the words typed before it existed, then opens it for editing", async () => {
      const saveDeck = vi.fn(async (payload) => savedResult(payload));
      usePlatformServiceMock.mockReturnValue({ saveDeck });
      const { result } = await renderEditor();

      act(() => {
        change(result.current.handleDeckFormChange, "name", "Education deck");
        result.current.handleDeckFormChange({
          target: { name: "usesWordLevels", type: "checkbox", checked: false },
        });
        change(result.current.handleDeckFormChange, "tagsInput", "education, school");
        change(result.current.handleAddDraftChange, "source", "guidebook");
        change(result.current.handleAddDraftChange, "target", "przewodnik");
        change(result.current.handleAddDraftChange, "examplesInput", "Pack a guidebook\nUse a guidebook\nPack a guidebook");
        change(result.current.handleAddDraftChange, "tagsInput", "reading, school, reading");
      });

      act(() => {
        expect(result.current.submitAddDraft()).toBe(true);
      });

      // Nothing is written before "Create deck".
      expect(saveDeck).not.toHaveBeenCalled();
      expect(result.current.words).toHaveLength(1);
      expect(result.current.addDraft.source).toBe("");
      expect(result.current.addDraft.tagsInput).toBe("reading, school, reading");

      await act(async () => {
        await result.current.createDeck();
      });

      expect(saveDeck).toHaveBeenCalledTimes(1);
      expect(saveDeck).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Education deck",
          pictureSide: "",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tags: ["education", "school"],
          usesWordLevels: false,
          words: [
            expect.objectContaining({
              id: null,
              source: "guidebook",
              target: "przewodnik",
              level: null,
              tags: ["reading", "school"],
              examples: ["Pack a guidebook", "Use a guidebook"],
            }),
          ],
        }),
      );
      expect(navigateMock).toHaveBeenCalledWith(buildDeckEditRoute(55), { replace: true });
    });

    it("says what is missing instead of creating a deck without a name", async () => {
      const saveDeck = vi.fn();
      usePlatformServiceMock.mockReturnValue({ saveDeck });
      const { result } = await renderEditor();

      await act(async () => {
        await result.current.createDeck();
      });

      expect(saveDeck).not.toHaveBeenCalled();
      expect(result.current.createError).toBe("Give the deck a name.");
    });

    it("refuses a word with only one side filled in", async () => {
      usePlatformServiceMock.mockReturnValue({ saveDeck: vi.fn() });
      const { result } = await renderEditor();

      act(() => {
        change(result.current.handleAddDraftChange, "source", "guidebook");
      });
      act(() => {
        expect(result.current.submitAddDraft()).toBe(false);
      });

      expect(result.current.words).toHaveLength(0);
      expect(result.current.addError).toBe("Enter the translation too.");
    });
  });

  describe("edit mode", () => {
    const setUpStoredDeck = (overrides = {}) => {
      useParamsMock.mockReturnValue({ deckId: "12" });
      const repository = {
        getDeckById: vi.fn().mockResolvedValue(storedDeck),
        getDeckWords: vi.fn().mockResolvedValue([storedWord]),
        saveDeck: vi.fn(async (payload) => savedResult(payload, 12)),
        ...overrides,
      };
      usePlatformServiceMock.mockReturnValue(repository);
      return repository;
    };

    it("loads the full word back into the editor, including every example and tag", async () => {
      setUpStoredDeck();
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startEditWord(result.current.words[0]);
      });

      expect(result.current.editingWordId).toBe("w-90");
      expect(result.current.editDraft.examplesInput).toBe("Buy a ticket\nShow the ticket");
      expect(result.current.editDraft.tagsInput).toBe("transport, booking");
    });

    it("saves a new word the moment it is added, keeping the words already there", async () => {
      const repository = setUpStoredDeck();
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        change(result.current.handleAddDraftChange, "source", "train");
        change(result.current.handleAddDraftChange, "target", "pociąg");
      });
      act(() => {
        result.current.submitAddDraft();
      });

      await waitFor(() => expect(result.current.saveState).toBe("saved"));

      expect(repository.saveDeck).toHaveBeenCalledTimes(1);
      const payload = repository.saveDeck.mock.calls[0][0];
      expect(payload.deckId).toBe(12);
      expect(payload.words.map((word) => [word.id, word.source])).toEqual([
        [null, "train"],
        [90, "ticket"],
      ]);
      // The new word takes the id storage gave it, so the next save updates it.
      expect(result.current.words[0].id).toBe(100);
    });

    it("adds several words in a row, each one saved", async () => {
      const repository = setUpStoredDeck();
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      for (const [source, target] of [["train", "pociąg"], ["bus", "autobus"], ["plane", "samolot"]]) {
        act(() => {
          change(result.current.handleAddDraftChange, "source", source);
          change(result.current.handleAddDraftChange, "target", target);
        });
        act(() => {
          result.current.submitAddDraft();
        });
      }

      await waitFor(() => expect(result.current.saveState).toBe("saved"));

      expect(result.current.words.map((word) => word.source)).toEqual(["plane", "bus", "train", "ticket"]);
      const lastPayload = repository.saveDeck.mock.calls.at(-1)[0];
      expect(lastPayload.words.map((word) => word.source)).toEqual(["plane", "bus", "train", "ticket"]);
    });

    it("brings a deleted word back with undo", async () => {
      const repository = setUpStoredDeck();
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.deleteWord(result.current.words[0]);
      });

      expect(result.current.words).toHaveLength(0);
      expect(result.current.lastDeleted.word.source).toBe("ticket");

      act(() => {
        result.current.undoDelete();
      });

      await waitFor(() => expect(result.current.saveState).toBe("saved"));

      expect(result.current.words.map((word) => word.source)).toEqual(["ticket"]);
      expect(result.current.lastDeleted).toBeNull();
      expect(repository.saveDeck.mock.calls.at(-1)[0].words.map((word) => word.source)).toEqual(["ticket"]);
    });

    it("shows a failed save and saves again on retry", async () => {
      const saveDeck = vi
        .fn()
        .mockRejectedValueOnce(new Error("disk is full"))
        .mockImplementation(async (payload) => savedResult(payload, 12));
      setUpStoredDeck({ saveDeck });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        change(result.current.handleAddDraftChange, "source", "train");
        change(result.current.handleAddDraftChange, "target", "pociąg");
      });
      act(() => {
        result.current.submitAddDraft();
      });

      await waitFor(() => expect(result.current.saveState).toBe("error"));
      expect(result.current.saveError).toBe("Could not save the deck.");

      act(() => {
        result.current.retrySave();
      });

      await waitFor(() => expect(result.current.saveState).toBe("saved"));
      expect(saveDeck).toHaveBeenCalledTimes(2);
    });

    it("locks the sides once the deck has words", async () => {
      setUpStoredDeck();
      const { result } = await renderEditor();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canChangeSides).toBe(false);

      act(() => {
        result.current.handleSideTypeChange("source", true);
        result.current.swapSides();
      });

      expect(result.current.deckForm.pictureSide).toBe("");
      expect(result.current.deckForm.sourceLanguage).toBe("English");
    });
  });
});
