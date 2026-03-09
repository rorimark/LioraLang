import { memo } from "react";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import { SETTINGS_SECTION_IDS, SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";
import { useAppPreferencesSection } from "../../model";
import "./AppPreferencesSection.css";

const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PART_OF_SPEECH_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "other",
];

const LANGUAGE_OPTION_ITEMS = LANGUAGE_OPTIONS.map((language) => (
  <option key={language} value={language}>
    {language}
  </option>
));

const LEVEL_OPTION_ITEMS = LEVEL_OPTIONS.map((level) => (
  <option key={level} value={level}>
    {level}
  </option>
));

const PART_OPTION_ITEMS = PART_OF_SPEECH_OPTIONS.map((part) => (
  <option key={part} value={part}>
    {part}
  </option>
));

const resolveBlockClassName = (tabKey, highlightedTab) => {
  if (highlightedTab === tabKey) {
    return "app-preferences-section__block app-preferences-section__block--active";
  }

  return "app-preferences-section__block";
};

export const AppPreferencesSection = memo(({
  highlightedTab = "",
  activeTabKey = "",
}) => {
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
    handleTextFieldChange,
  } = useAppPreferencesSection();

  return (
    <div className="app-preferences-section">
      {activeTabKey === SETTINGS_TAB_KEYS.learningCore ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.learningCore]}
          className={resolveBlockClassName(
            SETTINGS_TAB_KEYS.learningCore,
            highlightedTab,
          )}
        >
        <header className="app-preferences-section__head">
          <h3>Learning Core</h3>
          <p>Session flow and spaced repetition tuning.</p>
        </header>

        <div className="app-preferences-section__grid">
          <label className="app-preferences-section__field">
            <span>Daily goal (cards)</span>
            <input
              type="number"
              min="1"
              max="999"
              name="studySession.dailyGoal"
              value={appPreferences.studySession.dailyGoal}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__field">
            <span>Auto-flip delay</span>
            <select
              name="studySession.autoFlipDelay"
              value={appPreferences.studySession.autoFlipDelay}
              onChange={handleSelectFieldChange}
            >
              <option value="off">Off</option>
              <option value="1s">1 second</option>
              <option value="2s">2 seconds</option>
              <option value="3s">3 seconds</option>
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Shuffle mode</span>
            <select
              name="studySession.shuffleMode"
              value={appPreferences.studySession.shuffleMode}
              onChange={handleSelectFieldChange}
            >
              <option value="off">Off</option>
              <option value="per_session">Per session</option>
              <option value="always">Always</option>
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>New cards per day</span>
            <input
              type="number"
              min="1"
              max="999"
              name="spacedRepetition.newCardsPerDay"
              value={appPreferences.spacedRepetition.newCardsPerDay}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__field">
            <span>Max reviews per day</span>
            <input
              type="number"
              min="1"
              max="2000"
              name="spacedRepetition.maxReviewsPerDay"
              value={appPreferences.spacedRepetition.maxReviewsPerDay}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__field app-preferences-section__field--wide">
            <span>Learning steps</span>
            <input
              type="text"
              name="spacedRepetition.learningSteps"
              value={appPreferences.spacedRepetition.learningSteps}
              onChange={handleTextFieldChange}
            />
          </label>

          <label className="app-preferences-section__field">
            <span>Easy bonus (%)</span>
            <input
              type="number"
              min="100"
              max="300"
              name="spacedRepetition.easyBonus"
              value={appPreferences.spacedRepetition.easyBonus}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__field">
            <span>Lapse penalty (%)</span>
            <input
              type="number"
              min="10"
              max="100"
              name="spacedRepetition.lapsePenalty"
              value={appPreferences.spacedRepetition.lapsePenalty}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__check app-preferences-section__check--wide">
            <input
              type="checkbox"
              name="studySession.repeatWrongCards"
              checked={appPreferences.studySession.repeatWrongCards}
              onChange={handleBooleanFieldChange}
            />
            <span>Repeat wrong cards</span>
          </label>
        </div>
        </section>
      ) : null}

      {activeTabKey === SETTINGS_TAB_KEYS.deckDefaults ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.deckDefaults]}
          className={resolveBlockClassName(
            SETTINGS_TAB_KEYS.deckDefaults,
            highlightedTab,
          )}
        >
        <header className="app-preferences-section__head">
          <h3>Deck Defaults</h3>
          <p>Default values used in deck creation.</p>
        </header>

        <div className="app-preferences-section__grid">
          <label className="app-preferences-section__field">
            <span>Source language</span>
            <select
              name="deckDefaults.sourceLanguage"
              value={appPreferences.deckDefaults.sourceLanguage}
              onChange={handleSelectFieldChange}
            >
              {LANGUAGE_OPTION_ITEMS}
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Target language</span>
            <select
              name="deckDefaults.targetLanguage"
              value={appPreferences.deckDefaults.targetLanguage}
              onChange={handleSelectFieldChange}
            >
              {LANGUAGE_OPTION_ITEMS}
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Default level</span>
            <select
              name="deckDefaults.level"
              value={appPreferences.deckDefaults.level}
              onChange={handleSelectFieldChange}
            >
              {LEVEL_OPTION_ITEMS}
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Part of speech</span>
            <select
              name="deckDefaults.partOfSpeech"
              value={appPreferences.deckDefaults.partOfSpeech}
              onChange={handleSelectFieldChange}
            >
              {PART_OPTION_ITEMS}
            </select>
          </label>

          <label className="app-preferences-section__field app-preferences-section__field--wide">
            <span>Default tags (comma separated)</span>
            <input
              type="text"
              name="deckDefaults.tags"
              value={appPreferences.deckDefaults.tags.join(", ")}
              onChange={handleTextFieldChange}
            />
          </label>
        </div>
        </section>
      ) : null}

      {activeTabKey === SETTINGS_TAB_KEYS.workspaceSafety ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.workspaceSafety]}
          className={resolveBlockClassName(
            SETTINGS_TAB_KEYS.workspaceSafety,
            highlightedTab,
          )}
        >
        <header className="app-preferences-section__head">
          <h3>Workspace and Safety</h3>
          <p>Accessibility and data safety defaults.</p>
        </header>

        <div className="app-preferences-section__grid">
          <label className="app-preferences-section__field">
            <span>Font scale</span>
            <select
              name="uiAccessibility.fontScale"
              value={appPreferences.uiAccessibility.fontScale}
              onChange={handleSelectFieldChange}
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Auto backup interval</span>
            <select
              name="dataSafety.autoBackupInterval"
              value={appPreferences.dataSafety.autoBackupInterval}
              onChange={handleSelectFieldChange}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Max backups</span>
            <input
              type="number"
              min="1"
              max="100"
              name="dataSafety.maxBackups"
              value={appPreferences.dataSafety.maxBackups}
              onChange={handleNumberFieldChange}
            />
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="uiAccessibility.compactMode"
              checked={appPreferences.uiAccessibility.compactMode}
              onChange={handleBooleanFieldChange}
            />
            <span>Compact mode</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="uiAccessibility.reducedMotion"
              checked={appPreferences.uiAccessibility.reducedMotion}
              onChange={handleBooleanFieldChange}
            />
            <span>Reduced motion</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="uiAccessibility.highContrast"
              checked={appPreferences.uiAccessibility.highContrast}
              onChange={handleBooleanFieldChange}
            />
            <span>High contrast mode</span>
          </label>

          <label className="app-preferences-section__check app-preferences-section__check--wide">
            <input
              type="checkbox"
              name="dataSafety.confirmDestructive"
              checked={appPreferences.dataSafety.confirmDestructive}
              onChange={handleBooleanFieldChange}
            />
            <span>Confirm destructive actions</span>
          </label>
        </div>
        </section>
      ) : null}

      {activeTabKey === SETTINGS_TAB_KEYS.advancedDesktop ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.advancedDesktop]}
          className={resolveBlockClassName(
            SETTINGS_TAB_KEYS.advancedDesktop,
            highlightedTab,
          )}
        >
        <header className="app-preferences-section__head">
          <h3>Advanced Desktop and Privacy</h3>
          <p>Desktop behavior, diagnostics, and privacy options.</p>
        </header>

        <div className="app-preferences-section__grid">
          <label className="app-preferences-section__field">
            <span>Update channel</span>
            <select
              name="desktop.updateChannel"
              value={appPreferences.desktop.updateChannel}
              onChange={handleSelectFieldChange}
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </label>

          <label className="app-preferences-section__field">
            <span>Log level</span>
            <select
              name="privacy.logLevel"
              value={appPreferences.privacy.logLevel}
              onChange={handleSelectFieldChange}
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="debug">Debug</option>
            </select>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="desktop.launchAtStartup"
              checked={appPreferences.desktop.launchAtStartup}
              onChange={handleBooleanFieldChange}
            />
            <span>Launch at startup</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="desktop.minimizeToTray"
              checked={appPreferences.desktop.minimizeToTray}
              onChange={handleBooleanFieldChange}
            />
            <span>Minimize to tray</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="desktop.hardwareAcceleration"
              checked={appPreferences.desktop.hardwareAcceleration}
              onChange={handleBooleanFieldChange}
            />
            <span>Hardware acceleration</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="desktop.devMode"
              checked={appPreferences.desktop.devMode}
              onChange={handleBooleanFieldChange}
            />
            <span>Developer mode</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="privacy.analyticsEnabled"
              checked={appPreferences.privacy.analyticsEnabled}
              onChange={handleBooleanFieldChange}
            />
            <span>Usage analytics</span>
          </label>

          <label className="app-preferences-section__check">
            <input
              type="checkbox"
              name="privacy.crashReportsEnabled"
              checked={appPreferences.privacy.crashReportsEnabled}
              onChange={handleBooleanFieldChange}
            />
            <span>Crash reports</span>
          </label>
        </div>
        </section>
      ) : null}
    </div>
  );
});

AppPreferencesSection.displayName = "AppPreferencesSection";
