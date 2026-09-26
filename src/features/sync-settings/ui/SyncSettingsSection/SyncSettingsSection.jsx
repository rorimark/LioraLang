import { memo, useId } from "react";
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
import {
  Button,
  InlineAlert,
  SettingContent,
  SettingGroup,
  SettingRow,
  SettingSwitch,
} from "@shared/ui";
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

  return (
    <section className="sync-settings-section">
      <SettingGroup title="Status" keywords="sync cloud devices">
        <SettingContent>
          <div className={resolveSummaryClassName(summary.tone)}>
            <span className="sync-settings-section__summary-icon" aria-hidden="true">
              <SummaryIcon />
            </span>
            <span className="sync-settings-section__summary-copy">
              <strong>{summary.label}</strong>
              <span>{summary.text}</span>
            </span>
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

          {status.lastErrorMessage ? (
            <div className="sync-settings-section__error">
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
            </div>
          ) : null}

          <dl className="sync-settings-section__stats">
            <div className={resolveStatClassName()}>
              <dt>
                <FiHardDrive aria-hidden="true" />
                Deck changes waiting
              </dt>
              <dd>{status.pendingDeckChanges}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiCloudLightning aria-hidden="true" />
                Progress waiting
              </dt>
              <dd>{status.pendingProgressChanges}</dd>
            </div>
            <div className={resolveStatClassName(status.lastErrorMessage ? "danger" : "")}>
              <dt>
                <FiClock aria-hidden="true" />
                Last synced
              </dt>
              <dd>{formatTimestamp(lastCompletedSyncAt)}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiGitMerge aria-hidden="true" />
                Conflicts resolved
              </dt>
              <dd>{status.autoResolvedConflictsCount}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiUser aria-hidden="true" />
                Account
              </dt>
              <dd>{status.accountEmail || "Guest"}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiSmartphone aria-hidden="true" />
                Device
              </dt>
              <dd>{status.deviceName || "This device"}</dd>
            </div>
          </dl>
        </SettingContent>
      </SettingGroup>

      <SettingGroup title="How it syncs" keywords="sync automatic background">
        <SyncSwitchRow
          label="Sync in the background"
          keywords="auto automatic"
          checked={status.autoSync}
          onChange={(event) => updatePreference("autoSync", event.target.checked)}
        />
        <SyncSwitchRow
          label="Check when the app opens"
          keywords="launch start"
          checked={status.syncOnLaunch}
          onChange={(event) => updatePreference("syncOnLaunch", event.target.checked)}
        />
        <SyncSwitchRow
          label="Keep my copy on a conflict"
          hint="When a deck changed here and on another device, both versions are kept."
          keywords="conflict local copy"
          checked={status.keepLocalCopyOnConflict}
          onChange={(event) => updatePreference("keepLocalCopyOnConflict", event.target.checked)}
        />
        <SyncSwitchRow
          label="Tell me when sync fails"
          keywords="errors notify"
          checked={status.notifyOnError}
          onChange={(event) => updatePreference("notifyOnError", event.target.checked)}
        />
      </SettingGroup>
    </section>
  );
});

const SyncSwitchRow = memo(({ label, hint, keywords, checked, onChange }) => {
  const id = useId();

  return (
    <SettingRow
      label={label}
      hint={hint}
      keywords={keywords}
      controlId={id}
      control={<SettingSwitch id={id} checked={checked} onChange={onChange} />}
    />
  );
});

SyncSwitchRow.displayName = "SyncSwitchRow";

SyncSettingsSection.displayName = "SyncSettingsSection";
