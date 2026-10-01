import React, { useMemo } from 'react';

const SPEED_CHIPS = [
  { label: '0.8x', value: '-20%' },
  { label: '1.0x', value: '+0%' },
  { label: '1.25x', value: '+25%' },
  { label: '1.5x', value: '+50%' },
];

const PITCH_CHIPS = [
  { label: 'Low', value: '-10Hz' },
  { label: 'Normal', value: '+0Hz' },
  { label: 'High', value: '+10Hz' },
];

/**
 * Step Card (2): Voice Settings
 * Outlined voice select dropdown plus tactile segmented chip selectors for Speed and Pitch.
 */
export function VoiceSettings({
  voices,
  selectedVoice,
  onSelectVoice,
  rate,
  onChangeRate,
  pitch,
  onChangePitch,
  loadingVoices,
  voicesError,
  onRetryVoices,
}) {
  // Group voices by region/locale
  const groupedVoices = useMemo(() => {
    if (!voices || voices.length === 0) return {};
    const groups = {};
    for (const v of voices) {
      const loc = v.locale || 'Other';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(v);
    }
    return groups;
  }, [voices]);

  const handleResetSettings = () => {
    onChangeRate('+0%');
    onChangePitch('+0Hz');
  };

  const isModified = rate !== '+0%' || pitch !== '+0Hz';

  return (
    <div className="card step-card step-voice-card" id="step-voice">
      {/* Tinted Header Band (Butter) with Numbered Sticker */}
      <div className="step-header-band band-butter">
        <div className="step-badge-title">
          <span className="step-sticker-num">2</span>
          <h2 className="step-title">Voice &amp; Tuning</h2>
        </div>
        <span className="step-subtitle-tag">Neural Models</span>
      </div>

      <div className="step-card-body">
        {/* Row 1: AI Voice Selection Dropdown on its own row */}
        <div className="voice-control-group">
          <div className="voice-label-row">
            <label htmlFor="voice-select" className="voice-control-label">
              AI Voice Model
            </label>
            {loadingVoices && <span className="voice-status-msg">Loading voices...</span>}
            {voicesError && (
              <button
                type="button"
                className="btn-retry-text"
                onClick={onRetryVoices}
                aria-label="Retry loading voices"
              >
                Retry
              </button>
            )}
          </div>

          <div className="select-wrapper">
            <select
              id="voice-select"
              className="select-input-styled"
              value={selectedVoice}
              onChange={(e) => onSelectVoice(e.target.value)}
              disabled={loadingVoices || voices.length === 0}
              aria-label="Select speech voice"
            >
              {voices.length === 0 ? (
                <option value="en-US-AriaNeural">en-US-AriaNeural (Default Natural)</option>
              ) : (
                Object.entries(groupedVoices).map(([locale, group]) => (
                  <optgroup key={locale} label={`Region: ${locale}`}>
                    {group.map((v) => (
                      <option key={v.short_name} value={v.short_name}>
                        {v.friendly_name} ({v.gender})
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Row 2: Speed Segmented Chips */}
        <div className="voice-control-group">
          <div className="voice-label-row">
            <span className="voice-control-label">Speed Rate</span>
            <span className="voice-current-val">{rate}</span>
          </div>
          <div className="chip-segmented-group" role="radiogroup" aria-label="Speed Rate">
            {SPEED_CHIPS.map((chip) => {
              const isSelected = rate === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`chip-segment-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onChangeRate(chip.value)}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Pitch Segmented Chips */}
        <div className="voice-control-group">
          <div className="voice-label-row">
            <span className="voice-control-label">Voice Pitch</span>
            <span className="voice-current-val">{pitch}</span>
          </div>
          <div className="chip-segmented-group" role="radiogroup" aria-label="Voice Pitch">
            {PITCH_CHIPS.map((chip) => {
              const isSelected = pitch === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`chip-segment-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onChangePitch(chip.value)}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reserved Space for Reset Button (avoids layout shift) */}
        <div className="reset-bar-reserved">
          <button
            type="button"
            className={`btn-reset-tuning ${isModified ? 'visible' : 'hidden'}`}
            onClick={handleResetSettings}
            disabled={!isModified}
            aria-label="Reset speed and pitch to default"
          >
            ↺ Reset speed &amp; pitch to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
