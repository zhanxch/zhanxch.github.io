(() => {
  'use strict';
  const surface = document.querySelector('.emergence');
  if (!surface) return;
  const scene = surface.querySelector('.sprout-scene');
  const replay = surface.querySelector('.sprout-replay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let started = false;
  let replayFrame = 0;

  function motionState() {
    surface.style.animationPlayState = visible && !document.hidden ? 'running' : 'paused';
    for (const part of surface.querySelectorAll('svg [class]')) {
      part.style.animationPlayState = visible && !document.hidden ? 'running' : 'paused';
    }
  }
  function grow() {
    if (reduced.matches) return;
    started = true;
    surface.style.setProperty('--lean', '0deg');
    surface.classList.remove('is-growing');
    // Restart the one-shot SVG animation without timers or a perpetual drawing loop.
    void surface.offsetWidth;
    cancelAnimationFrame(replayFrame);
    replayFrame = requestAnimationFrame(() => {
      replayFrame = 0;
      surface.classList.add('is-growing');
      motionState();
    });
  }
  function preferenceChanged() {
    replay.hidden = reduced.matches;
    if (reduced.matches) {
      cancelAnimationFrame(replayFrame);
      replayFrame = 0;
      surface.classList.remove('is-growing');
      surface.style.setProperty('--lean', '0deg');
    } else if (visible && !started) grow();
    motionState();
  }
  replay.addEventListener('click', grow);
  scene.addEventListener('pointermove', event => {
    if (reduced.matches || event.pointerType === 'touch') return;
    const rect = scene.getBoundingClientRect();
    const lean = (event.clientX - rect.left - rect.width / 2) / rect.width * 5;
    surface.style.setProperty('--lean', `${Math.max(-2.5, Math.min(2.5, lean))}deg`);
  }, { passive: true });
  scene.addEventListener('pointerleave', () => surface.style.setProperty('--lean', '0deg'));
  document.addEventListener('visibilitychange', motionState);
  reduced.addEventListener('change', preferenceChanged);
  if (!reduced.matches) {
    surface.classList.add('is-growing');
    started = true;
    motionState();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !started) grow();
      motionState();
    }).observe(surface);
  } else { visible = true; grow(); }
  preferenceChanged();
})();
