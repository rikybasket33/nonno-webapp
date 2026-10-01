/* app.js - la webapp del tasto del nonno (1/10/2026).
 *
 * Il patto col servizio e' HeadQuarter/documenti/contratto_webapp.md: nomi,
 * forme e codici d'errore vengono da li'. Un file solo, JavaScript moderno e
 * niente librerie, perche' deve girare anche sulla rete di casa senza internet
 * e da file:// (dove i moduli ES non si caricano).
 *
 * Com'e' fatto:
 *   - h() costruisce il DOM; i dati che arrivano dal servizio (nomi, titoli,
 *     link) entrano SOLO come testo, mai come HTML;
 *   - api() parla col servizio e smista 401 (si torna ai profili), 403
 *     "in_attesa" (schermata d'attesa) e il servizio muto (stato offline);
 *   - le schermate stanno nell'hash (#/home, #/sfoglia/youtube...): cosi'
 *     anteprima_webapp.py le fotografa una per una;
 *   - ogni schermata riceve un "ctx" che si porta via i suoi timer quando si
 *     cambia schermata.
 */
(() => {
'use strict';

const MENO_MOTO = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, r = document) => r.querySelector(s);

// ------------------------------------------------------------ il DOM a mano

function h(tag, p, ...figli) {
  const el = document.createElement(tag);
  if (p) for (const [k, v] of Object.entries(p)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') for (const [sk, sv] of Object.entries(v)) { if (sv != null) el.style.setProperty(sk, sv); }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  metti(el, figli);
  return el;
}
function metti(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false || f === '') continue;
    el.append(f instanceof Node ? f : String(f));
  }
  return el;
}

/* Le icone: disegni nostri su una griglia di 24, a tratto (come SF Symbols).
   Sono costanti scritte qui, non dati: per questo possono andare in innerHTML. */
const ICONE = {
  tasto: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/>',
  tasto_pieno: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="4.3" fill="none" stroke="#fff" stroke-width="2.2"/>',
  sfoglia: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  sfoglia_pieno: '<g fill="currentColor" stroke="none"><rect x="3" y="3" width="8" height="8" rx="2.4"/><rect x="13" y="3" width="8" height="8" rx="2.4"/><rect x="3" y="13" width="8" height="8" rx="2.4"/><rect x="13" y="13" width="8" height="8" rx="2.4"/></g>',
  palinsesto: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  palinsesto_pieno: '<path fill="currentColor" stroke="none" d="M6.5 5h11a3 3 0 0 1 3 3v1.6h-17V8a3 3 0 0 1 3-3zM3.5 11.2h17v6.3a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z"/><path d="M8 3v3.5M16 3v3.5"/>',
  attivita: '<path d="M3.6 12a8.4 8.4 0 1 0 2.5-6"/><path d="M3.2 4.2v4.2h4.2"/><path d="M12 7.6V12l3 2"/>',
  attivita_pieno: '<circle cx="12" cy="12" r="9.6" fill="currentColor" stroke="none"/><path d="M12 7.2V12l3.2 2.1" stroke="#fff" stroke-width="2.2"/>',
  admin: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.6 14.3c2 .4 3.4 2 3.9 4.2"/>',
  admin_pieno: '<g fill="currentColor" stroke="none"><circle cx="9" cy="8" r="4"/><path d="M1.8 20.2C2.6 16.2 5.4 13.6 9 13.6s6.4 2.6 7.2 6.6z"/><circle cx="17.2" cy="8.8" r="3"/><path d="M17.4 13.4c2.7.3 4.5 2.4 5 5.6h-4.6c-.3-2.1-1.1-3.9-2.5-5.2.6-.3 1.3-.4 2.1-.4z"/></g>',
  indietro: '<path d="M15 4.5 7.5 12l7.5 7.5"/>',
  avanti: '<path d="M9 4.5 16.5 12 9 19.5"/>',
  piu: '<path d="M12 5v14M5 12h14"/>',
  chiudi: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2.5"/><path d="M8 21h8"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
  diretta: '<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
  apri: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  pallone: '<circle cx="12" cy="12" r="9"/><path d="M12 7.6l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 3v4.6M15.8 10.4l4.4-1.4M14.3 14.8l2.7 3.8M9.7 14.8 7 18.6M8.2 10.4 3.8 9"/>',
  telecomando: '<rect x="7" y="2.5" width="10" height="19" rx="3"/><circle cx="12" cy="8" r="2"/><path d="M10 13h.01M14 13h.01M10 16.5h.01M14 16.5h.01"/>',
  cerca: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  appunti: '<path d="M9 4.5H7.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2H15"/><rect x="9" y="3" width="6" height="3.2" rx="1.2"/>',
  lucchetto: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  orologio: '<circle cx="12" cy="12" r="9"/><path class="lancetta" d="M12 7v5l3 2"/>',
  ripeti: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3"/>',
  cestino: '<path d="M4.5 7h15M10 3.5h4M6.5 7l.9 11.6a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7"/>',
  esci: '<path d="M14 4h3.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
  avviso: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17.2h.01"/>',
  spina: '<path d="M2 8.5a15 15 0 0 1 4.2-2.6M9.8 5.2A15 15 0 0 1 22 8.5M5.5 12.3a9.5 9.5 0 0 1 4-2.1M14.8 10.4a9.5 9.5 0 0 1 3.7 1.9M9 15.8a4.6 4.6 0 0 1 6 0"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/><path d="M3 3l18 18"/>',
  ricarica: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  invio: '<path d="M21 3 10 14"/><path d="M21 3l-6.5 18-4.5-7-7-4.5z"/>',
  persona: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  occhio: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  annulla: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  scambia: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>',
  calendario_piu: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  scudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
};
const NS = 'http://www.w3.org/2000/svg';
function ic(nome, classe = '') {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', ('ic ' + classe).trim());
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONE[nome] || '';
  return s;
}

// ------------------------------------------------------------ piccole cose

const pad = n => String(n).padStart(2, '0');
const maiuscola = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const dopo = ms => new Promise(r => setTimeout(r, ms));
const raf2 = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

// L'aptica leggera: solo dove il telefono la sa fare e solo dopo un tocco
// (Chrome rifiuta, e se ne lamenta in console, un vibrate senza gesto).
function vibra(x) {
  try {
    if (!navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    navigator.vibrate(x);
  } catch (e) { /* niente aptica: pazienza */ }
}

/* Un testo che cambia entra con una dissolvenza, invece di saltare. Il testo
   nuovo si scrive SUBITO e l'animazione e' solo CSS: se per qualunque motivo
   non parte (scheda in secondo piano, risparmio energetico), il testo c'e'. */
function cambia(el, testo) {
  testo = String(testo);
  if (!el || el.textContent === testo) return;
  el.textContent = testo;
  if (MENO_MOTO.matches || !el.isConnected) return;
  el.classList.remove('cambia');
  void el.offsetWidth;
  el.classList.add('cambia');
}

function cascata(el) {
  [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
  el.classList.add('cascata');
  return el;
}
function scuoti(el) {
  if (!el) return;
  el.classList.remove('scuoti');
  void el.offsetWidth;
  el.classList.add('scuoti');
}
function inCorso(btn, si) {
  btn.classList.toggle('in-corso', si);
  btn.disabled = si;
}

// ------------------------------------------------------------ le date, in italiano

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/* Il servizio scrive le date in due modi: ISO ("2026-10-02T21:00", ora
   italiana, o con la Z se e' _utc) e, nelle chiamate che esistevano gia',
   "02/10 21:00:05" senza anno. Le leggiamo tutte e due. */
function leggiData(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(s).trim());
  if (m) {
    const ora = new Date();
    let anno = m[3] ? +m[3] : ora.getFullYear();
    if (anno < 100) anno += 2000;
    const d = new Date(anno, m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
    // "28/12" letto il 2 gennaio e' dell'anno scorso
    if (!m[3] && d - ora > 200 * 864e5) d.setFullYear(anno - 1);
    return d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const inizioGiorno = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const stessoGiorno = (a, b) => a && b && a.toDateString() === b.toDateString();
const traGiorni = d => Math.round((inizioGiorno(d) - inizioGiorno(new Date())) / 864e5);
const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const isoLocale = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hm(d)}`;
const isoGiorno = d => isoLocale(d).slice(0, 10);

function nomeGiorno(d, lungo = false) {
  const k = traGiorni(d);
  if (k === 0) return 'oggi';
  if (k === 1) return 'domani';
  if (k === -1) return 'ieri';
  if (lungo) return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
  return `${GG[d.getDay()]} ${d.getDate()} ${MM[d.getMonth()]}`;
}
const quando = d => nomeGiorno(d) + ' alle ' + hm(d);

function fa(d) {
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 50) return 'adesso';
  if (s < 3600) return Math.round(s / 60) + ' min fa';
  if (traGiorni(d) === 0) return 'alle ' + hm(d);
  if (traGiorni(d) === -1) return 'ieri ' + hm(d);
  return GG[d.getDay()] + ' ' + d.getDate() + ' ' + hm(d);
}
function durata(s) {
  if (s < 60) return s + ' s';
  if (s < 3600) return Math.round(s / 60) + ' min';
  if (s < 86400) return Math.round(s / 3600) + ' ore';
  return Math.round(s / 86400) + ' giorni';
}

// ------------------------------------------------------------ i colori delle app

function rgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [107, 104, 96];
  let x = m[1];
  if (x.length === 3) x = x.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16));
}
const esadecimale = c => '#' + c.map(v => pad(Math.round(Math.max(0, Math.min(255, v))).toString(16))).join('');
const mescola = (a, b, t) => esadecimale(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
function luminanza(hex) {
  const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
}
const testoSu = hex => luminanza(hex) > .5 ? '#1d1d1b' : '#fff';
/* Un colore d'app usato come testo deve leggersi sulla carta chiara e su
   quella scura: in chiaro si scurisce quello troppo acceso, in scuro si
   schiarisce quello troppo cupo (il nero di DAZN, il blu notte di Mediaset). */
function variabiliApp(hex) {
  const l = luminanza(hex);
  return {
    '--app': hex,
    '--app-luce': mescola(hex, '#ffffff', .22),
    '--app-fg': testoSu(hex),
    '--app-chiaro': l > .3 ? mescola(hex, '#000000', .35) : hex,
    '--app-scuro': l < .12 ? mescola(hex, '#ffffff', .5) : hex,
  };
}

// ------------------------------------------------------------ lo stato

const S = {
  io: undefined,          // il profilo entrato (null = nessuno)
  profili: null, tasto: null, scelte: null, app: null, palinsesto: null,
  offline: false, pronto: false,
  bozza: null,            // una destinazione da programmare, passata da Sfoglia al Palinsesto
};

// ------------------------------------------------------------ il servizio

class ErroreApi extends Error {
  constructor(stato, perche, dati) { super(perche); this.stato = stato; this.perche = perche; this.dati = dati; }
}

async function api(percorso, { metodo = 'GET', corpo } = {}) {
  let r;
  try {
    r = await fetch(percorso, {
      method: metodo, cache: 'no-store', credentials: 'same-origin',
      headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    segnaOffline(true);
    throw new ErroreApi(0, 'Il servizio non risponde: il PC di casa è acceso?');
  }
  segnaOffline(false);
  let dati = null;
  try { dati = await r.json(); } catch (e) { /* risposta vuota o non JSON */ }
  if (r.ok && !(dati && dati.ok === false)) return dati || {};
  const perche = (dati && dati.perche) || (r.status === 404 ? 'Non trovato.' : 'Qualcosa è andato storto (' + r.status + ').');
  // fuori: si torna alla scelta del profilo (ma non se si stava proprio entrando)
  if (r.status === 401 && !/\/api\/(accedi|io)$/.test(percorso)) {
    S.io = null;
    vai('#/profili', true);
  }
  if (r.status === 403 && perche === 'in_attesa') {
    if (S.io) S.io.stato = 'in_attesa';
    vai('#/attesa', true);
  }
  throw new ErroreApi(r.status, perche === 'in_attesa' ? 'Il tuo profilo aspetta ancora l\'ok di Riccardo.' : perche, dati);
}
const messaggio = e => (e && e.perche) || 'Qualcosa è andato storto.';

const inVolo = {};
function carica(chiave, percorso, estrai = x => x) {
  if (inVolo[chiave]) return inVolo[chiave];
  const p = api(percorso)
    .then(d => (S[chiave] = estrai(d)))
    .finally(() => { delete inVolo[chiave]; });
  return (inVolo[chiave] = p);
}
const caricaTasto = () => carica('tasto', '/api/tasto');
const caricaScelte = () => carica('scelte', '/api/scelte');
const caricaApp = () => carica('app', '/api/app', d => d.app || []);
const caricaPalinsesto = () => carica('palinsesto', '/api/palinsesto', d => d.eventi || []);
const caricaProfili = () => carica('profili', '/api/profili', d => d.profili || []);
const appSeServe = () => (S.app ? Promise.resolve(S.app) : caricaApp().catch(() => (S.app = [])));
const profiliSeServe = () => (S.profili ? Promise.resolve(S.profili) : caricaProfili().catch(() => []));

// ------------------------------------------------------------ le destinazioni

const DAZN = { id: 'dazn', nome: 'DAZN', colore: '#16181a', sigla: 'DAZN' };

function appDa(id) { return (S.app || []).find(a => a.id === id) || null; }
// L'admin riceve anche le app non ancora provate sulla chiavetta ("da_provare").
const daProvare = a => !!a && (a.da_provare === true || a.verificata === false);

/* Tutto quello che serve per mostrare una destinazione: nome dell'app,
   colore e sigla della tessera, e una riga che dice cos'e'. */
function infoDest(d) {
  if (!d || d.tipo === 'dazn_canale' || d.tipo === 'dazn_partita' || !d.tipo) {
    const cosa = !d || !d.tipo ? 'apre l\'app' : d.tipo === 'dazn_canale' ? 'canale' : 'evento';
    return { ...DAZN, sotto: 'DAZN · ' + cosa };
  }
  const a = appDa(d.app_id) || (S.app || []).find(x => x.pacchetto && x.pacchetto === d.app);
  const id = (a && a.id) || d.app_id || 'app';
  const base = a ? { id, nome: a.nome, colore: a.colore || '#6b6860', sigla: a.sigla || a.nome.charAt(0), verificata: a.verificata }
                 : { id, nome: maiuscola(id), colore: '#6b6860', sigla: id.charAt(0).toUpperCase() };
  let cosa = 'apre l\'app';
  if (d.url) {
    const diretta = a && (a.modi || []).some(m => m.tipo === 'diretta' && (m.elementi || []).some(e => e.url === d.url));
    cosa = diretta ? 'in diretta' : 'link';
  }
  return { ...base, sotto: base.nome + ' · ' + cosa };
}

function tessera(info, d = 44) {
  const sigla = String(info.sigla || (info.nome || '?').charAt(0));
  const n = [...sigla].length;
  const k = n <= 1 ? .5 : n === 2 ? .4 : n === 3 ? .31 : .25;
  return h('span', { class: 'tessera', 'aria-hidden': 'true',
    style: { '--c': info.colore || '#6b6860', '--d': d + 'px', '--k': k, '--fg': testoSu(info.colore || '#6b6860') } }, sigla);
}

function iniziali(nome) {
  const p = String(nome || '?').trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0].charAt(0) + p[1].charAt(0) : (p[0] || '?').charAt(0)).toUpperCase();
}
function avatar(p, d = 40) {
  if (p === 'nonno') return h('span', { class: 'avatar nonno', 'aria-hidden': 'true', style: { '--d': d + 'px' } }, ic('tasto'));
  if (p === 'palinsesto') return h('span', { class: 'avatar', 'aria-hidden': 'true', style: { '--d': d + 'px', '--c': '#7a4fc2' } }, ic('palinsesto'));
  return h('span', { class: 'avatar', 'aria-hidden': 'true', style: { '--d': d + 'px', '--c': (p && p.colore) || '#8a867c' } },
    (p && p.iniziali) || iniziali(p && p.nome));
}
function chiE(nome) {
  if (!nome || nome === 'nonno') return { nome: 'Il nonno', p: 'nonno' };
  if (nome === 'palinsesto') return { nome: 'Il palinsesto', p: 'palinsesto' };
  const p = (S.profili || []).find(x => x.nome.toLowerCase() === String(nome).toLowerCase());
  return { nome, p: p || { nome, colore: '#8a867c' } };
}

// Le due righe del riquadro "PREMI IL TASTO PER" del display, come le fa il
// servizio: maiuscolo, senza accenti, 16 caratteri a riga.
function dueRighe(testo, larg = 16) {
  const t = String(testo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const parole = t.split(/\s+/);
  let r1 = '';
  while (parole.length && (r1 + (r1 ? ' ' : '') + parole[0]).length <= larg) r1 += (r1 ? ' ' : '') + parole.shift();
  if (!r1) { r1 = t.slice(0, larg); return [r1, t.slice(larg, larg * 2)]; }
  let r2 = parole.join(' ');
  if (r2.length > larg) r2 = r2.slice(0, larg - 1).trimEnd() + '…';
  return [r1.replace(/ -$/, ''), r2];
}
function displayFinto(titolo) {
  const [r1, r2] = dueRighe(titolo);
  return h('div', { class: 'display-cornice', role: 'img', 'aria-label': 'Sul display: premi il tasto per ' + titolo },
    h('div', { class: 'display-finto' },
      h('span', { class: 'df-testa' }, 'Premi il tasto per'),
      h('div', { class: 'df-righe' }, h('span', { class: 'df-riga' }, r1), r2 && h('span', { class: 'df-riga' }, r2)),
      h('span', { class: 'df-piede' }, 'per 30 minuti')));
}

// ------------------------------------------------------------ fogli dal basso

const pila = [];
let yBloccato = 0, sbloccaT = 0;

/* Con un foglio aperto la pagina sotto arretra (scala e si scurisce), come su
   iPhone. Per farlo senza perdere il punto dove si era, la pagina diventa
   fissa spostata in su di quanto era scorsa, e torna al suo posto dopo. */
function bloccaPagina(si) {
  const root = document.documentElement, app = $('#app');
  if (si) {
    clearTimeout(sbloccaT);
    if (root.classList.contains('foglio-chiude')) {
      root.classList.remove('foglio-chiude');
    } else if (!root.classList.contains('foglio-aperto')) {
      yBloccato = scrollY;
      app.style.top = -yBloccato + 'px';
      app.style.setProperty('--y', yBloccato + 'px');
    }
    root.classList.add('foglio-aperto');
  } else if (root.classList.contains('foglio-aperto')) {
    root.classList.remove('foglio-aperto');
    root.classList.add('foglio-chiude');
    sbloccaT = setTimeout(() => {
      root.classList.remove('foglio-chiude');
      app.style.top = '';
      scrollTo(0, yBloccato);
    }, MENO_MOTO.matches ? 0 : 480);
  }
}

function apriFoglio({ titolo = '', corpo, alto = false, alChiudere } = {}) {
  const velo = h('div', { class: 'velo' });
  const titoloEl = h('h2', null, titolo);
  const sx = h('div', { class: 'foglio-sx' });
  const corpoEl = h('div', { class: 'foglio-corpo' });
  const testa = h('header', { class: 'foglio-testa' }, sx, titoloEl,
    h('button', { class: 'tondo', type: 'button', 'aria-label': 'Chiudi', onclick: () => f.chiudi() }, ic('chiudi')));
  const el = h('section', { class: 'foglio' + (alto ? ' alto' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo || 'Foglio' },
    h('div', { class: 'maniglia' }), testa, corpoEl);
  const f = {
    el, corpo: corpoEl, chiuso: false,
    titolo(t) { titoloEl.textContent = t; el.setAttribute('aria-label', t || 'Foglio'); },
    sinistra(nodo) { sx.replaceChildren(...(nodo ? [nodo] : [])); },
    chiudi() {
      if (f.chiuso) return;
      f.chiuso = true;
      el.classList.remove('su'); velo.classList.remove('su');
      el.style.transform = '';
      const i = pila.indexOf(f);
      if (i >= 0) pila.splice(i, 1);
      if (pila.length) pila[pila.length - 1].el.classList.remove('dietro');
      else bloccaPagina(false);
      setTimeout(() => { velo.remove(); el.remove(); }, MENO_MOTO.matches ? 0 : 520);
      if (alChiudere) alChiudere();
      if (f.primaDi) f.primaDi.focus({ preventScroll: true });
    },
  };
  f.primaDi = document.activeElement;
  velo.addEventListener('click', () => f.chiudi());
  if (pila.length) pila[pila.length - 1].el.classList.add('dietro');
  pila.push(f);
  document.body.append(velo, el);
  bloccaPagina(true);
  if (typeof corpo === 'function') corpo(corpoEl, f); else if (corpo) corpoEl.append(corpo);
  raf2(() => { velo.classList.add('su'); el.classList.add('su'); });
  trascinaPerChiudere(f, el);
  // il campo principale prende il fuoco a foglio salito
  setTimeout(() => { const a = el.querySelector('[data-fuoco]'); if (a && !f.chiuso) a.focus({ preventScroll: true }); }, 450);
  return f;
}

// Il foglio si chiude anche tirandolo giu' dalla maniglia o dalla testa.
function trascinaPerChiudere(f, el) {
  let y0 = null, dy = 0, t0 = 0;
  el.addEventListener('pointerdown', e => {
    if (!e.target.closest('.maniglia, .foglio-testa') || e.target.closest('button, a, input')) return;
    y0 = e.clientY; dy = 0; t0 = performance.now();
    el.style.transition = 'none';
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* niente cattura: pazienza */ }
  });
  el.addEventListener('pointermove', e => {
    if (y0 == null) return;
    const d = e.clientY - y0;
    dy = d > 0 ? d : d / 5;                 // all'insu' fa resistenza, come una molla
    el.style.transform = `translateY(${dy}px)`;
  });
  const lascia = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    y0 = null;
    el.style.transition = '';
    if (dy > 120 || (dy > 30 && v > .5)) f.chiudi();
    else el.style.transform = '';
  };
  el.addEventListener('pointerup', lascia);
  el.addEventListener('pointercancel', lascia);
}

addEventListener('keydown', e => {
  if (e.key === 'Escape' && pila.length) pila[pila.length - 1].chiudi();
});

function chiudiFogli() { pila.slice().forEach(f => f.chiudi()); }

// La domanda si/annulla, come l'action sheet di iOS. Risponde con una Promise.
function chiedi({ titolo, testo, si, pericolo = false }) {
  return new Promise(risolvi => {
    let fatto = false;
    const velo = h('div', { class: 'velo alto' });
    const fine = v => {
      if (fatto) return;
      fatto = true;
      box.classList.remove('su'); velo.classList.remove('su');
      setTimeout(() => { velo.remove(); box.remove(); }, MENO_MOTO.matches ? 0 : 420);
      risolvi(v);
    };
    const bottoneSi = h('button', { class: 'azioni-btn' + (pericolo ? ' pericolo' : ''), type: 'button',
      onclick: () => { vibra(pericolo ? [12, 40, 12] : 10); fine(true); } }, si);
    const box = h('div', { class: 'azioni', role: 'alertdialog', 'aria-label': titolo || si },
      h('div', { class: 'azioni-gruppo' },
        (titolo || testo) && h('div', { class: 'azioni-testa' }, titolo && h('b', null, titolo), testo && h('span', null, testo)),
        bottoneSi),
      h('button', { class: 'azioni-btn annulla', type: 'button', onclick: () => fine(false) }, 'Annulla'));
    velo.addEventListener('click', () => fine(false));
    document.body.append(velo, box);
    raf2(() => { velo.classList.add('su'); box.classList.add('su'); bottoneSi.focus({ preventScroll: true }); });
  });
}

// L'isola: un avviso che scende dall'alto e se ne va da solo.
let isolaT = 0;
function avvisa(testo, tipo = 'info', ms = 2800) {
  const contenitore = $('#avvisi');
  contenitore.replaceChildren();
  const el = h('div', { class: 'isola ' + tipo, role: tipo === 'errore' ? 'alert' : 'status' },
    h('span', { class: 'isola-ic' }, ic(tipo === 'ok' ? 'spunta' : tipo === 'errore' ? 'avviso' : 'info')),
    h('span', null, testo));
  contenitore.append(el);
  vibra(tipo === 'errore' ? [24, 50, 24] : 8);
  clearTimeout(isolaT);
  isolaT = setTimeout(() => { el.classList.add('via'); setTimeout(() => el.remove(), 380); }, ms);
}

// Il cerchio verde con la spunta che si disegna: "fatto".
function fattoGrande(titolo, testo) {
  vibra([12, 40, 18]);
  return h('div', { class: 'fatto-grande' },
    h('div', { class: 'cerchio-ok' }, ic('spunta')),
    h('h2', null, titolo), testo && h('p', null, testo));
}

// ------------------------------------------------------------ servizio muto

function segnaOffline(si) {
  if (S.offline === si) return;
  S.offline = si;
  const b = $('#banda');
  if (si && S.pronto) {
    b.replaceChildren(ic('spina'), h('span', null, 'Il servizio non risponde'),
      h('button', { type: 'button', onclick: () => { b.hidden = true; ricarica(); } }, 'Riprova'));
    b.hidden = false;
  } else b.hidden = true;
}

/* Lo stato "il servizio non risponde": spiega cosa controllare e riprova da
   solo con un conto alla rovescia, oltre che col pulsante. */
function schermoOffline(cont, riprova) {
  const conto = h('span', { class: 'cifra' }, '10');
  const btn = h('button', { class: 'btn secondario', type: 'button' }, ic('ricarica'), 'Riprova');
  let n = 10, t = 0;
  const prova = async () => {
    clearInterval(t);
    inCorso(btn, true);
    try { await riprova(); }
    catch (e) { inCorso(btn, false); n = 10; cambia(conto, n); t = setInterval(passo, 1000); }
  };
  const passo = () => {
    if (!conto.isConnected) return clearInterval(t);
    n -= 1;
    if (n <= 0) return prova();
    cambia(conto, n);
  };
  btn.addEventListener('click', prova);
  t = setInterval(passo, 1000);
  $('#banda').hidden = true;
  cont.replaceChildren(h('div', { class: 'schermo-centro' },
    h('div', { class: 'bolla rossa' }, ic('spina')),
    h('h1', null, 'Il servizio non risponde'),
    h('p', null, 'Il PC di casa è acceso? Il telefono è collegato al Wi-Fi di casa?'),
    btn,
    h('p', { class: 'nota centro' }, 'Riprovo da solo fra ', conto, ' s')));
}

// ------------------------------------------------------------ la barra in alto e le schede

const barraEl = $('#barraSu');
const schedeEl = $('#schede');

function impostaBarra({ titolo = '', indietro = null, azione = null } = {}) {
  const sx = h('div', { class: 'barra-sx' }, indietro &&
    h('a', { class: 'barra-indietro', href: indietro.href, onclick: () => { document.documentElement.dataset.dir = 'indietro'; } },
      ic('indietro'), h('span', null, indietro.testo)));
  barraEl.replaceChildren(sx, h('div', { class: 'barra-titolo', 'aria-hidden': 'true' }, titolo), h('div', { class: 'barra-dx' }, azione));
  document.title = titolo ? titolo + ' · Il tasto del nonno' : 'Il tasto del nonno';
}

function titoloGrande(occhiello, titolo, destra) {
  return h('header', { class: 'grande' },
    occhiello && h('p', { class: 'eye' }, occhiello),
    h('div', { class: 'grande-riga' }, h('h1', null, titolo), destra));
}

const SCHEDE = [
  ['home', 'Tasto', 'tasto'], ['sfoglia', 'Sfoglia', 'sfoglia'], ['palinsesto', 'Palinsesto', 'palinsesto'],
  ['attivita', 'Attività', 'attivita'], ['admin', 'Profili', 'admin'],
];
function disegnaSchede(attiva) {
  const admin = S.io && S.io.ruolo === 'admin';
  const inAttesa = admin ? (S.profili || []).filter(p => p.stato === 'in_attesa').length : 0;
  schedeEl.replaceChildren(...SCHEDE.filter(s => s[0] !== 'admin' || admin).map(([id, nome, icona]) => {
    const su = id === attiva;
    return h('a', { href: '#/' + id, 'aria-current': su ? 'page' : null, onclick: () => vibra(6) },
      ic(su ? icona + '_pieno' : icona), h('span', null, nome),
      id === 'admin' && inAttesa > 0 && h('span', { class: 'bollino', 'aria-label': inAttesa + ' in attesa' }, inAttesa));
  }));
}

function bottoneProfilo() {
  if (!S.io) return null;
  return h('button', { class: 'bottone-profilo', type: 'button', 'aria-label': 'Il tuo profilo: ' + S.io.nome, onclick: apriProfilo },
    avatar(S.io, 32));
}

// Il titolo grande si rimpicciolisce e sfuma; la barra si fa di vetro.
let rafScorri = 0;
addEventListener('scroll', () => {
  if (rafScorri) return;
  rafScorri = requestAnimationFrame(() => {
    rafScorri = 0;
    const y = scrollY;
    const g = $('#vista .grande');
    if (g) g.style.setProperty('--p', Math.min(1, Math.max(0, y / 56)).toFixed(3));
    barraEl.classList.toggle('piena', y > (g ? g.offsetHeight - 52 : 4));
  });
}, { passive: true });

// ------------------------------------------------------------ le schermate

let ctx = null;
function nuovoCtx() {
  if (ctx) ctx.fine();
  const pulizie = [];
  const c = {
    vivo: true,
    pulisci: fn => pulizie.push(fn),
    ogni(ms, fn) {
      const id = setInterval(() => { if (!document.hidden && c.vivo) fn(); }, ms);
      pulizie.push(() => clearInterval(id));
      return () => clearInterval(id);
    },
    alRitorno: null,          // cosa rifare quando il telefono torna su questa pagina
    sotto: null,              // per i sotto-indirizzi che aprono solo un foglio
    fine() { c.vivo = false; pulizie.forEach(f => { try { f(); } catch (e) { /* gia' fermo */ } }); },
  };
  return (ctx = c);
}

const ROTTE = {
  profili: vistaProfili, attesa: vistaAttesa, home: vistaHome, sfoglia: vistaSfoglia,
  palinsesto: vistaPalinsesto, attivita: vistaAttivita, admin: vistaAdmin,
};
const SENZA_SCHEDE = new Set(['profili', 'attesa']);
let rottaPrima = null;

function leggiHash() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  return { nome: p[0] || 'home', arg: p.slice(1) };
}

function vai(hash, sostituisci = false) {
  if (sostituisci) {
    history.replaceState(null, '', hash);
    naviga();
  } else if (location.hash === hash) naviga();
  else location.hash = hash;
}

function naviga() {
  if (!S.pronto) return;
  const r = leggiHash();
  // le guardie: chi non e' entrato sceglie un profilo; chi aspetta, aspetta
  if (!ROTTE[r.nome]) return vai('#/home', true);
  if (r.nome !== 'profili' && !S.io) return vai('#/profili', true);
  if (S.io && S.io.stato === 'in_attesa' && r.nome !== 'profili' && r.nome !== 'attesa') return vai('#/attesa', true);
  if (r.nome === 'attesa' && S.io && S.io.stato !== 'in_attesa') return vai('#/home', true);
  if (r.nome === 'admin' && !(S.io && S.io.ruolo === 'admin')) return vai('#/home', true);

  // stessa schermata, solo un foglio in piu' (#/palinsesto/nuovo): niente ridisegno
  if (rottaPrima && rottaPrima.nome === r.nome && ctx && ctx.sotto && r.nome !== 'sfoglia') {
    rottaPrima = r;
    ctx.sotto(r.arg);
    return;
  }
  const root = document.documentElement;
  if (!root.dataset.dir || root.dataset.dir === 'tab') {
    root.dataset.dir = rottaPrima && rottaPrima.nome === r.nome
      ? (r.arg.length > rottaPrima.arg.length ? 'avanti' : r.arg.length < rottaPrima.arg.length ? 'indietro' : 'tab')
      : 'tab';
  }
  const primaVolta = !rottaPrima;
  rottaPrima = r;
  chiudiFogli();

  const disegna = () => {
    const c = nuovoCtx();
    const v = h('div', { class: 'vista' });
    $('#vista').replaceChildren(v);
    root.classList.toggle('senza-schede', SENZA_SCHEDE.has(r.nome));
    barraEl.hidden = SENZA_SCHEDE.has(r.nome);
    barraEl.classList.remove('piena');
    disegnaSchede(r.nome);
    scrollTo(0, 0);
    ROTTE[r.nome](v, r.arg, c);
    return v;
  };
  if (document.startViewTransition && !MENO_MOTO.matches && !primaVolta) {
    const t = document.startViewTransition(disegna);
    t.finished.finally(() => { root.dataset.dir = 'tab'; });
  } else {
    const v = disegna();
    if (!primaVolta) v.classList.add('entra');
    root.dataset.dir = 'tab';
  }
}
addEventListener('hashchange', naviga);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ctx && ctx.alRitorno) ctx.alRitorno();
});

function ricarica() { if (ctx && ctx.alRitorno) ctx.alRitorno(); else naviga(); }

// ------------------------------------------------------------ chi usa il tasto (#/profili)

function vistaProfili(v, arg, c) {
  v.classList.add('profili');
  impostaBarra({});
  const griglia = h('div', { class: 'griglia-profili' });
  const piede = h('div', { class: 'profili-piede' });
  v.append(
    h('div', { class: 'marchio' }, ic('tasto')),
    h('h1', null, 'Chi usa il tasto?'),
    h('p', { class: 'sotto' }, 'Il telecomando del nonno, dal tuo telefono.'),
    griglia, piede);

  const disegna = () => {
    const tutti = S.profili || [];
    griglia.replaceChildren(...tutti.map(p => {
      const tu = S.io && S.io.nome === p.nome;
      return h('button', { class: 'profilo' + (tu ? ' tu' : ''), type: 'button', 'aria-label': p.nome + (p.stato === 'in_attesa' ? ', in attesa di approvazione' : ''),
        onclick: () => { vibra(8); tu ? vai(S.io.stato === 'in_attesa' ? '#/attesa' : '#/home') : apriAccesso(p); } },
        avatar(p, 100),
        h('span', { class: 'nome' }, p.nome),
        p.stato === 'in_attesa' ? h('span', { class: 'etichetta ambra' }, ic('orologio'), 'In attesa')
          : tu ? h('span', { class: 'etichetta verde' }, ic('spunta'), 'Sei tu') : null);
    }), h('button', { class: 'profilo profilo-nuovo', type: 'button', onclick: () => { vibra(8); apriNuovoProfilo(); } },
      h('span', { class: 'avatar', style: { '--d': '100px' } }, ic('piu')), h('span', { class: 'nome' }, 'Nuovo profilo')));
    cascata(griglia);
    piede.replaceChildren(...(S.io ? [
      h('span', null, 'Sei entrato come ', h('b', null, S.io.nome)),
      h('button', { class: 'btn-testo', type: 'button', onclick: () => vai(S.io.stato === 'in_attesa' ? '#/attesa' : '#/home') }, 'Torna al tasto', ic('avanti')),
    ] : [h('span', null, 'Progetto Nonno')]));
  };
  const scheletro = () => griglia.replaceChildren(...[0, 1, 2, 3].map(() =>
    h('div', { class: 'profilo' }, h('span', { class: 'osso', style: { width: '100px', height: '100px', 'border-radius': '50%' } }),
      h('span', { class: 'osso', style: { width: '70px', height: '14px' } }))));

  const apriDaIndirizzo = a => {
    if (!a || !a[0]) return;
    if (a[0] === 'nuovo') apriNuovoProfilo();
    else { const p = (S.profili || []).find(x => x.nome.toLowerCase() === a[0].toLowerCase()); if (p) apriAccesso(p); }
  };
  c.sotto = apriDaIndirizzo;
  if (S.profili) disegna(); else scheletro();
  const aggiorna = () => caricaProfili().then(() => { if (c.vivo) disegna(); })
    .catch(e => { if (c.vivo && e.stato === 0) schermoOffline(v, () => caricaProfili().then(naviga)); });
  aggiorna().then(() => { if (c.vivo) apriDaIndirizzo(arg); });
  c.alRitorno = aggiorna;
}

function tornaAProfili() { if (location.hash.startsWith('#/profili/')) history.replaceState(null, '', '#/profili'); }

function campoPassword(attr = {}) {
  const input = h('input', { type: 'password', autocomplete: 'current-password', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', ...attr });
  const mostra = h('button', { class: 'btn-pillola', type: 'button', 'aria-label': 'Mostra la password', onclick: () => {
    const vedi = input.type === 'password';
    input.type = vedi ? 'text' : 'password';
    mostra.setAttribute('aria-label', vedi ? 'Nascondi la password' : 'Mostra la password');
    cambia(mostra.lastChild, vedi ? 'Nascondi' : 'Mostra');
  } }, ic('occhio'), h('span', null, 'Mostra'));
  return { campo: h('div', { class: 'campo' }, ic('lucchetto'), input, mostra), input };
}

function apriAccesso(p) {
  apriFoglio({ titolo: '', alChiudere: tornaAProfili, corpo: (corpo, f) => {
    const { campo, input } = campoPassword({ placeholder: 'Password', 'aria-label': 'Password di ' + p.nome, 'data-fuoco': '', enterkeyhint: 'go' });
    const errore = h('p', { class: 'errore', role: 'alert', hidden: true });
    const entra = h('button', { class: 'btn', type: 'submit' }, 'Entra');
    const modulo = h('form', { novalidate: true }, campo, errore, h('div', { class: 'bottoni' }, entra));
    modulo.addEventListener('submit', async e => {
      e.preventDefault();
      if (!input.value) { scuoti(campo); input.focus(); return; }
      inCorso(entra, true); errore.hidden = true;
      try {
        const r = await api('/api/accedi', { metodo: 'POST', corpo: { nome: p.nome, password: input.value } });
        S.io = r.io;
        corpo.replaceChildren(fattoGrande('Ciao, ' + r.io.nome, r.io.stato === 'in_attesa' ? 'Il tuo profilo aspetta ancora l\'ok di Riccardo.' : 'Ti porto al tasto.'));
        appSeServe();
        await dopo(900);
        f.chiudi();
        vai(r.io.stato === 'in_attesa' ? '#/attesa' : '#/home', true);
      } catch (err) {
        inCorso(entra, false);
        errore.replaceChildren(ic(err.stato === 423 ? 'lucchetto' : 'avviso'), h('span', null, messaggio(err)));
        errore.hidden = false;
        scuoti(campo);
        vibra([24, 50, 24]);
        if (err.stato === 401) { input.value = ''; input.focus(); }
      }
    });
    corpo.append(
      h('div', { class: 'foglio-saluto' }, avatar(p, 76), h('h3', null, 'Ciao, ' + p.nome),
        h('p', null, p.stato === 'in_attesa' ? 'Il tuo profilo aspetta l\'ok di Riccardo, ma puoi entrare a vedere.' : 'Scrivi la tua password per entrare.')),
      h('div', { style: { height: '18px' } }), modulo);
  } });
}

function apriNuovoProfilo() {
  apriFoglio({ titolo: 'Nuovo profilo', alChiudere: tornaAProfili, corpo: (corpo, f) => {
    const anteprima = h('span', { class: 'avatar', style: { '--d': '76px', '--c': '#8a867c' } }, '?');
    const nome = h('input', { type: 'text', maxlength: '24', placeholder: 'Il tuo nome', autocomplete: 'nickname', autocapitalize: 'words', 'aria-label': 'Nome', 'data-fuoco': '', enterkeyhint: 'next' });
    const conta = h('span', { class: 'conta' }, '0/24');
    const { campo: campoPw, input: pw } = campoPassword({ placeholder: 'Almeno 6 caratteri', autocomplete: 'new-password', 'aria-label': 'Password', enterkeyhint: 'go' });
    const regola = h('p', { class: 'nota' }, 'La password deve avere almeno 6 caratteri.');
    const errore = h('p', { class: 'errore', role: 'alert', hidden: true });
    const crea = h('button', { class: 'btn', type: 'submit', disabled: true }, 'Crea profilo');
    const valuta = () => {
      const n = nome.value.trim();
      cambia(anteprima, n ? iniziali(n) : '?');
      conta.textContent = nome.value.length + '/24';
      const pwOk = pw.value.length >= 6;
      regola.style.color = pwOk ? 'var(--acc-testo)' : '';
      regola.textContent = pwOk ? 'Password valida.' : 'La password deve avere almeno 6 caratteri.';
      crea.disabled = !(n && pwOk);
    };
    nome.addEventListener('input', valuta);
    pw.addEventListener('input', valuta);
    const modulo = h('form', { novalidate: true },
      h('p', { class: 'etich' }, 'Come ti chiami'), h('div', { class: 'grp' }, h('div', { class: 'campo' }, ic('persona'), nome, conta)),
      h('p', { class: 'etich' }, 'Password'), h('div', { class: 'grp' }, campoPw), regola,
      errore, h('div', { class: 'bottoni' }, crea),
      h('p', { class: 'nota centro' }, 'Riccardo riceve la richiesta: finché non la approva puoi entrare, ma non usare il tasto.'));
    modulo.addEventListener('submit', async e => {
      e.preventDefault();
      if (crea.disabled) return;
      inCorso(crea, true); errore.hidden = true;
      try {
        const r = await api('/api/registra', { metodo: 'POST', corpo: { nome: nome.value.trim(), password: pw.value } });
        S.io = r.io;
        S.profili = null;
        corpo.replaceChildren(fattoGrande('Profilo creato', 'Adesso aspettiamo l\'ok di Riccardo.'));
        await dopo(1000);
        f.chiudi();
        vai('#/attesa', true);
      } catch (err) {
        inCorso(crea, false);
        crea.disabled = false;
        errore.replaceChildren(ic('avviso'), h('span', null, err.stato === 409 ? 'C\'è già un profilo con questo nome: scegline un altro.' : messaggio(err)));
        errore.hidden = false;
        scuoti(errore);
      }
    });
    corpo.append(h('div', { class: 'foglio-saluto' }, anteprima), modulo);
  } });
}

// ------------------------------------------------------------ in attesa (#/attesa)

function vistaAttesa(v, arg, c) {
  impostaBarra({});
  const io = S.io;
  const esci = h('button', { class: 'btn secondario', type: 'button' }, ic('esci'), 'Esci');
  esci.addEventListener('click', async () => {
    inCorso(esci, true);
    try { await api('/api/esci', { metodo: 'POST', corpo: {} }); } catch (e) { /* si esce comunque */ }
    S.io = null;
    vai('#/profili', true);
  });
  v.append(h('div', { class: 'attesa' },
    h('div', { class: 'onde' }, h('i'), h('i'), h('i'), avatar(io, 112), h('span', { class: 'orologio' }, ic('orologio'))),
    h('h1', null, 'Ciao, ' + io.nome),
    h('p', null, 'Il tuo profilo è pronto. Manca solo l\'ok di Riccardo: appena arriva, questa pagina si apre da sola.'),
    h('span', { class: 'stato-pillola' }, h('span', { class: 'puntini-attesa' }, h('i'), h('i'), h('i')), 'In attesa di approvazione'),
    esci));
  // si guarda ogni 6 secondi se Riccardo ha approvato
  const guarda = async () => {
    try {
      const r = await api('/api/io');
      if (!c.vivo) return;
      S.io = r.io;
      if (r.io && r.io.stato === 'attivo') {
        v.replaceChildren(h('div', { class: 'schermo-centro' }, fattoGrande('Ci sei!', 'Riccardo ha approvato il tuo profilo.')));
        await dopo(1400);
        vai('#/home', true);
      }
    } catch (e) { /* 401: api() ci ha gia' portato ai profili */ }
  };
  c.ogni(6000, guarda);
  c.alRitorno = guarda;
}

// ------------------------------------------------------------ il profilo (foglio dall'avatar)

function apriProfilo() {
  const io = S.io;
  apriFoglio({ titolo: '', corpo: (corpo, f) => {
    const esci = h('button', { class: 'riga tocca', type: 'button' }, h('span', { class: 'ic-tondo no' }, ic('esci')),
      h('span', { class: 'corpo' }, h('span', { class: 't1', style: { color: 'var(--rosso)' } }, 'Esci')));
    esci.addEventListener('click', async () => {
      try { await api('/api/esci', { metodo: 'POST', corpo: {} }); } catch (e) { /* si esce comunque */ }
      S.io = null;
      f.chiudi();
      vai('#/profili', true);
    });
    corpo.append(
      h('div', { class: 'foglio-saluto' }, avatar(io, 76), h('h3', null, io.nome),
        h('p', null, io.ruolo === 'admin' ? 'Amministratore: approvi tu i profili nuovi.' : 'Familiare del nonno.')),
      h('div', { class: 'grp con-icone', style: { 'margin-top': '22px' } },
        h('a', { class: 'riga tocca', href: '#/profili', onclick: () => f.chiudi() }, h('span', { class: 'ic-tondo' }, ic('scambia')),
          h('span', { class: 'corpo' }, h('span', { class: 't1' }, 'Cambia profilo')), ic('avanti', 'chev')),
        esci),
      h('p', { class: 'nota centro', style: { 'margin-top': '22px' } }, 'Progetto Nonno · il tasto del nonno'));
  } });
}

// ------------------------------------------------------------ casa (#/home)

const ESITI_COMANDO = {
  // stato: [fase del pulsante, passo (negativo = fallito li'), frase di adesso, frase per "l'ultima volta"]
  'in attesa': ['attesa', 1, c => `Inviato alle ${c.inviato}: aspetto che il telecomando lo prenda…`, 'inviato'],
  'ricevuto': ['ricevuto', 2, c => `Il telecomando l'ha preso${c.ricevuto ? ' alle ' + c.ricevuto : ''}: sta aprendo…`, 'preso'],
  'in_onda': ['fatto', 3, () => 'Fatto: è in onda sulla TV del nonno.', 'è andato in onda'],
  'gia_in_onda': ['fatto', 3, () => 'Era già in onda: il telecomando non ha toccato niente.', 'era già in onda'],
  'fallito': ['errore', -3, () => 'Il telecomando non ce l\'ha fatta ad aprirlo.', 'il telecomando non ce l\'ha fatta'],
  'occupato': ['errore', -2, () => 'Il telecomando stava già lavorando: comando ignorato.', 'il telecomando era occupato'],
  'scaduto': ['errore', -2, () => 'Il telecomando non l\'ha preso entro un minuto: è acceso e in rete?', 'il telecomando non l\'ha preso'],
  'senza_esito': ['errore', -3, () => 'Il telecomando l\'ha preso ma non ha detto com\'è finita (si è riavviato?).', 'non si sa com\'è finita'],
};
const CAUSE = {
  tv: 'TV non trovata: sul display «accendi la TV e ripremi»',
  app: 'l\'app non è partita: sul display «riprova»',
  rete: 'senza internet: sul display «riprova dopo»',
};
function descriviEsito(e) {
  if (e.esito === 'fallito') {
    return { bene: false, testo: 'Non riuscito: ' + (e.di_fila >= 2 ? 'di nuovo, sul display «chiama Riccardo»' : (CAUSE[e.causa] || e.causa || 'motivo sconosciuto')) };
  }
  if (e.esito === 'gia_in_onda') return { bene: true, testo: 'Era già in onda' };
  return { bene: true, testo: 'In onda' };
}

function vistaHome(v, arg, c) {
  const oggi = new Date();
  impostaBarra({ titolo: 'Il tasto', azione: bottoneProfilo() });
  v.append(titoloGrande(maiuscola(GIORNI[oggi.getDay()]) + ' ' + oggi.getDate() + ' ' + MESI[oggi.getMonth()], 'Il tasto'));
  const eroe = h('section', { class: 'eroe', 'aria-live': 'polite' }, scheletroEroe());
  const premi = pulsantePremi(c);
  const arrivo = h('div'), telecomando = h('div'), ultime = h('div');
  v.append(eroe, premi.el, arrivo, telecomando, ultime);

  const disegna = () => {
    const s = S.tasto;
    if (!s) return;
    aggiornaSezione(eroe, [s.tasto, s.manuale, s.squadra, s.in_onda, (S.app || []).length], () => contenutoEroe(s, eroe), true);
    premi.mostra(s.comando);
    aggiornaSezione(arrivo, [s.prossimo_evento, s.squadra, (S.app || []).length], () => sezioneArrivo(s));
    aggiornaSezione(telecomando, [s.telecomando_visto_s == null ? null : s.telecomando_visto_s <= 15 ? 'si' : Math.round(s.telecomando_visto_s / 30), s.in_onda], () => sezioneTelecomando(s));
    aggiornaSezione(ultime, [s.esiti, (S.profili || []).length], () => sezioneUltime(s));
  };
  const aggiorna = async () => {
    try {
      await Promise.all([caricaTasto(), appSeServe(), profiliSeServe()]);
      if (c.vivo) disegna();
    } catch (e) {
      if (c.vivo && e.stato === 0 && !S.tasto) schermoOffline(v, () => caricaTasto().then(() => naviga()));
    }
  };
  premi.aggiorna = aggiorna;
  if (S.tasto) disegna();
  aggiorna();
  c.ogni(20000, aggiorna);
  c.alRitorno = aggiorna;
}

/* Ridisegna un pezzo di pagina solo se i suoi dati sono cambiati: al giro di
   controllo ogni 20 s non deve ballare niente. La prima volta, a cascata. */
function aggiornaSezione(cont, dati, costruisci, interno = false) {
  const firma = JSON.stringify(dati);
  if (cont._firma === firma) return;
  const prima = cont._firma === undefined || cont._firma === null;
  cont._firma = firma;
  const nodo = costruisci();
  if (interno) {
    // la carta protagonista resta, cambia solo il contenuto (con una dissolvenza)
    cont.replaceChildren(...(Array.isArray(nodo) ? nodo : [nodo]));
    if (!prima && cont.animate && !MENO_MOTO.matches) cont.animate([{ opacity: .4, transform: 'scale(.99)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,1,.3,1)' });
    else if (prima) cascata(cont);
    return;
  }
  cont.replaceChildren(...(nodo ? [nodo] : []));
  if (prima && nodo) nodo.classList.add('entra');
}

function scheletroEroe() {
  return h('div', null,
    h('span', { class: 'osso', style: { display: 'block', width: '46%', height: '12px' } }),
    h('div', { class: 'eroe-dest' }, h('span', { class: 'osso', style: { width: '60px', height: '60px', 'border-radius': '14px', flex: 'none' } }),
      h('div', { style: { flex: '1' } }, h('span', { class: 'osso', style: { display: 'block', width: '80%', height: '22px' } }),
        h('span', { class: 'osso', style: { display: 'block', width: '45%', height: '13px', 'margin-top': '10px' } }))));
}

function contenutoEroe(s, eroe) {
  const t = s.tasto || {};
  const d = t.destinazione || null;
  const info = infoDest(d);
  eroe.style.setProperty('--tinta', d && d.tipo === 'app' ? info.colore : 'var(--acc2)');
  const titolo = (d && d.titolo) || maiuscola(String(t.titolo || 'DAZN').toLowerCase());
  const man = s.manuale;
  const chi = man && (man.chi || man.creato_da);
  const MOTIVI = {
    squadra: ['verde', 'pallone', 'Partita della squadra'],
    manuale: ['blu', 'persona', chi ? 'Scelto da ' + chi : 'Scelto a mano'],
    predefinita: ['', 'tasto', 'Predefinito'],
    palinsesto: ['viola', 'palinsesto', 'Dal palinsesto'],
  };
  const [classe, icona, testo] = MOTIVI[t.motivo] || ['', 'info', maiuscola(String(t.motivo || ''))];

  const note = [];
  if (t.motivo === 'squadra' && man && man.titolo) {
    note.push(h('div', { class: 'riga-nota' }, ic('annulla'), h('span', null, 'Finita la partita torna a ', h('b', null, man.titolo))));
  }
  if (s.in_onda) {
    note.push(h('div', { class: 'riga-nota' }, h('span', { class: 'dal-vivo-punto' }),
      h('span', null, h('b', null, 'In onda sulla TV del nonno'), ' adesso.')));
  }
  if (t.motivo === 'predefinita') {
    note.push(h('div', { class: 'riga-nota' }, ic('info'), h('span', null, 'Nessuno ha scelto niente: il tasto apre DAZN.')));
  }
  // un evento futuro scelto a mano: il link apre la scheda, non la diretta
  const inizio = d && d.tipo === 'dazn_partita' && leggiData(d.inizio);
  if (t.motivo === 'manuale' && inizio && inizio > new Date()) {
    note.push(h('div', { class: 'avviso' }, ic('avviso'),
      h('span', null, `L'evento comincia ${quando(inizio)}: se il nonno preme prima, DAZN gli mostra la scheda, non la diretta.`)));
  }
  const pezzi = [
    h('div', { class: 'eroe-cima' }, h('span', { class: 'eye' }, 'Adesso il tasto porta a'),
      h('span', { class: 'etichetta ' + classe }, ic(icona), testo)),
    h('div', { class: 'eroe-dest' }, tessera(info, 60),
      h('div', { style: { 'min-width': '0' } }, h('h2', { class: 'eroe-titolo' }, titolo), h('p', { class: 'eroe-sotto' }, info.sotto))),
  ];
  if (note.length) pezzi.push(h('div', { class: 'eroe-note' }, note));
  if (man && t.motivo !== 'predefinita') {
    const togli = h('button', { class: 'btn-testo', type: 'button' }, ic('annulla'), t.motivo === 'squadra' ? 'Togli la scelta di dopo' : 'Togli la scelta: torna a DAZN');
    togli.addEventListener('click', async () => {
      const si = await chiedi({ titolo: 'Togliere la scelta?', testo: 'Il tasto tornerà ad aprire DAZN (la partita della squadra resta sempre prima).', si: 'Togli la scelta', pericolo: true });
      if (!si) return;
      try {
        await api('/api/tasto', { metodo: 'POST', corpo: { cancella: true } });
        avvisa('Il tasto torna a DAZN', 'ok');
        S.tasto = null;
        ricarica();
      } catch (e) { avvisa(messaggio(e), 'errore'); }
    });
    pezzi.push(h('div', { class: 'eroe-azioni' }, togli));
  }
  return pezzi;
}

/* IL PULSANTE. Si tiene premuto finche' l'anello si chiude (0,65 s): un tocco
   per sbaglio in tasca non accende la TV del nonno. Da tastiera o lettore di
   schermo, invece, Invio apre una domanda di conferma. Poi l'anello racconta il
   comando: gira mentre aspetta il telecomando, gira piu' pieno quando l'ha
   preso, si chiude verde (o rosso) a cose fatte. */
function pulsantePremi(c) {
  const anello = document.createElementNS(NS, 'svg');
  anello.setAttribute('class', 'anello');
  anello.setAttribute('viewBox', '0 0 184 184');
  anello.setAttribute('aria-hidden', 'true');
  anello.innerHTML = '<circle class="traccia" cx="92" cy="92" r="88"/><circle class="arco" cx="92" cy="92" r="88"/>';
  const cupolaIc = h('span', { class: 'cupola-ic' }, ic('tasto'));
  const cupolaTesto = h('span', { class: 'cupola-testo' }, 'Premi');
  const btn = h('button', { class: 'premi', type: 'button', 'aria-label': 'Premi il tasto del nonno', 'aria-describedby': 'premiStato' },
    anello, h('span', { class: 'premi-onda' }), h('span', { class: 'cupola' }, cupolaIc, cupolaTesto));
  const passi = h('ol', { class: 'passi', 'aria-hidden': 'true' }, ['Inviato', 'Preso', 'In onda'].map(t => h('li', null, h('i'), h('span', null, t))));
  const passiBox = h('div', { class: 'passi-box' }, h('div', null, passi));
  const stato = h('p', { class: 'premi-stato', id: 'premiStato', 'aria-live': 'polite' }, 'Tieni premuto per accendere la TV del nonno su quello che il tasto porta adesso.');
  const lunga = h('input', { type: 'checkbox', class: 'interruttore', id: 'riapri' });
  const opzione = h('label', { class: 'riga', for: 'riapri' },
    h('span', { class: 'corpo' }, h('span', { class: 't1' }, 'Riapri anche se è già in onda'),
      h('span', { class: 't2' }, 'Come quando il nonno tiene premuto a lungo')), lunga);
  const el = h('section', { class: 'carta premi-carta', 'data-stato': '' },
    h('p', { class: 'eye' }, 'Premi al posto del nonno'), btn, passiBox, stato, opzione);

  const COSA = { '': ['tasto', 'Premi'], carica: ['tasto', 'Tieni…'], attesa: ['invio', 'Inviato'], ricevuto: ['tv', 'Apre…'], fatto: ['spunta', 'In onda'], errore: ['chiudi', 'Non va'] };
  let fase = '', occupato = false, veloce = null, tieni = 0, premuto = false, ultimoId = null;
  const seguiti = new Set();
  let ritornoT = 0;

  const imposta = f => {
    fase = f;
    el.dataset.stato = f;
    const [icona, testo] = COSA[f] || COSA[''];
    if (cupolaIc.firstChild.dataset.n !== icona) {
      const nuova = ic(icona);
      nuova.dataset.n = icona;
      cupolaIc.replaceChildren(nuova);            // entra a molla: .cupola-ic .ic in app.css
    }
    cambia(cupolaTesto, testo);
  };
  cupolaIc.firstChild.dataset.n = 'tasto';
  const passo = (n, ko = false) => {
    passiBox.classList.toggle('su', n !== 0);
    const assoluto = Math.abs(n);
    passi.style.setProperty('--avanza', String(Math.max(0, Math.min(1, ((ko ? assoluto - 1 : assoluto) - 1) / 2))));
    [...passi.children].forEach((li, i) => {
      li.className = ko ? (i + 1 < assoluto ? 'fatto' : i + 1 === assoluto ? 'ko' : '')
        : (i + 1 < n || n === 3 ? 'fatto' : i + 1 === n ? 'ora' : '');
    });
  };
  const testo = (t, classe = '') => { stato.className = 'premi-stato ' + classe; cambia(stato, t); };
  const vaiVeloce = si => {
    if (si && !veloce) veloce = c.ogni(1500, () => comp.aggiorna && comp.aggiorna());
    if (!si && veloce) { veloce(); veloce = null; }
  };

  function mostra(cmd) {
    if (premuto) return;                          // mentre il dito e' giu' non si tocca niente
    if (!cmd) { occupato = false; vaiVeloce(false); return; }
    const [f, n, frase, passata] = ESITI_COMANDO[cmd.stato] || ['errore', -1, () => cmd.stato, cmd.stato];
    if (f === 'attesa' || f === 'ricevuto') {
      seguiti.add(cmd.id);
      occupato = true;
      imposta(f); passo(n);
      testo(frase(cmd));
      vaiVeloce(true);
      return;
    }
    occupato = false;
    vaiVeloce(false);
    const nuovo = seguiti.has(cmd.id) && ultimoId !== cmd.id;
    ultimoId = cmd.id;
    if (nuovo) {
      // finito adesso, sotto i nostri occhi: festa (o il rosso), poi si torna a riposo
      imposta(f);
      passo(n, f === 'errore');
      vibra(f === 'fatto' ? [12, 40, 18] : [30, 60, 30]);
      testo(frase(cmd), f === 'fatto' ? 'bene' : 'male');
      clearTimeout(ritornoT);
      ritornoT = setTimeout(() => { if (!occupato && el.isConnected) { imposta(''); passo(0); } }, 5000);
    } else if (fase !== 'fatto' && fase !== 'errore') {
      imposta('');
      passo(0);
      stato.className = 'premi-stato';
      stato.replaceChildren('Tieni premuto per accendere la TV del nonno. L\'ultima volta, alle ',
        h('b', null, String(cmd.inviato || '').slice(0, 5)), ', ' + passata + '.');
    }
  }

  async function invia() {
    occupato = true;
    imposta('attesa'); passo(1);
    testo('Invio il comando al telecomando…');
    vibra([10, 30, 14]);
    try {
      const r = await api('/api/premi', { metodo: 'POST', corpo: { lunga: lunga.checked } });
      lunga.checked = false;
      if (r.comando) { seguiti.add(r.comando.id); mostra(r.comando); }
      vaiVeloce(true);
    } catch (e) {
      occupato = false;
      imposta('errore'); passo(0);
      testo(messaggio(e), 'male');
      if (e.stato === 429) avvisa(messaggio(e), 'errore', 3600);
      clearTimeout(ritornoT);
      ritornoT = setTimeout(() => { if (!occupato && el.isConnected) imposta(''); }, 3200);
    }
  }

  const giu = e => {
    if (occupato || (e.button !== undefined && e.button > 0)) return;
    e.preventDefault();
    premuto = true;
    clearTimeout(ritornoT);
    imposta('carica');
    vibra(6);
    tieni = setTimeout(() => { premuto = false; invia(); }, MENO_MOTO.matches ? 350 : 650);
  };
  const su = () => {
    if (!premuto) return;
    premuto = false;
    clearTimeout(tieni);
    imposta('');
    testo('Tieni premuto un attimo di più, finché l\'anello si chiude.');
    scuoti(stato);
  };
  btn.addEventListener('pointerdown', giu);
  btn.addEventListener('pointerup', su);
  btn.addEventListener('pointerleave', su);
  btn.addEventListener('pointercancel', su);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', async e => {
    if (e.detail !== 0 || occupato) return;       // il clic vero e' gia' gestito dal "tieni premuto"
    const si = await chiedi({ titolo: 'Premo il tasto?', testo: 'Sulla TV del nonno si apre quello che il tasto porta adesso.', si: 'Premi il tasto' });
    if (si) invia();
  });

  const comp = { el, mostra, aggiorna: null };
  c.pulisci(() => { clearTimeout(ritornoT); clearTimeout(tieni); });
  return comp;
}

function sezioneArrivo(s) {
  const righe = [];
  const pe = s.prossimo_evento;
  if (pe) {
    const info = infoDest(pe.destinazione);
    const q = leggiData(pe.prossima || pe.quando);
    righe.push(h('a', { class: 'riga tocca', href: '#/palinsesto' }, tessera(info, 36),
      h('span', { class: 'corpo' }, h('span', { class: 't1' }, pe.titolo || (pe.destinazione && pe.destinazione.titolo) || 'Evento'),
        h('span', { class: 't2' }, (q ? maiuscola(quando(q)) : '') + ' · ' + (pe.modo === 'tasto' ? 'prepara il tasto' : 'va in onda da sola'))),
      ic('avanti', 'chev')));
  }
  const sq = s.squadra;
  if (sq && sq.partita) {
    const inizio = leggiData(sq.inizio), scav = leggiData(sq.scavalca_da);
    let t2;
    if (sq.fase === 'LIVE') t2 = 'In corso adesso: il tasto porta lì.';
    else if (sq.fase === 'PREPARTITA') t2 = 'Comincia ' + (inizio ? 'alle ' + hm(inizio) : 'a momenti') + ': il tasto porta già lì.';
    else if (sq.fase === 'FINITA') t2 = 'Finita da poco.';
    else t2 = (inizio ? maiuscola(quando(inizio)) : sq.inizio) + (scav ? '. Dalle ' + hm(scav) + ' il tasto passa da solo alla partita.' : '');
    righe.push(h('div', { class: 'riga' }, h('span', { class: 'ic-tondo', style: { width: '36px', height: '36px', 'border-radius': '10px' } }, ic('pallone')),
      h('span', { class: 'corpo' }, h('span', { class: 't1' }, sq.partita), h('span', { class: 't2' }, t2)),
      sq.fase === 'LIVE' ? h('span', { class: 'dal-vivo' }, 'LIVE') : null));
  }
  if (!righe.length) return null;
  return h('div', null,
    h('div', { class: 'sezione' }, h('h2', null, 'In arrivo'), pe && h('a', { href: '#/palinsesto' }, 'Palinsesto')),
    h('div', { class: 'grp', style: { '--rientro': '64px' } }, righe));
}

function sezioneTelecomando(s) {
  const v = s.telecomando_visto_s;
  let classe, t1, t2;
  if (v == null) { classe = 'no'; t1 = 'Telecomando mai sentito'; t2 = 'Non si è ancora fatto vivo da quando è acceso il servizio.'; }
  else if (v <= 15) { classe = 'si'; t1 = 'Telecomando collegato'; t2 = 'Si è fatto sentire adesso.'; }
  else { classe = 'no'; t1 = 'Telecomando non sentito'; t2 = 'Da ' + durata(v) + '. È acceso e in rete?'; }
  return h('div', null,
    h('div', { class: 'sezione' }, h('h2', null, 'In casa del nonno')),
    h('div', { class: 'grp con-icone' },
      h('div', { class: 'riga' }, h('span', { class: 'ic-tondo ' + (classe === 'si' ? '' : 'no') }, ic('telecomando')),
        h('span', { class: 'corpo' }, h('span', { class: 't1' }, t1), h('span', { class: 't2' }, t2)), h('span', { class: 'punto-stato ' + classe })),
      h('div', { class: 'riga' }, h('span', { class: 'ic-tondo ' + (s.in_onda ? 'no' : 'blu') }, ic('tv')),
        h('span', { class: 'corpo' }, h('span', { class: 't1' }, s.in_onda ? 'La TV è accesa sul tasto' : 'Niente in onda dal tasto'),
          h('span', { class: 't2' }, s.in_onda ? 'Quello che ha aperto il tasto sta andando.' : 'La TV è spenta o su altro.')),
        s.in_onda ? h('span', { class: 'dal-vivo' }, 'IN ONDA') : null)));
}

function sezioneUltime(s) {
  const es = (s.esiti || []).slice(0, 3);
  if (!es.length) return null;
  return h('div', null,
    h('div', { class: 'sezione' }, h('h2', null, 'Ultime pressioni'), h('a', { href: '#/attivita' }, 'Tutte')),
    h('div', { class: 'grp con-avatar' }, es.map(rigaEsito)));
}
function rigaEsito(e) {
  const chi = chiE(e.chi || (e.da === 'webapp' ? null : 'nonno'));
  const d = descriviEsito(e);
  const q = leggiData(e.quando);
  return h('div', { class: 'riga' }, avatar(chi.p, 36),
    h('span', { class: 'corpo' }, h('span', { class: 't1' }, h('b', { style: { 'font-weight': '600' } }, chi.nome), e.titolo ? ' · ' + e.titolo : ''),
      h('span', { class: 't2 ' + (d.bene ? 'esito-bene' : 'esito-male') }, d.testo)),
    h('span', { class: 'quando-dx' }, q ? fa(q) : e.quando));
}

// ------------------------------------------------------------ sfoglia (#/sfoglia, #/sfoglia/<app>)

function vistaSfoglia(v, arg, c) {
  if (arg[0]) return vistaApp(v, arg[0], c);
  impostaBarra({ titolo: 'Sfoglia', azione: bottoneProfilo() });
  v.append(titoloGrande('Cosa può guardare il nonno', 'Sfoglia'));
  const corpo = h('div');
  v.append(corpo);
  contenutoSfoglia(corpo, c, {
    scegli: d => apriConferma(d),
    apriApp: id => { document.documentElement.dataset.dir = 'avanti'; vai('#/sfoglia/' + encodeURIComponent(id)); },
  });
  c.alRitorno = () => { caricaTasto().catch(() => {}); };
}

/* Il contenuto di Sfoglia, usato due volte: nella sua pagina e nel foglio
   "Scegli cosa" del palinsesto. scegli(destinazione) decide cosa succede. */
function contenutoSfoglia(corpo, c, { scegli, apriApp }) {
  const scaffale = h('div', { class: 'scaffale', role: 'list' },
    [0, 1, 2, 3, 4, 5].map(() => h('div', { class: 'app-icona' }, h('span', { class: 'osso', style: { width: '58px', height: '58px', 'border-radius': '14px' } }),
      h('span', { class: 'osso', style: { width: '44px', height: '10px' } }))));
  const canali = h('div', { class: 'scorri' }, [0, 1, 2].map(() => h('span', { class: 'osso', style: { flex: 'none', width: '150px', height: '100px', 'border-radius': '18px' } })));
  const cerca = h('input', { class: 'cerca', type: 'search', placeholder: 'Cerca: Inter, Serie A, tennis…', 'aria-label': 'Cerca un evento DAZN', enterkeyhint: 'search', autocomplete: 'off' });
  const filtri = h('div', { class: 'filtri', role: 'group', 'aria-label': 'Sport' });
  const eventi = h('div', null, scheletroRighe(5));
  const titoloDazn = h('div', { class: 'sezione' }, h('h2', null, 'DAZN in onda'));
  // le app "da provare" arrivano solo all'admin: gli si dice perche' le vede
  const legenda = h('p', { class: 'nota legenda-provare', hidden: true },
    'Quelle «da provare» le vedi solo tu: non sono ancora state provate sulla chiavetta del nonno, gli altri non le vedono.');
  corpo.append(
    h('div', { class: 'sezione' }, h('h2', null, 'App')), scaffale, legenda,
    titoloDazn, canali,
    h('div', { class: 'sezione' }, h('h2', null, 'Eventi DAZN')),
    h('div', { class: 'cerca-box' }, ic('cerca'), cerca), filtri, eventi);

  let sport = 'Calcio';
  const scelto = () => S.tasto && S.tasto.tasto && S.tasto.tasto.id;

  const disegnaScaffale = () => {
    const tutte = [{ ...DAZN, dazn: true }, ...(S.app || [])];
    scaffale.replaceChildren(...tutte.map(a => h('button', { class: 'app-icona', type: 'button', role: 'listitem',
      'aria-label': a.nome + (daProvare(a) ? ', da provare' : ''),
      onclick: () => { vibra(6); a.dazn ? titoloDazn.scrollIntoView({ behavior: MENO_MOTO.matches ? 'auto' : 'smooth', block: 'start' }) : apriApp(a.id); } },
      tessera(a, 58), h('span', { class: 'nome' }, a.nome), daProvare(a) && h('span', { class: 'provare', 'aria-hidden': 'true' }, 'da provare'))));
    legenda.hidden = !tutte.some(daProvare);
    cascata(scaffale);
  };
  const disegnaCanali = () => {
    const cs = (S.scelte && S.scelte.canali) || [];
    if (!cs.length) { canali.replaceChildren(h('div', { class: 'carta vuoto', style: { flex: '1' } }, 'Nessun canale DAZN in onda adesso.')); return; }
    canali.replaceChildren(...cs.map(k => {
      let tinta = 0;
      for (const ch of k.titolo) tinta = (tinta * 31 + ch.charCodeAt(0)) % 360;
      return h('button', { class: 'canale' + (k.eventId === scelto() ? ' scelto' : ''), type: 'button', style: { '--h': tinta },
        onclick: () => { vibra(6); scegli({ tipo: 'dazn_canale', titolo: k.titolo, eventId: k.eventId }); } },
        h('span', { class: 'in-onda' }, 'IN ONDA'), h('b', null, k.titolo));
    }));
    cascata(canali);
  };
  const disegnaEventi = (animata = true) => {
    const tutti = (S.scelte && S.scelte.eventi) || [];
    const conti = {};
    tutti.forEach(e => { if (e.sport) conti[e.sport] = (conti[e.sport] || 0) + 1; });
    if (sport && !conti[sport]) sport = null;
    filtri.replaceChildren(...[['', 'Tutti', tutti.length], ...Object.entries(conti).map(([k, n]) => [k, k, n])].map(([k, nome, n]) =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String((sport || '') === k),
        onclick: () => { vibra(6); sport = k || null; disegnaEventi(); } }, nome, h('small', null, n))));
    const q = cerca.value.trim().toLowerCase();
    // in ordine di ora (quelli in corso per primi): il servizio non promette un ordine
    const elenco = tutti.filter(e => (!sport || e.sport === sport) &&
      (!q || (e.titolo + ' ' + (e.competizione || '') + ' ' + (e.sport || '')).toLowerCase().includes(q)))
      .sort((a, b) => (b.in_corso === true) - (a.in_corso === true) || (+leggiData(a.inizio) || Infinity) - (+leggiData(b.inizio) || Infinity) || 0)
      .slice(0, 60);
    if (!elenco.length) {
      eventi.replaceChildren(h('div', { class: 'grp' }, h('div', { class: 'vuoto' }, ic('cerca'), q ? 'Niente che corrisponda a «' + cerca.value.trim() + '».' : 'Niente da mostrare.')));
      return;
    }
    // per giorno: "In corso", "Oggi", "Domani", "Sabato 4 ottobre"
    const gruppi = [];
    for (const e of elenco) {
      const d = leggiData(e.inizio);
      const chiave = e.in_corso ? 'In corso' : d ? maiuscola(nomeGiorno(d, true)) : 'Senza data';
      let g = gruppi.find(x => x.chiave === chiave);
      if (!g) gruppi.push(g = { chiave, voci: [] });
      g.voci.push(e);
    }
    const nodi = [];
    for (const g of gruppi) {
      nodi.push(h('p', { class: 'giorno-testa' }, g.chiave));
      nodi.push(h('div', { class: 'grp eventi' }, g.voci.map(e => {
        const d = leggiData(e.inizio);
        const assegnato = e.eventId === scelto();
        return h('button', { class: 'riga tocca', type: 'button', onclick: () => { vibra(6); scegli({ tipo: 'dazn_partita', titolo: e.titolo, eventId: e.eventId, inizio: e.inizio }); } },
          h('span', { class: 'ora-ev' }, e.in_corso ? h('span', { class: 'dal-vivo' }, 'LIVE') : [h('b', null, d ? hm(d) : '—'), d && traGiorni(d) > 1 ? h('small', null, GG[d.getDay()]) : null]),
          h('span', { class: 'corpo' }, h('span', { class: 't1' }, e.titolo), h('span', { class: 't2' }, [e.competizione, e.sport].filter(Boolean).join(' · '))),
          assegnato ? ic('spunta', 'spunta-ok') : ic('avanti', 'chev'));
      })));
    }
    eventi.replaceChildren(...nodi);
    if (animata) cascata(eventi);
  };
  let attesa = 0;
  cerca.addEventListener('input', () => { clearTimeout(attesa); attesa = setTimeout(() => disegnaEventi(false), 90); });

  appSeServe().then(() => { if (c.vivo) disegnaScaffale(); });
  if (!S.tasto) caricaTasto().catch(() => {});
  const leggi = () => caricaScelte().then(() => { if (c.vivo) { disegnaCanali(); disegnaEventi(); } }).catch(e => {
    if (!c.vivo) return;
    const msg = e.stato === 0 ? 'Il servizio non risponde.' : 'Non riesco a leggere la guida DAZN: ' + messaggio(e);
    canali.replaceChildren(h('div', { class: 'carta vuoto', style: { flex: '1' } }, msg));
    eventi.replaceChildren(h('div', { class: 'grp' }, h('div', { class: 'vuoto' }, ic('spina'), msg,
      h('div', { style: { 'margin-top': '12px' } }, h('button', { class: 'btn piccolo secondario', type: 'button', onclick: () => { eventi.replaceChildren(scheletroRighe(4)); leggi(); } }, 'Riprova')))));
  });
  if (S.scelte) { disegnaCanali(); disegnaEventi(); }
  leggi();
}

function scheletroRighe(n) {
  return h('div', { class: 'grp' }, Array.from({ length: n }, () => h('div', { class: 'riga-osso' },
    h('span', { class: 'osso', style: { width: '40px', height: '30px', flex: 'none' } }),
    h('div', { style: { flex: '1' } }, h('span', { class: 'osso', style: { display: 'block', width: '70%', height: '14px' } }),
      h('span', { class: 'osso', style: { display: 'block', width: '40%', height: '11px', 'margin-top': '8px' } })))));
}

function vistaApp(v, id, c) {
  impostaBarra({ titolo: '', indietro: { testo: 'Sfoglia', href: '#/sfoglia' } });
  const corpo = h('div');
  v.append(corpo);
  appSeServe().then(() => {
    if (!c.vivo) return;
    const app = appDa(id);
    if (!app) {
      corpo.replaceChildren(h('div', { class: 'schermo-centro', style: { 'min-height': '70vh' } },
        h('div', { class: 'bolla' }, ic('sfoglia')), h('h1', null, 'App non trovata'),
        h('p', null, 'Nel catalogo non c\'è (o non è ancora stata provata sulla chiavetta del nonno).'),
        h('a', { class: 'btn secondario', href: '#/sfoglia' }, 'Torna a Sfoglia')));
      return;
    }
    impostaBarra({ titolo: app.nome, indietro: { testo: 'Sfoglia', href: '#/sfoglia' } });
    paginaApp(v, app, { scegli: d => apriConferma(d), c });
  });
}

/* Le avvertenze per la famiglia, brevi e sobrie. Il catalogo puo' darle col
   campo "avvisi" (una lista di frasi); finche' non c'e', valgono queste,
   prese dalle note di Discover. Quella sull'accesso vale per tutte. */
const AVVISI_NOTI = {
  primevideo: ['Solo i titoli inclusi in Prime: quelli a noleggio aprirebbero la pagina d\'acquisto.'],
  netflix: ['Sull\'account tieni un solo profilo, o il nonno si troverà davanti «Chi guarda?».'],
  raiplay: ['Prima del video può esserci la pubblicità.'],
  mediaset: ['Prima del video può esserci la pubblicità.'],
};
function avvisiApp(app) {
  const propri = Array.isArray(app.avvisi) ? app.avvisi : (AVVISI_NOTI[app.id] || []);
  return [...propri, 'L\'accesso a ' + app.nome + ' va fatto una volta sola, sulla chiavetta del nonno.'];
}

/* La pagina di un'app: il suo colore fa da accento (alone in alto, icone dei
   modi, pulsante), e per ogni modo del catalogo un pezzo fatto apposta. I modi
   "link" diventano un campo solo: il link incollato si prova su tutti, in
   ordine, e vince il primo che lo riconosce. */
function paginaApp(cont, app, { scegli }) {
  cont.classList.add('pagina-app');
  for (const [k, val] of Object.entries(variabiliApp(app.colore || '#6b6860'))) cont.style.setProperty(k, val);
  const pezzi = [h('div', { class: 'app-eroe' }, tessera(app, 92), h('h1', null, app.nome),
    h('div', { class: 'etichette' }, daProvare(app)
      ? h('span', { class: 'etichetta ambra' }, ic('avviso'), 'Da provare sulla chiavetta')
      : h('span', { class: 'etichetta verde' }, ic('scudo'), 'Provata sulla TV del nonno')))];
  const modi = app.modi && app.modi.length ? app.modi : [{ tipo: 'apri' }];
  const link = modi.filter(m => m.tipo === 'link');
  for (const m of modi) {
    if (m.tipo === 'apri') pezzi.push(modoApri(app, m, scegli));
    else if (m.tipo === 'link' && m === link[0]) pezzi.push(modoLink(app, link, scegli));
    else if (m.tipo === 'diretta') pezzi.push(modoDiretta(app, m, scegli));
  }
  pezzi.push(h('div', { class: 'carta da-sapere' }, h('p', { class: 'eye' }, 'Da sapere'),
    h('ul', null, avvisiApp(app).map(t => h('li', null, t)))));
  // le note intere del catalogo sono tecniche (versioni, pacchetti, prove al banco): solo per l'admin
  if (app.note && S.io && S.io.ruolo === 'admin') {
    pezzi.push(h('details', { class: 'carta app-nota' }, h('summary', null, ic('info'), h('span', null, 'Note tecniche, per te')), h('p', null, app.note)));
  }
  const box = h('div', null, pezzi);
  cont.append(box);
  cascata(box);
}

function modoApri(app, m, scegli) {
  return h('div', { class: 'modo' }, h('button', { class: 'modo-testa', type: 'button',
    onclick: () => { vibra(6); scegli({ tipo: 'app', app_id: app.id, titolo: app.nome }); } },
    h('span', { class: 'modo-ic' }, ic('apri')),
    h('span', { class: 'corpo' }, h('span', { class: 't1' }, m.etichetta || 'Apri ' + app.nome),
      h('span', { class: 't2' }, 'Il tasto apre ' + app.nome + ' sulla sua schermata iniziale.')),
    ic('avanti', 'chev')));
}

/* Il link incollato si riconosce mentre lo si scrive. Dal telefono spesso si
   condivide una frase ("Guarda X su Netflix https://..."): si prende il primo
   indirizzo, poi si provano le regole "accetta" cosi' come sono (new RegExp,
   senza flag: valgono uguali in Python, e il servizio rifa' lo stesso
   controllo), e si trasforma con "trasforma" ({1}, {2}... i gruppi presi). */
function riconosci(modi, testo) {
  let t = String(testo || '').trim();
  const dentro = /https?:\/\/\S+/.exec(t);
  if (dentro) t = dentro[0];
  if (!t) return null;
  for (const m of modi) {
    for (const regola of m.accetta || []) {
      let r;
      try { r = new RegExp(regola).exec(t); } catch (e) { continue; }
      if (r) return { url: (m.trasforma || '{0}').replace(/\{(\d+)\}/g, (x, n) => r[+n] || ''), originale: t, modo: m };
    }
  }
  return false;
}
function cosaRiconosce(app, m) {
  if (m.riconosce) return m.riconosce;
  const e = String(m.etichetta || '').toLowerCase();
  if (/video/.test(e) && !/diretta/.test(e)) return 'video di ' + app.nome;
  if (/film|serie|titolo|programma|episodio/.test(e)) return 'titolo di ' + app.nome;
  return 'link di ' + app.nome;
}

function modoLink(app, modi, scegli) {
  const primo = modi[0];
  const esempio = primo.esempio;
  const input = h('input', { type: 'url', inputmode: 'url', placeholder: esempio || 'https://…', autocapitalize: 'off', autocorrect: 'off',
    spellcheck: 'false', autocomplete: 'off', 'aria-label': primo.etichetta || 'Link', enterkeyhint: 'done' });
  const incolla = navigator.clipboard && navigator.clipboard.readText
    ? h('button', { class: 'btn-pillola', type: 'button' }, ic('appunti'), 'Incolla') : null;
  const esito = h('div', { class: 'riconosce', 'aria-live': 'polite' });
  const nome = h('input', { type: 'text', maxlength: '40', placeholder: app.nome, 'aria-label': 'Nome sul display', enterkeyhint: 'done' });
  const conta = h('span', { class: 'conta' }, '0/40');
  const vai = h('button', { class: 'btn app', type: 'button', disabled: true }, 'Continua');
  let preso = null;

  const valuta = () => {
    const r = riconosci(modi, input.value);
    preso = r || null;
    vai.disabled = !r;
    if (r === null) {
      esito.className = 'riconosce';
      esito.replaceChildren(ic('info'), h('div', null, 'Copia il link dall\'app sul telefono e incollalo qui.',
        esempio && h('span', { class: 'mono' }, 'Per esempio: ' + esempio)));
    } else if (r) {
      esito.className = 'riconosce ok';
      esito.replaceChildren(ic('spunta'), h('div', null, h('b', null, 'Riconosciuto: ' + cosaRiconosce(app, r.modo)), h('span', { class: 'mono' }, r.url)));
      vibra(8);
    } else {
      esito.className = 'riconosce ko';
      esito.replaceChildren(ic('avviso'), h('div', null, h('b', null, 'Non riconosco questo link.'),
        ' Se è un link corto (amzn.eu, a.co, netflix.app.link…), aprilo e copia quello completo dalla barra degli indirizzi.',
        esempio && h('span', { class: 'mono' }, 'Funziona un link così: ' + esempio)));
    }
  };
  input.addEventListener('input', valuta);
  nome.addEventListener('input', () => { conta.textContent = nome.value.length + '/40'; });
  if (incolla) incolla.addEventListener('click', async () => {
    try {
      const t = await navigator.clipboard.readText();
      input.value = t.trim();
      valuta();
      if (!preso) scuoti(esito);
    } catch (e) {
      avvisa('Il telefono non mi lascia leggere gli appunti: tieni premuto nel campo e scegli Incolla.', 'info', 4200);
    }
  });
  vai.addEventListener('click', () => {
    if (!preso) return;
    scegli({ tipo: 'app', app_id: app.id, titolo: (nome.value.trim() || app.nome).slice(0, 40), url: preso.url });
  });
  valuta();
  return h('div', { class: 'modo' },
    h('div', { class: 'modo-testa' }, h('span', { class: 'modo-ic' }, ic('link')),
      h('span', { class: 'corpo' }, h('span', { class: 't1' }, primo.etichetta || 'Incolla un link'),
        h('span', { class: 't2' }, 'Il tasto apre proprio quello, non la pagina iniziale.'))),
    h('div', { class: 'modo-corpo' },
      h('div', { class: 'campo' }, ic('link'), input, incolla), esito,
      h('p', { class: 'etich-campo' }, 'Nome sul display del nonno'),
      h('div', { class: 'campo' }, nome, conta),
      h('div', { style: { 'margin-top': '16px' } }, vai)));
}

function siglaDiretta(t) {
  const p = String(t || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  const ultimo = p[p.length - 1];
  return (p[0].charAt(0) + (/^\d+$/.test(ultimo) ? ultimo : p[1].charAt(0))).toUpperCase().slice(0, 3);
}
function modoDiretta(app, m, scegli) {
  const elementi = m.elementi || [];
  return h('div', { class: 'modo' },
    h('div', { class: 'modo-testa' }, h('span', { class: 'modo-ic' }, ic('diretta')),
      h('span', { class: 'corpo' }, h('span', { class: 't1' }, m.etichetta || 'In diretta'),
        h('span', { class: 't2' }, 'Il tasto mette su il canale, già in onda.'))),
    h('div', { class: 'grp dirette' }, elementi.length ? elementi.map(el => h('button', { class: 'riga tocca', type: 'button',
      onclick: () => { vibra(6); scegli({ tipo: 'app', app_id: app.id, titolo: el.titolo, url: el.url }); } },
      h('span', { class: 'mini-diretta' }, siglaDiretta(el.titolo)),
      h('span', { class: 'corpo' }, h('span', { class: 't1' }, el.titolo), h('span', { class: 't2' }, h('span', { class: 'punto-vivo' }), 'In diretta')),
      ic('avanti', 'chev'))) : h('div', { class: 'vuoto' }, 'Nessun canale nel catalogo.')));
}

// ------------------------------------------------------------ il foglio di conferma

function apriConferma(dest) {
  const info = infoDest(dest);
  const app = dest.tipo === 'app' ? appDa(dest.app_id) : null;
  apriFoglio({ titolo: 'Assegna al tasto', corpo: (corpo, f) => {
    const note = [];
    const inizio = dest.tipo === 'dazn_partita' && leggiData(dest.inizio);
    if (inizio && inizio > new Date()) {
      note.push(h('div', { class: 'avviso' }, ic('avviso'), h('span', null, `Comincia ${quando(inizio)}: se il nonno preme prima, DAZN gli mostra la scheda dell'evento, non la diretta.`)));
    }
    if (S.tasto && S.tasto.tasto && S.tasto.tasto.motivo === 'squadra') {
      note.push(h('div', { class: 'avviso verde' }, ic('pallone'), h('span', null, 'Adesso c\'è la partita della squadra, che viene sempre prima: la tua scelta vale da quando finisce.')));
    }
    if (app && daProvare(app)) {
      note.push(h('div', { class: 'avviso' }, ic('avviso'), h('span', null, app.nome + ' non è ancora stata provata sulla chiavetta del nonno: potrebbe non aprirsi.')));
    }
    const errore = h('p', { class: 'errore', role: 'alert', hidden: true });
    const assegna = h('button', { class: 'btn', type: 'button' }, ic('tasto'), 'Assegna al tasto');
    const programma = h('button', { class: 'btn secondario', type: 'button' }, ic('calendario_piu'), 'Programma…');
    assegna.addEventListener('click', async () => {
      inCorso(assegna, true); errore.hidden = true;
      try {
        await api('/api/tasto', { metodo: 'POST', corpo: dest });
        S.tasto = null;
        corpo.replaceChildren(fattoGrande('Fatto', 'Adesso il tasto porta a «' + dest.titolo + '».'));
        caricaTasto().catch(() => {});
        await dopo(1300);
        f.chiudi();
        if (leggiHash().nome !== 'home') vai('#/home'); else ricarica();
      } catch (e) {
        inCorso(assegna, false);
        errore.replaceChildren(ic('avviso'), h('span', null, messaggio(e)));
        errore.hidden = false;
        scuoti(errore);
      }
    });
    programma.addEventListener('click', () => {
      S.bozza = { destinazione: dest };
      f.chiudi();
      setTimeout(() => vai('#/palinsesto/nuovo'), MENO_MOTO.matches ? 0 : 260);
    });
    corpo.append(
      h('div', { class: 'grp conferma-dest' }, tessera(info, 56), h('div', { style: { 'min-width': '0' } }, h('b', null, dest.titolo), h('span', null, info.sotto))),
      h('p', { class: 'etich' }, 'Sul display del nonno'),
      displayFinto(dest.titolo),
      note.length && h('div', { style: { display: 'grid', gap: '8px', 'margin-top': '16px' } }, note),
      errore,
      h('div', { class: 'bottoni' }, assegna, programma));
  } });
}

// ------------------------------------------------------------ palinsesto (#/palinsesto)

const MODI_EVENTO = {
  in_onda: { ic: 'tv', classe: 'verde', t: 'Va in onda da sola', s: 'All\'ora giusta la TV si accende e lo mette su. Il nonno non deve fare niente.' },
  tasto: { ic: 'tasto', classe: 'blu', t: 'Prepara il tasto', s: 'All\'ora giusta il tasto porta lì e il display lo annuncia per 30 minuti: il nonno preme quando vuole.' },
};
function testoRipeti(ev) {
  const q = leggiData(ev.quando);
  if (ev.ripeti === 'ogni_giorno') return 'Ogni giorno';
  if (ev.ripeti === 'ogni_settimana') return 'Ogni ' + (q ? GIORNI[q.getDay()] : 'settimana');
  return null;
}

/* Quando cade un evento in un dato giorno (o null). Gli eventi che si
   ripetono partono dal giorno di "quando"; quelli singoli stanno sul loro. */
function cadeIl(ev, giorno) {
  const q = leggiData(ev.quando) || leggiData(ev.prossima);
  if (!q) return null;
  const g0 = inizioGiorno(q);
  let ok;
  if (ev.ripeti === 'ogni_giorno') ok = giorno >= g0;
  else if (ev.ripeti === 'ogni_settimana') ok = giorno >= g0 && giorno.getDay() === q.getDay();
  else ok = stessoGiorno(giorno, q);
  if (!ok) return null;
  const d = new Date(giorno);
  d.setHours(q.getHours(), q.getMinutes(), 0, 0);
  return d;
}
function coloreEvento(ev) {
  const d = ev.destinazione;
  if (!d || d.tipo !== 'app') return '#3b9a62';          // DAZN: il verde del progetto, il nero non si vede
  return infoDest(d).colore;
}

function vistaPalinsesto(v, arg, c) {
  const oggi = inizioGiorno(new Date());
  let scelto = oggi;
  impostaBarra({ titolo: 'Palinsesto', azione: h('button', { class: 'bottone-tondo', type: 'button', 'aria-label': 'Nuovo evento',
    onclick: () => { vibra(8); apriNuovoEvento({ giorno: scelto }); } }, ic('piu')) });
  v.append(titoloGrande(maiuscola(MESI[oggi.getMonth()]) + ' ' + oggi.getFullYear(), 'Palinsesto'));
  const striscia = h('div', { class: 'giorni', role: 'tablist', 'aria-label': 'Giorni' });
  const titoloGiorno = h('p', { class: 'giorno-titolo' });
  const lista = h('div', { class: 'linea' });
  v.append(striscia, titoloGiorno, lista,
    h('p', { class: 'nota', style: { 'margin-top': '18px' } }, 'La partita della squadra ha sempre la precedenza: un evento che cade mentre gioca viene saltato, e qui lo vedi scritto.'));

  const giorni = Array.from({ length: 21 }, (x, i) => { const d = new Date(oggi); d.setDate(d.getDate() + i); return d; });

  const disegnaStriscia = () => {
    const evs = S.palinsesto || [];
    striscia.replaceChildren(...giorni.map(g => {
      const colori = evs.filter(e => cadeIl(e, g)).slice(0, 3).map(coloreEvento);
      const b = h('button', { class: 'giorno' + (stessoGiorno(g, oggi) ? ' oggi' : ''), type: 'button', role: 'tab',
        'aria-selected': String(stessoGiorno(g, scelto)), 'aria-label': nomeGiorno(g, true) + (colori.length ? ', ' + colori.length + ' eventi' : '') },
        h('small', null, GG[g.getDay()]), h('b', null, g.getDate()),
        h('span', { class: 'puntini' }, colori.map(col => h('i', { style: { '--c': col } }))));
      b.addEventListener('click', () => {
        if (stessoGiorno(g, scelto)) return;
        vibra(6);
        scelto = g;
        striscia.querySelectorAll('.giorno').forEach(x => x.setAttribute('aria-selected', String(x === b)));
        disegnaGiorno();
      });
      return b;
    }));
  };

  const disegnaGiorno = (animata = true) => {
    const k = traGiorni(scelto);
    titoloGiorno.replaceChildren(h('b', null, maiuscola(nomeGiorno(scelto))), k <= 1 && k >= 0 ? ' · ' + GIORNI[scelto.getDay()] + ' ' + scelto.getDate() + ' ' + MESI[scelto.getMonth()] : '');
    const adesso = new Date();
    const voci = (S.palinsesto || []).map(ev => ({ ev, q: cadeIl(ev, scelto) })).filter(x => x.q).sort((a, b) => a.q - b.q);
    if (!voci.length) {
      lista.replaceChildren(h('div', { class: 'carta vuoto-giorno' },
        h('div', { class: 'bolla' }, ic('palinsesto')), h('h3', null, 'Niente in programma'),
        h('p', null, k === 0 ? 'Oggi il tasto fa solo il suo solito: la partita, o quello che scegli tu.' : 'Aggiungi qualcosa che il nonno guarderà ' + nomeGiorno(scelto) + '.'),
        h('button', { class: 'btn piccolo', type: 'button', onclick: () => apriNuovoEvento({ giorno: scelto }), style: { margin: '0 auto' } }, ic('piu'), 'Nuovo evento')));
      if (animata) lista.firstChild.classList.add('entra');
      return;
    }
    const nodi = [];
    let segnato = k !== 0;
    for (const { ev, q } of voci) {
      if (!segnato && q > adesso) {
        nodi.push(h('div', { class: 'adesso', 'aria-label': 'Adesso' }, h('b', null, hm(adesso)), h('i')));
        segnato = true;
      }
      nodi.push(rigaEvento(ev, q, q < adesso, () => { S.palinsesto = (S.palinsesto || []).filter(x => x.id !== ev.id); disegnaStriscia(); }));
    }
    if (!segnato) nodi.push(h('div', { class: 'adesso' }, h('b', null, hm(adesso)), h('i')));
    lista.replaceChildren(...nodi);
    if (animata) cascata(lista);
  };

  const aggiorna = async () => {
    try {
      await Promise.all([caricaPalinsesto(), appSeServe()]);
      if (!c.vivo) return;
      disegnaStriscia();
      disegnaGiorno(false);
    } catch (e) {
      if (c.vivo && e.stato === 0 && !S.palinsesto) schermoOffline(v, () => caricaPalinsesto().then(() => naviga()));
    }
  };
  c.ridisegna = () => { disegnaStriscia(); disegnaGiorno(); };
  palinsestoVivo = c;
  c.pulisci(() => { if (palinsestoVivo === c) palinsestoVivo = null; });

  if (S.palinsesto) { disegnaStriscia(); disegnaGiorno(); }
  else { disegnaStriscia(); lista.replaceChildren(scheletroRighe(3)); }
  caricaPalinsesto().then(() => appSeServe()).then(() => { if (c.vivo) { disegnaStriscia(); disegnaGiorno(); } })
    .catch(e => { if (c.vivo && e.stato === 0) schermoOffline(v, () => caricaPalinsesto().then(() => naviga())); });
  c.ogni(60000, aggiorna);
  c.alRitorno = aggiorna;
  c.sotto = a => { if (a[0] === 'nuovo') apriNuovoEvento({ giorno: scelto }); };
  if (arg[0] === 'nuovo' || S.bozza) setTimeout(() => { if (c.vivo) apriNuovoEvento({ giorno: scelto }); }, MENO_MOTO.matches ? 0 : 280);
}
let palinsestoVivo = null;

function rigaEvento(ev, q, passato, toltoDaQui) {
  const d = ev.destinazione || {};
  const info = infoDest(d);
  const modo = MODI_EVENTO[ev.modo] || MODI_EVENTO.in_onda;
  const rip = testoRipeti(ev);
  const ue = ev.ultimo_esito;
  const esitoQui = ue && stessoGiorno(leggiData(ue.quando), q) ? ue : null;
  const ESITO = { eseguito: ['spunta', 'Fatto'], saltato: ['avviso', 'Saltato'], fallito: ['avviso', 'Non riuscito'] };
  const carta = h('button', { class: 'ev-carta', type: 'button', style: { '--c': coloreEvento(ev) }, 'aria-label': (ev.titolo || d.titolo) + ', ' + hm(q) },
    h('div', { class: 'ev-titolo' }, ev.titolo || d.titolo || 'Evento'),
    h('div', { class: 'ev-meta' }, tessera(info, 20), h('span', null, info.sotto), rip && h('span', { style: { display: 'inline-flex', 'align-items': 'center', gap: '4px' } }, '·', ic('ripeti'), rip)),
    h('div', { class: 'etichette' }, h('span', { class: 'etichetta ' + modo.classe }, ic(modo.ic), modo.t)),
    esitoQui && h('div', { class: 'ev-esito ' + esitoQui.esito }, ic((ESITO[esitoQui.esito] || ESITO.fallito)[0]),
      h('span', null, (ESITO[esitoQui.esito] || ['', esitoQui.esito])[1] + (esitoQui.perche ? ': ' + esitoQui.perche : ''))));

  const elimina = async conferma => {
    if (conferma) {
      const si = await chiedi({ titolo: 'Eliminare «' + (ev.titolo || d.titolo) + '»?', testo: ev.ripeti !== 'no' ? 'Sparisce per tutte le volte, non solo per questa.' : null, si: 'Elimina evento', pericolo: true });
      if (!si) return false;
    }
    try {
      await api('/api/palinsesto/' + encodeURIComponent(ev.id), { metodo: 'DELETE' });
      vibra([10, 30, 10]);
      // la riga si chiude su se stessa, poi sparisce
      const alto = riga.offsetHeight;
      riga.style.height = alto + 'px';
      riga.style.overflow = 'hidden';
      raf2(() => { riga.style.transition = 'height .35s ease, opacity .3s, margin .35s'; riga.style.height = '0px'; riga.style.opacity = '0'; riga.style.marginBottom = '0px'; });
      setTimeout(() => { riga.remove(); toltoDaQui(); }, MENO_MOTO.matches ? 0 : 380);
      avvisa('Eliminato dal palinsesto', 'ok');
      return true;
    } catch (e) { avvisa(messaggio(e), 'errore'); carta.style.transform = ''; return false; }
  };
  const scorre = scorrevole(carta, () => elimina(false));
  carta.addEventListener('click', () => { if (scorre.mosso()) return; if (scorre.aperta()) { scorre.chiudi(); return; } apriDettaglioEvento(ev, q, () => elimina(true)); });
  const riga = h('div', { class: 'ev' + (passato ? ' passato' : '') },
    h('div', { class: 'ev-ora' }, h('b', null, hm(q)), passato ? h('small', null, 'passato') : null), scorre.el);
  return riga;
}

/* Scorri a sinistra per eliminare, come nella Posta di iPhone: la carta si
   sposta e sotto compare il rosso; tirata fino in fondo, elimina da sola. */
function scorrevole(carta, alElimina) {
  const dietro = h('button', { class: 'dietro', type: 'button', tabindex: '-1', 'aria-hidden': 'true' }, ic('cestino'), h('span', null, 'Elimina'));
  const el = h('div', { class: 'scorrevole' }, dietro, carta);
  let x0 = null, y0 = 0, dx = 0, asse = null, aperta = false, mosso = false;
  const imposta = x => { carta.style.transform = x ? `translateX(${x}px)` : ''; };
  carta.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; asse = null; mosso = false; dx = aperta ? -88 : 0; });
  carta.addEventListener('pointermove', e => {
    if (x0 == null) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!asse && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      asse = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (asse === 'x') { carta.style.transition = 'none'; try { carta.setPointerCapture(e.pointerId); } catch (err) { /* pazienza */ } }
    }
    if (asse !== 'x') return;
    mosso = true;
    dx = Math.min(12, (aperta ? -88 : 0) + mx);
    if (dx < -88) dx = -88 + (dx + 88) * .55;           // oltre il bottone, fa resistenza
    imposta(dx);
  });
  const fine = () => {
    if (x0 == null) return;
    x0 = null;
    carta.style.transition = '';
    if (asse !== 'x') return;
    if (dx < -180) { imposta(-el.offsetWidth); alElimina(); return; }
    aperta = dx < -44;
    imposta(aperta ? -88 : 0);
    if (aperta) vibra(6);
  };
  carta.addEventListener('pointerup', fine);
  carta.addEventListener('pointercancel', fine);
  dietro.addEventListener('click', alElimina);
  return { el, aperta: () => aperta, mosso: () => mosso, chiudi: () => { aperta = false; imposta(0); } };
}

function apriDettaglioEvento(ev, q, elimina) {
  const d = ev.destinazione || {};
  const info = infoDest(d);
  const modo = MODI_EVENTO[ev.modo] || MODI_EVENTO.in_onda;
  const prossima = leggiData(ev.prossima);
  const ue = ev.ultimo_esito;
  apriFoglio({ titolo: 'Evento', corpo: (corpo, f) => {
    const righe = [
      ['orologio', 'Quando', prossima ? maiuscola(quando(prossima)) : maiuscola(quando(q)) + ' (passato)'],
      testoRipeti(ev) && ['ripeti', 'Si ripete', testoRipeti(ev)],
      ['persona', 'L\'ha messo', ev.creato_da || '—'],
    ].filter(Boolean);
    const togli = h('button', { class: 'btn pericolo', type: 'button' }, ic('cestino'), 'Elimina evento');
    togli.addEventListener('click', async () => { inCorso(togli, true); const ok = await elimina(); inCorso(togli, false); if (ok) f.chiudi(); });
    corpo.append(
      h('div', { class: 'grp conferma-dest' }, tessera(info, 56), h('div', { style: { 'min-width': '0' } }, h('b', null, ev.titolo || d.titolo), h('span', null, info.sotto + (d.titolo && ev.titolo && d.titolo !== ev.titolo ? ' · ' + d.titolo : '')))),
      h('div', { class: 'grp con-icone', style: { 'margin-top': '14px' } }, righe.map(([i, t, val]) => h('div', { class: 'riga' },
        h('span', { class: 'ic-tondo' }, ic(i)), h('span', { class: 'corpo' }, h('span', { class: 't2', style: { 'margin-top': '0' } }, t), h('span', { class: 't1' }, val))))),
      h('div', { class: 'avviso ' + (ev.modo === 'tasto' ? 'blu' : 'verde'), style: { 'margin-top': '14px' } }, ic(modo.ic), h('span', null, h('b', null, modo.t + '. '), modo.s)),
      ue && h('div', { class: 'avviso ' + (ue.esito === 'eseguito' ? 'verde' : ue.esito === 'saltato' ? '' : 'rosso'), style: { 'margin-top': '8px' } },
        ic(ue.esito === 'eseguito' ? 'spunta' : 'avviso'),
        h('span', null, 'L\'ultima volta (' + (leggiData(ue.quando) ? quando(leggiData(ue.quando)) : ue.quando) + '): ' +
          ({ eseguito: 'fatto', saltato: 'saltato', fallito: 'non riuscito' }[ue.esito] || ue.esito) + (ue.perche ? ', ' + ue.perche : '') + '.')),
      h('div', { class: 'bottoni' }, togli));
  } });
}

function segmenti(opzioni, valore, alCambio) {
  const cursore = h('span', { class: 'cursore' });
  const el = h('div', { class: 'segmenti', role: 'radiogroup', style: { '--n': opzioni.length } }, cursore);
  const imposta = v => {
    const k = Math.max(0, opzioni.findIndex(o => o[0] === v));
    el.style.setProperty('--k', k);
    el.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-checked', String(i === k)));
    el.valore = opzioni[k][0];
  };
  opzioni.forEach(([v, t]) => el.append(h('button', { type: 'button', role: 'radio', onclick: () => { vibra(6); imposta(v); alCambio && alCambio(v); } }, t)));
  imposta(valore);
  return el;
}

function prossimoOrario(giorno) {
  const ora = new Date();
  const d = new Date(giorno || ora);
  if (stessoGiorno(d, ora)) {
    d.setHours(ora.getHours(), ora.getMinutes() + 30, 0, 0);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  } else d.setHours(21, 0, 0, 0);
  return d;
}

function apriNuovoEvento({ giorno } = {}) {
  const bozza = { destinazione: (S.bozza && S.bozza.destinazione) || null };
  S.bozza = null;
  apriFoglio({ titolo: 'Nuovo evento', alto: true,
    alChiudere: () => { if (location.hash.startsWith('#/palinsesto/')) history.replaceState(null, '', '#/palinsesto'); },
    corpo: (corpo, f) => {
      const cosa = h('button', { class: 'riga tocca', type: 'button' });
      const titolo = h('input', { type: 'text', maxlength: '40', placeholder: 'Come lo vede il nonno', 'aria-label': 'Titolo', enterkeyhint: 'done' });
      const conta = h('span', { class: 'conta' }, '0/40');
      const iniziale = prossimoOrario(giorno);
      const data = h('input', { type: 'date', class: 'pillola-input', value: isoGiorno(iniziale), min: isoGiorno(new Date()), 'aria-label': 'Giorno' });
      const ora = h('input', { type: 'time', class: 'pillola-input', value: hm(iniziale), step: '300', 'aria-label': 'Ora' });
      const notaRipeti = h('p', { class: 'nota' });
      const rip = segmenti([['no', 'Una volta'], ['ogni_giorno', 'Ogni giorno'], ['ogni_settimana', 'Ogni settimana']], 'no', () => aggiornaRipeti());
      const errore = h('p', { class: 'errore', role: 'alert', hidden: true });
      const salva = h('button', { class: 'btn', type: 'button' }, ic('calendario_piu'), 'Aggiungi al palinsesto');

      const disegnaCosa = () => {
        const dd = bozza.destinazione;
        if (dd) {
          const info = infoDest(dd);
          cosa.replaceChildren(tessera(info, 36), h('span', { class: 'corpo' }, h('span', { class: 't1' }, dd.titolo), h('span', { class: 't2' }, info.sotto)),
            h('span', { class: 'valore' }, 'Cambia'), ic('avanti', 'chev'));
          titolo.placeholder = dd.titolo;
        } else {
          cosa.replaceChildren(h('span', { class: 'ic-tondo' }, ic('sfoglia')), h('span', { class: 'corpo' }, h('span', { class: 't1 cosa-vuota' }, 'Scegli cosa guarderà')), ic('avanti', 'chev'));
        }
      };
      const aggiornaRipeti = () => {
        const d = new Date(data.value + 'T12:00');
        const r = rip.valore;
        notaRipeti.textContent = r === 'ogni_giorno' ? 'Tutti i giorni alla stessa ora, da questo giorno in poi.'
          : r === 'ogni_settimana' ? (isNaN(d) ? 'Ogni settimana.' : 'Ogni ' + GIORNI[d.getDay()] + ' alla stessa ora.') : 'Solo questa volta.';
      };
      data.addEventListener('change', aggiornaRipeti);
      titolo.addEventListener('input', () => { conta.textContent = titolo.value.length + '/40'; });
      cosa.addEventListener('click', () => apriSelettore(dd => { bozza.destinazione = dd; disegnaCosa(); errore.hidden = true; }));

      const opzioni = h('div', { class: 'opzioni-modo', role: 'radiogroup', 'aria-label': 'Come' }, Object.entries(MODI_EVENTO).map(([v, m], i) =>
        h('label', { class: 'opzione-modo' }, h('input', { type: 'radio', name: 'modo-ev', value: v, checked: i === 0 }),
          h('span', { class: 'ic-tondo ' + (v === 'tasto' ? 'blu' : '') }, ic(m.ic)),
          h('span', { class: 'corpo' }, h('span', { class: 't1' }, m.t), h('span', { class: 't2' }, m.s)),
          h('span', { class: 'spunta' }, ic('spunta')))));
      // la diretta impiega decine di secondi a partire (TV, app, buffer): per
      // vederla dall'inizio va programmata un minuto prima. Col "tasto" no: preme il nonno.
      const notaModo = h('p', { class: 'nota' });
      const aggiornaModo = () => {
        const inOnda = opzioni.querySelector('input:checked').value === 'in_onda';
        notaModo.hidden = !inOnda;
        notaModo.textContent = 'Programmalo un minuto prima: la diretta impiega alcune decine di secondi a partire.';
      };
      opzioni.addEventListener('change', aggiornaModo);
      aggiornaModo();

      salva.addEventListener('click', async () => {
        errore.hidden = true;
        if (!bozza.destinazione) {
          errore.replaceChildren(ic('avviso'), h('span', null, 'Prima scegli cosa guarderà il nonno.'));
          errore.hidden = false; scuoti(cosa); return;
        }
        if (!data.value || !ora.value) {
          errore.replaceChildren(ic('avviso'), h('span', null, 'Manca il giorno o l\'ora.'));
          errore.hidden = false; return;
        }
        const corpoEv = {
          quando: data.value + 'T' + ora.value.slice(0, 5), ripeti: rip.valore,
          modo: opzioni.querySelector('input:checked').value, destinazione: bozza.destinazione,
        };
        if (titolo.value.trim()) corpoEv.titolo = titolo.value.trim();
        inCorso(salva, true);
        try {
          const r = await api('/api/palinsesto', { metodo: 'POST', corpo: corpoEv });
          S.palinsesto = null;
          const q = leggiData((r.evento && (r.evento.prossima || r.evento.quando)) || corpoEv.quando);
          corpo.replaceChildren(fattoGrande('In palinsesto', (corpoEv.titolo || bozza.destinazione.titolo) + (q ? ', ' + quando(q) : '') + '.'));
          await caricaPalinsesto().catch(() => {});
          if (palinsestoVivo && palinsestoVivo.vivo) palinsestoVivo.ridisegna();
          await dopo(1300);
          f.chiudi();
          if (leggiHash().nome !== 'palinsesto') vai('#/palinsesto');
        } catch (e) {
          inCorso(salva, false);
          errore.replaceChildren(ic('avviso'), h('span', null, messaggio(e)));
          errore.hidden = false;
          scuoti(errore);
        }
      });

      disegnaCosa();
      aggiornaRipeti();
      corpo.append(
        h('p', { class: 'etich' }, 'Cosa'), h('div', { class: 'grp' }, cosa),
        h('p', { class: 'etich' }, 'Titolo'), h('div', { class: 'grp' }, h('div', { class: 'campo' }, titolo, conta)),
        h('p', { class: 'nota' }, 'Facoltativo: è quello che legge il nonno sul display.'),
        h('p', { class: 'etich' }, 'Quando'),
        h('div', { class: 'grp' }, h('label', { class: 'riga-quando' }, h('span', null, 'Giorno'), data), h('label', { class: 'riga-quando' }, h('span', null, 'Ora'), ora)),
        h('p', { class: 'etich' }, 'Ripeti'), rip, notaRipeti,
        h('p', { class: 'etich' }, 'Come'), opzioni, notaModo,
        h('p', { class: 'nota' }, 'Se a quell\'ora gioca la squadra, la partita viene prima e l\'evento si salta.'),
        errore, h('div', { class: 'bottoni' }, salva));
    } });
}

/* "Scegli cosa": il contenuto di Sfoglia dentro un foglio, con la pagina
   dell'app che entra da destra e "Indietro" per tornare. */
function apriSelettore(alScelto) {
  apriFoglio({ titolo: 'Scegli cosa', alto: true, corpo: (corpo, f) => {
    const vivo = { get vivo() { return !f.chiuso; } };
    const fine = d => { vibra(8); alScelto(d); f.chiudi(); };
    const radice = (daDestra = false) => {
      f.titolo('Scegli cosa');
      f.sinistra(null);
      const box = h('div', { class: daDestra ? 'entra-sinistra' : '' });
      corpo.replaceChildren(box);
      corpo.scrollTop = 0;
      contenutoSfoglia(box, vivo, { scegli: fine, apriApp: pagina });
    };
    const pagina = id => {
      const app = appDa(id);
      if (!app) return;
      f.titolo(app.nome);
      f.sinistra(h('button', { class: 'btn-testo', type: 'button', onclick: () => radice(true) }, ic('indietro'), 'Indietro'));
      const box = h('div', { class: 'entra-destra' });
      corpo.replaceChildren(box);
      corpo.scrollTop = 0;
      paginaApp(box, app, { scegli: fine });
    };
    radice();
  } });
}

// ------------------------------------------------------------ attivita' (#/attivita)

function vistaAttivita(v, arg, c) {
  impostaBarra({ titolo: 'Attività', azione: bottoneProfilo() });
  v.append(titoloGrande('Chi ha premuto, e com\'è andata', 'Attività'));
  const cifre = h('div', { class: 'cifre' });
  const storia = h('div', { class: 'storia' });
  v.append(cifre, storia);

  const disegna = () => {
    const es = (S.tasto && S.tasto.esiti) || [];
    const bene = es.filter(e => descriviEsito(e).bene).length;
    const nonno = es.filter(e => !e.chi ? e.da !== 'webapp' : e.chi === 'nonno').length;
    cifre.replaceChildren(
      h('div', { class: 'cifra-carta' }, h('b', null, es.length), h('span', null, es.length === 1 ? 'pressione' : 'pressioni')),
      h('div', { class: 'cifra-carta verde' }, h('b', null, bene, h('small', null, '/' + es.length)), h('span', null, 'andate bene')),
      h('div', { class: 'cifra-carta' }, h('b', null, nonno), h('span', null, 'dal tasto del nonno')));
    if (!storia._firma) cascata(cifre);
    const firma = JSON.stringify([es, (S.profili || []).length]);
    if (storia._firma === firma) return;
    const prima = !storia._firma;
    storia._firma = firma;
    if (!es.length) {
      storia.replaceChildren(h('div', { class: 'carta vuoto-giorno', style: { 'margin-top': '22px' } }, h('div', { class: 'bolla' }, ic('attivita')),
        h('h3', null, 'Ancora niente'), h('p', null, "Qui compare ogni pressione del tasto: del nonno, del palinsesto o di chi preme dall'app.")));
      return;
    }
    const nodi = [];
    let giornoPrima = null;
    for (const e of es) {
      const q = leggiData(e.quando);
      const g = q ? maiuscola(nomeGiorno(q, true)) : '';
      if (g !== giornoPrima) { nodi.push(h('p', { class: 'giorno-testa', style: { margin: '22px 4px 10px' } }, g)); giornoPrima = g; }
      const chi = chiE(e.chi || (e.da === 'webapp' ? null : 'nonno'));
      const d = descriviEsito(e);
      nodi.push(h('div', { class: 'fatto-voce' },
        h('div', { class: 'fatto-av' }, avatar(chi.p, 44), h('span', { class: 'fatto-bollo' + (d.bene ? '' : ' male') }, ic(d.bene ? 'spunta' : 'chiudi'))),
        h('div', { class: 'fatto-carta' },
          h('div', { class: 'fatto-cima' }, h('b', null, chi.nome + ({ nonno: ' dal tasto', palinsesto: '' }[chi.p] ?? " dall'app")), h('span', { class: 'quando-dx' }, q ? hm(q) : e.quando)),
          e.titolo && h('div', { class: 'fatto-cosa' }, e.titolo + (e.lunga ? ' (riaperto)' : '')),
          h('div', { class: 'fatto-esito ' + (d.bene ? 'esito-bene' : 'esito-male') }, ic(d.bene ? 'tv' : 'avviso'), h('span', null, d.testo)))));
    }
    nodi.push(h('p', { class: 'nota centro', style: { 'margin-top': '8px' } }, 'Le ultime ' + es.length + ' pressioni. Le più vecchie restano nel registro del servizio.'));
    storia.replaceChildren(...nodi);
    if (prima) cascata(storia);
  };
  if (S.tasto) disegna(); else storia.replaceChildren(h('div', { style: { 'margin-top': '22px' } }, scheletroRighe(4)));
  const aggiorna = () => Promise.all([caricaTasto(), profiliSeServe()]).then(() => { if (c.vivo) disegna(); })
    .catch(e => { if (c.vivo && e.stato === 0 && !S.tasto) schermoOffline(v, () => caricaTasto().then(() => naviga())); });
  aggiorna();
  c.ogni(20000, aggiorna);
  c.alRitorno = aggiorna;
}

// ------------------------------------------------------------ profili, per l'admin (#/admin)

function vistaAdmin(v, arg, c) {
  impostaBarra({ titolo: 'Profili', azione: bottoneProfilo() });
  v.append(titoloGrande('Solo per te, ' + S.io.nome, 'Profili'));
  const attesa = h('div'), attivi = h('div');
  v.append(attesa, attivi);

  const disegna = (animata = true) => {
    const tutti = S.profili || [];
    const inAttesa = tutti.filter(p => p.stato === 'in_attesa');
    const ok = tutti.filter(p => p.stato !== 'in_attesa');
    disegnaSchede('admin');
    attesa.replaceChildren(
      h('div', { class: 'sezione' }, h('h2', null, 'Da approvare')),
      inAttesa.length ? h('div', null, inAttesa.map(p => richiesta(p))) :
        h('div', { class: 'grp con-icone' }, h('div', { class: 'riga' }, h('span', { class: 'ic-tondo' }, ic('spunta')),
          h('span', { class: 'corpo' }, h('span', { class: 't1' }, 'Nessuna richiesta'), h('span', { class: 't2' }, 'Chi crea un profilo nuovo compare qui.')))));
    attivi.replaceChildren(
      h('div', { class: 'sezione' }, h('h2', null, 'Attivi'), h('span', { class: 'valore' }, ok.length)),
      h('div', { class: 'grp con-avatar' }, ok.map(p => h('div', { class: 'riga' }, avatar(p, 40),
        h('span', { class: 'corpo' }, h('span', { class: 't1' }, p.nome),
          p.ruolo === 'admin' ? h('span', { class: 'ruolo' }, 'Amministratore') : h('span', { class: 't2' }, 'Dal ' + dataBreve(p.creato_il))),
        p.ruolo === 'admin' ? null : h('button', { class: 'btn-testo rosso', type: 'button', onclick: () => rimuovi(p) }, 'Rimuovi')))),
      h('p', { class: 'nota' }, 'Chi rimuovi non può più entrare. Il tuo profilo non si rimuove da qui.'));
    if (animata) { cascata(attesa); cascata(attivi); }
  };
  const dataBreve = s => { const d = leggiData(s); return d ? d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '') : '—'; };

  function richiesta(p) {
    const si = h('button', { class: 'btn', type: 'button' }, ic('spunta'), 'Approva');
    const no = h('button', { class: 'btn secondario', type: 'button', style: { color: 'var(--rosso)' } }, 'Rifiuta');
    const quando0 = leggiData(p.creato_il);
    const carta = h('div', { class: 'richiesta' }, avatar(p, 52),
      h('div', { class: 'corpo' }, h('span', { class: 't1' }, p.nome), h('span', { class: 't2' }, 'Ha chiesto di entrare' + (quando0 ? ' ' + fa(quando0) : '') + '.'),
        h('div', { class: 'richiesta-bottoni' }, no, si)));
    si.addEventListener('click', async () => {
      inCorso(si, true);
      try {
        const r = await api('/api/admin/approva', { metodo: 'POST', corpo: { nome: p.nome } });
        S.profili = r.profili || S.profili;
        avvisa(p.nome + ' può usare il tasto', 'ok');
        disegna(false);
      } catch (e) { inCorso(si, false); avvisa(messaggio(e), 'errore'); }
    });
    no.addEventListener('click', () => rimuovi(p, true));
    return carta;
  }
  async function rimuovi(p, rifiuto = false) {
    const ok = await chiedi({ titolo: rifiuto ? 'Rifiutare ' + p.nome + '?' : 'Rimuovere ' + p.nome + '?',
      testo: rifiuto ? 'Il profilo si cancella. Potrà chiederlo di nuovo.' : 'Non potrà più entrare né usare il tasto da qui.',
      si: rifiuto ? 'Rifiuta' : 'Rimuovi', pericolo: true });
    if (!ok) return;
    try {
      const r = await api('/api/admin/rimuovi', { metodo: 'POST', corpo: { nome: p.nome } });
      S.profili = r.profili || S.profili;
      avvisa(rifiuto ? 'Richiesta rifiutata' : p.nome + ' rimosso', 'ok');
      disegna(false);
    } catch (e) { avvisa(messaggio(e), 'errore'); }
  }

  if (S.profili) disegna(); else attesa.replaceChildren(h('div', { style: { 'margin-top': '22px' } }, scheletroRighe(3)));
  const aggiorna = () => caricaProfili().then(() => { if (c.vivo) disegna(false); })
    .catch(e => { if (c.vivo && e.stato === 0 && !S.profili) schermoOffline(v, () => caricaProfili().then(() => naviga())); });
  caricaProfili().then(() => { if (c.vivo) disegna(); }).catch(() => {});
  c.ogni(30000, aggiorna);
  c.alRitorno = aggiorna;
}

// ------------------------------------------------------------ partenza

async function avvia() {
  try {
    const r = await api('/api/io');
    S.io = r.io || null;
  } catch (e) {
    if (e.stato === 0) {
      // il servizio non risponde proprio: niente schede, solo lo stato e "riprova"
      document.documentElement.classList.add('senza-schede');
      barraEl.hidden = true;
      schermoOffline($('#vista'), avvia);
      return;
    }
    S.io = null;                            // 401: non entrato
  }
  S.pronto = true;
  if (S.io && S.io.stato === 'attivo') { appSeServe(); profiliSeServe(); }
  naviga();
}

avvia();
})();
