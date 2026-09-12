'use client';

import React, { useState } from 'react';

export interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isCamOn: boolean;
  isMicOn: boolean;
}

interface VideoTileProps {
  participant: Participant;
  stream?: MediaStream | null;
  isSelf?: boolean;
  isHostViewer?: boolean;
  isMutedForHost?: boolean;
  onPin?: (id: string) => void;
  onKick?: (id: string) => void;
  onToggleHostMute?: (id: string) => void;
  onRequestMedia?: () => void;
  style?: React.CSSProperties;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  stream,
  isSelf = false,
  isHostViewer = false,
  isMutedForHost = false,
  onPin,
  onKick,
  onToggleHostMute,
  onRequestMedia,
  style,
}) => {
  const [showHostMenu, setShowHostMenu] = useState(false);

  return (
    <div
      className={`video-tile ${participant.isSpeaking ? 'speaking' : ''}`}
      style={{ ...style, position: 'relative' }}
    >
      {isSelf && !stream ? (
        <button
          type="button"
          onClick={onRequestMedia}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '0.5rem',
            width: '100%',
            height: '100%',
          }}
          title="Click to enable camera & mic permissions"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            📷
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
            Click to Enable Camera
          </span>
        </button>
      ) : isSelf && participant.isCamOn && stream ? (
        <video
          autoPlay
          playsInline
          muted
          ref={(el) => {
            if (el && stream) {
              if (el.srcObject !== stream) {
                el.srcObject = stream;
              }
              el.play().catch(() => {});
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-blue)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
            }}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
            {participant.isCamOn ? 'Camera On' : 'Camera Off'}
          </div>
        </div>
      )}

      {/* Overlay badge with mic status */}
      <div className="tile-overlay-badge">
        <span title={participant.name}>
          {isSelf ? `${participant.name.replace(/ \(Host\)/g, '').replace(/ \(You\)/g, '')} (You)` : participant.name}
        </span>
        {!participant.isMicOn && <span title="Muted by user">🔇</span>}
        {isMutedForHost && <span title="Muted by host for you" style={{ color: 'var(--warning-amber)' }}>[Muted]</span>}
      </div>

      {/* Pin button */}
      {onPin && (
        <button
          type="button"
          onClick={() => onPin(participant.id)}
          className="tile-pin-btn"
          title={`Pin ${participant.name} to focal stage`}
        >
          📌
        </button>
      )}

      {/* Host Moderation Controls (Only shown if viewer is Host and tile is not self) */}
      {isHostViewer && !isSelf && (
        <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => setShowHostMenu(!showHostMenu)}
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 6px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            title="Host Controls"
          >
            ⚙️ Host
          </button>

          {showHostMenu && (
            <div
              style={{
                position: 'absolute',
                top: '26px',
                left: '0',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-tactile)',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: '150px',
                zIndex: 30,
              }}
            >
              {onToggleHostMute && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleHostMute(participant.id);
                    setShowHostMenu(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {isMutedForHost ? '🔊 Unmute for Me' : '🔇 Mute for Me'}
                </button>
              )}

              {onKick && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${participant.name} from the party?`)) {
                      onKick(participant.id);
                    }
                    setShowHostMenu(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    color: 'var(--danger-red)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🚫 Remove Member
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
