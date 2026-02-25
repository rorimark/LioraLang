import "./PageHeader.css";
import { PageMetaBadges } from "./PageMetaBadges";

export const PageHeader = ({ title = "Header Title", subtitle = "" }) => {
  return (
    <header className="page-header">
      <div className="page-header__left">
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      <PageMetaBadges />
    </header>
  );
};
