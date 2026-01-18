import Header from "../../layout/Header/Header";
import "./LearnPage.css";

export default function LearnPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: "#ffffff",
      }}
    >
      <Header headerTitle="Learn" />
      <main className="learn-page-content" style={{ height: "90%" }}></main>
    </div>
  );
}
