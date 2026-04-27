import { memo } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCloud,
  FiCloudLightning,
  FiCloudOff,
  FiGitMerge,
  FiHardDrive,
  FiRefreshCw,
  FiSmartphone,
  FiUser,
} from "react-icons/fi";
import { Button, InlineAlert, MetaBadge } from "@shared/ui";
import { useSyncSettingsSection } from "../../model/useSyncSettingsSection";
import "./SyncSettingsSection.css";

const SUMMARY_ICON_BY_TONE = {
  muted: FiCloud,
  accent: FiRefreshCw,
  success: FiCheckCircle,
  warning: FiCloudOff,
  danger: FiAlertCircle,
};

const resolveSummaryClassName = (tone) => {
  return [
    "sync-settings-section__summary",
    tone ? `sync-settings-section__summary--${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const resolveStatClassName = (tone = "") => {
  return [
    "sync-settings-section__stat",
    tone ? `sync-settings-section__stat--${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

export const SyncSettingsSection = memo(() => {
  const {
    status,
    isRunningNow,
    runSyncNow,
    clearError,
    updatePreference,
    summary,
    canSyncNow,
    formatTimestamp,
    lastCompletedSyncAt,
  } = useSyncSettingsSection();
  const SummaryIcon = SUMMARY_ICON_BY_TONE[summary.tone] || FiCloud;
  const isAccentBadge = summary.tone === "accent" || summary.tone === "success";

  return (
    <section className="sync-settings-section">
      <div className="sync-settings-section__toolbar">
        <MetaBadge text={summary.label} accent={isAccentBadge} />

        <div className="sync-settings-section__actions">
          <Button
            type="button"
            variant="primary"
            onClick={runSyncNow}
            isLoading={isRunningNow || status.syncing}
            disabled={!canSyncNow}
          >
            <FiRefreshCw aria-hidden="true" />
            <span>Sync now</span>
          </Button>
        </div>
      </div>

      <div className={resolveSummaryClassName(summary.tone)}>
        <div className="sync-settings-section__summary-icon" aria-hidden="true">
          <SummaryIcon />
        </div>
        <div className="sync-settings-section__summary-copy">
          <p>{summary.text}</p>
          {status.accountEmail ? (
            <span>{status.accountEmail}</span>
          ) : null}
        </div>
      </div>

      {status.lastErrorMessage ? (
        <InlineAlert
          variant="error"
          text={status.lastErrorMessage}
          action={{
            label: "Clear",
            onClick: clearError,
            disableAutoClose: true,
          }}
          disableAutoClose
        />
      ) : null}

      <div className="sync-settings-section__stats-grid">
        <article className={resolveStatClassName()}>
          <div className="sync-settings-section__stat-head">
            <FiHardDrive aria-hidden="true" />
            <span>Deck changes waiting</span>
          </div>
          <strong>{status.pendingDeckChanges}</strong>
        </article>

        <article className={resolveStatClassName()}>
          <div className="sync-settings-section__stat-head">
            <FiCloudLightning aria-hidden="true" />
            <span>Progress events waiting</span>
          </div>
          <strong>{status.pendingProgressChanges}</strong>
        </article>

        <article className={resolveStatClassName(status.lastErrorMessage ? "danger" : "") }>
          <div className="sync-settings-section__stat-head">
            <FiClock aria-hidden="true" />
            <span>Last successful sync</span>
          </div>
          <strong>{formatTimestamp(lastCompletedSyncAt)}</strong>
        </article>

        <article className={resolveStatClassName()}>
          <div className="sync-settings-section__stat-head">
            <FiGitMerge aria-hidden="true" />
            <span>Auto-resolved conflicts</span>
          </div>
          <strong>{status.autoResolvedConflictsCount}</strong>
        </article>
      </div>

      <div className="sync-settings-section__meta-grid">
        <div className="sync-settings-section__meta-item">
          <FiUser aria-hidden="true" />
          <div>
            <span>Account</span>
            <strong>{status.accountEmail || "Guest mode"}</strong>
          </div>
        </div>

        <div className="sync-settings-section__meta-item">
          <FiSmartphone aria-hidden="true" />
          <div>
            <span>Device</span>
            <strong>{status.deviceName || "This device"}</strong>
          </div>
        </div>
      </div>

      <div className="sync-settings-section__checks-grid">
        <label className="sync-settings-section__check">
          <input
            type="checkbox"
            checked={status.autoSync}
            onChange={(event) => updatePreference("autoSync", event.target.checked)}
          />
          <span>Auto sync in background</span>
        </label>

        <label className="sync-settings-section__check">
          <input
            type="checkbox"
            checked={status.syncOnLaunch}
            onChange={(event) => updatePreference("syncOnLaunch", event.target.checked)}
          />
          <span>Run a sync check when the app opens</span>
        </label>

        <label className="sync-settings-section__check">
          <input
            type="checkbox"
            checked={status.keepLocalCopyOnConflict}
            onChange={(event) =>
              updatePreference("keepLocalCopyOnConflict", event.target.checked)
            }
          />
          <span>Keep a local copy when a remote deck changed too</span>
        </label>

        <label className="sync-settings-section__check">
          <input
            type="checkbox"
            checked={status.notifyOnError}
            onChange={(event) => updatePreference("notifyOnError", event.target.checked)}
          />
          <span>Show sync errors clearly instead of failing silently</span>
        </label>
      </div>
    </section>
  );
});

SyncSettingsSection.displayName = "SyncSettingsSection";
