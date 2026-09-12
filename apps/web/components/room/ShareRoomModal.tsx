'use client';

import React, { useState, useEffect } from 'react';

interface ShareRoomModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  roomId,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Compute shareable URL
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setShareUrl(`${origin}/room/${encodeURIComponent(roomId)}`);
      setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, [roomId]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.getElementById('share-link-input') as HTMLInputElement | null;
        if (input) {
          input.select();
          document.execCommand('copy');
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator?.share && shareUrl) {
      try {
        await navigator.share({
          title: 'Join my Watch Party',
          text: `Join my private watch party room: ${roomId}`,
          url: shareUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Share dismissed or failed:', err);
        }
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 250,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tactile-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-tactile)',
          padding: '1.75rem',
          position: 'relative',
        }}
      >
        {/* Close Button */}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          title="Close modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            {/* Film Aperture Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="3.5" width="19" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4.5" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="11" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="16.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="11" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="16.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
              <line x1="15.5" y1="3.5" x2="15.5" y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
              <path d="M10.8 8.8L14.2 12L10.8 15.2V8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text-primary)' }}>
              Share Watch Party
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Invite up to 10 friends to watch together in real-time
            </p>
          </div>
        </div>

        {/* Link Field & Copy Button */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="share-link-input"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.4rem',
            }}
          >
            Party Invite Link
          </label>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.5rem',
              alignItems: 'center',
            }}
          >
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                padding: '0 0.5rem',
                minWidth: 0,
              }}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="tactile-btn tactile-btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                background: copied ? 'var(--success-green)' : 'var(--accent-blue)',
                transition: 'background-color 0.2s ease',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>

        {/* Quick Social Share Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: canNativeShare ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.6rem 0.8rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              📲 Native Share
            </button>
          )}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my watch party: ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tactile-btn tactile-btn-secondary"
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
          >
            💬 WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Join my watch party!')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tactile-btn tactile-btn-secondary"
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
          >
            ✈️ Telegram
          </a>
        </div>

        {/* Guidance Badge */}
        <div
          style={{
            padding: '0.75rem 0.9rem',
            background: 'var(--bg-raised)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
            <span>🔒</span>
            <span>Private Link Access</span>
          </div>
          <p style={{ lineHeight: 1.4, margin: 0 }}>
            Only friends with this link can enter. On desktop, they join immediately in their browser without signing in. On mobile, they can install the companion app.
          </p>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn tactile-btn-primary"
            style={{ padding: '0.65rem 1.4rem' }}
          >
            Start Watching
          </button>
        </div>
      </div>
    </div>
  );
};
