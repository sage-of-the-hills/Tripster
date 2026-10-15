/* Tripster app. Plain JavaScript, no build step. */
(function(){
"use strict";
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

const ICON = {
  money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
  weather:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1"/><circle cx="8" cy="8" r="2.6"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.4 1.2A2.9 2.9 0 0 0 9 20z"/></svg>',
  explore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  ext:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  chev:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>',

  overview:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  days:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  bookings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 7v12" stroke-dasharray="2 2"/></svg>',
  stays:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18V8M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/></svg>',
  offline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
  trips:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h6l2 2h8v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
};
const TABS = [["overview","Overview"],["days","Days"],["weather","Weather"],["explore","Explore"],["bookings","Bookings"],["money","Money"]];
const STATUS = {todo:"To book", booked:"Booked", paid:"Paid", optional:"Optional", done:"Done"};

/* ---------- state ---------- */
const S = {
  trips: {},            // id -> trip
  localTrips: {},       // id -> trip (uploaded without shared storage)
  status: {},           // id -> {key: status}
  tripId: store.get("tp.trip") || null,
  tab: store.get("tp.tab") || "overview", screen: "home",
  wx: {}, alerts: {}, changes: {}, wxBusy: {}, wxErr: {}, wxPlace: null, wxDate: null, wxNight: false,
  userName: store.get("ts.name") || "", droneLimit: +(store.get("ts.drone")||10.7), alertsOn: store.get("ts.alerts")==="1",
  placeResults: null, openPlace: null, nearby: {}, confirm: null,
  day: null, hot: null, filter: "all",
  db: null, canWrite: null, downloads: null, loaded: false,
};
if (!TABS.some(t=>t[0]===S.tab)) S.tab = "overview";
try{ S.nearby=JSON.parse(store.get("ts.near")||"{}"); }catch(e){}

function trip(){ return S.trips[S.tripId] || S.localTrips[S.tripId] || null; }
function allTrips(){ return Object.assign({}, S.localTrips, S.trips); }

/* ---------- dates ---------- */
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function pd(s){ if(!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if(!m) return null; return {y:+m[1],mo:+m[2]-1,d:+m[3],h:m[4]!=null?+m[4]:null,mi:m[5]!=null?+m[5]:null}; }
function dateObj(s){ const p=pd(s); return p? new Date(p.y,p.mo,p.d):null; }
function fmtDay(s,long){ const p=pd(s); if(!p) return ""; const dt=new Date(p.y,p.mo,p.d); return (long?DOW[dt.getDay()]+" ":"")+p.d+" "+MON[p.mo]; }
function fmtTime(s){ const p=pd(s); return p&&p.h!=null? String(p.h).padStart(2,"0")+":"+String(p.mi).padStart(2,"0"):""; }
function fmtWhen(s){ const d=fmtDay(s,true), t=fmtTime(s); return t? d+", "+t : d; }
function nights(a,b){ const A=dateObj(a),B=dateObj(b); return A&&B? Math.round((B-A)/864e5):null; }
function todayISO(){ const n=new Date(); return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0"); }
function money(v,cur){ if(v==null||v==="") return ""; if(typeof v!=="number") return esc(v); try{return new Intl.NumberFormat("en-GB",{style:"currency",currency:cur||"GBP"}).format(v)}catch(e){return v.toFixed(2)} }

/* ---------- status ---------- */
function statusFor(t,kind,item){ const s=(S.status[t.id]||{})[kind+":"+item.id]; return s || item.status || "todo"; }
function statusOf(kind,item){ return statusFor(trip(),kind,item); }
async function setStatus(kind,item,val){
  const t=trip(); const key=kind+":"+item.id;
  S.status[t.id] = Object.assign({}, S.status[t.id], {[key]:val});
  store.set("tp.status."+t.id, JSON.stringify(S.status[t.id]));
  // bookings, stays and travel are shared with the group; packing ticks stay personal
  if(isShared(t) && kind!=="check" && CLOUD.ready) cloudSetStatus(t,kind,item,val);
  render();
}

/* ---------- maps ---------- */
const merc = lat => Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360));
function projector(t){
  const pts = Object.values(t.places||{}).filter(Boolean);
  if (t.basemap && t.basemap.bounds){
    const b=t.basemap.bounds, W=t.basemap.width||1600, H=t.basemap.height||900;
    const mN=merc(b.north), mS=merc(b.south);
    return {W,H,img:t.basemap.src, p:(lat,lon)=>[ (lon-b.west)/(b.east-b.west)*W, (mN-merc(lat))/(mN-mS)*H ]};
  }
  let w=Infinity,e=-Infinity,n=-Infinity,s=Infinity;
  pts.forEach(p=>{w=Math.min(w,p.lon);e=Math.max(e,p.lon);n=Math.max(n,p.lat);s=Math.min(s,p.lat)});
  if(!isFinite(w)){w=-1;e=1;n=1;s=-1}
  const padX=Math.max(.2,(e-w)*.12), padY=Math.max(.15,(n-s)*.12); w-=padX;e+=padX;n+=padY;s-=padY;
  const mN=merc(n), mS=merc(s), W=1600, k=W/((e-w)*Math.PI/180), H=Math.max(400,(mN-mS)*k);
  return {W,H,img:null,grid:{w,e,n,s}, p:(lat,lon)=>[ (lon-w)/(e-w)*W, (mN-merc(lat))*k ]};
}
function gmapsPlace(p){ return "https://www.google.com/maps/search/?api=1&query="+p.lat+"%2C"+p.lon; }
function gmapsDay(t,day){
  const seq=[]; day.steps.forEach(s=>{const p=t.places[s.place]; if(p&&(!seq.length||seq[seq.length-1]!==s.place)) seq.push(s.place)});
  const ll=k=>t.places[k].lat+","+t.places[k].lon;
  if(seq.length<2) return seq.length? gmapsPlace(t.places[seq[0]]):null;
  let mid=seq.slice(1,-1); if(mid.length>8){ const step=mid.length/8; mid=Array.from({length:8},(_,i)=>mid[Math.floor(i*step)]); }
  return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin="+encodeURIComponent(ll(seq[0]))+"&destination="+encodeURIComponent(ll(seq[seq.length-1]))+(mid.length?"&waypoints="+encodeURIComponent(mid.map(ll).join("|")):"");
}

function mapSVG(t, day, pxW){
  const P=projector(t), places=t.places||{};
  const days = day? [day] : (t.days||[]);
  const keys=new Set(); days.forEach(d=>{(d.route||[]).forEach(k=>keys.add(k)); d.steps.forEach(s=>s.place&&keys.add(s.place))});
  (t.stays||[]).forEach(s=>{ if(s.place && (!day || s.id===day.stay)) keys.add(s.place) });
  const xy=[...keys].filter(k=>places[k]).map(k=>P.p(places[k].lat,places[k].lon));
  let x0=0,y0=0,x1=P.W,y1=P.H;
  if(xy.length){ x0=Math.min(...xy.map(a=>a[0])); x1=Math.max(...xy.map(a=>a[0])); y0=Math.min(...xy.map(a=>a[1])); y1=Math.max(...xy.map(a=>a[1])); }
  let w=Math.max(x1-x0, P.W*.18), h=Math.max(y1-y0, P.H*.14);
  const cx=(x0+x1)/2, cy=(y0+y1)/2; w*=1.35; h*=1.45;
  const aspect=1.7; if(w/h<aspect) w=h*aspect; else h=w/aspect;
  w=Math.min(w,P.W); h=Math.min(h,P.H);
  let vx=Math.min(Math.max(cx-w/2,0),P.W-w), vy=Math.min(Math.max(cy-h/2,0),P.H-h);
  const k=w/(pxW||S.mapPx||700); // map units per screen pixel, so marks keep a fixed on-screen size
  const parts=[];
  if(P.img) parts.push(`<image href="${esc(P.img)}" x="0" y="0" width="${P.W}" height="${P.H}" preserveAspectRatio="none"/>`);
  else {
    parts.push(`<rect x="0" y="0" width="${P.W}" height="${P.H}" fill="var(--map-water)"/>`);
    const g=P.grid, stepLon=niceStep(g.e-g.w), stepLat=niceStep(g.n-g.s);
    for(let lo=Math.ceil(g.w/stepLon)*stepLon; lo<g.e; lo+=stepLon){const [x]=P.p(g.s,lo); parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${P.H}" stroke="var(--line)" stroke-width="${k}"/>`);}
    for(let la=Math.ceil(g.s/stepLat)*stepLat; la<g.n; la+=stepLat){const [,y]=P.p(la,g.w); parts.push(`<line x1="0" y1="${y}" x2="${P.W}" y2="${y}" stroke="var(--line)" stroke-width="${k}"/>`);}
  }
  days.forEach(d=>{
    const route=(d.route&&d.route.length? d.route : d.steps.map(s=>s.place)).filter(k=>places[k]);
    if(route.length>1){ const pts=route.map(r=>P.p(places[r].lat,places[r].lon).map(v=>v.toFixed(1)).join(",")).join(" ");
      parts.push(`<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="${7*k}" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`);
      parts.push(`<polyline points="${pts}" fill="none" stroke="${esc(d.color||"#0B5F73")}" stroke-width="${4*k}" stroke-linejoin="round" stroke-linecap="round"/>`); }
  });
  // stays
  (t.stays||[]).forEach(s=>{ const p=places[s.place]; if(!p||(day&&s.id!==day.stay&&!day.steps.some(st=>st.place===s.place))) return; const [x,y]=P.p(p.lat,p.lon);
    parts.push(`<path d="${starPath(x,y,13*k)}" fill="#F2B200" stroke="#13212B" stroke-width="${1.6*k}"/>`);
    { const L=x>vx+w*0.62; parts.push(`<text class="maplabel" x="${L?x-16*k:x+16*k}" y="${y-10*k}" text-anchor="${L?"end":"start"}" style="font-size:${13*k}px;stroke-width:${3.5*k}px">${esc(s.name)}</text>`); } });
  // numbered stops for a day
  if(day){ let n=0; const seen={};
    day.steps.forEach((s,i)=>{ const p=places[s.place]; if(!p||isStay(t,s.place)) return; if(seen[s.place]==null){ seen[s.place]=++n; } });
    Object.entries(seen).forEach(([key,num])=>{ const p=places[key]; const [x,y]=P.p(p.lat,p.lon); const hot=S.hot===key;
      parts.push(`<g data-key="${esc(key)}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${(hot?15:12)*k}" fill="${esc(day.color||"#0B5F73")}" stroke="#fff" stroke-width="${2.5*k}"/><text x="${x}" y="${y+4.5*k}" text-anchor="middle" style="font:700 ${12*k}px var(--body)" fill="#fff">${num}</text></g>`);
      if(!p.waypoint){ const L=x>vx+w*0.62; parts.push(`<text class="maplabel" x="${L?x-18*k:x+16*k}" y="${y+4*k}" text-anchor="${L?"end":"start"}" style="font-size:${12.5*k}px;stroke-width:${3.5*k}px">${esc(p.name)}</text>`); } });
  }
  return `<svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" role="img" aria-label="Map of ${day?esc(day.title):"the whole trip"}">${parts.join("")}</svg>`;
}
function niceStep(span){ const raw=span/6, mag=Math.pow(10,Math.floor(Math.log10(raw))); return [1,2,5,10].map(m=>m*mag).find(v=>v>=raw)||raw; }
function starPath(cx,cy,r){ let d=""; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r; d+=(i?"L":"M")+(cx+rr*Math.cos(a)).toFixed(1)+","+(cy+rr*Math.sin(a)).toFixed(1);} return d+"Z"; }
function isStay(t,key){ return (t.stays||[]).some(s=>s.place===key); }

/* ---------- daylight ---------- */
function mins(hm){ if(!hm||!/^\d{1,2}:\d{2}/.test(hm)) return null; const [h,m]=hm.split(":").map(Number); return h*60+m; }
function lightColor(t,time){ const m=mins(time); const dl=t.daylight; if(m==null||!dl) return null; const up=mins(dl.sunrise), dn=mins(dl.sunset);
  if(m>=up&&m<=dn) return "var(--day-light)"; if(m>=up-60&&m<=dn+60) return "var(--day-twi)"; return "var(--day-dark)"; }

/* ---------- render ---------- */
function renderTabs(){
  $("#tabs").innerHTML = TABS.map(([id,label])=>`<button role="tab" id="tab-${id}" aria-selected="${S.tab===id}" data-tab="${id}">${ICON[id]}<span>${label}</span></button>`).join("");
}
const LOGO='<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B5F73"/><path d="M6 23c4-1 5-6 9-6s5 3 9-1" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 4"/><path d="M23 5a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5z" fill="#F2B200"/><circle cx="23" cy="10" r="1.8" fill="#0B5F73"/></svg>';
function netPill(){ return `<span class="netpill ${navigator.onLine?"on":""}" title="${navigator.onLine?"Online":"Offline: trips, maps and saved forecasts still work"}"><i></i>${navigator.onLine?"Online":"Offline"}</span>`; }
function renderHeader(){
  const top=$("#top"), t=trip();
  if(S.screen==="builder"){ top.innerHTML=`<div class="brandbar"><button class="back" data-home>${ICON.back}<span>All trips</span></button>${netPill()}</div><h1>Plan a trip</h1><div class="trip-meta"><span>Choose a country, your style and, if you like, a famous road trip.</span></div>`; return; }
  if(S.screen==="home"||!t){ top.innerHTML=`<div class="brandbar"><span class="brand">${LOGO}<span>Tripster</span></span>${netPill()}</div>`; return; }
  const n=nights(t.start,t.end);
  top.innerHTML=`<div class="brandbar"><button class="back" data-home>${ICON.back}<span>All trips</span></button>${netPill()}</div>
    <h1>${esc(t.title)}</h1>
    <div class="trip-meta">${[`<span class="mono">${esc(fmtDay(t.start,true))} – ${esc(fmtDay(t.end,true))} ${pd(t.end)?pd(t.end).y:""}</span>`, n!=null?`<span>${n} nights</span>`:"", (t.travellers||[]).length?`<span>${esc(t.travellers.join(", "))}</span>`:""].filter(Boolean).join("")}</div>`;
}
// Redraws keep whatever someone is typing (live updates can arrive mid-sentence).
function keepTyping(fn){
  const v=$("#view"), saved={}; const act=document.activeElement; let focusId=null, sel=null;
  v.querySelectorAll("input[id],textarea[id],select[id]").forEach(el=>{ if(el.type==="checkbox"||el.type==="radio"||el.type==="file") return; if(el.value!==el.defaultValue) saved[el.id]=el.value; });
  const boxes={}; v.querySelectorAll('input[type="checkbox"][name]').forEach(el=>{ if(el.checked!==el.defaultChecked) boxes[el.name+"="+el.value]=el.checked; });
  if(act&&act.id&&v.contains(act)){ focusId=act.id; try{ sel=[act.selectionStart,act.selectionEnd]; }catch(e){} }
  fn();
  Object.entries(saved).forEach(([id,val])=>{ const el=document.getElementById(id); if(el&&el.type!=="file") el.value=val; });
  v.querySelectorAll('input[type="checkbox"][name]').forEach(el=>{ const k=el.name+"="+el.value; if(k in boxes) el.checked=boxes[k]; });
  if(focusId){ const el=document.getElementById(focusId); if(el){ el.focus({preventScroll:true}); try{ if(sel&&sel[0]!=null) el.setSelectionRange(sel[0],sel[1]); }catch(e){} } }
}
function render(){ keepTyping(renderNow); }
function renderNow(){
  renderHeader();
  const t=trip(), v=$("#view"), tabs=$("#tabs");
  if(S.screen==="builder"){ tabs.hidden=true; document.body.classList.add("home"); v.innerHTML=viewBuilder(); return; }
  if(S.screen==="home"||!t){ S.screen="home"; tabs.hidden=true; document.body.classList.add("home"); v.innerHTML=viewHome(); return; }
  tabs.hidden=false; document.body.classList.remove("home"); renderTabs();
  const views={overview:viewOverview,days:viewDays,weather:viewWeather,explore:viewExplore,bookings:viewBookings,money:viewMoney,offline:viewOffline};
  ensureTripSub(t);
  if(!views[S.tab]) S.tab="overview";
  v.innerHTML=views[S.tab](t);
  if(S.tab==="days") sizeMap();
  if(S.tab==="money") setTimeout(expEachText,0);
}
function emptyState(){ return `<div class="empty">No trip open.</div>`; }

function viewOverview(t){
  const today=todayISO(), start=dateObj(t.start), now=dateObj(today);
  const toGo = start? Math.round((start-now)/864e5) : null;
  const bks=(t.bookings||[]), todo=bks.filter(b=>statusOf("booking",b)==="todo");
  const trans=(t.transport||[]), car=trans.find(x=>x.kind==="car");
  const stays=(t.stays||[]), staysTodo=stays.filter(s=>statusOf("stay",s)==="todo");
  const checks=(t.checklist||[]), checksDone=checks.filter(c=>statusOf("check",c)==="done").length;
  const todayDay=(t.days||[]).find(d=>d.date===today);
  const cost=stays.reduce((a,s)=>a+(typeof s.cost==="number"?s.cost:0),0);
  const sorted=[...todo].sort((a,b)=>(a.bookBy||a.date||"9999").localeCompare(b.bookBy||b.date||"9999"));
  let countdown;
  if(toGo>0) countdown=`<div class="count">${toGo}</div><div class="muted">days to go</div>`;
  else if(todayDay||(today>=t.start&&today<=t.end)) countdown=`<div class="count">Today</div><div class="muted">${todayDay?esc(todayDay.title):"You're on the trip"}</div>`;
  else countdown=`<div class="count">Done</div><div class="muted">This trip has finished</div>`;
  return `
  ${t.tagline?`<p style="max-width:65ch;margin:0 0 16px">${esc(t.tagline)}</p>`:""}
  ${alertsCard(t,true)}${liveSummary(t)}
  <div class="grid cols-2" style="margin-bottom:14px">${peopleCard(t)}${activityCard(t)}</div>
  <div class="hero2">
    <div class="card">${countdown}
      <div class="stats" style="margin-top:16px">
        <div class="stat"><b class="mono">${todo.length}</b><span class="small muted">bookings to make</span></div>
        <div class="stat"><b class="mono">${stays.length-staysTodo.length}/${stays.length}</b><span class="small muted">stays booked</span></div>
        <div class="stat"><b>${car? `<span class="pill s-${statusOf("transport",car)}">${STATUS[statusOf("transport",car)]}</span>`:"–"}</b><span class="small muted">car hire</span></div>
        ${checks.length?`<div class="stat"><b class="mono">${checksDone}/${checks.length}</b><span class="small muted">packed</span></div>`:""}
      </div>
    </div>
    <div class="card">
      <div class="spread"><h3>Book next</h3><button class="btn" data-go="bookings">All bookings</button></div>
      ${sorted.length? `<ul class="next-list" style="margin-top:10px">${sorted.slice(0,5).map(b=>`<li><span><strong>${esc(b.title)}</strong><br><span class="small muted">${esc([fmtDay(b.date,true),b.time].filter(Boolean).join(", "))}</span></span><span class="small ${b.bookBy&&b.bookBy<=today?"":"muted"}" style="${b.bookBy&&b.bookBy<=today?"color:var(--bad);font-weight:700":""}">${b.bookBy?"Book by "+esc(fmtDay(b.bookBy)):"No deadline"}</span></li>`).join("")}</ul>`
        : `<p class="muted">Everything is booked.</p>`}
    </div>
  </div>
  ${todayDay?`<div class="section-head"><h2>Today: ${esc(todayDay.title)}</h2><button class="btn primary" data-day="${esc(todayDay.date)}">Open today</button></div>`:""}
  <div class="section-head"><h2>Day by day</h2><span class="small muted">Tap a day for its map and timings</span></div>
  <div class="grid cols-3">${(t.days||[]).map(d=>`<button class="card" data-day="${esc(d.date)}" style="text-align:left;cursor:pointer;border-top:5px solid ${esc(d.color||"var(--accent)")}">
     <div class="eyebrow">${esc(fmtDay(d.date,true))}</div><h3 style="margin:4px 0">${esc(d.title)}</h3>
     <div class="small muted">${esc(d.steps.filter(s=>!isStay(t,s.place)).map(s=>t.places[s.place]&&!t.places[s.place].waypoint?t.places[s.place].name:s.title).filter((v,i,a)=>a.indexOf(v)===i).slice(0,6).join(" · "))}</div>
     ${d.stay?`<div class="small" style="margin-top:6px">Night: ${esc((stays.find(s=>s.id===d.stay)||{}).name||d.stay)}</div>`:""}</button>`).join("")}</div>
  <div class="section-head"><h2>Where you're sleeping</h2>${cost?`<span class="mono small muted">Stays total ${money(cost,t.currency)}</span>`:""}</div>
  <div class="grid cols-3">${stays.map(s=>`<div class="card stripe ${statusOf("stay",s)}"><div class="spread"><h3>${esc(s.name)}</h3><span class="pill s-${statusOf("stay",s)}">${STATUS[statusOf("stay",s)]}</span></div><div class="small mono muted">${esc(fmtDay(s.checkIn,true))} → ${esc(fmtDay(s.checkOut,true))}</div></div>`).join("")}</div>
  ${(t.notes||[]).length?`<div class="section-head"><h2>Good to know</h2></div><div class="grid cols-2">${t.notes.map(n=>`<div class="card"><h3>${esc(n.title)}</h3><p style="margin:0">${esc(n.body)}</p></div>`).join("")}</div>`:""}
  ${(t.links||[]).filter(l=>!(liveOn(t)&&/umferdin|vedur\.is|safetravel/i.test(l.url))).length?`<div class="row" style="margin-top:14px">${t.links.filter(l=>!(liveOn(t)&&/umferdin|vedur\.is|safetravel/i.test(l.url))).map(l=>`<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>`).join("")}</div>`:""}
  ${guideBlock(t)}
  <div class="section-head"><h2>Share and offline</h2></div>
  <p class="small" style="margin:0 0 8px">Send fellow travellers a link that adds this trip, with your ticks, to their own Tripster. The trip travels inside the link, so anyone you send it to can open it.</p>
  <div class="row"><button class="btn primary" data-share-link>Share trip link</button><button class="btn" data-save="json">Share trip file</button><button class="btn" data-save="html">One-page copy</button><button class="btn" data-go="offline">Offline maps</button>
   ${sourceOf(t.id)==="bundle"||isShared(t)?"":`<button class="btn" data-remove-trip="${esc(t.id)}">${S.confirm==="trip:"+t.id?"Tap again to remove":"Remove from this device"}</button>`}</div>`;
}

function viewDays(t){
  const days=t.days||[];
  if(!days.length) return `<div class="empty">This trip has no day plans yet.</div>`;
  if(!S.day || !days.some(d=>d.date===S.day)) S.day = (days.find(d=>d.date===todayISO())||days[0]).date;
  const day=days.find(d=>d.date===S.day), idx=days.indexOf(day);
  const stay=(t.stays||[]).find(s=>s.id===day.stay);
  const bk=day.steps.map(s=>s.booking).filter(Boolean).map(id=>(t.bookings||[]).find(b=>b.id===id)||(t.transport||[]).find(b=>b.id===id)).filter(Boolean);
  let n=0; const num={}; day.steps.forEach(s=>{ if(t.places[s.place]&&!isStay(t,s.place)&&num[s.place]==null) num[s.place]=++n; });
  const link=gmapsDay(t,day);
  return `
  <div class="daypicker" role="group" aria-label="Choose a day">${days.map(d=>`<button data-day="${esc(d.date)}" aria-pressed="${d.date===S.day}"><i style="background:${esc(d.color||"var(--accent)")}"></i>${esc(fmtDay(d.date,true))}</button>`).join("")}</div>
  <div class="dayview">
    <div><div class="mapbox" id="mapbox">${mapSVG(t,day)}<div class="mapnote">Numbers follow the day's order. Stars are where you sleep. Lines are simplified, not exact roads.</div></div>
      <div class="row" style="margin-top:10px">${link?`<a class="btn primary" href="${link}" target="_blank" rel="noopener">${ICON.map} Open the day in Google Maps</a>`:""}<button class="btn" data-go="offline">Offline maps</button></div>
    </div>
    <div class="card" style="padding:14px 14px 6px">
      <div class="eyebrow" style="color:${esc(day.color||"var(--accent)")}">${esc(fmtDay(day.date,true))}</div>
      <h2 style="margin:2px 0 8px">${esc(day.title)}</h2>
      ${bk.length?`<div class="row" style="margin-bottom:6px">${bk.map(b=>{const kind=(t.transport||[]).includes(b)?"transport":"booking"; const st=statusOf(kind,b); return `<span class="pill s-${st}" title="${esc(STATUS[st])}">${esc(b.title)}${b.time?" "+esc(b.time):""}</span>`}).join("")}</div>`:""}
      ${stay?`<div class="small" style="margin-bottom:6px">Night: <strong>${esc(stay.name)}</strong></div>`:""}
      ${dayWx(t,day)}
      <ol class="timeline">${day.steps.map(s=>{ const p=t.places[s.place]; const st=p&&isStay(t,s.place); const lc=lightColor(t,s.time);
        return `<li data-key="${esc(s.place||"")}" class="${S.hot&&S.hot===s.place?"hot":""}"><span class="t">${esc(s.time||"")}</span>
          <span><span class="n ${st?"star":""}" style="background:${esc(day.color||"var(--accent)")}">${st?"★":(num[s.place]||"·")}</span></span>
          <span><span class="what">${esc(s.title)}</span>${s.note?`<div class="small">${esc(s.note)}</div>`:""}${s.next?`<div class="leg">Then: ${esc(s.next.charAt(0).toLowerCase()+s.next.slice(1))}</div>`:""}
          ${stepWx(t,day.date,s)}
          ${lc?`<div class="light" style="background:${lc}"></div>`:""}
          ${p&&!p.waypoint?`<a class="small" href="${gmapsPlace(p)}" target="_blank" rel="noopener">Map</a>`:""}</span></li>`; }).join("")}</ol>
      ${t.daylight?`<div class="daylight-key"><span><i style="background:var(--day-light)"></i>Daylight ${esc(t.daylight.sunrise)}–${esc(t.daylight.sunset)}</span><span><i style="background:var(--day-twi)"></i>Twilight</span><span><i style="background:var(--day-dark)"></i>Dark</span></div>`:""}
      <div class="row" style="justify-content:space-between;margin:12px 0 8px">
        <button class="btn" ${idx<=0?"disabled":""} data-day="${idx>0?esc(days[idx-1].date):""}">← ${idx>0?esc(fmtDay(days[idx-1].date,true)):"Previous"}</button>
        <button class="btn" ${idx>=days.length-1?"disabled":""} data-day="${idx<days.length-1?esc(days[idx+1].date):""}">${idx<days.length-1?esc(fmtDay(days[idx+1].date,true)):"Next"} →</button>
      </div>
    </div>
  </div>`;
}
function sizeMap(){
  const box=$("#mapbox"); if(!box) return; const px=box.clientWidth; if(!px) return;
  if(Math.abs(px-(S.mapPx||0))>8){ S.mapPx=px; const t=trip(), day=(t.days||[]).find(d=>d.date===S.day); box.querySelector("svg").outerHTML=mapSVG(t,day,px); }
}

function viewBookings(t){
  const items=[...(t.bookings||[]).map(b=>({kind:"booking",b})), ...(t.transport||[]).filter(x=>x.kind==="car"||statusOf("transport",x)==="todo").map(b=>({kind:"transport",b}))];
  const f=S.filter, today=todayISO();
  const shown=items.filter(({kind,b})=>f==="all"||statusOf(kind,b)===f||(f==="booked"&&statusOf(kind,b)==="paid"));
  shown.sort((x,y)=>{ const o={todo:0,optional:1,booked:2,paid:2}; return (o[statusOf(x.kind,x.b)]-o[statusOf(y.kind,y.b)]) || (x.b.date||x.b.at||"9").localeCompare(y.b.date||y.b.at||"9"); });
  const counts={all:items.length,todo:0,booked:0,optional:0}; items.forEach(({kind,b})=>{const s=statusOf(kind,b); if(s==="paid") counts.booked++; else counts[s]=(counts[s]||0)+1;});
  const ro=readOnlyNote(t);
  return `<div class="spread"><div class="filters seg" role="group" aria-label="Filter bookings">${[["all","All"],["todo","To book"],["booked","Booked"],["optional","Optional"]].map(([k,l])=>`<button data-filter="${k}" aria-pressed="${f===k}">${l} <span class="mono">${counts[k]||0}</span></button>`).join("")}</div>${ro}</div>
  <div class="grid cols-2" style="margin-top:14px">${shown.map(({kind,b})=>bookingCard(t,kind,b,today)).join("")||`<div class="empty">Nothing here.</div>`}</div>
  ${viewStays(t)}
  ${(t.checklist||[]).length?checklistBlock(t):""}`;
}
function bookingCard(t,kind,b,today){
  const st=statusOf(kind,b); const when=b.date? [fmtDay(b.date,true),b.time].filter(Boolean).join(", ") : (b.at? fmtWhen(b.at):"");
  const late=st==="todo"&&b.bookBy&&b.bookBy<=today;
  return `<div class="card bk stripe ${st}">
    <div class="spread"><div style="min-width:0"><h3>${esc(b.title)}</h3>${b.provider?`<div class="small muted">${esc(b.provider)}</div>`:""}</div><span class="pill s-${st}">${STATUS[st]}</span></div>
    ${when?`<div class="when">${esc(when)}${b.people?` · ${b.people} people`:""}</div>`:""}
    <dl class="kv">${b.where?`<dt>Where</dt><dd>${esc(b.where)}</dd>`:""}${b.ref?`<dt>Ref</dt><dd class="mono">${esc(b.ref)}</dd>`:""}${b.cost!=null&&b.cost!==""?`<dt>Cost</dt><dd>${money(b.cost,t.currency)}</dd>`:""}${b.bookBy&&st==="todo"?`<dt>Book by</dt><dd style="${late?"color:var(--bad);font-weight:700":""}">${esc(fmtDay(b.bookBy,true))}${late?" (overdue)":""}</dd>`:""}${b.until?`<dt>Return</dt><dd>${esc(fmtWhen(b.until))}</dd>`:""}${b.notes?`<dt>Notes</dt><dd>${esc(b.notes)}</dd>`:""}</dl>
    <div class="spread" style="align-items:center">${statusControl(kind,b,st)}${b.url?`<a class="small" href="${esc(b.url)}" target="_blank" rel="noopener">Open booking site</a>`:""}</div></div>`;
}
function statusControl(kind,b,st){
  const opts = kind==="check"? [] : ["todo","booked","paid","optional"];
  return `<div class="seg" role="group" aria-label="Status of ${esc(b.title)}">${opts.map(o=>`<button data-status="${o}" data-kind="${kind}" data-id="${esc(b.id)}" aria-pressed="${st===o}">${STATUS[o]}</button>`).join("")}</div>${statusMetaLine(kind,b)}`;
}
function checklistBlock(t){
  const groups={}; t.checklist.forEach(c=>{(groups[c.group||"Other"]=groups[c.group||"Other"]||[]).push(c)});
  return `<div class="section-head"><h2>Packing and prep</h2><span class="small muted">Share the trip file to pass ticks on</span></div>
  <div class="grid cols-3">${Object.entries(groups).map(([g,list])=>`<div class="card"><h3>${esc(g)}</h3><ul class="checklist">${list.map(c=>{const d=statusOf("check",c)==="done"; return `<li class="${d?"done":""}"><label><input type="checkbox" id="chk-${esc(c.id)}" data-check="${esc(c.id)}" ${d?"checked":""}><span>${esc(c.title)}</span></label></li>`}).join("")}</ul></div>`).join("")}</div>`;
}
function readOnlyNote(t){ return S.trips[t.id]&&S.canWrite===false? `<span class="small muted">View only: ask the trip owner for Contributor access to change bookings.</span>` : (!S.trips[t.id]? `<span class="small muted">Saved on this device. Share the trip file to pass your ticks on.</span>`:""); }

function viewStays(t){
  const stays=t.stays||[], trans=t.transport||[];
  const total=stays.reduce((a,s)=>a+(typeof s.cost==="number"?s.cost:0),0), people=(t.travellers||[]).length||1;
  return `<div class="section-head"><h2>Stays</h2>${total?`<span class="mono small muted">${money(total,t.currency)} total · ${money(total/people,t.currency)} each</span>`:""}</div>
  <div class="grid cols-2">${stays.map(s=>{const st=statusOf("stay",s), p=t.places[s.place]; const nn=nights(s.checkIn,s.checkOut);
    return `<div class="card stripe ${st}"><div class="spread"><div><h3>${esc(s.name)}</h3><div class="small muted">${esc(s.via||"")}${s.host?" · Host "+esc(s.host):""}</div></div><span class="pill s-${st}">${STATUS[st]}</span></div>
    <dl class="kv"><dt>Check in</dt><dd class="mono">${esc(fmtWhen(s.checkIn))}</dd><dt>Check out</dt><dd class="mono">${esc(fmtWhen(s.checkOut))}</dd>${nn!=null?`<dt>Nights</dt><dd class="mono">${nn}</dd>`:""}
    <dt>Address</dt><dd>${esc(s.address||"")} ${s.address?`<button class="btn" style="padding:2px 8px;margin-left:4px" data-copy="${esc(s.address)}" aria-label="Copy address">${ICON.copy}</button>`:""}</dd>
    ${typeof s.cost==="number"?`<dt>Cost</dt><dd class="mono">${money(s.cost,t.currency)}${nn?` (${money(s.cost/nn,t.currency)} a night)`:""}</dd>`:""}${s.ref?`<dt>Ref</dt><dd class="mono">${esc(s.ref)}</dd>`:""}${s.cancellation?`<dt>Cancel</dt><dd>${esc(s.cancellation)}</dd>`:""}${s.notes?`<dt>Notes</dt><dd>${esc(s.notes)}</dd>`:""}</dl>
    <div class="spread" style="margin-top:10px;align-items:center">${statusControl("stay",s,st)}${p?`<a class="small" href="${gmapsPlace(p)}" target="_blank" rel="noopener">Directions</a>`:s.address?`<a class="small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}" target="_blank" rel="noopener">Directions</a>`:""}</div></div>`}).join("")}</div>
  <div class="section-head"><h2>Getting around</h2></div>
  <div class="grid cols-2">${trans.map(x=>{const st=statusOf("transport",x); const pu=t.places[x.pickup], dr=t.places[x.dropoff];
    return `<div class="card stripe ${st}"><div class="spread"><div><div class="eyebrow">${esc(x.kind==="car"?"Car hire":x.kind==="flight"?"Flight":x.kind||"Travel")}</div><h3>${esc(x.title)}</h3>${x.provider?`<div class="small muted">${esc(x.provider)}</div>`:""}</div><span class="pill s-${st}">${STATUS[st]}</span></div>
    <dl class="kv">${x.at?`<dt>${x.kind==="car"?"Pick up":"When"}</dt><dd class="mono">${esc(fmtWhen(x.at))}${pu?" · "+esc(pu.name):""}</dd>`:""}${x.until?`<dt>Return</dt><dd class="mono">${esc(fmtWhen(x.until))}${dr?" · "+esc(dr.name):""}</dd>`:""}${x.ref?`<dt>Ref</dt><dd class="mono">${esc(x.ref)}</dd>`:""}${x.notes?`<dt>Notes</dt><dd>${esc(x.notes)}</dd>`:""}</dl>
    <div style="margin-top:10px">${statusControl("transport",x,st)}</div></div>`}).join("")}</div>`;
}

function regions(t){
  const out=[]; const add=(key,label)=>{const p=t.places[key]; if(p&&!out.some(o=>o.key===key)) out.push({key,label,p});};
  (t.stays||[]).forEach(s=>s.place&&add(s.place,s.name));
  (t.days||[]).forEach(d=>{ const ks=d.steps.map(s=>s.place).filter(k=>t.places[k]&&!t.places[k].waypoint&&!isStay(t,k)); if(ks.length){ const far=ks[Math.floor(ks.length/2)]; add(far, d.title+" area"); } });
  return out;
}
function viewOffline(t){
  const rs=regions(t);
  return `<div class="grid cols-2">
   <div class="card"><h2 style="margin-bottom:6px">Maps without signal</h2>
    <p style="margin-top:0">Download these areas in the Google Maps app before you fly, on Wi-Fi. Navigation, search and directions then work with no signal.</p>
    <ol class="steps"><li>Open each link below in the Google Maps app.</li><li>Tap your profile picture, then <strong>Offline maps</strong>, then <strong>Select your own map</strong>.</li><li>Fit the blue box around the area and tap <strong>Download</strong>. One box can cover a large region.</li><li>Downloaded maps expire after about a year and update on Wi-Fi.</li></ol>
    <ul class="next-list" style="margin-top:12px">${rs.map(r=>`<li><span>${esc(r.label)}<br><span class="small muted">${esc(r.p.name)}</span></span><a class="btn" href="${gmapsPlace(r.p)}" target="_blank" rel="noopener">${ICON.map} Open area</a></li>`).join("")}</ul>
   </div>
   <div class="card"><h2 style="margin-bottom:6px">This app without signal</h2>
    <p style="margin-top:0">${S.swReady?"This app is saved on this device. Trips, day maps, timelines and bookings all open with no connection. Only the Google Maps links need signal or offline areas.":"Open the app once with a connection and it saves itself for offline use. Then trips, maps and bookings open with no signal."}</p>
    ${installCard()}
    <h3 style="margin:16px 0 6px">Share with fellow travellers</h3>
    <p style="margin-top:0" class="small">Send the trip file so they can load it in their own copy of the app, or send the single-page copy to anyone.</p>
    <div class="row"><button class="btn primary" data-save="json">Share trip file</button><button class="btn" data-save="html">Share one-page copy</button></div>
   </div></div>`;
}

const TEMPLATE = {format:"trip-planner/1",id:"porto-lisbon-2027",title:"Porto and Lisbon",tagline:"Five days of food, tiles and viewpoints.",region:"Portugal",start:"2027-05-01",end:"2027-05-05",travellers:["Sam","Alex"],currency:"GBP",
  daylight:{sunrise:"06:35",sunset:"20:40"},
  places:{OPO:{name:"Porto airport",lat:41.2481,lon:-8.6814},HOTEL:{name:"Hotel in Ribeira",lat:41.1407,lon:-8.6130},LIVRARIA:{name:"Livraria Lello",lat:41.1469,lon:-8.6149},COIMBRA:{name:"Coimbra",lat:40.2033,lon:-8.4103,waypoint:true}},
  stays:[{id:"porto-hotel",name:"Hotel in Ribeira",address:"Street, Porto",place:"HOTEL",checkIn:"2027-05-01T15:00",checkOut:"2027-05-03T11:00",host:"",via:"Booking.com",ref:"",cost:420,cancellation:"Free until 28 Apr",status:"booked",notes:""}],
  transport:[{id:"flight-out",kind:"flight",title:"London to Porto",at:"2027-05-01T09:00",ref:"",status:"booked"},{id:"car",kind:"car",title:"Hire car",provider:"",at:"2027-05-03T10:00",until:"2027-05-05T10:00",pickup:"HOTEL",dropoff:"OPO",status:"todo"}],
  bookings:[{id:"lello",title:"Livraria Lello tickets",provider:"Livraria Lello",date:"2027-05-02",time:"10:00",people:2,url:"https://www.livrarialello.pt",bookBy:"2027-04-20",cost:"€10 each",status:"todo",notes:""}],
  days:[{date:"2027-05-02",title:"Old Porto",color:"#0B5F73",stay:"porto-hotel",route:["HOTEL","LIVRARIA"],steps:[{time:"09:30",title:"Hotel",place:"HOTEL",next:"Walk 15 min"},{time:"10:00",title:"Livraria Lello",place:"LIVRARIA",booking:"lello",note:"Arrive 10 minutes early"}]}],
  checklist:[{id:"passport",title:"Passports",group:"Documents"}],notes:[{title:"Emergency",body:"Call 112."}],links:[{title:"Weather",url:"https://www.ipma.pt/en/"}]};

/* ---------- loading & validation ---------- */
function validate(obj){
  if(!obj||typeof obj!=="object") return "That isn't a trip file.";
  if(obj.format!=="trip-planner/1"&&obj.format!=="tripster/1") return "This file is missing format: \"trip-planner/1\".";
  if(!obj.id||!/^[A-Za-z0-9_.~:@+-]{1,120}$/.test(obj.id)) return "The trip id must be letters, digits and dashes only.";
  if(!obj.title) return "The trip needs a title.";
  if(!Array.isArray(obj.days)) return "The trip needs a days list (it can be empty).";
  obj.places=obj.places||{}; obj.stays=obj.stays||[]; obj.bookings=obj.bookings||[]; obj.transport=obj.transport||[];
  for(const d of obj.days){ if(!d.date||!Array.isArray(d.steps)) return "Each day needs a date and a steps list."; }
  return null;
}
async function loadTripText(text){
  const msg=$("#load-msg"); let obj;
  try{ obj=JSON.parse(text); }catch(e){ msg.textContent="That file isn't valid JSON. Check for a missing comma or bracket."; return; }
  const err=validate(obj); if(err){ msg.textContent=err; return; }
  const prev=allTrips()[obj.id]; if(prev&&prev.people&&!obj.people) obj.people=prev.people;
  if(isShared(obj)){ keepLocal(obj); cloudSaveTrip(obj,"uploaded a new version of the plan"); } else { keepLocal(obj); setSource(obj.id,"upload"); seedTicks(obj, true); }
  S.wx[obj.id]=loadJSON("ts.wx."+obj.id); openTrip(obj.id,"overview"); toast("Loaded "+obj.title); ensureWx(obj,true); writeSwState();
}
function seedTicks(obj, fromFile){
  // A shared trip file carries the sender's ticks in item.status and packed[]; adopt them.
  const cur=Object.assign({}, S.status[obj.id]);
  if(fromFile && Array.isArray(obj.packed)) obj.packed.forEach(id=>{ cur["check:"+id]="done"; });
  if(fromFile){ ["booking:bookings","stay:stays","transport:transport"].forEach(p=>{ const [k,f]=p.split(":"); (obj[f]||[]).forEach(x=>{ delete cur[k+":"+x.id]; }); }); }
  S.status[obj.id]=cur; store.set("tp.status."+obj.id, JSON.stringify(cur));
}
function keepLocal(obj){ S.localTrips[obj.id]=obj; try{ const all=JSON.parse(store.get("tp.local")||"{}"); all[obj.id]=obj; store.set("tp.local",JSON.stringify(all)); }catch(e){} }

/* ---------- offline copy ---------- */
function offlineHTML(t){
  const P=(k)=>t.places[k]; const st=(k,i)=>STATUS[statusOf(k,i)];
  const row=(a,b)=>b?`<tr><th>${esc(a)}</th><td>${b}</td></tr>`:"";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)} (offline)</title>
<style>body{font:16px/1.5 -apple-system,Segoe UI,system-ui,sans-serif;margin:0 auto;max-width:760px;padding:16px;color:#14222B;background:#fff}h1{font-size:1.6rem;margin:.2em 0}h2{margin-top:1.6em;border-bottom:2px solid #14222B;padding-bottom:4px}h3{margin:1.2em 0 .3em}table{border-collapse:collapse;width:100%;font-size:.95rem}th{text-align:left;color:#5A6B75;font-weight:600;padding:3px 10px 3px 0;vertical-align:top;width:7.5em}td{padding:3px 0}.s{display:inline-block;padding:0 8px;border-radius:9px;background:#eef2f3;font-size:.8rem;font-weight:700}.t{font-family:ui-monospace,Menlo,monospace;color:#5A6B75}ol{padding-left:0;list-style:none}li{padding:6px 0;border-bottom:1px solid #e3eaec}a{color:#0B5F73}.card{border:1px solid #d3dde1;border-radius:10px;padding:10px 12px;margin:8px 0}@media(prefers-color-scheme:dark){body{background:#0E171C;color:#E6EEF1}.s{background:#1D2D35}li{border-color:#2A3C45}.card{border-color:#2A3C45}a{color:#5CC2D6}h2{border-color:#E6EEF1}}</style></head><body>
<h1>${esc(t.title)}</h1><p>${esc(fmtDay(t.start,true))} – ${esc(fmtDay(t.end,true))} · ${esc((t.travellers||[]).join(", "))}</p><p style="color:#5A6B75">Saved ${esc(new Date().toLocaleString("en-GB"))}. Map links need a connection or Google Maps offline areas.</p>
<h2>Day by day</h2>${(t.days||[]).map(d=>`<h3>${esc(fmtDay(d.date,true))}: ${esc(d.title)}</h3><ol>${d.steps.map(s=>{const p=P(s.place);return `<li><span class="t">${esc(s.time||"")}</span> <strong>${esc(s.title)}</strong>${s.next?`<br><small>Then: ${esc(s.next)}</small>`:""}${p&&!p.waypoint?` <a href="${gmapsPlace(p)}">map</a>`:""}</li>`}).join("")}</ol>${gmapsDay(t,d)?`<a href="${gmapsDay(t,d)}">Whole day in Google Maps</a>`:""}`).join("")}
<h2>Bookings</h2>${(t.bookings||[]).map(b=>`<div class="card"><strong>${esc(b.title)}</strong> <span class="s">${esc(st("booking",b))}</span><table>${row("When",esc([fmtDay(b.date,true),b.time].filter(Boolean).join(", ")))}${row("Where",esc(b.where||""))}${row("Ref",esc(b.ref||""))}${row("Notes",esc(b.notes||""))}</table></div>`).join("")}
<h2>Stays</h2>${(t.stays||[]).map(s=>`<div class="card"><strong>${esc(s.name)}</strong> <span class="s">${esc(st("stay",s))}</span><table>${row("Address",esc(s.address||""))}${row("Check in",esc(fmtWhen(s.checkIn)))}${row("Check out",esc(fmtWhen(s.checkOut)))}${row("Ref",esc(s.ref||""))}${row("Cancel",esc(s.cancellation||""))}${row("Host",esc(s.host||""))}</table></div>`).join("")}
<h2>Travel</h2>${(t.transport||[]).map(x=>`<div class="card"><strong>${esc(x.title)}</strong> <span class="s">${esc(st("transport",x))}</span><table>${row("When",esc(fmtWhen(x.at||"")))}${row("Return",esc(x.until?fmtWhen(x.until):""))}${row("Ref",esc(x.ref||""))}${row("Notes",esc(x.notes||""))}</table></div>`).join("")}
${(t.notes||[]).length?`<h2>Good to know</h2>${t.notes.map(n=>`<p><strong>${esc(n.title)}.</strong> ${esc(n.body)}</p>`).join("")}`:""}
</body></html>`;
}
function withTicks(t){
  const c=JSON.parse(JSON.stringify(t));
  ["booking:bookings","stay:stays","transport:transport"].forEach(p=>{ const [k,f]=p.split(":"); (c[f]||[]).forEach(x=>{ x.status=statusOf(k,x); }); });
  const done=(c.checklist||[]).filter(x=>statusOf("check",x)==="done").map(x=>x.id); if(done.length) c.packed=done;
  return c;
}
async function save(kind){
  const t=trip();
  const files={
    html:[(t?t.id:"trip")+"-offline.html",()=>offlineHTML(t),"text/html"],
    json:[(t?t.id:"trip")+".trip.json",()=>JSON.stringify(withTicks(t),null,2),"application/json"],
    template:["trip-template.trip.json",()=>JSON.stringify(TEMPLATE,null,2),"application/json"],
    backup:["tripster-backup-"+todayISO()+".json",()=>JSON.stringify({format:"trip-planner-backup/1",savedAt:new Date().toISOString(),trips:S.localTrips,status:S.status},null,2),"application/json"]};
  const [filename,make,type]=files[kind];
  const blob=new Blob([make()],{type});
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch && navigator.canShare){
    try{ const f=new File([blob],filename,{type}); if(navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:filename}); return; } }
    catch(e){ if(e&&e.name==="AbortError") return; }
  }
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=filename; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000); toast("Saved "+filename);
}

function installCard(){
  if(S.standalone) return `<h3>Installed</h3><p class="small" style="margin:0">You're using Tripster from your home screen. It works offline.</p>`;
  const ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1), android=/Android/.test(ua), ff=/Firefox|FxiOS/.test(ua), mac=/Macintosh/.test(ua)&&!ios, safari=/Safari/.test(ua)&&!/Chrome|Chromium|CriOS|Edg|FxiOS|Firefox/.test(ua);
  const ways=[
    ["ios","iPhone and iPad","In Safari tap Share, then <em>Add to Home Screen</em>. On iOS 16.4 or later, Chrome, Edge, Firefox and Brave also have <em>Add to Home Screen</em> under Share."],
    ["android","Android (Chrome, Edge, Brave, Samsung Internet)","Tap the menu, then <em>Install app</em> or <em>Add to Home screen</em>."],
    ["androidff","Android Firefox","Tap the menu, then <em>Install</em> or <em>Add to Home screen</em>."],
    ["desk","Computer (Chrome, Edge, Brave)","Click the install icon at the right of the address bar."],
    ["macsafari","Mac Safari","File, then <em>Add to Dock</em>."],
    ["deskff","Computer Firefox","Can't install apps, but Tripster still works offline in a normal tab once opened. Bookmark it."]];
  const mine = ios?"ios" : android? (ff?"androidff":"android") : mac&&safari? "macsafari" : ff? "deskff" : "desk";
  const main=ways.find(w=>w[0]===mine), rest=ways.filter(w=>w[0]!==mine);
  const btn=S.installEvt?`<div class="row" style="margin:6px 0 10px"><button class="btn primary" data-install>Install Tripster</button></div>`:"";
  return `<h3 style="margin-bottom:6px">Install on this device</h3>${btn}
   <div class="install-steps"><div><strong>${main[1]}</strong>${main[2]}</div></div>
   <details style="margin-top:10px"><summary class="small" style="cursor:pointer;font-weight:700">Other phones and browsers</summary><div class="install-steps">${rest.map(w=>`<div><strong>${w[1]}</strong>${w[2]}</div>`).join("")}</div></details>`;
}
function restoreBackup(text){
  let b; try{ b=JSON.parse(text); }catch(e){ toast("That backup isn't valid."); return; }
  if(!b||b.format!=="trip-planner-backup/1"){ if(b&&b.format==="trip-planner/1") return loadTripText(text); toast("That isn't a Tripster backup."); return; }
  Object.entries(b.trips||{}).forEach(([id,t])=>{ if(!validate(t)){ keepLocal(t); setSource(id,"upload"); } });
  Object.entries(b.status||{}).forEach(([id,s])=>{ S.status[id]=s; store.set("tp.status."+id,JSON.stringify(s)); });
  pickDefault(); render(); toast("Backup restored");
}
function setSource(id,src){ try{ const m=JSON.parse(store.get("tp.src")||"{}"); m[id]=src; store.set("tp.src",JSON.stringify(m)); }catch(e){} }
function sourceOf(id){ try{ return JSON.parse(store.get("tp.src")||"{}")[id]; }catch(e){ return null; } }

/* ---------- small helpers ---------- */
function loadJSON(k){ try{ const v=store.get(k); return v? JSON.parse(v) : null; }catch(e){ return null; } }
function saveJSON(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function addDays(iso,n){ const d=dateObj(iso); if(!d) return iso; d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function daysUntil(iso){ const a=dateObj(iso), b=dateObj(todayISO()); return a&&b? Math.round((a-b)/864e5) : null; }
function slug(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[ðÐ]/g,"d").replace(/[þÞ]/g,"th").replace(/[æÆ]/g,"ae").replace(/[øØ]/g,"o").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"trip"; }
function ago(iso){ if(!iso) return ""; const m=Math.round((Date.now()-new Date(iso))/6e4); if(m<1) return "just now"; if(m<60) return m+" min ago"; const h=Math.round(m/60); if(h<36) return h+" h ago"; return Math.round(h/24)+" days ago"; }
function openTrip(id, tab){ S.tripId=id; store.set("tp.trip",id); S.screen="trip"; S.day=null; S.wxPlace=null; S.wxDate=null; S.placeResults=null; S.confirm=null; S.tab=tab||"overview"; store.set("tp.tab",S.tab); render(); window.scrollTo({top:0}); const t=trip(); if(t) ensureWx(t); }
function persistTrip(t,note){ keepLocal(t); if(isShared(t)) cloudSaveTrip(t,note); else setSource(t.id,"upload"); writeSwState(); }

/* ---------- weather: data ---------- */
const WXI = {
  sun:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  part:'<path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M11.2 4.8l-1 1"/><circle cx="8" cy="8" r="2.6"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.4 1.2A2.9 2.9 0 0 0 9 20z"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z"/>',
  fog:'<path d="M4 8h16M3 12h18M5 16h14M8 20h8"/>',
  rain:'<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  snow:'<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><g fill="currentColor" stroke="none"><circle cx="8" cy="17.5" r="1.1"/><circle cx="12" cy="19" r="1.1"/><circle cx="16" cy="17.5" r="1.1"/><circle cx="10" cy="21.5" r="1.1"/><circle cx="14" cy="21.5" r="1.1"/></g>',
  storm:'<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M12.5 15l-2.5 4h3l-2 4"/>'
};
function wxIcon(code){ const k=TSWX.kind(code); return `<span class="wxi wx-${k}" title="${esc(TSWX.WMO[code]||"")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${WXI[k]}</svg></span>`; }
const COMPASS=["N","NE","E","SE","S","SW","W","NW"];
function windTxt(ws,wg,wd){ const from=wd==null?"":COMPASS[Math.round(wd/45)%8];
  return `<svg class="warr" viewBox="0 0 12 12" style="transform:rotate(${(wd||0)+180}deg)" aria-hidden="true"><path d="M6 11V1M6 1L2.5 4.5M6 1l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> ${Math.round(ws)}<span class="muted">/${Math.round(wg)}</span> m/s${from?` <span class="muted">${from}</span>`:""}`; }
function precipTxt(p,sn){ return sn>0? `${sn} cm snow` : p>0? `${p} mm` : `<span class="muted">dry</span>`; }

function wxPoints(t){
  const keys=[]; const add=k=>{ if(k&&t.places[k]&&!t.places[k].waypoint&&!keys.includes(k)) keys.push(k); };
  TSWX.itinerary(t).forEach(x=>add(x.key)); (t.stays||[]).forEach(s=>add(s.place)); Object.keys(t.places||{}).forEach(add);
  return keys.slice(0,80).map(k=>({key:k,lat:t.places[k].lat,lon:t.places[k].lon})).filter(p=>isFinite(p.lat)&&isFinite(p.lon));
}
function recompute(t){
  const W=S.wx[t.id]; if(!W) return;
  S.alerts[t.id]=TSWX.alerts(t,W);
  S.changes[t.id]=loadJSON("ts.chg."+t.id)||null;
}
async function ensureWx(t, force){
  if(!t||!navigator.onLine||S.wxBusy[t.id]) return;
  const W=S.wx[t.id]; if(!force && W && Date.now()-new Date(W.fetchedAt) < 2*60*60e3) return;
  if(!force && S.wxErr[t.id] && Date.now()-(S.wxErrAt||0) < 20*60e3) return;
  if(!force && (t.end||"9999") < todayISO()) return;
  const pts=wxPoints(t); if(!pts.length) return;
  S.wxBusy[t.id]=true; S.wxErr[t.id]=null; if(S.tab==="weather"&&S.screen==="trip") render();
  try{
    const res=await TSWX.fetchWx(pts); if(!Object.keys(res.places).length) throw new Error("empty");
    const prev=loadJSON("ts.snap."+t.id), snap=TSWX.snapshot(t,res), chg=TSWX.changes(t,prev,snap);
    S.wx[t.id]=res; saveJSON("ts.wx."+t.id,res); saveJSON("ts.snap."+t.id,snap);
    if(chg.length){ const c={at:res.fetchedAt, since:prev&&W?W.fetchedAt:null, items:chg}; saveJSON("ts.chg."+t.id,c); }
    recompute(t); notifyNew(t, S.alerts[t.id], chg);
  }catch(e){ S.wxErr[t.id]= !navigator.onLine? "You're offline. Showing the last saved forecast." : e&&e.limit? "The free weather service is busy right now. Showing the last saved forecast; it will retry later." : "Couldn't reach the weather service. Showing the last saved forecast."; }
  if(S.wxErr[t.id]) S.wxErrAt=Date.now();
  S.wxBusy[t.id]=false;
  if(S.screen==="home" || S.tripId===t.id) render();
}
let refreshing=false;
async function refreshAll(){ if(refreshing) return; refreshing=true;
  try{ const all=allTrips(); for(const id of Object.keys(all)){ const t=all[id]; if((t.end||"")>=todayISO() && daysUntil(t.start)<=120){ await ensureWx(t); await loadLive(t); } } }
  finally{ refreshing=false; } }

/* ---------- alerts and notifications ---------- */
async function swReg(){ try{ return "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null; }catch(e){ return null; } }
async function notifyNew(t, alerts, chg){
  if(!S.alertsOn || !("Notification" in window) || Notification.permission!=="granted") return;
  const sent=new Set(loadJSON("ts.notified")||[]); const items=[];
  (alerts||[]).forEach(a=>{ const id=t.id+"|"+a.id+"|"+a.level; if(!sent.has(id)){ sent.add(id); items.push(`${fmtDay(a.date,true)}: ${a.title} ${a.detail} (${a.places.slice(0,3).join(", ")})`); } });
  (chg||[]).forEach(c=>{ const id=t.id+"|"+c.id; if(!sent.has(id)){ sent.add(id); items.push(`${fmtDay(c.date,true)} ${c.name}: ${c.text}`); } });
  if(!items.length) return;
  saveJSON("ts.notified",[...sent].slice(-400));
  const title="Tripster: weather for "+t.title, body=items.slice(0,4).join("\n")+(items.length>4?`\n+${items.length-4} more`:"");
  const reg=await swReg();
  try{ if(reg&&reg.showNotification) await reg.showNotification(title,{body,tag:"wx-"+t.id,icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{trip:t.id}}); else new Notification(title,{body,icon:"icons/icon-192.png"}); }catch(e){}
}
async function toggleAlerts(){
  if(S.alertsOn){ S.alertsOn=false; store.set("ts.alerts","0"); toast("Weather alerts off"); render(); return; }
  if(!("Notification" in window)){ toast("This browser can't show notifications. On iPhone, install Tripster to the home screen first."); return; }
  let p=Notification.permission; if(p==="default"){ try{ p=await Notification.requestPermission(); }catch(e){} }
  if(p!=="granted"){ toast("Notifications are blocked for this site. Allow them in the browser's site settings."); render(); return; }
  S.alertsOn=true; store.set("ts.alerts","1"); writeSwState();
  const reg=await swReg();
  try{ if(reg&&reg.periodicSync){ const st=await navigator.permissions.query({name:"periodic-background-sync"}); if(st.state==="granted") await reg.periodicSync.register("tripster-wx",{minInterval:6*60*60e3}); } }catch(e){}
  toast("Weather alerts on"); render();
}
// The service worker re-checks forecasts in the background where the browser allows it.
async function writeSwState(){
  try{ if(!("caches" in window)) return;
    const today=todayISO(), all=allTrips();
    const trips=Object.values(all).filter(t=>(t.end||"")>=today).map(t=>({id:t.id,title:t.title,start:t.start,end:t.end,places:t.places,days:t.days,stays:t.stays}));
    const c=await caches.open("tripster-state"); await c.put("state.json", new Response(JSON.stringify({alertsOn:S.alertsOn,trips}),{headers:{"content-type":"application/json"}}));
  }catch(e){}
}
function alertLi(a){ return `<li><span class="lvl ${a.level}">${a.level==="severe"?"Severe":"Warning"}</span><span><strong>${esc(fmtDay(a.date,true))}: ${esc(a.title)}</strong> ${esc(a.detail)}<br><span class="small muted">${esc(a.places.filter((v,i,x)=>x.indexOf(v)===i).slice(0,5).join(", "))}</span></span></li>`; }
function alertsCard(t, compact){
  const A=S.alerts[t.id]||[], C=S.changes[t.id], W=S.wx[t.id];
  if(!W) return "";
  const inRange=(t.days||[]).some(d=>Object.values(W.places).some(px=>px.d.time.includes(d.date)));
  if(!inRange) return compact? "" : "";
  const recent=C&&C.items&&C.items.length&&(Date.now()-new Date(C.at))<3*864e5 ? C : null;
  if(!A.length && !recent) return compact? `<div class="card alertbox ok" style="margin-bottom:14px"><strong>No extreme weather in the forecast for your trip days.</strong> <span class="small muted">Updated ${esc(ago(W.fetchedAt))}</span></div>` : "";
  return `<div class="card alertbox" style="margin-bottom:14px">
    <div class="spread"><h3>Weather alerts</h3>${compact?`<button class="btn" data-go="weather">See weather</button>`:""}</div>
    ${A.length?`<ul class="alist">${A.slice(0,compact?3:5).map(a=>alertLi(a)).join("")}</ul>${A.length>(compact?3:5)?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer;font-weight:700">${A.length-(compact?3:5)} more</summary><ul class="alist">${A.slice(compact?3:5).map(a=>alertLi(a)).join("")}</ul></details>`:""}`:""}
    ${recent?`<p class="small" style="margin:10px 0 4px"><strong>Changed in the latest forecast</strong> (${esc(ago(recent.at))})</p><ul class="alist">${recent.items.slice(0,6).map(c=>`<li><span class="lvl">Change</span><span>${esc(fmtDay(c.date,true))}, ${esc(c.name)}: ${esc(c.text)}</span></li>`).join("")}</ul>`:""}
  </div>`;
}

/* ---------- weather on days ---------- */
function dayWx(t,day){
  const W=S.wx[t.id]; if(!W) return "";
  const stay=(t.stays||[]).find(s=>s.id===day.stay);
  const keys=[...day.steps.map(s=>s.place).filter(k=>t.places[k]&&!t.places[k].waypoint), stay&&stay.place].filter(Boolean);
  for(const k of keys){ const px=W.places[k]; const d=px&&TSWX.day(px,day.date); if(d) return `<div class="daywx">${wxIcon(d.c)}<span>${esc(TSWX.WMO[d.c]||"")} · <span class="mono">${Math.round(d.tmin)}° to ${Math.round(d.tmax)}°</span> · gusts ${Math.round(d.wg)} m/s${d.sn>0?` · ${d.sn} cm snow`:""}</span></div>`; }
  return "";
}
function stepWx(t,date,s){
  const W=S.wx[t.id]; const px=W&&W.places[s.place]; if(!px) return "";
  const i=TSWX.hourIndex(px,date,s.time); if(i<0) return "";
  const h=px.h; return `<div class="wxline">${wxIcon(h.c[i])}<span class="mono">${Math.round(h.t[i])}°</span><span>${windTxt(h.ws[i],h.wg[i],h.wd[i])}</span>${h.sn[i]>0?`<span>snow</span>`:h.p[i]>0.1?`<span>${h.p[i]} mm</span>`:""}</div>`;
}

/* ---------- weather tab ---------- */
const DRONES=[[8,"Level 4 wind resistance, 8 m/s (e.g. DJI Neo class)"],[10.7,"Level 5, 10.7 m/s (e.g. DJI Mini class)"],[12,"Level 6, 12 m/s (e.g. DJI Air class)"]];
function viewWeather(t){
  const W=S.wx[t.id], busy=S.wxBusy[t.id], err=S.wxErr[t.id];
  const bar=`<div class="wxbar"><span class="small muted">${W?`Forecast updated ${esc(ago(W.fetchedAt))}`:busy?"Fetching forecasts…":""}${err&&W?` · <span style="color:var(--bad)">${esc(err)}</span>`:""}</span>
    <span class="row"><button class="btn" data-wx-refresh ${busy||!navigator.onLine?"disabled":""}>${busy?"Updating…":"Refresh"}</button><button class="btn ${S.alertsOn?"primary":""}" data-alerts>${S.alertsOn?"Alerts on":"Turn on alerts"}</button></span></div>`;
  if(!W){
    if(!busy&&!err&&navigator.onLine) setTimeout(()=>ensureWx(t,true),0);
    return bar+liveSection(t)+`<div class="empty">${err? (navigator.onLine? "Couldn't get forecasts right now. Tap Refresh to try again in a few minutes." : "You're offline. Connect once to download forecasts; they're then saved for offline use.") : navigator.onLine?"Getting forecasts for every place on this trip…":"Connect to the internet once to download forecasts. They're then saved for offline use."}</div>`;
  }
  const first=Object.values(W.places)[0]; const fdates=first? first.d.time : [];
  const tripDates=(t.days||[]).map(d=>d.date).filter(d=>fdates.includes(d));
  const firstDay=((t.days||[])[0]||{}).date||t.start; const opens=addDays(firstDay,-15);
  const intro = tripDates.length? "" : `<div class="card" style="margin-bottom:14px"><strong>Trip-day forecasts start on ${esc(fmtDay(opens,true))}</strong>, 16 days before you go. Alerts begin then too. Until then, here is the forecast at your places from today, so you can check how it looks.</div>`;
  return `${bar}${liveSection(t)}${alertsCard(t,false)}${intro}
   ${tripDates.length?`<div class="section-head" style="margin-top:0"><h2>Your trip days</h2><span class="small muted">Low to high · wind/gusts · rain or snow</span></div>
   <div class="grid cols-2">${tripDates.map(date=>{ const day=t.days.find(d=>d.date===date); const pts=TSWX.itinerary(t).filter(x=>x.date===date).slice(0,7);
     return `<div class="card" style="border-top:5px solid ${esc(day.color||"var(--accent)")}"><div class="spread"><div><div class="eyebrow">${esc(fmtDay(date,true))}</div><h3 style="margin:2px 0 0">${esc(day.title)}</h3></div><button class="btn" data-wx-pick="${esc(date)}">Hourly</button></div>
       <ul class="wxrows">${pts.map(({key})=>{ const px=W.places[key]; const d=px&&TSWX.day(px,date); if(!d) return ""; return `<li>${wxIcon(d.c)}<span>${esc(t.places[key].name)}<small>${esc(TSWX.WMO[d.c]||"")}</small></span><span class="num">${Math.round(d.tmin)}° / ${Math.round(d.tmax)}°<small>${precipTxt(d.p,d.sn)}</small></span><span class="num">${windTxt(d.ws,d.wg,d.wd)}</span></li>`; }).join("")}</ul></div>`; }).join("")}</div>`:""}
   ${placeForecast(t,W,tripDates)}
   <div class="card" style="margin-top:14px"><h3>Drone flying</h3>
     <label class="small muted" for="drone-limit">Your drone's wind limit</label>
     <select id="drone-limit" class="field" style="margin-top:4px">${DRONES.map(([v,l])=>`<option value="${v}" ${S.droneLimit==v?"selected":""}>${esc(l)}</option>`).join("")}</select>
     <p class="small" style="margin-bottom:0"><span class="dpill d0">Good</span> calm enough with margin · <span class="dpill d1">Marginal</span> gusty, hazy, dark or very cold · <span class="dpill d2">No-fly</span> wind or gusts over your limit, rain, snow or fog. Wind aloft is forecast for 120 m. Check your drone's spec sheet and local rules: many national parks and nature reserves ban drones.</p>
   </div>
   <p class="small muted" style="margin-top:14px">Forecast data: Open-Meteo.com. Before driving, check official warnings: ${[...(t.links||[]).filter(l=>/vedur|weather|met|warn/i.test(l.title+l.url)),{title:"MeteoAlarm (Europe)",url:"https://meteoalarm.org"}].map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>`).join(" · ")}</p>`;
}
function placeForecast(t,W,tripDates){
  const keys=wxPoints(t).map(p=>p.key).filter(k=>W.places[k]);
  if(!keys.length) return "";
  if(!S.wxPlace||!keys.includes(S.wxPlace)){ const it=TSWX.itinerary(t).find(x=>W.places[x.key]&&tripDates.includes(x.date)); S.wxPlace=(it&&it.key)||keys[0]; }
  const px=W.places[S.wxPlace]; const dates=px.d.time;
  if(!S.wxDate||!dates.includes(S.wxDate)) S.wxDate=tripDates.find(d=>(t.days.find(x=>x.date===d).steps||[]).some(s=>s.place===S.wxPlace))||tripDates[0]||dates[0];
  const d=TSWX.day(px,S.wxDate), lim=S.droneLimit;
  const rows=[]; for(let hr=0;hr<24;hr++){ const i=TSWX.hourIndex(px,S.wxDate,String(hr).padStart(2,"0")+":00"); if(i<0) continue; rows.push({hr,i,dr:TSWX.drone(px,i,lim),night:!px.h.day[i]}); }
  // best drone window: longest run of Good, else Marginal, in daylight
  let best=null; for(const want of [0,1]){ let run=[]; const runs=[]; rows.forEach(r=>{ if(!r.night&&r.dr.lvl<=want) run.push(r); else { if(run.length) runs.push(run); run=[]; } }); if(run.length) runs.push(run);
    runs.sort((a,b)=>b.length-a.length); if(runs[0]){ best={want,from:runs[0][0].hr,to:runs[0][runs[0].length-1].hr+1}; break; } }
  const shown=S.wxNight||rows.every(r=>r.night)? rows : rows.filter(r=>!r.night);
  const names=keys.map(k=>[k,t.places[k].name]).sort((a,b)=>a[1].localeCompare(b[1]));
  return `<div class="section-head"><h2>Hour by hour</h2></div>
  <div class="card">
    <label class="small muted" for="wx-place">Place</label>
    <select id="wx-place" class="field" style="margin:4px 0 10px">${names.map(([k,n])=>`<option value="${esc(k)}" ${k===S.wxPlace?"selected":""}>${esc(n)}</option>`).join("")}</select>
    <div class="datechips" role="group" aria-label="Choose a date">${dates.map((ds,j)=>`<button data-wx-date="${ds}" aria-pressed="${ds===S.wxDate}" class="${tripDates.includes(ds)?"trip":""}" title="${tripDates.includes(ds)?"Trip day":""}"><span>${esc(fmtDay(ds,true).replace(/ \w+$/,""))}</span>${wxIcon(px.d.c[j])}<span class="mono">${Math.round(px.d.tmax[j])}°</span></button>`).join("")}</div>
    ${d?`<p class="small" style="margin:8px 0 0"><strong>${esc(fmtDay(S.wxDate,true))}</strong> · ${esc(TSWX.WMO[d.c]||"")} · ${Math.round(d.tmin)}° to ${Math.round(d.tmax)}° · gusts up to ${Math.round(d.wg)} m/s · sunrise ${esc(d.rise)}, sunset ${esc(d.set)}<br>
      Drone: ${best? `${best.want?"no fully good window; best marginal":"best window"} <strong class="mono">${String(best.from).padStart(2,"0")}:00–${String(best.to).padStart(2,"0")}:00</strong>` : "<strong>no flyable daylight hours</strong>"}</p>`:""}
    <div class="tablewrap"><table class="hourly"><thead><tr><th>Time</th><th>Sky</th><th>Temp (feels)</th><th>Wind/gust</th><th>Drone</th><th>Rain/snow</th></tr></thead><tbody>
      ${shown.map(({hr,i,dr,night})=>`<tr class="${night?"night":""}"><td class="mono">${String(hr).padStart(2,"0")}:00</td><td>${wxIcon(px.h.c[i])}</td><td class="mono">${Math.round(px.h.t[i])}° <span class="muted" title="Feels like">(${Math.round(px.h.ta[i])}°)</span></td><td class="mono">${windTxt(px.h.ws[i],px.h.wg[i],px.h.wd[i])}</td><td><span class="dpill d${dr.lvl}" title="${esc(dr.why.join(", "))}">${["Good","Marginal","No-fly"][dr.lvl]}</span>${dr.why.length?`<div class="small muted" style="white-space:normal;min-width:120px">${esc(dr.why.slice(0,2).join(", "))}</div>`:""}</td><td class="mono">${precipTxt(px.h.p[i],px.h.sn[i])}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="row" style="margin-top:8px"><button class="linkbtn small" data-wx-night>${S.wxNight?"Hide night hours":"Show night hours"}</button></div>
  </div>`;
}

/* ---------- explore ---------- */
function placeOrder(t){
  const out=[]; const add=k=>{ if(k&&t.places[k]&&!t.places[k].waypoint&&!out.includes(k)) out.push(k); };
  (t.days||[]).forEach(d=>d.steps.forEach(s=>add(s.place))); (t.stays||[]).forEach(s=>add(s.place)); Object.keys(t.places||{}).forEach(add);
  return out;
}
function exploreLinks(t,p){
  const q=encodeURIComponent([p.name,p.area||t.region].filter(Boolean).join(", ")), ll=p.lat+","+p.lon;
  return [["Tripadvisor","Top things to do and reviews",`https://www.tripadvisor.com/Search?q=${q}`],
    ["Google Maps","Things to do nearby",`https://www.google.com/maps/search/things+to+do/@${ll},12z`],
    ["Google Maps","Restaurants and cafés nearby",`https://www.google.com/maps/search/restaurants/@${ll},14z`],
    ["Wikivoyage","Free travel guide",`https://en.wikivoyage.org/w/index.php?search=${q}`],
    ["Lonely Planet","Guides and highlights",`https://www.lonelyplanet.com/search?q=${q}`],
    ["Atlas Obscura","Hidden gems",`https://www.atlasobscura.com/search?q=${q}`],
    ["GetYourGuide","Tours and tickets",`https://www.getyourguide.com/s/?q=${q}`],
    ["Viator","Tours and tickets",`https://www.viator.com/searchResults/all?text=${q}`]];
}
function viewExplore(t){
  const keys=placeOrder(t), W=S.wx[t.id], today=todayISO();
  const dayOf={}; (t.days||[]).forEach(d=>d.steps.forEach(s=>{ (dayOf[s.place]=dayOf[s.place]||[]); if(!dayOf[s.place].includes(d.date)) dayOf[s.place].push(d.date); }));
  const R=S.placeResults;
  return `<div class="card">
    <h2 style="margin-bottom:4px">Add a place</h2>
    <p class="small" style="margin-top:0">Search a town, sight or landmark. Tripster adds it to this trip with its weather and links to the best things to see nearby.</p>
    <form data-place-search class="row" role="search"><input id="place-q" class="field" style="flex:1;min-width:180px" placeholder="e.g. Vík, Skógafoss, Lisbon" autocomplete="off" value="${esc(R&&R.q||"")}"><button class="btn primary" ${navigator.onLine?"":"disabled"}>Search</button></form>
    ${!navigator.onLine?`<p class="small muted">Searching needs a connection.</p>`:""}
    ${R?(R.busy?`<p class="small muted">Searching…</p>`:R.error?`<p class="small" style="color:var(--bad)">${esc(R.error)}</p>`:!R.items.length?`<p class="small muted">No places found. Try a different spelling or a nearby town.</p>`:
      `<ul class="results">${R.items.map((r,i)=>`<li><span><strong>${esc(r.name)}</strong><br><span class="small muted">${esc([r.admin1,r.country].filter(Boolean).join(", "))}</span></span>
        <span class="row"><select class="field" id="add-day-${i}" style="width:auto" aria-label="Add to day"><option value="">Just add to trip</option>${(t.days||[]).map(d=>`<option value="${esc(d.date)}">Add to ${esc(fmtDay(d.date,true))}</option>`).join("")}</select><button class="btn primary" data-add-place="${i}">Add</button></span></li>`).join("")}</ul>`):""}
  </div>
  <div class="section-head"><h2>Places on this trip</h2><span class="small muted">${keys.length} places · tap one for things to see</span></div>
  ${keys.length?`<div class="placelist">${keys.map(k=>placeCard(t,k,dayOf[k]||[],W,today)).join("")}</div>`:`<div class="empty">No places yet. Search above to add your first one.</div>`}
  ${exploreDiscover(t)}
  <div class="card" style="margin-top:14px"><div class="spread"><div><h3>Maps without signal</h3><p class="small" style="margin:0">Save these areas in Google Maps before you go.</p></div><button class="btn" data-go="offline">Offline maps</button></div></div>`;
}
function placeCard(t,k,dates,W,today){
  const p=t.places[k]; const px=W&&W.places[k];
  let now=""; if(px){ const date=px.d.time.includes(today)?today:null; if(date){ const hh=String(new Date().getHours()).padStart(2,"0")+":00"; const i=TSWX.hourIndex(px,date,hh); if(i>=0) now=`<span class="row small" style="gap:4px">${wxIcon(px.h.c[i])}<span class="mono">${Math.round(px.h.t[i])}°</span></span>`; } }
  const near=S.nearby[k];
  return `<details class="card place" data-place="${esc(k)}" ${S.openPlace===k?"open":""}>
    <summary><span style="min-width:0"><strong>${esc(p.name)}</strong><br><span class="small muted">${esc(dates.length? dates.map(d=>fmtDay(d,true)).join(", ") : (p.area||"Not on a day yet"))}</span></span><span class="row" style="gap:10px;flex-wrap:nowrap">${now}<span class="chev">${ICON.chev}</span></span></summary>
    <div class="links">${exploreLinks(t,p).map(([a,b,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener"><span>${esc(a)}<small>${esc(b)}</small></span><span class="ext">${ICON.ext}</span></a>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-near="${esc(k)}" ${navigator.onLine||near?"":"disabled"}>${near?"Refresh nearby sights":"Nearby sights on Wikipedia"}</button><a class="btn" href="${gmapsPlace(p)}" target="_blank" rel="noopener">${ICON.map} Map</a><button class="btn" data-wx-place-go="${esc(k)}">Weather</button>
      ${p.added?`<button class="btn" data-remove-place="${esc(k)}">${S.confirm==="place:"+k?"Tap again to remove":"Remove"}</button>`:""}</div>
    ${near?(near.busy?`<p class="small muted">Looking nearby…</p>`:near.error?`<p class="small" style="color:var(--bad)">${esc(near.error)}</p>`:`<ul class="near">${near.items.length?near.items.map(n=>`<li><a href="https://en.wikipedia.org/?curid=${n.id}" target="_blank" rel="noopener">${esc(n.title)}</a> <span class="small muted mono">${n.km} km</span></li>`).join(""):`<li class="muted">Nothing listed within 10 km.</li>`}</ul>`):""}
  </details>`;
}
async function searchPlaces(q){
  q=(q||"").trim(); if(q.length<2) return;
  S.placeResults={q,busy:true,items:[]}; render();
  try{ const r=await fetch("https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name="+encodeURIComponent(q)); const j=await r.json();
    S.placeResults={q,items:(j.results||[]).map(x=>({name:x.name,lat:x.latitude,lon:x.longitude,admin1:x.admin1,country:x.country}))}; }
  catch(e){ S.placeResults={q,items:[],error:"Couldn't search right now. Check your connection."}; }
  render(); const inp=$("#place-q"); if(inp) inp.blur();
}
function addPlace(i){
  const t=trip(), r=S.placeResults&&S.placeResults.items[i]; if(!t||!r) return;
  const sel=$("#add-day-"+i), date=sel?sel.value:"";
  let base=slug(r.name).replace(/-/g,"").toUpperCase().slice(0,12)||"PLACE", key=base, n=2; while(t.places[key]) key=base+(n++);
  t.places[key]={name:r.name,lat:r.lat,lon:r.lon,area:[r.admin1,r.country].filter(Boolean).join(", "),added:true};
  if(!t.region&&r.country) t.region=r.country;
  if(date){ const d=t.days.find(x=>x.date===date); if(d) d.steps.push({time:"",title:r.name,place:key}); }
  persistTrip(t); S.placeResults=null; S.openPlace=key; render(); toast("Added "+r.name); ensureWx(t,true);
  setTimeout(()=>{ const el=document.querySelector(`.place[data-place="${CSS.escape(key)}"]`); if(el) el.scrollIntoView({block:"center",behavior:"smooth"}); },60);
}
function removePlace(k){
  const t=trip(); if(!t||!t.places[k]) return;
  if(S.confirm!=="place:"+k){ S.confirm="place:"+k; render(); return; }
  delete t.places[k]; (t.days||[]).forEach(d=>{ d.steps=d.steps.filter(s=>s.place!==k); if(d.route) d.route=d.route.filter(x=>x!==k); });
  S.confirm=null; S.openPlace=null; persistTrip(t); render(); toast("Removed");
}
async function nearby(k){
  const t=trip(), p=t&&t.places[k]; if(!p) return;
  S.nearby[k]={busy:true}; S.openPlace=k; render();
  try{ const r=await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${p.lat}%7C${p.lon}&gsradius=10000&gslimit=15&format=json&origin=*`); const j=await r.json();
    const items=((j.query&&j.query.geosearch)||[]).filter(x=>x.dist>300).map(x=>({id:x.pageid,title:x.title,km:(x.dist/1000).toFixed(1)}));
    S.nearby[k]={items}; saveJSON("ts.near",S.nearby); }
  catch(e){ S.nearby[k]={error:"Couldn't reach Wikipedia. Check your connection."}; }
  render();
}

/* ---------- home ---------- */
function greeting(){ const h=new Date().getHours(); return h<5?"Good evening":h<12?"Good morning":h<18?"Good afternoon":"Good evening"; }
const HERO_ART=`<svg class="hero-art" viewBox="0 0 400 220" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1.5"><circle cx="320" cy="60" r="40"/><circle cx="320" cy="60" r="72"/><circle cx="320" cy="60" r="104"/><circle cx="320" cy="60" r="136"/><circle cx="320" cy="60" r="168"/></g><g class="route"><path d="M40 200 C 110 140, 150 210, 215 150 S 290 90, 320 72" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3" stroke-dasharray="1 10" stroke-linecap="round"/><circle cx="40" cy="200" r="6" fill="#fff"/><circle cx="215" cy="150" r="4" fill="#fff" opacity=".8"/></g><path d="M320 30a18 18 0 0 1 18 18c0 14-18 32-18 32s-18-18-18-32a18 18 0 0 1 18-18z" fill="#F2B200"/><circle cx="320" cy="48" r="6.5" fill="#0B5F73"/></svg>`;
function tripCard(x,past){
  const dd=daysUntil(x.start), de=daysUntil(x.end);
  const todo=[...(x.bookings||[]).map(b=>statusFor(x,"booking",b)),...(x.transport||[]).map(b=>statusFor(x,"transport",b)),...(x.stays||[]).map(b=>statusFor(x,"stay",b))].filter(s=>s==="todo").length;
  const al=(S.alerts[x.id]||[]).length, places=Object.values(x.places||{}).filter(p=>!p.waypoint).length;
  const when=past?"Past trip":dd>1?`In ${dd} days`:dd===1?"Tomorrow":de>=0?"On now":"Past trip";
  return `<button class="card tripcard ${past?"past":""}" data-open="${esc(x.id)}">
    <span class="tc-top"><span class="eyebrow">${when}</span>${al?`<span class="pill s-alert">${al} weather alert${al>1?"s":""}</span>`:""}</span>
    <h3 style="margin:2px 0">${esc(x.title)}</h3>
    <span class="small mono muted">${esc(fmtDay(x.start,true))} – ${esc(fmtDay(x.end,true))} ${pd(x.end)?pd(x.end).y:""}</span>
    <span class="tc-stats small"><span>${(x.days||[]).length} days</span><span>${places} places</span><span>${todo?`${todo} to book`:"All booked"}</span></span></button>`;
}
const PROMPT=`Plan a trip for me and give me the result as a Tripster trip file.

My trip:
- Destination(s): [e.g. Porto and Lisbon]
- Dates: [start date] to [end date]
- Travellers: [names]
- Interests and pace: [e.g. food, viewpoints, easy walks, no early starts]
- Already booked: [flights, stays, tours with times and references, or "nothing yet"]
- Budget and currency: [e.g. mid-range, GBP]

Reply with ONE JSON file named <trip-id>.trip.json, in exactly this format:

${JSON.stringify(TEMPLATE,null,2)}

Rules:
- "format" is "trip-planner/1". "id" is lowercase words joined by dashes, ending with the year.
- Every place in "places" has real latitude and longitude. Give each a short CAPS key and use that key in days, stays and transport. Mark towns that only shape a driving route with "waypoint": true.
- Dates are YYYY-MM-DD; times are 24-hour HH:MM local time.
- "status" is todo, booked, paid or optional. Use booked or paid only for things I told you are booked.
- Give each day 3 to 8 timed steps. "next" says how to reach the following step, e.g. "Drive 40 min".
- Add "bookBy" dates for anything that sells out, and real booking links in "url".
- Include a packing "checklist", local "notes" (emergency number, driving and safety tips) and useful "links".`;
function planBlock(){
  return `<div class="grid cols-3 plan">
   <div class="card"><div class="stepno">1</div><h3>Ask an AI assistant to plan it</h3>
     <p class="small">Copy this prompt into Claude, ChatGPT or Gemini, fill in the brackets, and it replies with a trip file. Already planned a trip with Claude? Just ask it for "a Tripster trip file".</p>
     <details><summary class="small" style="cursor:pointer;font-weight:700">Show the prompt</summary><pre class="code">${esc(PROMPT)}</pre></details>
     <div class="row"><button class="btn primary" data-copy-prompt>Copy prompt</button><button class="btn" data-save="template">Example file</button></div></div>
   <div class="card"><div class="stepno">2</div><h3>Add the file here</h3>
     <p class="small">Save the reply as a file ending in <span class="mono">.trip.json</span> and upload it, or paste the text straight in. Uploading a file with the same trip id updates that trip.</p>
     <div class="row"><label class="btn primary" for="file-in" style="cursor:pointer">Upload trip file</label><input type="file" id="file-in" accept=".json,application/json,text/plain" hidden><button class="btn" data-toggle-paste>Paste text</button></div>
     <div id="paste-box" hidden><label for="paste-in" class="small muted">Paste the trip file text</label><textarea id="paste-in" spellcheck="false"></textarea><div class="row" style="margin-top:8px"><button class="btn primary" data-load-paste>Load trip</button></div></div>
     <p id="load-msg" class="small" role="status" style="color:var(--bad)"></p></div>
   <div class="card"><div class="stepno">or</div><h3>Build it here</h3>
     <p class="small">Pick a country and your dates, then choose <strong>well-known highlights</strong> or <strong>off-the-beaten-path</strong> places, or follow a <strong>famous road trip</strong>. Tripster also shows how to get around the country.</p>
     <div class="row"><button class="btn primary" data-open-builder>Open the trip builder</button></div>
     <p class="small muted" style="margin:0">Ideas come from Wikivoyage (written by travellers) and Wikidata. Every place also links to Tripadvisor and Google Maps reviews.</p></div>
  </div>
  <details class="card" style="margin-top:14px"><summary>How trip files work</summary>
    <p>A trip file is a small text file (JSON) that lists a trip's places, stays, travel, bookings and day plans. Anyone with the app link can make one: with an AI assistant using the prompt above, or by editing the example file in any text editor.</p>
    <ul class="small" style="padding-left:18px;display:grid;gap:4px">
      <li><strong>places</strong>: every spot on the trip, each with a short key, a name, latitude and longitude. Towns that only shape a driving route get <span class="mono">"waypoint": true</span>.</li>
      <li><strong>days</strong>: one entry per date with timed <strong>steps</strong> that point at places. A step can link a booking.</li>
      <li><strong>stays</strong>, <strong>transport</strong> and <strong>bookings</strong>: each has a status of <span class="mono">todo</span>, <span class="mono">booked</span>, <span class="mono">paid</span> or <span class="mono">optional</span>, plus optional cost, reference, booking link and "book by" date.</li>
      <li><strong>checklist</strong>, <strong>notes</strong> and <strong>links</strong>: packing list, local tips and useful websites.</li>
      <li>Optional <strong>region</strong> (e.g. "Portugal") sharpens the Explore links. Weather and Explore work from the places' coordinates.</li>
    </ul>
    <pre class="code">${esc(JSON.stringify(TEMPLATE,null,2))}</pre></details>`;
}
function viewHome(){
  const all=allTrips(), today=todayISO();
  const ids=Object.keys(all).sort((a,b)=>(all[a].start||"").localeCompare(all[b].start||""));
  const upcoming=ids.filter(id=>(all[id].end||"")>=today), past=ids.filter(id=>(all[id].end||"")<today).reverse();
  const next=upcoming[0]&&all[upcoming[0]], name=S.userName;
  let lead;
  if(!S.loaded) lead="Loading your trips…";
  else if(next){ const dd=daysUntil(next.start); const al=(S.alerts[next.id]||[]).length;
    lead = (dd>1? `${esc(next.title)} starts in <strong>${dd} days</strong>.` : dd===1? `${esc(next.title)} starts <strong>tomorrow</strong>.` : `You're on <strong>${esc(next.title)}</strong>. Have a great day out there.`) + (al?` <strong>${al} weather alert${al>1?"s":""}</strong> for your trip.`:""); }
  else lead="Where to next? Add a trip and Tripster lays it all out: bookings, stays, day maps, weather and the best things to see.";
  return `${accountBar()}${incomingCard()}<section class="hero">${HERO_ART}<div class="hero-in">
      <p class="hello">${esc(greeting())}${name?", "+esc(name):""}</p>
      <h1 class="hero-h">${name? (next&&daysUntil(next.start)<=0?"Enjoy the trip.":"Ready for the road?") : "Welcome to Tripster"}</h1>
      <p class="hero-lead">${lead}</p>
      ${next?`<div class="row"><button class="btn sun" data-open="${esc(next.id)}">Open ${esc(next.title)}</button></div>`:S.loaded?`<div class="row"><button class="btn sun" data-scroll-plan>Plan your first trip</button></div>`:""}
      ${!name&&!CLOUD.user&&!S.renaming?`<form class="namebox" data-name-form><label for="name-in">${name?"Change your name":"What should we call you?"}</label><div class="row"><input id="name-in" autocomplete="given-name" placeholder="Your first name" value="${esc(name)}"><button class="btn sun">Save</button></div></form>`:""}
    </div></section>
    <div class="section-head"><h2>Your trips</h2>${ids.length?`<span class="small muted">Saved on this device</span>`:""}</div>
    ${ids.length? `<div class="grid tripgrid">${[...upcoming.map(id=>tripCard(all[id],false)),...past.map(id=>tripCard(all[id],true))].join("")}</div>` : `<div class="empty">${S.loaded?"No trips yet. Plan one below.":"Loading…"}</div>`}
    <div class="section-head" id="plan"><h2>Plan a new trip</h2><span class="small muted">Three ways to start</span></div>
    ${planBlock()}
    <footer class="homefoot">
      <details><summary>Install on this device</summary><div style="margin-top:8px">${installCard()}</div></details>
      <span class="dot">·</span><button class="linkbtn" data-save="backup">Save backup</button>
      <span class="dot">·</span><label class="linkbtn" for="backup-in" style="cursor:pointer">Restore backup</label><input type="file" id="backup-in" accept=".json,application/json" hidden>
      <span class="dot">·</span><button class="linkbtn" data-alerts>Weather alerts: ${S.alertsOn?"on":"off"}</button>
      <p class="small muted" style="flex-basis:100%;margin:6px 0 0">Trips are saved on this device${fbConfig()?"; shared trips also sync to your group":""}. Tripster goes online only for weather, places, travel guides${fbConfig()?" and shared trips":""}.</p>
    </footer>`;
}
function createTrip(f){
  const title=f.title.value.trim(), start=f.start.value, end=f.end.value, msg=$("#nt-msg");
  if(!title||!start||!end){ msg.textContent="Add a name and both dates."; return; }
  if(end<start){ msg.textContent="The end date is before the start date."; return; }
  const n=Math.round((dateObj(end)-dateObj(start))/864e5)+1; if(n>90){ msg.textContent="Keep it to 90 days or fewer."; return; }
  let id=slug(title)+"-"+start.slice(0,4), k=2; while(allTrips()[id]) id=slug(title)+"-"+start.slice(0,4)+"-"+(k++);
  const COLS=["#7B3FA0","#D9480F","#C2185B","#1565C0","#5D4037","#B71C1C","#37474F","#0B5F73","#2E7D32"];
  const days=[]; for(let i=0;i<n;i++) days.push({date:addDays(start,i),title:"Day "+(i+1),color:COLS[i%COLS.length],steps:[]});
  const t={format:"trip-planner/1",id,title,start,end,travellers:f.who.value.split(",").map(s=>s.trim()).filter(Boolean),currency:"GBP",region:"",places:{},stays:[],transport:[],bookings:[],days,checklist:[],notes:[],links:[]};
  persistTrip(t); S.status[id]={}; openTrip(id,"explore"); toast("Trip created. Add your first places.");
}

/* ---------- extra event handling ---------- */
async function moreClicks(el){
  if(await cloudClick(el)) return true;
  if(await builderClick(el)) return true;
  if(await discoverClick(el)) return true;
  const t=trip();
  if(el.hasAttribute("data-copy-prompt")){ try{ await navigator.clipboard.writeText(PROMPT); toast("Prompt copied. Paste it into your AI assistant."); }catch(e){ toast("Copy isn't available here. Open the prompt and select it."); } return true; }
  if(el.hasAttribute("data-wx-refresh")){ if(t) ensureWx(t,true); return true; }
  if(el.hasAttribute("data-alerts")){ toggleAlerts(); return true; }
  if(el.hasAttribute("data-wx-night")){ S.wxNight=!S.wxNight; render(); return true; }
  if(el.dataset.wxDate){ S.wxDate=el.dataset.wxDate; render(); return true; }
  if(el.dataset.wxPick){ S.wxDate=el.dataset.wxPick; const it=TSWX.itinerary(t).find(x=>x.date===S.wxDate); if(it) S.wxPlace=it.key; render(); const h=document.querySelector(".hourly"); if(h) h.scrollIntoView({block:"start",behavior:"smooth"}); return true; }
  if(el.dataset.wxPlaceGo){ S.wxPlace=el.dataset.wxPlaceGo; S.wxDate=null; go("weather"); return true; }
  if(el.dataset.addPlace!==undefined){ addPlace(+el.dataset.addPlace); return true; }
  if(el.dataset.near){ nearby(el.dataset.near); return true; }
  if(el.dataset.removePlace){ removePlace(el.dataset.removePlace); return true; }
  if(el.dataset.removeTrip){ const id=el.dataset.removeTrip;
    if(S.confirm!=="trip:"+id){ S.confirm="trip:"+id; render(); return true; }
    delete S.localTrips[id]; try{ const a=JSON.parse(store.get("tp.local")||"{}"); delete a[id]; store.set("tp.local",JSON.stringify(a)); localStorage.removeItem("ts.wx."+id); }catch(e){}
    S.confirm=null; S.tripId=null; S.screen="home"; render(); writeSwState(); toast("Trip removed from this device"); return true; }
  if(el.hasAttribute("data-live-refresh")){ loadLive(t,true); return true; }
  if(el.hasAttribute("data-roads-all")){ S.roadsAll=!S.roadsAll; render(); return true; }
  if(el.hasAttribute("data-share-link")){ shareLink(); return true; }
  if(el.hasAttribute("data-scroll-plan")){ const p=$("#plan"); if(p) p.scrollIntoView({behavior:"smooth",block:"start"}); return true; }
  if(el.hasAttribute("data-incoming-yes")&&S.incoming&&S.incoming.text){ const txt=S.incoming.text; S.incoming=null; loadTripText(txt); return true; }
  if(el.hasAttribute("data-incoming-no")){ S.incoming=null; render(); return true; }
  if(el.hasAttribute("data-rename-cancel")){ S.renaming=false; render(); return true; }
  if(el.hasAttribute("data-rename")){ S.renaming=true; render(); const i=$("#name-in"); if(i) i.focus(); return true; }
  return false;
}
function onSubmit(f){
  if(cloudSubmit(f)) return;
  if(f.hasAttribute("data-name-form")){ const v=($("#name-in").value||"").trim(); setName(v); S.renaming=false; render(); if(v) toast("Hi "+v+"!"); return; }
  if(f.hasAttribute("data-new-trip")) return createTrip(f);
  if(f.hasAttribute("data-place-search")) return searchPlaces($("#place-q").value);
}
function onChange(el){
  if(cloudChange(el)) return true;
  if(builderInput(el)) return true;
  if(el.id==="wx-place"){ S.wxPlace=el.value; S.wxDate=null; render(); return true; }
  if(el.id==="drone-limit"){ S.droneLimit=+el.value; store.set("ts.drone",String(S.droneLimit)); render(); return true; }
  return false;
}

/* ---------- share a trip as a link (the trip travels in the link itself, never on a server) ---------- */
async function packTrip(obj){
  const bytes=new TextEncoder().encode(JSON.stringify(obj)); let data=bytes, z="0";
  if(window.CompressionStream){ try{ const st=new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")); data=new Uint8Array(await new Response(st).arrayBuffer()); z="1"; }catch(e){ data=bytes; z="0"; } }
  let bin=""; for(let i=0;i<data.length;i+=0x8000) bin+=String.fromCharCode.apply(null,data.subarray(i,i+0x8000));
  return z+btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function unpackTrip(str){
  const z=str[0]; let b=str.slice(1).replace(/-/g,"+").replace(/_/g,"/"); while(b.length%4) b+="=";
  const bin=atob(b), bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  if(z==="1"){ const st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")); return await new Response(st).text(); }
  return new TextDecoder().decode(bytes);
}
async function shareLink(){
  const t=trip(); if(!t) return;
  const url=location.origin+location.pathname+"#trip="+(await packTrip(withTicks(t)));
  const text=`${t.title} in Tripster. Open this link to add the trip to your app.`;
  const touch=matchMedia("(pointer:coarse)").matches;
  if(touch&&navigator.share){ try{ await navigator.share({title:t.title,text,url}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
  try{ await navigator.clipboard.writeText(url); toast("Trip link copied. Paste it into a message."); }
  catch(e){ toast("Couldn't copy the link here. Use Share trip file instead."); }
}
async function readIncoming(){
  const m=(location.hash||"").match(/^#trip=([A-Za-z0-9_-]+)/); if(!m) return;
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
  try{ const text=await unpackTrip(m[1]); const obj=JSON.parse(text); if(validate(obj)) throw 0; S.incoming={text,obj}; }
  catch(e){ S.incoming={error:true}; }
  S.screen="home"; render(); window.scrollTo({top:0});
}
function incomingCard(){
  const I=S.incoming; if(!I) return "";
  if(I.error) return `<div class="card alertbox" style="margin:4px 0 14px"><strong>That trip link didn't open.</strong> It may have been cut off when it was sent. Ask for the trip file instead. <button class="linkbtn" data-incoming-no>Dismiss</button></div>`;
  const o=I.obj, have=allTrips()[o.id];
  return `<div class="card alertbox ok" style="margin:4px 0 14px"><div class="eyebrow">Shared with you</div><h2 style="margin:4px 0">${esc(o.title)}</h2>
    <p class="small mono muted" style="margin:0 0 10px">${esc(fmtDay(o.start,true))} – ${esc(fmtDay(o.end,true))} · ${esc((o.travellers||[]).join(", "))}</p>
    <div class="row"><button class="btn primary" data-incoming-yes>${have?"Update my copy":"Add to Tripster"}</button><button class="btn" data-incoming-no>Not now</button></div></div>`;
}

/* ---------- live conditions: official warnings, Safe Travel, roads, northern lights ---------- */
// Sources that allow apps to read them directly: Safe Travel (Iceland), NOAA space weather.
// Official warnings (MeteoAlarm) and Icelandic road conditions need the small free relay (see README).
const MA_COUNTRIES=["austria","belgium","bosnia-herzegovina","bulgaria","croatia","cyprus","czechia","denmark","estonia","finland","france","germany","greece","hungary","iceland","ireland","israel","italy","latvia","lithuania","luxembourg","malta","moldova","montenegro","netherlands","north-macedonia","norway","poland","portugal","romania","serbia","slovakia","slovenia","spain","sweden","switzerland","ukraine","united-kingdom"];
const LIVE_TTL=15*60e3;
function relayURL(){ return ((S.cfg&&S.cfg.relay)||"").trim().replace(/\/+$/,""); }
function inIceland(t){ return /iceland|ísland/i.test(t.region||"") || Object.values(t.places||{}).some(p=>p&&!p.waypoint&&p.lat>63.2&&p.lat<66.7&&p.lon>-24.6&&p.lon<-13.4); }
function maCountry(t){ if(inIceland(t)) return "iceland"; const c=slug(t.region||"").replace(/^the-/,"").replace(/^uk$/,"united-kingdom").replace(/^czech-republic$/,"czechia"); return MA_COUNTRIES.includes(c)? c : null; }
function auroraZone(t){ return Object.values(t.places||{}).some(p=>p&&p.lat>=55); }
function liveOn(t){ return !!(maCountry(t)||inIceland(t)||auroraZone(t)); }
function stripHTML(h){ const d=document.createElement("div"); d.innerHTML=h||""; return (d.textContent||"").replace(/\s+\n/g,"\n").trim(); }
function inPoly(lat,lon,poly){ let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const [yi,xi]=poly[i],[yj,xj]=poly[j]; if(((yi>lat)!==(yj>lat)) && (lon < (xj-xi)*(lat-yi)/((yj-yi)||1e-9)+xi)) inside=!inside; } return inside; }
function tripPlaces(t){ return Object.values(t.places||{}).filter(p=>p&&!p.waypoint); }

async function getJSON(u){ const r=await fetch(u,{cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }
async function fetchSafeTravel(){
  const d=await getJSON("https://safetravel.is/wp-json/wp/v2/alert?per_page=20&_fields=id,date,modified,title,content,link,acf");
  return d.map(a=>({id:a.id,title:stripHTML(a.title&&a.title.rendered),text:stripHTML(a.content&&a.content.rendered),date:a.modified||a.date,level:(a.acf&&a.acf["alert-label"])||"",link:a.link}));
}
async function fetchKp(){
  const d=await getJSON("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json");
  return (Array.isArray(d)?d:[]).filter(x=>x&&x.time_tag).map(x=>({t:x.time_tag,kp:+x.kp,obs:x.observed}));
}
async function fetchWarnings(country){
  const d=await getJSON(relayURL()+"/?src=warnings&country="+encodeURIComponent(country)); const now=Date.now(), out=[];
  (d.warnings||[]).forEach(w=>{ const a=w.alert||{}; if(a.msgType==="Cancel") return;
    const info=(a.info||[]).find(i=>/^en/i.test(i.language||""))||(a.info||[])[0]; if(!info) return;
    if(info.expires && new Date(info.expires).getTime()<now) return;
    const lvl=((info.parameter||[]).find(p=>p.valueName==="awareness_level")||{}).value||"";
    const polys=[]; (info.area||[]).forEach(ar=>(ar.polygon||[]).forEach(pg=>polys.push(pg.trim().split(/\s+/).map(pt=>pt.split(",").map(Number)))));
    out.push({id:a.identifier,event:info.event||"Warning",headline:info.headline||"",text:info.description||"",severity:info.severity||"",color:(lvl.split(";")[1]||"").trim(),
      onset:info.onset||info.effective,expires:info.expires,areas:(info.area||[]).map(x=>x.areaDesc),polys,web:info.web||""}); });
  return out.sort((x,y)=>(x.onset||"").localeCompare(y.onset||""));
}
async function fetchRoads(){
  const d=await getJSON(relayURL()+"/?src=roads-is");
  return d.map(x=>({name:x.FulltNafnButs||x.StuttNafnButs,state:x.AstandYfirbord,desc:[x.AstandLysingEn,x.FrkvLysingEn,x.AsthungiLysingEn].filter(Boolean).join(" · "),at:x.DagsSkrad}));
}
async function loadLive(t, force){
  if(!t||!liveOn(t)) return; S.live=S.live||{}; S.liveBusy=S.liveBusy||{};
  const cur=S.live[t.id]||loadJSON("ts.live."+t.id)||{}; S.live[t.id]=cur;
  if(!navigator.onLine||S.liveBusy[t.id]) return;
  if(!force && cur.at && Date.now()-new Date(cur.at)<LIVE_TTL) return;
  S.liveBusy[t.id]=true; if(S.tab==="weather"||S.tab==="overview") render();
  const jobs=[], country=maCountry(t), relay=relayURL();
  const run=(key,fn)=>jobs.push(fn().then(items=>{ cur[key]={items,at:new Date().toISOString()}; }).catch(e=>{ cur[key]=Object.assign({},cur[key],{error:true}); }));
  if(inIceland(t)) run("safetravel",fetchSafeTravel);
  if(auroraZone(t)) run("kp",fetchKp);
  if(country&&relay) run("warnings",()=>fetchWarnings(country));
  if(inIceland(t)&&relay) run("roads",fetchRoads);
  await Promise.all(jobs); cur.at=new Date().toISOString();
  saveJSON("ts.live."+t.id,cur); S.liveBusy[t.id]=false;
  notifyLive(t,cur);
  if(S.tripId===t.id||S.screen==="home") render();
}
function warningsForTrip(t,L){
  const W=(L&&L.warnings&&L.warnings.items)||[]; const ps=tripPlaces(t);
  return W.map(w=>{ const hit=ps.filter(p=>w.polys.some(pg=>inPoly(p.lat,p.lon,pg))).map(p=>p.name);
    const during=!(w.expires&&w.expires.slice(0,10)<t.start)&&!(w.onset&&w.onset.slice(0,10)>t.end);
    return Object.assign({},w,{hit,during}); });
}
function roadTokens(t){
  const stop=new Set(["airport","centre","center","lagoon","beach","viewpoint","glacier","guesthouse","hotel","check","road","trip","diamond","cave","bridge","between","continents","home","ice","the","and","area"]);
  const set=new Set(); const add=s=>String(s||"").split(/[\s,()\/\-–]+/).forEach(w=>{ w=w.trim(); if(w.length>=5&&!stop.has(w.toLowerCase())&&!/\d/.test(w)) set.add(w.toLowerCase()); });
  tripPlaces(t).forEach(p=>{ add(p.name); add(p.area); }); (t.stays||[]).forEach(s=>add(s.address)); return [...set];
}
function roadsForTrip(t,L){
  const R=(L&&L.roads&&L.roads.items)||[]; const toks=roadTokens(t);
  const mine=R.filter(r=>{ if(r.state==="FAERT_FJALLABILUM"||r.state==="EKKI_I_THJONUSTU") return false; // highland and unserviced roads: not for normal cars in winter
    const words=(r.name||"").toLowerCase().split(/[^a-záðéíóúýþæö]+/i).filter(Boolean); return toks.some(k=>words.some(w=>w===k||w.startsWith(k))); });
  const rank=s=>s==="LOKAD"||/^OFAERT/.test(s)?0: s==="GREIDFAERT"?3: s==="OTHEKKT"||s==="EKKI_I_THJONUSTU"?2:1;
  mine.sort((a,b)=>rank(a.state)-rank(b.state)||a.name.localeCompare(b.name));
  const closedElsewhere=R.filter(r=>!mine.includes(r)&&rank(r.state)===0);
  return {mine,closedElsewhere,rank};
}
function auroraNights(t,L){
  const W=S.wx[t.id]; const kp=(L&&L.kp&&L.kp.items)||[]; const out=[];
  (t.days||[]).forEach(d=>{
    const stay=(t.stays||[]).find(s=>s.id===d.stay); const key=(stay&&stay.place)||[...d.steps].reverse().map(s=>s.place).find(k=>t.places[k]&&!t.places[k].waypoint);
    const p=key&&t.places[key]; if(!p||p.lat<55) return;
    const px=W&&W.places[key]; let cc=null;
    if(px&&px.h.cc&&px.h.cc.length){ const vals=[]; [21,22,23].forEach(h=>{ const i=TSWX.hourIndex(px,d.date,h+":00"); if(i>=0&&px.h.cc[i]!=null) vals.push(px.h.cc[i]); });
      const nx=addDays(d.date,1); [0,1,2].forEach(h=>{ const i=TSWX.hourIndex(px,nx,"0"+h+":00"); if(i>=0&&px.h.cc[i]!=null) vals.push(px.h.cc[i]); }); if(vals.length) cc=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length); }
    const from=new Date(d.date+"T18:00:00Z").getTime(), to=from+9*36e5;
    const ks=kp.filter(k=>{ const tt=new Date(k.t+"Z").getTime(); return tt>=from&&tt<to; }).map(k=>k.kp); const k=ks.length?Math.max(...ks):null;
    let verdict, cls;
    if(cc==null&&k==null){ verdict="Forecast not out yet"; cls="d1"; }
    else if(cc!=null&&cc>75){ verdict="Too cloudy, unlikely"; cls="d2"; }
    else if(k!=null&&k<2){ verdict=cc!=null&&cc<=40?"Clear skies but quiet aurora":"Quiet aurora"; cls="d1"; }
    else if(k!=null&&cc!=null&&cc<=35){ verdict=k>=4?"Excellent chance":"Good chance"; cls="d0"; }
    else if(k!=null){ verdict=cc==null?"Active aurora, cloud unknown":"Possible through gaps"; cls="d1"; }
    else { verdict=cc<=35?"Clear skies, activity not forecast yet":"Partly cloudy, activity not forecast yet"; cls=cc<=35?"d0":"d1"; }
    out.push({date:d.date,place:p.name,cc,kp:k,verdict,cls});
  });
  return out;
}
async function notifyLive(t,L){
  if(!S.alertsOn||!("Notification" in window)||Notification.permission!=="granted") return;
  const sent=new Set(loadJSON("ts.notified")||[]); const lines=[];
  warningsForTrip(t,L).filter(w=>w.hit.length&&w.during).forEach(w=>{ const id="ma|"+w.id; if(!sent.has(id)){ sent.add(id); lines.push(`${w.event} (${w.color||w.severity}): ${w.hit.slice(0,3).join(", ")}`); } });
  ((L.safetravel&&L.safetravel.items)||[]).forEach(a=>{ const id="st|"+a.id+"|"+a.date; if(!sent.has(id)&&Date.now()-new Date(a.date)<3*864e5){ sent.add(id); lines.push("Safe Travel: "+a.title); } });
  if(!lines.length) return; saveJSON("ts.notified",[...sent].slice(-400));
  const reg=await swReg(); const title="Tripster: alerts for "+t.title, body=lines.slice(0,4).join("\n");
  try{ if(reg&&reg.showNotification) await reg.showNotification(title,{body,tag:"live-"+t.id,icon:"icons/icon-192.png"}); else new Notification(title,{body}); }catch(e){}
}
function srcLink(label,url){ return `<a class="small" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ${ICON.ext}</a>`; }
function fmtDT(iso){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d)) return ""; return DOW[d.getDay()]+" "+d.getDate()+" "+MON[d.getMonth()]+", "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
const WCOL={yellow:"#E0A100",orange:"#E8710A",red:"#C62828"};
function liveSection(t){
  if(!liveOn(t)) return "";
  const L=(S.live&&S.live[t.id])||loadJSON("ts.live."+t.id)||{}; if(!S.live) S.live={}; S.live[t.id]=L;
  if(!L.at&&navigator.onLine&&!(S.liveBusy&&S.liveBusy[t.id])) setTimeout(()=>loadLive(t,true),0);
  const relay=relayURL(), country=maCountry(t), ice=inIceland(t), cards=[];
  if(country){
    let body;
    if(!relay) body=`<p class="small" style="margin:0">To show official warnings here, set up the free Tripster data relay (docs/data-relay.md in the Tripster project). Until then, tap the source below.</p>`;
    else if(!L.warnings) body=`<p class="small muted">Loading…</p>`;
    else { const ws=warningsForTrip(t,L); const show=ws.filter(w=>w.hit.length).concat(ws.filter(w=>!w.hit.length)); const before=todayISO()<t.start;
      body = !ws.length? `<p style="margin:0"><strong>No official warnings in force.</strong></p>` :
        `${before?`<p class="small muted" style="margin:0 0 6px">In force now, before your trip. Warnings during your trip show here as they're issued, usually 1 to 3 days ahead.</p>`:""}<ul class="alist">${show.slice(0,before?3:6).map(w=>`<li><span class="lvl" style="background:${WCOL[w.color]||"var(--todo-soft)"};color:${w.color==="yellow"?"#13212B":"#fff"}">${esc(w.color||w.severity||"Warning")}</span><span><strong>${esc(w.event.replace(/^Weather Warning:\s*/,""))}</strong>: ${esc(w.areas.join(", "))}<br><span class="small mono">${esc(fmtDT(w.onset))} to ${esc(fmtDT(w.expires))}</span>${w.hit.length?`<br><span class="small" style="${w.during?"color:var(--bad);font-weight:700":"color:var(--muted)"}">${w.during?"Covers":"Area includes"} ${esc(w.hit.slice(0,4).join(", "))}${w.hit.length>4?` and ${w.hit.length-4} more of your places`:""}</span>`:""}<details><summary class="small" style="cursor:pointer">Details</summary><p class="small" style="margin:4px 0 0">${esc(w.headline)}. ${esc(w.text)}</p></details></span></li>`).join("")}</ul>${show.length>(before?3:6)?`<p class="small muted">${show.length-(before?3:6)} more warnings in force.</p>`:""}`;
      body += L.warnings.error?`<p class="small" style="color:var(--bad)">Couldn't refresh; showing the last saved list.</p>`:""; }
    cards.push(`<div class="card"><div class="spread"><h3>Official weather warnings</h3>${L.warnings&&L.warnings.at?`<span class="small muted">${esc(ago(L.warnings.at))}</span>`:""}</div>${body}<div class="row" style="margin-top:8px">${srcLink(ice?"Source: Icelandic Met Office via MeteoAlarm":"Source: MeteoAlarm", ice?"https://en.vedur.is/alerts":"https://meteoalarm.org")}</div></div>`);
  }
  if(ice){
    const st=L.safetravel; const items=(st&&st.items)||[];
    cards.push(`<div class="card"><div class="spread"><h3>Safe Travel alerts</h3>${st&&st.at?`<span class="small muted">${esc(ago(st.at))}</span>`:""}</div>
      ${!st?`<p class="small muted">Loading…</p>`:!items.length?`<p style="margin:0"><strong>No active alerts.</strong></p>`:`<ul class="alist">${items.map(a=>`<li><span class="lvl ${a.level==="red"?"severe":""}">${a.level==="red"?"Alert":"Notice"}</span><span><strong>${esc(a.title)}</strong><br><span class="small">${esc(a.text.length>320?a.text.slice(0,320)+"…":a.text)}</span><br><span class="small muted">Updated ${esc(fmtDT(a.date))}</span></span></li>`).join("")}</ul>`}
      ${st&&st.error?`<p class="small" style="color:var(--bad)">Couldn't refresh; showing the last saved alerts.</p>`:""}
      <div class="row" style="margin-top:8px">${srcLink("Source: Safetravel.is (ICE-SAR)","https://safetravel.is")}</div></div>`);
    let rb;
    if(!relay) rb=`<p class="small" style="margin:0">To show road conditions here, set up the free Tripster data relay (docs/data-relay.md in the Tripster project). Until then, tap the source below for the live road map.</p>`;
    else if(!L.roads) rb=`<p class="small muted">Loading…</p>`;
    else { const {mine,closedElsewhere,rank}=roadsForTrip(t,L); const bad=mine.filter(r=>rank(r.state)<3);
      rb=`<p style="margin:0 0 6px"><strong>${!mine.length?"No road sections matched your places.":bad.length?`${bad.length} of ${mine.length} sections near your places need care`:`All ${mine.length} sections near your places are easily passable`}</strong></p>
        <ul class="wxrows">${mine.slice(0,S.roadsAll?999:8).map(r=>`<li style="grid-template-columns:auto minmax(0,1fr)"><span class="dpill d${rank(r.state)===0?2:rank(r.state)===3?0:1}">${esc(rank(r.state)===0?"Closed":rank(r.state)===3?"OK":"Care")}</span><span>${esc(r.name)}<small>${esc(r.desc)}</small></span></li>`).join("")}</ul>
        ${mine.length>8?`<button class="linkbtn small" data-roads-all>${S.roadsAll?"Show fewer":"Show all "+mine.length}</button>`:""}
        ${closedElsewhere.length?`<details style="margin-top:6px"><summary class="small" style="cursor:pointer;font-weight:700">${closedElsewhere.length} closed or impassable elsewhere in Iceland</summary><ul class="small" style="padding-left:18px">${closedElsewhere.map(r=>`<li>${esc(r.name)}: ${esc(r.desc)}</li>`).join("")}</ul></details>`:""}
        ${L.roads.error?`<p class="small" style="color:var(--bad)">Couldn't refresh; showing the last saved conditions.</p>`:""}`; }
    cards.push(`<div class="card"><div class="spread"><h3>Roads near your places</h3>${L.roads&&L.roads.at?`<span class="small muted">${esc(ago(L.roads.at))}</span>`:""}</div>${rb}<div class="row" style="margin-top:8px">${srcLink("Source: Icelandic Road Administration","https://umferdin.is/en")}</div></div>`);
  }
  if(auroraZone(t)){
    const nights=auroraNights(t,L);
    cards.push(`<div class="card"><div class="spread"><h3>Northern lights</h3>${L.kp&&L.kp.at?`<span class="small muted">${esc(ago(L.kp.at))}</span>`:""}</div>
      ${nights.length?`<ul class="wxrows">${nights.map(n=>`<li style="display:block"><div class="spread" style="align-items:center"><span><span class="mono small">${esc(fmtDay(n.date,true))}</span> · ${esc(n.place)}</span><span class="dpill ${n.cls}">${esc(n.verdict)}</span></div><small>${n.kp!=null?`Aurora activity Kp ${n.kp.toFixed(1)}`:"Activity forecast opens 3 days before"}${n.cc!=null?` · cloud ${n.cc}% at night`:" · cloud forecast opens 16 days before"}</small></li>`).join("")}</ul>`:`<p class="small muted">No nights far enough north.</p>`}
      <p class="small muted" style="margin-bottom:0">Best 22:00–02:00 away from town lights. Aurora activity is forecast 3 days ahead; cloud 16 days ahead.</p>
      <div class="row" style="margin-top:8px">${srcLink("Activity: NOAA Space Weather","https://www.swpc.noaa.gov/products/aurora-30-minute-forecast")}${ice?srcLink("Cloud map: Icelandic Met Office","https://en.vedur.is/weather/forecasts/aurora/"):""}</div></div>`);
  }
  return `<div class="section-head" style="margin-top:0"><h2>Live conditions</h2><span class="row small muted">${L.at?"Checked "+esc(ago(L.at)):""}<button class="btn" data-live-refresh ${S.liveBusy&&S.liveBusy[t.id]||!navigator.onLine?"disabled":""}>${S.liveBusy&&S.liveBusy[t.id]?"Checking…":"Check now"}</button></span></div>
    <div class="grid cols-2" style="margin-bottom:18px">${cards.join("")}</div>`;
}
function liveSummary(t){
  if(!liveOn(t)) return "";
  const L=(S.live&&S.live[t.id])||loadJSON("ts.live."+t.id); if(!L||!L.at) return "";
  const bits=[];
  if(L.warnings&&L.warnings.items){ const ws=warningsForTrip(t,L).filter(w=>w.hit.length&&w.during); bits.push(ws.length?`<strong style="color:var(--bad)">${ws.length} official warning${ws.length>1?"s":""}</strong> cover your places`:"No official warnings for your places"); }
  if(L.safetravel&&L.safetravel.items){ const n=L.safetravel.items.filter(a=>a.level==="red").length; bits.push(n?`<strong>${n} Safe Travel alert${n>1?"s":""}</strong>`:"No Safe Travel alerts"); }
  if(L.roads&&L.roads.items){ const r=roadsForTrip(t,L); const bad=r.mine.filter(x=>r.rank(x.state)<3).length; bits.push(bad?`<strong>${bad} road section${bad>1?"s":""}</strong> near you need care`:"Roads near you: easily passable"); }
  const tonight=auroraNights(t,L).find(n=>n.date===todayISO()); if(tonight) bits.push("Aurora tonight: "+esc(tonight.verdict.toLowerCase()));
  if(!bits.length) return "";
  return `<div class="card" style="margin-bottom:14px"><div class="spread"><h3>Live conditions</h3><button class="btn" data-go="weather">Details</button></div><p class="small" style="margin:6px 0 0">${bits.join(" · ")}</p></div>`;
}










/* ---------- discover: highlights, off-beat places, road trips, getting around ----------
   Sources (all free, readable straight from the browser):
   - Wikivoyage (traveller-written guide): curated destinations, "Get around", itineraries
   - Wikidata (structured facts behind Wikipedia): sights by type, photos, and how widely each is covered online
   Tripadvisor has no open feed, so it stays as a link on every place. */
const WV="https://en.wikivoyage.org/w/api.php", WD="https://query.wikidata.org/sparql", WDAPI="https://www.wikidata.org/w/api.php";
let COUNTRIES=null, ITINS=null;
async function countries(){ if(COUNTRIES) return COUNTRIES; try{ COUNTRIES=await (await fetch("data/countries.json")).json(); }catch(e){ COUNTRIES=[]; } return COUNTRIES; }
function countryByName(name){ const n=String(name||"").trim().toLowerCase(); return (COUNTRIES||[]).find(c=>c.name.toLowerCase()===n||c.wv.toLowerCase()===n)||null; }
async function wvGet(params){ const u=WV+"?"+new URLSearchParams(Object.assign({format:"json",formatversion:"2",origin:"*"},params)); const r=await fetch(u); if(!r.ok) throw new Error("Wikivoyage "+r.status); return r.json(); }
function discCache(k,v){ const key="ts.disc."+k; if(v===undefined){ const x=loadJSON(key); return x&&Date.now()-x.at<7*864e5? x.v : null; } saveJSON(key,{at:Date.now(),v}); return v; }

// Wikitext helpers
function wtClean(s){ return String(s||"").replace(/\[\[([^|\]#]*)#[^|\]]*\]\]/g,"$1").replace(/\{\{[^{}]*\}\}/g,"").replace(/\[\[(?:File|Image):[^\]]*\]\]/gi,"").replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g,"$2").replace(/\[https?:\/\/\S+ ([^\]]*)\]/g,"$1").replace(/'{2,}/g,"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim(); }
function wtParams(tpl){ // split {{name|a=b|...}} at top-level pipes, respecting [[links]] and {{nested}}
  const body=tpl.replace(/^\{\{/,"").replace(/\}\}$/,""); const parts=[]; let depth=0, cur="";
  for(let i=0;i<body.length;i++){ const two=body.substr(i,2);
    if(two==="[["||two==="{{"){ depth++; cur+=two; i++; continue; } if((two==="]]"||two==="}}")&&depth>0){ depth--; cur+=two; i++; continue; }
    if(body[i]==="|"&&depth===0){ parts.push(cur); cur=""; continue; } cur+=body[i]; }
  parts.push(cur); const out={}; parts.slice(1).forEach(p=>{ const k=p.indexOf("="); if(k>0) out[p.slice(0,k).trim().toLowerCase()]=p.slice(k+1).trim(); }); return out;
}
function wtParam(tpl,name){ return wtParams(tpl)[name]||""; }
function wtSections(wikitext){ // split into {title, level, body}
  const out=[]; const re=/^(={2,4})\s*([^=]+?)\s*\1\s*$/gm; let m, last=null;
  while((m=re.exec(wikitext))){ if(last) last.body=wikitext.slice(last.end,m.index); last={title:m[2].trim(),level:m[1].length,end:re.lastIndex}; out.push(last); }
  if(last) last.body=wikitext.slice(last.end); return out;
}
function wtDestinations(body){ // list items: {{marker|name=[[X]]|lat|long|wikidata}} — description, or * [[X]] — description
  const out=[];
  body.split("\n").filter(l=>/^\s*[*#]/.test(l)).forEach(line=>{
    let name="", lat=null, lon=null, qid="", rest=line;
    const mk=line.match(/\{\{\s*(marker|listing|see|do|city|go)\b[^}]*\}\}/i);
    if(mk){ const tpl=mk[0]; name=wtParam(tpl,"name"); const la=parseFloat(wtParam(tpl,"lat")), lo=parseFloat(wtParam(tpl,"long")); if(isFinite(la)&&isFinite(lo)){ lat=la; lon=lo; } qid=wtParam(tpl,"wikidata"); rest=line.slice(line.indexOf(tpl)+tpl.length); }
    if(!name){ const ln=line.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/); if(ln){ name=ln[2]||ln[1]; rest=line.slice(line.indexOf(ln[0])+ln[0].length); } }
    const link=(name.match(/\[\[([^|\]]+)/)||[])[1]||wtClean(name);
    name=wtClean(name); if(!name||name.length>60) return;
    const desc=wtClean(rest.replace(/^[\s:–—-]+/,"")).replace(/^[–—-]\s*/,"");
    out.push({name,link,lat,lon,qid,desc:desc.slice(0,220)});
  });
  return out;
}
async function countryGuide(c){
  const hit=discCache("guide."+c.q); if(hit) return hit;
  const d=await wvGet({action:"parse",page:c.wv,prop:"sections|wikitext",redirects:"1"});
  const wt=(d.parse&&d.parse.wikitext)||""; const secs=wtSections(wt);
  const pick=re=>secs.filter(s=>s.level===2&&re.test(s.title)).flatMap(s=>wtDestinations(s.body));
  const cities=pick(/^cities/i), others=pick(/^other destinations/i);
  const lead=wtClean((wt.split(/\n==/)[0]||"").replace(/\{\{[^{}]*\{\{[^{}]*\}\}[^{}]*\}\}/g,"")).split(/(?<=[.!?])\s+/).slice(0,3).join(" ");
  // coordinates for destinations that lack them
  const need=[...cities,...others].filter(x=>x.lat==null&&x.link).map(x=>x.link);
  if(need.length){ try{ const q=await wvGet({action:"query",prop:"coordinates",titles:need.slice(0,50).join("|"),redirects:"1"});
      const map={}; (q.query.pages||[]).forEach(p=>{ if(p.coordinates) map[p.title]=p.coordinates[0]; }); (q.query.redirects||[]).forEach(r=>{ if(map[r.to]) map[r.from]=map[r.to]; });
      [...cities,...others].forEach(x=>{ const co=map[x.link]; if(x.lat==null&&co){ x.lat=co.lat; x.lon=co.lon; } }); }catch(e){} }
  // "Get around" as clean HTML
  const sec=(d.parse.sections||[]).find(s=>/^get around$/i.test(s.line)); let getAround="";
  if(sec){ try{ const h=await wvGet({action:"parse",page:c.wv,section:sec.index,prop:"text",disableeditsection:"1",redirects:"1"}); getAround=safeHTML(h.parse.text); }catch(e){} }
  const g={lead,cities,others,getAround,page:c.wv};
  return (cities.length||others.length||getAround)? discCache("guide."+c.q,g) : g;
}
function safeHTML(html){ // keep headings, paragraphs and lists as plain text structure
  const doc=new DOMParser().parseFromString(html,"text/html");
  doc.querySelectorAll("style,script,table,.mw-editsection,.noprint,sup.reference,.mw-kartographer-maplink,.listing-metadata,.vcard .listing-coordinates,figure,.thumb,img").forEach(n=>n.remove());
  const out=document.createElement("div");
  const walk=(node,dest)=>{ node.childNodes.forEach(ch=>{
    if(ch.nodeType===3){ dest.appendChild(document.createTextNode(ch.textContent)); return; }
    if(ch.nodeType!==1) return; const tag=ch.tagName.toLowerCase();
    const keep={h2:"h4",h3:"h4",h4:"h5",h5:"h5",p:"p",ul:"ul",ol:"ol",li:"li",b:"strong",strong:"strong",i:"em",em:"em",dl:"div",dd:"p",dt:"strong"}[tag];
    if(keep){ const el=document.createElement(keep); walk(ch,el); if(el.textContent.trim()) dest.appendChild(el); } else walk(ch,dest);
  }); };
  walk(doc.body,out); return out.innerHTML;
}

// Wikidata sights. Each type is its own small query so big countries stay fast.
const SIGHT_TYPES=[["Q9259","World Heritage Site","heritage"],["Q34038","waterfall","nature"],["Q35666","glacier","nature"],["Q8072","volcano","nature"],["Q150784","canyon","nature"],["Q35509","cave","nature"],["Q177380","hot spring","nature"],["Q40080","beach","nature"],["Q46169","national park","nature"],["Q23413","castle","heritage"],["Q16560","palace","heritage"],["Q839954","archaeological site","heritage"],["Q6017969","viewpoint","nature"],["Q45776","fjord","nature"],["Q39715","lighthouse","heritage"],["Q23397","lake","nature"],["Q2977","cathedral","heritage"]];
async function sparql(q){ const r=await fetch(WD+"?format=json&query="+encodeURIComponent(q),{headers:{Accept:"application/sparql-results+json"}}); if(!r.ok) throw new Error("Wikidata "+r.status); return (await r.json()).results.bindings; }
async function countrySights(c){
  const hit=discCache("sights."+c.q); if(hit) return hit;
  const all={}; const queue=SIGHT_TYPES.slice();
  const one=async([qid,label,group])=>{
    const cls = qid==="Q9259"? `?item wdt:P1435 wd:Q9259` : `?item wdt:P31 wd:${qid}`;
    const q=`SELECT ?item ?links ?coord ?img WHERE { ${cls}; wdt:P17 wd:${c.q}; wdt:P625 ?coord; wikibase:sitelinks ?links. OPTIONAL{?item wdt:P18 ?img} } LIMIT 500`;
    try{ const rows=await Promise.race([sparql(q), new Promise((_,rej)=>setTimeout(()=>rej(new Error("slow")),25000))]);
      rows.forEach(b=>{ const id=b.item.value.split("/").pop(); const m=(b.coord.value.match(/Point\(([-\d.e]+) ([-\d.e]+)\)/)||[]);
        if(!m[1]) return; const prev=all[id];
        const row={id,links:+b.links.value,lat:+m[2],lon:+m[1],img:b.img?b.img.value:"",type:label,group,whs:qid==="Q9259"||(prev&&prev.whs)};
        if(!prev||qid!=="Q9259") all[id]=Object.assign({},prev||{},row,{whs:row.whs}); }); }catch(e){}
  };
  const workers=Array.from({length:4},async()=>{ while(queue.length) await one(queue.shift()); });
  await Promise.all(workers);
  const list=Object.values(all);
  const famous=list.filter(x=>x.links>=15||x.whs).sort((a,b)=>(b.whs-a.whs)||(b.links-a.links)).slice(0,30);
  const offbeat=list.filter(x=>x.img&&x.links>=2&&x.links<=12&&!x.whs).sort((a,b)=>b.links-a.links).slice(0,36);
  const ids=[...new Set([...famous,...offbeat].map(x=>x.id))];
  const names={};
  for(let i=0;i<ids.length;i+=60){ try{ const vals=ids.slice(i,i+60).map(x=>"wd:"+x).join(" ");
      const rows=await sparql(`SELECT ?item ?l ?d ?wiki WHERE { VALUES ?item { ${vals} } ?item rdfs:label ?l FILTER(lang(?l)="en") OPTIONAL{ ?item schema:description ?d FILTER(lang(?d)="en") } OPTIONAL{ ?wiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> } }`);
      rows.forEach(b=>{ const id=b.item.value.split("/").pop(); names[id]={name:b.l.value,desc:b.d?b.d.value:"",wiki:b.wiki?decodeURIComponent(b.wiki.value.split("/wiki/")[1]).replace(/_/g," "):""}; }); }catch(e){} }
  const fin=x=>Object.assign({},x,names[x.id]||{}); const ok=x=>x.name&&!/^Q\d+$/.test(x.name);
  const v={famous:famous.map(fin).filter(ok),offbeat:offbeat.map(fin).filter(ok)};
  return (v.famous.length||v.offbeat.length)? discCache("sights."+c.q,v) : v;
}
function thumb(img,w){ if(!img) return ""; return img.replace(/^http:/,"https:")+(img.includes("?")?"&":"?")+"width="+(w||320); }

// Road trips: every itinerary written by travellers on Wikivoyage, matched to countries through Wikidata,
// plus well-known scenic routes recorded on Wikidata. Built once on the device, then kept for 30 days.
const ROADTY=["Q34442","Q1406331","Q83620","Q269949"];
function itinKind(title,types){
  if(types.some(t=>ROADTY.includes(t))||/\b(road|route|highway|drive|driving|coast|loop|circle|ring|car|motorway|byway|parkway|scenic)\b/i.test(title)) return /\b(rail|train|railway|express)\b/i.test(title)?"rail":"road";
  if(/\b(rail|train|railway|express|metro)\b/i.test(title)) return "rail";
  if(/\b(trail|walk|walking|hike|hiking|path|camino|way of|pilgrim|trek)\b/i.test(title)) return "walk";
  if(/\b(cycl|bike|bicycle)/i.test(title)) return "cycle";
  if(/\b(boat|ferry|cruise|river|canal|sail)\b/i.test(title)) return "boat";
  return "other";
}
async function allItins(){
  const hit=loadJSON("ts.itins"); if(hit&&Date.now()-hit.at<30*864e5&&hit.v.length) return hit.v;
  let pages=[], cont={};
  for(let i=0;i<4;i++){ const d=await wvGet(Object.assign({action:"query",generator:"categorymembers",gcmtitle:"Category:Itineraries",gcmnamespace:"0",gcmlimit:"max",prop:"pageprops",ppprop:"wikibase_item"},cont));
    pages=pages.concat((d.query&&d.query.pages)||[]); if(!d.continue||!d.continue.gcmcontinue) break; cont={gcmcontinue:d.continue.gcmcontinue}; }
  const q2t={}; pages.forEach(p=>{ const q=p.pageprops&&p.pageprops.wikibase_item; if(q) q2t[q]=p.title; });
  const ids=Object.keys(q2t), info={};
  for(let i=0;i<ids.length;i+=150){ try{ const rows=await sparql(`SELECT ?item ?c ?d ?ty WHERE { VALUES ?item { ${ids.slice(i,i+150).map(x=>"wd:"+x).join(" ")} } OPTIONAL{ ?item wdt:P17 ?c } OPTIONAL{ ?item schema:description ?d FILTER(lang(?d)="en") } OPTIONAL{ ?item wdt:P31 ?ty } }`);
      rows.forEach(b=>{ const id=b.item.value.split("/").pop(); const o=info[id]||(info[id]={c:new Set(),ty:new Set(),d:""}); if(b.c) o.c.add(b.c.value.split("/").pop()); if(b.ty) o.ty.add(b.ty.value.split("/").pop()); if(b.d) o.d=b.d.value; }); }catch(e){} }
  const v=ids.filter(id=>info[id]&&info[id].c.size).map(id=>({t:q2t[id],id,c:[...info[id].c],k:itinKind(q2t[id],[...info[id].ty]),d:info[id].d}));
  if(v.length) saveJSON("ts.itins",{at:Date.now(),v}); return v;
}
async function roadTrips(c){
  const hit=discCache("trips."+c.q); if(hit) return hit;
  const q=`SELECT DISTINCT ?item ?l ?d ?links ?wp ?wv WHERE {
    { ?item wdt:P31/wdt:P279? wd:Q1406331 } UNION { VALUES ?ty { wd:Q34442 wd:Q83620 wd:Q269949 } ?item wdt:P31 ?ty. ?wvx schema:about ?item; schema:isPartOf <https://en.wikivoyage.org/> }
    ?item wdt:P17 wd:${c.q}; wikibase:sitelinks ?links; rdfs:label ?l FILTER(lang(?l)="en")
    OPTIONAL{ ?item schema:description ?d FILTER(lang(?d)="en") }
    OPTIONAL{ ?wp schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL{ ?wv schema:about ?item; schema:isPartOf <https://en.wikivoyage.org/> } } ORDER BY DESC(?links) LIMIT 30`;
  const [it,sc]=await Promise.allSettled([allItins(), sparql(q)]);
  const mine=(it.value||[]).filter(x=>x.c.includes(c.q)); const have=new Set(mine.map(x=>x.id));
  const name=u=>u?decodeURIComponent(u.split("/wiki/")[1]).replace(/_/g," "):"";
  const seen=new Set(); const extra=[];
  (sc.value||[]).forEach(b=>{ const id=b.item.value.split("/").pop(); if(have.has(id)||seen.has(id)) return; seen.add(id);
    extra.push({id,t:name(b.wv&&b.wv.value)||b.l.value,d:b.d?b.d.value:"",links:+b.links.value,wp:name(b.wp&&b.wp.value),wv:name(b.wv&&b.wv.value),k:"road"}); });
  // routes with a Wikivoyage page are proper road trips; the rest are well-known scenic routes
  const road=mine.filter(x=>x.k==="road").concat(extra.filter(x=>x.wv));
  const scenic=extra.filter(x=>!x.wv&&x.wp&&x.links>=2);
  const v={road,other:mine.filter(x=>x.k!=="road"),scenic};
  return (it.status==="fulfilled"&&sc.status==="fulfilled")? discCache("trips."+c.q,v) : v;
}
async function scenicDetail(x){
  const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(x.wp.replace(/ /g,"_"))); const j=await r.json();
  return {title:x.t,lead:j.extract||x.d,stops:[],sections:[],wiki:x.wp,scenic:true};
}
async function itineraryDetail(title){
  const hit=discCache("itin."+title); if(hit) return hit;
  const d=await wvGet({action:"parse",page:title,prop:"wikitext",redirects:"1"}); const wt=(d.parse&&d.parse.wikitext)||"";
  const secs=wtSections(wt); const stops=[]; const seen=new Set();
  const re=/\{\{\s*(marker|listing|see|do|eat|sleep|go|city|drink|buy)\b([^{}]|\{\{[^{}]*\}\})*\}\}/gi; let m;
  while((m=re.exec(wt))){ const tpl=m[0]; const la=parseFloat(wtParam(tpl,"lat")), lo=parseFloat(wtParam(tpl,"long")); const name=wtClean(wtParam(tpl,"name"));
    const type=m[1].toLowerCase(); if(!isFinite(la)||!isFinite(lo)||!name||seen.has(name)) continue; if(["eat","sleep","drink","buy"].includes(type)) continue; seen.add(name);
    stops.push({name:name.slice(0,60),lat:la,lon:lo,type}); }
  const lead=wtClean(wt.split(/\n==/)[0]).split(/(?<=[.!?])\s+/).slice(0,4).join(" ");
  const pick=re2=>{ const s=secs.find(x=>re2.test(x.title)); return s? wtClean(s.body).split(/(?<=[.!?])\s+/).slice(0,4).join(" ") : ""; };
  const v={title,lead,understand:pick(/^understand/i),prepare:pick(/^prepare/i),getin:pick(/^get in/i),stops:stops.slice(0,40),sections:secs.filter(s=>s.level===2).map(s=>s.title)};
  return discCache("itin."+title,v);
}

/* ---------- builder screen ---------- */
function bState(){ if(!S.b){ S.b=loadJSON("ts.builder")||{style:"famous",road:false,picks:{},country:"",title:"",start:"",end:"",who:""}; } return S.b; }
function bSave(){ saveJSON("ts.builder",S.b); }
async function bLoad(c){
  const B=bState(); if(!c) return; S.bData=S.bData||{}; if(S.bData.q===c.q&&!S.bData.error) return;
  S.bData={q:c.q,busy:true}; render();
  const [g,s,r]=await Promise.allSettled([countryGuide(c),countrySights(c),roadTrips(c)]);
  S.bData={q:c.q,guide:g.value,sights:s.value,trips:r.value,error:(g.status==="rejected"&&s.status==="rejected")?"Couldn't reach the travel guides. Check your connection.":null};
  render();
}
function suggestionList(B,data){
  const g=data.guide||{}, s=data.sights||{famous:[],offbeat:[]};
  if(B.style==="famous"){
    const dest=[...(g.cities||[]).map(x=>Object.assign({kind:"City"},x)),...(g.others||[]).map(x=>Object.assign({kind:"Highlight"},x))].filter(x=>x.lat!=null);
    const sights=s.famous.map(x=>({name:x.name,desc:x.desc||x.type,lat:x.lat,lon:x.lon,img:x.img,kind:x.whs?"World Heritage":x.type,qid:x.id,wiki:x.wiki}));
    return [...dest,...sights].filter((x,i,a)=>a.findIndex(y=>y.name.toLowerCase()===x.name.toLowerCase())===i);
  }
  return s.offbeat.map(x=>({name:x.name,desc:x.desc||x.type,lat:x.lat,lon:x.lon,img:x.img,kind:x.type,qid:x.id,wiki:x.wiki}));
}
function pickKey(x){ return slug(x.name)+"@"+(+x.lat).toFixed(2); }
function viewBuilder(){
  const B=bState(); const c=countryByName(B.country); const D=S.bData&&c&&S.bData.q===c.q? S.bData : null;
  if(c&&!D) setTimeout(()=>bLoad(c),0);
  const picks=Object.values(B.picks||{});
  const list=D&&!D.busy? suggestionList(B,D) : [];
  const trips=D&&D.trips||{road:[],other:[]};
  const it=S.bItin;
  return `<div class="builder">
   <div class="card"><h2 style="margin-bottom:10px">1. Where and when</h2>
    <form class="form" data-builder-form onsubmit="return false">
      <div><label for="b-country">Country</label><input id="b-country" list="b-countries" value="${esc(B.country)}" placeholder="Start typing, e.g. Iceland" autocomplete="off"><datalist id="b-countries">${(COUNTRIES||[]).map(x=>`<option value="${esc(x.name)}">`).join("")}</datalist></div>
      <div><label for="b-title">Trip name</label><input id="b-title" value="${esc(B.title)}" placeholder="${esc(c?c.name+" trip":"e.g. Japan in spring")}"></div>
      <div class="two"><div><label for="b-start">Start</label><input id="b-start" type="date" value="${esc(B.start)}"></div><div><label for="b-end">End</label><input id="b-end" type="date" value="${esc(B.end)}"></div></div>
      <div><label for="b-who">Who's going</label><input id="b-who" value="${esc(B.who)}" placeholder="Names, separated by commas"></div>
    </form>
    ${B.country&&!c?`<p class="small" style="color:var(--bad)">Pick a country from the list so Tripster can find places.</p>`:""}
   </div>
   ${c?`<div class="card" style="margin-top:14px"><h2 style="margin-bottom:10px">2. What kind of trip?</h2>
    <div class="choice" role="radiogroup" aria-label="Trip style">
      <button role="radio" aria-checked="${B.style==="famous"}" data-b-style="famous"><strong>Well-known highlights</strong><span>The places most visitors come for: famous towns, World Heritage sites and the best-known sights.</span></button>
      <button role="radio" aria-checked="${B.style==="offbeat"}" data-b-style="offbeat"><strong>Off the beaten path</strong><span>Beautiful spots with far fewer visitors: lesser-known waterfalls, lakes, canyons, caves, beaches and old sites.</span></button>
    </div>
    <label class="switch"><input type="checkbox" id="b-road" ${B.road?"checked":""}><span><strong>Make it a road trip</strong><br><span class="small muted">See famous road trips in ${esc(c.name)} and build the trip along one.</span></span></label>
   </div>`:""}
   ${c&&D&&D.busy?`<div class="empty" style="margin-top:14px">Finding places in ${esc(c.name)}… this takes a few seconds the first time.</div>`:""}
   ${c&&D&&D.error?`<div class="empty" style="margin-top:14px">${esc(D.error)} <button class="linkbtn" data-b-retry>Try again</button></div>`:""}
   ${c&&D&&!D.busy&&!D.error?`
   ${B.road?`<div class="section-head"><h2>3. Famous road trips in ${esc(c.name)}</h2><span class="small muted">Written by travellers on Wikivoyage</span></div>
     ${trips.road.length?`<div class="grid cols-2">${trips.road.map(x=>itinCard(x,B)).join("")}</div>`:`<div class="card"><p style="margin:0">No traveller-written road trips for ${esc(c.name)} yet.${(trips.scenic||[]).length?" See the well-known scenic routes below.":""} Pick highlights and Tripster strings them into a route in driving order.</p></div>`}
     ${(trips.scenic||[]).length?`<div class="section-head"><h3>Other well-known scenic routes</h3></div><div class="grid cols-2">${trips.scenic.slice(0,8).map(scenicCard).join("")}</div>`:""}
     ${trips.other.length?`<details class="card" style="margin-top:10px"><summary>${trips.other.length} more itineraries (train, walking, cycling, boat)</summary><div class="grid cols-2" style="margin-top:10px">${trips.other.map(x=>itinCard(x,B)).join("")}</div></details>`:""}
     ${it?itinDetail(it,B):""}`:""}
   <div class="section-head"><h2>${B.road?"4":"3"}. ${B.style==="famous"?"Well-known highlights":"Off the beaten path"} in ${esc(c.name)}</h2><span class="small muted">${picks.length} picked</span></div>
   ${list.length?`<div class="sugs">${list.map(x=>sugCard(x,B)).join("")}</div>`:`<div class="empty">${B.style==="offbeat"?"Not many lesser-known spots are recorded for this country yet. Try Well-known highlights.":"No places found."}</div>`}
   <div class="section-head"><h2>Getting around ${esc(c.name)}</h2></div>
   <div class="card guide">${D.guide&&D.guide.getAround? D.guide.getAround : `<p class="muted">No travel guide found.</p>`}
     <p class="small muted" style="margin-top:12px">From the Wikivoyage guide to ${esc(c.name)} (travellers' guide, CC BY-SA). ${srcLink("Read the full guide","https://en.wikivoyage.org/wiki/"+encodeURIComponent(D.guide&&D.guide.page||c.wv))}</p></div>
   `:""}
   <div class="buildbar"><span class="small"><strong>${picks.length+(B.itinPick?(B.itinPick.stops||[]).length:0)}</strong> places${B.itinPick?` · along ${esc(B.itinPick.title)}`:""}</span><button class="btn primary" data-b-create ${c&&B.start&&B.end?"":"disabled"}>Create trip</button></div>
  </div>`;
}
function sugCard(x,B){ const k=pickKey(x), on=!!(B.picks&&B.picks[k]);
  return `<div class="sug ${on?"on":""}">${x.img?`<img loading="lazy" alt="" src="${esc(thumb(x.img,360))}" onerror="this.style.visibility='hidden'">`:`<div class="noimg"></div>`}
   <div class="sug-b"><span class="eyebrow">${esc(x.kind||"")}</span><strong>${esc(x.name)}</strong>${x.desc&&x.desc.toLowerCase()!==(x.kind||"").toLowerCase()?`<span class="small muted">${esc(x.desc)}</span>`:""}
   <div class="row" style="margin-top:6px"><button class="btn ${on?"primary":""}" data-b-pick="${esc(k)}" data-b-name="${esc(x.name)}" data-b-lat="${x.lat}" data-b-lon="${x.lon}">${on?"Added ✓":"Add"}</button>${x.wiki?srcLink("About","https://en.wikipedia.org/wiki/"+encodeURIComponent(x.wiki)):x.link?srcLink("Guide","https://en.wikivoyage.org/wiki/"+encodeURIComponent(x.link)):""}</div></div></div>`; }
const KIND={road:"Road trip",rail:"By train",walk:"Walking",cycle:"Cycling",boat:"By boat",other:"Itinerary"};
function itinCard(x,B){ const on=B.itinPick&&B.itinPick.title===x.t;
  return `<div class="card ${on?"alertbox ok":""}"><div class="spread"><h3>${esc(x.t)}</h3><span class="pill s-optional">${esc(KIND[x.k]||"Itinerary")}</span></div>
   <p class="small" style="margin:6px 0">${esc(x.d?x.d.charAt(0).toUpperCase()+x.d.slice(1):"Traveller-written route guide.")}</p><div class="row"><button class="btn ${on?"primary":""}" data-b-itin="${esc(x.t)}">${on?"Chosen ✓":"See route"}</button>${srcLink("Wikivoyage","https://en.wikivoyage.org/wiki/"+encodeURIComponent(x.t))}</div></div>`; }
function scenicCard(x){ return `<div class="card"><div class="spread"><h3>${esc(x.t)}</h3><span class="pill s-optional">Scenic route</span></div><p class="small" style="margin:6px 0">${esc(x.d?x.d.charAt(0).toUpperCase()+x.d.slice(1):"")}</p><div class="row"><button class="btn" data-b-scenic="${esc(x.id)}">Read about it</button>${srcLink("Wikipedia","https://en.wikipedia.org/wiki/"+encodeURIComponent(x.wp))}</div></div>`; }
function itinDetail(it,B){
  if(it.busy) return `<div class="card" style="margin-top:12px">Loading ${esc(it.title)}…</div>`;
  if(it.error) return `<div class="card" style="margin-top:12px">${esc(it.error)}</div>`;
  const on=B.itinPick&&B.itinPick.title===it.title;
  return `<div class="card" style="margin-top:12px" id="itin-detail"><div class="spread"><h3>${esc(it.title)}</h3><button class="btn" data-b-itin-close>Close</button></div>
   ${miniRoute(it.stops)}
   ${it.lead?`<p>${esc(it.lead)}</p>`:""}${it.understand&&it.understand.slice(0,40)!==(it.lead||"").slice(0,40)?`<p class="small"><strong>Understand.</strong> ${esc(it.understand)}</p>`:""}${it.prepare?`<p class="small"><strong>Prepare.</strong> ${esc(it.prepare)}</p>`:""}
   ${it.stops.length?`<p class="small" style="margin-bottom:4px"><strong>${it.stops.length} stops along the way</strong></p><ol class="small" style="margin-top:0;padding-left:20px;columns:2 220px">${it.stops.map(s=>`<li>${esc(s.name)}</li>`).join("")}</ol>`:`<p class="small muted">${it.scenic?"There's no traveller route guide for this one yet. Add the highlights you want along it and Tripster orders them into a drive.":"This guide has no mapped stops. You can still pick highlights to go with it."}</p>`}
   <div class="row">${it.stops.length?`<button class="btn primary" data-b-itin-use>${on?"Using this route ✓":"Use this road trip"}</button>`:""}${it.scenic?srcLink("Read on Wikipedia","https://en.wikipedia.org/wiki/"+encodeURIComponent(it.wiki)):srcLink("Read the full route guide","https://en.wikivoyage.org/wiki/"+encodeURIComponent(it.title))}</div></div>`;
}
function miniRoute(stops){
  if(!stops||stops.length<2) return "";
  const lats=stops.map(s=>s.lat), lons=stops.map(s=>s.lon); const x0=Math.min(...lons),x1=Math.max(...lons),y0=Math.min(...lats),y1=Math.max(...lats);
  const W=600,H=260,pad=24;
  const sx=(W-2*pad)/Math.max((x1-x0)*Math.PI/180,1e-6), sy=(H-2*pad)/Math.max(merc(y1)-merc(y0),1e-6), s=Math.min(sx,sy);
  const ox=(W-2*pad-(x1-x0)*Math.PI/180*s)/2, oy=(H-2*pad-(merc(y1)-merc(y0))*s)/2;
  const P=st=>[pad+ox+((st.lon-x0)*Math.PI/180)*s, H-pad-oy-(merc(st.lat)-merc(y0))*s];
  const pts=stops.map(P);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:var(--map-water);border-radius:10px;margin:8px 0" aria-label="Route sketch"><polyline points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-dasharray="6 5"/>${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===0||i===pts.length-1?7:4.5}" fill="${i===0?"#2F7D4F":i===pts.length-1?"#B42318":"var(--accent)"}" stroke="#fff" stroke-width="1.5"/>`).join("")}</svg>`;
}
function orderByNearest(pts){ if(pts.length<3) return pts; const rest=pts.slice(1), out=[pts[0]]; while(rest.length){ const a=out[out.length-1]; let bi=0,bd=1e18; rest.forEach((p,i)=>{ const d=(p.lat-a.lat)**2+((p.lon-a.lon)*Math.cos(a.lat*Math.PI/180))**2; if(d<bd){bd=d;bi=i;} }); out.push(rest.splice(bi,1)[0]); } return out; }
function createFromBuilder(){
  const B=bState(); const c=countryByName(B.country); if(!c||!B.start||!B.end){ toast("Add a country and both dates."); return; }
  if(B.end<B.start){ toast("The end date is before the start date."); return; }
  const n=Math.round((dateObj(B.end)-dateObj(B.start))/864e5)+1; if(n>90){ toast("Keep it to 90 days or fewer."); return; }
  const title=(B.title||"").trim()||c.name+" trip";
  let id=slug(title)+"-"+B.start.slice(0,4), k2=2; while(allTrips()[id]) id=slug(title)+"-"+B.start.slice(0,4)+"-"+(k2++);
  const places={}; const keyFor=name=>{ let base=slug(name).replace(/-/g,"").toUpperCase().slice(0,12)||"PLACE", key=base, i=2; while(places[key]) key=base+(i++); return key; };
  const route=(B.itinPick&&B.itinPick.stops||[]).map(s=>({name:s.name,lat:s.lat,lon:s.lon,route:true}));
  let picks=Object.values(B.picks||{});
  // with a road trip, slot each picked place next to the nearest point on the route
  let seq;
  if(route.length){ seq=route.slice(); picks.forEach(p=>{ let bi=0,bd=1e18; seq.forEach((r,i)=>{ const d=(r.lat-p.lat)**2+((r.lon-p.lon)*Math.cos(r.lat*Math.PI/180))**2; if(d<bd){bd=d;bi=i;} }); seq.splice(bi+1,0,p); }); }
  else seq=orderByNearest(picks);
  seq=seq.map(p=>Object.assign({},p,{key:keyFor(p.name)})); seq.forEach(p=>{ places[p.key]={name:p.name,lat:+p.lat,lon:+p.lon,area:c.name,added:true}; });
  const COLS=["#7B3FA0","#D9480F","#C2185B","#1565C0","#5D4037","#B71C1C","#37474F","#0B5F73","#2E7D32"];
  const per=Math.max(1,Math.ceil(seq.length/n)); const days=[];
  for(let i=0;i<n;i++){ const chunk=seq.slice(i*per,(i+1)*per); days.push({date:addDays(B.start,i),title:chunk.length?chunk.map(p=>p.name).slice(0,2).join(" and ")+(chunk.length>2?" and more":""):"Free day",color:COLS[i%COLS.length],route:chunk.length>1?chunk.map(p=>p.key):undefined,steps:chunk.map(p=>({time:"",title:p.name,place:p.key}))}); }
  const D=S.bData||{}; const notes=[]; if(D.guide&&D.guide.lead) notes.push({title:"About "+c.name,body:D.guide.lead});
  const t={format:"trip-planner/1",id,title,start:B.start,end:B.end,travellers:(B.who||"").split(",").map(s=>s.trim()).filter(Boolean),currency:"GBP",region:c.name,
    tagline:B.itinPick?`Road trip along ${B.itinPick.title}.`:B.style==="offbeat"?`Off the beaten path in ${c.name}.`:`The highlights of ${c.name}.`,
    places,stays:[],transport:B.road?[{id:"car",kind:"car",title:"Hire car",at:B.start,until:B.end,status:"todo"}]:[],bookings:[],days,checklist:[],notes,links:[{title:"Wikivoyage: "+c.name,url:"https://en.wikivoyage.org/wiki/"+encodeURIComponent(c.wv)}],
    guide:D.guide&&D.guide.getAround?{title:"Getting around "+c.name,html:D.guide.getAround,source:"https://en.wikivoyage.org/wiki/"+encodeURIComponent(c.wv)}:undefined};
  persistTrip(t); S.status[id]={}; S.b=null; try{ localStorage.removeItem("ts.builder"); }catch(e){} S.bItin=null;
  openTrip(id,"overview"); toast("Trip created with "+seq.length+" places"); ensureWx(t,true);
}
async function builderClick(el){
  const B=bState();
  if(el.dataset.bStyle){ B.style=el.dataset.bStyle; bSave(); render(); return true; }
  if(el.dataset.bPick){ B.picks=B.picks||{}; const k=el.dataset.bPick; if(B.picks[k]) delete B.picks[k]; else B.picks[k]={name:el.dataset.bName,lat:+el.dataset.bLat,lon:+el.dataset.bLon}; bSave(); const y=window.scrollY; render(); window.scrollTo(0,y); return true; }
  if(el.dataset.bItin){ const title=el.dataset.bItin; S.bItin={title,busy:true}; render(); try{ S.bItin=await itineraryDetail(title); }catch(e){ S.bItin={title,error:"Couldn't load this route. Check your connection."}; } render(); const d=$("#itin-detail"); if(d) d.scrollIntoView({behavior:"smooth",block:"start"}); return true; }
  if(el.dataset.bScenic){ const D=S.bData; const x=D&&D.trips&&(D.trips.scenic||[]).find(y=>y.id===el.dataset.bScenic); if(!x) return true; S.bItin={title:x.t,busy:true}; render(); try{ S.bItin=await scenicDetail(x); }catch(e){ S.bItin={title:x.t,error:"Couldn't load this route. Check your connection."}; } render(); const d=$("#itin-detail"); if(d) d.scrollIntoView({behavior:"smooth",block:"start"}); return true; }
  if(el.hasAttribute("data-b-itin-close")){ S.bItin=null; render(); return true; }
  if(el.hasAttribute("data-b-itin-use")&&S.bItin&&S.bItin.stops){ B.itinPick= B.itinPick&&B.itinPick.title===S.bItin.title? null : {title:S.bItin.title,stops:S.bItin.stops}; bSave(); render(); return true; }
  if(el.hasAttribute("data-b-retry")){ S.bData=null; render(); return true; }
  if(el.hasAttribute("data-b-create")){ createFromBuilder(); return true; }
  if(el.hasAttribute("data-open-builder")){ await countries(); S.screen="builder"; render(); window.scrollTo({top:0}); return true; }
  return false;
}
function builderInput(el){
  if(el.id==="b-road"){ const B0=bState(); B0.road=el.checked; if(!el.checked){ B0.itinPick=null; S.bItin=null; } bSave(); render(); return true; }
  const B=bState(); const map={"b-country":"country","b-title":"title","b-start":"start","b-end":"end","b-who":"who"}; const f=map[el.id]; if(!f) return false;
  B[f]=el.value; if(f==="country"){ B.picks={}; B.itinPick=null; S.bItin=null; } bSave();
  if(f==="country"||f==="start"||f==="end"){ const c=countryByName(B.country); if(f!=="country"||c||!el.value) render(); }
  return true;
}

/* ---------- discover inside an existing trip (Explore tab) ---------- */
function exploreDiscover(t){
  const c=countryByName(t.region||""); if(!c) return COUNTRIES? `<div class="card" style="margin-top:14px"><h3>Discover more</h3><p class="small" style="margin:0">Set the trip's country to get highlights, lesser-known places and road trips: add a place in that country above, or plan with the trip builder.</p></div>` : "";
  const D=S.bData&&S.bData.q===c.q? S.bData : null; const mode=S.discMode||"famous";
  if(!D){ return `<div class="card" style="margin-top:14px"><div class="spread"><div><h3>Discover ${esc(c.name)}</h3><p class="small" style="margin:0">Well-known highlights, off-the-beaten-path places, famous road trips and how to get around.</p></div><button class="btn primary" data-disc-load ${navigator.onLine?"":"disabled"}>Show ideas</button></div></div>`; }
  if(D.busy) return `<div class="empty" style="margin-top:14px">Finding places in ${esc(c.name)}…</div>`;
  const list=mode==="road"? [] : suggestionList({style:mode},D).filter(x=>!Object.values(t.places).some(p=>p.name.toLowerCase()===x.name.toLowerCase()));
  return `<div class="section-head"><h2>Discover ${esc(c.name)}</h2><div class="seg" role="group">${[["famous","Highlights"],["offbeat","Off-beat"],["road","Road trips"]].map(([k,l])=>`<button data-disc-mode="${k}" aria-pressed="${mode===k}">${l}</button>`).join("")}</div></div>
   ${mode==="road"? ((D.trips&&(D.trips.road.length||(D.trips.scenic||[]).length))? `<div class="grid cols-2">${D.trips.road.map(x=>`<div class="card"><div class="spread"><h3>${esc(x.t)}</h3><span class="pill s-optional">Road trip</span></div><p class="small">${esc(x.d)}</p>${srcLink("Read the route on Wikivoyage","https://en.wikivoyage.org/wiki/"+encodeURIComponent(x.t))}</div>`).join("")}${(D.trips.scenic||[]).slice(0,8).map(x=>`<div class="card"><div class="spread"><h3>${esc(x.t)}</h3><span class="pill s-optional">Scenic route</span></div><p class="small">${esc(x.d)}</p>${srcLink("Read on Wikipedia","https://en.wikipedia.org/wiki/"+encodeURIComponent(x.wp))}</div>`).join("")}</div>` : `<div class="empty">No well-known road trips recorded for ${esc(c.name)} yet.</div>`)
     : `<div class="sugs">${list.slice(0,24).map(x=>`<div class="sug">${x.img?`<img loading="lazy" alt="" src="${esc(thumb(x.img,360))}" onerror="this.style.visibility='hidden'">`:`<div class="noimg"></div>`}<div class="sug-b"><span class="eyebrow">${esc(x.kind||"")}</span><strong>${esc(x.name)}</strong>${x.desc&&x.desc.toLowerCase()!==(x.kind||"").toLowerCase()?`<span class="small muted">${esc(x.desc)}</span>`:""}<div class="row" style="margin-top:6px"><button class="btn" data-disc-add data-b-name="${esc(x.name)}" data-b-lat="${x.lat}" data-b-lon="${x.lon}">Add to trip</button></div></div></div>`).join("")}</div>`}
   ${D.guide&&D.guide.getAround&&!t.guide?`<details class="card guide" style="margin-top:12px"><summary>Getting around ${esc(c.name)}</summary>${D.guide.getAround}<p class="small muted">From Wikivoyage (CC BY-SA). <button class="linkbtn" data-disc-save-guide>Save to this trip for offline</button></p></details>`:""}`;
}
async function discoverClick(el){
  const t=trip(); if(!t) return false;
  if(el.hasAttribute("data-disc-load")){ await countries(); const c=countryByName(t.region); if(c) bLoad(c); return true; }
  if(el.dataset.discMode){ S.discMode=el.dataset.discMode; render(); return true; }
  if(el.hasAttribute("data-disc-add")){ let base=slug(el.dataset.bName).replace(/-/g,"").toUpperCase().slice(0,12)||"PLACE", key=base, i=2; while(t.places[key]) key=base+(i++);
    t.places[key]={name:el.dataset.bName,lat:+el.dataset.bLat,lon:+el.dataset.bLon,area:t.region,added:true}; persistTrip(t); toast("Added "+el.dataset.bName); const y=window.scrollY; render(); window.scrollTo(0,y); ensureWx(t,true); return true; }
  if(el.hasAttribute("data-disc-save-guide")){ const c=countryByName(t.region); const D=S.bData; if(c&&D&&D.guide){ t.guide={title:"Getting around "+c.name,html:D.guide.getAround,source:"https://en.wikivoyage.org/wiki/"+encodeURIComponent(c.wv)}; persistTrip(t); render(); toast("Saved to the trip"); } return true; }
  return false;
}
function guideBlock(t){
  if(!t.guide||!t.guide.html) return "";
  return `<div class="section-head"><h2>${esc(t.guide.title||"Getting around")}</h2></div><details class="card guide"><summary>Read the guide (saved for offline)</summary>${safeHTML(t.guide.html)}<p class="small muted">From Wikivoyage (CC BY-SA). ${t.guide.source?srcLink("Full guide",t.guide.source):""}</p></details>`;
}


/* ---------- people, shared trips (Firebase) and expenses ----------
   Shared trips live in Firebase (free plan): one document per trip with its plan and member emails,
   plus sub-collections for booking ticks, expenses and a change log. Firebase keeps a copy on the
   device, so everything still works offline and syncs when the phone is back online.
   Without Firebase settings in config.json the app works exactly as before, on this device only. */
const FB_V="10.14.1";
const CLOUD={ready:false,loading:false,auth:null,db:null,fs:null,am:null,user:null,err:"",subs:{},tripSub:null,tripSubId:null};
S.shared={}; S.statusMeta={}; S.exp={}; S.activity={}; S.expEdit=null; S.peopleEdit=false; S.authMsg=""; S.authBusy=false;

function fbConfig(){ const f=S.cfg&&S.cfg.firebase; return f&&f.apiKey&&f.projectId? f : null; }
function myEmail(){ return CLOUD.user&&CLOUD.user.email? CLOUD.user.email.toLowerCase() : ""; }
function verified(){ return !!(CLOUD.user&&CLOUD.user.emailVerified); }
function isShared(t){ return !!(t&&S.shared[t.id]); }
function nowISO(){ return new Date().toISOString(); }
function cleanForCloud(o){ return JSON.parse(JSON.stringify(o)); }

async function initCloud(){
  const c=fbConfig(); if(!c||CLOUD.ready||CLOUD.loading) return; CLOUD.loading=true;
  try{
    const base=`https://www.gstatic.com/firebasejs/${FB_V}/`;
    const [appM,authM,fsM]=await Promise.all([import(base+"firebase-app.js"),import(base+"firebase-auth.js"),import(base+"firebase-firestore.js")]);
    const app=appM.initializeApp({apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,appId:c.appId});
    const auth=authM.getAuth(app);
    let db; try{ db=fsM.initializeFirestore(app,{localCache:fsM.persistentLocalCache({tabManager:fsM.persistentMultipleTabManager()})}); }catch(e){ db=fsM.getFirestore(app); }
    if(c.emulator){ authM.connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true}); fsM.connectFirestoreEmulator(db,"127.0.0.1",8080); }
    Object.assign(CLOUD,{ready:true,auth,db,fs:fsM,am:authM});
    authM.onAuthStateChanged(auth,u=>{ CLOUD.user=u;
      // one name everywhere: the account's name wins; an account without one takes the name typed on this device
      if(u&&u.displayName&&u.displayName!==S.userName){ S.userName=u.displayName; store.set("ts.name",u.displayName); }
      else if(u&&!u.displayName&&S.userName) authM.updateProfile(u,{displayName:S.userName}).catch(()=>{});
      if(u) S.authOpen=false; watchTrips(); render(); });
  }catch(e){ CLOUD.err="Couldn't load sign-in. Check your connection and reopen the app."; }
  CLOUD.loading=false; render();
}

/* --- trips shared with me --- */
function unsubAll(){ Object.values(CLOUD.subs).forEach(u=>{ try{u();}catch(e){} }); CLOUD.subs={}; if(CLOUD.tripSub){ CLOUD.tripSub(); CLOUD.tripSub=null; CLOUD.tripSubId=null; } }
function watchTrips(){
  unsubAll(); S.shared={};
  if(!CLOUD.ready||!verified()) return;
  const {fs,db}=CLOUD;
  CLOUD.subs.trips=fs.onSnapshot(fs.query(fs.collection(db,"trips"),fs.where("members","array-contains",myEmail())), snap=>{
    const seen=new Set();
    snap.docs.forEach(d=>{ const x=d.data(); seen.add(d.id); S.shared[d.id]={owner:x.owner,members:x.members||[],updatedBy:x.updatedBy,updatedAt:x.updatedAt};
      if(x.trip&&!validate(x.trip)){ keepLocal(x.trip); setSource(d.id,"shared"); }
      if(!CLOUD.subs["st:"+d.id]) watchStatus(d.id); });
    Object.keys(S.shared).forEach(id=>{ if(!seen.has(id)){ delete S.shared[id]; if(CLOUD.subs["st:"+id]){ CLOUD.subs["st:"+id](); delete CLOUD.subs["st:"+id]; } setSource(id,"upload"); } });
    S.loaded=true; pickDefault(); render(); writeSwState();
  }, e=>{ CLOUD.err="Couldn't load shared trips: "+(e.code||e.message); render(); });
}
function watchStatus(id){
  const {fs,db}=CLOUD;
  CLOUD.subs["st:"+id]=fs.onSnapshot(fs.collection(db,"trips",id,"status"), snap=>{
    const cur=Object.assign({},S.status[id]); const meta={};
    snap.docs.forEach(d=>{ const x=d.data(); cur[d.id]=x.val; meta[d.id]={by:x.by,at:x.at}; });
    S.status[id]=cur; S.statusMeta[id]=meta; store.set("tp.status."+id,JSON.stringify(cur));
    if(S.tripId===id||S.screen==="home") render();
  }, ()=>{ // refused, usually because the trip was shared a moment ago and the server hasn't caught up: retry
    if(CLOUD.subs["st:"+id]){ try{ CLOUD.subs["st:"+id](); }catch(e){} delete CLOUD.subs["st:"+id]; }
    setTimeout(()=>{ if(S.shared[id]&&!CLOUD.subs["st:"+id]) watchStatus(id); },2500);
  });
}
// expenses and the change log of the trip that's open
function ensureTripSub(t){
  if(!t||!isShared(t)||!CLOUD.ready){ return; }
  if(CLOUD.tripSubId===t.id) return;
  if(CLOUD.tripSub) CLOUD.tripSub();
  const {fs,db}=CLOUD; const id=t.id;
  const retry=()=>{ if(CLOUD.tripSubId!==id) return; if(CLOUD.tripSub) CLOUD.tripSub(); CLOUD.tripSub=null; CLOUD.tripSubId=null; setTimeout(()=>{ const t2=trip(); if(t2&&t2.id===id) ensureTripSub(t2); },2500); };
  const u1=fs.onSnapshot(fs.collection(db,"trips",id,"expenses"), snap=>{ S.exp[id]=snap.docs.map(d=>Object.assign({id:d.id},d.data())); saveJSON("ts.exp."+id,S.exp[id]); if(S.tripId===id) render(); }, retry);
  const u2=fs.onSnapshot(fs.query(fs.collection(db,"trips",id,"activity"),fs.orderBy("at","desc"),fs.limit(30)), snap=>{ S.activity[id]=snap.docs.map(d=>d.data()); if(S.tripId===id&&S.tab==="overview") render(); }, retry);
  CLOUD.tripSub=()=>{ u1(); u2(); }; CLOUD.tripSubId=id;
}
function logActivity(t,text){
  if(!isShared(t)) return; const {fs,db}=CLOUD;
  fs.addDoc(fs.collection(db,"trips",t.id,"activity"),{by:myEmail(),at:nowISO(),text}).catch(()=>{});
}
function cloudSaveTrip(t,note){
  if(!isShared(t)||!CLOUD.ready) return; const {fs,db}=CLOUD; const sh=S.shared[t.id];
  const upd={trip:cleanForCloud(t),updatedBy:myEmail(),updatedAt:nowISO()};
  if(sh&&sh.owner===myEmail()) upd.members=membersOf(t);
  fs.updateDoc(fs.doc(db,"trips",t.id),upd).catch(e=>toast(e.code==="permission-denied"?"Only people on this trip can change it.":"Couldn't sync that change yet. It will retry when you're online."));
  if(note) logActivity(t,note);
}
function cloudSetStatus(t,kind,item,val){
  const {fs,db}=CLOUD; const key=kind+":"+item.id;
  fs.setDoc(fs.doc(db,"trips",t.id,"status",key),{val,by:myEmail(),at:nowISO()}).catch(()=>toast("Couldn't sync that tick yet."));
  logActivity(t,`marked ${item.title||item.name||item.id} as ${STATUS[val]||val}`);
}

/* --- people --- */
function tripPeople(t){
  if(Array.isArray(t.people)&&t.people.length) return t.people.map(p=>({name:String(p.name||"").trim()||String(p.email||"").split("@")[0],email:String(p.email||"").trim().toLowerCase()}));
  return (t.travellers||[]).map(n=>({name:n,email:""}));
}
function pKey(p){ return p.email? p.email : "n:"+slug(p.name); }
function membersOf(t){ const m=new Set(tripPeople(t).map(p=>p.email).filter(e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))); const me=myEmail(); if(me) m.add(me); return [...m].slice(0,30); }
function personByKey(t,k){ const ps=tripPeople(t); return ps.find(p=>pKey(p)===k)||ps.find(p=>p.email&&p.email===k)||ps.find(p=>"n:"+slug(p.name)===k)||null; }
function nameOf(t,k){ if(!k) return "Someone"; const p=personByKey(t,k); if(p) return p.name; return k.startsWith("n:")? k.slice(2) : k.split("@")[0]; }
function meKey(t){ const me=myEmail(); const ps=tripPeople(t);
  if(me){ const p=ps.find(x=>x.email===me); if(p) return pKey(p); }
  const pick=store.get("ts.me."+t.id); if(pick&&ps.some(p=>pKey(p)===pick)) return pick;
  const byName=S.userName&&ps.find(p=>p.name.toLowerCase()===S.userName.toLowerCase()); return byName? pKey(byName) : null; }
function statusMetaLine(kind,b){ const t=trip(); const m=t&&S.statusMeta[t.id]&&S.statusMeta[t.id][kind+":"+b.id]; return m? `<span class="small muted">by ${esc(nameOf(t,m.by))} · ${esc(ago(m.at))}</span>` : ""; }

function authForm(){
  const up=S.authMode==="up";
  return `<form class="authform" data-auth-form>
    <div class="seg" role="tablist"><button type="button" data-auth-tab="in" aria-pressed="${!up}">Sign in</button><button type="button" data-auth-tab="up" aria-pressed="${up}">Create account</button></div>
    ${up?`<input id="au-name" placeholder="Your name" autocomplete="given-name" value="${esc(S.userName||"")}" aria-label="Your name" required>`:""}
    <input id="au-email" type="email" placeholder="Email" autocomplete="email" aria-label="Email" required>
    <input id="au-pass" type="password" placeholder="Password${up?" (6+ characters)":""}" autocomplete="${up?"new-password":"current-password"}" minlength="6" aria-label="Password" required>
    <div class="row"><button class="btn primary" ${S.authBusy?"disabled":""}>${up?"Create account":"Sign in"}</button>${up?"":`<button type="button" class="linkbtn small" data-auth-reset>Forgot password?</button>`}</div>
    ${S.authMsg?`<p class="small" role="status" style="margin:0;color:var(--bad)">${esc(S.authMsg)}</p>`:""}</form>`;
}
// The slim bar at the top of the home page: who you are, sign in or out, change name
function accountBar(){
  const u=CLOUD.user, name=S.userName;
  const nameBit = S.renaming
    ? `<form class="row" data-name-form style="flex:1"><input id="name-in" class="field" style="flex:1;min-width:120px;padding:6px 10px" placeholder="Your name" value="${esc(name||"")}" autocomplete="given-name"><button class="btn primary">Save</button><button type="button" class="btn" data-rename-cancel>Cancel</button></form>`
    : `<span class="acct-who"><span class="avatar sm">${esc((name||(u&&u.email)||"?").slice(0,1).toUpperCase())}</span><span><strong>${esc(name||"Guest")}</strong>${u?`<span class="small muted"> · ${esc(u.email)}</span>`:""}</span><button class="linkbtn small" data-rename>${name?"Change name":"Add your name"}</button></span>`;
  let right="";
  if(!fbConfig()) right="";
  else if(!CLOUD.ready) right=CLOUD.err?`<span class="small" style="color:var(--bad)">${esc(CLOUD.err)}</span>`:`<span class="small muted">…</span>`;
  else if(u&&u.emailVerified) right=`<button class="btn sm" data-auth-out>Sign out</button>`;
  else if(u) right=`<span class="small">Confirm the email we sent you, then</span><button class="btn sm primary" data-auth-check>I've confirmed</button><button class="btn sm" data-auth-resend>Resend</button><button class="btn sm" data-auth-out>Sign out</button>`;
  else right=`<span class="small muted acct-hint">Sign in to share trips with your group</span><button class="btn sm primary" data-acct-open aria-expanded="${!!S.authOpen}">${S.authOpen?"Close":"Sign in"}</button>`;
  return `<div class="acctbar"><div class="acct-row">${nameBit}<span class="acct-right">${right}</span></div>
    ${u&&!u.emailVerified&&S.authMsg?`<p class="small" style="margin:6px 0 0">${esc(S.authMsg)}</p>`:""}
    ${!u&&S.authOpen&&CLOUD.ready?authForm():""}</div>`;
}
function setName(v){
  v=String(v||"").trim().slice(0,40); S.userName=v; store.set("ts.name",v);
  if(CLOUD.ready&&CLOUD.user&&v) CLOUD.am.updateProfile(CLOUD.user,{displayName:v}).catch(()=>{});
}
function authError(e){ const c=(e&&e.code)||""; return ({"auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"No account with that email. Tap Create account.","auth/email-already-in-use":"That email already has an account. Tap Sign in.","auth/weak-password":"Use at least 6 characters for the password.","auth/invalid-email":"That email address doesn't look right.","auth/too-many-requests":"Too many tries. Wait a few minutes.","auth/network-request-failed":"No connection. Try again when you're online."})[c]||("Couldn't sign in ("+c+").");}
async function doAuth(mode){
  const email=($("#au-email")||{}).value, pass=($("#au-pass")||{}).value; const {am,auth}=CLOUD;
  if(!email||!pass){ S.authMsg="Enter your email and a password."; render(); return; }
  S.authBusy=true; S.authMsg=""; render();
  try{
    if(mode==="up"){ const nm=(($("#au-name")||{}).value||"").trim(); if(!nm){ S.authMsg="Add your name."; S.authBusy=false; render(); return; }
      const cred=await am.createUserWithEmailAndPassword(auth,email.trim(),pass); await am.updateProfile(cred.user,{displayName:nm}); setName(nm); CLOUD.user=auth.currentUser;
      await am.sendEmailVerification(cred.user); S.authMsg="We sent a confirmation link to "+email.trim()+". Open it, then tap I've confirmed."; }
    else await am.signInWithEmailAndPassword(auth,email.trim(),pass);
  }catch(e){ S.authMsg=authError(e); }
  S.authBusy=false; render();
}
async function authClick(el){
  const {am,auth}=CLOUD;
  if(el.dataset.authTab){ S.authMode=el.dataset.authTab; S.authMsg=""; render(); return true; }
  if(el.hasAttribute("data-acct-open")){ S.authOpen=!S.authOpen; S.authMsg=""; render(); if(S.authOpen){ const i=$("#au-email"); if(i) i.focus(); } return true; }
  if(el.hasAttribute("data-auth-out")){ await am.signOut(auth); S.shared={}; S.authMsg=""; render(); toast("Signed out"); return true; }
  if(el.hasAttribute("data-auth-resend")){ try{ await am.sendEmailVerification(auth.currentUser); S.authMsg="Sent. Check your inbox and spam folder."; }catch(e){ S.authMsg=authError(e); } render(); return true; }
  if(el.hasAttribute("data-auth-check")){ try{ await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); CLOUD.user=auth.currentUser; if(CLOUD.user.emailVerified){ S.authMsg=""; watchTrips(); toast("Email confirmed"); } else S.authMsg="Not confirmed yet. Open the link in the email first."; }catch(e){ S.authMsg=authError(e); } render(); return true; }
  if(el.hasAttribute("data-auth-reset")){ const email=($("#au-email")||{}).value; if(!email){ S.authMsg="Type your email first, then tap Forgot password."; render(); return true; } try{ await am.sendPasswordResetEmail(auth,email.trim()); S.authMsg="Password reset email sent."; }catch(e){ S.authMsg=authError(e); } render(); return true; }
  return false;
}

function peopleCard(t){
  const ps=tripPeople(t), sh=S.shared[t.id], me=myEmail();
  if(S.peopleEdit){
    return `<div class="card" id="people-card"><h3>People on this trip</h3><p class="small" style="margin:0 0 8px">Add an email for everyone who should see and change this trip. People without an email can still be part of expenses.</p>
      <form data-people-form class="form">${ps.concat([{name:"",email:""}]).map((p,i)=>`<div class="two prow"><input name="pn${i}" placeholder="Name" value="${esc(p.name)}" aria-label="Name ${i+1}"><input name="pe${i}" type="email" placeholder="Email (optional)" value="${esc(p.email)}" aria-label="Email ${i+1}"></div>`).join("")}
      <input type="hidden" name="count" value="${ps.length+1}"><div class="row"><button class="btn primary">Save people</button><button type="button" class="btn" data-people-add>Add another</button><button type="button" class="btn" data-people-cancel>Cancel</button></div></form></div>`;
  }
  let share;
  if(sh) share=`<p class="small" style="margin:8px 0 0"><span class="pill s-booked">Shared</span> Everyone listed with an email sees this trip, its ticks and expenses live once they sign in to Tripster with that email. Owner: ${esc(nameOf(t,sh.owner))}.${sh.owner!==me?" Only the owner can add or remove people.":""}</p>`;
  else if(!fbConfig()) share=`<p class="small muted" style="margin:8px 0 0">Saved on this device only. Shared trips need the free Firebase setup (docs/shared-trips.md).</p>`;
  else if(!verified()) share= CLOUD.user? `<p class="small" style="margin:8px 0 0">Confirm your email first (see the bar at the top of the home page), then share from here.</p>` : `<p class="small" style="margin:8px 0">Sign in to share this trip so everyone sees the same bookings and expenses.</p>${CLOUD.ready?authForm():""}`;
  else share=`<p class="small" style="margin:8px 0">This trip is only on this device. Share it with the people above so you all see the same bookings, ticks and expenses.</p><button class="btn primary" data-share-group ${ps.some(p=>p.email)?"":"disabled"}>Share with the group</button>${ps.some(p=>p.email)?"":`<span class="small muted"> Add at least one email first.</span>`}`;
  return `<div class="card" id="people-card"><div class="spread"><h3>People</h3><button class="btn" data-people-edit ${sh&&sh.owner!==me?"disabled":""}>Edit</button></div>
    ${ps.length?`<ul class="plist">${ps.map(p=>`<li><span class="avatar">${esc((p.name||"?").slice(0,1).toUpperCase())}</span><span><strong>${esc(p.name)}</strong>${p.email===me&&me?` <span class="small muted">(you)</span>`:""}<br><span class="small muted">${p.email?esc(p.email):"No email"}</span></span>${sh&&p.email&&sh.members.includes(p.email)?`<span class="pill s-booked" style="margin-left:auto">Has access</span>`:""}</li>`).join("")}</ul>`:`<p class="small muted">No one added yet.</p>`}
    ${share}</div>`;
}
function savePeople(f){
  const t=trip(); const n=+f.count.value; const out=[];
  for(let i=0;i<n;i++){ const name=(f["pn"+i].value||"").trim(), email=(f["pe"+i].value||"").trim().toLowerCase();
    if(!name&&!email) continue; if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast("Check the email for "+(name||"row "+(i+1))); return; } out.push({name:name||email.split("@")[0],email}); }
  t.people=out; t.travellers=out.map(p=>p.name); S.peopleEdit=false; persistTrip(t,"updated the people on the trip"); render(); toast("Saved");
}
async function shareGroup(){
  const t=trip(); if(!t||!verified()) return; const {fs,db}=CLOUD; const me=myEmail();
  const ps=tripPeople(t); if(!ps.some(p=>p.email===me)){ ps.push({name:S.userName||me.split("@")[0],email:me}); t.people=ps; t.travellers=ps.map(p=>p.name); keepLocal(t); }
  try{
    await fs.setDoc(fs.doc(db,"trips",t.id),{owner:me,members:membersOf(t),trip:cleanForCloud(t),updatedBy:me,updatedAt:nowISO()});
    S.shared[t.id]={owner:me,members:membersOf(t)}; setSource(t.id,"shared");
    const st=S.status[t.id]||{}; const b=fs.writeBatch(db);
    Object.entries(st).filter(([k])=>!k.startsWith("check:")).forEach(([k,v])=>b.set(fs.doc(db,"trips",t.id,"status",k),{val:v,by:me,at:nowISO()}));
    (loadJSON("ts.exp."+t.id)||[]).forEach(x=>{ const c=Object.assign({},x); delete c.id; c.by=me; b.set(fs.doc(db,"trips",t.id,"expenses",x.id),c); });
    await b.commit(); logActivity(t,"shared the trip"); watchStatus(t.id); ensureTripSub(t); render(); toast("Shared. Send everyone the app link.");
  }catch(e){ toast(e.code==="permission-denied"?"A shared trip with this id already exists and isn't yours. Rename the trip and try again.":"Couldn't share right now: "+(e.code||e.message)); }
}
function activityCard(t){
  const A=S.activity[t.id]; if(!isShared(t)) return "";
  return `<div class="card"><h3>Recent changes</h3>${A&&A.length?`<ul class="alog">${A.slice(0,8).map(a=>`<li><strong>${esc(nameOf(t,a.by))}</strong> ${esc(a.text)} <span class="small muted">· ${esc(ago(a.at))}</span></li>`).join("")}</ul>`:`<p class="small muted" style="margin:0">Nothing yet. Ticks and expenses show here with who made them.</p>`}</div>`;
}

/* --- expenses --- */
function expenses(t){ return isShared(t)? (S.exp[t.id]||loadJSON("ts.exp."+t.id)||[]) : (S.exp[t.id]||(S.exp[t.id]=loadJSON("ts.exp."+t.id)||[])); }
function fmtMoney(minor,cur){ return money(minor/100,cur||"GBP"); }
function shares(amount,keys){ const n=keys.length; if(!n) return {}; const base=Math.floor(amount/n); let r=amount-base*n; const o={}; keys.forEach(k=>{ o[k]=base+(r>0?1:0); if(r>0) r--; }); return o; }
function canonKey(t,k){ const p=personByKey(t,k); return p? pKey(p) : k; }
function balances(t){
  const ps=tripPeople(t); const B={}; ps.forEach(p=>B[pKey(p)]={paid:0,share:0});
  let spent=0;
  expenses(t).forEach(x=>{ const payer=canonKey(t,x.paidBy); const keys=(x.split||[]).map(k=>canonKey(t,k)); if(!keys.length) return;
    (B[payer]=B[payer]||{paid:0,share:0}).paid+=x.amount;
    Object.entries(shares(x.amount,keys)).forEach(([k,v])=>{ (B[k]=B[k]||{paid:0,share:0}).share+=v; });
    if(x.kind!=="payment") spent+=x.amount; });
  Object.values(B).forEach(b=>b.bal=b.paid-b.share);
  return {B,spent};
}
function settlements(B){
  const cr=[],db=[]; Object.entries(B).forEach(([k,b])=>{ if(b.bal>0) cr.push([k,b.bal]); else if(b.bal<0) db.push([k,-b.bal]); });
  cr.sort((a,b)=>b[1]-a[1]); db.sort((a,b)=>b[1]-a[1]); const out=[]; let i=0,j=0;
  while(i<db.length&&j<cr.length){ const amt=Math.min(db[i][1],cr[j][1]); if(amt>0) out.push({from:db[i][0],to:cr[j][0],amount:amt}); db[i][1]-=amt; cr[j][1]-=amt; if(db[i][1]===0) i++; if(cr[j][1]===0) j++; }
  return out;
}
function viewMoney(t){
  const ps=tripPeople(t), cur=t.currency||"GBP", me=meKey(t);
  if(!ps.length) return `<div class="empty"><h3 style="margin-bottom:6px">Add the people on this trip first</h3><p>Expenses are split between people. Add names (and emails to share).</p><button class="btn primary" data-go="overview">Add people</button></div>`;
  const {B,spent}=balances(t); const st=settlements(B); const list=expenses(t).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.at||"").localeCompare(a.at||""));
  const E=S.expEdit&&list.find(x=>x.id===S.expEdit); const sym=(0).toLocaleString("en-GB",{style:"currency",currency:cur}).replace(/[\d.,\s]/g,"");
  const myB=me&&B[me];
  const defSplit=E? E.split.map(k=>canonKey(t,k)) : ps.map(pKey);
  return `
  ${!me?`<div class="card" style="margin-bottom:12px"><label class="small" for="me-pick"><strong>Which one is you?</strong> So Tripster can show what you owe.</label><select id="me-pick" class="field" style="margin-top:6px"><option value="">Choose…</option>${ps.map(p=>`<option value="${esc(pKey(p))}">${esc(p.name)}</option>`).join("")}</select></div>`:""}
  <div class="stats moneystats">
    <div class="card stat"><span class="small muted">Trip spend</span><b class="mono">${fmtMoney(spent,cur)}</b><span class="small muted">${list.filter(x=>x.kind!=="payment").length} expenses</span></div>
    ${myB?`<div class="card stat"><span class="small muted">Your share</span><b class="mono">${fmtMoney(myB.share,cur)}</b><span class="small muted">you paid ${fmtMoney(myB.paid,cur)}</span></div>
    <div class="card stat"><span class="small muted">${myB.bal>0?"You are owed":myB.bal<0?"You owe":"You're"}</span><b class="mono" style="color:${myB.bal>0?"var(--ok)":myB.bal<0?"var(--bad)":"inherit"}">${myB.bal===0?"Settled up":fmtMoney(Math.abs(myB.bal),cur)}</b><span class="small muted">overall</span></div>`:""}
  </div>
  <div class="grid cols-2" style="margin-top:14px">
    <div class="card"><h3>Settle up</h3>${st.length?`<ul class="settle">${st.map(s=>`<li><span><strong>${esc(nameOf(t,s.from))}</strong> pays <strong>${esc(nameOf(t,s.to))}</strong></span><span class="mono">${fmtMoney(s.amount,cur)}</span><button class="btn" data-settle="${esc(s.from)}|${esc(s.to)}|${s.amount}">Mark paid</button></li>`).join("")}</ul>`:`<p class="small muted" style="margin:0">Everyone is square.</p>`}</div>
    <div class="card"><h3>Balances</h3><table class="baltable"><thead><tr><th>Person</th><th>Paid</th><th>Share</th><th>Balance</th></tr></thead><tbody>${Object.entries(B).map(([k,b])=>`<tr><td>${esc(nameOf(t,k))}${k===me?` <span class="small muted">(you)</span>`:""}</td><td class="mono">${fmtMoney(b.paid,cur)}</td><td class="mono">${fmtMoney(b.share,cur)}</td><td class="mono" style="color:${b.bal>0?"var(--ok)":b.bal<0?"var(--bad)":"inherit"}">${b.bal>0?"+":b.bal<0?"−":""}${fmtMoney(Math.abs(b.bal),cur)}</td></tr>`).join("")}</tbody></table></div>
  </div>
  <div class="section-head"><h2>${E?"Edit expense":"Add an expense"}</h2></div>
  <form class="card form" data-exp-form>
    <div class="two"><div><label for="exp-desc">What for</label><input id="exp-desc" required maxlength="80" placeholder="e.g. Dinner in Vík" value="${esc(E?E.desc:"")}"></div>
      <div><label for="exp-amt">Amount (${esc(cur)})</label><div class="amt"><span>${esc(sym)}</span><input id="exp-amt" inputmode="decimal" required placeholder="0.00" value="${E?(E.amount/100).toFixed(2):""}"></div></div></div>
    <div class="two"><div><label for="exp-paid">Paid by</label><select id="exp-paid" class="field">${ps.map(p=>`<option value="${esc(pKey(p))}" ${(E?canonKey(t,E.paidBy):me)===pKey(p)?"selected":""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div><label for="exp-date">Date</label><input id="exp-date" type="date" value="${esc(E?E.date:(todayISO()>=t.start&&todayISO()<=t.end?todayISO():t.start))}"></div></div>
    <div><label>Split equally between</label><div class="chips" role="group" aria-label="Split between">${ps.map(p=>`<label class="chip"><input type="checkbox" name="exp-split" value="${esc(pKey(p))}" ${defSplit.includes(pKey(p))?"checked":""}><span>${esc(p.name)}</span></label>`).join("")}<button type="button" class="linkbtn small" data-split-all>All</button></div>
      <p class="small muted" id="exp-each" style="margin:6px 0 0"></p></div>
    <div class="row"><button class="btn primary">${E?"Save changes":"Add expense"}</button>${E?`<button type="button" class="btn" data-exp-cancel>Cancel</button>`:""}</div>
  </form>
  <div class="section-head"><h2>Expenses</h2>${list.length?`<button class="btn" data-exp-csv>Download as spreadsheet (CSV)</button>`:""}</div>
  ${list.length?`<ul class="explist">${list.map(x=>{ const keys=(x.split||[]).map(k=>canonKey(t,k)); const sh=shares(x.amount,keys); const mine=me&&sh[me];
    return `<li class="card ${x.kind==="payment"?"pay":""}"><div class="spread"><div style="min-width:0"><strong>${esc(x.kind==="payment"?`${nameOf(t,x.paidBy)} paid ${nameOf(t,keys[0])}`:x.desc)}</strong><br>
      <span class="small muted">${esc(fmtDay(x.date,true))} · ${x.kind==="payment"?"settle-up":`${esc(nameOf(t,x.paidBy))} paid · split ${keys.length===ps.length?"between everyone":keys.map(k=>nameOf(t,k)).join(", ")}`}</span>
      ${mine&&x.kind!=="payment"?`<br><span class="small">Your share ${fmtMoney(mine,cur)}</span>`:""}${x.by?`<br><span class="small muted">added by ${esc(nameOf(t,x.by))}${x.at?" · "+esc(ago(x.at)):""}</span>`:""}</div>
      <div style="text-align:right"><b class="mono">${fmtMoney(x.amount,cur)}</b><div class="row" style="justify-content:flex-end;margin-top:6px">${x.kind!=="payment"?`<button class="linkbtn small" data-exp-edit="${esc(x.id)}">Edit</button>`:""}<button class="linkbtn small" data-exp-del="${esc(x.id)}">${S.confirm==="exp:"+x.id?"Tap again to delete":"Delete"}</button></div></div></div></li>`; }).join("")}</ul>`:`<div class="empty">No expenses yet. Add the first one above.</div>`}
  ${!isShared(t)?`<p class="small muted" style="margin-top:12px">Expenses are saved on this device. Share the trip with the group (Overview → People) so everyone adds and sees them.</p>`:""}`;
}
function expEachText(){
  const t=trip(); const el=$("#exp-each"); if(!el||!t) return;
  const amt=Math.round(parseFloat(String(($("#exp-amt")||{}).value||"").replace(/[^\d.]/g,""))*100);
  const keys=[...document.querySelectorAll('input[name="exp-split"]:checked')].map(x=>x.value);
  el.textContent = keys.length&&amt>0? `${fmtMoney(Math.floor(amt/keys.length),t.currency)} each for ${keys.length} ${keys.length===1?"person":"people"}${amt%keys.length?" (pennies rounded)":""}` : keys.length? "" : "Pick at least one person.";
}
function saveExpense(){
  const t=trip(); const desc=$("#exp-desc").value.trim(); const amt=Math.round(parseFloat(String($("#exp-amt").value).replace(/[^\d.]/g,""))*100);
  const keys=[...document.querySelectorAll('input[name="exp-split"]:checked')].map(x=>x.value);
  if(!desc){ toast("Say what the expense was for."); return; } if(!(amt>0)){ toast("Enter an amount."); return; } if(!keys.length){ toast("Pick who it was for."); return; }
  const E=S.expEdit&&expenses(t).find(x=>x.id===S.expEdit);
  const x={desc,amount:amt,paidBy:$("#exp-paid").value,split:keys,date:$("#exp-date").value||todayISO(),kind:"expense",by:myEmail()||meKey(t)||"",at:nowISO()};
  const id=E?E.id:("e"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  writeExpense(t,id,x, E?`edited "${desc}" (${fmtMoney(amt,t.currency)})`:`added "${desc}" (${fmtMoney(amt,t.currency)}, paid by ${nameOf(t,x.paidBy)})`);
  S.expEdit=null; const fm=document.querySelector("[data-exp-form]"); if(fm) fm.reset(); render(); toast(E?"Expense updated":"Expense added");
}
function writeExpense(t,id,x,note){
  if(isShared(t)){ const {fs,db}=CLOUD; const all=(S.exp[t.id]||[]).filter(e=>e.id!==id); S.exp[t.id]=all.concat([Object.assign({id},x)]);
    fs.setDoc(fs.doc(db,"trips",t.id,"expenses",id),Object.assign({},x,{by:myEmail()})).catch(e=>toast(e.code==="permission-denied"?"You're not on this trip's people list.":"Couldn't sync yet. It will retry when online.")); logActivity(t,note); }
  else { const all=expenses(t).filter(e=>e.id!==id).concat([Object.assign({id},x)]); S.exp[t.id]=all; saveJSON("ts.exp."+t.id,all); }
}
function deleteExpense(t,id){
  const x=expenses(t).find(e=>e.id===id);
  if(isShared(t)){ const {fs,db}=CLOUD; S.exp[t.id]=(S.exp[t.id]||[]).filter(e=>e.id!==id); fs.deleteDoc(fs.doc(db,"trips",t.id,"expenses",id)).catch(()=>{}); logActivity(t,`deleted "${x?x.desc:"an expense"}"`); }
  else { S.exp[t.id]=expenses(t).filter(e=>e.id!==id); saveJSON("ts.exp."+t.id,S.exp[t.id]); }
}
function exportCSV(t){
  const cur=t.currency||"GBP", ps=tripPeople(t), q=s=>`"${String(s).replace(/"/g,'""')}"`;
  const rows=[["Date","Description","Amount ("+cur+")","Paid by","Split between",...ps.map(p=>p.name+" share")].map(q).join(",")];
  expenses(t).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(x=>{ const keys=(x.split||[]).map(k=>canonKey(t,k)); const sh=shares(x.amount,keys);
    rows.push([x.date,x.kind==="payment"?"Settle-up":x.desc,(x.amount/100).toFixed(2),nameOf(t,x.paidBy),keys.map(k=>nameOf(t,k)).join("; "),...ps.map(p=>((sh[pKey(p)]||0)/100).toFixed(2))].map(q).join(",")); });
  const blob=new Blob([rows.join("\n")],{type:"text/csv"}); const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=t.id+"-expenses.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
}
async function cloudClick(el){
  const t=trip();
  if(await authClick(el)) return true;
  if(el.hasAttribute("data-people-edit")){ S.peopleEdit=true; render(); const c=$("#people-card"); if(c) c.scrollIntoView({block:"start",behavior:"smooth"}); return true; }
  if(el.hasAttribute("data-people-cancel")){ S.peopleEdit=false; render(); return true; }
  if(el.hasAttribute("data-people-add")){ const f=el.closest("form"); const n=+f.count.value; const row=document.createElement("div"); row.className="two prow"; row.innerHTML=`<input name="pn${n}" placeholder="Name" aria-label="Name ${n+1}"><input name="pe${n}" type="email" placeholder="Email (optional)" aria-label="Email ${n+1}">`; f.count.value=n+1; f.insertBefore(row,f.count); row.querySelector("input").focus(); return true; }
  if(el.hasAttribute("data-share-group")){ shareGroup(); return true; }
  if(el.dataset.expEdit){ S.expEdit=el.dataset.expEdit; render(); const f=document.querySelector("[data-exp-form]"); if(f) f.scrollIntoView({block:"start",behavior:"smooth"}); setTimeout(expEachText,0); return true; }
  if(el.hasAttribute("data-exp-cancel")){ S.expEdit=null; const fm=document.querySelector("[data-exp-form]"); if(fm) fm.reset(); render(); return true; }
  if(el.dataset.expDel){ const id=el.dataset.expDel; if(S.confirm!=="exp:"+id){ S.confirm="exp:"+id; render(); return true; } S.confirm=null; deleteExpense(t,id); render(); toast("Deleted"); return true; }
  if(el.dataset.settle){ const [from,to,amt]=el.dataset.settle.split("|"); writeExpense(t,"p"+Date.now().toString(36),{desc:"Settle-up",amount:+amt,paidBy:from,split:[to],date:todayISO(),kind:"payment",by:myEmail()||"",at:nowISO()},`recorded ${nameOf(t,from)} paying ${nameOf(t,to)} ${fmtMoney(+amt,t.currency)}`); render(); toast("Payment recorded"); return true; }
  if(el.hasAttribute("data-split-all")){ const boxes=[...document.querySelectorAll('input[name="exp-split"]')]; const all=boxes.every(b=>b.checked); boxes.forEach(b=>b.checked=!all); expEachText(); return true; }
  if(el.hasAttribute("data-exp-csv")){ exportCSV(t); return true; }
  return false;
}
function cloudSubmit(f){
  if(f.hasAttribute("data-auth-form")){ doAuth(S.authMode==="up"?"up":"in"); return true; }
  if(f.hasAttribute("data-people-form")){ savePeople(f); return true; }
  if(f.hasAttribute("data-exp-form")){ saveExpense(); return true; }
  return false;
}
function cloudChange(el){
  if(el.id==="me-pick"){ const t=trip(); if(el.value) store.set("ts.me."+t.id,el.value); render(); return true; }
  if(el.name==="exp-split"){ expEachText(); return true; }
  return false;
}

/* ---------- events ---------- */
let toastTimer;
function toast(m){ const el=$("#toast"); el.textContent=m; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.hidden=true,2600); }
function go(tab){ S.screen="trip"; S.tab=tab; store.set("tp.tab",tab); S.confirm=null; render(); window.scrollTo({top:0}); if(tab==="weather"){ const t=trip(); if(t) ensureWx(t); } }
document.addEventListener("click", async e=>{
  const el=e.target.closest("button,[data-key],label"); if(!el) return;
  if(el.hasAttribute("data-home")){ S.screen="home"; S.confirm=null; render(); window.scrollTo({top:0}); return; }
  if(el.dataset.tab) return go(el.dataset.tab);
  if(el.dataset.go) return go(el.dataset.go);
  if(el.dataset.day!==undefined && el.dataset.day){ S.day=el.dataset.day; S.hot=null; if(S.tab!=="days") go("days"); else render(); return; }
  if(el.dataset.filter){ S.filter=el.dataset.filter; return render(); }
  if(el.dataset.status){ const t=trip(); const list={booking:t.bookings,stay:t.stays,transport:t.transport}[el.dataset.kind]||[]; const item=list.find(x=>x.id===el.dataset.id); if(item) setStatus(el.dataset.kind,item,el.dataset.status); return; }
  if(el.dataset.open){ return openTrip(el.dataset.open,"overview"); }
  if(await moreClicks(el)) return;
  if(el.dataset.save) return save(el.dataset.save);
  if(el.hasAttribute("data-install")&&S.installEvt){ S.installEvt.prompt(); try{ await S.installEvt.userChoice; }catch(err){} S.installEvt=null; render(); return; }
  if(el.hasAttribute("data-toggle-paste")){ const b=$("#paste-box"); b.hidden=!b.hidden; if(!b.hidden) $("#paste-in").focus(); return; }
  if(el.hasAttribute("data-load-paste")) return loadTripText($("#paste-in").value);
  if(el.dataset.copy!==undefined || el.hasAttribute("data-copy-template")){ const text=el.hasAttribute("data-copy-template")?JSON.stringify(TEMPLATE,null,2):el.dataset.copy;
    try{ await navigator.clipboard.writeText(text); toast("Copied"); }catch(err){ toast("Copy isn't available here. Select the text instead."); } return; }
  if(el.dataset.key!==undefined && el.closest("#view")){ S.hot = S.hot===el.dataset.key? null : el.dataset.key; render(); const li=document.querySelector(`.timeline li[data-key="${CSS.escape(S.hot||"")}"]`); if(li&&el.tagName==="g") li.scrollIntoView({block:"nearest",behavior:"smooth"}); }
});
document.addEventListener("input", e=>{ if(e.target&&e.target.id==="exp-amt") expEachText(); });
document.addEventListener("submit", e=>{ const f=e.target; e.preventDefault(); onSubmit(f); });
document.addEventListener("toggle", e=>{ const d=e.target; if(d.classList&&d.classList.contains("place")){ if(d.open) S.openPlace=d.dataset.place; else if(S.openPlace===d.dataset.place) S.openPlace=null; } }, true);
document.addEventListener("change", e=>{
  if(onChange(e.target)) return;
  if(e.target.id==="file-in"){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>loadTripText(String(r.result)); r.readAsText(f); e.target.value=""; }
  if(e.target.id==="backup-in"){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>restoreBackup(String(r.result)); r.readAsText(f); e.target.value=""; }
  if(e.target.dataset.check){ const t=trip(); const c=t.checklist.find(x=>x.id===e.target.dataset.check); if(c) setStatus("check",c,e.target.checked?"done":"todo"); }
});
window.addEventListener("resize", ()=>{ if(S.tab==="days"){ clearTimeout(window.__rz); window.__rz=setTimeout(render,150);} });

/* ---------- boot ---------- */
try{ const loc=JSON.parse(store.get("tp.local")||"{}"); Object.assign(S.localTrips,loc); Object.keys(loc).forEach(id=>{ try{ S.status[id]=JSON.parse(store.get("tp.status."+id)||"{}"); }catch(e){} }); }catch(e){}
render();
S.standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); S.installEvt=e; if(S.tab==="offline"||S.screen==="home") render(); });
addEventListener("appinstalled", ()=>{ S.installEvt=null; toast("Installed"); });
addEventListener("online", ()=>{ renderHeader(); refreshAll(); }); addEventListener("offline", ()=>renderHeader());
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") refreshAll(); });
setInterval(()=>{ if(document.visibilityState==="visible") refreshAll(); }, 30*60e3);
// App settings (config.json): the optional data relay address.
countries().then(()=>{ if(S.screen==="builder"||S.tab==="explore") render(); });
S.cfg={}; fetch("config.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(c=>{ S.cfg=c||{}; const t=trip(); if(t) loadLive(t,true); initCloud(); render(); }).catch(()=>{});
// Trips bundled with the app (trips/index.json). An uploaded copy of the same trip wins.
(async()=>{
  try{
    const r=await fetch("trips/index.json",{cache:"no-cache"}); const idx=await r.json();
    for(const path of (idx.trips||[])){
      try{ const t=await (await fetch(path,{cache:"no-cache"})).json(); if(validate(t)) continue;
        if(sourceOf(t.id)==="upload" && S.localTrips[t.id]) continue;
        keepLocal(t); setSource(t.id,"bundle"); if(!S.status[t.id]) S.status[t.id]={}; }catch(e){}
    }
  }catch(e){}
  S.loaded=true; pickDefault(); Object.keys(S.localTrips).forEach(id=>{ S.wx[id]=loadJSON("ts.wx."+id); recompute(S.localTrips[id]); }); render(); refreshAll(); writeSwState(); readIncoming();
})();
addEventListener("hashchange", ()=>readIncoming());
if("serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("sw.js").then(reg=>{
    S.swReady=!!navigator.serviceWorker.controller||!!reg.active;
    reg.addEventListener("updatefound",()=>{ const w=reg.installing; if(!w) return; w.addEventListener("statechange",()=>{ if(w.state==="installed"&&navigator.serviceWorker.controller) toast("App updated. It'll use the new version next time you open it."); if(w.state==="activated"){ S.swReady=true; if(S.tab==="offline"||S.screen==="home") render(); } }); });
  }).catch(()=>{});
}
function pickDefault(){ const all=allTrips(); if(!S.tripId||!all[S.tripId]){ const ids=Object.keys(all).sort((a,b)=>(all[a].start||"").localeCompare(all[b].start||"")); const up=ids.find(id=>(all[id].end||"")>=todayISO()); S.tripId=up||ids[0]||null; } }
})();
