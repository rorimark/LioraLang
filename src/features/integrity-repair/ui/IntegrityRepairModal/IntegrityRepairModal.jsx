import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./IntegrityRepairModal.css";

const DEFAULT_ISSUES_LIMIT = 5;

export const IntegrityRepairModal = memo(
  ({
    isOpen,
    issues = [],
    isRepairing = false,
    onConfirm,
    onClose,
  }) => {
    const normalizedIssues = Array.isArray(issues) ? issues.filter(Boolean) : [];
    const visibleIssues = normalizedIssues.slice(0, DEFAULT_ISSUES_LIMIT);
    const hiddenIssuesCount = Math.max(0, normalizedIssues.length - visibleIssues.length);

    return (
      <ActionModal
        dialog={{
          isOpen,
          title: "Repair database integrity",
          description:
            "Integrity issues were found. Repair will restore the database to its initial structure and may remove changed data.",
          confirmLabel: "Repair database",
          isConfirming: isRepairing,
          onConfirm,
          onClose,
        }}
      >
        <div className="integrity-repair-modal__body">
          <p className="integrity-repair-modal__title">Detected issues:</p>
          <ul className="integrity-repair-modal__issues">
            {visibleIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          {hiddenIssuesCount > 0 && (
            <p className="integrity-repair-modal__more">
              And {hiddenIssuesCount} more issue
              {hiddenIssuesCount === 1 ? "" : "s"}.
            </p>
          )}
          <p className="integrity-repair-modal__warning">
            Backups will be created automatically before repair.
          </p>
        </div>
      </ActionModal>
    );
  },
);

IntegrityRepairModal.displayName = "IntegrityRepairModal";
