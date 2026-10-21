// The short film: it plays muted when it scrolls into view, with sound on request,
// and the transcript under it lights up word by word as the narration speaks.
const video = document.getElementById('reel-video');
const sound = document.getElementById('reel-sound');
const box = document.getElementById('reel-transcript');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

async function transcript() {
  const data = await (await fetch('assets/data/reel.json')).json();
  const words = [];
  const frag = document.createDocumentFragment();
  const chapters = data.chapters.slice();
  let para = null;
  for (const u of data.utts) {
    const first = u.words[0][1];
    // a new paragraph at each chapter
    while (chapters.length && first >= chapters[0].t - 0.6) {
      const ch = chapters.shift();
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'reel-chap';
      head.innerHTML = `<span class="reel-time">${fmt(ch.t)}</span>${ch.title}`;
      head.addEventListener('click', () => seek(ch.t));
      frag.appendChild(head);
      para = document.createElement('p');
      frag.appendChild(para);
    }
    for (const [w, s, e, c] of u.words) {
      const span = document.createElement('span');
      span.className = `w${c === 'em' ? ' em' : ''}`;
      span.textContent = w;
      span.dataset.i = String(words.length);
      para.appendChild(span);
      para.appendChild(document.createTextNode(' '));
      words.push({ s, e, el: span });
    }
  }
  box.appendChild(frag);
  box.addEventListener('click', (ev) => {
    const el = ev.target.closest('.w');
    if (el) seek(words[+el.dataset.i].s - 0.05);
  });

  let shown = -1;
  function paint() {
    const t = video.currentTime;
    // the last word that has started
    let lo = 0, hi = words.length - 1, k = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (words[m].s <= t) { k = m; lo = m + 1; } else hi = m - 1; }
    if (k !== shown) {
      const a = Math.min(k, shown), b = Math.max(k, shown);
      for (let i = Math.max(0, a); i <= b; i++) words[i].el.classList.toggle('said', i <= k);
      if (shown >= 0) words[shown].el.classList.remove('now');
      shown = k;
    }
    if (k >= 0) words[k].el.classList.toggle('now', t < words[k].e + 0.15);
  }
  let raf = 0;
  const loop = () => { paint(); raf = video.paused ? 0 : requestAnimationFrame(loop); };
  video.addEventListener('play', () => { if (!raf) raf = requestAnimationFrame(loop); });
  video.addEventListener('seeked', paint);
  video.addEventListener('timeupdate', paint);
  paint();
}

function seek(t) {
  video.currentTime = Math.max(0, t);
  if (video.muted && sound && !sound.hidden) startWithSound(t);
  else video.play().catch(() => {});
}

function startWithSound(t = 0) {
  video.loop = false;
  video.muted = false;
  video.currentTime = t;
  video.play().catch(() => {});
  if (sound) sound.hidden = true;
  withSound = true;
}

let withSound = false;
if (video) {
  if (sound) sound.addEventListener('click', () => startWithSound(0));
  if (!reduce.matches && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (withSound) { if (!e.isIntersecting) video.pause(); return; }
      if (e.isIntersecting && e.intersectionRatio > 0.5) {
        video.muted = true;
        video.loop = true;
        video.play().then(() => { if (sound) sound.hidden = false; }).catch(() => {});
      } else if (!video.paused) video.pause();
    }, { threshold: [0, 0.5] }).observe(video);
  }
  video.addEventListener('volumechange', () => { if (!video.muted) { withSound = true; if (sound) sound.hidden = true; } });
  if (box) transcript().catch(() => {});
}
