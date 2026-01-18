import Header from "../../layout/Header/Header";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // alignItems: "center",
        // justifyContent: "center",
        height: "100%",
        color: "#ffffff",
      }}
    >
      <Header headerTitle="Home" />
      <main className="home-page-content" style={{ height: "90%" }}></main>
    </div>
  );
}
