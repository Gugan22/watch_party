'use client';

import React from 'react';

interface MediaPlayerStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  localVideoUrl: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlay: () => void;
  onPause: () => void;
  onPinSelf: () => void;
}

export const MediaPlayerStage: React.FC<MediaPlayerStageProps> = ({
  videoRef,
  localVideoUrl,
  onFileSelect,
  onPlay,
  onPause,
  onPinSelf,
}) => {
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
      {localVideoUrl ? (
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
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎬</div>
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: '#FFFFFF',
            }}
          >
            Select Media for Synchronized Playback
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#94A3B8',
              maxWidth: '440px',
              margin: '0 auto 1.25rem',
            }}
          >
            Pick a local video file (SHA-256 synced) or activate the browser extension to synchronize streaming sites.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <label className="tactile-btn tactile-btn-primary" style={{ cursor: 'pointer' }}>
              📁 Open Local Movie File
              <input
                type="file"
                accept="video/*"
                onChange={onFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
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
    </div>
  );
};
