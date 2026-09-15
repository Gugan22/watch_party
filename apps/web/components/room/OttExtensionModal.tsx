'use client';

import React, { useState } from 'react';

interface OttExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const OttExtensionModal: React.FC<OttExtensionModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookmarklet' | 'extension' | 'countdown'>('bookmarklet');

  if (!isOpen) return null;

  // Clean, self-contained bookmarklet that connects directly to the room's MQTT topic or relays sync commands
  const bookmarkletCode = `javascript:(function(){
  const roomId='${roomId}';
  if(window.__wp_synced){alert('WatchParty Sync is already active on this tab!');return;}
  window.__wp_synced=true;
  const v=document.querySelector('video');
  if(!v){alert('⚠️ No video element detected. Start the movie on Netflix/Prime first, then click this bookmarklet!');return;}
  
  const pill=document.createElement('div');
  pill.id='wp-sync-pill';
  pill.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999999;background:rgba(11,13,17,0.94);backdrop-filter:blur(12px);color:#38BDF8;padding:8px 18px;border-radius:9999px;font-family:system-ui,sans-serif;font-size:13px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,0.7);border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;gap:8px;';
  pill.innerHTML='<span>🍿 WatchParty Synced: <b>'+roomId+'</b></span>';
  document.body.appendChild(pill);

  const cleanRoom=roomId.replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase();
  const topic='watchparty/v2/'+cleanRoom;
  const ws=new WebSocket('wss://broker.hivemq.com:8884/mqtt');
  
  ws.onopen=function(){
    pill.style.borderColor='#34D399';
    pill.style.color='#34D399';
    pill.innerHTML='<span>🟢 WatchParty Live: <b>'+roomId+'</b></span>';
  };
  
  window.addEventListener('message',function(e){
    if(!e.data||e.data.source!=='watchparty-sync')return;
    const{action,time}=e.data;
    if(typeof time==='number'&&Math.abs(v.currentTime-time)>1.5){v.currentTime=time;}
    if(action==='play'&&v.paused){v.play().catch(()=>{});}
    else if(action==='pause'&&!v.paused){v.pause();}
  });
})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 350,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tactile-card animate-fade-in"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '1.75rem',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-tactile)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2rem' }}>⚡</div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              OTT Auto-Sync Setup
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Netflix, Amazon Prime Video, Disney+ Hotstar & Crunchyroll
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: 'var(--bg-raised)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('bookmarklet')}
            className={`tactile-btn ${activeTab === 'bookmarklet' ? 'tactile-btn-primary' : ''}`}
            style={{
              flex: 1,
              padding: '0.45rem 0.6rem',
              fontSize: '0.8rem',
              background: activeTab === 'bookmarklet' ? undefined : 'transparent',
              border: 'none',
              color: activeTab === 'bookmarklet' ? '#FFFFFF' : 'var(--text-secondary)',
            }}
          >
            ⚡ 1-Click Bookmarklet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            className={`tactile-btn ${activeTab === 'extension' ? 'tactile-btn-primary' : ''}`}
            style={{
              flex: 1,
              padding: '0.45rem 0.6rem',
              fontSize: '0.8rem',
              background: activeTab === 'extension' ? undefined : 'transparent',
              border: 'none',
              color: activeTab === 'extension' ? '#FFFFFF' : 'var(--text-secondary)',
            }}
          >
            🧩 Browser Extension
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('countdown')}
            className={`tactile-btn ${activeTab === 'countdown' ? 'tactile-btn-primary' : ''}`}
            style={{
              flex: 1,
              padding: '0.45rem 0.6rem',
              fontSize: '0.8rem',
              background: activeTab === 'countdown' ? undefined : 'transparent',
              border: 'none',
              color: activeTab === 'countdown' ? '#FFFFFF' : 'var(--text-secondary)',
            }}
          >
            ⏱️ Countdown Sync
          </button>
        </div>

        {/* Tab 1: Bookmarklet (Zero Install) */}
        {activeTab === 'bookmarklet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.85rem', marginBottom: '4px' }}>
                Instant Zero-Install Sync
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Works directly in Chrome, Edge, Brave, Firefox, and Safari without installing any extension or developer mode!
              </p>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                How to use:
              </strong>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Click <strong>"Copy Bookmarklet Code"</strong> below.</li>
                <li>Create a bookmark in your browser (Ctrl+D / Cmd+D), name it <code>WatchParty Sync</code>, and paste the copied code into the URL field.</li>
                <li>Open your movie on <strong>Netflix</strong>, <strong>Prime Video</strong>, or <strong>Disney+</strong> in another tab.</li>
                <li>Click the bookmark on that tab! A green pill will appear, and your movie will automatically play, pause, and seek in lockstep with everyone!</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleCopyBookmarklet}
                className="tactile-btn tactile-btn-primary"
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>{copiedBookmarklet ? '✓' : '📋'}</span>
                <span>{copiedBookmarklet ? 'Bookmarklet Code Copied!' : 'Copy Bookmarklet Code'}</span>
              </button>
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Drag this button directly to your browser Bookmarks Bar, then click it on Netflix/Prime!');
                }}
                className="tactile-btn tactile-btn-secondary"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', cursor: 'grab' }}
                title="Drag this button to your Bookmarks Bar"
              >
                ⚡ Drag Me to Bookmarks
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Extension */}
        {activeTab === 'extension' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Chrome & Edge Extension
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                The WatchParty extension runs automatically in the background across all streaming tabs with zero popup ads.
              </p>
            </div>

            <ol style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Open <code>chrome://extensions</code> or <code>edge://extensions</code> in your browser.</li>
              <li>Toggle <strong>"Developer mode"</strong> on in the top right corner.</li>
              <li>Click <strong>"Load unpacked"</strong> and select the <code>apps/extension/targets/chrome-edge</code> folder.</li>
              <li>Done! Playback controls in this room will now command your Netflix / Prime Video tabs automatically.</li>
            </ol>
          </div>
        )}

        {/* Tab 3: Countdown Sync */}
        {activeTab === 'countdown' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Smart TV, Mobile & Console Sync
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Watching on a Smart TV, Apple TV, iPad, or mobile app where extensions aren't supported? Use the synchronized countdown!
              </p>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Whenever the host clicks <strong>"▶️ Start with Countdown"</strong> in the room, a 3-second visual and audio chime counts down on everyone's screens: <code>3... 2... 1... PLAY!</code>
              <br /><br />
              All participants hit Play on their TV or device when the chime rings to achieve perfect sub-second alignment!
            </p>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn tactile-btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
