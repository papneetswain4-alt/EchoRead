import React from 'react';

/**
 * MobileTabBar component
 * Floating bottom pill tab bar on mobile screens (<=640px).
 * Displays Write, Voice, Listen navigation with mint/lime active indicators.
 */
export function MobileTabBar({ activeSection, onNavigate }) {
  const tabs = [
    {
      id: 'step-write',
      label: 'Write',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      ),
    },
    {
      id: 'step-voice',
      label: 'Voice',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      ),
    },
    {
      id: 'step-listen',
      label: 'Listen',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
        </svg>
      ),
    },
  ];

  return (
    <nav className="mobile-tab-bar" aria-label="Mobile Step Navigation">
      <div className="mobile-tab-pill">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(tab.id)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Jump to ${tab.label} step`}
            >
              <span className="mobile-tab-icon-wrapper">
                {tab.icon}
              </span>
              <span className="mobile-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
