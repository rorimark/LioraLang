import { memo, useId } from "react";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import {
  SettingGroup,
  SettingRow,
  SettingSegmented,
  SettingSelect,
  SettingStepper,
  SettingSwitch,
} from "@shared/ui";
import { useAppPreferencesSection } from "../../model";
import "./PreferenceGroups.css";

const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => ({
  value: level,
  label: level,
}));

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

const PART_OPTION_ITEMS = PART_OF_SPEECH_OPTIONS.map((part) => (
  <option key={part} value={part}>
    {part}
  </option>
));

const FONT_SCALE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
];

const STUDY_MODE_OPTIONS = [
  { value: "srs", label: "SRS" },
  { value: "review", label: "Review" },
];

const AUTO_FLIP_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "1s", label: "1s" },
  { value: "2s", label: "2s" },
  { value: "3s", label: "3s" },
];

const SHUFFLE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "per_session", label: "Per session" },
  { value: "always", label: "Always" },
];

const BACKUP_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const UPDATE_CHANNEL_OPTIONS = [
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
];

const EXPORT_FORMAT_OPTIONS = [
  { value: "lioradeck", label: ".lioradeck" },
  { value: "json", label: ".json" },
];

// One switch row, the most common kind.
const SwitchRow = memo(({ label, hint, keywords, name, checked, onChange }) => {
  const id = useId();

  return (
    <SettingRow
      label={label}
      hint={hint}
      keywords={keywords}
      controlId={id}
      control={<SettingSwitch id={id} name={name} checked={checked} onChange={onChange} />}
    />
  );
});

SwitchRow.displayName = "SwitchRow";

export const DisplayPreferences = memo(() => {
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { uiAccessibility } = appPreferences;

  return (
    <>
      <SettingRow
        label="Text size"
        keywords="font scale zoom bigger smaller accessibility"
        control={
          <SettingSegmented
            name="uiAccessibility.fontScale"
            value={uiAccessibility.fontScale}
            options={FONT_SCALE_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel="Text size"
          />
        }
      />
      <SwitchRow
        label="Compact layout"
        hint="Tighter spacing, more on the screen at once."
        keywords="density dense accessibility"
        name="uiAccessibility.compactMode"
        checked={uiAccessibility.compactMode}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label="Reduce motion"
        hint="Animations are switched off; changes happen in place."
        keywords="animation accessibility"
        name="uiAccessibility.reducedMotion"
        checked={uiAccessibility.reducedMotion}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label="High contrast"
        hint="Stronger borders and no shadows."
        keywords="accessibility contrast"
        name="uiAccessibility.highContrast"
        checked={uiAccessibility.highContrast}
        onChange={handleBooleanFieldChange}
      />
    </>
  );
});

DisplayPreferences.displayName = "DisplayPreferences";

export const LearningPreferences = memo(() => {
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
    handleTextFieldChange,
  } = useAppPreferencesSection();
  const { studySession, spacedRepetition } = appPreferences;
  const stepsId = useId();

  return (
    <>
      <SettingGroup title="Sessions" keywords="study learn">
        <SettingRow
          label="Start Learn in"
          hint="SRS brings the cards that are due; Review goes through the whole deck."
          keywords="default study mode srs review"
          control={
            <SettingSegmented
              name="studySession.defaultStudyMode"
              value={studySession.defaultStudyMode}
              options={STUDY_MODE_OPTIONS}
              onChange={handleSelectFieldChange}
              ariaLabel="Start Learn in"
            />
          }
        />
        <SettingRow
          label="Daily goal"
          hint="How many cards you aim to study a day."
          keywords="cards target"
          control={
            <SettingStepper
              name="studySession.dailyGoal"
              value={studySession.dailyGoal}
              min={1}
              max={999}
              step={5}
              onChange={handleNumberFieldChange}
              ariaLabel="daily goal"
            />
          }
        />
        <SettingRow
          label="Flip by itself after"
          hint="Turns the card over for you, so you can study hands-free."
          keywords="auto flip delay timer"
          control={
            <SettingSegmented
              name="studySession.autoFlipDelay"
              value={studySession.autoFlipDelay}
              options={AUTO_FLIP_OPTIONS}
              onChange={handleSelectFieldChange}
              ariaLabel="Flip by itself after"
            />
          }
        />
        <SettingRow
          label="Shuffle"
          hint="The order the cards come in."
          keywords="random order"
          control={
            <SettingSegmented
              name="studySession.shuffleMode"
              value={studySession.shuffleMode}
              options={SHUFFLE_OPTIONS}
              onChange={handleSelectFieldChange}
              ariaLabel="Shuffle"
            />
          }
        />
        <SwitchRow
          label="Repeat missed cards now"
          hint="A card you mark Again comes back in this session, not after the first learning step."
          keywords="wrong again repeat"
          name="studySession.repeatWrongCards"
          checked={studySession.repeatWrongCards}
          onChange={handleBooleanFieldChange}
        />
      </SettingGroup>

      <SettingGroup
        title="Spaced repetition"
        description="How often words come back. The defaults suit most people."
        keywords="srs schedule interval algorithm"
      >
        <SettingRow
          label="New words a day"
          hint="The most new words brought in on one day."
          keywords="new cards per day limit"
          control={
            <SettingStepper
              name="spacedRepetition.newCardsPerDay"
              value={spacedRepetition.newCardsPerDay}
              min={1}
              max={999}
              step={5}
              onChange={handleNumberFieldChange}
              ariaLabel="new words a day"
            />
          }
        />
        <SettingRow
          label="Reviews a day"
          hint="The most reviews on one day; the rest wait until tomorrow."
          keywords="max reviews per day limit"
          control={
            <SettingStepper
              name="spacedRepetition.maxReviewsPerDay"
              value={spacedRepetition.maxReviewsPerDay}
              min={1}
              max={2000}
              step={10}
              onChange={handleNumberFieldChange}
              ariaLabel="reviews a day"
            />
          }
        />
        <SettingRow
          label="Learning steps"
          hint="The waits between the first reviews of a new word, separated by commas: 10m, 1d, 3d."
          keywords="intervals minutes days"
          controlId={stepsId}
          wide
          control={
            <input
              id={stepsId}
              className="preference-text"
              type="text"
              name="spacedRepetition.learningSteps"
              value={spacedRepetition.learningSteps}
              onChange={handleTextFieldChange}
              spellCheck={false}
              autoComplete="off"
            />
          }
        />
        <SettingRow
          label="Easy bonus"
          hint="Easy stretches the next wait by this much."
          keywords="multiplier interval"
          control={
            <SettingStepper
              name="spacedRepetition.easyBonus"
              value={spacedRepetition.easyBonus}
              min={100}
              max={300}
              step={5}
              unit="%"
              onChange={handleNumberFieldChange}
              ariaLabel="easy bonus"
            />
          }
        />
        <SettingRow
          label="Lapse penalty"
          hint="A forgotten word keeps this share of its wait."
          keywords="forgot again interval"
          control={
            <SettingStepper
              name="spacedRepetition.lapsePenalty"
              value={spacedRepetition.lapsePenalty}
              min={10}
              max={100}
              step={5}
              unit="%"
              onChange={handleNumberFieldChange}
              ariaLabel="lapse penalty"
            />
          }
        />
      </SettingGroup>
    </>
  );
});

LearningPreferences.displayName = "LearningPreferences";

export const DeckDefaultPreferences = memo(() => {
  const { appPreferences, handleSelectFieldChange, handleTextFieldChange } =
    useAppPreferencesSection();
  const { deckDefaults } = appPreferences;
  const sourceId = useId();
  const targetId = useId();
  const partId = useId();
  const tagsId = useId();

  return (
    <SettingGroup keywords="new deck defaults create">
      <SettingRow
        label="Words in"
        keywords="source language"
        controlId={sourceId}
        control={
          <SettingSelect
            id={sourceId}
            name="deckDefaults.sourceLanguage"
            value={deckDefaults.sourceLanguage}
            onChange={handleSelectFieldChange}
          >
            {LANGUAGE_OPTION_ITEMS}
          </SettingSelect>
        }
      />
      <SettingRow
        label="Translated to"
        keywords="target language"
        controlId={targetId}
        control={
          <SettingSelect
            id={targetId}
            name="deckDefaults.targetLanguage"
            value={deckDefaults.targetLanguage}
            onChange={handleSelectFieldChange}
          >
            {LANGUAGE_OPTION_ITEMS}
          </SettingSelect>
        }
      />
      <SettingRow
        label="Level"
        keywords="cefr a1 a2 b1 b2 c1 c2"
        control={
          <SettingSegmented
            name="deckDefaults.level"
            value={deckDefaults.level}
            options={LEVEL_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel="Level"
          />
        }
      />
      <SettingRow
        label="Part of speech"
        keywords="noun verb grammar"
        controlId={partId}
        control={
          <SettingSelect
            id={partId}
            name="deckDefaults.partOfSpeech"
            value={deckDefaults.partOfSpeech}
            onChange={handleSelectFieldChange}
          >
            {PART_OPTION_ITEMS}
          </SettingSelect>
        }
      />
      <SettingRow
        label="Tags"
        hint="Separated by commas, up to 10."
        keywords="labels"
        controlId={tagsId}
        wide
        control={
          <input
            id={tagsId}
            className="preference-text"
            type="text"
            name="deckDefaults.tags"
            value={deckDefaults.tags.join(", ")}
            onChange={handleTextFieldChange}
            placeholder="travel, verbs"
            autoComplete="off"
          />
        }
      />
    </SettingGroup>
  );
});

DeckDefaultPreferences.displayName = "DeckDefaultPreferences";

export const SafetyPreferences = memo(() => {
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
  } = useAppPreferencesSection();
  const { dataSafety } = appPreferences;

  return (
    <SettingGroup keywords="backups safety data protect">
      <SettingRow
        label="Back up automatically"
        keywords="auto backup interval schedule"
        control={
          <SettingSegmented
            name="dataSafety.autoBackupInterval"
            value={dataSafety.autoBackupInterval}
            options={BACKUP_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel="Back up automatically"
          />
        }
      />
      <SettingRow
        label="Backups to keep"
        hint="Older ones are removed."
        keywords="max backups"
        control={
          <SettingStepper
            name="dataSafety.maxBackups"
            value={dataSafety.maxBackups}
            min={1}
            max={100}
            onChange={handleNumberFieldChange}
            ariaLabel="backups to keep"
          />
        }
      />
      <SwitchRow
        label="Ask before deleting"
        hint="Confirm before anything is removed for good."
        keywords="confirm destructive delete"
        name="dataSafety.confirmDestructive"
        checked={dataSafety.confirmDestructive}
        onChange={handleBooleanFieldChange}
      />
    </SettingGroup>
  );
});

SafetyPreferences.displayName = "SafetyPreferences";

export const PrivacyPreferences = memo(({ isDesktopMode = false }) => {
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { desktop, privacy } = appPreferences;
  const logLevelId = useId();

  return (
    <>
      {isDesktopMode ? (
        <SettingGroup title="Desktop app" keywords="desktop electron">
          <SwitchRow
            label="Open at login"
            keywords="launch startup"
            name="desktop.launchAtStartup"
            checked={desktop.launchAtStartup}
            onChange={handleBooleanFieldChange}
          />
          <SwitchRow
            label="Minimize to tray"
            keywords="menu bar background"
            name="desktop.minimizeToTray"
            checked={desktop.minimizeToTray}
            onChange={handleBooleanFieldChange}
          />
          <SwitchRow
            label="Hardware acceleration"
            hint="Turn off if the window flickers or draws wrong."
            keywords="gpu graphics"
            name="desktop.hardwareAcceleration"
            checked={desktop.hardwareAcceleration}
            onChange={handleBooleanFieldChange}
          />
          <SettingRow
            label="Updates"
            hint="Beta gets new versions first."
            keywords="update channel release"
            control={
              <SettingSegmented
                name="desktop.updateChannel"
                value={desktop.updateChannel}
                options={UPDATE_CHANNEL_OPTIONS}
                onChange={handleSelectFieldChange}
                ariaLabel="Update channel"
              />
            }
          />
        </SettingGroup>
      ) : null}

      <SettingGroup title="Diagnostics" keywords="privacy data">
        <SwitchRow
          label="Usage analytics"
          keywords="tracking statistics"
          name="privacy.analyticsEnabled"
          checked={privacy.analyticsEnabled}
          onChange={handleBooleanFieldChange}
        />
        <SwitchRow
          label="Crash reports"
          keywords="errors diagnostics"
          name="privacy.crashReportsEnabled"
          checked={privacy.crashReportsEnabled}
          onChange={handleBooleanFieldChange}
        />
      </SettingGroup>

      <SettingGroup title="For developers" keywords="advanced debug">
        <SwitchRow
          label="Developer mode"
          keywords="dev tools debug"
          name="desktop.devMode"
          checked={desktop.devMode}
          onChange={handleBooleanFieldChange}
        />
        <SettingRow
          label="Log level"
          keywords="logging debug warn error"
          controlId={logLevelId}
          control={
            <SettingSelect
              id={logLevelId}
              name="privacy.logLevel"
              value={privacy.logLevel}
              onChange={handleSelectFieldChange}
            >
              <option value="off">Off</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="debug">Everything (debug)</option>
            </SettingSelect>
          }
        />
      </SettingGroup>
    </>
  );
});

PrivacyPreferences.displayName = "PrivacyPreferences";

export const ImportExportPreferences = memo(() => {
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { importExport } = appPreferences;
  const duplicateId = useId();

  return (
    <SettingGroup title="Import and export files" keywords="import export deck file">
      <SettingRow
        label="When a word is already in the deck"
        keywords="duplicate strategy merge"
        controlId={duplicateId}
        control={
          <SettingSelect
            id={duplicateId}
            name="importExport.duplicateStrategy"
            value={importExport.duplicateStrategy}
            onChange={handleSelectFieldChange}
          >
            <option value="skip">Skip it</option>
            <option value="update">Update it</option>
            <option value="keep_both">Keep both</option>
          </SettingSelect>
        }
      />
      <SettingRow
        label="Export as"
        keywords="export format file type"
        control={
          <SettingSegmented
            name="importExport.exportFormat"
            value={importExport.exportFormat}
            options={EXPORT_FORMAT_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel="Export as"
          />
        }
      />
      <SwitchRow
        label="Include examples"
        keywords="export sentences"
        name="importExport.includeExamples"
        checked={importExport.includeExamples}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label="Include tags"
        keywords="export labels"
        name="importExport.includeTags"
        checked={importExport.includeTags}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label="Check languages after choosing a file"
        hint="Opens the language check before importing."
        keywords="import language review"
        name="importExport.autoOpenLanguageReview"
        checked={importExport.autoOpenLanguageReview}
        onChange={handleBooleanFieldChange}
      />
    </SettingGroup>
  );
});

ImportExportPreferences.displayName = "ImportExportPreferences";
