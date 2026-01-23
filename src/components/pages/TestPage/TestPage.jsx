import "./TestPage.css";
import { pageContainerStyle, mainContentStyle } from "../../../styles/commonStyles";
import Header from "../../layout/Header/Header";

export default function TestPage() {
  return (
    <div style={pageContainerStyle}>
      <Header headerTitle="Test" />
      <main className="test-page-content" style={mainContentStyle}></main>
    </div>
  );
}
