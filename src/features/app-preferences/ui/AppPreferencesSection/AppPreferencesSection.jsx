import { memo } from "react";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
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

export const AppPreferencesSection = memo(() => {
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
    handleTextFieldChange,
  } = useAppPreferencesSection();

  return (
    <section className="app-preferences-section">
      <div className="app-preferences-section__head">
        <h3>Study Preferences</h3>
        <p>Core behavior, defaults, and safety settings for this workspace.</p>
      </div>

      <details className="app-preferences-section__group" open>
        <summary className="app-preferences-section__group-summary">
          <span className="app-preferences-section__group-title">
            Learning Core
          </span>
          <span className="app-preferences-section__group-description">
            Session flow and spaced repetition tuning.
          </span>
        </summary>
        <div className="app-preferences-section__group-content">
          <div className="app-preferences-section__grid">
          <fieldset className="app-preferences-section__card">
            <legend>Study session</legend>
            <label>
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
            <label>
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
            <label>
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
            <label className="app-preferences-section__check">
              <input
                type="checkbox"
                name="studySession.repeatWrongCards"
                checked={appPreferences.studySession.repeatWrongCards}
                onChange={handleBooleanFieldChange}
              />
              <span>Repeat wrong cards</span>
            </label>
          </fieldset>

          <fieldset className="app-preferences-section__card">
            <legend>Spaced repetition</legend>
            <label>
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
            <label>
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
            <label>
              <span>Learning steps</span>
              <input
                type="text"
                name="spacedRepetition.learningSteps"
                value={appPreferences.spacedRepetition.learningSteps}
                onChange={handleTextFieldChange}
              />
            </label>
            <label>
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
            <label>
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
          </fieldset>
          </div>
        </div>
      </details>

      <details className="app-preferences-section__group">
        <summary className="app-preferences-section__group-summary">
          <span className="app-preferences-section__group-title">
            Deck Defaults
          </span>
          <span className="app-preferences-section__group-description">
            Default values for deck creation.
          </span>
        </summary>
        <div className="app-preferences-section__group-content">
          <div className="app-preferences-section__grid">
          <fieldset className="app-preferences-section__card">
            <legend>Deck defaults</legend>
            <label>
              <span>Source language</span>
              <select
                name="deckDefaults.sourceLanguage"
                value={appPreferences.deckDefaults.sourceLanguage}
                onChange={handleSelectFieldChange}
              >
                {LANGUAGE_OPTION_ITEMS}
              </select>
            </label>
            <label>
              <span>Target language</span>
              <select
                name="deckDefaults.targetLanguage"
                value={appPreferences.deckDefaults.targetLanguage}
                onChange={handleSelectFieldChange}
              >
                {LANGUAGE_OPTION_ITEMS}
              </select>
            </label>
            <label>
              <span>Default level</span>
              <select
                name="deckDefaults.level"
                value={appPreferences.deckDefaults.level}
                onChange={handleSelectFieldChange}
              >
                {LEVEL_OPTION_ITEMS}
              </select>
            </label>
            <label>
              <span>Part of speech</span>
              <select
                name="deckDefaults.partOfSpeech"
                value={appPreferences.deckDefaults.partOfSpeech}
                onChange={handleSelectFieldChange}
              >
                {PART_OPTION_ITEMS}
              </select>
            </label>
            <label>
              <span>Default tags (comma separated)</span>
              <input
                type="text"
                name="deckDefaults.tags"
                value={appPreferences.deckDefaults.tags.join(", ")}
                onChange={handleTextFieldChange}
              />
            </label>
          </fieldset>
          </div>
        </div>
      </details>

      <details className="app-preferences-section__group">
        <summary className="app-preferences-section__group-summary">
          <span className="app-preferences-section__group-title">
            Workspace and Safety
          </span>
          <span className="app-preferences-section__group-description">
            Accessibility, backups, and destructive action guards.
          </span>
        </summary>
        <div className="app-preferences-section__group-content">
          <div className="app-preferences-section__grid">
          <fieldset className="app-preferences-section__card">
            <legend>UI and accessibility</legend>
            <label>
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
          </fieldset>

          <fieldset className="app-preferences-section__card">
            <legend>Data and safety</legend>
            <label>
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
            <label>
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
                name="dataSafety.confirmDestructive"
                checked={appPreferences.dataSafety.confirmDestructive}
                onChange={handleBooleanFieldChange}
              />
              <span>Confirm destructive actions</span>
            </label>
          </fieldset>
          </div>
        </div>
      </details>

      <details className="app-preferences-section__group app-preferences-section__advanced">
        <summary className="app-preferences-section__group-summary">
          <span className="app-preferences-section__group-title">
            Advanced Desktop and Privacy
          </span>
          <span className="app-preferences-section__group-description">
            Launch behavior, telemetry preferences, and diagnostics.
          </span>
        </summary>
        <div className="app-preferences-section__grid">
          <fieldset className="app-preferences-section__card">
            <legend>Desktop</legend>
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
            <label>
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
          </fieldset>

          <fieldset className="app-preferences-section__card">
            <legend>Privacy</legend>
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
            <label>
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
          </fieldset>
        </div>
      </details>
    </section>
  );
});

AppPreferencesSection.displayName = "AppPreferencesSection";
