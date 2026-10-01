import React, { useState } from 'react';
import { StatusPopover } from './StatusPopover';

/**
 * 3-Zone Floating Header with scroll-spy segmented navigation and compact status popover
 */
export function Header({ backendStatus, onRefresh, activeSection, onNavigate }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const getStatusClass = () => {
    if (backendStatus.loading) return 'checking';
    if (backendStatus.connected) return 'online';
    return 'offline';
  };

  const getStatusText = () => {
    if (backendStatus.loading) return 'Checking';
    if (backendStatus.connected) return 'Live';
    return 'Offline';
  };

  const navItems = [
    { id: 'step-write', label: '1. Write' },
    { id: 'step-voice', label: '2. Voice' },
    { id: 'step-listen', label: '3. Listen' },
    { id: 'how-it-works', label: 'How it works', desktopOnly: true },
  ];

  return (
    <header className="app-header">
      {/* Zone 1: Brand & Logo */}
      <div className="header-left">
        <a href="#step-write" className="brand" onClick={(e) => { e.preventDefault(); onNavigate('step-write'); }}>
          <div className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-4l-4 3v-3H8a4 4 0 0 1-4-4v-2z" fill="#CDEBDD" stroke="#1A1A1A" />
              <path d="M9 11v2M12 10v4M15 11v2" stroke="#1A1A1A" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="brand-text-col">
            <div className="brand-title-row">
              <span className="brand-title">EchoRead</span>
              <span className="brand-sticker-tag">TTS</span>
            </div>
            <span className="brand-tagline">Playful text-to-speech studio</span>
          </div>
        </a>
      </div>

      {/* Zone 2: Segmented Anchor Navigation (Desktop & Tablet) */}
      <nav className="header-center" aria-label="Workflow Navigation">
        <div className="nav-segmented-pill">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-segment-btn ${isActive ? 'active' : ''} ${item.desktopOnly ? 'nav-desktop-only' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? (item.desktopOnly ? 'page' : 'step') : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Zone 3: Compact Status Chip with Popover */}
      <div className="header-right">
        <button
          type="button"
          className={`status-chip-btn ${getStatusClass()}`}
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          title="Click to view API diagnostics"
          aria-expanded={isPopoverOpen}
          aria-haspopup="dialog"
        >
          <span className="status-dot"></span>
          <span className="status-chip-label">{getStatusText()}</span>
        </button>

        <StatusPopover
          backendStatus={backendStatus}
          onRefresh={onRefresh}
          isOpen={isPopoverOpen}
          onClose={() => setIsPopoverOpen(false)}
        />
      </div>
    </header>
  );
}
