# Mascot artwork

The LunaLens guide, Lumi, an astronaut dog. Three poses, the team's own illustration vector-traced into editable
colour shapes with a transparent background, supplied by the team on 14 November 2026. Not from a stock
library; no third-party licence applies.

| File | Pose | Used for |
|---|---|---|
| `lunalens_mascot_talking.svg` | open eyes, open mouth, one arm out | the default (`mood-happy`) and, dimmed, `mood-sleeping` |
| `lunalens_mascot_happy.svg` | closed happy eyes, arm raised, cheer lines | `mood-celebrating` |
| `lunalens_mascot_alert.svg` | raised brows, round mouth, hand to the chin, red marks | `mood-worried` |

`site/js/edu/character.js` loads them as images; `site/css/edu.css` picks the pose from the mood class.
