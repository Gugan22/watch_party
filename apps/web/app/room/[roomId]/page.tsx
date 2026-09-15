'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ChatMessage, OttSession } from '@watch-party/shared';
import { useWakeLock } from '@/hooks/useWakeLock';

// Modular room sub-components
import { LobbyView } from '@/components/room/LobbyView';
import { VideoTile, type Participant } from '@/components/room/VideoTile';
import { MediaPlayerStage } from '@/components/room/MediaPlayerStage';
import { FloatingDock } from '@/components/room/FloatingDock';
import { ChatDrawer } from '@/components/room/ChatDrawer';
import { CountdownModal } from '@/components/room/CountdownModal';
import { PostCallView } from '@/components/room/PostCallView';
import { ShareRoomModal } from '@/components/room/ShareRoomModal';
import { NamePromptModal } from '@/components/room/NamePromptModal';
import { PrivatePingModal } from '@/components/room/PrivatePingModal';
import { PrivatePingToast, type ReceivedPing } from '@/components/room/PrivatePingToast';
import { OttSyncModal } from '@/components/room/OttSyncModal';
import { WebRTCMeshManager } from '@/lib/webrtc-mesh';

type LayoutMode = 'theater' | 'spotlight' | 'grid' | 'sidebar';

// Persistent root audio sink for remote peers - guaranteed playback across all layouts including Theater mode
function RemoteAudioSink({
  participantId,
  stream,
  isMuted,
}: {
  participantId: string;
  stream?: MediaStream | null;
  isMuted: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = isMuted;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Will be resumed by global click/touch listener if blocked by autoplay policy
        console.warn(`[AudioSink] Autoplay waiting for user gesture for peer ${participantId}:`, err);
      });
    }
  }, [stream, isMuted, participantId]);

  return <audio ref={audioRef} autoPlay playsInline muted={isMuted} style={{ display: 'none' }} />;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const roomId = (params?.roomId as string) || 'watch-room';

  // Check if current user is an authenticated host (via session or verified token or room creator storage)
  const [serverIsHost, setServerIsHost] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('host') === 'true' || sessionStorage.getItem(`wp_host_${roomId}`) === 'true';
  });
  const isHost = Boolean(session?.user?.email) || serverIsHost;

  // Share party link popup modal (auto-triggered on ?share=true or host manual click)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Mandatory guest name entry modal before entering the room
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);

  // Private Ping / Whisper state
  const [activePingTarget, setActivePingTarget] = useState<{ id: string; name: string } | null>(null);
  const [receivedPing, setReceivedPing] = useState<ReceivedPing | null>(null);
  const [selectedChatRecipientId, setSelectedChatRecipientId] = useState<string | null>(null);

  // Check URL query parameters for ?share=true and ?host=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('host') === 'true' || sessionStorage.getItem(`wp_host_${roomId}`) === 'true') {
        setServerIsHost(true);
      }
      if (urlParams.get('share') === 'true') {
        setIsShareModalOpen(true);
        // Clean up '?share=true' from the browser address bar without reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [roomId]);

  // Room lifecycle stage: 'connecting' | 'live' | 'left'
  const [stage, setStage] = useState<'connecting' | 'live' | 'left'>('connecting');

  // Screen Wake Lock active while watching movie in live stage
  useWakeLock(stage === 'live');

  // Mobile App Navigation: If accessed on mobile browser outside of installed PWA, redirect to download page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const hasSkipped = sessionStorage.getItem('wp_skip_download_prompt') === 'true' || document.cookie.includes('wp_skip_mobile=true');

    if (isMobile && !isStandalone && !hasSkipped) {
      router.replace(`/download?roomId=${encodeURIComponent(roomId)}`);
    }
  }, [roomId, router]);

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
  const [isTopBarHovered, setIsTopBarHovered] = useState(false);
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

  // Local Video Player & Native OTT state
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ottSession, setOttSession] = useState<OttSession | null>(null);
  const [isOttModalOpen, setIsOttModalOpen] = useState(false);
  const [syncToastMsg, setSyncToastMsg] = useState<string | null>(null);
  const ottSessionRef = useRef<OttSession | null>(null);
  ottSessionRef.current = ottSession;

  // Media streams & DOM refs
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const moviePlayerRef = useRef<HTMLVideoElement>(null);
  const roomStageRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active participants list (real connected users only)
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // WebRTC Mesh Manager for real-time video, audio, chat, and player sync across devices
  const meshRef = useRef<WebRTCMeshManager | null>(null);
  const localPeerIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('wp_peer_id') || (() => {
          const id = `peer-${Math.random().toString(36).substring(2, 9)}`;
          sessionStorage.setItem('wp_peer_id', id);
          return id;
        })())
      : `peer-${Math.random().toString(36).substring(2, 9)}`
  );

  // Screen / OTT Tab Share Controls
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setScreenStream(stream);
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
      };
    } catch (err) {
      console.warn('Screen share cancelled or error:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
  };

  // Transient Reactions
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);

  // Initialize display name from session or session storage (for unauthenticated guests)
  useEffect(() => {
    if (isHost && session?.user?.name) {
      setDisplayName(`${session.user.name} (Host)`);
    } else if (isHost && session?.user?.email) {
      setDisplayName('Host');
    } else {
      const stored = sessionStorage.getItem(`wp_name_${roomId}`);
      if (stored) {
        setDisplayName(stored);
      } else {
        setDisplayName('Guest');
      }
    }
  }, [session, isHost, roomId]);

  // Request user camera and microphone with optimal voice settings
  const requestMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);
      setIsCamOn(true);
      setIsMicOn(true);
    } catch (videoErr) {
      console.warn('Could not acquire both video and audio, trying audio only:', videoErr);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setLocalStream(audioStream);
        setIsCamOn(false);
        setIsMicOn(true);
      } catch (audioErr) {
        console.warn('Could not acquire microphone audio either:', audioErr);
      }
    }
  }, []);

  // Request permissions on room entry
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      requestMedia();
    }
  }, [requestMedia]);

  // Join Party Action (Mandatory name enforced for guests)
  const handleJoinParty = useCallback(async (explicitName?: string) => {
    let nameToUse = explicitName;
    if (!nameToUse) {
      if (isHost && session?.user?.name) {
        nameToUse = `${session.user.name} (Host)`;
      } else if (isHost) {
        nameToUse = 'Host';
      } else {
        const stored =
          sessionStorage.getItem(`wp_name_${roomId}`) ||
          sessionStorage.getItem('wp_user_display_name') ||
          localStorage.getItem('wp_user_display_name');
        if (stored && stored.trim().length >= 2) {
          nameToUse = stored.trim();
        } else {
          // Mandatory name entry required
          setIsNamePromptOpen(true);
          return;
        }
      }
    }

    if (typeof window !== 'undefined' && nameToUse) {
      sessionStorage.setItem(`wp_name_${roomId}`, nameToUse);
      sessionStorage.setItem('wp_user_display_name', nameToUse);
      localStorage.setItem('wp_user_display_name', nameToUse);
    }

    setIsConnecting(true);
    setLobbyError('');
    setDisplayName(nameToUse);

    try {
      const res = await fetch('/api/rooms/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          displayName: nameToUse,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404 || data.notFound) {
          // Room not found or ended: redirect to home page
          router.replace('/?error=room_not_found');
          return;
        }
        throw new Error(data.error || 'Failed to enter this room');
      }

      if (data.isHost) {
        setServerIsHost(true);
      }

      setStage('live');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Join verification error';
      setLobbyError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [roomId, isHost, session, router]);

  // Guest name submission from NamePromptModal
  const handleGuestNameSubmit = (enteredName: string) => {
    setIsNamePromptOpen(false);
    const clean = enteredName.trim();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`wp_name_${roomId}`, clean);
      sessionStorage.setItem('wp_user_display_name', clean);
      localStorage.setItem('wp_user_display_name', clean);
    }
    setDisplayName(clean);
    handleJoinParty(clean);
  };

  // Direct check on mount: If Host or valid session name exists, join; otherwise ask for name
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Start 100% fresh on each new deployment: clear stale room session storage
    const currentDeploy = process.env.NEXT_PUBLIC_DEPLOY_ID || 'v1';
    const lastDeploy = localStorage.getItem('wp_last_deploy_id');
    if (lastDeploy && lastDeploy !== currentDeploy) {
      sessionStorage.clear();
      console.log('[WatchParty] New deployment detected, cleared stale room sessions');
    }
    localStorage.setItem('wp_last_deploy_id', currentDeploy);

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const hasSkipped = sessionStorage.getItem('wp_skip_download_prompt') === 'true' || document.cookie.includes('wp_skip_mobile=true');

    if (isMobile && !isStandalone && !hasSkipped) {
      return;
    }

    if (isHost && session?.user?.name) {
      handleJoinParty(`${session.user.name} (Host)`);
      return;
    }

    // Fast check across sessionStorage and localStorage for seamless instant entry
    const storedName =
      sessionStorage.getItem(`wp_name_${roomId}`) ||
      sessionStorage.getItem('wp_user_display_name') ||
      localStorage.getItem('wp_user_display_name');

    if (storedName && storedName.trim().length >= 2) {
      handleJoinParty(storedName.trim());
    } else {
      setIsNamePromptOpen(true);
    }
  }, [handleJoinParty, isHost, session, roomId]);

  // Real-time WebRTC Mesh Connection: Synchronizes video, audio, chat, and movie state across peers
  useEffect(() => {
    if (stage !== 'live' || typeof window === 'undefined') return;

    const cleanName = (displayName || session?.user?.name || 'Guest')
      .replace(/ \(Host\)/gi, '')
      .replace(/ \(You\)/gi, '')
      .trim();

    const mesh = new WebRTCMeshManager(
      roomId,
      localPeerIdRef.current,
      cleanName || 'Guest',
      isHost
    );
    meshRef.current = mesh;

    if (localStream) {
      mesh.setLocalStream(localStream, isCamOn, isMicOn);
    }

    // Remote peer joined
    mesh.on('peerJoined', (peer) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.id === peer.id)) return prev;
        return [...prev, peer];
      });

      // If host has an active OTT session, broadcast to newcomer
      if (isHost && ottSessionRef.current) {
        mesh.broadcastOttSession(ottSessionRef.current);
      }

      setMessages((m) => [
        ...m,
        {
          id: Math.random().toString(),
          senderId: 'system',
          senderName: 'WatchParty',
          text: `👋 ${peer.name} entered the room!`,
          timestamp: Date.now(),
        },
      ]);
    });

    // Remote peer left
    mesh.on('peerLeft', (peerId) => {
      setParticipants((prev) => {
        const target = prev.find((p) => p.id === peerId);
        if (target) {
          setMessages((m) => [
            ...m,
            {
              id: Math.random().toString(),
              senderId: 'system',
              senderName: 'WatchParty',
              text: `🚪 ${target.name} left the room.`,
              timestamp: Date.now(),
            },
          ]);
        }
        return prev.filter((p) => p.id !== peerId);
      });
    });

    // Remote peer media stream track received
    mesh.on('peerStreamUpdated', (peerId, stream) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === peerId ? { ...p, stream } : p))
      );
    });

    // Remote peer muted/unmuted cam or mic
    mesh.on('peerMediaChanged', (peerId, remoteCam, remoteMic) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === peerId ? { ...p, isCamOn: remoteCam, isMicOn: remoteMic } : p
        )
      );
    });

    // Remote chat message
    mesh.on('chatMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    // Remote reaction
    mesh.on('reaction', (emoji, name) => {
      const newReaction = { id: Math.random().toString(), emoji, name };
      setActiveReactions((prev) => [...prev, newReaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2800);
    });

    // Remote player sync
    mesh.on('playerSync', (action, time, url) => {
      if (url && url !== localVideoUrl) {
        setLocalVideoUrl(url);
      }
      if (ottSessionRef.current) {
        setOttSession((prev) => (prev ? { ...prev, currentTime: time, isPlaying: action === 'play' } : null));
      }
      if (moviePlayerRef.current) {
        if (Math.abs(moviePlayerRef.current.currentTime - time) > 1.5) {
          moviePlayerRef.current.currentTime = time;
        }
        if (action === 'play') {
          moviePlayerRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else if (action === 'pause') {
          moviePlayerRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(action === 'play');
      }

      // Broadcast to local browser tabs/extensions via window.postMessage
      if (typeof window !== 'undefined') {
        window.postMessage({ source: 'watchparty-sync', action, time, url }, '*');
      }
    });

    // Remote OTT party session sync
    mesh.on('ottSync', (session) => {
      setOttSession(session);
      if (session) {
        setIsPlaying(session.isPlaying);
      }
    });

    // Remote countdown sync
    mesh.on('countdownSync', (action, targetTime, seconds) => {
      runCountdownSync(action, targetTime, seconds);
    });

    // Remote kicked handler
    mesh.on('kicked', () => {
      alert('🚫 You have been removed from this party by the host.');
      setStage('left');
    });

    // Incoming private ping whisper handler
    mesh.on('privatePing', (fromPeerId, fromName, message) => {
      setReceivedPing({
        id: `ping-${Date.now()}`,
        fromId: fromPeerId,
        fromName,
        message,
        timestamp: Date.now(),
      });

      const privateMsg: ChatMessage = {
        id: `msg-ping-${Date.now()}`,
        senderId: fromPeerId,
        senderName: fromName,
        targetName: 'You',
        isPrivate: true,
        text: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, privateMsg]);
    });

    return () => {
      mesh.destroy();
      meshRef.current = null;
    };
  }, [stage, roomId, isHost]);

  // Sync local stream and track enabled state to mesh
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.setLocalStream(localStream, isCamOn, isMicOn);
    }
  }, [localStream, isCamOn, isMicOn]);

  // Inline display name rename action
  const handleEditDisplayName = () => {
    const current = displayName || 'Guest';
    const newName = window.prompt('Update your display name for this party:', current);
    if (newName && newName.trim() && newName.trim() !== current) {
      const clean = newName.trim();
      setDisplayName(clean);
      sessionStorage.setItem(`wp_name_${roomId}`, clean);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderId: 'system',
          senderName: 'System',
          text: `✏️ ${current} renamed themselves to ${clean}`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // Open private direct message in chat drawer (Zoom / Teams style)
  const handleOpenDirectChat = useCallback((targetId: string, _targetName?: string) => {
    setSelectedChatRecipientId(targetId);
    setIsChatOpen(true);
  }, []);
  const handleOpenPingModal = handleOpenDirectChat;

  // Toggle Pin participant or switch back to media-player
  const handleTogglePin = useCallback((id: string) => {
    setPinnedId((prev) => (prev === id ? 'media-player' : id));
  }, []);

  // If pinned remote participant leaves, revert back to media player
  useEffect(() => {
    if (pinnedId !== 'media-player' && pinnedId !== 'self') {
      if (!participants.some((p) => p.id === pinnedId)) {
        setPinnedId('media-player');
      }
    }
  }, [participants, pinnedId]);

  // Send private ping
  const handleSendPrivatePing = useCallback((targetId: string, message: string) => {
    const target = participants.find((p) => p.id === targetId);
    const targetName = target ? target.name : 'Participant';

    meshRef.current?.sendPrivatePing(targetId, message);

    // Append local record to chat feed
    const newMsg: ChatMessage = {
      id: `ping-${Date.now()}`,
      senderId: 'me',
      senderName: `${displayName || 'You'}`,
      targetId,
      targetName,
      isPrivate: true,
      text: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
  }, [participants, displayName]);

  // Host Action: Kick / Remove participant
  const handleKickParticipant = async (participantId: string) => {
    const target = participants.find((p) => p.id === participantId);
    const targetName = target ? target.name : 'Participant';

    try {
      // Instant peer-to-peer removal via mesh
      meshRef.current?.kickParticipant(participantId);

      await fetch('/api/rooms/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, participantId }),
      });

      // Remove from active participants locally
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

  // Mic & Camera Toggles (Requests permissions if not already granted)
  const toggleMic = async () => {
    if (!localStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCamOn });
        setLocalStream(stream);
        setIsMicOn(true);
        meshRef.current?.setLocalStream(stream, isCamOn, true);
      } catch (err) {
        console.warn('Mic permission error:', err);
      }
      return;
    }
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = newStream.getAudioTracks()[0];
        localStream.addTrack(newTrack);
        setIsMicOn(true);
        meshRef.current?.setLocalStream(localStream, isCamOn, true);
      } catch (err) {
        console.warn('Mic track error:', err);
      }
      return;
    }
    const nextMic = !isMicOn;
    audioTracks.forEach((track) => {
      track.enabled = nextMic;
    });
    setIsMicOn(nextMic);
    meshRef.current?.broadcastMediaToggle(isCamOn, nextMic);
  };

  // Camera error helper with Edge & Lenovo Vantage guidance
  const handleCameraError = (err: any) => {
    console.error('Camera access error:', err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      alert(
        '📷 Camera Access Blocked in Microsoft Edge:\n\n' +
        '1. Look at the top address bar next to https://\n' +
        '2. Click the lock 🔒 or camera 📷 icon.\n' +
        '3. Change Camera permission from "Block" to "Allow".\n' +
        '4. Click the Camera button again to enable.'
      );
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      alert(
        '📷 Camera In Use / Privacy Lock Detected:\n\n' +
        'Your webcam cannot be opened because another app is holding it, or Lenovo Vantage Camera Privacy is ON.\n\n' +
        '• If you are on a Lenovo laptop, open Lenovo Vantage and turn OFF "Camera Privacy Mode" (or press Fn+F10).\n' +
        '• Close Zoom, Teams, or other browser tabs using your camera, then try again.'
      );
    } else {
      alert(`Unable to access camera: ${err.message || err.name || 'Unknown hardware error'}`);
    }
  };

  const toggleCam = async () => {
    if (!localStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
        setLocalStream(stream);
        setIsCamOn(true);
        meshRef.current?.setLocalStream(stream, true, isMicOn);
      } catch (err: any) {
        handleCameraError(err);
      }
      return;
    }
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        // Fresh MediaStream instance so React state updates and VideoTile re-renders!
        const updatedStream = new MediaStream([...localStream.getAudioTracks(), newTrack]);
        setLocalStream(updatedStream);
        setIsCamOn(true);
        meshRef.current?.setLocalStream(updatedStream, true, isMicOn);
      } catch (err: any) {
        handleCameraError(err);
      }
      return;
    }
    const nextCam = !isCamOn;
    videoTracks.forEach((track) => {
      track.enabled = nextCam;
    });
    setIsCamOn(nextCam);
    meshRef.current?.setLocalStream(localStream, nextCam, isMicOn);
  };

  // Global user interaction trigger to unlock browser autoplay audio policy
  useEffect(() => {
    const unlockAudio = () => {
      document.querySelectorAll('audio').forEach((audio) => {
        if (!audio.muted && audio.paused && audio.srcObject) {
          audio.play().catch(() => {});
        }
      });
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    const handleFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setIsTopBarHovered(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Fullscreen Theater toggle
  const toggleFullscreen = () => {
    if (!roomStageRef.current) return;
    if (!document.fullscreenElement) {
      roomStageRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      setIsTopBarHovered(false);
    }
  };

  // Cycle room layout modes (Theater -> Spotlight -> Grid -> Sidebar -> Theater)
  const cycleLayoutMode = () => {
    setLayoutMode((prev) => {
      if (prev === 'theater') return 'spotlight';
      if (prev === 'spotlight') return 'grid';
      if (prev === 'grid') return 'sidebar';
      return 'theater';
    });
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
    const sender = displayName || 'You';
    const newReaction = {
      id: Math.random().toString(),
      emoji,
      name: sender,
    };
    setActiveReactions((prev) => [...prev, newReaction]);
    meshRef.current?.broadcastReaction(emoji, sender);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);
  };

  // Send Chat Message (Public or Private Whisper)
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    if (selectedChatRecipientId) {
      const recipient = participants.find((p) => p.id === selectedChatRecipientId);
      const recipientName = recipient ? recipient.name : 'Participant';
      meshRef.current?.sendPrivatePing(selectedChatRecipientId, text);

      const privateMsg: ChatMessage = {
        id: `ping-${Date.now()}`,
        senderId: session?.user?.email || displayName || 'guest',
        senderName: `${displayName || 'You'}`,
        targetId: selectedChatRecipientId,
        targetName: recipientName,
        isPrivate: true,
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, privateMsg]);
      setChatInput('');
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    const msg: ChatMessage = {
      id: Math.random().toString(),
      senderId: session?.user?.email || displayName || 'guest',
      senderName: displayName || 'You',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    meshRef.current?.broadcastChatMessage(msg);
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

  // Countdown Sync implementation
  const runCountdownSync = (action: 'play' | 'pause', targetTime: number, seconds: number = 3) => {
    let count = seconds;
    setCountdownNum(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
      } else {
        clearInterval(interval);
        setCountdownNum(null);
        if (action === 'play') {
          if (moviePlayerRef.current) {
            moviePlayerRef.current.currentTime = targetTime;
            moviePlayerRef.current.play().catch(() => {});
          }
          setIsPlaying(true);
          window.postMessage({ source: 'watchparty-sync', action: 'play', time: targetTime }, '*');
        } else {
          if (moviePlayerRef.current) {
            moviePlayerRef.current.pause();
          }
          setIsPlaying(false);
          window.postMessage({ source: 'watchparty-sync', action: 'pause', time: targetTime }, '*');
        }
      }
    }, 1000);
  };

  const triggerCountdownSync = (action: 'play' | 'pause', targetTime: number) => {
    meshRef.current?.broadcastCountdownSync(action, targetTime, 3);
    runCountdownSync(action, targetTime, 3);
  };

  const handleSetOttSession = (newSession: OttSession) => {
    setOttSession(newSession);
    setIsPlaying(newSession.isPlaying);
    meshRef.current?.broadcastOttSession(newSession);
    window.postMessage({ source: 'watchparty-sync', type: 'ott-session', session: newSession }, '*');
  };

  const handleClearMedia = () => {
    setLocalVideoUrl(null);
    setScreenStream(null);
    setOttSession(null);
    setIsPlaying(false);
    meshRef.current?.broadcastOttSession(null);
    meshRef.current?.broadcastPlayerSync('pause', 0);
  };

  const handleSeek = (time: number) => {
    if (moviePlayerRef.current) {
      moviePlayerRef.current.currentTime = time;
    }
    if (ottSession) {
      setOttSession((prev) => (prev ? { ...prev, currentTime: time } : null));
    }
    meshRef.current?.broadcastPlayerSync('seek', time);
    window.postMessage({ source: 'watchparty-sync', action: 'seek', time }, '*');
  };

  // Host-Only Room Playback Sync: forces playback for all attendees across the room in their systems
  const handleHostSyncAll = () => {
    if (!isHost) return;

    // If no media loaded yet, open the modal so host can choose a movie/stream to sync
    if (!localVideoUrl && !ottSession && !screenStream) {
      setIsOttModalOpen(true);
      return;
    }

    const currentTime = moviePlayerRef.current?.currentTime || ottSession?.currentTime || 0;

    // 1. Force local state to playing
    setIsPlaying(true);
    if (moviePlayerRef.current) {
      moviePlayerRef.current.currentTime = currentTime;
      moviePlayerRef.current.play().catch(() => {});
    }
    if (ottSession) {
      const updated = { ...ottSession, isPlaying: true, currentTime, lastUpdated: Date.now() };
      setOttSession(updated);
      meshRef.current?.broadcastOttSession(updated);
    }

    // 2. Broadcast 'play' command to all attendees with exact timestamp and media URL
    const activeUrl = localVideoUrl || ottSession?.url || undefined;
    meshRef.current?.broadcastPlayerSync('play', currentTime, activeUrl);

    // 3. Relay to local browser extensions/bookmarklets
    if (typeof window !== 'undefined') {
      window.postMessage({ source: 'watchparty-sync', action: 'play', time: currentTime, url: activeUrl }, '*');
    }

    // 4. Show a visual feedback toast
    const attendeeCount = participants.length;
    const targetMsg = attendeeCount > 0
      ? `⚡ Synced & Playing for all ${attendeeCount + 1} attendees!`
      : `⚡ Synced & Playing across party!`;
    setSyncToastMsg(targetMsg);
    setTimeout(() => setSyncToastMsg(null), 2800);
  };

  // Play/Pause Video & OTT Sync
  const togglePlayPause = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    const action = nextPlaying ? 'play' : 'pause';
    const currentTime = moviePlayerRef.current?.currentTime || ottSession?.currentTime || 0;

    if (moviePlayerRef.current) {
      if (nextPlaying) {
        moviePlayerRef.current.play().catch(() => {});
      } else {
        moviePlayerRef.current.pause();
      }
    }
    meshRef.current?.broadcastPlayerSync(action, currentTime);
    window.postMessage({ source: 'watchparty-sync', action, time: currentTime }, '*');
  };

  // Reusable MediaPlayerStage renderer across all layout modes
  const renderMediaPlayerStage = (pinAction: () => void, isPinnedStage = false) => (
    <MediaPlayerStage
      videoRef={moviePlayerRef}
      localVideoUrl={localVideoUrl}
      screenStream={screenStream}
      ottSession={ottSession}
      roomId={roomId}
      isHost={isHost}
      isPlaying={isPlaying}
      onFileSelect={handleFileSelect}
      onSetVideoUrl={(url) => {
        setLocalVideoUrl(url);
        setIsPlaying(true);
        meshRef.current?.broadcastPlayerSync('play', 0, url);
      }}
      onSetOttSession={handleSetOttSession}
      onTriggerCountdown={triggerCountdownSync}
      onSeek={handleSeek}
      onStartScreenShare={startScreenShare}
      onStopScreenShare={stopScreenShare}
      onClearMedia={handleClearMedia}
      onPlay={() => {
        setIsPlaying(true);
        const time = moviePlayerRef.current?.currentTime || ottSession?.currentTime || 0;
        meshRef.current?.broadcastPlayerSync('play', time);
        window.postMessage({ source: 'watchparty-sync', action: 'play', time }, '*');
      }}
      onPause={() => {
        setIsPlaying(false);
        const time = moviePlayerRef.current?.currentTime || ottSession?.currentTime || 0;
        meshRef.current?.broadcastPlayerSync('pause', time);
        window.postMessage({ source: 'watchparty-sync', action: 'pause', time }, '*');
      }}
      onPinSelf={pinAction}
      isPinned={isPinnedStage}
    />
  );

  // Self participant model for video tile rendering
  const rawSelfName = (displayName || session?.user?.name || 'Guest')
    .replace(/ \(Host\)/gi, '')
    .replace(/ \(You\)/gi, '')
    .trim();

  const selfParticipant: Participant = {
    id: 'self',
    name: `${rawSelfName} (You)`,
    isSpeaking: false,
    isCamOn,
    isMicOn,
  };

  // View 1: Connecting Stage (Direct join progress)
  if (stage === 'connecting') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: 'radial-gradient(ellipse at top, #111827 0%, #030712 100%)',
          color: '#F9FAFB',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2.5" y="3.5" width="19" height="17" rx="3" stroke="#FFFFFF" strokeWidth="1.8" />
            <rect x="4.5" y="5.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <rect x="4.5" y="11" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <rect x="4.5" y="16.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <rect x="17.5" y="5.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <rect x="17.5" y="11" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <rect x="17.5" y="16.5" width="2" height="2" rx="0.5" fill="#FFFFFF" />
            <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.4" />
            <line x1="15.5" y1="3.5" x2="15.5" y2="20.5" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.4" />
            <path d="M10.8 8.8L14.2 12L10.8 15.2V8.8Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </div>

        {lobbyError ? (
          <div
            style={{
              maxWidth: '420px',
              padding: '1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Unable to Enter Room</h3>
            <p style={{ color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{lobbyError}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleJoinParty()}
                className="tactile-btn tactile-btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Retry Joining
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="tactile-btn tactile-btn-secondary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(59, 130, 246, 0.2)',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                margin: '0 auto 1.25rem',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              Entering Room: {roomId}
            </h2>
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
              Connecting directly to live cinema room & ephemeral sync...
            </p>
          </div>
        )}

        {/* Share Room Modal for Host and Automatic Invite Flow */}
        <ShareRoomModal
          isOpen={isShareModalOpen}
          roomId={roomId}
          onClose={() => setIsShareModalOpen(false)}
        />

        {/* Mandatory Guest Name Entry Modal (Displayed directly during connecting stage) */}
        <NamePromptModal
          isOpen={isNamePromptOpen}
          roomId={roomId}
          onJoin={handleGuestNameSubmit}
          isCamOn={isCamOn}
          isMicOn={isMicOn}
          onToggleCam={toggleCam}
          onToggleMic={toggleMic}
          localStream={localStream}
        />
      </div>
    );
  }

  // View 2: Post-Call Room Left
  if (stage === 'left') {
    return <PostCallView onRejoin={() => handleJoinParty()} />;
  }

  // View 3: Active Live Room
  return (
    <div ref={roomStageRef} className="room-container">
      {/* Main Video & Playback Stage */}
      <div className="stage-main">
        {/* Persistent Audio Sink for all remote participants - active across all layouts & Theater mode */}
        <div style={{ display: 'none' }} aria-hidden="true">
          {participants.map((p) => (
            <RemoteAudioSink
              key={p.id}
              participantId={p.id}
              stream={p.stream}
              isMuted={hostMutedIds.has(p.id)}
            />
          ))}
        </div>

        {/* Fullscreen top-edge hover trigger zone */}
        {isFullscreen && (
          <div
            onMouseEnter={() => setIsTopBarHovered(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '36px',
              zIndex: 49,
              pointerEvents: 'auto',
            }}
          />
        )}

        {/* Top Control Bar - Minimal, Classic, with Hover Reveal in Fullscreen */}
        <header
          onMouseEnter={() => setIsTopBarHovered(true)}
          onMouseLeave={() => setIsTopBarHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isFullscreen ? 'rgba(15, 23, 42, 0.92)' : 'var(--bg-surface)',
            padding: '0.45rem 1rem',
            borderRadius: isFullscreen ? 'var(--radius-lg)' : 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: isFullscreen ? 'blur(16px)' : undefined,
            boxShadow: isFullscreen && isTopBarHovered ? '0 16px 36px rgba(0, 0, 0, 0.7)' : undefined,
            ...(isFullscreen
              ? {
                  position: 'absolute',
                  top: '12px',
                  left: '16px',
                  right: '16px',
                  zIndex: 50,
                  transform: isTopBarHovered ? 'translateY(0)' : 'translateY(-140%)',
                  opacity: isTopBarHovered ? 1 : 0,
                  transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                  pointerEvents: isTopBarHovered ? 'auto' : 'none',
                }
              : {}),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-blue-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {/* Editable Display Name Badge */}
                <button
                  type="button"
                  onClick={handleEditDisplayName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 8px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="Click to change your display name"
                >
                  <span>👤</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{displayName || 'Guest'}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>✏️</span>
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--success-green)', fontWeight: 600 }}>
                ● {participants.length === 0 ? '1 Participant (You) • Waiting for friends' : `${participants.length + 1} Participants Synced`}
              </span>
            </div>
          </div>

          {/* Layout Controls & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* 4-Mode View Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-raised)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(['theater', 'spotlight', 'grid', 'sidebar'] as const).map((mode) => (
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
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{mode === 'theater' ? '🎬' : mode === 'spotlight' ? '🎯' : mode === 'grid' ? '⊞' : '◫'}</span>
                  <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                </button>
              ))}
            </div>

            {/* Host-Only Playback Sync Button */}
            {isHost && (
              <button
                type="button"
                onClick={handleHostSyncAll}
                className="tactile-btn tactile-btn-primary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                }}
                title="Sync: Play for all attendees across the room"
              >
                <span>⚡</span>
                <span>Sync</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`tactile-btn ${isChatOpen ? 'tactile-btn-primary' : 'tactile-btn-secondary'}`}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
            >
              💬 Chat
            </button>

            {/* Clean Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="tactile-btn tactile-btn-secondary"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Share party link"
            >
              🔗 Share
            </button>
          </div>
        </header>

        {/* Dynamic Layout Stage */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {/* Theater Mode: 100% Movie Stage with Zero Grid */}
          {layoutMode === 'theater' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#000000',
                borderRadius: isFullscreen ? 0 : 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {renderMediaPlayerStage(() => setPinnedId('self'), false)}
            </div>
          )}

          {layoutMode === 'spotlight' && (() => {
            const pinnedPeer = pinnedId === 'self' ? selfParticipant : participants.find((p) => p.id === pinnedId);
            const isPeerPinned = pinnedId !== 'media-player' && Boolean(pinnedPeer);

            return (
              <div className="layout-spotlight">
                <div className="focal-player">
                  {!isPeerPinned || !pinnedPeer ? (
                    renderMediaPlayerStage(() => setPinnedId('media-player'), false)
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <VideoTile
                        participant={pinnedPeer}
                        stream={pinnedId === 'self' ? localStream : pinnedPeer.stream}
                        isSelf={pinnedId === 'self'}
                        isHostViewer={isHost}
                        isMutedForHost={pinnedId !== 'self' ? hostMutedIds.has(pinnedPeer.id) : false}
                        isPinned={true}
                        onRequestMedia={requestMedia}
                        onPin={() => setPinnedId('media-player')}
                        onKick={handleKickParticipant}
                        onToggleHostMute={handleToggleHostMute}
                        onPing={handleOpenDirectChat}
                        style={{ width: '100%', height: '100%' }}
                      />
                      {/* Floating Unpin button to return movie to focal area */}
                      <button
                        type="button"
                        onClick={() => setPinnedId('media-player')}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          zIndex: 20,
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: 'var(--radius-full)',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        }}
                        title="Unpin participant and return movie to focal stage"
                      >
                        <span>📌</span>
                        <span>Unpin (Show Movie)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Horizontal Participant Strip */}
                <div className="participant-strip">
                  {/* When a participant is pinned, show the Movie Player thumbnail in the strip */}
                  {isPeerPinned && (
                    <div
                      onClick={() => setPinnedId('media-player')}
                      className="video-tile"
                      style={{
                        width: '180px',
                        height: '110px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        position: 'relative',
                        border: '2px solid var(--accent-blue)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                      title="Click to return movie to main stage"
                    >
                      {renderMediaPlayerStage(() => setPinnedId('media-player'), true)}
                      <div
                        className="tile-overlay-badge"
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(6px)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        🎬 Movie (Click to Pin)
                      </div>
                    </div>
                  )}

                  <VideoTile
                    participant={selfParticipant}
                    stream={localStream}
                    isSelf
                    isPinned={pinnedId === 'self'}
                    onRequestMedia={requestMedia}
                    onPin={handleTogglePin}
                    style={{ width: '160px', height: '100%', flexShrink: 0 }}
                  />
                  {participants.length === 0 ? (
                    <div
                      onClick={() => setIsShareModalOpen(true)}
                      style={{
                        width: '160px',
                        height: '100%',
                        flexShrink: 0,
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border-medium)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title="Click to invite friends to join"
                    >
                      <span style={{ fontSize: '1.4rem' }}>👥</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Waiting for guests
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                        + Invite Friends
                      </span>
                    </div>
                  ) : (
                    participants.map((p) => (
                      <VideoTile
                        key={p.id}
                        participant={p}
                        stream={p.stream}
                        isHostViewer={isHost}
                        isMutedForHost={hostMutedIds.has(p.id)}
                        isPinned={pinnedId === p.id}
                        onPin={handleTogglePin}
                        onKick={handleKickParticipant}
                        onToggleHostMute={handleToggleHostMute}
                        onPing={handleOpenDirectChat}
                        style={{ width: '160px', height: '100%', flexShrink: 0 }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {layoutMode === 'grid' && (
            <div className="layout-grid">
              <div className="video-tile" style={{ minHeight: '220px' }}>
                {renderMediaPlayerStage(() => {
                  setPinnedId('media-player');
                  setLayoutMode('spotlight');
                }, false)}
                <div className="tile-overlay-badge">Stream Stage</div>
              </div>
              <VideoTile
                participant={selfParticipant}
                stream={localStream}
                isSelf
                isPinned={pinnedId === 'self'}
                onRequestMedia={requestMedia}
                onPin={(id) => {
                  handleTogglePin(id);
                  setLayoutMode('spotlight');
                }}
                style={{ minHeight: '220px' }}
              />
              {participants.length === 0 ? (
                <div
                  onClick={() => setIsShareModalOpen(true)}
                  style={{
                    minHeight: '220px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-medium)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '1rem',
                  }}
                  title="Click to invite friends"
                >
                  <span style={{ fontSize: '2rem' }}>👥</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Waiting for friends to join...
                  </span>
                  <button type="button" className="tactile-btn tactile-btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem', marginTop: '4px' }}>
                    + Share Room Link
                  </button>
                </div>
              ) : (
                participants.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    stream={p.stream}
                    isHostViewer={isHost}
                    isMutedForHost={hostMutedIds.has(p.id)}
                    isPinned={pinnedId === p.id}
                    onPin={(id) => {
                      handleTogglePin(id);
                      setLayoutMode('spotlight');
                    }}
                    onKick={handleKickParticipant}
                    onToggleHostMute={handleToggleHostMute}
                    onPing={handleOpenDirectChat}
                    style={{ minHeight: '220px' }}
                  />
                ))
              )}
            </div>
          )}

          {layoutMode === 'sidebar' && (() => {
            const pinnedPeer = pinnedId === 'self' ? selfParticipant : participants.find((p) => p.id === pinnedId);
            const isPeerPinned = pinnedId !== 'media-player' && Boolean(pinnedPeer);

            return (
              <div className="layout-sidebar">
                <div className="focal-player">
                  {!isPeerPinned || !pinnedPeer ? (
                    renderMediaPlayerStage(() => setPinnedId('media-player'), false)
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <VideoTile
                        participant={pinnedPeer}
                        stream={pinnedId === 'self' ? localStream : pinnedPeer.stream}
                        isSelf={pinnedId === 'self'}
                        isHostViewer={isHost}
                        isMutedForHost={pinnedId !== 'self' ? hostMutedIds.has(pinnedPeer.id) : false}
                        isPinned={true}
                        onRequestMedia={requestMedia}
                        onPin={() => setPinnedId('media-player')}
                        onKick={handleKickParticipant}
                        onToggleHostMute={handleToggleHostMute}
                        onPing={handleOpenDirectChat}
                        style={{ width: '100%', height: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setPinnedId('media-player')}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          zIndex: 20,
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: 'var(--radius-full)',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        }}
                        title="Unpin participant and return movie to focal stage"
                      >
                        <span>📌</span>
                        <span>Unpin (Show Movie)</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="sidebar-participants">
                  {/* When a participant is pinned, show the Movie Player thumbnail in the sidebar */}
                  {isPeerPinned && (
                    <div
                      onClick={() => setPinnedId('media-player')}
                      className="video-tile"
                      style={{
                        height: '140px',
                        cursor: 'pointer',
                        position: 'relative',
                        border: '2px solid var(--accent-blue)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                      title="Click to return movie to main stage"
                    >
                      {renderMediaPlayerStage(() => setPinnedId('media-player'), true)}
                      <div
                        className="tile-overlay-badge"
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(6px)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        🎬 Movie (Click to Pin)
                      </div>
                    </div>
                  )}

                  <VideoTile
                    participant={selfParticipant}
                    stream={localStream}
                    isSelf
                    isPinned={pinnedId === 'self'}
                    onRequestMedia={requestMedia}
                    onPin={handleTogglePin}
                    style={{ height: '140px' }}
                  />
                  {participants.length === 0 ? (
                    <div
                      onClick={() => setIsShareModalOpen(true)}
                      style={{
                        height: '140px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border-medium)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>👥</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Waiting for guests</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 700 }}>+ Share Link</span>
                    </div>
                  ) : (
                    participants.map((p) => (
                      <VideoTile
                        key={p.id}
                        participant={p}
                        stream={p.stream}
                        isHostViewer={isHost}
                        isMutedForHost={hostMutedIds.has(p.id)}
                        isPinned={pinnedId === p.id}
                        onPin={handleTogglePin}
                        onKick={handleKickParticipant}
                        onToggleHostMute={handleToggleHostMute}
                        onPing={handleOpenDirectChat}
                        style={{ height: '140px' }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })()}

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

          {/* Real-Time Sync Toast Notification */}
          {syncToastMsg && (
            <div
              className="animate-fade-in"
              style={{
                position: 'fixed',
                top: '72px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 150,
                background: 'rgba(11, 13, 17, 0.94)',
                backdropFilter: 'blur(12px)',
                color: '#38BDF8',
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'none',
              }}
            >
              <span>⚡</span>
              <span>{syncToastMsg}</span>
            </div>
          )}
        </div>

        {/* Floating Bottom Tactile Dock */}
        <FloatingDock
          isMicOn={isMicOn}
          isCamOn={isCamOn}
          isPlaying={isPlaying}
          isFullscreen={isFullscreen}
          isScreenSharing={Boolean(screenStream)}
          isOttActive={Boolean(ottSession)}
          isHost={isHost}
          layoutMode={layoutMode}
          onCycleLayoutMode={cycleLayoutMode}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onSendReaction={sendReaction}
          onTogglePlayPause={togglePlayPause}
          onSyncAll={handleHostSyncAll}
          onToggleFullscreen={toggleFullscreen}
          onToggleScreenShare={screenStream ? stopScreenShare : startScreenShare}
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
        participants={participants}
        selectedRecipientId={selectedChatRecipientId}
        onSelectRecipient={setSelectedChatRecipientId}
      />

      {/* Share Room Modal (Only for Host or Launched with ?share=true) */}
      <ShareRoomModal
        isOpen={isShareModalOpen}
        roomId={roomId}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Sync OTT Watch Party Modal */}
      <OttSyncModal
        isOpen={isOttModalOpen}
        onClose={() => setIsOttModalOpen(false)}
        onSelectOtt={handleSetOttSession}
        onStartLegacyScreenShare={startScreenShare}
        currentSession={ottSession}
      />

      {/* Mandatory Guest Name Entry Modal */}
      <NamePromptModal
        isOpen={isNamePromptOpen}
        roomId={roomId}
        onJoin={handleGuestNameSubmit}
        isCamOn={isCamOn}
        isMicOn={isMicOn}
        onToggleCam={toggleCam}
        onToggleMic={toggleMic}
        localStream={localStream}
      />

      {/* Private Ping / Whisper Modal */}
      {activePingTarget && (
        <PrivatePingModal
          isOpen={Boolean(activePingTarget)}
          targetId={activePingTarget.id}
          targetName={activePingTarget.name}
          onSendPing={handleSendPrivatePing}
          onClose={() => setActivePingTarget(null)}
        />
      )}

      {/* Incoming Private Ping Toast Notification */}
      <PrivatePingToast
        ping={receivedPing}
        onPingBack={(fromId, fromName) => handleOpenPingModal(fromId, fromName)}
        onDismiss={() => setReceivedPing(null)}
      />
    </div>
  );
}
