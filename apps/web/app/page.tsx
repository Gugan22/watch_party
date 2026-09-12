'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('join');
  const [createRoomName, setCreateRoomName] = useState('Interstellar Watch Party');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [expiryHours, setExpiryHours] = useState<number>(6);
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomUrl, setCreatedRoomUrl] = useState('');
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState(false);

  // Guest join state (zero auth required)
  const [joinRoomId, setJoinRoomId] = useState('');
  const [guestDisplayName, setGuestDisplayName] = useState('');
  const [joinError, setJoinError] = useState('');

  const isHost = Boolean(session?.user);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Host: Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    setCreatedRoomUrl('');
    setCreatedRoomId('');

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: createRoomName.trim() || 'Watch Party',
          expiryHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setCreatedRoomUrl(data.roomUrl);
      setCreatedRoomId(data.roomId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Guest / Host: Join Room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    let input = joinRoomId.trim();
    if (input.includes('/room/')) {
      const parts = input.split('/room/')[1]?.split(/[?#]/)[0];
      if (parts) input = parts;
    }

    const cleanRoom = input.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanRoom) {
      setJoinError('Please enter a valid Room link or code.');
      return;
    }

    const cleanName = guestDisplayName.trim() || 'Guest';
    // Store chosen display name in session storage so room picks it up automatically
    sessionStorage.setItem(`wp_name_${cleanRoom}`, cleanName);

    router.push(`/room/${cleanRoom}`);
  };

  const handleCopyLink = () => {
    if (!createdRoomUrl) return;
    navigator.clipboard.writeText(createdRoomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-blue-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            {/* Film-inspired 35mm Celluloid Frame Logo */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="3.5" width="19" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4.5" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="11" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="16.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="5.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="11" width="2" height="2" rx="0.5" fill="currentColor" />
              <rect x="17.5" y="16.5" width="2" height="2" rx="0.5" fill="currentColor" />
              <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
              <line x1="15.5" y1="3.5" x2="15.5" y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
              <path d="M10.8 8.8L14.2 12L10.8 15.2V8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              WatchParty
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={toggleTheme}
            className="tactile-btn tactile-btn-secondary"
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* Host Sign In Status */}
          {status === 'loading' ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</span>
          ) : session?.user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt="Google Avatar"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                />
              ) : (
                <span>👤</span>
              )}
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 500,
                }}
              >
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="tactile-btn tactile-btn-secondary"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="tactile-btn tactile-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <GoogleIcon />
              Host Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem 1rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Private Synchronized Watch Parties
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto' }}>
            Stream movies and videos in sync with up to 10 friends. Zero sign-in required for joining members.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-raised)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'join' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'join' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: activeTab === 'join' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🚪 Join Watch Party (No Auth)
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'create' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'create' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: activeTab === 'create' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ✨ Create Watch Room (Host)
          </button>
        </div>

        {/* Tab 1: Join Party (No Auth Required) */}
        {activeTab === 'join' && (
          <div className="tactile-card" style={{ padding: '1.75rem' }}>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Room Link or Code
                </label>
                <input
                  type="text"
                  className="tactile-input"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Paste invite link or enter room code"
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Paste the full room link or enter the code shared by your host.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Your Display Name
                </label>
                <input
                  type="text"
                  className="tactile-input"
                  value={guestDisplayName}
                  onChange={(e) => setGuestDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                />
              </div>

              {joinError && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger-red)',
                    fontSize: '0.82rem',
                  }}
                >
                  ⚠️ {joinError}
                </div>
              )}

              <button
                type="submit"
                className="tactile-btn tactile-btn-primary"
                style={{ padding: '0.85rem', fontSize: '1rem' }}
              >
                🚀 Join Watch Party
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Create Watch Room (Host Sign-In) */}
        {activeTab === 'create' && (
          <div className="tactile-card" style={{ padding: '1.75rem' }}>
            {!session?.user ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <GoogleIcon />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Host Sign In Required
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                  Sign in with your Google account to create and manage your private watch party.
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="tactile-btn tactile-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0.85rem 1.75rem',
                    fontSize: '1rem',
                  }}
                >
                  <GoogleIcon />
                  Sign in with Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Host Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-raised)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="Avatar"
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      />
                    ) : (
                      <span>👤</span>
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{session.user.name || 'Host'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{session.user.email}</div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent-blue-surface)',
                      color: 'var(--accent-blue)',
                      fontWeight: 600,
                    }}
                  >
                    Authorized Host
                  </span>
                </div>

                {/* Room Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Party / Room Name
                  </label>
                  <input
                    type="text"
                    className="tactile-input"
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="e.g. Interstellar Watch Party"
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Give your watch party a name. We'll automatically generate a clean, unique link for your guests.
                  </p>
                </div>

                {/* Expiry Window */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Room Expiration Window (4 to 12 Hours)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {[4, 6, 8, 12].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setExpiryHours(hours)}
                        style={{
                          padding: '0.65rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${expiryHours === hours ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                          background: expiryHours === hours ? 'var(--accent-blue-surface)' : 'var(--bg-raised)',
                          color: expiryHours === hours ? 'var(--accent-blue)' : 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {hours} Hours {hours === 12 ? '(Max)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {createError && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--danger-red)',
                      fontSize: '0.82rem',
                    }}
                  >
                    ⚠️ {createError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="tactile-btn tactile-btn-primary"
                  style={{ padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  {isCreating ? 'Creating Room...' : '🎉 Launch Watch Party Room'}
                </button>
              </form>
            )}

            {/* Created Room Display */}
            {createdRoomUrl && (
              <div
                className="animate-fade-in"
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--success-green)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  ✓ Watch party "{createRoomName}" is ready! Link expires in {expiryHours} hours.
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem',
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={createdRoomUrl}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      padding: '0 0.5rem',
                    }}
                  />
                  <button onClick={handleCopyLink} className="tactile-btn tactile-btn-primary">
                    {copied ? '✓ Copied' : '📋 Copy Link'}
                  </button>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => router.push(`/room/${createdRoomId}`)}
                    className="tactile-btn tactile-btn-secondary"
                    style={{ flex: 1 }}
                  >
                    🚀 Enter Party Room as Host
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
