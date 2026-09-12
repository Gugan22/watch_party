'use client';

import React from 'react';

interface FloatingDockProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isPlaying: boolean;
  isFullscreen: boolean;
  isScreenSharing?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSendReaction: (emoji: string) => void;
  onTogglePlayPause: () => void;
  onToggleFullscreen: () => void;
  onToggleScreenShare?: () => void;
  onLeaveRoom: () => void;
}

const REACTION_EMOJIS = ['🍿', '💖', '😂', '👏', '😱'];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  isMicOn,
  isCamOn,
  isPlaying,
  isFullscreen,
  isScreenSharing = false,
  onToggleMic,
  onToggleCam,
  onSendReaction,
  onTogglePlayPause,
  onToggleFullscreen,
  onToggleScreenShare,
  onLeaveRoom,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
      <div className="floating-dock">
        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          className={`dock-btn ${!isMicOn ? 'off' : ''}`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? '🎤' : '🔇'}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleCam}
          className={`dock-btn ${!isCamOn ? 'off' : ''}`}
          title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCamOn ? '📷' : '🚫'}
        </button>

        {/* Quick Reactions Bar */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '0 4px',
            borderLeft: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                transition: 'transform 0.1s',
              }}
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Play/Pause Sync Button */}
        <button
          onClick={onTogglePlayPause}
          className="dock-btn"
          title="Toggle Play / Pause Sync"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Stream Screen / OTT Tab Button */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            className={`dock-btn ${isScreenSharing ? 'active' : ''}`}
            title={isScreenSharing ? 'Stop Screen / OTT Stream' : 'Stream Screen / OTT Tab with Audio'}
          >
            🖥️
          </button>
        )}

        {/* Fullscreen Theater Button */}
        <button
          onClick={onToggleFullscreen}
          className="dock-btn"
          title="Fullscreen Theater Mode (F)"
        >
          {isFullscreen ? '⤦' : '⛶'}
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="dock-btn danger"
          title="Leave Watch Party"
        >
          📞
        </button>
      </div>
    </div>
  );
};
