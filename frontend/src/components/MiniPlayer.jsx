import React from 'react';

/**
 * Formats time in seconds to mm:ss
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * MiniPlayer component
 * Displayed on mobile when audio exists and user is outside the Listen card.
 * Sits stickily just above the bottom tab bar.
 */
export function MiniPlayer({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onOpenListen,
  isVisible,
}) {
  if (!audioUrl || !isVisible) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <aside className="mobile-mini-player" aria-label="Quick Audio Controls">
      <div className="mini-player-pill" onClick={onOpenListen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpenListen(); }}>
        <button
          type="button"
          className="btn-mini-play"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          aria-label={isPlaying ? "Pause playback" : "Resume playback"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>

        <div className="mini-player-info">
          <div className="mini-player-title-row">
            <span className="mini-player-title">EchoRead Speech</span>
            <span className="mini-player-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="mini-progress-track">
            <div
              className="mini-progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <button
          type="button"
          className="btn-mini-open"
          onClick={onOpenListen}
          aria-label="Expand player and read along"
          title="Open player"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
    </aside>
  );
}
