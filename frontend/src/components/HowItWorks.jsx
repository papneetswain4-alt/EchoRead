import React, { useRef, useState, useEffect } from 'react';
import { DEFAULT_SAMPLE } from './TextEditor';

/**
 * All user-facing text for the "How it works" section.
 * Written in friendly, plain, non-technical everyday language.
 */
const HOW_IT_WORKS_DATA = {
  header: {
    badge: "Quick guide",
    title: "How EchoRead works",
    subtitle: "From your words to a voice you can follow, in four easy steps.",
  },
  steps: [
    {
      num: 1,
      bandClass: "band-mint",
      stickerClass: "sticker-standard",
      title: "Add your text",
      description: "Type or paste anything you like, from a short note to a long story. Up to 500 words.",
    },
    {
      num: 2,
      bandClass: "band-butter",
      stickerClass: "sticker-standard",
      title: "Choose a voice",
      description: "Pick a voice you like, then make it faster, slower, higher, or lower.",
    },
    {
      num: 3,
      bandClass: "band-navy",
      stickerClass: "sticker-lime",
      title: "Press Generate",
      description: "We turn your words into spoken audio. It usually takes just a few seconds.",
    },
    {
      num: 4,
      bandClass: "band-sky",
      stickerClass: "sticker-standard",
      title: "Listen and follow along",
      description: "Press play and watch each word light up as it is spoken. Click any word to jump straight to it.",
    },
  ],
  pipelineEndPill: "Done! Download your audio file (MP3) to keep it.",
  tryItYourself: {
    sentence: ["EchoRead", "lights", "up", "every", "word", "while", "the", "voice", "reads", "aloud."],
    caption: "This is what read-along looks like.",
    buttonLabel: "Load a sample and try it",
  },
  goodToKnow: [
    {
      id: "gtk-500",
      title: "Up to 500 words",
      description: "Plenty for an email, a paragraph, or a short story.",
      theme: "butter",
    },
    {
      id: "gtk-voices",
      title: "Many voices",
      description: "Different accents and voices to choose from.",
      theme: "mint",
    },
    {
      id: "gtk-keep",
      title: "Keep your audio",
      description: "Download the audio file and use it anywhere.",
      theme: "sky",
    },
  ],
};

/**
 * Non-technical "How it works" section for first-time visitors.
 */
export function HowItWorks({ onSetText, onNavigate }) {
  const sectionRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Soft staggered fade-up when section scrolls into view (runs once)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const handleLoadSampleAndTry = () => {
    if (onSetText) {
      onSetText(DEFAULT_SAMPLE);
    }
    if (onNavigate) {
      onNavigate('step-write');
    }
  };

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className={`how-it-works-section ${hasAnimated ? 'is-in-view' : ''}`}
      aria-labelledby="how-it-works-title"
    >
      {/* 1. Heading block */}
      <div className="how-heading-block">
        <span className="how-badge-sticker">{HOW_IT_WORKS_DATA.header.badge}</span>
        <h2 id="how-it-works-title" className="how-title">
          {HOW_IT_WORKS_DATA.header.title}
        </h2>
        <p className="how-subtitle">{HOW_IT_WORKS_DATA.header.subtitle}</p>
      </div>

      {/* 2. Pipeline: 4 steps connected by dotted line & arrows */}
      <div className="how-pipeline-wrapper">
        <ol className="how-pipeline-list" aria-label="EchoRead 4-step workflow">
          {HOW_IT_WORKS_DATA.steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <li className={`how-step-card step-card how-fade-item`} style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className={`step-header-band ${step.bandClass}`}>
                  <span className={`step-sticker-num ${step.stickerClass}`}>{step.num}</span>
                  <h3 className="how-step-title">{step.title}</h3>
                  <div className="how-step-icon" aria-hidden="true">
                    {step.num === 1 && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="#FAFBF8" />
                      </svg>
                    )}
                    {step.num === 2 && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="#FAFBF8" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                    {step.num === 3 && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                        <path d="M12 2l2.4 5.6L20 10l-4.4 4 1.4 6-5-3.2L7 20l1.4-6L4 10l5.6-2.4L12 2z" fill="#D9E96B" stroke="#1A1A1A" />
                      </svg>
                    )}
                    {step.num === 4 && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="#FAFBF8" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="how-step-body">
                  <p className="how-step-desc">{step.description}</p>
                </div>
              </li>

              {idx < HOW_IT_WORKS_DATA.steps.length - 1 && (
                <li className="how-connector" aria-hidden="true">
                  <span className="connector-line"></span>
                  <span className="connector-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <line x1="5" y1="12" x2="19" y2="12" className="arrow-h-line" />
                      <polyline points="12 5 19 12 12 19" className="arrow-h-head" />
                      <line x1="12" y1="5" x2="12" y2="19" className="arrow-v-line" />
                      <polyline points="5 12 12 19 19 12" className="arrow-v-head" />
                    </svg>
                  </span>
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>

        {/* Pipeline Completion Pill */}
        <div className="how-end-pill-wrapper">
          <span className="how-end-pill">
            <svg viewBox="0 0 20 20" fill="none" stroke="#1A1A1A" strokeWidth="2.5" width="16" height="16" aria-hidden="true">
              <polyline points="4 10 8 14 16 6" />
            </svg>
            {HOW_IT_WORKS_DATA.pipelineEndPill}
          </span>
        </div>
      </div>

      {/* 3. "Try it yourself" Strip */}
      <div className="how-try-strip step-card">
        <div className="how-try-header">
          <span className="how-try-caption">{HOW_IT_WORKS_DATA.tryItYourself.caption}</span>
        </div>
        <div className="how-try-demo-box" aria-label="Demo of synchronized word reading">
          <p className="how-demo-sentence">
            {HOW_IT_WORKS_DATA.tryItYourself.sentence.map((word, wIdx) => (
              <span
                key={`${word}-${wIdx}`}
                className="demo-word"
                style={{ '--w-idx': wIdx }}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>
        <div className="how-try-action">
          <button
            type="button"
            className="btn-try-sample"
            onClick={handleLoadSampleAndTry}
          >
            <span>{HOW_IT_WORKS_DATA.tryItYourself.buttonLabel}</span>
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>

      {/* 4. "Good to know" Mini Cards */}
      <div className="how-gtk-grid">
        {HOW_IT_WORKS_DATA.goodToKnow.map((item) => (
          <div key={item.id} className={`how-gtk-card step-card theme-${item.theme}`}>
            <div className="gtk-card-header">
              <span className="gtk-dot-tag" aria-hidden="true"></span>
              <h4 className="gtk-title">{item.title}</h4>
            </div>
            <p className="gtk-desc">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
