
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Mic2,
  AudioLines,
  MessageCircle,
  Library,
  History,
  Settings,
  LogOut,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const links = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/voice-cloning",
    label: "Voice Cloning",
    icon: Mic2,
  },
  {
    to: "/text-to-speech",
    label: "Text to Speech",
    icon: AudioLines,
  },
  {
    to: "/conversation",
    label: "Conversation Agent",
    icon: MessageCircle,
  },
  {
    to: "/voice-library",
    label: "Voice Library",
    icon: Library,
  },
  {
    to: "/history",
    label: "History",
    icon: History,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon small">AI</div>
        <span>AI Voice Studio</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Bottom */}
      <div className="sidebar-bottom">
        {/* Upgrade Card */}
        <div className="upgrade-card">
          <strong>✨ Upgrade to Pro</strong>

          <p>
            Unlock more voice features and generation credits.
          </p>

          <button className="upgrade-button" disabled>
            Coming soon
          </button>
        </div>

        {/* User Profile */}
        <div className="profile">
          <div className="avatar">
            {user?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="profile-info">
            <strong>{user?.full_name || "User"}</strong>
            <span>Free Plan</span>
          </div>

          <button
            className="logout-button"
            title="Log out"
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
