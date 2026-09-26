import { createContext, useContext } from "react";

export const SettingsSearchContext = createContext({ words: [], isMatched: true });

export const useIsSettingsSearching = () =>
  useContext(SettingsSearchContext).words.length > 0;
