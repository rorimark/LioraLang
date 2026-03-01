import { memo } from "react";
import "./AccountHubPanel.css";

export const AccountHubPanel = memo(() => {
  return (
    <article className="panel account-hub-panel">
      <header className="account-hub-panel__head">
        <h2>Account Hub</h2>
        <p>
          This page is reserved for future sign in, registration, and account
          management.
        </p>
      </header>

      <div className="account-hub-panel__actions">
        <button type="button" disabled>
          Sign in (soon)
        </button>
        <button type="button" disabled>
          Create account (soon)
        </button>
      </div>

      <ul className="account-hub-panel__list">
        <li>Connect LioraLangHub profile</li>
        <li>Manage shared deck presets</li>
        <li>Sync cloud preferences and history</li>
      </ul>
    </article>
  );
});

AccountHubPanel.displayName = "AccountHubPanel";
