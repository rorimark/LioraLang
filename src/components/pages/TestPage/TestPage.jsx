import Header from "../../layout/Header/Header";
import "./TestPage.css";

export default function TestPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: "#ffffff",
      }}
    >
      <Header headerTitle="Test" />
      <main className="test-page-content" style={{ height: "90%" }}></main>
    </div>
  );
}
