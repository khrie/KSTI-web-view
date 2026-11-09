/**
 * KSTI 2026 - Search and Rescue (SAR)
 * Operator Control Panel, Live Scoring, Dual Timers (Preparation & Lomba) & 12-Team Manager
 */

(function () {
  const store = window.KSTIStore;
  let lastStructuralSig = '';

  // -------------------- TAB SWITCHING --------------------
  const tabBtns = document.querySelectorAll('.op-tab-btn');
  const tabPanes = document.querySelectorAll('.op-tab-pane');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
      tabPanes.forEach((p) => p.classList.toggle('active', p.id === targetId));
    });
  });

  // -------------------- MINI PREVIEW IFRAME SCALER --------------------
  const miniWrap = document.getElementById('opMiniPreviewWrap');
  const miniIframe = document.getElementById('opMiniPreviewIframe');

  function fitMiniPreview() {
    if (!miniWrap || !miniIframe) return;
    const w = miniWrap.clientWidth || 350;
    const scale = w / 1280;
    miniIframe.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fitMiniPreview);
  setTimeout(fitMiniPreview, 50);

  // -------------------- OPEN DISPLAY WINDOW --------------------
  const btnOpenDisplayPopup = document.getElementById('btnOpenDisplayPopup');
  const btnSidebarOpenDisplay = document.getElementById('btnSidebarOpenDisplay');
  [btnOpenDisplayPopup, btnSidebarOpenDisplay].forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        store.openDisplayWindow();
      });
    }
  });

  // -------------------- HELPER: LOAD OR ACTIVATE A RUN --------------------
  function applyRunSelectionToState(next, runObj, options = {}) {
    if (!runObj) return;
    next.activeRun = {
      runCode: runObj.code,
      runNo: runObj.runNo,
      teamId: runObj.teamId,
      trialIndex: runObj.trialIndex,
      session: runObj.session
    };

    const team = next.teams.find((t) => t.id === runObj.teamId);
    const savedTrial = team && team.trials && team.trials[runObj.trialIndex];

    if (!options.forceResetScore && savedTrial && savedTrial.completed && savedTrial.scoringSnapshot) {
      next.scoring = Object.assign(
        window.createEmptyScoringFor(runObj.teamId, runObj.trialIndex, runObj.code),
        JSON.parse(JSON.stringify(savedTrial.scoringSnapshot)),
        {
          activeRunCode: runObj.code,
          activeTeamId: runObj.teamId,
          trialIndex: runObj.trialIndex
        }
      );
    } else {
      next.scoring = window.createEmptyScoringFor(runObj.teamId, runObj.trialIndex, runObj.code);
    }

    if (options.resetTimers) {
      next.prepTimer = {
        durationSec: 180,
        remainingSec: 180,
        baseRemainingSec: 180,
        isRunning: false,
        startedAt: null
      };
      next.matchTimer = {
        durationSec: 300,
        remainingSec: 300,
        baseRemainingSec: 300,
        isRunning: false,
        startedAt: null,
        retryTimestampSec: null
      };
    }

    if (options.switchToScene) {
      next.activeScene = options.switchToScene;
    }
  }

  function syncScoringIntoTrial(next, forceCompleted = false) {
    const calc = window.calculateSARScore(next.scoring, next.matchTimer);
    const team = next.teams.find((t) => t.id === next.scoring.activeTeamId);
    const tIdx = Number(next.scoring.trialIndex) || 0;
    if (!team || !team.trials) return;

    const anyChecked =
      forceCompleted ||
      next.scoring.keluarHome ||
      next.scoring.r1 !== 'none' ||
      next.scoring.r2 !== 'none' ||
      next.scoring.bonusFinishChecked ||
      Object.values(next.scoring.missions || {}).some((m) => m && (m.lifted || m.safeZone));

    team.trials[tIdx] = {
      completed: anyChecked,
      rawScore: calc.rawScore,
      bonusPoints: calc.bonusPoints,
      finalScore: calc.finalScore,
      bonusFinish: calc.bonusActive,
      timeSec: calc.timeSec,
      retryUsed: next.scoring.retryCount > 0,
      scoringSnapshot: JSON.parse(JSON.stringify(next.scoring))
    };
  }

  // -------------------- SURVIVOR RANDOMIZER ENGINE --------------------
  function generateK1Slots() {
    const realIndex = Math.floor(Math.random() * 3);
    const slots = ['dummy', 'dummy', 'dummy'];
    slots[realIndex] = 'real';
    return { slots, realIndex };
  }

  function generateK2Slots() {
    const realIndex = Math.floor(Math.random() * 2);
    const slots = ['dummy', 'dummy'];
    slots[realIndex] = 'real';
    return { slots, realIndex };
  }

  let rollInterval = null;
  function runAnimatedRandomizer(mode = 'both') {
    if (rollInterval) clearInterval(rollInterval);
    let step = 0;
    const totalSteps = 12;

    rollInterval = setInterval(() => {
      step++;
      const isFinal = step >= totalSteps;

      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.randomizer.isRolling = !isFinal;
        next.randomizer.rollId = Date.now() + step;

        if (mode === 'both' || mode === 'k1') {
          next.randomizer.k1 = generateK1Slots();
        }
        if (mode === 'both' || mode === 'k2') {
          next.randomizer.k2 = generateK2Slots();
        }

        if (isFinal) {
          const posNames3 = ['KIRI', 'TENGAH', 'KANAN'];
          const posNames2 = ['KIRI', 'KANAN'];
          const activeTeam = next.teams.find((t) => t.id === (next.scoring.activeTeamId || next.activeRun.teamId)) || next.teams[0];
          const entry = {
            id: Date.now(),
            teamName: activeTeam ? activeTeam.name : '-',
            session: `Percobaan ${(Number(next.scoring.trialIndex) || 0) + 1}`,
            k1RealPos: posNames3[next.randomizer.k1.realIndex],
            k2RealPos: posNames2[next.randomizer.k2.realIndex],
            k1: JSON.parse(JSON.stringify(next.randomizer.k1)),
            k2: JSON.parse(JSON.stringify(next.randomizer.k2))
          };
          next.randomizer.history = [entry, ...(next.randomizer.history || [])].slice(0, 25);
        }
        return next;
      });

      if (isFinal) {
        clearInterval(rollInterval);
        rollInterval = null;
      }
    }, 90);
  }

  const btnRandomizeAll = document.getElementById('btnRandomizeAll');
  if (btnRandomizeAll) btnRandomizeAll.addEventListener('click', () => runAnimatedRandomizer('both'));

  const btnRandomizeK1 = document.getElementById('btnRandomizeK1');
  if (btnRandomizeK1) btnRandomizeK1.addEventListener('click', () => runAnimatedRandomizer('k1'));

  const btnRandomizeK2 = document.getElementById('btnRandomizeK2');
  if (btnRandomizeK2) btnRandomizeK2.addEventListener('click', () => runAnimatedRandomizer('k2'));

  const btnPushRandomizerScene = document.getElementById('btnPushRandomizerScene');
  if (btnPushRandomizerScene) {
    btnPushRandomizerScene.addEventListener('click', () => {
      store.setState((prev) => Object.assign({}, prev, { activeScene: 'randomizer' }));
    });
  }

  const btnClearRandHistory = document.getElementById('btnClearRandHistory');
  if (btnClearRandHistory) {
    btnClearRandHistory.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.randomizer.history = [];
        return next;
      });
    });
  }

  function renderOperatorRandomizerSlots(state) {
    const k1Container = document.getElementById('opK1SlotsContainer');
    const k2Container = document.getElementById('opK2SlotsContainer');
    const arenaContainer = document.getElementById('opArenaMapContainer');
    const histContainer = document.getElementById('opRandHistoryContainer');

    const posLabels3 = ['KIRI', 'TENGAH', 'KANAN'];
    const posLabels2 = ['KIRI', 'KANAN'];

    if (k1Container) {
      k1Container.innerHTML = state.randomizer.k1.slots
        .map((type, idx) => `
          <div class="op-slot-item ${type === 'real' ? 'is-real' : 'is-dummy'}" data-set-k1="${idx}">
            <div class="op-slot-pos">${posLabels3[idx]}</div>
            ${window.getVictimSVG(type, 50)}
            <div class="op-slot-badge">
              ${type === 'real' ? 'KORBAN ASLI' : 'DUMMY'}
            </div>
          </div>
        `)
        .join('');

      k1Container.querySelectorAll('[data-set-k1]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-set-k1'));
          const slots = ['dummy', 'dummy', 'dummy'];
          slots[idx] = 'real';
          store.setState((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.randomizer.k1 = { slots, realIndex: idx };
            return next;
          });
        });
      });
    }

    if (k2Container) {
      k2Container.innerHTML = state.randomizer.k2.slots
        .map((type, idx) => `
          <div class="op-slot-item ${type === 'real' ? 'is-real' : 'is-dummy'}" data-set-k2="${idx}">
            <div class="op-slot-pos">${posLabels2[idx]}</div>
            ${window.getVictimSVG(type, 50)}
            <div class="op-slot-badge">
              ${type === 'real' ? 'KORBAN ASLI' : 'DUMMY'}
            </div>
          </div>
        `)
        .join('');

      k2Container.querySelectorAll('[data-set-k2]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-set-k2'));
          const slots = ['dummy', 'dummy'];
          slots[idx] = 'real';
          store.setState((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.randomizer.k2 = { slots, realIndex: idx };
            return next;
          });
        });
      });
    }

    if (arenaContainer) {
      arenaContainer.innerHTML = window.renderArenaMapSVG(state);
    }

    if (histContainer) {
      const history = state.randomizer.history || [];
      if (history.length === 0) {
        histContainer.innerHTML = `<div style="color:#64748b;font-size:12.5px;padding:6px 0;">Belum ada riwayat undian pada sesi ini.</div>`;
      } else {
        histContainer.innerHTML = `
          <table class="bc-sb-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Nama Tim</th>
                <th>Sesi</th>
                <th>Korban Asli K-1</th>
                <th>Korban Asli K-2</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${history.map((h, i) => `
                <tr>
                  <td><strong>${h.teamName || '-'}</strong></td>
                  <td>${h.session || '-'}</td>
                  <td><span style="background:#f0fdf4;border:1px solid #16a34a;color:#14532d;padding:2px 8px;border-radius:3px;">${h.k1RealPos}</span></td>
                  <td><span style="background:#f0fdf4;border:1px solid #16a34a;color:#14532d;padding:2px 8px;border-radius:3px;">${h.k2RealPos}</span></td>
                  <td>
                    <button type="button" class="btn btn-outline btn-sm" data-restore-hist="${i}">
                      Terapkan
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        histContainer.querySelectorAll('[data-restore-hist]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-restore-hist'));
            const item = history[idx];
            if (!item) return;
            store.setState((prev) => {
              const next = JSON.parse(JSON.stringify(prev));
              next.randomizer.k1 = item.k1;
              next.randomizer.k2 = item.k2;
              return next;
            });
          });
        });
      }
    }
  }

  // -------------------- SEPARATE TIMERS: PREPARATION (180s) & LOMBA (300s) --------------------
  const btnPrepStartPause = document.getElementById('btnPrepStartPause');
  const btnPrepReset = document.getElementById('btnPrepReset');
  const btnMatchStartPause = document.getElementById('btnMatchStartPause');
  const btnMatchReset = document.getElementById('btnMatchReset');
  const btnRecordRetry = document.getElementById('btnRecordRetry');

  if (btnPrepStartPause) {
    btnPrepStartPause.addEventListener('click', () => {
      const st = store.getState();
      if (!st.prepTimer.isRunning) {
        store.setState((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          if (next.prepTimer.remainingSec <= 0) {
            next.prepTimer.remainingSec = 180;
          }
          next.prepTimer.isRunning = true;
          next.prepTimer.startedAt = Date.now();
          next.prepTimer.baseRemainingSec = next.prepTimer.remainingSec;
          next.activeTimerType = 'prep';
          return next;
        });
      } else {
        store.setState((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          next.prepTimer.isRunning = false;
          next.prepTimer.startedAt = null;
          next.prepTimer.baseRemainingSec = next.prepTimer.remainingSec;
          return next;
        });
      }
    });
  }

  if (btnPrepReset) {
    btnPrepReset.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.prepTimer = {
          durationSec: 180,
          remainingSec: 180,
          baseRemainingSec: 180,
          isRunning: false,
          startedAt: null
        };
        next.activeTimerType = 'prep';
        return next;
      });
    });
  }

  if (btnMatchStartPause) {
    btnMatchStartPause.addEventListener('click', () => {
      const st = store.getState();
      if (!st.matchTimer.isRunning) {
        store.setState((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          if (next.prepTimer && next.prepTimer.isRunning) {
            next.prepTimer.isRunning = false;
            next.prepTimer.startedAt = null;
            next.prepTimer.baseRemainingSec = next.prepTimer.remainingSec;
          }
          if (next.matchTimer.remainingSec <= 0) {
            next.matchTimer.remainingSec = 300;
          }
          // Jika mulai lomba dari awal/lanjut, pastikan centang Finish dibuka kembali bila waktu masih berjalan
          next.matchTimer.isRunning = true;
          next.matchTimer.startedAt = Date.now();
          next.matchTimer.baseRemainingSec = next.matchTimer.remainingSec;
          next.activeTimerType = 'match';
          return next;
        });

        const autoRecChk = document.getElementById('chkAutoRecordOnMatch');
        if (! autoRecChk || autoRecChk.checked) {
          startCameraRecording('Timer Lomba Dimulai');
        }
      } else {
        store.setState((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          if (next.matchTimer.isRunning && next.matchTimer.startedAt) {
            const elapsed = (Date.now() - next.matchTimer.startedAt) / 1000;
            next.matchTimer.remainingSec = Math.max(0, Math.ceil(next.matchTimer.baseRemainingSec - elapsed));
          }
          next.matchTimer.isRunning = false;
          next.matchTimer.startedAt = null;
          next.matchTimer.baseRemainingSec = next.matchTimer.remainingSec;
          if (next.scoring.bonusFinishChecked) {
            next.scoring.finishTimeSec = window.getMatchTimerElapsedSec(next.matchTimer, next.scoring.finishTimeSec || 180);
            syncScoringIntoTrial(next, false);
          }
          return next;
        });

        if (isCameraRecording()) {
          stopAndSaveCameraRecording('Timer Lomba Dihentikan');
        }
      }
    });
  }

  if (btnMatchReset) {
    btnMatchReset.addEventListener('click', () => {
      if (isCameraRecording()) {
        stopAndSaveCameraRecording('Reset Timer Lomba');
      }
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.matchTimer = {
          durationSec: 300,
          remainingSec: 300,
          baseRemainingSec: 300,
          isRunning: false,
          startedAt: null,
          retryTimestampSec: null
        };
        next.activeTimerType = 'match';
        return next;
      });
    });
  }

  if (btnRecordRetry) {
    btnRecordRetry.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.matchTimer.retryTimestampSec = next.matchTimer.remainingSec;
        next.scoring.retryCount = 1;
        next.scoring.retryRestartTimeSec = next.matchTimer.remainingSec;
        if (next.scoring.bonusFinishChecked) {
          next.scoring.finishTimeSec = window.getMatchTimerElapsedSec(next.matchTimer, next.scoring.finishTimeSec || 180);
          syncScoringIntoTrial(next, false);
        }
        return next;
      });
    });
  }

  // High-accuracy timer loop (ticks every 100ms)
  setInterval(() => {
    const st = store.getState();
    let prepChanged = false;
    let matchChanged = false;
    let matchExpiredNow = false;
    let newPrepRem = st.prepTimer ? st.prepTimer.remainingSec : 180;
    let newMatchRem = st.matchTimer ? st.matchTimer.remainingSec : 300;

    if (st.prepTimer && st.prepTimer.isRunning && st.prepTimer.startedAt) {
      const elapsed = (Date.now() - st.prepTimer.startedAt) / 1000;
      const rem = Math.max(0, Math.ceil(st.prepTimer.baseRemainingSec - elapsed));
      if (rem !== st.prepTimer.remainingSec) {
        newPrepRem = rem;
        prepChanged = true;
      }
    }

    if (st.matchTimer && st.matchTimer.isRunning && st.matchTimer.startedAt) {
      const elapsed = (Date.now() - st.matchTimer.startedAt) / 1000;
      const rem = Math.max(0, Math.ceil(st.matchTimer.baseRemainingSec - elapsed));
      if (rem !== st.matchTimer.remainingSec) {
        newMatchRem = rem;
        matchChanged = true;
        if (rem <= 0) matchExpiredNow = true;
      }
    }

    if (prepChanged || matchChanged) {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        if (prepChanged) {
          next.prepTimer.remainingSec = newPrepRem;
          if (newPrepRem <= 0) {
            next.prepTimer.isRunning = false;
            next.prepTimer.startedAt = null;
          }
        }
        if (matchChanged) {
          next.matchTimer.remainingSec = newMatchRem;
          if (newMatchRem <= 0) {
            next.matchTimer.isRunning = false;
            next.matchTimer.startedAt = null;
          }
        }
        return next;
      });

      if (matchExpiredNow && isCameraRecording()) {
        stopAndSaveCameraRecording('Waktu Lomba Habis (300s)');
      }
    }
  }, 100);

  // -------------------- ACTIVE TEAM (1 ENTRY PER TEAM) & SESSION CONTROLS --------------------
  const selScoreTeam = document.getElementById('selScoreTeam');
  const selScoreTrial = document.getElementById('selScoreTrial');
  const btnPrevRunTop = document.getElementById('btnPrevRunTop');
  const btnNextRunTop = document.getElementById('btnNextRunTop');
  const btnPushLiveMatchDirect = document.getElementById('btnPushLiveMatchDirect');

  if (selScoreTeam) {
    selScoreTeam.addEventListener('change', (e) => {
      const teamId = e.target.value;
      const st = store.getState();
      const trialIdx = Number(st.scoring.trialIndex) || 0;
      const runObj = window.getRunByTeamAndTrial(teamId, trialIdx);
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        applyRunSelectionToState(next, runObj);
        return next;
      });
    });
  }

  if (selScoreTrial) {
    selScoreTrial.addEventListener('change', (e) => {
      const trialIdx = Number(e.target.value) || 0;
      const st = store.getState();
      const teamId = st.scoring.activeTeamId || 'team_1';
      const runObj = window.getRunByTeamAndTrial(teamId, trialIdx);
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        applyRunSelectionToState(next, runObj);
        return next;
      });
    });
  }

  if (btnPrevRunTop) {
    btnPrevRunTop.addEventListener('click', () => {
      const st = store.getState();
      const prevRun = window.getPrevRun(st.activeRun.runCode);
      if (!prevRun) return;
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        applyRunSelectionToState(next, prevRun);
        return next;
      });
    });
  }

  if (btnNextRunTop) {
    btnNextRunTop.addEventListener('click', () => {
      const st = store.getState();
      const nextRun = window.getNextRun(st.activeRun.runCode);
      if (!nextRun) return;
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        applyRunSelectionToState(next, nextRun);
        return next;
      });
    });
  }

  if (btnPushLiveMatchDirect) {
    btnPushLiveMatchDirect.addEventListener('click', () => {
      store.setState((prev) => Object.assign({}, prev, { activeScene: 'live_match' }));
    });
  }

  document.querySelectorAll('[data-scene-select]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scene = btn.getAttribute('data-scene-select');
      store.setState((prev) => Object.assign({}, prev, { activeScene: scene }));
    });
  });

  // -------------------- SINGLE CAMERA MODE & DEVICE ENUMERATION --------------------
  const selSingleCamMode = document.getElementById('selSingleCamMode');
  const selSingleCamDevice = document.getElementById('selSingleCamDevice');
  const btnRefreshWebcams = document.getElementById('btnRefreshWebcams');

  if (selSingleCamMode) {
    selSingleCamMode.addEventListener('change', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.camera.mode = e.target.value;
        return next;
      });
    });
  }

  if (selSingleCamDevice) {
    selSingleCamDevice.addEventListener('change', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.camera.deviceId = e.target.value;
        return next;
      });
    });
  }

  async function refreshVideoDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(() => {});
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const opts = [
        `<option value="">Kamera Lokal Default</option>`,
        ...videoDevices.map((d, i) => `<option value="${d.deviceId}">${d.label || 'Kamera ' + (i + 1)}</option>`)
      ].join('');
      if (selSingleCamDevice) {
        const st = store.getState();
        selSingleCamDevice.innerHTML = opts;
        if (st.camera && st.camera.deviceId) {
          selSingleCamDevice.value = st.camera.deviceId;
        }
      }
    } catch (e) {}
  }

  if (btnRefreshWebcams) {
    btnRefreshWebcams.addEventListener('click', refreshVideoDevices);
  }
  refreshVideoDevices();

  // -------------------- WINNER & BANNER CONTROLS --------------------
  const selWinnerTeam = document.getElementById('selWinnerTeam');
  const selWinnerPreset = document.getElementById('selWinnerPreset');
  const inpWinnerTitle = document.getElementById('inpWinnerTitle');
  const inpWinnerPrize = document.getElementById('inpWinnerPrize');
  const inpSesaatTitle = document.getElementById('inpSesaatTitle');
  const inpIstirahatTitle = document.getElementById('inpIstirahatTitle');
  const btnShowWinnerNow = document.getElementById('btnShowWinnerNow');

  if (selWinnerTeam) {
    selWinnerTeam.addEventListener('change', (e) => {
      const val = e.target.value;
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        if (val === 'auto_score') {
          next.winner.mode = 'auto_score';
        } else {
          next.winner.mode = 'manual';
          next.winner.teamId = val;
        }
        return next;
      });
    });
  }

  if (selWinnerPreset) {
    selWinnerPreset.addEventListener('change', (e) => {
      const val = e.target.value;
      const presets = {
        juara1: { title: 'WINNER', sub: 'JUARA 1 - KSTI 2026 SEARCH AND RESCUE', prize: 'Medali Emas + Sertifikat + Rp4.000.000,00' },
        juara2: { title: 'JUARA 2', sub: 'JUARA 2 - KSTI 2026 SEARCH AND RESCUE', prize: 'Medali Perak + Sertifikat + Rp3.000.000,00' },
        juara3: { title: 'JUARA 3', sub: 'JUARA 3 - KSTI 2026 SEARCH AND RESCUE', prize: 'Medali Perunggu + Sertifikat + Rp2.000.000,00' },
        winner: { title: 'WINNER', sub: 'PEMENANG PERTANDINGAN - SAR KSTI 2026', prize: 'Kompetisi Robot Search and Rescue KSTI 2026' }
      };
      const p = presets[val] || presets.juara1;
      if (inpWinnerTitle) inpWinnerTitle.value = p.title;
      if (inpWinnerPrize) inpWinnerPrize.value = p.prize;
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.winner.titleText = p.title;
        next.winner.subtitleText = p.sub;
        next.winner.prizeText = p.prize;
        return next;
      });
    });
  }

  if (inpWinnerTitle) {
    inpWinnerTitle.addEventListener('input', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.winner.titleText = e.target.value;
        return next;
      });
    });
  }
  if (inpWinnerPrize) {
    inpWinnerPrize.addEventListener('input', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.winner.prizeText = e.target.value;
        return next;
      });
    });
  }
  if (inpSesaatTitle) {
    inpSesaatTitle.addEventListener('input', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.banners.sesaatLagiTitle = e.target.value;
        return next;
      });
    });
  }
  if (inpIstirahatTitle) {
    inpIstirahatTitle.addEventListener('input', (e) => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.banners.istirahatTitle = e.target.value;
        return next;
      });
    });
  }
  if (btnShowWinnerNow) {
    btnShowWinnerNow.addEventListener('click', () => {
      store.setState((prev) => Object.assign({}, prev, { activeScene: 'winner' }));
    });
  }

  // -------------------- REAL-TIME SCORING & AUTO FINISH CHECK --------------------
  const chkKeluarHome = document.getElementById('chkKeluarHome');
  const chkR1WithoutVictim = document.getElementById('chkR1WithoutVictim');
  const chkR1WithVictim = document.getElementById('chkR1WithVictim');
  const chkR2WithoutVictim = document.getElementById('chkR2WithoutVictim');
  const chkR2WithVictim = document.getElementById('chkR2WithVictim');
  const chkBonusFinish = document.getElementById('chkBonusFinish');
  const inpFinishTimeSec = document.getElementById('inpFinishTimeSec');
  const btnCheckAll5AndBonus = document.getElementById('btnCheckAll5AndBonus');
  const btnResetCurrentScore = document.getElementById('btnResetCurrentScore');
  const btnSaveTrialScore = document.getElementById('btnSaveTrialScore');
  const btnSaveAndNextRun = document.getElementById('btnSaveAndNextRun');
  const btnPushScoreboardScene = document.getElementById('btnPushScoreboardScene');

  function updateScoringLive(mutator) {
    store.setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      mutator(next.scoring, next);
      syncScoringIntoTrial(next, false);
      return next;
    });
  }

  function renderMissionsChecklist(state) {
    const container = document.getElementById('opMissionsChecklist');
    if (!container) return;
    const missions = state.scoring.missions || {};
    const labels = [
      { key: 'k1', title: '2a. Misi Korban K-1 ke SZ-1', sub: 'K-1 menuju SZ-1' },
      { key: 'k2', title: '2b. Misi Korban K-2 ke SZ-2', sub: 'K-2 menuju SZ-2' },
      { key: 'k3', title: '2c. Misi Korban K-3 ke SZ-3', sub: 'K-3 menuju SZ-3' },
      { key: 'k4', title: '2d. Misi Korban K-4 ke SZ-4', sub: 'K-4 menuju SZ-4' },
      { key: 'k5', title: '2e. Misi Korban K-5 ke SZ-5', sub: 'K-5 menuju SZ-5' }
    ];

    container.innerHTML = labels
      .map((item) => {
        const m = missions[item.key] || { lifted: false, safeZone: false };
        return `
          <div class="op-score-row" style="margin-bottom:5px;">
            <div>
              <strong>${item.title}</strong>
              <div class="op-score-sub">${item.sub}</div>
            </div>
            <div class="op-check-group">
              <label class="op-check-label">
                <input type="checkbox" data-mission-lifted="${item.key}" ${m.lifted ? 'checked' : ''} />
                <span>Angkat Keluar (+50)</span>
              </label>
              <label class="op-check-label">
                <input type="checkbox" data-mission-sz="${item.key}" ${m.safeZone ? 'checked' : ''} />
                <span>Masuk SZ (+50)</span>
              </label>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-mission-lifted]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const k = chk.getAttribute('data-mission-lifted');
        updateScoringLive((sc) => {
          sc.missions[k].lifted = e.target.checked;
          if (!e.target.checked) sc.missions[k].safeZone = false;
        });
      });
    });

    container.querySelectorAll('[data-mission-sz]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const k = chk.getAttribute('data-mission-sz');
        updateScoringLive((sc) => {
          sc.missions[k].safeZone = e.target.checked;
          if (e.target.checked) sc.missions[k].lifted = true;
        });
      });
    });
  }

  if (chkKeluarHome) {
    chkKeluarHome.addEventListener('change', (e) => {
      updateScoringLive((sc) => {
        sc.keluarHome = e.target.checked;
      });
    });
  }

  if (chkR1WithoutVictim) {
    chkR1WithoutVictim.addEventListener('change', (e) => {
      updateScoringLive((sc) => {
        sc.r1 = e.target.checked ? 'without_victim' : 'none';
      });
    });
  }

  if (chkR1WithVictim) {
    chkR1WithVictim.addEventListener('change', (e) => {
      updateScoringLive((sc) => {
        sc.r1 = e.target.checked ? 'with_victim' : 'none';
      });
    });
  }

  if (chkR2WithoutVictim) {
    chkR2WithoutVictim.addEventListener('change', (e) => {
      updateScoringLive((sc) => {
        sc.r2 = e.target.checked ? 'without_victim' : 'none';
      });
    });
  }

  if (chkR2WithVictim) {
    chkR2WithVictim.addEventListener('change', (e) => {
      updateScoringLive((sc) => {
        sc.r2 = e.target.checked ? 'with_victim' : 'none';
      });
    });
  }

  function stopMatchTimerOnFinish(fullState, sc) {
    if (fullState.matchTimer) {
      let rem = Number(fullState.matchTimer.remainingSec);
      const wasRunning = Boolean(fullState.matchTimer.isRunning && fullState.matchTimer.startedAt);
      if (wasRunning) {
        const elapsedLive = (Date.now() - fullState.matchTimer.startedAt) / 1000;
        rem = Math.max(0, Math.ceil((fullState.matchTimer.baseRemainingSec || 300) - elapsedLive));
      }
      fullState.matchTimer.remainingSec = rem;
      fullState.matchTimer.baseRemainingSec = rem;
      fullState.matchTimer.isRunning = false;
      fullState.matchTimer.startedAt = null;

      const startRef = Number(fullState.matchTimer.retryTimestampSec) || Number(fullState.matchTimer.durationSec) || 300;
      const used = Math.round(startRef - rem);
      if (used > 0) {
        sc.finishTimeSec = Math.max(1, Math.min(299, used));
      } else if (wasRunning) {
        sc.finishTimeSec = 1;
      } else {
        const inpVal = inpFinishTimeSec ? Number(inpFinishTimeSec.value) : 0;
        sc.finishTimeSec = Math.max(1, Math.min(299, inpVal || Number(sc.finishTimeSec) || 180));
      }
    }
    if (fullState.prepTimer && fullState.prepTimer.isRunning) {
      fullState.prepTimer.isRunning = false;
      fullState.prepTimer.startedAt = null;
      fullState.prepTimer.baseRemainingSec = fullState.prepTimer.remainingSec;
    }
  }

  if (chkBonusFinish) {
    chkBonusFinish.addEventListener('change', (e) => {
      const checked = Boolean(e.target.checked);
      updateScoringLive((sc, fullState) => {
        sc.bonusFinishChecked = checked;
        sc.reachedFinish = checked;
        if (checked) {
          stopMatchTimerOnFinish(fullState, sc);
        }
      });
      if (checked && isCameraRecording()) {
        stopAndSaveCameraRecording('Finish Diklik');
      }
    });
  }

  if (inpFinishTimeSec) {
    inpFinishTimeSec.addEventListener('input', (e) => {
      const val = Math.max(1, Math.min(299, Number(e.target.value) || 180));
      updateScoringLive((sc) => {
        sc.finishTimeSec = val;
      });
    });
  }

  if (btnCheckAll5AndBonus) {
    btnCheckAll5AndBonus.addEventListener('click', () => {
      updateScoringLive((sc, fullState) => {
        sc.keluarHome = true;
        ['k1', 'k2', 'k3', 'k4', 'k5'].forEach((k) => {
          sc.missions[k] = { lifted: true, safeZone: true };
        });
        sc.bonusFinishChecked = true;
        sc.reachedFinish = true;
        stopMatchTimerOnFinish(fullState, sc);
      });
      if (isCameraRecording()) {
        stopAndSaveCameraRecording('5 Misi + Finish Diklik');
      }
    });
  }

  // -------------------- CAMERA RECORDING & LAN FOLDER STORAGE (./recordings/) --------------------
  let activeMediaRecorder = null;
  let recordedChunks = [];
  let recordingStartedAt = null;
  let recordingStream = null;
  let fallbackCanvasInterval = null;
  let recordingTickerInterval = null;
  let operatorRecordingsCache = [];

  const opCamRecStatusBadge = document.getElementById('opCamRecStatusBadge');
  const btnCamRecToggle = document.getElementById('btnCamRecToggle');
  const opCamRecSavedInfo = document.getElementById('opCamRecSavedInfo');
  const opLanRecordingsUrl = document.getElementById('opLanRecordingsUrl');
  const opLanFolderStatus = document.getElementById('opLanFolderStatus');
  const btnCopyOpLanUrl = document.getElementById('btnCopyOpLanUrl');
  const btnRefreshTabRecordings = document.getElementById('btnRefreshTabRecordings');
  const opTabRecListContainer = document.getElementById('opTabRecListContainer');
  const opTabRecCount = document.getElementById('opTabRecCount');
  const opTabRecVideoPlayer = document.getElementById('opTabRecVideoPlayer');
  const opTabRecActiveMeta = document.getElementById('opTabRecActiveMeta');
  const btnTabRecDownload = document.getElementById('btnTabRecDownload');

  function isCameraRecording() {
    return Boolean(activeMediaRecorder && activeMediaRecorder.state === 'recording');
  }

  function updateCamRecUI(statusText, bg, color, btnText, isRec) {
    if (opCamRecStatusBadge) {
      opCamRecStatusBadge.textContent = statusText;
      opCamRecStatusBadge.style.background = bg;
      opCamRecStatusBadge.style.color = color;
    }
    if (btnCamRecToggle) {
      btnCamRecToggle.textContent = btnText;
      btnCamRecToggle.className = isRec ? 'btn btn-gold' : 'btn btn-red';
    }
  }

  function createFallbackCanvasStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    const drawFrame = () => {
      const st = store.getState();
      const activeRun = st.activeRun || {};
      const activeTeam = st.teams.find((t) => t.id === (st.scoring.activeTeamId || activeRun.teamId)) || st.teams[0];
      const calc = window.calculateSARScore(st.scoring, st.matchTimer);
      const rem = st.matchTimer ? st.matchTimer.remainingSec : 300;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#003876';
      ctx.fillRect(0, 0, canvas.width, 72);
      ctx.fillStyle = '#f5b800';
      ctx.fillRect(0, 72, canvas.width, 5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Segoe UI, sans-serif';
      ctx.fillText('KSTI 2026 - SEARCH AND RESCUE (REKAMAN PERTANDINGAN)', 24, 45);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 34px Segoe UI, sans-serif';
      ctx.fillText(activeTeam ? activeTeam.name : 'Tim Peserta', 32, 145);

      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 20px Segoe UI, sans-serif';
      ctx.fillText(
        `${activeTeam ? activeTeam.university : ''} | Percobaan ${(Number(st.scoring.trialIndex) || 0) + 1}`,
        32,
        180
      );

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(32, 220, 420, 160);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(32, 220, 420, 160);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px Segoe UI, sans-serif';
      ctx.fillText('SISA WAKTU LOMBA', 56, 255);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px Consolas, monospace';
      ctx.fillText(`${rem}s (${window.formatTimerMMSS(rem)})`, 56, 335);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(480, 220, 448, 160);
      ctx.strokeStyle = '#f5b800';
      ctx.lineWidth = 3;
      ctx.strokeRect(480, 220, 448, 160);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 16px Segoe UI, sans-serif';
      ctx.fillText('SKOR PERTANDINGAN', 504, 255);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 64px Consolas, monospace';
      ctx.fillText(`${calc.finalScore} POIN`, 504, 335);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px Segoe UI, sans-serif';
      ctx.fillText(
        `Waktu Sistem: ${new Date().toLocaleString('id-ID')} | Misi Selesai: ${calc.completedMissions}/5`,
        32,
        450
      );
    };

    drawFrame();
    fallbackCanvasInterval = setInterval(drawFrame, 100);
    return canvas.captureStream(15);
  }

  async function acquireCameraStreamForRecording() {
    const st = store.getState();
    const deviceId = (st.camera && st.camera.deviceId) || '';
    if (window.WebcamManager && window.WebcamManager.getOrRequestStream) {
      try {
        const s = await window.WebcamManager.getOrRequestStream(deviceId);
        if (s && s.getVideoTracks && s.getVideoTracks().length > 0) {
          return s;
        }
      } catch (e) {}
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const constraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } }
        };
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {}
    }
    return createFallbackCanvasStream();
  }

  function pickSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return '';
  }

  async function startCameraRecording(triggerReason = 'Manual') {
    if (isCameraRecording()) return;
    try {
      if (fallbackCanvasInterval) {
        clearInterval(fallbackCanvasInterval);
        fallbackCanvasInterval = null;
      }
      recordingStream = await acquireCameraStreamForRecording();
      if (!recordingStream) return;

      recordedChunks = [];
      const mimeType = pickSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      activeMediaRecorder = new MediaRecorder(recordingStream, options);

      activeMediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunks.push(ev.data);
        }
      };

      recordingStartedAt = Date.now();
      activeMediaRecorder.start(400);

      updateCamRecUI('MEREKAM (00:00)', '#dc2626', '#ffffff', 'Stop & Simpan Rekaman', true);
      if (opCamRecSavedInfo) {
        opCamRecSavedInfo.textContent = `Sedang merekam (${triggerReason})...`;
      }

      if (recordingTickerInterval) clearInterval(recordingTickerInterval);
      recordingTickerInterval = setInterval(() => {
        if (!isCameraRecording()) {
          clearInterval(recordingTickerInterval);
          return;
        }
        const sec = Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000));
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        updateCamRecUI(`MEREKAM (${mm}:${ss})`, '#dc2626', '#ffffff', 'Stop & Simpan Rekaman', true);
      }, 500);
    } catch (err) {
      updateCamRecUI('GAGAL REKAM', '#fef2f2', '#dc2626', 'Mulai Rekam Manual', false);
    }
  }

  async function stopAndSaveCameraRecording(triggerReason = 'Selesai') {
    if (!activeMediaRecorder || activeMediaRecorder.state === 'inactive') return;

    const stSnapshot = JSON.parse(JSON.stringify(store.getState()));
    const durationSec = recordingStartedAt ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000)) : 1;

    return new Promise((resolve) => {
      activeMediaRecorder.onstop = async () => {
        if (recordingTickerInterval) {
          clearInterval(recordingTickerInterval);
          recordingTickerInterval = null;
        }
        if (fallbackCanvasInterval) {
          clearInterval(fallbackCanvasInterval);
          fallbackCanvasInterval = null;
        }

        const mime = (activeMediaRecorder && activeMediaRecorder.mimeType) || 'video/webm';
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunks, { type: mime });
        recordedChunks = [];
        activeMediaRecorder = null;

        updateCamRecUI('MENYIMPAN...', '#0284c7', '#ffffff', 'Mulai Rekam Manual', false);

        const activeRun = stSnapshot.activeRun || {};
        const teamId = stSnapshot.scoring.activeTeamId || activeRun.teamId || 'team_1';
        const teamObj = stSnapshot.teams.find((t) => t.id === teamId) || stSnapshot.teams[0];
        const trialIndex = Number(stSnapshot.scoring.trialIndex) || 0;
        const calc = window.calculateSARScore(stSnapshot.scoring, stSnapshot.matchTimer);

        const params = new URLSearchParams({
          teamId: teamObj.id,
          teamName: teamObj.name,
          university: teamObj.university,
          trialIndex: String(trialIndex),
          trialLabel: `Percobaan ${trialIndex + 1}`,
          finalScore: String(calc.finalScore),
          rawScore: String(calc.rawScore),
          finishTimeSec: String(calc.timeSec),
          durationSec: String(durationSec),
          trigger: triggerReason,
          ext
        });

        try {
          const res = await fetch(`/api/recordings?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': mime },
            body: blob
          });
          if (!res.ok) throw new Error('Server upload failed');
          const data = await res.json();
          if (data && data.ok && data.recording) {
            updateCamRecUI('TERSIMPAN', '#dcfce7', '#15803d', 'Mulai Rekam Manual', false);
            if (opCamRecSavedInfo) {
              opCamRecSavedInfo.textContent = `Tersimpan di recordings/${data.recording.filename}`;
            }
            await loadOperatorRecordingsList();
            resolve(data.recording);
            return;
          }
        } catch (err) {
          // Fallback jika dibuka tanpa server.py: unduh otomatis file video ke komputer
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const safeTeam = (teamObj.name || 'Tim').replace(/[^A-Za-z0-9_-]+/g, '_');
          const fallbackName = `${ts}_${safeTeam}_Percobaan_${trialIndex + 1}_Skor_${calc.finalScore}.${ext}`;
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fallbackName;
          a.click();
          updateCamRecUI('TERUNDUH LOKAL', '#dcfce7', '#15803d', 'Mulai Rekam Manual', false);
          if (opCamRecSavedInfo) {
            opCamRecSavedInfo.textContent = `Disimpan lokal: ${fallbackName}`;
          }
        }
        resolve(null);
      };

      try {
        activeMediaRecorder.stop();
      } catch (e) {
        resolve(null);
      }
    });
  }

  if (btnCamRecToggle) {
    btnCamRecToggle.addEventListener('click', () => {
      if (isCameraRecording()) {
        stopAndSaveCameraRecording('Stop Manual Operator');
      } else {
        startCameraRecording('Rekam Manual Operator');
      }
    });
  }

  async function loadLanInfoForOperator() {
    try {
      const res = await fetch('/api/info', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok) {
        if (opLanRecordingsUrl) opLanRecordingsUrl.textContent = data.recordings_url;
        if (opLanFolderStatus) {
          opLanFolderStatus.innerHTML = `Folder Disk: <strong>${data.recordings_folder}</strong> | IP LAN Aktif: <strong>${(data.lan_ips || []).join(', ')}</strong>`;
        }
      }
    } catch (e) {}
  }

  async function loadOperatorRecordingsList() {
    if (!opTabRecListContainer) return;
    try {
      const res = await fetch('/api/recordings', { cache: 'no-store' });
      if (!res.ok) throw new Error('No API');
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.recordings)) {
        operatorRecordingsCache = data.recordings;
        if (opTabRecCount) opTabRecCount.textContent = String(operatorRecordingsCache.length);

        if (operatorRecordingsCache.length === 0) {
          opTabRecListContainer.innerHTML = `
            <div style="padding:20px;text-align:center;color:#64748b;font-size:12.5px;border:1px dashed #cbd5e1;border-radius:4px;">
              Belum ada video rekaman di folder <code>recordings/</code>.<br/>
              Klik <strong>START LOMBA</strong> atau <strong>Mulai Rekam Manual</strong> untuk merekam.
            </div>
          `;
          return;
        }

        opTabRecListContainer.innerHTML = operatorRecordingsCache
          .map((item) => {
            const sizeMB = ((Number(item.sizeBytes) || 0) / (1024 * 1024)).toFixed(2);
            return `
              <div style="border:1.5px solid #cbd5e1;border-left:5px solid #003876;border-radius:4px;padding:9px 11px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="min-width:0;flex:1;">
                  <div style="font-size:13px;font-weight:800;color:#003876;">
                    ${item.teamName} - ${item.trialLabel} (Skor: ${item.finalScore})
                  </div>
                  <div style="font-size:11px;color:#475569;margin-top:2px;">
                    ${item.createdAt} &bull; ${sizeMB} MB &bull; <code>${item.filename}</code>
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="btn btn-blue btn-sm" data-play-op-rec="${encodeURIComponent(item.filename)}">Putar</button>
                  <a href="${item.url}" download="${item.filename}" class="btn btn-outline btn-sm">Unduh</a>
                </div>
              </div>
            `;
          })
          .join('');

        opTabRecListContainer.querySelectorAll('[data-play-op-rec]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const fname = decodeURIComponent(btn.getAttribute('data-play-op-rec'));
            const found = operatorRecordingsCache.find((r) => r.filename === fname);
            if (!found || !opTabRecVideoPlayer) return;
            opTabRecVideoPlayer.src = found.url;
            opTabRecVideoPlayer.play().catch(() => {});
            if (opTabRecActiveMeta) {
              opTabRecActiveMeta.textContent = `${found.teamName} (${found.university}) | ${found.trialLabel} | Skor: ${found.finalScore} | File: ${found.filename}`;
            }
            if (btnTabRecDownload) {
              btnTabRecDownload.style.display = 'inline-flex';
              btnTabRecDownload.href = found.url;
              btnTabRecDownload.download = found.filename;
            }
          });
        });
      }
    } catch (e) {}
  }

  if (btnCopyOpLanUrl && opLanRecordingsUrl) {
    btnCopyOpLanUrl.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(opLanRecordingsUrl.textContent || '').then(() => {
          btnCopyOpLanUrl.textContent = 'Tersalin!';
          setTimeout(() => {
            btnCopyOpLanUrl.textContent = 'Salin Link LAN';
          }, 1500);
        });
      }
    });
  }

  if (btnRefreshTabRecordings) {
    btnRefreshTabRecordings.addEventListener('click', () => {
      loadLanInfoForOperator();
      loadOperatorRecordingsList();
    });
  }

  loadLanInfoForOperator();
  loadOperatorRecordingsList();

  if (btnResetCurrentScore) {
    btnResetCurrentScore.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        next.scoring = window.createEmptyScoringFor(
          next.scoring.activeTeamId,
          next.scoring.trialIndex,
          next.activeRun.runCode
        );
        syncScoringIntoTrial(next, false);
        return next;
      });
    });
  }

  if (btnSaveTrialScore) {
    btnSaveTrialScore.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        syncScoringIntoTrial(next, true);
        return next;
      });
    });
  }

  if (btnSaveAndNextRun) {
    btnSaveAndNextRun.addEventListener('click', () => {
      store.setState((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        syncScoringIntoTrial(next, true);
        const nextRunObj = window.getNextRun(next.activeRun.runCode);
        if (nextRunObj) {
          applyRunSelectionToState(next, nextRunObj, { resetTimers: true });
        }
        return next;
      });
    });
  }

  if (btnPushScoreboardScene) {
    btnPushScoreboardScene.addEventListener('click', () => {
      store.setState((prev) => Object.assign({}, prev, { activeScene: 'scoreboard' }));
    });
  }

  const btnPushRundownScene = document.getElementById('btnPushRundownScene');
  if (btnPushRundownScene) {
    btnPushRundownScene.addEventListener('click', () => {
      store.setState((prev) => Object.assign({}, prev, { activeScene: 'rundown' }));
    });
  }

  // -------------------- CSV EXPORT --------------------
  const btnExportRundownCSV = document.getElementById('btnExportRundownCSV');
  if (btnExportRundownCSV) {
    btnExportRundownCSV.addEventListener('click', () => {
      const st = store.getState();
      const ranked = window.getRankedTeams(st);
      const lines = [
        'Peringkat,Nama Tim,Perguruan Tinggi,Percobaan 1,Percobaan 2,Percobaan 3,Skor Terbaik'
      ];
      ranked.forEach((t) => {
        const p1 = t.trialScores[0] ? t.trialScores[0].score : '';
        const p2 = t.trialScores[1] ? t.trialScores[1].score : '';
        const p3 = t.trialScores[2] ? t.trialScores[2].score : '';
        lines.push(
          `${t.rank},"${t.name}","${t.university}",${p1},${p2},${p3},${t.bestScore}`
        );
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Rekap_SAR_KSTI_2026.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // -------------------- RENDER 12-TEAM TABLE (NO URUTAN COLUMN) --------------------
  function renderRundownAndLeaderboardTables(state) {
    const ranked = window.getRankedTeams ? window.getRankedTeams(state) : [];

    // Podium Summary Cards (Juara 1, 2, 3)
    const podiumEl = document.getElementById('opPodiumSummaryCards');
    if (podiumEl) {
      const top3 = [ranked[0], ranked[1], ranked[2]];
      const labels = [
        { title: 'JUARA 1 (TERBAIK 1)', color: '#f5b800' },
        { title: 'JUARA 2 (TERBAIK 2)', color: '#94a3b8' },
        { title: 'JUARA 3 (TERBAIK 3)', color: '#d97706' }
      ];
      podiumEl.innerHTML = labels
        .map((lb, idx) => {
          const tm = top3[idx];
          const has = tm && tm.hasScore;
          return `
            <div class="op-podium-card" style="border-left:5px solid ${lb.color};">
              <div style="font-size:11px;font-weight:800;color:#475569;">${lb.title}</div>
              <div style="font-size:15px;font-weight:800;color:#003876;margin-top:2px;">
                ${has ? tm.name : 'Belum Ada Skor'}
              </div>
              <div style="font-size:12px;color:#16a34a;font-weight:700;">
                ${has ? `Skor Terbaik: ${tm.bestScore} Poin (${tm.bestTimeSec}s)` : '-'}
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 12 Teams Table (1 Row Per Team, No Urutan Column)
    const lbWrap = document.getElementById('opLeaderboardTableWrap');
    if (lbWrap && !lbWrap.contains(document.activeElement)) {
      const rankById = {};
      ranked.forEach((r) => {
        rankById[r.id] = r;
      });

      lbWrap.innerHTML = `
        <table class="bc-sb-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Tim</th>
              <th>Perguruan Tinggi</th>
              <th>Percobaan 1</th>
              <th>Percobaan 2</th>
              <th>Percobaan 3</th>
              <th>Skor Terbaik</th>
              <th>Peringkat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${state.teams.map((t, idx) => {
              const rInfo = rankById[t.id] || { bestScore: 0, rank: idx + 1, trialScores: [] };
              const p1 = rInfo.trialScores[0] ? `${rInfo.trialScores[0].score} (${rInfo.trialScores[0].timeSec}s)` : '-';
              const p2 = rInfo.trialScores[1] ? `${rInfo.trialScores[1].score} (${rInfo.trialScores[1].timeSec}s)` : '-';
              const p3 = rInfo.trialScores[2] ? `${rInfo.trialScores[2].score} (${rInfo.trialScores[2].timeSec}s)` : '-';
              const isCur = t.id === state.scoring.activeTeamId;
              return `
                <tr class="${isCur ? 'active-row' : ''}">
                  <td><strong>${idx + 1}</strong></td>
                  <td>
                    <input type="text" class="op-inline-input" data-edit-team-name="${t.id}" value="${t.name}" />
                  </td>
                  <td>
                    <input type="text" class="op-inline-input" data-edit-team-uni="${t.id}" value="${t.university}" />
                  </td>
                  <td>${p1}</td>
                  <td>${p2}</td>
                  <td>${p3}</td>
                  <td style="font-size:15px;font-weight:800;color:#003876;">${rInfo.bestScore}</td>
                  <td><span class="bc-code-badge">#${rInfo.rank}</span></td>
                  <td>
                    <button type="button" class="btn ${isCur ? 'btn-gold' : 'btn-outline'} btn-sm" data-select-team="${t.id}">
                      ${isCur ? 'Sedang Aktif' : 'Pilih Tim'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      lbWrap.querySelectorAll('[data-edit-team-name]').forEach((inp) => {
        inp.addEventListener('change', (e) => {
          const id = inp.getAttribute('data-edit-team-name');
          const val = e.target.value.trim();
          if (!val) return;
          store.setState((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const tm = next.teams.find((x) => x.id === id);
            if (tm) tm.name = val;
            return next;
          });
        });
      });

      lbWrap.querySelectorAll('[data-edit-team-uni]').forEach((inp) => {
        inp.addEventListener('change', (e) => {
          const id = inp.getAttribute('data-edit-team-uni');
          const val = e.target.value.trim();
          store.setState((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const tm = next.teams.find((x) => x.id === id);
            if (tm) {
              tm.university = val;
              tm.shortUni = val;
            }
            return next;
          });
        });
      });

      lbWrap.querySelectorAll('[data-select-team]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const teamId = btn.getAttribute('data-select-team');
          const st = store.getState();
          const trialIdx = Number(st.scoring.trialIndex) || 0;
          const runObj = window.getRunByTeamAndTrial(teamId, trialIdx);
          store.setState((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            applyRunSelectionToState(next, runObj);
            return next;
          });
        });
      });
    }
  }

  // -------------------- FAST TIMER & SCORE DOM UPDATER --------------------
  function syncFastTimerAndScoreDOM(state) {
    const prepTimer = state.prepTimer || { durationSec: 180, remainingSec: 180, isRunning: false };
    const matchTimer = state.matchTimer || { durationSec: 300, remainingSec: 300, isRunning: false };

    // 1. Preparation Timer Card
    const prepDigitsEl = document.getElementById('opPrepTimerDigits');
    const prepMMSSEl = document.getElementById('opPrepTimerMMSS');
    const prepElapsedEl = document.getElementById('opPrepElapsedDigits');
    const prepBadgeEl = document.getElementById('opPrepStatusBadge');

    if (prepDigitsEl) prepDigitsEl.textContent = window.formatTimerDigits(prepTimer.remainingSec);
    if (prepMMSSEl) prepMMSSEl.textContent = `(${window.formatTimerMMSS(prepTimer.remainingSec)})`;
    if (prepElapsedEl) prepElapsedEl.textContent = `${Math.max(0, 180 - prepTimer.remainingSec)}s / 180s`;
    if (prepBadgeEl) {
      if (prepTimer.isRunning) {
        prepBadgeEl.textContent = 'PREP BERJALAN';
        prepBadgeEl.style.background = '#0284c7';
        prepBadgeEl.style.color = '#fff';
      } else if (prepTimer.remainingSec <= 0) {
        prepBadgeEl.textContent = 'PREP SELESAI';
        prepBadgeEl.style.background = '#dc2626';
        prepBadgeEl.style.color = '#fff';
      } else {
        prepBadgeEl.textContent = 'STANDBY';
        prepBadgeEl.style.background = '#e0f2fe';
        prepBadgeEl.style.color = '#0369a1';
      }
    }
    if (btnPrepStartPause) {
      btnPrepStartPause.textContent = prepTimer.isRunning ? 'PAUSE PREP' : 'START PREP';
      btnPrepStartPause.className = prepTimer.isRunning ? 'btn btn-gold' : 'btn btn-blue';
    }

    // 2. Match Timer Card
    const matchDigitsEl = document.getElementById('opMatchTimerDigits');
    const matchMMSSEl = document.getElementById('opMatchTimerMMSS');
    const matchElapsedEl = document.getElementById('opMatchElapsedDigits');
    const matchBadgeEl = document.getElementById('opMatchStatusBadge');
    const retryInfoEl = document.getElementById('opRetryInfoText');

    if (matchDigitsEl) matchDigitsEl.textContent = window.formatTimerDigits(matchTimer.remainingSec);
    if (matchMMSSEl) matchMMSSEl.textContent = `(${window.formatTimerMMSS(matchTimer.remainingSec)})`;
    if (matchElapsedEl) matchElapsedEl.textContent = `${Math.max(0, 300 - matchTimer.remainingSec)}s / 300s`;
    if (matchBadgeEl) {
      if (matchTimer.isRunning) {
        matchBadgeEl.textContent = 'LOMBA BERJALAN';
        matchBadgeEl.style.background = '#16a34a';
        matchBadgeEl.style.color = '#fff';
      } else if (matchTimer.remainingSec <= 0) {
        matchBadgeEl.textContent = 'WAKTU HABIS';
        matchBadgeEl.style.background = '#dc2626';
        matchBadgeEl.style.color = '#fff';
      } else {
        matchBadgeEl.textContent = 'STANDBY';
        matchBadgeEl.style.background = '#e2e8f0';
        matchBadgeEl.style.color = '#334155';
      }
    }
    if (btnMatchStartPause) {
      btnMatchStartPause.textContent = matchTimer.isRunning ? 'PAUSE LOMBA' : 'START LOMBA';
      btnMatchStartPause.className = matchTimer.isRunning ? 'btn btn-gold' : 'btn btn-green';
    }
    if (retryInfoEl) {
      retryInfoEl.textContent = matchTimer.retryTimestampSec
        ? `Retry tercatat pada sisa waktu ${matchTimer.retryTimestampSec}s`
        : 'Maksimal 1x Retry per Percobaan';
    }

    // 3. Score Summary & Finish Time Input Sync
    const activeRun = state.activeRun || {};
    const activeTeam = state.teams.find((t) => t.id === (state.scoring.activeTeamId || activeRun.teamId)) || state.teams[0];
    const calc = window.calculateSARScore(state.scoring, state.matchTimer);

    if (inpFinishTimeSec && document.activeElement !== inpFinishTimeSec) {
      inpFinishTimeSec.value = calc.timeSec || state.scoring.finishTimeSec || 180;
    }

    const bonusPreviewEl = document.getElementById('opBonusPreviewBadge');
    if (bonusPreviewEl) {
      if (calc.bonusActive) {
        bonusPreviewEl.textContent = `Rumus: ${calc.rawScore} x (300 / ${calc.timeSec}s) = ${calc.finalScore} (+${calc.bonusPoints} Poin)`;
        bonusPreviewEl.style.color = '#15803d';
      } else {
        const latestTime = window.getMatchTimerElapsedSec(state.matchTimer, state.scoring.finishTimeSec || 180);
        const previewTotal = calc.rawScore > 0 ? Math.round((calc.rawScore * 300) / Math.min(299, latestTime)) : 0;
        const previewBonus = Math.max(0, previewTotal - calc.rawScore);
        bonusPreviewEl.textContent = `Waktu: ${latestTime}s | Rumus: ${calc.rawScore} x (300 / ${latestTime}s) = ${previewTotal} (+${previewBonus})`;
        bonusPreviewEl.style.color = '#64748b';
      }
    }

    const scoreBanner = document.getElementById('opScoreSummaryBanner');
    if (scoreBanner && activeTeam) {
      scoreBanner.innerHTML = `
        <div>
          <div style="font-size:11px;font-weight:800;color:#fde047;">
            SCORE - ${activeTeam.name} (PERCOBAAN ${(Number(state.scoring.trialIndex) || 0) + 1})
          </div>
          <div style="font-size:12.5px;color:#e2e8f0;margin-top:2px;">
            Skor Misi: <strong>${calc.rawScore}</strong> |
            Misi Selesai: <strong>${calc.completedMissions}/5</strong> |
            Finish: <strong>${calc.bonusActive ? `+${calc.bonusPoints} (${calc.timeSec}s)` : '0'}</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:#cbd5e1;font-weight:700;">SCORE</div>
          <div style="font-size:30px;font-weight:800;color:#fde047;line-height:1;">${calc.finalScore}</div>
        </div>
      `;
    }

    if (miniIframe && miniIframe.contentWindow) {
      try {
        miniIframe.contentWindow.postMessage({ type: 'STATE_SYNC', state }, '*');
      } catch (e) {}
    }
  }

  function getOperatorStructuralSignature(state) {
    const clone = JSON.parse(JSON.stringify(state));
    if (clone.prepTimer) delete clone.prepTimer.remainingSec;
    if (clone.matchTimer) delete clone.matchTimer.remainingSec;
    if (clone.scoring) delete clone.scoring.finishTimeSec;
    delete clone.lastUpdated;
    return JSON.stringify(clone);
  }

  // -------------------- MASTER UI SYNC FUNCTION --------------------
  function syncOperatorUI(state) {
    syncFastTimerAndScoreDOM(state);

    const sig = getOperatorStructuralSignature(state);
    if (sig === lastStructuralSig) return;
    lastStructuralSig = sig;

    const headerRunEl = document.getElementById('opHeaderActiveRunText');
    const activeRun = state.activeRun || {};
    const activeTeam = state.teams.find((t) => t.id === (state.scoring.activeTeamId || activeRun.teamId)) || state.teams[0];
    const trialNum = (Number(state.scoring.trialIndex) || 0) + 1;
    if (headerRunEl && activeTeam) {
      headerRunEl.textContent = `${activeTeam.name} | Percobaan ${trialNum}`;
    }

    renderOperatorRandomizerSlots(state);

    document.querySelectorAll('[data-scene-select]').forEach((btn) => {
      const sc = btn.getAttribute('data-scene-select');
      btn.classList.toggle('active', sc === state.activeScene);
    });

    if (selSingleCamMode && state.camera) {
      selSingleCamMode.value = state.camera.mode || 'webcam';
    }

    // Populate Dropdowns (1 Entry Per Team, No Urutan prefix)
    const teamOpts = state.teams
      .map((t) => `<option value="${t.id}">${t.name} - ${t.university}</option>`)
      .join('');

    const winnerOpts = [
      `<option value="auto_score">Otomatis - Skor Terbaik Tertinggi (12 Tim)</option>`,
      ...state.teams.map((t) => `<option value="${t.id}">Manual - ${t.name}</option>`)
    ].join('');

    if (selScoreTeam && selScoreTeam.innerHTML !== teamOpts) selScoreTeam.innerHTML = teamOpts;
    if (selWinnerTeam && selWinnerTeam.innerHTML !== winnerOpts) selWinnerTeam.innerHTML = winnerOpts;

    if (selScoreTeam) selScoreTeam.value = state.scoring.activeTeamId;
    if (selScoreTrial) selScoreTrial.value = String(state.scoring.trialIndex || 0);
    if (selWinnerTeam) {
      const wMode = (state.winner && state.winner.mode) || 'auto_score';
      selWinnerTeam.value = wMode === 'manual' ? state.winner.teamId : 'auto_score';
    }

    const resolvedWinnerEl = document.getElementById('opCurrentWinnerResolvedText');
    if (resolvedWinnerEl && window.resolveWinnerTeam) {
      const rw = window.resolveWinnerTeam(state);
      if (rw) {
        resolvedWinnerEl.textContent = `Pemenang Saat Ini: ${rw.name} (Skor Terbaik: ${rw.bestScore || 0} Poin)`;
      }
    }

    if (chkKeluarHome) chkKeluarHome.checked = Boolean(state.scoring.keluarHome);
    if (chkR1WithoutVictim) chkR1WithoutVictim.checked = state.scoring.r1 === 'without_victim';
    if (chkR1WithVictim) chkR1WithVictim.checked = state.scoring.r1 === 'with_victim';
    if (chkR2WithoutVictim) chkR2WithoutVictim.checked = state.scoring.r2 === 'without_victim';
    if (chkR2WithVictim) chkR2WithVictim.checked = state.scoring.r2 === 'with_victim';
    if (chkBonusFinish) chkBonusFinish.checked = Boolean(state.scoring.bonusFinishChecked || state.scoring.reachedFinish);

    renderMissionsChecklist(state);
    renderRundownAndLeaderboardTables(state);
  }

  store.subscribe(syncOperatorUI);
  syncOperatorUI(store.getState());
})();
