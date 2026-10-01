import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TextEditor } from './components/TextEditor';
import { VoiceSettings } from './components/VoiceSettings';
import { AudioPlayer } from './components/AudioPlayer';
import { MobileTabBar } from './components/MobileTabBar';
import { MiniPlayer } from './components/MiniPlayer';
import { HowItWorks } from './components/HowItWorks';
import { checkBackendHealth, fetchVoices, generateSpeech } from './services/api';

/**
 * Converts a base64 encoded audio string into a browser Object URL (Blob)
 */
function createAudioBlobUrl(base64Data, mimeType = 'audio/mp3') {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function App() {
  // Input & Generation State
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Voice Settings State
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [rate, setRate] = useState('+0%');
  const [pitch, setPitch] = useState('+0Hz');
  const [volume] = useState('+0%');
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState(null);

  // Audio Playback & Synchronization State
  const [audioUrl, setAudioUrl] = useState(null);
  const [words, setWords] = useState([]);
  const [duration, setDuration] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const activeBlobUrlRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Mini-player & Active Playback tracking
  const [playbackState, setPlaybackState] = useState({ currentTime: 0, isPlaying: false });
  const [isListenInView, setIsListenInView] = useState(false);

  // Navigation & Scroll-spy State
  const [activeSection, setActiveSection] = useState('step-write');

  // Backend Diagnostic & Banner State
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null,
    pingMs: null,
  });
  const [isOfflineBannerDismissed, setIsOfflineBannerDismissed] = useState(false);

  // Verify backend health
  const verifyBackendConnection = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true }));
    const startTime = performance.now();
    const result = await checkBackendHealth();
    const latency = Math.round(performance.now() - startTime);

    if (result.ok) {
      setBackendStatus({
        loading: false,
        connected: true,
        data: result.data,
        error: null,
        pingMs: latency,
      });
      setIsOfflineBannerDismissed(false);
    } else {
      setBackendStatus({
        loading: false,
        connected: false,
        data: null,
        error: result.error || 'Connection failed',
        pingMs: null,
      });
    }
  }, []);

  // Fetch available neural voices
  const loadVoices = useCallback(async () => {
    setLoadingVoices(true);
    setVoicesError(null);
    const result = await fetchVoices('en-');

    if (result.ok && result.voices?.length > 0) {
      setVoices(result.voices);
      const hasDefault = result.voices.some((v) => v.short_name === 'en-US-AriaNeural');
      if (hasDefault) {
        setSelectedVoice('en-US-AriaNeural');
      } else {
        setSelectedVoice(result.voices[0].short_name);
      }
      setLoadingVoices(false);
    } else {
      setVoicesError(result.error || 'Failed to load voices');
      setLoadingVoices(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    verifyBackendConnection();
    loadVoices();
  }, [verifyBackendConnection, loadVoices]);

  // Clean up active Blob Object URL on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  // Scroll-spy using IntersectionObserver for active section highlighting
  useEffect(() => {
    const sections = ['step-write', 'step-voice', 'step-listen', 'how-it-works'];
    const observers = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
              if (id === 'step-listen') {
                setIsListenInView(true);
              }
            } else if (id === 'step-listen') {
              setIsListenInView(false);
            }
          });
        },
        { rootMargin: '-20% 0px -50% 0px', threshold: 0.1 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // Smooth scroll to a step card
  const handleNavigate = (stepId) => {
    setActiveSection(stepId);
    const target = document.getElementById(stepId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle Speech Generation for input text
  const handleGenerate = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setGenerateError('Please enter some text to synthesize.');
      return;
    }

    const wordsArray = trimmed.split(/\s+/);
    if (wordsArray.length > 500) {
      setGenerateError('Text exceeds the 500-word limit. Please shorten your text.');
      return;
    }

    // Cancel any ongoing generation request to prevent stale state updates
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setGenerateError(null);

    const result = await generateSpeech({
      text: trimmed,
      voice: selectedVoice,
      rate,
      pitch,
      volume,
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      return;
    }

    if (result.ok && result.data?.audio_base64) {
      try {
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }

        const blobUrl = createAudioBlobUrl(result.data.audio_base64, 'audio/mp3');
        activeBlobUrlRef.current = blobUrl;

        setAudioUrl(blobUrl);
        setWords(result.data.words || []);
        setDuration(result.data.duration_seconds || 0);
        setWordCount(result.data.word_count || (result.data.words ? result.data.words.length : 0));

        // On mobile / tablet (<960px), smooth-scroll to Listen card
        if (window.innerWidth < 960) {
          setTimeout(() => {
            const listenEl = document.getElementById('step-listen');
            if (listenEl) {
              listenEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 150);
        }
      } catch (err) {
        console.error('Audio processing error:', err);
        setGenerateError('Failed to decode synthesized audio.');
      }
    } else {
      if (!result.isAborted) {
        setGenerateError(result.error || 'Speech generation failed. Please try again.');
      }
    }

    setIsGenerating(false);
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setText('');
    setAudioUrl(null);
    setWords([]);
    setDuration(0);
    setWordCount(0);
    setGenerateError(null);
    setPlaybackState({ currentTime: 0, isPlaying: false });
  };

  // Toggle play/pause from mobile mini-player
  const handleMiniPlayerToggle = () => {
    const audioElement = document.querySelector('audio');
    if (!audioElement) return;

    if (audioElement.paused) {
      audioElement.play().catch(() => {});
    } else {
      audioElement.pause();
    }
  };

  const isServerOffline = !backendStatus.loading && !backendStatus.connected;

  return (
    <div className="app-container">
      {/* 3-Zone Floating Pill Header */}
      <Header
        backendStatus={backendStatus}
        onRefresh={() => {
          verifyBackendConnection();
          loadVoices();
        }}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />

      {/* Slim Dismissible Offline Banner (only when backend is unreachable) */}
      {isServerOffline && !isOfflineBannerDismissed && (
        <div className="offline-banner-strip" role="alert">
          <div className="offline-banner-content">
            <span className="offline-banner-dot" aria-hidden="true"></span>
            <span>
              Can&apos;t reach the speech server. Please verify the backend connection.
            </span>
          </div>
          <div className="offline-banner-actions">
            <button
              type="button"
              className="btn-banner-retry"
              onClick={verifyBackendConnection}
              disabled={backendStatus.loading}
            >
              {backendStatus.loading ? 'Pinging...' : 'Retry'}
            </button>
            <button
              type="button"
              className="btn-banner-dismiss"
              onClick={() => setIsOfflineBannerDismissed(true)}
              aria-label="Dismiss offline banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Compact Hero Strip (Editor visible above the fold) */}
        <section className="hero-strip">
          <div className="hero-strip-text">
            <h1 className="hero-strip-title">Turn your words into lively speech!</h1>
            <p className="hero-strip-subtitle">
              Type text, pick an AI voice, and follow along with synchronized word-by-word highlighting.
            </p>
            <button
              type="button"
              className="btn-hero-how-it-works"
              onClick={() => handleNavigate('how-it-works')}
            >
              How it works ↓
            </button>
          </div>
          <div className="hero-strip-doodle" aria-hidden="true">
            <svg viewBox="0 0 60 40" fill="none" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="54" height="36">
              <rect x="4" y="6" width="46" height="26" rx="8" fill="#CDEBDD" />
              <polygon points="16,32 10,38 24,32" fill="#CDEBDD" />
              <line x1="16" y1="14" x2="16" y2="24" strokeWidth="3" />
              <line x1="24" y1="11" x2="24" y2="27" strokeWidth="3" />
              <line x1="32" y1="13" x2="32" y2="25" strokeWidth="3" />
              <line x1="40" y1="16" x2="40" y2="22" strokeWidth="3" />
              <path d="M52 4 L54 8 L58 10 L54 12 L52 16 L50 12 L46 10 L50 8 Z" fill="#D9E96B" stroke="#1A1A1A" strokeWidth="1.8" />
            </svg>
          </div>
        </section>

        {/* 7/5 Desktop Workspace Grid: Left Column (Write + Voice) & Right Column (Sticky Listen) */}
        <div className="workspace-bento-grid">
          {/* Left Column: Stacked Step 1 (Write) & Step 2 (Voice) */}
          <div className="workspace-left-col">
            <TextEditor
              text={text}
              onChange={setText}
              onClear={handleClear}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              generateError={generateError}
            />

            <VoiceSettings
              voices={voices}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              rate={rate}
              onChangeRate={setRate}
              pitch={pitch}
              onChangePitch={setPitch}
              loadingVoices={loadingVoices}
              voicesError={voicesError}
              onRetryVoices={loadVoices}
            />
          </div>

          {/* Right Column: Step 3 (Listen) Sticky Audio Studio */}
          <div className="workspace-right-col">
            <AudioPlayer
              audioUrl={audioUrl}
              words={words}
              duration={duration}
              wordCount={wordCount}
              originalText={text}
              isLoading={isGenerating}
              error={generateError}
              onPlaybackUpdate={setPlaybackState}
            />
          </div>
        </div>

        {/* Non-Technical "How it works" Section */}
        <HowItWorks onSetText={setText} onNavigate={handleNavigate} />
      </main>

      {/* Floating Bottom Tab Bar on Mobile (<=640px) */}
      <MobileTabBar activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Sticky Mobile Mini-Player (when audio exists & user is scrolled away from Listen) */}
      <MiniPlayer
        audioUrl={audioUrl}
        isPlaying={playbackState.isPlaying}
        currentTime={playbackState.currentTime}
        duration={duration}
        onTogglePlay={handleMiniPlayerToggle}
        onOpenListen={() => handleNavigate('step-listen')}
        isVisible={!isListenInView}
      />

      <footer className="app-footer">
        <div>EchoRead Studio &bull; Text-to-Speech Web Studio</div>
        <div className="footer-milestone">Doodle-Outline Soft UI &bull; Up to 500 Words</div>
      </footer>
    </div>
  );
}

export default App;
