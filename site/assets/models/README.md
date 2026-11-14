# Lander display assets

These files were supplied from the team's local `demo-site/models` collection.

- `lunar-lander.glb`: embedded glTF copyright identifies Innerscene Corp and dedicates the asset to CC0 1.0 Universal. Used as a representative display for Nova-C and Vikram, explicitly labelled as not mission-specific.
- `apollo-lm.glb`: supplied Apollo Lunar Module asset; the local demo identifies NASA as its source. The exact source page and redistribution terms remain unverified.
- `Artemis-Lander.obj` (not committed): supplied Artemis concept from the local demo, which identifies CGTrader as its source. The file is 65.8 MB and its redistribution terms are unverified, so it is kept out of the repository. Place it in this directory to enable the Artemis card; without it the card shows a "model unavailable" message. Silver, dark metal and gold materials are illustrative finishes assigned using the OBJ's existing material names.

`apollo-lm.glb` requires source and licence verification before public distribution; its inclusion does not establish permission to publish.

Three.js loaders, utilities and Draco decoder files are vendored from the Three.js r170 distribution, alongside its existing MIT licence. Model loading has no external runtime dependency.
