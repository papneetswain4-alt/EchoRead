import React, { useEffect, useRef, useState } from 'react';

/**
 * ReadAlongText Component
 * Renders spoken text with synchronized, accessible word-by-word highlighting.
 * Features a compact "Aa" settings menu (font scaling + auto-scroll toggle)
 * and click-to-seek on individual words.
 */
export function ReadAlongText({ words, activeWordIndex, originalText, onSeekToWord }) {
  const activeWordRef = useRef(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const [fontSize, setFontSize] = useState('md'); // 'sm' | 'md' | 'lg'
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAaMenuOpen, setIsAaMenuOpen] = useState(false);

  // Close "Aa" menu on outside click or Escape
  useEffect(() => {
    if (!isAaMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsAaMenuOpen(false);
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsAaMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAaMenuOpen]);

  // Auto-scroll to keep active word in view
  useEffect(() => {
    if (autoScroll && activeWordRef.current && containerRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeWordIndex, autoScroll]);

  const fontSizeClass = {
    sm: 'text-sm',
    md: 'text-md',
    lg: 'text-lg',
  }[fontSize] || 'text-md';

  if (!words || words.length === 0) {
    if (originalText) {
      return (
        <div className="read-along-panel">
          <div className="read-along-header">
            <span className="read-along-label">Text View</span>
            <span className="read-along-badge">Ready</span>
          </div>
          <p className="read-along-fallback">{originalText}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="read-along-panel">
      <div className="read-along-header">
        <span className="read-along-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="15" height="15" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          Read-Along Highlighting
        </span>

        <div className="read-along-actions">
          {/* Word counter pill */}
          <span className="read-along-badge" aria-live="polite">
            {activeWordIndex >= 0 ? `Word ${activeWordIndex + 1} of ${words.length}` : `${words.length} words`}
          </span>

          {/* Compact "Aa" Typography & Scroll Menu */}
          <div className="aa-menu-container" ref={menuRef}>
            <button
              type="button"
              className={`btn-aa-menu ${isAaMenuOpen ? 'active' : ''}`}
              onClick={() => setIsAaMenuOpen((prev) => !prev)}
              title="Reading display settings (Font size & Auto-scroll)"
              aria-expanded={isAaMenuOpen}
              aria-haspopup="true"
              aria-label="Text view settings"
            >
              <span className="aa-icon-text">Aa</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {isAaMenuOpen && (
              <div className="aa-dropdown-menu" role="menu">
                <div className="aa-menu-section">
                  <span className="aa-menu-title">Text Size</span>
                  <div className="font-size-adjusters" role="group" aria-label="Text size options">
                    <button
                      type="button"
                      className={`btn-font-size ${fontSize === 'sm' ? 'active' : ''}`}
                      onClick={() => setFontSize('sm')}
                      aria-label="Small font"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className={`btn-font-size ${fontSize === 'md' ? 'active' : ''}`}
                      onClick={() => setFontSize('md')}
                      aria-label="Medium font"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className={`btn-font-size ${fontSize === 'lg' ? 'active' : ''}`}
                      onClick={() => setFontSize('lg')}
                      aria-label="Large font"
                    >
                      A+
                    </button>
                  </div>
                </div>

                <div className="aa-menu-divider"></div>

                <div className="aa-menu-section">
                  <button
                    type="button"
                    className={`btn-toggle-autoscroll ${autoScroll ? 'enabled' : ''}`}
                    onClick={() => setAutoScroll((prev) => !prev)}
                    aria-pressed={autoScroll}
                  >
                    <span>Auto-Scroll</span>
                    <span className="toggle-indicator">{autoScroll ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spoken Word Surface */}
      <div
        ref={containerRef}
        className={`read-along-text-area ${fontSizeClass}`}
        role="region"
        aria-label="Synchronized spoken text with clickable words"
        tabIndex="0"
      >
        <p className="read-along-paragraph">
          {words.map((word, idx) => {
            const isActive = idx === activeWordIndex;
            const isSpoken = activeWordIndex >= 0 && idx < activeWordIndex;

            return (
              <span
                key={`${idx}-${word.start}`}
                ref={isActive ? activeWordRef : null}
                className={`word-token ${isActive ? 'active' : ''} ${isSpoken ? 'spoken' : 'upcoming'}`}
                aria-current={isActive ? 'location' : undefined}
                role="button"
                tabIndex="0"
                onClick={() => onSeekToWord && onSeekToWord(word.start)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSeekToWord) onSeekToWord(word.start);
                  }
                }}
                title={`Click to jump to ${word.start.toFixed(2)}s`}
                data-start={word.start}
                data-end={word.end}
              >
                {word.text}
                {' '}
              </span>
            );
          })}
        </p>
      </div>

      <div className="read-along-footer-hint">
        <span>Click any word to seek audio playback directly</span>
      </div>
    </div>
  );
}
