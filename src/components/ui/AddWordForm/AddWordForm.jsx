import { useState } from "react";
import { LEVELS } from "../../../constants/FILTERS_CONSTS";
import { addCustomWord } from "../../../services/wordsManager";
import "./AddWordForm.css";

const PARTS_OF_SPEECH_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "idiom",
];

export default function AddWordForm({ onWordAdded, onCancel }) {
  const [formData, setFormData] = useState({
    eng: "",
    ru: "",
    pl: "",
    level: "A1",
    part_of_speech: "noun",
    tags: "",
    examples: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validation
    if (!formData.eng.trim()) {
      setError("English word is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Parse tags and examples
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const examples = formData.examples
        .split("\n")
        .map((ex) => ex.trim())
        .filter((ex) => ex.length > 0);

      const newWord = {
        ...formData,
        tags,
        examples,
      };

      addCustomWord(newWord);

      // Reset form
      setFormData({
        eng: "",
        ru: "",
        pl: "",
        level: "A1",
        part_of_speech: "noun",
        tags: "",
        examples: "",
      });

      if (onWordAdded) {
        onWordAdded();
      }
    } catch (err) {
      setError(err.message || "Failed to add word");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="add-word-form" onSubmit={handleSubmit}>
      <h3>Add New Word</h3>

      {error && <div className="add-word-form__error">{error}</div>}

      <div className="add-word-form__row">
        <div className="add-word-form__field">
          <label htmlFor="eng">
            English <span className="required">*</span>
          </label>
          <input
            type="text"
            id="eng"
            name="eng"
            value={formData.eng}
            onChange={handleChange}
            required
            placeholder="Enter English word"
          />
        </div>

        <div className="add-word-form__field">
          <label htmlFor="ru">Russian</label>
          <input
            type="text"
            id="ru"
            name="ru"
            value={formData.ru}
            onChange={handleChange}
            placeholder="Enter Russian translation"
          />
        </div>

        <div className="add-word-form__field">
          <label htmlFor="pl">Polish</label>
          <input
            type="text"
            id="pl"
            name="pl"
            value={formData.pl}
            onChange={handleChange}
            placeholder="Enter Polish translation"
          />
        </div>
      </div>

      <div className="add-word-form__row">
        <div className="add-word-form__field">
          <label htmlFor="level">Level</label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={handleChange}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="add-word-form__field">
          <label htmlFor="part_of_speech">Part of Speech</label>
          <select
            id="part_of_speech"
            name="part_of_speech"
            value={formData.part_of_speech}
            onChange={handleChange}
          >
            {PARTS_OF_SPEECH_OPTIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="add-word-form__field">
        <label htmlFor="tags">Tags (comma-separated)</label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g., greeting, polite, daily"
        />
      </div>

      <div className="add-word-form__field">
        <label htmlFor="examples">Examples (one per line)</label>
        <textarea
          id="examples"
          name="examples"
          value={formData.examples}
          onChange={handleChange}
          rows={3}
          placeholder="Enter example sentences, one per line"
        />
      </div>

      <div className="add-word-form__actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Word"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
