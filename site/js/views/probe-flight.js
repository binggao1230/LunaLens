import { prepareLanding } from './flight-terrain.js';
import { buildFlightWorld, LOG_DEPTH } from './flight-world.js';
import { FLIGHT_SECONDS, clampProgress, during, flightPose, departureShot } from './flight-path.js';

export function playProbeFlight(canvas, { probe, site, reduced, onProgress, onComplete, onError }) {
  let stopped = false, frame = 0, renderer, scene, decoder, environment, resize, render;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const release = object => object?.traverse(part => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms ?? {})) if (uniform.value?.isTexture) textures.add(uniform.value);
    }
  });
  const dispose = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    resize?.disconnect();
    release(scene);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    environment?.dispose();
    decoder?.dispose();
    renderer?.dispose();
  };
  async function start() {
    const compact = Math.min(innerWidth, innerHeight) < 700;
    const [T, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }, data] = await Promise.all([
      import('../vendor/three/three.module.js'),
      import('../vendor/three/GLTFLoader.js'),
      import('../vendor/three/DRACOLoader.js'),
      import('../vendor/three/RoomEnvironment.js'),
      prepareLanding(site, { compact, cancelled: () => stopped }),
    ]);
    if (stopped) return;
    if (!data) throw new Error('Lunar terrain could not load');
    renderer = new T.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 2));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    decoder = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const file = { artemis: 'artemis-lite', apollo: 'apollo-lm', novac: 'lunar-lander', vikram: 'vikram-lander' }[probe];
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    const textureLoader = new T.TextureLoader();
    const assets = await Promise.allSettled([
      loader.loadAsync(`assets/models/${file}.glb`),
      textureLoader.loadAsync('assets/earth_day_4k.webp'),
      textureLoader.loadAsync('assets/moon_color_4k.webp'),
    ]);
    const model = assets[0].status === 'fulfilled' ? assets[0].value.scene : null;
    release(model);
    for (const asset of assets.slice(1)) if (asset.status === 'fulfilled') textures.add(asset.value);
    if (stopped) { dispose(); return; }
    if (!model) throw new Error('Selected lander could not load');
    const colour = assets[2].status === 'fulfilled' ? assets[2].value : null;
    const earth = assets[1].status === 'fulfilled' ? assets[1].value : null;
    for (const map of [colour, earth]) if (map) {
      map.colorSpace = T.SRGBColorSpace;
      map.wrapS = T.RepeatWrapping;
      map.wrapT = T.ClampToEdgeWrapping;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    const world = buildFlightWorld(T, renderer, data, colour, earth, compact);
    scene = world.scene;
    if (probe === 'artemis') model.traverse(part => {
      if (!part.isMesh) return;
      const originals = Array.isArray(part.material) ? part.material : [part.material];
      const replacements = originals.map(original => new T.MeshStandardMaterial({
        color: /Gold/i.test(original.name) ? 0xcda756 : /Chrome/i.test(original.name) ? 0x3d4956 : 0xdce2e8,
        metalness: .5, roughness: .42,
      }));
      part.material = Array.isArray(part.material) ? replacements : replacements[0];
    });
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    model.scale.multiplyScalar(2.7 / Math.max(size.x, size.y, size.z));
    box.setFromObject(model);
    model.position.sub(box.getCenter(new T.Vector3()));
    box.setFromObject(model);
    const bottom = box.min.y;
    const modelHeight = box.max.y - bottom;
    const ship = new T.Group();
    ship.add(model);
    scene.add(ship);
    const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04);
    room.dispose();
    pmrem.dispose();
    ship.traverse(part => {
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
        if (!material?.isMeshStandardMaterial) continue;
        material.envMap = environment.texture;
        material.envMapIntensity = .9;
        material.roughness = Math.max(.35, material.roughness);
      }
    });
    const hit = world.groundAt(0, 0);
    if (!hit) throw new Error('The landing surface is missing');
    const normal = hit.face.normal.clone().normalize();
    if (normal.y < 0) normal.negate();
    const upright = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), normal);
    const finalScale = flightPose(1).size / 2.7;
    let support = 0;
    const footprint = new T.Vector3();
    const contacts = Array(8).fill(null), reach = Array(8).fill(-Infinity);
    ship.updateMatrixWorld(true);
    // Support the actual feet, rather than empty bounding-box corners that can raise the lander
    // above a crater rim. The narrow bottom band also works for each of the four supplied models.
    model.traverse(part => {
      const positions = part.isMesh && part.geometry.attributes.position;
      if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        footprint.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld);
        if (footprint.y > bottom + modelHeight * .025) continue;
        for (let sector = 0; sector < 8; sector++) {
          const angle = sector * Math.PI / 4;
          const extent = footprint.x * Math.cos(angle) + footprint.z * Math.sin(angle);
          if (extent > reach[sector]) { reach[sector] = extent; contacts[sector] = footprint.clone(); }
        }
      }
    });
    for (const contact of contacts) {
      if (!contact) continue;
      footprint.copy(contact).multiplyScalar(finalScale).applyQuaternion(upright);
      const ground = world.groundAt(footprint.x, footprint.z);
      if (ground) support = Math.max(support, (ground.point.y - hit.point.y - footprint.y) / normal.y);
    }
    const touchdown = hit.point.clone().addScaledVector(normal, support + .00002);
    const plume = new T.Group();
    plume.position.y = bottom + modelHeight * .18;
    ship.add(plume);
    const plumeUniforms = { time: { value: 0 }, throttle: { value: 1 } };
    for (const [radius, length, density] of [[.3, 1.9, .22], [.11, 1.35, .65]]) {
      const geometry = new T.CylinderGeometry(.045, radius, length, 40, 24, true);
      geometry.translate(0, -length / 2, 0);
      plume.add(new T.Mesh(geometry, new T.ShaderMaterial({
        transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
        uniforms: { ...plumeUniforms, density: { value: density } },
        vertexShader: `
          ${LOG_DEPTH.vertex}
          uniform float time;
          varying vec2 cell;
          varying vec3 outward;
          varying vec3 eye;
          void main() {
            cell = uv;
            vec3 point = position;
            float end = 1. - uv.y;
            float wave = sin(end * 28. - time * 32. + uv.x * 6.283185) * .025 * end;
            point.xz *= 1. + wave;
            vec4 view = modelViewMatrix * vec4(point, 1.);
            outward = normalize(normalMatrix * normal);
            eye = normalize(-view.xyz);
            gl_Position = projectionMatrix * view;
            ${LOG_DEPTH.vertexMain}
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float throttle;
          uniform float density;
          varying vec2 cell;
          varying vec3 outward;
          varying vec3 eye;
          ${LOG_DEPTH.fragment}
          void main() {
            float end = 1. - cell.y;
            float edge = pow(abs(dot(normalize(outward), normalize(eye))), .7);
            float flow = .85 + .15 * sin(end * 45. - time * 42. + sin(cell.x * 18.));
            float alpha = density * edge * pow(1. - end, 1.8) * smoothstep(0., .035, end) * flow * throttle;
            vec3 colour = mix(vec3(.88, .95, 1.), vec3(.22, .48, .95), smoothstep(.05, .75, end));
            ${LOG_DEPTH.fragmentMain}
            gl_FragColor = vec4(colour, alpha);
          }
        `,
      })));
    }
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const glowContext = glowCanvas.getContext('2d');
    const gradient = glowContext.createRadialGradient(32, 32, 1, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(225,245,255,1)');
    gradient.addColorStop(.25, 'rgba(120,190,255,.6)');
    gradient.addColorStop(1, 'rgba(40,100,255,0)');
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 64, 64);
    const glow = new T.Sprite(new T.SpriteMaterial({
      map: new T.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    }));
    glow.scale.setScalar(.35);
    plume.add(glow);
    const shadowPositions = new Float32Array(65 * 3);
    const shadowUvs = new Float32Array(65 * 2);
    const shadowIndices = [];
    const shadowRadius = flightPose(1).size * .6;
    for (let index = 0; index < 65; index++) {
      const angle = (index - 1) / 63 * Math.PI * 2;
      const across = index ? Math.cos(angle) * shadowRadius : 0;
      const back = index ? Math.sin(angle) * shadowRadius : 0;
      shadowPositions.set([across, world.groundAt(across, back).point.y + .00005, back], index * 3);
      shadowUvs.set([.5 + across / (2 * shadowRadius), .5 + back / (2 * shadowRadius)], index * 2);
      if (index > 1) shadowIndices.push(0, index - 1, index);
    }
    const shadowGeometry = new T.BufferGeometry();
    shadowGeometry.setAttribute('position', new T.BufferAttribute(shadowPositions, 3));
    shadowGeometry.setAttribute('uv', new T.BufferAttribute(shadowUvs, 2));
    shadowGeometry.setIndex(shadowIndices);
    const shadow = new T.Mesh(shadowGeometry, new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide,
      uniforms: { opacity: { value: 0 } },
      vertexShader: `
        varying vec2 cell;
        ${LOG_DEPTH.vertex}
        void main() {
          cell = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          ${LOG_DEPTH.vertexMain}
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec2 cell;
        ${LOG_DEPTH.fragment}
        void main() {
          float shade = 1. - smoothstep(.05, .5, length(cell - .5));
          ${LOG_DEPTH.fragmentMain}
          gl_FragColor = vec4(0., 0., 0., shade * opacity);
        }
      `,
    }));
    shadow.renderOrder = 3;
    scene.add(shadow);
    const camera = new T.PerspectiveCamera(48, 1, .001, 100000);
    resize = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render?.();
    });
    resize.observe(canvas);
    const direction = new T.Vector3(), nose = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
    const target = new T.Vector3(), terrainOffset = new T.Vector3();
    const side = new T.Vector3(), behind = new T.Vector3(), offsetDir = new T.Vector3();
    const nearDir = new T.Vector3(), cameraRight = new T.Vector3();
    const cameraTurn = new T.Quaternion(), cameraOrbit = new T.Quaternion();
    const earthMesh = world.earth;
    const earthAz = new T.Vector3(data.axes.earth[0], 0, data.axes.earth[2]);
    if (earthAz.lengthSq() < 1e-8) earthAz.set(1, 0, 0);
    earthAz.normalize();
    const earthLand = earthAz.clone().multiplyScalar(Math.cos(.14)).addScaledVector(up, Math.sin(.14));
    const earthArrive = earthLand.clone().multiplyScalar(4600);
    const earthPos = new T.Vector3(), cameraEarthPos = new T.Vector3();
    const shipStart = new T.Vector3().fromArray(flightPose(0).position).add(touchdown);
    const moonCenter = new T.Vector3(0, -data.radiusKm - data.groundKm, 0);
    let opening, openingAspect;
    let elapsed = reduced ? FLIGHT_SECONDS : 0, previous = 0, landed = false;
    render = () => {
      const progress = clampProgress(elapsed / FLIGHT_SECONDS);
      const pose = flightPose(progress);
      ship.position.fromArray(pose.position).add(touchdown);
      const after = flightPose(Math.min(1, progress + .0001)).position;
      const before = flightPose(Math.max(0, progress - .0001)).position;
      direction.fromArray(after).sub(terrainOffset.fromArray(before)).normalize();
      nose.setFromUnitVectors(up, direction);
      ship.quaternion.copy(nose).slerp(upright, pose.upright);
      plumeUniforms.time.value = elapsed;
      plumeUniforms.throttle.value = Math.min(1, pose.throttle);
      plume.scale.set(1, .45 + .55 * pose.throttle, 1);
      plume.visible = pose.throttle > 0 && !reduced;
      glow.material.opacity = pose.throttle;
      shadow.material.uniforms.opacity.value = during(.85, 1, progress) * .5;
      const mobile = camera.aspect < .8;
      const blend = during(.02, .52, progress);
      if (openingAspect !== camera.aspect) {
        opening = departureShot(T, camera.aspect, shipStart, moonCenter, data.radiusKm, camera.fov);
        openingAspect = camera.aspect;
      }
      const baseHeight = pose.size * modelHeight / 2.7;
      const width = pose.size * Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2.7;
      const lens = 2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const framedDistance = Math.max(baseHeight / (lens * (mobile ? .36 : .40)), width / (lens * camera.aspect * .76));
      const distance = Math.exp(T.MathUtils.lerp(Math.log(opening.distance), Math.log(framedDistance), blend));
      const departureSize = opening.distance * lens * .20 * 2.7 / modelHeight;
      const craftSize = Math.exp(T.MathUtils.lerp(Math.log(departureSize), Math.log(pose.size), blend));
      const height = craftSize * modelHeight / 2.7;
      ship.scale.setScalar(craftSize / 2.7);
      // Preserve the established camera and departure timing independently of the final Earth reveal.
      cameraEarthPos.copy(opening.earthPosition).lerp(earthArrive, during(.28, .72, progress));
      // Settle Earth while it is outside the camera, then let the original camera reveal it naturally.
      earthPos.copy(opening.earthPosition).lerp(earthArrive, during(.23, .34, progress));
      earthMesh.position.copy(earthPos);
      const originalScale = T.MathUtils.lerp(opening.earthRadius / 180, 1, during(.18, .6, progress));
      earthMesh.scale.setScalar(T.MathUtils.lerp(originalScale, 1, during(.23, .34, progress)));
      behind.copy(cameraEarthPos).sub(ship.position);
      if (behind.lengthSq() < 1e-6) behind.set(0, 0, -1);
      behind.normalize();
      side.crossVectors(up, behind);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize();
      // The departure shot contains both planets. Follow the craft toward the growing Moon, then
      // finish opposite Earth so it remains visible beyond the lander above the lunar horizon.
      nearDir.copy(earthAz).negate().addScaledVector(side, mobile ? .07 : .22).addScaledVector(up, .18).normalize();
      cameraTurn.setFromUnitVectors(opening.direction, nearDir);
      cameraOrbit.identity().slerp(cameraTurn, blend);
      offsetDir.copy(opening.direction).applyQuaternion(cameraOrbit);
      camera.position.copy(ship.position).addScaledVector(offsetDir, distance);
      camera.up.copy(opening.up).lerp(up, blend).normalize();
      target.copy(ship.position).addScaledVector(up, height * .15 * blend);
      const floor = world.heightAt(camera.position.x, camera.position.z);
      if (floor != null) camera.position.y = Math.max(camera.position.y, floor + height * .25);
      camera.lookAt(target);
      cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      earthMesh.material.uniforms.sun.value.copy(camera.position).sub(earthPos).normalize()
        .addScaledVector(cameraRight, -.35).addScaledVector(camera.up, .20).normalize();
      camera.near = Math.max(.00002, distance / 1000);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      canvas.dataset.ready = 'true';
      canvas.dataset.phase = pose.phase;
      canvas.dataset.progress = String(progress);
      canvas.dataset.terrain = world.regional ? 'regional' : 'global';
      canvas.dataset.clearance = String(Math.max(0, ship.position.y - touchdown.y));
      onProgress(progress, pose.phase);
      if (progress === 1 && !landed) {
        landed = true;
        canvas.dataset.landed = 'true';
        onComplete();
      }
    };
    const tick = now => {
      if (stopped) return;
      if (document.hidden) { previous = 0; frame = requestAnimationFrame(tick); return; }
      if (previous) elapsed += Math.min((now - previous) / 1000, .1);
      previous = now;
      render();
      if (!landed) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  start().catch(error => {
    if (!stopped) { dispose(); onError(error); }
  });
  return dispose;
}
