import { memo, useMemo } from "react";
import { Link } from "react-router";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiKey,
  FiLogOut,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import { Button, InlineAlert, TextInput } from "@shared/ui";
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
      <div className="account__empty">
        <strong>{t("account.hub.emptyTitle")}</strong>
        <p>{t("account.hub.emptyText")}</p>
      </div>
    );
  }

  return (
    <ul className="account__decks">
      {panel.ownDecks.map((deck) => {
        const title = deck.title || t("browse.untitled");

        return (
          <li className="account__deck" key={deck.id}>
            <div className="account__deck-copy">
              <strong>{title}</strong>
              <p>{deck.description || t("account.hub.noDescription")}</p>
              <span className="account__deck-meta">
                <b>{renderDeckVersion(deck, t)}</b>
                <span>{t("browse.wordsCount", { count: toCount(deck.wordsCount) })}</span>
                <span>{t("account.hub.downloads", { count: toCount(deck.downloadsCount) })}</span>
              </span>
            </div>
            <div className="account__deck-actions">
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
                variant="danger"
                size="sm"
                type="button"
                onClick={() => panel.handleDeleteHubDeck(deck)}
                isLoading={panel.deletingHubDeckId === String(deck.id)}
                aria-label={t("account.hub.deleteNamed", { name: title })}
              >
                <FiTrash2 aria-hidden="true" />
                <span>{t("common.delete")}</span>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
});

HubDecksList.displayName = "HubDecksList";

const STATUS_ICONS = {
  verification: FiMail,
  sync: FiRefreshCw,
  "hub-decks": FiUploadCloud,
  provider: FiKey,
};

// Sync reads as on for every state but a problem.
const isSyncOn = (state) => ["synced", "ready", "syncing"].includes(state);

const SignedInView = memo(({ panel }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const { authState } = panel;
  const cardStats = useAccountCardStats(authState.isAuthenticated ? authState.user?.id : "");
  const name = resolveCardName(authState) || t("account.learner");
  const providerValue = panel.overviewCards.find((card) => card.key === "provider")?.value;
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
          <ul className="account__status-list">
            {panel.overviewCards.map((card) => {
              const Icon = STATUS_ICONS[card.key] || FiShield;
              const isWarning =
                (card.key === "verification" && !authState.isEmailVerified) ||
                (card.key === "sync" && !isSyncOn(panel.syncOverview.state));

              return (
                <li key={card.key} className={isWarning ? "is-warning" : ""}>
                  <span className="account__status-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="account__status-text">
                    <span className="account__status-title">{card.title}</span>
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </span>
                  {card.key === "verification" && !authState.isEmailVerified ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={panel.handleResendVerification}
                      isLoading={panel.pendingAction === "resend-verification"}
                    >
                      {t("account.sendAgain")}
                    </Button>
                  ) : null}
                  {card.key === "hub-decks" && panel.ownDecks.length > 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => panel.setActiveTab("hub")}>
                      {t("account.manage")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
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
        {panel.activeTab === "profile" ? (
          <form
            className="account__form account__form--card"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleSaveProfile();
            }}
          >
            <label className="account__field">
              <span>{t("account.displayName")}</span>
              <TextInput
                value={panel.displayName}
                onChange={(event) => panel.setDisplayName(event.target.value)}
                placeholder={t("account.displayNamePlaceholderSelf")}
                autoComplete="nickname"
              />
              <small>{t("account.displayNameHint")}</small>
            </label>
            <label className="account__field">
              <span>{t("account.email")}</span>
              <TextInput value={authState.email} disabled />
            </label>
            <div className="account__form-actions">
              <Button
                variant="primary"
                type="submit"
                isLoading={panel.pendingAction === "save-profile"}
              >
                {t("account.saveProfile")}
              </Button>
            </div>
          </form>
        ) : null}

        {panel.activeTab === "security" ? (
          <form
            className="account__form account__form--card"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleUpdatePassword();
            }}
          >
            <header className="account__form-head">
              <h3>{panel.isRecoveryFlow ? t("account.security.setNew") : t("account.security.change")}</h3>
              <p>{t("account.security.hint", { count: 10 })}</p>
            </header>
            <label className="account__field">
              <span>{t("account.security.new")}</span>
              <TextInput
                type="password"
                value={panel.nextPassword}
                onChange={(event) => panel.setNextPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="account__field">
              <span>{t("account.security.repeat")}</span>
              <TextInput
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
                isLoading={panel.pendingAction === "update-password"}
              >
                <FiShield aria-hidden="true" />
                <span>{panel.isRecoveryFlow ? t("account.security.saveNew") : t("account.security.update")}</span>
              </Button>
              <Button variant="ghost" type="button" onClick={panel.handlePasswordResetRequest}>
                {t("account.security.emailLink")}
              </Button>
            </div>
          </form>
        ) : null}

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
