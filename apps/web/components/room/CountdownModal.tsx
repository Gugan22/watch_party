'use client';

import React from 'react';

interface CountdownModalProps {
  countdownNum: number | null;
}

export const CountdownModal: React.FC<CountdownModalProps> = ({ countdownNum }) => {
  if (countdownNum === null) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          fontSize: '7rem',
          fontWeight: 900,
          color: 'var(--accent-blue)',
          lineHeight: 1,
          animation: 'pulseGlow 1s infinite ease-in-out',
        }}
      >
        {countdownNum}
      </div>
      <p
        style={{
          color: '#FFFFFF',
          fontSize: '1.25rem',
          fontWeight: 600,
          marginTop: '1rem',
          letterSpacing: '-0.01em',
        }}
      >
        Syncing Playback Across All Devices...
      </p>
    </div>
  );
};
