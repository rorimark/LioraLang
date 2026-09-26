import { memo } from "react";
import { Link } from "react-router";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiLogOut,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { Button, InlineAlert, TextInput } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import { useAccountHubPanel } from "../model";
import "./AccountHubPanel.css";

const renderDeckVersion = (deck) => {
  const version = Number.isFinite(Number(deck?.latestVersion?.version))
    ? Number(deck.latestVersion.version)
    : 0;

  return version <= 0 ? "Draft" : `v${version}`;
};

const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const resolveInitial = (authState) =>
  (authState.displayName || authState.email || "").trim().charAt(0).toUpperCase();

// What an account adds, said once, next to the form that creates it.
const ACCOUNT_PERKS = [
  "Publish your decks to the Hub for others to use.",
  "Keep decks and progress in step across your devices.",
  "Manage and remove what you published, from any device.",
];

const SignedOutForms = memo(({ panel }) => {
  const isSignUp = panel.activeTab === "sign-up";
  const isReset = panel.activeTab === "reset";

  return (
    <section className="account__auth" aria-label="Sign in or create an account">
      {isReset ? null : (
        <div className="account__switch" role="tablist" aria-label="Account access">
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
            <span>Email</span>
            <TextInput
              type="email"
              value={panel.email}
              onChange={(event) => panel.setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <div className="account__field">
            <span className="account__field-head">
              <label htmlFor="account-sign-in-password">Password</label>
              <button
                type="button"
                className="account__text-link"
                onClick={() => panel.setActiveTab("reset")}
              >
                Forgot password?
              </button>
            </span>
            <TextInput
              id="account-sign-in-password"
              type="password"
              value={panel.password}
              onChange={(event) => panel.setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "sign-in"}
          >
            Sign in
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
            <span>Display name</span>
            <TextInput
              value={panel.displayName}
              onChange={(event) => panel.setDisplayName(event.target.value)}
              placeholder="How your name should appear"
              autoComplete="nickname"
            />
          </label>
          <label className="account__field">
            <span>Email</span>
            <TextInput
              type="email"
              value={panel.email}
              onChange={(event) => panel.setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="account__field">
            <span>Password</span>
            <TextInput
              type="password"
              value={panel.password}
              onChange={(event) => panel.setPassword(event.target.value)}
              placeholder="At least 10 characters"
              autoComplete="new-password"
            />
          </label>
          <p className="account__note">
            We send a link to confirm your email. Publishing unlocks once it is confirmed.
          </p>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "sign-up"}
          >
            Create account
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
            <h3>Reset your password</h3>
            <p>We will email you a link to set a new one.</p>
          </header>
          <label className="account__field">
            <span>Email</span>
            <TextInput
              type="email"
              value={panel.resetEmail}
              onChange={(event) => panel.setResetEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <Button
            variant="primary"
            type="submit"
            fullWidth
            isLoading={panel.pendingAction === "reset-password"}
          >
            Send reset link
          </Button>
          <button
            type="button"
            className="account__text-link account__text-link--center"
            onClick={() => panel.setActiveTab("sign-in")}
          >
            Back to sign in
          </button>
        </form>
      ) : null}

      {isReset ? null : (
        <>
          <div className="account__divider" role="separator">
            <span>or</span>
          </div>
          <div className="account__providers" aria-label="Sign in with a provider">
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
              Google and GitHub sign-in are coming to the desktop app. Email and password
              work here already.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
});

SignedOutForms.displayName = "SignedOutForms";

const HubDecksList = memo(({ panel }) => {
  if (panel.isOwnDecksLoading) {
    return <p className="account__muted">Loading your Hub decks...</p>;
  }

  if (panel.ownDecksError) {
    return <p className="account__error">{panel.ownDecksError}</p>;
  }

  if (panel.ownDecks.length === 0) {
    return (
      <div className="account__empty">
        <strong>Nothing published yet.</strong>
        <p>
          Publish a deck from your library, and it shows up here with its link.
        </p>
      </div>
    );
  }

  return (
    <ul className="account__decks">
      {panel.ownDecks.map((deck) => {
        const title = deck.title || "Untitled deck";

        return (
          <li className="account__deck" key={deck.id}>
            <div className="account__deck-copy">
              <strong>{title}</strong>
              <p>{deck.description || "No public description yet."}</p>
              <span className="account__deck-meta">
                <b>{renderDeckVersion(deck)}</b>
                <span>{toCount(deck.wordsCount)} words</span>
                <span>{toCount(deck.downloadsCount)} downloads</span>
              </span>
            </div>
            <div className="account__deck-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => panel.handleCopyDeckLink(deck)}
                aria-label={`Copy link to ${title}`}
              >
                <FiCopy aria-hidden="true" />
                <span>Copy link</span>
              </Button>
              {deck.slug ? (
                <Link
                  className="ui-button ui-button--secondary ui-button--sm"
                  to={buildBrowseDeckRoute(deck.slug)}
                  aria-label={`Open ${title} in the Hub`}
                >
                  <FiExternalLink aria-hidden="true" />
                  <span>Open</span>
                </Link>
              ) : null}
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={() => panel.handleDeleteHubDeck(deck)}
                isLoading={panel.deletingHubDeckId === String(deck.id)}
                aria-label={`Delete ${title} from the Hub`}
              >
                <FiTrash2 aria-hidden="true" />
                <span>Delete</span>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
});

HubDecksList.displayName = "HubDecksList";

const SignedInView = memo(({ panel }) => {
  const { authState } = panel;
  const initial = resolveInitial(authState);

  return (
    <>
      {/* Who is signed in, as the landing's blue card. */}
      <section className="account__id" aria-label="Your account">
        <span className="account__avatar" aria-hidden="true">
          {initial || <FiUser />}
        </span>
        <div className="account__id-copy">
          <h2>{authState.displayName || "Your account"}</h2>
          <p>{authState.email || "No email on this account"}</p>
          <ul className="account__chips" aria-label="Account status">
            {panel.accountBadges.map((badge) => (
              <li key={badge.key} className={badge.accent ? "is-accent" : ""}>
                {badge.text}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="account__sign-out"
          onClick={panel.handleSignOut}
          isLoading={panel.pendingAction === "sign-out"}
        >
          <FiLogOut aria-hidden="true" />
          <span>Sign out</span>
        </Button>
      </section>

      {!authState.isEmailVerified ? (
        <aside className="account__callout">
          <FiMail aria-hidden="true" />
          <div>
            <strong>Confirm your email</strong>
            <p>Publishing and deleting Hub decks unlock once your email is confirmed.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={panel.handleResendVerification}
            isLoading={panel.pendingAction === "resend-verification"}
          >
            <FiRefreshCw aria-hidden="true" />
            <span>Send again</span>
          </Button>
        </aside>
      ) : null}

      <nav className="account__tabs" role="tablist" aria-label="Account">
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
        {panel.activeTab === "overview" ? (
          <dl className="account__facts">
            {panel.overviewCards.map((card) => (
              <div className="account__fact" key={card.key}>
                <dt>{card.title}</dt>
                <dd>{card.value}</dd>
                <p>{card.note}</p>
              </div>
            ))}
          </dl>
        ) : null}

        {panel.activeTab === "profile" ? (
          <form
            className="account__form account__form--card"
            onSubmit={(event) => {
              event.preventDefault();
              panel.handleSaveProfile();
            }}
          >
            <label className="account__field">
              <span>Display name</span>
              <TextInput
                value={panel.displayName}
                onChange={(event) => panel.setDisplayName(event.target.value)}
                placeholder="Your display name"
                autoComplete="nickname"
              />
              <small>Shown on the decks you publish.</small>
            </label>
            <label className="account__field">
              <span>Email</span>
              <TextInput value={authState.email} disabled />
            </label>
            <div className="account__form-actions">
              <Button
                variant="primary"
                type="submit"
                isLoading={panel.pendingAction === "save-profile"}
              >
                Save profile
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
              <h3>{panel.isRecoveryFlow ? "Set a new password" : "Change password"}</h3>
              <p>Use at least 10 characters.</p>
            </header>
            <label className="account__field">
              <span>New password</span>
              <TextInput
                type="password"
                value={panel.nextPassword}
                onChange={(event) => panel.setNextPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="account__field">
              <span>Repeat new password</span>
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
                <span>{panel.isRecoveryFlow ? "Save new password" : "Update password"}</span>
              </Button>
              <Button variant="ghost" type="button" onClick={panel.handlePasswordResetRequest}>
                Email me a reset link
              </Button>
            </div>
          </form>
        ) : null}

        {panel.activeTab === "hub" ? <HubDecksList panel={panel} /> : null}
      </section>

      {authState.isEmailVerified && panel.activeTab === "overview" ? (
        <p className="account__ready">
          <FiCheckCircle aria-hidden="true" />
          Your account can publish, manage and sync decks.
        </p>
      ) : null}
    </>
  );
});

SignedInView.displayName = "SignedInView";

export const AccountHubPanel = memo(() => {
  const panel = useAccountHubPanel();
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
            <h3>Accounts are not set up in this build</h3>
            <p>
              Add <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to <code>.env</code> to
              turn on sign-in, publishing and sync. Learning and your decks work without it.
            </p>
          </div>
        </section>
      ) : null}

      {panel.isConfigured && panel.isAuthLoading ? (
        <p className="account__muted">Checking your session...</p>
      ) : null}

      {isSignedOut ? (
        <div className="account account--signed-out">
          <section className="account__intro" aria-label="Why sign in">
            <span className="account__avatar" aria-hidden="true">
              <FiUser />
            </span>
            <h2>Your LioraLang account</h2>
            <ul>
              {ACCOUNT_PERKS.map((perk) => (
                <li key={perk}>
                  <FiCheckCircle aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
            <p>You can learn, make decks and browse the Hub without one.</p>
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
