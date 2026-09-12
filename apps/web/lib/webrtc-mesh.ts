import type { ChatMessage } from '@watch-party/shared';
import mqtt, { type MqttClient } from 'mqtt';

export interface RemotePeerInfo {
  id: string;
  name: string;
  isCamOn: boolean;
  isMicOn: boolean;
  isSpeaking: boolean;
  stream: MediaStream;
  lastSeen: number;
}

export type WebRTCEventMap = {
  peerJoined: (peer: RemotePeerInfo) => void;
  peerLeft: (peerId: string) => void;
  peerStreamUpdated: (peerId: string, stream: MediaStream) => void;
  peerMediaChanged: (peerId: string, isCamOn: boolean, isMicOn: boolean) => void;
  chatMessage: (msg: ChatMessage) => void;
  reaction: (emoji: string, name: string) => void;
  playerSync: (action: 'play' | 'pause' | 'seek', time: number, url?: string) => void;
  kicked: () => void;
  privatePing: (fromPeerId: string, fromName: string, message: string) => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCMeshManager {
  private roomId: string;
  private localPeerId: string;
  private displayName: string;
  private isHost: boolean;
  private localStream: MediaStream | null = null;
  private isCamOn = true;
  private isMicOn = true;

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remotePeers: Map<string, RemotePeerInfo> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private kickedPeerIds: Set<string> = new Set();

  private mqttClient: MqttClient | null = null;
  private topic: string;
  private destroyed = false;
  private heartbeatInterval: any = null;
  private reaperInterval: any = null;
  private unloadHandler: any = null;

  // Event listeners
  private listeners: { [K in keyof WebRTCEventMap]?: WebRTCEventMap[K][] } = {};

  constructor(roomId: string, localPeerId: string, displayName: string, isHost: boolean) {
    this.roomId = roomId.trim().toLowerCase();
    this.localPeerId = localPeerId;
    this.displayName = displayName;
    this.isHost = isHost;

    const cleanRoom = this.roomId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    this.topic = `watchparty/v2/${cleanRoom}`;

    this.initSignaling();
    this.initReaper();

    if (typeof window !== 'undefined') {
      this.unloadHandler = () => {
        try {
          this.broadcast({ type: 'leave', peerId: this.localPeerId });
        } catch {}
      };
      window.addEventListener('beforeunload', this.unloadHandler);
    }
  }

  public on<K extends keyof WebRTCEventMap>(event: K, listener: WebRTCEventMap[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(listener);
  }

  private emit<K extends keyof WebRTCEventMap>(event: K, ...args: Parameters<WebRTCEventMap[K]>) {
    const list = this.listeners[event];
    if (list) {
      list.forEach((fn) => (fn as any)(...args));
    }
  }

  // Update local display name dynamically if changed
  public updateDisplayName(newName: string) {
    this.displayName = newName;
    this.broadcast({
      type: 'heartbeat',
      peerId: this.localPeerId,
      name: newName,
      isCamOn: this.isCamOn,
      isMicOn: this.isMicOn,
    });
  }

  // Set or update local audio/video media stream with transceiver replaceTrack
  public setLocalStream(stream: MediaStream | null, isCamOn = true, isMicOn = true) {
    this.localStream = stream;
    this.isCamOn = isCamOn;
    this.isMicOn = isMicOn;

    const audioTrack = stream ? stream.getAudioTracks()[0] : null;
    const videoTrack = stream ? stream.getVideoTracks()[0] : null;

    if (audioTrack) audioTrack.enabled = isMicOn;
    if (videoTrack) videoTrack.enabled = isCamOn;

    this.peerConnections.forEach((pc) => {
      const transceivers = pc.getTransceivers();
      const audioTransceiver = transceivers.find((t) => t.sender.track?.kind === 'audio' || t.receiver.track?.kind === 'audio');
      const videoTransceiver = transceivers.find((t) => t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video');

      if (videoTransceiver) {
        videoTransceiver.sender.replaceTrack(videoTrack && isCamOn ? videoTrack : null).catch(() => {});
      } else if (videoTrack && pc.signalingState === 'stable') {
        try {
          pc.addTrack(videoTrack, stream!);
        } catch {}
      }

      if (audioTransceiver) {
        audioTransceiver.sender.replaceTrack(audioTrack && isMicOn ? audioTrack : null).catch(() => {});
      } else if (audioTrack && pc.signalingState === 'stable') {
        try {
          pc.addTrack(audioTrack, stream!);
        } catch {}
      }
    });

    this.broadcastMediaToggle(isCamOn, isMicOn);
  }

  // Initialize high-speed WebSockets MQTT signaling
  private initSignaling() {
    if (typeof window === 'undefined') return;

    const brokers = [
      'wss://broker.hivemq.com:8884/mqtt',
      'wss://test.mosquitto.org:8081',
    ];
    let brokerIdx = 0;

    const connectToBroker = () => {
      if (this.destroyed) return;
      const url = brokers[brokerIdx % brokers.length];
      console.log('[WebRTC-Signal] Connecting to signaling broker:', url);

      try {
        const client = mqtt.connect(url, {
          clientId: `wp_${this.localPeerId}_${Math.random().toString(16).substring(2, 8)}`,
          keepalive: 30,
          clean: true,
          reconnectPeriod: 3000,
          connectTimeout: 6000,
        });

        this.mqttClient = client;

        client.on('connect', () => {
          if (this.destroyed) {
            client.end(true);
            return;
          }
          console.log('[WebRTC-Signal] Connected to relay. Subscribing to:', this.topic);
          client.subscribe(this.topic, { qos: 0 }, (err) => {
            if (err) {
              console.warn('[WebRTC-Signal] Subscribe failed:', err);
              return;
            }
            console.log('[WebRTC-Signal] Subscribed to room channel! Announcing presence...');
            // Broadcast presence immediately
            this.broadcast({
              type: 'announce',
              peerId: this.localPeerId,
              name: this.displayName,
              isCamOn: this.isCamOn,
              isMicOn: this.isMicOn,
            });
          });
        });

        client.on('message', (_topic, messageBuffer) => {
          if (this.destroyed) return;
          try {
            const signal = JSON.parse(messageBuffer.toString());
            this.handleSignal(signal);
          } catch {
            // Ignore non-JSON or corrupt packet
          }
        });

        client.on('error', (err) => {
          console.warn('[WebRTC-Signal] Broker error, switching to fallback:', err);
          client.end(true);
          if (!this.destroyed) {
            brokerIdx++;
            setTimeout(connectToBroker, 1500);
          }
        });
      } catch (err) {
        console.warn('[WebRTC-Signal] Connection exception:', err);
        brokerIdx++;
        setTimeout(connectToBroker, 2000);
      }
    };

    connectToBroker();

    // Periodic presence broadcast every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.destroyed && this.mqttClient?.connected) {
        this.broadcast({
          type: 'heartbeat',
          peerId: this.localPeerId,
          name: this.displayName,
          isCamOn: this.isCamOn,
          isMicOn: this.isMicOn,
        });
      }
    }, 5000);
  }

  // Sweep and clean up stale peers who left abruptly without explicit leave signal
  private initReaper() {
    this.reaperInterval = setInterval(() => {
      if (this.destroyed) return;
      const now = Date.now();
      const deadPeerIds: string[] = [];

      this.remotePeers.forEach((peer, peerId) => {
        const pc = this.peerConnections.get(peerId);
        const isDisconnected = pc && (pc.connectionState === 'closed' || pc.connectionState === 'failed');
        // If peer hasn't sent a heartbeat for > 12 seconds or connection died, prune
        if (now - peer.lastSeen > 12000 || isDisconnected) {
          deadPeerIds.push(peerId);
        }
      });

      deadPeerIds.forEach((id) => this.removePeer(id));
    }, 4000);
  }

  // Send signal message to room topic
  private broadcast(payload: Record<string, any>) {
    if (this.destroyed || !this.mqttClient) return;
    try {
      if (this.mqttClient.connected) {
        this.mqttClient.publish(this.topic, JSON.stringify(payload), { qos: 0 });
      }
    } catch (err) {
      console.warn('[WebRTC] Broadcast signal error:', err);
    }
  }

  // Dispatch incoming signals
  private async handleSignal(signal: any) {
    if (!signal) return;
    const senderId = signal.peerId || signal.from;
    if (senderId === this.localPeerId) return;

    // Ignore any signals from kicked participants
    if (senderId && this.kickedPeerIds.has(senderId)) return;

    // Update lastSeen timestamp on sender
    if (senderId && this.remotePeers.has(senderId)) {
      this.remotePeers.get(senderId)!.lastSeen = Date.now();
    }

    switch (signal.type) {
      case 'announce': {
        const remotePeerId = signal.peerId;
        const remoteName = signal.name || 'Friend';

        this.registerRemotePeer(remotePeerId, remoteName, signal.isCamOn ?? true, signal.isMicOn ?? true);

        // Acknowledge presence back to sender
        this.broadcast({
          type: 'announce-ack',
          peerId: this.localPeerId,
          targetId: remotePeerId,
          name: this.displayName,
          isCamOn: this.isCamOn,
          isMicOn: this.isMicOn,
        });

        // Deterministic initiator: higher peerId initiates the WebRTC offer
        if (this.localPeerId > remotePeerId) {
          this.initiateCall(remotePeerId);
        }
        break;
      }

      case 'announce-ack': {
        if (signal.targetId !== this.localPeerId) return;
        const remotePeerId = signal.peerId;
        const remoteName = signal.name || 'Friend';

        this.registerRemotePeer(remotePeerId, remoteName, signal.isCamOn ?? true, signal.isMicOn ?? true);

        // Higher peerId initiates the call
        if (this.localPeerId > remotePeerId) {
          this.initiateCall(remotePeerId);
        }
        break;
      }

      case 'heartbeat': {
        const remotePeerId = signal.peerId;
        if (!this.remotePeers.has(remotePeerId)) {
          this.registerRemotePeer(remotePeerId, signal.name || 'Friend', signal.isCamOn ?? true, signal.isMicOn ?? true);
          if (this.localPeerId > remotePeerId) {
            this.initiateCall(remotePeerId);
          }
        } else {
          const p = this.remotePeers.get(remotePeerId)!;
          p.lastSeen = Date.now();
          const camVal = typeof signal.isCamOn === 'boolean' ? signal.isCamOn : p.isCamOn;
          const micVal = typeof signal.isMicOn === 'boolean' ? signal.isMicOn : p.isMicOn;
          if (camVal !== p.isCamOn || micVal !== p.isMicOn || (signal.name && signal.name !== p.name)) {
            p.isCamOn = camVal;
            p.isMicOn = micVal;
            if (signal.name) p.name = signal.name;
            this.emit('peerMediaChanged', remotePeerId, p.isCamOn, p.isMicOn);
          }
        }
        break;
      }

      case 'offer': {
        if (signal.to !== this.localPeerId) return;
        await this.handleOffer(signal.from, signal.sdp);
        break;
      }

      case 'answer': {
        if (signal.to !== this.localPeerId) return;
        await this.handleAnswer(signal.from, signal.sdp);
        break;
      }

      case 'candidate': {
        if (signal.to !== this.localPeerId) return;
        await this.handleCandidate(signal.from, signal.candidate);
        break;
      }

      case 'media-toggle': {
        const peer = this.remotePeers.get(signal.peerId);
        if (peer) {
          peer.isCamOn = Boolean(signal.isCamOn);
          peer.isMicOn = Boolean(signal.isMicOn);
          peer.lastSeen = Date.now();
          this.emit('peerMediaChanged', signal.peerId, peer.isCamOn, peer.isMicOn);
        }
        break;
      }

      case 'chat': {
        if (signal.message) {
          this.emit('chatMessage', signal.message);
        }
        break;
      }

      case 'reaction': {
        if (signal.emoji && signal.name) {
          this.emit('reaction', signal.emoji, signal.name);
        }
        break;
      }

      case 'player-sync': {
        if (signal.action) {
          this.emit('playerSync', signal.action, signal.time ?? 0, signal.url);
        }
        break;
      }

      case 'private-ping': {
        if (signal.targetId === this.localPeerId) {
          this.emit('privatePing', signal.from, signal.fromName || 'Someone', signal.message || '👋 Pinged you privately!');
        }
        break;
      }

      case 'kick': {
        if (signal.targetId === this.localPeerId) {
          this.emit('kicked');
        } else if (signal.targetId) {
          this.kickedPeerIds.add(signal.targetId);
          this.removePeer(signal.targetId);
        }
        break;
      }

      case 'leave': {
        this.removePeer(signal.peerId);
        break;
      }
    }
  }

  // Register remote peer in internal maps & emit event
  private registerRemotePeer(peerId: string, name: string, isCamOn: boolean, isMicOn: boolean) {
    if (this.kickedPeerIds.has(peerId)) return;

    if (this.remotePeers.has(peerId)) {
      const existing = this.remotePeers.get(peerId)!;
      existing.name = name;
      existing.isCamOn = isCamOn;
      existing.isMicOn = isMicOn;
      existing.lastSeen = Date.now();
      this.emit('peerMediaChanged', peerId, isCamOn, isMicOn);
      return;
    }

    const peerInfo: RemotePeerInfo = {
      id: peerId,
      name,
      isCamOn,
      isMicOn,
      isSpeaking: false,
      stream: new MediaStream(),
      lastSeen: Date.now(),
    };

    this.remotePeers.set(peerId, peerInfo);
    this.emit('peerJoined', peerInfo);
  }

  // Create or get RTCPeerConnection with pre-negotiated transceivers
  private getOrCreatePeerConnection(remotePeerId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(remotePeerId);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);

    // Attach local stream tracks directly or pre-negotiate transceivers
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      const videoTrack = this.localStream.getVideoTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = this.isMicOn;
        try {
          pc.addTrack(audioTrack, this.localStream);
        } catch {
          try {
            pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [this.localStream] });
          } catch {}
        }
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'sendrecv' });
        } catch {}
      }

      if (videoTrack) {
        videoTrack.enabled = this.isCamOn;
        try {
          pc.addTrack(videoTrack, this.localStream);
        } catch {
          try {
            pc.addTransceiver(videoTrack, { direction: 'sendrecv', streams: [this.localStream] });
          } catch {}
        }
      } else {
        try {
          pc.addTransceiver('video', { direction: 'sendrecv' });
        } catch {}
      }
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {}
    }

    // Handle remote tracks and emit a fresh stream clone to force React UI update
    pc.ontrack = (event) => {
      const peer = this.remotePeers.get(remotePeerId);
      if (peer) {
        const stream = event.streams[0] || new MediaStream([event.track]);
        stream.getTracks().forEach((track) => {
          if (!peer.stream.getTracks().some((t) => t.id === track.id)) {
            peer.stream.addTrack(track);
          }
        });
        if (event.track.kind === 'video') {
          peer.isCamOn = true;
          this.emit('peerMediaChanged', remotePeerId, true, peer.isMicOn);
        }
        const freshStream = new MediaStream(peer.stream.getTracks());
        peer.stream = freshStream;
        peer.lastSeen = Date.now();
        this.emit('peerStreamUpdated', remotePeerId, freshStream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        this.broadcast({
          type: 'candidate',
          from: this.localPeerId,
          to: remotePeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        this.removePeer(remotePeerId);
      }
    };

    this.peerConnections.set(remotePeerId, pc);
    return pc;
  }

  // Initiator: create and broadcast SDP offer
  private async initiateCall(remotePeerId: string) {
    try {
      const pc = this.getOrCreatePeerConnection(remotePeerId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      this.broadcast({
        type: 'offer',
        from: this.localPeerId,
        to: remotePeerId,
        sdp: pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.warn('[WebRTC] initiateCall error:', err);
    }
  }

  // Receiver: accept offer and send answer
  private async handleOffer(remotePeerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      const pc = this.getOrCreatePeerConnection(remotePeerId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process any queued candidates
      const pending = this.pendingCandidates.get(remotePeerId) || [];
      for (const cand of pending) {
        try {
          if (cand && cand.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch {}
      }
      this.pendingCandidates.delete(remotePeerId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.broadcast({
        type: 'answer',
        from: this.localPeerId,
        to: remotePeerId,
        sdp: pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.warn('[WebRTC] handleOffer error:', err);
    }
  }

  // Initiator: handle answer from receiver
  private async handleAnswer(remotePeerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(remotePeerId);
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const pending = this.pendingCandidates.get(remotePeerId) || [];
        for (const cand of pending) {
          try {
            if (cand && cand.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          } catch {}
        }
        this.pendingCandidates.delete(remotePeerId);
      }
    } catch (err) {
      console.warn('[WebRTC] handleAnswer error:', err);
    }
  }

  // Handle incoming ICE candidate
  private async handleCandidate(remotePeerId: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peerConnections.get(remotePeerId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type && candidate && candidate.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        if (!this.pendingCandidates.has(remotePeerId)) {
          this.pendingCandidates.set(remotePeerId, []);
        }
        this.pendingCandidates.get(remotePeerId)?.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] handleCandidate error:', err);
    }
  }

  // Host Action: Kick a participant
  public kickParticipant(targetPeerId: string) {
    this.kickedPeerIds.add(targetPeerId);
    this.removePeer(targetPeerId);
    this.broadcast({
      type: 'kick',
      peerId: this.localPeerId,
      targetId: targetPeerId,
    });
  }

  // Public broadcasts for application features
  public broadcastMediaToggle(isCamOn: boolean, isMicOn: boolean) {
    this.isCamOn = isCamOn;
    this.isMicOn = isMicOn;
    this.broadcast({
      type: 'media-toggle',
      peerId: this.localPeerId,
      isCamOn,
      isMicOn,
    });
  }

  public sendPrivatePing(targetPeerId: string, message?: string) {
    this.broadcast({
      type: 'private-ping',
      from: this.localPeerId,
      fromName: this.displayName,
      targetId: targetPeerId,
      message: message?.trim() || '👋 Pinged you privately!',
      timestamp: Date.now(),
    });
  }

  public broadcastChatMessage(msg: ChatMessage) {
    this.broadcast({
      type: 'chat',
      from: this.localPeerId,
      message: msg,
    });
  }

  public broadcastReaction(emoji: string, name: string) {
    this.broadcast({
      type: 'reaction',
      from: this.localPeerId,
      emoji,
      name,
    });
  }

  public broadcastPlayerSync(action: 'play' | 'pause' | 'seek', time: number, url?: string) {
    this.broadcast({
      type: 'player-sync',
      from: this.localPeerId,
      action,
      time,
      url,
    });
  }

  // Clean up a departed peer
  private removePeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remotePeers.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.emit('peerLeft', peerId);
  }

  // Teardown entire mesh session on room exit
  public destroy() {
    this.destroyed = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
    }
    if (this.unloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unloadHandler);
    }

    // Broadcast leave
    this.broadcast({
      type: 'leave',
      peerId: this.localPeerId,
    });

    if (this.mqttClient) {
      try {
        this.mqttClient.end(true);
      } catch {}
      this.mqttClient = null;
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remotePeers.clear();
    this.listeners = {};
  }
}
