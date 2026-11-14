// The Mission page's 3D scene. M0 moved it out of mission.js; the stop-loss pass (TODO.md, D) starts the
// camera over the south pole, paints the sphere with the 4K colour map, and lays the Explore terrain patch
// under the picked polar site at true height. Deps come from the caller so this module owns no state that
// the list, the 2D map or the probe flight also need.
import { siteBasis } from '../../engine/geometry.js';
import { loadDem } from '../../engine/dem.js';
import { terrainPatch } from '../terrain-mesh.js';
export async function createPolar3d(env) {
  const { $, view, local, sites, pickedSite, labelText, colorOf, refresh, ctx, t, escapeHtml, fmtLatLon, unit, dot3, clamp, COLORS, getFrame, setFailed } = env;
  let view3d = null;
  try {
      const T = await import('../../vendor/three/three.module.js');
      const { OrbitControls } = await import('../../vendor/three/OrbitControls.js');
      const canvas = $('m-3d'), stage = $('m-stage');
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(42, 1, 0.01, 200);
      // The orbit axis is the Earth-facing axis (+x), not the Moon's polar axis: the scene opens looking down
      // on the south pole, and orbiting around the axis you look along only spins the globe in place and
      // jams against the polar clamp. OrbitControls reads camera.up once, in its constructor, so set it first.
      camera.up.set(1, 0, 0);
      const controls = new OrbitControls(camera, canvas);
      controls.enablePan = false; controls.minDistance = 1.03; controls.maxDistance = 14; controls.rotateSpeed = 0.7;
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
      scene.add(moon);

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
      for (let lon = 0; lon < 360; lon += 30) {
        const points = [];
        for (let i = 0; i <= 90; i++) points.push(new T.Vector3(...unit(-90 + i, lon)).multiplyScalar(1.0015));
        graticule.add(new T.Line(new T.BufferGeometry().setFromPoints(points), gridLine(0x93a7bd, lon % 90 === 0 ? 0.3 : 0.12)));
      }
      scene.add(graticule);

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
      const earth = new T.Mesh(new T.SphereGeometry(0.36, 48, 32),
        new T.MeshStandardMaterial({ map: earthMap, roughness: 1, metalness: 0 }));
      const sunMap = loadMap('assets/sun_disk_1k.webp');
      const sunBody = new T.Sprite(new T.SpriteMaterial({ map: sunMap, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
      sunBody.scale.set(0.42, 0.42, 1);
      const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture('rgba(255,205,90,.7)'), blending: T.AdditiveBlending, depthWrite: false }));
      sunGlow.scale.set(2.8, 2.8, 1);
      scene.add(earth, sunBody, sunGlow);
      const starPositions = [];
      for (let i = 0; i < 900; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), d = 40 + Math.random() * 30;
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
      scene.add(markerGroup);
      const selectRing = new T.Mesh(new T.RingGeometry(1.7, 2.1, 32), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
      scene.add(selectRing);
      const sunSpot = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xffe066 }));
      sunSpot.scale.setScalar(0.018);
      scene.add(sunSpot);
      let markers = [], markerKey = '', pending = false, tween = 0, home = null;
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
      const request = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; draw(); }); };
      // Terrain at the picked site: the same generator Explore uses, heights at ×1 (no exaggeration).
      const reliefGroup = new T.Group();
      scene.add(reliefGroup);
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
        const facing = normal.dot(camera.position.clone().normalize()) > 0.08;
        if (!facing || !site) { label.style.display = 'none'; return; }
        const p = position.clone().project(camera);
        label.style.display = 'block';
        label.style.left = `${(p.x * 0.5 + 0.5) * stage.clientWidth}px`;
        label.style.top = `${(-p.y * 0.5 + 0.5) * stage.clientHeight}px`;
        label.textContent = labelText(site);
      };
      function draw() {
        const f = getFrame();
        if (view() !== 'mission' || local.mode !== '3d' || !f) return;
        buildMarkers();
        buildRelief();
        reliefLight.position.copy(camera.position);
        // The patch is a detail inset: from far away it reads as a bright blotch on the pole, so it only
        // appears once the camera is close enough for the relief to mean something.
        reliefGroup.visible = camera.position.length() < 1.5;
        sunLight.position.set(...f.sun).multiplyScalar(10);
        earth.position.set(...f.earth).multiplyScalar(3.0);
        earth.lookAt(0, 0, 0);
        sunBody.position.set(...f.sun).multiplyScalar(8);
        sunGlow.position.copy(sunBody.position);
        sunSpot.position.set(...f.sun).multiplyScalar(1.004);
        // Ecliptic normal from the two directions the scene already has; fall back to the pole if they align.
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
          selectRing.lookAt(picked.normal.clone().multiplyScalar(2));
          selectRing.scale.setScalar(Math.max(0.0016, camera.position.length() * 0.0016));
          placeLabel(picked.normal.clone().multiplyScalar(1.01), picked.normal);
        }
        renderer.render(scene, camera);
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
        camera.position.copy(homeDir().multiplyScalar(3.6)); camera.lookAt(0, 0, 0); controls.update();
      };
      const flyTo = (dir, distance) => {
        cancelAnimationFrame(tween);
        const from = camera.position.clone().normalize(), to = dir.clone().normalize(), dist = camera.position.length();
        const target = distance ?? dist, start = performance.now();
        const rotation = new T.Quaternion().setFromUnitVectors(from, to), identity = new T.Quaternion();
        const step = (now) => {
          const k = Math.min(1, (now - start) / 600), e = k < 0.5 ? 4 * k ** 3 : 1 - ((-2 * k + 2) ** 3) / 2;
          camera.position.copy(from.clone().applyQuaternion(identity.clone().slerp(rotation, e))).multiplyScalar(dist + (target - dist) * e);
          camera.lookAt(0, 0, 0); controls.update(); draw();
          if (k < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
      };
      let down = null;
      canvas.addEventListener('pointerdown', (event) => { down = [event.clientX, event.clientY]; });
      canvas.addEventListener('pointerup', (event) => {
        if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
        const box = canvas.getBoundingClientRect(), caster = new T.Raycaster();
        caster.setFromCamera(new T.Vector2(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
        const hits = caster.intersectObjects([moon, ...markers.map((m) => m.dotMesh)]);
        const first = hits[0];
        if (!first || first.object === moon) return;
        const hit = markers.find((m) => m.dotMesh === first.object);
        if (hit) { local.picked = hit.site.id; refresh(true); }
      });
      view3d = {
        request: () => { if (!home) { setHome(); home = true; } request(); },
        reset: () => flyTo(homeDir(), 3.6),
        focus: (site) => flyTo(new T.Vector3(...unit(site.lat, site.lon)), site.lat <= -75 ? 1.07 : undefined),
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
