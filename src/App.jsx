import "./App.css";
import Header from "./components/layout/Header/Header";
import Sidebar from "./components/layout/Sidebar/Sidebar";
import { useLocation } from "react-router-dom";
import { ROUTES } from "./router/routes";
import RoutesComponent from "./router/router";
import { useState, useEffect } from "react";
import { Menu, X, Filter } from "lucide-react";

function App() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFilterButton, setShowFilterButton] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const currentRoute = ROUTES.find((route) => route.path === location.pathname);

  // Определяем, на странице ли мы Dictionary
  const isDictionaryPage =
    location.pathname === "/dictionary" ||
    location.pathname.includes("/dictionary");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Закрываем сайдбар при изменении маршрута
  useEffect(() => {
    setIsSidebarOpen(false);
    setShowFilterButton(false);
    setIsFilterPanelOpen(false);
  }, [location.pathname]);

  // Показываем кнопку фильтров только на мобильных и на странице Dictionary
  useEffect(() => {
    if (isMobile && isDictionaryPage) {
      setShowFilterButton(true);
    } else {
      setShowFilterButton(false);
    }
  }, [isMobile, isDictionaryPage]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
    setIsSidebarOpen(false); // Закрываем сайдбар при открытии фильтров

    // Диспатчим событие для DictionaryPage
    if (!isFilterPanelOpen) {
      const event = new CustomEvent("openDictionaryFilters");
      window.dispatchEvent(event);
    } else {
      const event = new CustomEvent("closeDictionaryFilters");
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="app-container">
      <Sidebar isMobileOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Overlay для мобильных */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <main className="page-content-container">
        <Header
          headerTitle={currentRoute?.label ?? ""}
          onMenuClick={toggleSidebar}
          isMobile={isMobile}
        />
        <RoutesComponent />
      </main>

      {/* Кнопка меню для мобильных (плавающая) */}
      {isMobile && (
        <>
          <button
            className={`mobile-menu-button ${isFilterPanelOpen ? "filter-mode" : ""}`}
            onClick={isFilterPanelOpen ? toggleFilterPanel : toggleSidebar}
            aria-label={isFilterPanelOpen ? "Закрыть фильтры" : "Меню"}
          >
            {isFilterPanelOpen ? (
              <X size={24} />
            ) : isSidebarOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>

          {/* Вылетающая кнопка фильтров */}
          {showFilterButton && !isFilterPanelOpen && (
            <button
              className="mobile-filter-button"
              onClick={toggleFilterPanel}
              aria-label="Открыть фильтры"
            >
              <Filter size={20} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
