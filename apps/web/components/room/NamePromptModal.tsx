'use client';

import React, { useState, useEffect } from 'react';

interface NamePromptModalProps {
  isOpen: boolean;
  roomId: string;
  onJoin: (name: string) => void;
  isCamOn: boolean;
  isMicOn: boolean;
  onToggleCam: () => void;
  onToggleMic: () => void;
  localStream: MediaStream | null;
}

export const NamePromptModal: React.FC<NamePromptModalProps> = ({
  isOpen,
  roomId,
  onJoin,
  isCamOn,
  isMicOn,
  onToggleCam,
  onToggleMic,
  localStream,
}) => {
  const [name, setName] = useState('');
  const [cachedName, setCachedName] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load previously saved name from localStorage wisely on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wp_user_display_name') || sessionStorage.getItem(`wp_name_${roomId}`);
      if (saved && saved.trim()) {
        const clean = saved.trim();
        setName(clean);
        setCachedName(clean);
      }
    }
  }, [roomId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || clean.length < 2) {
      setError('Please enter your name (at least 2 characters) to join.');
      return;
    }
    if (clean.length > 30) {
      setError('Name cannot exceed 30 characters.');
      return;
    }

    // Save to storage wisely for seamless future sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('wp_user_display_name', clean);
      sessionStorage.setItem(`wp_name_${roomId}`, clean);
    }

    setError('');
    onJoin(clean);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#0F1218',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: '1.5rem 1.5rem 1rem',
            background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.12) 0%, transparent 100%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.5)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="3.5" width="19" height="17" rx="3" stroke="#FFFFFF" strokeWidth="1.8" />
              <rect x="4.5" y="5.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <rect x="4.5" y="11" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <rect x="4.5" y="16.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <rect x="17.5" y="5.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <rect x="17.5" y="11" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <rect x="17.5" y="16.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
              <path d="M10.8 8.8L14.2 12L10.8 15.2V8.8Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.6" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Join Watch Party
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>
            Room: <span style={{ color: '#60A5FA', fontWeight: 600 }}>{roomId}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* AV Pre-Check Toggles */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.75rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={onToggleMic}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isMicOn ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                background: isMicOn ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isMicOn ? '#60A5FA' : '#F87171',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>{isMicOn ? '🎤' : '🔇'}</span>
              <span>{isMicOn ? 'Mic On' : 'Mic Off'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleCam}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isCamOn ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                background: isCamOn ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isCamOn ? '#60A5FA' : '#F87171',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>{isCamOn ? '📷' : '🚫'}</span>
              <span>{isCamOn ? 'Cam On' : 'Cam Off'}</span>
            </button>
          </div>

          {/* Mandatory Name Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="wp-guest-name-input"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#E2E8F0',
                marginBottom: '0.4rem',
              }}
            >
              Your Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="wp-guest-name-input"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Alex, Sam, Maya"
              maxLength={30}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: error ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
            />

            {/* Storage cache hint */}
            {cachedName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '0.4rem',
                  fontSize: '0.72rem',
                  color: '#94A3B8',
                }}
              >
                <span>💾</span>
                <span>Restored from saved browser profile</span>
              </div>
            )}

            {error && (
              <p style={{ color: '#F87171', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={!name.trim() || name.trim().length < 2}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: name.trim().length >= 2 ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' : 'rgba(255, 255, 255, 0.1)',
              color: name.trim().length >= 2 ? '#FFFFFF' : '#64748B',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
              boxShadow: name.trim().length >= 2 ? '0 10px 20px -5px rgba(59, 130, 246, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Enter Party 🍿
          </button>
        </form>
      </div>
    </div>
  );
};
