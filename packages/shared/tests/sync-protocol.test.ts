import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDrift,
  shouldCorrectDrift,
  formatMediaTime,
  createSyncEvent,
  isValidSyncEvent,
  CatchUpBufferManager,
  BlockedSeekTracker,
  DEFAULT_DRIFT_THRESHOLD_SECONDS,
} from '../dist/index.js';
import type { ChatMessage, SyncEvent } from '../dist/index.js';

describe('Sync Protocol — Unit Tests (Pure TS, Zero DOM)', () => {
  describe('calculateDrift()', () => {
    it('returns zero when local and remote times match with zero latency', () => {
      const drift = calculateDrift(100.0, 100.0, 0, 1.0, true);
      assert.equal(drift, 0);
    });

    it('accounts for transit latency when video is playing', () => {
      // Remote reported 100.0s, transit latency is 500ms (0.5s), playbackRate 1.0
      // Expected remote time is 100.5s. Local is 102.0s.
      // Drift should be |102.0 - 100.5| = 1.5s
      const drift = calculateDrift(102.0, 100.0, 500, 1.0, true);
      assert.ok(Math.abs(drift - 1.5) < 0.0001);
    });

    it('does not extrapolate transit latency when video is paused', () => {
      // When paused, expected time is exactly remoteTime regardless of transit latency
      const drift = calculateDrift(101.2, 100.0, 600, 1.0, false);
      assert.ok(Math.abs(drift - 1.2) < 0.0001);
    });

    it('factors in playbackRate when playing', () => {
      // Remote 100.0s, latency 1000ms (1.0s), 1.5x speed -> expected remote is 101.5s
      const drift = calculateDrift(101.5, 100.0, 1000, 1.5, true);
      assert.ok(Math.abs(drift - 0) < 0.0001);
    });
  });

  describe('shouldCorrectDrift()', () => {
    const now = 1000000;

    it('returns false when drift is below threshold', () => {
      const shouldSeek = shouldCorrectDrift(1.0, DEFAULT_DRIFT_THRESHOLD_SECONDS, 0, now);
      assert.equal(shouldSeek, false);
    });

    it('returns true when drift exceeds threshold and cooldown has elapsed', () => {
      const lastSeekTime = now - 4000; // 4s ago (> 3s cooldown)
      const shouldSeek = shouldCorrectDrift(2.1, DEFAULT_DRIFT_THRESHOLD_SECONDS, lastSeekTime, now);
      assert.equal(shouldSeek, true);
    });

    it('returns false when cooldown has NOT elapsed (prevents ping-pong loop)', () => {
      const lastSeekTime = now - 1500; // 1.5s ago (< 3s cooldown)
      const shouldSeek = shouldCorrectDrift(3.5, DEFAULT_DRIFT_THRESHOLD_SECONDS, lastSeekTime, now);
      assert.equal(shouldSeek, false);
    });
  });

  describe('formatMediaTime()', () => {
    it('formats minutes and seconds with padding', () => {
      assert.equal(formatMediaTime(0), '00:00');
      assert.equal(formatMediaTime(65), '01:05');
      assert.equal(formatMediaTime(252), '04:12');
    });

    it('formats hours for feature films', () => {
      assert.equal(formatMediaTime(3600), '1:00:00');
      assert.equal(formatMediaTime(10140), '2:49:00');
    });

    it('handles negative or invalid values gracefully', () => {
      assert.equal(formatMediaTime(-10), '00:00');
      assert.equal(formatMediaTime(NaN), '00:00');
    });
  });

  describe('createSyncEvent() and isValidSyncEvent()', () => {
    it('creates a fully validated SyncEvent', () => {
      const event = createSyncEvent('play', 45.2, 'user-123', {
        playbackRate: 1.25,
        mediaId: 'movie-4k',
        sequence: 42,
      });

      assert.equal(event.type, 'play');
      assert.equal(event.currentTime, 45.2);
      assert.equal(event.senderId, 'user-123');
      assert.equal(event.playbackRate, 1.25);
      assert.equal(event.sequence, 42);
      assert.ok(isValidSyncEvent(event));
    });

    it('validates and rejects corrupted payloads', () => {
      assert.equal(isValidSyncEvent(null), false);
      assert.equal(isValidSyncEvent({}), false);
      assert.equal(isValidSyncEvent({ type: 'invalid_type', currentTime: 10, timestamp: 123, senderId: 'abc' }), false);
      assert.equal(isValidSyncEvent({ type: 'play', currentTime: 'not-a-number', timestamp: 123, senderId: 'abc' }), false);
      assert.equal(isValidSyncEvent({ type: 'play', currentTime: 10, timestamp: 123, senderId: '' }), false);
    });
  });

  describe('CatchUpBufferManager (In-Memory Ring Buffer)', () => {
    it('stores events up to capacity and evicts oldest FIFO', () => {
      const manager = new CatchUpBufferManager(3); // Small capacity for test
      assert.equal(manager.size(), 0);

      const msg1: ChatMessage = { id: '1', senderId: 'u1', senderName: 'Alex', text: 'Hello', timestamp: 1 };
      const msg2: ChatMessage = { id: '2', senderId: 'u2', senderName: 'Sarah', text: 'Hey', timestamp: 2 };
      const event3 = createSyncEvent('play', 10, 'u1', { sequence: 1 });
      const event4 = createSyncEvent('pause', 15, 'u2', { sequence: 2 });

      manager.add(msg1);
      manager.add(msg2);
      manager.add(event3);
      assert.equal(manager.size(), 3);

      // Adding 4th item should evict msg1
      manager.add(event4);
      assert.equal(manager.size(), 3);

      const all = manager.getAll();
      assert.deepEqual(all, [msg2, event3, event4]);
    });

    it('enforces maximum limit of 50 in production configuration', () => {
      const manager = new CatchUpBufferManager(50);
      for (let i = 1; i <= 75; i++) {
        manager.add(createSyncEvent('heartbeat', i, 'host', { sequence: i }));
      }

      assert.equal(manager.size(), 50);
      const all = manager.getAll() as SyncEvent[];
      assert.equal(all[0].sequence, 26); // Oldest 25 dropped
      assert.equal(all[49].sequence, 75); // Latest preserved
    });

    it('clears completely when room closes', () => {
      const manager = new CatchUpBufferManager(50);
      manager.add(createSyncEvent('play', 0, 'host'));
      manager.clear();
      assert.equal(manager.size(), 0);
      assert.deepEqual(manager.getAll(), []);
    });
  });

  describe('BlockedSeekTracker', () => {
    it('verifies successful seeks', () => {
      const tracker = new BlockedSeekTracker(2, 1000);
      const now = 5000;

      tracker.registerSeek(45.0, now);
      // Actual time shifted to 45.1 within tolerance
      const success = tracker.verify(45.1, 0.5, now + 500);
      assert.equal(success, true);
      assert.equal(tracker.isBlocked(), false);
    });

    it('flags blocked seek when player ignores programmatic seek commands', () => {
      const tracker = new BlockedSeekTracker(2, 1000);
      let now = 10000;

      // First seek to 100.0, but player stays at 0.0
      tracker.registerSeek(100.0, now);
      now += 1500; // Exceeds timeout
      const check1 = tracker.verify(0.0, 0.5, now);
      assert.equal(check1, false);
      assert.equal(tracker.isBlocked(), false); // 1 failure, threshold is 2

      // Second seek to 100.0, player still at 0.0
      tracker.registerSeek(100.0, now);
      now += 1500;
      const check2 = tracker.verify(0.0, 0.5, now);
      assert.equal(check2, false);
      assert.equal(tracker.isBlocked(), true); // Reached 2 consecutive failures
    });
  });
});
