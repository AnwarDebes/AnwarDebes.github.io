// Home page: theme, the two pin boards and the TRACE demo.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/* ---------- theme ---------- */
function currentTheme() {
  const set = root.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return darkQuery.matches ? 'dark' : 'light';
}
const themeButton = document.querySelector('.theme-toggle');
const views = [];
function syncThemeButton() {
  const t = currentTheme();
  themeButton.textContent = t === 'dark' ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-label', t === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
  for (const v of views) v.setTheme(t);
}
themeButton.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncThemeButton();
  wake();
});
darkQuery.addEventListener('change', syncThemeButton);
syncThemeButton();

/* ---------- header border once the page scrolls ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- TRACE demo ---------- */
import { loadTrace } from './trace.js';

const promptEl = document.getElementById('prompt');
const verdictEl = document.getElementById('verdict');
const verdictSub = document.getElementById('verdict-sub');
const clausesEl = document.getElementById('clauses');
const barSafe = document.getElementById('bar-safe');
const barUnsafe = document.getElementById('bar-unsafe');
const nSafe = document.getElementById('n-safe');
const nUnsafe = document.getElementById('n-unsafe');
let guard = null;

function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function word(w) { return `<span class="lit">${esc(w.replace(/_/g, ' '))}</span>`; }

function formula(c) {
  const d = guard.describe(c);
  const parts = d.present.map(word);
  const shown = d.present.length ? Math.min(d.absent.length, 3) : Math.min(d.absent.length, 4);
  const negs = d.absent.slice(0, shown).map(w => `<span class="neg"><span class="op">¬</span>${word(w)}</span>`);
  let body = [...parts, ...negs].join('<span class="op">∧</span>');
  const rest = d.absent.length - shown;
  if (rest > 0) body += `<span class="absent"> and ${rest} more word${rest === 1 ? '' : 's'} absent</span>`;
  return body || '<span class="absent">(empty)</span>';
}

function group(list) {
  // the same clause is often learned more than once; show it once with a count
  const m = new Map();
  for (const c of list) {
    const key = guard.clauses[c].join(',');
    if (!m.has(key)) m.set(key, { c, n: 0 });
    m.get(key).n++;
  }
  return [...m.values()].sort((a, b) => b.n - a.n || guard.clauses[a.c].length - guard.clauses[b.c].length);
}

function renderSide(title, list, max) {
  if (!list.length) return '';
  const rows = group(list).slice(0, max).map(g =>
    `<li><span class="f">${formula(g.c)}</span><span class="n">${g.n} clause${g.n === 1 ? '' : 's'}</span></li>`).join('');
  return `<p class="votes-head">${title}</p><ol class="clauses">${rows}</ol>`;
}

function evaluate() {
  if (!guard) return;
  const text = promptEl.value;
  if (!text.trim()) {
    verdictEl.dataset.state = 'empty';
    verdictEl.querySelector('strong').textContent = 'Waiting';
    verdictSub.textContent = 'Type a prompt or pick an example.';
    clausesEl.innerHTML = '';
    barSafe.style.width = barUnsafe.style.width = '0';
    nSafe.textContent = '0 clauses say safe'; nUnsafe.textContent = '0 say unsafe';
    return;
  }
  const v = guard.verdict(text);
  verdictEl.dataset.state = v.unsafe ? 'unsafe' : 'safe';
  verdictEl.querySelector('strong').textContent = v.unsafe ? 'Blocked' : 'Allowed';
  const m = Math.abs(v.margin);
  verdictSub.textContent = v.margin === 0 ? 'A tie, which counts as safe.' : `${v.unsafe ? 'Unsafe' : 'Safe'} by ${m} vote${m === 1 ? '' : 's'}.`;
  const total = Math.max(1, v.forSafe + v.forUnsafe, 12);
  barSafe.style.width = (50 * v.forSafe / total) + '%';
  barUnsafe.style.width = (50 * v.forUnsafe / total) + '%';
  nSafe.textContent = `${v.forSafe} clause${v.forSafe === 1 ? '' : 's'} say safe`;
  nUnsafe.textContent = `${v.forUnsafe} say unsafe`;
  const unsafeSide = v.fired.filter(c => c < guard.half);
  const safeSide = v.fired.filter(c => c >= guard.half);
  clausesEl.innerHTML = v.unsafe
    ? renderSide('What voted unsafe', unsafeSide, 4) + renderSide('What voted safe', safeSide, 2)
    : renderSide('What voted safe', safeSide, 4) + renderSide('What voted unsafe', unsafeSide, 2);
}

let timer = 0;
promptEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(evaluate, 40); });
document.querySelectorAll('[data-try]').forEach(b => b.addEventListener('click', () => {
  promptEl.value = b.dataset.try;
  evaluate();
  promptEl.focus({ preventScroll: true });
}));
loadTrace('assets/data/trace-model.json').then(g => { guard = g; evaluate(); }).catch(() => {
  verdictSub.textContent = 'The model could not load. Try reloading the page.';
});

/* ---------- pin boards ---------- */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

let wake = () => {};

async function startBoards() {
  if (!webglOK()) return;
  const { PinView, loadImageData, sampler } = await import('./pins.js');
  const { emblem } = await import('./emblems.js');

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const theme = currentTheme();

  function makeCanvas(slot) {
    const c = document.createElement('canvas');
    c.className = 'pins';
    c.setAttribute('aria-hidden', 'true');
    slot.appendChild(c);
    return c;
  }

  /* hero: the portrait */
  const heroSlot = document.getElementById('hero-slot');
  const hero = new PinView(makeCanvas(heroSlot), {
    cols: small ? 78 : 104, relief: 0.26, radial: 8,
    shadows: false, theme, maxDpr: small ? 1.75 : 2,
  });
  views.push(hero);
  const face = sampler(await loadImageData('assets/data/face.png'));
  const hb = hero.board;
  const faceField = (u, v) => {
    const e0 = Math.min(1, v / 0.09, (1 - v) / 0.06, u / 0.05, (1 - u) / 0.05);
    const e = e0 <= 0 ? 0 : e0 * e0 * (3 - 2 * e0);
    const m = face(u, v, 2);
    return [face(u, v, 0) * e, (0.25 + 0.75 * (0.12 + 0.88 * face(u, v, 1))) * m + 0.9 * (1 - m)];
  };
  // booleans for the "true and false" view
  const lum = new Float32Array(hb.N), msk = new Float32Array(hb.N);
  for (let i = 0; i < hb.N; i++) { lum[i] = face(hb.u[i], hb.v[i], 1); msk[i] = face(hb.u[i], hb.v[i], 2); }
  const bits = hb.dither(lum);
  let ones = 0;
  for (let i = 0; i < hb.N; i++) if (msk[i] > 0.5 && bits[i]) ones++;
  const boolField = (u, v, i) => {
    if (msk[i] <= 0.5) return [0, 0.9];
    const e0 = Math.min(1, v / 0.09, (1 - v) / 0.06);
    const e = e0 <= 0 ? 0 : e0 * e0 * (3 - 2 * e0);
    return bits[i] ? [0.5 * e, 1.0] : [0, 0.36];
  };

  const sweep = reduceMotion.matches ? null : { u: 0.5, v: -0.15, speed: 1.15, delay: 0.15, jitter: 0.08 };
  hb.setField(faceField, sweep);
  if (!sweep) hb.settle();

  const note = document.getElementById('board-note');
  const toggle = document.getElementById('bool-toggle');
  const pinCount = hb.N.toLocaleString('en-US');
  note.textContent = `That’s me, in ${pinCount} steel pins. Run your pointer across to press them.`;
  heroSlot.setAttribute('aria-label', `A portrait of Anwar Debes pressed into a board of ${pinCount} steel pins.`);
  let boolean = false;
  toggle.addEventListener('click', () => {
    boolean = !boolean;
    toggle.setAttribute('aria-pressed', String(boolean));
    toggle.textContent = boolean ? 'Back to steel' : 'See me in true and false';
    note.textContent = boolean
      ? `A Tsetlin Machine reads images as true and false. This is me as ${pinCount} booleans, ${ones.toLocaleString('en-US')} of them true.`
      : `That’s me, in ${pinCount} steel pins. Run your pointer across to press them.`;
    hb.setField(boolean ? boolField : faceField, reduceMotion.matches ? null : { u: 0.0, v: 1.0, speed: 2.2, jitter: 0.04 });
    if (reduceMotion.matches) hb.settle();
    wake();
  });

  /* work: the small board with project pictures */
  const workSlot = document.getElementById('work-slot');
  const work = new PinView(makeCanvas(workSlot), {
    cols: 48, relief: 0.26, radial: 8, shadows: false, theme, maxDpr: 2, fill: 0.84,
  });
  views.push(work);
  work.tilt.bx = 0.08; work.tilt.by = -0.26;
  const wb = work.board;
  let current = '';
  const captions = {
    glassbox: 'glassbox-lm: a glass box with one clause inside.',
    candor: 'CANDOR: a seal, for a certificate on every forward pass.',
    trace: 'TRACE: a shield with a trace running through it.',
    veritas: 'VERITAS: the double turnstile, logic’s way of saying “provably follows”.',
    lucid: 'LUCID: an ARC-style puzzle grid.',
    graphtm: 'graphtm-cbr: nitrobenzene, a textbook Ames-positive molecule.',
    vsclaude: 'vsclaude: Pixie, who acts out what your coding agent is doing.',
  };
  const caption = document.getElementById('emblem-caption');
  function showEmblem(name, from) {
    if (name === current) return;
    current = name;
    const S = sampler(emblem(name));
    wb.setField((u, v) => { const h = S(u, v, 0); return [h, 0.5 + 0.5 * Math.min(1, h * 3) * S(u, v, 1)]; },
      reduceMotion.matches ? null : { u: from ? from.u : 0.5, v: from ? from.v : 0.5, speed: 1.6, jitter: 0.05 });
    if (reduceMotion.matches) wb.settle();
    caption.textContent = captions[name] || '';
    document.querySelectorAll('.work-item').forEach(li => li.classList.toggle('active', li.dataset.emblem === name));
    wake();
  }
  showEmblem('glassbox');
  wb.settle();

  const items = [...document.querySelectorAll('.work-item')];
  items.forEach(li => {
    li.addEventListener('pointerenter', () => showEmblem(li.dataset.emblem, { u: 0.0, v: 0.5 }));
    li.addEventListener('focusin', () => showEmblem(li.dataset.emblem));
  });
  // while scrolling, the item nearest the middle of the screen chooses the picture
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) showEmblem(e.target.dataset.emblem, { u: 0.5, v: 1.0 });
  }, { rootMargin: '-45% 0px -45% 0px' });
  items.forEach(li => io.observe(li));

  /* pointer: press the pins */
  function bindPress(slot, view, radius) {
    let down = false;
    const at = e => view.uvAt(e.clientX, e.clientY);
    slot.addEventListener('pointermove', e => {
      const r = slot.getBoundingClientRect();
      view.look(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      const p = at(e);
      if (p) view.board.press(p.u, p.v, radius * (down ? 1.25 : 1), down ? 0.95 : (e.pointerType === 'mouse' ? 0.55 : 0.9));
      wake();
    });
    slot.addEventListener('pointerdown', e => {
      down = true;
      const p = at(e);
      if (p) { view.board.press(p.u, p.v, radius * 1.3, 1); if (!reduceMotion.matches) view.board.ripple(p.u, p.v, 0.06); }
      wake();
    });
    const up = () => { down = false; };
    slot.addEventListener('pointerup', up);
    slot.addEventListener('pointercancel', up);
    slot.addEventListener('pointerleave', () => { up(); view.look(0, 0); wake(); });
  }
  bindPress(heroSlot, hero, coarse ? 0.1 : 0.075);
  bindPress(workSlot, work, 0.14);

  /* render loop: only while something moves and the board is on screen */
  const visible = new Map([[hero, true], [work, false]]);
  const vio = new IntersectionObserver(entries => {
    for (const e of entries) {
      const v = e.target === heroSlot ? hero : work;
      visible.set(v, e.isIntersecting);
      if (e.isIntersecting) { v.dirty = true; wake(); }
    }
  }, { rootMargin: '80px' });
  vio.observe(heroSlot); vio.observe(workSlot);

  let raf = 0, last = 0, frames = 0, slowFrames = 0, degraded = false;
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    let active = false;
    for (const v of views) {
      const vis = visible.get(v);
      if (vis) v.resize();
      const changed = v.update(dt);
      if (vis && changed) v.render();
      if (v.board.awake > 0 || (vis && v.dirty)) active = true;
    }
    // if the first second is slow, drop resolution and shadows
    if (active && !degraded) {
      frames++;
      if (dt > 0.03) slowFrames++;
      if (frames === 50 && slowFrames > 25) {
        degraded = true;
        for (const v of views) { v.renderer.shadowMap.enabled = false; v.key.castShadow = false; v.setDpr(1); v.pinMaterial.needsUpdate = true; v.frameMaterial.needsUpdate = true; v.plateMaterial.needsUpdate = true; }
      }
    }
    if (active && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener('resize', () => { for (const v of views) v.dirty = true; wake(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // first frame: render both boards so the work board is ready before it scrolls in
  hero.update(0); work.update(0);
  hero.render(); work.render();
  heroSlot.classList.add('live'); workSlot.classList.add('live');
  wake();
  window.__pins = { hero, work };
}

startBoards().catch(err => { console.warn('pin boards disabled:', err); });
