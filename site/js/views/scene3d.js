import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { loadDem } from '../engine/dem.js';
import { terrainPatch } from './terrain-mesh.js';
import { t, getLanguage } from '../i18n.js';
import { fmtDayMonth, fmtDeg } from '../format.js';

const DEG = Math.PI / 180;
const $ = (selector) => document.querySelector(selector);
const direction = (body) => new THREE.Vector3(Math.sin(body.az * DEG) * Math.cos(body.el * DEG), Math.sin(body.el * DEG), -Math.cos(body.az * DEG) * Math.cos(body.el * DEG));

export async function createScene(canvas, labelLayer) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x0c0e11);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1600);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 32;
  controls.maxDistance = 280;
  controls.enablePan = true;
  controls.zoomToCursor = true;
  const light = new THREE.DirectionalLight(0xfff2d7, 3);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 400 });
  light.shadow.bias = -0.0003;
  light.shadow.normalBias = 0.04;
  scene.add(light, light.target, new THREE.AmbientLight(0xc4d4ec, 0.36));
  const fill = new THREE.DirectionalLight(0xc6d6f9, 0.6);
  fill.position.set(-30, 80, 40);
  scene.add(fill);
  const terrain = new THREE.Group();
  const time = new THREE.Group();
  scene.add(terrain, time);
  let model = null;
  let terrainDem = null;
  let demLoading = null;
  let demFailed = false;
  let terrainKey = '';
  let timelineKey = '';
  let heightScale = 3;
  let active = true;
  let frame = 0;
  let lastMode = '';
  let labels = [];
  let cursor = null;
  let sunArrow = null;
  let earthArrow = null;
  let maxElevation = 10;
  let timelineLow = -10;
  let timelineSpan = 20;
  let timeMarkers = [];

  function disposeGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      child.traverse((item) => {
        item.geometry?.dispose();
        const materials = Array.isArray(item.material) ? item.material : [item.material];
        materials.forEach((material) => material?.dispose());
      });
      group.remove(child);
    }
  }

  function clearLabels() {
    labels = [];
    labelLayer.replaceChildren();
  }

  function addLabel(text, position, kind = '') {
    const element = document.createElement('span');
    element.className = 'scene-label';
    element.dataset.kind = kind;
    element.textContent = text;
    labelLayer.append(element);
    const label = { element, position, kind, width: 0 };
    labels.push(label);
    return label;
  }

  function line(points, color, group, opacity = 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    const object = new THREE.Line(geometry, material);
    group.add(object);
    return object;
  }

  function status(message) {
    $('#scene-status').textContent = t(message);
    $('#scene-status').hidden = !message;
  }

  function reset() {
    controls.target.set(0, 0, 0);
    if (model?.mode === 'time') {
      camera.position.set(80, 73, 102);
      controls.target.set(0, 9, 0);
    } else camera.position.set(67, 64, 78);
    controls.update();
    requestDraw();
  }

  function buildTerrain() {
    const key = `${model.site.id}/${heightScale}/${getLanguage()}`;
    if (key === terrainKey) return;
    terrainKey = key;
    disposeGroup(terrain);
    clearLabels();
    if (model.site.lat > -75) {
      status('No terrain coverage at this site. Select a south polar site or explore Time 3D.');
      return;
    }
    if (!terrainDem) {
      status(demFailed ? 'Terrain could not load. Select Time 3D or reload to try again.' : 'Loading 3D terrain…');
      if (!demLoading && !demFailed) {
        demLoading = loadDem('data/dem480').then((dem) => {
          terrainDem = dem;
          terrainKey = '';
          if (model.mode === 'terrain') render(model);
        }).catch((error) => {
          console.error(error);
          demFailed = true;
          terrainKey = '';
          if (model.mode === 'terrain') render(model);
        });
      }
      return;
    }
    const patch = terrainPatch(terrainDem, model.site, { heightScale });
    if (!patch) {
      status('No terrain coverage at this site. Select a south polar site or explore Time 3D.');
      return;
    }
    status('');
    const geometry = new THREE.PlaneGeometry(80, 80, patch.segments, patch.segments);
    geometry.setAttribute('position', new THREE.BufferAttribute(patch.positions, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xa8abb0, roughness: 1, metalness: 0 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    terrain.add(mesh);
    const indices = [];
    const side = patch.segments + 1;
    for (let col = 0; col < side; col++) indices.push(col);
    for (let row = 1; row < side; row++) indices.push(row * side + side - 1);
    for (let col = side - 2; col >= 0; col--) indices.push((side - 1) * side + col);
    for (let row = side - 2; row > 0; row--) indices.push(row * side);
    const skirtPositions = [];
    const base = patch.lowest - 3;
    for (let index = 0; index < indices.length; index++) {
      const first = indices[index] * 3;
      const second = indices[(index + 1) % indices.length] * 3;
      const topA = [...patch.positions.slice(first, first + 3)];
      const topB = [...patch.positions.slice(second, second + 3)];
      const baseA = [topA[0], base, topA[2]], baseB = [topB[0], base, topB[2]];
      skirtPositions.push(...topA, ...baseA, ...topB, ...topB, ...baseA, ...baseB);
    }
    const skirtGeometry = new THREE.BufferGeometry();
    skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3));
    skirtGeometry.computeVertexNormals();
    terrain.add(new THREE.Mesh(skirtGeometry, new THREE.MeshStandardMaterial({ color: 0x33313c, roughness: 1, side: THREE.DoubleSide })));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 40), new THREE.MeshBasicMaterial({ color: 0xc1a3ff, depthTest: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    ring.renderOrder = 3;
    terrain.add(ring);
    line([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 8, 0)], 0xc1a3ff, terrain);
    addLabel(model.site.short, new THREE.Vector3(0, 9, 0));
    const origin = new THREE.Vector3(0, 2, 0);
    sunArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, 30, 0xf4c776, 2.3, 1);
    earthArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 25, 0x83c6f7, 2.3, 1);
    terrain.add(sunArrow, earthArrow);
    addLabel(t('Sun'), new THREE.Vector3(), 'sun');
    addLabel(t('Earth'), new THREE.Vector3(), 'earth');
    addLabel(t('N'), new THREE.Vector3(0, base, -43));
    addLabel(t('E'), new THREE.Vector3(43, base, 0));
    addLabel('20 km', new THREE.Vector3(-28, base + 0.5, 43));
    line([new THREE.Vector3(-38, base, 42), new THREE.Vector3(-18, base, 42)], 0x949bac, terrain);
  }

  function buildTimeline() {
    const key = `${model.sites.map((site) => site.id).join(',')}/${model.i0}/${model.i1}/${model.version}/${getLanguage()}`;
    if (timelineKey === key) return;
    timelineKey = key;
    disposeGroup(time);
    clearLabels();
    timeMarkers = [];
    status('');
    timelineLow = Infinity;
    maxElevation = -Infinity;
    for (const site of model.sites) {
      const series = site.series;
      for (let index = model.i0; index <= model.i1; index++) {
        timelineLow = Math.min(timelineLow, series.sunEl[index], series.earthEl[index]);
        maxElevation = Math.max(maxElevation, series.sunEl[index], series.earthEl[index]);
      }
    }
    timelineLow = Math.floor(Math.min(-1, timelineLow) / 5) * 5;
    maxElevation = Math.ceil(Math.max(1, maxElevation) / 5) * 5;
    timelineSpan = Math.max(5, maxElevation - timelineLow);
    const xOf = (index) => -52 + 104 * (index - model.i0) / (model.i1 - model.i0);
    const yOf = (elevation) => 4 + 34 * (elevation - timelineLow) / timelineSpan;
    const depth = Math.max(24, model.sites.length * 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(116, depth + 12), new THREE.MeshBasicMaterial({ color: 0x161a22, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    floor.rotation.x = -Math.PI / 2;
    time.add(floor);
    for (let tick = 0; tick <= 4; tick++) {
      const x = -52 + 26 * tick;
      line([new THREE.Vector3(x, 0.2, -depth / 2), new THREE.Vector3(x, 0.2, depth / 2)], 0x343947, time);
      addLabel(fmtDayMonth(model.eph.timeOf(model.i0 + (model.i1 - model.i0) * tick / 4)), new THREE.Vector3(x, -1, depth / 2 + 4));
    }
    for (let tick = 0; tick <= 4; tick++) {
      const elevation = timelineLow + timelineSpan * tick / 4;
      line([new THREE.Vector3(-54, yOf(elevation), -depth / 2), new THREE.Vector3(54, yOf(elevation), -depth / 2)], 0x343947, time, 0.7);
      addLabel(`${elevation.toFixed(timelineSpan < 10 ? 1 : 0)}°`, new THREE.Vector3(-58, yOf(elevation), -depth / 2));
    }
    model.sites.forEach((site, slot) => {
      const z = (slot - (model.sites.length - 1) / 2) * 14;
      addLabel(site.short, new THREE.Vector3(-58, 2, z + 2));
      const series = site.series;
      const step = Math.max(1, Math.ceil((model.i1 - model.i0) / 1200));
      for (const body of ['sun', 'earth']) {
        const offset = body === 'sun' ? -2 : 2;
        const color = body === 'sun' ? 0xf4c776 : 0x83c6f7;
        const visible = [], hidden = [], base = [];
        const ribbon = [], ribbonColors = [];
        const bright = new THREE.Color(color);
        const dim = bright.clone().multiplyScalar(0.18);
        for (let index = model.i0; index < model.i1; index += step) {
          const next = Math.min(model.i1, index + step);
          const segment = [xOf(index), yOf(series[`${body}El`][index]), z + offset, xOf(next), yOf(series[`${body}El`][next]), z + offset];
          (series[`${body}Vis`][index] ? visible : hidden).push(...segment);
          if (series[`${body}Vis`][index]) base.push(xOf(index), 0.4, z + offset, xOf(next), 0.4, z + offset);
          const startX = xOf(index), endX = xOf(next);
          const startY = yOf(series[`${body}El`][index]), endY = yOf(series[`${body}El`][next]);
          ribbon.push(startX, startY, z + offset - 0.4, startX, startY, z + offset + 0.4, endX, endY, z + offset - 0.4,
            endX, endY, z + offset - 0.4, startX, startY, z + offset + 0.4, endX, endY, z + offset + 0.4);
          const shade = series[`${body}Vis`][index] ? bright : dim;
          for (let vertex = 0; vertex < 6; vertex++) ribbonColors.push(shade.r, shade.g, shade.b);
        }
        for (const [points, opacity] of [[visible, 1], [hidden, 0.2], [base, 0.55]]) {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
          time.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })));
        }
        const ribbonGeometry = new THREE.BufferGeometry();
        ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbon, 3));
        ribbonGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 3));
        time.add(new THREE.Mesh(ribbonGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color }));
        time.add(marker);
        timeMarkers.push({ marker, site, body, z: z + offset });
      }
    });
    const cursorGeometry = new THREE.PlaneGeometry(depth, 43);
    cursor = new THREE.Mesh(cursorGeometry, new THREE.MeshBasicMaterial({ color: 0xc6a8ff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
    cursor.rotation.y = Math.PI / 2;
    cursor.position.y = 21.5;
    time.add(cursor);
    addLabel(t('Sun'), new THREE.Vector3(36, 44, 0), 'sun');
    addLabel(t('Earth'), new THREE.Vector3(51, 44, 0), 'earth');
  }

  function draw() {
    frame = 0;
    if (!model || !active) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const placed = [];
    for (const label of labels) {
      const projected = label.position.clone().project(camera);
      const x = (projected.x / 2 + 0.5) * width;
      const y = (-projected.y / 2 + 0.5) * height;
      if (!label.element.hidden) label.width = label.element.offsetWidth;
      const half = Math.max(15, Math.min(145, (label.width || label.element.textContent.length * 8 + 14) / 2));
      const outside = projected.z > 1 || x < half || x > width - half || y < 10 || y > height - 40;
      const overlap = placed.some((box) => Math.abs(box.y - y) < 23 && Math.abs(box.x - x) < box.half + half + 4);
      label.element.hidden = outside || overlap;
      if (!outside && !overlap) placed.push({ x, y, half });
      label.element.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    }
    canvas.dataset.rendered = model.mode;
  }

  function requestDraw() {
    if (active && !frame) frame = requestAnimationFrame(draw);
  }

  function render(next) {
    const changedMode = lastMode !== next.mode;
    model = next;
    if (changedMode) {
      terrainKey = '';
      timelineKey = '';
      lastMode = next.mode;
    }
    terrain.visible = next.mode === 'terrain';
    time.visible = next.mode === 'time';
    $('#scene-scale').hidden = next.mode !== 'terrain';
    $('#scene-sub').textContent = t(next.mode === 'terrain' ? 'Rotate, zoom and explore the real lunar relief around your site.' : 'Elevation through time · bright segments are visible; dim segments are hidden.');
    if (next.mode === 'terrain') {
      buildTerrain();
      const sky = next.site.skyAt(next.index);
      const sunDirection = direction(sky.sun), earthDirection = direction(sky.earth);
      light.position.copy(sunDirection).multiplyScalar(150);
      light.intensity = sky.sun.el > -0.3 ? 3.2 : 0;
      fill.intensity = 0.5;
      if (terrain.children.length && sunArrow) {
        sunArrow.setDirection(sunDirection);
        earthArrow.setDirection(earthDirection);
        const sunLabel = labels.find((label) => label.kind === 'sun');
        const earthLabel = labels.find((label) => label.kind === 'earth');
        sunLabel.position.copy(sunDirection).multiplyScalar(33).add(new THREE.Vector3(0, 2, 0));
        earthLabel.position.copy(earthDirection).multiplyScalar(28).add(new THREE.Vector3(0, 2, 0));
        sunLabel.element.textContent = `${t('Sun')} ${fmtDeg(sky.sun.el)}`;
        earthLabel.element.textContent = `${t('Earth')} ${fmtDeg(sky.earth.el)}`;
      }
      $('#scene-detail').textContent = `${next.site.short} · ${t('80 km across · LOLA display grid 480 m · heights ×{factor}', { factor: heightScale })}`;
      $('#scene-limit').textContent = t('Relief lighting is illustrative; visibility totals use the original skyline, independently of this view.');
    } else {
      buildTimeline();
      light.intensity = 0;
      fill.intensity = 0;
      cursor.position.x = -52 + 104 * (next.index - next.i0) / (next.i1 - next.i0);
      for (const { marker, site, body, z } of timeMarkers) {
        const sky = site.skyAt(next.index)[body];
        marker.position.set(cursor.position.x, 4 + 34 * (sky.el - timelineLow) / timelineSpan, z);
        marker.material.opacity = sky.visible ? 1 : 0.25;
        marker.material.transparent = !sky.visible;
      }
      $('#scene-detail').textContent = `${next.sites.map((site) => site.short).join(' · ')}. ${t('Time runs left to right. Each lane is one compared site; heights show elevation in degrees.')}`;
      $('#scene-limit').textContent = `${t('Sun in view')} · ${t('Earth in view')} · JPL Horizons / LRO LOLA`;
    }
    if (changedMode) reset();
    requestDraw();
  }

  controls.addEventListener('change', requestDraw);
  new ResizeObserver(requestDraw).observe(canvas);
  canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return reset();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
    if (event.key === 'ArrowRight') spherical.theta += 0.12;
    if (event.key === 'ArrowUp') spherical.phi = Math.max(0.1, spherical.phi - 0.1);
    if (event.key === 'ArrowDown') spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + 0.1);
    if (event.key === '+') spherical.radius = Math.max(controls.minDistance, spherical.radius * 0.9);
    if (event.key === '-') spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.1);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    status('3D is unavailable on this device. The sky, map and calculations remain available above.');
  });
  canvas.addEventListener('webglcontextrestored', requestDraw);

  return {
    render,
    reset,
    setActive(value) { active = value; if (active) requestDraw(); },
    setHeightScale(value) {
      heightScale = value;
      if (model) render(model);
    },
  };
}
