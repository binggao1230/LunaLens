import { heightAt } from './flight-terrain.js';

export const LOG_DEPTH = {
  vertex: '#ifdef USE_LOGDEPTHBUF\nvarying float vFragDepth;\n#endif\n',
  vertexMain: '#ifdef USE_LOGDEPTHBUF\nvFragDepth = 1.0 + gl_Position.w;\n#endif\n',
  fragment: '#ifdef USE_LOGDEPTHBUF\nuniform float logDepthBufFC;\nvarying float vFragDepth;\n#endif\n',
  fragmentMain: '#ifdef USE_LOGDEPTHBUF\ngl_FragDepth = log2(vFragDepth) * logDepthBufFC * 0.5;\n#endif\n',
};

const terrainVertex = `
  ${LOG_DEPTH.vertex}
  varying vec3 ground;
  varying vec2 cell;
  void main() {
    ground = position;
    cell = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    ${LOG_DEPTH.vertexMain}
  }
`;

const colourLookup = `
  uniform sampler2D colour;
  uniform vec3 up;
  uniform vec3 right;
  uniform vec3 forward;
  uniform float centre;
  uniform float exposure;
  uniform float tinted;
  vec3 albedoAt(vec3 ground) {
    vec3 direction = normalize(up * (centre + ground.y) + right * ground.x - forward * ground.z);
    float turn = atan(direction.y, direction.x) / 6.283185307179586;
    float east = turn + .5;
    float west = fract(turn + 1.) - .5;
    float north = asin(clamp(direction.z, -1., 1.)) / 3.141592653589793 + .5;
    float across = abs(dFdx(east)) < abs(dFdx(west)) ? dFdx(east) : dFdx(west);
    float down = abs(dFdy(east)) < abs(dFdy(west)) ? dFdy(east) : dFdy(west);
    return mix(vec3(.13), textureGrad(colour, vec2(east, north), vec2(across, dFdx(north)), vec2(down, dFdy(north))).rgb, tinted);
  }
  vec3 tone(vec3 albedo, float direct) {
    return pow(1. - exp(-albedo * direct * exposure) + albedo * .03, vec3(1. / 2.2));
  }
`;

export function buildFlightWorld(T, renderer, data, colour, earthMap, compact) {
  const scene = new T.Scene();
  scene.background = new T.Color(0x000000);
  const { axes, radiusKm, groundKm } = data;
  const centre = radiusKm + groundKm;
  const common = () => ({
    colour: { value: colour }, tinted: { value: colour ? 1 : 0 },
    up: { value: new T.Vector3(...axes.up) }, right: { value: new T.Vector3(...axes.right) },
    forward: { value: new T.Vector3(...axes.forward) }, centre: { value: centre },
    exposure: { value: data.exposure }, sun: { value: new T.Vector3(...data.sun) },
  });
  const layer = ({ samples, widthKm, vertical, light }, stride, hole, outer) => {
    const side = (samples - 1) / stride + 1;
    const positions = new Float32Array(side * side * 3);
    const uvs = new Float32Array(side * side * 2);
    const indices = new Uint32Array((side - 1) ** 2 * 6);
    for (let row = 0; row < side; row++) {
      for (let col = 0; col < side; col++) {
        const index = row * side + col;
        const height = vertical[row * stride * samples + col * stride];
        const across = widthKm * (col / (side - 1) - .5);
        const back = widthKm * (row / (side - 1) - .5);
        const range = Math.hypot(across, back);
        const spread = range ? (height + centre) * Math.tan(range / radiusKm) / range : 1;
        positions.set([across * spread, height, back * spread], index * 3);
        uvs.set([(col * stride + .5) / samples, (row * stride + .5) / samples], index * 2);
        if (row < side - 1 && col < side - 1) {
          indices.set([index, index + side, index + 1, index + 1, index + side, index + side + 1], (row * (side - 1) + col) * 6);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    geometry.setIndex(new T.BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();
    const map = new T.DataTexture(light, samples, samples, T.RGBAFormat);
    map.colorSpace = T.SRGBColorSpace;
    map.magFilter = T.LinearFilter;
    map.minFilter = T.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    map.needsUpdate = true;
    const mesh = new T.Mesh(geometry, new T.ShaderMaterial({
      side: T.DoubleSide, transparent: true,
      uniforms: {
        ...common(), light: { value: map }, hole: { value: hole },
        outer: { value: outer ? widthKm / 2 : 0 },
      },
      vertexShader: terrainVertex,
      fragmentShader: `
        uniform sampler2D light;
        uniform float hole;
        uniform float outer;
        varying vec3 ground;
        varying vec2 cell;
        ${colourLookup}
        ${LOG_DEPTH.fragment}
        void main() {
          if (length(ground.xz) < hole) discard;
          vec4 sunlight = texture2D(light, cell);
          float alpha = sunlight.a;
          if (outer > 0.) alpha *= 1. - smoothstep(.94, 1., max(abs(cell.x - .5), abs(cell.y - .5)) * 2.);
          ${LOG_DEPTH.fragmentMain}
          gl_FragColor = vec4(tone(albedoAt(ground), sunlight.r), alpha);
        }
      `,
    }));
    mesh.renderOrder = outer ? 1 : 2;
    return mesh;
  };
  const around = layer(data.far, 2, data.holeKm, true);
  const near = layer(data.near, 2, 0, false);
  const globeGeometry = new T.SphereGeometry(1, compact ? 384 : 768, compact ? 192 : 384);
  const vertices = globeGeometry.attributes.position;
  for (let index = 0; index < vertices.count; index++) {
    const body = [vertices.getX(index), -vertices.getZ(index), vertices.getY(index)];
    const height = heightAt(data.globe, ...body) / 1000;
    const radius = radiusKm + height;
    const project = axis => body[0] * axis[0] + body[1] * axis[1] + body[2] * axis[2];
    vertices.setXYZ(index, radius * project(axes.right), radius * project(axes.up) - centre, -radius * project(axes.forward));
  }
  globeGeometry.computeVertexNormals();
  globeGeometry.computeBoundingSphere();
  const globe = new T.Mesh(globeGeometry, new T.ShaderMaterial({
    uniforms: { ...common(), cut: { value: data.far.widthKm * .47 }, radius: { value: radiusKm } },
    vertexShader: `
      ${LOG_DEPTH.vertex}
      varying vec3 ground;
      varying vec3 outward;
      void main() {
        ground = position;
        outward = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        ${LOG_DEPTH.vertexMain}
      }
    `,
    fragmentShader: `
      uniform vec3 sun;
      uniform float cut;
      uniform float radius;
      varying vec3 ground;
      varying vec3 outward;
      ${colourLookup}
      ${LOG_DEPTH.fragment}
      void main() {
        vec3 local = vec3(ground.x, ground.y + centre, ground.z);
        vec3 direction = normalize(local);
        float angle = acos(clamp(direction.y, -1., 1.));
        vec2 map = normalize(local.xz + vec2(.0000001)) * angle * radius;
        if (direction.y > 0. && max(abs(map.x), abs(map.y)) < cut) discard;
        float direct = max(dot(normalize(outward), sun), 0.);
        ${LOG_DEPTH.fragmentMain}
        gl_FragColor = vec4(tone(albedoAt(ground), direct), 1.);
      }
    `,
  }));
  scene.add(globe, around, near);
  scene.add(new T.HemisphereLight(0xd4deed, 0x44403b, 0.45));
  const sun = new T.DirectionalLight(0xfff4e0, 2.8);
  sun.position.set(...data.sun).multiplyScalar(10000);
  scene.add(sun);
  const rim = new T.DirectionalLight(0x97bcdf, .7);
  rim.position.set(-2000, 1500, 2000);
  scene.add(rim);
  const starPositions = new Float32Array(1400 * 3);
  for (let index = 0; index < 1400; index++) {
    const azimuth = index * 2.399963;
    const height = 1 - 2 * (index + .5) / 1400;
    const radius = Math.sqrt(1 - height * height) * 22000;
    starPositions.set([Math.cos(azimuth) * radius, height * 22000, Math.sin(azimuth) * radius], index * 3);
  }
  const stars = new T.BufferGeometry();
  stars.setAttribute('position', new T.BufferAttribute(starPositions, 3));
  scene.add(new T.Points(stars, new T.PointsMaterial({ color: 0xb9c9df, size: 1.2, transparent: true, opacity: .5 })));
  const home = new T.Mesh(new T.SphereGeometry(180, 128, 80), new T.ShaderMaterial({
    uniforms: { day: { value: earthMap }, sun: { value: new T.Vector3(...data.sun) } },
    vertexShader: `
      ${LOG_DEPTH.vertex}
      varying vec2 place;
      varying vec3 outward;
      varying vec3 eye;
      void main() {
        place = uv;
        outward = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.);
        eye = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
        ${LOG_DEPTH.vertexMain}
      }
    `,
    fragmentShader: `
      uniform sampler2D day;
      uniform vec3 sun;
      varying vec2 place;
      varying vec3 outward;
      varying vec3 eye;
      ${LOG_DEPTH.fragment}
      void main() {
        vec3 normal = normalize(outward);
        float diffuse = max(dot(normal, sun), 0.);
        float rim = pow(1. - max(dot(normal, normalize(eye)), 0.), 4.);
        vec3 albedo = texture2D(day, place).rgb;
        // Keep the Blue Marble texture in the dim limb instead of painting an opaque blue night side.
        vec3 tone = albedo * (.025 + diffuse * 1.25)
          + vec3(.12, .32, .65) * rim * smoothstep(-.1, .2, dot(normal, sun)) * .22;
        ${LOG_DEPTH.fragmentMain}
        gl_FragColor = vec4(pow(tone, vec3(1. / 2.2)), 1.);
      }
    `,
  }));
  home.rotation.set(.2, .8, -.1);
  scene.add(home);
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const groundAt = (across, back) => {
    ray.ray.origin.set(across, 20000, back);
    return ray.intersectObject(near, false)[0] ?? ray.intersectObject(around, false)[0] ?? ray.intersectObject(globe, false)[0];
  };
  const gridHeight = (grid, across, back) => {
    const { samples, widthKm, vertical } = grid;
    const col = (across / widthKm + .5) * (samples - 1);
    const row = (back / widthKm + .5) * (samples - 1);
    if (col < 0 || row < 0 || col > samples - 1 || row > samples - 1) return null;
    const c0 = Math.min(Math.floor(col), samples - 2), r0 = Math.min(Math.floor(row), samples - 2);
    const fc = col - c0, fr = row - r0, i = r0 * samples + c0;
    const value = (vertical[i] * (1 - fc) + vertical[i + 1] * fc) * (1 - fr)
      + (vertical[i + samples] * (1 - fc) + vertical[i + samples + 1] * fc) * fr;
    return Number.isNaN(value) ? null : value;
  };
  const fastHeight = (across, back) => {
    let height = gridHeight(data.near, across, back);
    if (height != null) return height;
    height = gridHeight(data.far, across, back);
    if (height != null) return height;
    const range = Math.hypot(across, back);
    return -range * range / (2 * radiusKm);
  };
  return { scene, near, groundAt, heightAt: fastHeight, regional: data.regional, earth: home };
}
