import { useEffect } from "react";
import "./styles/App.css";
import { AppRouter } from "@app/router";
import { applyTheme, getSavedTheme } from "@shared/lib/theme";

export const App = () => {
  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  return <AppRouter />;
};
