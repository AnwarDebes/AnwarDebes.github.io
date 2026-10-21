// The Pixie film and the little playground under it.
import { Mascot } from './pixie-mascot.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection && navigator.connection.saveData;

// ---- film: plays muted while on screen, with a button to start over with sound
const video = document.getElementById('pixie-video');
const sound = document.querySelector('.film-sound');
if (video && sound) {
  let withSound = false;
  const showSound = (on) => { sound.hidden = !on || withSound; };
  if (!reduce.matches && !saveData && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (withSound) { if (!e.isIntersecting) video.pause(); return; }
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        video.muted = true;
        video.loop = true;
        video.play().then(() => showSound(true)).catch(() => {});
      } else if (!video.paused) video.pause();
    }, { threshold: [0, 0.5] }).observe(video);
  }
  sound.addEventListener('click', () => {
    withSound = true;
    video.loop = false;
    video.muted = false;
    video.currentTime = 0;
    video.play().catch(() => {});
    showSound(false);
  });
  video.addEventListener('volumechange', () => { if (!video.muted) { withSound = true; showSound(false); } });
}

// ---- playground: the real mascot, driven by the buttons
const canvas = document.getElementById('pixie-play');
const label = document.getElementById('pixie-state');
if (canvas && label) {
  const pixie = new Mascot(canvas, { onLabel: (l) => { label.textContent = l; } });
  const buttons = [...document.querySelectorAll('.pg-buttons button')];
  buttons.forEach((b) => b.addEventListener('click', () => {
    pixie.setActivity(b.dataset.state);
    buttons.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));
  // only animate while it is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const was = pixie.running;
      pixie.running = e.isIntersecting && !document.hidden;
      if (pixie.running && !was) requestAnimationFrame((t) => pixie._loop(t));
    }).observe(canvas);
  }
}
