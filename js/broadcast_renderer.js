/**
 * KSTI 2026 - Search and Rescue (SAR)
 * Broadcast Scene Renderer (Single Camera Live Match + Dual Timers + Score + Rundown)
 */

function formatTimerDigits(sec) {
  const s = Math.max(0, Math.ceil(Number(sec) || 0));
  return String(s).padStart(3, '0');
}

function formatTimerMMSS(sec) {
  const s = Math.max(0, Math.ceil(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function getTeamById(state, teamId) {
  const list = (state && state.teams) || [];
  return (
    list.find((t) => t.id === teamId) ||
    list[0] || {
      id: 'team_1',
      urutan: 1,
      name: 'Tim Kebut Seminggu',
      university: 'Universitas Airlangga',
      shortUni: 'Universitas Airlangga'
    }
  );
}

function renderBroadcastHeader(state) {
  const banners = (state && state.banners) || {};
  return `
    <header class="bc-header">
      <div class="bc-header-left">
        <img src="assets/partner_logos.png" alt="Kemdiktisaintek LPDP ITS KSTI 26" class="bc-partner-strip" />
      </div>
      <div class="bc-header-center">
        <div class="bc-ksti-pill-group">
          <img src="assets/ksti_cover_logo.png" alt="KSTI 2026" class="bc-ksti-mini-logo" />
          <div class="bc-event-meta">
            <span class="bc-national-badge">${banners.stageBadge || 'Tingkat Nasional'}</span>
            <span class="bc-date-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${banners.eventDate || 'Kamis, 12 November 2026'}
            </span>
          </div>
        </div>
      </div>
      <div class="bc-header-right"></div>
      <div class="bc-top-right-swoosh"></div>
    </header>
  `;
}

function renderBroadcastFooter(state) {
  const banners = (state && state.banners) || {};
  return `
    <footer class="bc-footer">
      <div class="bc-footer-wave">
        <span class="bc-footer-venue">
          ${banners.eventVenue || 'Hall Robotika ITS, Surabaya'} - Konvensi Sains, Teknologi, dan Industri Indonesia 2026
        </span>
      </div>
      <div class="bc-footer-sponsors">
        <span class="bc-sponsor-label">Kontes Robot Search and Rescue (SAR) - KSTI 2026</span>
      </div>
    </footer>
  `;
}

/**
 * Single Camera Slot HTML for Live Match
 */
function renderSingleCameraSlotHTML(state) {
  const camCfg = (state && state.camera) || { mode: 'webcam', deviceId: '' };

  if (camCfg.mode === 'chroma_green') {
    return `<div class="bc-cam-chroma-green"><span>CHROMA KEY GREEN (KAMERA ARENA UTAMA)</span></div>`;
  }
  if (camCfg.mode === 'chroma_blue') {
    return `<div class="bc-cam-chroma-blue"><span>CHROMA KEY BLUE (KAMERA ARENA UTAMA)</span></div>`;
  }
  if (camCfg.mode === 'arena_map') {
    return `
      <div class="bc-cam-map-slot">
        ${window.renderArenaMapSVG(state, { compact: true })}
      </div>
    `;
  }

  return `
    <div class="bc-cam-dvr-player bc-cam-webcam-wrap" data-cam-slot="main" data-device-id="${camCfg.deviceId || ''}">
      <!-- Live Video Feed -->
      <video class="bc-cam-video bc-cam-video-live" autoplay playsinline muted></video>

      <!-- Replay Video for DVR / VAR Review -->
      <video class="bc-cam-video bc-cam-video-replay" playsinline muted style="display:none;"></video>

      <!-- Floating VAR Review Badge Watermark (Hanya muncul jika VAR sedang dimundurkan) -->
      <div class="bc-cam-var-badge" style="display:none;">
        <span class="bc-var-pulse-dot"></span>
        <span class="bc-var-badge-text">VAR REVIEW</span>
        <span class="bc-var-offset-text">-00:15</span>
        <span class="bc-var-speed-tag" style="display:none;">0.5x</span>
      </div>

      <div class="bc-cam-status-msg">Menghubungkan kamera arena...</div>
    </div>
  `;
}

/**
 * SCENE 1: LIVE MATCH
 */
function renderLiveMatchScene(state) {
  const scoring = state.scoring || {};
  const activeRun = state.activeRun || {};
  const activeTeam = getTeamById(state, scoring.activeTeamId || activeRun.teamId);
  const teamStats = window.getTeamBestStats ? window.getTeamBestStats(activeTeam, state) : { bestScore: 0, trialScores: [] };
  const calc = window.calculateSARScore(scoring, state.matchTimer);

  const prepTimer = state.prepTimer || { remainingSec: 300, isRunning: false };
  const matchTimer = state.matchTimer || { remainingSec: 300, isRunning: false };
  const activeTimerType = state.activeTimerType || 'match';

  const prepDigits = formatTimerDigits(prepTimer.remainingSec);
  const prepMMSS = formatTimerMMSS(prepTimer.remainingSec);
  const prepUrgent = prepTimer.remainingSec <= 30 && prepTimer.remainingSec > 0;
  const prepZero = prepTimer.remainingSec <= 0;

  const matchDigits = formatTimerDigits(matchTimer.remainingSec);
  const matchMMSS = formatTimerMMSS(matchTimer.remainingSec);
  const matchUrgent = matchTimer.remainingSec <= 30 && matchTimer.remainingSec > 0;
  const matchZero = matchTimer.remainingSec <= 0;

  const trialIdx = Number(scoring.trialIndex || 0);

  const r1Points = scoring.r1 === 'with_victim' ? 150 : scoring.r1 === 'without_victim' ? 100 : 0;
  const r2Points = scoring.r2 === 'with_victim' ? 300 : scoring.r2 === 'without_victim' ? 150 : 0;

  return `
    <div class="bc-scene bc-scene-live-match">
      ${renderBroadcastHeader(state)}

      <main class="bc-match-main-single">
        <!-- LEFT: SINGLE CAMERA WINDOW -->
        <div class="bc-single-arena-col">
          <div class="bc-single-cam-frame">
            ${renderSingleCameraSlotHTML(state)}
          </div>
        </div>

        <!-- RIGHT SIDEBAR: TEAM CARD + DUAL TIMERS (PREPARATION & LOMBA) + SCORE -->
        <aside class="bc-match-sidebar-live">
          <!-- 1. Active Team Card -->
          <div class="bc-live-team-card">
            <div class="bc-ltc-meta">
              <div class="bc-ltc-badges">
                <span class="bc-ltc-p-badge">PERCOBAAN ${trialIdx + 1}</span>
              </div>
              <div class="bc-ltc-name">${activeTeam.name}</div>
              <div class="bc-ltc-uni">${activeTeam.university}</div>
            </div>
          </div>

          <!-- 2. Distinct Preparation Timer & Lomba Timer -->
          <div class="bc-dual-timers-grid">
            <!-- Timer Preparation -->
            <div id="bcPrepTimerCard" class="bc-timer-widget bc-timer-prep-card ${prepTimer.isRunning || activeTimerType === 'prep' ? 'is-focused' : ''}">
              <div class="bc-timer-tab tab-prep">
                <span>PREPARATION</span>
                <span id="bcPrepTimerMMSS" class="bc-timer-mmss">${prepMMSS}</span>
              </div>
              <div id="bcPrepTimerBox" class="bc-timer-box timer-prep ${prepUrgent ? 'timer-urgent' : ''} ${prepZero ? 'timer-zero' : ''}">
                <span id="bcPrepTimerDigits" class="bc-timer-digits">${prepDigits}</span>
                <span class="bc-timer-unit">DETIK</span>
              </div>
            </div>

            <!-- Timer Lomba -->
            <div id="bcMatchTimerCard" class="bc-timer-widget bc-timer-match-card ${matchTimer.isRunning || activeTimerType === 'match' ? 'is-focused' : ''}">
              <div class="bc-timer-tab tab-match">
                <span>TIMER LOMBA</span>
                <span id="bcMatchTimerMMSS" class="bc-timer-mmss">${matchMMSS}</span>
              </div>
              <div id="bcMatchTimerBox" class="bc-timer-box timer-match ${matchUrgent ? 'timer-urgent' : ''} ${matchZero ? 'timer-zero' : ''}">
                <span id="bcMatchTimerDigits" class="bc-timer-digits">${matchDigits}</span>
                <span class="bc-timer-unit">DETIK</span>
              </div>
            </div>
          </div>

          <!-- 3. Score & Rubric Checks -->
          <div class="bc-live-score-box">
            <div class="bc-lsb-header">
              <div>
                <div class="bc-lsb-label">SCORE</div>
                <div class="bc-lsb-sub">
                  Misi: <strong id="bcLiveRawScore">${calc.rawScore}</strong> |
                  Finish: <strong id="bcLiveBonusPts">${calc.bonusActive ? `+${calc.bonusPoints}` : '0'}</strong>
                </div>
              </div>
              <div class="bc-lsb-total" id="bcLiveTotalScore">${calc.finalScore}</div>
            </div>

            <div class="bc-lsb-checks-grid">
              <div class="bc-lsb-chip ${scoring.keluarHome ? 'chip-done' : ''}">
                <span>START</span>
                <strong>${scoring.keluarHome ? '+50' : '0'}</strong>
              </div>
              ${['k1', 'k2', 'k3', 'k4', 'k5'].map((k, idx) => {
                const m = (scoring.missions && scoring.missions[k]) || {};
                const pts = (m.lifted ? 50 : 0) + (m.safeZone ? 50 : 0);
                const cls = pts === 100 ? 'chip-done' : pts === 50 ? 'chip-partial' : '';
                return `
                  <div class="bc-lsb-chip ${cls}">
                    <span>K-${idx + 1}</span>
                    <strong>${pts > 0 ? '+' + pts : '0'}</strong>
                  </div>
                `;
              }).join('')}
              <div class="bc-lsb-chip ${r1Points > 0 ? 'chip-done' : ''}">
                <span>R1</span>
                <strong>${r1Points > 0 ? '+' + r1Points : '0'}</strong>
              </div>
              <div class="bc-lsb-chip ${r2Points > 0 ? 'chip-done' : ''}">
                <span>R2</span>
                <strong>${r2Points > 0 ? '+' + r2Points : '0'}</strong>
              </div>
              <div id="bcFinishChip" class="bc-lsb-chip bc-lsb-chip-bonus ${calc.bonusActive ? 'chip-bonus-on' : ''}">
                <span>FINISH</span>
                <strong id="bcFinishChipVal">${calc.bonusActive ? `${calc.timeSec}s (+${calc.bonusPoints})` : 'BELUM'}</strong>
              </div>
            </div>
          </div>

          <!-- 4. Team Trial History -->
          <div class="bc-live-footer-card">
            <div class="bc-lfc-trials">
              <div class="bc-lfc-tr ${trialIdx === 0 ? 'tr-cur' : ''}">
                <span>P1</span>
                <strong id="bcTrialP1">${teamStats.trialScores[0] ? teamStats.trialScores[0].score : '-'}</strong>
              </div>
              <div class="bc-lfc-tr ${trialIdx === 1 ? 'tr-cur' : ''}">
                <span>P2</span>
                <strong id="bcTrialP2">${teamStats.trialScores[1] ? teamStats.trialScores[1].score : '-'}</strong>
              </div>
              <div class="bc-lfc-tr ${trialIdx === 2 ? 'tr-cur' : ''}">
                <span>P3</span>
                <strong id="bcTrialP3">${teamStats.trialScores[2] ? teamStats.trialScores[2].score : '-'}</strong>
              </div>
              <div class="bc-lfc-tr tr-best">
                <span>TERBAIK</span>
                <strong id="bcTrialBest">${teamStats.bestScore}</strong>
              </div>
            </div>
          </div>
        </aside>
      </main>

      ${renderBroadcastFooter(state)}
    </div>
  `;
}

/**
 * SCENE 2: SURVIVOR RANDOMIZER ON ARENA MAP
 */
function renderRandomizerScene(state) {
  const k1Slots = state.randomizer.k1.slots;
  const k2Slots = state.randomizer.k2.slots;
  const activeRun = state.activeRun || {};
  const activeTeam = getTeamById(state, state.scoring.activeTeamId || activeRun.teamId);
  const k1Labels = ['KIRI', 'TENGAH', 'KANAN'];
  const k2Labels = ['KIRI', 'KANAN'];

  return `
    <div class="bc-scene bc-scene-randomizer">
      ${renderBroadcastHeader(state)}

      <main class="bc-rand-map-layout">
        <div class="bc-rand-arena-stage">
          <div class="bc-rand-stage-bar">
            <span>PETA LOKASI KORBAN - ${activeTeam.name}</span>
            <span class="bc-rand-stage-legend">
              <i class="dot-real"></i> KORBAN ASLI
              <i class="dot-dummy"></i> DUMMY
            </span>
          </div>
          <div class="bc-rand-arena-canvas">
            ${window.renderArenaMapSVG(state)}
          </div>
        </div>

        <aside class="bc-rand-summary-side">
          <div class="bc-rand-side-box">
            <div class="bc-rand-side-head">K-1</div>
            <div class="bc-rand-side-list">
              ${k1Slots.map((type, i) => `
                <div class="bc-rand-side-row ${type === 'real' ? 'row-real' : 'row-dummy'}">
                  <span class="pos-label" style="display:inline-flex;align-items:center;gap:8px;">
                    ${window.getVictimSVG(type, 26)}
                    <span>${k1Labels[i]}</span>
                  </span>
                  <span class="pos-val">${type === 'real' ? 'KORBAN ASLI' : 'DUMMY'}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="bc-rand-side-box">
            <div class="bc-rand-side-head">K-2</div>
            <div class="bc-rand-side-list">
              ${k2Slots.map((type, i) => `
                <div class="bc-rand-side-row ${type === 'real' ? 'row-real' : 'row-dummy'}">
                  <span class="pos-label" style="display:inline-flex;align-items:center;gap:8px;">
                    ${window.getVictimSVG(type, 26)}
                    <span>${k2Labels[i]}</span>
                  </span>
                  <span class="pos-val">${type === 'real' ? 'KORBAN ASLI' : 'DUMMY'}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="bc-rand-side-box">
            <div class="bc-rand-side-head">K-3, K-4, K-5</div>
            <div class="bc-rand-side-list">
              <div class="bc-rand-side-row row-real">
                <span class="pos-label">K-3 &amp; K-4</span>
                <span class="pos-val">KORBAN ASLI (SZ-3 &amp; SZ-4)</span>
              </div>
              <div class="bc-rand-side-row row-real">
                <span class="pos-label">K-5</span>
                <span class="pos-val">KORBAN ASLI (SZ-5)</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      ${renderBroadcastFooter(state)}
    </div>
  `;
}

/**
 * SCENE 3: DAFTAR TIM & PERINGKAT SEMENTARA (No Tahapan Perlombaan table, No Urutan column)
 */
function renderRundownScene(state) {
  const activeRun = state.activeRun || {};
  const activeTrialIdx = Number((state.scoring && state.scoring.trialIndex) ?? activeRun.trialIndex ?? 0);
  const runsForTrial = (window.OFFICIAL_RUNDOWN_RUNS || []).filter((r) => r.trialIndex === activeTrialIdx);
  const ranked = window.getRankedTeams ? window.getRankedTeams(state) : [];
  const activeTeam = getTeamById(state, (state.scoring && state.scoring.activeTeamId) || activeRun.teamId);

  return `
    <div class="bc-scene bc-scene-rundown">
      ${renderBroadcastHeader(state)}

      <main class="bc-rundown-main bc-rundown-single-col">
        <div class="bc-rd-col">
          <div class="bc-rd-box-head">
            <span>DAFTAR TIM PESERTA - PERCOBAAN ${activeTrialIdx + 1}</span>
            <span class="bc-rd-active-tag">TIM AKTIF: ${activeTeam.name}</span>
          </div>
          <table class="bc-sb-table bc-rd-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Tim</th>
                <th>Perguruan Tinggi</th>
                <th>Skor Misi</th>
                <th>Finish</th>
                <th>Akhir</th>
              </tr>
            </thead>
            <tbody>
              ${runsForTrial.map((r, idx) => {
                const t = getTeamById(state, r.teamId);
                const tr = (t.trials && t.trials[r.trialIndex]) || {};
                const isCur = t.id === ((state.scoring && state.scoring.activeTeamId) || activeRun.teamId);
                const isLiveScored = isCur && state.scoring && state.scoring.activeTeamId === t.id && Number(state.scoring.trialIndex) === r.trialIndex;
                const liveCalc = isLiveScored ? window.calculateSARScore(state.scoring, state.matchTimer) : null;
                const hasData = tr.completed || (liveCalc && liveCalc.finalScore > 0);
                const rawVal = isLiveScored && liveCalc.finalScore > 0 ? liveCalc.rawScore : tr.rawScore;
                const bonusYN = isLiveScored && liveCalc.finalScore > 0 ? (liveCalc.bonusActive ? 'Y' : 'T') : (tr.bonusFinish ? 'Y' : 'T');
                const finalVal = isLiveScored && liveCalc.finalScore > 0 ? liveCalc.finalScore : tr.finalScore;

                return `
                  <tr class="${isCur ? 'active-row' : ''}">
                    <td><strong>${idx + 1}</strong></td>
                    <td><strong>${t.name}</strong></td>
                    <td>${t.university}</td>
                    <td>${hasData ? rawVal : '-'}</td>
                    <td>${hasData ? bonusYN : '-'}</td>
                    <td class="bc-sb-best-cell">${hasData ? finalVal : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="bc-rd-podium-strip bc-rd-podium-horizontal">
            <div class="bc-rd-pod-item">
              <span>PERINGKAT 1 SEMENTARA:</span>
              <strong>${ranked[0] && ranked[0].hasScore ? `${ranked[0].name} (${ranked[0].bestScore} Poin)` : 'Belum Ditentukan'}</strong>
            </div>
            <div class="bc-rd-pod-item">
              <span>PERINGKAT 2 SEMENTARA:</span>
              <strong>${ranked[1] && ranked[1].hasScore ? `${ranked[1].name} (${ranked[1].bestScore} Poin)` : 'Belum Ditentukan'}</strong>
            </div>
            <div class="bc-rd-pod-item">
              <span>PERINGKAT 3 SEMENTARA:</span>
              <strong>${ranked[2] && ranked[2].hasScore ? `${ranked[2].name} (${ranked[2].bestScore} Poin)` : 'Belum Ditentukan'}</strong>
            </div>
          </div>
        </div>
      </main>

      ${renderBroadcastFooter(state)}
    </div>
  `;
}

/**
 * SCENE 4 & 5: SESAAT LAGI & ISTIRAHAT
 */
/**
 * Helper: Render Official Broadcast Screen (KSTI 2026 Brand Standard)
 * Clean white canvas, top-right swoosh, faint watermark, official partner logos, and human typography
 */
function renderRefBroadcastScreen({ state, mode, kicker, titleLine1, titleLine2, titleLine3, isSubStatus, subtitle, badges, extraInfoHTML }) {
  const banners = (state && state.banners) || {};
  return `
    <div class="bc-scene bc-scene-ref-broadcast bc-ref-mode-${mode}">
      <!-- Top-Right Smooth Organic Swoosh (KSTI Navy Theme) -->
      <div class="bc-ref-top-swoosh"></div>

      <!-- Faint Typographic Watermark (KSTI Theme) -->
      <div class="bc-ref-watermark-bg" aria-hidden="true">KSTI 2026</div>

      <!-- Top Broadcast Logos Bar -->
      <header class="bc-ref-header">
        <div class="bc-ref-header-left">
          <img src="assets/partner_logos.png" alt="Kemdiktisaintek LPDP ITS KSTI 26" class="bc-ref-header-partners" />
          <div class="bc-ref-header-divider"></div>
          <div class="bc-ref-header-emblem-wrap">
            <img src="assets/ksti_cover_logo.png" alt="KRSRI KSTI 2026" class="bc-ref-header-emblem" />
          </div>
        </div>
        <div class="bc-ref-header-right">
          <span class="bc-ref-national-badge">${banners.stageBadge || 'Tingkat Nasional'}</span>
          <span class="bc-ref-header-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${banners.eventDate || 'Kamis, 12 November 2026'}
          </span>
        </div>
      </header>

      <!-- Main Stage: Single Clean Spacious Hero Stage (No Card Box) -->
      <main class="bc-ref-main">
        <div class="bc-ref-hero-side">
          <div class="bc-ref-category-kicker">${kicker}</div>
          <h1 class="bc-ref-main-title">
            <span class="bc-ref-title-p1">${titleLine1}</span>
            <span class="bc-ref-title-p2">${titleLine2}</span>
            <span class="${isSubStatus ? 'bc-ref-title-status' : 'bc-ref-title-year'}">${titleLine3}</span>
          </h1>
          <p class="bc-ref-event-subtitle">${subtitle}</p>
          ${extraInfoHTML || ''}
          <div class="bc-ref-meta-row">
            ${(badges || []).map((b) => `<span class="${b.className}">${b.text}</span>`).join('')}
          </div>
        </div>
      </main>

      <!-- Dynamic Curved Accent Line (KSTI Gold Theme) -->
      <div class="bc-ref-bottom-curve-wrap">
        <svg class="bc-ref-bottom-curve-svg" viewBox="0 0 1920 60" preserveAspectRatio="none">
          <path d="M 0,55 Q 750,55 960,18 T 1920,18" fill="none" stroke="#f5b800" stroke-width="4.5" />
        </svg>
      </div>

      <!-- Bottom Sponsor & Supporter Footer -->
      <footer class="bc-ref-footer">
        <div class="bc-ref-footer-left">
          <span class="bc-ref-sponsor-tag">Didukung &amp; Disponsori oleh:</span>
          <img src="assets/partner_logos.png" alt="Mitra &amp; Sponsor Resmi KSTI 2026" class="bc-ref-footer-logos" />
        </div>
        <div class="bc-ref-footer-right">
          <span class="bc-ref-footer-venue">${banners.eventVenue || 'Hall Robotika ITS, Surabaya'}</span>
          <span class="bc-ref-footer-sep">|</span>
          <span class="bc-ref-footer-org">Konvensi Sains, Teknologi, dan Industri Indonesia</span>
        </div>
      </footer>
    </div>
  `;
}

/**
 * SCENE 4 & 5: SESAAT LAGI & ISTIRAHAT (Official Broadcast Standard)
 */
function renderBreakOrSoonScene(state, mode = 'sesaat_lagi') {
  const banners = state.banners || {};
  const activeRun = state.activeRun || {};
  const activeTeam = getTeamById(state, (state.scoring && state.scoring.activeTeamId) || activeRun.teamId);
  const trialIndex = Number((state.scoring && state.scoring.trialIndex) ?? activeRun.trialIndex ?? 0);

  if (mode === 'sesaat_lagi') {
    const extraInfoHTML = `
      <div class="bc-ref-team-inline-bar">
        <span class="bc-ref-tib-tag">Percobaan ${trialIndex + 1}</span>
        <span class="bc-ref-tib-name">${activeTeam.name}</span>
        <span class="bc-ref-tib-uni">(${activeTeam.university})</span>
      </div>
    `;

    return renderRefBroadcastScreen({
      state,
      mode: 'sesaat_lagi',
      kicker: 'INFORMASI PERTANDINGAN',
      titleLine1: 'Sesaat',
      titleLine2: 'Lagi',
      titleLine3: banners.sesaatLagiTitle || 'Pertandingan Segera Dimulai',
      isSubStatus: true,
      subtitle: banners.sesaatLagiSubtitle || 'Harap seluruh tim dan penonton bersiap di arena kompetisi robotika',
      extraInfoHTML,
      badges: [
        { className: 'bc-ref-nat-pill', text: 'ARENA SAR KSTI 2026' },
        { className: 'bc-ref-venue-text', text: banners.eventVenue || 'Hall Robotika ITS, Surabaya' }
      ]
    });
  }

  // mode === 'istirahat'
  return renderRefBroadcastScreen({
    state,
    mode: 'istirahat',
    kicker: 'INFORMASI SESI RESMI',
    titleLine1: 'Jeda',
    titleLine2: 'Istirahat',
    titleLine3: banners.istirahatTitle || 'ISHOMA & Persiapan Arena',
    isSubStatus: true,
    subtitle: banners.istirahatSubtitle || 'Perlombaan dihentikan sementara untuk ibadah, istirahat, makan, dan sterilisasi arena',
    badges: [
      { className: 'bc-ref-nat-pill', text: 'JEDA RESMI KOMPETISI' },
      { className: 'bc-ref-venue-text', text: banners.eventVenue || 'Hall Robotika ITS, Surabaya' }
    ]
  });
}

/**
 * SCENE 6: WINNER SCENE
 */
function renderWinnerScene(state) {
  const winTeam = window.resolveWinnerTeam ? window.resolveWinnerTeam(state) : getTeamById(state, state.winner.teamId);
  const titleText = state.winner.titleText || 'WINNER';
  const subtitleText = state.winner.subtitleText || 'JUARA 1 - KSTI 2026 SEARCH AND RESCUE';
  const prizeText = state.winner.prizeText || 'Medali Emas + Sertifikat + Rp4.000.000,00';
  const scoreBadge = winTeam && winTeam.bestScore > 0
    ? `SKOR TERBAIK: ${winTeam.bestScore} POIN (${winTeam.bestTimeSec}s)`
    : prizeText;

  return `
    <div class="bc-scene bc-scene-winner">
      <div class="bc-winner-grid-bg"></div>
      ${renderBroadcastHeader(state)}

      <main class="bc-winner-main">
        <div class="bc-winner-team-name">${winTeam.name}</div>
        <div class="bc-winner-team-uni">${winTeam.university}</div>
        <div class="bc-winner-big-word">${titleText}</div>
        <div class="bc-winner-predicate-pill">
          <span>${subtitleText}</span>
          <span class="bc-winner-prize-sep">|</span>
          <span>${scoreBadge}</span>
        </div>
      </main>

      <div class="bc-winner-chevrons">
        <span></span><span></span><span></span><span></span><span></span>
      </div>

      ${renderBroadcastFooter(state)}
    </div>
  `;
}

/**
 * SCENE 7: SPLASH / TITLE SCREEN (Official Broadcast Standard)
 */
function renderSplashScene(state) {
  const banners = (state && state.banners) || {};

  return renderRefBroadcastScreen({
    state,
    mode: 'splash',
    kicker: 'KONTES ROBOT SEARCH AND RESCUE',
    titleLine1: 'Kontes Robot',
    titleLine2: 'Search and Rescue',
    titleLine3: '2026',
    isSubStatus: false,
    subtitle: 'Konvensi Sains, Teknologi, dan Industri Indonesia (KSTI 2026)',
    badges: [
      { className: 'bc-ref-nat-pill', text: banners.stageBadge || 'Tingkat Nasional' },
      { className: 'bc-ref-venue-text', text: banners.eventVenue || 'Hall Robotika ITS, Surabaya' },
      { className: 'bc-ref-date-pill', text: banners.eventDate || 'Kamis, 12 November 2026' }
    ]
  });
}

/**
 * SCENE 8: OFFICIAL SCOREBOARD & 12-TEAM LEADERBOARD SCENE (No Urutan Column)
 */
function renderScoreboardScene(state) {
  const scoring = state.scoring || {};
  const activeTeam = getTeamById(state, scoring.activeTeamId);
  const calc = window.calculateSARScore(scoring, state.matchTimer);
  const ranked = window.getRankedTeams ? window.getRankedTeams(state) : [];

  return `
    <div class="bc-scene bc-scene-scoreboard">
      ${renderBroadcastHeader(state)}

      <main class="bc-sb-main">
        <div class="bc-sb-left">
          <div class="bc-sb-team-banner">
            <div>
              <div class="bc-sb-trial-tag">PERCOBAAN ${(scoring.trialIndex || 0) + 1}</div>
              <h2>${activeTeam.name}</h2>
              <p>${activeTeam.university}</p>
            </div>
            <div class="bc-sb-big-total">
              <span>SCORE</span>
              <strong>${calc.finalScore}</strong>
            </div>
          </div>

          <div class="bc-sb-breakdown-grid">
            <div class="bc-sb-item ${scoring.keluarHome ? 'done' : ''}">
              <span>1. Keluar START</span>
              <strong>${scoring.keluarHome ? '50' : '0'}</strong>
            </div>
            ${['k1', 'k2', 'k3', 'k4', 'k5'].map((k, idx) => {
              const m = (scoring.missions && scoring.missions[k]) || {};
              const pts = (m.lifted ? 50 : 0) + (m.safeZone ? 50 : 0);
              return `
                <div class="bc-sb-item ${pts === 100 ? 'done' : pts > 0 ? 'partial' : ''}">
                  <span>Misi K-${idx + 1} ke SZ-${idx + 1}</span>
                  <strong>${pts}</strong>
                </div>
              `;
            }).join('')}
            <div class="bc-sb-item ${scoring.r1 !== 'none' ? 'done' : ''}">
              <span>Rintangan 1 (R1)</span>
              <strong>${scoring.r1 === 'with_victim' ? 150 : scoring.r1 === 'without_victim' ? 100 : 0}</strong>
            </div>
            <div class="bc-sb-item ${scoring.r2 !== 'none' ? 'done' : ''}">
              <span>Rintangan 2 (R2)</span>
              <strong>${scoring.r2 === 'with_victim' ? 300 : scoring.r2 === 'without_victim' ? 150 : 0}</strong>
            </div>
          </div>

          <div class="bc-sb-formula-bar">
            <div>Skor Misi: <strong>${calc.rawScore}</strong></div>
            <div>Waktu: <strong>${calc.timeSec}s</strong></div>
            <div>Finish: <strong>${calc.bonusActive ? `+${calc.bonusPoints}` : '0'}</strong></div>
          </div>
        </div>

        <div class="bc-sb-right">
          <h3 class="bc-sb-leader-title">REKAP SKOR TERBAIK &amp; PERINGKAT (12 TIM)</h3>
          <table class="bc-sb-table bc-sb-table-12">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Nama Tim</th>
                <th>Perguruan Tinggi</th>
                <th>P1</th>
                <th>P2</th>
                <th>P3</th>
                <th>Terbaik</th>
              </tr>
            </thead>
            <tbody>
              ${ranked.map((t) => `
                <tr class="${t.id === scoring.activeTeamId ? 'active-row' : ''}">
                  <td><strong>#${t.rank}</strong></td>
                  <td><span class="bc-sb-tname">${t.name}</span></td>
                  <td><span class="bc-sb-tuni">${t.university}</span></td>
                  <td>${t.trialScores[0] ? t.trialScores[0].score : '-'}</td>
                  <td>${t.trialScores[1] ? t.trialScores[1].score : '-'}</td>
                  <td>${t.trialScores[2] ? t.trialScores[2].score : '-'}</td>
                  <td class="bc-sb-best-cell">${t.bestScore}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </main>

      ${renderBroadcastFooter(state)}
    </div>
  `;
}

function renderBroadcastScene(state) {
  const scene = (state && state.activeScene) || 'live_match';
  if (scene === 'randomizer') return renderRandomizerScene(state);
  if (scene === 'rundown' || scene === 'divisions') return renderRundownScene(state);
  if (scene === 'sesaat_lagi') return renderBreakOrSoonScene(state, 'sesaat_lagi');
  if (scene === 'istirahat') return renderBreakOrSoonScene(state, 'istirahat');
  if (scene === 'winner') return renderWinnerScene(state);
  if (scene === 'splash') return renderSplashScene(state);
  if (scene === 'scoreboard') return renderScoreboardScene(state);
  return renderLiveMatchScene(state);
}

/**
 * Shared Local Webcam Manager
 */
const activeMediaStreams = {};
let pendingDefaultStreamPromise = null;

async function getOrRequestStream(deviceId) {
  const key = deviceId || 'default_local_cam';
  if (activeMediaStreams[key] && activeMediaStreams[key].active) {
    return activeMediaStreams[key];
  }
  if (!deviceId) {
    if (!pendingDefaultStreamPromise) {
      pendingDefaultStreamPromise = navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          activeMediaStreams[key] = stream;
          pendingDefaultStreamPromise = null;
          return stream;
        })
        .catch((err) => {
          pendingDefaultStreamPromise = null;
          throw err;
        });
    }
    return pendingDefaultStreamPromise;
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId } },
    audio: false
  });
  activeMediaStreams[key] = stream;
  return stream;
}

async function hydrateWebcamSlots(rootEl) {
  if (!rootEl) return;
  const wraps = rootEl.querySelectorAll('.bc-cam-webcam-wrap');
  if (!wraps.length) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    wraps.forEach((w) => {
      const msg = w.querySelector('.bc-cam-status-msg');
      if (msg) msg.textContent = 'Browser tidak mendukung akses kamera lokal';
    });
    return;
  }

  for (const wrap of wraps) {
    const deviceId = wrap.getAttribute('data-device-id') || '';
    const videoLive = wrap.querySelector('.bc-cam-video-live') || wrap.querySelector('video:not(.bc-cam-video-replay)');
    const msgEl = wrap.querySelector('.bc-cam-status-msg');
    if (!videoLive) continue;

    try {
      const stream = await getOrRequestStream(deviceId);
      if (videoLive.srcObject !== stream) {
        videoLive.srcObject = stream;
        videoLive.play().catch(() => {});
      }
      if (msgEl) msgEl.style.display = 'none';

      const isInsideIframe = (typeof window !== 'undefined') && (window.self !== window.top);
      if (!isInsideIframe && window.KSTIDvr && typeof window.KSTIDvr.attachToPlayer === 'function') {
        wrap._dvrPlayer = window.KSTIDvr.attachToPlayer(wrap, stream);
      }
    } catch (err) {
      if (msgEl) {
        msgEl.style.display = 'flex';
        msgEl.textContent = 'Menunggu izin kamera arena...';
      }
    }
  }
}

window.formatTimerDigits = formatTimerDigits;
window.formatTimerMMSS = formatTimerMMSS;
window.renderBroadcastScene = renderBroadcastScene;
window.hydrateWebcamSlots = hydrateWebcamSlots;
