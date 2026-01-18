import Header from "../../layout/Header/Header";
import "./SettingsPage.css";

export default function SettingsPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: "#ffffff",
      }}
    >
      <Header headerTitle="Settings" />
      <main className="settings-page-content" style={{ height: "90%" }}></main>
    </div>
  );
}
