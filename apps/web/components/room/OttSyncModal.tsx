'use client';

import React, { useState } from 'react';
import type { OttPlatform, OttSession } from '@watch-party/shared';

interface OttSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOtt: (session: OttSession) => void;
  onStartLegacyScreenShare?: () => void;
  currentSession?: OttSession | null;
}

const PLATFORMS: { id: OttPlatform; name: string; icon: string; placeholder: string; domainMatch: string[] }[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    placeholder: 'https://www.youtube.com/watch?v=... or youtu.be/...',
    domainMatch: ['youtube.com', 'youtu.be'],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: '🍿',
    placeholder: 'https://www.netflix.com/watch/80057281...',
    domainMatch: ['netflix.com'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    icon: '📦',
    placeholder: 'https://www.primevideo.com/detail/... or amazon.com/gp/video/...',
    domainMatch: ['primevideo.com', 'amazon.com/gp/video', 'amazon.com/video'],
  },
  {
    id: 'disney',
    name: 'Disney+ / Hotstar',
    icon: '✨',
    placeholder: 'https://www.disneyplus.com/... or hotstar.com/...',
    domainMatch: ['disneyplus.com', 'hotstar.com'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll / Anime',
    icon: '🎬',
    placeholder: 'https://www.crunchyroll.com/watch/...',
    domainMatch: ['crunchyroll.com'],
  },
  {
    id: 'custom',
    name: 'Direct Video URL',
    icon: '🌐',
    placeholder: 'https://example.com/movie.mp4 or .m3u8 stream',
    domainMatch: ['.mp4', '.m3u8', '.webm'],
  },
];

const PRESETS = [
  {
    name: 'YouTube: Sintel 4K Cinema Open Movie',
    platform: 'youtube' as OttPlatform,
    url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
  },
  {
    name: 'YouTube: Big Buck Bunny 60FPS',
    platform: 'youtube' as OttPlatform,
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  },
  {
    name: 'Netflix: Stranger Things S1:E1',
    platform: 'netflix' as OttPlatform,
    url: 'https://www.netflix.com/watch/80077368',
  },
  {
    name: 'Prime Video: The Boys S1:E1',
    platform: 'prime' as OttPlatform,
    url: 'https://www.primevideo.com/detail/0KRGHGZCHKS92073UMWN9NT3S5',
  },
];

export const OttSyncModal: React.FC<OttSyncModalProps> = ({
  isOpen,
  onClose,
  onSelectOtt,
  onStartLegacyScreenShare,
  currentSession,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<OttPlatform>(
    currentSession?.platform || 'youtube'
  );
  const [videoUrl, setVideoUrl] = useState(currentSession?.url || '');
  const [customTitle, setCustomTitle] = useState(currentSession?.title || '');

  if (!isOpen) return null;

  // Auto-detect platform when pasting URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setVideoUrl(val);

    const lower = val.toLowerCase();
    for (const p of PLATFORMS) {
      if (p.domainMatch.some((d) => lower.includes(d))) {
        setSelectedPlatform(p.id);
        break;
      }
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSelectedPlatform(preset.platform);
    setVideoUrl(preset.url);
    setCustomTitle(preset.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    let computedTitle = customTitle.trim();
    if (!computedTitle) {
      const activeP = PLATFORMS.find((p) => p.id === selectedPlatform);
      computedTitle = `${activeP?.name || 'OTT'} Movie`;
    }

    onSelectOtt({
      platform: selectedPlatform,
      title: computedTitle,
      url: videoUrl.trim(),
      currentTime: 0,
      isPlaying: true,
      lastUpdated: Date.now(),
    });
    onClose();
  };

  const activePlatformConfig = PLATFORMS.find((p) => p.id === selectedPlatform);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 350,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tactile-card animate-fade-in"
        style={{
          maxWidth: '580px',
          width: '100%',
          padding: '1.75rem',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-tactile)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '32px',
            height: '32px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>🍿</div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Sync OTT Watch Party
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Native synchronization • 0 screen-share lag • 4K HDR quality
            </p>
          </div>
        </div>

        {/* Informational Banner */}
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 0.9rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            color: '#93C5FD',
            lineHeight: 1.4,
          }}
        >
          <strong>⚡ How it works:</strong> Rather than streaming slow screen pixels over WebRTC, everyone loads the stream natively. Play, Pause, and Seeking stay in 100% real-time lockstep!
        </div>

        <form onSubmit={handleSubmit}>
          {/* Platform Selector Grid */}
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Choose Platform:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            {PLATFORMS.map((p) => {
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0.65rem 0.5rem',
                    background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-raised)',
                    border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500 }}>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Video URL Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              {activePlatformConfig?.name} Link / URL:
            </label>
            <input
              type="url"
              required
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder={activePlatformConfig?.placeholder || 'Paste video link...'}
              style={{
                width: '100%',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#FFFFFF',
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Movie Title (Optional) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Movie / Show Title (Optional):
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Stranger Things S1:E1 or Sintel"
              style={{
                width: '100%',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#FFFFFF',
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Quick Presets / Testing Links:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            {onStartLegacyScreenShare && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartLegacyScreenShare();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                🖥️ Screen Share Tab (Legacy)
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                className="tactile-btn tactile-btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tactile-btn tactile-btn-primary"
                style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem' }}
              >
                Launch Synced Party
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
