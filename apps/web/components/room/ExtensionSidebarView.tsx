'use client';

import React, { useState } from 'react';
import type { Participant } from './VideoTile';
import type { ChatMessage } from '@watch-party/shared';

interface ExtensionSidebarViewProps {
  roomId: string;
  displayName: string;
  localStream: MediaStream | null;
  participants: Participant[];
  selfParticipant: Participant;
  isMicOn: boolean;
  isCamOn: boolean;
  isPlaying: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onTogglePlayPause: () => void;
  onSendReaction: (emoji: string) => void;
  activeReactions: { id: string; emoji: string; name: string }[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement>;
  isHost: boolean;
  onLeaveRoom: () => void;
}

const SIDEBAR_REACTIONS = ['👍', '❤️', '😂', '🍿', '👏', '🔥'];

export const ExtensionSidebarView: React.FC<ExtensionSidebarViewProps> = ({
  roomId,
  displayName,
  localStream,
  participants,
  selfParticipant,
  isMicOn,
  isCamOn,
  isPlaying,
  onToggleMic,
  onToggleCam,
  onTogglePlayPause,
  onSendReaction,
  activeReactions,
  messages,
  onSendMessage,
  chatInput,
  onChatInputChange,
  chatBottomRef,
  isHost,
  onLeaveRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'calls' | 'chat'>('calls');

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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      onChatInputChange('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        background: '#0B0D11',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 1. Header Bar */}
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🍿</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38BDF8' }}>WatchParty</span>
            <span
              style={{
                fontSize: '0.65rem',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              #{roomId}
            </span>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Leave Party"
          >
            Leave
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
          <span style={{ color: '#34D399', fontWeight: 600 }}>🟢 Synced with Movie</span>
          <span style={{ color: '#94A3B8' }}>{allAttendees.length} Connected</span>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '2px',
            marginTop: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            style={{
              flex: 1,
              background: activeTab === 'calls' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'calls' ? '#38BDF8' : '#94A3B8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>👥 Calls</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>({allAttendees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              background: activeTab === 'chat' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'chat' ? '#38BDF8' : '#94A3B8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>💬 Chat</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>({messages.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'calls' ? (
          /* Calls View: Responsive Webcams */
          <div
            style={{
              flex: 1,
              padding: '10px',
              display: 'grid',
              gridTemplateColumns: allAttendees.length >= 3 ? '1fr 1fr' : '1fr',
              gap: '8px',
              alignContent: 'start',
              overflowY: 'auto',
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
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
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
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name & Mic Badge */}
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
        ) : (
          /* Chat View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.72rem' }}>{m.senderName}</span>
                    <span style={{ color: '#64748B', fontSize: '0.65rem' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: '#E2E8F0', wordBreak: 'break-word', lineHeight: 1.3 }}>{m.text}</div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  background: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 3. Floating Reactions Overlay */}
      {activeReactions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {activeReactions.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{r.emoji}</span>
              <span style={{ fontWeight: 600 }}>{r.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Bottom Controls: Quick Reactions & Hardware Toggles */}
      <div
        style={{
          padding: '8px 10px',
          background: 'rgba(15, 23, 42, 0.98)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Quick Reactions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2px' }}>
          {SIDEBAR_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction(emoji)}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 0',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'transform 0.1s, background 0.1s',
              }}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Master Play/Pause & Hardware Toggles */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={onToggleMic}
            style={{
              flex: 1,
              background: isMicOn ? 'rgba(56, 189, 248, 0.15)' : '#DC2626',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>{isMicOn ? '🎤' : '🔇'}</span>
            <span>{isMicOn ? 'Mute' : 'Unmuted'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleCam}
            style={{
              flex: 1,
              background: isCamOn ? 'rgba(56, 189, 248, 0.15)' : '#DC2626',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>{isCamOn ? '📷' : '🚫'}</span>
            <span>{isCamOn ? 'Cam Off' : 'Cam On'}</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            style={{
              flex: 1.2,
              background: isPlaying ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
            title="Sync Play / Pause with Streaming Video"
          >
            <span>{isPlaying ? '⏸️ Pause' : '▶️ Play'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
