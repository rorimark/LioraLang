import { useCallback } from "react";
import { useAppPreferences } from "@shared/lib/appPreferences";

const toTags = (value) => {
  if (typeof value !== "string") {
    return [];
  }

  const uniqueTags = [];
  const seen = new Set();

  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLowerCase();

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      uniqueTags.push(tag);
    });

  return uniqueTags.slice(0, 10);
};

export const useAppPreferencesSection = () => {
  const { appPreferences, updateAppPreferences } = useAppPreferences();

  const handleBooleanFieldChange = useCallback(
    (event) => {
      const { name, checked } = event.target;
      const [sectionKey, fieldKey] = name.split(".");

      if (!sectionKey || !fieldKey) {
        return;
      }

      updateAppPreferences({
        [sectionKey]: {
          [fieldKey]: Boolean(checked),
        },
      });
    },
    [updateAppPreferences],
  );

  const handleSelectFieldChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      const [sectionKey, fieldKey] = name.split(".");

      if (!sectionKey || !fieldKey) {
        return;
      }

      updateAppPreferences({
        [sectionKey]: {
          [fieldKey]: value,
        },
      });
    },
    [updateAppPreferences],
  );

  const handleNumberFieldChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      const [sectionKey, fieldKey] = name.split(".");

      if (!sectionKey || !fieldKey) {
        return;
      }

      updateAppPreferences({
        [sectionKey]: {
          [fieldKey]: Number(value),
        },
      });
    },
    [updateAppPreferences],
  );

  const handleTextFieldChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      const [sectionKey, fieldKey] = name.split(".");

      if (!sectionKey || !fieldKey) {
        return;
      }

      if (sectionKey === "deckDefaults" && fieldKey === "tags") {
        updateAppPreferences({
          [sectionKey]: {
            [fieldKey]: toTags(value),
          },
        });
        return;
      }

      updateAppPreferences({
        [sectionKey]: {
          [fieldKey]: value,
        },
      });
    },
    [updateAppPreferences],
  );

  return {
    appPreferences,
    handleBooleanFieldChange,
    handleSelectFieldChange,
    handleNumberFieldChange,
    handleTextFieldChange,
  };
};
