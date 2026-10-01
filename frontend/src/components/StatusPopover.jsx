import React, { useEffect, useRef } from 'react';

/**
 * StatusPopover component
 * Compact popover showing backend health diagnostics, latency, and refresh trigger.
 * Closes on outside click and Escape key.
 */
export function StatusPopover({ backendStatus, onRefresh, isOpen, onClose }) {
  const popoverRef = useRef(null);
  const { loading, connected, data, error, pingMs } = backendStatus;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="status-popover" ref={popoverRef} role="dialog" aria-label="Backend Diagnostics">
      <div className="status-popover-header">
        <div className="status-popover-title">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
          <span>System Diagnostics</span>
        </div>
        <button
          type="button"
          className="btn-ghost-close"
          onClick={onClose}
          aria-label="Close diagnostics"
        >
          ✕
        </button>
      </div>

      <div className="status-popover-body">
        <div className="status-metric-row">
          <span className="status-metric-label">FastAPI Backend</span>
          <span className={`status-metric-badge ${connected ? 'badge-connected' : 'badge-unreachable'}`}>
            {connected ? 'Connected (200)' : 'Unreachable'}
          </span>
        </div>

        <div className="status-metric-row">
          <span className="status-metric-label">App &amp; Version</span>
          <span className="status-metric-val">
            {data?.app_name ? `${data.app_name} v${data.version}` : 'EchoRead API'}
          </span>
        </div>

        <div className="status-metric-row">
          <span className="status-metric-label">Round-Trip Latency</span>
          <span className="status-metric-val">
            {pingMs !== null ? `${pingMs} ms` : '—'}
          </span>
        </div>

        <div className="status-metric-row">
          <span className="status-metric-label">Health Endpoint</span>
          <code className="status-metric-code">GET /api/health</code>
        </div>

        {error && (
          <div className="status-popover-alert" role="alert">
            <strong>Server unreachable:</strong> Ensure FastAPI is running on <code>http://127.0.0.1:8000</code>.
          </div>
        )}
      </div>

      <div className="status-popover-footer">
        <button
          type="button"
          className="btn-secondary btn-recheck-health"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Recheck backend health"
        >
          {loading ? 'Pinging...' : '↻ Recheck Health'}
        </button>
      </div>
    </div>
  );
}
