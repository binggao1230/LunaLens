// The Education mode guide: the LunaLens mascot, an astronaut dog. The artwork is the team's own illustration
// (three traced SVG poses in site/assets/mascot/, see the README there). All three poses are placed at once and a
// CSS class on the wrapper picks which one shows (css/edu.css):
//   mood-happy        talking pose: open eyes, open mouth, one arm out
//   mood-celebrating  cheering pose: closed happy eyes, arm raised, cheer lines
//   mood-worried      alert pose: raised brows, round mouth, hand to the chin, red marks
//   mood-sleeping     talking pose dimmed, with a "z z"
export const CHARACTER_MARKUP = `<span class="c-poses">
  <img src="assets/mascot/lunalens_mascot_talking.svg" alt="" data-pose="talking" draggable="false">
  <img src="assets/mascot/lunalens_mascot_happy.svg" alt="" data-pose="cheering" draggable="false">
  <img src="assets/mascot/lunalens_mascot_alert.svg" alt="" data-pose="alert" draggable="false">
  <span class="c-zzz" aria-hidden="true">z<small>z</small></span>
</span>`;
