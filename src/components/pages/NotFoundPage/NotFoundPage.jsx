import "./NotFoundPage.css";
import { pageContainerStyle } from "../../../styles/commonStyles";

export default function NotFoundPage() {
  return (
    <div style={pageContainerStyle}>
      <main className="page-not-found">
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </main>
    </div>
  );
}
