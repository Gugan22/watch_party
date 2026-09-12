'use client';

import React from 'react';
import type { ChatMessage } from '@watch-party/shared';

interface ChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessage[];
  chatInput: string;
  onInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onClose: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement>;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  messages,
  chatInput,
  onInputChange,
  onSendMessage,
  onClose,
  chatBottomRef,
}) => {
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
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              background: m.senderId === 'system' ? 'var(--bg-raised)' : 'var(--accent-blue-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.75rem',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.senderName}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{m.text}</p>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

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
          placeholder="Type a message..."
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
        />
        <button
          type="submit"
          className="tactile-btn tactile-btn-primary"
          style={{ padding: '0.5rem 0.85rem' }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
