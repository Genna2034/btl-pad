# BTL Pad

Tappeti sonori, effetti e loop per accompagnare la lode dal vivo, quando la band
non ha le sequenze e serve un tappeto sotto il canto.

Pensata per un iPad collegato al mixer e gestita da un musicista sul palco.
Nessun file da scaricare, nessun account, **funziona senza rete**.

---

## Come è fatta

Nessun passaggio di compilazione: sono file statici serviti così come sono.
Niente framework, niente dipendenze da installare.

```
index.html              struttura della pagina
css/style.css           tutto lo stile, adattabile da iPhone a desktop
js/app.js               motore audio + interfaccia (JavaScript puro)
logo.png                logo Be the Light
icons/                  icone per l'installazione sulla schermata home
manifest.webmanifest    dati dell'app installabile
sw.js                   service worker: precarica tutto e permette l'uso offline
vercel.json             intestazioni HTTP e regole di pubblicazione
```

## Provarla in locale

```bash
npm run dev      # apre su http://localhost:3000
```

Il service worker si registra solo su HTTPS, quindi in locale l'app funziona
ma non si installa. Per provare anche quella parte serve il sito pubblicato.

## Pubblicare su Vercel

1. Carica questa cartella su un repository GitHub.
2. Su Vercel: **Add New… → Project** e scegli il repository.
3. Framework Preset: **Other**. Build Command: **vuoto**. Output Directory: **vuoto**.
4. Deploy.

Non serve altro: `vercel.json` contiene già le intestazioni corrette per il
service worker e per il manifest.

### Aggiornamenti

Il service worker tiene i file in memoria. Quando cambi qualcosa, **alza il
numero di versione** in `sw.js`:

```js
const VERSIONE = 'btl-pad-v2';
```

Senza questo, chi ha già aperto l'app continuerebbe a vedere la versione vecchia.

---

## Installazione sull'iPad

1. Apri il sito in **Safari** (non in un'altra app).
2. Tasto Condividi → **Aggiungi a Home**.
3. Aprila dall'icona: si avvia a schermo intero, senza barre del browser.

### Prima di suonare

- **Disattiva il silenzioso.** È la causa numero uno di "non si sente niente":
  su iOS il suono generato dal browser esce sul canale della suoneria.
- Volume del dispositivo al massimo, livello si regola dal mixer.
- Collega con un adattatore USB‑C → jack. Meglio una piccola interfaccia audio:
  gli adattatori economici tendono a ronzare.
- Attiva **schermo** nella barra in alto, così il display non si spegne a metà culto.

---

## Uso

**Accensione.** Il pulsante rotondo sblocca l'audio. È obbligatorio: i browser
non permettono di riprodurre suono senza un tocco dell'utente.

**Tonalità.** I dodici tasti avviano il tappeto. Ritoccando lo stesso tasto il
pad sfuma. Cambiando tasto, il vecchio pad chiude mentre il nuovo apre: nessun
buco. L'interruttore Maggiore/Minore cambia la terza.

**Timbri.** Sei caratteri diversi, dal più caldo al più cristallino:
Velluto, Aurora, Cinema, Fondo, Vetro, Corale.

**Cursori.** *Pad* è il volume del tappeto, *Spazio* dosa il riverbero,
*Dissolv* regola la durata dell'incrocio fra tonalità (da 1 a 14 secondi).

**Effetti.** Sei colpi singoli (Salita, Colpo, Respiro, Luce, Campana, Sub) e due
continui che restano accesi finché non li ritocchi (Vento, Battito).
Luce e Campana seguono la tonalità attiva.

**Loop.** Nei banchi Loop A e Loop B, tieni premuto uno slot per caricare un
file audio dal dispositivo. Un tocco lo avvia o lo ferma. Il mixer sotto regola
il livello di ogni pad.

**Stop.** *Dissolvi* chiude il pad con la dissolvenza impostata.
*Stop* taglia tutto immediatamente: è il pulsante da premere se qualcosa va storto.

---

## Suoni

I pad sono **generati dall'app**, non sono campioni. Questo significa durata
infinita senza ripetizioni udibili, cambio di tonalità istantaneo e nessun file
da gestire. Il carattere "da culto" nasce da un riverbero lungo con la coda che
si scurisce, ottave alte che entrano solo nel riverbero, un ensemble di ritardi
modulati e una saturazione morbida.

### Usare pad registrati

Se preferisci dei campioni veri, il pulsante **set** carica una cartella di file
audio. L'app riconosce la tonalità dal nome del file, in italiano o in inglese:

```
Pad_C.mp3     Pad F#.wav     Bb Pad Warm.wav
Tappeto Do.mp3    Pad Mib.mp3    Sol.wav
```

Caricati i file, compare un timbro in più chiamato **Il tuo set**.

Fonti gratuite: Reawaken Hymns, Worship Tutorials, Pixabay.
Verifica sempre la licenza prima di usare qualcosa in pubblico.

---

## Da fare

- **Collegamento con la modalità live di Be the Light**: il pad segue in
  automatico la tonalità del brano in scaletta, trasposizioni comprese.
- Salvataggio delle preferenze fra una sessione e l'altra.
- Loop conservati sul dispositivo invece che ricaricati ogni volta.

---

© G.B. — Be the Light
