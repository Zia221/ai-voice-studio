import { useEffect, useState } from "react";
import api from "./services/api";
import "./App.css";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [databaseStatus, setDatabaseStatus] = useState("Checking...");

  useEffect(() => {
    async function checkServices() {
      try {
        const backend = await api.get("/health");
        setBackendStatus(backend.data.status);
      } catch {
        setBackendStatus("Disconnected");
      }

      try {
        const database = await api.get("/health/database");
        setDatabaseStatus(database.data.status);
      } catch {
        setDatabaseStatus("Disconnected");
      }
    }

    checkServices();
  }, []);

  return (
    <main className="app">
      <div className="container">
        <div className="logo">AI</div>

        <h1>AI Voice Studio</h1>

        <p className="subtitle">
          Your voice. Your AI. Your conversations.
        </p>

        <div className="status-card">
          <h2>System Status</h2>

          <div className="status-row">
            <span>Backend API</span>
            <strong>{backendStatus}</strong>
          </div>

          <div className="status-row">
            <span>PostgreSQL</span>
            <strong>{databaseStatus}</strong>
          </div>
        </div>

        <p className="footer">
          AI Voice Studio — Development Environment
        </p>
      </div>
    </main>
  );
}

export default App;