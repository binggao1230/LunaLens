export function mountProbePreviews(root) {
  let cancelled = false, frameId = 0, previousTime = 0, decoder;
  let sharedEnv = null;
  const previews = [];
  const disposeModel = (model) => model.traverse(part => {
    part.geometry?.dispose();
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
  const dispose = () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    decoder?.dispose();
    sharedEnv?.dispose();
    for (const preview of previews) {
      preview.resize.disconnect();
      preview.visibility.disconnect();
      preview.controls.dispose();
      disposeModel(preview.model);
      preview.renderer.dispose();
    }
  };
  const getEnvironment = async (T, renderer) => {
    if (sharedEnv) return sharedEnv;
    const { RoomEnvironment } = await import('../vendor/three/RoomEnvironment.js');
    const envScene = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    sharedEnv = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    envScene.dispose();
    return sharedEnv;
  };
  const normalizeMaterials = async (model) => {
    const lifts = [];
    model.traverse(part => {
      if (!part.isMesh) return;
      for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
        if (!material?.isMeshStandardMaterial) continue;
        if (material.roughness < .4) material.roughness = .4;
        if (material.map?.image) lifts.push(material);
        else {
          const luminance = (.299 * material.color.r + .587 * material.color.g + .114 * material.color.b) * 255;
          if (luminance < 105) {
            material.color.multiplyScalar(Math.min(1 + (105 - luminance) * .014, 2.4));
            if (material.metalness > .6) material.metalness = .6;
            material.envMapIntensity = 1.8;
          } else material.envMapIntensity = 1;
        }
      }
    });
    await Promise.all(lifts.map(async (material) => {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      try {
        context.drawImage(material.map.image, 0, 0, size, size);
        const data = context.getImageData(0, 0, size, size).data;
        let sum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          sum += .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
          count++;
        }
        if (!count) return;
        const mean = sum / count;
        if (mean < 105) {
          material.color.multiplyScalar(Math.min(1 + (105 - mean) * .014, 2.4));
          if (material.metalness > .6) material.metalness = .6;
          material.envMapIntensity = 1.8;
        } else material.envMapIntensity = 1;
      } catch { /* undecodable texture: keep original */ }
    }));
  };

  async function mount() {
    const [T, { OrbitControls }, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('../vendor/three/three.module.js'), import('../vendor/three/OrbitControls.js'),
      import('../vendor/three/GLTFLoader.js'), import('../vendor/three/DRACOLoader.js'),
    ]);
    if (cancelled) return;
    decoder = new DRACOLoader().setDecoderPath('js/vendor/three/draco/');
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const render = (time) => {
      if (cancelled) return;
      frameId = requestAnimationFrame(render);
      if (time - previousTime < 32 || document.hidden || document.body.dataset.view !== 'start') return;
      const delta = Math.min((time - previousTime) / 1000, .1);
      previousTime = time;
      for (const preview of previews) {
        if (!preview.visible) continue;
        preview.controls.autoRotate = !reducedMotion.matches;
        preview.controls.update(delta);
        preview.renderer.render(preview.scene, preview.camera);
      }
    };
    frameId = requestAnimationFrame(render);
    await Promise.all([...root.querySelectorAll('canvas[data-model]')].map(async canvas => {
      const status = canvas.parentElement.querySelector('[role=status]');
      let model, renderer, controls;
      try {
        const file = {
          apollo: 'apollo-lm', artemis: 'artemis-lite',
          novac: 'lunar-lander', vikram: 'vikram-lander',
        }[canvas.dataset.model];
        model = (await loader.loadAsync(`assets/models/${file}.glb`)).scene;
        if (cancelled) { disposeModel(model); return; }
        if (canvas.dataset.model === 'artemis') model.traverse(part => {
          if (!part.isMesh) return;
          const originals = Array.isArray(part.material) ? part.material : [part.material];
          const materials = originals.map(original => {
            const gold = /Gold/i.test(original.name), chrome = /Chrome/i.test(original.name);
            original.dispose();
            return new T.MeshStandardMaterial({
              color: gold ? 0xcda756 : chrome ? 0x3d4956 : 0xdce2e8,
              metalness: gold ? .65 : chrome ? .65 : .35,
              roughness: gold ? .36 : .42,
            });
          });
          part.material = Array.isArray(part.material) ? materials : materials[0];
        });
        await normalizeMaterials(model);
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        const scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 1, .01, 100);
        const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3());
        model.scale.multiplyScalar(3.5 / Math.max(size.x, size.y, size.z));
        box.setFromObject(model);
        model.position.sub(box.getCenter(new T.Vector3()));
        box.setFromObject(model);
        const radius = box.getBoundingSphere(new T.Sphere()).radius;
        scene.environment = await getEnvironment(T, renderer);
        scene.add(model, new T.HemisphereLight(0xe4efff, 0x615950, 1.1));
        const light = new T.DirectionalLight(0xfff1dd, 2.4);
        light.position.set(4, 6, 5);
        const rim = new T.DirectionalLight(0xbbd8ff, 1.8);
        rim.position.set(-4, 3, -3);
        scene.add(light, rim);
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.autoRotateSpeed = .65;
        controls.minDistance = radius * 1.5;
        controls.maxDistance = 30;
        const preview = { model, renderer, camera, scene, controls, visible: true };
        let lastWidth = 0;
        preview.resize = new ResizeObserver(() => {
          const { width, height } = canvas.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          if (Math.abs(lastWidth - width) > 1) {
            const halfAngle = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
            camera.position.set(5.5, 3, 7.5).normalize().multiplyScalar(radius * 1.06 / Math.sin(halfAngle));
            controls.update();
            lastWidth = width;
          }
        });
        preview.visibility = new IntersectionObserver(entries => {
          preview.visible = entries[0].isIntersecting;
        });
        previews.push(preview);
        preview.resize.observe(canvas);
        preview.visibility.observe(canvas);
        canvas.dataset.loaded = 'true';
        status.textContent = '';
      } catch (error) {
        renderer?.dispose();
        controls?.dispose();
        if (model) disposeModel(model);
        if (!cancelled) {
          status.textContent = root.dataset.modelError;
          status.dataset.error = error?.message || String(error);
        }
      }
    }));
  }
  mount().catch((error) => {
    if (!cancelled) for (const status of root.querySelectorAll('[role=status]')) {
      status.textContent = root.dataset.modelError;
      status.dataset.error = error?.message || String(error);
    }
  });
  return dispose;
}
