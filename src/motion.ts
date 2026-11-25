// VILL-NOVA – mozgás-segéd. Könnyű, függőség nélküli, és az alkalmazás adataihoz nem nyúl:
// csak a megjelenésen dolgozik (hullámeffekt, számlálás, új sor kiemelése, sima témaváltás, görgetés-állapot).
// Ha az eszközön a „Mozgás csökkentése” be van kapcsolva, a vizuális effektek kimaradnak.

const root = document.documentElement;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Újraindítja egy elem CSS-animációját egy osztály ki-be kapcsolásával. */
const retrigger = (el: Element, cls: string, ms = 0) => {
  el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls);
  if (ms) setTimeout(() => el.classList.remove(cls), ms);
};

/** Látványelemek: a React-gyökéren kívül, a body-n élnek, ezért az alkalmazás felületét nem érintik. */
let px = innerWidth - 60, py = 40;
addEventListener('pointerdown', (e: PointerEvent) => { px = e.clientX; py = e.clientY; }, { passive: true, capture: true });

function fxLayer(): HTMLElement {
  let l = document.getElementById('vn-fx');
  if (!l) { l = document.createElement('div'); l.id = 'vn-fx'; l.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden'; document.body.appendChild(l); }
  return l;
}

/** Szikraeső egy pontból (új sor felvételekor). Web Animations API: gyors, nem terheli a CSS-t. */
function burst(x: number, y: number, count = 18) {
  if (reduced()) return;
  const layer = fxLayer();
  const colors = ['#86e65a', '#b8f58f', '#ffffff', '#0c7a40', '#d9ff5e'];
  for (let i = 0; i < count; i++) {
    const d = document.createElement('i');
    const size = 5 + Math.random() * 7;
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size * (Math.random() > .5 ? 1 : 2.2)}px;border-radius:${Math.random() > .5 ? '50%' : '2px'};background:${colors[i % colors.length]};will-change:transform,opacity`;
    layer.appendChild(d);
    const ang = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 150;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
    const a = d.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(1) rotate(${Math.random() * 540 - 270}deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx * 1.15}px,${dy + 130}px) scale(.3) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
    ], { duration: 800 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });
    a.onfinish = () => d.remove();
  }
}

/** Lökéshullám az érintés/kattintás helyéről (témaváltáskor). */
function shockwave() {
  if (reduced()) return;
  const layer = fxLayer();
  for (let k = 0; k < 2; k++) {
    const r = document.createElement('div'), R = Math.hypot(innerWidth, innerHeight);
    r.style.cssText = `position:absolute;left:${px - R}px;top:${py - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;border:${k ? 2 : 5}px solid #86e65a;box-shadow:0 0 40px rgba(134,230,90,.5);transform:scale(0);will-change:transform,opacity`;
    layer.appendChild(r);
    const a = r.animate([{ transform: 'scale(0)', opacity: .95 }, { transform: 'scale(1)', opacity: 0 }], { duration: 900 + k * 250, delay: k * 140, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'backwards' });
    a.onfinish = () => r.remove();
  }
}

/** 1) Hullámeffekt gombokon, szegmentált választókon és navigációs elemeken. */
const RIPPLE_TARGETS = '.btn, .vn-seg, aside a, nav.fixed a';
function initRipple() {
  document.addEventListener('pointerdown', (e: PointerEvent) => {
    if (reduced()) return;
    const t = (e.target as Element | null)?.closest?.(RIPPLE_TARGETS) as HTMLElement | null;
    if (!t || (t as HTMLButtonElement).disabled || t.getAttribute('aria-disabled') === 'true') return;
    const r = t.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'vn-ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    t.appendChild(s);
    const done = () => s.remove();
    s.addEventListener('animationend', done, { once: true });
    setTimeout(done, 900);
  }, { passive: true });
}

/** 2) Számlálás a mutatókon (irányítópult, szemrevételezés): betöltéskor nullától, értékváltozáskor az előző értéktől. */
const COUNT_TARGETS = '.text-4xl, .grid > div.bg-surface > .text-2xl';
const own = new WeakMap<Node, string>();            // az általunk írt érték: ezt a figyelő nem veszi külső változásnak
function countUp(el: HTMLElement) {
  const node = el.firstChild;
  if (!node || node.nodeType !== 3) return;
  const text = (node.nodeValue ?? '').trim();
  if (!/^\d+$/.test(text) || el.dataset.vnCounted === text) return;
  const target = Number(text);
  const from = Number(el.dataset.vnCounted ?? 0);
  el.dataset.vnCounted = text;
  if (reduced() || target > 99999 || from === target) return;
  const t0 = performance.now(), dur = Math.min(1100, 450 + Math.abs(target - from) * 18);
  let last = String(from); own.set(node, last); node.nodeValue = last;
  const tick = (now: number) => {
    if (node.nodeValue !== last) return;               // közben máshonnan módosult (pl. React frissítette): leállunk
    const p = Math.min(1, (now - t0) / dur);
    last = String(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
    own.set(node, last); node.nodeValue = last;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** 3) Új sor kiemelése (pl. újonnan felvett helyiség vagy mérési pont), de nem az oldal betöltésekor. */
let lastRoute = performance.now();
function flashNew(li: HTMLElement) {
  li.classList.add('vn-new');
  setTimeout(() => li.classList.remove('vn-new'), 2200);
  const r = li.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) burst(r.left + Math.min(60, r.width / 3), r.top + r.height / 2);
}

function initObserver() {
  const scan = (n: Node) => {
    if (!(n instanceof HTMLElement)) return;
    if (n.parentElement?.tagName === 'MAIN') lastRoute = performance.now();      // új oldal érkezett
    if (n.matches?.(COUNT_TARGETS)) countUp(n);
    n.querySelectorAll?.(COUNT_TARGETS).forEach(e => countUp(e as HTMLElement));
    if (reduced() || performance.now() - lastRoute < 900) return;                  // betöltéskor nem villogunk
    const rows = n.tagName === 'LI' ? [n] : Array.from(n.querySelectorAll('li'));
    if (rows.length && rows.length <= 4) rows.forEach(r => flashNew(r as HTMLElement));
  };
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(scan);
      else if (m.type === 'characterData') {
        const t = m.target as Text, p = t.parentElement;
        if (!p || own.get(t) === t.nodeValue) continue;                              // saját írás: nem külső változás
        if (p.matches(COUNT_TARGETS)) countUp(p);                                    // mutató értéke megváltozott
        else if (p.classList.contains('vn-count') && !reduced()) retrigger(p, 'vn-bump', 500);   // helyiség-számláló: kis „ütés”
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.querySelectorAll(COUNT_TARGETS).forEach(e => countUp(e as HTMLElement));
}

/** 4) Sima témaváltás: a színek átúsznak, nem váltanak ugrásszerűen. */
function initThemeFade() {
  let t: number | undefined;
  new MutationObserver(() => {
    if (reduced()) return;
    root.classList.add('vn-theming'); shockwave(); clearTimeout(t);
    t = window.setTimeout(() => root.classList.remove('vn-theming'), 550);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}

/** 5) Görgetés-állapot: a felső sáv árnyékot kap, ha az oldal el van görgetve. */
function initScrollState() {
  let raf = 0;
  const upd = () => { raf = 0; root.toggleAttribute('data-scrolled', scrollY > 6); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  upd();
}

export function initMotion() {
  if (!reduced()) { root.classList.add('vn-boot'); setTimeout(() => root.classList.remove('vn-boot'), 2000); }   // induló belépő animáció ideje
  try { initRipple(); initObserver(); initThemeFade(); initScrollState(); } catch { /* a mozgás sosem akaszthatja meg az alkalmazást */ }
}
