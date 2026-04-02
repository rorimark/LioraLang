import { memo } from "react";
import { Link } from "react-router";
import { FiCopy, FiExternalLink, FiLogOut, FiMail, FiRefreshCw, FiShield, FiTrash2 } from "react-icons/fi";
import { Button, InlineAlert, MetaBadge, Panel, Tabs, TextInput } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import { useAccountHubPanel } from "../model";
import "./AccountHubPanel.css";

const renderDeckVersion = (deck) => {
  const version = Number.isFinite(Number(deck?.latestVersion?.version))
    ? Number(deck.latestVersion.version)
    : 0;

  if (version <= 0) {
    return "Draft";
  }

  return `v${version}`;
};

const renderDeckMeta = (deck) => {
  const wordsCount = Number.isFinite(Number(deck?.wordsCount))
    ? Number(deck.wordsCount)
    : 0;
  const downloadsCount = Number.isFinite(Number(deck?.downloadsCount))
    ? Number(deck.downloadsCount)
    : 0;

  return `${wordsCount} words • ${downloadsCount} downloads`;
};

export const AccountHubPanel = memo(() => {
  const panel = useAccountHubPanel();

  return (
    <article className="panel account-hub-panel">
      <InlineAlert alert={panel.statusAlert} />

      {!panel.isConfigured ? (
        <Panel className="account-hub-panel__notice" as="section">
          <h3>Supabase is not configured</h3>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to <code>.env</code> before enabling accounts.
          </p>
        </Panel>
      ) : null}

      {panel.isConfigured && panel.isAuthLoading ? (
        <p className="account-hub-panel__loading">Loading account session...</p>
      ) : null}

      {panel.isConfigured && !panel.isAuthLoading && !panel.authState.isAuthenticated ? (
        <>
          <Tabs
            items={panel.signedOutTabs}
            activeKey={panel.activeTab}
            onSelect={panel.setActiveTab}
            ariaLabel="Account access modes"
          />

          <section className="account-hub-panel__grid" aria-label="Account access">
            <Panel className="account-hub-panel__card" as="section">
              {panel.activeTab === "sign-in" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    panel.handleSignIn();
                  }}
                >
                  <header className="account-hub-panel__section-head">
                    <h3>Sign in</h3>
                    <p>Use your LioraLang account to publish and manage Hub decks.</p>
                  </header>
                  <label className="account-hub-panel__field">
                    <span>Email</span>
                    <TextInput
                      type="email"
                      value={panel.email}
                      onChange={(event) => panel.setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="account-hub-panel__field">
                    <span>Password</span>
                    <TextInput
                      type="password"
                      value={panel.password}
                      onChange={(event) => panel.setPassword(event.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </label>
                  <footer className="account-hub-panel__actions">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={panel.pendingAction === "sign-in"}
                    >
                      Sign in
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => panel.setActiveTab("reset")}
                    >
                      Forgot password?
                    </Button>
                  </footer>
                </form>
              ) : null}

              {panel.activeTab === "sign-up" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    panel.handleSignUp();
                  }}
                >
                  <header className="account-hub-panel__section-head">
                    <h3>Create account</h3>
                    <p>Email verification is required before you can publish or manage Hub decks.</p>
                  </header>
                  <label className="account-hub-panel__field">
                    <span>Display name</span>
                    <TextInput
                      value={panel.displayName}
                      onChange={(event) => panel.setDisplayName(event.target.value)}
                      placeholder="How your name should appear"
                      autoComplete="nickname"
                    />
                  </label>
                  <label className="account-hub-panel__field">
                    <span>Email</span>
                    <TextInput
                      type="email"
                      value={panel.email}
                      onChange={(event) => panel.setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="account-hub-panel__field">
                    <span>Password</span>
                    <TextInput
                      type="password"
                      value={panel.password}
                      onChange={(event) => panel.setPassword(event.target.value)}
                      placeholder="At least 10 characters"
                      autoComplete="new-password"
                    />
                  </label>
                  <footer className="account-hub-panel__actions">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={panel.pendingAction === "sign-up"}
                    >
                      Create account
                    </Button>
                  </footer>
                </form>
              ) : null}

              {panel.activeTab === "reset" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    panel.handlePasswordResetRequest();
                  }}
                >
                  <header className="account-hub-panel__section-head">
                    <h3>Reset password</h3>
                    <p>We’ll send you a recovery link so you can set a new password securely.</p>
                  </header>
                  <label className="account-hub-panel__field">
                    <span>Email</span>
                    <TextInput
                      type="email"
                      value={panel.resetEmail}
                      onChange={(event) => panel.setResetEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <footer className="account-hub-panel__actions">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={panel.pendingAction === "reset-password"}
                    >
                      Send reset email
                    </Button>
                  </footer>
                </form>
              ) : null}
            </Panel>

            <Panel className="account-hub-panel__card" as="section">
              <header className="account-hub-panel__section-head">
                <h3>Continue with a provider</h3>
                <p>OAuth is available on web now. Desktop social sign-in is the next secure step.</p>
              </header>

              <nav className="account-hub-panel__providers" aria-label="Social sign-in providers">
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
              </nav>

              {panel.isDesktopMode ? (
                <aside className="account-hub-panel__hint">
                  Email and password already work in the desktop app. Google and GitHub will be added there after we wire a secure browser callback flow.
                </aside>
              ) : null}

              <aside className="account-hub-panel__guest-note">
                <MetaBadge text="Guest mode" accent={false} />
                <p>Browse and import remain available without an account. Publishing and Hub management require a verified account.</p>
              </aside>
            </Panel>
          </section>
        </>
      ) : null}

      {panel.isConfigured && !panel.isAuthLoading && panel.authState.isAuthenticated ? (
        <>
          <header className="account-hub-panel__tabs-row">
            <Tabs
              items={panel.signedInTabs}
              activeKey={panel.activeTab}
              onSelect={panel.setActiveTab}
              ariaLabel="Account management"
            />
            <Button
              variant="secondary"
              onClick={panel.handleSignOut}
              isLoading={panel.pendingAction === "sign-out"}
            >
              <FiLogOut />
              Sign out
            </Button>
          </header>

          <section className="account-hub-panel__grid account-hub-panel__grid--single" aria-label="Account management panels">
            <Panel className="account-hub-panel__card" as="section">
              {panel.activeTab === "overview" ? (
                <>
                  <header className="account-hub-panel__section-head">
                    <h3>{panel.authState.displayName || "Your account"}</h3>
                    <p>{panel.authState.email || "No email available"}</p>
                  </header>
                  <ul className="account-hub-panel__badge-row" aria-label="Account status badges">
                    {panel.accountBadges.map((badge) => (
                      <li key={badge.key}>
                        <MetaBadge text={badge.text} accent={badge.accent} />
                      </li>
                    ))}
                  </ul>
                  <dl className="account-hub-panel__summary-list">
                    <div>
                      <dt>Hub access</dt>
                      <dd>
                        {panel.authState.isEmailVerified
                          ? "Publish and manage enabled"
                          : "Verify email to publish and manage"}
                      </dd>
                    </div>
                    <div>
                      <dt>Password recovery</dt>
                      <dd>Email reset links are enabled</dd>
                    </div>
                    <div>
                      <dt>Sync</dt>
                      <dd>Planned after auth rollout is stable</dd>
                    </div>
                  </dl>
                  {!panel.authState.isEmailVerified ? (
                    <aside className="account-hub-panel__callout">
                      <FiMail />
                      <div>
                        <strong>Verify your email</strong>
                        <p>Publishing and deleting Hub decks stays locked until your email is confirmed.</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={panel.handleResendVerification}
                        isLoading={panel.pendingAction === "resend-verification"}
                      >
                        <FiRefreshCw />
                        Resend email
                      </Button>
                    </aside>
                  ) : null}
                </>
              ) : null}

              {panel.activeTab === "profile" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    panel.handleSaveProfile();
                  }}
                >
                  <header className="account-hub-panel__section-head">
                    <h3>Profile</h3>
                    <p>Update the name shown in your account and future Hub ownership UI.</p>
                  </header>
                  <label className="account-hub-panel__field">
                    <span>Display name</span>
                    <TextInput
                      value={panel.displayName}
                      onChange={(event) => panel.setDisplayName(event.target.value)}
                      placeholder="Your display name"
                    />
                  </label>
                  <label className="account-hub-panel__field">
                    <span>Email</span>
                    <TextInput value={panel.authState.email} disabled />
                  </label>
                  <footer className="account-hub-panel__actions">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={panel.pendingAction === "save-profile"}
                    >
                      Save profile
                    </Button>
                  </footer>
                </form>
              ) : null}

              {panel.activeTab === "security" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    panel.handleUpdatePassword();
                  }}
                >
                  <header className="account-hub-panel__section-head">
                    <h3>Security</h3>
                    <p>Keep your account safe with a strong password and a verified email.</p>
                  </header>
                  {!panel.authState.isEmailVerified ? (
                    <aside className="account-hub-panel__callout account-hub-panel__callout--stacked">
                      <div>
                        <strong>Email confirmation is still pending</strong>
                        <p>Confirm your inbox before you publish, update, or delete Hub decks.</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={panel.handleResendVerification}
                        isLoading={panel.pendingAction === "resend-verification"}
                      >
                        <FiRefreshCw />
                        Resend verification
                      </Button>
                    </aside>
                  ) : null}
                  <label className="account-hub-panel__field">
                    <span>New password</span>
                    <TextInput
                      type="password"
                      value={panel.nextPassword}
                      onChange={(event) => panel.setNextPassword(event.target.value)}
                      placeholder="Use at least 10 characters"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="account-hub-panel__field">
                    <span>Confirm new password</span>
                    <TextInput
                      type="password"
                      value={panel.confirmPassword}
                      onChange={(event) => panel.setConfirmPassword(event.target.value)}
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                  </label>
                  <footer className="account-hub-panel__actions">
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={panel.pendingAction === "update-password"}
                    >
                      <FiShield />
                      {panel.isRecoveryFlow ? "Finish recovery" : "Update password"}
                    </Button>
                    <Button variant="ghost" type="button" onClick={panel.handlePasswordResetRequest}>
                      Send another reset email
                    </Button>
                  </footer>
                </form>
              ) : null}

              {panel.activeTab === "hub" ? (
                <>
                  <header className="account-hub-panel__section-head">
                    <h3>My Hub decks</h3>
                    <p>Manage the public decks attached to this account.</p>
                  </header>

                  {panel.isOwnDecksLoading ? (
                    <p className="account-hub-panel__loading">Loading your Hub decks...</p>
                  ) : null}

                  {panel.ownDecksError ? (
                    <p className="account-hub-panel__inline-error">{panel.ownDecksError}</p>
                  ) : null}

                  {!panel.isOwnDecksLoading && !panel.ownDecksError && panel.ownDecks.length === 0 ? (
                    <p className="account-hub-panel__empty-state">
                      You have not published any Hub decks with this account yet.
                    </p>
                  ) : null}

                  <ul className="account-hub-panel__hub-list">
                    {panel.ownDecks.map((deck) => (
                      <li className="account-hub-panel__hub-item" key={deck.id}>
                        <article className="account-hub-panel__hub-main">
                          <header className="account-hub-panel__hub-head">
                            <strong>{deck.title || "Untitled deck"}</strong>
                            <ul className="account-hub-panel__hub-badges" aria-label={`Deck metadata for ${deck.title || "Untitled deck"}`}>
                              <li>
                                <MetaBadge text={renderDeckVersion(deck)} accent={false} />
                              </li>
                              <li>
                                <MetaBadge text={renderDeckMeta(deck)} accent={false} />
                              </li>
                            </ul>
                          </header>
                          <p>{deck.description || "No public description yet."}</p>
                        </article>
                        <footer className="account-hub-panel__hub-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => panel.handleCopyDeckLink(deck)}
                          >
                            <FiCopy />
                            Copy link
                          </Button>
                          {deck.slug ? (
                            <Link
                              className="ui-button ui-button--ghost ui-button--sm account-hub-panel__link-button"
                              to={buildBrowseDeckRoute(deck.slug)}
                            >
                              <FiExternalLink />
                              Open
                            </Link>
                          ) : null}
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            onClick={() => panel.handleDeleteHubDeck(deck)}
                            isLoading={panel.deletingHubDeckId === String(deck.id)}
                          >
                            <FiTrash2 />
                            Delete
                          </Button>
                        </footer>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {panel.activeTab === "delete" ? (
                <>
                  <header className="account-hub-panel__section-head">
                    <h3>Delete account</h3>
                    <p>This action will ultimately remove your public Hub decks as well.</p>
                  </header>
                  <aside className="account-hub-panel__danger-box">
                    <strong>Secure account deletion still needs one server-side step.</strong>
                    <p>
                      We can’t safely delete Supabase auth users from the client with just a publishable key. The next step is a protected Edge Function that performs the deletion with service-role privileges.
                    </p>
                    <p>
                      Once that function exists, this tab will delete your account and remove every public deck owned by it.
                    </p>
                  </aside>
                </>
              ) : null}
            </Panel>
          </section>
        </>
      ) : null}
    </article>
  );
});

AccountHubPanel.displayName = "AccountHubPanel";
