/* An original, deterministic terrain: the same points also form the SVG fallback. */
function createMountainField() {
  const points = [];
  let seed = 271828;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    let u = x - ix, v = y - iy;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const peaks = [
    [-.2, .75, 1.12, 2.2, 3.2], [.36, .58, 1.49, 2.25, 3.4],
    [-.61, .45, .91, 2.9, 3.3], [.77, .81, .76, 3.3, 3.2],
    [.02, .13, .63, 2.4, 3.6], [.67, .17, .52, 3, 3.6]
  ];
  const height = (x, z) => {
    let h = .02;
    for (const [px, pz, ph, sx, sz] of peaks) {
      const dx = (x - px) * sx, dz = (z - pz) * sz;
      h = Math.max(h, ph - Math.sqrt(dx * dx + dz * dz));
    }
    const texture = (noise(x * 9 + 11, z * 9) - .5) * .19
      + (noise(x * 24 + 30, z * 25) - .5) * .085
      + (noise(x * 58 + 50, z * 60) - .5) * .028;
    return Math.max(.005, h + texture * Math.min(1, h * 3));
  };
  // A front-to-back depth envelope hides the far side of every ridge.
  const horizon = new Float32Array(1400).fill(Infinity);
  for (let row = 0; row < 133; row++) {
    const z = row / 132;
    for (let col = 0; col < 240; col++) {
      const x = -1.12 + col / 239 * 2.24;
      const wx = x + (random() - .5) * .008, wz = z + (random() - .5) * .005;
      const h = height(wx, wz);
      const sx = 325 + wx * 261 + (wz - .5) * 65;
      const sy = 274 - wz * 110 - h * 118;
      const bin = Math.round(sx * 2);
      if (bin < 1 || bin >= horizon.length - 1) continue;
      if (sy > horizon[bin] + 1.8) continue;
      horizon[bin - 1] = Math.min(horizon[bin - 1], sy);
      horizon[bin] = Math.min(horizon[bin], sy);
      horizon[bin + 1] = Math.min(horizon[bin + 1], sy);
      const edge = Math.min(1, Math.max(0, (1.09 - Math.abs(wx)) * 8));
      const mist = Math.min(1, Math.max(0, (280 - sy) / 65));
      const elevation = Math.min(1, h * 5);
      if (random() > (.42 + elevation * .52) * edge * mist) continue;
      const slope = (height(wx + .006, wz) - height(wx - .006, wz)) / .012;
      const shade = Math.max(.15, Math.min(1, .49 - slope * .22));
      const alpha = (.15 + shade * .49) * (.76 + wz * .2) * mist * edge * (.34 + elevation * .66);
      points.push({ x: +sx.toFixed(2), y: +sy.toFixed(2), r: +(.38 + random() * .37).toFixed(2), a: +alpha.toFixed(2) });
    }
  }
  return points;
}

(() => {
  const scene = document.querySelector('.mountain-scene');
  if (!scene) return;
  const canvas = scene.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const button = document.querySelector('.mountain-breeze');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const field = createMountainField().map(p => ({ ...p, dx: 0, dy: 0, vx: 0, vy: 0 }));
  const pointer = { x: -1000, y: -1000, active: false };
  const width = 670, height = 300;
  let visible = false, frame = 0, previous = 0, wind = null, scale = 1;

  function draw() {
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#474841';
    for (const p of field) {
      context.globalAlpha = p.a;
      context.beginPath();
      context.arc(p.x + p.dx, p.y + p.dy, p.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function fit() {
    const rect = scene.getBoundingClientRect();
    if (!rect.width) return;
    const pixels = Math.round(rect.width * Math.min(devicePixelRatio || 1, 2));
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = Math.round(pixels * height / width);
      scale = pixels / width;
    }
    draw();
  }

  function wake() {
    if (!frame && visible && !document.hidden && !reduced.matches) {
      previous = 0;
      frame = requestAnimationFrame(update);
    }
  }

  function update(time) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const dt = previous ? Math.min((time - previous) / 16.667, 2) : 1;
    previous = time;
    let moving = false;
    if (wind) {
      wind.t += dt * 16.667;
      if (wind.t > 1550) wind = null;
    }
    for (const p of field) {
      let fx = 0, fy = 0;
      if (pointer.active) {
        const px = p.x - pointer.x, py = p.y - pointer.y;
        const distance = Math.hypot(px, py), radius = 65;
        if (distance < radius) {
          const strength = Math.pow(1 - distance / radius, 2) * 1.3;
          fx += px / Math.max(distance, 1) * strength + strength * .35;
          fy += py / Math.max(distance, 1) * strength - strength * .45;
        }
      }
      if (wind) {
        const front = -70 + wind.t * .54;
        const strength = Math.max(0, 1 - Math.abs(p.x - front) / 78);
        fx += strength * .9;
        fy -= strength * (.55 + Math.sin(p.x * .027 + p.y * .036) * .25);
      }
      p.vx = (p.vx + (fx - p.dx * .029) * dt) * Math.pow(.84, dt);
      p.vy = (p.vy + (fy - p.dy * .029) * dt) * Math.pow(.84, dt);
      p.dx += p.vx * dt; p.dy += p.vy * dt;
      if (Math.abs(p.dx) + Math.abs(p.dy) + Math.abs(p.vx) + Math.abs(p.vy) < .025 && !fx && !fy) {
        p.dx = p.dy = p.vx = p.vy = 0;
      }
      if (Math.abs(p.vx) + Math.abs(p.vy) > .003 || (!fx && !fy && (p.dx || p.dy))) moving = true;
    }
    draw();
    if (moving || wind) frame = requestAnimationFrame(update);
  }

  function settle() {
    cancelAnimationFrame(frame); frame = 0; wind = null; pointer.active = false;
    field.forEach(p => { p.dx = p.dy = p.vx = p.vy = 0; });
    draw();
  }

  function breeze() {
    if (reduced.matches) return;
    pointer.active = false;
    wind = { t: 0 };
    wake();
  }

  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced.matches) return;
    const rect = scene.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width * width;
    pointer.y = (event.clientY - rect.top) / rect.height * height;
    pointer.active = true;
    wake();
  });
  scene.addEventListener('pointerleave', () => { pointer.active = false; wake(); });
  // A tap is optional; normal touch scrolling is never intercepted.
  let touchStart = null;
  scene.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') touchStart = { x: e.clientX, y: e.clientY };
  });
  scene.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch' && touchStart && Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) < 10) breeze();
    touchStart = null;
  });
  scene.addEventListener('pointercancel', () => { touchStart = null; });
  button.addEventListener('click', breeze);

  new ResizeObserver(fit).observe(scene);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
    else { pointer.active = false; cancelAnimationFrame(frame); frame = 0; }
  }, { threshold: 0 }).observe(scene);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pointer.active = false; cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  function motionPreference() {
    button.hidden = reduced.matches;
    if (reduced.matches) settle();
  }
  reduced.addEventListener('change', motionPreference);
  fit();
  scene.classList.add('is-ready');
  motionPreference();
})();
