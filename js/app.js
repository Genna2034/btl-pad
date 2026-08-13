(function(){
"use strict";

const NOTE=[["C","Do"],["C#","Do#"],["D","Re"],["D#","Mib"],["E","Mi"],["F","Fa"],
            ["F#","Fa#"],["G","Sol"],["G#","Lab"],["A","La"],["A#","Sib"],["B","Si"]];

/* timbri pensati per il worship: attacchi lenti, molta aria, poco medio */
const TIMBRI=[
 {n:"Velluto", w:"sawtooth",det:6, oct:-1,voci:[0,7,12,16,19],   sub:.20,sh:.16,air:.5,cut:1250,q:.6,lv:.47,atk:1.0},
 {n:"Aurora",  w:"triangle",det:10,oct:0, voci:[0,7,12,19,24],   sub:.10,sh:.42,air:.9,cut:2600,q:.55,lv:.56,atk:1.4},
 {n:"Cinema",  w:"sawtooth",det:13,oct:-1,voci:[0,7,12,16,19,24],sub:.26,sh:.26,air:.6,cut:980, q:1.0,lv:.50,atk:1.7},
 {n:"Fondo",   w:"sawtooth",det:4, oct:-1,voci:[0,7,12],         sub:.34,sh:.05,air:.2,cut:620, q:1.3,lv:.50,atk:.8},
 {n:"Vetro",   w:"triangle",det:15,oct:0, voci:[0,7,12,16,19,23],sub:.06,sh:.60,air:1.0,cut:4200,q:.5,lv:.52,atk:1.5},
 {n:"Corale",  w:"sawtooth",det:17,oct:0, voci:[0,4,7,12,16],    sub:.12,sh:.20,air:.7,cut:1900,q:.7,lv:.45,atk:1.2}
];

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
  segui:false,codice:"",indirizzo:"",timer:null,ultimoOk:0,ultimoLive:null,
  brano:"",attesa:2500,fallimenti:0};

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
  $("#diag").innerHTML=S.ctx?`${S.ctx.state} · ${Math.round(S.ctx.sampleRate/100)/10} kHz · media ${media}`:"spento";
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
  $("#app").classList.add("live");
  $("#power").classList.add("on");
  $("#pwA").textContent="Acceso";
  $("#pwC").textContent="scegli una tonalità";
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
}
function spegni(){
  panico();S.on=false;
  $("#app").classList.remove("live");
  $("#power").classList.remove("on");
  $("#pwA").textContent="Accendi";$("#pwC").textContent="tocca per iniziare";
  disattivaSfondo();
  try{if(S.el){S.el.pause();S.el.remove();S.el=null;}}catch(e){}
  if(S.ctx)S.ctx.suspend();
  media="—";diag();
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
      lp=lp*.72+raw*.28;                       // la coda si scurisce col tempo
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
  const sat=ctx.createWaveShaper();sat.curve=curvaMorbida(.55);sat.oversample="4x";

  const padBus=ctx.createGain(),fxBus=ctx.createGain(),shimBus=ctx.createGain();
  padBus.connect(sat);sat.connect(dry);sat.connect(cv);
  fxBus.connect(dry);fxBus.connect(cv);
  shimBus.connect(cv);                       // lo shimmer vive solo nel riverbero
  shimBus.gain.value=.9;
  cv.connect(wet);dry.connect(master);wet.connect(master);
  const lim=ctx.createWaveShaper();lim.curve=curvaMorbida(.75);lim.oversample="4x";
  master.connect(cp);cp.connect(lim);lim.connect(ctx.destination);
  S.lim=lim;
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
    const lo=ctx.createOscillator();lo.frequency.value=.07+i*.043;
    const am=ctx.createGain();am.gain.value=.0032;
    lo.connect(am);am.connect(dl.delayTime);lo.start(now);nodi.push(lo);
    f.connect(dl);dl.connect(merge,0,i%2);
  }
  f.connect(merge,0,0);f.connect(merge,0,1);
  merge.connect(out);

  gradi.forEach((semi,i)=>{
    const midi=root+semi+48+T.oct*12;
    const g=ctx.createGain();
    const lv=(.66/gradi.length)*(1-i*.045);
    g.gain.value=0;
    // ogni nota entra con un tempo suo: nessun attacco "a blocco"
    g.gain.setValueAtTime(0,now);
    g.gain.linearRampToValueAtTime(lv,now+atk*(.55+i*.14));
    // respiro indipendente
    const br=ctx.createOscillator();br.frequency.value=.022+Math.random()*.05;
    const ba=ctx.createGain();ba.gain.value=lv*.34;
    br.connect(ba);ba.connect(g.gain);br.start(now);nodi.push(br);

    const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
    if(pan){pan.pan.value=(i%2?1:-1)*Math.min(.75,.22+i*.13);g.connect(pan);pan.connect(f);}
    else g.connect(f);

    for(let d=-1;d<=1;d+=2){
      const o=ctx.createOscillator();o.type=T.w;o.frequency.value=mtof(midi);
      o.detune.value=d*T.det*(.7+Math.random()*.6);
      o.connect(g);o.start(now+Math.random()*.06);nodi.push(o);
    }
  });

  if(T.sub>0){
    const o=ctx.createOscillator();o.type="sine";o.frequency.value=mtof(root+36+T.oct*12);
    const g=ctx.createGain();g.gain.value=0;
    g.gain.linearRampToValueAtTime(T.sub*.5,now+atk);
    o.connect(g);g.connect(f);o.start(now);nodi.push(o);
  }

  // shimmer: ottave alte che entrano solo nel riverbero, molto lente
  if(T.sh>0){
    [12,19,24].forEach((iv,k)=>{
      const o=ctx.createOscillator();o.type="sine";
      o.frequency.value=mtof(root+48+iv+T.oct*12);
      const g=ctx.createGain();g.gain.value=0;
      const lv=T.sh*.085/(k*.55+1);
      g.gain.linearRampToValueAtTime(lv,now+atk*1.9+k*1.1);
      const sw=ctx.createOscillator();sw.frequency.value=.026+k*.017;
      const sa=ctx.createGain();sa.gain.value=lv*.75;
      sw.connect(sa);sa.connect(g.gain);sw.start(now);nodi.push(sw);
      o.connect(g);g.connect(S.shimBus);o.start(now);nodi.push(o);
    });
  }

  // aria: un filo di rumore filtrato altissimo, dà "respiro" al tappeto
  if(T.air>0){
    const s=ctx.createBufferSource();s.buffer=nz(ctx,8);s.loop=true;
    const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=5200;
    const g=ctx.createGain();g.gain.value=0;
    g.gain.linearRampToValueAtTime(T.air*.022,now+atk*1.6);
    s.connect(hp);hp.connect(g);g.connect(S.shimBus);s.start(now);nodi.push(s);
  }

  f.frequency.setValueAtTime(Math.max(180,T.cut*.3),now);
  f.frequency.linearRampToValueAtTime(T.cut,now+atk*1.5);
  out.connect(S.padBus);

  return{
    apri(s){const t=S.ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);
      out.gain.linearRampToValueAtTime(T.lv*S.pv,t+s);},
    vol(){out.gain.setTargetAtTime(T.lv*S.pv,S.ctx.currentTime,.1);},
    chiudi(s){const t=S.ctx.currentTime;out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value,t);
      out.gain.linearRampToValueAtTime(.0001,t+s);
      setTimeout(()=>{nodi.forEach(n=>{try{n.stop();}catch(e){}});
        try{out.disconnect();}catch(e){}},s*1000+400);}
  };
}

/* voce da file, se hai caricato un set */
function makeVoceFile(buf){
  const ctx=S.ctx,t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;
  const g=ctx.createGain();g.gain.value=0;
  s.connect(g);g.connect(S.padBus);s.start(t,Math.random()*Math.max(0,buf.duration-8));
  return{
    apri(sec){const t=ctx.currentTime;g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(S.pv,t+sec);},
    vol(){g.gain.setTargetAtTime(S.pv,ctx.currentTime,.1);},
    chiudi(sec){const t=ctx.currentTime;g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(.0001,t+sec);
      setTimeout(()=>{try{s.stop();}catch(e){}},sec*1000+300);}
  };
}

function suona(i){
  const useFile=S.usaLib&&S.lib[i];
  const v=useFile?makeVoceFile(S.lib[i]):makeVoce(i,S.min,TIMBRI[S.tim]);
  if(S.voce)S.voce.chiudi(S.fade);
  S.voce=v;v.apri(Math.max(1,S.fade));
  S.tasto=i;keys();hue(i);aggiornaSchedaSistema();
  $("#pwC").textContent=useFile?"set caricato":TIMBRI[S.tim].n.toLowerCase();
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
   COLLEGAMENTO CON BE THE LIGHT
   Interroga GET /api/pad?codice=XXXXXX ogni 2,5 secondi.
   Principio guida: la rete puo' solo AGGIUNGERE informazione.
   Se cade, il pad continua a suonare l'ultimo accordo.
   ============================================================ */
const FADE_AUTO=1.5;          // dissolvenza dei cambi automatici, in secondi
const SCADENZA=4000;          // oltre questo, la richiesta viene abbandonata

function memorizza(){
  try{
    localStorage.setItem("btlpad.codice",S.codice);
    localStorage.setItem("btlpad.indirizzo",S.indirizzo);
  }catch(e){}
}
function ripristina(){
  try{
    S.codice=localStorage.getItem("btlpad.codice")||"";
    S.indirizzo=localStorage.getItem("btlpad.indirizzo")||"";
  }catch(e){}
  const c=$("#codice"), i=$("#indirizzo");
  if(c) c.value=S.codice;
  if(i) i.value=S.indirizzo;
}

function spia(colore,testo){
  const p=$("#spia"); if(!p) return;
  p.className="spia"+(colore?" "+colore:"");
  const t=$("#syncStato"); if(t) t.textContent=testo;
}

/* Legge il payload con tolleranza sui nomi dei campi: se BTL cambia
   qualcosa di marginale, il pad non smette di funzionare. */
function leggiPayload(j){
  const d=(j && typeof j==="object" && j.pad && typeof j.pad==="object") ? j.pad : j;
  if(!d || typeof d!=="object") return null;
  const t=[d.tonica,d.tonic,d.key,d.root].find(v=>Number.isInteger(v));
  if(t===undefined || t<0 || t>11) return null;
  const grezzo=String(d.modo??d.mode??d.minore??d.minor??"").toLowerCase();
  const minore = grezzo.startsWith("min") || grezzo==="true" || d.minore===true || d.minor===true;
  const attivo = (d.stato??d.status??d.attivo??d.active);
  const fermo = attivo===false || String(attivo).toLowerCase()==="fermo" ||
                String(attivo).toLowerCase()==="stopped";
  const titolo = d.brano&&d.brano.titolo ? d.brano.titolo
               : (d.titolo || d.title || (d.brano&&d.brano.title) || "");
  return {tonica:t, minore, fermo, titolo:String(titolo).slice(0,28)};
}

async function interroga(){
  if(!S.segui) return;
  const url = S.indirizzo.replace(/\/+$/,"")+"/api/pad?codice="+encodeURIComponent(S.codice);
  const ab = new AbortController();
  const scad = setTimeout(()=>ab.abort(), SCADENZA);
  try{
    const r = await fetch(url,{signal:ab.signal,cache:"no-store",headers:{"Accept":"application/json"}});
    clearTimeout(scad);
    if(!r.ok){
      // 404 o 403: il codice non e' valido. Non e' un problema di rete.
      if(r.status===404||r.status===403){
        spia("ambra","codice non riconosciuto");
        S.attesa=8000; S.fallimenti=0; return;
      }
      throw new Error("HTTP "+r.status);
    }
    const dati = leggiPayload(await r.json());
    S.ultimoOk = Date.now(); S.fallimenti = 0; S.attesa = 2500;
    if(!dati){ spia("ambra","risposta non leggibile"); return; }
    S.brano = dati.titolo;
    if(dati.fermo){
      spia("ambra", "live fermo"+(S.brano?" · "+S.brano:""));
      return;                       // il pad resta com'e': non ammutolisce
    }
    applicaDaLive(dati.tonica, dati.minore);
    spia("verde", (S.brano||"collegato")+" · "+NOTE[dati.tonica][1]+(dati.minore?"m":""));
  }catch(e){
    clearTimeout(scad);
    S.fallimenti++;
    // niente panico: tengo l'accordo e rallento i tentativi
    S.attesa = Math.min(15000, 2500*Math.pow(1.6,Math.min(S.fallimenti,5)));
    spia("rossa", S.tasto!==null ? "rete assente · tengo l'accordo" : "rete assente");
  }
}

function applicaDaLive(t,minore){
  if(!S.on) return;                                  // audio non ancora sbloccato
  if(S.ultimoLive && S.ultimoLive.t===t && S.ultimoLive.m===minore && S.tasto===t) return;
  S.ultimoLive={t,m:minore};
  if(S.min!==minore){
    S.min=minore;
    $$("#mode button").forEach(b=>b.classList.toggle("on", (b.dataset.m==="1")===minore));
  }
  const tenuta=S.fade;                               // dissolvenza breve solo per i cambi automatici
  S.fade=FADE_AUTO;
  suona(t);
  S.fade=tenuta;
}

function ciclo(){
  clearTimeout(S.timer);
  if(!S.segui) return;
  interroga().finally(()=>{
    if(S.segui) S.timer=setTimeout(ciclo,S.attesa);
  });
}

function collega(){
  const c=$("#codice"), i=$("#indirizzo");
  S.codice=(c.value||"").trim().toUpperCase();
  S.indirizzo=(i.value||"").trim();
  if(!S.codice){ toast("Inserisci il codice sessione di Be the Light"); return; }
  if(!/^https?:\/\//i.test(S.indirizzo)){ toast("L'indirizzo deve iniziare con https://"); return; }
  memorizza();
  S.segui=true; S.fallimenti=0; S.attesa=2500; S.ultimoLive=null;
  $("#segui").textContent="scollega";
  $("#segui").classList.add("on");
  spia("ambra","collegamento…");
  ciclo();
}
function scollega(){
  S.segui=false; clearTimeout(S.timer); S.timer=null; S.ultimoLive=null;
  $("#segui").textContent="collega";
  $("#segui").classList.remove("on");
  spia("", "non collegato");   // il pad continua a suonare: comando manuale
}

/* Se l'utente tocca un tasto a mano mentre e' collegato, comanda lui:
   annullo la memoria dell'ultimo stato remoto per non farlo tornare indietro. */
function manualeHaPriorita(){ if(S.segui) S.ultimoLive=null; }


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
        artist: S.usaLib ? "Il tuo set" : TIMBRI[S.tim].n,
        album:"Be the Light",
        artwork:[{src:"/logo.png",sizes:"440x440",type:"image/png"}]
      });
    }
    navigator.mediaSession.playbackState = suona ? "playing" : "paused";
  }catch(e){}
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
  TIMBRI.forEach((T,i)=>{
    const b=document.createElement("button");
    b.className="pt"+(i===S.tim&&!S.usaLib?" on":"");
    b.innerHTML=`<span class="dot"></span><span class="nm">${T.n}</span>`;
    b.onclick=()=>{S.tim=i;S.usaLib=false;$("#lib").classList.remove("on");
      patch();if(S.tasto!==null)suona(S.tasto);};
    w.appendChild(b);
  });
  if(Object.keys(S.lib).length){
    const b=document.createElement("button");
    b.className="pt"+(S.usaLib?" on":"");
    b.innerHTML=`<span class="dot"></span><span class="nm">Il tuo set</span>`;
    b.onclick=()=>{S.usaLib=true;patch();if(S.tasto!==null)suona(S.tasto);};
    w.appendChild(b);
  }
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
document.addEventListener("pointerdown",()=>{
  if(S.on&&S.ctx&&S.ctx.state!=="running")S.ctx.resume().then(diag);},true);

/* al ritorno in primo piano verifico che sia tutto ancora vivo */
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible") return;
  if(S.on&&S.ctx&&S.ctx.state!=="running") S.ctx.resume().then(diag);
  if(S.bg&&S.bgEl&&S.bgEl.paused){ S.bgEl.play().catch(()=>{}); }
});

buildKeys();patch();tabs();grid();mix();keys();diag();ripristina();spia('','non collegato');

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


/* ---- service worker: rende l'app installabile e utilizzabile offline ---- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
