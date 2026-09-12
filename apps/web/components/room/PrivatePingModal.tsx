'use client';

import React, { useState } from 'react';

interface PrivatePingModalProps {
  isOpen: boolean;
  targetId: string;
  targetName: string;
  onSendPing: (targetId: string, message: string) => void;
  onClose: () => void;
}

const PRESET_PINGS = [
  '👋 Hey, are you there?',
  '🍿 Movie starting now!',
  '🔊 Check your mic/audio!',
  '👀 Look at this scene!',
  '☕ Be right back!',
];

export const PrivatePingModal: React.FC<PrivatePingModalProps> = ({
  isOpen,
  targetId,
  targetName,
  onSendPing,
  onClose,
}) => {
  const [customText, setCustomText] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent, directMessage?: string) => {
    if (e) e.preventDefault();
    const msg = directMessage || customText.trim() || '👋 Hey!';
    onSendPing(targetId, msg);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setCustomText('');
      onClose();
    }, 900);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="tactile-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '1.75rem',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
              }}
            >
              🔔
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Private Ping
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Only <strong style={{ color: 'var(--text-primary)' }}>{targetName}</strong> will receive this
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {sentSuccess ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--success-green)',
              fontWeight: 700,
              fontSize: '1.05rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
            Private ping sent to {targetName}!
          </div>
        ) : (
          <div>
            {/* Quick Presets */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Quick Pings
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {PRESET_PINGS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSubmit(undefined, preset)}
                    className="tactile-btn tactile-btn-secondary"
                    style={{
                      justifyContent: 'flex-start',
                      fontSize: '0.82rem',
                      padding: '0.55rem 0.85rem',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message Form */}
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Or type a custom whisper
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="tactile-input"
                  placeholder="e.g. Can you hear me?"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={100}
                  style={{ fontSize: '0.85rem', padding: '0.55rem 0.75rem', flex: 1 }}
                />
                <button
                  type="submit"
                  className="tactile-btn tactile-btn-primary"
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.85rem',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                    borderColor: '#7C3AED',
                  }}
                >
                  Ping 🔔
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
