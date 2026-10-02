import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiCode, FiFilePlus, FiPlus, FiUpload } from "react-icons/fi";
import { DecksTable } from "@entities/deck";
import { CreateDeckFromJsonModal, ImportDeckModal } from "@features/deck-import";
import { DeleteDeckModal } from "@features/deck-delete";
import { QuickAddWordsDialog } from "@features/quick-add-words";
import { SparkIcon } from "@features/word-suggest";
import { CardCatalogPagination } from "@features/card-catalog";
import { Button, InlineAlert, SearchField } from "@shared/ui";
import { DECK_PAGE_SIZE_OPTIONS, useDecksOverviewPanel } from "../model";
import "./DecksOverviewPanel.css";
import { getSubjectProfile, SUBJECT_IDS } from "@shared/core/usecases/subjects";
import { useI18n } from "@shared/lib/i18n";

// One labelled way to add a deck; the three ways to do it are its menu.
const NewDeckMenu = ({ onCreate, onCollect, onImport, onJson, isImporting }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !wrapRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isOpen]);

  const choose = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="decks-page-panel__new" ref={wrapRef}>
      <Button
        variant="primary"
        className="decks-page-panel__new-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        isLoading={isImporting}
      >
        <FiPlus aria-hidden="true" />
        <span>{t("decks.newDeck")}</span>
        <FiChevronDown aria-hidden="true" className="decks-page-panel__new-caret" />
      </Button>
      {isOpen ? (
        <div className="decks-page-panel__new-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => choose(onCreate)}>
            <FiFilePlus aria-hidden="true" />
            <span>
              <strong>{t("decks.newMenu.empty")}</strong>
              <small>{t("decks.newMenu.emptyHint")}</small>
            </span>
          </button>
          {SUBJECT_IDS.filter((id) => !getSubjectProfile(id).usesLanguages).map((id) => (
            <button key={id} type="button" role="menuitem" onClick={() => choose(() => onCreate(id))}>
              <FiCode aria-hidden="true" />
              <span><strong>{t(getSubjectProfile(id).nameKey)}</strong><small>{t("subjects.newDeckHint")}</small></span>
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => choose(onCollect)}>
            <SparkIcon className="decks-page-panel__new-spark" />
            <span>
              <strong>{t("decks.newMenu.ai")}</strong>
              <small>{t("decks.newMenu.aiHint")}</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onImport)} disabled={isImporting}>
            <FiUpload aria-hidden="true" />
            <span>
              <strong>{t("decks.newMenu.file")}</strong>
              <small>{t("decks.newMenu.fileHint")}</small>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onJson)} disabled={isImporting}>
            <FiCode aria-hidden="true" />
            <span>
              <strong>{t("decks.newMenu.json")}</strong>
              <small>{t("decks.newMenu.jsonHint")}</small>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const DecksOverviewPanel = memo(() => {
  const panel = useDecksOverviewPanel();
  // A deck on a topic is drafted in the add-words dialog, on a new deck.
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const openCollect = useCallback(() => setIsCollectOpen(true), []);
  const { refreshDecks } = panel;
  const closeCollect = useCallback(() => {
    setIsCollectOpen(false);
    void refreshDecks?.();
  }, [refreshDecks]);
  const { t } = useI18n();
  const listRef = useRef(null);
  const { handleDeckPageChange, handleDeckPageSizeChange } = panel;

  // A new page starts at its first deck: if the top of the list has
  // scrolled away, bring it back.
  const bringListIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const list = listRef.current;

      if (list && list.getBoundingClientRect().top < 0) {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        list.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }, []);

  const pagination = useMemo(
    () => ({
      ...panel.deckPage,
      pageSizeOptions: DECK_PAGE_SIZE_OPTIONS,
      onPageChange: (page) => {
        handleDeckPageChange(page);
        bringListIntoView();
      },
      onPageSizeChange: (size) => {
        handleDeckPageSizeChange(size);
        bringListIntoView();
      },
    }),
    [bringListIntoView, handleDeckPageChange, handleDeckPageSizeChange, panel.deckPage],
  );
  const table = useMemo(
    () => ({
      decks: panel.decks,
      progress: panel.deckProgress,
      actions: {
        onLearnDeck: panel.learnDeck,
        onOpenDeck: panel.openDeck,
        onEditDeck: panel.openEditDeck,
        onPublishDeck: panel.publishDeck,
        onExportDeck: panel.exportDeck,
        onDeleteDeck: panel.openDeleteModal,
      },
      pendingState: {
        publishingDeckId: panel.publishingDeckId,
        exportingDeckId: panel.exportingDeckId,
        deletingDeckId: panel.deletingDeckId,
      },
    }),
    [
      panel.decks,
      panel.deckProgress,
      panel.learnDeck,
      panel.deletingDeckId,
      panel.exportDeck,
      panel.exportingDeckId,
      panel.openDeleteModal,
      panel.openDeck,
      panel.openEditDeck,
      panel.publishDeck,
      panel.publishingDeckId,
    ],
  );
  const importModal = useMemo(
    () => ({
      isOpen: panel.isImportConfirmOpen,
      isImporting: panel.isImporting,
      selectedFileName: panel.selectedImportFileName,
      selectedWordsCount: panel.selectedImportWordsCount,
      deckNameDraft: panel.importDeckNameDraft,
      importLanguages: panel.importLanguages,
      languageOptions: panel.languageOptions,
      isLanguageReviewOpen: panel.isLanguageReviewOpen,
      onDeckNameChange: panel.handleImportDeckNameDraftChange,
      onLanguageChange: panel.handleImportLanguageChange,
      onOpenLanguageReview: panel.openLanguageReview,
      onCloseLanguageReview: panel.closeLanguageReview,
      onToggleLanguageReview: panel.toggleLanguageReview,
      onConfirm: panel.confirmImportDeck,
      onClose: panel.closeImportConfirm,
    }),
    [
      panel.closeImportConfirm,
      panel.closeLanguageReview,
      panel.confirmImportDeck,
      panel.handleImportDeckNameDraftChange,
      panel.handleImportLanguageChange,
      panel.importDeckNameDraft,
      panel.importLanguages,
      panel.isImportConfirmOpen,
      panel.isImporting,
      panel.isLanguageReviewOpen,
      panel.languageOptions,
      panel.openLanguageReview,
      panel.selectedImportFileName,
      panel.selectedImportWordsCount,
      panel.toggleLanguageReview,
    ],
  );
  const jsonImportModal = useMemo(
    () => ({
      isOpen: panel.isJsonImportOpen,
      isImporting: panel.isImporting,
      deckNameDraft: panel.jsonDeckNameDraft,
      jsonText: panel.pasteTextDraft,
      jsonError: panel.pasteError,
      onDeckNameChange: panel.handleJsonDeckNameChange,
      onJsonTextChange: panel.handlePasteTextChange,
      onConfirm: panel.importFromPaste,
      onClose: panel.closeJsonImport,
    }),
    [
      panel.closeJsonImport,
      panel.handleJsonDeckNameChange,
      panel.handlePasteTextChange,
      panel.importFromPaste,
      panel.isImporting,
      panel.isJsonImportOpen,
      panel.jsonDeckNameDraft,
      panel.pasteError,
      panel.pasteTextDraft,
    ],
  );
  const statusAlert = useMemo(
    () => ({
      text: panel.message,
      variant: panel.messageVariant,
      onClose: panel.clearMessage,
    }),
    [panel.clearMessage, panel.message, panel.messageVariant],
  );

  return (
    <article className="panel decks-page-panel">
      <div className="decks-page-panel__header">
        <SearchField
          className="decks-page-panel__search-field"
          value={panel.deckSearch}
          onChange={(event) => panel.handleDeckSearchChange(event.target.value)}
          onClear={() => panel.handleDeckSearchChange("")}
          placeholder={t("decks.searchPlaceholder")}
          ariaLabel={t("decks.search")}
        />
        <div className="decks-page-panel__header-tools">
          {panel.deckSearch.trim() ? (
            <div className="decks-page-panel__search-meta" aria-live="polite">
              {t("decks.found", { count: panel.matchingDecksCount, total: panel.totalDecksCount })}
            </div>
          ) : null}
          <NewDeckMenu
            onCreate={panel.openCreateDeck}
            onCollect={openCollect}
            onImport={panel.openImportConfirm}
            onJson={panel.openJsonImport}
            isImporting={panel.isImporting}
          />
        </div>
      </div>

      <InlineAlert alert={statusAlert} />

      {panel.error && (
        <div className="decks-page-panel__message decks-page-panel__message--error">
          {panel.error}
        </div>
      )}

      {panel.isLoading ? (
        <div className="decks-page-panel__loading">{t("decks.loading")}</div>
      ) : (
        <div className="decks-page-panel__list" ref={listRef}>
          <DecksTable table={table} />
          {/* Only when there is more than the smallest page to page through. */}
          {panel.matchingDecksCount > DECK_PAGE_SIZE_OPTIONS[0] ? (
            <CardCatalogPagination pagination={pagination} label={t("decks.pages")} sizeLabel={t("decks.pageSize")} />
          ) : null}
        </div>
      )}

      <DeleteDeckModal
        isOpen={panel.deleteState?.isOpen}
        deckName={panel.deleteState?.deckName || ""}
        isSyncedDeck={Boolean(panel.deleteState?.deckSyncId)}
        canManageSyncedLibrary={panel.canManageSyncedLibrary}
        isDeleting={Boolean(panel.deletingDeckId)}
        onConfirmLocal={() =>
          panel.confirmDeleteDeck(
            panel.canManageSyncedLibrary && panel.deleteState?.deckSyncId
              ? "remove-device"
              : "local",
          )
        }
        onConfirmLibrary={() => panel.confirmDeleteDeck("delete-library")}
        onClose={panel.closeDeleteModal}
      />

      <ImportDeckModal modal={importModal} />

      <CreateDeckFromJsonModal modal={jsonImportModal} />

      {isCollectOpen ? <QuickAddWordsDialog initialTab="topic" onClose={closeCollect} /> : null}
    </article>
  );
});

DecksOverviewPanel.displayName = "DecksOverviewPanel";
