'use client';

import React, { useEffect } from 'react';

export interface ReceivedPing {
  id: string;
  fromId: string;
  fromName: string;
  message: string;
  timestamp: number;
}

interface PrivatePingToastProps {
  ping: ReceivedPing | null;
  onPingBack: (targetId: string, targetName: string) => void;
  onDismiss: () => void;
}

export const PrivatePingToast: React.FC<PrivatePingToastProps> = ({
  ping,
  onPingBack,
  onDismiss,
}) => {
  useEffect(() => {
    if (!ping) return;

    // Play subtle pleasant chime via Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}

    // Auto dismiss after 7 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);

    return () => clearTimeout(timer);
  }, [ping, onDismiss]);

  if (!ping) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 10000,
        maxWidth: '380px',
        width: 'calc(100% - 3rem)',
        background: 'rgba(23, 23, 33, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.5)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(139, 92, 246, 0.3)',
        padding: '1rem 1.15rem',
        color: '#FFFFFF',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
            }}
          >
            🔔
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#A78BFA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Private Whisper
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              {ping.fromName}
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '2px',
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      <div
        style={{
          margin: '0.75rem 0',
          padding: '0.6rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(139, 92, 246, 0.12)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          fontSize: '0.85rem',
          color: '#E2E8F0',
          wordBreak: 'break-word',
        }}
      >
        "{ping.message}"
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={() => {
            onPingBack(ping.fromId, ping.fromName);
            onDismiss();
          }}
          className="tactile-btn tactile-btn-primary"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            borderColor: '#7C3AED',
          }}
        >
          👋 Ping Back
        </button>
      </div>
    </div>
  );
};
