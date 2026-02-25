import { SettingsDatabasePanel } from "@widgets";
import { useSettingsPage } from "../model";

export const SettingsPage = () => {
  const {
    dbPath,
    statusMessage,
    statusVariant,
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    isDarkTheme,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    openDbFolder,
    toggleTheme,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
  } = useSettingsPage();

  return (
    <section className="page">
      <SettingsDatabasePanel
        dbPath={dbPath}
        statusMessage={statusMessage}
        statusVariant={statusVariant}
        isImporting={isImporting}
        selectedImportFileName={selectedImportFileName}
        importDeckNameDraft={importDeckNameDraft}
        isImportConfirmOpen={isImportConfirmOpen}
        isDarkTheme={isDarkTheme}
        onOpenImportConfirm={openImportConfirm}
        onCloseImportConfirm={closeImportConfirm}
        onConfirmImportDeck={confirmImportDeck}
        onOpenDbFolder={openDbFolder}
        onToggleTheme={toggleTheme}
        onCloseStatus={clearStatusMessage}
        onImportDeckNameDraftChange={handleImportDeckNameDraftChange}
      />
    </section>
  );
};

export default SettingsPage;
