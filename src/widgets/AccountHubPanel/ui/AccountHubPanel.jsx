import { memo, useId, useMemo } from "react";
import { Link } from "react-router";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiLogOut,
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
        hint={
          authState.pendingEmail
            ? t("account.profile.pendingEmail", { email: authState.pendingEmail })
            : t("account.profile.emailText")
        }
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

const DevicesTab = memo(({ panel }) => {
  const { t, formatDate } = useI18n();

  if (panel.devicesState === "loading" || panel.devicesState === "idle") {
    return <p className="account__muted">{t("account.devices.loading")}</p>;
  }

  if (panel.devicesState === "error") {
    return (
      <p className="account__muted">
        {t("account.devices.errorTitle")}{" "}
        <button type="button" className="account__text-link" onClick={panel.loadDevices}>
          {t("common.retry")}
        </button>
      </p>
    );
  }

  if (panel.devices.length === 0) {
    return (
      <p className="account__muted">
        {t("account.devices.emptyTitle")} {t("account.devices.emptyText")}
      </p>
    );
  }

  return (
    <SettingGroup>
      {panel.devices.map((device) => {
        const name = device.deviceName || t("account.devices.unnamed");
        const hint = [
          t(device.platform === "desktop" ? "account.devices.desktop" : "account.devices.web"),
          device.lastSeenAt
            ? t("account.devices.lastSeen", {
                time: formatDate(device.lastSeenAt, { dateStyle: "medium", timeStyle: "short" }),
              })
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <SettingRow
            key={device.deviceId}
            label={
              <>
                {name}
                {device.isCurrent ? <span className="account__here"> · {t("account.devices.thisDevice")}</span> : null}
              </>
            }
            hint={hint}
            control={
              device.isCurrent ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="account__remove"
                  onClick={() => panel.handleForgetDevice(device)}
                  isLoading={panel.forgettingDeviceId === device.deviceId}
                  aria-label={t("account.devices.forgetNamed", { name })}
                >
                  {t("account.devices.forget")}
                </Button>
              )
            }
          />
        );
      })}
    </SettingGroup>
  );
});

DevicesTab.displayName = "DevicesTab";

// Sync reads as on for every state but a problem.
const isSyncOn = (state) => ["synced", "ready", "syncing"].includes(state);

const SignedInView = memo(({ panel }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const { authState } = panel;
  const cardStats = useAccountCardStats(authState.isAuthenticated ? authState.user?.id : "");
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

  return (
    <>
      <div className="account__top">
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

        <section className="account__status" aria-label={t("account.statusLabel")}>
          <SettingGroup>
            <SettingRow
              label={t("account.email")}
              hint={`${authState.email} · ${authState.isEmailVerified ? t("account.verified") : t("account.notVerified")}`}
              control={
                authState.isEmailVerified ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={panel.handleResendVerification}
                    isLoading={panel.pendingAction === "resend-verification"}
                  >
                    {t("account.sendAgain")}
                  </Button>
                )
              }
            />
            <SettingRow
              label={t("account.overview.sync")}
              hint={panel.syncOverview.state === "synced" && panel.lastSyncedLabel ? panel.lastSyncedLabel : panel.syncOverview.text}
              control={
                panel.canSyncNow ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={panel.handleSyncNow}
                    isLoading={panel.pendingAction === "sync-now"}
                  >
                    {t("account.sync.now")}
                  </Button>
                ) : null
              }
            />
            <SettingRow
              label={t("account.overview.hubDecks")}
              hint={panel.ownDecks.length > 0 ? t("account.hub.published", { count: panel.ownDecks.length }) : t("account.overview.noHubDecks")}
              control={
                panel.ownDecks.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => panel.setActiveTab("hub")}>
                    {t("account.manage")}
                  </Button>
                ) : null
              }
            />
          </SettingGroup>
          <Button
            variant="secondary"
            fullWidth
            className="account__sign-out"
            onClick={panel.handleSignOut}
            isLoading={panel.pendingAction === "sign-out"}
          >
            <FiLogOut aria-hidden="true" />
            <span>{t("account.signOut")}</span>
          </Button>
        </section>
      </div>

      <nav className="account__tabs" role="tablist" aria-label={t("nav.account")}>
        {panel.signedInTabs.map((tab) => (
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
      </nav>

      <section className="account__panel" key={panel.activeTab}>
        {panel.activeTab === "profile" ? <ProfileTab panel={panel} /> : null}
        {panel.activeTab === "security" ? <SecurityTab panel={panel} /> : null}
        {panel.activeTab === "devices" ? <DevicesTab panel={panel} /> : null}
        {panel.activeTab === "hub" ? <HubDecksList panel={panel} /> : null}
      </section>
    </>
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
