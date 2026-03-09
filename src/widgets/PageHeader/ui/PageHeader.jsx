import "./PageHeader.css";
import { PageMetaBadges } from "./PageMetaBadges";

export const PageHeader = ({
  title = "Header Title",
  subtitle = "",
  compact = false,
}) => {
  const headerClassName = compact
    ? "page-header page-header--compact"
    : "page-header";

  return (
    <header className={headerClassName}>
      <div className="page-header__left">
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      <PageMetaBadges />
    </header>
  );
};
