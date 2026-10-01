import { memo, useId } from "react";
import { FiFlag } from "react-icons/fi";
import { ActionModal, Button } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { REPORT_NOTE_MAX, REPORT_REASONS, useReportDeck } from "../model/useReportDeck";
import "./ReportDeckButton.css";

// A quiet flag next to a Hub deck's other actions. It opens a short form:
// what is wrong, and a note if the person wants to add one.
export const ReportDeckButton = memo(({ deckId, deckTitle = "" }) => {
  const { t } = useI18n();
  const report = useReportDeck(deckId);
  const noteId = useId();
  const groupName = useId();

  if (!report.isAvailable || !deckId) {
    return null;
  }

  const isDone = Boolean(report.outcome);

  return (
    <>
      <Button
        variant="ghost"
        className="hub-card__link"
        onClick={report.open}
        aria-label={t("hubReport.open")}
        title={t("hubReport.open")}
      >
        <FiFlag aria-hidden="true" />
      </Button>
      <ActionModal
        dialog={{
          isOpen: report.isOpen,
          title: t("hubReport.title", { name: deckTitle }),
          description: isDone ? t(`hubReport.outcome.${report.outcome}`) : t("hubReport.description"),
          confirmLabel: t("hubReport.send"),
          isConfirming: report.isSending,
          isConfirmDisabled: !report.reason,
          onConfirm: report.send,
          onClose: report.close,
          renderActions: isDone
            ? ({ onClose }) => (
                <div className="action-modal__actions">
                  <button type="button" className="action-modal__confirm" onClick={onClose} data-autofocus>
                    {t("hubReport.close")}
                  </button>
                </div>
              )
            : undefined,
        }}
      >
        {isDone ? null : (
          <div className="hub-report">
            <fieldset className="hub-report__reasons">
              <legend>{t("hubReport.reasonLabel")}</legend>
              {REPORT_REASONS.map((reason) => (
                <label key={reason} className="hub-report__reason">
                  <input
                    type="radio"
                    name={groupName}
                    value={reason}
                    checked={report.reason === reason}
                    onChange={() => report.setReason(reason)}
                  />
                  <span>{t(`hubReport.reasons.${reason}`)}</span>
                </label>
              ))}
            </fieldset>
            <label className="hub-report__note" htmlFor={noteId}>
              <span>{t("hubReport.noteLabel")}</span>
              <textarea
                id={noteId}
                rows={3}
                maxLength={REPORT_NOTE_MAX}
                value={report.note}
                onChange={(event) => report.setNote(event.target.value)}
                placeholder={t("hubReport.notePlaceholder")}
              />
            </label>
          </div>
        )}
      </ActionModal>
    </>
  );
});

ReportDeckButton.displayName = "ReportDeckButton";
