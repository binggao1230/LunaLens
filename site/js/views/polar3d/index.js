// The Mission page's 3D scene. Moved out of mission.js in milestone M0 of doc/PLAN_3D.md with behaviour
// unchanged; M1 replaces the sphere with the polar cap. Deps come from the caller so this module owns no
// state that the list, the 2D map or the probe flight also need.
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
      const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
      const controls = new OrbitControls(camera, canvas);
      controls.enablePan = false; controls.minDistance = 1.12; controls.maxDistance = 9; controls.rotateSpeed = 0.7;
      const sunLight = new T.DirectionalLight(0xfff1d6, 3.1);
      scene.add(sunLight, new T.AmbientLight(0x8da4ff, 0.02));
      const moon = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshStandardMaterial({ map: new T.TextureLoader().load('assets/moon_1024.jpg', () => request()), roughness: 1, metalness: 0 }));
      scene.add(moon);

      // ---- South polar cap, real relief from the 480 m LOLA grid (M1 of doc/PLAN_3D.md) ----
      // The DEM is polar stereographic; the mesh is built on the sphere so the pole has no hole and the
      // terminator falls where the geometry says it does. Heights are R + h, never exaggerated.
      const R_MOON_M = 1737400;
      const capGroup = new T.Group();
      scene.add(capGroup);
      const capReady = (async () => {
        const meta = await (await fetch('data/dem480.json')).json();
        const compressed = await (await fetch(`data/${meta.file}`)).arrayBuffer();
        const packed = await new Response(
          new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),
        ).arrayBuffer();
        const dn = new Int16Array(packed);
        const n = meta.n, c = (n - 1) / 2, resM = meta.resM, scaleM = meta.scaleM;
        // A disc from the pole out to 75°S, sampled radially: the square raster would show corners and
        // the plan asks for a cap. 480 m cells, nearest sample; the mesh is in scene units (R = 1).
        const RINGS = 240, SPOKES = 512;
        const rMax = 2 * R_MOON_M * Math.tan(Math.PI / 4 + (-75 * Math.PI / 180) / 2);
        const positions = new Float32Array((RINGS + 1) * SPOKES * 3);
        let k = 0;
        for (let i = 0; i <= RINGS; i++) {
          const rho = (rMax * i) / RINGS;
          const lat = 2 * Math.atan(rho / (2 * R_MOON_M)) - Math.PI / 2;
          for (let a = 0; a < SPOKES; a++) {
            const lon = (a / SPOKES) * Math.PI * 2;
            const col = Math.round(c + (rho * Math.sin(lon)) / resM);
            const row = Math.round(c - (rho * Math.cos(lon)) / resM);
            const inside = col >= 0 && row >= 0 && col < n && row < n;
            const h = inside ? scaleM * dn[row * n + col] : 0;
            const r = 1 + h / R_MOON_M;
            const cl = Math.cos(lat);
            positions[k++] = r * cl * Math.cos(lon);
            positions[k++] = r * Math.sin(lat);
            positions[k++] = -r * cl * Math.sin(lon);
          }
        }
        const indices = new Uint32Array(RINGS * SPOKES * 6);
        let q = 0;
        for (let i = 0; i < RINGS; i++) {
          for (let a = 0; a < SPOKES; a++) {
            const a0 = i * SPOKES + a, a1 = i * SPOKES + ((a + 1) % SPOKES);
            const b0 = (i + 1) * SPOKES + a, b1 = (i + 1) * SPOKES + ((a + 1) % SPOKES);
            indices[q++] = a0; indices[q++] = b0; indices[q++] = a1;
            indices[q++] = a1; indices[q++] = b0; indices[q++] = b1;
          }
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
        geometry.setIndex(new T.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();
        const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: 0x9c99ab, roughness: 1, metalness: 0 }));
        mesh.name = 'cap';
        capGroup.add(mesh);
        moon.scale.setScalar(0.999);   // the far sphere stays for the zoomed-out view, just under the cap
        request();
        return mesh;
      })().catch((error) => { console.error('cap failed', error); return null; });

      // Graticule: 80°S and 85°S circles, the four meridians, and the pole marker. Drawn 1.5% above the
      // datum so it stays visible over the relief, which is at most 0.6% of the radius high.
      {
        const ring = (latDeg, color, opacity) => {
          const pts = [];
          for (let a = 0; a <= 360; a += 2) {
            const rr = 1.004, la = latDeg * Math.PI / 180, lo = a * Math.PI / 180;
            pts.push(new T.Vector3(rr * Math.cos(la) * Math.cos(lo), rr * Math.sin(la), -rr * Math.cos(la) * Math.sin(lo)));
          }
          return new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity }));
        };
        capGroup.add(ring(-85, 0xffffff, 0.35), ring(-80, 0xffffff, 0.2));
        for (const lon of [0, 90, 180, 270]) {
          const pts = [];
          for (let la = -90; la <= -75; la += 1) {
            const rr = 1.004, t = la * Math.PI / 180, o = lon * Math.PI / 180;
            pts.push(new T.Vector3(rr * Math.cos(t) * Math.cos(o), rr * Math.sin(t), -rr * Math.cos(t) * Math.sin(o)));
          }
          capGroup.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: lon === 0 ? 0.5 : 0.22 })));
        }
        const pole = new T.Mesh(new T.SphereGeometry(0.006, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff }));
        pole.position.set(0, 1.004, 0);
        capGroup.add(pole);
      }

      const glowTexture = (inner) => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, inner); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
        return new T.CanvasTexture(c);
      };
      // Earth is a camera-facing disk shaded pixel by pixel from the Moon's line of sight, not the
      // camera's: the camera sits outside the Earth, so camera shading would show the wrong phase.
      const earthCanvas = document.createElement('canvas');
      earthCanvas.width = earthCanvas.height = 160;
      const earthTex = new T.CanvasTexture(earthCanvas);
      const earth = new T.Sprite(new T.SpriteMaterial({ map: earthTex, transparent: true, depthWrite: false }));
      earth.scale.set(0.72, 0.72, 1);
      const paintEarth = (sunDir, fwd) => {
        const S = 160, R = S / 2 - 2, g = earthCanvas.getContext('2d');
        const img = g.createImageData(S, S), out = img.data;
        const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize();
        const up = new T.Vector3().crossVectors(right, fwd).normalize();
        for (let py = 0; py < S; py++) {
          const ny = (S / 2 - (py + 0.5)) / R;
          for (let px = 0; px < S; px++) {
            const nx = (px + 0.5 - S / 2) / R, r2 = nx * nx + ny * ny, o = (py * S + px) * 4;
            if (r2 > 1) { out[o + 3] = 0; continue; }
            const nz = Math.sqrt(1 - r2);
            const x = right.x * nx + up.x * ny - fwd.x * nz;
            const y = right.y * nx + up.y * ny - fwd.y * nz;
            const z = right.z * nx + up.z * ny - fwd.z * nz;
            const shade = 0.05 + 0.95 * Math.pow(Math.max(0, x * sunDir.x + y * sunDir.y + z * sunDir.z), 0.55);
            out[o] = 44 * shade; out[o + 1] = 108 * shade; out[o + 2] = 208 * shade; out[o + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
        earthTex.needsUpdate = true;
      };
      const sunBody = new T.Mesh(new T.SphereGeometry(0.22, 24, 16), new T.MeshBasicMaterial({ color: 0xffd45a }));
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
        markers = list.filter((site) => site.lat <= -74.5).map((site) => {
          const normal = new T.Vector3(...unit(site.lat, site.lon));
          // Sit on the relief, not on the datum: groundM comes from sites.json, from the same DEM.
          const radius = 1 + (Number(site.groundM) || 0) / 1737400 + 0.0015;
          const dotMesh = new T.Mesh(sphereGeometry, new T.MeshBasicMaterial({ color: COLORS.dark }));
          dotMesh.position.copy(normal).multiplyScalar(radius);
          const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: COLORS.sun, side: T.DoubleSide }));
          ring.position.copy(normal).multiplyScalar(radius);
          ring.lookAt(normal.clone().multiplyScalar(2));
          markerGroup.add(dotMesh, ring);
          return { site, normal, radius, dotMesh, ring };
        });
      };
      const request = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; draw(); }); };
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
        sunLight.position.set(...f.sun).multiplyScalar(10);
        earth.position.set(...f.earth).multiplyScalar(3.0);
        paintEarth(new T.Vector3(...f.sun).normalize(), new T.Vector3(...f.earth).normalize());
        sunBody.position.set(...f.sun).multiplyScalar(8);
        sunGlow.position.copy(sunBody.position);
        sunSpot.position.set(...f.sun).multiplyScalar(1.004);
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
          m.dotMesh.scale.setScalar(selected ? 0.034 : 0.024);
          m.ring.visible = status.link && status.sun;
          m.ring.scale.setScalar(selected ? 0.034 : 0.024);
        }
        const picked = markers.find((m) => m.site === chosen);
        selectRing.visible = Boolean(picked);
        if (picked) {
          selectRing.position.copy(picked.normal).multiplyScalar(1.006);
          selectRing.lookAt(picked.normal.clone().multiplyScalar(2));
          selectRing.scale.setScalar(0.034);
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
      // M1: the home view is the south pole, 0° longitude towards the top, matching the 2D polar map.
      const setHome = () => {
        camera.up.set(1, 0, 0);
        camera.position.set(0, 1.5, 0);
        camera.lookAt(0, 0, 0);
        controls.update();
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
        reset: () => setHome(),
        focus: (site) => flyTo(new T.Vector3(...unit(site.lat, site.lon))),
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
