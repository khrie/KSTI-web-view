/**
 * KSTI 2026 - Search and Rescue (SAR)
 * Broadcast Display Receiver (100% Live Synced with Operator Panel)
 */

(function () {
  const viewport = document.getElementById('displayViewport');
  let lastScene = '';
  let lastCamSignature = '';
  let lastStructuralSignature = '';
  let lastRollId = 0;

  function computeLiveRemaining(timerObj, fallbackDur) {
    if (!timerObj) return fallbackDur;
    if (timerObj.isRunning && timerObj.startedAt) {
      const elapsed = (Date.now() - timerObj.startedAt) / 1000;
      return Math.max(0, Math.ceil((timerObj.baseRemainingSec || fallbackDur) - elapsed));
    }
    return Math.max(0, Math.ceil(Number(timerObj.remainingSec ?? fallbackDur)));
  }

  function getStructuralSignature(state) {
    const clone = JSON.parse(JSON.stringify(state));
    if (clone.prepTimer) {
      delete clone.prepTimer.remainingSec;
    }
    if (clone.matchTimer) {
      delete clone.matchTimer.remainingSec;
    }
    if (clone.scoring) {
      delete clone.scoring.finishTimeSec;
    }
    if (Array.isArray(clone.teams)) {
      clone.teams.forEach((t) => {
        if (Array.isArray(t.trials)) {
          t.trials.forEach((tr) => {
            if (tr) {
              delete tr.timeSec;
              delete tr.bonusPoints;
              delete tr.finalScore;
              if (tr.scoringSnapshot) delete tr.scoringSnapshot.finishTimeSec;
            }
          });
        }
      });
    }
    delete clone.lastUpdated;
    return JSON.stringify(clone);
  }

  function updateTimerAndLiveScoreDOM(state) {
    if (!viewport || !state) return;

    const prepRem = computeLiveRemaining(state.prepTimer, 300);
    const matchRem = computeLiveRemaining(state.matchTimer, 300);

    // 1. Update Preparation Timer DOM
    const prepDigitsEl = viewport.querySelector('#bcPrepTimerDigits');
    if (prepDigitsEl) prepDigitsEl.textContent = window.formatTimerDigits(prepRem);

    const prepMMSSEl = viewport.querySelector('#bcPrepTimerMMSS');
    if (prepMMSSEl) prepMMSSEl.textContent = window.formatTimerMMSS(prepRem);

    const prepBox = viewport.querySelector('#bcPrepTimerBox');
    if (prepBox) {
      prepBox.classList.toggle('timer-urgent', prepRem <= 30 && prepRem > 0);
      prepBox.classList.toggle('timer-zero', prepRem <= 0);
    }

    const prepCard = viewport.querySelector('#bcPrepTimerCard');
    if (prepCard) {
      prepCard.classList.toggle(
        'is-focused',
        Boolean((state.prepTimer && state.prepTimer.isRunning) || state.activeTimerType === 'prep')
      );
    }

    // 2. Update Match Timer DOM
    const matchDigitsEl = viewport.querySelector('#bcMatchTimerDigits');
    if (matchDigitsEl) matchDigitsEl.textContent = window.formatTimerDigits(matchRem);

    const matchMMSSEl = viewport.querySelector('#bcMatchTimerMMSS');
    if (matchMMSSEl) matchMMSSEl.textContent = window.formatTimerMMSS(matchRem);

    const matchBox = viewport.querySelector('#bcMatchTimerBox');
    if (matchBox) {
      matchBox.classList.toggle('timer-urgent', matchRem <= 30 && matchRem > 0);
      matchBox.classList.toggle('timer-zero', matchRem <= 0);
    }

    const matchCard = viewport.querySelector('#bcMatchTimerCard');
    if (matchCard) {
      matchCard.classList.toggle(
        'is-focused',
        Boolean((state.matchTimer && state.matchTimer.isRunning) || state.activeTimerType === 'match')
      );
    }

    // 3. Update Live Score & Finish Bonus DOM (if on Live Match scene)
    const calc = window.calculateSARScore(state.scoring, state.matchTimer);
    const rawEl = viewport.querySelector('#bcLiveRawScore');
    if (rawEl) rawEl.textContent = String(calc.rawScore);

    const bonusEl = viewport.querySelector('#bcLiveBonusPts');
    if (bonusEl) bonusEl.textContent = calc.bonusActive ? `+${calc.bonusPoints}` : '0';

    const totalEl = viewport.querySelector('#bcLiveTotalScore');
    if (totalEl) totalEl.textContent = String(calc.finalScore);

    const finishChip = viewport.querySelector('#bcFinishChip');
    if (finishChip) {
      finishChip.classList.toggle('chip-bonus-on', Boolean(calc.bonusActive));
    }
    const finishChipVal = viewport.querySelector('#bcFinishChipVal');
    if (finishChipVal) {
      finishChipVal.textContent = calc.bonusActive ? `${calc.timeSec}s (+${calc.bonusPoints})` : 'BELUM';
    }

    // 4. Update Trial P1, P2, P3, Best on Live Match Footer
    const activeTeam = (state.teams || []).find(
      (t) => t.id === ((state.scoring && state.scoring.activeTeamId) || (state.activeRun && state.activeRun.teamId))
    );
    if (activeTeam && window.getTeamBestStats) {
      const stats = window.getTeamBestStats(activeTeam, state);
      const p1El = viewport.querySelector('#bcTrialP1');
      const p2El = viewport.querySelector('#bcTrialP2');
      const p3El = viewport.querySelector('#bcTrialP3');
      const bestEl = viewport.querySelector('#bcTrialBest');
      if (p1El) p1El.textContent = stats.trialScores[0] ? String(stats.trialScores[0].score) : '-';
      if (p2El) p2El.textContent = stats.trialScores[1] ? String(stats.trialScores[1].score) : '-';
      if (p3El) p3El.textContent = stats.trialScores[2] ? String(stats.trialScores[2].score) : '-';
      if (bestEl) bestEl.textContent = String(stats.bestScore);
    }
  }

  function renderDisplay(state) {
    if (!viewport) return;

    const currentScene = (state && state.activeScene) || 'live_match';
    const camSig = JSON.stringify((state && state.camera) || {});
    const sig = getStructuralSignature(state);

    if (sig !== lastStructuralSignature) {
      const canPatchLiveMatchWithoutResettingVideo =
        currentScene === 'live_match' &&
        lastScene === 'live_match' &&
        camSig === lastCamSignature &&
        viewport.querySelector('.bc-scene-live-match');

      lastStructuralSignature = sig;
      lastScene = currentScene;
      lastCamSignature = camSig;

      if (canPatchLiveMatchWithoutResettingVideo) {
        const temp = document.createElement('div');
        temp.innerHTML = window.renderBroadcastScene(state);

        const newHeader = temp.querySelector('.bc-header');
        const curHeader = viewport.querySelector('.bc-header');
        if (newHeader && curHeader) curHeader.innerHTML = newHeader.innerHTML;

        const newSidebar = temp.querySelector('.bc-match-sidebar-live');
        const curSidebar = viewport.querySelector('.bc-match-sidebar-live');
        if (newSidebar && curSidebar) curSidebar.innerHTML = newSidebar.innerHTML;
      } else {
        viewport.innerHTML = window.renderBroadcastScene(state);
        window.hydrateWebcamSlots(viewport);
      }
    }

    updateTimerAndLiveScoreDOM(state);
  }

  window.KSTIStore.subscribe(renderDisplay);
  renderDisplay(window.KSTIStore.getState());

  // High-frequency local tick so countdown on spectator screen is 100% live and smooth
  setInterval(() => {
    const st = window.KSTIStore.getState();
    if (!st) return;
    const prepRunning = st.prepTimer && st.prepTimer.isRunning;
    const matchRunning = st.matchTimer && st.matchTimer.isRunning;
    if (prepRunning || matchRunning) {
      updateTimerAndLiveScoreDOM(st);
    }
  }, 100);
})();
