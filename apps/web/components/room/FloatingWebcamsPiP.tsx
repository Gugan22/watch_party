'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Participant } from './VideoTile';

interface FloatingWebcamsPiPProps {
  isActive: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  participants: Participant[];
  isMicOn: boolean;
  isCamOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSendReaction: (emoji: string) => void;
  displayName: string;
}

// Quick reaction emojis for the floating PiP window
const PIP_REACTIONS = ['👍', '❤️', '😂', '🍿', '👏', '🔥'];

export const FloatingWebcamsPiP: React.FC<FloatingWebcamsPiPProps> = ({
  isActive,
  onClose,
  localStream,
  participants,
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
  onSendReaction,
  displayName,
}) => {
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const pipWindowRef = useRef<any>(null);

  // Open Document Picture-in-Picture window when isActive is true
  useEffect(() => {
    let isCancelled = false;

    const requestPip = async () => {
      if (!isActive) {
        if (pipWindowRef.current) {
          try {
            pipWindowRef.current.close();
          } catch {}
          pipWindowRef.current = null;
        }
        setPipContainer(null);
        return;
      }

      if (typeof window === 'undefined') return;

      // Check for Document Picture-in-Picture API support (Chrome/Edge 111+)
      if ('documentPictureInPicture' in window) {
        try {
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: 360,
            height: 290,
          });

          if (isCancelled) {
            pipWindow.close();
            return;
          }

          pipWindowRef.current = pipWindow;

          // Copy all active stylesheets into the PiP window
          [...document.styleSheets].forEach((sheet) => {
            try {
              const rules = [...sheet.cssRules].map((r) => r.cssText).join('');
              const style = document.createElement('style');
              style.textContent = rules;
              pipWindow.document.head.appendChild(style);
            } catch {
              if (sheet.href) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                pipWindow.document.head.appendChild(link);
              }
            }
          });

          // Inject base font and background styles
          pipWindow.document.body.style.margin = '0';
          pipWindow.document.body.style.padding = '0';
          pipWindow.document.body.style.background = '#0B0D11';
          pipWindow.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          pipWindow.document.body.style.overflow = 'hidden';
          pipWindow.document.body.style.userSelect = 'none';

          pipWindow.addEventListener('pagehide', () => {
            setPipContainer(null);
            pipWindowRef.current = null;
            onClose();
          });

          setPipContainer(pipWindow.document.body);
        } catch (err) {
          console.warn('Document PiP request error:', err);
          onClose();
        }
      } else {
        alert(
          '📌 Always-On-Top Floating Window requires Microsoft Edge or Google Chrome.\n\n' +
          'Please open WatchParty in Edge or Chrome to pop out your friends\' webcams!'
        );
        onClose();
      }
    };

    requestPip();

    return () => {
      isCancelled = true;
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch {}
        pipWindowRef.current = null;
      }
    };
  }, [isActive, onClose]);

  if (!pipContainer) return null;

  const allAttendees = [
    {
      id: 'self',
      name: `${displayName || 'You'} (You)`,
      stream: localStream,
      isCamOn,
      isMicOn,
      isSelf: true,
    },
    ...participants.map((p) => ({
      id: p.id,
      name: p.name,
      stream: p.stream,
      isCamOn: p.isCamOn,
      isMicOn: p.isMicOn,
      isSelf: false,
    })),
  ];

  return createPortal(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        background: '#0B0D11',
        color: '#FFFFFF',
        padding: '8px',
        gap: '6px',
      }}
    >
      {/* PiP Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
          <span>🍿</span>
          <span style={{ color: '#38BDF8' }}>WatchParty Live Webcams</span>
          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>({allAttendees.length})</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (pipWindowRef.current) {
              pipWindowRef.current.close();
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          title="Close Floating Webcams"
        >
          ✕
        </button>
      </div>

      {/* Webcams Responsive Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: allAttendees.length <= 1 ? '1fr' : allAttendees.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '6px',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {allAttendees.map((user) => (
          <div
            key={user.id}
            style={{
              position: 'relative',
              background: '#1E293B',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '16/9',
            }}
          >
            {user.stream && user.isCamOn ? (
              <video
                autoPlay
                playsInline
                muted={user.isSelf}
                ref={(el) => {
                  if (el && user.stream && el.srcObject !== user.stream) {
                    el.srcObject = user.stream;
                    el.play().catch(() => {});
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: user.isSelf ? 'scaleX(-1)' : 'none',
                }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name Badge & Mic Status */}
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }}>
                {user.name}
              </span>
              <span>{user.isMicOn ? '🎤' : '🔇'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bottom Controls: Reactions & Mic */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
        }}
      >
        {/* Quick Reactions */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {PIP_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction(emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '2px 3px',
                borderRadius: '4px',
              }}
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Mic & Cam Quick Toggles */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={onToggleMic}
            style={{
              background: isMicOn ? 'rgba(56, 189, 248, 0.15)' : '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
          >
            {isMicOn ? '🎤' : '🔇'}
          </button>

          <button
            type="button"
            onClick={onToggleCam}
            style={{
              background: isCamOn ? 'rgba(56, 189, 248, 0.15)' : '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            title={isCamOn ? 'Turn Off Cam' : 'Turn On Cam'}
          >
            {isCamOn ? '📷' : '🚫'}
          </button>
        </div>
      </div>
    </div>,
    pipContainer
  );
};