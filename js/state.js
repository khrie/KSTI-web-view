/**
 * KSTI 2026 - Search and Rescue (SAR)
 * State Management, 12 Official Teams (CSV), Dual Timers & Live Sync
 */

const STORAGE_KEY = 'KSTI_SAR_2026_STATE_V6';
const CHANNEL_NAME = 'ksti_sar_2026_broadcast_v6';

const DEFAULT_TEAMS = [
  {
    id: 'team_1',
    urutan: 1,
    name: 'Tim Kebut Seminggu',
    university: 'Universitas Airlangga',
    shortUni: 'Universitas Airlangga',
    city: 'Surabaya'
  },
  {
    id: 'team_2',
    urutan: 2,
    name: 'R2c Legacy',
    university: 'Universitas Kristen Satya Wacana',
    shortUni: 'Universitas Kristen Satya Wacana',
    city: 'Salatiga'
  },
  {
    id: 'team_3',
    urutan: 3,
    name: 'Satria',
    university: 'Universitas Jenderal Soedirman',
    shortUni: 'Universitas Jenderal Soedirman',
    city: 'Banyumas'
  },
  {
    id: 'team_4',
    urutan: 4,
    name: 'Tirtapod',
    university: 'Universitas Sultan Ageng Tirtayasa',
    shortUni: 'Universitas Sultan Ageng Tirtayasa',
    city: 'Kota Cilegon'
  },
  {
    id: 'team_5',
    urutan: 5,
    name: 'Dewayani',
    university: 'Universitas Negeri Surabaya',
    shortUni: 'Universitas Negeri Surabaya',
    city: 'Surabaya'
  },
  {
    id: 'team_6',
    urutan: 6,
    name: 'Abinara-1',
    university: 'Institut Teknologi Sepuluh Nopember',
    shortUni: 'Institut Teknologi Sepuluh Nopember',
    city: 'Surabaya'
  },
  {
    id: 'team_7',
    urutan: 7,
    name: 'Krakatau Ashibot',
    university: 'Universitas Teknokrat Indonesia',
    shortUni: 'Universitas Teknokrat Indonesia',
    city: 'Bandar Lampung'
  },
  {
    id: 'team_8',
    urutan: 8,
    name: 'HEXA CAKRAWALA',
    university: 'Universitas Negeri Malang',
    shortUni: 'Universitas Negeri Malang',
    city: 'Malang'
  },
  {
    id: 'team_9',
    urutan: 9,
    name: 'Al-Fatih',
    university: 'Universitas Gadjah Mada',
    shortUni: 'Universitas Gadjah Mada',
    city: 'Yogyakarta'
  },
  {
    id: 'team_10',
    urutan: 10,
    name: 'Championships',
    university: 'Politeknik Perkapalan Negeri Surabaya',
    shortUni: 'Politeknik Perkapalan Negeri Surabaya',
    city: 'Surabaya'
  },
  {
    id: 'team_11',
    urutan: 11,
    name: 'Andromeda',
    university: 'Universitas Diponegoro',
    shortUni: 'Universitas Diponegoro',
    city: 'Semarang'
  },
  {
    id: 'team_12',
    urutan: 12,
    name: 'EILERO TEAM',
    university: 'Politeknik Elektronika Negeri Surabaya',
    shortUni: 'Politeknik Elektronika Negeri Surabaya',
    city: 'Surabaya'
  }
].map((t) =>
  Object.assign({}, t, {
    trials: [
      { completed: false, rawScore: 0, bonusPoints: 0, finalScore: 0, bonusFinish: false, timeSec: 300, retryUsed: false, notes: '' },
      { completed: false, rawScore: 0, bonusPoints: 0, finalScore: 0, bonusFinish: false, timeSec: 300, retryUsed: false, notes: '' },
      { completed: false, rawScore: 0, bonusPoints: 0, finalScore: 0, bonusFinish: false, timeSec: 300, retryUsed: false, notes: '' }
    ]
  })
);

const OFFICIAL_RUNDOWN_RUNS = [
  // Percobaan 1
  { runNo: 1, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_1', trialIndex: 0, urutan: 1, teamId: 'team_1' },
  { runNo: 2, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_2', trialIndex: 0, urutan: 2, teamId: 'team_2' },
  { runNo: 3, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_3', trialIndex: 0, urutan: 3, teamId: 'team_3' },
  { runNo: 4, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_4', trialIndex: 0, urutan: 4, teamId: 'team_4' },
  { runNo: 5, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_5', trialIndex: 0, urutan: 5, teamId: 'team_5' },
  { runNo: 6, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_6', trialIndex: 0, urutan: 6, teamId: 'team_6' },
  { runNo: 7, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_7', trialIndex: 0, urutan: 7, teamId: 'team_7' },
  { runNo: 8, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_8', trialIndex: 0, urutan: 8, teamId: 'team_8' },
  { runNo: 9, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_9', trialIndex: 0, urutan: 9, teamId: 'team_9' },
  { runNo: 10, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_10', trialIndex: 0, urutan: 10, teamId: 'team_10' },
  { runNo: 11, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_11', trialIndex: 0, urutan: 11, teamId: 'team_11' },
  { runNo: 12, session: 'Percobaan 1', sessionGroup: 'p1', code: 'run_12', trialIndex: 0, urutan: 12, teamId: 'team_12' },

  // Percobaan 2
  { runNo: 13, session: 'Percobaan 2', sessionGroup: 'p2_1', code: 'run_13', trialIndex: 1, urutan: 1, teamId: 'team_1' },
  { runNo: 14, session: 'Percobaan 2', sessionGroup: 'p2_1', code: 'run_14', trialIndex: 1, urutan: 2, teamId: 'team_2' },
  { runNo: 15, session: 'Percobaan 2', sessionGroup: 'p2_1', code: 'run_15', trialIndex: 1, urutan: 3, teamId: 'team_3' },
  { runNo: 16, session: 'Percobaan 2', sessionGroup: 'p2_1', code: 'run_16', trialIndex: 1, urutan: 4, teamId: 'team_4' },
  { runNo: 17, session: 'Percobaan 2', sessionGroup: 'p2_1', code: 'run_17', trialIndex: 1, urutan: 5, teamId: 'team_5' },
  { runNo: 18, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_18', trialIndex: 1, urutan: 6, teamId: 'team_6' },
  { runNo: 19, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_19', trialIndex: 1, urutan: 7, teamId: 'team_7' },
  { runNo: 20, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_20', trialIndex: 1, urutan: 8, teamId: 'team_8' },
  { runNo: 21, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_21', trialIndex: 1, urutan: 9, teamId: 'team_9' },
  { runNo: 22, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_22', trialIndex: 1, urutan: 10, teamId: 'team_10' },
  { runNo: 23, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_23', trialIndex: 1, urutan: 11, teamId: 'team_11' },
  { runNo: 24, session: 'Percobaan 2', sessionGroup: 'p2_2', code: 'run_24', trialIndex: 1, urutan: 12, teamId: 'team_12' },

  // Percobaan 3
  { runNo: 25, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_25', trialIndex: 2, urutan: 1, teamId: 'team_1' },
  { runNo: 26, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_26', trialIndex: 2, urutan: 2, teamId: 'team_2' },
  { runNo: 27, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_27', trialIndex: 2, urutan: 3, teamId: 'team_3' },
  { runNo: 28, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_28', trialIndex: 2, urutan: 4, teamId: 'team_4' },
  { runNo: 29, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_29', trialIndex: 2, urutan: 5, teamId: 'team_5' },
  { runNo: 30, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_30', trialIndex: 2, urutan: 6, teamId: 'team_6' },
  { runNo: 31, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_31', trialIndex: 2, urutan: 7, teamId: 'team_7' },
  { runNo: 32, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_32', trialIndex: 2, urutan: 8, teamId: 'team_8' },
  { runNo: 33, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_33', trialIndex: 2, urutan: 9, teamId: 'team_9' },
  { runNo: 34, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_34', trialIndex: 2, urutan: 10, teamId: 'team_10' },
  { runNo: 35, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_35', trialIndex: 2, urutan: 11, teamId: 'team_11' },
  { runNo: 36, session: 'Percobaan 3', sessionGroup: 'p3', code: 'run_36', trialIndex: 2, urutan: 12, teamId: 'team_12' }
];

function createEmptyScoringFor(teamId = 'team_1', trialIndex = 0, runCode = 'run_1') {
  return {
    activeRunCode: runCode,
    activeTeamId: teamId,
    trialIndex: Number(trialIndex) || 0,
    keluarHome: false,
    missions: {
      k1: { lifted: false, safeZone: false },
      k2: { lifted: false, safeZone: false },
      k3: { lifted: false, safeZone: false },
      k4: { lifted: false, safeZone: false },
      k5: { lifted: false, safeZone: false }
    },
    r1: 'none',
    r2: 'none',
    reachedFinish: false,
    bonusFinishChecked: false,
    finishTimeSec: 180,
    retryCount: 0,
    retryRestartTimeSec: 0
  };
}

const DEFAULT_STATE = {
  lastUpdated: Date.now(),
  activeScene: 'live_match',
  autoSyncLiveScoreToTrial: true,

  // Separate Preparation Timer (3 Menit / 180s) & Match Timer (5 Menit / 300s)
  activeTimerType: 'match',
  prepTimer: {
    durationSec: 180,
    remainingSec: 180,
    baseRemainingSec: 180,
    isRunning: false,
    startedAt: null
  },
  matchTimer: {
    durationSec: 300,
    remainingSec: 300,
    baseRemainingSec: 300,
    isRunning: false,
    startedAt: null,
    retryTimestampSec: null
  },

  randomizer: {
    isRolling: false,
    rollId: 0,
    lastRolledAt: null,
    k1: {
      slots: ['dummy', 'real', 'dummy'],
      realIndex: 1
    },
    k2: {
      slots: ['dummy', 'real'],
      realIndex: 1
    },
    history: []
  },

  teams: DEFAULT_TEAMS,

  activeRun: {
    runCode: 'run_1',
    runNo: 1,
    teamId: 'team_1',
    trialIndex: 0,
    session: 'Percobaan 1'
  },

  winner: {
    mode: 'auto_score',
    teamId: 'team_1',
    titleText: 'WINNER',
    subtitleText: 'JUARA 1 - KSTI 2026 SEARCH AND RESCUE',
    prizeText: 'Medali Emas + Sertifikat + Rp4.000.000,00'
  },

  banners: {
    sesaatLagiTitle: 'SESAAT LAGI',
    sesaatLagiSubtitle: 'Giliran Pertandingan Berikutnya Akan Segera Dimulai',
    istirahatTitle: 'ISTIRAHAT / ISHOMA',
    istirahatSubtitle: 'Sesi Istirahat dan Persiapan Arena Lomba',
    eventDate: 'Kamis, 12 November 2026',
    eventVenue: 'Hall Robotika ITS, Surabaya',
    stageBadge: 'Tingkat Nasional'
  },

  camera: {
    mode: 'webcam',
    deviceId: '',
    label: 'Kamera Arena Lomba',
    wirelessOption: 'link_to_windows',
    linkToWindowsDeviceId: '',
    linkToWindowsLabel: '',
    iriunDeviceId: '',
    iriunLabel: '',
    varSyncToDisplay: true,
    varState: {
      isLive: true,
      seekOffsetSec: 0,
      playbackRate: 1.0,
      isPaused: false
    }
  },

  scoring: createEmptyScoringFor('team_1', 0, 'run_1'),
  soundEnabled: false
};

function getMatchTimerElapsedSec(matchTimer, fallbackSec = 180) {
  if (!matchTimer) return fallbackSec;
  let rem = Number(matchTimer.remainingSec);
  if (matchTimer.isRunning && matchTimer.startedAt) {
    const elapsedLive = (Date.now() - matchTimer.startedAt) / 1000;
    rem = Math.max(0, Math.floor((matchTimer.baseRemainingSec || 300) - elapsedLive));
  }
  const startRef = Number(matchTimer.retryTimestampSec) || Number(matchTimer.durationSec) || 300;
  const used = Math.round(startRef - rem);
  if (used <= 0) {
    return matchTimer.isRunning ? 1 : fallbackSec;
  }
  return Math.max(1, Math.min(299, used));
}

function calculateSARScore(scoring, matchTimer = null) {
  if (!scoring) {
    return {
      rawScore: 0,
      completedMissions: 0,
      all5MissionsDone: false,
      bonusChecked: false,
      bonusActive: false,
      eligibleForBonus: false,
      bonusPoints: 0,
      finalScore: 0,
      timeSec: 180
    };
  }

  let rawScore = 0;
  if (scoring.keluarHome) rawScore += 50;

  let completedMissions = 0;
  const missions = scoring.missions || {};
  ['k1', 'k2', 'k3', 'k4', 'k5'].forEach((k) => {
    const m = missions[k];
    if (m) {
      if (m.lifted) rawScore += 50;
      if (m.safeZone) {
        rawScore += 50;
        completedMissions += 1;
      }
    }
  });

  if (scoring.r1 === 'without_victim') rawScore += 100;
  else if (scoring.r1 === 'with_victim') rawScore += 150;

  if (scoring.r2 === 'without_victim') rawScore += 150;
  else if (scoring.r2 === 'with_victim') rawScore += 300;

  const all5MissionsDone = completedMissions === 5;
  const bonusChecked = Boolean(scoring.bonusFinishChecked || scoring.reachedFinish);

  let rawTime = Number(scoring.finishTimeSec);
  if (!Number.isFinite(rawTime) || rawTime <= 0) {
    rawTime = matchTimer ? getMatchTimerElapsedSec(matchTimer, 180) : 180;
  }
  const timeSec = Math.max(1, Math.min(300, Math.round(rawTime)));

  // Sesuai Buku Panduan SAR KSTI 2026 Bab III.F.4 & Rundown:
  // Total Score dengan Bonus = Total Score * (300 / Waktu Selesai dalam detik)
  // Berlaku apabila robot mencapai Finish sebelum waktu 300 detik habis (1 <= timeSec < 300)
  const bonusActive = bonusChecked && rawScore > 0 && timeSec > 0 && timeSec < 300;

  let finalScore = rawScore;
  let bonusPoints = 0;
  if (bonusActive) {
    finalScore = Math.round((rawScore * 300) / timeSec);
    bonusPoints = Math.max(0, finalScore - rawScore);
  }

  return {
    rawScore,
    completedMissions,
    all5MissionsDone,
    bonusChecked,
    bonusActive,
    eligibleForBonus: bonusActive,
    bonusPoints,
    finalScore,
    timeSec
  };
}

function getRunByCode(runCode) {
  return OFFICIAL_RUNDOWN_RUNS.find((r) => r.code === runCode) || OFFICIAL_RUNDOWN_RUNS[0];
}

function getRunByTeamAndTrial(teamId, trialIndex) {
  const tIdx = Number(trialIndex) || 0;
  return (
    OFFICIAL_RUNDOWN_RUNS.find((r) => r.teamId === teamId && r.trialIndex === tIdx) ||
    OFFICIAL_RUNDOWN_RUNS[0]
  );
}

function getNextRun(currentRunCode) {
  const idx = OFFICIAL_RUNDOWN_RUNS.findIndex((r) => r.code === currentRunCode);
  if (idx >= 0 && idx + 1 < OFFICIAL_RUNDOWN_RUNS.length) {
    return OFFICIAL_RUNDOWN_RUNS[idx + 1];
  }
  return null;
}

function getPrevRun(currentRunCode) {
  const idx = OFFICIAL_RUNDOWN_RUNS.findIndex((r) => r.code === currentRunCode);
  if (idx > 0) {
    return OFFICIAL_RUNDOWN_RUNS[idx - 1];
  }
  return null;
}

function getTeamBestStats(team, state) {
  let bestScore = -1;
  let bestTimeSec = 300;
  let hasCompletedTrial = false;

  const trialScores = [null, null, null];

  if (team && Array.isArray(team.trials)) {
    team.trials.forEach((tr, idx) => {
      if (tr && (tr.completed || tr.finalScore > 0)) {
        hasCompletedTrial = true;
        const s = Number(tr.finalScore) || 0;
        const t = Number(tr.timeSec) || 300;
        trialScores[idx] = { score: s, timeSec: t, bonusFinish: Boolean(tr.bonusFinish) };
        if (s > bestScore || (s === bestScore && t < bestTimeSec)) {
          bestScore = s;
          bestTimeSec = t;
        }
      }
    });
  }

  if (state && state.scoring && state.scoring.activeTeamId === team.id) {
    const liveCalc = calculateSARScore(state.scoring, state.matchTimer);
    const tIdx = Number(state.scoring.trialIndex) || 0;
    const anyChecked =
      state.scoring.keluarHome ||
      state.scoring.r1 !== 'none' ||
      state.scoring.r2 !== 'none' ||
      state.scoring.bonusFinishChecked ||
      Object.values(state.scoring.missions || {}).some((m) => m && (m.lifted || m.safeZone));

    if (anyChecked || liveCalc.finalScore > 0) {
      hasCompletedTrial = true;
      trialScores[tIdx] = {
        score: liveCalc.finalScore,
        timeSec: liveCalc.timeSec,
        bonusFinish: liveCalc.bonusActive,
        isLive: true
      };
      if (
        liveCalc.finalScore > bestScore ||
        (liveCalc.finalScore === bestScore && liveCalc.timeSec < bestTimeSec)
      ) {
        bestScore = liveCalc.finalScore;
        bestTimeSec = liveCalc.timeSec;
      }
    }
  }

  return {
    bestScore: Math.max(0, bestScore),
    bestTimeSec,
    hasScore: hasCompletedTrial,
    trialScores
  };
}

function getRankedTeams(state) {
  const teams = (state && state.teams) || DEFAULT_TEAMS;
  const enriched = teams.map((t, i) => {
    const stats = getTeamBestStats(t, state);
    return Object.assign({}, t, stats, {
      urutan: t.urutan || i + 1
    });
  });

  const sorted = [...enriched].sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
    if (a.bestTimeSec !== b.bestTimeSec) return a.bestTimeSec - b.bestTimeSec;
    return a.urutan - b.urutan;
  });

  return sorted.map((t, idx) => Object.assign({}, t, { rank: idx + 1 }));
}

function resolveWinnerTeam(state) {
  const ranked = getRankedTeams(state);
  const winnerCfg = (state && state.winner) || {};
  const mode = winnerCfg.mode || 'auto_score';

  if (mode === 'manual') {
    const manualTeam = ranked.find((t) => t.id === winnerCfg.teamId);
    if (manualTeam) return manualTeam;
  }

  if (ranked[0] && ranked[0].bestScore === 0 && !ranked[0].hasScore) {
    const activeTeam = ranked.find((t) => state && state.scoring && t.id === state.scoring.activeTeamId);
    if (activeTeam) return activeTeam;
  }

  return ranked[0];
}

function getVictimSVG(type = 'real', size = 72) {
  if (type === 'real') {
    return `
      <svg class="victim-svg" width="${size}" height="${size}" viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="16,108 38,98 82,98 104,108 94,120 26,120" fill="#f59e0b" stroke="#92400e" stroke-width="2.5"/>
        <polygon points="38,52 60,46 82,52 76,102 44,102" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
        <polygon points="40,62 24,42 30,22 48,20 46,30 34,32 34,42 44,54" fill="#f59e0b" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="80,62 96,42 90,22 72,20 74,30 86,32 86,42 76,54" fill="#f59e0b" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="60,10 74,18 72,38 60,44 48,38 46,18" fill="#fcd34d" stroke="#92400e" stroke-width="2"/>
      </svg>`;
  }
  return `
    <svg class="victim-svg" width="${size}" height="${size}" viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="110" rx="34" ry="9" fill="#ea580c" stroke="#7c2d12" stroke-width="2"/>
      <polygon points="40,48 60,42 80,48 72,106 48,106" fill="#fb923c" stroke="#7c2d12" stroke-width="2" stroke-linejoin="round"/>
      <rect x="50" y="24" width="20" height="19" rx="3" fill="#f97316" stroke="#7c2d12" stroke-width="2"/>
    </svg>`;
}

/**
 * Silent SoundFX stub (sound disabled per user request)
 */
class SoundFX {
  init() {}
  beep() {}
  playTick() {}
  playReveal() {}
  playStartWhistle() {}
  playBuzzer() {}
  playFanfare() {}
}

class KSTIStateStore {
  constructor() {
    this.listeners = new Set();
    this.childWindow = null;
    this.state = this.loadFromStorage();
    this.channel = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'STATE_SYNC') {
            this.applyExternalState(ev.data.state);
          }
        };
      } catch (e) {}
    }

    window.addEventListener('storage', (ev) => {
      if (ev.key === STORAGE_KEY && ev.newValue) {
        try {
          this.applyExternalState(JSON.parse(ev.newValue));
        } catch (e) {}
      }
    });

    window.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'STATE_SYNC') {
        this.applyExternalState(ev.data.state);
      } else if (ev.data && ev.data.type === 'REQUEST_STATE') {
        this.broadcast();
      }
    });

    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'REQUEST_STATE' }, '*');
      } catch (e) {}
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return this.mergeWithDefault(JSON.parse(raw));
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  mergeWithDefault(partial) {
    const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
    const mergedTeams = Array.isArray(partial.teams) && partial.teams.length >= 12
      ? partial.teams
      : base.teams;

    return Object.assign(base, partial, {
      teams: mergedTeams,
      prepTimer: Object.assign({}, base.prepTimer, partial.prepTimer || {}),
      matchTimer: Object.assign({}, base.matchTimer, partial.matchTimer || {}),
      randomizer: Object.assign({}, base.randomizer, partial.randomizer || {}),
      activeRun: Object.assign({}, base.activeRun, partial.activeRun || {}),
      winner: Object.assign({}, base.winner, partial.winner || {}),
      banners: Object.assign({}, base.banners, partial.banners || {}),
      camera: Object.assign({}, base.camera, partial.camera || {}, {
        varState: Object.assign({}, base.camera.varState, (partial.camera && partial.camera.varState) || {})
      }),
      scoring: Object.assign({}, base.scoring, partial.scoring || {}, {
        missions: Object.assign({}, base.scoring.missions, (partial.scoring && partial.scoring.missions) || {})
      }),
      soundEnabled: false
    });
  }

  getState() {
    return this.state;
  }

  setState(updater) {
    const nextState = typeof updater === 'function' ? updater(this.state) : Object.assign({}, this.state, updater);
    nextState.lastUpdated = Date.now();
    this.state = nextState;
    this.saveToStorage();
    this.broadcast();
    this.notify();
  }

  applyExternalState(newState) {
    if (!newState) return;
    this.state = this.mergeWithDefault(newState);
    this.saveToStorage();
    this.notify();
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {}
  }

  broadcast() {
    const msg = { type: 'STATE_SYNC', state: this.state };
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {}
    }
    if (this.childWindow && !this.childWindow.closed) {
      try {
        this.childWindow.postMessage(msg, '*');
      } catch (e) {}
    }
    if (window.opener) {
      try {
        window.opener.postMessage(msg, '*');
      } catch (e) {}
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (e) {
        console.error(e);
      }
    });
  }

  openDisplayWindow() {
    const w = 1280;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    this.childWindow = window.open(
      'display.html',
      'KSTI_SAR_2026_DISPLAY',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    setTimeout(() => this.broadcast(), 300);
    setTimeout(() => this.broadcast(), 900);
    return this.childWindow;
  }
}

window.KSTISound = new SoundFX();
window.KSTIStore = new KSTIStateStore();
window.DEFAULT_TEAMS = DEFAULT_TEAMS;
window.OFFICIAL_RUNDOWN_RUNS = OFFICIAL_RUNDOWN_RUNS;
window.createEmptyScoringFor = createEmptyScoringFor;
window.getMatchTimerElapsedSec = getMatchTimerElapsedSec;
window.calculateSARScore = calculateSARScore;
window.getRunByCode = getRunByCode;
window.getRunByTeamAndTrial = getRunByTeamAndTrial;
window.getNextRun = getNextRun;
window.getPrevRun = getPrevRun;
window.getTeamBestStats = getTeamBestStats;
window.getRankedTeams = getRankedTeams;
window.resolveWinnerTeam = resolveWinnerTeam;
window.getVictimSVG = getVictimSVG;
