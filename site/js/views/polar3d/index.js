// The Mission page's 3D scene. M0 moved it out of mission.js; the stop-loss pass (TODO.md, D) starts the
// camera over the south pole, paints the sphere with the 4K colour map, and lays the Explore terrain patch
// under the picked polar site at true height. Deps come from the caller so this module owns no state that
// the list, the 2D map or the probe flight also need.
import { siteBasis } from '../../engine/geometry.js';
import { loadDem } from '../../engine/dem.js';
import { terrainPatch } from '../terrain-mesh.js';
export async function createPolar3d(env) {
  const { $, view, local, sites, pickedSite, labelText, colorOf, refresh, ctx, t, escapeHtml, fmtLatLon, unit, dot3, clamp, COLORS, getFrame, setFailed } = env;
  // The same scene also serves the South Pole prototype: an explicit activity gate, a deliberate
  // Moon tap, an optional grab control and an optional Earth-link pulse.
  const active = env.active ?? (() => view() === 'mission');
  const grab = env.controlsMode === 'grab';
  const reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let view3d = null;
  try {
      const T = await import('../../vendor/three/three.module.js');
      const { OrbitControls } = await import('../../vendor/three/OrbitControls.js');
      const canvas = $('m-3d'), stage = $('m-stage');
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, env.maxPixelRatio ?? 2));
      const scene = new T.Scene();
      // One scene unit = one Moon radius. All sizes and distances use that same scale.
      const MOON_R_KM = 1737.4;
      const SCALE = { earthR: 6371 / MOON_R_KM, earthD: 384400 / MOON_R_KM, sunR: 695700 / MOON_R_KM, sunD: 149.6e6 / MOON_R_KM };
      const MAX_DIST = SCALE.sunD * 1.8;
      // The caller can cap the zoom-out (Education mode keeps the Moon the subject); null means no cap.
      const maxDist = () => Math.min(MAX_DIST, env.maxDistance?.() ?? MAX_DIST);
      const camera = new T.PerspectiveCamera(42, 1, 0.02, MAX_DIST * 4);
      let pending = false;
      // Hoisted so texture loads that finish before the rest of the scene is built can still request a frame.
      function request() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; draw(); }); }
      // The orbit axis is the Earth-facing axis (+x) unless the grab control asks for the polar axis. From the
      // opening view over the south pole, orbiting around the axis you look along only spins the globe in place
      // and jams against the polar clamp. OrbitControls reads camera.up once, in its constructor, so set it first.
      camera.up.set(...(grab ? [0, 1, 0] : [1, 0, 0]));
      const controls = new OrbitControls(camera, canvas);
      controls.enablePan = false; controls.minDistance = 1.05; controls.maxDistance = MAX_DIST;
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.8;
      controls.minPolarAngle = 0.02; controls.maxPolarAngle = Math.PI - 0.02;
      // Mission globe: free trackball rotation. OrbitControls keeps one fixed "up" and stops at the poles, so
      // here it only zooms; a drag rotates the camera about its own screen axes (see bindTrackball below) and
      // the surface under the pointer follows the pointer in any direction, over the poles too.
      if (!grab) controls.enableRotate = false;
      // OrbitControls caches the orientation of camera.up in its constructor (private _quat). After the camera
      // rolls freely, re-derive a true up (perpendicular to the view) and refresh that cache, so a zoom or an
      // update() never snaps the view back to the old up axis.
      const syncUp = () => {
        if (grab) return;
        const dir = camera.position.clone().normalize();
        const up = camera.up.clone().sub(dir.clone().multiplyScalar(camera.up.dot(dir)));
        if (up.lengthSq() < 1e-8) up.set(1, 0, 0).sub(dir.clone().multiplyScalar(dir.x));
        camera.up.copy(up.normalize());
        controls._quat.setFromUnitVectors(camera.up, new T.Vector3(0, 1, 0));
        controls._quatInverse.copy(controls._quat).invert();
      };
      const sunLight = new T.DirectionalLight(0xfff1d6, 3.1);
      scene.add(sunLight, new T.AmbientLight(0x8da4ff, 0.07));
      // The south pole is always within about 1.5° of the terminator, so the Sun alone leaves the terrain
      // black. A camera-side fill light, restricted to layer 1, lights the terrain patch only: the globe and
      // the markers keep the Sun's real shading.
      const reliefLight = new T.DirectionalLight(0xdfe6ff, 0.55);
      reliefLight.layers.set(1);
      scene.add(reliefLight);
      camera.layers.enable(1);
      // Colour maps are sRGB; without that flag three treats them as linear and they look washed out. Anisotropy
      // keeps the polar cap from smearing at grazing angles, which is most of this view.
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const loadMap = (url) => {
        const texture = new T.TextureLoader().load(url, () => request());
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = maxAniso;
        return texture;
      };
      const moonMap = loadMap('assets/moon_color_4k.webp');
      const moon = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshStandardMaterial({ map: moonMap, roughness: 1, metalness: 0 }));
      const moonGroup = new T.Group();
      moonGroup.add(moon);
      scene.add(moonGroup);
      // The lunar rotation axis: a thin line through both poles.
      const axis = new T.Line(
        new T.BufferGeometry().setFromPoints([new T.Vector3(0, -1.45, 0), new T.Vector3(0, 1.45, 0)]),
        new T.LineBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.85 }),
      );
      scene.add(axis);

      // Graticule: parallels every 10° and meridians every 30°, with 75°S — where the terrain model ends —
      // picked out in cyan so the polar cap has a reference instead of being an anonymous patch.
      const graticule = new T.Group();
      const gridLine = (color, opacity) => new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const parallel = (lat, color, opacity, radius = 1.0015) => {
        const points = [];
        for (let i = 0; i <= 180; i++) points.push(new T.Vector3(...unit(lat, (i / 180) * 360)).multiplyScalar(radius));
        return new T.Line(new T.BufferGeometry().setFromPoints(points), gridLine(color, opacity));
      };
      for (let lat = 0; lat >= -80; lat -= 10) graticule.add(parallel(lat, 0x93a7bd, lat === 0 ? 0.34 : 0.15));
      graticule.add(parallel(-85, 0x93a7bd, 0.15));
      graticule.add(parallel(-75, 0x58c8ff, 0.62, 1.0022));
      if (Number.isFinite(env.studyLat)) graticule.add(parallel(env.studyLat, env.studyColor ?? 0xff9ad5, 0.85, 1.0026));
      for (let lon = 0; lon < 360; lon += 30) {
        const points = [];
        for (let i = 0; i <= 90; i++) points.push(new T.Vector3(...unit(-90 + i, lon)).multiplyScalar(1.0015));
        graticule.add(new T.Line(new T.BufferGeometry().setFromPoints(points), gridLine(0x93a7bd, lon % 90 === 0 ? 0.3 : 0.12)));
      }
      moonGroup.add(graticule);

      const glowTexture = (inner) => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, inner); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
        return new T.CanvasTexture(c);
      };
      // Earth keeps its own face to the Moon, so a lit sphere with the Blue Marble map shows the phase the
      // Moon actually sees, and the continents line up with the sub-Earth point instead of a painted blob.
      const earthMap = loadMap('assets/earth_day_4k.webp');
      const earth = new T.Mesh(new T.SphereGeometry(SCALE.earthR, 64, 48),
        new T.MeshStandardMaterial({ map: earthMap, roughness: 1, metalness: 0 }));
      const sunMap = loadMap('assets/sun_disk_1k.webp');
      const sunBody = new T.Sprite(new T.SpriteMaterial({ map: sunMap, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
      sunBody.scale.set(2 * SCALE.sunR, 2 * SCALE.sunR, 1);
      const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture('rgba(255,205,90,.7)'), blending: T.AdditiveBlending, depthWrite: false }));
      sunGlow.scale.set(3.2 * SCALE.sunR, 3.2 * SCALE.sunR, 1);
      scene.add(earth, sunBody, sunGlow);
      const starPositions = [];
      for (let i = 0; i < 900; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), d = 300000 + Math.random() * 300000;
        starPositions.push(r * Math.cos(a) * d, u * d, r * Math.sin(a) * d);
      }
      const starGeometry = new T.BufferGeometry();
      starGeometry.setAttribute('position', new T.Float32BufferAttribute(starPositions, 3));
      scene.add(new T.Points(starGeometry, new T.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.7 })));

      // Orbits, at the scene's own (compressed) scale: dashed rings for the Moon around Earth and for Earth
      // around the Sun. Both lie in the ecliptic plane, which is the plane holding the Sun and Earth
      // directions, so the ring through the Moon always passes through the Moon and the one through Earth
      // always through Earth, whatever the scrubber says.
      const ORBIT_POINTS = 181;
      const makeOrbit = (color, opacity, dash) => {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(ORBIT_POINTS * 3), 3));
        const line = new T.Line(geometry, new T.LineDashedMaterial({ color, dashSize: dash, gapSize: dash * 0.8, transparent: true, opacity, depthWrite: false }));
        scene.add(line);
        return line;
      };
      const moonOrbit = makeOrbit(0x58c8ff, 0.6, 0.1), earthOrbit = makeOrbit(0xe8b46a, 0.32, 0.4);
      const setOrbit = (line, centre, radius, normal, reference) => {
        const u = new T.Vector3().crossVectors(normal, reference).normalize();
        const v = new T.Vector3().crossVectors(normal, u).normalize();
        const attribute = line.geometry.attributes.position, array = attribute.array;
        for (let i = 0; i < ORBIT_POINTS; i++) {
          const angle = (i / (ORBIT_POINTS - 1)) * Math.PI * 2, c = Math.cos(angle) * radius, s = Math.sin(angle) * radius;
          array[i * 3] = centre.x + c * u.x + s * v.x;
          array[i * 3 + 1] = centre.y + c * u.y + s * v.y;
          array[i * 3 + 2] = centre.z + c * u.z + s * v.z;
        }
        attribute.needsUpdate = true;
        line.computeLineDistances();
      };

      const markerGroup = new T.Group();
      moonGroup.add(markerGroup);
      // Earth-link pulse (prototype only): a dashed path from the selected site toward Earth.
      const pulseGroup = new T.Group();
      scene.add(pulseGroup);
      const pulseGeometry = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
      const pulseLine = new T.Line(pulseGeometry, new T.LineDashedMaterial({ color: 0x9be7ff, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.9, depthWrite: false }));
      const pulseDot = new T.Mesh(new T.SphereGeometry(0.018, 12, 8), new T.MeshBasicMaterial({ color: 0xd8f6ff }));
      pulseLine.visible = pulseDot.visible = false;
      pulseGroup.add(pulseLine, pulseDot);
      let pulseState = null, pulsePhase = 0, pulseLoop = 0;
      let pulseKey = '';
      const stopPulse = () => { if (pulseLoop) cancelAnimationFrame(pulseLoop); pulseLoop = 0; };
      let lastPulse = 0;
      const updatePulse = () => {
        const info = env.pulse?.();
        const site = pickedSite();
        const state = info && site ? info.state : null;
        if (!state || state === 'unknown') {
          pulseState = null; pulseLine.visible = pulseDot.visible = false; stopPulse(); return;
        }
        pulseStart.set(...unit(site.lat, site.lon)).multiplyScalar(1.01);
        moonGroup.localToWorld(pulseStart);
        pulseEnd.copy(earth.position);
        const attr = pulseGeometry.attributes.position;
        attr.setXYZ(0, pulseStart.x, pulseStart.y, pulseStart.z);
        attr.setXYZ(1, pulseEnd.x, pulseEnd.y, pulseEnd.z);
        attr.needsUpdate = true;
        pulseGeometry.computeBoundingSphere();
        pulseLine.computeLineDistances();
        pulseLine.visible = true;
        const key = `${site.id}:${state}`;
        if (key !== pulseKey) { pulseKey = key; pulsePhase = 0; stopPulse(); }
        pulseState = state;
        if (state !== 'visible' || reducedMotion) {
          pulseDot.visible = false;
          pulseLine.material.opacity = state === 'blocked' ? 0.4 : 0.85;
          stopPulse();
          return;
        }
        pulseLine.material.opacity = 0.9;
        pulseDot.visible = true;
        if (!pulseLoop) {
          const step = (now) => {
            if (pulseState !== 'visible' || reducedMotion) { pulseLoop = 0; return; }
            pulseLoop = requestAnimationFrame(step);
            if (now - lastPulse < 40) return;
            lastPulse = now;
            pulsePhase = (pulsePhase + 0.008) % 1;
            pulseDot.position.lerpVectors(pulseStart, pulseEnd, pulsePhase);
            renderer.render(scene, camera);
          };
          pulseLoop = requestAnimationFrame(step);
        }
      };
      const pulseStart = new T.Vector3(), pulseEnd = new T.Vector3();
      const selectRing = new T.Mesh(new T.RingGeometry(1.7, 2.1, 32), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
      moonGroup.add(selectRing);
      const sunSpot = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xffe066 }));
      sunSpot.scale.setScalar(0.018);
      scene.add(sunSpot);
      let markers = [], markerKey = '', tween = 0, home = null;
      const sphereGeometry = new T.SphereGeometry(1, 16, 12), ringGeometry = new T.RingGeometry(1.5, 2, 24);

      const buildMarkers = () => {
        const list = sites();
        const key = list.map((s) => `${s.id}:${s.lat}:${s.lon}`).join('|');
        if (key === markerKey) return;
        markerKey = key;
        markerGroup.clear();
        markers = list.map((site) => {
          const normal = new T.Vector3(...unit(site.lat, site.lon));
          const dotMesh = new T.Mesh(sphereGeometry, new T.MeshBasicMaterial({ color: COLORS.dark }));
          dotMesh.position.copy(normal).multiplyScalar(1.004);
          const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: COLORS.sun, side: T.DoubleSide }));
          ring.position.copy(normal).multiplyScalar(1.003);
          ring.lookAt(normal.clone().multiplyScalar(2));
          markerGroup.add(dotMesh, ring);
          return { site, normal, dotMesh, ring };
        });
      };
      // Terrain at the picked site: the same generator Explore uses, heights at ×1 (no exaggeration).
      const reliefGroup = new T.Group();
      moonGroup.add(reliefGroup);
      let reliefKey = '', reliefDem = null, reliefLoading = false;
      const R_KM = 1737.4, DEG = Math.PI / 180;
      const buildRelief = () => {
        const site = pickedSite();
        if (!site || site.lat > -75) { if (reliefGroup.children.length) { reliefGroup.clear(); reliefKey = ''; } return; }
        if (reliefKey === site.id) return;
        if (!reliefDem) {
          if (reliefLoading) return;
          reliefLoading = true;
          loadDem('data/dem480').then((dem) => { reliefDem = dem; reliefLoading = false; request(); })
            .catch((error) => { console.error(error); reliefLoading = false; });
          return;
        }
        const patch = terrainPatch(reliefDem, site, { heightScale: 1, widthKm: 80, segments: 128 });
        const groundKm = reliefDem.height(site.lat * DEG, site.lon * DEG) / 1000;
        if (!patch || !Number.isFinite(groundKm)) return;
        reliefGroup.clear();
        reliefKey = site.id;
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(patch.positions, 3));
        const side = patch.segments + 1, index = [];
        for (let row = 0; row < patch.segments; row++) {
          for (let col = 0; col < patch.segments; col++) {
            const a = row * side + col, b = a + 1, c = a + side, d = c + 1;
            index.push(a, c, b, b, c, d);
          }
        }
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        const basis = siteBasis(site.lat, site.lon);
        // The patch is in kilometres on the site's tangent plane: x east, y up, z south. Rotate it onto
        // the sphere, drop it at the site's ground level, then scale kilometres to scene units (R = 1).
        // South-polar ground lies below the reference sphere, so the patch would sit inside it and never be
        // drawn: the wrap is lifted 3 km clear of the sphere while the relief inside it keeps its true height.
        const LIFT_KM = 3;
        const wrap = new T.Group();
        wrap.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(
          new T.Vector3(...basis.east), new T.Vector3(...basis.up),
          new T.Vector3(-basis.north[0], -basis.north[1], -basis.north[2])));
        wrap.position.set(...basis.up).multiplyScalar(1 + (groundKm + LIFT_KM) / R_KM);
        wrap.scale.setScalar(1 / R_KM);
        const material = new T.MeshStandardMaterial({ color: 0x8f8b84, roughness: 1, metalness: 0, side: T.DoubleSide });
        const mesh = new T.Mesh(geometry, material);
        mesh.layers.set(1);
        wrap.add(mesh);
        reliefGroup.add(wrap);
      };
      const placeLabel = (position, normal) => {
        const label = $('m-label'), site = pickedSite();
        const worldNormal = normal.clone().applyQuaternion(moonGroup.quaternion).normalize();
        const facing = worldNormal.dot(camera.position.clone().normalize()) > 0.08;
        if (!facing || !site) { label.style.display = 'none'; return; }
        const p = moonGroup.localToWorld(position.clone()).project(camera);
        label.style.display = 'block';
        label.style.left = `${(p.x * 0.5 + 0.5) * stage.clientWidth}px`;
        label.style.top = `${(-p.y * 0.5 + 0.5) * stage.clientHeight}px`;
        label.textContent = labelText(site);
      };
      let animBase = null, animOffset = 0, lastAnim = 0;
      function draw() {
        const cap = maxDist();
        if (controls.maxDistance !== cap) { controls.maxDistance = cap; if (camera.position.length() > cap) { camera.position.setLength(cap); controls.update(); } }
        const base = env.baseMs ? env.baseMs() : null;
        if (base !== null && animBase !== null && base !== animBase) { animBase = base; animOffset = 0; lastAnim = 0; }
        if (base !== null && animBase === null) animBase = base;
        const tms = animBase !== null ? animBase + animOffset : null;
        const f = tms !== null && env.frameAt ? env.frameAt(tms) : getFrame();
        if (!active() || local.mode !== '3d' || !f) return;
        buildMarkers();
        buildRelief();
        reliefLight.position.copy(camera.position);
        // The patch is a detail inset: from far away it reads as a bright blotch on the pole, so it only
        // appears once the camera is close enough for the relief to mean something.
        reliefGroup.visible = camera.position.length() < 1.5;
        sunLight.position.set(...f.sun).multiplyScalar(10);
        earth.position.set(...f.earth).multiplyScalar(SCALE.earthD);
        earth.lookAt(0, 0, 0);
        sunBody.position.set(...f.sun).multiplyScalar(SCALE.sunD);
        sunGlow.position.copy(sunBody.position);
        if (tms !== null && env.epochMs) {
          const days = (tms - env.epochMs) / 864e5;
          moonGroup.rotation.y = (days / 27.321661) * Math.PI * 2;
          earth.rotation.y = (days / 0.99727) * Math.PI * 2;
          sunBody.material.rotation = (days / 25.38) * Math.PI * 2;
        }
        const earthDir = new T.Vector3(...f.earth).normalize(), sunDir = new T.Vector3(...f.sun).normalize();
        const ecliptic = new T.Vector3().crossVectors(earthDir, sunDir);
        if (ecliptic.lengthSq() < 1e-8) ecliptic.set(0, 0, 1); else ecliptic.normalize();
        setOrbit(moonOrbit, earth.position.clone(), earth.position.length(), ecliptic, earthDir);
        setOrbit(earthOrbit, sunBody.position.clone(), sunBody.position.distanceTo(earth.position), ecliptic, earthDir);
        // The angle at the Moon between Sun and Earth is the Moon's phase angle; Earth, seen from
        // the Moon, shows the complement of the Moon's illuminated fraction.
        const phase = Math.acos(clamp(dot3(f.sun, f.earth), -1, 1));
        const lit = Math.round(((1 - Math.cos(phase)) / 2) * 100);
        $('m-readout').innerHTML = `<div>${escapeHtml(t('Sub-solar point'))} ${fmtLatLon(f.sunLat, f.sunLon, 1)}</div>`
          + `<div>${escapeHtml(t('Earth'))} ${escapeHtml(t('{v} M km', { v: (f.earthDistKm / 1e6).toFixed(2) }))} · ${escapeHtml(t('{pct}% lit', { pct: lit }))}</div>`
          + `<div>${escapeHtml(t('Sun'))} ${escapeHtml(t('{v} M km', { v: (f.sunDistKm / 1e6).toFixed(1) }))}</div>`;
        const chosen = pickedSite();
        for (const m of markers) {
          const status = f.status.get(m.site.id), selected = m.site === chosen;
          m.dotMesh.material.color.set(colorOf(status));
          // Markers keep roughly the same screen size: they are 60 km wide on the ground, which is only a few
          // pixels from far away and a wall across the view once the camera is down at the relief.
          const markerScale = clamp(camera.position.length() * 0.0012, 0.0009, 0.03);
          m.dotMesh.scale.setScalar(selected ? markerScale * 1.4 : markerScale);
          m.ring.visible = status.link && status.sun;
          m.ring.scale.setScalar(selected ? markerScale * 1.4 : markerScale);
        }
        const picked = markers.find((m) => m.site === chosen);
        selectRing.visible = Boolean(picked);
        if (picked) {
          selectRing.position.copy(picked.normal).multiplyScalar(1.006);
          selectRing.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), picked.normal.clone().normalize());
          selectRing.scale.setScalar(Math.max(0.0016, camera.position.length() * 0.0016));
          placeLabel(picked.normal.clone().multiplyScalar(1.01), picked.normal);
        }
        updatePulse();
        renderer.render(scene, camera);
        env.onFrame?.();
      }
      const resize = () => {
        const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); request();
      };
      new ResizeObserver(resize).observe(stage);
      controls.addEventListener('change', request);
      // The scene opens over the south pole, 0° meridian up, as the 2D map does.
      const homeDir = () => new T.Vector3(...unit(-84, 0)).normalize();
      const setHome = () => {
        if (!grab) camera.up.set(1, 0, 0);
        camera.position.copy(homeDir().multiplyScalar(3.6)); syncUp(); camera.lookAt(0, 0, 0); controls.update();
      };
      const flyTo = (dir, distance) => {
        cancelAnimationFrame(tween);
        const from = camera.position.clone().normalize(), to = dir.clone().normalize(), dist = camera.position.length();
        const target = distance ?? dist, start = performance.now();
        const rotation = new T.Quaternion().setFromUnitVectors(from, to), identity = new T.Quaternion();
        const step = (now) => {
          const k = Math.min(1, (now - start) / 600), e = k < 0.5 ? 4 * k ** 3 : 1 - ((-2 * k + 2) ** 3) / 2;
          camera.position.copy(from.clone().applyQuaternion(identity.clone().slerp(rotation, e))).multiplyScalar(dist + (target - dist) * e);
          syncUp(); camera.lookAt(0, 0, 0); controls.update(); draw();
          if (k < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
      };
      // Trackball drag for the Mission globe: horizontal motion turns the globe about the screen's vertical
      // axis, vertical motion about its horizontal axis, so it can roll freely in any direction.
      const bindTrackball = () => {
        if (grab) return;
        const pointers = new Set();
        let last = null, velocity = { x: 0, y: 0, t: 0 }, glide = 0;
        const turn = (dx, dy) => {
          const speed = Math.PI / Math.max(1, canvas.clientHeight) * Math.min(1, camera.position.length() / 3.6 + 0.15);
          const dir = camera.position.clone().normalize();
          const right = new T.Vector3().crossVectors(camera.up, dir).normalize();
          const q = new T.Quaternion()
            .multiply(new T.Quaternion().setFromAxisAngle(camera.up, -dx * speed))
            .multiply(new T.Quaternion().setFromAxisAngle(right, -dy * speed));
          camera.position.applyQuaternion(q); camera.up.applyQuaternion(q);
          syncUp(); camera.lookAt(0, 0, 0); controls.update(); request();
        };
        // Listen on the stage, not only the canvas, so a drag that starts on a historic-site flag also turns the
        // globe. A press that does not move stays a tap: the flag's click still opens its card.
        let moved = false;
        stage.addEventListener('pointerdown', (event) => {
          if (event.target !== canvas && !event.target.closest?.('.hflag')) return;
          pointers.add(event.pointerId);
          cancelAnimationFrame(glide); cancelAnimationFrame(tween);
          last = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, x0: event.clientX, y0: event.clientY } : null;
          moved = false;
          velocity = { x: 0, y: 0, t: performance.now() };
        });
        window.addEventListener('pointermove', (event) => {
          if (!last || pointers.size !== 1) return;
          if (!moved && Math.hypot(event.clientX - last.x0, event.clientY - last.y0) < 4) return;
          moved = true;
          const dx = event.clientX - last.x, dy = event.clientY - last.y;
          if (!dx && !dy) return;
          last = { ...last, x: event.clientX, y: event.clientY };
          const now = performance.now(), dt = Math.max(1, now - velocity.t);
          velocity = { x: dx / dt, y: dy / dt, t: now };
          turn(dx, dy);
          canvas.style.cursor = 'grabbing';
        });
        const end = (event) => {
          pointers.delete(event.pointerId);
          if (!last) return;
          last = null; canvas.style.cursor = '';
          if (!moved || matchMedia('(prefers-reduced-motion: reduce)').matches || performance.now() - velocity.t > 80) return;
          let vx = velocity.x * 16, vy = velocity.y * 16;
          const step = () => {
            vx *= 0.9; vy *= 0.9;
            if (Math.hypot(vx, vy) < 0.05) return;
            turn(vx, vy); glide = requestAnimationFrame(step);
          };
          glide = requestAnimationFrame(step);
        };
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        // A drag that ended on a flag must not also open it.
        stage.addEventListener('click', (event) => { if (moved && event.target.closest?.('.hflag')) { event.stopPropagation(); event.preventDefault(); moved = false; } }, true);
      };
      bindTrackball();
      let down = null;
      const dirAt = (event) => {
        const box = canvas.getBoundingClientRect(), caster = new T.Raycaster();
        caster.setFromCamera(new T.Vector2(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
        const hit = caster.intersectObject(moon)[0];
        return hit ? moonGroup.worldToLocal(hit.point.clone()).normalize() : null;
      };
      canvas.addEventListener('pointerdown', (event) => { down = [event.clientX, event.clientY]; });
      canvas.addEventListener('pointermove', (event) => {
        if (!grab || event.buttons) return;
        const hover = dirAt(event);
        const lat = hover ? Math.asin(clamp(hover.y, -1, 1)) / (Math.PI / 180) : null;
        canvas.style.cursor = lat !== null && lat <= (env.studyLat ?? -90) ? 'pointer' : 'grab';
      });
      // Damping needs a frame loop; only request a draw when the camera actually moved.
      const tick = () => {
        const a = env.animation?.();
        const now = performance.now();
        if (grab && controls.update()) request();
        if (a?.running) {
          if (animBase === null) animBase = env.baseMs?.() ?? null;
          if (lastAnim) animOffset += ((now - lastAnim) / 1000) * 3600e3 * a.speed;
          lastAnim = now;
          if (animBase !== null) env.onTime?.(animBase + animOffset);
          request();
        } else lastAnim = 0;
        requestAnimationFrame(tick);
      };
      tick();
      canvas.addEventListener('pointerup', (event) => {
        if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
        const box = canvas.getBoundingClientRect(), caster = new T.Raycaster();
        caster.setFromCamera(new T.Vector2(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
        const hits = caster.intersectObjects([moon, ...markers.map((m) => m.dotMesh)]);
        const first = hits[0];
        if (!first) return;
        if (first.object === moon) {
          if (!env.onMoonTap) return;
          const p = moonGroup.worldToLocal(first.point.clone()).normalize();
          env.onMoonTap({ lat: Math.asin(clamp(p.y, -1, 1)) / (Math.PI / 180), lon: ((Math.atan2(-p.z, p.x) / (Math.PI / 180)) + 360) % 360 });
          return;
        }
        const hit = markers.find((m) => m.dotMesh === first.object);
        if (hit) { local.picked = hit.site.id; refresh(true); }
      });
      view3d = {
        request: () => { if (!home) { setHome(); home = true; } request(); },
        reset: () => flyTo(homeDir(), 3.6),
        zoom: (factor) => { camera.position.setLength(clamp(camera.position.length() * factor, 1.05, maxDist())); syncUp(); controls.update(); request(); },
        focus: (site) => { const dir = moonGroup.localToWorld(new T.Vector3(...unit(site.lat, site.lon))).normalize(); flyTo(dir, site.lat <= -75 ? 1.07 : undefined); },
        /** Fly the camera over any point; used by the historic-site cards. */
        look: (lat, lon, distance) => flyTo(moonGroup.localToWorld(new T.Vector3(...unit(lat, lon))).normalize(), distance),
        /** Screen position of a surface point for HTML overlays: hidden on the far hemisphere, fading towards the limb. */
        project: (lat, lon) => {
          const normal = moonGroup.localToWorld(new T.Vector3(...unit(lat, lon))).normalize();
          const toward = normal.dot(camera.position.clone().normalize()); // 1 at the centre of the disc, 0 at the limb
          const p = normal.clone().multiplyScalar(1.004).project(camera);
          const dist = camera.position.length();
          return { x: (p.x * 0.5 + 0.5) * stage.clientWidth, y: (-p.y * 0.5 + 0.5) * stage.clientHeight, visible: toward > 0.08 && p.z < 1,
            scale: Math.sqrt(3.6 / Math.max(1.05, dist)), fade: clamp(0.35 + (toward - 0.08) / 0.5, 0.35, 1) };
        },
      };
      resize();
    } catch (error) {
      console.error(error);
      setFailed(true);
      local.mode = '2d';
      ctx.toast(t('3D is not available on this device. Showing the 2D view.'));
      return null;
    }
    return view3d;
  }
