import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ReadAlongText } from './ReadAlongText';
import { findActiveWordIndex } from '../utils/findActiveWord';

/**
 * Formats time in seconds to mm:ss format
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Step Card (3): Listen
 * Sticky Audio Player with circular lime play/pause, +/-5s skip,
 * CSS-variable driven progress slider, hover-revealed volume, and synchronized text.
 */
export function AudioPlayer({
  audioUrl = null,
  words = [],
  duration = 0,
  wordCount = 0,
  originalText = '',
  isLoading = false,
  error = null,
  onPlaybackUpdate,
}) {
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isVolOpen, setIsVolOpen] = useState(false);
  const [hasJustLoaded, setHasJustLoaded] = useState(false);

  const totalDuration = duration || 0;
  const totalWords = wordCount || words.length;

  // Trigger pop animation when new audio is loaded
  useEffect(() => {
    setIsPlaying(false);
    setIsCompleted(false);
    setCurrentTime(0);
    setActiveWordIndex(-1);
    setAudioError(null);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (audioUrl) {
      setHasJustLoaded(true);
      const timer = setTimeout(() => setHasJustLoaded(false), 500);
      return () => clearTimeout(timer);
    }
  }, [audioUrl]);

  // Synchronize playback clock using requestAnimationFrame
  const syncPlayback = useCallback(() => {
    if (!audioRef.current) return;

    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    if (onPlaybackUpdate) {
      onPlaybackUpdate({ currentTime: current, isPlaying: !audioRef.current.paused });
    }

    // Direct active word lookup
    const nextActiveIndex = findActiveWordIndex(words, current);
    setActiveWordIndex((prev) => (prev !== nextActiveIndex ? nextActiveIndex : prev));

    if (!audioRef.current.paused && !audioRef.current.ended) {
      animationFrameRef.current = requestAnimationFrame(syncPlayback);
    }
  }, [words, onPlaybackUpdate]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(syncPlayback);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, syncPlayback]);

  // Volume synchronization
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (isCompleted) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsCompleted(false);
      }
      audioRef.current.play().catch((err) => {
        console.warn("Playback error:", err);
        setAudioError("Playback was blocked or audio failed to load.");
      });
    }
  };

  const handleSkip = (seconds) => {
    if (!audioRef.current || !audioUrl) return;
    const target = Math.max(0, Math.min(totalDuration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    setIsCompleted(false);
    setActiveWordIndex(findActiveWordIndex(words, target));
  };

  const handleSeek = (e) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    setIsCompleted(false);

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }

    const seekWordIndex = findActiveWordIndex(words, targetTime);
    setActiveWordIndex(seekWordIndex);
  };

  const handleSeekToWord = (targetTime) => {
    setCurrentTime(targetTime);
    setIsCompleted(false);

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }

    const seekWordIndex = findActiveWordIndex(words, targetTime);
    setActiveWordIndex(seekWordIndex);

    if (!isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsCompleted(true);
    setCurrentTime(totalDuration);
    setActiveWordIndex(-1);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (onPlaybackUpdate) {
      onPlaybackUpdate({ currentTime: totalDuration, isPlaying: false });
    }
  };

  const handleReplay = () => {
    setCurrentTime(0);
    setIsCompleted(false);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setActiveWordIndex(findActiveWordIndex(words, 0));
      audioRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Keyboard shortcut: Spacebar toggles playback
  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    }
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      className={`card step-card step-listen-card sticky-player ${hasJustLoaded ? 'animate-card-pop' : ''}`}
      id="step-listen"
      onKeyDown={handleKeyDown}
      tabIndex={audioUrl ? 0 : -1}
      role="region"
      aria-label="Audio Playback Studio"
    >
      {/* Tinted Header Band (Sky) with Numbered Sticker */}
      <div className="step-header-band band-sky">
        <div className="step-badge-title">
          <span className="step-sticker-num">3</span>
          <h2 className="step-title">Listen &amp; Follow</h2>
        </div>
        {totalWords > 0 && (
          <span className="step-subtitle-tag">
            {totalWords} words &bull; {totalDuration.toFixed(1)}s
          </span>
        )}
      </div>

      <div className="step-card-body">
        {/* Hidden HTML5 Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => {
              setIsPlaying(true);
              setIsCompleted(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
            onError={() => setAudioError("Audio playback failed.")}
          />
        )}

        {!audioUrl ? (
          /* Empty State: Compact doodle illustration + skeleton dotted waveform */
          <div className="empty-player-strip">
            <div className="empty-doodle-icon" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <polygon points="18 10 10 16 4 16 4 24 10 24 18 30 18 10" fill="#DCE8EE" />
                <path d="M26 12a8 8 0 0 1 0 16" strokeDasharray="3 3" />
                <path d="M31 7a14 14 0 0 1 0 26" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="empty-text-wrap">
              <span className="empty-heading">
                {isLoading ? "Synthesizing Speech..." : "Ready to Read Aloud"}
              </span>
              <span className="empty-subtext">
                {isLoading ? "Receiving audio stream..." : "Click 'Generate Speech' to listen."}
              </span>
            </div>
            {/* Dotted skeleton waveform */}
            <div className="skeleton-waveform" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        ) : (
          /* Active Audio Interface */
          <div className="active-player-layout">
            {/* Status & Format Meta Bar */}
            <div className="player-meta-bar">
              <div className="player-meta-left">
                <span className={`player-status-tag ${isPlaying ? 'playing' : isCompleted ? 'completed' : 'paused'}`}>
                  {isPlaying ? (
                    <>
                      <span className="equalizer-bars" aria-hidden="true">
                        <span></span><span></span><span></span>
                      </span>
                      Playing
                    </>
                  ) : isCompleted ? "Finished" : "Paused"}
                </span>
                <span className="player-format-tag">MP3 24kHz</span>
              </div>

              {/* Collapsible Hover/Focus Volume Control */}
              <div
                className={`volume-hover-wrapper ${isVolOpen ? 'open' : ''}`}
                onMouseEnter={() => setIsVolOpen(true)}
                onMouseLeave={() => setIsVolOpen(false)}
                onFocus={() => setIsVolOpen(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsVolOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className="btn-icon-round btn-vol-toggle"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isMuted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  )}
                </button>
                <div className="volume-slider-popup">
                  <input
                    type="range"
                    className="volume-slider"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Audio volume"
                  />
                </div>
              </div>
            </div>

            {/* Seek Slider with CSS Variable --progress fill */}
            <div className="progress-control-wrapper">
              <input
                type="range"
                className="seek-slider"
                style={{ '--progress': `${progressPercent}%` }}
                min="0"
                max={totalDuration > 0 ? totalDuration : 1}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek audio position"
                aria-valuemin="0"
                aria-valuemax={totalDuration}
                aria-valuenow={currentTime}
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(totalDuration)}`}
              />
              <div className="time-display">
                <span className="time-current">{formatTime(currentTime)}</span>
                <span className="time-separator">/</span>
                <span className="time-duration">{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Primary Controls Row */}
            <div className="player-controls-row">
              {/* Skip -5s */}
              <button
                type="button"
                className="btn-icon-round btn-skip"
                onClick={() => handleSkip(-5)}
                title="Skip back 5 seconds"
                aria-label="Skip back 5 seconds"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                </svg>
                <span className="skip-text">-5s</span>
              </button>

              {/* Large Circular Play/Pause Button (56px, Lime Fill, Ink Outline, Hard Shadow) */}
              <button
                type="button"
                className="btn-play-hero"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause (Space)" : isCompleted ? "Replay (Space)" : "Play (Space)"}
                aria-label={isPlaying ? "Pause speech" : "Play speech"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true" style={{ marginLeft: '3px' }}>
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              {/* Skip +5s */}
              <button
                type="button"
                className="btn-icon-round btn-skip"
                onClick={() => handleSkip(5)}
                title="Skip forward 5 seconds"
                aria-label="Skip forward 5 seconds"
              >
                <span className="skip-text">+5s</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                </svg>
              </button>

              {/* Replay Icon Button */}
              <button
                type="button"
                className="btn-icon-round"
                onClick={handleReplay}
                title="Replay from start"
                aria-label="Replay audio from beginning"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>

              {/* Download MP3 Icon Button */}
              <a
                href={audioUrl}
                download="echoread-speech.mp3"
                className="btn-icon-round btn-download-icon"
                title="Download MP3 file"
                aria-label="Download generated MP3 file"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
            </div>

            {/* Synchronized Read-Along Highlight Area */}
            <ReadAlongText
              words={words}
              activeWordIndex={activeWordIndex}
              originalText={originalText}
              onSeekToWord={handleSeekToWord}
            />
          </div>
        )}

        {(error || audioError) && (
          <div className="player-error-box" role="alert">
            <strong>Notice:</strong> {error || audioError}
          </div>
        )}
      </div>
    </div>
  );
}
