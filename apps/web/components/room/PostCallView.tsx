'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface PostCallViewProps {
  onRejoin: () => void;
}

export const PostCallView: React.FC<PostCallViewProps> = ({ onRejoin }) => {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-canvas)',
        padding: '1.5rem',
      }}
    >
      <div
        className="tactile-card"
        style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          padding: '2.25rem',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🍿</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          You Left the Party
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          The in-memory WebRTC call and ephemeral chat channel have been cleaned up with zero disk persistence.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={onRejoin}
            className="tactile-btn tactile-btn-primary"
            style={{ padding: '0.8rem' }}
          >
            🔄 Rejoin Party
          </button>
          <button
            onClick={() => router.push('/')}
            className="tactile-btn tactile-btn-secondary"
            style={{ padding: '0.8rem' }}
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
