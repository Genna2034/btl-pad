(function(){
"use strict";
const VERSIONE_APP="17";

const NOTE=[["C","Do"],["C#","Do#"],["D","Re"],["D#","Mib"],["E","Mi"],["F","Fa"],
            ["F#","Fa#"],["G","Sol"],["G#","Lab"],["A","La"],["A#","Sib"],["B","Si"]];

/* timbri pensati per il worship: attacchi lenti, molta aria, poco medio */
const TIMBRI=[
 /* w = onda principale (sempre morbida) · velo = quanto dente di sega sotto, 0-1
    · terzaLv = peso delle note di terza (sono quelle che rendono nasale)   */
  {n:"Velluto", w:"triangle",velo:.12,det:4, oct:0, voci:[0,7,12,16,19,24], pesi:[1,.85,.95,.06,.85,.45],
             terzaLv:1,sub:0,sh:.16,air:.25,cut:900, q:.4, lv:.78,atk:2.8},
 {n:"Aurora",  w:"triangle",velo:.08,det:5, oct:0, voci:[0,7,12,19,24],   terzaLv:.5, sub:.07,sh:.42,air:.45,cut:1700,q:.4, lv:.62,atk:3.0},
 {n:"Cinema",  w:"triangle",velo:.30,det:6, oct:-1,voci:[0,7,12,16,19,24],terzaLv:.45,sub:.16,sh:.26,air:.3, cut:760, q:.5, lv:.98,atk:3.6},
 {n:"Fondo",   w:"sine",    velo:.18,det:3, oct:-1,voci:[0,7,12],         terzaLv:0,  sub:.30,sh:.05,air:.08,cut:520, q:.6, lv:.72,atk:2.0},
 {n:"Vetro",   w:"sine",    velo:.05,det:7, oct:0, voci:[0,7,12,16,19,23],terzaLv:.45,sub:.05,sh:.60,air:.5, cut:2400,q:.35,lv:.78,atk:3.2},
 {n:"Corale",  w:"triangle",velo:.15,det:6, oct:0, voci:[0,4,7,12,16],    terzaLv:.6, sub:.08,sh:.20,air:.3, cut:1100,q:.45,lv:.96,atk:2.8}
];

/* Lo shimmer e' assoluto: la manopola va da zero a SHIM_MAX per qualunque
   timbro. La posizione iniziale di ciascuno riproduce il suono originale. */
const SHIM_MAX=.62;

const COL={amb:"#C2762F",ros:"#B04249",blu:"#3067AE",ver:"#347E5E",vio:"#63479C",tea:"#2A7683"};
const BANCHI=[
 {n:"Effetti",pads:[
  {id:"salita", t:"Salita", h:"4 s",      c:COL.amb,k:"one"},
  {id:"colpo",  t:"Colpo",  h:"impatto",  c:COL.ros,k:"one"},
  {id:"respiro",t:"Respiro",h:"3 s",      c:COL.blu,k:"one"},
  {id:"luce",   t:"Luce",   h:"in tono",  c:COL.ver,k:"one"},
  {id:"campana",t:"Campana",h:"in tono",  c:COL.vio,k:"one"},
  {id:"sub",    t:"Sub",    h:"caduta",   c:COL.ros,k:"one"},
  {id:"vento",  t:"Vento",  h:"continuo", c:COL.tea,k:"hold"},
  {id:"battito",t:"Battito",h:"continuo", c:COL.ver,k:"hold"}]},
 {n:"Loop A",pads:null},
 {n:"Loop B",pads:null}
];

const S={on:false,ctx:null,master:null,padBus:null,fxBus:null,shimBus:null,wet:null,el:null,
  voce:null,tasto:null,min:false,tim:0,ban:0,pv:.76,rv:.62,fade:4.5,
  liv:{},loops:{},hold:{},lib:{},usaLib:false,wake:null,
  bg:false,lim:null,flusso:null,bgEl:null,
  segui:false,codice:"",timer:null,ultimoLive:null,
  idBrano:null,manualeSu:null,titolo:"",fallimenti:0,inAttesa:null,
  bright:.5,shimmer:.5,baseB:.5,baseS:.5,mov:false,movTimer:null,movT0:0,
  /* set Worship: i dodici pad costruiti dal riferimento, serviti con l'app */
  worship:true, wsGrezzi:{}, wsDecod:{}, wsOrdine:[], wsPronto:false,
  spegnendo:false,spegniTimer:null,
  parTimbro:TIMBRI.map(T=>({b:.5,s:Math.min(1,T.sh/.62)})),
  gain:0,uscitaNodo:null,uscitaId:""};

const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");
 clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("on"),2800);}
const mtof=m=>440*Math.pow(2,(m-69)/12);

/* ================= accensione ================= */
function wavMuto(sec){
  const sr=8000,n=sr*sec,b=new ArrayBuffer(44+n*2),v=new DataView(b);
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,"RIFF");v.setUint32(4,36+n*2,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);
  v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  w(36,"data");v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:"audio/wav"}));
}
let media="—";
function diag(){
  $("#diag").innerHTML=(S.ctx?`${S.ctx.state} · ${Math.round(S.ctx.sampleRate/100)/10} kHz · media ${media}`:"spento")
    +` · v${VERSIONE_APP}`;
}

async function accendi(){
  if(S.on){spegni();return;}
  try{ if(navigator.audioSession) navigator.audioSession.type="playback"; }catch(e){}
  try{
    const a=document.createElement("audio");
    a.src=wavMuto(3);a.loop=true;a.volume=.01;a.setAttribute("playsinline","");
    document.body.appendChild(a);await a.play();S.el=a;media="ok";
  }catch(e){media="no";}
  try{
    if(!S.ctx) buildAudio();
    if(S.ctx.state!=="running") await S.ctx.resume();
  }catch(e){ $("#diag").textContent="errore: "+(e.message||e); return; }
  S.on=true;
  worshipScarica();
  $("#app").classList.add("live");
  $("#power").classList.add("on");
  $("#power").classList.remove("chiama");
  $("#pwA").textContent="Acceso";
  $("#pwC").textContent = S.segui ? "in ascolto dal live" : "scegli una tonalità";
  diag();
  const t=S.ctx.currentTime;
  [0,7].forEach((iv,k)=>{
    const o=S.ctx.createOscillator();o.type="sine";o.frequency.value=mtof(76+iv);
    const g=S.ctx.createGain();
    g.gain.setValueAtTime(.0001,t+k*.1);
    g.gain.exponentialRampToValueAtTime(.14,t+k*.1+.03);
    g.gain.exponentialRampToValueAtTime(.0001,t+1.6);
    o.connect(g);g.connect(S.master);o.start(t+k*.1);o.stop(t+1.7);
  });
  if(S.inAttesa){                        // il live aveva gia' mandato una tonalita'
    const a=S.inAttesa; S.inAttesa=null;
    applicaDaLive(a.t,a.m);
  }
}
/* Lo spegnimento non taglia: dissolve con la durata impostata dall'utente.
   Un secondo tocco durante la dissolvenza spegne subito. */
function spegni(){
  if(S.spegnendo){ spegniSubito(); return; }
  if(S.mov) fermaMovimento();
  const suona = S.voce || Object.keys(S.hold).length ||
                Object.keys(S.loops).some(k=>S.loops[k]&&S.loops[k].src);
  if(!suona){ spegniSubito(); return; }          // nulla in suono: spengo e basta
  S.spegnendo=true;
  const dur=S.fade;
  $("#pwA").textContent="Spegnimento";
  $("#pwC").textContent="dissolvenza · tocca ancora per subito";
  $("#power").classList.add("chiama");
  dissolvi(dur);
  Object.keys(S.hold).forEach(k=>stopHold(k,Math.min(dur,3)));
  Object.keys(S.loops).forEach(k=>{if(S.loops[k]&&S.loops[k].src)stopLoop(k);});
  S.spegniTimer=setTimeout(spegniSubito, dur*1000+400);
}
function spegniSubito(){
  clearTimeout(S.spegniTimer); S.spegniTimer=null; S.spegnendo=false;
  if(S.mov) fermaMovimento();
  panico();S.on=false;
  $("#app").classList.remove("live");
  $("#power").classList.remove("on");
  $("#power").classList.remove("chiama");
  $("#pwA").textContent="Accendi";$("#pwC").textContent="tocca per iniziare";
  disattivaSfondo();
  try{if(S.el){S.el.pause();S.el.remove();S.el=null;}}catch(e){}
  if(S.ctx)S.ctx.suspend();
  media="—";diag();
  if(aggiornaDopo){ setTimeout(()=>location.reload(),600); }
}

/* ================= grafo ================= */
// riverbero lungo e scuro: è ciò che dà il carattere "chiesa"
function irBuf(ctx,dur,dec){
  const n=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let c=0;c<2;c++){
    const d=b.getChannelData(c);let lp=0;
    for(let i=0;i<n;i++){
      const t=i/n;
      const raw=(Math.random()*2-1)*Math.pow(1-t,dec);
      lp=lp*.80+raw*.20;                       // la coda si scurisce col tempo
      const pre=i<ctx.sampleRate*.02?i/(ctx.sampleRate*.02):1;
      d[i]=(lp*1.9)*pre;
    }
  }
  return b;
}
function nz(ctx,sec){
  const n=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
  let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;d[i]=l*2.6;}
  return b;
}
// Curva a ginocchio morbido: sotto la soglia il segnale passa intatto
// (guadagno 1, nessuna colorazione), sopra si piega dolcemente e resta limitato.
// WaveShaper mappa l'ingresso sull'intervallo [-1,1]: la curva va costruita lì.
function curvaMorbida(soglia){
  const n=2048,c=new Float32Array(n),r=1-soglia;
  for(let i=0;i<n;i++){
    const x=i*2/(n-1)-1, a=Math.abs(x);
    const y=a<=soglia ? a : soglia+r*Math.tanh((a-soglia)/r);
    c[i]=Math.sign(x)*y;
  }
  return c;
}
function buildAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctx=new AC({latencyHint:"playback"});
  const master=ctx.createGain();master.gain.value=.92;
  const cp=ctx.createDynamicsCompressor();
  cp.threshold.value=-12;cp.knee.value=18;cp.ratio.value=3.2;cp.attack.value=.02;cp.release.value=.4;

  const cv=ctx.createConvolver();cv.buffer=irBuf(ctx,6.5,2.1);
  const wet=ctx.createGain();wet.gain.value=S.rv;
  const dry=ctx.createGain();dry.gain.value=1;

  // saturazione morbida: toglie la durezza digitale dalle onde a dente di sega
  const sat=ctx.createWaveShaper();sat.curve=curvaMorbida(.68);sat.oversample="4x";

  const padBus=ctx.createGain(),fxBus=ctx.createGain(),shimBus=ctx.createGain();
  // addolcimento: -5 dB sopra i 3,2 kHz, solo sui pad, non sugli effetti
  const dolce=ctx.createBiquadFilter();dolce.type="highshelf";
  dolce.frequency.value=3200;dolce.gain.value=-5;
  padBus.connect(dolce);dolce.connect(sat);sat.connect(dry);sat.connect(cv);
  fxBus.connect(dry);fxBus.connect(cv);
  shimBus.connect(cv);                       // lo shimmer vive solo nel riverbero
  shimBus.gain.value=.9;
  cv.connect(wet);dry.connect(master);wet.connect(master);
  const lim=ctx.createWaveShaper();lim.curve=curvaMorbida(.75);lim.oversample="4x";
  const gn=ctx.createGain();gn.gain.value=Math.pow(10,S.gain/20);
  master.connect(cp);cp.connect(gn);gn.connect(lim);lim.connect(ctx.destination);
  S.lim=lim;S.uscitaNodo=gn;
  Object.assign(S,{ctx,master,padBus,fxBus,shimBus,wet});
}

/* ================= voce del pad ================= */
function makeVoce(root,min,T){
  const ctx=S.ctx,now=ctx.currentTime;
  const out=ctx.createGain();out.gain.value=0;
  const nodi=[];
  const terza=min?3:4;
  const gradi=T.voci.map(x=>(x===16||x===15)?12+terza:(x===4?terza:x));
  const atk=Math.max(1.2,S.fade*T.atk);

  // filtro con movimento lentissimo: il pad non sta mai fermo
  const f=ctx.createBiquadFilter();f.type="lowpass";f.Q.value=T.q;
  const fl=ctx.createOscillator();fl.frequency.value=.035;
  const fa=ctx.createGain();fa.gain.value=T.cut*.22;
  fl.connect(fa);fa.connect(f.frequency);fl.start(now);nodi.push(fl);

  // ensemble: tre ritardi modulati, allarga senza sporcare
  const merge=ctx.createChannelMerger(2);
  for(let i=0;i<3;i++){
    const dl=ctx.createDelay(.06);dl.delayTime.value=.011+i*.008;
    const lo=ctx.createOscillator();lo.frequency.value=.045+i*.03;
    const am=ctx.createGain();am.gain.value=.0019;
    lo.connect(am);am.connect(dl.delayTime);lo.start(now);nodi.push(lo);
    f.connect(dl);dl.connect(merge,0,i%2);
  }
  f.connect(merge,0,0);f.connect(merge,0,1);
  const mv=stadioMovimento(ctx);
  merge.connect(mv.ingresso); mv.uscita.connect(out);

  // velo: un filtro dedicato, piu' chiuso, per il dente di sega che sta sotto
  const velo=ctx.createBiquadFilter();velo.type="lowpass";velo.Q.value=.3;
  velo.frequency.value=Math.max(150,T.cut*.55);
  const veloG=ctx.createGain();veloG.gain.value=T.velo;
  velo.connect(veloG);veloG.connect(f);

  gradi.forEach((semi,i)=>{
    const midi=root+semi+48+T.oct*12;
    const eTerza=(semi===terza||semi===12+terza);
    const g=ctx.createGain();
    let lv=(.66/gradi.length)*(T.pesi ? T.pesi[i] : (1-i*.045));
    if(eTerza && !T.pesi) lv*=T.terzaLv;             // la terza pesa meno: meno nasale
    g.gain.value=0;
    // ogni nota entra con un tempo suo: nessun attacco "a blocco"
    g.gain.setValueAtTime(0,now);
    g.gain.linearRampToValueAtTime(lv,now+atk*(.55+i*.14));
    // respiro indipendente
    const br=ctx.createOscillator();br.frequency.value=.022+Math.random()*.05;
    const ba=ctx.createGain();ba.gain.value=lv*.30;
    br.connect(ba);ba.connect(g.gain);br.start(now);nodi.push(br);

    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
    if(pan){pan.pan.value=(i%2?1:-1)*Math.min(.7,.2+i*.12);g.connect(pan);pan.connect(f);}
    else g.connect(f);

    // onda principale, morbida, due per nota leggermente scordate
    for(let d=-1;d<=1;d+=2){
      const o=ctx.createOscillator();o.type=T.w;o.frequency.value=mtof(midi);
      o.detune.value=d*T.det*(.7+Math.random()*.6);
      o.connect(g);o.start(now+Math.random()*.08);nodi.push(o);
    }
    // velo di dente di sega: uno per nota, attraverso il suo filtro
    if(T.velo>0){
      const sg=ctx.createGain();sg.gain.value=0;
      sg.gain.linearRampToValueAtTime(lv*.9,now+atk*(.7+i*.14));
      const v=ctx.createOscillator();v.type="sawtooth";v.frequency.value=mtof(midi);
      v.detune.value=(i%2?1:-1)*T.det*.6;
      v.connect(sg);sg.connect(velo);v.start(now+Math.random()*.1);nodi.push(v);
    }
  });

  if(T.sub>0){
    const o=ctx.createOscillator();o.type="sine";o.frequency.value=mtof(root+36+T.oct*12);
    const g=ctx.createGain();g.gain.value=0;
    g.gain.linearRampToValueAtTime(T.sub*.5,now+atk);
    o.connect(g);g.connect(f);o.start(now);nodi.push(o);
  }

  // shimmer: ottave alte che entrano solo nel riverbero, molto lente.
  // Costruito sempre, anche per i timbri che ne hanno poco: la manopola
  // deve poterlo aggiungere anche a Velluto o a Fondo.
  const luciShimmer=[];
  [12,19,24].forEach((iv,k)=>{
    const o=ctx.createOscillator();o.type="sine";
    // registro fisso, indipendente dall'ottava del timbro: lo shimmer deve
    // sempre stare SOPRA l'accordo, altrimenti raddoppia le note invece di brillare
    o.frequency.value=mtof(root+60+iv);
    const g=ctx.createGain();g.gain.value=0;
    const base=.085/(k*.55+1);                  // livello a manopola tutta aperta
    const lv=base*S.shimmer*SHIM_MAX;
    g.gain.linearRampToValueAtTime(lv,now+atk*1.9+k*1.1);
    const sw=ctx.createOscillator();sw.frequency.value=.026+k*.017;
    const sa=ctx.createGain();sa.gain.value=lv*.75;
    sw.connect(sa);sa.connect(g.gain);sw.start(now);nodi.push(sw);
    o.connect(g);g.connect(S.shimBus);o.start(now);nodi.push(o);
    luciShimmer.push({g,sa,base});
  });

  // aria: un filo di rumore filtrato altissimo, dà "respiro" al tappeto
  if(T.air>0){
    const s=ctx.createBufferSource();s.buffer=nz(ctx,8);s.loop=true;
    const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=5200;
    const g=ctx.createGain();g.gain.value=0;
    g.gain.linearRampToValueAtTime(T.air*.014,now+atk*1.6);
    s.connect(hp);hp.connect(g);g.connect(S.shimBus);s.start(now);nodi.push(s);
  }

  // la manopola sposta il taglio del filtro fra un terzo e il triplo
  // del valore naturale del timbro
  const taglio=()=>Math.max(180,Math.min(16000,T.cut*Math.pow(3,(S.bright-.5)*2)));
  f.frequency.setValueAtTime(Math.max(180,taglio()*.3),now);
  f.frequency.linearRampToValueAtTime(taglio(),now+atk*1.5);
  out.connect(S.padBus);

  return{
    apri(s){const t=S.ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);
      out.gain.linearRampToValueAtTime(T.lv*S.pv,t+s);},
    vol(){out.gain.setTargetAtTime(T.lv*S.pv,S.ctx.currentTime,.1);},
    brillantezza(){ f.frequency.setTargetAtTime(taglio(),S.ctx.currentTime,.25); },
    movimento(m){ mv.applica(m); },
    shimmer(){
      const t=S.ctx.currentTime;
      luciShimmer.forEach(l=>{
        const lv=l.base*S.shimmer*SHIM_MAX;
        l.g.gain.setTargetAtTime(lv,t,.4);      // lento: lo shimmer non deve scattare
        l.sa.gain.setTargetAtTime(lv*.75,t,.4);
      });
    },
    chiudi(s){const t=S.ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);
      out.gain.linearRampToValueAtTime(.0001,t+s);
      setTimeout(()=>{nodi.forEach(n=>{try{n.stop();}catch(e){}});
        try{out.disconnect();}catch(e){}},s*1000+400);}
  };
}

/* voce da file, se hai caricato un set */
function makeVoceFile(buf, root){
  /* Looper a dissolvenza incrociata: due istanze del file che si passano il
     testimone con 3 s di sovrapposizione a potenza costante. Assorbe il
     silenzio aggiunto dalla codifica MP3 ai bordi e non produce mai un clic. */
  const ctx=S.ctx, t0=ctx.currentTime, X=3, dur=buf.duration;
  const out=ctx.createGain(); out.gain.value=0;
  const f=ctx.createBiquadFilter(); f.type="lowpass"; f.Q.value=.3;
  // da 550 Hz a 8,8 kHz, centro a 2,2 kHz: sopra il contenuto del riferimento,
  // cosi' al centro il suono resta intatto e a sinistra si scurisce davvero
  const taglio=()=>Math.max(300,Math.min(20000, 2200*Math.pow(4,(S.bright-.5)*2)));
  f.frequency.value=taglio();
  // meta' destra della manopola: spinta sugli acuti fino a +9 dB sopra 1 kHz
  const sp=ctx.createBiquadFilter(); sp.type="highshelf"; sp.frequency.value=1000;
  const spinta=()=>Math.max(0,(S.bright-.5)*2)*9;
  sp.gain.value=spinta();
  const mv=stadioMovimento(ctx);
  f.connect(sp); sp.connect(mv.ingresso); mv.uscita.connect(out); out.connect(S.padBus);
  const vivi=[]; let fermo=false, prox=null;
  function istanza(quando){
    const s=ctx.createBufferSource(); s.buffer=buf;
    const g=ctx.createGain(); g.gain.setValueAtTime(0,quando);
    // entrata a potenza costante lungo X secondi
    const n=24; for(let k=1;k<=n;k++) g.gain.linearRampToValueAtTime(Math.sin(k/n*Math.PI/2), quando+X*k/n);
    const fine=quando+dur-X;
    for(let k=1;k<=n;k++) g.gain.linearRampToValueAtTime(Math.cos(k/n*Math.PI/2), fine+X*k/n);
    s.connect(g); g.connect(f);
    s.start(quando, 0.05); s.stop(quando+dur+.1);
    vivi.push(s);
    if(!fermo) prox=setTimeout(()=>{ if(!fermo) istanza(fine); }, Math.max(0,(fine-ctx.currentTime-1)*1000));
  }
  istanza(t0);

  // shimmer sintetico sopra il file: ottave alte solo nel riverbero, come nella sintesi
  const luci=[]; const nodi=[];
  if(root!==undefined){
    [12,19,24].forEach((iv,k)=>{
      const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=mtof(root+60+iv);
      const g=ctx.createGain(); g.gain.value=0;
      const base=.085/(k*.55+1);
      g.gain.linearRampToValueAtTime(base*S.shimmer*SHIM_MAX, t0+5+k*1.1);
      const sw=ctx.createOscillator(); sw.frequency.value=.026+k*.017;
      const sa=ctx.createGain(); sa.gain.value=base*S.shimmer*SHIM_MAX*.75;
      sw.connect(sa); sa.connect(g.gain); sw.start(t0); nodi.push(sw);
      o.connect(g); g.connect(S.shimBus); o.start(t0); nodi.push(o);
      luci.push({g,sa,base});
    });
  }
  return{
    apri(sec){const t=ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(S.pv*1.05,t+sec);},
    vol(){out.gain.setTargetAtTime(S.pv*1.05,ctx.currentTime,.1);},
    brillantezza(){ f.frequency.setTargetAtTime(taglio(),ctx.currentTime,.25);
      sp.gain.setTargetAtTime(spinta(),ctx.currentTime,.25); },
    movimento(m){ mv.applica(m); },
    shimmer(){ const t=ctx.currentTime; luci.forEach(l=>{ const lv=l.base*S.shimmer*SHIM_MAX;
      l.g.gain.setTargetAtTime(lv,t,.4); l.sa.gain.setTargetAtTime(lv*.75,t,.4); }); },
    chiudi(sec){fermo=true; clearTimeout(prox);
      const t=ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(.0001,t+sec);
      setTimeout(()=>{vivi.forEach(x=>{try{x.stop();}catch(e){}});nodi.forEach(x=>{try{x.stop();}catch(e){}});
        try{out.disconnect();}catch(e){}},sec*1000+300);}
  };
}

function suona(i){
  const useLib=S.usaLib&&S.lib[i];
  if(S.worship && !useLib){
    const seq=++suona.seq;
    worshipBuffer(i).then(buf=>{
      if(seq!==suona.seq) return;                      // nel frattempo e' cambiata tonalita'
      if(!buf){ S.worship=false; patch(); suona(i); return; }
      avviaVoce(makeVoceFile(buf,i), i, "worship");
    });
    return;
  }
  avviaVoce(useLib?makeVoceFile(S.lib[i]):makeVoce(i,S.min,TIMBRI[S.tim]), i,
            useLib?"set caricato":TIMBRI[S.tim].n.toLowerCase());
}
suona.seq=0;
function avviaVoce(v,i,etichetta){
  if(S.voce)S.voce.chiudi(S.fade);
  S.voce=v;v.apri(Math.max(1,S.fade));
  S.tasto=i;keys();hue(i);aggiornaSchedaSistema();
  $("#pwC").textContent=etichetta;
}
function dissolvi(s){
  if(!S.voce)return;
  const v=S.voce;S.voce=null;v.chiudi(s===undefined?S.fade:s);
  S.tasto=null;keys();aggiornaSchedaSistema();
}
function panico(){
  if(S.voce){const v=S.voce;S.voce=null;v.chiudi(.08);}
  S.tasto=null;
  Object.keys(S.hold).forEach(k=>stopHold(k,.15));
  Object.keys(S.loops).forEach(k=>{if(S.loops[k]&&S.loops[k].src)stopLoop(k);});
  keys();grid();
}
function hue(i){
  const h=(i*29+206)%360;
  document.documentElement.style.setProperty("--hue",h);
}

/* ================= effetti ================= */
function ch(id){
  if(!S.liv[id]){const g=S.ctx.createGain();g.gain.value=.85;g.connect(S.fxBus);S.liv[id]={g,v:85};}
  return S.liv[id].g;
}
const FX={
 salita(o){const c=S.ctx,t=c.currentTime,d=4,s=c.createBufferSource();s.buffer=nz(c,d+.4);
  const bp=c.createBiquadFilter();bp.type="bandpass";bp.Q.value=3.2;
  bp.frequency.setValueAtTime(240,t);bp.frequency.exponentialRampToValueAtTime(8200,t+d);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.34,t+d*.94);g.gain.exponentialRampToValueAtTime(.0001,t+d+.3);
  s.connect(bp);bp.connect(g);g.connect(o);s.start(t);s.stop(t+d+.5);},
 colpo(o){const c=S.ctx,t=c.currentTime,s=c.createOscillator();s.type="sine";
  s.frequency.setValueAtTime(92,t);s.frequency.exponentialRampToValueAtTime(30,t+1.1);
  const g=c.createGain();g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.7);
  s.connect(g);g.connect(o);s.start(t);s.stop(t+1.8);
  const n=c.createBufferSource();n.buffer=nz(c,.6);
  const lp=c.createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(3000,t);lp.frequency.exponentialRampToValueAtTime(300,t+.5);
  const ng=c.createGain();ng.gain.setValueAtTime(.3,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.55);
  n.connect(lp);lp.connect(ng);ng.connect(o);n.start(t);n.stop(t+.6);},
 respiro(o){const c=S.ctx,t=c.currentTime,d=3,s=c.createBufferSource();s.buffer=nz(c,d+.3);
  const lp=c.createBiquadFilter();lp.type="lowpass";lp.Q.value=1.1;
  lp.frequency.setValueAtTime(420,t);lp.frequency.exponentialRampToValueAtTime(6200,t+d);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.26,t+d);g.gain.exponentialRampToValueAtTime(.0001,t+d+.35);
  s.connect(lp);lp.connect(g);g.connect(o);s.start(t);s.stop(t+d+.45);},
 luce(o){const c=S.ctx,t=c.currentTime,d=5.5,r=S.tasto===null?0:S.tasto;
  const terza=S.min?3:4;
  [12,19,24,12+terza+12].forEach((iv,k)=>{
   const s=c.createOscillator();s.type="sine";s.frequency.value=mtof(r+48+iv);
   const g=c.createGain();g.gain.setValueAtTime(.0001,t+k*.18);
   g.gain.exponentialRampToValueAtTime(.075/(k*.4+1),t+d*.7);
   g.gain.exponentialRampToValueAtTime(.0001,t+d+.8);
   s.connect(g);g.connect(o);s.start(t+k*.18);s.stop(t+d+1);});},
 campana(o){const c=S.ctx,t=c.currentTime,r=S.tasto===null?0:S.tasto;
  [0,7,12,19].forEach((iv,k)=>{
   const s=c.createOscillator();s.type="sine";s.frequency.value=mtof(r+60+iv);
   const g=c.createGain();g.gain.setValueAtTime(.0001,t+k*.06);
   g.gain.exponentialRampToValueAtTime(.13/(k+1),t+k*.06+.012);
   g.gain.exponentialRampToValueAtTime(.0001,t+3.6);
   s.connect(g);g.connect(o);s.start(t+k*.06);s.stop(t+3.8);});},
 sub(o){const c=S.ctx,t=c.currentTime,s=c.createOscillator();s.type="sine";
  s.frequency.setValueAtTime(150,t);s.frequency.exponentialRampToValueAtTime(26,t+2.4);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(.5,t+.15);g.gain.exponentialRampToValueAtTime(.0001,t+2.7);
  s.connect(g);g.connect(o);s.start(t);s.stop(t+2.8);}
};
const HOLD={
 vento(o){const c=S.ctx,t=c.currentTime,s=c.createBufferSource();s.buffer=nz(c,8);s.loop=true;
  const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=760;
  const hp=c.createBiquadFilter();hp.type="highpass";hp.frequency.value=170;
  const lo=c.createOscillator();lo.frequency.value=.05;
  const a=c.createGain();a.gain.value=400;lo.connect(a);a.connect(lp.frequency);lo.start(t);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.2,t+3);
  s.connect(hp);hp.connect(lp);lp.connect(g);g.connect(o);s.start(t);
  return{g,stop(){try{s.stop();lo.stop();}catch(e){}}};},
 battito(o){const c=S.ctx,g=c.createGain();g.gain.value=1;g.connect(o);
  let vivo=true;
  const tick=()=>{if(!vivo)return;const t=c.currentTime,s=c.createOscillator();s.type="sine";
   s.frequency.setValueAtTime(74,t);s.frequency.exponentialRampToValueAtTime(38,t+.32);
   const e=c.createGain();e.gain.setValueAtTime(.0001,t);
   e.gain.exponentialRampToValueAtTime(.45,t+.012);e.gain.exponentialRampToValueAtTime(.0001,t+.55);
   s.connect(e);e.connect(g);s.start(t);s.stop(t+.6);};
  tick();const iv=setInterval(tick,1500);
  return{g,stop(){vivo=false;clearInterval(iv);}};}
};
function stopHold(id,f){
  const h=S.hold[id];if(!h)return;delete S.hold[id];
  const t=S.ctx.currentTime;h.g.gain.cancelScheduledValues(t);
  h.g.gain.setValueAtTime(h.g.gain.value,t);h.g.gain.linearRampToValueAtTime(.0001,t+(f||1));
  setTimeout(()=>h.stop(),(f||1)*1000+250);
}

/* ================= loop ================= */
function carica(id){
  const i=document.createElement("input");i.type="file";i.accept="audio/*";
  i.onchange=async()=>{const f=i.files&&i.files[0];if(!f)return;
   try{toast("Preparo "+f.name);
    const b=await S.ctx.decodeAudioData(await f.arrayBuffer());
    S.loops[id]={n:f.name.replace(/\.[^.]+$/,"").slice(0,14),buffer:b,src:null,g:null};
    grid();mix();toast("Pronto");
   }catch(e){toast("Non riesco a leggerlo: prova .wav o .m4a");}};
  i.click();
}
function startLoop(id){
  const L=S.loops[id],c=S.ctx,t=c.currentTime,s=c.createBufferSource();
  s.buffer=L.buffer;s.loop=true;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(1,t+.2);
  s.connect(g);g.connect(ch(id));s.start(t);L.src=s;L.g=g;grid();
}
function stopLoop(id){
  const L=S.loops[id];if(!L||!L.src)return;
  const t=S.ctx.currentTime,s=L.src;
  L.g.gain.cancelScheduledValues(t);L.g.gain.setValueAtTime(L.g.gain.value,t);
  L.g.gain.linearRampToValueAtTime(.0001,t+.25);
  setTimeout(()=>{try{s.stop();}catch(e){}},350);
  L.src=null;L.g=null;grid();
}

/* ============ set di pad da file: riconosce la tonalità dal nome ============ */
function tonalitaDaNome(nome){
  const n=nome.toUpperCase().replace(/\.[^.]+$/,"");
  const mappa=[["DO#",1],["RE#",3],["FA#",6],["SOL#",8],["LA#",10],
               ["MIB",3],["SIB",10],["LAB",8],["REB",1],["SOLB",6],
               ["C#",1],["D#",3],["F#",6],["G#",8],["A#",10],
               ["DB",1],["EB",3],["GB",6],["AB",8],["BB",10],
               ["DO",0],["RE",2],["MI",4],["FA",5],["SOL",7],["LA",9],["SI",11]];
  for(const[k,v] of mappa){
    if(new RegExp("(^|[^A-Z])"+k.replace("#","\\#")+"([^A-Z]|$)").test(n)) return v;
  }
  const m=n.match(/(^|[^A-Z])([A-G])([^A-Z]|$)/);
  if(m) return {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[2]];
  return null;
}
function caricaSet(){
  const i=document.createElement("input");i.type="file";i.accept="audio/*";i.multiple=true;
  i.onchange=async()=>{
    const fs=Array.from(i.files||[]);if(!fs.length)return;
    toast("Carico "+fs.length+" file…");
    let ok=0;
    for(const f of fs){
      const k=tonalitaDaNome(f.name);
      if(k===null) continue;
      try{ S.lib[k]=await S.ctx.decodeAudioData(await f.arrayBuffer()); ok++; }catch(e){}
    }
    if(ok){ S.usaLib=true; $("#lib").classList.add("on");
      toast(ok+" tonalità caricate — ora suonano i tuoi pad"); patch(); }
    else toast("Nessun nome riconosciuto: rinomina i file con la tonalità (es. Pad_C.mp3)");
  };
  i.click();
}


/* ============================================================
   COLLEGAMENTO CON LA MODALITA' LIVE DI BE THE LIGHT
   Endpoint HTTP interrogato ogni 3 secondi. Nessun login, nessun cookie.
   Regola che governa tutto: la rete puo' solo AGGIUNGERE informazione.
   Se cade, il pad continua a suonare l'ultimo accordo.
   ============================================================ */
const BTL = "https://btl-nu.vercel.app";
const OGNI = 3000;            // ritmo di interrogazione richiesto
const SCADENZA = 5000;        // oltre questo abbandono la richiesta

function memorizza(){ try{ localStorage.setItem("btlpad.codice",S.codice); }catch(e){} }
function ripristina(){
  // il codice puo' arrivare dall'indirizzo: btl-pad.vercel.app/?codice=X9K2M7
  let daUrl="";
  try{ daUrl=(new URLSearchParams(location.search).get("codice")||"").trim().toUpperCase(); }catch(e){}
  if(daUrl.length===6){
    S.codice=daUrl; memorizza();
    try{ history.replaceState(null,"",location.pathname); }catch(e){}   // pulisco l'indirizzo
  } else {
    try{ S.codice = localStorage.getItem("btlpad.codice") || ""; }catch(e){}
  }
  const c=$("#codice"); if(c) c.value=S.codice;
  // codice gia' noto: mi collego da solo, senza far toccare nulla
  if(S.codice.length===6) collega();
}

function spia(colore,testo){
  const p=$("#spia"); if(p) p.className="spia"+(colore?" "+colore:"");
  const t=$("#syncStato"); if(t) t.textContent=testo;
}

/* Lettura del payload. 'fermo' NON e' un errore: e' uno stato legittimo
   in cui tonica vale null. */
function leggiPayload(j){
  if(!j || typeof j!=="object") return null;
  const fermo = String(j.stato||"").toLowerCase()==="fermo";
  const brano = j.brano||{};
  const titolo = String(brano.titolo||"").slice(0,26);
  const idBrano = brano.id!=null ? String(brano.id) : (titolo||null);
  if(fermo) return {fermo:true, titolo, idBrano};
  if(!Number.isInteger(j.tonica) || j.tonica<0 || j.tonica>11) return null;
  return {
    fermo:false,
    tonica:j.tonica,
    minore:String(j.modo||"").toLowerCase().startsWith("min"),
    titolo, idBrano
  };
}

async function interroga(){
  if(!S.segui) return;
  const url = BTL+"/api/pad?codice="+encodeURIComponent(S.codice);
  const ab = new AbortController();
  const scad = setTimeout(()=>ab.abort(), SCADENZA);
  try{
    const r = await fetch(url,{signal:ab.signal,cache:"no-store",
                              credentials:"omit",headers:{"Accept":"application/json"}});
    clearTimeout(scad);

    // codice sbagliato: e' inutile insistere, spengo e lo dico chiaramente
    if(r.status===401 || r.status===403 || r.status===404){
      scollega();
      spia("rossa","codice non valido");
      toast("Codice sessione non valido: controllalo su Be the Light");
      return;
    }
    if(!r.ok) throw new Error("HTTP "+r.status);

    const d = leggiPayload(await r.json());
    S.fallimenti = 0;
    if(!d){ spia("ambra","risposta non leggibile"); return; }

    // brano nuovo: decade l'eventuale scelta manuale del musicista
    if(d.idBrano && d.idBrano!==S.idBrano){ S.idBrano=d.idBrano; S.manualeSu=null; }
    S.titolo = d.titolo;

    if(d.fermo){
      spia("ambra","live non attivo"+(d.titolo?" · "+d.titolo:""));
      return;                                   // il pad resta com'e'
    }
    if(S.manualeSu && S.manualeSu===S.idBrano){
      spia("verde",(d.titolo||"collegato")+" · scelta manuale");
      return;                                   // comanda il musicista
    }
    applicaDaLive(d.tonica,d.minore);
    spia("verde",(d.titolo||"collegato")+" · "+NOTE[d.tonica][1]+(d.minore?"m":""));

  }catch(e){
    clearTimeout(scad);
    S.fallimenti++;
    spia("rossa", S.tasto!==null ? "scollegato · tengo l'accordo" : "scollegato");
  }
}

function applicaDaLive(t,minore){
  if(!S.on){                                          // audio non ancora sbloccato dal browser
    S.inAttesa={t,m:minore};
    $("#power").classList.add("chiama");
    $("#pwC").textContent="tocca per accendere · "+NOTE[t][1]+(minore?" minore":" maggiore");
    return;
  }
  if(S.ultimoLive && S.ultimoLive.t===t && S.ultimoLive.m===minore) return;  // identica: non tocco nulla
  S.ultimoLive={t,m:minore};
  if(S.min!==minore){
    S.min=minore;
    $$("#mode button").forEach(b=>b.classList.toggle("on",(b.dataset.m==="1")===minore));
  }
  suona(t);                                           // usa la dissolvenza scelta dall'utente
}

function ciclo(){
  clearTimeout(S.timer);
  if(!S.segui) return;
  interroga().finally(()=>{ if(S.segui) S.timer=setTimeout(ciclo,OGNI); });
}

function collega(){
  const c=$("#codice");
  S.codice=(c.value||"").trim().toUpperCase();
  if(S.codice.length!==6){ toast("Il codice sessione ha sei caratteri"); return; }
  memorizza();
  S.segui=true; S.fallimenti=0; S.ultimoLive=null; S.manualeSu=null; S.idBrano=null; S.inAttesa=null;
  $("#segui").textContent="smetti di seguire";
  $("#segui").classList.add("on");
  spia("ambra","collegamento…");
  ciclo();
}
function scollega(){
  S.segui=false; clearTimeout(S.timer); S.timer=null;
  S.ultimoLive=null; S.manualeSu=null; S.inAttesa=null;
  $("#power").classList.remove("chiama");
  $("#segui").textContent="segui il live";
  $("#segui").classList.remove("on");
  spia("","non collegato");        // il pad continua a suonare
}

/* Il musicista tocca un tasto mentre e' collegato: comanda lui,
   fino al cambio di brano. */
function manualeHaPriorita(){
  if(!S.segui) return;
  S.manualeSu = S.idBrano || "senza-brano";
  spia("verde",(S.titolo||"collegato")+" · scelta manuale");
}

/* ============================================================
   MODALITA' SFONDO
   Il Web Audio da solo viene sospeso quando la pagina passa in
   secondo piano. Facendo uscire il suono attraverso un elemento
   media, il sistema lo considera una riproduzione vera e continua
   anche a schermo bloccato, con i comandi sulla schermata di blocco.
   ============================================================ */

function supportaSfondo(){
  return !!(S.ctx && S.ctx.createMediaStreamDestination && window.MediaStream);
}

/* piccola dissolvenza sul volume generale: evita lo scatto al cambio di uscita */
function conAttenuazione(azione){
  if(!S.master){ azione(); return; }
  const g=S.master.gain, t=S.ctx.currentTime, v=g.value;
  g.cancelScheduledValues(t);
  g.setValueAtTime(v,t);
  g.linearRampToValueAtTime(.0001,t+.06);
  setTimeout(()=>{
    try{ azione(); }catch(e){}
    const t2=S.ctx.currentTime;
    g.cancelScheduledValues(t2);
    g.setValueAtTime(.0001,t2);
    g.linearRampToValueAtTime(v,t2+.12);
  },80);
}

async function attivaSfondo(){
  if(!S.on){ await accendi(); if(!S.on) return; }
  if(!supportaSfondo()){ toast("Questo browser non permette l'audio in secondo piano"); return; }
  try{
    if(!S.flusso) S.flusso=S.ctx.createMediaStreamDestination();
    if(!S.bgEl){
      const el=document.createElement("audio");
      el.setAttribute("playsinline","");
      el.autoplay=true;
      el.className="uscita-sfondo";
      document.body.appendChild(el);
      S.bgEl=el;
    }
    S.bgEl.srcObject=S.flusso.stream;
    // una sola uscita per volta, altrimenti il suono si sdoppia e si sporca
    conAttenuazione(()=>{
      try{ S.lim.disconnect(); }catch(e){}
      S.lim.connect(S.flusso);
    });
    await S.bgEl.play();
    if(S.uscitaId && typeof S.bgEl.setSinkId==="function"){
      try{ await S.bgEl.setSinkId(S.uscitaId); }catch(e){}
    }
    S.bg=true;
    $("#sfondo").classList.add("on");
    preparaComandiSistema();
    aggiornaSchedaSistema();
    toast("Il suono continua anche a schermo spento");
  }catch(e){
    // ripristino l'uscita normale: meglio senza sfondo che senza suono
    try{ S.lim.disconnect(); S.lim.connect(S.ctx.destination); }catch(e2){}
    S.bg=false;
    $("#sfondo").classList.remove("on");
    toast("Non riesco ad attivare lo sfondo su questo dispositivo");
  }
}

function disattivaSfondo(){
  if(!S.bg) return;
  conAttenuazione(()=>{
    try{ S.lim.disconnect(); }catch(e){}
    S.lim.connect(S.ctx.destination);
  });
  try{ if(S.bgEl) S.bgEl.pause(); }catch(e){}
  S.bg=false;
  $("#sfondo").classList.remove("on");
  try{ if(navigator.mediaSession) navigator.mediaSession.playbackState="none"; }catch(e){}
}

/* comandi sulla schermata di blocco e sugli auricolari */
function preparaComandiSistema(){
  if(!("mediaSession" in navigator)) return;
  const m=navigator.mediaSession;
  const metti=(nome,fn)=>{ try{ m.setActionHandler(nome,fn); }catch(e){} };
  metti("play", ()=>{ try{ S.ctx.resume(); if(S.bgEl) S.bgEl.play(); }catch(e){}
                      m.playbackState="playing"; });
  metti("pause", ()=>{ dissolvi(); m.playbackState="paused"; });
  metti("stop", ()=>{ panico(); m.playbackState="paused"; });
  metti("previoustrack", null);
  metti("nexttrack", null);
  metti("seekbackward", null);
  metti("seekforward", null);
}

function aggiornaSchedaSistema(){
  if(!("mediaSession" in navigator) || !S.bg) return;
  try{
    const suona = S.tasto!==null;
    const tonalita = suona ? (NOTE[S.tasto][1]+(S.min?" minore":" maggiore")) : "in attesa";
    if(window.MediaMetadata){
      navigator.mediaSession.metadata=new MediaMetadata({
        title:"BTL Pad — "+tonalita,
        artist: S.usaLib ? "Il tuo set" : (S.worship ? "Worship" : TIMBRI[S.tim].n),
        album:"Be the Light",
        artwork:[{src:"/logo.png",sizes:"440x440",type:"image/png"}]
      });
    }
    navigator.mediaSession.playbackState = suona ? "playing" : "paused";
  }catch(e){}
}


/* ============================================================
   USCITA AUDIO E GUADAGNO
   Il guadagno agisce PRIMA del limitatore: alzandolo il suono diventa
   piu' presente senza mai superare il fondo scala. Spinto molto,
   aggiunge una compressione udibile: e' il compromesso che evita la
   distorsione digitale.
   ============================================================ */
function applicaGuadagno(){
  if(!S.uscitaNodo) return;
  S.uscitaNodo.gain.setTargetAtTime(Math.pow(10,S.gain/20),S.ctx.currentTime,.05);
}

function uscitaSupportata(){
  return !!(S.ctx && typeof S.ctx.setSinkId==="function") ||
         (typeof HTMLMediaElement!=="undefined" &&
          typeof HTMLMediaElement.prototype.setSinkId==="function");
}

async function rilevaUscite(){
  const sel=$("#uscita"), stato=$("#uscitaStato");
  if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
    stato.textContent="questo dispositivo non permette di scegliere l'uscita";
    sel.disabled=true; return;
  }
  if(!uscitaSupportata()){
    stato.textContent="su iPad e iPhone l'uscita si sceglie dal sistema, non da qui";
    sel.disabled=true; return;
  }
  try{
    let disp=(await navigator.mediaDevices.enumerateDevices())
               .filter(d=>d.kind==="audiooutput");
    // senza permesso i nomi sono vuoti: lo chiedo e lo rilascio subito
    if(disp.length && !disp[0].label){
      const f=await navigator.mediaDevices.getUserMedia({audio:true});
      f.getTracks().forEach(t=>t.stop());
      disp=(await navigator.mediaDevices.enumerateDevices())
             .filter(d=>d.kind==="audiooutput");
    }
    sel.innerHTML='<option value="">uscita predefinita</option>';
    disp.forEach((d,i)=>{
      const o=document.createElement("option");
      o.value=d.deviceId;
      o.textContent=d.label||("uscita "+(i+1));
      sel.appendChild(o);
    });
    sel.disabled=false;
    if(S.uscitaId) sel.value=S.uscitaId;
    stato.textContent=disp.length+" uscite trovate";
  }catch(e){
    stato.textContent="permesso negato: non posso leggere i nomi delle schede";
  }
}

async function applicaUscita(id){
  const stato=$("#uscitaStato");
  try{
    if(S.ctx && typeof S.ctx.setSinkId==="function") await S.ctx.setSinkId(id||"");
    if(S.bgEl && typeof S.bgEl.setSinkId==="function") await S.bgEl.setSinkId(id||"");
    S.uscitaId=id;
    try{ localStorage.setItem("btlpad.uscita",id||""); }catch(e){}
    const n=$("#uscita").selectedOptions[0];
    stato.textContent="uscita: "+((n&&n.textContent)||"predefinita");
  }catch(e){
    stato.textContent="non riesco a usare questa uscita";
  }
}

/* ---- brillantezza e shimmer, memorizzati per ogni timbro ---- */
function caricaParametriTimbro(){
  const p=S.parTimbro[S.tim];
  S.baseB=p.b; S.baseS=p.s;
  S.bright=p.b; S.shimmer=p.s;
  const b=$("#br"), h=$("#sh");
  if(b){ b.value=Math.round(S.bright*100); $("#brV").textContent=b.value; }
  if(h){ h.value=Math.round(S.shimmer*100); $("#shV").textContent=h.value; }
}
function salvaParametriTimbro(){
  S.parTimbro[S.tim]={b:S.baseB,s:S.baseS};     // si salva il centro, non l'istante
}

/* ============================================================
   MOVIMENTO
   Brillantezza e shimmer oscillano lentamente attorno ai valori
   scelti dall'utente. Due cicli per manopola, di durata diversa e
   non commensurabile, cosi' il moto non si ripete mai uguale.
   I cursori seguono a schermo, ma il centro resta quello impostato.
   ============================================================ */
const MOV_PASSO=80;              // ms fra un aggiornamento e l'altro
const MOV_AMP_B=.22, MOV_AMP_S=.26;

/* Tre respiri sovrapposti, di periodo non commensurabile: cosi' il moto non si
   ripete mai uguale. Il piu' lento governa il filtro (12 s), gli altri il
   volume (8,5 s) e la posizione stereo (19 s). */
function movimentoValori(t){
  const b = MOV_AMP_B*(.68*Math.sin(t/12.0) + .32*Math.sin(t/4.1+1.1));
  const sh= MOV_AMP_S*(.66*Math.sin(t/17.0+2.0) + .34*Math.sin(t/6.3+.4));
  const apertura = .5+.5*(.72*Math.sin(t/12.0) + .28*Math.sin(t/4.7+2.3));   // 0..1
  const ondeggio = .5+.5*Math.sin(t/8.5+1.0);
  return {
    b: Math.max(0,Math.min(1,S.baseB+b)),
    s: Math.max(0,Math.min(1,S.baseS+sh)),
    taglio: 420*Math.pow(7000/420, apertura),      // da 420 Hz a 7 kHz: si sente su tutto
    guadagno: .84+.16*ondeggio,                     // ±0,75 dB circa
    pan: .32*Math.sin(t/19.0)
  };
}
function movimentoPasso(){
  if(!S.mov) return;
  const t=(Date.now()-S.movT0)/1000;
  const v=movimentoValori(t);
  S.bright=v.b; S.shimmer=v.s;
  if(S.voce){
    if(S.voce.brillantezza) S.voce.brillantezza();
    if(S.voce.shimmer) S.voce.shimmer();
    if(S.voce.movimento) S.voce.movimento(v);
  }
  const br=$("#br"), sh=$("#sh");
  if(br){ br.value=Math.round(v.b*100); $("#brV").textContent=br.value; }
  if(sh){ sh.value=Math.round(v.s*100); $("#shV").textContent=sh.value; }
}
function avviaMovimento(){
  if(!S.on){ accendi(); }
  S.mov=true; S.movT0=Date.now();
  clearInterval(S.movTimer);
  S.movTimer=setInterval(movimentoPasso,MOV_PASSO);
  $("#mov").classList.add("on");
  $("#mov").textContent="movimento · attivo";
  toast("Il tappeto ora respira da solo");
}
function fermaMovimento(){
  S.mov=false; clearInterval(S.movTimer); S.movTimer=null;
  $("#mov").classList.remove("on");
  $("#mov").textContent="movimento";
  // torno dolcemente al centro impostato
  S.bright=S.baseB; S.shimmer=S.baseS;
  if(S.voce){ if(S.voce.brillantezza) S.voce.brillantezza(); if(S.voce.shimmer) S.voce.shimmer();
              if(S.voce.movimento) S.voce.movimento(null); }
  const br=$("#br"), sh=$("#sh");
  if(br){ br.value=Math.round(S.baseB*100); $("#brV").textContent=br.value; }
  if(sh){ sh.value=Math.round(S.baseS*100); $("#shV").textContent=sh.value; }
}



/* ============================================================
   SET WORSHIP
   Dodici pad costruiti dal riferimento fornito dall'utente, uno per
   tonalita', serviti con l'app (cartella /pad). I file compressi si
   scaricano all'accensione (4 MB); ogni tonalita' si decodifica alla
   prima richiesta e resta in memoria, al massimo quattro per volta.
   ============================================================ */
const WS_NOMI=["C","Cs","D","Ds","E","F","Fs","G","Gs","A","As","B"];
async function worshipScarica(){
  if(S.wsPronto) return;
  let ok=0;
  await Promise.all(WS_NOMI.map(async(n,k)=>{
    try{ const r=await fetch("/pad/"+n+".mp3",{cache:"force-cache"});
         if(r.ok){ S.wsGrezzi[k]=await r.arrayBuffer(); ok++; } }catch(e){}
  }));
  S.wsPronto = ok===12;
  if(!S.wsPronto && ok>0) toast("Set Worship incompleto: "+ok+" tonalità su 12");
  if(ok===0){ S.worship=false; patch(); toast("Set Worship non disponibile: uso la sintesi"); }
}
async function worshipBuffer(k){
  if(S.wsDecod[k]) { S.wsOrdine=S.wsOrdine.filter(x=>x!==k); S.wsOrdine.push(k); return S.wsDecod[k]; }
  const grezzo=S.wsGrezzi[k]; if(!grezzo) return null;
  const b=await S.ctx.decodeAudioData(grezzo.slice(0));
  S.wsDecod[k]=b; S.wsOrdine.push(k);
  while(S.wsOrdine.length>4){ const v=S.wsOrdine.shift(); if(v!==S.tasto) delete S.wsDecod[v]; }
  return b;
}


/* Stadio di movimento: un filtro che respira, un lieve ondeggiare di volume e
   una deriva stereo. A riposo e' trasparente (filtro aperto, guadagno 1,
   centro). Lo usano sia le voci sintetiche sia quelle da file. */
function stadioMovimento(ctx){
  const f=ctx.createBiquadFilter(); f.type="lowpass"; f.Q.value=.6; f.frequency.value=20000;
  const g=ctx.createGain(); g.gain.value=1;
  const p=ctx.createStereoPanner?ctx.createStereoPanner():null;
  f.connect(g); if(p){ g.connect(p); }
  return {
    ingresso:f, uscita:(p||g),
    applica(m){
      const t=ctx.currentTime;
      if(!m){ f.frequency.setTargetAtTime(20000,t,.6); g.gain.setTargetAtTime(1,t,.6);
              if(p) p.pan.setTargetAtTime(0,t,.6); return; }
      f.frequency.setTargetAtTime(m.taglio,t,.12);
      g.gain.setTargetAtTime(m.guadagno,t,.12);
      if(p) p.pan.setTargetAtTime(m.pan,t,.12);
    }
  };
}

/* ================= render ================= */
function keys(){
  $$(".nk").forEach(k=>k.classList.toggle("on",+k.dataset.i===S.tasto));
  const has=S.tasto!==null;
  $("#nowK").textContent=has?(NOTE[S.tasto][0]+(S.min?"m":"")):"—";
  $("#nowS").textContent=has?(NOTE[S.tasto][1]+(S.min?" minore":" maggiore")):"nessuna tonalità";
}
function buildKeys(){
  const w=$("#kg");w.innerHTML="";
  NOTE.forEach((n,i)=>{
    const b=document.createElement("button");b.className="nk";b.dataset.i=i;
    b.innerHTML=`<b>${n[0]}</b><i>${n[1]}</i>`;
    b.onclick=()=>{manualeHaPriorita();S.tasto===i?dissolvi():suona(i);};
    w.appendChild(b);
  });
}
function patch(){
  const w=$("#patch");w.innerHTML="";
  const voce=(nome,attivo,onclick)=>{
    const b=document.createElement("button");
    b.className="pt"+(attivo?" on":"");
    b.innerHTML=`<span class="dot"></span><span class="nm">${nome}</span>`;
    b.onclick=onclick; w.appendChild(b);
  };
  voce("Worship", S.worship&&!S.usaLib, ()=>{S.worship=true;S.usaLib=false;$("#lib").classList.remove("on");
    patch();if(S.tasto!==null)suona(S.tasto);});
  TIMBRI.forEach((T,i)=>voce(T.n, i===S.tim&&!S.usaLib&&!S.worship, ()=>{
    S.tim=i;S.usaLib=false;S.worship=false;$("#lib").classList.remove("on");
    caricaParametriTimbro();patch();if(S.tasto!==null)suona(S.tasto);}));
  if(Object.keys(S.lib).length)
    voce("Il tuo set", S.usaLib, ()=>{S.usaLib=true;patch();if(S.tasto!==null)suona(S.tasto);});
}
function pads(){
  const b=BANCHI[S.ban];
  return b.pads||Array.from({length:8},(_,i)=>
   ({id:"b"+S.ban+"p"+i,t:"Slot "+(i+1),h:"tieni per caricare",c:COL.blu,k:"loop"}));
}
function sh(hex,a){
  const n=parseInt(hex.slice(1),16);
  return "#"+[(n>>16)&255,(n>>8)&255,n&255].map(x=>
    Math.max(0,Math.min(255,x+a)).toString(16).padStart(2,"0")).join("");
}
function tabs(){
  const w=$("#tabs");w.innerHTML="";
  BANCHI.forEach((b,i)=>{
    const t=document.createElement("button");
    t.textContent=b.n;t.className=i===S.ban?"on":"";
    t.onclick=()=>{S.ban=i;tabs();grid();mix();};
    w.appendChild(t);
  });
}
function grid(){
  const w=$("#grid");w.innerHTML="";
  pads().forEach(p=>{
    const L=S.loops[p.id];
    const acceso=p.k==="hold"?!!S.hold[p.id]:!!(L&&L.src);
    const b=document.createElement("button");
    b.className="pad"+(p.k==="loop"&&!L?" vuoto":"")+(acceso?" acceso":"");
    if(!(p.k==="loop"&&!L)){
      b.style.background=`linear-gradient(155deg,${p.c},${sh(p.c,-40)})`;
      b.style.color=p.c;
    }
    const nome=(p.k==="loop"&&L)?L.n:p.t;
    const sotto=p.k==="loop"?(L?(L.src?"in suono":"pronto"):"tieni per caricare"):p.h;
    b.innerHTML=`<div class="n">${nome}</div><div class="h">${sotto}</div>`;
    let tm=null,held=false;
    const giu=()=>{held=false;tm=setTimeout(()=>{held=true;tm=null;if(p.k==="loop")carica(p.id);},550);};
    const su=()=>{if(tm){clearTimeout(tm);tm=null;}};
    ["touchstart","mousedown"].forEach(e=>b.addEventListener(e,giu,{passive:true}));
    ["touchend","touchmove","mouseup","mouseleave"].forEach(e=>b.addEventListener(e,su));
    b.onclick=()=>{
      if(held)return;
      const o=ch(p.id);
      if(p.k==="one"){FX[p.id](o);b.classList.add("fire");setTimeout(()=>b.classList.remove("fire"),300);}
      else if(p.k==="hold"){S.hold[p.id]?stopHold(p.id):(S.hold[p.id]=HOLD[p.id](o));grid();}
      else{!L?carica(p.id):(L.src?stopLoop(p.id):startLoop(p.id));}
    };
    w.appendChild(b);
  });
}
function mix(){
  const w=$("#mix");w.innerHTML="";
  pads().forEach(p=>{
    const L=S.loops[p.id];
    const nome=(p.k==="loop"&&L)?L.n:p.t;
    const val=S.liv[p.id]?S.liv[p.id].v:85;
    const d=document.createElement("div");d.className="ch";
    d.innerHTML=`<div class="top"><span class="cn">${nome}</span><span class="cv">${val}</span></div>
      <input type="range" min="0" max="100" value="${val}">`;
    const r=d.querySelector("input"),v=d.querySelector(".cv");
    r.addEventListener("input",()=>{
      ch(p.id).gain.setTargetAtTime(r.value/100*1.15,S.ctx.currentTime,.03);
      S.liv[p.id].v=+r.value;v.textContent=r.value;});
    w.appendChild(d);
  });
}

/* ================= comandi ================= */
$("#sfondo").addEventListener("click",()=>{ S.bg?disattivaSfondo():attivaSfondo(); });
$("#segui").addEventListener("click",()=>{ S.segui?scollega():collega(); });
$("#codice").addEventListener("input",e=>{e.target.value=e.target.value.toUpperCase();});
$("#power").addEventListener("click",accendi);
$("#lib").addEventListener("click",()=>{ if(!S.on){accendi();return;} caricaSet(); });
$$("#mode button").forEach(b=>b.onclick=()=>{
  $$("#mode button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  S.min=b.dataset.m==="1";keys();if(S.tasto!==null)suona(S.tasto);});
$("#pv").addEventListener("input",e=>{S.pv=e.target.value/100;$("#pvV").textContent=e.target.value;
 if(S.voce)S.voce.vol();});
$("#rv").addEventListener("input",e=>{S.rv=e.target.value/100;$("#rvV").textContent=e.target.value;
 if(S.wet)S.wet.gain.setTargetAtTime(S.rv,S.ctx.currentTime,.15);});
$("#br").addEventListener("input",e=>{
  S.baseB=e.target.value/100; $("#brV").textContent=e.target.value;
  if(!S.mov){ S.bright=S.baseB; if(S.voce&&S.voce.brillantezza) S.voce.brillantezza(); }
  salvaParametriTimbro();});
$("#sh").addEventListener("input",e=>{
  S.baseS=e.target.value/100; $("#shV").textContent=e.target.value;
  if(!S.mov){ S.shimmer=S.baseS; if(S.voce&&S.voce.shimmer) S.voce.shimmer(); }
  salvaParametriTimbro();});
$("#mov").addEventListener("click",()=>{ S.mov?fermaMovimento():avviaMovimento(); });
$("#gn").addEventListener("input",e=>{
  S.gain=e.target.value/10; $("#gnV").textContent=(S.gain?"+":"")+S.gain.toFixed(1)+" dB";
  applicaGuadagno();});
$("#rileva").addEventListener("click",rilevaUscite);
$("#uscita").addEventListener("change",e=>applicaUscita(e.target.value));
$("#fd").addEventListener("input",e=>{S.fade=e.target.value/10;$("#fdV").textContent=S.fade.toFixed(1);});
$("#stop").onclick=()=>dissolvi();
$("#panic").onclick=()=>panico();
$("#wake").onclick=async()=>{
  const b=$("#wake");
  if(S.wake){try{await S.wake.release();}catch(e){}S.wake=null;b.classList.remove("on");return;}
  if(!("wakeLock" in navigator)){toast("Allunga il blocco schermo dalle impostazioni");return;}
  try{S.wake=await navigator.wakeLock.request("screen");
   S.wake.addEventListener("release",()=>{S.wake=null;b.classList.remove("on");});
   b.classList.add("on");}catch(e){toast("Non riesco a tenere acceso lo schermo");}
};
/* scorciatoie da tastiera, utili con una tastiera collegata all'iPad o da computer */
document.addEventListener("keydown",e=>{
  if(!S.on) return;
  const dentroCampo = e.target && (e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA");
  if(dentroCampo) return;                       // sto scrivendo il codice sessione
  if(e.code==="Space" || e.key===" "){ e.preventDefault(); manualeHaPriorita(); dissolvi(); }
  else if(e.key==="Escape"){ e.preventDefault(); manualeHaPriorita(); panico(); }
});

document.addEventListener("pointerdown",()=>{
  if(S.on&&S.ctx&&S.ctx.state!=="running")S.ctx.resume().then(diag);},true);

/* al ritorno in primo piano verifico che sia tutto ancora vivo */
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible") return;
  if(S.on&&S.ctx&&S.ctx.state!=="running") S.ctx.resume().then(diag);
  if(S.bg&&S.bgEl&&S.bgEl.paused){ S.bgEl.play().catch(()=>{}); }
});

try{ S.uscitaId=localStorage.getItem("btlpad.uscita")||""; }catch(e){}
buildKeys();patch();tabs();grid();mix();keys();diag();caricaParametriTimbro();ripristina();spia('','non collegato');

/* ---- splash: esce da solo, o al primo tocco ---- */
(function(){
  const sp=document.getElementById("splash");
  if(!sp) return;
  let andato=false;
  const via=()=>{ if(andato)return; andato=true;
    sp.classList.add("via");
    setTimeout(()=>{ sp.style.display="none"; },1000); };
  setTimeout(via,2800);
  sp.addEventListener("click",via);          // saltabile con un tocco
})();

})();


/* ---- service worker: installabile, offline, e si aggiorna da solo ----
   Regola: non si ricarica mai mentre c'e' suono. Se arriva una versione
   nuova durante l'uso, si applica allo spegnimento. */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const avevaControllo = !!navigator.serviceWorker.controller;
  window.addEventListener('load', async () => {
    try{
      const reg = await navigator.serviceWorker.register('/sw.js');
      // controllo aggiornamenti a ogni apertura e a ogni ritorno in primo piano
      reg.update().catch(()=>{});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(()=>{});
      });
      setInterval(() => reg.update().catch(()=>{}), 30*60*1000);
    }catch(e){}
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.tipo === 'nuova-versione') aggiornamentoPronto();
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (avevaControllo) aggiornamentoPronto();     // non al primissimo avvio
  });
}
let aggiornaDopo = false;
function aggiornamentoPronto(){
  if (aggiornaDopo) return;
  if (!S.on){ location.reload(); return; }         // niente in suono: ricarico subito
  aggiornaDopo = true;
  toast("Nuova versione pronta: si applica allo spegnimento");
}
