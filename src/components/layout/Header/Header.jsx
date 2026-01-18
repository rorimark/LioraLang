import "./Header.css";
import { useNavigate } from "react-router-dom";
import HistoryNavigationButtons from "../../ui/HistoryNavigationButtons/HistoryNavigationButtons";

export default function Header({ headerTitle }) {
  const navigate = useNavigate();

  const handlePrev = () => {
    navigate(-1);
  };

  const handleNext = () => {
    navigate(1);
  };

  return (
    <header className="page-header">
      <HistoryNavigationButtons onPrev={handlePrev} onNext={handleNext} />
      <h1 className="page-header__title">{headerTitle}</h1>
    </header>
  );
}
