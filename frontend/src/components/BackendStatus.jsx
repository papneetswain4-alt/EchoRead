import React from 'react';

/**
 * Diagnostic card showing backend health metadata and connection status
 */
export function BackendStatus({ backendStatus, onRefresh }) {
  const { loading, connected, data, error, pingMs } = backendStatus;

  return (
    <div className="diagnostic-card">
      <div className="diagnostic-header">
        <span className="diagnostic-title">API Connection Diagnostics</span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Pinging...' : '↻ Recheck Health'}
        </button>
      </div>

      <div className="diagnostic-grid">
        <div className="diagnostic-item">
          <span className="diagnostic-label">Backend Status</span>
          <span
            className="diagnostic-val"
            style={{ color: connected ? 'var(--color-success)' : 'var(--color-error)' }}
          >
            {connected ? 'CONNECTED (HTTP 200)' : 'UNREACHABLE'}
          </span>
        </div>

        <div className="diagnostic-item">
          <span className="diagnostic-label">Endpoint</span>
          <span className="diagnostic-val">GET /api/health</span>
        </div>

        <div className="diagnostic-item">
          <span className="diagnostic-label">App & Version</span>
          <span className="diagnostic-val">
            {data?.app_name ? `${data.app_name} v${data.version}` : 'N/A'}
          </span>
        </div>

        <div className="diagnostic-item">
          <span className="diagnostic-label">Round-Trip Latency</span>
          <span className="diagnostic-val">
            {pingMs !== null ? `${pingMs} ms` : '—'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          fontSize: '0.825rem',
          color: 'var(--color-error)',
          background: 'var(--color-error-bg)',
          padding: '0.5rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <strong>Connection error:</strong> {error}. Ensure the backend service is running and reachable.
        </div>
      )}
    </div>
  );
}
