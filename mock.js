/* mock.js - il servizio finto, per provare la webapp senza servizio (1/10/2026).
 *
 * Si carica solo con ?finto=1 (lo decide index.html) e risponde lui a tutte
 * le chiamate /api/* del contratto (HeadQuarter/documenti/contratto_webapp.md),
 * con dati credibili e tempi da rete di casa. Cosi' la webapp si apre da
 * file:// e anteprima_webapp.py la fotografa schermata per schermata.
 *
 * Parametri (oltre a finto=1):
 *   come=riccardo|mamma|paolo|nonna|nessuno   chi e' entrato (nonna = in attesa)
 *   scena=squadra   gioca la squadra: il tasto porta alla partita
 *   scena=futura    scelto a mano un evento DAZN che deve ancora cominciare
 *   scena=predefinita  nessuna scelta: il tasto apre DAZN
 *   scena=comando   un "premi" in corso, fermo sul "preso" (per la foto)
 *   scena=offline   il servizio non risponde
 *   scena=vuoto     palinsesto ed esiti vuoti
 *   approva=N       (con come=nonna) Riccardo approva dopo N secondi
 *
 * I fogli aperti e i link incollati delle foto non passano di qui: li fa
 * anteprima_webapp.py, toccando la pagina come farebbe un dito ("regia").
 * Cosi' ne' la webapp ne' il mock hanno codice che serve solo alle foto.
 *
 * Il catalogo qui sotto e' una COPIA di strumenti/librerie/app_catalogo.json
 * (bozza di Discover del 1/10): da file:// il browser non lascia leggere il
 * file vero. Nella copia YouTube e RaiPlay sono segnate "verificata" apposta,
 * per vedere tutti e due i casi; nel catalogo vero lo decide la prova al banco.
 */
(() => {
'use strict';
const q = new URLSearchParams(location.search);
const COME = (q.get('come') || 'riccardo').toLowerCase();
const SCENA = (q.get('scena') || '').toLowerCase();

// Un errore JavaScript, provando col mock, deve saltare all'occhio (anche
// nelle foto): una striscia rossa in alto, sopra a tutto. Gli errori del
// servizio (finto) no: quelli la webapp li gestisce e li mostra a modo suo.
function striscia(testo) {
  const el = document.createElement('div');
  el.textContent = 'Errore JS: ' + testo;
  el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;padding:10px 12px;border-radius:12px;' +
    'background:#c62828;color:#fff;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3)';
  (document.body || document.documentElement).append(el);
}
addEventListener('error', e => striscia(e.message));
addEventListener('unhandledrejection', e => {
  const r = e.reason;
  if (r && typeof r.stato === 'number') return;   // ErroreApi della webapp: gia' gestito
  striscia((r && r.message) || String(r));
});

// ------------------------------------------------------------ le date

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isoSec = d => iso(d) + ':' + pad(d.getSeconds());
const hms = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const ggmm = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ggmmss = d => ggmm(d) + ':' + pad(d.getSeconds());
function giorno(n, hh, mm) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hh, mm, 0, 0); return d; }
const fa = minuti => new Date(Date.now() - minuti * 60000);
// il prossimo sabato (la partita) e la prossima domenica (la messa)
function prossimo(giornoSett, hh, mm) {
  const d = giorno(0, hh, mm);
  let k = (giornoSett - d.getDay() + 7) % 7;
  if (k === 0 && d < new Date()) k = 7;
  d.setDate(d.getDate() + k);
  return d;
}

// ------------------------------------------------------------ i profili

const profili = [
  { nome: 'Riccardo', iniziali: 'R', colore: '#2f7d4f', ruolo: 'admin', stato: 'attivo', creato_il: '2026-09-12T18:00:00' },
  { nome: 'Mamma', iniziali: 'M', colore: '#c8553d', ruolo: 'utente', stato: 'attivo', creato_il: '2026-09-14T20:31:00' },
  { nome: 'Zio Paolo', iniziali: 'ZP', colore: '#2c64b8', ruolo: 'utente', stato: 'attivo', creato_il: '2026-09-20T11:02:00' },
  { nome: 'Nonna Lia', iniziali: 'NL', colore: '#8a5cc2', ruolo: 'utente', stato: 'in_attesa', creato_il: isoSec(fa(130)) },
];
const PER_COME = { riccardo: 'Riccardo', mamma: 'Mamma', paolo: 'Zio Paolo', zio: 'Zio Paolo', nonna: 'Nonna Lia' };
let io = COME === 'nessuno' ? null : profili.find(p => p.nome === (PER_COME[COME] || 'Riccardo'));
const tavolozza = ['#b7791f', '#0f7c8a', '#a23f72', '#5b6b2e', '#6d4bc4'];
const copia = x => JSON.parse(JSON.stringify(x));

if (io && io.stato === 'in_attesa' && q.get('approva')) {
  setTimeout(() => { io.stato = 'attivo'; }, (+q.get('approva') || 8) * 1000);
}

// ------------------------------------------------------------ il catalogo (copia, vedi in cima)

const CATALOGO = {
 "versione": 1,
 "app": [
  {
   "id": "youtube",
   "nome": "YouTube",
   "pacchetto": "com.amazon.firetv.youtube",
   "colore": "#ff0033",
   "sigla": "▶",
   "verificata": false,
   "verifica": "audio",
   "passi_extra": [],
   "modi": [
    {
     "tipo": "apri",
     "etichetta": "Apri YouTube"
    },
    {
     "tipo": "link",
     "etichetta": "Incolla un video",
     "accetta": [
      "^https?://(?:www\\.|m\\.|music\\.)?youtube\\.com/watch\\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#]|$)",
      "^https?://youtu\\.be/([A-Za-z0-9_-]{11})(?:[?&#/]|$)",
      "^https?://(?:www\\.|m\\.)?youtube\\.com/(?:shorts|live|embed|v)/([A-Za-z0-9_-]{11})(?:[?&#/]|$)"
     ],
     "trasforma": "https://www.youtube.com/watch?v={1}",
     "esempio": "https://youtu.be/dQw4w9WgXcQ"
    }
   ],
   "note": "App YouTube per Fire TV (Cobalt). Su Fire OS 5 l'ultima versione installabile e' la 22.4 (dalla 23.5 serve Android 7): funziona finche' Google tiene in vita quella versione. Il link (https://www.youtube.com/watch?v=...) e' dichiarato dall'app: dovrebbe partire da solo, a volte dopo una pubblicita' (l'audio della pubblicita' conta gia' come 'in onda'). Possibile schermata 'Chi sta guardando?' se sulla chiavetta ci sono piu' account Google."
  },
  {
   "id": "netflix",
   "nome": "Netflix",
   "pacchetto": "com.netflix.ninja",
   "colore": "#e50914",
   "sigla": "N",
   "verificata": false,
   "verifica": "audio",
   "passi_extra": [],
   "modi": [
    {
     "tipo": "apri",
     "etichetta": "Apri Netflix"
    },
    {
     "tipo": "link",
     "etichetta": "Incolla un film o una serie",
     "accetta": [
      "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:title|watch)/([0-9]{6,10})(?:[/?#]|$)",
      "^https?://(?:www\\.)?netflix\\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?browse\\?(?:[^#]*&)?jbv=([0-9]{6,10})(?:[&#]|$)"
     ],
     "trasforma": "https://www.netflix.com/title/{1}?source=30",
     "esempio": "https://www.netflix.com/it/title/80100172"
    }
   ],
   "note": "Netflix dichiara i link https://www.netflix.com/title/... e /watch/... (letto nell'APK Android TV 8.3.11, la versione per Android 5.1). Senza 'source=30' Netflix apre l'app ma ignora il titolo: per questo la trasformazione lo aggiunge. Rischio principale: la schermata 'Chi guarda?' all'avvio a freddo se l'account ha piu' profili (da tenere un solo profilo, o aggiungere un Select dopo la prova). Netflix ha tolto il supporto ai Fire TV del 2014 e allo Stick con telecomando vocale del 2016 (prima generazione) il 3/6/2025: lo Stick di 2a generazione non risulta nell'elenco, ma va confermato al banco."
  },
  {
   "id": "primevideo",
   "nome": "Prime Video",
   "pacchetto": "com.amazon.avod",
   "colore": "#00a8e1",
   "sigla": "P",
   "verificata": false,
   "verifica": "audio",
   "passi_extra": [
    {
     "azione": "attesa",
     "ms": 15000
    },
    {
     "azione": "tasto",
     "nome": "Select"
    }
   ],
   "modi": [
    {
     "tipo": "apri",
     "etichetta": "Apri Prime Video"
    },
    {
     "tipo": "link",
     "etichetta": "Incolla un film o una serie",
     "accetta": [
      "^https?://(?:www\\.)?primevideo\\.com/(?:-/[a-z]{2}(?:_[a-z]{2})?/)?(?:region/[a-z]{2}/)?detail/(?:[^/?#]+/)?([0-9A-Z]{20,30})(?:[/?#]|$)",
      "^https?://(?:www\\.)?amazon\\.(?:it|com|co\\.uk|de|fr|es)/(?:[^?#]*/)?(?:gp/video/detail|dp)/([0-9A-Z]{10})(?:[/?#]|$)",
      "^https?://(?:app|www)\\.primevideo\\.com/detail\\?(?:[^#]*&)?gti=(amzn1\\.dv\\.gti\\.[0-9a-f-]{36})(?:[&#]|$)"
     ],
     "trasforma": "content://com.amazon.avod.detail/{1}",
     "esempio": "https://www.primevideo.com/-/it/detail/0KRGHGZCHKS920ZQGY5LBRF7MA"
    }
   ],
   "note": "Su Fire OS 5 Prime Video e' l'app di sistema 'FireTV Player' (com.amazon.avod, ancora aggiornata per Android 5.1 a ottobre 2025). Non dichiara link https: l'unico ingresso e' content://com.amazon.avod.detail/<id>, che dovrebbe aprire la SCHEDA del titolo, non il video: per questo dopo l'apertura c'e' un Select su 'Guarda'/'Riprendi'. Quale id accetti (quello di primevideo.com, l'ASIN B0... o il gti) e' la prima cosa da scoprire al banco. ATTENZIONE: il Select vale anche per il modo 'apri', dove aprirebbe il primo titolo in vetrina (vedi report)."
  },
  {
   "id": "raiplay",
   "nome": "RaiPlay",
   "pacchetto": "it.rainet.androidtv",
   "colore": "#1e5bc6",
   "sigla": "R",
   "verificata": false,
   "verifica": "audio",
   "passi_extra": [],
   "modi": [
    {
     "tipo": "apri",
     "etichetta": "Apri RaiPlay"
    },
    {
     "tipo": "link",
     "etichetta": "Incolla un video o una diretta",
     "accetta": [
      "^https?://(?:www\\.)?raiplay\\.it/(dirette/[a-z0-9]+|video/[0-9]{4}/[0-9]{2}/[^?#\\s]+\\.html)(?:[?#]|$)"
     ],
     "trasforma": "https://www.raiplay.it/{1}",
     "esempio": "https://www.raiplay.it/dirette/rai1"
    },
    {
     "tipo": "diretta",
     "etichetta": "Canali Rai in diretta",
     "elementi": [
      {
       "titolo": "Rai 1",
       "url": "https://www.raiplay.it/dirette/rai1"
      },
      {
       "titolo": "Rai 2",
       "url": "https://www.raiplay.it/dirette/rai2"
      },
      {
       "titolo": "Rai 3",
       "url": "https://www.raiplay.it/dirette/rai3"
      },
      {
       "titolo": "Rai News 24",
       "url": "https://www.raiplay.it/dirette/rainews24"
      },
      {
       "titolo": "Rai Sport",
       "url": "https://www.raiplay.it/dirette/raisport"
      },
      {
       "titolo": "Rai 4",
       "url": "https://www.raiplay.it/dirette/rai4"
      },
      {
       "titolo": "Rai 5",
       "url": "https://www.raiplay.it/dirette/rai5"
      },
      {
       "titolo": "Rai Movie",
       "url": "https://www.raiplay.it/dirette/raimovie"
      },
      {
       "titolo": "Rai Premium",
       "url": "https://www.raiplay.it/dirette/raipremium"
      },
      {
       "titolo": "Rai Storia",
       "url": "https://www.raiplay.it/dirette/raistoria"
      },
      {
       "titolo": "Rai Yoyo",
       "url": "https://www.raiplay.it/dirette/raiyoyo"
      },
      {
       "titolo": "Rai Gulp",
       "url": "https://www.raiplay.it/dirette/raigulp"
      },
      {
       "titolo": "Rai Radio 2",
       "url": "https://www.raiplay.it/dirette/rairadio2"
      }
     ]
    }
   ],
   "note": "App RaiPlay per Fire TV/Android TV 4.3.4 (richiede Android 5.0: va bene su Fire OS 5). Dichiara i link https://www.raiplay.it/dirette/..., /video/..., /programmi/... (solo con www). Le schede /programmi/ non partono da sole e sono escluse finche' non si prova. Serve l'accesso fatto una volta (codice 'Associa TV'). Possibili spot prima del video. ATTENZIONE: l'app dichiara solo LEANBACK_LAUNCHER, quindi 'monkey ... -c android.intent.category.LAUNCHER' (il modo 'apri' del firmware) potrebbe non trovarla: da provare al banco."
  },
  {
   "id": "mediaset",
   "nome": "Mediaset Infinity",
   "pacchetto": "it.mediaset.infinitytv",
   "colore": "#262d78",
   "sigla": "∞",
   "verificata": false,
   "verifica": "audio",
   "passi_extra": [],
   "modi": [
    {
     "tipo": "apri",
     "etichetta": "Apri Mediaset Infinity"
    },
    {
     "tipo": "link",
     "etichetta": "Incolla un video o una diretta",
     "accetta": [
      "^https?://mediasetinfinity\\.mediaset\\.it/(diretta/[A-Za-z0-9._-]+|(?:video|movie)/[A-Za-z0-9-]+/[A-Za-z0-9-]+_F[0-9A-Z]+)(?:[/?#]|$)"
     ],
     "trasforma": "https://mediasetinfinity.mediaset.it/{1}",
     "esempio": "https://mediasetinfinity.mediaset.it/diretta/canale5_cC5"
    },
    {
     "tipo": "diretta",
     "etichetta": "Canali Mediaset in diretta",
     "elementi": [
      {
       "titolo": "Canale 5",
       "url": "https://mediasetinfinity.mediaset.it/diretta/canale5_cC5"
      },
      {
       "titolo": "Italia 1",
       "url": "https://mediasetinfinity.mediaset.it/diretta/italia1_cI1"
      },
      {
       "titolo": "Rete 4",
       "url": "https://mediasetinfinity.mediaset.it/diretta/rete4_cR4"
      },
      {
       "titolo": "TGCOM24",
       "url": "https://mediasetinfinity.mediaset.it/diretta/video_cKF"
      },
      {
       "titolo": "20 Mediaset",
       "url": "https://mediasetinfinity.mediaset.it/diretta/20mediaset_cLB"
      },
      {
       "titolo": "Iris",
       "url": "https://mediasetinfinity.mediaset.it/diretta/iris_cKI"
      },
      {
       "titolo": "La 5",
       "url": "https://mediasetinfinity.mediaset.it/diretta/la5_cKA"
      },
      {
       "titolo": "Cine34",
       "url": "https://mediasetinfinity.mediaset.it/diretta/cine34_cB6"
      },
      {
       "titolo": "Focus",
       "url": "https://mediasetinfinity.mediaset.it/diretta/focus_cFU"
      },
      {
       "titolo": "Top Crime",
       "url": "https://mediasetinfinity.mediaset.it/diretta/topcrime_cLT"
      },
      {
       "titolo": "TwentySeven",
       "url": "https://mediasetinfinity.mediaset.it/diretta/_cTS"
      },
      {
       "titolo": "Italia 2",
       "url": "https://mediasetinfinity.mediaset.it/diretta/italia2_cI2"
      },
      {
       "titolo": "Mediaset Extra",
       "url": "https://mediasetinfinity.mediaset.it/diretta/mediasetextra_cKQ"
      },
      {
       "titolo": "Boing",
       "url": "https://mediasetinfinity.mediaset.it/diretta/kids_cKB"
      },
      {
       "titolo": "Cartoonito",
       "url": "https://mediasetinfinity.mediaset.it/diretta/kids_cLA"
      }
     ]
    }
   ],
   "note": "Il pacchetto e' quello dell'app Android TV (it.mediaset.infinitytv, Android 5.0+ fino alla 8.1.x): va confermato sulla chiavetta. NON si sa ancora se l'app accetta i link https://mediasetinfinity.mediaset.it/...: l'APK non e' stato leggibile (download bloccati). Se non li accetta, restano solo 'apri' e la navigazione col telecomando. Le dirette nell'app Fire TV ci sono dal 2023. Pubblicita' prima dei video quasi certa; accesso Mediaset richiesto per alcune funzioni."
  }
 ]
};
for (const a of CATALOGO.app) if (a.id === 'youtube' || a.id === 'raiplay') a.verificata = true;

// ------------------------------------------------------------ DAZN

const sab = prossimo(6, 20, 45);
const canali = [
  { tipo: 'dazn_canale', titolo: 'DAZN 1', eventId: 'lin1a2b3c4d5e6f' },
  { tipo: 'dazn_canale', titolo: 'DAZN 2', eventId: 'lin2b3c4d5e6f7a' },
  { tipo: 'dazn_canale', titolo: 'Inter TV', eventId: 'lin3c4d5e6f7a8b' },
  { tipo: 'dazn_canale', titolo: 'Milan TV', eventId: 'lin4d5e6f7a8b9c' },
  { tipo: 'dazn_canale', titolo: 'Serie A Channel', eventId: 'lin5e6f7a8b9c0d' },
];
let idEv = 0;
const ev = (titolo, d, sport, comp, inCorso = false) => ({
  tipo: 'dazn_partita', titolo, eventId: 'ev' + (++idEv).toString(36).padStart(10, 'x'),
  inizio: d.toISOString(), in_corso: inCorso, sport, competizione: comp,
});
const eventi = [
  ev('Leganés - Castellón', fa(50), 'Calcio', 'LaLiga Hypermotion', true),
  ev('Sinner - Zverev', fa(35), 'Tennis', 'ATP Shanghai', true),
  ev('Bologna - Atalanta', giorno(0, 20, 45), 'Calcio', 'Serie A'),
  ev('Olimpia Milano - Virtus Bologna', giorno(1, 20, 30), 'Basket', 'LBA Serie A'),
  ev('Sassuolo - Cagliari', giorno(1, 18, 30), 'Calcio', 'Serie A'),
  ev('Inter - Parma', sab, 'Calcio', 'Serie A'),
  ev('Milan - Napoli', giorno(2, 20, 45), 'Calcio', 'Serie A'),
  ev('Roma - Lazio', giorno(3, 18, 0), 'Calcio', 'Serie A'),
  ev('Real Madrid - Villarreal', giorno(2, 21, 0), 'Calcio', 'LaLiga'),
  ev('Palermo - Sampdoria', giorno(2, 15, 0), 'Calcio', 'Serie B'),
  ev('Perugia - Trento', giorno(2, 18, 0), 'Pallavolo', 'SuperLega'),
  ev('Gran Premio del Giappone', giorno(3, 7, 0), 'Motori', 'MotoGP'),
  ev('Canelo - Crawford', giorno(3, 4, 0), 'Boxe', 'Mondiale supermedi'),
];
const interParma = eventi.find(e => e.titolo === 'Inter - Parma');

// ------------------------------------------------------------ il tasto

const concerto = { tipo: 'app', app_id: 'youtube', titolo: 'Concerto di Natale', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
let manuale = { ...concerto, assegnata_il: isoSec(fa(95)), chi: 'Mamma' };
let motivo = 'manuale';
let destinazione = concerto;
let inOnda = null;
let squadra = { partita: 'Inter - Parma', fase: 'FUORI', inizio: ggmm(sab), scavalca_da: ggmm(new Date(sab - 30 * 60000)) };

if (SCENA === 'squadra') {
  const ora = fa(38);
  squadra = { partita: 'Inter - Parma', fase: 'LIVE', inizio: ggmm(ora), scavalca_da: ggmm(new Date(ora - 30 * 60000)) };
  motivo = 'squadra';
  destinazione = { tipo: 'dazn_partita', titolo: 'Inter - Parma', eventId: interParma.eventId, inizio: ora.toISOString() };
  inOnda = interParma.eventId;
} else if (SCENA === 'futura') {
  const e = eventi.find(x => x.titolo === 'Milan - Napoli');
  destinazione = { tipo: 'dazn_partita', titolo: e.titolo, eventId: e.eventId, inizio: e.inizio };
  manuale = { ...destinazione, assegnata_il: isoSec(fa(12)), chi: 'Zio Paolo' };
} else if (SCENA === 'predefinita') {
  manuale = null; motivo = 'predefinita'; destinazione = null;
}

// l'ultimo "premi": finito bene tre quarti d'ora fa (o in corso, per la foto)
const t0 = fa(46);
let comando = { id: 7, stato: 'in_onda', lunga: false, inviato: hms(t0), ricevuto: hms(new Date(+t0 + 3000)) };
let comandoQuando = +t0;
if (SCENA === 'comando') {
  comando = { id: 8, stato: 'ricevuto', lunga: false, inviato: hms(new Date(Date.now() - 6000)), ricevuto: hms(new Date(Date.now() - 2500)) };
  comandoQuando = Date.now();
}

let esiti = [
  { quando: ggmmss(fa(46)), esito: 'in_onda', causa: '', di_fila: 0, da: 'webapp', chi: 'Mamma', titolo: 'Concerto di Natale', lunga: false },
  { quando: ggmmss(fa(185)), esito: 'gia_in_onda', causa: '', di_fila: 0, da: 'tasto', chi: 'nonno', titolo: 'DAZN', lunga: false },
  { quando: ggmmss(giorno(-1, 20, 1)), esito: 'in_onda', causa: '', di_fila: 0, da: 'tasto', chi: 'palinsesto', titolo: 'Tg1 delle 20', lunga: false },
  { quando: ggmmss(giorno(-1, 18, 2)), esito: 'in_onda', causa: '', di_fila: 0, da: 'tasto', chi: 'nonno', titolo: 'Inter - Torino', lunga: false },
  { quando: ggmmss(giorno(-1, 17, 59)), esito: 'fallito', causa: 'tv', di_fila: 1, da: 'tasto', chi: 'nonno', titolo: 'Inter - Torino', lunga: false },
];
if (SCENA === 'vuoto') esiti = [];

function titoloDisplay(d) {
  return String((d && d.titolo) || 'DAZN').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, 40);
}
function statoTasto() {
  const d = motivo === 'squadra' ? destinazione : manuale ? manuale : null;
  return {
    titolo: titoloDisplay(d), motivo, id: (d && d.eventId) || (d ? 'app:3f9a0c21be' : 'dazn'),
    destinazione: d ? { ...d } : null,
  };
}

// ------------------------------------------------------------ il palinsesto

let idPal = 0;
const nuovoId = () => 'e' + (Date.now() % 1e6).toString(16) + (++idPal);
function prossimaDi(e) {
  const quando = new Date(e.quando);
  const ora = new Date();
  if (e.ripeti === 'no') return quando > new Date(ora - 60000) ? e.quando : null;
  const d = new Date(quando);
  const passo = e.ripeti === 'ogni_giorno' ? 1 : 7;
  while (d < ora) d.setDate(d.getDate() + passo);
  return iso(d);
}
const rai1 = { tipo: 'app', app_id: 'raiplay', titolo: 'Rai 1', url: 'https://www.raiplay.it/dirette/rai1' };
let palinsesto = [
  { id: nuovoId(), titolo: 'Tg1 delle 20', quando: iso(giorno(-6, 20, 0)), ripeti: 'ogni_giorno', modo: 'in_onda', destinazione: rai1, creato_da: 'Mamma',
    ultimo_esito: { quando: iso(giorno(-1, 20, 0)), esito: 'eseguito', perche: '' } },
  { id: nuovoId(), titolo: 'Il film della sera', quando: iso(giorno(0, 21, 15)), ripeti: 'no', modo: 'tasto',
    destinazione: { tipo: 'app', app_id: 'netflix', titolo: 'La casa di carta', url: 'https://www.netflix.com/title/80192098?source=30' }, creato_da: 'Riccardo', ultimo_esito: null },
  { id: nuovoId(), titolo: 'Ginnastica dolce', quando: iso(giorno(0, 9, 30)), ripeti: 'no', modo: 'tasto',
    destinazione: { tipo: 'app', app_id: 'youtube', titolo: 'Ginnastica dolce', url: 'https://www.youtube.com/watch?v=Ev6yE55kYGw' }, creato_da: 'Zio Paolo',
    ultimo_esito: { quando: iso(giorno(0, 9, 30)), esito: 'fallito', perche: 'la TV non ha risposto: era spenta dalla presa?' } },
  { id: nuovoId(), titolo: 'Santa Messa', quando: iso(prossimo(0, 11, 0)), ripeti: 'ogni_settimana', modo: 'in_onda', destinazione: rai1, creato_da: 'Mamma',
    ultimo_esito: { quando: iso(new Date(prossimo(0, 11, 0) - 7 * 864e5)), esito: 'saltato', perche: 'giocava l\'Inter, che ha la precedenza' } },
  { id: nuovoId(), titolo: 'Striscia la notizia', quando: iso(giorno(2, 20, 35)), ripeti: 'no', modo: 'in_onda',
    destinazione: { tipo: 'app', app_id: 'mediaset', titolo: 'Canale 5', url: 'https://mediasetinfinity.mediaset.it/diretta/canale5_cC5' }, creato_da: 'Riccardo', ultimo_esito: null },
];
// la messa della settimana scorsa e' partita da un "quando" passato
palinsesto[3].quando = iso(new Date(new Date(palinsesto[3].quando) - 14 * 864e5));
if (SCENA === 'vuoto') palinsesto = [];
function palinsestoOrdinato() {
  palinsesto.forEach(e => { e.prossima = prossimaDi(e); });
  // i singoli passati restano 24 ore, poi spariscono
  palinsesto = palinsesto.filter(e => e.prossima || Date.now() - new Date(e.quando) < 864e5);
  return copia(palinsesto).sort((a, b) => (a.prossima || '9') < (b.prossima || '9') ? -1 : 1);
}

// ------------------------------------------------------------ le regole dei link (come il servizio)

function linkValido(d) {
  if (d.tipo !== 'app' || !d.url) return true;
  const a = CATALOGO.app.find(x => x.id === d.app_id);
  if (!a) return false;
  for (const m of a.modi) {
    if (m.tipo === 'diretta' && (m.elementi || []).some(e => e.url === d.url)) return true;
    if (m.tipo === 'link') for (const r of m.accetta || []) {
      const x = new RegExp(r).exec(d.url);
      if (x) return true;
      // il link e' gia' trasformato: va bene se la trasformazione combacia
      const forma = new RegExp('^' + m.trasforma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\d+\\\}/g, '.+') + '$');
      if (forma.test(d.url)) return true;
    }
  }
  return false;
}
function controllaDest(d) {
  if (!d || !['dazn_canale', 'dazn_partita', 'app'].includes(d.tipo)) return 'tipo di destinazione sconosciuto';
  if (d.tipo !== 'app' && !d.eventId) return 'manca l\'eventId';
  if (d.tipo === 'app' && !CATALOGO.app.some(a => a.id === d.app_id)) return 'app sconosciuta: ' + d.app_id;
  if (!linkValido(d)) return 'non riconosco questo link';
  return null;
}

// ------------------------------------------------------------ le risposte

const ok = (dati = {}) => [200, { ok: true, ...dati }];
const no = (codice, perche) => [codice, { ok: false, perche }];
let tentativi = 0;

function rispondi(metodo, via, corpo) {
  // chiunque
  if (via === '/api/profili' && metodo === 'GET') return [200, { profili: copia(profili) }];
  if (via === '/api/io') return io ? [200, { io: copia(io) }] : no(401, 'Non sei entrato.');
  if (via === '/api/accedi') {
    const p = profili.find(x => x.nome.toLowerCase() === String(corpo.nome || '').trim().toLowerCase());
    if (tentativi >= 5) return no(423, 'Troppi tentativi sbagliati: riprova fra 15 minuti.');
    if (!p || !corpo.password || corpo.password === 'sbagliata') {
      tentativi++;
      return no(401, 'Password sbagliata.' + (tentativi >= 3 ? ' Ancora ' + (5 - tentativi) + ' tentativi, poi si blocca per 15 minuti.' : ''));
    }
    tentativi = 0;
    io = p;
    return ok({ io: copia(p) });
  }
  if (via === '/api/registra') {
    const nome = String(corpo.nome || '').trim();
    if (!nome || nome.length > 24) return no(400, 'Il nome deve avere da 1 a 24 caratteri.');
    if (String(corpo.password || '').length < 6) return no(400, 'La password deve avere almeno 6 caratteri.');
    if (profili.some(p => p.nome.toLowerCase() === nome.toLowerCase())) return no(409, 'C\'è già un profilo con questo nome.');
    const parti = nome.split(/\s+/);
    const p = { nome, iniziali: (parti.length > 1 ? parti[0][0] + parti[1][0] : parti[0][0]).toUpperCase(), colore: tavolozza[profili.length % tavolozza.length],
      ruolo: 'utente', stato: 'in_attesa', creato_il: isoSec(new Date()) };
    profili.push(p);
    io = p;
    return ok({ io: copia(p) });
  }
  if (via === '/api/esci') { io = null; return ok(); }

  // da qui serve un profilo attivo
  if (!io) return no(401, 'Non sei entrato.');
  if (io.stato !== 'attivo') return no(403, 'in_attesa');

  if (via.startsWith('/api/admin/')) {
    if (io.ruolo !== 'admin') return no(403, 'Solo l\'admin può farlo.');
    const i = profili.findIndex(x => x.nome === corpo.nome);
    if (i < 0) return no(404, 'Profilo non trovato.');
    if (via === '/api/admin/approva') profili[i].stato = 'attivo';
    else if (via === '/api/admin/rimuovi') {
      if (profili[i].ruolo === 'admin') return no(400, 'L\'admin non si può rimuovere.');
      profili.splice(i, 1);
    }
    return ok({ profili: copia(profili) });
  }

  if (via === '/api/tasto' && metodo === 'GET') {
    const pe = palinsestoOrdinato().find(e => e.prossima);
    return [200, {
      tasto: statoTasto(), manuale: manuale ? copia(manuale) : null, squadra: copia(squadra), nome_squadra: 'inter',
      comando: comando ? { ...comando } : null, esiti: copia(esiti.slice(0, 5)),
      telecomando_visto_s: SCENA === 'lontano' ? 420 : 3, in_onda: inOnda,
      prossimo_evento: pe || null,
    }];
  }
  if (via === '/api/tasto' && metodo === 'POST') {
    if (corpo.cancella) {
      manuale = null;
      if (motivo !== 'squadra') motivo = 'predefinita';
      return ok();
    }
    const perche = controllaDest(corpo);
    if (perche) return no(400, perche);
    manuale = { ...corpo, assegnata_il: isoSec(new Date()), chi: io.nome };
    if (motivo !== 'squadra') motivo = 'manuale';
    return ok({ tasto: statoTasto() });
  }
  if (via === '/api/scelte') return [200, { canali: copia(canali), eventi: copia(eventi) }];
  if (via === '/api/app') {
    const admin = io.ruolo === 'admin';
    return [200, { app: CATALOGO.app.filter(a => admin || a.verificata).map(a => a.verificata ? copia(a) : { ...copia(a), da_provare: true }) }];
  }
  if (via === '/api/premi') {
    if (comando && (comando.stato === 'in attesa' || comando.stato === 'ricevuto')) return no(429, 'C\'è già un comando in corso: aspetta che finisca.');
    const manca = 15 - (Date.now() - comandoQuando) / 1000;
    if (manca > 0) return no(429, 'Troppo presto: riprova fra ' + Math.ceil(manca) + ' s.');
    const id = (comando ? comando.id : 0) + 1;
    comandoQuando = Date.now();
    comando = { id, stato: 'in attesa', lunga: !!corpo.lunga, inviato: hms(new Date()), ricevuto: null };
    // il telecomando lo prende in un paio di secondi, la ricetta ne dura qualcuno
    setTimeout(() => { if (comando.id === id) Object.assign(comando, { stato: 'ricevuto', ricevuto: hms(new Date()) }); }, 2200);
    setTimeout(() => {
      if (comando.id !== id) return;
      const gia = !corpo.lunga && inOnda;
      comando.stato = gia ? 'gia_in_onda' : 'in_onda';
      inOnda = statoTasto().id;
      esiti.unshift({ quando: ggmmss(new Date()), esito: comando.stato, causa: '', di_fila: 0, da: 'webapp', chi: io.nome,
        titolo: (statoTasto().destinazione || {}).titolo || 'DAZN', lunga: !!corpo.lunga });
    }, 7500);
    return ok({ comando: { ...comando } });
  }
  if (via === '/api/palinsesto' && metodo === 'GET') return [200, { eventi: palinsestoOrdinato() }];
  if (via === '/api/palinsesto' && metodo === 'POST') {
    const perche = controllaDest(corpo.destinazione);
    if (perche) return no(400, perche);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(corpo.quando || '')) return no(400, 'Data o ora non valide.');
    if (!['no', 'ogni_giorno', 'ogni_settimana'].includes(corpo.ripeti)) return no(400, 'Ripeti non valido.');
    if (!['in_onda', 'tasto'].includes(corpo.modo)) return no(400, 'Modo non valido.');
    if (corpo.ripeti === 'no' && new Date(corpo.quando) < new Date()) return no(400, 'Quell\'ora è già passata: scegline una nel futuro.');
    const e = { id: nuovoId(), titolo: (corpo.titolo || corpo.destinazione.titolo || '').slice(0, 40), quando: corpo.quando, ripeti: corpo.ripeti,
      modo: corpo.modo, destinazione: copia(corpo.destinazione), creato_da: io.nome, ultimo_esito: null };
    e.prossima = prossimaDi(e);
    palinsesto.push(e);
    return ok({ evento: copia(e) });
  }
  const m = /^\/api\/palinsesto\/([^/]+)$/.exec(via);
  if (m && metodo === 'DELETE') {
    const id = decodeURIComponent(m[1]);
    if (!palinsesto.some(e => e.id === id)) return no(404, 'Evento non trovato.');
    palinsesto = palinsesto.filter(e => e.id !== id);
    return ok();
  }
  return no(404, 'Chiamata sconosciuta: ' + metodo + ' ' + via);
}

// ------------------------------------------------------------ fetch finto

const veroFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  // da file:// su Windows "/api/io" diventa file:///C:/api/io: si guarda da "/api/" in poi
  const da = url.pathname.indexOf('/api/');
  if (da < 0) return veroFetch(input, init);
  const via = url.pathname.slice(da);
  // una rete di casa: un quarto di secondo, a volte mezzo
  await new Promise(r => setTimeout(r, 160 + Math.random() * 260));
  if (SCENA === 'offline') throw new TypeError('Failed to fetch');
  const metodo = (init.method || 'GET').toUpperCase();
  let corpo = {};
  try { corpo = init.body ? JSON.parse(init.body) : {}; } catch (e) { return new Response('{"ok":false,"perche":"JSON non valido"}', { status: 400 }); }
  const [stato, dati] = rispondi(metodo, via, corpo);
  return new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
})();
