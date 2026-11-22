const topbar = document.querySelector('.topbar');
const navigation = [...document.querySelectorAll('.nav a[href^="#"]')];
const sections = navigation.map(link => document.querySelector(link.hash)).filter(Boolean);

function updateNavigation() {
  topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  const threshold = Math.min(window.innerHeight * 0.35, 280);
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

const revealed = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealed.forEach((element, index) => {
    if (element.closest('.hero')) element.style.transitionDelay = `${index * 70}ms`;
    observer.observe(element);
  });
} else {
  revealed.forEach(element => element.classList.add('is-in'));
}
