import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePlatformServiceMock = vi.fn();
const useAppPreferencesMock = vi.fn();
const copyTextToClipboardMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@shared/providers", () => ({
  usePlatformService: (...args) => usePlatformServiceMock(...args),
}));

vi.mock("@shared/lib/appPreferences", () => ({
  useAppPreferences: () => useAppPreferencesMock(),
}));

vi.mock("@shared/lib/clipboard", () => ({
  copyTextToClipboard: (...args) => copyTextToClipboardMock(...args),
}));

const createHubDeck = (overrides = {}) => ({
  id: "deck-1",
  slug: "travel-tourism",
  title: "Travel & Tourism",
  sourceLanguage: "English",
  targetLanguages: ["Polish", "German"],
  latestVersion: { filePath: "decks/travel.lioradeck" },
  downloadsCount: 3,
  ...overrides,
});

const createListResponse = (items) => ({
  items,
  total: items.length,
});

describe("useBrowseDecksPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppPreferencesMock.mockReturnValue({
      appPreferences: {
        desktop: { devMode: true },
        importExport: {
          duplicateStrategy: "skip",
          includeExamples: true,
          includeTags: true,
        },
      },
    });
  });

  describe("hub import", () => {
    it("imports a public deck and refreshes its download count in place", async () => {
      const deckRepository = {
        importDeckFromUrl: vi.fn().mockResolvedValue({
          deckId: 77,
          deckName: "Travel & Tourism",
          importedCount: 24,
          skippedCount: 0,
        }),
      };
      const hubRepository = {
        isConfigured: vi.fn(() => true),
        listDecks: vi.fn().mockResolvedValue(createListResponse([createHubDeck()])),
        createDownloadUrl: vi
          .fn()
          .mockResolvedValue("https://example.com/travel.lioradeck"),
        incrementDeckDownloads: vi.fn().mockResolvedValue({ count: 4 }),
        deleteDeck: vi.fn(),
      };
      usePlatformServiceMock.mockImplementation((serviceName) =>
        serviceName === "deckRepository" ? deckRepository : hubRepository,
      );

      const { useBrowseDecksPanel } = await import("./useBrowseDecksPanel.js");
      const { result } = renderHook(() => useBrowseDecksPanel());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.importDeckFromHub(result.current.decks[0]);
      });

      expect(deckRepository.importDeckFromUrl).toHaveBeenCalledWith({
        downloadUrl: "https://example.com/travel.lioradeck",
        fileName: "travel.lioradeck",
        deckName: "Travel & Tourism",
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tertiaryLanguage: "German",
        settings: {
          duplicateStrategy: "skip",
          includeExamples: true,
          includeTags: true,
        },
      });
      expect(result.current.decks[0].downloadsCount).toBe(4);
      expect(result.current.message).toBe('Imported "Travel & Tourism": 24 words');
      expect(result.current.messageVariant).toBe("success");
      expect(result.current.postImportModal).toEqual({
        isOpen: true,
        deckId: "77",
        deckName: "Travel & Tourism",
      });
    });

    it("navigates to learn with the imported deck when the user confirms the prompt", async () => {
      const deckRepository = {
        importDeckFromUrl: vi.fn().mockResolvedValue({
          deckId: 91,
          deckName: "Travel & Tourism",
          importedCount: 24,
          skippedCount: 0,
        }),
      };
      const hubRepository = {
        isConfigured: vi.fn(() => true),
        listDecks: vi.fn().mockResolvedValue(createListResponse([createHubDeck()])),
        createDownloadUrl: vi
          .fn()
          .mockResolvedValue("https://example.com/travel.lioradeck"),
        incrementDeckDownloads: vi.fn().mockResolvedValue({ count: 4 }),
      };
      usePlatformServiceMock.mockImplementation((serviceName) =>
        serviceName === "deckRepository" ? deckRepository : hubRepository,
      );

      const { useBrowseDecksPanel } = await import("./useBrowseDecksPanel.js");
      const { result } = renderHook(() => useBrowseDecksPanel());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.importDeckFromHub(result.current.decks[0]);
      });

      act(() => {
        result.current.goToLearnAfterImport();
      });

      expect(navigateMock).toHaveBeenCalledWith("/app/learn", {
        state: { importedDeckId: "91" },
      });
      expect(result.current.postImportModal.isOpen).toBe(false);
    });
  });

  describe("copying public links", () => {
    it("copies the public deck URL based on the current app origin", async () => {
      copyTextToClipboardMock.mockResolvedValue(true);
      const deckRepository = {};
      const hubRepository = {
        isConfigured: () => true,
        listDecks: vi.fn().mockResolvedValue(createListResponse([createHubDeck()])),
      };
      usePlatformServiceMock.mockImplementation((serviceName) =>
        serviceName === "deckRepository" ? deckRepository : hubRepository,
      );
      window.history.replaceState({}, "", "http://localhost:3000/app/browse");

      const { useBrowseDecksPanel } = await import("./useBrowseDecksPanel.js");
      const { result } = renderHook(() => useBrowseDecksPanel());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.copyDeckLink(result.current.decks[0]);
      });

      expect(copyTextToClipboardMock).toHaveBeenCalledWith(
        "http://localhost:3000/app/browse/travel-tourism",
      );
      expect(result.current.messageVariant).toBe("success");
    });
  });

  describe("search", () => {
    it("waits for the debounce before fetching search results", async () => {
      const deckRepository = {};
      const hubRepository = {
        isConfigured: () => true,
        listDecks: vi.fn().mockResolvedValue(createListResponse([])),
      };
      usePlatformServiceMock.mockImplementation((serviceName) =>
        serviceName === "deckRepository" ? deckRepository : hubRepository,
      );

      const { useBrowseDecksPanel } = await import("./useBrowseDecksPanel.js");
      const { result } = renderHook(() => useBrowseDecksPanel());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleSearchInputChange({
          target: { value: "travel" },
        });
      });

      expect(hubRepository.listDecks).toHaveBeenCalledTimes(1);

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 320));
      });

      await waitFor(() => {
        expect(hubRepository.listDecks).toHaveBeenLastCalledWith({
          page: 1,
          pageSize: 6,
          search: "travel",
        });
      });
    });
  });
});
