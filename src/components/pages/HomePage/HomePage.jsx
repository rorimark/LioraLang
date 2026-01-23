import "./HomePage.css";
import { pageContainerStyle, mainContentStyle } from "../../../styles/commonStyles";
import Header from "../../layout/Header/Header";

export default function HomePage() {
  return (
    <div style={pageContainerStyle}>
      <Header headerTitle="Home" />
      <main className="home-page-content" style={mainContentStyle}></main>
    </div>
  );
}
