import HomePage from "../components/pages/HomePage";
import FlashcardsPage from "../components/pages/FlashcardsPage";
import LearnPage from "../components/pages/LearnPage";
import TestPage from "../components/pages/TestPage";
import SettingsPage from "../components/pages/SettingsPage";
import homeIcon from "../assets/icons/home-icon.svg";
import cardsIcon from "../assets/icons/cards.svg";
import bookIcon from "../assets/icons/book-icon.svg";
import testIcon from "../assets/icons/test-icon.svg";
import settingsIcon from "../assets/icons/settings-icon.svg";

export const ROUTES = [
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
