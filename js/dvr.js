/**
 * KSTI 2026 - Search and Rescue (SAR)
 * YouTube Live DVR & VAR (Video Assistant Referee) Engine
 * Fitur: Tayangan langsung (LIVE), mundur linimasa (DVR scrub), slow-motion review,
 * dan kembali ke real-time instan saat digeser ke detik terbaru atau tombol LIVE diklik.
 */

(function () {
  'use strict';

  const DVR_CHANNEL_NAME = 'ksti_sar_dvr_channel_v1';
  let dvrBroadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      dvrBroadcastChannel = new BroadcastChannel(DVR_CHANNEL_NAME);
    }
  } catch (e) {}

  class DvrManager {
    constructor() {
      this.activeStream = null;
      this.mediaRecorder = null;
      this.recordedChunks = [];
      this.startTime = null;
      this.durationSec = 0;
      this.isLive = true;
      this.seekOffsetSec = 0;
      this.playbackRate = 1.0;
      this.isPaused = false;
      this.currentBlobUrl = null;
      this.lastBlobCompiledAt = 0;
      this.listeners = new Set();
      this.mountedPlayers = new Set();
      this.tickerInterval = null;

      if (dvrBroadcastChannel) {
        dvrBroadcastChannel.onmessage = (ev) => {
          this.handleBroadcastMessage(ev.data);
        };
      }
    }

    notify() {
      const stateSnapshot = this.getState();
      this.listeners.forEach((fn) => {
        try {
          fn(stateSnapshot);
        } catch (e) {
          console.error(e);
        }
      });
      this.mountedPlayers.forEach((player) => {
        try {
          player.updateUI(stateSnapshot);
        } catch (e) {
          console.error(e);
        }
      });
    }

    getState() {
      const total = this.getDurationSec();
      return {
        isLive: this.isLive,
        durationSec: total,
        seekOffsetSec: this.seekOffsetSec,
        currentPosSec: Math.max(0, total - this.seekOffsetSec),
        playbackRate: this.playbackRate,
        isPaused: this.isPaused
      };
    }

    getDurationSec() {
      if (!this.startTime) return 0;
      return Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
    }

    setStream(stream) {
      if (this.activeStream === stream && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        return;
      }
      this.stop();
      this.activeStream = stream;
      this.recordedChunks = [];
      this.startTime = Date.now();
      this.isLive = true;
      this.seekOffsetSec = 0;
      this.isPaused = false;
      this.playbackRate = 1.0;

      if (!stream) {
        this.notify();
        return;
      }

      try {
        const mimeCandidates = [
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ];
        let chosenMime = '';
        for (const m of mimeCandidates) {
          if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
            chosenMime = m;
            break;
          }
        }
        const options = chosenMime ? { mimeType: chosenMime } : {};
        this.mediaRecorder = new MediaRecorder(stream, options);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
            // Batasi buffer rolling maksimal 20 menit agar hemat memori
            if (this.recordedChunks.length > 1200) {
              this.recordedChunks.splice(0, 100);
            }
          }
        };

        this.mediaRecorder.start(1000); // 1-second chunks
      } catch (e) {
        console.warn('Gagal menginisialisasi MediaRecorder DVR:', e);
      }

      if (!this.tickerInterval) {
        this.tickerInterval = setInterval(() => {
          this.durationSec = this.getDurationSec();
          this.notify();
        }, 500);
      }

      this.notify();
    }

    stop() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (e) {}
      }
      this.mediaRecorder = null;
      if (this.currentBlobUrl) {
        try {
          URL.revokeObjectURL(this.currentBlobUrl);
        } catch (e) {}
        this.currentBlobUrl = null;
      }
      if (this.tickerInterval) {
        clearInterval(this.tickerInterval);
        this.tickerInterval = null;
      }
    }

    getReplayBlobUrl(forceRecompile = false) {
      const now = Date.now();
      if (!forceRecompile && this.currentBlobUrl && now - this.lastBlobCompiledAt < 3000) {
        return this.currentBlobUrl;
      }
      if (!this.recordedChunks.length) return null;

      try {
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
        }
        const mime = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        this.currentBlobUrl = URL.createObjectURL(blob);
        this.lastBlobCompiledAt = now;
        return this.currentBlobUrl;
      } catch (e) {
        return null;
      }
    }

    seekToOffset(offsetSec, broadcast = true) {
      const total = this.getDurationSec();
      const safeOffset = Math.max(0, Math.min(total - 1, Number(offsetSec) || 0));

      // Jika offset mendekati 0 (kurang dari 1.5 detik dari ujung terbaru), kembali ke LIVE
      if (safeOffset <= 1.5) {
        this.returnToLive(broadcast);
        return;
      }

      this.isLive = false;
      this.seekOffsetSec = safeOffset;
      this.notify();

      if (broadcast && dvrBroadcastChannel) {
        dvrBroadcastChannel.postMessage({
          type: 'DVR_SEEK',
          seekOffsetSec: this.seekOffsetSec,
          playbackRate: this.playbackRate
        });
      }
    }

    seekToFraction(fraction, broadcast = true) {
      const frac = Math.max(0, Math.min(1, Number(fraction) || 0));
      const total = this.getDurationSec();

      // Jika slider berada di 98% ke atas, otomatis kembali ke LIVE real-time
      if (frac >= 0.98) {
        this.returnToLive(broadcast);
        return;
      }

      const targetPos = frac * total;
      const offset = Math.max(2, total - targetPos);
      this.seekToOffset(offset, broadcast);
    }

    returnToLive(broadcast = true) {
      this.isLive = true;
      this.seekOffsetSec = 0;
      this.isPaused = false;
      this.notify();

      if (broadcast && dvrBroadcastChannel) {
        dvrBroadcastChannel.postMessage({
          type: 'DVR_RETURN_LIVE'
        });
      }
    }

    stepSeconds(deltaSec, broadcast = true) {
      const total = this.getDurationSec();
      if (this.isLive) {
        if (deltaSec < 0) {
          this.seekToOffset(Math.abs(deltaSec), broadcast);
        }
        return;
      }

      const newOffset = this.seekOffsetSec - deltaSec;
      if (newOffset <= 1.5) {
        this.returnToLive(broadcast);
      } else {
        this.seekToOffset(Math.max(2, Math.min(total - 1, newOffset)), broadcast);
      }
    }

    setPlaybackRate(rate, broadcast = true) {
      this.playbackRate = Number(rate) || 1.0;
      this.notify();

      if (broadcast && dvrBroadcastChannel) {
        dvrBroadcastChannel.postMessage({
          type: 'DVR_SET_SPEED',
          playbackRate: this.playbackRate
        });
      }
    }

    togglePlayPause(broadcast = true) {
      if (this.isLive) return;
      this.isPaused = !this.isPaused;
      this.notify();

      if (broadcast && dvrBroadcastChannel) {
        dvrBroadcastChannel.postMessage({
          type: 'DVR_TOGGLE_PAUSE',
          isPaused: this.isPaused
        });
      }
    }

    handleBroadcastMessage(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'DVR_SEEK') {
        this.seekToOffset(msg.seekOffsetSec, false);
        if (msg.playbackRate) this.setPlaybackRate(msg.playbackRate, false);
      } else if (msg.type === 'DVR_RETURN_LIVE') {
        this.returnToLive(false);
      } else if (msg.type === 'DVR_SET_SPEED') {
        this.setPlaybackRate(msg.playbackRate, false);
      } else if (msg.type === 'DVR_TOGGLE_PAUSE') {
        this.isPaused = Boolean(msg.isPaused);
        this.notify();
      }
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    registerMountedPlayer(player) {
      this.mountedPlayers.add(player);
      return () => this.mountedPlayers.delete(player);
    }
  }

  const dvrEngineInstance = new DvrManager();

  function formatTimeMMSS(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  /**
   * Bind YouTube Live DVR Player UI on container element
   */
  class MountedDvrPlayer {
    constructor(containerEl, engine) {
      this.container = containerEl;
      this.engine = engine;
      this.isUserDragging = false;

      this.videoLive = containerEl.querySelector('.bc-cam-video-live') || containerEl.querySelector('video:not(.bc-cam-video-replay)');
      this.videoReplay = containerEl.querySelector('.bc-cam-video-replay');
      this.varBadge = containerEl.querySelector('.bc-cam-var-badge');
      this.varOffsetText = containerEl.querySelector('.bc-var-offset-text');
      this.varSpeedTag = containerEl.querySelector('.bc-var-speed-tag');

      this.slider = containerEl.querySelector('.bc-yt-scrubber-slider');
      this.scrubberPlayed = containerEl.querySelector('.bc-yt-scrubber-played');
      this.scrubberHandle = containerEl.querySelector('.bc-yt-scrubber-handle');
      this.livePill = containerEl.querySelector('.bc-yt-live-pill');
      this.currentTimeEl = containerEl.querySelector('.bc-yt-current-time');
      this.durationEl = containerEl.querySelector('.bc-yt-duration');
      this.playPauseBtn = containerEl.querySelector('.bc-yt-play-pause-btn');
      this.iconPlay = containerEl.querySelector('.icon-play');
      this.iconPause = containerEl.querySelector('.icon-pause');
      this.returnLiveBtn = containerEl.querySelector('.bc-yt-return-live-btn');

      this.bindEvents();
      this.unregister = engine.registerMountedPlayer(this);
    }

    bindEvents() {
      if (this.slider) {
        this.slider.addEventListener('mousedown', () => {
          this.isUserDragging = true;
        });
        this.slider.addEventListener('touchstart', () => {
          this.isUserDragging = true;
        });
        this.slider.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          const total = this.engine.getDurationSec();
          const targetPos = (val / 100) * total;
          const offset = Math.max(0, total - targetPos);

          if (this.scrubberPlayed) this.scrubberPlayed.style.width = `${val}%`;
          if (this.scrubberHandle) this.scrubberHandle.style.left = `${val}%`;

          if (val >= 98) {
            if (this.currentTimeEl) this.currentTimeEl.textContent = 'LIVE';
          } else {
            if (this.currentTimeEl) this.currentTimeEl.textContent = `-${formatTimeMMSS(offset)}`;
          }
        });

        this.slider.addEventListener('change', (e) => {
          this.isUserDragging = false;
          const val = Number(e.target.value);
          this.engine.seekToFraction(val / 100, true);
        });

        this.slider.addEventListener('mouseup', () => {
          this.isUserDragging = false;
        });
        this.slider.addEventListener('touchend', () => {
          this.isUserDragging = false;
        });
      }

      if (this.livePill) {
        this.livePill.addEventListener('click', (e) => {
          e.preventDefault();
          this.engine.returnToLive(true);
        });
      }

      if (this.returnLiveBtn) {
        this.returnLiveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.engine.returnToLive(true);
        });
      }

      if (this.playPauseBtn) {
        this.playPauseBtn.addEventListener('click', () => {
          this.engine.togglePlayPause(true);
        });
      }

      this.container.querySelectorAll('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.getAttribute('data-step')) || 0;
          this.engine.stepSeconds(delta, true);
        });
      });

      this.container.querySelectorAll('[data-yt-speed]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const spd = Number(btn.getAttribute('data-yt-speed')) || 1.0;
          this.engine.setPlaybackRate(spd, true);
        });
      });
    }

    updateUI(state) {
      const { isLive, durationSec, seekOffsetSec, currentPosSec, playbackRate, isPaused } = state;
      const totalDur = durationSec || 1;

      // 1. Switch Video Elements (Live vs VAR Replay)
      if (isLive) {
        if (this.videoLive) this.videoLive.style.display = 'block';
        if (this.videoReplay) {
          this.videoReplay.style.display = 'none';
          this.videoReplay.pause();
        }
        if (this.varBadge) this.varBadge.style.display = 'none';
        if (this.returnLiveBtn) this.returnLiveBtn.style.display = 'none';

        if (this.livePill) {
          this.livePill.classList.add('is-live');
          const lbl = this.livePill.querySelector('.bc-yt-live-label');
          if (lbl) lbl.textContent = 'LIVE';
        }

        if (this.currentTimeEl) this.currentTimeEl.textContent = 'LIVE';
        if (this.durationEl) this.durationEl.textContent = formatTimeMMSS(totalDur);

        if (!this.isUserDragging && this.slider) {
          this.slider.value = 100;
          if (this.scrubberPlayed) this.scrubberPlayed.style.width = '100%';
          if (this.scrubberHandle) this.scrubberHandle.style.left = '100%';
        }
      } else {
        // MODE VAR REPLAY
        if (this.videoLive) this.videoLive.style.display = 'none';
        if (this.videoReplay) {
          this.videoReplay.style.display = 'block';
          const blobUrl = this.engine.getReplayBlobUrl(false);
          if (blobUrl && this.videoReplay.src !== blobUrl) {
            this.videoReplay.src = blobUrl;
          }
          const targetTime = Math.max(0, totalDur - seekOffsetSec);
          if (Math.abs((this.videoReplay.currentTime || 0) - targetTime) > 1.2) {
            try {
              this.videoReplay.currentTime = targetTime;
            } catch (e) {}
          }
          this.videoReplay.playbackRate = playbackRate || 1.0;
          if (isPaused) {
            this.videoReplay.pause();
          } else {
            this.videoReplay.play().catch(() => {});
          }
        }

        if (this.varBadge) {
          this.varBadge.style.display = 'inline-flex';
          if (this.varOffsetText) this.varOffsetText.textContent = `-${formatTimeMMSS(seekOffsetSec)}`;
          if (this.varSpeedTag) {
            if (playbackRate < 1.0) {
              this.varSpeedTag.style.display = 'inline-block';
              this.varSpeedTag.textContent = `${playbackRate}x`;
            } else {
              this.varSpeedTag.style.display = 'none';
            }
          }
        }

        if (this.returnLiveBtn) this.returnLiveBtn.style.display = 'inline-block';

        if (this.livePill) {
          this.livePill.classList.remove('is-live');
          const lbl = this.livePill.querySelector('.bc-yt-live-label');
          if (lbl) lbl.textContent = `-${formatTimeMMSS(seekOffsetSec)}`;
        }

        if (this.currentTimeEl) this.currentTimeEl.textContent = `-${formatTimeMMSS(seekOffsetSec)}`;
        if (this.durationEl) this.durationEl.textContent = formatTimeMMSS(totalDur);

        if (!this.isUserDragging && this.slider) {
          const frac = Math.max(0, Math.min(1, currentPosSec / totalDur));
          const pct = (frac * 100).toFixed(1);
          this.slider.value = pct;
          if (this.scrubberPlayed) this.scrubberPlayed.style.width = `${pct}%`;
          if (this.scrubberHandle) this.scrubberHandle.style.left = `${pct}%`;
        }
      }

      // 2. Play / Pause Icons
      if (this.iconPlay && this.iconPause) {
        if (isLive || !isPaused) {
          this.iconPlay.style.display = 'none';
          this.iconPause.style.display = 'inline-block';
        } else {
          this.iconPlay.style.display = 'inline-block';
          this.iconPause.style.display = 'none';
        }
      }

      // 3. Speed Buttons Active State
      this.container.querySelectorAll('[data-yt-speed]').forEach((btn) => {
        const spd = Number(btn.getAttribute('data-yt-speed')) || 1.0;
        btn.classList.toggle('active', Math.abs(spd - playbackRate) < 0.05);
      });
    }

    destroy() {
      if (this.unregister) this.unregister();
    }
  }

  function attachToPlayer(containerEl, stream) {
    if (!containerEl) return null;
    if (stream) {
      dvrEngineInstance.setStream(stream);
    }
    return new MountedDvrPlayer(containerEl, dvrEngineInstance);
  }

  window.KSTIDvr = {
    engine: dvrEngineInstance,
    formatTimeMMSS,
    attachToPlayer
  };
})();
