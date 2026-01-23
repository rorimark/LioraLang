import "./LearnPage.css";
import { pageContainerStyle, mainContentStyle } from "../../../styles/commonStyles";
import Header from "../../layout/Header/Header";

export default function LearnPage() {
  return (
    <div style={pageContainerStyle}>
      <Header headerTitle="Learn" />
      <main className="learn-page-content" style={mainContentStyle}></main>
    </div>
  );
}
