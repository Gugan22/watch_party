'use client';

import React, { useState } from 'react';
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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const selectedParticipant = participants.find((p) => p.id === selectedRecipientId);

  return (
    <div className={`chat-drawer ${!isOpen ? 'closed' : ''}`}>
      {/* Zoom / Teams Style Header */}
      <div
        style={{
          padding: '0.85rem 1.2rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              color: 'var(--accent-blue)',
            }}
          >
            💬
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Meeting Chat
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {participants.length + 1} participant{participants.length > 0 ? 's' : ''} online
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Message Feed */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              textAlign: 'center',
              gap: '6px',
              padding: '2rem 1rem',
            }}
          >
            <span style={{ fontSize: '2rem', opacity: 0.7 }}>💭</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No messages yet
            </span>
            <span style={{ fontSize: '0.75rem' }}>
              Say hello or whisper a private note to a friend!
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isPrivate = Boolean(m.isPrivate);
            const isSystem = m.senderId === 'system';

            if (isSystem) {
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: 'center',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 10px',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    margin: '4px 0',
                  }}
                >
                  {m.text}
                </div>
              );
            }

            return (
              <div
                key={m.id}
                onMouseEnter={() => setHoveredMessageId(m.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{
                  background: isPrivate
                    ? 'rgba(139, 92, 246, 0.08)'
                    : 'var(--bg-surface)',
                  border: isPrivate
                    ? '1px solid rgba(168, 85, 247, 0.35)'
                    : '1px solid var(--border-subtle)',
                  borderLeft: isPrivate ? '3px solid #A855F7' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.82rem',
                  position: 'relative',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Header: Avatar, Name, Direct Message indicator, Time */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: isPrivate
                          ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                          : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        color: '#FFF',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {(m.senderName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        color: isPrivate ? '#D8B4FE' : 'var(--text-primary)',
                      }}
                    >
                      {m.senderName}
                    </span>

                    {/* Direct Message (Privately) Tag like Zoom / Teams */}
                    {isPrivate && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#C084FC',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        🔒 {m.targetName ? `to ${m.targetName} (Direct)` : '(Direct Message)'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Quick 1-Click Reply Privately on hover */}
                    {onSelectRecipient && m.senderId && m.senderId !== 'self' && m.senderId !== 'system' && (
                      <button
                        type="button"
                        onClick={() => onSelectRecipient(m.senderId)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#A855F7',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: hoveredMessageId === m.id ? 1 : 0,
                          transition: 'opacity 0.15s ease',
                          padding: '0 2px',
                        }}
                        title={`Reply privately to ${m.senderName}`}
                      >
                        ↩ Reply
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <p
                  style={{
                    color: isPrivate ? '#F8FAFC' : 'var(--text-secondary)',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontSize: '0.8rem',
                    lineHeight: 1.35,
                  }}
                >
                  {m.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Zoom / Teams Style Inline Recipient Selector */}
      {onSelectRecipient && (
        <div
          style={{
            padding: '0.45rem 0.85rem',
            background: selectedParticipant
              ? 'rgba(168, 85, 247, 0.08)'
              : 'var(--bg-raised)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>
              To:
            </span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={selectedRecipientId || ''}
                onChange={(e) => onSelectRecipient(e.target.value || null)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: selectedParticipant ? 'rgba(139, 92, 246, 0.25)' : 'var(--bg-surface)',
                  color: selectedParticipant ? '#E9D5FF' : 'var(--text-primary)',
                  border: `1px solid ${selectedParticipant ? '#A855F7' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 22px 2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '200px',
                }}
              >
                <option value="">👥 Everyone (In Meeting)</option>
                {participants.length > 0 && (
                  <optgroup label="Direct Message (Privately):">
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        🔒 {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: '7px',
                  pointerEvents: 'none',
                  fontSize: '0.55rem',
                  color: selectedParticipant ? '#C084FC' : 'var(--text-muted)',
                }}
              >
                ▾
              </span>
            </div>
          </div>

          {selectedParticipant && (
            <button
              type="button"
              onClick={() => onSelectRecipient(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
              title="Switch back to Everyone (Public)"
            >
              Reset to Everyone ✕
            </button>
          )}
        </div>
      )}

      {/* Direct Message Privacy Hint */}
      {selectedParticipant && (
        <div
          style={{
            padding: '2px 0.85rem',
            background: 'rgba(168, 85, 247, 0.12)',
            borderTop: '1px solid rgba(168, 85, 247, 0.2)',
            fontSize: '0.65rem',
            color: '#D8B4FE',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>🔒</span>
          <span>Only you and <strong>{selectedParticipant.name}</strong> can see this message</span>
        </div>
      )}

      {/* Chat Input Form */}
      <form
        onSubmit={onSendMessage}
        style={{
          padding: '0.65rem 0.85rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-surface)',
        }}
      >
        <input
          type="text"
          className="tactile-input"
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={
            selectedParticipant
              ? `Direct message to ${selectedParticipant.name}...`
              : 'Type a message to everyone...'
          }
          style={{
            fontSize: '0.82rem',
            padding: '0.5rem 0.75rem',
            borderColor: selectedParticipant ? '#A855F7' : undefined,
            background: selectedParticipant ? 'rgba(168, 85, 247, 0.05)' : undefined,
          }}
        />
        <button
          type="submit"
          className="tactile-btn tactile-btn-primary"
          style={{
            padding: '0.5rem 0.85rem',
            background: selectedParticipant
              ? 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)'
              : undefined,
            borderColor: selectedParticipant ? '#A855F7' : undefined,
            boxShadow: selectedParticipant ? '0 2px 8px rgba(147, 51, 234, 0.35)' : undefined,
          }}
        >
          {selectedParticipant ? 'Direct 🔒' : 'Send'}
        </button>
      </form>
    </div>
  );
};
