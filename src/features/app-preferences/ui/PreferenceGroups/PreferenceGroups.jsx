import { memo, useId } from "react";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import {
  Button,
  SettingGroup,
  SettingRow,
  SettingSegmented,
  SettingSelect,
  SettingStepper,
  SettingSwitch,
} from "@shared/ui";
import { useAppPreferencesSection } from "../../model";
import "./PreferenceGroups.css";
import { AUTO_LOCALE, INTERFACE_LOCALES, useI18n } from "@shared/lib/i18n";

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

const renderLanguageOptions = ({ languageName }) =>
  LANGUAGE_OPTIONS.map((language) => (
    <option key={language} value={language}>
      {languageName(language)}
    </option>
  ));

const renderPartOptions = ({ partOfSpeechName }) =>
  PART_OF_SPEECH_OPTIONS.map((part) => (
    <option key={part} value={part}>
      {partOfSpeechName(part)}
    </option>
  ));

const FONT_SCALE_OPTIONS = (t) => [
  { value: "small", label: t("prefs.small") },
  { value: "normal", label: t("prefs.normal") },
  { value: "large", label: t("prefs.large") },
];

const STUDY_MODE_OPTIONS = (t) => [
  { value: "srs", label: "SRS" },
  { value: "review", label: t("prefs.review") },
];

const AUTO_FLIP_OPTIONS = (t) => [
  { value: "off", label: t("prefs.off") },
  { value: "1s", label: t("session.seconds", { count: 1 }) },
  { value: "2s", label: t("session.seconds", { count: 2 }) },
  { value: "3s", label: t("session.seconds", { count: 3 }) },
];

const SHUFFLE_OPTIONS = (t) => [
  { value: "off", label: t("prefs.off") },
  { value: "per_session", label: t("prefs.perSession") },
  { value: "always", label: t("prefs.always") },
];

const BACKUP_OPTIONS = (t) => [
  { value: "off", label: t("prefs.off") },
  { value: "daily", label: t("prefs.daily") },
  { value: "weekly", label: t("prefs.weekly") },
  { value: "monthly", label: t("prefs.monthly") },
];

const UPDATE_CHANNEL_OPTIONS = (t) => [
  { value: "stable", label: t("prefs.stable") },
  { value: "beta", label: t("prefs.beta") },
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

// The word for "language" in every language offered, so the row can be
// found by someone who has landed in a language they cannot read.
const LANGUAGE_KEYWORDS =
  "language interface translation locale мова язык język sprache idioma langue lingua dil jazyk 言語";

export const DisplayPreferences = memo(() => {
  const i18n = useI18n();
  const { t } = i18n;
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { uiAccessibility } = appPreferences;
  const languageId = useId();

  return (
    <>
      <SettingRow
        label={t("prefs.interfaceLanguage")}
        hint={t("prefs.interfaceLanguageHint")}
        keywords={LANGUAGE_KEYWORDS}
        controlId={languageId}
        control={
          <SettingSelect
            id={languageId}
            name="uiAccessibility.interfaceLanguage"
            value={uiAccessibility.interfaceLanguage}
            onChange={handleSelectFieldChange}
          >
            <option value={AUTO_LOCALE}>{t("prefs.interfaceLanguageAuto")}</option>
            {INTERFACE_LOCALES.map((item) => (
              <option key={item.code} value={item.code} lang={item.code}>
                {item.nativeName}
              </option>
            ))}
          </SettingSelect>
        }
      />
      <SettingRow
        label={t("prefs.textSize")}
        keywords="font scale zoom bigger smaller accessibility"
        control={
          <SettingSegmented
            name="uiAccessibility.fontScale"
            value={uiAccessibility.fontScale}
            options={FONT_SCALE_OPTIONS(t)}
            onChange={handleSelectFieldChange}
            ariaLabel={t("prefs.textSize")}
          />
        }
      />
      <SwitchRow
        label={t("prefs.compactLayout")}
        hint={t("prefs.tighterSpacingMoreOnThe")}
        keywords="density dense accessibility"
        name="uiAccessibility.compactMode"
        checked={uiAccessibility.compactMode}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label={t("prefs.reduceMotion")}
        hint={t("prefs.animationsAreSwitchedOffChanges")}
        keywords="animation accessibility"
        name="uiAccessibility.reducedMotion"
        checked={uiAccessibility.reducedMotion}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label={t("prefs.highContrast")}
        hint={t("prefs.strongerBordersAndNoShadows")}
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
  const i18n = useI18n();
  const { t } = i18n;
  const {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
    handleTextFieldChange,
    resetSrsDefaults,
  } = useAppPreferencesSection();
  const { studySession, spacedRepetition } = appPreferences;
  const stepsId = useId();

  return (
    <>
      <SettingGroup title={t("prefs.sessions")} keywords="study learn">
        <SettingRow
          label={t("prefs.startLearnIn")}
          hint={t("prefs.srsBringsTheCardsThat")}
          keywords="default study mode srs review"
          control={
            <SettingSegmented
              name="studySession.defaultStudyMode"
              value={studySession.defaultStudyMode}
              options={STUDY_MODE_OPTIONS(t)}
              onChange={handleSelectFieldChange}
              ariaLabel={t("prefs.startLearnIn")}
            />
          }
        />
        <SettingRow
          label={t("prefs.dailyGoal")}
          hint={t("prefs.aTargetForDistinctCards")}
          keywords="cards target"
          control={
            <SettingStepper
              name="studySession.dailyGoal"
              value={studySession.dailyGoal}
              min={1}
              max={999}
              step={5}
              onChange={handleNumberFieldChange}
              ariaLabel={t("prefs.dailyGoal")}
            />
          }
        />
        <SettingRow
          label={t("prefs.flipByItselfAfter")}
          hint={t("prefs.turnsTheCardOverFor")}
          keywords="auto flip delay timer"
          control={
            <SettingSegmented
              name="studySession.autoFlipDelay"
              value={studySession.autoFlipDelay}
              options={AUTO_FLIP_OPTIONS(t)}
              onChange={handleSelectFieldChange}
              ariaLabel={t("prefs.flipByItselfAfter")}
            />
          }
        />
        <SettingRow
          label={t("prefs.shuffle")}
          hint={t("prefs.theOrderTheCardsCome")}
          keywords="random order"
          control={
            <SettingSegmented
              name="studySession.shuffleMode"
              value={studySession.shuffleMode}
              options={SHUFFLE_OPTIONS(t)}
              onChange={handleSelectFieldChange}
              ariaLabel={t("prefs.shuffle")}
            />
          }
        />
        <SwitchRow
          label={t("prefs.repeatMissedCardsSooner")}
          hint={t("prefs.againBringsTheCardBack")}
          keywords="wrong again repeat"
          name="studySession.repeatWrongCards"
          checked={studySession.repeatWrongCards}
          onChange={handleBooleanFieldChange}
        />
      </SettingGroup>

      <SettingGroup
        title={t("prefs.spacedRepetition")}
        description={t("prefs.howOftenWordsComeBack")}
        keywords="srs schedule interval algorithm"
      >
        <SettingRow
          label={t("prefs.recommendedSchedule")}
          hint={t("prefs.useTheCurrentDefaultsFor")}
          control={<Button type="button" onClick={resetSrsDefaults}>{t("prefs.useRecommendedSettings")}</Button>}
        />
        <SettingRow
          label={t("prefs.newWordsADay")}
          hint={t("prefs.newWordsIntroducedPerDeck")}
          keywords="new cards per day limit"
          control={
            <SettingStepper
              name="spacedRepetition.newCardsPerDay"
              value={spacedRepetition.newCardsPerDay}
              min={0}
              max={999}
              step={5}
              onChange={handleNumberFieldChange}
              ariaLabel={t("prefs.newWordsADay")}
            />
          }
        />
        <SettingRow
          label={t("prefs.reviewsADay")}
          hint={t("prefs.distinctReviewCardsPerDeck")}
          keywords="max reviews per day limit"
          control={
            <SettingStepper
              name="spacedRepetition.maxReviewsPerDay"
              value={spacedRepetition.maxReviewsPerDay}
              min={0}
              max={2000}
              step={10}
              onChange={handleNumberFieldChange}
              ariaLabel={t("prefs.reviewsADay")}
            />
          }
        />
        <SettingRow
          label={t("prefs.learningSteps")}
          hint={t("prefs.default10mAgainWaits10")}
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
          label={t("prefs.easyBonus")}
          hint={t("prefs.easyStretchesTheNextWait")}
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
              ariaLabel={t("prefs.easyBonus")}
            />
          }
        />
        <SettingRow
          label={t("prefs.intervalRetainedAfterForgetting")}
          hint={t("prefs.aForgottenWordKeepsThis")}
          keywords="forgot again interval"
          control={
            <SettingStepper
              name="spacedRepetition.lapsePenalty"
              value={spacedRepetition.lapsePenalty}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={handleNumberFieldChange}
              ariaLabel={t("prefs.intervalRetainedAfterForgetting")}
            />
          }
        />
      </SettingGroup>
    </>
  );
});

LearningPreferences.displayName = "LearningPreferences";

export const DeckDefaultPreferences = memo(() => {
  const i18n = useI18n();
  const { t } = i18n;
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
        label={t("prefs.wordsIn")}
        keywords="source language"
        controlId={sourceId}
        control={
          <SettingSelect
            id={sourceId}
            name="deckDefaults.sourceLanguage"
            value={deckDefaults.sourceLanguage}
            onChange={handleSelectFieldChange}
          >
            {renderLanguageOptions(i18n)}
          </SettingSelect>
        }
      />
      <SettingRow
        label={t("prefs.translatedTo")}
        keywords="target language"
        controlId={targetId}
        control={
          <SettingSelect
            id={targetId}
            name="deckDefaults.targetLanguage"
            value={deckDefaults.targetLanguage}
            onChange={handleSelectFieldChange}
          >
            {renderLanguageOptions(i18n)}
          </SettingSelect>
        }
      />
      <SettingRow
        label={t("prefs.level")}
        keywords="cefr a1 a2 b1 b2 c1 c2"
        control={
          <SettingSegmented
            name="deckDefaults.level"
            value={deckDefaults.level}
            options={LEVEL_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel={t("prefs.level")}
          />
        }
      />
      <SettingRow
        label={t("prefs.partOfSpeech")}
        keywords="noun verb grammar"
        controlId={partId}
        control={
          <SettingSelect
            id={partId}
            name="deckDefaults.partOfSpeech"
            value={deckDefaults.partOfSpeech}
            onChange={handleSelectFieldChange}
          >
            {renderPartOptions(i18n)}
          </SettingSelect>
        }
      />
      <SettingRow
        label={t("prefs.tags")}
        hint={t("prefs.separatedByCommasUpTo")}
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
            placeholder={t("prefs.travelVerbs")}
            autoComplete="off"
          />
        }
      />
    </SettingGroup>
  );
});

DeckDefaultPreferences.displayName = "DeckDefaultPreferences";

export const SafetyPreferences = memo(() => {
  const i18n = useI18n();
  const { t } = i18n;
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
        label={t("prefs.backUpAutomatically")}
        keywords="auto backup interval schedule"
        control={
          <SettingSegmented
            name="dataSafety.autoBackupInterval"
            value={dataSafety.autoBackupInterval}
            options={BACKUP_OPTIONS(t)}
            onChange={handleSelectFieldChange}
            ariaLabel={t("prefs.backUpAutomatically")}
          />
        }
      />
      <SettingRow
        label={t("prefs.backupsToKeep")}
        hint={t("prefs.olderOnesAreRemoved")}
        keywords="max backups"
        control={
          <SettingStepper
            name="dataSafety.maxBackups"
            value={dataSafety.maxBackups}
            min={1}
            max={100}
            onChange={handleNumberFieldChange}
            ariaLabel={t("prefs.backupsToKeep")}
          />
        }
      />
      <SwitchRow
        label={t("prefs.askBeforeDeleting")}
        hint={t("prefs.confirmBeforeAnythingIsRemoved")}
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
  const { t } = useI18n();
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { desktop, privacy } = appPreferences;
  const logLevelId = useId();

  return (
    <>
      {isDesktopMode ? (
        <SettingGroup title={t("prefs.desktopApp")} keywords="desktop electron">
          <SwitchRow
            label={t("prefs.openAtLogin")}
            keywords="launch startup"
            name="desktop.launchAtStartup"
            checked={desktop.launchAtStartup}
            onChange={handleBooleanFieldChange}
          />
          <SwitchRow
            label={t("prefs.minimizeToTray")}
            keywords="menu bar background"
            name="desktop.minimizeToTray"
            checked={desktop.minimizeToTray}
            onChange={handleBooleanFieldChange}
          />
          <SwitchRow
            label={t("prefs.hardwareAcceleration")}
            hint={t("prefs.turnOffIfTheWindow")}
            keywords="gpu graphics"
            name="desktop.hardwareAcceleration"
            checked={desktop.hardwareAcceleration}
            onChange={handleBooleanFieldChange}
          />
          <SettingRow
            label={t("prefs.updates")}
            hint={t("prefs.betaGetsNewVersionsFirst")}
            keywords="update channel release"
            control={
              <SettingSegmented
                name="desktop.updateChannel"
                value={desktop.updateChannel}
                options={UPDATE_CHANNEL_OPTIONS(t)}
                onChange={handleSelectFieldChange}
                ariaLabel={t("prefs.updateChannel")}
              />
            }
          />
        </SettingGroup>
      ) : null}

      <SettingGroup title={t("prefs.diagnostics")} keywords="privacy data">
        <SwitchRow
          label={t("prefs.usageAnalytics")}
          keywords="tracking statistics"
          name="privacy.analyticsEnabled"
          checked={privacy.analyticsEnabled}
          onChange={handleBooleanFieldChange}
        />
        <SwitchRow
          label={t("prefs.crashReports")}
          keywords="errors diagnostics"
          name="privacy.crashReportsEnabled"
          checked={privacy.crashReportsEnabled}
          onChange={handleBooleanFieldChange}
        />
      </SettingGroup>

      <SettingGroup title={t("prefs.forDevelopers")} keywords="advanced debug">
        <SwitchRow
          label={t("prefs.developerMode")}
          keywords="dev tools debug"
          name="desktop.devMode"
          checked={desktop.devMode}
          onChange={handleBooleanFieldChange}
        />
        <SettingRow
          label={t("prefs.logLevel")}
          keywords="logging debug warn error"
          controlId={logLevelId}
          control={
            <SettingSelect
              id={logLevelId}
              name="privacy.logLevel"
              value={privacy.logLevel}
              onChange={handleSelectFieldChange}
            >
              <option value="off">{t("prefs.off")}</option>
              <option value="error">{t("prefs.errors")}</option>
              <option value="warn">{t("prefs.warnings")}</option>
              <option value="debug">{t("prefs.everythingDebug")}</option>
            </SettingSelect>
          }
        />
      </SettingGroup>
    </>
  );
});

PrivacyPreferences.displayName = "PrivacyPreferences";

export const ImportExportPreferences = memo(() => {
  const i18n = useI18n();
  const { t } = i18n;
  const { appPreferences, handleBooleanFieldChange, handleSelectFieldChange } =
    useAppPreferencesSection();
  const { importExport } = appPreferences;
  const duplicateId = useId();

  return (
    <SettingGroup title={t("prefs.importAndExportFiles")} keywords="import export deck file">
      <SettingRow
        label={t("prefs.whenAWordIsAlready")}
        keywords="duplicate strategy merge"
        controlId={duplicateId}
        control={
          <SettingSelect
            id={duplicateId}
            name="importExport.duplicateStrategy"
            value={importExport.duplicateStrategy}
            onChange={handleSelectFieldChange}
          >
            <option value="skip">{t("prefs.skipIt")}</option>
            <option value="update">{t("prefs.updateIt")}</option>
            <option value="keep_both">{t("prefs.keepBoth")}</option>
          </SettingSelect>
        }
      />
      <SettingRow
        label={t("prefs.exportAs")}
        keywords="export format file type"
        control={
          <SettingSegmented
            name="importExport.exportFormat"
            value={importExport.exportFormat}
            options={EXPORT_FORMAT_OPTIONS}
            onChange={handleSelectFieldChange}
            ariaLabel={t("prefs.exportAs")}
          />
        }
      />
      <SwitchRow
        label={t("prefs.includeExamples")}
        keywords="export sentences"
        name="importExport.includeExamples"
        checked={importExport.includeExamples}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label={t("prefs.includeTags")}
        keywords="export labels"
        name="importExport.includeTags"
        checked={importExport.includeTags}
        onChange={handleBooleanFieldChange}
      />
      <SwitchRow
        label={t("prefs.checkLanguagesAfterChoosingA")}
        hint={t("prefs.opensTheLanguageCheckBefore")}
        keywords="import language review"
        name="importExport.autoOpenLanguageReview"
        checked={importExport.autoOpenLanguageReview}
        onChange={handleBooleanFieldChange}
      />
    </SettingGroup>
  );
});

ImportExportPreferences.displayName = "ImportExportPreferences";
