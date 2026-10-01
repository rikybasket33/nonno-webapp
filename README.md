# Il tasto del nonno — demo della webapp

**Demo:** https://rikybasket33.github.io/nonno-webapp/

Il nonno preme un pulsante: la TV si accende, la Fire TV Stick apre DAZN e parte la diretta della
sua squadra. Un display gli dice quanto manca al fischio d'inizio, il punteggio, se c'è qualcosa da
fare. Da remoto si decide dove porta il tasto: un'altra partita, un canale, un'app.

Questa è **la webapp con cui si decide**, quella che si apre dal telefono. Qui gira per mostrarla:
non c'è nessun impianto dietro.

---

## Che cos'è, e che cosa non è

**È la webapp vera**, lo stesso `app.js` e `app.css` che girano in casa — non un mockup né uno
screenshot. Si naviga tutta: profili, tasto, sfoglia, palinsesto, attività, admin.

**Non comanda niente.** Al posto del servizio di casa risponde `mock.js`, un servizio finto che
intercetta tutte le chiamate `/api/*` e restituisce dati credibili, con i tempi di una rete
domestica. Nessun pulsante qui accende una TV.

### Perché su GitHub Pages può essere solo una demo

Non è una scelta: la webapp vera **non potrebbe** funzionare da qui, per tre motivi indipendenti.

1. **I percorsi.** Le chiamate sono relative alla radice (`/api/tasto`). Da
   `rikybasket33.github.io/nonno-webapp/` diventerebbero `rikybasket33.github.io/api/tasto`: 404.
   Il codice dà per scontato di essere servito **dal servizio stesso**.
2. **Contenuto misto.** Anche puntandola all'indirizzo di casa, una pagina caricata in **HTTPS non
   può fare richieste HTTP**: il browser le blocca, e sul telefono non c'è modo di autorizzarle.
3. **Il servizio non è su internet.** Ascolta su un indirizzo privato, sulla rete di casa. Da fuori
   non c'è niente da raggiungere.

Per la webapp vera raggiungibile da fuori casa serve un servizio in HTTPS su un indirizzo pubblico.
È la strada prevista, e non passa da Pages.

---

## Da provare nella demo

La pagina si apre già in modalità finta. Aggiungendo dei parametri all'indirizzo si vedono
situazioni diverse — è il modo in cui si collaudano le schermate senza aspettare una partita.

| Parametro | Cosa mostra |
|---|---|
| `?come=riccardo` | l'admin (predefinito): vede tutto, compresa l'approvazione dei profili |
| `?come=mamma` · `?come=paolo` | un profilo normale, già approvato |
| `?come=nonna` | un profilo **in attesa**: la schermata di chi aspetta il via dell'admin |
| `?come=nessuno` | nessuno è entrato: si parte dalla scelta del profilo |
| `?scena=squadra` | gioca la squadra del cuore: il tasto porta alla partita |
| `?scena=futura` | un evento DAZN scelto a mano, che deve ancora cominciare |
| `?scena=predefinita` | nessuna scelta in corso: il tasto apre DAZN |
| `?scena=offline` | il servizio di casa non risponde: come lo dice la webapp |
| `?scena=vuoto` | palinsesto ed esiti vuoti |

Si combinano: `?come=nonna&approva=5` fa approvare il profilo dopo cinque secondi.

Sul telefono si può aggiungere alla schermata Home: è una PWA e si apre come un'app.

---

## Com'è fatta

Nessuna dipendenza, nessuna libreria, nessun font o immagine presi da internet: **tutto è in questa
cartella**, perché in casa deve funzionare anche senza collegamento. JavaScript scritto a mano, CSS
con tema chiaro e scuro automatici.

```
index.html              la pagina (qui carica sempre mock.js)
app.js                  la webapp
app.css                 chiaro e scuro
mock.js                 il servizio finto che la fa vivere qui
manifest.webmanifest    PWA
icone/
```

L'unica differenza rispetto alla copia di casa è una riga in `index.html`: lì `mock.js` entra solo
con `?finto=1`, qui sempre.

---

## Il progetto

Firmware dell'ESP32, servizio di casa, catalogo delle app e documenti stanno nel repository
principale, che è privato. Questa è solo la vetrina della webapp.

<sub>Progetto personale. DAZN, Fire TV e i marchi delle squadre appartengono ai rispettivi
proprietari. I dati che si vedono nella demo sono inventati.</sub>
