// The Education mode guide: the LunaLens mascot, a dog astronaut, drawn inline in the mascot sheet's palette
// (brown, tan, yellow scarf, white suit, teal gloves and boots, navy, lavender). One SVG, four moods set by a CSS
// class on the wrapper (mood-happy, mood-worried, mood-sleeping, mood-celebrating); css/edu.css shows and hides parts.
export const CHARACTER_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <ellipse cx="60" cy="110" rx="22" ry="3" fill="#9b97d6" opacity=".35"/>
  <g class="c-body">
    <line x1="60" y1="14" x2="60" y2="7" stroke="#2ba7a0" stroke-width="2.6" stroke-linecap="round"/>
    <circle class="c-tip" cx="60" cy="5.5" r="3.2" fill="#2ba7a0"/>
    <path d="M76 90q8-2 9-11" stroke="#a0673a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <g class="c-arm c-arm-l"><line x1="44" y1="70" x2="32" y2="84" stroke="#f6f3f0" stroke-width="7" stroke-linecap="round"/><circle cx="31" cy="86" r="4.6" fill="#2ba7a0"/></g>
    <g class="c-arm c-arm-r"><line x1="76" y1="70" x2="88" y2="84" stroke="#f6f3f0" stroke-width="7" stroke-linecap="round"/><circle cx="89" cy="86" r="4.6" fill="#2ba7a0"/></g>
    <rect x="48" y="90" width="9" height="12" rx="3" fill="#f6f3f0"/><rect x="63" y="90" width="9" height="12" rx="3" fill="#f6f3f0"/>
    <rect x="46" y="100" width="13" height="7" rx="3" fill="#2ba7a0"/><rect x="61" y="100" width="13" height="7" rx="3" fill="#2ba7a0"/>
    <rect x="44" y="63" width="32" height="31" rx="10" fill="#f6f3f0" stroke="#d8d2cc" stroke-width="1"/>
    <circle cx="60" cy="74" r="5" fill="#f2c532"/>
    <ellipse cx="60" cy="74" rx="7.5" ry="2.2" fill="none" stroke="#1b3a8a" stroke-width="1" transform="rotate(-20 60 74)"/>
    <rect x="44" y="81" width="32" height="3.5" fill="#2ba7a0"/><circle cx="60" cy="82.7" r="2.6" fill="#9bd9d4"/>
    <path d="M44 61q16 9 32 0v6q-16 7-32 0z" fill="#f2c532"/>
    <path d="M45 63q-12 3-19 13q8-3 19-4z" fill="#f2c532"/>
    <circle cx="60" cy="38" r="26" fill="#dff1fb" fill-opacity=".42" stroke="#ffffff" stroke-opacity=".9" stroke-width="1.6"/>
    <ellipse cx="46" cy="24" rx="7" ry="3.5" fill="#fff" opacity=".7" transform="rotate(-35 46 24)"/>
    <ellipse cx="45" cy="44" rx="6" ry="11" fill="#a0673a" transform="rotate(12 45 44)"/>
    <ellipse cx="75" cy="44" rx="6" ry="11" fill="#a0673a" transform="rotate(-12 75 44)"/>
    <circle cx="60" cy="40" r="17" fill="#e8b678"/>
    <path d="M46 36q14-16 28 0q-14-7-28 0z" fill="#a0673a"/>
    <circle cx="50" cy="46" r="2.3" fill="#f0a090" opacity=".7"/><circle cx="70" cy="46" r="2.3" fill="#f0a090" opacity=".7"/>
    <g class="c-eyes"><circle cx="54" cy="39" r="2.5" fill="#1b3a8a"/><circle cx="66" cy="39" r="2.5" fill="#1b3a8a"/><circle cx="55" cy="38" r=".8" fill="#fff"/><circle cx="67" cy="38" r=".8" fill="#fff"/></g>
    <g class="c-eyes-closed"><path d="M51 40q3-4 6 0M63 40q3-4 6 0" stroke="#1b3a8a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
    <g class="c-brows"><path d="M50 33l7 2.5M70 33l-7 2.5" stroke="#5a3a22" stroke-width="2" stroke-linecap="round"/></g>
    <ellipse cx="60" cy="45" rx="2.7" ry="2" fill="#5a3a22"/>
    <path class="c-smile" d="M55 49q5 5 10 0" stroke="#5a3a22" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path class="c-flat" d="M56 50h8" stroke="#5a3a22" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse class="c-open" cx="60" cy="51" rx="3.8" ry="3.2" fill="#5a3a22"/>
  </g>
  <g class="c-zzz" fill="#c3c7ce" font-family="Geist, system-ui, sans-serif" font-weight="700">
    <text x="90" y="30" font-size="12">z</text><text x="100" y="18" font-size="9">z</text>
  </g>
  <g class="c-stars" fill="#f2c532">
    <path d="M14 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
    <path d="M104 44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
    <path d="M98 12l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
  </g>
</svg>`;
