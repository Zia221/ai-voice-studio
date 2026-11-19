
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Play,
  Pause,
  Download,
  Trash2,
  Volume2,
  WandSparkles,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import api from "../services/api";

interface VoiceProfile {
  id: string;
  name: string;
  status: string;
}

interface Generation {
  id: string;
  voice_profile_id: string;
  text: string;
  character_count: number;
  status: string;
  created_at: string;
  audio_url: string;
}

export default function TextToSpeech() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [history, setHistory] = useState<Generation[]>([]);

  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");

  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.85);
  const [style, setStyle] = useState(0);
  const [speed, setSpeed] = useState(1);

  const [speakerBoost, setSpeakerBoost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentAudio, setCurrentAudio] = useState("");
  const [playingId, setPlayingId] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function loadData() {
    try {
      const [voiceResponse, historyResponse] = await Promise.all([
        api.get("/voices"),
        api.get("/speech/history"),
      ]);

      const activeVoices = voiceResponse.data.filter(
        (voice: VoiceProfile) => voice.status === "active"
      );

      setVoices(activeVoices);
      setHistory(historyResponse.data);

      if (activeVoices.length > 0) {
        setVoiceId((current) =>
          current || activeVoices[0].id
        );
      }
    } catch {
      setError("Could not load your voices or generation history.");
    }
  }

  useEffect(() => {
    void loadData();

    return () => {
      if (currentAudio.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudio);
      }
    };
  }, [currentAudio]);

  async function generateSpeech() {
    if (!text.trim() || !voiceId) {
      setError("Please enter text and select a voice.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/speech/generate", {
        text,
        voice_profile_id: voiceId,
        stability,
        similarity_boost: similarity,
        style,
        speed,
        use_speaker_boost: speakerBoost,
      });

      const generation = response.data as Generation;

      // Refresh generation history.
      await loadData();

      // Fetch the newly generated MP3.
      const audioResponse = await api.get(
        generation.audio_url,
        { responseType: "blob" }
      );

      const blobUrl = URL.createObjectURL(audioResponse.data);

      // Revoke the previous temporary audio URL.
      if (currentAudio.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudio);
      }

      setCurrentAudio(blobUrl);
      setPlayingId(generation.id);

      // Load and play the new audio immediately.
      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.load();
        await audioRef.current.play();
      }

      setSuccess("Your speech was generated successfully!");
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Speech generation failed. Please try again."
      );
      setPlayingId("");
    } finally {
      setLoading(false);
    }
  }

  async function playAudio(generation: Generation) {
    if (!audioRef.current) return;

    if (playingId === generation.id) {
      audioRef.current.pause();
      setPlayingId("");
      return;
    }

    try {
      const response = await api.get(generation.audio_url, {
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(response.data);

      if (currentAudio.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudio);
      }

      setCurrentAudio(blobUrl);
      setPlayingId(generation.id);

      audioRef.current.src = blobUrl;
      audioRef.current.load();

      await audioRef.current.play();
    } catch {
      setError("Could not play this audio.");
      setPlayingId("");
    }
  }

  async function downloadAudio(generation: Generation) {
    try {
      const response = await api.get(generation.audio_url, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = `ai-voice-${generation.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download audio.");
    }
  }

  async function deleteGeneration(id: string) {
    if (!window.confirm("Delete this generated audio permanently?")) {
      return;
    }

    try {
      await api.delete(`/speech/${id}`);

      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId("");
      }

      await loadData();
      setSuccess("Audio deleted successfully.");
    } catch {
      setError("Could not delete this audio.");
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content tts-page">
        <header className="tts-header">
          <div>
            <span className="tts-eyebrow">AI VOICE STUDIO</span>
            <h1>Text to Speech</h1>
            <p>
              Turn your text into natural speech using your cloned voice.
            </p>
          </div>

          <div className="tts-header-icon">
            <AudioLines size={34} />
          </div>
        </header>

        {error && <div className="tts-message error">{error}</div>}
        {success && <div className="tts-message success">{success}</div>}

        <div className="tts-grid">
          <section className="tts-panel editor-panel">
            <div className="tts-panel-title">
              <WandSparkles size={20} />
              <h2>Create your speech</h2>
            </div>

            <label htmlFor="tts-text">Enter your text</label>

            <textarea
              id="tts-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type something here... Your cloned voice will speak it."
              maxLength={5000}
              rows={9}
            />

            <div className="character-counter">
              <span>{text.length} / 5000 characters</span>
              <span>Text-to-Speech</span>
            </div>

            <label htmlFor="tts-voice">Select your voice</label>

            <select
              id="tts-voice"
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value)}
            >
              <option value="">Choose a voice</option>

              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>

            {voices.length === 0 && (
              <p className="tts-help">
                No cloned voices found. Create one in Voice Cloning first.
              </p>
            )}

            <div className="tts-settings">
              <h3>Voice settings</h3>

              <div className="tts-slider">
                <label>
                  Stability
                  <span>{Math.round(stability * 100)}%</span>
                </label>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={stability}
                  onChange={(e) =>
                    setStability(Number(e.target.value))
                  }
                />
              </div>

              <div className="tts-slider">
                <label>
                  Similarity
                  <span>{Math.round(similarity * 100)}%</span>
                </label>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarity}
                  onChange={(e) =>
                    setSimilarity(Number(e.target.value))
                  }
                />
              </div>

              <div className="tts-slider">
                <label>
                  Style
                  <span>{Math.round(style * 100)}%</span>
                </label>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={style}
                  onChange={(e) =>
                    setStyle(Number(e.target.value))
                  }
                />
              </div>

              <div className="tts-slider">
                <label>
                  Speed
                  <span>{speed.toFixed(2)}x</span>
                </label>

                <input
                  type="range"
                  min="0.7"
                  max="1.2"
                  step="0.05"
                  value={speed}
                  onChange={(e) =>
                    setSpeed(Number(e.target.value))
                  }
                />
              </div>

              <label className="speaker-option">
                <input
                  type="checkbox"
                  checked={speakerBoost}
                  onChange={(e) =>
                    setSpeakerBoost(e.target.checked)
                  }
                />
                Enable speaker boost
              </label>
            </div>

            <button
              className="tts-generate-button"
              onClick={generateSpeech}
              disabled={loading || !text.trim() || !voiceId}
            >
              <WandSparkles size={18} />
              {loading ? "Generating speech..." : "Generate Speech"}
            </button>
          </section>

          <section className="tts-panel preview-panel">
            <div className="tts-panel-title">
              <Volume2 size={20} />
              <h2>Audio preview</h2>
            </div>

            <div className="audio-preview">
              <div className="audio-icon">
                <AudioLines size={35} />
              </div>

              <strong>Your generated audio</strong>

              <p>
                Generate speech to listen to your cloned voice.
              </p>

              <audio
                ref={audioRef}
                controls
                onEnded={() => setPlayingId("")}
                onError={() => setPlayingId("")}
              />

              <button
                className="tts-download-button"
                onClick={() => {
                  const latest = history[0];

                  if (latest) {
                    void downloadAudio(latest);
                  }
                }}
                disabled={!history.length}
              >
                <Download size={17} />
                Download latest audio
              </button>
            </div>
          </section>
        </div>

        <section className="tts-panel history-panel">
          <div className="history-header">
            <div>
              <h2>Generation History</h2>
              <p>Your previously generated speech.</p>
            </div>

            <span>{history.length} generations</span>
          </div>

          {history.length === 0 ? (
            <div className="tts-empty">
              <AudioLines size={34} />
              <strong>No generations yet</strong>
              <p>Your generated audio will appear here.</p>
            </div>
          ) : (
            <div className="generation-list">
              {history.map((item) => (
                <div className="generation-item" key={item.id}>
                  <div className="generation-icon">
                    <AudioLines size={21} />
                  </div>

                  <div className="generation-info">
                    <strong>
                      {item.text.slice(0, 65)}
                      {item.text.length > 65 ? "..." : ""}
                    </strong>

                    <span>
                      {item.character_count} characters ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    title="Play or pause"
                    onClick={() => void playAudio(item)}
                  >
                    {playingId === item.id ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>

                  <button
                    title="Download"
                    onClick={() => void downloadAudio(item)}
                  >
                    <Download size={18} />
                  </button>

                  <button
                    title="Delete"
                    className="history-delete"
                    onClick={() => void deleteGeneration(item.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
