import { createContext, useContext } from "react";

const DeckEditorPanelContext = createContext(null);

export const DeckEditorPanelProvider = DeckEditorPanelContext.Provider;

export const useDeckEditorPanelContext = () => {
  const contextValue = useContext(DeckEditorPanelContext);

  if (!contextValue) {
    throw new Error("DeckEditorPanelContext is unavailable");
  }

  return contextValue;
};
