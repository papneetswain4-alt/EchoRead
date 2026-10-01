import React, { useRef, useEffect } from 'react';

export const DEFAULT_SAMPLE = "Hello! Welcome to EchoRead. In this studio, text is converted into natural speech while each word lights up in perfect synchrony.";
export const MAX_WORDS = 500;

/**
 * Step Card (1): Write
 * Large auto-growing text entry area with interior toolbar,
 * word count progress indicator, and full-width navy Generate button.
 */
export function TextEditor({
  text,
  onChange,
  onClear,
  onGenerate,
  isGenerating,
  generateError,
}) {
  const textareaRef = useRef(null);

  const handleLoadSample = () => {
    onChange(DEFAULT_SAMPLE);
  };

  const isTextEmpty = !text || text.trim().length === 0;
  const wordCount = isTextEmpty ? 0 : text.trim().split(/\s+/).length;
  const isNearLimit = wordCount > 450 && wordCount <= MAX_WORDS;
  const isOverLimit = wordCount > MAX_WORDS;
  const progressPercent = Math.min(100, (wordCount / MAX_WORDS) * 100);

  // Auto-grow textarea between 220px and 50vh
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const targetH = Math.max(220, scrollH);
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [text]);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to generate speech
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!isGenerating && !isTextEmpty && !isOverLimit) {
        e.preventDefault();
        onGenerate();
      }
    }
  };

  return (
    <div className="card step-card step-write-card" id="step-write">
      {/* Tinted Header Band (Mint) with Numbered Sticker */}
      <div className="step-header-band band-mint">
        <div className="step-badge-title">
          <span className="step-sticker-num">1</span>
          <h2 className="step-title">Write Text</h2>
        </div>
        <span className="step-subtitle-tag">Up to 500 words</span>
      </div>

      <div className="step-card-body">
        {/* Enclosed Textarea Frame with Interior Ghost Toolbar & Word Bar */}
        <div className={`textarea-frame ${isOverLimit ? 'frame-error' : isNearLimit ? 'frame-warning' : ''}`}>
          {/* Interior Ghost Toolbar */}
          <div className="frame-toolbar-top">
            <span className="frame-label">Type or paste text below</span>
            <div className="frame-ghost-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={handleLoadSample}
                disabled={isGenerating}
                title="Load sample example text"
                aria-label="Load sample text"
              >
                Sample
              </button>
              {text.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={onClear}
                  disabled={isGenerating}
                  title="Clear current text"
                  aria-label="Clear text input"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id="speech-text-input"
            className="text-area-autogrow"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste your text here (up to 500 words)... Press Ctrl+Enter to generate speech!"
            spellCheck="true"
            disabled={isGenerating}
            aria-label="Speech text input"
          />

          {/* Bottom Progress Bar & Word Counter */}
          <div className="frame-footer-bottom">
            <div className="word-progress-container" aria-hidden="true">
              <div
                className={`word-progress-bar ${isOverLimit ? 'bg-red' : isNearLimit ? 'bg-yellow' : 'bg-lime'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="word-count-badge">
              <span className={`word-count-num ${isOverLimit ? 'text-red' : isNearLimit ? 'text-yellow' : ''}`}>
                {wordCount}
              </span>
              <span className="word-count-max"> / {MAX_WORDS} words</span>
            </div>
          </div>
        </div>

        {generateError && (
          <div className="editor-error-alert" role="alert" aria-live="assertive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{generateError}</span>
          </div>
        )}

        {/* Full-Width Navy Primary Generate Action */}
        <div className="generate-action-row">
          <button
            type="button"
            className="btn-primary btn-generate-full"
            onClick={onGenerate}
            disabled={isGenerating || isTextEmpty || isOverLimit}
            title={
              isOverLimit
                ? `Text exceeds ${MAX_WORDS} word limit`
                : isTextEmpty
                ? "Please enter some text first"
                : "Synthesize speech (Ctrl+Enter)"
            }
            aria-label={isGenerating ? "Synthesizing speech" : "Generate speech audio"}
          >
            {isGenerating ? (
              <span className="btn-loading-content">
                <span className="btn-equalizer-bars" aria-hidden="true">
                  <span></span><span></span><span></span><span></span>
                </span>
                <span>Synthesizing Voice...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Generate Speech</span>
                <span className="shortcut-chip">Ctrl+Enter</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
