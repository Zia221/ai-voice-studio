import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Mic, Upload, Trash2, AudioLines, CheckCircle2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

interface VoiceProfile {
  id: string;
  name: string;
  description: string | null;
  voice_id: string;
  status: string;
  created_at: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

async function convertToWav(recording: Blob): Promise<File> {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Your browser does not support audio conversion.");
  }

  const audioContext = new AudioContextClass();

  try {
    const audioBuffer = await audioContext.decodeAudioData(
      await recording.arrayBuffer()
    );

    // Mix every input channel into one mono channel.
    const monoSamples = new Float32Array(audioBuffer.length);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let i = 0; i < audioBuffer.length; i++) {
        monoSamples[i] += channelData[i] / audioBuffer.numberOfChannels;
      }
    }

    // Create a standard 16-bit PCM WAV file.
    const bytesPerSample = 2;
    const dataSize = monoSamples.length * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // PCM header size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < monoSamples.length; i++) {
      const sample = Math.max(-1, Math.min(1, monoSamples[i]));
      const pcmValue =
        sample < 0 ? sample * 0x8000 : sample * 0x7fff;

      view.setInt16(44 + i * bytesPerSample, pcmValue, true);
    }

    return new File([wavBuffer], "my-voice-recording.wav", {
      type: "audio/wav",
    });
  } finally {
    await audioContext.close();
  }
}

export default function VoiceCloning() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadVoices() {
    try {
      const response = await api.get("/voices");
      setVoices(response.data);
    } catch {
      setError("Could not load your voice profiles.");
    }
  }

  useEffect(() => {
    void loadVoices();

    return () => {
      // Release the microphone if the page is closed while recording.
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    setError("");
    setSuccess("");
    setRecordingMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingMessage(
        "Microphone access is unavailable. Use localhost or a secure HTTPS connection."
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecordingMessage("Your browser does not support audio recording.");
      return;
    }

    try {
      // A new recording replaces the previously selected audio file.
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      const supportedMimeType = preferredMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType)
      );

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingMessage("A recording error occurred. Please try again.");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
      };

      recorder.onstop = async () => {
        try {
          const recording = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });

          if (recording.size === 0) {
            throw new Error("No audio was recorded. Please try again.");
          }

          const wavFile = await convertToWav(recording);

          if (wavFile.size > MAX_FILE_SIZE) {
            throw new Error(
              "Recording exceeds the 25 MB limit. Please record a shorter sample."
            );
          }

          setFile(wavFile);
          setRecordingMessage(
            "Recording ready. Your audio has been converted to mono WAV."
          );
        } catch (recordingError) {
          setRecordingMessage(
            recordingError instanceof Error
              ? recordingError.message
              : "Could not process the recording."
          );
          setFile(null);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          setIsRecording(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingMessage("Recording your voice...");
    } catch (recordingError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setIsRecording(false);
      setRecordingMessage(
        recordingError instanceof Error
          ? recordingError.message
          : "Could not access the microphone. Check your browser permissions."
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecordingMessage("Processing your recording...");
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setSuccess("");

    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      event.target.value = "";
      setRecordingMessage("The selected file exceeds the 25 MB limit.");
      return;
    }

    setRecordingMessage("");
    setFile(selectedFile);
  }

  function removeSelectedFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setRecordingMessage("");
  }

  async function handleClone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isRecording) {
      setError("Please stop the recording before creating your voice clone.");
      return;
    }

    if (!file || !consent) {
      setError("Choose an audio file and confirm voice consent.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The audio file must be 25 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("consent", "true");
    formData.append("file", file);

    setLoading(true);

    try {
      await api.post("/voices/clone", formData);

      setSuccess("Your voice clone was created successfully!");
      setName("");
      setDescription("");
      setFile(null);
      setConsent(false);
      setRecordingMessage("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadVoices();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Voice cloning failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteVoice(id: string) {
    if (!window.confirm("Delete this voice profile permanently?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.delete(`/voices/${id}`);
      setSuccess("Voice profile deleted successfully.");
      await loadVoices();
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Could not delete voice profile."
      );
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content voice-page">
        <header className="voice-page-header">
          <div>
            <span className="eyebrow">AI VOICE STUDIO</span>
            <h1>Voice Cloning</h1>
            <p>
              Create your own AI voice using an authorized voice recording.
            </p>
          </div>

          <div className="voice-header-icon">
            <AudioLines size={35} />
          </div>
        </header>

        {error && (
          <div className="voice-message error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="voice-message success" role="status">
            {success}
          </div>
        )}

        <div className="voice-layout">
          <section className="voice-panel">
            <div className="panel-heading">
              <Mic size={21} />
              <h2>Create a Voice Clone</h2>
            </div>

            <p className="voice-help">
              Upload a clear recording of your own voice or record directly
              using your microphone. Around 1–2 minutes is recommended.
            </p>

            <form onSubmit={handleClone}>
              <label htmlFor="voice-name">Voice name</label>
              <input
                id="voice-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. My Natural Voice"
                minLength={2}
                maxLength={100}
                required
              />

              <label htmlFor="voice-description">
                Description (optional)
              </label>
              <input
                id="voice-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your voice"
                maxLength={500}
              />

              <label htmlFor="voice-file">Upload voice recording</label>

              <div className="upload-area">
                <Upload size={30} />

                <strong>{file ? file.name : "Choose an audio file"}</strong>
                <span>MP3, WAV, M4A, OGG or FLAC · Max 25 MB</span>

                <input
                  ref={fileInputRef}
                  id="voice-file"
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.flac,audio/*"
                  onChange={handleFileChange}
                />

                <div className="recording-controls">
                  {!isRecording ? (
                    <button
                      type="button"
                      className="record-button"
                      onClick={startRecording}
                      disabled={loading}
                    >
                      <Mic size={17} />
                      Record with microphone
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="stop-recording-button"
                      onClick={stopRecording}
                    >
                      <span className="recording-dot" />
                      Stop recording
                    </button>
                  )}

                  {recordingMessage && (
                    <p className="recording-status" role="status">
                      {recordingMessage}
                    </p>
                  )}
                </div>
              </div>

              {file && (
                <div className="selected-file">
                  <CheckCircle2 size={17} />
                  <span>
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={removeSelectedFile}>
                    Remove
                  </button>
                </div>
              )}

              <label className="consent-option">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  I confirm that this is my own voice, or I have the necessary
                  authorization to clone it.
                </span>
              </label>

              <button
                type="submit"
                className="clone-button"
                disabled={loading || isRecording || !file || !consent}
              >
                {loading ? "Creating voice clone..." : "Create Voice Clone"}
              </button>
            </form>
          </section>

          <section className="voice-panel tips-panel">
            <h2>Recording Tips</h2>

            <div className="tip">
              <CheckCircle2 />
              <div>
                <strong>Clear recording</strong>
                <p>Choose a quiet room with minimal background noise.</p>
              </div>
            </div>

            <div className="tip">
              <CheckCircle2 />
              <div>
                <strong>Good duration</strong>
                <p>Aim for approximately 1–2 minutes of speech.</p>
              </div>
            </div>

            <div className="tip">
              <CheckCircle2 />
              <div>
                <strong>Consistent voice</strong>
                <p>Speak naturally with a consistent volume and tone.</p>
              </div>
            </div>

            <div className="tip">
              <CheckCircle2 />
              <div>
                <strong>One speaker</strong>
                <p>Make sure nobody else is speaking in the recording.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="voice-panel voice-library-panel">
          <div className="library-heading">
            <div>
              <h2>Your Voice Profiles</h2>
              <p>Manage your created voice clones.</p>
            </div>
            <span>{voices.length} voices</span>
          </div>

          {voices.length === 0 ? (
            <div className="voice-empty">
              <AudioLines size={35} />
              <strong>No voice profiles yet</strong>
              <p>Your created voices will appear here.</p>
            </div>
          ) : (
            <div className="voice-list">
              {voices.map((voice) => (
                <div className="voice-item" key={voice.id}>
                  <div className="voice-avatar">
                    <AudioLines />
                  </div>

                  <div className="voice-item-info">
                    <strong>{voice.name}</strong>
                    <span>
                      {voice.description || "Personal voice clone"}
                    </span>
                    <small>
                      Created{" "}
                      {new Date(voice.created_at).toLocaleDateString()}
                    </small>
                  </div>

                  <span className="voice-status">{voice.status}</span>

                  <button
                    type="button"
                    className="delete-voice"
                    title="Delete voice"
                    aria-label={`Delete ${voice.name}`}
                    onClick={() => deleteVoice(voice.id)}
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
