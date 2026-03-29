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
}));

vi.mock("@shared/providers", () => ({
  usePlatformService: (...args) => usePlatformServiceMock(...args),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => useAppPreferencesMock(),
}));

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
    it("saves the deck with every example intact and word tags separate from deck tags", async () => {
      const saveDeck = vi.fn(async (payload) => ({
        deck: {
          id: 55,
          name: payload.name,
          description: payload.description,
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLanguage,
          tertiaryLanguage: payload.tertiaryLanguage,
          usesWordLevels: payload.usesWordLevels,
          tagsJson: JSON.stringify(payload.tags),
          wordsCount: payload.words.length,
        },
        words: payload.words.map((word, index) => ({
          ...word,
          id: index + 1,
        })),
      }));
      usePlatformServiceMock.mockReturnValue({
        saveDeck,
      });

      const { useDeckEditorPanel } = await import("./useDeckEditorPanel.js");
      const { result } = renderHook(() => useDeckEditorPanel());

      act(() => {
        result.current.handleDeckFormChange({
          target: { name: "name", value: "Education deck" },
        });
        result.current.handleDeckFormChange({
          target: { name: "sourceLanguage", value: "English" },
        });
        result.current.handleDeckFormChange({
          target: { name: "targetLanguage", value: "Polish" },
        });
        result.current.handleDeckFormChange({
          target: { name: "usesWordLevels", type: "checkbox", checked: false },
        });
        result.current.handleDeckFormChange({
          target: { name: "tagsInput", value: "education, school" },
        });

        result.current.handleWordDraftChange({
          target: { name: "source", value: "guidebook" },
        });
        result.current.handleWordDraftChange({
          target: { name: "target", value: "przewodnik" },
        });
        result.current.handleWordDraftChange({
          target: {
            name: "examplesInput",
            value: "Pack a guidebook\nUse a guidebook\nPack a guidebook",
          },
        });
        result.current.handleWordDraftChange({
          target: { name: "tagsInput", value: "reading, school, reading" },
        });
      });

      act(() => {
        result.current.handleUpsertWordDraft();
      });

      await waitFor(() => {
        expect(result.current.words).toHaveLength(1);
      });

      await act(async () => {
        await result.current.handleSaveDeck();
      });

      expect(saveDeck).toHaveBeenCalledTimes(1);
      expect(saveDeck).toHaveBeenCalledWith({
        name: "Education deck",
        description: "",
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tertiaryLanguage: "",
        tags: ["education", "school"],
        usesWordLevels: false,
        words: [
          expect.objectContaining({
            source: "guidebook",
            target: "przewodnik",
            level: null,
            tags: ["reading", "school"],
            example: "Pack a guidebook",
            examples: ["Pack a guidebook", "Use a guidebook"],
          }),
        ],
      });
      expect(navigateMock).toHaveBeenCalledWith(buildDeckEditRoute(55), {
        replace: true,
      });
    });
  });

  describe("edit mode", () => {
    it("loads the full word back into the editor, including every example and tag", async () => {
      useParamsMock.mockReturnValue({ deckId: "12" });
      usePlatformServiceMock.mockReturnValue({
        getDeckById: vi.fn().mockResolvedValue({
          id: 12,
          name: "Travel deck",
          description: "",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tertiaryLanguage: "",
          usesWordLevels: true,
          tagsJson: JSON.stringify(["travel"]),
        }),
        getDeckWords: vi.fn().mockResolvedValue([
          {
            id: 90,
            source: "ticket",
            target: "bilet",
            level: "A1",
            part_of_speech: "noun",
            tags: ["transport", "booking"],
            examples: ["Buy a ticket", "Show the ticket"],
          },
        ]),
        saveDeck: vi.fn(),
      });

      const { useDeckEditorPanel } = await import("./useDeckEditorPanel.js");
      const { result } = renderHook(() => useDeckEditorPanel());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleEditWord(90);
      });

      expect(result.current.wordDraft.examplesInput).toBe(
        "Buy a ticket\nShow the ticket",
      );
      expect(result.current.wordDraft.tagsInput).toBe("transport, booking");
    });
  });
});
