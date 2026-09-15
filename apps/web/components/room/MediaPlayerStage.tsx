'use client';

import React, { useState } from 'react';
import type { OttSession } from '@watch-party/shared';
import { OttSyncModal } from './OttSyncModal';
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
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
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
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [showOttModal, setShowOttModal] = useState(false);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = streamUrl.trim();
    if (!url) return;

    if (isYouTubeUrl(url)) {
      onSetOttSession?.({
        platform: 'youtube',
        title: 'YouTube Stream',
        url,
        currentTime: 0,
        isPlaying: true,
        lastUpdated: Date.now(),
      });
    } else {
      onSetVideoUrl?.(url);
    }
    setShowUrlInput(false);
  };

  const handleSelectOtt = (session: OttSession) => {
    onSetOttSession?.(session);
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
            <span>Live Screen Stream (Tab Audio Active)</span>
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
        /* 2. Active OTT Session (YouTube Native Embed or External OTT Synchronizer) */
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
          />
        )
      ) : localVideoUrl ? (
        /* 3. Video Player Active (File or Direct Stream URL) */
        isYouTubeUrl(localVideoUrl) ? (
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
        /* 4. Empty State: OTT & Media Selection Hub */
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: '580px', width: '100%' }}>
          <div style={{ fontSize: '3.2rem', marginBottom: '0.5rem' }}>🍿</div>
          <h3
            style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              marginBottom: '0.4rem',
              color: '#FFFFFF',
            }}
          >
            Select Movie or Sync OTT Watch Party
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#94A3B8',
              marginBottom: '1.5rem',
              lineHeight: 1.4,
            }}
          >
            Sync Netflix, Prime Video, Disney+, or YouTube natively with 0 screen share lag, or stream local movies and direct links.
          </p>

          {/* Primary Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {/* 1. Choose Movie to Sync */}
            <button
              type="button"
              onClick={() => setShowOttModal(true)}
              className="tactile-btn tactile-btn-primary"
              style={{
                padding: '0.9rem 1rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
              }}
            >
              <span>🍿</span>
              <span>Choose Movie to Sync</span>
            </button>

            {/* 2. Local File */}
            <label
              className="tactile-btn tactile-btn-secondary"
              style={{ cursor: 'pointer', padding: '0.9rem 1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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

            {/* 3. Direct Online URL */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>🌐</span>
              <span>Direct Video URL</span>
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
                placeholder="Paste video or YouTube link (.mp4, .m3u8, youtube.com)"
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

          {/* Legacy Screen Share Trigger (Optional Fallback) */}
          {onStartScreenShare && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={onStartScreenShare}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🖥️</span>
                <span>Need to mirror an arbitrary window? Use Screen Share</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pin button */}
      <button
        onClick={onPinSelf}
        className="tile-pin-btn"
        style={{ opacity: 0.9, top: '12px', right: '12px' }}
        title="Pin/Unpin video player"
      >
        📌 {isPinned ? 'Unpin' : 'Stage'}
      </button>

      {/* OTT Sync Modal */}
      <OttSyncModal
        isOpen={showOttModal}
        onClose={() => setShowOttModal(false)}
        onSelectOtt={handleSelectOtt}
        onStartLegacyScreenShare={onStartScreenShare}
        currentSession={ottSession}
      />
    </div>
  );
};
