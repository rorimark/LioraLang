import "./PageHeader.css";

export const PageHeader = ({ title = "Header Title" }) => (
  <header className="page-header">
    <h1>{title}</h1>
  </header>
);
