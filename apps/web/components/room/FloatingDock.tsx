'use client';

import React from 'react';

interface FloatingDockProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isPlaying: boolean;
  isFullscreen: boolean;
  isScreenSharing?: boolean;
  layoutMode?: 'theater' | 'spotlight' | 'grid' | 'sidebar';
  isOttActive?: boolean;
  isHost?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSendReaction: (emoji: string) => void;
  onTogglePlayPause: () => void;
  onToggleFullscreen: () => void;
  onToggleScreenShare?: () => void;
  onOpenOttModal?: () => void;
  onSyncAll?: () => void;
  onCycleLayoutMode?: () => void;
  onLeaveRoom: () => void;
}

const REACTION_EMOJIS = ['🍿', '💖', '😂', '👏', '😱'];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  isMicOn,
  isCamOn,
  isPlaying,
  isFullscreen,
  isScreenSharing = false,
  layoutMode = 'spotlight',
  isOttActive = false,
  isHost = false,
  onToggleMic,
  onToggleCam,
  onSendReaction,
  onTogglePlayPause,
  onToggleFullscreen,
  onToggleScreenShare,
  onOpenOttModal,
  onSyncAll,
  onCycleLayoutMode,
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

        {/* Host Playback Sync Button (Host Only) */}
        {isHost && onSyncAll && (
          <button
            onClick={onSyncAll}
            className="dock-btn active"
            title="Sync: Play for all attendees across the room"
            style={{ borderColor: 'var(--accent-blue)', color: '#38BDF8', fontWeight: 700 }}
          >
            ⚡
          </button>
        )}

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

        {/* Mode Switcher Button */}
        {onCycleLayoutMode && (
          <button
            onClick={onCycleLayoutMode}
            className={`dock-btn ${layoutMode === 'theater' ? 'active' : ''}`}
            title={`Current View: ${layoutMode || 'spotlight'}. Click to switch view mode.`}
          >
            {layoutMode === 'theater' ? '🎬' : layoutMode === 'spotlight' ? '🎯' : layoutMode === 'grid' ? '⊞' : '◫'}
          </button>
        )}

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
