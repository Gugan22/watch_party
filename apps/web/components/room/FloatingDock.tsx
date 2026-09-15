'use client';

import React, { useState, useRef, useEffect } from 'react';

interface FloatingDockProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isPlaying: boolean;
  isFullscreen: boolean;
  isScreenSharing?: boolean;
  layoutMode?: 'theater' | 'spotlight' | 'grid' | 'sidebar';
  isOttActive?: boolean;
  isHost?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSendReaction: (emoji: string) => void;
  onTogglePlayPause: () => void;
  onToggleFullscreen: () => void;
  onToggleScreenShare?: () => void;
  onOpenOttModal?: () => void;
  onSyncAll?: () => void;
  onCycleLayoutMode?: () => void;
  onLeaveRoom: () => void;
}

// Microsoft Teams Core Reactions
const TEAMS_QUICK_REACTIONS = [
  { emoji: '👍', name: 'Like' },
  { emoji: '❤️', name: 'Love' },
  { emoji: '👏', name: 'Applause' },
  { emoji: '😂', name: 'Laugh' },
  { emoji: '😮', name: 'Surprised' },
  { emoji: '😢', name: 'Sad' },
  { emoji: '🎉', name: 'Party' },
  { emoji: '🔥', name: 'Fire' },
  { emoji: '🍿', name: 'Popcorn' },
  { emoji: '✋', name: 'Raise Hand' },
];

// Microsoft Teams Full Categorized Emojis
const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😃',
    emojis: [
      { emoji: '😀', name: 'Grinning' },
      { emoji: '😃', name: 'Happy' },
      { emoji: '😄', name: 'Smile' },
      { emoji: '😁', name: 'Beam' },
      { emoji: '😆', name: 'Grin' },
      { emoji: '😅', name: 'Sweat Smile' },
      { emoji: '🤣', name: 'ROFL' },
      { emoji: '😂', name: 'Joy' },
      { emoji: '🙂', name: 'Slight Smile' },
      { emoji: '😉', name: 'Wink' },
      { emoji: '😊', name: 'Blush' },
      { emoji: '😇', name: 'Angel' },
      { emoji: '🥰', name: 'In Love' },
      { emoji: '😍', name: 'Heart Eyes' },
      { emoji: '🤩', name: 'Star Struck' },
      { emoji: '😘', name: 'Kiss' },
      { emoji: '😋', name: 'Yum' },
      { emoji: '😜', name: 'Wink Tongue' },
      { emoji: '🤪', name: 'Zany' },
      { emoji: '😎', name: 'Cool Glasses' },
      { emoji: '🥳', name: 'Party Horn' },
      { emoji: '😏', name: 'Smirk' },
      { emoji: '😒', name: 'Unamused' },
      { emoji: '😞', name: 'Sad' },
      { emoji: '😔', name: 'Pensive' },
      { emoji: '🥺', name: 'Pleading' },
      { emoji: '😢', name: 'Cry Tear' },
      { emoji: '😭', name: 'Sob' },
      { emoji: '😤', name: 'Steam' },
      { emoji: '😠', name: 'Angry' },
      { emoji: '😡', name: 'Rage' },
      { emoji: '🤬', name: 'Swearing' },
      { emoji: '🤯', name: 'Mind Blown' },
      { emoji: '😳', name: 'Flushed' },
      { emoji: '😱', name: 'Scream' },
      { emoji: '😨', name: 'Fearful' },
      { emoji: '😰', name: 'Anxious' },
      { emoji: '🤗', name: 'Hug' },
      { emoji: '🤔', name: 'Thinking' },
      { emoji: '🤭', name: 'Giggle' },
      { emoji: '🤫', name: 'Shh' },
      { emoji: '😴', name: 'Sleeping' },
      { emoji: '🤤', name: 'Drool' },
      { emoji: '😷', name: 'Mask' },
      { emoji: '🤒', name: 'Sick' },
    ],
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: '👏',
    emojis: [
      { emoji: '👍', name: 'Thumbs Up' },
      { emoji: '👎', name: 'Thumbs Down' },
      { emoji: '👏', name: 'Clapping' },
      { emoji: '🙌', name: 'Raising Hands' },
      { emoji: '👐', name: 'Open Hands' },
      { emoji: '🤝', name: 'Handshake' },
      { emoji: '🙏', name: 'Pray Thank You' },
      { emoji: '💪', name: 'Flex Muscle' },
      { emoji: '👈', name: 'Point Left' },
      { emoji: '👉', name: 'Point Right' },
      { emoji: '👆', name: 'Point Up' },
      { emoji: '👇', name: 'Point Down' },
      { emoji: '✋', name: 'Raised Hand' },
      { emoji: '👋', name: 'Wave' },
      { emoji: '🤙', name: 'Call Me' },
      { emoji: '🤟', name: 'Love You' },
      { emoji: '🤘', name: 'Rock On' },
      { emoji: '✌️', name: 'Peace Victory' },
      { emoji: '🤞', name: 'Fingers Crossed' },
      { emoji: '🫰', name: 'Hand Heart' },
      { emoji: '👌', name: 'OK Hand' },
      { emoji: '🫡', name: 'Salute' },
      { emoji: '🙋‍♂️', name: 'Man Raising Hand' },
      { emoji: '🙋‍♀️', name: 'Woman Raising Hand' },
      { emoji: '🤦‍♂️', name: 'Facepalm' },
      { emoji: '🤷‍♂️', name: 'Shrug' },
      { emoji: '🕺', name: 'Dancing Man' },
      { emoji: '💃', name: 'Dancing Woman' },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Vibes',
    icon: '❤️',
    emojis: [
      { emoji: '❤️', name: 'Red Heart' },
      { emoji: '🧡', name: 'Orange Heart' },
      { emoji: '💛', name: 'Yellow Heart' },
      { emoji: '💚', name: 'Green Heart' },
      { emoji: '💙', name: 'Blue Heart' },
      { emoji: '💜', name: 'Purple Heart' },
      { emoji: '🖤', name: 'Black Heart' },
      { emoji: '🤍', name: 'White Heart' },
      { emoji: '🤎', name: 'Brown Heart' },
      { emoji: '💔', name: 'Broken Heart' },
      { emoji: '❣️', name: 'Heart Exclamation' },
      { emoji: '💕', name: 'Two Hearts' },
      { emoji: '💞', name: 'Revolving Hearts' },
      { emoji: '💓', name: 'Beating Heart' },
      { emoji: '💖', name: 'Sparkling Heart' },
      { emoji: '💘', name: 'Heart Arrow' },
      { emoji: '💝', name: 'Heart Ribbon' },
      { emoji: '✨', name: 'Sparkles' },
      { emoji: '⭐', name: 'Star' },
      { emoji: '🌟', name: 'Glowing Star' },
      { emoji: '🔥', name: 'Fire Lit' },
      { emoji: '💯', name: 'Hundred' },
      { emoji: '💥', name: 'Boom Explosion' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Cinema & Party',
    icon: '🍿',
    emojis: [
      { emoji: '🍿', name: 'Popcorn' },
      { emoji: '🎬', name: 'Movie Clapper' },
      { emoji: '🎥', name: 'Cinema Camera' },
      { emoji: '🎞️', name: 'Film Strip' },
      { emoji: '📽️', name: 'Projector' },
      { emoji: '📺', name: 'Television' },
      { emoji: '🎉', name: 'Party Popper' },
      { emoji: '🎊', name: 'Confetti' },
      { emoji: '🎈', name: 'Balloon' },
      { emoji: '🥂', name: 'Cheers Toast' },
      { emoji: '🍻', name: 'Cheers Beer' },
      { emoji: '🥤', name: 'Soda Drink' },
      { emoji: '🍕', name: 'Pizza' },
      { emoji: '🍔', name: 'Burger' },
      { emoji: '🍟', name: 'Fries' },
      { emoji: '🍩', name: 'Donut' },
      { emoji: '🍪', name: 'Cookie' },
      { emoji: '🍫', name: 'Chocolate' },
      { emoji: '🎂', name: 'Cake' },
      { emoji: '🏆', name: 'Trophy' },
      { emoji: '👑', name: 'Crown' },
      { emoji: '💎', name: 'Diamond Gem' },
      { emoji: '🚀', name: 'Rocket' },
      { emoji: '🎮', name: 'Game Controller' },
    ],
  },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  isMicOn,
  isCamOn,
  isPlaying,
  isFullscreen,
  isScreenSharing = false,
  layoutMode = 'spotlight',
  isHost = false,
  onToggleMic,
  onToggleCam,
  onSendReaction,
  onTogglePlayPause,
  onToggleFullscreen,
  onToggleScreenShare,
  onSyncAll,
  onCycleLayoutMode,
  onLeaveRoom,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
      {/* Teams-Style Expanded Full Emoji Picker Popover */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="animate-fade-in"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '360px',
            maxHeight: '380px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
            padding: '12px',
            zIndex: 150,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Header with Search & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-full)',
                padding: '4px 10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all emojis..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowPicker(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-full)',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Category Tabs (When not searching) */}
          {!searchQuery && (
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    flex: 1,
                    background: activeCategory === cat.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: activeCategory === cat.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Emojis Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '4px 2px',
            }}
          >
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji + item.name}
                type="button"
                onClick={() => {
                  onSendReaction(item.emoji);
                  setShowPicker(false);
                }}
                title={item.name}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s, background 0.1s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="floating-dock">
        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          className={`dock-btn ${!isMicOn ? 'off' : ''}`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? '🎤' : '🔇'}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleCam}
          className={`dock-btn ${!isCamOn ? 'off' : ''}`}
          title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCamOn ? '📷' : '🚫'}
        </button>

        {/* Microsoft Teams-Style Quick Reactions Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '0 4px',
            borderLeft: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {TEAMS_QUICK_REACTIONS.map((item) => (
            <button
              key={item.emoji}
              onClick={() => onSendReaction(item.emoji)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                transition: 'transform 0.1s',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              title={item.name}
            >
              {item.emoji}
            </button>
          ))}

          {/* Teams More Reactions Picker Button (➕ / 😊) */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            style={{
              background: showPicker ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-full)',
              color: '#38BDF8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '2px 7px',
              marginLeft: '2px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s',
            }}
            title="More Teams Emojis & Reactions"
          >
            <span>😊</span>
            <span style={{ fontSize: '0.7rem' }}>+</span>
          </button>
        </div>

        {/* Play/Pause Sync Button */}
        <button
          onClick={onTogglePlayPause}
          className="dock-btn"
          title="Toggle Play / Pause Sync"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Host Playback Sync Button (Host Only) */}
        {isHost && onSyncAll && (
          <button
            onClick={onSyncAll}
            className="dock-btn active"
            title="Sync: Play for all attendees across the room"
            style={{ borderColor: 'var(--accent-blue)', color: '#38BDF8', fontWeight: 700 }}
          >
            ⚡
          </button>
        )}

        {/* Stream Screen / Tab Button */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            className={`dock-btn ${isScreenSharing ? 'active' : ''}`}
            title={isScreenSharing ? 'Stop Screen Stream' : 'Stream Screen / Tab with Audio'}
          >
            🖥️
          </button>
        )}

        {/* Fullscreen Theater Button */}
        <button
          onClick={onToggleFullscreen}
          className="dock-btn"
          title="Fullscreen Theater Mode (F)"
        >
          {isFullscreen ? '⤦' : '⛶'}
        </button>

        {/* Mode Switcher Button */}
        {onCycleLayoutMode && (
          <button
            onClick={onCycleLayoutMode}
            className={`dock-btn ${layoutMode === 'theater' ? 'active' : ''}`}
            title={`Current View: ${layoutMode || 'spotlight'}. Click to switch view mode.`}
          >
            {layoutMode === 'theater' ? '🎬' : layoutMode === 'spotlight' ? '🎯' : layoutMode === 'grid' ? '⊞' : '◫'}
          </button>
        )}

        {/* Modern Microsoft Teams Red Leave Button */}
        <button
          onClick={onLeaveRoom}
          className="tactile-btn"
          title="Leave Watch Party"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(220, 38, 38, 0.45)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.6)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(220, 38, 38, 0.45)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};
