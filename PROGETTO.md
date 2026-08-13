# BTL Pad — stato del progetto

**Repository:** `https://github.com/Genna2034/btl-pad.git` (ramo `main`)
**Hosting:** Vercel — ogni push su `main` pubblica in automatico, in circa un minuto
**Progetto gemello:** Be the Light (`Genna2034/btl.`), da cui BTL Pad legge la tonalità

---

## 0. ISTRUZIONI PER LA PROSSIMA SESSIONE — leggere per prime

### Come agganciarsi

Serve un **token GitHub** con permesso *Contents: Read and write* su questo
repository. Non è scritto qui di proposito: una credenziale dentro un file
versionato verrebbe esposta e revocata da GitHub in automatico.

Va chiesto all'utente all'inizio della sessione, con questa formula:

> Per lavorare sul repository mi serve un token GitHub. Se ne hai già uno,
> incollalo. Altrimenti: github.com/settings/personal-access-tokens/new →
> Repository access: *Only select repositories* → `btl-pad` →
> Permissions → Repository permissions → **Contents: Read and write** →
> Generate token.

Poi:

```bash
cd /home/claude
git clone "https://x-access-token:${TOKEN}@github.com/Genna2034/btl-pad.git" btl-pad
cd btl-pad
```

Non c'è `npm install`: il progetto non ha dipendenze e non si compila.

### Regole di lavoro seguite finora

- **Niente compilazione.** Sono file statici. Su Vercel: Framework *Other*,
  Build Command e Output Directory **vuoti**.
- **A ogni modifica va alzata `VERSIONE` in `sw.js`** (`btl-pad-v1` → `v2` → …).
  Senza questo il service worker continua a servire la versione vecchia dal
  dispositivo e sembra che il deploy non abbia funzionato. È l'errore più
  probabile: controllarlo per primo quando l'utente dice "non è cambiato nulla".
- **Ricaricamento forzato** dopo ogni deploy (Cmd+Shift+R), e su iPad conviene
  chiudere e riaprire l'app installata.
- **Prima di ogni push si testa davvero.** L'app gira in jsdom con un contesto
  audio vero (`node-web-audio-api`): si può renderizzare il suono offline e
  misurarlo. Vedi §3.
- **Messaggi di commit in italiano**, descrittivi: cosa cambia e perché.
- **Cosa può fare Claude:** modificare il codice, fare commit e push, quindi
  pubblicare. **Cosa non può fare:** entrare nella dashboard di Vercel o vedere
  il sito dall'interno. Per verificare il deploy serve l'indirizzo pubblico.

### Contesto sull'utente

Non è uno sviluppatore. Le istruzioni vanno date come percorsi di clic espliciti,
non come concetti. Comunica in italiano.

---

## 1. A cosa serve

Tappeti sonori per il culto dal vivo, quando la band non ha le sequenze.
Gira su un iPad collegato al mixer, gestito da un musicista sul palco.

---

## 2. Com'è fatto

```
index.html              struttura
css/style.css           stile, adattabile da iPhone a desktop
js/app.js               motore audio + interfaccia, JavaScript puro
logo.png                logo Be the Light
icons/                  icone per l'installazione
manifest.webmanifest    app installabile
sw.js                   service worker, funzionamento offline
vercel.json             intestazioni HTTP
```

**I pad sono sintetizzati, non campionati.** Il carattere "da culto" nasce da:
riverbero a convoluzione di 6,5 secondi con la coda che si scurisce, ottave alte
che entrano solo nel riverbero, ensemble di tre ritardi modulati, note che
entrano scaglionate, saturazione morbida.

### Trappola già pagata: le curve del WaveShaper

`WaveShaper` mappa l'ingresso sull'intervallo **[-1, 1]**. Una curva costruita
su [-2, 2] raddoppia il guadagno e distorce in permanenza. È già successo:
l'rms era salito del 65% senza che si notasse a orecchio subito.
La funzione corretta è `curvaMorbida(soglia)`: sotto soglia guadagno unitario,
sopra si piega. Usata a `.55` per il calore e a `.75` come limitatore finale.

**Se si toccano i livelli, va rimisurato il picco.** La sintesi usa fasi casuali,
quindi il picco cambia a ogni esecuzione: calibrare a orecchio non basta.

---

## 3. Come si testa

```bash
npm install jsdom node-web-audio-api      # solo la prima volta
```

Si carica `index.html` in jsdom sostituendo `window.AudioContext` con un
`OfflineAudioContext`: gira il codice vero dell'app e si può renderizzare
l'audio e misurarlo. Verifiche già fatte in passato, da ripetere se si tocca
il motore:

- picco e rms di ogni timbro (nessuno deve superare 1,0)
- intonazione via Goertzel: la fondamentale dev'essere molto più forte dei
  semitoni adiacenti
- terza maggiore contro minore
- incrocio fra tonalità: il livello non deve scendere a zero
- il collegamento con BTL, simulando anche la caduta di rete

I test sono usa-e-getta: si scrivono, si eseguono, si cancellano.

---

## 4. Collegamento con Be the Light

Il pad interroga `GET /api/pad?codice=XXXXXX` ogni 2,5 secondi sull'indirizzo
di BTL, e usa i campi `tonica` (0-11) e `modo` **così come arrivano**.

**Non ricalcolare la tonalità da `tonalitaOriginale` + semitoni:** il formato nel
database di BTL è disomogeneo e si ottengono risultati diversi. Indicazione
arrivata direttamente da chi lavora su BTL.

Principi da non rompere:

- cambio solo quando la tonica cambia davvero, dissolvenza 1,5 secondi
- **se la rete cade il pad non ammutolisce mai**: tiene l'accordo e rallenta i
  tentativi fino a 15 secondi
- il comando manuale ha sempre la precedenza sul remoto
- scollegare non ferma il suono

Lato BTL serve `Access-Control-Allow-Origin: *` sull'endpoint, perché il pad sta
su un dominio diverso.

---

## 5. Modalità sfondo

Il suono viene fatto passare per un elemento media
(`createMediaStreamDestination` + `<audio srcObject>`), così iOS lo tratta come
riproduzione vera e non lo sospende a schermo bloccato. Sulla schermata di blocco
compaiono logo, tonalità e comandi.

Le due uscite non possono coesistere: si sdoppierebbe il suono. Il passaggio
avviene con una micro-attenuazione, quindi va attivato prima di iniziare.

**Non verificato su dispositivo reale.** È la prima cosa da chiedere all'utente.

---

## 6. Da fare

- Verificare la modalità sfondo su iPad, su più versioni di iOS.
- Salvare le preferenze fra una sessione e l'altra.
- Conservare i loop sul dispositivo invece di ricaricarli ogni volta.
- Attivare il collegamento con BTL quando l'endpoint `/api/pad` sarà pronto.

---

## 7. Storia

Nato come singolo file HTML, poi diviso in progetto. Tre passaggi hanno
richiesto più tentativi, e vale la pena ricordarli:

1. **"Non si sente niente"** era il silenzioso dell'iPad, non il codice: su iOS
   il suono del browser esce sul canale della suoneria. Da chiedere sempre per
   primo.
2. **La grafica** è stata rifatta due volte: la prima versione aveva testi da 8
   pixel e vetro trasparente su fondo scuro, illeggibile sul palco.
3. **Il layout** era bloccato a schermo pieno per iPad e non scorreva su iPhone.
   Ora parte dal telefono e si allarga.

---

© G.B. — Be the Light
