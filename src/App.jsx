// import { useState } from "react";
import "./App.css";
import Sidebar from "./components/layout/Sidebar/Sidebar";
import RoutesComponent from "./router/router.jsx";

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <RoutesComponent />
      </main>
    </div>
  );
}

export default App;
