(() => {
  'use strict';

  const field = document.querySelector('.world-field');
  if (!field) return;
  const canvas = field.querySelector('canvas');
  const pen = canvas.getContext('2d');
  if (!pen) return;
  const pause = field.querySelector('.world-pause');
  const rippleButton = field.querySelector('.world-ripple');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -1000, y: -1000, active: false };
  const tau = Math.PI * 2;
  let points = [], ripples = [];
  let width = 0, height = 0, clock = 0, lastFrame = 0, frame = 0;
  let visible = false, paused = false, ready = false;
  const random = index => {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const canMove = () => ready && visible && !document.hidden && !paused && !preference.matches;

  function prepare() {
    const rect = field.getBoundingClientRect();
    width = field.clientWidth;
    height = field.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    pen.setTransform(scale, 0, 0, scale, 0, 0);

    // Sample the actual typeset heading so the canvas follows text zoom and line layout.
    const mask = document.createElement('canvas');
    mask.width = Math.ceil(width);
    mask.height = Math.ceil(height);
    const ink = mask.getContext('2d', { willReadFrequently: true });
    if (!ink) return;
    ink.fillStyle = '#000';
    for (const line of field.querySelectorAll('.world-title > span')) {
      const style = getComputedStyle(line);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
      const metrics = ink.measureText('Hg');
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      ink.textAlign = 'center';
      // Text can wrap at large accessibility sizes; follow its actual visual rows.
      const node = line.firstChild;
      const range = document.createRange();
      const rows = [];
      for (let i = 0; i < node.length; i++) {
        if (!node.textContent[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const bounds = range.getBoundingClientRect();
        const row = rows[rows.length - 1];
        if (row && Math.abs(row.top - bounds.top) < 2) row.end = i + 1;
        else rows.push({ start: i, end: i + 1, top: bounds.top });
      }
      for (const row of rows) {
        range.setStart(node, row.start);
        range.setEnd(node, row.end);
        const bounds = range.getBoundingClientRect();
        ink.fillText(range.toString(), bounds.left - rect.left + bounds.width / 2,
          bounds.top - rect.top + bounds.height / 2 + (ascent - descent) / 2);
      }
    }
    const pixels = ink.getImageData(0, 0, mask.width, mask.height).data;
    const spacing = width < 400 ? 1.65 : 1.9;
    const next = [];
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        if (pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] < 120) continue;
        const seed = random(next.length);
        next.push({ homeX: x, homeY: y, x, y, vx: 0, vy: 0,
          phase: seed * tau, size: .58 + seed * .25, accent: seed > .94 });
      }
    }
    points = next;
    ripples = [];
    ready = points.length > 0;
    field.classList.toggle('has-particles', ready);
    paint(0);
    manageMotion();
  }

  function drawField() {
    pen.lineWidth = .65;
    // Two quiet orbital traces and a few points; the typography stays dominant.
    const cx = width * .91, cy = height * .38;
    const radius = Math.min(width * .24, 142);
    pen.strokeStyle = 'rgba(142,52,64,.085)';
    for (const angle of [-.63, .72]) {
      pen.beginPath();
      pen.ellipse(cx, cy, radius, radius * .56, angle, 0, tau);
      pen.stroke();
    }
    const orbit = clock * .11;
    const ox = Math.cos(orbit) * radius, oy = Math.sin(orbit) * radius * .56;
    pen.fillStyle = 'rgba(142,52,64,.45)';
    pen.beginPath();
    pen.arc(cx + ox * Math.cos(-.63) - oy * Math.sin(-.63), cy + ox * Math.sin(-.63) + oy * Math.cos(-.63), 1.6, 0, tau);
    pen.fill();
    for (let i = 0; i < 28; i++) {
      const x = 16 + random(i + 100) * (width - 32);
      const y = 28 + random(i + 200) * (height - 56);
      const opacity = .13 + Math.sin(clock * .45 + i) * .04;
      pen.fillStyle = `rgba(142,52,64,${opacity})`;
      pen.fillRect(x + Math.sin(clock * .2 + i) * 3, y, 1.1, 1.1);
    }
  }

  function paint(delta) {
    pen.clearRect(0, 0, width, height);
    drawField();
    const step = Math.min(delta * 60, 1.6);
    for (const wave of ripples) wave.radius += delta * 210;
    ripples = ripples.filter(wave => wave.radius < Math.max(width, height) * 1.15);

    for (const point of points) {
      if (step > 0) {
        const dx = point.x - pointer.x, dy = point.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (pointer.active && distance < 66) {
          const angle = distance > .1 ? Math.atan2(dy, dx) : point.phase;
          const force = (1 - distance / 66) * 1.6 * step;
          point.vx += Math.cos(angle) * force;
          point.vy += Math.sin(angle) * force;
        }
        for (const wave of ripples) {
          const wx = point.homeX - wave.x, wy = point.homeY - wave.y;
          const distanceToWave = Math.hypot(wx, wy);
          const band = Math.abs(distanceToWave - wave.radius);
          if (band < 20) {
            const strength = (1 - band / 20) * .95 * step;
            const angle = Math.atan2(wy, wx);
            point.vx += Math.cos(angle) * strength;
            point.vy += Math.sin(angle) * strength;
          }
        }
        point.vx += (point.homeX - point.x) * .018 * step;
        point.vy += (point.homeY - point.y) * .018 * step;
        const friction = Math.pow(.85, step);
        point.vx *= friction;
        point.vy *= friction;
        point.x += point.vx * step;
        point.y += point.vy * step;
        if (!pointer.active && !ripples.length && Math.abs(point.vx) + Math.abs(point.vy) < .025 &&
            Math.hypot(point.homeX - point.x, point.homeY - point.y) < .1) {
          point.x = point.homeX;
          point.y = point.homeY;
          point.vx = point.vy = 0;
        }
      }
      pen.fillStyle = point.accent ? 'rgba(142,52,64,.8)' : 'rgba(55,47,44,.85)';
      pen.beginPath();
      pen.arc(point.x, point.y, point.size, 0, tau);
      pen.fill();
    }
    for (const wave of ripples) {
      const opacity = Math.max(0, .13 * (1 - wave.radius / Math.max(width, height)));
      pen.strokeStyle = `rgba(142,52,64,${opacity})`;
      pen.lineWidth = .7;
      pen.beginPath();
      pen.arc(wave.x, wave.y, wave.radius, 0, tau);
      pen.stroke();
    }
  }

  function animate(time) {
    frame = 0;
    if (!canMove()) return;
    const delta = lastFrame ? Math.min((time - lastFrame) / 1000, .027) : 1 / 60;
    lastFrame = time;
    clock += delta;
    paint(delta);
    frame = requestAnimationFrame(animate);
  }

  function manageMotion() {
    const reduced = preference.matches;
    pause.hidden = rippleButton.hidden = !ready || reduced;
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
    pause.querySelector('.pause-label').textContent = paused ? 'Play' : 'Pause';
    rippleButton.disabled = paused;
    field.classList.toggle('is-paused', paused);
    if (canMove()) {
      if (!frame) { lastFrame = 0; frame = requestAnimationFrame(animate); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.active = false;
    }
  }

  function position(event) {
    const rect = field.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function ripple(x, y) {
    if (canMove()) ripples.push({ x, y, radius: 0 });
    if (ripples.length > 4) ripples.shift();
  }
  field.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || event.target.closest('button')) {
      pointer.active = false;
      return;
    }
    Object.assign(pointer, position(event), { active: canMove() });
  }, { passive: true });
  field.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const point = position(event);
    ripple(point.x, point.y);
  });
  for (const type of ['pointerleave', 'pointercancel']) {
    field.addEventListener(type, () => { pointer.active = false; });
  }
  window.addEventListener('blur', () => { pointer.active = false; });
  rippleButton.addEventListener('click', () => ripple(width / 2, height * .5));
  pause.addEventListener('click', () => { paused = !paused; manageMotion(); });
  document.addEventListener('visibilitychange', manageMotion);
  preference.addEventListener('change', prepare);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      manageMotion();
    }).observe(field);
  } else visible = true;
  document.fonts.ready.then(() => {
    prepare();
    if ('ResizeObserver' in window) new ResizeObserver(prepare).observe(field);
    else window.addEventListener('resize', prepare);
  });
})();
