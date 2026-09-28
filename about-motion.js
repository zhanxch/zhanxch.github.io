(() => {
  'use strict';
  const surface = document.querySelector('.futures');
  if (!surface) return;
  const stage = surface.querySelector('.futures-stage');
  const canvas = surface.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const buttons = [...surface.querySelectorAll('.future-choice')];
  const pause = surface.querySelector('.futures-pause');
  const status = surface.querySelector('.futures-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const hint = surface.querySelector('.futures-hint');
  const pointer = { active: false, x: 0, y: 0 };
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let width = 0, height = 0, time = 0, last = 0, frame = 0;
  let visible = false, paused = false, active = -1, focus = -1;
  let generation = 0, transition = null;
  let paths = [], history = Array.from({ length: 41 }, (_, i) => .51 + Math.sin(i * .12) * .07);
  let previous = history.slice(), deflection = 0;
  const moving = () => visible && !document.hidden && !paused && !reduced.matches;

  function buildPaths() {
    const progress = transition ? ease(clamp(transition.elapsed / 1.65, 0, 1)) : 0;
    const originY = transition ? mix(previous[40], history[40], progress) : history[40];
    paths = Array.from({ length: 5 }, (_, branch) => {
      const endpoint = .14 + branch * .18 + Math.sin(generation * 1.31 + branch * .9) * .025;
      return Array.from({ length: 65 }, (_, j) => {
        const t = j / 64;
        const flutter = Math.sin(t * 4.3 + time * .26 + branch * .83 + generation * .7) * .025;
        const y = mix(originY, endpoint, ease(t)) + Math.sin(t * Math.PI) * (flutter + deflection * .065);
        return { x: width * mix(.38, .89, t), y: y * height };
      });
    });
    buttons.forEach((button, i) => {
      button.style.left = `${paths[i][64].x}px`;
      button.style.top = `${paths[i][64].y}px`;
    });
  }

  function stroke(points, color, lineWidth = 1, end = points.length, offset = 0) {
    ctx.beginPath();
    for (let i = 0; i < end; i++) {
      const p = points[i];
      const y = p.y + Math.sin(i / (points.length - 1) * Math.PI) * offset;
      if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
    }
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function dot(x, y, radius, color) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    buildPaths();
    const p = transition ? ease(clamp(transition.elapsed / 1.65, 0, 1)) : 1;
    // A quiet horizon separates experience from its possible continuations.
    ctx.setLineDash([1, 6]);
    ctx.strokeStyle = 'rgba(94,76,67,.18)'; ctx.lineWidth = .65;
    ctx.beginPath(); ctx.moveTo(width * .38, height * .07); ctx.lineTo(width * .38, height * .94); ctx.stroke();
    ctx.setLineDash([]);
    if (transition) {
      const fade = Math.max(0, 1 - transition.elapsed / .9);
      transition.oldPaths.forEach((path, i) => {
        if (i !== transition.choice) stroke(path, `rgba(110,87,77,${fade * .19})`, .7);
      });
      const extent = Math.min(65, Math.ceil(transition.elapsed / .6 * 64) + 1);
      stroke(transition.oldPaths[transition.choice], `rgba(142,52,64,${(1 - p) * .8})`, 1.25, extent);
    }
    const past = history.map((value, i) => ({
      x: width * (.07 + i / 40 * .31),
      y: (transition ? mix(previous[i], value, p) : value) * height
    }));
    stroke(past, 'rgba(56,48,44,.72)', 1.1);
    dot(past[0].x, past[0].y, 1.6, 'rgba(56,48,44,.55)');
    for (const index of [10, 22, 33]) dot(past[index].x, past[index].y, 1.25, 'rgba(56,48,44,.7)');
    const reveal = transition ? clamp((transition.elapsed - .5) / 1.15, 0, 1) : 1;
    paths.forEach((path, i) => {
      const selected = active === i;
      const opacity = reveal * (selected ? .86 : active < 0 ? .27 : .15);
      // Fine neighboring strokes suggest uncertainty without a particle cloud.
      for (const offset of [-4, 4]) stroke(path, `rgba(116,91,78,${reveal * .065})`, .6, 65, offset);
      stroke(path, selected ? `rgba(142,52,64,${opacity})` : `rgba(104,88,77,${opacity})`, selected ? 1.25 : .85);
      const end = path[64];
      ctx.beginPath(); ctx.arc(end.x, end.y, selected ? 3.4 : 2.15, 0, Math.PI * 2);
      ctx.strokeStyle = selected ? `rgba(142,52,64,${reveal * .8})` : `rgba(104,88,77,${reveal * .33})`;
      ctx.lineWidth = .8; ctx.stroke();
      if (!reduced.matches) {
        const travel = (time * .085 + i * .18) % 1;
        const sample = path[Math.floor(travel * 64)];
        dot(sample.x, sample.y, selected ? 1.8 : 1.15, selected ? `rgba(142,52,64,${reveal * .8})` : `rgba(104,88,77,${reveal * .3})`);
      }
    });
    const now = past[40];
    dot(now.x, now.y, 7, 'rgba(142,52,64,.07)');
    dot(now.x, now.y, 2.5, '#8e3440');
    ctx.font = '9px "DM Sans", sans-serif'; ctx.fillStyle = '#8b8078';
    ctx.textAlign = 'left'; ctx.fillText('EXPERIENCE', width * .07, height - 3);
    ctx.textAlign = 'center'; ctx.fillStyle = '#8e3440'; ctx.fillText('NOW', width * .38, height - 3);
    ctx.textAlign = 'right'; ctx.fillStyle = '#8b8078'; ctx.fillText('POSSIBILITY', width * .9, height - 3);
  }
  function nearest(x, y) {
    let winner = -1, distance = Infinity;
    paths.forEach((path, i) => {
      for (let j = 12; j < path.length; j += 2) {
        const d = Math.hypot(path[j].x - x, path[j].y - y);
        if (d < distance) { distance = d; winner = i; }
      }
    });
    return distance < Math.max(48, width * .12) ? winner : -1;
  }
  function choose(choice) {
    if (choice < 0 || transition || paused) return;
    const selected = paths[choice];
    previous = history.slice();
    // Retain recent experience and add the chosen continuation to the ink trail.
    history = Array.from({ length: 41 }, (_, i) => i < 17
      ? previous[Math.round(23 + i / 16 * 17)]
      : selected[Math.round((i - 16) / 24 * 64)].y / height);
    const shift = .5 - history[40];
    history = history.map((value, i) => clamp(value + shift * (i / 40), .17, .83));
    generation++;
    transition = reduced.matches ? null : { choice, elapsed: 0, oldPaths: paths.map(path => path.map(point => ({ ...point }))) };
    active = -1; pointer.active = false; deflection = 0;
    status.textContent = `Path ${choice + 1} followed. Five new possibilities are ready. Choice ${generation}.`;
    surface.dataset.choices = String(generation);
    draw();
  }
  function animate(timestamp) {
    frame = 0;
    if (!moving()) return;
    const dt = last ? Math.min((timestamp - last) / 1000, .05) : 1 / 60;
    last = timestamp; time += dt;
    deflection += ((pointer.active ? (pointer.y / height - .5) * 2 : 0) - deflection) * (1 - Math.exp(-dt * 4));
    if (transition) { transition.elapsed += dt; if (transition.elapsed >= 1.65) transition = null; }
    active = transition ? -1 : focus >= 0 ? focus : pointer.active ? nearest(pointer.x, pointer.y) : -1;
    stage.classList.toggle('can-choose', active >= 0 && !paused);
    draw(); frame = requestAnimationFrame(animate);
  }
  function activity() {
    pause.hidden = reduced.matches;
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
    pause.querySelector('.pause-label').textContent = paused ? 'Play' : 'Pause';
    surface.classList.toggle('is-paused', paused);
    for (const button of buttons) button.disabled = paused;
    if (moving()) {
      if (!frame) { last = 0; frame = requestAnimationFrame(animate); }
    } else { cancelAnimationFrame(frame); frame = 0; pointer.active = false; }
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    transition = null; draw(); activity();
  }
  function location(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  stage.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    Object.assign(pointer, location(event), { active: true });
    if (reduced.matches) { active = nearest(pointer.x, pointer.y); draw(); }
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    pointer.active = false;
    if (reduced.matches) { active = focus; draw(); }
  });
  stage.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const point = location(event); choose(nearest(point.x, point.y));
  });
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => choose(index));
    button.addEventListener('focus', () => { focus = active = index; if (!paused) draw(); });
    button.addEventListener('blur', () => { focus = -1; if (reduced.matches) { active = -1; draw(); } });
    button.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
        buttons[(index + step + 5) % 5].focus();
      }
    });
  });
  pause.addEventListener('click', () => { paused = !paused; activity(); });
  document.addEventListener('visibilitychange', activity);
  window.addEventListener('blur', () => { pointer.active = false; });
  reduced.addEventListener('change', () => {
    if (reduced.matches) paused = false;
    transition = null; deflection = 0; active = -1; draw(); activity();
  });
  function updateHint() { hint.textContent = coarse.matches ? 'Tap a path to follow it.' : 'Explore a path. Click to follow.'; }
  coarse.addEventListener('change', updateHint); updateHint();
  surface.classList.add('is-ready');
  surface.querySelector('.future-choices').hidden = hint.hidden = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; activity(); }).observe(surface);
  else visible = true;
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  document.fonts.ready.then(draw);
})();
