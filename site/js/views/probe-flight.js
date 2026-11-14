export function playProbeFlight(canvas, { probe, reduced, onProgress, onComplete, onError }) {
  let stopped = false, frame = 0, renderer, scene, decoder, environment, resize;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const release = object => object?.traverse(part => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
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
    const [T, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }] = await Promise.all([
      import('../vendor/three/three.module.js'),
      import('../vendor/three/GLTFLoader.js'),
      import('../vendor/three/DRACOLoader.js'),
      import('../vendor/three/RoomEnvironment.js'),
    ]);
    if (stopped) return;
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene = new T.Scene();
    scene.background = new T.Color(0x030609);
    const camera = new T.PerspectiveCamera(48, 1, .1, 1600);
    resize = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(canvas);
    decoder = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const file = { artemis: 'artemis-lite', apollo: 'apollo-lm', novac: 'lunar-lander', vikram: 'vikram-lander' }[probe];
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    const textureLoader = new T.TextureLoader();
    const results = await Promise.allSettled([
      loader.loadAsync(`assets/models/${file}.glb`),
      textureLoader.loadAsync('assets/earth_2048.jpg'),
      textureLoader.loadAsync('assets/moon_1024.jpg'),
    ]);
    const model = results[0].status === 'fulfilled' ? results[0].value.scene : null;
    release(model);
    for (const result of results.slice(1)) if (result.status === 'fulfilled') textures.add(result.value);
    if (stopped) { dispose(); return; }
    if (!model) throw new Error('Selected model could not load');
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
    const ship = new T.Group();
    ship.add(model);
    scene.add(ship);
    const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04);
    ship.traverse(part => {
      for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
        if (!material?.isMeshStandardMaterial) continue;
        material.envMap = environment.texture;
        material.envMapIntensity = 1.1;
        material.roughness = Math.max(.35, material.roughness);
      }
    });
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0xb9d5f5, 0x2e2a20, 1.5));
    const sun = new T.DirectionalLight(0xfff4e0, 3.4);
    sun.position.set(-40, 25, 25);
    scene.add(sun);
    const rim = new T.DirectionalLight(0x83baff, 2);
    rim.position.set(10, 5, -50);
    scene.add(rim);
    const sphere = (radius, color, textureResult) => {
      const map = textureResult.status === 'fulfilled' ? textureResult.value : null;
      if (map) map.colorSpace = T.SRGBColorSpace;
      const mesh = new T.Mesh(new T.SphereGeometry(radius, 80, 48), new T.MeshStandardMaterial({
        color, map, roughness: 1, metalness: 0,
      }));
      scene.add(mesh);
      return mesh;
    };
    const earth = sphere(9, 0xffffff, results[1]);
    earth.rotation.y = 2;
    earth.rotation.z = .2;
    const atmosphere = new T.Mesh(new T.SphereGeometry(9.13, 64, 40), new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide,
      vertexShader: 'varying vec3 normalView; varying vec3 positionView; void main(){vec4 p=modelViewMatrix*vec4(position,1.); normalView=normalize(normalMatrix*normal); positionView=p.xyz; gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 normalView; varying vec3 positionView; void main(){float edge=pow(1.-abs(dot(normalize(normalView),normalize(-positionView))),3.); gl_FragColor=vec4(.15,.45,1.,edge*.65);}',
    }));
    scene.add(atmosphere);
    const moon = sphere(14, 0xffffff, results[2]);
    moon.position.set(0, 0, -95);
    moon.rotation.y = .6;
    const starPositions = new Float32Array(1100 * 3);
    for (let index = 0; index < 1100; index++) {
      const azimuth = index * 2.399963, height = 1 - 2 * (index + .5) / 1100;
      const radius = Math.sqrt(1 - height * height);
      starPositions.set([Math.cos(azimuth) * radius * 550, height * 550, Math.sin(azimuth) * radius * 550], index * 3);
    }
    const stars = new T.BufferGeometry();
    stars.setAttribute('position', new T.BufferAttribute(starPositions, 3));
    scene.add(new T.Points(stars, new T.PointsMaterial({ color: 0xb9c9df, size: .55, transparent: true, opacity: .65, sizeAttenuation: true })));
    const route = new T.CubicBezierCurve3(
      new T.Vector3(0, 0, 13), new T.Vector3(24, 6, 12),
      new T.Vector3(15, 4, -57), new T.Vector3(0, 1, -78),
    );
    const exhaust = new T.Mesh(new T.ConeGeometry(.16, 1.8, 24), new T.MeshBasicMaterial({
      color: 0x9cd8ff, transparent: true, opacity: .6, depthWrite: false,
    }));
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, -.9, .7);
    ship.add(exhaust);
    const target = new T.Vector3(), offset = new T.Vector3();
    let elapsed = 0, previous = 0;
    const render = now => {
      if (stopped) return;
      frame = requestAnimationFrame(render);
      if (document.hidden) { previous = now; return; }
      if (previous) elapsed += Math.min((now - previous) / 1000, .25);
      previous = now;
      const progress = Math.min(1, elapsed / (reduced ? .8 : 10.5));
      const travel = reduced ? .86 : progress * progress * (3 - 2 * progress);
      ship.position.copy(route.getPoint(travel));
      ship.rotation.set(.08, -.35 + travel * .3, -.12 + Math.sin(travel * Math.PI) * .15);
      exhaust.visible = !reduced && progress < .86;
      exhaust.scale.y = .8 + Math.sin(elapsed * 43) * .12;
      const establish = reduced ? 1 : Math.min(1, progress / .27);
      const blend = establish * establish * (3 - 2 * establish);
      const mobile = camera.aspect < .8;
      offset.set(mobile ? 3 : 5.5, mobile ? 4 : 3.5, mobile ? 17 : 11);
      offset.lerp(new T.Vector3(23, 10, 24), 1 - blend);
      camera.position.copy(ship.position).add(offset);
      target.copy(ship.position).add(new T.Vector3(0, 1.5, -6 * blend));
      camera.lookAt(target);
      earth.rotation.y += reduced ? 0 : .0003;
      renderer.render(scene, camera);
      canvas.dataset.ready = 'true';
      onProgress(progress);
      if (progress >= 1) { cancelAnimationFrame(frame); onComplete(); }
    };
    frame = requestAnimationFrame(render);
  }
  start().catch(error => { if (!stopped) onError(error); });
  return dispose;
}
