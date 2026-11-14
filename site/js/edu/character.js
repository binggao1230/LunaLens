// Pico, the Education mode guide: an original little rover drawn inline. One SVG, four moods set by a CSS class
// on the wrapper (mood-happy, mood-worried, mood-sleeping, mood-celebrating); css/edu.css shows and hides the parts.
export const CHARACTER_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <g class="c-body">
    <line x1="60" y1="24" x2="60" y2="9" stroke="#c3c7ce" stroke-width="3" stroke-linecap="round"/>
    <circle class="c-tip" cx="60" cy="7" r="4" fill="#f5c542"/>
    <path d="M28 56a32 32 0 0 1 64 0v8H28z" fill="#e8e5f2"/>
    <rect x="34" y="34" width="52" height="30" rx="14" fill="#1b1830"/>
    <g class="c-eyes"><circle cx="50" cy="49" r="4.5" fill="#9be7ff"/><circle cx="70" cy="49" r="4.5" fill="#9be7ff"/></g>
    <g class="c-eyes-closed"><path d="M45 50q5 4 10 0M65 50q5 4 10 0" stroke="#9be7ff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
    <g class="c-brows"><path d="M44 41l12 4M76 41l-12 4" stroke="#9be7ff" stroke-width="2.5" stroke-linecap="round"/></g>
    <path class="c-smile" d="M52 57q8 6 16 0" stroke="#9be7ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path class="c-flat" d="M53 58h14" stroke="#9be7ff" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse class="c-open" cx="60" cy="58" rx="5" ry="4" fill="#9be7ff"/>
    <rect x="30" y="66" width="60" height="26" rx="8" fill="#c3c7ce"/>
    <rect x="38" y="72" width="20" height="9" rx="2" fill="#5aa2ff"/>
    <rect x="62" y="72" width="20" height="9" rx="2" fill="#5aa2ff"/>
    <g class="c-arm c-arm-l"><line x1="30" y1="76" x2="16" y2="86" stroke="#c3c7ce" stroke-width="5" stroke-linecap="round"/></g>
    <g class="c-arm c-arm-r"><line x1="90" y1="76" x2="104" y2="86" stroke="#c3c7ce" stroke-width="5" stroke-linecap="round"/></g>
    <circle cx="42" cy="96" r="9" fill="#353a42" stroke="#a0a7b2" stroke-width="3"/>
    <circle cx="78" cy="96" r="9" fill="#353a42" stroke="#a0a7b2" stroke-width="3"/>
  </g>
  <g class="c-zzz" fill="#c3c7ce" font-family="Geist, system-ui, sans-serif" font-weight="700">
    <text x="90" y="32" font-size="12">z</text><text x="100" y="20" font-size="9">z</text>
  </g>
  <g class="c-stars" fill="#f5c542">
    <path d="M14 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
    <path d="M104 44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
    <path d="M98 12l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
  </g>
</svg>`;
