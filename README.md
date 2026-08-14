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

## Modalita' sfondo

Il pulsante **sfondo** nella barra in alto permette al pad di continuare a
suonare quando esci dall'app o blocchi lo schermo. Serve nei culti lunghi, o
quando l'iPad viene usato anche per altro.

Tecnicamente il suono smette di uscire direttamente dalla scheda audio e viene
fatto passare attraverso un elemento media: cosi' il sistema lo tratta come una
riproduzione vera e non lo sospende. Sulla schermata di blocco compaiono il logo,
la tonalita' in corso e i comandi: **pausa** dissolve il pad, **stop** taglia tutto.

Note pratiche:

- Attivalo **prima** di iniziare, non a meta' brano: il passaggio fra le due
  uscite comporta una brevissima attenuazione (poco piu' di un decimo di secondo).
- Con lo sfondo attivo, il pulsante **schermo** diventa superfluo: serviva solo a
  impedire lo spegnimento del display.
- Se il dispositivo non lo permette, l'app te lo dice e torna da sola all'uscita
  normale. Meglio senza sfondo che senza suono.
- Rientrando nell'app, se il sistema aveva messo in pausa la riproduzione, il pad
  riparte da solo.

**Da verificare sul dispositivo.** Questa funzione dipende molto dalla versione
di iOS e non e' verificabile in laboratorio. Prova cosi': attiva lo sfondo, avvia
una tonalita', blocca lo schermo e aspetta un minuto. Se senti ancora il pad,
funziona. Controlla anche che sulla schermata di blocco compaia BTL Pad con il logo.


---

## Collegamento con Be the Light

Il pad puo' seguire la tonalita' del brano attivo nella modalita' live di
Be the Light. Nel pannello **Segui Be the Light** inserisci il codice sessione a
sei caratteri e tocca **segui il live**. Il codice resta salvato sul dispositivo.

Interroga `GET https://btl-nu.vercel.app/api/pad?codice=XXXXXX` ogni 3 secondi.
Nessun login, nessun cookie.

Usa `tonica` (0-11, gia' trasposta) e `modo` **cosi' come arrivano**.
Non ricalcola da `tonalitaOriginale` + `semitoni`: nel database di BTL le
tonalita' sono scritte in modi disomogenei (`A`, `Am`, `Sol`, `Lam`, `F#m`) e si
otterrebbero risultati diversi.

**L'indicatore:**

| pallino | significato |
|---|---|
| spento | non collegato: il pad funziona da solo |
| verde | collegato, con il titolo del canto in corso |
| ambra | live non attivo, o risposta illeggibile |
| rosso | scollegato: **il pad tiene l'ultimo accordo** |

### Scelte pensate per il palco

- Cambia **solo quando tonica o modo cambiano davvero**, usando la dissolvenza
  impostata dall'utente e non un salto secco.
- `stato: "fermo"` non spegne il pad: il leader potrebbe aver chiuso il live a
  canto ancora in corso. Cambia solo l'indicatore.
- **Se la rete cade il pad non ammutolisce mai**: tiene l'accordo e continua a
  ritentare.
- **401** (codice errato): messaggio chiaro e interruttore spento, senza
  ritentare all'infinito.
- **Il comando manuale ha la precedenza**: se il musicista tocca un tasto mentre
  segue il live, vale la sua scelta **fino al cambio di brano**.

---

## Da fare

- Salvataggio delle preferenze fra una sessione e l'altra.
- Verifica della modalita' sfondo su piu' versioni di iOS.
- Loop conservati sul dispositivo invece che ricaricati ogni volta.

---

© G.B. — Be the Light
