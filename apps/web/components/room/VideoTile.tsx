'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isCamOn: boolean;
  isMicOn: boolean;
  stream?: MediaStream | null;
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
  stream: propStream,
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
  const activeStream = participant.stream || propStream;

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if stream has live video tracks
  const hasVideoTrack = Boolean(
    activeStream &&
    activeStream.getVideoTracks().length > 0 &&
    participant.isCamOn
  );

  // Bind video element whenever stream, camera, or video track state updates
  useEffect(() => {
    if (videoRef.current && activeStream && hasVideoTrack) {
      if (videoRef.current.srcObject !== activeStream) {
        videoRef.current.srcObject = activeStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [activeStream, hasVideoTrack]);

  // Bind audio element for remote participants (unmuted, plays even if camera is off)
  useEffect(() => {
    if (!isSelf && audioRef.current && activeStream) {
      if (audioRef.current.srcObject !== activeStream) {
        audioRef.current.srcObject = activeStream;
      }
      if (isMutedForHost) {
        audioRef.current.muted = true;
      } else {
        audioRef.current.muted = false;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [activeStream, isSelf, isMutedForHost]);

  // Clean short name to prevent wrapping across lines
  const rawName = (participant.name || 'User')
    .replace(/ \(Host\)/gi, '')
    .replace(/ \(You\)/gi, '')
    .trim();
  const displayNameShort = isSelf ? `${rawName} (You)` : rawName;

  return (
    <div
      className={`video-tile ${participant.isSpeaking ? 'speaking' : ''}`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {/* Background audio playback for remote peers */}
      {!isSelf && activeStream && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {/* Main tile content: Active Camera Video, Permission Request prompt, or Avatar */}
      {isSelf && !activeStream ? (
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
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
          >
            📷
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
            Click to Enable Camera
          </span>
        </button>
      ) : hasVideoTrack ? (
        <video
          ref={(el) => {
            if (el && activeStream) {
              if (el.srcObject !== activeStream) {
                el.srcObject = activeStream;
              }
              el.play().catch(() => {});
            }
            (videoRef as any).current = el;
          }}
          autoPlay
          playsInline
          muted={isSelf} // Self MUST be muted to prevent local audio echo loop
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isSelf ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            height: '100%',
            padding: '0.5rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.25)',
            }}
          >
            {(rawName || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 500 }}>
            Camera Off
          </div>
        </div>
      )}

      {/* Sleek, Single-Line Bottom Badge (Never wraps, never blocks tile center) */}
      <div
        className="tile-overlay-badge"
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '6px',
          maxWidth: 'calc(100% - 12px)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          zIndex: 5,
        }}
      >
        <span
          title={participant.name}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {displayNameShort}
        </span>
        {!participant.isMicOn && <span title="Muted by user">🔇</span>}
        {isMutedForHost && <span title="Muted for you" style={{ color: 'var(--warning-amber)' }}>[Muted]</span>}
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
