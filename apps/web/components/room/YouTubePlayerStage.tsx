'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface YouTubePlayerStageProps {
  url: string;
  title?: string;
  isPlaying: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onClearMedia: () => void;
  onPinStage?: () => void;
  isPinned?: boolean;
}

// Extract YouTube Video ID from any URL format
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0];
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/embed/')[1].split('?')[0];
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/shorts/')[1].split('?')[0];
      }
    }
  } catch {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

export const YouTubePlayerStage: React.FC<YouTubePlayerStageProps> = ({
  url,
  title,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onClearMedia,
  onPinStage,
  isPinned,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoId = extractYouTubeId(url);
  const [playerReady, setPlayerReady] = useState(false);
  const isInternalAction = useRef(false);

  // Send message to YouTube IFrame API
  const postToPlayer = useCallback((func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {}
  }, []);

  // Sync isPlaying state to iframe
  useEffect(() => {
    if (!playerReady) return;
    if (isPlaying) {
      postToPlayer('playVideo');
    } else {
      postToPlayer('pauseVideo');
    }
  }, [isPlaying, playerReady, postToPlayer]);

  // Listen to postMessage events from YouTube Iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'onReady') {
          setPlayerReady(true);
        }
        if (data && data.event === 'infoDelivery' && data.info) {
          if (data.info.playerState === 1 && !isPlaying && !isInternalAction.current) {
            // YouTube player started
            onPlay(data.info.currentTime || 0);
          } else if (data.info.playerState === 2 && isPlaying && !isInternalAction.current) {
            // YouTube player paused
            onPause(data.info.currentTime || 0);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPlaying, onPlay, onPause]);

  if (!videoId) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#FFFFFF',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Invalid YouTube Link
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
          Could not extract video ID from: <code>{url}</code>
        </p>
        <button
          type="button"
          onClick={onClearMedia}
          className="tactile-btn tactile-btn-primary"
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          Choose Another Movie
        </button>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&origin=${encodeURIComponent(
    origin
  )}&rel=0&modestbranding=1`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#000000',
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Top Media Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(11, 13, 17, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.8rem',
          color: '#FFFFFF',
        }}
      >
        <span style={{ color: '#EF4444', fontWeight: 800 }}>▶️ YouTube</span>
        <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {title || 'Synced Playback'}
        </span>
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
            marginLeft: '4px',
          }}
          title="Change Media"
        >
          🔄 Switch
        </button>
      </div>

      {onPinStage && (
        <button
          type="button"
          onClick={onPinStage}
          className="tile-pin-btn"
          style={{ opacity: 0.9, top: '12px', right: '12px', zIndex: 20 }}
          title={isPinned ? 'Unpin Stage' : 'Pin Stage'}
        >
          📌 {isPinned ? 'Unpin' : 'Stage'}
        </button>
      )}

      {/* YouTube Native Embed */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title={title || 'YouTube Synced Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>

      {/* Master Synced Control Dock (Below Player) */}
      <div
        style={{
          background: 'rgba(11, 13, 17, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              isInternalAction.current = true;
              if (isPlaying) {
                postToPlayer('pauseVideo');
                onPause(0);
              } else {
                postToPlayer('playVideo');
                onPlay(0);
              }
              setTimeout(() => {
                isInternalAction.current = false;
              }, 500);
            }}
            className="tactile-btn tactile-btn-primary"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            {isPlaying ? '⏸️ Pause Room' : '▶️ Play Room'}
          </button>
          <button
            type="button"
            onClick={() => {
              postToPlayer('seekTo', [0, true]);
              onSeek(0);
            }}
            className="tactile-btn tactile-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Rewind to beginning"
          >
            ⏮️ Restart
          </button>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <span>●</span>
          <span>Synced with Party (0 Screen Share Lag)</span>
        </div>
      </div>
    </div>
  );
};
