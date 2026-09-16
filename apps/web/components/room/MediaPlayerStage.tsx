'use client';

import React, { useState } from 'react';
import type { OttPlatform, OttSession } from '@watch-party/shared';
import { YouTubePlayerStage } from './YouTubePlayerStage';
import { OttSynchronizerStage } from './OttSynchronizerStage';

interface MediaPlayerStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  localVideoUrl: string | null;
  screenStream?: MediaStream | null;
  ottSession?: OttSession | null;
  roomId?: string;
  isHost?: boolean;
  isPlaying?: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetVideoUrl?: (url: string) => void;
  onSetOttSession?: (session: OttSession) => void;
  onTriggerCountdown?: (action: 'play' | 'pause', targetTime: number) => void;
  onSeek?: (time: number) => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onClearMedia?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onPinSelf: () => void;
  isPinned?: boolean;
  isPipActive?: boolean;
  onTogglePip?: () => void;
}

// Smart Streaming Platform Detection (Supports 100+ services, YouTube, and Direct Video)
function detectStreamingPlatform(rawUrl: string): {
  platform: OttPlatform;
  title: string;
  isDirectVideo: boolean;
} {
  const url = rawUrl.trim().toLowerCase();

  if (/youtube\.com|youtu\.be/.test(url)) {
    return { platform: 'youtube', title: 'YouTube Video', isDirectVideo: false };
  }
  if (/netflix\.com/.test(url)) {
    return { platform: 'netflix', title: 'Netflix Title', isDirectVideo: false };
  }
  if (/primevideo\.com|amazon\.[a-z.]+\/(gp\/video|video)/.test(url)) {
    return { platform: 'prime', title: 'Prime Video Movie', isDirectVideo: false };
  }
  if (/disneyplus\.com|hotstar\.com/.test(url)) {
    return { platform: 'disney', title: 'Disney+ / Hotstar', isDirectVideo: false };
  }
  if (/crunchyroll\.com/.test(url)) {
    return { platform: 'crunchyroll', title: 'Crunchyroll Anime', isDirectVideo: false };
  }
  if (/\.(mp4|m3u8|webm|mov|mkv)(\?|$)/i.test(url)) {
    return { platform: 'custom', title: 'Direct Video Stream', isDirectVideo: true };
  }

  // Generic streaming service / web link (Max, Hulu, Apple TV, Twitch, Vimeo, etc.)
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, '');
    const serviceName = hostname.split('.')[0];
    const capitalized = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    return { platform: 'custom', title: `${capitalized} Stream`, isDirectVideo: false };
  } catch {
    return { platform: 'custom', title: 'Streaming Service', isDirectVideo: false };
  }
}

export const MediaPlayerStage: React.FC<MediaPlayerStageProps> = ({
  videoRef,
  localVideoUrl,
  screenStream,
  ottSession,
  roomId = 'party',
  isHost = false,
  isPlaying = false,
  onFileSelect,
  onSetVideoUrl,
  onSetOttSession,
  onTriggerCountdown,
  onSeek,
  onStartScreenShare,
  onStopScreenShare,
  onClearMedia,
  onPlay,
  onPause,
  onPinSelf,
  isPinned = false,
  isPipActive = false,
  onTogglePip,
}) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processAndPlayUrl = (inputUrl: string) => {
    const url = inputUrl.trim();
    if (!url) return;

    const detected = detectStreamingPlatform(url);

    if (detected.isDirectVideo) {
      onSetVideoUrl?.(url);
    } else {
      onSetOttSession?.({
        platform: detected.platform,
        title: detected.title,
        url,
        currentTime: 0,
        isPlaying: true,
        lastUpdated: Date.now(),
      });
    }
    setStreamUrl('');
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processAndPlayUrl(streamUrl);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          setStreamUrl(text.trim());
          processAndPlayUrl(text.trim());
        }
      }
    } catch (err) {
      console.warn('Clipboard read permission denied or unavailable:', err);
    }
  };

  // Drag-and-drop local video file directly onto the cinema stage
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const syntheticEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileSelect(syntheticEvent);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDragOver ? 'rgba(37, 99, 235, 0.15)' : '#000000',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'background 0.2s ease',
      }}
    >
      {/* 1. Live Screen Share (Legacy / Optional Fallback) */}
      {screenStream ? (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            autoPlay
            playsInline
            ref={(el) => {
              if (el && screenStream && el.srcObject !== screenStream) {
                el.srcObject = screenStream;
                el.play().catch(() => {});
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.8rem',
              color: '#FFFFFF',
              fontWeight: 600,
            }}
          >
            <span style={{ color: 'var(--danger-red)', fontSize: '0.9rem' }}>●</span>
            <span>Live Screen Stream</span>
            {onStopScreenShare && (
              <button
                type="button"
                onClick={onStopScreenShare}
                className="tactile-btn tactile-btn-danger"
                style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px' }}
              >
                Stop Sharing
              </button>
            )}
          </div>
        </div>
      ) : ottSession ? (
        /* 2. Active Streaming Services Session (YouTube Native Embed or Synchronizer Console) */
        ottSession.platform === 'youtube' ? (
          <YouTubePlayerStage
            url={ottSession.url}
            title={ottSession.title}
            isPlaying={isPlaying}
            onPlay={(time) => {
              onPlay();
              onSeek?.(time);
            }}
            onPause={(time) => {
              onPause();
              onSeek?.(time);
            }}
            onSeek={(time) => onSeek?.(time)}
            onClearMedia={() => onClearMedia?.()}
            onPinStage={onPinSelf}
            isPinned={isPinned}
          />
        ) : (
          <OttSynchronizerStage
            session={ottSession}
            roomId={roomId}
            isHost={isHost}
            isPlaying={isPlaying}
            onPlay={(time) => {
              onPlay();
              onSeek?.(time);
            }}
            onPause={(time) => {
              onPause();
              onSeek?.(time);
            }}
            onSeek={(time) => onSeek?.(time)}
            onTriggerCountdown={(action, targetTime) =>
              onTriggerCountdown?.(action, targetTime)
            }
            onClearMedia={() => onClearMedia?.()}
            onPinStage={onPinSelf}
            isPinned={isPinned}
            isPipActive={isPipActive}
            onTogglePip={onTogglePip}
          />
        )
      ) : localVideoUrl ? (
        /* 3. Video Player Active (File or Direct Stream URL) */
        detectStreamingPlatform(localVideoUrl).platform === 'youtube' ? (
          <YouTubePlayerStage
            url={localVideoUrl}
            isPlaying={isPlaying}
            onPlay={(time) => {
              onPlay();
              onSeek?.(time);
            }}
            onPause={(time) => {
              onPause();
              onSeek?.(time);
            }}
            onSeek={(time) => onSeek?.(time)}
            onClearMedia={() => onClearMedia?.()}
            onPinStage={onPinSelf}
            isPinned={isPinned}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video
              ref={videoRef}
              src={localVideoUrl}
              controls
              playsInline
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onPlay={onPlay}
              onPause={onPause}
            />
            {onClearMedia && (
              <button
                type="button"
                onClick={onClearMedia}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                }}
                title="Switch video source"
              >
                🔄 Change Media
              </button>
            )}
          </div>
        )
      ) : (
        /* 4. Streamlined Universal Cinema Stage (Zero Popups, One Universal Input) */
        <div
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.75rem',
            maxWidth: '680px',
            width: '90%',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7), 0 0 60px rgba(56, 189, 248, 0.08)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', lineHeight: 1 }}>🍿</div>
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.4rem',
              color: '#FFFFFF',
            }}
          >
            Ready for the Movie?
          </h3>
          <p
            style={{
              fontSize: '0.88rem',
              color: '#94A3B8',
              marginBottom: '1.75rem',
              lineHeight: 1.5,
              maxWidth: '520px',
              margin: '0 auto 1.75rem auto',
            }}
          >
            Paste a link from any streaming service, YouTube, or video URL to sync playback across everyone's screen with zero lag.
          </p>

          {/* Universal Single Input Bar */}
          <form
            onSubmit={handleUrlSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 8px 6px 16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '1rem', opacity: 0.7 }}>🔗</span>
            <input
              type="url"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Paste any streaming link (Netflix, Prime, Disney+, YouTube, .mp4)..."
              required
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                padding: '0.4rem 0.2rem',
              }}
            />

            {/* Quick 1-Click Clipboard Paste Action */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              title="Paste link from clipboard and play"
              className="tactile-btn"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                color: '#38BDF8',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>📋</span>
              <span>Paste</span>
            </button>

            {/* Start Button */}
            <button
              type="submit"
              className="tactile-btn tactile-btn-primary"
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>▶️ Start Party</span>
            </button>
          </form>

          {/* Quick Alternative Actions: Local File & Screen Share */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '1.5rem',
            }}
          >
            {/* Play Local Video File */}
            <label
              className="tactile-btn tactile-btn-secondary"
              style={{
                cursor: 'pointer',
                padding: '0.45rem 0.95rem',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <span>📁</span>
              <span>Play Local Movie File</span>
              <input
                type="file"
                accept="video/*"
                onChange={onFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {/* Optional Fallback Screen Share */}
            {onStartScreenShare && (
              <button
                type="button"
                onClick={onStartScreenShare}
                className="tactile-btn tactile-btn-secondary"
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-full)',
                  color: '#94A3B8',
                }}
              >
                <span>🖥️</span>
                <span>Share Screen</span>
              </button>
            )}
          </div>

          {/* Supported Streaming Services Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '0.72rem',
              color: '#64748B',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '1rem',
            }}
          >
            <span>🍿 Netflix</span>
            <span>•</span>
            <span>📦 Prime Video</span>
            <span>•</span>
            <span>✨ Disney+</span>
            <span>•</span>
            <span>▶️ YouTube</span>
            <span>•</span>
            <span>🎬 Crunchyroll</span>
            <span>•</span>
            <span>🍎 Apple TV+</span>
            <span>•</span>
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>🌐 100+ Streaming Services</span>
          </div>
        </div>
      )}

      {/* Pin Stage Button */}
      <button
        onClick={onPinSelf}
        className="tile-pin-btn"
        style={{ opacity: 0.9, top: '12px', right: '12px' }}
        title="Pin/Unpin video player"
      >
        📌 {isPinned ? 'Unpin' : 'Stage'}
      </button>
    </div>
  );
};
