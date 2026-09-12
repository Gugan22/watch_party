'use client';

import React from 'react';
import type { ChatMessage } from '@watch-party/shared';
import type { Participant } from './VideoTile';

interface ChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessage[];
  chatInput: string;
  onInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onClose: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement>;
  participants?: Participant[];
  selectedRecipientId?: string | null;
  onSelectRecipient?: (id: string | null) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  messages,
  chatInput,
  onInputChange,
  onSendMessage,
  onClose,
  chatBottomRef,
  participants = [],
  selectedRecipientId = null,
  onSelectRecipient,
}) => {
  const selectedParticipant = participants.find((p) => p.id === selectedRecipientId);

  return (
    <div className={`chat-drawer ${!isOpen ? 'closed' : ''}`}>
      {/* Header */}
      <div
        style={{
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>💬</span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Party Chat</h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
          }}
          title="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Message feed */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {messages.map((m) => {
          const isPrivate = Boolean(m.isPrivate);

          return (
            <div
              key={m.id}
              style={{
                background: isPrivate
                  ? 'rgba(139, 92, 246, 0.14)'
                  : m.senderId === 'system'
                  ? 'var(--bg-raised)'
                  : 'var(--accent-blue-surface)',
                border: isPrivate
                  ? '1px solid rgba(139, 92, 246, 0.35)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 0.75rem',
                fontSize: '0.82rem',
                boxShadow: isPrivate ? '0 2px 8px rgba(139, 92, 246, 0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isPrivate && <span style={{ fontSize: '0.75rem' }}>🔒</span>}
                  <span
                    style={{
                      fontWeight: 700,
                      color: isPrivate ? '#C4B5FD' : 'var(--text-primary)',
                    }}
                  >
                    {m.senderName}
                  </span>
                  {isPrivate && m.targetName && (
                    <span style={{ fontSize: '0.72rem', color: '#A78BFA' }}>
                      ➔ {m.targetName}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ color: isPrivate ? '#F1F5F9' : 'var(--text-secondary)', wordBreak: 'break-word', margin: 0 }}>
                {m.text}
              </p>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Recipient Selector (Everyone or Private Whisper) */}
      {onSelectRecipient && participants.length > 0 && (
        <div
          style={{
            padding: '0.4rem 0.75rem',
            background: 'var(--bg-raised)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Send to:</span>
          <select
            value={selectedRecipientId || ''}
            onChange={(e) => onSelectRecipient(e.target.value || null)}
            style={{
              background: selectedRecipientId ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-surface)',
              color: selectedRecipientId ? '#C4B5FD' : 'var(--text-primary)',
              border: `1px solid ${selectedRecipientId ? '#8B5CF6' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '180px',
            }}
          >
            <option value="">👥 Everyone (Public)</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                🔒 {p.name} (Private Whisper)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chat input form */}
      <form
        onSubmit={onSendMessage}
        style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          className="tactile-input"
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            selectedParticipant
              ? `Whisper privately to ${selectedParticipant.name}...`
              : 'Type a message...'
          }
          style={{
            fontSize: '0.85rem',
            padding: '0.5rem 0.75rem',
            borderColor: selectedParticipant ? '#8B5CF6' : undefined,
          }}
        />
        <button
          type="submit"
          className="tactile-btn tactile-btn-primary"
          style={{
            padding: '0.5rem 0.85rem',
            background: selectedParticipant
              ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
              : undefined,
            borderColor: selectedParticipant ? '#7C3AED' : undefined,
          }}
        >
          {selectedParticipant ? 'Whisper 🔒' : 'Send'}
        </button>
      </form>
    </div>
  );
};
