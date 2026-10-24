// Il pad che segue il live deve SUONARE, non solo mostrare la tonalita'.
// Server statico locale + API di Be the Light finte (intercettate nel
// browser). Verifica: voce avviata, movimento udibile (filtro mai chiuso,
// brillantezza mai a zero), set Worship che aspetta lo scaricamento.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT='/home/claude/btl-pad'; const PORTA=4600;
const tipi={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
let ritardoMp3=0;
const srv=http.createServer((req,res)=>{ const u=new URL(req.url,'http://x'); let f=path.join(ROOT,decodeURIComponent(u.pathname)); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(ROOT,'index.html');
  const invia=()=>{ res.writeHead(200,{'Content-Type':tipi[path.extname(f)]||'application/octet-stream'}); res.end(fs.readFileSync(f)); };
  if(f.endsWith('.mp3')&&ritardoMp3) setTimeout(invia,ritardoMp3); else invia(); });
await new Promise(r=>srv.listen(PORTA,r));
const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const esiti=[]; const ok=(n,c,e='')=>esiti.push([c,n,e]);
let tonica=7, scritture=0;
async function pagina(){
  const ctx=await b.newContext({viewport:{width:1024,height:768}}); const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('ERR',e.message.slice(0,150)));
  await p.route('https://btl-nu.vercel.app/**', async route=>{ const u=new URL(route.request().url());
    if(u.pathname==='/api/pad/stato'){ if(route.request().method()==='POST'){ scritture++; return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,aggiornatoIl:new Date().toISOString()})}); }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({stato:null,aggiornatoIl:null})}); }
    if(u.pathname==='/api/pad'){ if(u.searchParams.get('codice')!=='ABC123') return route.fulfill({status:401,contentType:'application/json',body:'{"error":"no"}'});
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({stato:'attivo',tonica,modo:'maggiore',nota:'Sol',brano:{id:'s1',titolo:'Chi potrà'},semitoni:0,scaletta:{id:'l1',nome:'Domenica'},prossimo:null,conConferma:false,sala:{brano:{id:'s1',titolo:'Chi potrà'},nota:'Sol',sezione:null},aggiornatoIl:new Date().toISOString()})}); }
    return route.fulfill({status:404,body:'{}'}); });
  await p.goto(`http://127.0.0.1:${PORTA}/`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
  await p.evaluate(()=>document.getElementById('splash')?.click()); await p.waitForTimeout(1200);
  return p;
}
const stato=(p)=>p.evaluate(()=>{ const d=window.__btlpadDiag(); return { ...d, spia:document.querySelector('#syncStato')?.textContent, pwC:document.querySelector('#pwC')?.textContent, taglio:d.movimento.taglio, b0:d.movimento.b }; });

// 1) acceso, poi segue il live: deve suonare
let p=await pagina();
await p.evaluate(()=>document.getElementById('power').click()); await p.waitForTimeout(2500);
ok('Il pad si accende', (await stato(p)).on);
await p.evaluate(()=>{ document.getElementById('codice').value='ABC123'; }); await p.evaluate(()=>document.getElementById('segui').click()); await p.waitForTimeout(4500);
let s=await stato(p);
ok('Segue il live: tonalità Sol ricevuta (tasto 7)', s.tasto===7, JSON.stringify(s));
ok('…e una voce STA SUONANDO', s.voce===true);
ok('Movimento avviato dal live', s.mov===true);
ok('All\'ingresso il filtro non è chiuso (≥ 1,2 kHz)', s.taglio>=1200, String(Math.round(s.taglio)));
ok('All\'ingresso la brillantezza non è zero (≥ metà del centro)', s.b0>=s.baseB*0.5, `${s.b0} / ${s.baseB}`);
ok('Set Worship pronto e in uso', s.worship===true && s.wsPronto===true);
ok('Lo stato condiviso viene scritto (vince l\'ultimo tocco)', scritture>=1);
// cambio tonalità dal live
tonica=2; await p.waitForTimeout(4000); s=await stato(p);
ok('Cambio di canto dal live: nuova tonalità (Re, tasto 2) e voce ancora attiva', s.tasto===2 && s.voce===true);
await p.context().close();

// 2) il live manda la tonalità PRIMA che i file del set siano scaricati
ritardoMp3=3500; tonica=9; scritture=0;
p=await pagina();
await p.evaluate(()=>document.getElementById('power').click()); await p.waitForTimeout(300);          // scaricamento appena partito
await p.evaluate(()=>{ document.getElementById('codice').value='ABC123'; }); await p.evaluate(()=>document.getElementById('segui').click()); await p.waitForTimeout(1500);
s=await stato(p);
ok('Set non ancora scaricato: il pad resta in Worship (non ripiega sulla sintesi)', s.worship===true, JSON.stringify(s));
await p.waitForTimeout(4000); s=await stato(p);
ok('Arrivato IL file della tonalità chiesta (prima degli altri), suona in Worship (La, tasto 9)', s.worship===true && s.tasto===9 && s.voce===true, JSON.stringify(s));
await p.waitForTimeout(12000); s=await stato(p);
ok('Poi il set si completa da solo', s.wsPronto===true && s.worship===true, JSON.stringify(s));
await p.context().close();

// 3) spento: la tonalità arriva, il pad la mostra e la applica all'accensione
ritardoMp3=0; tonica=4;
p=await pagina(); await p.evaluate(()=>{ document.getElementById('codice').value='ABC123'; }); await p.evaluate(()=>document.getElementById('segui').click()); await p.waitForTimeout(3500);
s=await stato(p);
ok('Spento: il pulsante dice "tocca per accendere · Mi maggiore"', /tocca per accendere/.test(s.pwC||'') && /Mi/.test(s.pwC||''), s.pwC);
await p.evaluate(()=>document.getElementById('power').click()); await p.waitForTimeout(3000); s=await stato(p);
ok('All\'accensione applica la tonalità in attesa e suona', s.on && s.tasto===4 && s.voce===true, JSON.stringify(s));

console.log('\n===== BTL PAD · SUONO DAL LIVE =====');
for(const [c,n,e] of esiti) console.log(`${(c?'OK':'FALLITO').padEnd(8)} ${n}${e&&!c?' — '+e:''}`);
console.log('falliti:', esiti.filter(x=>!x[0]).length,'su',esiti.length);
await b.close(); srv.close();
