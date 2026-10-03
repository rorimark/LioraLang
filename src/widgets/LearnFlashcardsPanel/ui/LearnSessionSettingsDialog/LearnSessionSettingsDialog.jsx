import { memo, useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FiArrowRight, FiBookOpen, FiCheck, FiSliders, FiX } from "react-icons/fi";
import { useDialogA11y } from "@shared/lib/a11y";
import { useI18n } from "@shared/lib/i18n";
import {
  Button,
  Select,
  SettingGroup,
  SettingRow,
  SettingSegmented,
  SettingStepper,
  SettingSwitch,
} from "@shared/ui";
import {
  LEARN_SESSION_DIRECTION_MIXED,
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
} from "../../model/learnSessionSettings";
import { resolveDeckSideLabels } from "../../model/deckSideLabels";
import "./LearnSessionSettingsDialog.css";

const AUTO_FLIP_VALUES = ["off", "1s", "2s", "3s"];
const SHUFFLE_VALUES = ["off", "per_session", "always"];
const DETAIL_SETTINGS = [
  { key: "showExamples", message: "examples", handler: "onShowExamplesChange" },
  { key: "showLevel", message: "level", handler: "onShowLevelChange" },
  { key: "showPartOfSpeech", message: "partOfSpeech", handler: "onShowPartOfSpeechChange" },
];

export const LearnSessionSettingsDialog = memo(({ sessionControl }) => {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const dialog = sessionControl || {};
  const settings = dialog.sessionSettings || {};
  const isSrs = dialog.learnViewMode === "srs";
  const contentRef = useRef(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  // What the deck is about decides which directions and card details
  // there are to choose from.
  const allowedDirections = dialog.subjectProfile?.directions;
  const cardDetails = dialog.subjectProfile?.cardDetails;
  const directionOptions = useMemo(() => {
    const { source, target } = resolveDeckSideLabels(dialog.currentDeck, i18n);
    return [
      { value: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET, label: `${source} → ${target}` },
      { value: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE, label: `${target} → ${source}` },
      { value: LEARN_SESSION_DIRECTION_MIXED, label: `${source} ↔ ${target}` },
    ].filter((option) => !allowedDirections || allowedDirections.includes(option.value));
  }, [allowedDirections, dialog.currentDeck, i18n]);
  const detailSettings = useMemo(
    () => DETAIL_SETTINGS.filter(({ key }) => !cardDetails || cardDetails.includes(key)),
    [cardDetails],
  );

  const autoFlipOptions = useMemo(() => {
    const seconds = new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "second",
      unitDisplay: "short",
    });
    return AUTO_FLIP_VALUES.map((value, index) => ({
      value,
      label: index ? seconds.format(index) : t("session.off"),
    }));
  }, [locale, t]);

  useDialogA11y({
    isOpen: dialog.isOpen,
    containerRef: contentRef,
    onClose: dialog.onClose,
    initialFocusSelector: "[data-dialog-close]",
  });

  useEffect(() => {
    if (!dialog.isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [dialog.isOpen]);

  if (!dialog.isOpen) return null;

  return createPortal(
    <div className="learn-session-dialog">
      <button
        type="button"
        className="learn-session-dialog__overlay"
        onClick={dialog.onClose}
        aria-hidden="true"
        tabIndex={-1}
      />
      <section
        className="learn-session-dialog__content"
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="learn-session-dialog__header">
          <span className="learn-session-dialog__title-icon" aria-hidden="true"><FiSliders /></span>
          <div className="learn-session-dialog__title-copy">
            <h2 id={titleId}>{t("learn.sessionSettings")}</h2>
            <p id={descriptionId}>
              <FiBookOpen aria-hidden="true" />
              <span>{dialog.currentDeck?.name || t("learn.exercise.flashcards")}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            className="learn-session-dialog__close"
            onClick={dialog.onClose}
            aria-label={t("session.close")}
            data-dialog-close
          ><FiX aria-hidden="true" /></Button>
        </header>

        <div className="learn-session-dialog__body">
          <div className="learn-session-dialog__setup">
            <SettingGroup>
              <SettingRow
                label={t("session.engine.title")}
                hint={t(isSrs ? "session.engine.srsDescription" : "session.engine.reviewDescription")}
                control={
                  <SettingSegmented
                    name={`${id}-engine`}
                    value={isSrs ? "srs" : "browse"}
                    ariaLabel={t("session.engine.title")}
                    options={[
                      { value: "browse", label: t("learn.engine.review") },
                      { value: "srs", label: t("learn.engine.srs") },
                    ]}
                    onChange={(event) => event.target.value === "srs"
                      ? dialog.onSwitchToSrsMode() : dialog.onSwitchToBrowseMode()}
                  />
                }
              />
              {dialog.presentationOptions?.length > 1 ? <SettingRow
                label={t("studyPresentation.label")} hint={t("studyPresentation.shared")}
                control={<Select aria-label={t("studyPresentation.label")} label={t("studyPresentation.label")} value={dialog.presentationMode} onChange={(event) => dialog.onPresentationModeChange(event.target.value)}>
                  {dialog.presentationOptions.map((option) => <option key={option.id} value={option.id}>{t(option.labelKey)}</option>)}
                </Select>}
              /> : null}
              {directionOptions.length > 1 && (!dialog.presentationMode || dialog.presentationMode === "text") ? (
                <SettingRow
                  label={t("session.direction.title")}
                  wide
                  control={
                    <SettingSegmented
                      name={`${id}-direction`}
                      value={settings.directionMode}
                      ariaLabel={t("session.direction.title")}
                      options={directionOptions}
                      onChange={(event) => dialog.onDirectionModeChange(event.target.value)}
                    />
                  }
                />
              ) : null}
            </SettingGroup>
          </div>

          <SettingGroup title={t("session.behavior")}>
            <SettingRow
              label={t("prefs.dailyGoal")}
              hint={t("prefs.aTargetForDistinctCards")}
              controlId={`${id}-goal`}
              control={<SettingStepper
                id={`${id}-goal`}
                name="dailyGoal"
                value={settings.dailyGoal}
                min={1}
                max={999}
                step={5}
                ariaLabel={t("prefs.dailyGoal")}
                onChange={dialog.onDailyGoalChange}
              />}
            />
            <SettingRow
              label={t("prefs.flipByItselfAfter")}
              control={<SettingSegmented
                name={`${id}-auto-flip`}
                value={settings.autoFlipDelay}
                ariaLabel={t("prefs.flipByItselfAfter")}
                options={autoFlipOptions}
                onChange={dialog.onAutoFlipDelayChange}
              />}
              wide
            />
            {isSrs ? <>
              <SettingRow
                label={t("session.shuffle.title")}
                control={<SettingSegmented
                  name={`${id}-shuffle`}
                  value={settings.shuffleMode}
                  ariaLabel={t("session.shuffle.title")}
                  options={SHUFFLE_VALUES.map((value) => ({ value, label: t(`session.shuffle.${value}`) }))}
                  onChange={dialog.onShuffleModeChange}
                />}
                wide
              />
              <SettingRow
                label={t("session.repeatMissed.title")}
                hint={t("session.repeatMissed.hint")}
                controlId={`${id}-repeat`}
                control={<SettingSwitch
                  id={`${id}-repeat`}
                  checked={settings.repeatWrongCards}
                  onChange={dialog.onRepeatWrongCardsChange}
                />}
              />
            </> : null}
          </SettingGroup>

          {detailSettings.length > 0 ? <SettingGroup title={t("session.cardDetails")}>
            {detailSettings.map(({ key, message, handler }) => (
              <SettingRow
                key={key}
                label={t(`session.${message}.title`)}
                hint={t(`session.${message}.hint`)}
                controlId={`${id}-${key}`}
                control={<SettingSwitch id={`${id}-${key}`} checked={settings[key]} onChange={dialog[handler]} />}
              />
            ))}
          </SettingGroup> : null}
        </div>

        <footer className="learn-session-dialog__footer">
          <p><FiCheck aria-hidden="true" />{t("session.appliesImmediately")}</p>
          <Button variant="primary" onClick={dialog.onClose}>
            {t("session.backToCards")}<FiArrowRight aria-hidden="true" />
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
});

LearnSessionSettingsDialog.displayName = "LearnSessionSettingsDialog";
