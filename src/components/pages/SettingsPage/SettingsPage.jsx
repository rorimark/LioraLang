import { useState } from "react";
import "./SettingsPage.css";
import {
  pageContainerStyle,
  mainContentStyle,
} from "../../../styles/commonStyles";
import Header from "../../layout/Header/Header";
import AddWordForm from "../../ui/AddWordForm/AddWordForm";
import { useWords } from "../../../hooks/useWords";
import {
  getCustomWords,
  clearCustomWords,
  exportWordsAsJSON,
} from "../../../services/wordsManager";

export default function SettingsPage() {
  const { words, refreshWords } = useWords();
  const [showAddForm, setShowAddForm] = useState(false);
  const customWords = getCustomWords();

  const handleWordAdded = () => {
    refreshWords();
    setShowAddForm(false);
  };

  const handleExport = () => {
    exportWordsAsJSON(words, "lioralang_words.json");
  };

  const handleClearCustom = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all custom words? This cannot be undone.",
      )
    ) {
      clearCustomWords();
      refreshWords();
    }
  };

  return (
    <div style={pageContainerStyle}>
      <Header headerTitle="Settings" />
      <main className="settings-page-content" style={mainContentStyle}>
        <div className="settings-container">
          <section className="settings-section">
            <h2>Word Management</h2>

            {!showAddForm ? (
              <div className="settings-actions">
                <button
                  className="settings-button settings-button--primary"
                  onClick={() => setShowAddForm(true)}
                >
                  Add New Word
                </button>
                <button
                  className="settings-button"
                  onClick={handleExport}
                  disabled={!words.length}
                >
                  Export All Words (JSON)
                </button>
                {customWords.length > 0 && (
                  <button
                    className="settings-button settings-button--danger"
                    onClick={handleClearCustom}
                  >
                    Clear Custom Words ({customWords.length})
                  </button>
                )}
              </div>
            ) : (
              <AddWordForm
                onWordAdded={handleWordAdded}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {customWords.length > 0 && (
              <div className="custom-words-info">
                <p>
                  You have {customWords.length} custom word
                  {customWords.length !== 1 ? "s" : ""} stored locally.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
