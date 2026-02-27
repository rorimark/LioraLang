import { memo } from "react";
import { useAppPreferencesSection } from "../../model";
import "./ImportExportSettingsSection.css";

export const ImportExportSettingsSection = memo(() => {
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
  } = useAppPreferencesSection();

  return (
    <div className="import-export-settings">
      <label className="import-export-settings__check">
        <input
          type="checkbox"
          name="importExport.autoOpenLanguageReview"
          checked={appPreferences.importExport.autoOpenLanguageReview}
          onChange={handleBooleanFieldChange}
        />
        <span>Auto-open language check after selecting file</span>
      </label>

      <label className="import-export-settings__field">
        <span>Duplicate strategy</span>
        <select
          name="importExport.duplicateStrategy"
          value={appPreferences.importExport.duplicateStrategy}
          onChange={handleSelectFieldChange}
        >
          <option value="skip">Skip duplicates</option>
          <option value="update">Update existing</option>
          <option value="keep_both">Keep both</option>
        </select>
      </label>

      <label className="import-export-settings__field">
        <span>Default export format</span>
        <select
          name="importExport.exportFormat"
          value={appPreferences.importExport.exportFormat}
          onChange={handleSelectFieldChange}
        >
          <option value="lioradeck">.lioradeck</option>
          <option value="json">.json</option>
        </select>
      </label>

      <label className="import-export-settings__check">
        <input
          type="checkbox"
          name="importExport.includeExamples"
          checked={appPreferences.importExport.includeExamples}
          onChange={handleBooleanFieldChange}
        />
        <span>Include examples by default</span>
      </label>

      <label className="import-export-settings__check">
        <input
          type="checkbox"
          name="importExport.includeTags"
          checked={appPreferences.importExport.includeTags}
          onChange={handleBooleanFieldChange}
        />
        <span>Include tags by default</span>
      </label>
    </div>
  );
});

ImportExportSettingsSection.displayName = "ImportExportSettingsSection";
