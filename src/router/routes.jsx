import NotFoundPage from "../components/pages/NotFoundPage/NotFoundPage";
import HomePage from "../components/pages/HomePage/HomePage";
import FlashcardsPage from "../components/pages/FlashcardsPage/FlashcardsPage";
import LearnPage from "../components/pages/LearnPage/LearnPage";
import TestPage from "../components/pages/TestPage/TestPage";
import SettingsPage from "../components/pages/SettingsPage/SettingsPage";
import homeIcon from "../assets/icons/home-icon.svg";
import cardsIcon from "../assets/icons/cards.svg";
import bookIcon from "../assets/icons/book-icon.svg";
import testIcon from "../assets/icons/test-icon.svg";
import settingsIcon from "../assets/icons/settings-icon.svg";
import { Navigate } from "react-router-dom";

export const ROUTES = [
  { path: "*", element: <Navigate to="/" replace /> },
  { path: "/", element: <HomePage />, label: "Home", icon: homeIcon },
  {
    path: "/flashcards",
    element: <FlashcardsPage />,
    label: "Flashcards",
    icon: cardsIcon,
  },
  { path: "/learn", element: <LearnPage />, label: "Learn", icon: bookIcon },
  { path: "/test", element: <TestPage />, label: "Test", icon: testIcon },
  {
    path: "/settings",
    element: <SettingsPage />,
    label: "Settings",
    icon: settingsIcon,
  },
];
