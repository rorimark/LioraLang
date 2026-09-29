import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./IntegrityRepairModal.css";
import { useI18n } from "@shared/lib/i18n";

const DEFAULT_ISSUES_LIMIT = 5;

export const IntegrityRepairModal = memo(
  ({
    isOpen,
    issues = [],
    isRepairing = false,
    onConfirm,
    onClose,
  }) => {
    const { t } = useI18n();
    const normalizedIssues = Array.isArray(issues) ? issues.filter(Boolean) : [];
    const visibleIssues = normalizedIssues.slice(0, DEFAULT_ISSUES_LIMIT);
    const hiddenIssuesCount = Math.max(0, normalizedIssues.length - visibleIssues.length);

    return (
      <ActionModal
        dialog={{
          isOpen,
          title: t("repair.title"),
          description: t("repair.description"),
          confirmLabel: t("repair.confirm"),
          isConfirming: isRepairing,
          onConfirm,
          onClose,
        }}
      >
        <div className="integrity-repair-modal__body">
          <p className="integrity-repair-modal__title">{t("repair.issues")}</p>
          <ul className="integrity-repair-modal__issues">
            {visibleIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          {hiddenIssuesCount > 0 && (
            <p className="integrity-repair-modal__more">
              {t("repair.more", { count: hiddenIssuesCount })}
            </p>
          )}
          <p className="integrity-repair-modal__warning">
            {t("repair.backupNote")}
          </p>
        </div>
      </ActionModal>
    );
  },
);

IntegrityRepairModal.displayName = "IntegrityRepairModal";
