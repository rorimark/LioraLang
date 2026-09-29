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
import { useI18n } from "@shared/lib/i18n";

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

// The platform names a device in English when it has no better name.
const DEVICE_NAME_KEYS = { "Web browser": "sync.deviceWeb", "Desktop app": "account.desktopApp" };

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
  const { t, formatNumber } = useI18n();
  const SummaryIcon = SUMMARY_ICON_BY_TONE[summary.tone] || FiCloud;

  return (
    <section className="sync-settings-section">
      <SettingGroup title={t("sync.status")} keywords="sync cloud devices">
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
              isLoading={isRunningNow}
              disabled={!canSyncNow}
            >
              <FiRefreshCw aria-hidden="true" />
              <span>{t("sync.now")}</span>
            </Button>
          </div>

          {status.lastErrorMessage ? (
            <div className="sync-settings-section__error">
              <InlineAlert
                variant="error"
                text={t("sync.lastError", { message: status.lastErrorMessage })}
                action={{
                  label: t("sync.clear"),
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
                {t("sync.deckChanges")}
              </dt>
              <dd>{formatNumber(status.pendingDeckChanges)}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiCloudLightning aria-hidden="true" />
                {t("sync.progressChanges")}
              </dt>
              <dd>{formatNumber(status.pendingProgressChanges)}</dd>
            </div>
            <div className={resolveStatClassName(status.lastErrorMessage ? "danger" : "")}>
              <dt>
                <FiClock aria-hidden="true" />
                {t("sync.lastSynced")}
              </dt>
              <dd>{formatTimestamp(lastCompletedSyncAt)}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiGitMerge aria-hidden="true" />
                {t("sync.conflicts")}
              </dt>
              <dd>{formatNumber(status.autoResolvedConflictsCount)}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiUser aria-hidden="true" />
                {t("nav.account")}
              </dt>
              <dd>{status.accountEmail || t("settingsPage.account.guestBadge")}</dd>
            </div>
            <div className={resolveStatClassName()}>
              <dt>
                <FiSmartphone aria-hidden="true" />
                {t("sync.device")}
              </dt>
              <dd>
                {DEVICE_NAME_KEYS[status.deviceName]
                  ? t(DEVICE_NAME_KEYS[status.deviceName])
                  : status.deviceName || t("deleteDeck.device")}
              </dd>
            </div>
          </dl>
        </SettingContent>
      </SettingGroup>

      <SettingGroup title={t("sync.how")} keywords="sync automatic background">
        <SyncSwitchRow
          label={t("sync.background")}
          keywords="auto automatic"
          checked={status.autoSync}
          onChange={(event) => updatePreference("autoSync", event.target.checked)}
        />
        <SyncSwitchRow
          label={t("sync.onLaunch")}
          keywords="launch start"
          checked={status.syncOnLaunch}
          onChange={(event) => updatePreference("syncOnLaunch", event.target.checked)}
        />
        <SyncSwitchRow
          label={t("sync.keepCopy")}
          hint={t("sync.keepCopyHint")}
          keywords="conflict local copy"
          checked={status.keepLocalCopyOnConflict}
          onChange={(event) => updatePreference("keepLocalCopyOnConflict", event.target.checked)}
        />
        <SyncSwitchRow
          label={t("sync.notify")}
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
