import { Navigate } from "react-router-dom";
import NotFoundPage from "../components/pages/NotFoundPage/NotFoundPage";
import HomePage from "../components/pages/HomePage/HomePage";
import FlashcardsPage from "../components/pages/FlashcardsPage/FlashcardsPage";
import LearnPage from "../components/pages/LearnPage/LearnPage";
import TestPage from "../components/pages/TestPage/TestPage";
import SettingsPage from "../components/pages/SettingsPage/SettingsPage";
import DictionaryPage from "../components/pages/DictionaryPage/DictionaryPage";
import homeIcon from "../assets/icons/home-icon.svg";
import flashcardIcon from "../assets/icons/flashcard-icon.svg";
import learnIcon from "../assets/icons/graduation-cap-icon.svg";
import testIcon from "../assets/icons/test-icon.svg";
import dictionaryIcon from "../assets/icons/dictionary-icon.svg";
import settingsIcon from "../assets/icons/settings-icon.svg";

export const ROUTES = [
  { path: "*", element: <Navigate to="/" replace /> },
  { path: "/", element: <HomePage />, label: "Home", icon: homeIcon },
  {
    path: "/flashcards",
    element: <FlashcardsPage />,
    label: "Flashcards",
    icon: flashcardIcon,
  },
  { path: "/learn", element: <LearnPage />, label: "Learn", icon: learnIcon },
  { path: "/test", element: <TestPage />, label: "Test", icon: testIcon },
  {
    path: "/dictionary",
    element: <DictionaryPage />,
    label: "Dictionary",
    icon: dictionaryIcon,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    label: "Settings",
    icon: settingsIcon,
  },
];
