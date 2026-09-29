(() => {
  const scene = document.querySelector('.savanna-scene');
  if (!scene) return;
  const grass = [...scene.querySelectorAll('.grass-tuft')];
  const button = document.querySelector('.savanna-breeze');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animations = [], visible = false, greeted = false, lastWind = -Infinity;
  let touchStart = null;

  function clearWind() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function blow(from = .15) {
    if (reduced.matches || !visible || document.hidden) return;
    clearWind();
    lastWind = performance.now();
    animations = grass.map((tuft, index) => {
      const distance = Math.abs(Number(tuft.dataset.x) / 670 - from);
      const lean = 9 + index % 5 * 1.5;
      const animation = tuft.animate([
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: `rotate(${lean}deg)`, offset: .30 },
        { transform: 'rotate(-3deg)', offset: .61 },
        { transform: 'rotate(2deg)', offset: .8 },
        { transform: 'rotate(0deg)', offset: 1 }
      ], { duration: 2450, delay: distance * 450, easing: 'ease-in-out' });
      animation.addEventListener('finish', () => animation.cancel(), { once: true });
      return animation;
    });
  }

  button.addEventListener('click', () => blow());
  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || performance.now() - lastWind < 3000) return;
    const bounds = scene.getBoundingClientRect();
    blow((event.clientX - bounds.left) / bounds.width);
  }, { passive: true });
  scene.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  scene.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch' && touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10) {
      const bounds = scene.getBoundingClientRect();
      blow((event.clientX - bounds.left) / bounds.width);
    }
    touchStart = null;
  });
  scene.addEventListener('pointercancel', () => { touchStart = null; });

  function updateVisibility() {
    if (!visible || document.hidden) animations.forEach(animation => { if (animation.playState === 'running') animation.pause(); });
    else animations.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateVisibility();
    if (visible && !greeted) { greeted = true; blow(); }
  }, { threshold: .15 }).observe(scene);
  document.addEventListener('visibilitychange', updateVisibility);

  function motionPreference() {
    button.hidden = reduced.matches;
    if (reduced.matches) clearWind();
  }
  reduced.addEventListener('change', motionPreference);
  motionPreference();
})();
