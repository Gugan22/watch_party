'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DownloadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';

  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) {
      setPlatform('android');
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else {
      setPlatform('desktop');
    }

    // Check if already in standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture PWA install prompt for Android/Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install on Android: Tap Chrome Menu (⋮) > "Install app" or "Add to Home screen".');
    }
  };

  const handleContinueToRoom = () => {
    sessionStorage.setItem('wp_skip_download_prompt', 'true');
    if (roomId) {
      router.push(`/room/${encodeURIComponent(roomId)}`);
    } else {
      router.push('/');
    }
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
      }}
    >
      {/* App Logo */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          margin: '0 auto 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
          <path d="M4 11a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5z" />
          <polygon points="10 9 15 12 10 15 10 9" fill="#FFFFFF" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="16" cy="4" r="1.5" />
        </svg>
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
        WatchParty App
      </h1>

      {roomId ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60A5FA',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
          }}
        >
          <span>🎬 Invited to Room:</span>
          <span style={{ color: '#FFFFFF' }}>{roomId}</span>
        </div>
      ) : (
        <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Zero-persistence cinema synchronization & video calls.
        </p>
      )}

      {/* Platform Section */}
      {platform === 'android' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🤖</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Android App & PWA</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.5, margin: 0 }}>
              Get the best experience with Picture-in-Picture, keep-awake screen locks, and smooth full-screen playback.
            </p>
          </div>

          <button
            id="install-android-btn"
            onClick={handleInstallPWA}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>📲</span> Install Android App (Free)
          </button>
        </div>
      )}

      {platform === 'ios' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🍎</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Add to iPhone / iPad</span>
            </div>
            <ol style={{ fontSize: '0.82rem', color: '#9CA3AF', paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6 }}>
              <li>Tap the <strong>Share</strong> button (box with upward arrow) in Safari</li>
              <li>Scroll down and select <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top right</li>
            </ol>
          </div>
        </div>
      )}

      {platform === 'desktop' && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#9CA3AF',
          }}
        >
          💻 You are on Desktop. You can join the room directly in your web browser!
        </div>
      )}

      {/* Primary Action: Direct Join */}
      <button
        id="continue-room-btn"
        onClick={handleContinueToRoom}
        style={{
          width: '100%',
          padding: '0.9rem',
          borderRadius: '14px',
          background: platform === 'desktop' ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' : 'rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: '0.75rem',
        }}
      >
        {roomId ? `🚀 Continue to Room (${roomId}) in Browser` : '🌐 Open Web Version'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button
          onClick={handleShareLink}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {copied ? '✓ Link Copied' : '🔗 Copy Link'}
        </button>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #111827 0%, #030712 100%)',
        color: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Suspense fallback={<div style={{ color: '#9CA3AF' }}>Loading WatchParty App...</div>}>
        <DownloadContent />
      </Suspense>
    </div>
  );
}
