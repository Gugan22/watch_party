'use client';

import React from 'react';

interface LobbyViewProps {
  roomId: string;
  isCamOn: boolean;
  isMicOn: boolean;
  audioLevel: number;
  displayName: string;
  lobbyError: string;
  isConnecting: boolean;
  lobbyVideoRef: React.RefObject<HTMLVideoElement>;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onDisplayNameChange: (name: string) => void;
  onJoinParty: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  isCamOn,
  isMicOn,
  audioLevel,
  displayName,
  lobbyError,
  isConnecting,
  lobbyVideoRef,
  onToggleMic,
  onToggleCam,
  onDisplayNameChange,
  onJoinParty,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-canvas)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-blue-surface)',
              color: 'var(--accent-blue)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            🚪 Pre-Join Green Room
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Ready to enter "{roomId}"?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Check your camera, microphone, and audio levels before joining your friends.
          </p>
        </div>

        <div
          className="tactile-card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            padding: '1.75rem',
          }}
        >
          {/* Left: Video Preview & AV Controls */}
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#0F1218',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCamOn ? (
                <video
                  ref={lobbyVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>📷</div>
                  <p style={{ fontSize: '0.85rem' }}>Camera is Turned Off</p>
                </div>
              )}

              {/* Audio Level Meter Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  color: '#FFFFFF',
                }}
              >
                <span>{isMicOn ? '🎤' : '🔇'}</span>
                <div
                  style={{
                    width: '40px',
                    height: '6px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${isMicOn ? audioLevel : 0}%`,
                      height: '100%',
                      background: 'var(--success-green)',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Toggle Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onToggleMic}
                className={`tactile-btn ${isMicOn ? 'tactile-btn-secondary' : 'tactile-btn-danger'}`}
                style={{ flex: 1 }}
              >
                {isMicOn ? '🎤 Mic On' : '🔇 Mic Muted'}
              </button>
              <button
                type="button"
                onClick={onToggleCam}
                className={`tactile-btn ${isCamOn ? 'tactile-btn-secondary' : 'tactile-btn-danger'}`}
                style={{ flex: 1 }}
              >
                {isCamOn ? '📷 Cam On' : '🚫 Cam Off'}
              </button>
            </div>
          </div>

          {/* Right: Display Name & Join Action */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Your Display Name
              </label>
              <input
                type="text"
                className="tactile-input"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="e.g. Robin"
                required
              />

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  background: 'var(--bg-raised)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Party Participants
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  👥 Friends in the room are waiting for the party stream to start.
                </p>
              </div>

              {lobbyError && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger-red)',
                    fontSize: '0.82rem',
                  }}
                >
                  ⚠️ {lobbyError}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={onJoinParty}
                disabled={isConnecting}
                className="tactile-btn tactile-btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
              >
                {isConnecting ? 'Authenticating & Joining...' : '🎉 Join Party Now'}
              </button>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: '0.5rem',
                }}
              >
                Stateless JWT access • Zero persistent cookies • Ephemeral in-memory A/V
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
