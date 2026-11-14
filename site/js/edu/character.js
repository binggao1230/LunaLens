// The Education mode guide: the LunaLens mascot, a dog astronaut, drawn inline after the team's illustrations
// (flat style: brown dog, light glass helmet with an antenna, cream suit with blue-grey gloves, boots and collar).
// One SVG holds every pose; a CSS class on the wrapper picks the mood and css/edu.css shows and hides the parts:
//   mood-happy        talking: open eyes, open mouth, one arm out, yellow cheer lines
//   mood-celebrating  cheering: closed happy eyes, open mouth, arm raised, cheer lines and stars
//   mood-worried      alarmed: raised brows, round mouth, hand to the chin, red "!!" and orange lines
//   mood-sleeping     closed eyes, flat mouth, z z
export const CHARACTER_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <g class="c-body">
    <g class="c-cheer" fill="none" stroke="#f2b544" stroke-width="3.2" stroke-linecap="round"><path d="M101 38l3-8M106 46l7-5M108 56l8 1"/></g>
    <g class="c-alarm"><g fill="none" stroke="#e8562f" stroke-width="3.4" stroke-linecap="round"><path d="M100 16l2-10M108 18l3-9"/></g><circle cx="99" cy="22" r="1.9" fill="#e8562f"/><circle cx="106.5" cy="24" r="1.9" fill="#e8562f"/>
      <g fill="none" stroke="#f08a3c" stroke-width="3" stroke-linecap="round"><path d="M102 40l4-6M105 48l7-3M106 56l7 1"/></g></g>
    <path d="M44 86q-10 6-12 16q6-1 14-8" fill="#b5713a"/>
    <g class="c-arm c-arm-l"><path d="M46 70q-9 4-16 12" stroke="#ebe5e2" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="29" cy="83" r="5" fill="#6f8290"/></g>
    <g class="c-arm c-arm-r"><path d="M74 68q12-8 20-22" stroke="#ebe5e2" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="95" cy="45" r="5.2" fill="#6f8290"/></g>
    <path d="M52 94q-4 8-6 16" stroke="#6f8290" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M66 95q2 9 2 16" stroke="#6f8290" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M47 63q13-5 26 0q6 16 2 32q-15 5-30 0q-4-16 2-32z" fill="#ebe5e2"/>
    <rect x="44" y="61" width="32" height="7" rx="3.5" fill="#6f8290"/>
    <rect x="63" y="73" width="10" height="4" rx="2" fill="#6f8290"/>
    <rect x="48" y="80" width="7" height="6" rx="2" fill="#6f8290"/>
    <circle cx="60" cy="36" r="27" fill="#bfe3ee" fill-opacity=".92"/>
    <circle cx="60" cy="36" r="27" fill="none" stroke="#dff3f8" stroke-width="2"/>
    <path d="M40 36q2-14 14-18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>
    <circle cx="42" cy="46" r="1.6" fill="#fff" opacity=".85"/>
    <line x1="60" y1="9" x2="60" y2="3" stroke="#6f8290" stroke-width="3" stroke-linecap="round"/>
    <circle class="c-tip" cx="60" cy="2.5" r="3.4" fill="#6f8290"/>
    <path d="M48 28q-8 8-7 20q2 6 8 6q4-10 3-26z" fill="#8c4f2a"/>
    <path d="M47 30q6-12 20-12q6 0 8 4l-6 1l4 3l-5 1q6 6 6 16q0 12-11 13q-12 1-16-10q-3-9 0-16z" fill="#b5713a"/>
    <ellipse cx="75" cy="44" rx="5.5" ry="4.2" fill="#6b3a22"/>
    <g class="c-eyes"><ellipse cx="58" cy="37.5" rx="2.1" ry="3" fill="#2b1a10"/><ellipse cx="68" cy="37" rx="2.1" ry="3" fill="#2b1a10"/></g>
    <g class="c-eyes-closed"><path d="M55 38q3-4 6 0M65 38q3-4 6 0" stroke="#2b1a10" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
    <g class="c-brows"><path d="M54 31q3-3 7-1M64 30q4-2 8 0" stroke="#2b1a10" stroke-width="2" fill="none" stroke-linecap="round"/></g>
    <path class="c-flat" d="M60 47h8" stroke="#2b1a10" stroke-width="2" stroke-linecap="round"/>
    <path class="c-open" d="M60 45q5 1 10 -1q0 7-5 8q-5-1-5-7z" fill="#5a2f1e"/>
    <g class="c-oh"><ellipse cx="64" cy="48" rx="4.2" ry="4.8" fill="#4a2418"/><ellipse cx="64" cy="50" rx="2.6" ry="2" fill="#e98c8c"/></g>
  </g>
  <g class="c-zzz" fill="#c3c7ce" font-family="Geist, system-ui, sans-serif" font-weight="700">
    <text x="92" y="22" font-size="12">z</text><text x="102" y="12" font-size="9">z</text>
  </g>
  <g class="c-stars" fill="#f2b544">
    <path d="M14 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
    <path d="M104 72l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
    <path d="M22 60l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>
  </g>
</svg>`;
