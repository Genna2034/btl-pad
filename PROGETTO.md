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
- **A ogni modifica vanno alzati insieme `VERSIONE` in `sw.js` e `VERSIONE_APP` in `js/app.js`.**
  Dal v14 l'app si aggiorna da sola (rete-prima sui file vivi, ricarica allo spegnimento).
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

## 5-sexies. Set Worship da file (ottobre 2026) — ORA IL TIMBRO DI BASE

Dopo tre giri di sintesi l'utente continuava a trovare i pad aggressivi. La
risposta definitiva: usare il suo riferimento. Pipeline (in `/home/claude`, da
ricreare): decodifica `E_Pad__3_.mp3` → finestra di 28 s piu' stabile (217-245 s)
→ Rubber Band per le 12 tonalita' (spostamento minimo, A# a -6, B a -5) →
dissolvenza incrociata di 5 s coda/testa → rms pareggiato sul Mi → MP3 128k in
`/pad/<nota>.mp3` (4,3 MB). Il riferimento ha strati a +3/-7/+22 cent: e' il suo
chorus, non un errore di trasposizione (verificato con sinusoide pura).

In app: `worshipScarica()` all'accensione, `worshipBuffer(k)` decodifica alla
prima richiesta (al massimo 4 in memoria), `makeVoceFile(buf, root)` e' un looper
a doppia istanza con 3 s di sovrapposizione (assorbe il silenzio di testa/coda
dell'MP3), piu' passa-basso 550-8800 Hz e shelf +9 dB sopra 1 kHz per la
brillantezza, e shimmer sintetico sopra. Se i file mancano, ripiega su Velluto.
Precache nel service worker.

## 5-quinquies. Velluto calibrato su un riferimento reale (ottobre 2026)

L'utente ha fornito un pad di riferimento (`E_Pad__3_.mp3`, in Mi, 8 minuti).
Analizzato con FFT a lungo termine (bande di ottava, dB relativi al totale):

    banda Hz     40-100  100-200  200-400  400-800  800-1600  1600-3200  3200-6400
    riferimento   -39.1    -5.3     -3.5     -5.9     -28.8      -44.3      -56.9
    Velluto ora   -73.9    -4.6     -4.1     -5.8     -28.4      -48.7      -71.4

Baricentro 323 Hz (rif.) / 301 Hz (mio). Accordo del riferimento: Mi3 0, Si3 -2,
Mi4 -1, Si4 -2, Mi5 -8, **terza a -35 dB (praticamente assente)**.
Scelte che ne derivano, da non toccare senza rimisurare: `oct:0`, `sub:0`,
`pesi:[1,.85,.95,.06,.85,.45]` sulle voci `[0,7,12,16,19,24]`, `cut:800`.

Strumenti nel banco: `rendi.mjs` (renderizza un timbro in un tasto su wav),
`analisi.py` (profilo a bande, baricentro, correlazione stereo, note).

## 5-quater. Motore su onde morbide (ottobre 2026)

Dopo il primo addolcimento l'utente trovava i pad ancora aggressivi. La misura
giusta non erano gli acuti ma la fascia **1-1,6 kHz (nasale)**: Corale a 131‰,
Cinema a 70‰ del corpo. Causa: dente di sega come onda principale impastato con
la terza dell'accordo.

Riscrittura: onda principale sempre morbida (triangolare o sinusoide), dente di
sega solo come **velo** (campo `velo`, 0-1) attraverso un filtro suo piu' chiuso
(`cut*.55`), terza con peso ridotto (`terzaLv`), attacchi 2-3,6 s, ensemble piu'
lento e meno profondo, riverbero piu' scuro. Risultato: Corale 1,5‰, Cinema 22‰,
Velluto 0,7‰. Velluto e' il timbro di base: deve restare il piu' morbido.

Misura: `tp.mjs` nel banco — energia 1046/1318/1568 Hz su energia 131-523 Hz.

## 5-ter. Addolcimento dei timbri (settembre 2026, superato dal 5-quater)

L'utente ha trovato i pad troppo aggressivi. Interventi fatti insieme:
filtro piu' chiuso (cut ridotto del 30-35%), risonanza Q piu' bassa, detune
piu' stretto, attacco piu' lento (x1.3), aria a .014, saturazione con ginocchio
a .68 invece di .55, e un highshelf a -5 dB sopra 3,2 kHz sul solo bus dei pad.
Misura di riferimento: rapporto energia 2-6 kHz / energia 100-500 Hz, con
Goertzel sul segnale renderizzato. Velluto e' passato da 3,8 a 1,3 per mille.
Se un giorno si volesse un timbro piu' brillante, aggiungerne uno nuovo invece
di riaprire questi.

## 5-bis. Shimmer: due trappole gia' pagate

1. **Lo shimmer e' assoluto, non proporzionale al timbro.** La prima versione
   calcolava `base * T.sh * manopola`, per cui sui timbri con `sh` basso (Fondo
   a 0,05) la manopola non produceva quasi nulla. Ora e' `base * manopola *
   SHIM_MAX` e ogni timbro parte da una posizione tarata su `T.sh / SHIM_MAX`,
   cosi' il suono iniziale resta identico ma l'escursione e' piena per tutti.

2. **Registro fisso.** Lo shimmer era costruito a `root + 48 + iv + T.oct*12`:
   sui timbri con `oct:-1` finiva nella stessa regione dell'accordo e raddoppiava
   le note invece di brillare sopra. Ora e' `root + 60 + iv`, indipendente dal
   timbro.

Se si toccano questi valori, rimisurare con Goertzel l'energia a 523, 784 e
1046 Hz confrontando manopola a 0 e a 100: il rapporto deve superare 2x su
tutti e sei i timbri.

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
