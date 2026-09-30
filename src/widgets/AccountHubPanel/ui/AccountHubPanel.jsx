import { memo, useCallback, useId, useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiMonitor,
  FiShield,
  FiUploadCloud,
  FiUser,
  FiRefreshCw,
  FiSmartphone,
  FiTablet,
  FiTrash2,
} from "react-icons/fi";
import { Button, InlineAlert, SettingGroup, SettingRow, TextInput } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import {
  buildCardNumber,
  formatMemberSince,
  resolveCardName,
  useAccountCardStats,
  useAccountHubPanel,
} from "../model";
import { AccountCard } from "./AccountCard";
import "./AccountHubPanel.css";
import { useI18n } from "@shared/lib/i18n";

const renderDeckVersion = (deck, t) => {
  const version = Number.isFinite(Number(deck?.latestVersion?.version))
    ? Number(deck.latestVersion.version)
    : 0;

  return version <= 0 ? t("account.hub.draft") : `v${version}`;
};

const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

// What an account adds, said once, next to the form that creates it
// (account.perks.<key>).
const ACCOUNT_PERKS = ["publish", "sync", "manage"];

const SignedOutForms = memo(({ panel }) => {
  const { t } = useI18n();
  const isSignUp = panel.activeTab === "sign-up";
  const isReset = panel.activeTab === "reset";

  return (
    <section className="account__auth" aria-label={t("account.authLabel")}>
      {isReset ? null : (
        <div className="account__switch" role="tablist" aria-label={t("account.accessLabel")}>
          {panel.signedOutTabs
            .filter((tab) => tab.key !== "reset")
            .map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={panel.activeTab === tab.key}
                className={panel.activeTab === tab.key ? "is-active" : ""}
                onClick={() => panel.setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
        </div>
      )}

      {panel.activeTab === "sign-in" ? (
        <form
          className="account__form"
          onSubmit={(event) => {
            event.preventDefault();
            panel.handleSignIn();
          }}
        >
          <label className="account__field">
            <span>{t("account.email")}</span>
            <TextInput
              type="email"
              value={panel.email}
              onChange={(event) => panel.setEmail(event.target.value)}
              placeholder={t("account.emailPlaceholder")}
              autoComplete="email"
            />
          </label>
          <div className="account__field">
            <span className="account__field-head">
              <label htmlFor="account-sign-in-password">{t("account.password")}</label>
              <button
                type="button"
                className="account__text-link"
                onClick={() => panel.setActiveTab("reset")}
              >
                {t("account.forgot")}
              </button>
            </span>
            <TextInput
              id="account-sign-in-password"
              type="password"
              value={panel.password}
              onChange={(event) => panel.setPassword(event.target.value)}
              placeholder={t("account.passwordPlaceholder")}
              autoComplete="current-password"
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "sign-in"}
          >
            {t("account.tabs.sign-in")}
          </Button>
        </form>
      ) : null}

      {isSignUp ? (
        <form
          className="account__form"
          onSubmit={(event) => {
            event.preventDefault();
            panel.handleSignUp();
          }}
        >
          <label className="account__field">
            <span>{t("account.displayName")}</span>
            <TextInput
              value={panel.displayName}
              onChange={(event) => panel.setDisplayName(event.target.value)}
              placeholder={t("account.displayNamePlaceholder")}
              autoComplete="nickname"
            />
          </label>
          <label className="account__field">
            <span>{t("account.email")}</span>
            <TextInput
              type="email"
              value={panel.email}
              onChange={(event) => panel.setEmail(event.target.value)}
              placeholder={t("account.emailPlaceholder")}
              autoComplete="email"
            />
          </label>
          <label className="account__field">
            <span>{t("account.password")}</span>
            <TextInput
              type="password"
              value={panel.password}
              onChange={(event) => panel.setPassword(event.target.value)}
              placeholder={t("account.passwordHint", { count: 10 })}
              autoComplete="new-password"
            />
          </label>
          <p className="account__note">
            {t("account.signUpNote")}
          </p>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "sign-up"}
          >
            {t("account.tabs.sign-up")}
          </Button>
        </form>
      ) : null}

      {isReset ? (
        <form
          className="account__form"
          onSubmit={(event) => {
            event.preventDefault();
            panel.handlePasswordResetRequest();
          }}
        >
          <header className="account__form-head">
            <h3>{t("account.reset.title")}</h3>
            <p>{t("account.reset.text")}</p>
          </header>
          <label className="account__field">
            <span>{t("account.email")}</span>
            <TextInput
              type="email"
              value={panel.resetEmail}
              onChange={(event) => panel.setResetEmail(event.target.value)}
              placeholder={t("account.emailPlaceholder")}
              autoComplete="email"
            />
          </label>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "reset-password"}
          >
            {t("account.reset.send")}
          </Button>
          <button
            type="button"
            className="account__text-link account__text-link--center"
            onClick={() => panel.setActiveTab("sign-in")}
          >
            {t("account.reset.back")}
          </button>
        </form>
      ) : null}

      {isReset || panel.socialProviders.length === 0 ? null : (
        <>
          <div className="account__divider" role="separator">
            <span>{t("common.or")}</span>
          </div>
          <div className="account__providers" aria-label={t("account.providersLabel")}>
            {panel.socialProviders.map((provider) => (
              <Button
                key={provider.key}
                variant="secondary"
                onClick={() => panel.handleSocialSignIn(provider.key)}
                isLoading={panel.pendingAction === `social-${provider.key}`}
                fullWidth
              >
                {provider.label}
              </Button>
            ))}
          </div>
          {panel.isDesktopMode ? (
            <p className="account__note">
              {t("account.desktopProvidersNote")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
});

SignedOutForms.displayName = "SignedOutForms";

// The tabs are the app's settings rows: what a thing is on the left, its
// control on the right, one framed list per tab.

const HubDecksList = memo(({ panel }) => {
  const { t } = useI18n();

  if (panel.isOwnDecksLoading) {
    return <p className="account__muted">{t("account.hub.loading")}</p>;
  }

  if (panel.ownDecksError) {
    return <p className="account__error">{panel.ownDecksError}</p>;
  }

  if (panel.ownDecks.length === 0) {
    return (
      <p className="account__muted">
        {t("account.hub.emptyTitle")} {t("account.hub.emptyText")}
      </p>
    );
  }

  return (
    <SettingGroup>
      {panel.ownDecks.map((deck) => {
        const title = deck.title || t("browse.untitled");

        return (
          <SettingRow
            key={deck.id}
            label={title}
            hint={[
              renderDeckVersion(deck, t),
              t("browse.wordsCount", { count: toCount(deck.wordsCount) }),
              t("account.hub.downloads", { count: toCount(deck.downloadsCount) }),
            ].join(" · ")}
            control={
              <div className="account__row-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => panel.handleCopyDeckLink(deck)}
                  aria-label={t("account.hub.copyNamed", { name: title })}
                >
                  <FiCopy aria-hidden="true" />
                  <span>{t("account.hub.copy")}</span>
                </Button>
                {deck.slug ? (
                  <Link
                    className="ui-button ui-button--secondary ui-button--sm"
                    to={buildBrowseDeckRoute(deck.slug)}
                    aria-label={t("account.hub.openNamed", { name: title })}
                  >
                    <FiExternalLink aria-hidden="true" />
                    <span>{t("common.open")}</span>
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="account__remove"
                  onClick={() => panel.handleDeleteHubDeck(deck)}
                  isLoading={panel.deletingHubDeckId === String(deck.id)}
                  aria-label={t("account.hub.deleteNamed", { name: title })}
                >
                  <FiTrash2 aria-hidden="true" />
                  <span>{t("common.delete")}</span>
                </Button>
              </div>
            }
          />
        );
      })}
    </SettingGroup>
  );
});

HubDecksList.displayName = "HubDecksList";

const ProfileTab = memo(({ panel }) => {
  const { t } = useI18n();
  const { authState } = panel;
  const nameId = useId();
  const emailId = useId();
  const isNameChanged = panel.displayName.trim() !== String(authState.displayName || "").trim();
  let emailHint = t("account.profile.emailText");

  if (authState.pendingEmail) {
    emailHint = t("account.profile.pendingEmail", { email: authState.pendingEmail });
  } else if (!authState.isEmailVerified) {
    emailHint = t("account.profile.notConfirmed");
  }

  const isEmailChanged =
    panel.newEmail.trim().toLowerCase() !== String(authState.email || "").trim().toLowerCase();

  return (
    <SettingGroup>
      <SettingRow
        wide
        label={t("account.displayName")}
        hint={t("account.displayNameHint")}
        controlId={nameId}
        control={
          <form
            className="account__inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleSaveProfile();
            }}
          >
            <TextInput
              id={nameId}
              value={panel.displayName}
              onChange={(event) => panel.setDisplayName(event.target.value)}
              placeholder={t("account.displayNamePlaceholderSelf")}
              autoComplete="nickname"
              maxLength={60}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={!isNameChanged}
              isLoading={panel.pendingAction === "save-profile"}
            >
              {t("common.save")}
            </Button>
          </form>
        }
      />
      <SettingRow
        wide
        label={t("account.email")}
        hint={emailHint}
        controlId={emailId}
        control={
          <form
            className="account__inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleChangeEmail();
            }}
          >
            <TextInput
              id={emailId}
              type="email"
              value={panel.newEmail}
              onChange={(event) => panel.setNewEmail(event.target.value)}
              autoComplete="email"
            />
            <Button
              variant="secondary"
              type="submit"
              disabled={!isEmailChanged || !panel.newEmail.trim()}
              isLoading={panel.pendingAction === "change-email"}
            >
              {t("account.profile.sendLink")}
            </Button>
            {authState.isEmailVerified || isEmailChanged ? null : (
              <Button
                variant="ghost"
                type="button"
                onClick={panel.handleResendVerification}
                isLoading={panel.pendingAction === "resend-verification"}
              >
                {t("account.sendAgain")}
              </Button>
            )}
          </form>
        }
      />
    </SettingGroup>
  );
});

ProfileTab.displayName = "ProfileTab";

const SecurityTab = memo(({ panel }) => {
  const { t } = useI18n();
  const { authState } = panel;
  const hasPassword = authState.hasPassword || panel.isRecoveryFlow;
  const newId = useId();
  const repeatId = useId();
  let passwordTitle = t("account.security.add");

  if (panel.isRecoveryFlow) {
    passwordTitle = t("account.security.setNew");
  } else if (hasPassword) {
    passwordTitle = t("account.security.change");
  }

  return (
    <SettingGroup>
      <SettingRow
        label={t("account.sessions.method")}
        control={<span className="account__value">{panel.signInMethodLabel}</span>}
      />
      <SettingRow
        wide
        label={passwordTitle}
        hint={
          hasPassword
            ? t("account.security.hint", { count: 10 })
            : t("account.security.addHint", { email: authState.email })
        }
        control={
          <form
            className="account__password"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleUpdatePassword();
            }}
          >
            {/* Lets a password manager file the new password under this account. */}
            <input type="email" name="username" value={authState.email} autoComplete="username" readOnly hidden />
            <label className="account__field" htmlFor={newId}>
              <span>{t("account.security.new")}</span>
              <TextInput
                id={newId}
                type="password"
                value={panel.nextPassword}
                onChange={(event) => panel.setNextPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="account__field" htmlFor={repeatId}>
              <span>{t("account.security.repeat")}</span>
              <TextInput
                id={repeatId}
                type="password"
                value={panel.confirmPassword}
                onChange={(event) => panel.setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <div className="account__form-actions">
              <Button
                variant="primary"
                type="submit"
                disabled={!panel.nextPassword}
                isLoading={panel.pendingAction === "update-password"}
              >
                {panel.isRecoveryFlow ? t("account.security.saveNew") : t("account.security.update")}
              </Button>
              {hasPassword && !panel.isRecoveryFlow ? (
                <button
                  type="button"
                  className="account__text-link"
                  onClick={panel.handlePasswordResetRequest}
                >
                  {t("account.security.emailLink")}
                </button>
              ) : null}
            </div>
          </form>
        }
      />
      <SettingRow
        label={t("account.sessions.signOutEverywhere")}
        hint={t("account.sessions.text")}
        control={
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={panel.handleSignOutEverywhere}
            isLoading={panel.pendingAction === "sign-out-everywhere"}
          >
            {t("account.signOut")}
          </Button>
        }
      />
    </SettingGroup>
  );
});

SecurityTab.displayName = "SecurityTab";

const DEVICE_ICONS = { phone: FiSmartphone, tablet: FiTablet, computer: FiMonitor };

// "Mac", "iPhone"; an old entry without a system reads as what ran there.
const deviceTitle = (identity, t) => {
  if (identity.title) return identity.title;
  return identity.isApp ? t("account.devices.app") : t("account.devices.browser");
};

// What runs LioraLang there: the browser, or the app with its version.
const deviceClient = (device, t) => {
  const { identity } = device;

  if (identity.isApp) {
    return [t("account.devices.app"), device.appVersion ? `v${device.appVersion}` : ""].filter(Boolean).join(" ");
  }

  return identity.client || (identity.title ? t("account.devices.browser") : "");
};

const useActivityText = () => {
  const { t, locale, formatDate } = useI18n();
  const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale]);

  return useCallback(
    (activity) => {
      if (activity.state === "now") return t("account.devices.activeNow");
      if (activity.state === "recent") {
        return t("account.devices.active", { time: relative.format(activity.value, activity.unit) });
      }
      if (activity.state === "old" || activity.state === "inactive") {
        return t("account.devices.lastActive", { date: formatDate(activity.date, { dateStyle: "medium" }) });
      }
      return "";
    },
    [formatDate, relative, t],
  );
};

const DeviceRow = ({ device, detail, control, isLive = false, isQuiet = false }) => {
  const { t } = useI18n();
  const Icon = DEVICE_ICONS[device.identity.kind] || FiMonitor;
  const title = deviceTitle(device.identity, t);
  const client = deviceClient(device, t);

  return (
    <div className={`setting-row account-device${device.isCurrent ? " is-current" : ""}${isQuiet ? " is-quiet" : ""}`}>
      <span className="account-device__icon" aria-hidden="true">
        <Icon />
        {isLive ? <i className="account-device__live" /> : null}
      </span>
      <div className="setting-row__text">
        <span className="setting-row__label">
          {title}
          {client ? <span className="account-device__client"> · {client}</span> : null}
          {device.isCurrent ? <span className="account__here"> · {t("account.devices.thisDevice")}</span> : null}
        </span>
        {detail ? <span className="setting-row__hint">{detail}</span> : null}
      </div>
      {control ? <div className="setting-row__control">{control}</div> : null}
    </div>
  );
};

const DevicesTab = memo(({ panel }) => {
  const { t, locale } = useI18n();
  const activityText = useActivityText();
  const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale]);
  const { current, active, inactive } = panel.deviceGroups;
  const isLoading = panel.devicesState === "loading" || panel.devicesState === "idle";
  const isBusy = panel.forgettingDeviceId === "all";

  // This device's line says what matters about its sync: waiting changes,
  // no connection, a problem, or when it last went through.
  let syncLine = panel.syncOverview.text;

  if (panel.pendingChanges > 0) {
    syncLine = t("account.devices.pending", { count: panel.pendingChanges });
  } else if (panel.syncOverview.state === "synced" && panel.syncStatus.lastSuccessfulSyncAt) {
    const minutes = Math.round((Date.parse(panel.syncStatus.lastSuccessfulSyncAt) - panel.nowMs) / 60_000);
    syncLine =
      minutes > -1
        ? t("account.devices.syncedNow")
        : t("account.devices.synced", {
            time: Math.abs(minutes) < 60 ? relative.format(minutes, "minute") : relative.format(Math.round(minutes / 60), "hour"),
          });
  }

  const forgetButton = (device) => (
    <Button
      variant="ghost"
      size="sm"
      className="account__remove"
      onClick={() => panel.handleForgetDevice(device)}
      isLoading={panel.forgettingDeviceId === device.deviceId}
      disabled={isBusy}
      aria-label={t("account.devices.forgetNamed", { name: deviceTitle(device.identity, t) })}
    >
      {t("account.devices.forget")}
    </Button>
  );

  const syncButton = panel.canSyncNow ? (
    <Button
      variant="secondary"
      size="sm"
      onClick={panel.handleSyncNow}
      isLoading={panel.pendingAction === "sync-now"}
    >
      <FiRefreshCw aria-hidden="true" />
      <span>{t("account.sync.now")}</span>
    </Button>
  ) : null;

  // One list: this device first, with its sync; then the others by how
  // recently they were used, the long-quiet ones last and dimmed.
  return (
    <SettingGroup>
      {current ? (
        <DeviceRow device={current} detail={syncLine} control={syncButton} isLive />
      ) : (
        <SettingRow label={t("account.overview.sync")} hint={syncLine} control={syncButton} />
      )}
      {isLoading ? <SettingRow label={t("account.devices.loading")} /> : null}
      {panel.devicesState === "error" ? (
        <SettingRow
          label={t("account.devices.errorTitle")}
          control={
            <Button variant="ghost" size="sm" onClick={panel.loadDevices}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : null}
      {panel.devicesState === "ready" && active.length + inactive.length === 0 ? (
        <SettingRow label={t("account.devices.noOthers")} hint={t("account.devices.noOthersHint")} />
      ) : null}
      {active.map((device) => (
        <DeviceRow
          key={device.deviceId}
          device={device}
          detail={activityText(device.activity)}
          isLive={device.activity.state === "now"}
          control={forgetButton(device)}
        />
      ))}
      {inactive.map((device) => (
        <DeviceRow
          key={device.deviceId}
          device={device}
          detail={activityText(device.activity)}
          control={forgetButton(device)}
          isQuiet
        />
      ))}
    </SettingGroup>
  );
});

DevicesTab.displayName = "DevicesTab";

// The element that scrolls the page: the nearest ancestor that scrolls,
// or the document.
const findScrollParent = (element) => {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);

    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }

  return document.scrollingElement;
};

// Switching tabs keeps the page where it was. The new tab starts at least
// as tall as the one it replaces, so a short tab (or one still loading)
// cannot pull the page up, and the scroll position is put back after it
// renders.
const useSteadyTabs = (activeTab, setActiveTab) => {
  const panelRef = useRef(null);
  const pendingRef = useRef(null);

  const switchTab = useCallback(
    (key) => {
      const panel = panelRef.current;

      if (panel && panel.offsetParent === null) {
        // A phone showing the menu: the section opens as a new screen, at
        // its top.
        const scroller = findScrollParent(panel.parentElement || panel);
        setActiveTab(key);
        requestAnimationFrame(() => {
          if (scroller) scroller.scrollTop = 0;
        });
        return;
      }

      if (panel && key !== activeTab) {
        const scroller = findScrollParent(panel);
        const top = scroller?.scrollTop ?? 0;
        // Only as tall as it takes to keep this scroll position: what the
        // rest of the page lacks to fill the screen below the current top.
        // Unscrolled, that is nothing, and no empty space is left behind.
        const rest = (scroller?.scrollHeight ?? 0) - panel.offsetHeight;
        const height = top > 0 ? Math.max(0, top + (scroller?.clientHeight ?? 0) - rest) : 0;
        pendingRef.current = { scroller, top, height };
      }

      setActiveTab(key);
    },
    [activeTab, setActiveTab],
  );

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const pending = pendingRef.current;
    pendingRef.current = null;

    if (!panel) {
      return;
    }

    panel.style.minHeight = pending?.height ? `${pending.height}px` : "";

    if (pending?.scroller) {
      pending.scroller.scrollTop = pending.top;
    }
  }, [activeTab]);

  return { panelRef, switchTab };
};

// Sync reads as on for every state but a problem.
const isSyncOn = (state) => ["synced", "ready", "syncing"].includes(state);

const SignedInView = memo(({ panel }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const { authState } = panel;
  const cardStats = useAccountCardStats(authState.isAuthenticated ? authState.user?.id : "");
  const { panelRef, switchTab } = useSteadyTabs(panel.activeTab, panel.setActiveTab);
  const name = resolveCardName(authState) || t("account.learner");
  const providerValue = panel.signInMethodLabel;
  // Kept stable between sync status updates, so the card does not redraw
  // every few seconds.
  const perks = useMemo(
    () => [
      {
        key: "publish",
        title: t("account.card.publish"),
        note: authState.isEmailVerified ? t("account.card.publishOn") : t("account.card.publishOff"),
        isOn: authState.isEmailVerified,
      },
      {
        key: "sync",
        title: t("account.card.sync"),
        note: panel.syncOverview.label,
        isOn: isSyncOn(panel.syncOverview.state),
      },
      {
        key: "provider",
        title: providerValue || t("account.card.signedIn"),
        note: panel.isDesktopMode ? t("account.card.desktop") : t("account.card.browser"),
        isOn: true,
      },
    ],
    [authState.isEmailVerified, panel.isDesktopMode, panel.syncOverview.label, panel.syncOverview.state, providerValue, t],
  );

  const sectionIcons = { profile: FiUser, security: FiShield, devices: FiMonitor, hub: FiUploadCloud };
  const summaries = {
    profile: authState.displayName || authState.email,
    security: panel.signInMethodLabel,
    devices: panel.syncOverview.label,
    hub:
      panel.ownDecks.length > 0
        ? t("account.menu.hubCount", { count: panel.ownDecks.length })
        : t("account.menu.hubNone"),
  };
  const activeSection = panel.signedInTabs.find((tab) => tab.key === panel.activeTab) || panel.signedInTabs[0];
  let sectionAction = null;

  if (panel.activeTab === "devices" && panel.deviceGroups.inactive.length > 1) {
    sectionAction = (
      <Button
        variant="ghost"
        size="sm"
        className="account__remove"
        onClick={() => panel.handleForgetDevices(panel.deviceGroups.inactive)}
        isLoading={panel.forgettingDeviceId === "all"}
      >
        {t("account.devices.removeUnused", { count: panel.deviceGroups.inactive.length })}
      </Button>
    );
  }

  return (
    <div className="account-layout" data-view={panel.isSectionRequested ? "section" : "menu"}>
      <aside className="account-side">
        <div className="account__card-side">
          <AccountCard
            name={name}
            email={authState.email}
            memberSince={formatMemberSince(authState.user?.created_at, i18n)}
            cardNumber={buildCardNumber(authState.user?.id)}
            stats={cardStats}
            isVerified={authState.isEmailVerified}
            perks={perks}
          />
        </div>

        <nav className="account-menu" aria-label={t("nav.account")}>
          <ul>
            {panel.signedInTabs.map((tab) => {
              const Icon = sectionIcons[tab.key] || FiUser;
              const isActive = panel.activeTab === tab.key;

              return (
                <li key={tab.key}>
                  <button
                    type="button"
                    className={`account-menu__item${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => switchTab(tab.key)}
                  >
                    <span className="account-menu__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="account-menu__copy">
                      <strong>{tab.label}</strong>
                      <span>{summaries[tab.key]}</span>
                    </span>
                    <FiChevronRight className="account-menu__chevron" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="account-menu__item account-menu__item--out"
                onClick={panel.handleSignOut}
                disabled={panel.pendingAction === "sign-out"}
              >
                <span className="account-menu__icon" aria-hidden="true">
                  <FiLogOut />
                </span>
                <span className="account-menu__copy">
                  <strong>{t("account.signOut")}</strong>
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <section className="account-content" ref={panelRef}>
        <button type="button" className="account-content__back" onClick={panel.showMenu}>
          <FiChevronLeft aria-hidden="true" />
          <span>{t("nav.account")}</span>
        </button>
        <div className="account-content__body" key={panel.activeTab}>
          <header className="account-content__head">
            <div>
              <h2>{activeSection?.label}</h2>
              <p>{t(`account.sectionText.${panel.activeTab}`)}</p>
            </div>
            {sectionAction}
          </header>
          {panel.activeTab === "profile" ? <ProfileTab panel={panel} /> : null}
          {panel.activeTab === "security" ? <SecurityTab panel={panel} /> : null}
          {panel.activeTab === "devices" ? <DevicesTab panel={panel} /> : null}
          {panel.activeTab === "hub" ? <HubDecksList panel={panel} /> : null}
        </div>
      </section>
    </div>
  );
});

SignedInView.displayName = "SignedInView";

export const AccountHubPanel = memo(() => {
  const panel = useAccountHubPanel();
  const { t } = useI18n();
  const isSignedOut =
    panel.isConfigured && !panel.isAuthLoading && !panel.authState.isAuthenticated;
  const isSignedIn =
    panel.isConfigured && !panel.isAuthLoading && panel.authState.isAuthenticated;

  return (
    <article className="panel account-hub-panel">
      <InlineAlert alert={panel.statusAlert} />

      {!panel.isConfigured ? (
        <section className="account__notice">
          <FiAlertCircle aria-hidden="true" />
          <div>
            <h3>{t("account.notConfigured.title")}</h3>
            <p>{t("account.notConfigured.text")}</p>
          </div>
        </section>
      ) : null}

      {panel.isConfigured && panel.isAuthLoading ? (
        <p className="account__muted">{t("account.checking")}</p>
      ) : null}

      {isSignedOut ? (
        <div className="account account--signed-out">
          <section className="account__intro" aria-label={t("account.whyLabel")}>
            {/* The card this account will be, filled in as the form is. */}
            <AccountCard
              isBlank
              name={resolveCardName({
                displayName: panel.activeTab === "sign-up" ? panel.displayName : "",
                email: panel.email,
              })}
              email={panel.email}
            />
            <h2>{t("account.yourCard")}</h2>
            <ul>
              {ACCOUNT_PERKS.map((perk) => (
                <li key={perk}>
                  <FiCheckCircle aria-hidden="true" />
                  {t(`account.perks.${perk}`)}
                </li>
              ))}
            </ul>
            <p>{t("account.withoutOne")}</p>
          </section>
          <SignedOutForms panel={panel} />
        </div>
      ) : null}

      {isSignedIn ? (
        <div className="account account--signed-in">
          <SignedInView panel={panel} />
        </div>
      ) : null}
    </article>
  );
});

AccountHubPanel.displayName = "AccountHubPanel";
