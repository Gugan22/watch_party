'use client';

import React, { useState } from 'react';

interface MediaPlayerStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  localVideoUrl: string | null;
  screenStream?: MediaStream | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetVideoUrl?: (url: string) => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onClearMedia?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onPinSelf: () => void;
}

export const MediaPlayerStage: React.FC<MediaPlayerStageProps> = ({
  videoRef,
  localVideoUrl,
  screenStream,
  onFileSelect,
  onSetVideoUrl,
  onStartScreenShare,
  onStopScreenShare,
  onClearMedia,
  onPlay,
  onPause,
  onPinSelf,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [showOttModal, setShowOttModal] = useState(false);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;
    onSetVideoUrl?.(streamUrl.trim());
    setShowUrlInput(false);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Live Screen / OTT Tab Stream Active */}
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
            <span>Live OTT / Screen Stream (Tab Audio Active)</span>
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
      ) : localVideoUrl ? (
        /* 2. Video Player Active (File or Stream URL) */
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
      ) : (
        /* 3. Empty State: Media Selector Options */
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: '580px', width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎬</div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '0.4rem',
              color: '#FFFFFF',
            }}
          >
            Select Movie or Stream for Synced Playback
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#94A3B8',
              marginBottom: '1.5rem',
              lineHeight: 1.4,
            }}
          >
            Stream local videos, online video links, or share your Netflix / Prime / Disney+ tab with audio.
          </p>

          {/* Primary Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {/* 1. Local File */}
            <label
              className="tactile-btn tactile-btn-primary"
              style={{ cursor: 'pointer', padding: '0.85rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>📁</span>
              <span>Local Movie File</span>
              <input
                type="file"
                accept="video/*"
                onChange={onFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {/* 2. Stream Screen / OTT Tab */}
            {onStartScreenShare && (
              <button
                type="button"
                onClick={onStartScreenShare}
                className="tactile-btn tactile-btn-secondary"
                style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.15)', borderColor: 'var(--accent-blue)', color: '#FFFFFF' }}
              >
                <span>🖥️</span>
                <span>Stream OTT Tab</span>
              </button>
            )}

            {/* 3. Online URL */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>🌐</span>
              <span>Online Video URL</span>
            </button>
          </div>

          {/* Online URL Input Form */}
          {showUrlInput && (
            <form
              onSubmit={handleUrlSubmit}
              className="animate-fade-in"
              style={{
                display: 'flex',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}
            >
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="Paste direct video URL (.mp4, .m3u8, .webm)"
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                className="tactile-btn tactile-btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Load
              </button>
            </form>
          )}

          {/* OTT Sync Guide Trigger */}
          <button
            type="button"
            onClick={() => setShowOttModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🍿</span>
            <span>How does Netflix, Prime Video & OTT sync work?</span>
          </button>
        </div>
      )}

      {/* Pin button */}
      <button
        onClick={onPinSelf}
        className="tile-pin-btn"
        style={{ opacity: 0.9, top: '12px', right: '12px' }}
        title="Pin/Unpin video player"
      >
        📌 Stage
      </button>

      {/* OTT Sync Guide Modal */}
      {showOttModal && (
        <div
          onClick={() => setShowOttModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tactile-card animate-fade-in"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-tactile)',
              position: 'relative',
              textAlign: 'left',
            }}
          >
            <button
              type="button"
              onClick={() => setShowOttModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.8rem' }}>🍿</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  OTT & Streaming Sync Guide
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Netflix, Disney+, Prime Video & Streaming Sites
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  1. Stream Screen / OTT Tab (Instant, Zero Setup)
                </strong>
                Click <strong>"Stream OTT Tab"</strong> above and select your browser tab running Netflix, Prime Video, or Disney+. Make sure to check <em>"Share tab audio"</em>. Everyone in the room will watch and hear the movie in real-time without needing their own subscription!
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  2. Online Direct Video Stream
                </strong>
                Have a direct MP4, HLS (.m3u8), or WebM stream link? Paste it into <strong>"Online Video URL"</strong> to load it into the synchronized cinema stage.
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  3. Browser Extension (Free Streaming Players)
                </strong>
                For free streaming sites (e.g., Megacloud, Rabbitstream), our Chrome/Edge extension in <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>apps/extension</code> intercepts the player iframe and synchronizes play/pause without popup ads.
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowOttModal(false)}
                className="tactile-btn tactile-btn-primary"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
