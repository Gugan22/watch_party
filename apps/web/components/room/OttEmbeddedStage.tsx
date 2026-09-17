'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { OttSession } from '@watch-party/shared';

interface OttEmbeddedStageProps {
  session: OttSession;
  roomId: string;
  isHost: boolean;
  isPlaying: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onClearMedia: () => void;
  onPinStage?: () => void;
  isPinned?: boolean;
}

const PLATFORM_THEMES: Record<string, { name: string; accent: string; icon: string }> = {
  netflix: { name: 'Netflix', accent: '#E50914', icon: '🍿' },
  prime: { name: 'Prime Video', accent: '#00A8E1', icon: '📦' },
  disney: { name: 'Disney+ / Hotstar', accent: '#113CCF', icon: '✨' },
  crunchyroll: { name: 'Crunchyroll', accent: '#F47521', icon: '🎬' },
  youtube: { name: 'YouTube', accent: '#EF4444', icon: '▶️' },
  custom: { name: 'Streaming Video', accent: '#3B82F6', icon: '🌐' },
};

export const OttEmbeddedStage: React.FC<OttEmbeddedStageProps> = ({
  session,
  roomId,
  isHost,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onClearMedia,
  onPinStage,
  isPinned,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [showExtensionHelp, setShowExtensionHelp] = useState(false);

  const theme = PLATFORM_THEMES[session.platform] || PLATFORM_THEMES.custom;

  // Listen for playback events relayed from the framed streaming page
  useEffect(() => {
    const handleFrameMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'wp-embedded-frame') return;
      const { action, time } = event.data;

      if (action === 'play') {
        onPlay(time || 0);
      } else if (action === 'pause') {
        onPause(time || 0);
      } else if (action === 'seek') {
        onSeek(time || 0);
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => window.removeEventListener('message', handleFrameMessage);
  }, [onPlay, onPause, onSeek]);

  // Command the framed player when parent play/pause state changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            source: 'wp-room-stage',
            action: isPlaying ? 'play' : 'pause',
            time: session.currentTime || 0,
          },
          '*'
        );
      } catch {}
    }
  }, [isPlaying, session.currentTime]);

  const handleReload = () => {
    setIframeKey((k) => k + 1);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000000',
        borderRadius: 'inherit',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Top Floating Glass Badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(11, 13, 17, 0.88)',
          backdropFilter: 'blur(12px)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.8rem',
          color: '#FFFFFF',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ color: theme.accent, fontWeight: 800 }}>
          {theme.icon} {theme.name} (Stage Mode)
        </span>
        <span>•</span>
        <span style={{ color: '#34D399', fontWeight: 600 }}>🟢 Embedded & Synced</span>

        {/* Reload Button */}
        <button
          type="button"
          onClick={handleReload}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#94A3B8',
            padding: '2px 6px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            marginLeft: '4px',
          }}
          title="Reload embedded player"
        >
          🔄 Reload
        </button>

        {/* Switch Movie Button */}
        <button
          type="button"
          onClick={onClearMedia}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#FFFFFF',
            padding: '2px 8px',
            fontSize: '0.7rem',
            cursor: 'pointer',
          }}
          title="Switch title / URL"
        >
          ✕ Switch
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

      {/* Embedded Native Streaming Iframe */}
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={session.url}
        allow="autoplay; encrypted-media; fullscreen; display-capture"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: '#000000',
        }}
      />

      {/* Subtle Extension Helper Trigger at bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '12px',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setShowExtensionHelp(!showExtensionHelp)}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            color: '#94A3B8',
            fontSize: '0.68rem',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          🧩 Frame blocked? Extension required
        </button>
      </div>

      {showExtensionHelp && (
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '12px',
            maxWidth: '320px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.78rem',
            color: '#FFFFFF',
            zIndex: 100,
            boxShadow: '0 12px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px', color: '#38BDF8' }}>
            Streaming directly inside the stage:
          </div>
          <p style={{ margin: '0 0 8px 0', lineHeight: 1.4, color: '#CBD5E1', fontSize: '0.72rem' }}>
            To bypass Netflix & Prime's <code>X-Frame-Options: DENY</code>, make sure the WatchParty Chrome Extension is loaded in Developer Mode.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowExtensionHelp(false)}
              style={{
                background: '#2563EB',
                border: 'none',
                borderRadius: '4px',
                color: '#FFFFFF',
                padding: '3px 8px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
