/**
 * KSTI 2026 - Search and Rescue (SAR)
 * Interactive Arena Map with Exact Zone (SZ-1..SZ-5) & Survivor Placement Markers (K-1..K-5)
 */

function renderArenaMapSVG(state, options = {}) {
  const k1Slots = (state && state.randomizer && state.randomizer.k1 && state.randomizer.k1.slots) || ['dummy', 'real', 'dummy'];
  const k2Slots = (state && state.randomizer && state.randomizer.k2 && state.randomizer.k2.slots) || ['dummy', 'real'];
  const isRolling = Boolean(state && state.randomizer && state.randomizer.isRolling);

  // Exact coordinates on flate_11_1723x828.png (viewBox 0 0 1723 828)
  // K-1 3 slots in niche above START: KIRI, TENGAH, KANAN
  const k1Coords = [
    { x: 682, y: 368, label: 'KIRI' },
    { x: 717, y: 350, label: 'TENGAH' },
    { x: 753, y: 368, label: 'KANAN' }
  ];

  // K-2 2 slots in right-middle pocket: KIRI, KANAN
  const k2Coords = [
    { x: 1412, y: 492, label: 'KIRI' },
    { x: 1440, y: 522, label: 'KANAN' }
  ];

  const markerFill = (type) => (type === 'real' ? '#16a34a' : '#475569');
  const markerStroke = (type) => (type === 'real' ? '#fde047' : '#cbd5e1');

  const renderMiniVictimIcon = (isReal) =>
    isReal
      ? `
        <polygon points="16,108 38,98 82,98 104,108 94,120 26,120" fill="#f59e0b" stroke="#92400e" stroke-width="3"/>
        <polygon points="38,52 60,46 82,52 76,102 44,102" fill="#fbbf24" stroke="#92400e" stroke-width="2.5"/>
        <polygon points="40,62 24,42 30,22 48,20 46,30 34,32 34,42 44,54" fill="#f59e0b" stroke="#92400e" stroke-width="2.5"/>
        <polygon points="80,62 96,42 90,22 72,20 74,30 86,32 86,42 76,54" fill="#f59e0b" stroke="#92400e" stroke-width="2.5"/>
        <polygon points="60,10 74,18 72,38 60,44 48,38 46,18" fill="#fcd34d" stroke="#92400e" stroke-width="2.5"/>
      `
      : `
        <ellipse cx="60" cy="110" rx="34" ry="9" fill="#ea580c" stroke="#7c2d12" stroke-width="3"/>
        <polygon points="40,48 60,42 80,48 72,106 48,106" fill="#fb923c" stroke="#7c2d12" stroke-width="2.5"/>
        <rect x="50" y="24" width="20" height="19" rx="3" fill="#f97316" stroke="#7c2d12" stroke-width="2.5"/>
      `;

  return `
  <div class="arena-map-interactive-wrapper ${isRolling ? 'arena-rolling' : ''}">
    <svg viewBox="0 0 1723 828" class="arena-3d-overlay-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="dropShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.55"/>
        </filter>
      </defs>

      <!-- Official 3D Arena Render -->
      <image href="assets/pdf_images/flate_11_1723x828.png" x="0" y="0" width="1723" height="828" preserveAspectRatio="xMidYMid meet" />

      <!-- ==================== AREA & ZONE LABELS ON ARENA ==================== -->
      <!-- START (Bottom-left black room with orange robot) -->
      <g transform="translate(495, 455)" filter="url(#dropShadow)">
        <rect x="-58" y="-20" width="116" height="40" rx="4" fill="#003876" stroke="#f5b800" stroke-width="2.5"/>
        <text x="0" y="7" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="800" font-family="Segoe UI, sans-serif">START</text>
      </g>

      <!-- FINISH (Left black room below M3) -->
      <g transform="translate(250, 345)" filter="url(#dropShadow)">
        <rect x="-62" y="-20" width="124" height="40" rx="4" fill="#15803d" stroke="#fde047" stroke-width="2.5"/>
        <text x="0" y="7" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="800" font-family="Segoe UI, sans-serif">FINISH</text>
      </g>

      <!-- SZ-5 (Far-left white trapezoid ledge next to FINISH) -->
      <g transform="translate(85, 330)" filter="url(#dropShadow)">
        <rect x="-36" y="-15" width="72" height="30" rx="3" fill="#003876" stroke="#f5b800" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">SZ-5</text>
      </g>

      <!-- SZ-4 (Top-left wall pad below K-5) -->
      <g transform="translate(195, 125)" filter="url(#dropShadow)">
        <rect x="-36" y="-15" width="72" height="30" rx="3" fill="#003876" stroke="#f5b800" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">SZ-4</text>
      </g>

      <!-- K-5 (Top-left corner victim) -->
      <g transform="translate(275, 42)" filter="url(#dropShadow)">
        <circle cx="0" cy="0" r="22" fill="#16a34a" stroke="#fde047" stroke-width="3"/>
        <text x="0" y="6" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">K-5</text>
      </g>

      <!-- M3 (Top-left ramp passage) -->
      <g transform="translate(340, 175)" filter="url(#dropShadow)">
        <rect x="-34" y="-15" width="68" height="30" rx="3" fill="#0f172a" fill-opacity="0.88" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="0" y="5" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">M3</text>
      </g>

      <!-- M2 (Stairs) -->
      <g transform="translate(665, 220)" filter="url(#dropShadow)">
        <rect x="-34" y="-15" width="68" height="30" rx="3" fill="#0f172a" fill-opacity="0.88" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="0" y="5" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">M2</text>
      </g>

      <!-- SZ-3 (Middle room pad right of K-1 wall) -->
      <g transform="translate(875, 405)" filter="url(#dropShadow)">
        <rect x="-36" y="-15" width="72" height="30" rx="3" fill="#003876" stroke="#f5b800" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">SZ-3</text>
      </g>

      <!-- K-4 & K-3 (Fixed victims under rubble along top-right wall) -->
      <g transform="translate(1095, 280)" filter="url(#dropShadow)">
        <circle cx="0" cy="0" r="22" fill="#16a34a" stroke="#fde047" stroke-width="3"/>
        <text x="0" y="6" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">K-4</text>
      </g>
      <g transform="translate(1185, 290)" filter="url(#dropShadow)">
        <circle cx="0" cy="0" r="22" fill="#16a34a" stroke="#fde047" stroke-width="3"/>
        <text x="0" y="6" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">K-3</text>
      </g>

      <!-- M1 (Bottom-center white ramp) -->
      <g transform="translate(1185, 610)" filter="url(#dropShadow)">
        <rect x="-34" y="-15" width="68" height="30" rx="3" fill="#0f172a" fill-opacity="0.88" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="0" y="5" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">M1</text>
      </g>

      <!-- SZ-2 (Far-right upper corner pad) -->
      <g transform="translate(1595, 405)" filter="url(#dropShadow)">
        <rect x="-36" y="-15" width="72" height="30" rx="3" fill="#003876" stroke="#f5b800" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">SZ-2</text>
      </g>

      <!-- SZ-1 (Bottom-right corner at foot of M1 ramp) -->
      <g transform="translate(1630, 745)" filter="url(#dropShadow)">
        <rect x="-36" y="-15" width="72" height="30" rx="3" fill="#003876" stroke="#f5b800" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">SZ-1</text>
      </g>

      <!-- ==================== LIVE RANDOMIZER PINS & CALLOUT: K-1 ==================== -->
      <polyline points="717,385 717,535" fill="none" stroke="#f5b800" stroke-width="4" stroke-dasharray="8 4" />

      ${k1Coords.map((pt, idx) => {
        const t = k1Slots[idx];
        return `
          <g transform="translate(${pt.x}, ${pt.y})" filter="url(#dropShadow)">
            <circle cx="0" cy="0" r="${t === 'real' ? 16 : 12}" fill="${markerFill(t)}" stroke="${markerStroke(t)}" stroke-width="3"/>
          </g>
        `;
      }).join('')}

      <g transform="translate(460, 535)" filter="url(#dropShadow)">
        <rect x="0" y="0" width="490" height="230" rx="8" fill="#0f172a" stroke="#f5b800" stroke-width="3.5"/>
        <rect x="0" y="0" width="490" height="42" rx="6" fill="#003876"/>
        <text x="20" y="28" fill="#ffffff" font-size="20" font-weight="800" font-family="Segoe UI, sans-serif">K-1</text>

        ${k1Slots.map((type, idx) => {
          const xOff = 16 + idx * 156;
          const isReal = type === 'real';
          const posNames = ['KIRI', 'TENGAH', 'KANAN'];
          return `
            <g transform="translate(${xOff}, 54)">
              <rect x="0" y="0" width="144" height="160" rx="6"
                fill="${isReal ? '#064e3b' : '#1e293b'}"
                stroke="${isReal ? '#22c55e' : '#475569'}"
                stroke-width="${isReal ? '3' : '2'}"/>
              <text x="72" y="24" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="800" font-family="Segoe UI, sans-serif">${posNames[idx]}</text>

              <g transform="translate(42, 34) scale(0.5)">
                ${renderMiniVictimIcon(isReal)}
              </g>

              <rect x="10" y="112" width="124" height="34" rx="4" fill="${isReal ? '#16a34a' : '#334155'}"/>
              <text x="72" y="134" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">
                ${isReal ? 'KORBAN ASLI' : 'DUMMY'}
              </text>
            </g>
          `;
        }).join('')}
      </g>

      <!-- ==================== LIVE RANDOMIZER PINS & CALLOUT: K-2 ==================== -->
      <polyline points="1426,492 1426,248" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8 4" />

      ${k2Coords.map((pt, idx) => {
        const t = k2Slots[idx];
        return `
          <g transform="translate(${pt.x}, ${pt.y})" filter="url(#dropShadow)">
            <circle cx="0" cy="0" r="${t === 'real' ? 16 : 12}" fill="${markerFill(t)}" stroke="${markerStroke(t)}" stroke-width="3"/>
          </g>
        `;
      }).join('')}

      <g transform="translate(1240, 18)" filter="url(#dropShadow)">
        <rect x="0" y="0" width="336" height="230" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="3.5"/>
        <rect x="0" y="0" width="336" height="42" rx="6" fill="#003876"/>
        <text x="20" y="28" fill="#ffffff" font-size="20" font-weight="800" font-family="Segoe UI, sans-serif">K-2</text>

        ${k2Slots.map((type, idx) => {
          const xOff = 16 + idx * 160;
          const isReal = type === 'real';
          const posNames = ['KIRI', 'KANAN'];
          return `
            <g transform="translate(${xOff}, 54)">
              <rect x="0" y="0" width="144" height="160" rx="6"
                fill="${isReal ? '#064e3b' : '#1e293b'}"
                stroke="${isReal ? '#22c55e' : '#475569'}"
                stroke-width="${isReal ? '3' : '2'}"/>
              <text x="72" y="24" text-anchor="middle" fill="#cbd5e1" font-size="14" font-weight="800" font-family="Segoe UI, sans-serif">${posNames[idx]}</text>

              <g transform="translate(42, 34) scale(0.5)">
                ${renderMiniVictimIcon(isReal)}
              </g>

              <rect x="10" y="112" width="124" height="34" rx="4" fill="${isReal ? '#16a34a' : '#334155'}"/>
              <text x="72" y="134" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="800" font-family="Segoe UI, sans-serif">
                ${isReal ? 'KORBAN ASLI' : 'DUMMY'}
              </text>
            </g>
          `;
        }).join('')}
      </g>
    </svg>
  </div>
  `;
}

window.renderArenaMapSVG = renderArenaMapSVG;
