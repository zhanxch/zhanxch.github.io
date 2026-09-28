const navigation = [...document.querySelectorAll('.section-nav a')];
const sections = navigation.map(link => document.querySelector(link.hash)).filter(Boolean);
function updateNavigation() {
  const threshold = Math.min(window.innerHeight * 0.32, 250);
  let current = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section;
  if (window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
  for (const link of navigation) {
    if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (!scheduled) { scheduled = true; requestAnimationFrame(() => { updateNavigation(); scheduled = false; }); }
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();
