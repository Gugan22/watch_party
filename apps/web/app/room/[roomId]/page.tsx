'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ChatMessage } from '@watch-party/shared';
import { useWakeLock } from '@/hooks/useWakeLock';

// Modular room sub-components
import { LobbyView } from '@/components/room/LobbyView';
import { VideoTile, type Participant } from '@/components/room/VideoTile';
import { MediaPlayerStage } from '@/components/room/MediaPlayerStage';
import { FloatingDock } from '@/components/room/FloatingDock';
import { ChatDrawer } from '@/components/room/ChatDrawer';
import { CountdownModal } from '@/components/room/CountdownModal';
import { PostCallView } from '@/components/room/PostCallView';

type LayoutMode = 'spotlight' | 'grid' | 'sidebar';
const HOST_EMAIL = 'gugan2206@gmail.com';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const roomId = (params?.roomId as string) || 'watch-room';

  // Check if current user is the authorized host
  const isHost = session?.user?.email?.trim().toLowerCase() === HOST_EMAIL;

  // Room lifecycle stage: 'lobby' | 'live' | 'left'
  const [stage, setStage] = useState<'lobby' | 'live' | 'left'>('lobby');

  // Screen Wake Lock active while watching movie in live stage
  useWakeLock(stage === 'live');

  // Lobby AV state
  const [displayName, setDisplayName] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lobbyError, setLobbyError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Live Room layout state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('spotlight');
  const [pinnedId, setPinnedId] = useState<string>('media-player');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReactionPiP, setShowReactionPiP] = useState(true);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);

  // Host moderation: IDs of participants muted locally by host
  const [hostMutedIds, setHostMutedIds] = useState<Set<string>>(new Set());

  // Ephemeral Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-system-init',
      senderId: 'system',
      senderName: 'System',
      text: '🎬 Room session started. Zero disk persistence — chat exists strictly in-memory.',
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Local Video Player state
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Media streams & DOM refs
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const moviePlayerRef = useRef<HTMLVideoElement>(null);
  const roomStageRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active participants list
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'p1', name: 'Alex Friend', isSpeaking: false, isCamOn: true, isMicOn: true },
    { id: 'p2', name: 'Sam Miller', isSpeaking: false, isCamOn: true, isMicOn: false },
    { id: 'p3', name: 'Elena Rostova', isSpeaking: true, isCamOn: true, isMicOn: true },
  ]);

  // Transient Reactions
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);

  // Initialize display name from session or session storage (for unauthenticated guests)
  useEffect(() => {
    if (isHost && session?.user?.name) {
      setDisplayName(`${session.user.name} (Host)`);
    } else if (isHost && session?.user?.email) {
      setDisplayName('Gugan (Host)');
    } else {
      const stored = sessionStorage.getItem(`wp_name_${roomId}`);
      if (stored) {
        setDisplayName(stored);
      } else {
        setDisplayName('Guest');
      }
    }
  }, [session, isHost, roomId]);

  // Initialize Media Devices for AV preview
  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animFrame: number;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) return;
        setLocalStream(stream);

        if (lobbyVideoRef.current) {
          lobbyVideoRef.current.srcObject = stream;
        }

        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContext = new AudioCtx();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudio = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
            animFrame = requestAnimationFrame(updateAudio);
          };
          updateAudio();
        } catch {
          // AudioContext fallback
        }
      } catch (err) {
        console.warn('Media preview initialization notice:', err);
      }
    }

    if (stage === 'lobby' || stage === 'live') {
      initMedia();
    }

    return () => {
      active = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioContext) audioContext.close().catch(() => {});
      if (stage === 'left' && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stage]);

  // Join Party Action (Unauthenticated guests welcome)
  const handleJoinParty = useCallback(async () => {
    setIsConnecting(true);
    setLobbyError('');

    try {
      const res = await fetch('/api/rooms/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          displayName: displayName || 'Guest',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enter this room');
      }

      setStage('live');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Join verification error';
      setLobbyError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [roomId, displayName]);

  // Host Action: Kick / Remove participant
  const handleKickParticipant = async (participantId: string) => {
    const target = participants.find((p) => p.id === participantId);
    const targetName = target ? target.name : 'Participant';

    try {
      await fetch('/api/rooms/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, participantId }),
      });

      // Remove from active participants
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));

      // Post in chat
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderId: 'system',
          senderName: 'Host Action',
          text: `🚫 ${targetName} was removed from the party by host.`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error('Kick failed:', err);
    }
  };

  // Host Action: Toggle Host Mute (Mutes audio only for host)
  const handleToggleHostMute = (participantId: string) => {
    const nextMuted = new Set(hostMutedIds);
    const isCurrentlyMuted = nextMuted.has(participantId);

    if (isCurrentlyMuted) {
      nextMuted.delete(participantId);
    } else {
      nextMuted.add(participantId);
    }
    setHostMutedIds(nextMuted);

    const target = participants.find((p) => p.id === participantId);
    const targetName = target ? target.name : 'Participant';

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        senderId: 'system',
        senderName: 'Host Audio',
        text: isCurrentlyMuted
          ? `🔊 Unmuted ${targetName} for host.`
          : `🔇 Muted ${targetName} for host.`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Mic & Camera Toggles
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn;
      });
    }
    setIsMicOn(!isMicOn);
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOn;
      });
    }
    setIsCamOn(!isCamOn);
  };

  // Fullscreen Theater toggle
  const toggleFullscreen = () => {
    if (!roomStageRef.current) return;
    if (!document.fullscreenElement) {
      roomStageRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard Shortcuts: 'F' for Fullscreen, 'H' for reactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowReactionPiP((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Send Floating Reaction
  const sendReaction = (emoji: string) => {
    const newReaction = {
      id: Math.random().toString(),
      emoji,
      name: displayName || 'You',
    };
    setActiveReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);
  };

  // Send Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      id: Math.random().toString(),
      senderId: session?.user?.email || displayName || 'guest',
      senderName: displayName || 'You',
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setChatInput('');
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Local Video File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setIsPlaying(false);
  };

  // Play/Pause Video
  const togglePlayPause = () => {
    if (!moviePlayerRef.current) return;
    if (isPlaying) {
      moviePlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      moviePlayerRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Mobile 3-2-1 Countdown Trigger
  const startCountdown = () => {
    setCountdownNum(3);
    setTimeout(() => setCountdownNum(2), 1000);
    setTimeout(() => setCountdownNum(1), 2000);
    setTimeout(() => {
      setCountdownNum(null);
      if (moviePlayerRef.current) {
        moviePlayerRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 3000);
  };

  // Self participant model for video tile rendering
  const selfParticipant: Participant = {
    id: 'self',
    name: `${displayName} (You)`,
    isSpeaking: false,
    isCamOn,
    isMicOn,
  };

  // View 1: Green Room Lobby
  if (stage === 'lobby') {
    return (
      <LobbyView
        roomId={roomId}
        isCamOn={isCamOn}
        isMicOn={isMicOn}
        audioLevel={audioLevel}
        displayName={displayName}
        lobbyError={lobbyError}
        isConnecting={isConnecting}
        lobbyVideoRef={lobbyVideoRef}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onDisplayNameChange={setDisplayName}
        onJoinParty={handleJoinParty}
      />
    );
  }

  // View 2: Post-Call Room Left
  if (stage === 'left') {
    return <PostCallView onRejoin={() => setStage('lobby')} />;
  }

  // View 3: Active Live Room
  return (
    <div ref={roomStageRef} className="room-container">
      {/* Main Video & Playback Stage */}
      <div className="stage-main">
        {/* Top Control Bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🎬</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{roomId}</h2>
                {isHost && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-blue-surface)',
                      color: 'var(--accent-blue)',
                      fontWeight: 700,
                    }}
                  >
                    HOST
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--success-green)', fontWeight: 600 }}>
                ● {participants.length + 1} Participants Synced
              </span>
            </div>
          </div>

          {/* Layout Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-raised)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(['spotlight', 'grid', 'sidebar'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayoutMode(mode)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: layoutMode === mode ? 'var(--bg-surface)' : 'transparent',
                    color: layoutMode === mode ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={startCountdown}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
              title="Trigger 3-2-1 synced playback countdown"
            >
              ⏱️ 3-2-1 Countdown
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="tactile-btn tactile-btn-secondary"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
            >
              {isFullscreen ? 'Exit Fullscreen' : '⛶ Theater (F)'}
            </button>

            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`tactile-btn ${isChatOpen ? 'tactile-btn-primary' : 'tactile-btn-secondary'}`}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
            >
              💬 Chat
            </button>
          </div>
        </header>

        {/* Dynamic Layout Stage */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {layoutMode === 'spotlight' && (
            <div className="layout-spotlight">
              <div className="focal-player">
                {pinnedId === 'media-player' ? (
                  <MediaPlayerStage
                    videoRef={moviePlayerRef}
                    localVideoUrl={localVideoUrl}
                    onFileSelect={handleFileSelect}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onPinSelf={() => setPinnedId('self')}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <p>Participant pinned to focal stage</p>
                    <button
                      type="button"
                      onClick={() => setPinnedId('media-player')}
                      className="tile-pin-btn"
                      style={{ opacity: 0.9, top: '12px', right: '12px' }}
                    >
                      📌 Switch to Media Player
                    </button>
                  </div>
                )}
              </div>

              {/* Horizontal Participant Strip with Host Controls */}
              <div className="participant-strip">
                <VideoTile
                  participant={selfParticipant}
                  stream={localStream}
                  isSelf
                  onPin={setPinnedId}
                  style={{ width: '160px', height: '100%', flexShrink: 0 }}
                />
                {participants.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    isHostViewer={isHost}
                    isMutedForHost={hostMutedIds.has(p.id)}
                    onPin={setPinnedId}
                    onKick={handleKickParticipant}
                    onToggleHostMute={handleToggleHostMute}
                    style={{ width: '160px', height: '100%', flexShrink: 0 }}
                  />
                ))}
              </div>
            </div>
          )}

          {layoutMode === 'grid' && (
            <div className="layout-grid">
              <div className="video-tile" style={{ minHeight: '220px' }}>
                {localVideoUrl ? (
                  <video src={localVideoUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>🎬</div>
                    <p style={{ color: '#fff', fontSize: '0.85rem' }}>Media Player</p>
                  </div>
                )}
                <div className="tile-overlay-badge">Stream Stage</div>
              </div>
              <VideoTile participant={selfParticipant} stream={localStream} isSelf style={{ minHeight: '220px' }} />
              {participants.map((p) => (
                <VideoTile
                  key={p.id}
                  participant={p}
                  isHostViewer={isHost}
                  isMutedForHost={hostMutedIds.has(p.id)}
                  onKick={handleKickParticipant}
                  onToggleHostMute={handleToggleHostMute}
                  style={{ minHeight: '220px' }}
                />
              ))}
            </div>
          )}

          {layoutMode === 'sidebar' && (
            <div className="layout-sidebar">
              <div className="focal-player">
                <MediaPlayerStage
                  videoRef={moviePlayerRef}
                  localVideoUrl={localVideoUrl}
                  onFileSelect={handleFileSelect}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onPinSelf={() => setPinnedId('self')}
                />
              </div>
              <div className="sidebar-participants">
                <VideoTile participant={selfParticipant} stream={localStream} isSelf style={{ height: '140px' }} />
                {participants.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    isHostViewer={isHost}
                    isMutedForHost={hostMutedIds.has(p.id)}
                    onKick={handleKickParticipant}
                    onToggleHostMute={handleToggleHostMute}
                    style={{ height: '140px' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Floating Reactions PiP */}
          {showReactionPiP && activeReactions.length > 0 && (
            <div className="fullscreen-reaction-pip animate-fade-in">
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Transient Reactions</div>
              {activeReactions.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <span style={{ fontSize: '1.4rem' }}>{r.emoji}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Countdown Modal */}
          <CountdownModal countdownNum={countdownNum} />
        </div>

        {/* Floating Bottom Tactile Dock */}
        <FloatingDock
          isMicOn={isMicOn}
          isCamOn={isCamOn}
          isPlaying={isPlaying}
          isFullscreen={isFullscreen}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onSendReaction={sendReaction}
          onTogglePlayPause={togglePlayPause}
          onToggleFullscreen={toggleFullscreen}
          onLeaveRoom={() => setStage('left')}
        />
      </div>

      {/* Ephemeral In-Memory Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        messages={messages}
        chatInput={chatInput}
        onInputChange={setChatInput}
        onSendMessage={handleSendChat}
        onClose={() => setIsChatOpen(false)}
        chatBottomRef={chatBottomRef}
      />
    </div>
  );
}
