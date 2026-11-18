import {
  Mic2,
  AudioLines,
  MessageCircle,
  Library,
  ArrowUpRight,
  Clock,
  Sparkles,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const actions = [
  {
    title: "Voice Cloning",
    description: "Create your personal AI voice.",
    icon: Mic2,
    link: "/voice-cloning",
  },
  {
    title: "Generate Speech",
    description: "Turn text into natural speech.",
    icon: AudioLines,
    link: "/text-to-speech",
  },
  {
    title: "Start Conversation",
    description: "Talk with AI using your voice.",
    icon: MessageCircle,
    link: "/conversation",
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <span>AI Voice Studio</span>
          <div className="topbar-user">
            <div className="avatar">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            {user?.full_name}
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="eyebrow">YOUR PERSONAL VOICE WORKSPACE</span>
            <h1>Welcome back, {user?.full_name} 👋</h1>
            <p>
              Create, clone and speak with your own AI voice.
              Everything in one place.
            </p>
          </div>

          <div className="banner-icon">
            <AudioLines size={76} />
          </div>
        </section>

        <div className="section-heading">
          <h2>Quick Actions</h2>
          <span>Choose what you want to do</span>
        </div>

        <section className="action-grid">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                to={action.link}
                className="action-card"
                key={action.title}
              >
                <div className="action-icon">
                  <Icon size={24} />
                </div>

                <h3>{action.title}</h3>
                <p>{action.description}</p>

                <span className="card-link">
                  Get started <ArrowUpRight size={16} />
                </span>
              </Link>
            );
          })}
        </section>

        <div className="section-heading">
          <h2>Your Workspace</h2>
          <span>Overview of your voice studio</span>
        </div>

        <section className="overview-grid">
          <div className="overview-card">
            <div className="overview-icon purple">
              <Library />
            </div>
            <span>Voice Profiles</span>
            <strong>0</strong>
            <small>No voices created yet</small>
          </div>

          <div className="overview-card">
            <div className="overview-icon blue">
              <AudioLines />
            </div>
            <span>Generated Audio</span>
            <strong>0</strong>
            <small>Your audio creations</small>
          </div>

          <div className="overview-card">
            <div className="overview-icon teal">
              <MessageCircle />
            </div>
            <span>Conversations</span>
            <strong>0</strong>
            <small>Your AI conversations</small>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <div className="panel-heading">
              <Clock size={19} />
              <h3>Recent Activity</h3>
            </div>

            <div className="empty-state">
              <HistoryIcon />
              <strong>No activity yet</strong>
              <p>Your recent voice activities will appear here.</p>
            </div>
          </div>

          <div className="promo-panel">
            <Sparkles size={27} />
            <h2>Your Voice. Your AI.</h2>
            <p>
              Your personal voice studio is ready.
              Start by exploring the available tools.
            </p>
            <Link to="/voice-cloning">
              Create your first voice <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function HistoryIcon() {
  return <Library size={30} />;
}