// A pin art toy rendered with three.js.
// Every pin is one instance. Its height is a damped spring that follows a target field,
// so pictures can be pressed in, released and swapped like on the real toy.

import * as THREE from 'three';

const SQ3 = Math.sqrt(3);

// A small photo studio for the reflections: gradient sweep, two soft boxes and a fill card.
function studioScene() {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0.95, 0.97, 0.96) },
        mid: { value: new THREE.Color(0.55, 0.58, 0.57) },
        bot: { value: new THREE.Color(0.3, 0.32, 0.31) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.7)) : mix(mid, bot, pow(-y, 0.6)); gl_FragColor = vec4(c, 1.0); }',
    }));
  scene.add(sky);
  const box = (w, h, intensity, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setScalar(intensity);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(14, 9, 6.0, [-12, 14, 18]);   // key soft box, upper left
  box(5, 18, 2.4, [22, 2, 10]);     // strip light, right
  box(34, 22, 1.6, [0, -4, 30]);    // big fill card behind the camera
  box(26, 6, 1.4, [0, -18, 14]);    // floor bounce
  return scene;
}

function pinGeometry(p, reach, radial) {
  const rh = 0.47 * p;   // head radius
  const hh = 0.30 * p;   // head height
  const rs = 0.15 * p;   // shaft radius
  const profile = [
    [0.0001, hh], [rh * 0.6, hh * 0.86], [rh * 0.94, hh * 0.42],
    [rh, 0], [rs, -0.08 * p], [rs, -reach],
  ].reverse().map(([x, y]) => new THREE.Vector2(x, y)); // bottom to top keeps the normals pointing out
  const g = new THREE.LatheGeometry(profile, radial);
  g.rotateX(Math.PI / 2); // the lathe axis becomes Z, so heads point at the camera
  return g;
}

function roundedRect(x, y, w, h, r, hole = false) {
  const s = hole ? new THREE.Path() : new THREE.Shape();
  if (!hole) {
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  } else {
    s.moveTo(x + r, y);
    s.quadraticCurveTo(x, y, x, y + r);
    s.lineTo(x, y + h - r); s.quadraticCurveTo(x, y + h, x + r, y + h);
    s.lineTo(x + w - r, y + h); s.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    s.lineTo(x + w, y + r); s.quadraticCurveTo(x + w, y, x + w - r, y);
    s.lineTo(x + r, y);
  }
  return s;
}

export class PinBoard {
  constructor(view, { cols = 96, aspect = 1, relief = 0.24, radial = 8, frame = true, shadows = false }) {
    this.cols = cols;
    this.aspect = aspect;
    this.relief = relief;
    const p = 1 / cols;
    this.p = p;
    const rowH = p * SQ3 / 2;
    const rows = Math.max(2, Math.round((aspect - p) / rowH) + 1);
    this.rows = rows;
    const extH = (rows - 1) * rowH + p;
    this.extH = extH;

    // pin centres, uv and the six neighbours of every pin on a hex grid
    const xs = [], ys = [], us = [], vs = [], index = [];
    const h = (rows - 1) * rowH;
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      const n = odd ? cols - 1 : cols;
      index.push([]);
      for (let c = 0; c < n; c++) {
        const x = -0.5 + p / 2 + c * p + (odd ? p / 2 : 0);
        const y = -h / 2 + r * rowH;
        index[r].push(xs.length);
        xs.push(x); ys.push(y);
        us.push(x + 0.5); vs.push((y + extH / 2) / extH);
      }
    }
    const N = xs.length;
    this.N = N;
    this.index = index;
    this.x = Float32Array.from(xs); this.y = Float32Array.from(ys);
    this.u = Float32Array.from(us); this.v = Float32Array.from(vs);
    const nb = new Int32Array(N * 6).fill(-1);
    for (let r = 0; r < rows; r++) {
      const odd = r % 2 === 1;
      for (let c = 0; c < index[r].length; c++) {
        const i = index[r][c];
        const cand = [[r, c - 1], [r, c + 1]];
        const d = odd ? [0, 1] : [-1, 0];
        for (const rr of [r - 1, r + 1]) for (const dc of d) cand.push([rr, c + dc]);
        let k = 0;
        for (const [rr, cc] of cand) {
          if (rr < 0 || rr >= rows || cc < 0 || cc >= index[rr].length) continue;
          nb[i * 6 + k++] = index[rr][cc];
        }
      }
    }
    this.nb = nb;

    this.height = new Float32Array(N);
    this.vel = new Float32Array(N);
    this.target = new Float32Array(N);
    this.next = new Float32Array(N);
    this.release = new Float32Array(N);
    this.tint = new Float32Array(N).fill(0.9);
    this.tintTarget = new Float32Array(N).fill(0.9);
    this.dent = new Float32Array(N);
    this.ripples = [];
    this.time = 0;
    this.awake = 1;

    const geo = pinGeometry(p, relief + 0.06, radial);
    const mesh = new THREE.InstancedMesh(geo, view.pinMaterial, N);
    mesh.frustumCulled = false;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { m.makeTranslation(this.x[i], this.y[i], 0); mesh.setMatrixAt(i, m); }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(0.9), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh = mesh;

    this.group = new THREE.Group();
    this.group.add(mesh);

    const m0 = 0.012, fw = frame ? 0.034 : 0;
    this.outerW = 1 + 2 * (m0 + fw);
    this.outerH = extH + 2 * (m0 + fw);
    // the plate reaches halfway under the frame so its square corners stay hidden
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1 + 2 * m0 + fw, extH + 2 * m0 + fw), view.plateMaterial);
    plate.position.z = -0.012 * p;
    plate.receiveShadow = shadows;
    this.group.add(plate);
    this.plate = plate;

    if (frame) {
      const H2 = extH / 2;
      const shape = roundedRect(-0.5 - m0 - fw, -H2 - m0 - fw, 1 + 2 * (m0 + fw), extH + 2 * (m0 + fw), 0.03);
      shape.holes.push(roundedRect(-0.5 - m0, -H2 - m0, 1 + 2 * m0, extH + 2 * m0, 0.012, true));
      const fg = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 3, curveSegments: 10 });
      fg.translate(0, 0, -0.045);
      const fr = new THREE.Mesh(fg, view.frameMaterial);
      fr.castShadow = shadows;
      fr.receiveShadow = shadows;
      this.group.add(fr);
    }
  }

  // New target field. fn(u, v, i) returns [height 0..1, tint 0..1].
  // sweep {u, v, speed, delay, jitter} releases the pins in a wave from a point.
  setField(fn, sweep) {
    const { N, u, v } = this;
    const t0 = this.time;
    for (let i = 0; i < N; i++) {
      const [hgt, tn] = fn(u[i], v[i], i);
      this.next[i] = hgt * this.relief;
      this.tintTarget[i] = tn;
      if (sweep) {
        const d = Math.hypot(u[i] - sweep.u, (v[i] - sweep.v) * this.aspect);
        this.release[i] = t0 + (sweep.delay || 0) + d / (sweep.speed || 1) + Math.random() * (sweep.jitter ?? 0.06);
      } else {
        this.release[i] = t0;
      }
    }
    this.awake = 5;
  }

  // jump straight to the targets (reduced motion, first paint)
  settle() {
    for (let i = 0; i < this.N; i++) {
      this.target[i] = this.next[i]; this.height[i] = this.next[i]; this.vel[i] = 0;
      this.tint[i] = this.tintTarget[i]; this.release[i] = this.time;
    }
    this.upload();
    this.awake = 0.1;
  }

  // Floyd-Steinberg on the hex grid: values in 0..1 become booleans
  dither(values) {
    const out = new Uint8Array(this.N);
    const err = Float32Array.from(values);
    const idx = this.index;
    for (let r = 0; r < idx.length; r++) {
      const row = idx[r], odd = r % 2 === 1;
      for (let c = 0; c < row.length; c++) {
        const i = row[c];
        const nv = err[i] > 0.5 ? 1 : 0;
        out[i] = nv;
        const e = err[i] - nv;
        if (c + 1 < row.length) err[row[c + 1]] += e * 7 / 16;
        const nr = idx[r + 1];
        if (!nr) continue;
        const a = odd ? c : c - 1, b = odd ? c + 1 : c;
        if (a >= 0 && a < nr.length) err[nr[a]] += e * 5 / 16;
        if (b >= 0 && b < nr.length) err[nr[b]] += e * 4 / 16;
      }
    }
    return out;
  }

  press(cu, cv, radius, depth) {
    const { N, u, v } = this;
    const r2 = radius * radius;
    for (let i = 0; i < N; i++) {
      const du = u[i] - cu, dv = (v[i] - cv) * this.aspect;
      const d2 = du * du + dv * dv;
      if (d2 >= r2) continue;
      const f = 1 - d2 / r2;
      const w = f * f * depth;
      if (w > this.dent[i]) this.dent[i] = w;
    }
    this.awake = Math.max(this.awake, 3);
  }

  ripple(cu, cv, amp = 0.05) {
    this.ripples.push({ u: cu, v: cv, t: this.time, amp });
    this.awake = Math.max(this.awake, 4);
  }

  step(dt) {
    if (this.awake <= 0) return false;
    this.time += dt;
    this.awake -= dt;
    const { N, height, vel, target, next, release, dent, tint, tintTarget, relief } = this;
    const k = 140, c = 2 * Math.sqrt(k) * 0.72;
    const heal = Math.exp(-dt / 0.55);
    const tn = 1 - Math.exp(-dt / 0.22);
    const rip = this.ripples;
    for (let r = rip.length - 1; r >= 0; r--) if (this.time - rip[r].t > 2.2) rip.splice(r, 1);
    let moving = 0;
    for (let i = 0; i < N; i++) {
      if (this.time >= release[i]) target[i] = next[i];
      // a press pushes pins forward from behind, like a hand under the toy
      let T = Math.min(relief * 1.15, target[i] + dent[i] * relief * 0.6);
      if (rip.length) {
        for (const R of rip) {
          const age = this.time - R.t;
          const d = Math.hypot(this.u[i] - R.u, (this.v[i] - R.v) * this.aspect);
          const x = (d - age * 0.75) / 0.045;
          if (x > -4 && x < 4) T += R.amp * relief * Math.exp(-x * x) * Math.exp(-age * 1.8) * Math.cos(x * 1.4);
          if (T < 0) T = 0;
        }
      }
      const a = k * (T - height[i]) - c * vel[i];
      vel[i] += a * dt;
      height[i] += vel[i] * dt;
      if (dent[i] > 1e-4) dent[i] *= heal; else dent[i] = 0;
      tint[i] += (tintTarget[i] - tint[i]) * tn;
      if (Math.abs(vel[i]) > 2e-4 || Math.abs(T - height[i]) > 2e-4 || this.time < release[i]) moving++;
    }
    if (moving > 0 || rip.length) this.awake = Math.max(this.awake, 0.4);
    this.upload();
    return true;
  }

  upload() {
    const { N, height, nb, tint, p } = this;
    const mArr = this.mesh.instanceMatrix.array;
    const cArr = this.mesh.instanceColor.array;
    const occK = 1.08 / p;
    for (let i = 0; i < N; i++) {
      mArr[i * 16 + 14] = height[i];
      // a pin sitting below its neighbours gets less light
      let s = 0, n = 0;
      for (let k = 0; k < 6; k++) { const j = nb[i * 6 + k]; if (j >= 0) { s += height[j]; n++; } }
      const cav = n ? Math.max(0, s / n - height[i]) : 0;
      const occ = Math.max(0.42, 1 - cav * occK);
      const t = tint[i] * occ;
      cArr[i * 3] = t; cArr[i * 3 + 1] = t * 1.003; cArr[i * 3 + 2] = t * 1.006;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

// One canvas, one board. The canvas is a little larger than the board so a tilt never clips it.
export class PinView {
  constructor(canvas, { cols = 96, aspect = 1, relief = 0.24, radial = 8, frame = true, shadows = true, theme = 'light', maxDpr = 2, fill = 0.8 } = {}) {
    this.canvas = canvas;
    this.fill = fill;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.maxDpr = maxDpr;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studioScene(), 0.02).texture;
    pmrem.dispose();
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);

    this.pinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.32, envMapIntensity: 1.05 });
    this.plateMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2422, metalness: 0.2, roughness: 0.85 });
    this.frameMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c0be, metalness: 0.8, roughness: 0.32 });

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-0.55, 0.85, 1.4);
    key.castShadow = shadows;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.01;
    const sc = key.shadow.camera;
    sc.left = -0.8; sc.right = 0.8; sc.top = 0.8; sc.bottom = -0.8; sc.near = 0.1; sc.far = 4;
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight(0xf3f6f5, 0x2a302e, 0.35));
    this.key = key;

    this.board = new PinBoard(this, { cols, aspect, relief, radial, frame, shadows });
    scene.add(this.board.group);

    this.tilt = { x: 0, y: 0, tx: 0, ty: 0, bx: 0.06, by: -0.2 };
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane();
    this.dirty = true;
    this.setTheme(theme);
    this.resize();
  }

  setTheme(theme) {
    const dark = theme === 'dark';
    this.frameMaterial.color.set(dark ? 0x2b3431 : 0xb9c0be);
    this.frameMaterial.metalness = dark ? 0.55 : 0.8;
    this.frameMaterial.roughness = dark ? 0.42 : 0.32;
    this.plateMaterial.color.set(dark ? 0x0d1210 : 0x1d2422);
    this.renderer.toneMappingExposure = dark ? 0.92 : 1.0;
    this.dirty = true;
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // fit the board (with frame) into `fill` of the canvas
    const b = this.board;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const needH = b.outerH / this.fill;
    const needW = b.outerW / this.fill;
    const distH = (needH / 2) / Math.tan(vfov / 2);
    const distW = (needW / 2) / (Math.tan(vfov / 2) * cam.aspect);
    cam.position.set(0, 0, Math.max(distH, distW));
    cam.near = cam.position.z * 0.5; cam.far = cam.position.z * 2;
    cam.updateProjectionMatrix();
    this.dirty = true;
  }

  setDpr(d) { this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, d)); this.w = 0; this.resize(); }

  // pointer position in board uv (0..1), or null when off the board
  uvAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const g = this.board.group;
    g.updateMatrixWorld();
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    this.plane.setFromNormalAndCoplanarPoint(n, g.position);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null;
    g.worldToLocal(hit);
    const u = hit.x + 0.5, v = (hit.y + this.board.extH / 2) / this.board.extH;
    if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) return null;
    return { u, v };
  }

  look(nx, ny) { this.tilt.tx = nx; this.tilt.ty = ny; this.dirty = true; }

  update(dt) {
    const t = this.tilt;
    const a = 1 - Math.exp(-dt / 0.35);
    const px = t.x, py = t.y;
    t.x += (t.tx - t.x) * a; t.y += (t.ty - t.y) * a;
    const tiltMoved = Math.abs(t.x - px) + Math.abs(t.y - py) > 1e-5;
    const g = this.board.group;
    g.rotation.set(t.bx - t.y * 0.1, t.by + t.x * 0.16, 0);
    const stepped = this.board.step(dt);
    if (stepped || tiltMoved) this.dirty = true;
    return this.dirty;
  }

  render() { this.renderer.render(this.scene, this.camera); this.dirty = false; }
}

export async function loadImageData(url, size) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = size || img.naturalWidth; c.height = size || img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, c.width, c.height);
  return x.getImageData(0, 0, c.width, c.height);
}

// bilinear sampling of ImageData in uv space (u right, v up), channel 0..3, result 0..1
export function sampler(img) {
  const { width: W, height: H, data } = img;
  return (u, v, ch) => {
    const x = Math.min(Math.max(u * (W - 1), 0), W - 1);
    const y = Math.min(Math.max((1 - v) * (H - 1), 0), H - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, W - 1), y1 = Math.min(y0 + 1, H - 1);
    const fx = x - x0, fy = y - y0;
    const a = data[(y0 * W + x0) * 4 + ch], b = data[(y0 * W + x1) * 4 + ch];
    const c = data[(y1 * W + x0) * 4 + ch], d = data[(y1 * W + x1) * 4 + ch];
    return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy) / 255;
  };
}
