import "./Header.css";
import HistoryNavigationButtons from "../../ui/HistoryNavigationButtons/HistoryNavigationButtons";
import { useNavigate } from "react-router-dom";

export default function Header({ headerTitle }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <div className="page-header__content">
        <HistoryNavigationButtons
          onPrev={() => {
            navigate(-1);
          }}
          onNext={() => {
            navigate(1);
          }}
        />
        {/* {isMobile && (
          <button
            className="header-menu-button"
            onClick={onMenuClick}
            aria-label="Открыть меню"
          >
            <Menu size={24} />
          </button>
        )} */}
        <h1 className="page-header__title">{headerTitle}</h1>
      </div>
    </header>
  );
}
