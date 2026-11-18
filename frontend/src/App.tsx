import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>This feature will be implemented in an upcoming phase.</p>
      <a href="/dashboard">Return to dashboard</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/voice-cloning" element={<ComingSoon title="Voice Cloning" />} />
            <Route path="/text-to-speech" element={<ComingSoon title="Text to Speech" />} />
            <Route path="/conversation" element={<ComingSoon title="AI Conversation Agent" />} />
            <Route path="/voice-library" element={<ComingSoon title="Voice Library" />} />
            <Route path="/history" element={<ComingSoon title="History" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}