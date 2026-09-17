'use client';

import React, { useState, useEffect } from 'react';
import type { OttSession } from '@watch-party/shared';
import { formatMediaTime } from '@watch-party/shared';
import { OttExtensionModal } from './OttExtensionModal';

interface OttSynchronizerStageProps {
  session: OttSession;
  roomId: string;
  isHost: boolean;
  isPlaying: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onTriggerCountdown: (action: 'play' | 'pause', targetTime: number) => void;
  onClearMedia: () => void;
  onPinStage?: () => void;
  isPinned?: boolean;
  isPipActive?: boolean;
  onTogglePip?: () => void;
}

const PLATFORM_THEMES: Record<string, { name: string; bg: string; accent: string; icon: string }> = {
  netflix: {
    name: 'Netflix',
    bg: 'linear-gradient(135deg, rgba(229, 9, 20, 0.25) 0%, rgba(11, 13, 17, 0.95) 100%)',
    accent: '#E50914',
    icon: '🍿',
  },
  prime: {
    name: 'Prime Video',
    bg: 'linear-gradient(135deg, rgba(0, 168, 225, 0.25) 0%, rgba(11, 13, 17, 0.95) 100%)',
    accent: '#00A8E1',
    icon: '📦',
  },
  disney: {
    name: 'Disney+ / Hotstar',
    bg: 'linear-gradient(135deg, rgba(17, 60, 207, 0.25) 0%, rgba(11, 13, 17, 0.95) 100%)',
    accent: '#113CCF',
    icon: '✨',
  },
  crunchyroll: {
    name: 'Crunchyroll',
    bg: 'linear-gradient(135deg, rgba(244, 117, 33, 0.25) 0%, rgba(11, 13, 17, 0.95) 100%)',
    accent: '#F47521',
    icon: '🎬',
  },
  custom: {
    name: 'Streaming Service',
    bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(11, 13, 17, 0.95) 100%)',
    accent: '#3B82F6',
    icon: '🌐',
  },
};

export const OttSynchronizerStage: React.FC<OttSynchronizerStageProps> = ({
  session,
  roomId,
  isHost,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onTriggerCountdown,
  onClearMedia,
  onPinStage,
  isPinned,
  isPipActive = false,
  onTogglePip,
}) => {
  const [localTime, setLocalTime] = useState(session.currentTime || 0);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const totalDuration = session.duration || 7200; // default 2 hours if not specified

  const theme = PLATFORM_THEMES[session.platform] || PLATFORM_THEMES.custom;

  // Real-time ticking time clock when playing
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;
    const interval = setInterval(() => {
      setLocalTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing]);

  // Sync with remote session updates
  useEffect(() => {
    if (!isScrubbing && typeof session.currentTime === 'number') {
      if (Math.abs(localTime - session.currentTime) > 2) {
        setLocalTime(session.currentTime);
      }
    }
  }, [session.currentTime, isScrubbing]);

  const handleLaunchOtt = () => {
    if (session.url) {
      const cleanUrl = session.url.split('#')[0];
      const targetUrl = `${cleanUrl}#watchparty=${encodeURIComponent(roomId)}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      onPause(localTime);
    } else {
      onPlay(localTime);
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    setLocalTime(clamped);
    onSeek(clamped);
  };

  const handleCountdown = () => {
    const nextAction = isPlaying ? 'pause' : 'play';
    onTriggerCountdown(nextAction, localTime);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        borderRadius: 'inherit',
        overflow: 'hidden',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Pill */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(11, 13, 17, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.8rem',
          color: '#FFFFFF',
          zIndex: 10,
        }}
      >
        <span style={{ color: theme.accent, fontWeight: 800 }}>{theme.icon} {theme.name}</span>
        <span>•</span>
        <span style={{ color: '#34D399', fontWeight: 600 }}>🟢 Synced Watch Party</span>
        <button
          type="button"
          onClick={onClearMedia}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#FFFFFF',
            padding: '2px 8px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            marginLeft: '6px',
          }}
          title="Switch movie"
        >
          🔄 Switch
        </button>
      </div>

      {onPinStage && (
        <button
          type="button"
          onClick={onPinStage}
          className="tile-pin-btn"
          style={{ opacity: 0.9, top: '12px', right: '12px', zIndex: 10 }}
          title={isPinned ? 'Unpin Stage' : 'Pin Stage'}
        >
          📌 {isPinned ? 'Unpin' : 'Stage'}
        </button>
      )}

      {/* Main Cinema Synchronizer Card */}
      <div
        className="tactile-card animate-fade-in"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2rem 1.75rem',
          background: 'rgba(11, 13, 17, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          textAlign: 'center',
          color: '#FFFFFF',
          zIndex: 5,
        }}
      >
        <div style={{ fontSize: '3.2rem', marginBottom: '0.5rem' }}>{theme.icon}</div>

        <h3
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.4rem',
            color: '#FFFFFF',
          }}
        >
          {session.title || 'Streaming Cinema Party'}
        </h3>

        <p
          style={{
            fontSize: '0.85rem',
            color: '#94A3B8',
            marginBottom: '1.5rem',
            lineHeight: 1.4,
          }}
        >
          Streaming natively on {theme.name} with 0 screen share lag.
          <br />
          Click below to open the movie, then control playback synchronously!
        </p>

        {/* Big Launch & Pop Out Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.75rem' }}>
          <button
            type="button"
            onClick={handleLaunchOtt}
            className="tactile-btn tactile-btn-primary"
            style={{
              padding: '0.85rem 1.6rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: theme.accent,
              borderColor: theme.accent,
              boxShadow: `0 8px 24px ${theme.accent}40`,
            }}
            title={`Watch movie on ${theme.name} with WatchParty video calls on the exact same page!`}
          >
            <span>{theme.icon}</span>
            <span>Watch on {theme.name} (Same Page Video + Calls)</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>↗</span>
          </button>

          {onTogglePip && (
            <button
              type="button"
              onClick={onTogglePip}
              className="tactile-btn tactile-btn-secondary"
              style={{
                padding: '0.85rem 1.4rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderColor: isPipActive ? '#A855F7' : 'rgba(255, 255, 255, 0.2)',
                background: isPipActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: isPipActive ? '#E9D5FF' : '#FFFFFF',
                boxShadow: isPipActive ? '0 0 15px rgba(168, 85, 247, 0.4)' : 'none',
              }}
              title="Pop out friends' webcams into an always-on-top window to watch Netflix/Prime in full screen"
            >
              <span>📌</span>
              <span>{isPipActive ? 'Close Floating Webcams' : 'Pop Out Webcams (PiP)'}</span>
            </button>
          )}
        </div>

        {/* Master Synced Remote Controller */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Time Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#94A3B8', minWidth: '55px', textAlign: 'right' }}>
              {formatMediaTime(localTime)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDuration}
              value={localTime}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onChange={(e) => setLocalTime(Number(e.target.value))}
              onMouseUp={(e) => {
                setIsScrubbing(false);
                handleSeek(Number((e.target as HTMLInputElement).value));
              }}
              onTouchEnd={(e) => {
                setIsScrubbing(false);
                handleSeek(Number((e.target as HTMLInputElement).value));
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: theme.accent,
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#64748B', minWidth: '55px', textAlign: 'left' }}>
              {formatMediaTime(totalDuration)}
            </span>
          </div>

          {/* Controller Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleSeek(localTime - 10)}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
              title="Rewind 10 seconds"
            >
              ↺ 10s
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="tactile-btn tactile-btn-primary"
              style={{
                padding: '0.65rem 1.6rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: isPlaying ? 'var(--danger-red)' : 'var(--accent-blue)',
                borderColor: isPlaying ? 'var(--danger-red)' : 'var(--accent-blue)',
              }}
            >
              {isPlaying ? '⏸️ Pause Room' : '▶️ Play Room'}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(localTime + 10)}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
              title="Fast forward 10 seconds"
            >
              10s ↻
            </button>
          </div>

          {/* Countdown Sync Action */}
          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleCountdown}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.75rem', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              title="Countdown sync for mobile, TVs, and external devices"
            >
              ⏱️ 3-2-1 Countdown Sync
            </button>
          </div>
        </div>

        {/* Extension Auto-Sync Guide Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowExtensionModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span>
            <span>Enable 1-Click Auto-Sync (Bookmarklet / Extension)</span>
          </button>
        </div>
      </div>

      {/* Extension Modal */}
      <OttExtensionModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        roomId={roomId}
      />
    </div>
  );
};
