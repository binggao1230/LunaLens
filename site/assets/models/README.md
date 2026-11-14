# Lander display assets

These files were supplied from the team's local `demo-site/models` collection.

- `lunar-lander.glb`: embedded glTF copyright identifies Innerscene Corp and dedicates the asset to CC0 1.0 Universal. Used as a representative display for Nova-C.
- `vikram-lander.glb`: Vikram geometry extracted from "Chandrayaan-2 in flight configuration" by tashtego, CC BY 4.0. Source model: https://sketchfab.com/3d-models/chandrayaan-2-in-flight-configuration-4d0017f2c5fb49bb9817601858106ddb . Retrieved from the credited copy at https://github.com/kvsankar/chandrayaan3/blob/master/third-party/models/cy3-small.glb . Licence: https://creativecommons.org/licenses/by/4.0/ . Modified by removing the orbiter and unused assets, retaining the lander geometry and textures. The card describes Vikram's mission history; the geometry is a Chandrayaan-2 reference rather than an exact Chandrayaan-3 reconstruction.
- `apollo-lm.glb`: supplied Apollo Lunar Module asset; the local demo identifies NASA as its source. The exact source page and redistribution terms remain unverified.
- `artemis-lite.glb`: simplified copy (about 55,000 triangles, 4 MB, flat-shaded) of the supplied Artemis concept OBJ, which the local demo identifies as a CGTrader download. The original 65.8 MB OBJ is not in the repository. Redistribution terms of the original are unverified. Silver, dark metal and gold materials are illustrative finishes assigned using the original material names, which are preserved.

`apollo-lm.glb` and `artemis-lite.glb` require source and licence verification before public distribution; their inclusion does not establish permission to publish.

Three.js loaders, utilities and Draco decoder files are vendored from the Three.js r170 distribution, alongside its existing MIT licence. Model loading has no external runtime dependency.
