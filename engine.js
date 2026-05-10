// ── engine.js — מנוע המשחק: state, עולם, שחקן, אויבים, input, combat, loop ──
// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
const G={
  dog:'colin',
  dogs:{
    colin:{name:'קולין',hp:100,mhp:100,stam:100,spd:7,pow:9,sz:1.0,xp:0,lv:1},
    zippo:{name:'זיפו', hp:100,mhp:100,stam:100,spd:13,pow:4,sz:1.0,xp:0,lv:1},
    momo: {name:'מומו',hp:100,mhp:100,stam:100,spd:9,pow:2,sz:.58,xp:0,lv:1},
  },
  mission:0,           // current mission index — SINGLE SOURCE OF TRUTH
  terrs:[],terrCnt:0,
  enemies:[],bosses:[],pickups:[],npcs:[],particles:[],
  gang:0,score:0,coins:0,
  foodEaten:0,          // for mission 1
  enemiesKilled:0,      // for mission 3
  recruitsDone:0,       // for mission 4
  totalKills:0,         // side quest tracking
  ch2Active:false,      // פרק ב׳ פעיל
  momoFreed:false,      // מומו שוחררה
  bruno:null,           // boss ברונו
  palto:null,           // boss ד״ר פלטו
  reks:null,            // מפקד כלבי ביטחון
  guardDogs:[],         // כלבי ביטחון עירוניים (כיכר)
  cityHallGuards:[],    // שומרי פרימטר עיריית לוד
  _fishkaPos:{x:35,z:35},
  _paltoPos:{x:80,z:-80},
  _bellaMarker:null,
  keys:{},yaw:0,pitch:.35,
  atkCD:0,velY:0,onGround:true,
  vx:0,vz:0,          // velocity for smooth movement
  dlgOpen:false,paused:false,
  shopOpen:false,
  near:null,
  joy:{on:false,dx:0,dy:0,id:-1,sx:0,sy:0},
  cam:{on:false,id:-1,lx:0,ly:0},
  sideQ:{bones:{n:0,done:false},kills:{done:false}},
  bones:[],
  // ── שדרוגים חדשים ──
  dayTime:0.27,        // 0=חצות, 0.5=צהריים — מתקדם עם הזמן
  weather:'clear',     // 'clear'|'overcast'|'rain'
  weatherT:90,         // זמן לשינוי מזג אוויר הבא (שניות)
  rainOn:false,
  collectibles:[],     // קולקטיבלס נסתרים
  collFound:0,
  capturedBlds:[],     // בניינים לכיבוש
  humanNPCs:[],        // אנשים ברחוב
  cars:[],             // מכוניות
};

let scene,camera,renderer,clock,mmCtx;
let PB,dogModel,dogTail,dogLegs=[];
const blds=[];
// ── רפרנסים לאורות — לשימוש במחזור יום/לילה ──
let _ambLight=null,_sunLight=null,_fillLight=null,_hemiLight=null;
let _rainPoints=null,_rainGeo=null;

// ════════════════════════════════════════════════
// AUDIO
// ════════════════════════════════════════════════
let AC=null;
function gAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,t='square',v=.15){try{const ac=gAC(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.start();o.stop(ac.currentTime+d);}catch(e){}}
function sBark(){tone(220,.12,'sawtooth',.2);setTimeout(()=>tone(280,.08,'sawtooth',.15),80);}
function sHit(){tone(150,.15,'square',.25);tone(80,.2,'sawtooth',.1);}
function sPickup(){tone(440,.1,'sine',.12);setTimeout(()=>tone(660,.15,'sine',.12),80);}
function sCapture(){[330,440,550,660].forEach((f,i)=>setTimeout(()=>tone(f,.2,'sine',.15),i*80));}
function sLvlUp(){[330,440,550,660,770].forEach((f,i)=>setTimeout(()=>tone(f,.25,'triangle',.18),i*70));}
function sEDie(){tone(200,.05,'sawtooth',.2);tone(100,.3,'square',.15);}

// ── גשם — רעש רקע ──
let _rainSrcNode=null,_rainGainNode=null;
function _startRainSound(){
  try{
    const ac=gAC();
    if(_rainSrcNode){_rainSrcNode.stop();_rainSrcNode=null;}
    const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.28;
    _rainSrcNode=ac.createBufferSource();_rainSrcNode.buffer=buf;_rainSrcNode.loop=true;
    _rainGainNode=ac.createGain();_rainGainNode.gain.value=0;
    const filt=ac.createBiquadFilter();filt.type='bandpass';filt.frequency.value=900;filt.Q.value=0.4;
    _rainSrcNode.connect(filt);filt.connect(_rainGainNode);_rainGainNode.connect(ac.destination);
    _rainSrcNode.start();
  }catch(e){}
}
function setRainVolume(v){
  if(_rainGainNode)try{_rainGainNode.gain.setTargetAtTime(v*0.18,gAC().currentTime,1.2);}catch(e){}
}

// ════════════════════════════════════════════════
// PARTICLES — עם geometry pool לביצועים
// ════════════════════════════════════════════════
// שדרוג: geometry pool — במקום new SphereGeometry לכל חלקיק, שתף geometry יחיד
const _PFX_GEO = new THREE.SphereGeometry(.08, 4, 4);
const _PFX_POOL = []; // בריכת meshים מוכנים שניתן לשחזר
const _PFX_POOL_MAX = 80;

function _pfxGet(col) {
  // נסה לשלוף mesh פנוי מהPool
  const recycled = _PFX_POOL.pop();
  if (recycled) {
    recycled.material.color.setHex(col);
    recycled.material.opacity = 1;
    recycled.scale.setScalar(1);
    recycled.visible = true;
    return recycled;
  }
  // אם אין בPool — צור חדש
  return new THREE.Mesh(_PFX_GEO, new THREE.MeshBasicMaterial({color:col, transparent:true}));
}

function _pfxReturn(mesh) {
  mesh.visible = false;
  if (_PFX_POOL.length < _PFX_POOL_MAX) {
    _PFX_POOL.push(mesh);
  } else {
    // Pool מלא — הסר לחלוטין
    if(scene) scene.remove(mesh);
  }
}

function spawnPfx(x,y,z,col,n=8){
  for(let i=0;i<n;i++){
    const m=_pfxGet(col);
    m.position.set(x,y,z);
    scene.add(m);
    G.particles.push({mesh:m,vx:(Math.random()-.5)*6,vy:Math.random()*5+2,vz:(Math.random()-.5)*6,life:.8});
  }
}

function updPfx(dt){
  for(let i=G.particles.length-1;i>=0;i--){
    const p=G.particles[i];
    p.life-=dt;
    if(p.life<=0){
      (p.villa?mosqueScene:scene).remove(p.mesh);
      _pfxReturn(p.mesh);
      // swap-remove במקום splice — O(1) במקום O(n)
      G.particles[i]=G.particles[G.particles.length-1];
      G.particles.pop();
      continue;
    }
    p.mesh.position.x+=p.vx*dt;
    p.mesh.position.y+=p.vy*dt;
    p.mesh.position.z+=p.vz*dt;
    if(p._smoke){
      p.vy=Math.max(0.1,p.vy-0.5*dt);
      const sc=1+p._smoke*(1-p.life/1.6)*1.2;
      p.mesh.scale.setScalar(Math.min(3,sc||1));
      p.mesh.material.opacity=p.life/1.6*0.45;
    } else {
      p.vy-=12*dt;
      p.mesh.material.opacity=p.life/.8;
    }
  }
}

// ════════════════════════════════════════════════
// SELECT DOG
// ════════════════════════════════════════════════
function selDog(d){G.dog=d;document.getElementById('cs-scr').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('hdn').textContent=G.dogs[d].name;if(isMob)document.getElementById('mob').style.display='block';G.hud=true;document.getElementById('coin-hud').style.display='block';if(!isMob){if(isMob){document.getElementById('sq-btn-mob').classList.add('has-done');}else{document.getElementById('sq-btn').style.display='flex';}}init();if(window._csChapter!=null){const _ch=window._csChapter;window._csChapter=null;setTimeout(()=>{if(isMob)document.getElementById('mob').style.display='block';if(typeof setMission==='function')setMission(_ch);},400);}}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
function init(){
  // תיקון באג: נקה renderer ישן לפני יצירת חדש — מונע דליפת זיכרון WebGL בטעינת משחק שמור
  if(renderer){
    try{
      renderer.setAnimationLoop(null); // עצור loop קיים
      renderer.dispose();
      renderer.forceContextLoss();
    }catch(_){}
    renderer=null;
  }
  // נקה scene ישנה
  if(scene){
    scene.traverse(obj=>{
      if(obj.geometry)obj.geometry.dispose();
      if(obj.material){
        if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());
        else obj.material.dispose();
      }
    });
    scene=null;
  }
  // אפס מערכי state כדי שלא ישתכפלו
  G.enemies=[];G.bosses=[];G.pickups=[];G.npcs=[];G.particles=[];
  G.terrs=[];G.terrCnt=0;G.guardDogs=[];G.cityHallGuards=[];
  G._fishkaEnemy=null;G.bruno=null;G.palto=null;G.reks=null;
  G._reksAlly=null;G._titanEnemy=null;G._titanScoutsSpawned=false;G._ch5ScoutsDone=false;
  G._poolCutPlaying=false;G._reksJoinCutPlaying=false;

  const cv=document.getElementById('cv');
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,isMob?2:2));
  // הבטח לפחות 720p — אם המסך קטן, פיקסל ריישו מינימלי מובטח
  const _minPR=Math.max(renderer.getPixelRatio(), Math.min(720/innerHeight, devicePixelRatio));
  renderer.setPixelRatio(_minPR);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=0.78;
  // תיקון באג: outputEncoding + sRGBEncoding הוסרו ב-Three.js r152+
  renderer.outputColorSpace = (THREE.SRGBColorSpace !== undefined)
    ? THREE.SRGBColorSpace
    : THREE.LinearEncoding; // fallback לגרסאות ישנות
  scene=new THREE.Scene();scene.background=new THREE.Color(0x4a90d0);scene.fog=new THREE.Fog(0x88bbdd,90,260);
  camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,300);
  clock=new THREE.Clock();
  mmCtx=document.getElementById('mm').getContext('2d');
  buildLights();buildSky();buildWorld();_initLampPool();buildCityHall();buildPlayer();buildEnemies();buildBoss();buildPickups();buildBones();buildNPCs();
  buildRain();buildCars();buildHumanNPCs();buildCollectibles();buildBldCapture();
  _buildPoolOfRest();
  setupInput();
  cacheHUD();
  // start everything hidden — gates will show what's needed
  G.enemies.forEach(e=>e.mesh.visible=false);
  G.bosses.forEach(b=>{b.mesh.visible=false;});
  G.npcs.forEach(n=>{if(n.ind&&n.type==='recruit')n.ind.visible=false;});
  setMission(0);
  showCut('intro',null);
  updSQPanel();
  updCoins();
  document.getElementById('coll-hud').style.display='block';
  document.getElementById('day-clock').style.display='block';
  loop();
}

// ════════════════════════════════════════════════
// LIGHTS
// ════════════════════════════════════════════════
function buildSky(){
  scene.background=new THREE.Color(0x4a90d0);

  function makeCloudTex(w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');
    const bumps=[
      [w*.5,h*.38,w*.42,h*.44],[w*.26,h*.50,w*.32,h*.40],[w*.74,h*.48,w*.30,h*.38],
      [w*.16,h*.58,w*.24,h*.32],[w*.84,h*.56,w*.22,h*.30],[w*.50,h*.24,w*.28,h*.34],
      [w*.36,h*.32,w*.24,h*.30],[w*.64,h*.30,w*.26,h*.30],[w*.08,h*.66,w*.18,h*.24],
      [w*.92,h*.64,w*.16,h*.22],
    ];
    bumps.forEach(([cx,cy,rw,rh])=>{
      const g=x.createRadialGradient(cx,cy-rh*.15,0,cx,cy,Math.max(rw,rh));
      g.addColorStop(0,'rgba(255,255,255,1)');
      g.addColorStop(.45,'rgba(250,253,255,.92)');
      g.addColorStop(.8,'rgba(232,244,255,.5)');
      g.addColorStop(1,'rgba(210,234,255,0)');
      x.fillStyle=g;x.beginPath();x.ellipse(cx,cy,rw,rh,0,0,Math.PI*2);x.fill();
    });
    // בסיס שטוח
    const base=x.createLinearGradient(0,h*.52,0,h);
    base.addColorStop(0,'rgba(238,248,255,.88)');
    base.addColorStop(.6,'rgba(210,232,252,.5)');
    base.addColorStop(1,'rgba(185,220,248,0)');
    x.fillStyle=base;x.beginPath();x.ellipse(w*.5,h*.62,w*.48,w*.22,0,0,Math.PI*2);x.fill();
    // צל תחתון אפור — קומולוס
    const sh=x.createLinearGradient(0,h*.56,0,h*.84);
    sh.addColorStop(0,'rgba(145,172,205,0)');
    sh.addColorStop(.5,'rgba(118,152,192,.44)');
    sh.addColorStop(1,'rgba(100,140,185,0)');
    x.fillStyle=sh;x.beginPath();x.ellipse(w*.5,h*.72,w*.4,h*.13,0,0,Math.PI*2);x.fill();
    return new THREE.CanvasTexture(c);
  }

  const clouds=[
    [-130,58,-210, 105,52],[ 25, 68,-218,  88,44],[ 170,52,-205, 98,49],
    [ -65,44,-198,  70,35],[ 230,62,-208,  82,41],[-210,50,-192, 92,46],
    [  95,36,-200,  64,32],[-160,40,-194,  76,38],[   0,30,-196,  58,29],
    [ 185,46, -55,  80,40],[-185,50, -65,  86,43],[  55,40, 185,  74,37],
    [ -85,44, 175,  80,40],[ 105,52, 208,  92,46],[-105,47, 200,  82,41],
    [  50,25,-195,  48,24],[-240,42,-180,  70,35],[ 260,38,-185,  65,32],
  ];

  clouds.forEach(([cx,cy,cz,sw,sh])=>{
    const sz=Math.random()<.5?512:384;
    const tex=makeCloudTex(sz,Math.floor(sz*.5));
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.02});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),mat);
    mesh.position.set(cx,cy,cz);
    // billboard — מסתכל לכיוון מרכז השמים, לא הארץ
    mesh.lookAt(new THREE.Vector3(0,cy,0));
    scene.add(mesh);
  });

  // שמש
  const sunD=new THREE.Mesh(new THREE.CircleGeometry(4.5,24),new THREE.MeshBasicMaterial({color:0xfffef0,side:THREE.DoubleSide,depthWrite:false}));
  sunD.position.set(110,62,-185);sunD.lookAt(0,0,0);scene.add(sunD);
  [10,18,30].forEach((r,i)=>{
    const h=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshBasicMaterial({color:0xfff5d8,transparent:true,opacity:[.09,.04,.012][i],side:THREE.DoubleSide,depthWrite:false}));
    h.position.set(110,62,-185);h.lookAt(0,0,0);scene.add(h);
  });
}

function buildLights(){
  // אמביינט שמיימי — תכלת עדין
  _ambLight=new THREE.AmbientLight(0xfff8f0,.38);
  scene.add(_ambLight);
  // שמש ראשית — לבן-צהוב חם, לא חזק מדי
  _sunLight=new THREE.DirectionalLight(0xfff4e0,0.75);
  _sunLight.position.set(130,100,60);_sunLight.castShadow=true;
  // שדרוג: shadow map — 4096 במחשב היה כבד מדי, 2048 איכות מספיקה ומהיר בהרבה
  _sunLight.shadow.mapSize.set(isMob?1024:2048,isMob?1024:2048);
  _sunLight.shadow.camera.left=-160;_sunLight.shadow.camera.right=160;
  _sunLight.shadow.camera.top=160;_sunLight.shadow.camera.bottom=-160;
  _sunLight.shadow.camera.far=400;_sunLight.shadow.bias=-0.0002;_sunLight.shadow.normalBias=0.015;
  scene.add(_sunLight);
  // fill — תכלת עדין מהצד הנגדי
  _fillLight=new THREE.DirectionalLight(0x8ab0d8,.12);_fillLight.position.set(-80,50,-30);scene.add(_fillLight);
  // אור מצפון
  const northFill=new THREE.DirectionalLight(0xfff4dd,.32);
  northFill.position.set(72,40,150);
  scene.add(northFill);
  // hemisphere
  _hemiLight=new THREE.HemisphereLight(0xa8c8e8,0x687848,.3);
  scene.add(_hemiLight);
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════
function mmat(c,r,m){return new THREE.MeshStandardMaterial({color:c,roughness:r!=null?r:.82,metalness:m||0});}
function madd(geo,mat,px,py,pz,par){const m=new THREE.Mesh(geo,mat);m.position.set(px||0,py||0,pz||0);m.castShadow=true;m.receiveShadow=true;(par||dogModel).add(m);return m;}
function mkB(w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function dk(c,f){return((Math.floor(((c>>16)&0xff)*f)<<16)|(Math.floor(((c>>8)&0xff)*f)<<8)|Math.floor((c&0xff)*f));}
// d2 — מרחק אוקלידי (עם sqrt — לשימוש כשצריך מרחק אמיתי)
function d2(ax,az,bx,bz){return Math.sqrt((ax-bx)**2+(az-bz)**2);}
// שדרוג: d2sq — מרחק בריבוע (ללא sqrt) לפעולות השוואה — 2x מהיר יותר במסלולים חמים
function d2sq(ax,az,bx,bz){return (ax-bx)**2+(az-bz)**2;}

// ════════════════════════════════════════════════
// WORLD — compact Lod (~150x150 units)
// לוד אמיתית: רחוב הרצל E-W, שדרות ירושלים N-S
// צפון: רמת אשכול | דרום: גני אביב | מערב: תחנה | מזרח: עיר עתיקה
// ════════════════════════════════════════════════
function buildWorld(){
  // קרקע — דשא ריאליסטי עם טקסטורה עשירה
  (()=>{
    const sz=512,tc=document.createElement('canvas');tc.width=tc.height=sz;
    const tx=tc.getContext('2d');
    // בסיס דשא ירוק
    const g0=tx.createLinearGradient(0,0,sz,sz);
    g0.addColorStop(0,'#4a7a28');g0.addColorStop(.5,'#3d6e22');g0.addColorStop(1,'#527a2e');
    tx.fillStyle=g0;tx.fillRect(0,0,sz,sz);
    // גבעולי דשא קצרים — ירוק כהה/בהיר
    for(let i=0;i<8000;i++){
      const x=Math.random()*sz,y=Math.random()*sz;
      const h=2+Math.random()*6,w=.8+Math.random()*1.5;
      const gr=100+Math.floor(Math.random()*60),gn=Math.floor(Math.random()*20);
      tx.fillStyle=`rgb(${gn},${gr},${gn+20})`;
      tx.fillRect(x,y,w,h);
    }
    // כתמי אדמה חומה
    for(let i=0;i<300;i++){
      const x=Math.random()*sz,y=Math.random()*sz,r=.8+Math.random()*2.5;
      tx.fillStyle=`rgba(${100+Math.floor(Math.random()*40)},${80+Math.floor(Math.random()*30)},${50+Math.floor(Math.random()*20)},${.1+Math.random()*.2})`;
      tx.beginPath();tx.arc(x,y,r,0,Math.PI*2);tx.fill();
    }
    // אבנים קטנות
    for(let i=0;i<120;i++){
      const x=Math.random()*sz,y=Math.random()*sz,r=.5+Math.random()*2;
      tx.fillStyle=`rgba(150,140,120,${.12+Math.random()*.18})`;
      tx.beginPath();tx.arc(x,y,r,0,Math.PI*2);tx.fill();
    }
    const tex=new THREE.CanvasTexture(tc);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(50,50);
    const roughTex=new THREE.CanvasTexture(tc);roughTex.wrapS=roughTex.wrapT=THREE.RepeatWrapping;roughTex.repeat.set(50,50);
    const gnd=new THREE.Mesh(new THREE.PlaneGeometry(400,400,1,1),
      new THREE.MeshStandardMaterial({map:tex,roughness:.98,metalness:0,color:0xffffff}));
    gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;scene.add(gnd);
  })();

  // === רחובות ראשיים ===
  mkRd(0,0,300,16,false);   // רחוב הרצל — E-W
  mkRd(0,0,16,300,true);    // שדרות ירושלים — N-S
  mkRd(-40,0,16,300,true);  // רחוב הגפן
  mkRd(40,0,16,300,true);   // רחוב הדקל
  mkRd(0,50,300,14,false);  // רחוב וייצמן
  mkRd(0,-50,300,14,false); // רחוב בן גוריון

  // === בלוקי מרכז העיר ===
  // רשת כבישים: E-W: z=0(הרצל,w=12), z=-50(בן גוריון,w=10), z=50(וייצמן,w=10)
  //              N-S: x=0(ירושלים,w=12), x=-40(הגפן,w=12), x=40(הדקל,w=12)
  // בלוקים בין הכבישים — כל בלוק מרוכז בין שני כבישים, עם מרווח בטוח

  // ── בלוק [x=-40..0, z=-50..0]: מרכז x=-20, z=-25 ──
  [[-20,-25,14,11,12],[-20,-25,0,0,0]].slice(0,1).forEach(a=>bldBlock(...a));
  // ── בלוק [x=0..40, z=-50..0]: מרכז x=20, z=-25 ──
  bldBlock(20,-25,14,11,11);
  // ── בלוק [x=-80..-40, z=-50..0]: מרכז x=-60, z=-25 ──
  bldBlock(-60,-25,16,11,12);
  // ── בלוק [x=40..80, z=-50..0]: מרכז x=60, z=-25 ──
  bldBlock(60,-25,14,11,10);

  // ── בלוק [x=-40..0, z=0..50]: מרכז x=-20, z=25 ──
  bldBlock(-20,25,14,11,10);
  // ── בלוק [x=0..40, z=0..50]: מרכז x=20, z=25 ──
  bldBlock(20,25,14,11,11);
  // ── בלוק [x=-80..-40, z=0..50]: מרכז x=-60, z=25 ──
  bldBlock(-60,25,16,11,9);
  // ── בלוק [x=40..80, z=0..50]: מרכז x=60, z=25 ──
  bldBlock(60,25,14,11,10);

  // ── בניינים נוספים על כל צלב — אבל לא על קצות הכבישים ──
  // בלוק [x=-80..-40, z=-100..-50]: רמת אשכול מרכז
  bldBlock(-60,-75,16,11,8);
  // בלוק [x=40..80, z=-100..-50]
  bldBlock(60,-75,14,11,8);

  // === רמת אשכול — צפון ===
  // כבישים N-S ב-x=-40,0,40 (רוחב 12) → לא לבנות בטווח x=[-46..46] סביב כל ציר
  // בין כבישים: x ≈ -60 (בין -80 ל--40), x ≈ -20 (בין -40 ל-0), x ≈ 20 (0 ל-40), x ≈ 60 (40 ל-80)
  for(let bx=-80;bx<=80;bx+=48)for(let bz=-100;bz>=-160;bz-=48){
    // הימנע מבנייה על כבישים N-S (x=-40,0,40 ±8) ומכביש E-W (z=-50 ±8)
    if(Math.abs(bx)<16||Math.abs(bx+40)<16||Math.abs(bx-40)<16)continue;
    if(Math.abs(bz+50)<10)continue;
    bldHouse(bx,bz,4+Math.random()*2.5);
  }

  // === גני אביב — דרום ===
  for(let bx=-80;bx<=80;bx+=48)for(let bz=85;bz<=155;bz+=48){
    if(Math.abs(bx)<16||Math.abs(bx+40)<16||Math.abs(bx-40)<16)continue;
    // הימנע מכביש E-W z=50 ±8
    if(Math.abs(bz-50)<10)continue;
    // פנה מקום לבית הכנסת ב-(72,96) ולשדרה ב-x=72
    if(Math.abs(bx-64)<22&&Math.abs(bz-96)<28)continue;
    if(Math.abs(bx-64)<14&&Math.abs(bz-80)<14)continue;
    bldHouse(bx,bz,3.5+Math.random()*2);}

  // === מקומות מפתח ===
  bldPark(80,-22);          // גן ציבורי — מזרח מרכז
  bldMarket(-80,55);        // שוק לוד — SW
  bldStation(-5,-155);      // תחנת רכבת — מערב/דרום
  bldMosque(-55,75);        // מסגד ג'מעה — עיר עתיקה
  bldSynagogue(72,96);    // בית כנסת גדול — גני אביב דרום-מזרח
  mkRd(72,71,12,60,true); // שדרות בית הכנסת — N-S כניסה
  bldBigMosque();           // המסגד הגדול — פרק ב׳
  bldBallsSquare(40,0);    // כיכר הכדורים — צומת רחוב הרצל/הדקל

  // שטחי כיבוש
  addTerr(40,0,18,'כיכר הכדורים');
  addTerr(0,-5,20,'כיכר רחוב הרצל');
  addTerr(-68,52,22,'שוק לוד');
  addTerr(80,-22,20,'פארק גני איילון');
  addTerr(0,-145,22,'רמת אשכול');
  addTerr(-5,-150,25,'תחנת הרכבת');
  addTerr(-52,73,20,'העיר העתיקה');

  addTerr(72,96,18,'שכונת גני אביב — בית הכנסת');
  addStreetDeco();
}

// טקסטורת אספלט גלובלית
function _mkRoadTex(){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#2a2a2a';tx.fillRect(0,0,sz,sz);
  for(let i=0;i<2000;i++){
    const x=Math.random()*sz,y=Math.random()*sz,r=.3+Math.random()*1.2;
    const v=Math.floor(25+Math.random()*30);
    tx.fillStyle=`rgb(${v},${v},${v})`;
    tx.beginPath();tx.arc(x,y,r,0,Math.PI*2);tx.fill();
  }
  // קווים דרך האספלט
  for(let i=0;i<40;i++){
    const x1=Math.random()*sz,y1=Math.random()*sz;
    tx.strokeStyle=`rgba(${40+Math.floor(Math.random()*20)},${40+Math.floor(Math.random()*20)},${40+Math.floor(Math.random()*20)},0.4)`;
    tx.lineWidth=.5+Math.random()*1.5;
    tx.beginPath();tx.moveTo(x1,y1);tx.lineTo(x1+(Math.random()-.5)*30,y1+(Math.random()-.5)*30);tx.stroke();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// טקסטורת מדרכה — אריחי בטון
function _mkSidewalkTex(){
  const sz=128,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#b0a898';tx.fillRect(0,0,sz,sz);
  // קווי אריחים
  tx.strokeStyle='rgba(80,75,68,0.55)';tx.lineWidth=1.5;
  for(let x=0;x<sz;x+=24){tx.beginPath();tx.moveTo(x,0);tx.lineTo(x,sz);tx.stroke();}
  for(let y=0;y<sz;y+=24){tx.beginPath();tx.moveTo(0,y);tx.lineTo(sz,y);tx.stroke();}
  // כתמי לכלוך קלים
  for(let i=0;i<80;i++){
    const px=Math.random()*sz,py=Math.random()*sz,r=.3+Math.random()*1.5;
    tx.fillStyle=`rgba(90,85,78,${.04+Math.random()*.08})`;
    tx.beginPath();tx.arc(px,py,r,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
let _roadTex=null,_swTex=null;
function mkRd(x,z,w,d,vert){
  if(!_roadTex)_roadTex=_mkRoadTex();
  if(!_swTex)_swTex=_mkSidewalkTex();
  // כביש — אספלט כהה עם טקסטורה
  const rClone=_roadTex.clone();rClone.needsUpdate=true;
  if(!vert){rClone.repeat.set(w/8,d/8);}else{rClone.repeat.set(w/8,d/8);}
  const rm=new THREE.MeshStandardMaterial({map:rClone,roughness:.94,metalness:0,color:0xdddddd});
  const road=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),rm);
  road.position.set(x,.06,z);road.receiveShadow=true;road.castShadow=false;scene.add(road);
  // קו מרכזי צהוב
  const ylMat=new THREE.MeshLambertMaterial({color:0xffdd00});
  if(!vert){
    const yl=new THREE.Mesh(new THREE.BoxGeometry(w,.01,.12),ylMat);yl.position.set(x,.14,z);scene.add(yl);
    // קווים לבנים
    const wMat=new THREE.MeshLambertMaterial({color:0xf0f0f0});
    for(let i=x-w/2+6;i<x+w/2-4;i+=10){const m=new THREE.Mesh(new THREE.BoxGeometry(4.5,.01,.22),wMat);m.position.set(i,.14,z);scene.add(m);}
  } else {
    const yl=new THREE.Mesh(new THREE.BoxGeometry(.12,.01,d),ylMat);yl.position.set(x,.14,z);scene.add(yl);
  }
  // מדרכות — בטון אריחים
  const swW=2.8;
  const swClone=_swTex.clone();swClone.needsUpdate=true;
  const swMat=new THREE.MeshStandardMaterial({map:swClone,roughness:.88,metalness:0,color:0xffffff});
  if(!vert){
    [d/2+swW/2,-d/2-swW/2].forEach(oz=>{
      const sw=new THREE.Mesh(new THREE.BoxGeometry(w,.16,swW),swMat.clone());
      sw.position.set(x,.08,z+oz);sw.receiveShadow=true;scene.add(sw);
      // שוליים בטון כהה
      const curb=new THREE.Mesh(new THREE.BoxGeometry(w,.1,.18),new THREE.MeshLambertMaterial({color:0x888880}));
      curb.position.set(x,.2,z+oz+(oz>0?.9:-.9));scene.add(curb);
    });
  } else {
    [w/2+swW/2,-w/2-swW/2].forEach(ox=>{
      const sw=new THREE.Mesh(new THREE.BoxGeometry(swW,.16,d),swMat.clone());
      sw.position.set(x+ox,.08,z);sw.receiveShadow=true;scene.add(sw);
      const curb=new THREE.Mesh(new THREE.BoxGeometry(.18,.1,d),new THREE.MeshLambertMaterial({color:0x888880}));
      curb.position.set(x+ox+(ox>0?.9:-.9),.2,z);scene.add(curb);
    });
  }
}
function bldBlock(x,z,w,d,h){
  // בחר שכונה ופלטת צבעים
  const inOldCity=Math.abs(x+52)<22&&Math.abs(z-72)<22;
  const cols=inOldCity?COLS_OLD:COLS_CENTER;
  const c=cols[Math.floor(Math.random()*cols.length)];
  const useStone=inOldCity||Math.random()<.45;

  // טקסטורת קיר
  const baseTex=useStone?wTexStone():wTexPlaster();
  const tC=baseTex.clone();tC.needsUpdate=true;tC.repeat.set(w/4,h/4);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.88,metalness:0});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;scene.add(bld);
  blds.push({x,z,w,d});

  // פרפט (parapet) — גג שטוח ישראלי
  const pCol=dk(c,.80);
  const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+.5,.5,d+.5),new THREE.MeshLambertMaterial({color:pCol}));
  parapet.position.set(x,h+.25,z);scene.add(parapet);
  // שכבת איטום
  const seal=new THREE.Mesh(new THREE.BoxGeometry(w-.15,.06,d-.15),new THREE.MeshLambertMaterial({color:0x252520}));
  seal.position.set(x,h+.03,z);scene.add(seal);
  // מיכל מים על הגג
  if(Math.random()<.6){
    const wx=x+(Math.random()-.5)*(w*.5),wz=z+(Math.random()-.5)*(d*.5);
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.75,8),new THREE.MeshLambertMaterial({color:0xc8c4bc}));
    wt.position.set(wx,h+.62,wz);scene.add(wt);
    const wtL=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.07,8),new THREE.MeshLambertMaterial({color:0xa8a4a0}));
    wtL.position.set(wx,h+1.01,wz);scene.add(wtL);
  }

  // חלונות — texture-painted על פני הקיר (ללא meshes נפרדים)
  const shutCol=SHUTTER_COLS[Math.floor(Math.random()*SHUTTER_COLS.length)];
  // צייר חלונות על canvas ואפשר אותם כemissive layer
  (()=>{
    const sc2=64,tc2=document.createElement('canvas');tc2.width=sc2*4;tc2.height=sc2*4;
    const tx2=tc2.getContext('2d');
    tx2.fillStyle='rgba(0,0,0,0)';tx2.clearRect(0,0,tc2.width,tc2.height);
    const cols2=Math.floor(w/2.4)+1, rows2=Math.floor(h/2.2);
    for(let r=0;r<rows2;r++)for(let c2=0;c2<cols2;c2++){
      const px=(c2/cols2)*tc2.width+8, py=(r/rows2)*tc2.height+8;
      const pw=tc2.width/cols2-12, ph=tc2.height/rows2-12;
      // זכוכית
      tx2.fillStyle=`rgba(100,180,220,${.55+Math.random()*.35})`;
      tx2.fillRect(px,py,pw,ph);
      // מסגרת
      tx2.strokeStyle='rgba(240,230,210,.9)';tx2.lineWidth=2;
      tx2.strokeRect(px-1,py-1,pw+2,ph+2);
      // תריס (60%)
      if(Math.random()<.6){
        const shutR=parseInt(((shutCol>>16)&0xff).toString());
        const shutG=parseInt(((shutCol>>8)&0xff).toString());
        const shutB=parseInt((shutCol&0xff).toString());
        tx2.fillStyle=`rgba(${shutR},${shutG},${shutB},.82)`;
        tx2.fillRect(px-1,py-1,pw*0.44+2,ph+2);
      }
    }
    const winTex=new THREE.CanvasTexture(tc2);
    const winMat=new THREE.MeshLambertMaterial({map:winTex,transparent:true,alphaTest:.05});
    // פנל חלונות קדמי
    const wp1=new THREE.Mesh(new THREE.PlaneGeometry(w*.85,h*.82),winMat);
    wp1.position.set(x,h/2+.1,z-d/2-.05);scene.add(wp1);
    // פנל חלונות אחורי
    const wp2=new THREE.Mesh(new THREE.PlaneGeometry(w*.85,h*.82),winMat.clone());
    wp2.position.set(x,h/2+.1,z+d/2+.05);wp2.rotation.y=Math.PI;scene.add(wp2);
  })();

  // מרפסות — פשוטות, floor + rail בלבד (לא עמודים בודדים)
  if(h>7){
    for(let wy=2.5;wy<h-.8;wy+=4.4){
      const balW=Math.min(5,w-2);
      const balMat=new THREE.MeshLambertMaterial({color:dk(c,.88)});
      const bal=new THREE.Mesh(new THREE.BoxGeometry(balW,.13,1.2),balMat);
      bal.position.set(x,wy-.06,z-d/2-.6);scene.add(bal);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(balW,.55,.08),new THREE.MeshLambertMaterial({color:0x888880}));
      rail.position.set(x,wy+.3,z-d/2-1.1);scene.add(rail);
    }
  }

  // מזגנים — הוסרו לשיפור ביצועים

  // כניסה / כניסות
  const doorH=2.1,doorW=1.2;
  const doorMat=new THREE.MeshStandardMaterial({color:0x4a3010+Math.floor(Math.random()*0x151515),roughness:.82,metalness:.08});
  const door=new THREE.Mesh(new THREE.BoxGeometry(doorW,doorH,.08),doorMat);
  door.position.set(x+(Math.random()-.5)*(w*.3),doorH/2-.05,z-d/2-.05);scene.add(door);
}
function bldHouse(x,z,h){
  // שכונה לפי מיקום — צבעים אמיתיים
  const isNorth=z<-60,isSouth=z>60,isOld=(Math.abs(x+52)<24&&Math.abs(z-72)<24);
  const cols=isOld?COLS_OLD:isNorth?COLS_NORTH:isSouth?COLS_SOUTH:COLS_CENTER;
  const c=cols[Math.floor(Math.random()*cols.length)];

  // טקסטורת קיר — צפון=טיח, דרום=טיח חדש, עיר עתיקה=אבן
  const tex=isOld?wTexStone():wTexPlaster();
  const tC=tex.clone();tC.needsUpdate=true;tC.repeat.set(9/3.8,h/3.8);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.86,metalness:0});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(9,h,9),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;scene.add(bld);

  // גג שטוח עם פרפט — סגנון ישראלי אמיתי
  const pCol=dk(c,.80);
  const parapet=new THREE.Mesh(new THREE.BoxGeometry(9.4,.4,9.4),new THREE.MeshLambertMaterial({color:pCol}));
  parapet.position.set(x,h+.2,z);scene.add(parapet);
  const seal=new THREE.Mesh(new THREE.BoxGeometry(8.7,.06,8.7),new THREE.MeshLambertMaterial({color:0x252520}));
  seal.position.set(x,h+.03,z);scene.add(seal);
  // מיכל מים גלילי על הגג (נפוץ מאוד בלוד)
  if(Math.random()<.65){
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.65,8),new THREE.MeshLambertMaterial({color:0xd0ccc4}));
    wt.position.set(x+(Math.random()-.5)*2,h+.52,z+(Math.random()-.5)*2);scene.add(wt);
  }

  // חלונות קדמיים עם תריסים
  const glsMat=new THREE.MeshStandardMaterial({color:0x7ab8d0,roughness:.05,metalness:.12,transparent:true,opacity:.7,emissive:0x061520});
  const frMat=new THREE.MeshLambertMaterial({color:0xede5d5});
  const shutCol=SHUTTER_COLS[Math.floor(Math.random()*SHUTTER_COLS.length)];
  const shutMat=new THREE.MeshLambertMaterial({color:shutCol});

  [-2.0,2.0].forEach(wx=>{
    for(let wy=1.5;wy<h-.75;wy+=h/Math.ceil(h/2)){
      // מסגרת
      const fr=new THREE.Mesh(new THREE.BoxGeometry(1.08,1.16,.07),frMat);
      fr.position.set(x+wx,wy,z-4.52);scene.add(fr);
      // זכוכית
      const wn=new THREE.Mesh(new THREE.BoxGeometry(.88,.96,.05),glsMat.clone());
      wn.position.set(x+wx,wy,z-4.5);scene.add(wn);
      // תריסים — 2 כנפות
      const sl=new THREE.Mesh(new THREE.BoxGeometry(.44,1.06,.04),shutMat);
      sl.position.set(x+wx-.46,wy,z-4.55);scene.add(sl);
      const sr=new THREE.Mesh(new THREE.BoxGeometry(.44,1.06,.04),shutMat);
      sr.position.set(x+wx+.46,wy,z-4.55);scene.add(sr);
    }
  });

  // חלון צד
  const wnSide=new THREE.Mesh(new THREE.BoxGeometry(.04,.82,.78),glsMat.clone());
  wnSide.position.set(x-4.52,h*.45,z);scene.add(wnSide);
  const frSide=new THREE.Mesh(new THREE.BoxGeometry(.06,.9,.9),frMat);
  frSide.position.set(x-4.53,h*.45,z);scene.add(frSide);

  // דלת עם מסגרת ומדרגה
  const doorCol=new THREE.Color().setHSL(Math.random()*.08+.04,.55,.22+Math.random()*.08);
  const doorMat=new THREE.MeshStandardMaterial({color:doorCol,roughness:.82,metalness:.06});
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.95,.07),doorMat);
  door.position.set(x,h/2-.35,z-4.54);scene.add(door);
  // מסגרת דלת
  const dfr=new THREE.Mesh(new THREE.BoxGeometry(1.22,2.08,.06),frMat);
  dfr.position.set(x,h/2-.35,z-4.55);scene.add(dfr);
  // מדרגה
  const step=new THREE.Mesh(new THREE.BoxGeometry(1.5,.13,.35),new THREE.MeshLambertMaterial({color:0xb8b0a0}));
  step.position.set(x,.065,z-4.72);scene.add(step);

  // מרפסת (לבתים גבוהים יותר)
  if(h>4.8){
    const balW=3.8;
    const bal=new THREE.Mesh(new THREE.BoxGeometry(balW,.12,1.05),new THREE.MeshLambertMaterial({color:dk(c,.88)}));
    bal.position.set(x,h*.55+.18,z-4.54-.52);scene.add(bal);
    // מעקה
    for(let pi=-balW/2+.25;pi<=balW/2-.25;pi+=1.0){
      const p=new THREE.Mesh(new THREE.BoxGeometry(.06,.55,.06),new THREE.MeshLambertMaterial({color:0x707068}));
      p.position.set(x+pi,h*.55+.46,z-4.54-1.0);scene.add(p);
    }
    const rail=new THREE.Mesh(new THREE.BoxGeometry(balW,.06,.06),new THREE.MeshLambertMaterial({color:0x888880}));
    rail.position.set(x,h*.55+.75,z-4.54-1.0);scene.add(rail);
  }

  // מזגן על קיר — רק ב-25% מהבתים
  if(Math.random()<.25){
    const ac=new THREE.Mesh(new THREE.BoxGeometry(.65,.38,.28),new THREE.MeshStandardMaterial({color:0xe5e2da,roughness:.55}));
    ac.position.set(x+1.2,h*.55,z-4.54-.16);scene.add(ac);
  }

  blds.push({x,z,w:9,d:9});
}
function bldPark(x,z){
  const pg=new THREE.Mesh(new THREE.PlaneGeometry(40,35),new THREE.MeshLambertMaterial({color:0x3d8a2a}));pg.rotation.x=-Math.PI/2;pg.position.set(x,.07,z);scene.add(pg);
  for(let i=0;i<7;i++)bldTree(x+(Math.random()-.5)*32,z+(Math.random()-.5)*26);
  mkB(2.5,.35,.8,0x5c3317,x-5,.2,z-7);
}
function bldMarket(x,z){
  const awningCols=[0xcc2200,0x2255aa,0x228833,0xcc7700,0x882299,0xaa1133];
  for(let i=0;i<6;i++){
    const stallMat=new THREE.MeshLambertMaterial({color:0xede0c8});
    const stall=new THREE.Mesh(new THREE.BoxGeometry(3.8,2.4,2.8),stallMat);
    stall.position.set(x+i*6,1.2,z);stall.castShadow=true;stall.receiveShadow=true;scene.add(stall);
    // גג מרקיזה — צבעוני
    const awCol=awningCols[i%awningCols.length];
    const aw=new THREE.Mesh(new THREE.BoxGeometry(4.4,.12,3.4),new THREE.MeshLambertMaterial({color:awCol}));
    aw.position.set(x+i*6,2.5,z);scene.add(aw);
    // פסים לבנים על הגג
    for(let s=0;s<3;s++){
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.3,.14,3.4),new THREE.MeshLambertMaterial({color:0xffffff}));
      strip.position.set(x+i*6-1.2+s*1.2,2.52,z);scene.add(strip);
    }
    // דוכן
    const counter=new THREE.Mesh(new THREE.BoxGeometry(3.4,.6,1.0),new THREE.MeshLambertMaterial({color:0x8B5a2a}));
    counter.position.set(x+i*6,.3,z-1.4);scene.add(counter);
  }
}
function bldStation(x,z){
  // גוף תחנה — בטון
  const sMat=new THREE.MeshLambertMaterial({color:0xc0b8a8});
  const body=new THREE.Mesh(new THREE.BoxGeometry(35,8,18),sMat);
  body.position.set(x,4,z);body.castShadow=true;body.receiveShadow=true;scene.add(body);
  // גג רעפים אפור
  const rf=new THREE.Mesh(new THREE.BoxGeometry(36,.5,19),new THREE.MeshLambertMaterial({color:0x888078}));
  rf.position.set(x,8.25,z);scene.add(rf);
  // רציפים
  const platMat=new THREE.MeshLambertMaterial({color:0xaaa898});
  [[x,.4,z-10],[x,.4,z+10]].forEach(([px,py,pz])=>{
    const pl=new THREE.Mesh(new THREE.BoxGeometry(42,.7,2.5),platMat);pl.position.set(px,py,pz);pl.receiveShadow=true;scene.add(pl);
    // קווים צהובים על הרציף
    for(let xi=px-18;xi<px+18;xi+=4){
      const yl=new THREE.Mesh(new THREE.BoxGeometry(.3,.01,2.5),new THREE.MeshLambertMaterial({color:0xffcc00}));
      yl.position.set(xi,.76,pz);scene.add(yl);
    }
  });
  // מגדל שעון
  const tower=new THREE.Mesh(new THREE.BoxGeometry(3.5,11,3.5),sMat);tower.position.set(x-15,5.5,z);tower.castShadow=true;scene.add(tower);
  // שלט "תחנת לוד"
  const sg=new THREE.Mesh(new THREE.BoxGeometry(8,.8,.15),new THREE.MeshLambertMaterial({color:0x1a3a8a}));sg.position.set(x,8.8,z-9.1);scene.add(sg);
  blds.push({x,z,w:35,d:18});
}
// ════════════════════════════════════════════════
// בית כנסת — Great Synagogue of Lod
// ════════════════════════════════════════════════
function _mkStarMesh(cx,cy,cz,R,mat){
  // מגן דוד אמיתי: שני משולשים שווי-צלעות הפוכים זה לזה
  const out=[];
  const depth=R*.2;
  function makeTri(angleOffset){
    const shape=new THREE.Shape();
    for(let i=0;i<3;i++){
      const a=angleOffset+i*2*Math.PI/3;
      const px=Math.sin(a)*R, py=Math.cos(a)*R;
      if(i===0) shape.moveTo(px,py); else shape.lineTo(px,py);
    }
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:depth,bevelEnabled:false});
    const m=new THREE.Mesh(geo,mat);
    m.rotation.y=Math.PI; // סובב כך שהבליטה לכיוון -Z (לעבר השחקן)
    m.position.set(cx,cy,cz);
    out.push(m);
  }
  makeTri(0);             // משולש ראשון — קודקוד למעלה
  makeTri(Math.PI);       // משולש שני — קודקוד למטה (הפוך)
  return out;
}

function bldSynagogue(x,z){
  // בניין ב-(72,96). חזית פונה צפון: F = z-7 = 89.
  // השחקן בא מ-z<96 → רואה פני F. כל קישוט ב- F - offset (בולט לכיוון -Z כלפי השחקן).
  const F = z - 7;

  // ── חומרים זהים לגישת המסגד (MeshStandard) ──
  const stTex = (() => {
    const c=document.createElement('canvas');c.width=256;c.height=256;
    const ct=c.getContext('2d');
    // בסיס — גוון אבן ירושלמית חמה
    ct.fillStyle='#d4c49a';ct.fillRect(0,0,256,256);
    // אבנים בגדלים שונים — שורות אופייניות
    const rows=[{y:0,h:38},{y:42,h:34},{y:80,h:40},{y:124,h:36},{y:164,h:38},{y:206,h:38}];
    rows.forEach(({y,h},ri)=>{
      const offset=ri%2===0?0:52;
      for(let x=-10;x<266;x+=104){
        const bx=x+offset, bw=100, by=y+2, bh=h-4;
        // גוון בסיס לאבן
        const hue=Math.random()*.06-.03;
        const light=Math.random()*.1-.05;
        const r=Math.round(212+hue*80+light*40);
        const g=Math.round(196+hue*60+light*40);
        const b=Math.round(154+light*40);
        ct.fillStyle=`rgb(${r},${g},${b})`;
        ct.fillRect(bx,by,bw,bh);
        // גרגרי אבן — נקודות אקראיות
        for(let d=0;d<18;d++){
          const gx=bx+Math.random()*bw, gy=by+Math.random()*bh;
          const gs=Math.random()*3+1;
          ct.fillStyle=`rgba(${Math.round(180+Math.random()*40)},${Math.round(165+Math.random()*35)},${Math.round(120+Math.random()*30)},0.35)`;
          ct.beginPath();ct.ellipse(gx,gy,gs,gs*.6,Math.random()*Math.PI,0,Math.PI*2);ct.fill();
        }
        // וריאציות טון — רצועות עדינות
        for(let s=0;s<3;s++){
          ct.fillStyle=`rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?200:100},100,0.04)`;
          ct.fillRect(bx,by+s*(bh/3),bw,bh/3);
        }
      }
    });
    // תפרים — אפור כהה
    ct.strokeStyle='#9a9080';ct.lineWidth=2.5;
    rows.forEach(({y,h},ri)=>{
      const offset=ri%2===0?0:52;
      // קו אופקי
      ct.beginPath();ct.moveTo(0,y);ct.lineTo(256,y);ct.stroke();
      // קווים אנכיים לכל אבן
      for(let x=-10;x<266;x+=104){
        const bx=x+offset;
        ct.beginPath();ct.moveTo(bx,y);ct.lineTo(bx,y+h);ct.stroke();
      }
    });
    // הצללה כללית עדינה
    const grad=ct.createLinearGradient(0,0,256,256);
    grad.addColorStop(0,'rgba(255,250,235,0.12)');
    grad.addColorStop(1,'rgba(100,90,60,0.1)');
    ct.fillStyle=grad;ct.fillRect(0,0,256,256);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
  })();
  const stM  =(col)=>new THREE.MeshStandardMaterial({map:stTex.clone(),color:col,roughness:.84,metalness:0});
  const stone = stM(0xddd4b0);
  const stoneL= stM(0xf0ead8);
  const goldM = new THREE.MeshStandardMaterial({color:0xd4aa22,roughness:.18,metalness:.82,emissive:0x553300});
  const domeM = new THREE.MeshStandardMaterial({color:0x1a4a8a,roughness:.3,metalness:.2,emissive:0x060c22});
  const darkM = new THREE.MeshStandardMaterial({color:0x0e1e5a,roughness:.4,emissive:0x050818});
  const glassM= new THREE.MeshStandardMaterial({color:0x2255aa,roughness:.05,metalness:.1,transparent:true,opacity:.82,emissive:0x081430,side:THREE.DoubleSide});
  const doorM = new THREE.MeshStandardMaterial({color:0x5a3010,roughness:.8,metalness:.08});
  const whiteM= new THREE.MeshStandardMaterial({color:0xf5f0e0,roughness:.7,metalness:0}); // עמודות — לבן בולט

  // ══════════════════════════════════════
  // 1. גוף + כנפות
  // ══════════════════════════════════════
  // גוף מרכזי
  const body=new THREE.Mesh(new THREE.BoxGeometry(13,16,13),stone);
  body.position.set(x,8,z);body.castShadow=true;body.receiveShadow=true;scene.add(body);
  // כנפות
  [-9,9].forEach(ox=>{
    const w=new THREE.Mesh(new THREE.BoxGeometry(5,11,12),stone);
    w.position.set(x+ox,5.5,z);w.castShadow=true;scene.add(w);
    const wc=new THREE.Mesh(new THREE.BoxGeometry(5.4,.4,12.4),stoneL);
    wc.position.set(x+ox,11.2,z);scene.add(wc);
    // רצועת זגוגית מודרנית על הכנף (כמו בתמונה)
    const gl=new THREE.Mesh(new THREE.BoxGeometry(.22,9,2.5),
      new THREE.MeshStandardMaterial({color:0x88aacc,roughness:.04,metalness:.1,transparent:true,opacity:.7,emissive:0x0a1828}));
    gl.position.set(x+ox+(ox>0?2.4:-2.4),5.5,z);scene.add(gl);
  });
  // כרכוב עליון גוף
  const corn=new THREE.Mesh(new THREE.BoxGeometry(13.6,.5,13.6),stoneL);
  corn.position.set(x,16.25,z);scene.add(corn);

  // ══════════════════════════════════════
  // 2. כיפה כחולה
  // ══════════════════════════════════════
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.7,2.1,16),stone);
  drum.position.set(x,17.05,z);scene.add(drum);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(3.3,20,14,0,Math.PI*2,0,Math.PI*.54),domeM);
  dome.position.set(x,18.1,z);dome.castShadow=true;scene.add(dome);
  [.2,.54,.84].forEach(t=>{
    const la=Math.acos(1-t),r=3.3*Math.sin(la),y=18.1+3.3*Math.cos(la);
    const rg=new THREE.Mesh(new THREE.TorusGeometry(r,.1,6,22),goldM);
    rg.position.set(x,y,z);scene.add(rg);
  });
  const fc=new THREE.Mesh(new THREE.CylinderGeometry(.11,.19,.75,8),goldM);
  fc.position.set(x,21.5,z);scene.add(fc);
  const fball=new THREE.Mesh(new THREE.SphereGeometry(.2,8,8),goldM);
  fball.position.set(x,22.1,z);scene.add(fball);

  // ══════════════════════════════════════
  // 3. פאנל חזית — מוצמד לפני הגוף, שכבה קלה
  // ══════════════════════════════════════
  // F הוא פני הגוף. פאנל בולט 0.3 קדימה (לכיוון -Z = צפון = השחקן)
  const fp=new THREE.Mesh(new THREE.BoxGeometry(10,16,.55),stoneL);
  fp.position.set(x,8,F-.28);scene.add(fp);  // F-0.28 = בולט לכיוון השחקן

  // ══════════════════════════════════════
  // 4. גמלון (פדימנט) — שורות בהדרגה על פני הפאנל
  // ══════════════════════════════════════
  const PZ = F-.32; // גמלון בולט מעט יותר מהפאנל
  [{w:11,y:16.7},{w:9.2,y:17.5},{w:7.4,y:18.3},{w:5.5,y:19.1},{w:3.6,y:19.9},{w:1.8,y:20.7}]
    .forEach(({w,y})=>{
      const pb=new THREE.Mesh(new THREE.BoxGeometry(w,.78,.6),stoneL);
      pb.position.set(x,y,PZ);scene.add(pb);
    });
  // פסי זהב בשיפוע
  const pAng=Math.atan2(.78,1.0);
  [{s:-1,cx:x-3.3},{s:1,cx:x+3.3}].forEach(({s,cx:cpx})=>{
    const pg=new THREE.Mesh(new THREE.BoxGeometry(7.4,.13,.48),goldM);
    pg.position.set(cpx,18.1,PZ+.01);pg.rotation.z=-s*pAng;scene.add(pg);
  });
  const pgfc=new THREE.Mesh(new THREE.CylinderGeometry(.1,.17,.6,8),goldM);
  pgfc.position.set(x,21.1,PZ);scene.add(pgfc);
  const pgfb=new THREE.Mesh(new THREE.SphereGeometry(.17,8,8),goldM);
  pgfb.position.set(x,21.55,PZ);scene.add(pgfb);

  // ══════════════════════════════════════
  // 5. 4 עמודות קורינתיות — לבן, בולטות מהפאנל
  // ══════════════════════════════════════
  const CZ = F-.75; // עמודות בולטות 0.75 לפני הגוף — גלויות בבירור
  [-4.0,-1.35,1.35,4.0].forEach(ox=>{
    // גוף עמוד — לבן-שמנת, שונה מהפאנל
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,10.5,12),whiteM);
    col.position.set(x+ox,5.25,CZ);col.castShadow=true;scene.add(col);
    // בסיס
    const cb=new THREE.Mesh(new THREE.BoxGeometry(.92,.28,.92),stoneL);
    cb.position.set(x+ox,.14,CZ);scene.add(cb);
    // כותרת — גוף זהב
    const cc=new THREE.Mesh(new THREE.CylinderGeometry(.5,.35,.45,12),goldM);
    cc.position.set(x+ox,10.77,CZ);scene.add(cc);
    // כותרת — כובע
    const ct=new THREE.Mesh(new THREE.BoxGeometry(1.05,.3,1.05),goldM);
    ct.position.set(x+ox,11.1,CZ);scene.add(ct);
    // עלי אקנתוס
    for(let l=0;l<8;l++){
      const la=l/8*2*Math.PI;
      const lobe=new THREE.Mesh(new THREE.SphereGeometry(.2,6,5),goldM);
      lobe.scale.set(.52,1.3,.46);
      lobe.position.set(x+ox+Math.sin(la)*.46,10.6+Math.abs(Math.cos(la))*.28,CZ+Math.cos(la)*.46);
      scene.add(lobe);
    }
  });
  // אנטבלמן
  const ent=new THREE.Mesh(new THREE.BoxGeometry(10.4,.52,.72),stoneL);
  ent.position.set(x,11.42,CZ);scene.add(ent);
  const entg=new THREE.Mesh(new THREE.BoxGeometry(10.5,.13,.58),goldM);
  entg.position.set(x,11.12,CZ-.01);scene.add(entg);

  // ══════════════════════════════════════
  // 6. 3 מגני דוד: מרכזי + 2 צדדיים
  // ══════════════════════════════════════
  function addStar(sx,sy,sz,R){
    // דיסק משושה כחול כהה (רקע — הכי אחורי)
    const bg=new THREE.Mesh(new THREE.CylinderGeometry(R+.3,R+.3,.12,6),darkM);
    bg.rotation.x=Math.PI/2;
    bg.position.set(sx,sy,sz+.05);scene.add(bg);
    // טבעת זהב (אמצע)
    const rim=new THREE.Mesh(new THREE.TorusGeometry(R+.38,.13,6,28),goldM);
    rim.position.set(sx,sy,sz+.02);scene.add(rim);
    // כוכב — הכי קדמי
    _mkStarMesh(sx,sy,sz,R,goldM).forEach(m=>{m.castShadow=true;scene.add(m);});
  }
  addStar(x,     12.4, F-.9,  2.0);  // מרכזי גדול
  addStar(x-5.8,  8.5, F-.8,  0.85); // שמאל
  addStar(x+5.8,  8.5, F-.8,  0.85); // ימין

  // ══════════════════════════════════════
  // 7. כיתוב
  // ══════════════════════════════════════
  const tc=document.createElement('canvas');tc.width=512;tc.height=52;
  const tctx=tc.getContext('2d');
  tctx.fillStyle='#ede5c8';tctx.fillRect(0,0,512,52);
  tctx.fillStyle='#6a4408';tctx.font='bold 24px Arial';
  tctx.textAlign='center';tctx.textBaseline='middle';
  tctx.fillText('בית הכנסת הגדול — לוד',256,26);
  const insc=new THREE.Mesh(new THREE.BoxGeometry(9.5,.62,.09),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(tc),side:THREE.DoubleSide}));
  insc.position.set(x,14.1,F-.55);scene.add(insc);

  // ══════════════════════════════════════
  // 8. פורטל — 2 עמודות + קשת מעוגלת + ויטראז' + דלת
  // ══════════════════════════════════════
  const PtZ = F-.9; // פורטל הכי בולט קדימה
  [-2.1,2.1].forEach(ox=>{
    const pc=new THREE.Mesh(new THREE.CylinderGeometry(.24,.29,8.2,10),whiteM);
    pc.position.set(x+ox,4.1,PtZ);pc.castShadow=true;scene.add(pc);
    const pb=new THREE.Mesh(new THREE.BoxGeometry(.7,.26,.7),stoneL);
    pb.position.set(x+ox,.13,PtZ);scene.add(pb);
    const pcc=new THREE.Mesh(new THREE.CylinderGeometry(.36,.25,.32,10),goldM);
    pcc.position.set(x+ox,8.35,PtZ);scene.add(pcc);
  });
  // קשת מעוגלת — TorusGeometry חצי
  const arch=new THREE.Mesh(new THREE.TorusGeometry(1.65,.22,8,20,Math.PI),stoneL);
  arch.rotation.z=Math.PI;arch.position.set(x,8.1,PtZ-.05);scene.add(arch);
  // פס זהב על הקשת
  const archG=new THREE.Mesh(new THREE.TorusGeometry(1.68,.07,6,18,Math.PI),goldM);
  archG.rotation.z=Math.PI;archG.position.set(x,8.1,PtZ-.03);scene.add(archG);
  // ויטראז' עגול
  const vit=new THREE.Mesh(new THREE.CircleGeometry(1.5,16),glassM);
  vit.position.set(x,8.1,PtZ+.06);scene.add(vit);
  // מגן דוד בויטראז'
  _mkStarMesh(x,8.1,PtZ+.22,1.0,goldM).forEach(m=>scene.add(m));
  // דלת עץ
  const dL=new THREE.Mesh(new THREE.BoxGeometry(1.2,4.8,.13),doorM);
  dL.position.set(x-.65,2.4,PtZ+.1);scene.add(dL);
  const dR=new THREE.Mesh(new THREE.BoxGeometry(1.2,4.8,.13),doorM);
  dR.position.set(x+.65,2.4,PtZ+.1);scene.add(dR);
  // מסגרת דלת זהב
  const dfr=new THREE.Mesh(new THREE.BoxGeometry(3.1,.13,.48),goldM);
  dfr.position.set(x,4.65,PtZ);scene.add(dfr);
  // ידיות דלת
  [-1,1].forEach(sd=>{
    const kn=new THREE.Mesh(new THREE.SphereGeometry(.1,6,5),goldM);
    kn.position.set(x+sd*.35,2.5,PtZ+.16);scene.add(kn);
  });

  // ══════════════════════════════════════
  // 9. מדרגות — הוסרו
  // ══════════════════════════════════════

  // ══════════════════════════════════════
  // 10. עצי זית 4
  // ══════════════════════════════════════
  [[-7.5,F-2],[7.5,F-2],[-7.5,F+.8],[7.5,F+.8]].forEach(([ox,tz])=>{
    const rnd=(a,b)=>a+(b-a)*Math.random();
    // גזע זית — מפותל ועבה
    const trMat=new THREE.MeshStandardMaterial({color:0x5a3a18,roughness:.92});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.16,.22),rnd(.28,.36),rnd(3.2,4.2),9),trMat);
    tr.position.set(x+ox,1.8,tz);tr.rotation.z=rnd(-.1,.1);tr.castShadow=true;scene.add(tr);
    // גבשושיות על הגזע — אופייני לזית
    for(let k=0;k<3;k++){
      const bump=new THREE.Mesh(new THREE.SphereGeometry(rnd(.1,.18),5,4),trMat);
      bump.position.set(x+ox+rnd(-.12,.12),rnd(.8,2.8),tz+rnd(-.12,.12));scene.add(bump);
    }
    // 3 כדורי עלים — ירוק-כסוף אופייני לזית
    const oliveGreen=new THREE.Color(0x5a7a2a);
    [[rnd(1.3,1.8),rnd(.2,.6),rnd(-.4,.4),rnd(-.3,.3)],
     [rnd(1.1,1.6),rnd(1.0,1.6),rnd(-.5,.5),rnd(-.4,.4)],
     [rnd(.9,1.3),rnd(1.6,2.2),rnd(-.3,.3),rnd(-.3,.3)]
    ].forEach(([r,dy,lox,loz])=>{
      const lc=oliveGreen.clone().offsetHSL(rnd(-.04,.04),rnd(-.1,.1),rnd(-.04,.08));
      const lv=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),
        new THREE.MeshStandardMaterial({color:lc,roughness:.88}));
      lv.scale.set(rnd(.85,1.1),rnd(.65,.85),rnd(.85,1.1));
      lv.position.set(x+ox+lox,3.8+dy,tz+loz);lv.castShadow=true;scene.add(lv);
    });
  });

  // ══════════════════════════════════════
  // 11. תאורה מקומית — עדינה, לא מסנוורת
  // ══════════════════════════════════════
  const l1=new THREE.PointLight(0xfff4dd,0.9,28);
  l1.position.set(x,7,F-6);scene.add(l1);
  const l2=new THREE.PointLight(0xffe8aa,0.7,14);
  l2.position.set(x,12,F-2);scene.add(l2);

  blds.push({x,z,w:13,d:13});
  blds.push({x:x-9,z,w:5,d:12});
  blds.push({x:x+9,z,w:5,d:12});
}


function bldMosque(x,z){
  // ══════════════════════════════════════════════════
  //  מסגד ג'אמע לוד — Jamia Mosque — מפואר
  //  אבן חוואר, כיפה ירוקה, מינרט גבוה, קשתות עוטות
  // ══════════════════════════════════════════════════
  const stTex=wTexStone();
  const mkWall=(w,h,d,col,px,py,pz)=>{
    const t=stTex.clone();t.needsUpdate=true;t.repeat.set(w/4,h/4);
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshStandardMaterial({map:t,color:col,roughness:.86,metalness:0}));
    m.position.set(px,py,pz);m.castShadow=true;m.receiveShadow=true;scene.add(m);
    return m;
  };
  const domeGreen=new THREE.MeshStandardMaterial({color:0x1d6040,roughness:.22,metalness:.28,emissive:0x041208});
  const domeRingM=new THREE.MeshStandardMaterial({color:0xd4aa22,roughness:.2,metalness:.75,emissive:0x221800});
  const archStoneM=new THREE.MeshStandardMaterial({color:0xcec0a0,roughness:.85});
  const marbleTrimM=new THREE.MeshStandardMaterial({color:0xf0ead8,roughness:.65,metalness:.05});

  // ── גוף ראשי — גרנד, עם פסים עיטוריים ──
  mkWall(18,8.5,18,0xd8ccb2,x,4.25,z);
  // פס עיטורי — שתי גוונים אבן
  const bandDark=new THREE.Mesh(new THREE.BoxGeometry(18.4,.38,18.4),new THREE.MeshStandardMaterial({color:0xb8aa8e,roughness:.88}));
  bandDark.position.set(x,4.4,z);scene.add(bandDark);
  const bandLight=new THREE.Mesh(new THREE.BoxGeometry(18.4,.22,18.4),new THREE.MeshStandardMaterial({color:0xeee4cc,roughness:.82}));
  bandLight.position.set(x,4.65,z);scene.add(bandLight);
  // כרכוב עליון
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(19,.55,19),marbleTrimM);
  cornice.position.set(x,8.77,z);scene.add(cornice);
  // שיני כרכוב (מרלון)
  for(let i=-8.5;i<=8.5;i+=1.2){
    const t=new THREE.Mesh(new THREE.BoxGeometry(.85,.5,.35),marbleTrimM);
    t.position.set(x+i,9.05,z-9.3);scene.add(t);
    const t2=t.clone();t2.position.z=z+9.3;scene.add(t2);
  }
  // עמודים קצרים בפינות + ביניהם
  [[-9,-9],[-9,9],[9,-9],[9,9],[-9,0],[9,0]].forEach(([ox,oz])=>{
    mkWall(1.4,10.5,1.4,0xcec0a4,x+ox,5.25,z+oz);
  });

  // ── כיפה ראשית — כהה ומפוארת ──
  // טמבור מגבוה
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(6,6.4,2.5,16),
    new THREE.MeshStandardMaterial({map:stTex.clone(),color:0xd0c4aa,roughness:.84}));
  drum.position.set(x,9.75,z);drum.castShadow=true;scene.add(drum);
  // חלונות בטמבור — מחודדים
  for(let i=0;i<8;i++){
    const ang=i/8*Math.PI*2;
    const gw=new THREE.Mesh(new THREE.BoxGeometry(.85,1.7,.18),
      new THREE.MeshStandardMaterial({color:0x3a9a60,roughness:.05,metalness:.2,transparent:true,opacity:.75,emissive:0x083018}));
    gw.position.set(x+Math.sin(ang)*5.7,10.5,z+Math.cos(ang)*5.7);gw.rotation.y=ang;scene.add(gw);
    // מסגרת זהב לחלון
    const gf=new THREE.Mesh(new THREE.BoxGeometry(1.02,1.9,.12),domeRingM);
    gf.position.set(x+Math.sin(ang)*5.75,10.5,z+Math.cos(ang)*5.75);gf.rotation.y=ang;scene.add(gf);
  }
  // טבעות זהב
  [9.4,9.75,10.0,10.95].forEach(y=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(6.42,6.42,.1,20,1,true),domeRingM);
    ring.position.set(x,y,z);scene.add(ring);
  });
  // הכיפה
  const mainDome=new THREE.Mesh(new THREE.SphereGeometry(6.1,22,16,0,Math.PI*2,0,Math.PI/2),domeGreen);
  mainDome.position.set(x,11,z);mainDome.castShadow=true;scene.add(mainDome);
  // פס זהב ריצוי בכיפה
  [.25,.55].forEach(t=>{
    const lat=Math.acos(1-t);
    const r=6.1*Math.sin(lat)+.05;
    const y=11+6.1*Math.cos(lat);
    const kr=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.12,20,1,true),domeRingM);
    kr.position.set(x,y,z);scene.add(kr);
  });
  // פינאל — ירח וכוכב
  const finPole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,2.5,8),new THREE.MeshStandardMaterial({color:0xd4aa22,roughness:.2,metalness:.8}));
  finPole.position.set(x,17.8,z);scene.add(finPole);
  const finSph=new THREE.Mesh(new THREE.SphereGeometry(.38,10,10),domeRingM);
  finSph.position.set(x,19.1,z);scene.add(finSph);
  const cresc=new THREE.Mesh(new THREE.TorusGeometry(.38,.09,8,16,Math.PI*1.5),
    new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.12,metalness:.85,emissive:0x443300}));
  cresc.position.set(x,19.8,z);cresc.rotation.z=0.4;scene.add(cresc);
  const cstar=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),new THREE.MeshStandardMaterial({color:0xffee55,emissive:0x443300,metalness:.9,roughness:.1}));
  cstar.position.set(x+.52,19.95,z);scene.add(cstar);

  // כיפות קטנות — 4 פינות
  [[-6.5,-6.5],[-6.5,6.5],[6.5,-6.5],[6.5,6.5]].forEach(([ox,oz])=>{
    const sd=new THREE.Mesh(new THREE.SphereGeometry(1.65,12,9,0,Math.PI*2,0,Math.PI/2),domeGreen);
    sd.position.set(x+ox,9.5,z+oz);sd.castShadow=true;scene.add(sd);
    const sr=new THREE.Mesh(new THREE.CylinderGeometry(1.68,1.68,.18,12),domeRingM);
    sr.position.set(x+ox,9.4,z+oz);scene.add(sr);
    const sf=new THREE.Mesh(new THREE.SphereGeometry(.2,7,7),domeRingM);
    sf.position.set(x+ox,11.32,z+oz);scene.add(sf);
  });

  // ── מינרט — מפורט ומוגבה ──
  // בסיס מרובע
  mkWall(2.8,5,2.8,0xccc0a8,x+10,2.5,z);
  // גוף עגול
  const mn=new THREE.Mesh(new THREE.CylinderGeometry(.82,.98,16,14),
    new THREE.MeshStandardMaterial({map:stTex.clone(),color:0xccc0a8,roughness:.84,metalness:0}));
  mn.position.set(x+10,10.5,z);mn.castShadow=true;scene.add(mn);
  // פסים עיטוריים על המינרט
  [6,10,15.5].forEach(y=>{
    const mr=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.18,14),
      new THREE.MeshStandardMaterial({color:0xb8aa8e,roughness:.8}));
    mr.position.set(x+10,y,z);scene.add(mr);
  });
  // מרפסת מינרט — מפורטת
  const balc=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,.28,14),marbleTrimM);
  balc.position.set(x+10,18.8,z);scene.add(balc);
  // גדר מרפסת
  for(let i=0;i<12;i++){
    const ba=i/12*Math.PI*2;
    const bp=new THREE.Mesh(new THREE.BoxGeometry(.12,.35,.12),marbleTrimM);
    bp.position.set(x+10+Math.sin(ba)*1.25,19.05,z+Math.cos(ba)*1.25);scene.add(bp);
  }
  // כיפת מינרט
  const mnCap=new THREE.Mesh(new THREE.ConeGeometry(1.05,3.8,14),domeGreen);
  mnCap.position.set(x+10,21,z);mnCap.castShadow=true;scene.add(mnCap);
  // ירח
  const cresc2=new THREE.Mesh(new THREE.TorusGeometry(.32,.08,6,12,Math.PI*1.4),
    new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.12,metalness:.85,emissive:0x443300}));
  cresc2.position.set(x+10,23.2,z);cresc2.rotation.z=0.5;scene.add(cresc2);

  // ── חזית — 3 קשתות מחודדות מפוארות ──
  // מסגרת חזית
  const facBack=new THREE.Mesh(new THREE.BoxGeometry(18,.01,9),new THREE.MeshStandardMaterial({color:0xcabea4}));
  facBack.position.set(x,4.5,z-9);scene.add(facBack);
  // 3 קשתות מחודדות
  [-5.5,0,5.5].forEach((ox,idx)=>{
    // עמוד קשת
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.45,.5,7,10),archStoneM);
    col.position.set(x+ox,3.5,z-9.15);scene.add(col);
    // כרכוב עמוד
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.05,.3,1.05),marbleTrimM);
    cap.position.set(x+ox,7.15,z-9.15);scene.add(cap);
    // קשת מחודדת — pointed arch
    const archFr=new THREE.Mesh(new THREE.BoxGeometry(2.4,4.8,.38),archStoneM);
    archFr.position.set(x+ox,4.4,z-9.05);scene.add(archFr);
    const archIn=new THREE.Mesh(new THREE.BoxGeometry(1.7,4.2,.42),
      new THREE.MeshStandardMaterial({color:0x8a7860,roughness:.9}));
    archIn.position.set(x+ox,4.2,z-9.04);scene.add(archIn);
    // קשת מחודדת — pointed torus
    const pt=new THREE.Mesh(new THREE.TorusGeometry(1.0,.22,8,16,Math.PI),
      new THREE.MeshStandardMaterial({color:0xc8ba9c,roughness:.88}));
    pt.position.set(x+ox,6.1,z-9.05);scene.add(pt);
    // פס זהב על קשת
    const pg=new THREE.Mesh(new THREE.TorusGeometry(1.05,.08,6,14,Math.PI),domeRingM);
    pg.position.set(x+ox,6.1,z-9.0);scene.add(pg);
    // קישוט קשת — עיגול בתוך קשת
    const medalion=new THREE.Mesh(new THREE.TorusGeometry(.35,.07,6,12),
      new THREE.MeshStandardMaterial({color:0xc0aa88,roughness:.7}));
    medalion.position.set(x+ox,6.6,z-9.02);scene.add(medalion);
  });
  // פס עיטורי קדמי — מעל הקשתות
  [7.4,7.8].forEach(y=>{
    const band=new THREE.Mesh(new THREE.BoxGeometry(18.2,.2,.2),
      new THREE.MeshStandardMaterial({color:y===7.4?0xb0a48e:0xeee4cc,roughness:.8}));
    band.position.set(x,y,z-9.04);scene.add(band);
  });
  // דלת כניסה — עץ כהה
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.2,.12),
    new THREE.MeshStandardMaterial({color:0x2a1a08,roughness:.7,metalness:.08}));
  door.position.set(x,1.6,z-9.1);scene.add(door);
  // עיטורי דלת — מתכת זהב
  const hingM2=new THREE.MeshStandardMaterial({color:0xd4aa22,roughness:.25,metalness:.75,emissive:0x221800});
  [-1,1].forEach(sd=>{
    [.8,2.0,3.0].forEach(dy=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(.22,.07,.16),hingM2);
      h.position.set(x+sd*.85,dy,z-9.04);scene.add(h);
    });
  });

  // ── מדרגות ──
  [0,1,2].forEach(i=>{
    const st=new THREE.Mesh(new THREE.BoxGeometry(18,.2,(i+1)*.4+.4),
      new THREE.MeshStandardMaterial({color:0xd4c8a8,roughness:.9}));
    st.position.set(x,i*.22,z-10-i*.3);st.receiveShadow=true;scene.add(st);
  });

  // ── תאורת נקודה ──
  const mosqueLight=new THREE.PointLight(0x88ffaa,1.0,20);
  mosqueLight.position.set(x,4,z-9);scene.add(mosqueLight);

  blds.push({x,z,w:18,d:18});
}

function bldBallsSquare(cx,cz){
  // ── כיכר הכדורים — כיכר תנועה אמיתית בצומת כבישים ──
  // Y-levels: ground=0, road connectors=0.04, roundabout base=0.10, inner ring=0.22, island=0.28+
  // כביש/ריצוף כיכר — y=0.10 (מעל הקרקע בבירור)
  const roundaboutPave=new THREE.Mesh(new THREE.CylinderGeometry(20,20,.20,40),
    new THREE.MeshLambertMaterial({color:0xb8b0a2}));
  roundaboutPave.position.set(cx,.10,cz);roundaboutPave.receiveShadow=true;scene.add(roundaboutPave);
  // כביש טבעתי — RingGeometry כדי לא לחפוף את הריצוף
  const roadRingGeo=new THREE.RingGeometry(11.5,20,48);
  const roadRing=new THREE.Mesh(roadRingGeo,new THREE.MeshLambertMaterial({color:0x252525,side:THREE.DoubleSide}));
  roadRing.rotation.x=-Math.PI/2;roadRing.position.set(cx,.21,cz);scene.add(roadRing);
  // מדרכה פנימית — y=0.22
  const innerPave=new THREE.Mesh(new THREE.RingGeometry(7.8,11.4,40),
    new THREE.MeshLambertMaterial({color:0xc8c0a8,side:THREE.DoubleSide}));
  innerPave.rotation.x=-Math.PI/2;innerPave.position.set(cx,.22,cz);scene.add(innerPave);
  // פסי כביש חיבור — y=0.04 (מתחת לרמת הכיכר, ממזגים עם כבישים קיימים)
  [{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}].forEach(({dx,dz})=>{
    const conn=new THREE.Mesh(new THREE.BoxGeometry(dx?80:12.5,0.2,dz?12.5:80),
      new THREE.MeshLambertMaterial({color:0x2a2a2a}));
    conn.position.set(cx+dx*50,0.04,cz+dz*50);scene.add(conn);
  });

  // האי המרכזי — פלטפורמת בטון מוגבהת עגולה
  const island=new THREE.Mesh(new THREE.CylinderGeometry(7,7.4,.55,32),
    new THREE.MeshLambertMaterial({color:0xc8b898}));
  island.position.set(cx,.38,cz);island.castShadow=true;island.receiveShadow=true;scene.add(island);

  // קיר טבעת נמוך סביב האי
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(7.4,7.4,.45,32,1,true),
    new THREE.MeshLambertMaterial({color:0xb8a888,side:THREE.DoubleSide}));
  wall.position.set(cx,.32,cz);scene.add(wall);

  // שלט "לוד — כיכר הכדורים" — פס כחול-צהוב על קיר הטבעת
  const signBg=new THREE.Mesh(new THREE.CylinderGeometry(7.45,7.45,.28,32,1,true,-.7,.8),
    new THREE.MeshLambertMaterial({color:0x1133aa,emissive:0x001144,side:THREE.DoubleSide}));
  signBg.position.set(cx,.45,cz);scene.add(signBg);

  // בריכת מים בבסיס — כחול שקוף
  const pool=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,.08,24),
    new THREE.MeshLambertMaterial({color:0x4499cc,transparent:true,opacity:.6}));
  pool.position.set(cx,.72,cz);scene.add(pool);

  // ── הכדורים — כמו בצילום: אשכול צפוף על עמוד מרכזי ──
  // עמוד מתכת מרכזי
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,5.5,8),
    new THREE.MeshLambertMaterial({color:0x888870}));
  pole.position.set(cx,3.5,cz);pole.castShadow=true;scene.add(pole);

  // 7 כדורים — צבעים כמו בתמונה: כתום-גדול, ירוק-זית, אדום-גדול, כחול-כהה, צהוב, תכלת, סגול
  const ballDefs=[
    {col:0xe8791a,r:1.85,ox:-.5, oy:5.2, oz:.4},  // כתום — הגדול, שמאל-מרכז
    {col:0x8ab82a,r:1.45,ox:-2.2,oy:4.4, oz:-.3}, // ירוק-זית
    {col:0xd42020,r:1.9, ox:1.1, oy:5.5, oz:.2},  // אדום — הגדול, ימין
    {col:0x1a2d88,r:1.8, ox:.6,  oy:3.6, oz:-1.1},// כחול כהה — תחתון ימין
    {col:0xf5c518,r:1.3, ox:-1.6,oy:6.5, oz:.6},  // צהוב — גבוה שמאל
    {col:0x3ab8d8,r:1.2, ox:.2,  oy:7.0, oz:-.5}, // תכלת — הגבוה ביותר
    {col:0x7b3fa0,r:1.25,ox:-2.8,oy:5.8, oz:.8},  // סגול — חיצוני שמאל
  ];
  ballDefs.forEach(({col,r,ox,oy,oz})=>{
    // כדור ראשי
    const ball=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),
      new THREE.MeshLambertMaterial({color:col}));
    ball.position.set(cx+ox,oy,cz+oz);ball.castShadow=true;scene.add(ball);
    // פסיפס — אריחים קטנים על פני השטח
    const tileCount=Math.floor(r*5);
    for(let i=0;i<tileCount;i++){
      const phi=Math.random()*Math.PI*2,theta=Math.random()*Math.PI;
      const tr=r+.03;
      const tile=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.04),
        new THREE.MeshLambertMaterial({
          color:new THREE.Color(col).offsetHSL(
            (Math.random()-.5)*.15,
            (Math.random()-.5)*.2,
            (Math.random()*.25-.05)
          )
        }));
      tile.position.set(
        cx+ox+Math.sin(theta)*Math.cos(phi)*tr,
        oy+Math.cos(theta)*tr,
        cz+oz+Math.sin(theta)*Math.sin(phi)*tr
      );
      tile.lookAt(cx+ox,oy,cz+oz);
      scene.add(tile);
    }
    // זרוע קצרה לעמוד
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,Math.sqrt(ox*ox+oz*oz+.2),6),
      new THREE.MeshLambertMaterial({color:0x888870}));
    arm.position.set(cx+ox*.5,oy-.4,cz+oz*.5);
    arm.rotation.z=Math.atan2(ox,oy-3.5)*.4;
    scene.add(arm);
    // no per-ball lights
  });

  // פרחים צהובים סביב האי
  for(let i=0;i<28;i++){
    const ang=i/28*Math.PI*2;
    const fr=new THREE.Mesh(new THREE.SphereGeometry(.18,5,4),
      new THREE.MeshLambertMaterial({color:0xf5e020}));
    fr.position.set(cx+Math.cos(ang)*8.2,.38,cz+Math.sin(ang)*8.2);scene.add(fr);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.18,4),
      new THREE.MeshLambertMaterial({color:0x2a7a2a}));
    st.position.set(cx+Math.cos(ang)*8.2,.26,cz+Math.sin(ang)*8.2);scene.add(st);
  }
  // דשא ירוק בין הפרחים — רצועה ירוקה על האי y=0.23
  const grassRing=new THREE.Mesh(new THREE.RingGeometry(7.6,9.8,32),
    new THREE.MeshLambertMaterial({color:0x3d8a2a,side:THREE.DoubleSide}));
  grassRing.rotation.x=-Math.PI/2;grassRing.position.set(cx,.23,cz);scene.add(grassRing);
  // קווי מעבר חצייה לבנים — 4 כיוונים
  [{dx:1,dz:0,a:0},{dx:-1,dz:0,a:0},{dx:0,dz:1,a:Math.PI/2},{dx:0,dz:-1,a:Math.PI/2}].forEach(({dx,dz,a})=>{
    for(let s=-2;s<=2;s++){
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(a===0?.18:1.2,0.03,a===0?1.2:.18),
        new THREE.MeshLambertMaterial({color:0xf0f0f0}));
      stripe.position.set(cx+dx*11+(dz?s*.8:0),0.1,cz+dz*11+(dx?s*.8:0));
      scene.add(stripe);
    }
  });
  // !! לא מוסיפים ל-blds — כך הכיכר ניתנת להליכה
}
function bldBigMosque(){
  // ══════════════════════════════════════════════════
  // המסגד הגדול — ג'אמע לוד — exterior מפואר
  // מיקום: -65, -100 — בלוק עצמאי בין רחוב הגפן (x=-43) לשולי המפה (x=-85)
  // הדלת פונה מזרחה לכיוון רחוב הגפן (x≈-47) — Group מסובב 90°
  const MX=0, MZ=0; // קואורדינטות יחסיות — ה-Group ממוקם במוחלט
  const WORLD_X=-65, WORLD_Z=-100;

  // ── עטיפה ב-Group לסיבוב אחיד ──
  const mosqueGroup = new THREE.Group();
  mosqueGroup.position.set(WORLD_X, 0, WORLD_Z);
  mosqueGroup.rotation.y = Math.PI / 2; // 90° — הדלת (שפונה +z) תפנה עכשיו +x (מזרח = לכיוון רחוב הגפן)
  scene.add(mosqueGroup);

  // מעטפת עזר — מוסיף ל-group במקום ל-scene
  const _add = (mesh) => { mesh.castShadow=true; mesh.receiveShadow=true; mosqueGroup.add(mesh); return mesh; };
  const _addNS = (mesh) => { mosqueGroup.add(mesh); return mesh; }; // ללא צל (אמבסנט/זכוכית)
  const stoneTex=_getBldTex('stone',2);

  // ── קיר חיצוני — חומה סביב המתחם ──
  const wallM=new THREE.MeshStandardMaterial({map:stoneTex.clone(),color:0xd8ceb0,roughness:.92,metalness:0,bumpScale:.4});
  wallM.map.needsUpdate=true; wallM.map.repeat.set(6,1);
  const wallH=2.8;
  const wallSegs=[
    [MX,    MZ-14, 40, wallH, .8],   // צפון
    [MX,    MZ+14, 40, wallH, .8],   // דרום
    [MX-20, MZ,    .8, wallH, 28],   // מערב
    [MX+20, MZ,    .8, wallH, 28],   // מזרח
  ];
  wallSegs.forEach(([x,z,w,h,d])=>{
    const wm2=wallM.clone();wm2.map=stoneTex.clone();wm2.map.needsUpdate=true;wm2.map.repeat.set(w/3,1);
    const w3=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wm2);
    w3.position.set(x,h/2,z);w3.castShadow=true;w3.receiveShadow=true;mosqueGroup.add(w3);
    // כרכוב עליון על החומה
    const crown=new THREE.Mesh(new THREE.BoxGeometry(w+.4,.35,d+.4),new THREE.MeshStandardMaterial({color:0xc8c0a0,roughness:.9}));
    crown.position.set(x,h+.17,z);mosqueGroup.add(crown);
    // מגדלוני חומה — פינות
  });

  // ── גוף ראשי — אבן חוואר ──
  const bodyTexM=new THREE.MeshStandardMaterial({
    map:(()=>{const t=stoneTex.clone();t.needsUpdate=true;t.repeat.set(5,2);return t;})(),
    color:0xddd4b8,roughness:.9,metalness:0,bumpScale:.45
  });
  const body=new THREE.Mesh(new THREE.BoxGeometry(22,9,22),bodyTexM);
  body.position.set(MX,4.5,MZ);body.castShadow=true;body.receiveShadow=true;mosqueGroup.add(body);

  // קומה שנייה מצומצמת — ייחודית לג'אמע
  const body2M=bodyTexM.clone();body2M.map=stoneTex.clone();body2M.map.needsUpdate=true;body2M.map.repeat.set(3,1.5);
  const body2=new THREE.Mesh(new THREE.BoxGeometry(16,4,16),body2M);
  body2.position.set(MX,11,MZ);body2.castShadow=true;mosqueGroup.add(body2);

  // פרפט — חומה עליונה מסביב לגג
  const parapetM=new THREE.MeshStandardMaterial({color:0xc8c0a0,roughness:.92,metalness:0});
  [[MX,MZ-11,16,.7,.8],[MX,MZ+11,16,.7,.8],[MX-8.5,MZ,.8,.7,22],[MX+8.5,MZ,.8,.7,22]].forEach(([x,z,w,h,d])=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),parapetM);p.position.set(x,13.35,z);mosqueGroup.add(p);
  });
  // מרלונים — שיניים על הפרפט (סגנון איסלאמי)
  for(let i=-7;i<=7;i+=2){
    const merl=new THREE.Mesh(new THREE.BoxGeometry(.6,.55,.5),parapetM);
    merl.position.set(MX+i,13.85,MZ-11.2);mosqueGroup.add(merl);
    const merl2=merl.clone();merl2.position.z=MZ+11.2;mosqueGroup.add(merl2);
  }
  for(let i=-10;i<=10;i+=2){
    const merl=new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.6),parapetM);
    merl.rotation.y=Math.PI/2;merl.position.set(MX-11.2,13.85,MZ+i);mosqueGroup.add(merl);
    const merl2=merl.clone();merl2.position.x=MX+11.2;mosqueGroup.add(merl2);
  }

  // ── כיפה ראשית — ירוק מוסלמי עם טבעות ──
  const domeGreen=new THREE.MeshStandardMaterial({color:0x2a6840,roughness:.32,metalness:.18,envMapIntensity:.3});
  // בסיס כיפה — טמבור מתומן
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.5,2.5,16),
    new THREE.MeshStandardMaterial({map:(()=>{const t=stoneTex.clone();t.needsUpdate=true;t.repeat.set(4,1);return t;})(),color:0xd0c8a8,roughness:.88}));
  drum.position.set(MX,14.2,MZ);mosqueGroup.add(drum);
  // חלונות בטמבור — 8 כיוונים
  for(let i=0;i<8;i++){
    const ang=i/8*Math.PI*2;
    const gw=new THREE.Mesh(new THREE.BoxGeometry(.8,1.2,.15),
      new THREE.MeshStandardMaterial({color:0x7abccc,roughness:.05,metalness:.15,transparent:true,opacity:.72,emissive:0x061a22}));
    gw.position.set(MX+Math.sin(ang)*5.0,15.0,MZ+Math.cos(ang)*5.0);
    gw.rotation.y=ang;mosqueGroup.add(gw);
  }
  // הכיפה עצמה
  const dome=new THREE.Mesh(new THREE.SphereGeometry(5.5,24,18,0,Math.PI*2,0,Math.PI/2),domeGreen);
  dome.position.set(MX,15.5,MZ);dome.castShadow=true;mosqueGroup.add(dome);
  // טבעת כסף-ירוק — מפריד בין הכיפה לבסיס
  const domeRing=new THREE.Mesh(new THREE.CylinderGeometry(5.55,5.55,.22,24),
    new THREE.MeshStandardMaterial({color:0x8aaa88,roughness:.45,metalness:.35}));
  domeRing.position.set(MX,15.5,MZ);mosqueGroup.add(domeRing);
  // פינאל — ירח בראש הכיפה
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.38,8,8),
    new THREE.MeshStandardMaterial({color:0xddcc44,roughness:.2,metalness:.6,emissive:0x443300}));
  finial.position.set(MX,21.2,MZ);mosqueGroup.add(finial);
  const crescent=new THREE.Mesh(new THREE.TorusGeometry(.38,.07,6,16,Math.PI*1.4),
    new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.15,metalness:.65,emissive:0x443200}));
  crescent.position.set(MX,22.1,MZ);crescent.rotation.z=.4;mosqueGroup.add(crescent);

  // ── כיפות קטנות בפינות גוף ──
  const smDomeM=new THREE.MeshStandardMaterial({color:0x2e6e45,roughness:.38,metalness:.15});
  [[-7.5,-7.5],[7.5,-7.5],[-7.5,7.5],[7.5,7.5]].forEach(([ox,oz])=>{
    // טמבור קטן
    const sdr=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2,1.4,12),
      new THREE.MeshStandardMaterial({color:0xd2c8a4,roughness:.9}));
    sdr.position.set(MX+ox,9.7,MZ+oz);mosqueGroup.add(sdr);
    const sd=new THREE.Mesh(new THREE.SphereGeometry(1.9,14,10,0,Math.PI*2,0,Math.PI/2),smDomeM);
    sd.position.set(MX+ox,10.7,MZ+oz);sd.castShadow=true;mosqueGroup.add(sd);
    const srf=new THREE.Mesh(new THREE.SphereGeometry(.2,6,6),
      new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.2,metalness:.6,emissive:0x332200}));
    srf.position.set(MX+ox,12.8,MZ+oz);mosqueGroup.add(srf);
  });

  // ── 2 מינרטים — גבוהים ומפורטים ──
  [-13,13].forEach(ox=>{
    const colM=new THREE.MeshStandardMaterial({
      map:(()=>{const t=stoneTex.clone();t.needsUpdate=true;t.repeat.set(1,5);return t;})(),
      color:0xd8d0b4,roughness:.88,metalness:0
    });
    // בסיס מרובע
    const base=new THREE.Mesh(new THREE.BoxGeometry(2.5,3,2.5),colM);
    base.position.set(MX+ox,1.5,MZ+2);base.castShadow=true;mosqueGroup.add(base);
    // גוף עגול — עולה
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.85,.95,16,14),colM);
    shaft.position.set(MX+ox,11,MZ+2);shaft.castShadow=true;mosqueGroup.add(shaft);
    // כרכוב מרפסת — 2 שלבים
    [16.5,20].forEach(y=>{
      const balc=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.2,.3,14),
        new THREE.MeshStandardMaterial({color:0xb8b0901,roughness:.85}));
      balc.position.set(MX+ox,y,MZ+2);mosqueGroup.add(balc);
      // מרלונים מסביב
      for(let i=0;i<12;i++){
        const ang=i/12*Math.PI*2;
        const mer=new THREE.Mesh(new THREE.BoxGeometry(.2,.3,.2),parapetM);
        mer.position.set(MX+ox+Math.sin(ang)*1.28,y+.25,MZ+2+Math.cos(ang)*1.28);
        mosqueGroup.add(mer);
      }
    });
    // ראש מינרט — גוף צר
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.45,.85,4.5,12),colM);
    top.position.set(MX+ox,22.5,MZ+2);mosqueGroup.add(top);
    // כיפת מינרט — ירוקה
    const mnCap=new THREE.Mesh(new THREE.ConeGeometry(.88,4,12),domeGreen);
    mnCap.position.set(MX+ox,27,MZ+2);mnCap.castShadow=true;mosqueGroup.add(mnCap);
    // ירח על המינרט
    const mnFin=new THREE.Mesh(new THREE.SphereGeometry(.18,6,6),
      new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.2,metalness:.6,emissive:0x443200}));
    mnFin.position.set(MX+ox,29.2,MZ+2);mosqueGroup.add(mnFin);
    const mnCr=new THREE.Mesh(new THREE.TorusGeometry(.2,.04,5,12,Math.PI*1.4),
      new THREE.MeshStandardMaterial({color:0xffdd44,roughness:.15,metalness:.65,emissive:0x443200}));
    mnCr.position.set(MX+ox,29.9,MZ+2);mnCr.rotation.z=.4;mosqueGroup.add(mnCr);
  });

  // ── חזית דרום — קשתות כניסה מחודדות ──
  const archM=new THREE.MeshStandardMaterial({color:0xe8e0c8,roughness:.88,metalness:0});
  // פורטל ראשי — גדול ומרכזי
  const portalFr=new THREE.Mesh(new THREE.BoxGeometry(5.5,8,.55),archM);
  portalFr.position.set(MX,4,MZ+11.3);mosqueGroup.add(portalFr);
  // חלל פורטל
  const portalIn=new THREE.Mesh(new THREE.BoxGeometry(3.6,6.8,.62),
    new THREE.MeshStandardMaterial({color:0x1a3a20,roughness:.9}));
  portalIn.position.set(MX,3.5,MZ+11.2);mosqueGroup.add(portalIn);
  // קשת חדה (pointed arch) — טורוס חצאי מוגבה
  const archGeo=new THREE.TorusGeometry(1.9,.28,8,18,Math.PI);
  const archMesh=new THREE.Mesh(archGeo,archM);
  archMesh.position.set(MX,7.0,MZ+11.0);mosqueGroup.add(archMesh);
  // עיטורי קשת — פסים ירוקים-אבן לסירוגין
  for(let i=0;i<5;i++){
    const stripCol=i%2===0?0xccc0a0:0x3a6840;
    const strip=new THREE.Mesh(new THREE.TorusGeometry(1.9+i*.22,.12,5,14,Math.PI),
      new THREE.MeshStandardMaterial({color:stripCol,roughness:.88}));
    strip.position.set(MX,7.0,MZ+10.9-i*.08);mosqueGroup.add(strip);
  }
  // קשתות צדדיות קטנות — 2 משני הצדדים
  [-5,5].forEach(ox=>{
    const saf=new THREE.Mesh(new THREE.BoxGeometry(3,5.5,.45),archM);
    saf.position.set(MX+ox,2.75,MZ+11.3);mosqueGroup.add(saf);
    const sain=new THREE.Mesh(new THREE.BoxGeometry(2,4.5,.5),
      new THREE.MeshStandardMaterial({color:0x2a4a30,roughness:.9}));
    sain.position.set(MX+ox,2.5,MZ+11.2);mosqueGroup.add(sain);
    const sar=new THREE.Mesh(new THREE.TorusGeometry(1.1,.18,7,14,Math.PI),archM);
    sar.position.set(MX+ox,5.2,MZ+11.0);mosqueGroup.add(sar);
  });
  // דלת ראשית — ירוקה מפוארת
  const mainDoor=new THREE.Mesh(new THREE.BoxGeometry(3.2,6.2,.18),
    new THREE.MeshStandardMaterial({color:0x1a5028,roughness:.72,metalness:.08}));
  mainDoor.position.set(MX,3.1,MZ+11.1);mosqueGroup.add(mainDoor);
  // קישוטי הדלת — ציר/ידית
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.8,6),
    new THREE.MeshStandardMaterial({color:0xddcc44,roughness:.3,metalness:.6,emissive:0x332200}));
  handle.rotation.z=Math.PI/2;handle.position.set(MX+.8,3.0,MZ+11.2);mosqueGroup.add(handle);

  // ── פסים קישוטיים אופקיים על גוף ──
  [2.5,4.5,6.5].forEach(y=>{
    const band=new THREE.Mesh(new THREE.BoxGeometry(22.4,.2,22.4),
      new THREE.MeshStandardMaterial({color:0xb8b090,roughness:.92}));
    band.position.set(MX,y,MZ);mosqueGroup.add(band);
  });

  // ── חלונות בולטים — עם מסגרות אבן ──
  const glassM=new THREE.MeshStandardMaterial({color:0x7abccc,roughness:.05,metalness:.15,transparent:true,opacity:.72,emissive:0x061a22});
  const winFrM=new THREE.MeshStandardMaterial({color:0xd0c8a4,roughness:.88});
  [[-7,6],[-7,-6],[7,6],[7,-6],[0,-11]].forEach(([ox,oz])=>{
    const fr=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.2,.35),winFrM);
    fr.position.set(MX+ox,6.0,MZ+oz);mosqueGroup.add(fr);
    const gw=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.7,.18),glassM);
    gw.position.set(MX+ox,6.0,MZ+oz+.1);mosqueGroup.add(gw);
    // קשת קטנה על כל חלון
    const war=new THREE.Mesh(new THREE.TorusGeometry(.6,.1,6,10,Math.PI),winFrM);
    war.position.set(MX+ox,7.1,MZ+oz+.05);mosqueGroup.add(war);
  });

  // ── עמודות כניסה — פורטיקו מרשים ──
  const colTexM=new THREE.MeshStandardMaterial({color:0xe0d8bc,roughness:.9,metalness:0});
  [-4.5,4.5].forEach(ox=>{
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,9,14),colTexM);
    col.position.set(MX+ox,4.5,MZ+12.5);col.castShadow=true;mosqueGroup.add(col);
    // כרכוב ראש עמוד
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.4,.4,1.4),colTexM);
    cap.position.set(MX+ox,9.2,MZ+12.5);mosqueGroup.add(cap);
    const base2=new THREE.Mesh(new THREE.BoxGeometry(1.3,.3,1.3),colTexM);
    base2.position.set(MX+ox,.15,MZ+12.5);mosqueGroup.add(base2);
  });

  // ── מרצפת הכניסה — הוסרה ──

  // ── עצי ברוש משני הצדדים ──
  [-15,15].forEach(ox=>{
    const rnd=(a,b)=>a+(b-a)*Math.random();
    const trM=new THREE.MeshStandardMaterial({color:0x3a2208,roughness:.92});
    const h=rnd(4,5.5);
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.12,.18),rnd(.22,.3),h,8),trM);
    tr.position.set(MX+ox,h/2,MZ+13);tr.castShadow=true;mosqueGroup.add(tr);
    // 4 שכבות קונוס — ברוש שכבתי
    const totalH=rnd(7,10);
    const cGreen=new THREE.Color(0x1a4d12).offsetHSL(rnd(-.03,.03),rnd(-.06,.06),rnd(-.02,.04));
    [0,.25,.5,.72].forEach((t,i)=>{
      const yr=h+totalH*t;
      const r=rnd(.6,.85)*(1-t*.65);
      const sh=totalH*(1-t)*.52;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(r,sh,8),
        new THREE.MeshStandardMaterial({color:cGreen.clone().offsetHSL(0,0,i*.025),roughness:.88}));
      cone.position.set(MX+ox+rnd(-.05,.05),yr+sh*.45,MZ+13+rnd(-.05,.05));
      cone.castShadow=true;mosqueGroup.add(cone);
    });
  });

  // ── סמן כניסה — אחרי סיבוב 90° הדלת (שהיתה +z) פונה עכשיו +x ──
  // WORLD_X + 14 (עומק הדלת) = -65 + 14 = -51, WORLD_Z = -100
  G.gateMarker={x:WORLD_X+14, z:WORLD_Z};
  blds.push({x:WORLD_X, z:WORLD_Z, w:22, d:22});
  blds.push({x:WORLD_X, z:WORLD_Z-13, w:4, d:2.5});  // מינרט — אחרי סיבוב
  blds.push({x:WORLD_X, z:WORLD_Z+13, w:4, d:2.5});  // מינרט — אחרי סיבוב
}
function bldTree(x,z){
  const rnd=(a,b)=>a+(b-a)*Math.random();
  const type=Math.random(); // 0=עץ ישראלי עגול, .35=ברוש, .6=תמר, .8=שיטה

  if(type<.35){
    // ── עץ עגול ישראלי — גזע מפותל, כמה כדורי עלים ──
    const h=rnd(4,6.5);
    const trMat=new THREE.MeshLambertMaterial({color:new THREE.Color(0x4a2e0a).offsetHSL(0,rnd(-.05,.05),rnd(-.05,.05))});
    // גזע עם עיקולים — שני קטעים
    const tr1=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.13,.18),rnd(.22,.3),h*.6,7),trMat);
    tr1.position.set(x,h*.3,z);tr1.rotation.z=rnd(-.08,.08);tr1.castShadow=true;scene.add(tr1);
    const tr2=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.1,.15),rnd(.13,.18),h*.5,6),trMat);
    tr2.position.set(x+rnd(-.15,.15),h*.7,z+rnd(-.1,.1));tr2.rotation.z=rnd(-.12,.12);tr2.castShadow=true;scene.add(tr2);
    // 3-4 כדורי עלים בגדלים שונים
    const greenBase=new THREE.Color(0x2d6b1a).offsetHSL(rnd(-.06,.06),rnd(-.1,.1),rnd(-.05,.08));
    [[rnd(1.8,2.6),rnd(.3,.8),rnd(-.3,.3),rnd(-.3,.3)],
     [rnd(1.4,2.0),rnd(1.2,1.8),rnd(-.6,.6),rnd(-.5,.5)],
     [rnd(1.2,1.7),rnd(1.8,2.4),rnd(-.4,.4),rnd(-.4,.4)],
     [rnd(.9,1.4),rnd(1.0,1.5),rnd(-.8,.8),rnd(-.6,.6)]
    ].forEach(([r,dy,ox,oz],i)=>{
      const lc=greenBase.clone().offsetHSL(0,0,rnd(-.06,.08));
      const sph=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),new THREE.MeshLambertMaterial({color:lc}));
      sph.position.set(x+ox,h+dy,z+oz);sph.castShadow=true;sph.receiveShadow=true;scene.add(sph);
    });

  } else if(type<.6){
    // ── ברוש ישראלי — גבוה וצר, שכבות ──
    const h=rnd(3,5.5);
    const trMat=new THREE.MeshLambertMaterial({color:0x3a2208});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(.1,.2,h,6),trMat);
    tr.position.set(x,h/2,z);tr.castShadow=true;scene.add(tr);
    const totalH=rnd(5,9);
    const darkGreen=new THREE.Color(0x1a4a10).offsetHSL(rnd(-.04,.04),rnd(-.08,.08),rnd(-.03,.05));
    // 4 שכבות קונוס לאפקט ריבוד
    [0,.28,.54,.76].forEach((t,i)=>{
      const yr=h+totalH*t, r=rnd(.55,.8)*(1-t*.7), sh=totalH*(1-t)*.55;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(r,sh,7),
        new THREE.MeshLambertMaterial({color:darkGreen.clone().offsetHSL(0,0,i*.03)}));
      cone.position.set(x+rnd(-.06,.06),yr+sh*.45,z+rnd(-.06,.06));cone.castShadow=true;scene.add(cone);
    });

  } else if(type<.8){
    // ── תמר — גזע גבוה וצנום, כותרת כפות ──
    const h=rnd(5,8.5);
    const trMat=new THREE.MeshLambertMaterial({color:0x6b4218});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.14,.2),rnd(.2,.28),h,8),trMat);
    tr.rotation.z=rnd(-.06,.06);tr.position.set(x,h/2,z);tr.castShadow=true;scene.add(tr);
    // טבעות גזע אופייניות לתמר
    for(let i=0;i<6;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(rnd(.18,.22),.03,4,10),trMat);
      ring.rotation.x=Math.PI/2;ring.position.set(x,h*(.2+i*.13),z);scene.add(ring);
    }
    // כפות — 7-9 גפות המתפשטות
    const nFronds=Math.round(rnd(7,10));
    for(let i=0;i<nFronds;i++){
      const ang=i/nFronds*Math.PI*2+rnd(-.15,.15);
      const reach=rnd(2.5,4.0), drop=rnd(.3,.8);
      const frondMat=new THREE.MeshLambertMaterial({color:new THREE.Color(0x3a7018).offsetHSL(0,rnd(-.08,.08),rnd(-.06,.06))});
      // גפה — כמה קטעים
      for(let s=0;s<3;s++){
        const t=s/3, nt=(s+1)/3;
        const fx=x+Math.sin(ang)*reach*nt, fz=z+Math.cos(ang)*reach*nt;
        const fy=h+.5-drop*nt*nt;
        const fw=rnd(.08,.14), fl=reach/3*rnd(.85,1.1);
        const frond=new THREE.Mesh(new THREE.BoxGeometry(fw,fl*.18,fl),frondMat);
        frond.position.set(fx,fy,fz);
        frond.rotation.y=ang;frond.rotation.x=rnd(.2,.5)*nt;
        frond.castShadow=true;scene.add(frond);
      }
    }
    // כתר קטן
    const crown=new THREE.Mesh(new THREE.SphereGeometry(rnd(.5,.8),7,6),
      new THREE.MeshLambertMaterial({color:0x2a5c10}));
    crown.scale.y=.4;crown.position.set(x,h+.3,z);scene.add(crown);

  } else {
    // ── שיטה — עץ שטוח מתפשט (אקציה) ──
    const h=rnd(3,5);
    const trMat=new THREE.MeshLambertMaterial({color:0x5a3812});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.12,.2),rnd(.2,.3),h,7),trMat);
    tr.position.set(x,h/2,z);tr.castShadow=true;scene.add(tr);
    // ענפים רוחביים
    for(let i=0;i<3;i++){
      const ang=rnd(0,Math.PI*2), len=rnd(1.5,2.8);
      const branch=new THREE.Mesh(new THREE.CylinderGeometry(.04,.08,len,5),trMat);
      branch.rotation.z=Math.PI/2+rnd(-.2,.2);branch.rotation.y=ang;
      branch.position.set(x+Math.sin(ang)*len*.4,h*.6+i*.4,z+Math.cos(ang)*len*.4);scene.add(branch);
    }
    // כיפת עלים שטוחה ורחבה
    const yel=new THREE.Color(0x5a8a10).offsetHSL(rnd(-.05,.05),rnd(-.1,.1),rnd(-.04,.06));
    const canopy=new THREE.Mesh(new THREE.SphereGeometry(rnd(2.8,3.8),10,7),new THREE.MeshLambertMaterial({color:yel}));
    canopy.scale.y=rnd(.28,.42);canopy.position.set(x+rnd(-.3,.3),h+rnd(.4,.9),z+rnd(-.3,.3));
    canopy.castShadow=true;canopy.receiveShadow=true;scene.add(canopy);
    const canopy2=new THREE.Mesh(new THREE.SphereGeometry(rnd(2,2.8),9,6),new THREE.MeshLambertMaterial({color:yel.clone().offsetHSL(0,0,.06)}));
    canopy2.scale.y=rnd(.24,.36);canopy2.position.set(x+rnd(-.8,.8),h+rnd(.8,1.4),z+rnd(-.8,.8));
    canopy2.castShadow=true;scene.add(canopy2);
  }
}
function addTerr(x,z,r,name){
  mkB(.25,4.5,.25,0x888,x,2.25,z);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(2,1.2),new THREE.MeshLambertMaterial({color:0x9b59b6,side:THREE.DoubleSide}));flag.position.set(x+1,5.2,z);scene.add(flag);
  G.terrs.push({x,z,r,name,cap:false,flag,defTimer:0});
}
function _mkStreetSign(x,y,z,name,rotY){
  // עמוד
  const poleMat=new THREE.MeshStandardMaterial({color:0x7a8090,roughness:.35,metalness:.75});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,3.6,8),poleMat);
  pole.position.set(x,y+1.8,z);pole.castShadow=true;scene.add(pole);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.18,8),poleMat);
  base.position.set(x,y+.09,z);scene.add(base);

  const engMap={
    'רח׳ הרצל':'Herzl St','שד׳ ירושלים':'Jerusalem Blvd',
    'רח׳ הדקל':'Hadekel St','רח׳ הגפן':'Hagefen St',
    'רח׳ וייצמן':'Weizmann St','רח׳ בן גוריון':'Ben Gurion St',
    'שד׳ בית הכנסת':'Synagogue Blvd',
    'רח׳ הרצל / שד׳ ירושלים':'Herzl / Jerusalem',
    'רח׳ הרצל / רח׳ הדקל':'Herzl / Hadekel',
    'רח׳ הרצל / רח׳ הגפן':'Herzl / Hagefen'};
  const eng=engMap[name]||name;

  // canvas הטקסט
  const W=512,H=128;
  const tc=document.createElement('canvas');tc.width=W;tc.height=H;
  const tx=tc.getContext('2d');

  // רקע כחול
  tx.fillStyle='#1a3a8a';tx.fillRect(0,0,W,H);
  // פס ירוק תחתון
  tx.fillStyle='#1a7a1a';tx.fillRect(0,H-30,W,30);
  // מסגרת לבנה
  tx.strokeStyle='#ffffff';tx.lineWidth=4;tx.strokeRect(3,3,W-6,H-6);

  // שם עברי — ברור, מרכז, ללא direction
  tx.fillStyle='#ffffff';
  tx.font='bold 52px Arial';
  tx.textAlign='center';
  tx.textBaseline='middle';
  tx.fillText(name, W/2, H/2 - 18);

  // שם אנגלי בפס הירוק
  tx.fillStyle='#ffffff';
  tx.font='22px Arial';
  tx.textAlign='center';
  tx.textBaseline='middle';
  tx.fillText(eng, W/2, H - 15);

  const tex=new THREE.CanvasTexture(tc);
  // שלט — BoxGeometry פשוט עם texture על שני הצדדים
  const sw=3.2, sh=0.82;
  const signMat=new THREE.MeshStandardMaterial({map:tex, side:THREE.DoubleSide, roughness:.5});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(sw,sh,.08),signMat);
  sign.position.set(x,y+3.5,z);
  if(rotY) sign.rotation.y=rotY;
  scene.add(sign);
}
const _streetLamps=[];   // {bulb, x, z} — נורות לשליטת לילה/יום
const _lampLightPool=[];  // pool קבוע של 4 PointLights שזזים לפנסים הקרובים ביותר

function _mkLamp(x,z){
  const poleMat=new THREE.MeshLambertMaterial({color:0x555560});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,5,6),poleMat);
  pole.position.set(x,2.5,z);pole.castShadow=true;scene.add(pole);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.8,5),poleMat);
  arm.rotation.z=Math.PI/2;arm.position.set(x+.4,5,z);scene.add(arm);
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.2,.16,.32,7),new THREE.MeshLambertMaterial({color:0x333330}));
  lamp.position.set(x+.8,4.9,z);scene.add(lamp);
  const bulbMat=new THREE.MeshLambertMaterial({color:0xffffaa,emissive:new THREE.Color(0x000000)});
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,5,4),bulbMat);
  bulb.position.set(x+.8,4.85,z);scene.add(bulb);
  _streetLamps.push({bulb:bulbMat,x:x+.8,z});
}
function _initLampPool(){
  // 6 PointLights קבועים — מוצבים בנקודות מרכזיות בעיר, לא זזים
  const fixedPos=[
    [0,0],[40,25],[-40,25],[0,-60],[40,-60],[-40,-60]
  ];
  fixedPos.forEach(([x,z])=>{
    const pl=new THREE.PointLight(0xffeebb,0,22);
    pl.position.set(x,4.2,z);
    scene.add(pl);
    _lampLightPool.push(pl);
  });
}
function _updLampPool(){
  if(!_streetLamps.length) return;
  const lampsOn=G.dayTime>0.70||G.dayTime<0.30;
  const targetI=lampsOn?0.7:0;
  _lampLightPool.forEach(pl=>{
    pl.intensity+=(targetI-pl.intensity)*0.04;
  });
}
const _benchSpots=[];  // {x,z,ang} — לשימוש NPC יושב
function _mkBench(x,z,ang){
  const woodMat=new THREE.MeshLambertMaterial({color:0x8B5a2a});
  const metalMat=new THREE.MeshLambertMaterial({color:0x606060});
  const g=new THREE.Group();
  // מושב
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,.1,.55),woodMat);
  seat.position.set(0,.5,0);g.add(seat);
  // שלושה לוחות מושב
  [-0.55,0,0.55].forEach(oy=>{
    const slat=new THREE.Mesh(new THREE.BoxGeometry(1.75,.07,.14),woodMat);
    slat.position.set(0,.52,oy*.28);g.add(slat);
  });
  // גב
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.8,.55,.08),woodMat);
  back.position.set(0,.9,-.22);g.add(back);
  // רגלי ברזל — 2 צדדים
  [-0.7,0.7].forEach(ox=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.55),metalMat);
    leg.position.set(ox,.25,0);g.add(leg);
    const brace=new THREE.Mesh(new THREE.BoxGeometry(.08,.35,.08),metalMat);
    brace.position.set(ox,.7,-.2);brace.rotation.x=.4;g.add(brace);
  });
  g.position.set(x,0,z);
  g.rotation.y=ang||0;
  g.castShadow=true;g.receiveShadow=true;
  scene.add(g);
  _benchSpots.push({x,z,ang:ang||0});
}
function addStreetDeco(){
  // פנסי רחוב הרצל (E-W) — משני הצדדים
  for(let i=-120;i<130;i+=28){
    _mkLamp(i,7.8);   // צד צפון
    _mkLamp(i,-7.8);  // צד דרום
  }
  // פנסי שדרות ירושלים (N-S)
  for(let i=-120;i<130;i+=28){
    _mkLamp(7.8,i);
    _mkLamp(-7.8,i);
  }
  // שלטי רחוב בצמתים מרכזיים — כל שלט עם שם רחוב
  // צומת ירושלים/הרצל
  _mkStreetSign(6,0,7,'רח׳ הרצל / שד׳ ירושלים',0);
  _mkStreetSign(7,0,-6,'שד׳ ירושלים',Math.PI/2);
  // צומת הדקל/הרצל
  _mkStreetSign(44,0,7,'רח׳ הרצל / רח׳ הדקל',0);
  _mkStreetSign(44,0,-7,'רח׳ הדקל',Math.PI/2);
  // צומת הגפן/הרצל
  _mkStreetSign(-44,0,7,'רח׳ הרצל / רח׳ הגפן',0);
  _mkStreetSign(-44,0,-7,'רח׳ הגפן',Math.PI/2);
  // רחוב וייצמן
  _mkStreetSign(7,0,52,'רח׳ וייצמן',0);
  _mkStreetSign(-7,0,52,'רח׳ וייצמן',0);
  // רחוב בן גוריון
  _mkStreetSign(7,0,-52,'רח׳ בן גוריון',0);
  _mkStreetSign(-7,0,-52,'רח׳ בן גוריון',0);
  // שדרות בית הכנסת
  _mkStreetSign(74,0,55,'שד׳ בית הכנסת',Math.PI/2);
  _mkStreetSign(74,0,85,'שד׳ בית הכנסת',Math.PI/2);

  // ── ספסלים — מוצבים מאחורי המדרכה, לא על הכביש ──
  // מדרכות: הרצל z=±11 (רוחב 2.8), אחרי המדרכה = z=±13.5
  // ירושלים x=±9, אחרי מדרכה = x=±12
  // הגפן x=±29/51, מדרכה 2.8 → x=-30.5 / x=-51.5 ← בטוח
  // הדקל x=29/51 ← x=30.5 / x=52

  // הרצל — צפון (z=13.4, לא על כביש הרצל z=0±8 ו-וייצמן z=50±6)
  [[-88,13.4,0],[-55,13.4,0],[-18,13.4,0],[28,13.4,0],[70,13.4,0],[102,13.4,0]].forEach(([x,z,a])=>{
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,2)) _mkBench(x,z,a);
  });
  // הרצל — דרום (z=-13.4)
  [[-75,-13.4,Math.PI],[-42,-13.4,Math.PI],[12,-13.4,Math.PI],[52,-13.4,Math.PI],[88,-13.4,Math.PI]].forEach(([x,z,a])=>{
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,2)) _mkBench(x,z,a);
  });
  // שדרות ירושלים — מזרח (x=12)
  [[12,-68,Math.PI/2],[12,-22,Math.PI/2],[12,28,Math.PI/2],[12,72,Math.PI/2]].forEach(([x,z,a])=>{
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,2)) _mkBench(x,z,a);
  });
  // הגפן — מזרח (x=-30.5)
  [[-30.5,-80,-Math.PI/2],[-30.5,-38,-Math.PI/2],[-30.5,18,-Math.PI/2],[-30.5,68,-Math.PI/2]].forEach(([x,z,a])=>{
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,2)) _mkBench(x,z,a);
  });
  // פארק (80,-22) — ספסלים על דשא, לא על כביש
  [[80,-10,0],[80,-34,Math.PI],[68,-22,Math.PI/2],[92,-22,-Math.PI/2]].forEach(([x,z,a])=>_mkBench(x,z,a));
  // ליד שוק — מאחורי דוכנים (x=-80, z=48 ואילך — לא על כבישים)
  [[-68,46,0],[-80,58,-Math.PI/2],[-88,68,Math.PI]].forEach(([x,z,a])=>{
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,2)) _mkBench(x,z,a);
  });
}

// ════════════════════════════════════════════════
// PLAYER MODELS (from frisbee game)
// ════════════════════════════════════════════════
function addLegs(uM,lM,s){
  dogLegs=[];
  [{x:.135*s,z:.36*s,ph:0},{x:-.135*s,z:.36*s,ph:Math.PI},{x:.135*s,z:-.34*s,ph:Math.PI},{x:-.135*s,z:-.34*s,ph:0}].forEach(d=>{
    const lg=new THREE.Group();lg.position.set(d.x,.42*s,d.z);dogModel.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.13*s,.32*s,.13*s),uM);up.position.y=-.16*s;up.castShadow=true;lg.add(up);
    const kG=new THREE.Group();kG.position.y=-.32*s;lg.add(kG);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.11*s,.3*s,.11*s),lM);lo.position.y=-.15*s;lo.castShadow=true;kG.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.15*s,.08*s,.19*s),lM);pw.position.set(0,-.31*s,.03*s);pw.castShadow=true;kG.add(pw);
    dogLegs.push({node:lg,ph:d.ph});
  });
}
function buildColin(){
  const s=1,BK=mmat(0x0d0d12,.86,.06),WH=mmat(0xf0f0f0,.8),NS=mmat(0x100808,.38,.04),EY=mmat(0x0a0a10,.1,.12);
  const EH=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.05,emissive:new THREE.Color(0xcccccc)}),BR=mmat(0x3a2810,.8);
  madd(new THREE.BoxGeometry(.54,.5,1.1),BK,0,.5,0);madd(new THREE.BoxGeometry(.5,.38,.4),WH,0,.5,.42);madd(new THREE.BoxGeometry(.42,.16,.8),WH,0,.28,.02);madd(new THREE.BoxGeometry(.48,.2,.22),WH,0,.72,.3);
  const nk=new THREE.Group();nk.position.set(0,.76,.34);nk.rotation.x=-.28;dogModel.add(nk);madd(new THREE.BoxGeometry(.38,.36,.36),BK,0,.12,0,nk);madd(new THREE.BoxGeometry(.34,.36,.34),WH,0,.12,.03,nk);
  const hG=new THREE.Group();hG.position.set(0,1.08,.5);hG.rotation.x=.08;dogModel.add(hG);
  madd(new THREE.BoxGeometry(.46,.44,.5),BK,0,0,0,hG);madd(new THREE.BoxGeometry(.1,.4,.48),WH,0,.04,.01,hG);
  const mz=new THREE.Group();mz.position.set(0,-.06,.28);hG.add(mz);madd(new THREE.BoxGeometry(.28,.22,.32),WH,0,0,0,mz);const nm=madd(new THREE.SphereGeometry(.075,10,8),NS,0,.06,.17,mz);nm.scale.set(1,.65,.85);madd(new THREE.BoxGeometry(.2,.04,.04),NS,0,-.07,.17,mz);
  [-1,1].forEach(sd=>{const eg=new THREE.Group();eg.position.set(sd*.17,.1,.22);hG.add(eg);madd(new THREE.SphereGeometry(.082,10,10),EY,0,0,0,eg);madd(new THREE.SphereGeometry(.028,7,7),EH,.02*sd,.03,.07,eg);madd(new THREE.SphereGeometry(.035,7,7),BR,sd*.17,.2,.23,hG);const eG=new THREE.Group();eG.position.set(sd*.22,.2,-.08);eG.rotation.z=sd*.12;eG.rotation.x=-.1;hG.add(eG);const oe=new THREE.Mesh(new THREE.CylinderGeometry(.01,.14,.38,4),BK);oe.position.y=.19;oe.castShadow=true;eG.add(oe);const ie=new THREE.Mesh(new THREE.CylinderGeometry(.005,.09,.3,4),mmat(0xffd8d0,.9));ie.position.set(0,.17,.02);eG.add(ie);});
  const tG=new THREE.Group();tG.position.set(0,.6,-.56);tG.rotation.x=.55;dogModel.add(tG);dogTail=tG;const t1=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.35,8),BK);t1.position.y=.17;t1.castShadow=true;tG.add(t1);
  addLegs(BK,WH,s);[0,1,2,3].forEach(i=>madd(new THREE.BoxGeometry(.13,.12,.13),WH,0,-.56,0,dogLegs[i].node));dogModel.position.y=0.25;
}
function buildZippo(){
  const s=1,BK=mmat(0x0d0d12,.86,.06),WH=mmat(0xf0f0f0,.8),TN=mmat(0xc26a18,.78,.02),NS=mmat(0x100808,.38,.04),EY=mmat(0x2a1800,.12,.08);
  const EH=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.05,emissive:new THREE.Color(0xcccccc)});
  madd(new THREE.BoxGeometry(.54,.5,1.1),BK,0,.5,0);madd(new THREE.BoxGeometry(.5,.36,.38),WH,0,.5,.43);madd(new THREE.BoxGeometry(.46,.18,.24),WH,0,.72,.3);madd(new THREE.BoxGeometry(.4,.14,.75),WH,0,.28,.02);
  [-1,1].forEach(sd=>madd(new THREE.BoxGeometry(.06,.36,.6),TN,sd*.27,.52,-.08));
  const nk=new THREE.Group();nk.position.set(0,.76,.34);nk.rotation.x=-.28;dogModel.add(nk);madd(new THREE.BoxGeometry(.38,.36,.36),BK,0,.12,0,nk);madd(new THREE.BoxGeometry(.34,.36,.34),WH,0,.12,.03,nk);
  const hG=new THREE.Group();hG.position.set(0,1.08,.5);hG.rotation.x=.08;dogModel.add(hG);madd(new THREE.BoxGeometry(.46,.44,.5),BK,0,0,0,hG);madd(new THREE.BoxGeometry(.12,.42,.48),WH,0,.04,.01,hG);
  [-1,1].forEach(sd=>{madd(new THREE.SphereGeometry(.06,8,8),TN,sd*.15,.18,.25,hG);madd(new THREE.BoxGeometry(.07,.16,.18),TN,sd*.22,-.02,.22,hG);});
  const mz=new THREE.Group();mz.position.set(0,-.06,.28);hG.add(mz);madd(new THREE.BoxGeometry(.28,.22,.32),WH,0,0,0,mz);const nm=madd(new THREE.SphereGeometry(.075,10,8),NS,0,.06,.17,mz);nm.scale.set(1,.65,.85);madd(new THREE.BoxGeometry(.2,.04,.04),NS,0,-.07,.17,mz);
  [-1,1].forEach(sd=>{const eg=new THREE.Group();eg.position.set(sd*.17,.1,.22);hG.add(eg);madd(new THREE.SphereGeometry(.082,10,10),EY,0,0,0,eg);madd(new THREE.SphereGeometry(.028,7,7),EH,.02*sd,.03,.07,eg);});
  [-1,1].forEach(sd=>{const eG=new THREE.Group();eG.position.set(sd*.22,.2,-.08);eG.rotation.z=sd*.1;hG.add(eG);if(sd===-1){const oe=new THREE.Mesh(new THREE.CylinderGeometry(.01,.14,.38,4),BK);oe.position.y=.19;oe.castShadow=true;eG.add(oe);const ie=new THREE.Mesh(new THREE.CylinderGeometry(.005,.09,.3,4),mmat(0xffd8d0,.9));ie.position.set(0,.17,.02);eG.add(ie);}else{const ba=new THREE.Mesh(new THREE.BoxGeometry(.13,.2,.11),BK);ba.position.y=.1;ba.castShadow=true;eG.add(ba);const tpG=new THREE.Group();tpG.position.y=.2;tpG.rotation.x=.95;tpG.rotation.z=sd*.15;eG.add(tpG);const to=new THREE.Mesh(new THREE.CylinderGeometry(.01,.1,.22,4),BK);to.position.y=.11;to.castShadow=true;tpG.add(to);const ti=new THREE.Mesh(new THREE.CylinderGeometry(.005,.06,.17,4),mmat(0xffd8d0,.9));ti.position.set(0,.1,.02);tpG.add(ti);}});
  const tG=new THREE.Group();tG.position.set(0,.6,-.56);tG.rotation.x=.55;dogModel.add(tG);dogTail=tG;const t1=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.35,8),BK);t1.position.y=.17;t1.castShadow=true;tG.add(t1);
  addLegs(BK,WH,s);[0,1,2,3].forEach(i=>madd(new THREE.BoxGeometry(.13,.12,.13),WH,0,-.56,0,dogLegs[i].node));[2,3].forEach(i=>madd(new THREE.BoxGeometry(.09,.2,.09),TN,0,-.36,0,dogLegs[i].node));dogModel.position.y=dogModel._baseY=0.25;
}
function buildMomo(){
  const s=.58,WH=mmat(0xf5f5f2,.78),CR=mmat(0xeee4cc,.82),NS=mmat(0x1a0a0a,.4,.04),EY=mmat(0x1a1a24,.1,.12);
  const EH=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.05,emissive:new THREE.Color(0xcccccc)}),PK=mmat(0xffb8c0,.88),LP=mmat(0xcc8890,.85);
  madd(new THREE.BoxGeometry(.42*s,.44*s,.88*s),WH,0,.44*s,0);madd(new THREE.BoxGeometry(.4*s,.36*s,.32*s),WH,0,.46*s,.36*s);madd(new THREE.BoxGeometry(.34*s,.14*s,.62*s),CR,0,.26*s,0);
  const nk=new THREE.Group();nk.position.set(0,.72*s,.28*s);nk.rotation.x=-.22;dogModel.add(nk);madd(new THREE.BoxGeometry(.32*s,.28*s,.3*s),WH,0,.1*s,0,nk);
  const hG=new THREE.Group();hG.position.set(0,1*s,.4*s);hG.rotation.x=.06;dogModel.add(hG);const sk=new THREE.Mesh(new THREE.SphereGeometry(.26*s,12,10),WH);sk.scale.set(1,1.05,.95);sk.castShadow=true;hG.add(sk);madd(new THREE.BoxGeometry(.2*s,.08*s,.1*s),WH,0,-.06*s,.2*s,hG);
  const mz=new THREE.Group();mz.position.set(0,-.1*s,.22*s);hG.add(mz);madd(new THREE.BoxGeometry(.2*s,.16*s,.22*s),WH,0,0,0,mz);const nm=madd(new THREE.SphereGeometry(.055*s,10,8),NS,0,.06*s,.12*s,mz);nm.scale.set(1,.65,.8);madd(new THREE.BoxGeometry(.12*s,.03*s,.03*s),LP,0,-.06*s,.12*s,mz);
  [-1,1].forEach(sd=>{const eg=new THREE.Group();eg.position.set(sd*.13*s,.06*s,.2*s);hG.add(eg);madd(new THREE.SphereGeometry(.096*s,12,12),EY,0,0,0,eg);madd(new THREE.SphereGeometry(.032*s,8,8),EH,.02*sd,.04*s,.09*s,eg);madd(new THREE.SphereGeometry(.016*s,6,6),EH,-.03*sd,-.02*s,.09*s,eg);});
  [-1,1].forEach(sd=>{const eG=new THREE.Group();eG.position.set(sd*.22*s,.1*s,-.05*s);eG.rotation.z=sd*.45;eG.rotation.x=-.12;hG.add(eG);const oe=new THREE.Mesh(new THREE.CylinderGeometry(.005*s,.18*s,.5*s,5),WH);oe.position.y=.25*s;oe.castShadow=true;eG.add(oe);const ie=new THREE.Mesh(new THREE.CylinderGeometry(.003*s,.12*s,.4*s,5),PK);ie.position.set(0,.23*s,.015*s);eG.add(ie);const v=new THREE.Mesh(new THREE.BoxGeometry(.008*s,.28*s,.006*s),mmat(0xcc9090,.9));v.position.set(sd*.03*s,.22*s,.02*s);eG.add(v);});
  const tG=new THREE.Group();tG.position.set(0,.52*s,-.44*s);tG.rotation.x=.8;dogModel.add(tG);dogTail=tG;const t1=new THREE.Mesh(new THREE.CylinderGeometry(.055*s,.04*s,.25*s,8),CR);t1.position.y=.12*s;t1.castShadow=true;tG.add(t1);
  addLegs(WH,CR,s);dogModel.position.y=dogModel._baseY=0.145;
}
function buildPlayer(){
  if(PB){
    PB.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
    // הסר מהסצנה הנכונה
    if(CITY.inCity&&cityScene)cityScene.remove(PB);
    else if(VILLA&&VILLA.inVilla&&mosqueScene)mosqueScene.remove(PB);
    else scene.remove(PB);
  }
  PB=new THREE.Group();dogModel=new THREE.Group();dogLegs=[];dogTail=null;
  dogModel.rotation.y=Math.PI;PB.add(dogModel);
  if(G.dog==='colin')buildColin();else if(G.dog==='zippo')buildZippo();else buildMomo();
  PB.position.set(0,0,60);
  PB.castShadow=true;
  // הוסף לסצנה הנכונה
  if(CITY.inCity&&cityScene){cityScene.add(PB);PB.position.set(CITY.playerX,0,CITY.playerZ);}
  else if(VILLA&&VILLA.inVilla&&mosqueScene){mosqueScene.add(PB);}
  else{scene.add(PB);}
}

// ════════════════════════════════════════════════
// ENEMIES & BOSS
// ════════════════════════════════════════════════
// ── מודל אויב: כלב רחוב רזה וצרוד עם צלקות ──
function mkEnemy(col,sz){
  const g=new THREE.Group();
  const mt=new THREE.MeshLambertMaterial({color:col});
  const sc=new THREE.MeshLambertMaterial({color:dk(col,.55)});  // צלקות כהות
  const eyM=new THREE.MeshLambertMaterial({color:0xcc1100,emissive:0x440000}); // עיניים אדומות
  // גוף רזה ומוארך
  const b=new THREE.Mesh(new THREE.BoxGeometry(.44*sz,.42*sz,1.2*sz),mt);
  b.position.y=.6*sz; g.add(b);
  // צלעות נראות — גוף רזה
  [-1,0,1].forEach(i=>{const rib=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.06*sz,.06*sz),sc);rib.position.set(0,.52*sz+i*.12*sz,.1*sz);g.add(rib);});
  // צוואר דק
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.12*sz,.16*sz,.28*sz,6),mt);
  nk.position.set(0,.78*sz,.5*sz); nk.rotation.x=-.28; g.add(nk);
  // ראש זוויתי ואיום
  const h=new THREE.Mesh(new THREE.BoxGeometry(.52*sz,.44*sz,.52*sz),mt);
  h.position.set(0,1.0*sz,.8*sz); g.add(h);
  // לסת תחתונה בולטת
  const jaw=new THREE.Mesh(new THREE.BoxGeometry(.44*sz,.16*sz,.38*sz),sc);
  jaw.position.set(0,.82*sz,.96*sz); g.add(jaw);
  // חרטום קצר
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.18*sz,.3*sz),sc);
  sn.position.set(0,.9*sz,1.06*sz); g.add(sn);
  // שיניים — בולטות ומאיימות
  [-1,0,1].forEach(i=>{const t=new THREE.Mesh(new THREE.BoxGeometry(.05*sz,.1*sz,.05*sz),new THREE.MeshLambertMaterial({color:0xddddbb}));t.position.set(i*.1*sz,.78*sz,1.12*sz);g.add(t);});
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.06*sz,5,4),new THREE.MeshLambertMaterial({color:0x080404}));
  nose.scale.set(1,.65,.75); nose.position.set(0,.94*sz,1.2*sz); g.add(nose);
  // אוזניים שטוחות לאחור — תוקפניות
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.08*sz,.18*sz,.16*sz),sc);
    ear.position.set(s*.28*sz,1.24*sz,.65*sz); ear.rotation.z=s*.6; ear.rotation.x=.3; g.add(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.07*sz,6,5),eyM);
    eye.position.set(s*.2*sz,1.04*sz,1.06*sz); g.add(eye);
    // צלקת על הפנים
    const scar=new THREE.Mesh(new THREE.BoxGeometry(.02*sz,.14*sz,.02*sz),sc);
    scar.position.set(s*.18*sz,.98*sz,1.1*sz); scar.rotation.z=s*.4; g.add(scar);
  });
  // רגליים רזות
  [[.18,.3],[-.18,.3],[.18,-.34],[-.18,-.34]].forEach(([ex,ez])=>{
    const lg=new THREE.Group(); lg.position.set(ex*sz,.6*sz,ez*sz); g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.13*sz,.36*sz,.13*sz),mt); up.position.y=-.18*sz; lg.add(up);
    const knee=new THREE.Group(); knee.position.y=-.36*sz; lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.11*sz,.32*sz,.11*sz),mt); lo.position.y=-.16*sz; knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.16*sz,.08*sz,.2*sz),sc); pw.position.set(0,-.33*sz,.03*sz); knee.add(pw);
  });
  // זנב מורד — פחדן/תוקפני
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.04*sz,.03*sz,.3*sz,5),mt);
  tl.position.set(0,.62*sz,-.62*sz); tl.rotation.x=.9; g.add(tl);
  g.position.y=0.13*sz;
  return g;
}

// ── מודל NPC: בלה הזקנה — גוף עגול, אוזניים ארוכות ══
function mkBella(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0x9a7a5a}); // חום-אפור
  const wh=new THREE.MeshLambertMaterial({color:0xf0ece0});  // לבן-שמנת (פרווה בטן)
  const eyM=new THREE.MeshLambertMaterial({color:0x2a1800});
  const nose=new THREE.MeshLambertMaterial({color:0x1a0a0a});
  // גוף עגול ושמן
  const b=new THREE.Mesh(new THREE.SphereGeometry(.42*sz,10,8),fur);
  b.scale.set(1,.8,1.3); b.position.y=.6*sz; g.add(b);
  // בטן לבנה בולטת
  const bel=new THREE.Mesh(new THREE.SphereGeometry(.36*sz,8,6),wh);
  bel.scale.set(1,.6,1.1); bel.position.set(0,.52*sz,.1*sz); g.add(bel);
  // צוואר קצר ועבה
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.2*sz,.22*sz,.2*sz,7),fur);
  nk.position.set(0,.9*sz,.36*sz); nk.rotation.x=-.2; g.add(nk);
  // ראש עגול
  const h=new THREE.Mesh(new THREE.SphereGeometry(.3*sz,10,8),fur);
  h.scale.set(1,1.05,.95); h.position.set(0,1.12*sz,.62*sz); g.add(h);
  // לחיים לבנות
  [-1,1].forEach(s=>{const ch=new THREE.Mesh(new THREE.SphereGeometry(.14*sz,8,6),wh);ch.position.set(s*.18*sz,1.08*sz,.76*sz);g.add(ch);});
  // חטם
  const sn=new THREE.Mesh(new THREE.SphereGeometry(.1*sz,8,6),wh);sn.position.set(0,1.02*sz,.88*sz);sn.scale.set(1,.7,.9);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.06*sz,5,4),nose);ns.scale.set(1,.65,.75);ns.position.set(0,1.06*sz,.94*sz);g.add(ns);
  // עיניים חמות וקמוטות
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.072*sz,6,5),eyM);eye.position.set(s*.18*sz,1.14*sz,.88*sz);g.add(eye);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(.02*sz,4,4),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));shine.position.set(s*.18*sz+.01*sz,1.16*sz,.94*sz);g.add(shine);
    // קמטים מתחת לעיניים
    const wrinkle=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.01*sz,.02*sz),new THREE.MeshLambertMaterial({color:dk(0x9a7a5a,.75)}));wrinkle.position.set(s*.18*sz,1.08*sz,.9*sz);g.add(wrinkle);
  });
  // אוזניים ארוכות ותלויות — מאפיין בלה
  [-1,1].forEach(s=>{
    const earG=new THREE.Group();earG.position.set(s*.26*sz,1.2*sz,.58*sz);earG.rotation.z=s*.3;g.add(earG);
    const earTop=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.1*sz,.14*sz),fur);earTop.position.y=0;earG.add(earTop);
    const earLong=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.42*sz,.1*sz),new THREE.MeshLambertMaterial({color:dk(0x9a7a5a,.88)}));earLong.position.y=-.22*sz;earG.add(earLong);
    const earTip=new THREE.Mesh(new THREE.SphereGeometry(.06*sz,6,4),fur);earTip.position.y=-.44*sz;earG.add(earTip);
  });
  // 4 רגליים קצרות
  [[.16,.22],[-.16,.22],[.16,-.28],[-.16,-.28]].forEach(([ex,ez])=>{
    const lg=new THREE.Group(); lg.position.set(ex*sz,.54*sz,ez*sz); g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.28*sz,.14*sz),fur); up.position.y=-.14*sz; lg.add(up);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.08*sz,.22*sz),wh); pw.position.set(0,-.3*sz,.02*sz); lg.add(pw);
  });
  // זנב מסולסל
  const tl=new THREE.Mesh(new THREE.TorusGeometry(.12*sz,.04*sz,5,8,Math.PI*1.3),fur);
  tl.position.set(0,.72*sz,-.48*sz);tl.rotation.x=-.4;tl.rotation.z=.3;g.add(tl);
  g.position.y=-0.2*sz;
  return g;
}

// ── מודל NPC: שוקי — כלב מעורב שמח ──
function mkShuki(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0xd4883a}); // כתום-חום
  const wh=new THREE.MeshLambertMaterial({color:0xf5f0e8});
  const eyM=new THREE.MeshLambertMaterial({color:0x1a1000});
  // גוף בינוני, שמח
  const b=new THREE.Mesh(new THREE.BoxGeometry(.5*sz,.46*sz,1.1*sz),fur);b.position.y=.62*sz;g.add(b);
  // חזה לבן
  const chest=new THREE.Mesh(new THREE.BoxGeometry(.42*sz,.38*sz,.36*sz),wh);chest.position.set(0,.58*sz,.42*sz);g.add(chest);
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.16*sz,.2*sz,.28*sz,7),fur);nk.position.set(0,.84*sz,.5*sz);nk.rotation.x=-.28;g.add(nk);
  const h=new THREE.Mesh(new THREE.BoxGeometry(.6*sz,.54*sz,.56*sz),fur);h.position.set(0,1.1*sz,.78*sz);g.add(h);
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.34*sz,.22*sz,.36*sz),wh);sn.position.set(0,.96*sz,1.06*sz);g.add(sn);
  // לשון בחוץ — שמח
  const tongue=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.04*sz,.16*sz),new THREE.MeshLambertMaterial({color:0xff7788}));tongue.position.set(0,.84*sz,1.16*sz);tongue.rotation.x=.3;g.add(tongue);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.072*sz,6,5),new THREE.MeshLambertMaterial({color:0x080404}));ns.scale.set(1,.65,.75);ns.position.set(0,1.0*sz,1.26*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים שעומדות למחצה — משועשע
    const earG=new THREE.Group();earG.position.set(s*.28*sz,1.34*sz,.68*sz);earG.rotation.z=s*.2;earG.rotation.x=-.1;g.add(earG);
    const earB=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.26*sz,.12*sz),fur);earB.position.y=.13*sz;earG.add(earB);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.078*sz,6,5),eyM);eye.position.set(s*.22*sz,1.14*sz,1.05*sz);g.add(eye);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(.022*sz,4,4),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));shine.position.set(s*.22*sz+.01*sz,1.16*sz,1.11*sz);g.add(shine);
  });
  [[.2,.3],[-.2,.3],[.2,-.34],[-.2,-.34]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.62*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.15*sz,.36*sz,.14*sz),fur);up.position.y=-.18*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.36*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.32*sz,.12*sz),fur);lo.position.y=-.16*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.08*sz,.22*sz),wh);pw.position.set(0,-.34*sz,.03*sz);knee.add(pw);
  });
  // זנב מורם ומנופנף
  const tlG=new THREE.Group();tlG.position.set(0,.68*sz,-.52*sz);tlG.rotation.x=-.7;g.add(tlG);
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.055*sz,.04*sz,.36*sz,6),fur);tl.position.y=.18*sz;tlG.add(tl);
  g.position.y=0.12*sz;
  return g;
}

// ── מודל NPC: בוקסר — כלב גדול שרירי ──
function mkBoxer(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0xb06030});
  const blk=new THREE.MeshLambertMaterial({color:0x1a0808}); // פרצוף שחור
  const eyM=new THREE.MeshLambertMaterial({color:0x1a1000});
  // גוף שרירי ורחב
  const b=new THREE.Mesh(new THREE.BoxGeometry(.64*sz,.52*sz,1.2*sz),fur);b.position.y=.68*sz;g.add(b);
  // חזה שרירי
  const chest=new THREE.Mesh(new THREE.SphereGeometry(.3*sz,8,6),fur);chest.scale.set(1.1,1,.8);chest.position.set(0,.72*sz,.44*sz);g.add(chest);
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.22*sz,.26*sz,.32*sz,7),fur);nk.position.set(0,.94*sz,.54*sz);nk.rotation.x=-.28;g.add(nk);
  // ראש שטוח ורחב — בוקסר
  const h=new THREE.Mesh(new THREE.BoxGeometry(.72*sz,.52*sz,.5*sz),fur);h.position.set(0,1.16*sz,.82*sz);g.add(h);
  // פרצוף שחור בולט
  const face=new THREE.Mesh(new THREE.BoxGeometry(.62*sz,.44*sz,.28*sz),blk);face.position.set(0,1.1*sz,.96*sz);g.add(face);
  // חטם שטוח מאוד
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.42*sz,.24*sz,.16*sz),blk);sn.position.set(0,1.0*sz,1.08*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.08*sz,6,5),new THREE.MeshLambertMaterial({color:0x0a0404}));ns.scale.set(1.3,.6,.6);ns.position.set(0,1.06*sz,1.14*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים קטנות ומקופלות
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.12*sz,.14*sz),fur);ear.position.set(s*.36*sz,1.38*sz,.78*sz);ear.rotation.z=s*.1;ear.rotation.x=.2;g.add(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.08*sz,6,5),eyM);eye.position.set(s*.24*sz,1.14*sz,1.04*sz);g.add(eye);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(.024*sz,4,4),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));shine.position.set(s*.24*sz+.01*sz,1.16*sz,1.1*sz);g.add(shine);
  });
  [[.22,.32],[-.22,.32],[.22,-.36],[-.22,-.36]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.68*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.38*sz,.18*sz),fur);up.position.y=-.19*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.38*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.15*sz,.34*sz,.15*sz),fur);lo.position.y=-.17*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.22*sz,.1*sz,.26*sz),blk);pw.position.set(0,-.36*sz,.03*sz);knee.add(pw);
  });
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.05*sz,.04*sz,.2*sz,5),fur);
  tl.position.set(0,.72*sz,-.62*sz);tl.rotation.x=.8;g.add(tl);
  g.position.y=0.11*sz;
  return g;
}

// ── מודל NPC: לולה — כלבה גבוהה ואלגנטית ──
function mkLola(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0xd4b890}); // שמנת-זהב
  const acc=new THREE.MeshLambertMaterial({color:0xf5c518}); // עיטור זהב
  const eyM=new THREE.MeshLambertMaterial({color:0x0a0a20,emissive:0x000022});
  // גוף גבוה ורזה
  const b=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.5*sz,1.18*sz),fur);b.position.y=.72*sz;g.add(b);
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.15*sz,.18*sz,.38*sz,8),fur);nk.position.set(0,.96*sz,.54*sz);nk.rotation.x=-.22;g.add(nk);
  // קולר זהב
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.19*sz,.19*sz,.1*sz,12),acc);collar.position.set(0,.88*sz,.54*sz);g.add(collar);
  // ראש עדין
  const h=new THREE.Mesh(new THREE.SphereGeometry(.28*sz,10,8),fur);h.scale.set(1,1.08,.96);h.position.set(0,1.24*sz,.78*sz);g.add(h);
  // חטם מוארך אלגנטי
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.22*sz,.16*sz,.38*sz),fur);sn.position.set(0,1.1*sz,.98*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.06*sz,6,5),new THREE.MeshLambertMaterial({color:0x180808}));ns.scale.set(1,.65,.75);ns.position.set(0,1.14*sz,1.16*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים גדולות ועומדות
    const earG=new THREE.Group();earG.position.set(s*.26*sz,1.38*sz,.7*sz);earG.rotation.z=s*.08;g.add(earG);
    const earB=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.32*sz,.08*sz),fur);earB.position.y=.16*sz;earG.add(earB);
    const earT=new THREE.Mesh(new THREE.ConeGeometry(.06*sz,.12*sz,5),fur);earT.position.y=.34*sz;earG.add(earT);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.082*sz,8,6),eyM);eye.position.set(s*.2*sz,1.26*sz,1.02*sz);g.add(eye);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(.024*sz,4,4),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xaaaaaa}));shine.position.set(s*.2*sz+.012*sz,1.28*sz,1.08*sz);g.add(shine);
  });
  // רגליים ארוכות ודקות
  [[.18,.3],[-.18,.3],[.18,-.34],[-.18,-.34]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.72*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.44*sz,.12*sz),fur);up.position.y=-.22*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.44*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.4*sz,.1*sz),fur);lo.position.y=-.2*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.08*sz,.18*sz),new THREE.MeshLambertMaterial({color:dk(0xd4b890,.85)}));pw.position.set(0,-.42*sz,.02*sz);knee.add(pw);
  });
  // זנב ארוך ומנופף
  const tlG=new THREE.Group();tlG.position.set(0,.78*sz,-.56*sz);tlG.rotation.x=-.6;tlG.rotation.z=.2;g.add(tlG);
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.044*sz,.028*sz,.5*sz,6),fur);tl.position.y=.25*sz;tlG.add(tl);
  g.position.y=0.18*sz;
  return g;
}

// ── מודל NPC: פישקה — כלב קטן ומגושם ──
function mkFishka(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0x888888}); // אפור
  const wh=new THREE.MeshLambertMaterial({color:0xdddddd});
  const eyM=new THREE.MeshLambertMaterial({color:0x0a1a0a});
  // גוף קצר ועגול
  const b=new THREE.Mesh(new THREE.SphereGeometry(.38*sz,9,7),fur);b.scale.set(1,.82,1.2);b.position.y=.56*sz;g.add(b);
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.18*sz,.2*sz,.22*sz,7),fur);nk.position.set(0,.82*sz,.36*sz);nk.rotation.x=-.2;g.add(nk);
  const h=new THREE.Mesh(new THREE.SphereGeometry(.28*sz,9,7),fur);h.position.set(0,1.06*sz,.6*sz);g.add(h);
  // לחיים שמנות
  [-1,1].forEach(s=>{const ch=new THREE.Mesh(new THREE.SphereGeometry(.12*sz,7,5),wh);ch.position.set(s*.2*sz,1.0*sz,.72*sz);g.add(ch);});
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.28*sz,.2*sz,.28*sz),wh);sn.position.set(0,.96*sz,.84*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.06*sz,5,4),new THREE.MeshLambertMaterial({color:0x0a0a0a}));ns.scale.set(1,.65,.75);ns.position.set(0,1.0*sz,.98*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים גדולות ומוצבות לצד
    const earG=new THREE.Group();earG.position.set(s*.3*sz,1.2*sz,.54*sz);earG.rotation.z=s*.5;g.add(earG);
    const earB=new THREE.Mesh(new THREE.BoxGeometry(.08*sz,.28*sz,.1*sz),fur);earB.position.y=-.14*sz;earG.add(earB);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.08*sz,6,5),eyM);eye.position.set(s*.2*sz,1.08*sz,.86*sz);g.add(eye);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(.022*sz,4,4),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));shine.position.set(s*.2*sz+.01*sz,1.1*sz,.92*sz);g.add(shine);
  });
  // רגליים קצרות מאוד
  [[.16,.2],[-.16,.2],[.16,-.26],[-.16,-.26]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.56*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.3*sz,.14*sz),fur);up.position.y=-.15*sz;lg.add(up);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.08*sz,.22*sz),wh);pw.position.set(0,-.32*sz,.02*sz);lg.add(pw);
  });
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.05*sz,.038*sz,.32*sz,6),fur);tl.position.set(0,.64*sz,-.46*sz);tl.rotation.x=.5;tl.rotation.z=.3;g.add(tl);
  g.position.y=-0.2*sz;
  return g;
}

// ── מודל בוס: ג'ק הרוטווילר — ענק, שרירי, עם כולר קוצים ──
function mkJack(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0x0d0908}); // שחור כמעט
  const tan=new THREE.MeshLambertMaterial({color:0x8a5a20}); // חום-שזוף
  const eyM=new THREE.MeshLambertMaterial({color:0xdd2200,emissive:0x660000}); // עיניים אדומות
  const metal=new THREE.MeshStandardMaterial({color:0x666660,roughness:.3,metalness:.8});
  // גוף ענק ושרירי
  const b=new THREE.Mesh(new THREE.BoxGeometry(.78*sz,.62*sz,1.55*sz),fur);b.position.y=.78*sz;g.add(b);
  // שרירי חזה בולטים
  const chest=new THREE.Mesh(new THREE.SphereGeometry(.38*sz,8,6),fur);chest.scale.set(1.15,1,.7);chest.position.set(0,.9*sz,.56*sz);g.add(chest);
  // סימנים חום-שזוף (ס׳ רוטווילר)
  const chest2=new THREE.Mesh(new THREE.BoxGeometry(.6*sz,.4*sz,.3*sz),tan);chest2.position.set(0,.76*sz,.64*sz);g.add(chest2);
  [-1,1].forEach(s=>{const cheek=new THREE.Mesh(new THREE.BoxGeometry(.22*sz,.24*sz,.26*sz),tan);cheek.position.set(s*.28*sz,.72*sz,.18*sz);g.add(cheek);});
  // צוואר עבה כמו בול
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.28*sz,.34*sz,.36*sz,8),fur);nk.position.set(0,1.02*sz,.6*sz);nk.rotation.x=-.22;g.add(nk);
  // כולר קוצים!
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.36*sz,.36*sz,.14*sz,14),new THREE.MeshLambertMaterial({color:0x1a1a1a}));collar.position.set(0,1.0*sz,.62*sz);g.add(collar);
  for(let i=0;i<12;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.04*sz,.12*sz,4),metal);const a=i/12*Math.PI*2;spike.position.set(Math.sin(a)*.36*sz,1.0*sz,.62*sz+Math.cos(a)*.36*sz);spike.rotation.z=Math.sin(a)*Math.PI/2;spike.rotation.x=-Math.cos(a)*Math.PI/2;g.add(spike);}
  // ראש מסיבי ומאיים
  const h=new THREE.Mesh(new THREE.BoxGeometry(.82*sz,.66*sz,.62*sz),fur);h.position.set(0,1.3*sz,.98*sz);g.add(h);
  // לסת תחתונה כבדה
  const jaw=new THREE.Mesh(new THREE.BoxGeometry(.72*sz,.22*sz,.54*sz),fur);jaw.position.set(0,1.04*sz,1.12*sz);g.add(jaw);
  // סימנים חום על הפנים
  [-1,1].forEach(s=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.26*sz,.1*sz),tan);m.position.set(s*.28*sz,1.24*sz,1.04*sz);g.add(m);});
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.28*sz,.28*sz),fur);sn.position.set(0,1.14*sz,1.24*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.1*sz,6,5),new THREE.MeshLambertMaterial({color:0x0a0404}));ns.scale.set(1.3,.7,.8);ns.position.set(0,1.2*sz,1.38*sz);g.add(ns);
  // שיניים חשופות
  [-1,0,1].forEach(i=>{const t=new THREE.Mesh(new THREE.BoxGeometry(.07*sz,.14*sz,.07*sz),new THREE.MeshLambertMaterial({color:0xccccaa}));t.position.set(i*.14*sz,1.04*sz,1.38*sz);g.add(t);});
  [-1,1].forEach(s=>{
    // אוזניים מקוצצות (קצרות) — רוטווילר
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.12*sz,.14*sz),fur);ear.position.set(s*.4*sz,1.56*sz,.9*sz);ear.rotation.z=s*.08;g.add(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.094*sz,7,6),eyM);eye.position.set(s*.3*sz,1.32*sz,1.24*sz);g.add(eye);
    const scar=new THREE.Mesh(new THREE.BoxGeometry(.02*sz,.22*sz,.03*sz),new THREE.MeshLambertMaterial({color:0x4a1a00}));scar.position.set(s*.32*sz,1.26*sz,1.28*sz);scar.rotation.z=s*.3;g.add(scar);
  });
  // רגליים עבות כמו עמודים
  [[.26,.38],[-.26,.38],[.26,-.42],[-.26,-.42]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.78*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.22*sz,.46*sz,.22*sz),fur);up.position.y=-.23*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.46*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.42*sz,.18*sz),fur);lo.position.y=-.21*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.26*sz,.12*sz,.3*sz),new THREE.MeshLambertMaterial({color:dk(0x0d0908,.7)}));pw.position.set(0,-.44*sz,.04*sz);knee.add(pw);
    // ציפורניים
    [-1,0,1].forEach(i=>{const claw=new THREE.Mesh(new THREE.ConeGeometry(.03*sz,.08*sz,4),metal);claw.position.set(i*.08*sz,-.52*sz,.14*sz);claw.rotation.x=-.5;knee.add(claw);});
  });
  // זנב קצר (ג'ק הרוטווילר — זנב מקוצץ)
  const tl=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.1*sz,.14*sz),fur);tl.position.set(0,.82*sz,-.8*sz);g.add(tl);
  g.position.y=0.18*sz;
  return g;
}

// ── מודל בוס: ברונו הדוברמן — שחור, חד, מהיר ──
function mkBruno(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0x070508}); // שחור עמוק
  const rust=new THREE.MeshLambertMaterial({color:0x8b3a10}); // חלודה-חום
  const eyM=new THREE.MeshLambertMaterial({color:0xff4400,emissive:0xaa1100});
  const metal=new THREE.MeshLambertMaterial({color:0x888880});
  // גוף ארוך ורזה — דוברמן
  const b=new THREE.Mesh(new THREE.BoxGeometry(.56*sz,.52*sz,1.5*sz),fur);b.position.y=.78*sz;g.add(b);
  // פרווה חלודה בחזה ובטן
  const chest=new THREE.Mesh(new THREE.BoxGeometry(.44*sz,.36*sz,.4*sz),rust);chest.position.set(0,.82*sz,.58*sz);g.add(chest);
  const belly=new THREE.Mesh(new THREE.BoxGeometry(.38*sz,.2*sz,.9*sz),rust);belly.position.set(0,.6*sz,.08*sz);g.add(belly);
  // צוואר ארוך ומוצק
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.2*sz,.24*sz,.42*sz,8),fur);nk.position.set(0,1.04*sz,.64*sz);nk.rotation.x=-.25;g.add(nk);
  // שרשרת ברזל
  for(let i=0;i<8;i++){const link=new THREE.Mesh(new THREE.TorusGeometry(.08*sz,.025*sz,4,8),metal);const a=i/8*Math.PI*2;link.position.set(Math.sin(a)*.22*sz,1.04*sz,.64*sz+Math.cos(a)*.22*sz);link.rotation.y=a;g.add(link);}
  // ראש חד ומוארך — דוברמן
  const h=new THREE.Mesh(new THREE.BoxGeometry(.62*sz,.58*sz,.58*sz),fur);h.position.set(0,1.3*sz,.96*sz);g.add(h);
  // פרצוף חלודה
  const face=new THREE.Mesh(new THREE.BoxGeometry(.5*sz,.46*sz,.2*sz),rust);face.position.set(0,1.24*sz,1.08*sz);g.add(face);
  // חרטום ארוך וחד
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.2*sz,.48*sz),fur);sn.position.set(0,1.12*sz,1.24*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.076*sz,6,5),new THREE.MeshLambertMaterial({color:0x060304}));ns.scale.set(1,.65,.75);ns.position.set(0,1.18*sz,1.48*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים עומדות גבוה — דוברמן
    const earG=new THREE.Group();earG.position.set(s*.28*sz,1.52*sz,.88*sz);earG.rotation.z=s*.05;g.add(earG);
    const earBase=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.1*sz,.1*sz),fur);earBase.position.y=0;earG.add(earBase);
    const earPoint=new THREE.Mesh(new THREE.ConeGeometry(.056*sz,.32*sz,5),fur);earPoint.position.y=.22*sz;earG.add(earPoint);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.088*sz,7,6),eyM);eye.position.set(s*.26*sz,1.32*sz,1.2*sz);g.add(eye);
    const eyeGlow=new THREE.PointLight(0xff3300,.5,1.2*sz);eyeGlow.position.set(s*.26*sz,1.32*sz,1.22*sz);g.add(eyeGlow);
  });
  // רגליים חזקות
  [[.22,.38],[-.22,.38],[.22,-.44],[-.22,-.44]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.78*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.44*sz,.18*sz),fur);up.position.y=-.22*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.44*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.4*sz,.14*sz),fur);lo.position.y=-.2*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.1*sz,.24*sz),rust);pw.position.set(0,-.42*sz,.03*sz);knee.add(pw);
  });
  // זנב מקוצץ — דוברמן
  const tl=new THREE.Mesh(new THREE.BoxGeometry(.08*sz,.08*sz,.12*sz),fur);tl.position.set(0,.84*sz,-.76*sz);g.add(tl);
  g.position.y=0.13*sz;
  return g;
}

// ── מודל שומר מסגד: כלב לבוש, זקוף, עם אפודת מלחמה ──
function mkGuard(sz){
  const g=new THREE.Group();
  const fur=new THREE.MeshLambertMaterial({color:0x2a3a4a}); // אפור-כחלחל כהה
  const vest=new THREE.MeshLambertMaterial({color:0x1a2a1a}); // אפוד כהה
  const eyM=new THREE.MeshLambertMaterial({color:0x880000,emissive:0x330000});
  const metal=new THREE.MeshLambertMaterial({color:0x555550});
  // גוף זקוף ורחב — לביש אפוד
  const b=new THREE.Mesh(new THREE.BoxGeometry(.6*sz,.56*sz,1.28*sz),fur);b.position.y=.7*sz;g.add(b);
  // אפודת מלחמה
  const vestM=new THREE.Mesh(new THREE.BoxGeometry(.64*sz,.52*sz,.6*sz),vest);vestM.position.set(0,.76*sz,.38*sz);g.add(vestM);
  // כיסי אפוד
  [-1,1].forEach(s=>{const pocket=new THREE.Mesh(new THREE.BoxGeometry(.16*sz,.14*sz,.08*sz),new THREE.MeshLambertMaterial({color:0x0e1a0e}));pocket.position.set(s*.22*sz,.68*sz,.68*sz);g.add(pocket);});
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.18*sz,.22*sz,.3*sz,7),fur);nk.position.set(0,.92*sz,.54*sz);nk.rotation.x=-.28;g.add(nk);
  const h=new THREE.Mesh(new THREE.BoxGeometry(.64*sz,.56*sz,.58*sz),fur);h.position.set(0,1.2*sz,.84*sz);g.add(h);
  // קסדה טקטית
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.38*sz,9,7,0,Math.PI*2,0,Math.PI*.6),vest);helmet.scale.set(1,1,.96);helmet.position.set(0,1.5*sz,.84*sz);g.add(helmet);
  const helmetBrim=new THREE.Mesh(new THREE.BoxGeometry(.72*sz,.06*sz,.62*sz),vest);helmetBrim.position.set(0,1.28*sz,.84*sz);g.add(helmetBrim);
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.34*sz,.22*sz,.36*sz),fur);sn.position.set(0,1.04*sz,1.1*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.072*sz,6,5),new THREE.MeshLambertMaterial({color:0x060304}));ns.scale.set(1,.65,.75);ns.position.set(0,1.08*sz,1.28*sz);g.add(ns);
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.08*sz,.22*sz,.18*sz),fur);ear.position.set(s*.34*sz,1.34*sz,.76*sz);ear.rotation.z=s*.16;g.add(ear);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.074*sz,6,5),eyM);eye.position.set(s*.24*sz,1.22*sz,1.12*sz);g.add(eye);
  });
  // רגליים חזקות
  [[.22,.32],[-.22,.32],[.22,-.36],[-.22,-.36]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.7*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.4*sz,.18*sz),fur);up.position.y=-.2*sz;lg.add(up);
    const knee=new THREE.Group();knee.position.y=-.4*sz;lg.add(knee);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.15*sz,.36*sz,.15*sz),fur);lo.position.y=-.18*sz;knee.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.1*sz,.24*sz),vest);pw.position.set(0,-.38*sz,.03*sz);knee.add(pw);
  });
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.05*sz,.038*sz,.32*sz,6),fur);
  tl.position.set(0,.68*sz,-.66*sz);tl.rotation.x=.6;g.add(tl);
  g.position.y=0.13*sz;
  return g;
}

// ── mkDog — שמור לתאימות (פישקה/ברירת מחדל) ──
function mkDog(col,sz){return mkEnemy(col,sz);}
function hpBar(g,w,y){const b=new THREE.Mesh(new THREE.BoxGeometry(w,.18,.01),new THREE.MeshBasicMaterial({color:0xe74c3c}));b.position.set(0,y,0);g.add(b);return b;}
function buildEnemies(){
  // ── 15 מיקומים על פני כל המפה — שכונות שונות ──
  // כל רשומה: [x, z, col, hp, spd, label]
  // הצבע מעיד על הכנופייה: כהה=גשר, חום=דרום, אפור=צפון
  const ENEMY_DEFS=[
    // מרכז — רחוב הרצל / ירושלים
    [-28,  2,   0x1e1e1e, 60, 3.8, 'מרכז'],
    [ 28, -3,   0x1a1408, 60, 4.0, 'מרכז'],
    // שוק לוד — SW
    [-72,  38,  0x2a1808, 70, 3.5, 'שוק'],
    [-58,  44,  0x1e1208, 65, 3.6, 'שוק'],
    // רמת אשכול — צפון
    [ -8, -78,  0x101018, 75, 4.2, 'צפון'],
    [ 22, -68,  0x181824, 70, 4.0, 'צפון'],
    [-42, -80,  0x0c0c1a, 80, 4.5, 'צפון'],  // חזק יותר — רחוק
    // גני אביב — דרום
    [-22, 105,  0x28200a, 55, 3.4, 'דרום'],
    [ 30, 108,  0x24180a, 55, 3.2, 'דרום'],
    [ 55,  88,  0x2a200c, 60, 3.6, 'דרום'],
    // פארק / מזרח
    [ 62, -22,  0x1a2010, 65, 3.8, 'פארק'],
    [ 74,  38,  0x1c2412, 60, 3.5, 'פארק'],
    // תחנת רכבת — דרום רחוק
    [  6,-118,  0x0e0e16, 85, 4.8, 'רכבת'],
    [-58,-124,  0x100c18, 80, 4.6, 'רכבת'],
    // עיר עתיקה
    [-55,  68,  0x201808, 70, 3.7, 'עיר עתיקה'],
  ];

  let placed=0;
  ENEMY_DEFS.forEach(([x,z,col,hp,spd,zone],i)=>{
    // מצא נקודה בטוחה: אם המיקום הספציפי תקוע — נסה offset קטן
    let fx=x,fz=z,ok=false;
    for(const [ox,oz] of [[0,0],[2,0],[-2,0],[0,2],[0,-2],[3,3],[-3,-3]]){
      if(!isInBuilding(x+ox,z+oz,2.5)&&!_isOnRoad(x+ox,z+oz)){fx=x+ox;fz=z+oz;ok=true;break;}
    }
    if(!ok)return; // דלג אם אין מיקום בטוח

    const eg=mkEnemy(col,1);
    eg.position.set(fx,0,fz);
    scene.add(eg);
    const bar=hpBar(eg,1.4,2.3);
    G.enemies.push({
      mesh:eg,
      hp,mhp:hp,
      spd:spd+Math.random()*.5,
      alert:13+Math.floor(i/5)*2,   // אויבים בפריפריה — ראייה קצת גדולה יותר
      atk:2.6,atkT:0,bar,
      homeX:fx,homeZ:fz,
      patAng:Math.random()*Math.PI*2,patT:2,
      state:'patrol',lastSeenX:0,lastSeenZ:0,searchT:0,
      zone,
    });
    placed++;
  });
  // אחריות — אם נכשלנו מתחת ל-7, נשים את הנותרים ב-SPAWN_POOL
  if(placed<7){
    const extras=_SPAWN_POOL.filter(([x,z])=>!isInBuilding(x,z,2)&&!_isOnRoad(x,z));
    for(let i=placed;i<7&&i<placed+extras.length;i++){
      const [x,z]=extras[i-placed];
      const eg=mkEnemy(0x1e1e1e,1);eg.position.set(x,0,z);scene.add(eg);
      const bar=hpBar(eg,1.4,2.3);
      G.enemies.push({mesh:eg,hp:60,mhp:60,spd:3.5,alert:14,atk:2.6,atkT:0,bar,homeX:x,homeZ:z,patAng:Math.random()*Math.PI*2,patT:2,state:'patrol',lastSeenX:0,lastSeenZ:0,searchT:0,zone:'כללי'});
    }
  }
}

// pool של נקודות spawn בטוחות — מדרכות ובלוקים, לא כבישים, לא בניינים
const _SPAWN_POOL=[
  // מרכז
  [-88,13],[-55,13],[-18,13],[70,13],
  [-75,-13],[-42,-13],[52,-13],[88,-13],
  [11,-68],[11,-22],[11,28],[11,72],
  // צפון — רמת אשכול
  [-31,-80],[-31,18],[-31,68],
  [31,-80],[31,18],[31,68],
  [-60,-75],[60,-75],[-20,-38],[20,-38],
  [-8,-72],[22,-62],[42,-85],[-55,-90],
  // דרום — גני אביב
  [-20,38],[20,38],[-60,38],[60,38],
  [-22,105],[30,108],[55,88],[-40,95],[15,95],
  // פארק / מזרח
  [62,-22],[74,38],[80,20],[65,55],
  // שוק לוד
  [-72,38],[-58,44],[-80,60],[-65,65],
  // עיר עתיקה
  [-55,68],[-48,58],[-62,55],
  // תחנת רכבת — דרום רחוק
  [6,-118],[-58,-124],[20,-115],[-30,-120],
];
const _ENEMY_COLS=[0x1e1e1e,0x2a2010,0x181818,0x28200a,0x101018,0x1e1408];

function _respawnEnemy(e){
  if(!scene||!PB) return;
  const px=PB.position.x, pz=PB.position.z;
  // מצא נקודה בטוחה — רחוקה מהשחקן (>28), לא בבניין, לא בכביש
  const candidates=_SPAWN_POOL.filter(([x,z])=>
    d2(x,z,px,pz)>28 && !isInBuilding(x,z,2.5) && !_isOnRoad(x,z)
  );
  if(!candidates.length) return;
  const [nx,nz]=candidates[Math.floor(Math.random()*candidates.length)];
  const col=_ENEMY_COLS[Math.floor(Math.random()*_ENEMY_COLS.length)];
  const eg=mkEnemy(col,1);
  eg.position.set(nx,0,nz);
  scene.add(eg);
  // HP וSPD גדלים עם ההתקדמות
  const scale=1+G.mission*.04;
  const newHp=Math.round(60*scale);
  const bar=hpBar(eg,1.4,2.3);
  e.mesh=eg; e.hp=newHp; e.mhp=newHp; e.bar=bar;
  e.homeX=nx; e.homeZ=nz; e.state='patrol';
  e.spd=(3.5+Math.random()*1.5)*Math.min(1+G.mission*.03,1.6);
  e.mesh.visible=true;
}
function buildBoss(){
  // ג'ק הרוטווילר — ענק עם כולר קוצים
  const bg=mkJack(1.7);bg.position.set(25,0,18);scene.add(bg);
  const bar=hpBar(bg,2.4,3.9);
  G.bosses.push({mesh:bg,hp:200,mhp:200,spd:4,alert:22,atk:3.2,atkT:0,bar,dead:false,phase:1,dashT:4,dashOn:false,dvx:0,dvz:0});
}

// ════════════════════════════════════════════════
// MOSQUE MAP SYSTEM — MGS-style map transition
// ════════════════════════════════════════════════
let mosqueDoorMesh=null,mosqueDoorLocked=false;
let mosqueGuards=[],mosqueCageInd=null,mosqueAlerted=false;
let mosqueScene=null,mosqueCamera=null,mosqueObjects=[],mosqueBlds=[];
const VILLA={  // שמרנו VILLA לתאימות עם שאר הקוד
  inVilla:false,
  playerX:0,playerZ:0,
  playerYaw:0,
  detected:false,
  detectedT:0,
  alertCooldown:0,
  enterGrace:0,
};

// ════════════════════════════════════════════════
// CITY HALL INTERIOR SYSTEM
// ════════════════════════════════════════════════
let cityScene=null,cityCamera=null,cityObjects=[],cityBlds=[];
let cityGuards=[],cityAlerted=false,cityPalto=null,citySafeFound=false,cityBroadcastDone=false;
const CITY={inCity:false,playerX:0,playerZ:0,playerYaw:0,enterGrace:0};

function cmkB(w,h,d,c,x,y,z){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;cityScene.add(m);cityObjects.push(m);return m;
}
function cmkCyl(rt,rb,h,seg,col,x,y,z){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),new THREE.MeshLambertMaterial({color:col}));
  m.position.set(x,y,z);cityScene.add(m);cityObjects.push(m);return m;
}

function buildCityScene(){
  cityObjects=[];cityBlds=[];cityGuards=[];cityAlerted=false;citySafeFound=false;cityBroadcastDone=false;cityPalto=null;
  cityScene=new THREE.Scene();
  cityScene.background=new THREE.Color(0x1a1f2e);
  cityScene.fog=new THREE.Fog(0x1a1f2e,40,120);

  // ══ תאורה — משרדי, פלואורסנט ══
  cityScene.add(new THREE.AmbientLight(0xfff8f0,.45));
  const sun=new THREE.DirectionalLight(0xfffae8,0.6);sun.position.set(15,25,10);cityScene.add(sun);
  // פנסי פלואורסנט — צהבהב
  [[-12,8.7,2],[0,8.7,2],[12,8.7,2],[-12,8.7,-18],[0,8.7,-18],[12,8.7,-18],[0,8.7,-36]].forEach(([x,y,z])=>{
    const l=new THREE.PointLight(0xfff5d8,0.85,18);l.position.set(x,y,z);cityScene.add(l);
    const tb=new THREE.Mesh(new THREE.BoxGeometry(3.5,.08,.12),new THREE.MeshLambertMaterial({color:0xfffde8,emissive:0x887744}));
    tb.position.set(x,y,z);cityScene.add(tb);cityObjects.push(tb);
  });
  const safeL=new THREE.PointLight(0x00dd55,2.5,10);safeL.position.set(22,3,-42);cityScene.add(safeL);
  const redL=new THREE.PointLight(0xff2200,2.5,10);redL.position.set(-18,3,-42);cityScene.add(redL);
  const bossL=new THREE.PointLight(0x3355dd,2.8,16);bossL.position.set(0,5,-42);cityScene.add(bossL);

  // ══ רצפה — שיש אריחים ══
  // רצפה ראשית
  const flMat=new THREE.MeshLambertMaterial({color:0xd8d0c0});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(52,65),flMat);fl.rotation.x=-Math.PI/2;fl.position.set(0,.01,-20);cityScene.add(fl);cityObjects.push(fl);
  // פסי אריחים
  const grMat=new THREE.MeshLambertMaterial({color:0xb0a898});
  for(let xi=-24;xi<=26;xi+=3.2){const g=new THREE.Mesh(new THREE.PlaneGeometry(.05,65),grMat);g.rotation.x=-Math.PI/2;g.position.set(xi,.02,-20);cityScene.add(g);}
  for(let zi=-56;zi<=14;zi+=3.2){const g=new THREE.Mesh(new THREE.PlaneGeometry(52,.05),grMat);g.rotation.x=-Math.PI/2;g.position.set(0,.02,zi);cityScene.add(g);}
  // שטיח לובי
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(20,8),new THREE.MeshLambertMaterial({color:0x6a1a10}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.03,0);cityScene.add(rug);cityObjects.push(rug);

  // ══ קירות — טיח ישן, בז' ══
  const wc=0xd4cabb,wcd=0xc4baa8;
  // קירות חיצוניים
  cmkB(52,9.5,.5,wc,0,4.75,-57);cityBlds.push({x:0,z:-57,w:52,d:1});
  cmkB(22,9.5,.5,wc,-15,4.75,13);cityBlds.push({x:-15,z:13,w:22,d:1});
  cmkB(22,9.5,.5,wc,15,4.75,13);cityBlds.push({x:15,z:13,w:22,d:1});
  cmkB(.5,9.5,70,wc,-26,4.75,-22);cityBlds.push({x:-26,z:-22,w:1,d:70});
  cmkB(.5,9.5,70,wc,26,4.75,-22);cityBlds.push({x:26,z:-22,w:1,d:70});
  cmkB(52,.4,70,0x2a2520,0,9.5,-22);
  // קירות פנימיים
  cmkB(17,8,.4,wcd,-17.5,4,-10);cityBlds.push({x:-17.5,z:-10,w:17,d:.8});
  cmkB(17,8,.4,wcd,17.5,4,-10);cityBlds.push({x:17.5,z:-10,w:17,d:.8});
  cmkB(17,8,.4,wcd,-17.5,4,-28);cityBlds.push({x:-17.5,z:-28,w:17,d:.8});
  cmkB(17,8,.4,wcd,17.5,4,-28);cityBlds.push({x:17.5,z:-28,w:17,d:.8});
  cmkB(.4,8,10,wcd,8,4,-41);cityBlds.push({x:8,z:-41,w:.8,d:10});
  cmkB(.4,8,10,wcd,-8,4,-41);cityBlds.push({x:-8,z:-41,w:.8,d:10});

  // ══ כניסה — עמודים + דלתות ══
  [[-12,14],[12,14],[-12,-2],[12,-2]].forEach(([px,pz])=>{
    cmkCyl(.55,.55,9.5,10,0xb8b0a0,px,4.75,pz);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.3,.22,1.3),new THREE.MeshLambertMaterial({color:0xa8a098}));
    cap.position.set(px,9.6,pz);cityScene.add(cap);cityObjects.push(cap);
  });
  // דלתות זכוכית
  [-3,3].forEach(px=>{
    const dg=new THREE.Mesh(new THREE.BoxGeometry(2.6,4,.07),new THREE.MeshLambertMaterial({color:0x88ccdd,transparent:true,opacity:.4,emissive:0x112233}));
    dg.position.set(px,2,13);cityScene.add(dg);cityObjects.push(dg);
  });
  // שלט עיריית לוד
  cmkB(16,.7,.3,0x1a3a8a,0,8.2,12.9);
  cmkB(14,.5,.32,0xffffff,0,8.2,12.9);
  cmkB(16,.1,.3,0xddaa00,0,7.82,12.9);
  // מדרגות
  [[0,.08,13.8,50,.16],[0,.24,14.2,50,.16],[0,.4,14.6,50,.16]].forEach(([px,py,pz,w,h])=>{cmkB(w,h,1,0xb0a898,px,py,pz);});

  // ══ לובי מרכזי ══
  // דלפק קבלה U-shape עץ
  cmkB(14,1.1,1,0x7a5a30,0,.55,5);cmkB(1.1,1.1,4,0x7a5a30,-7.5,.55,7.5);cmkB(1.1,1.1,4,0x7a5a30,7.5,.55,7.5);
  cmkB(14,.07,5,0x5a6688,0,1.1,7);cityBlds.push({x:0,z:7,w:16,d:6});
  [-4,0,4].forEach(px=>{
    cmkB(.9,.65,.5,0xccccaa,px,1.75,5.3);
    cmkB(.7,.07,.5,0x999988,px,1.12,5.8);
  });
  // ספות המתנה
  [[-20,5],[20,5]].forEach(([px,pz])=>{
    cmkB(6,.45,1.8,0x1a2a50,px,.22,pz);cmkB(6,.7,.2,0x1a2a50,px,.55,pz-.9);cmkB(5.6,.35,1.6,0x2a3a68,px,.43,pz);
    cityBlds.push({x:px,z:pz,w:6,d:2});
  });
  // עמודים
  [[-22,4],[22,4],[-22,-14],[22,-14],[-22,-28],[22,-28]].forEach(([px,pz])=>{
    cmkB(1.2,9.5,1.2,0xb8b0a0,px,4.75,pz);
  });
  // דלתות מסדרון
  [[-25,-14],[-25,-20],[-25,-26],[25,-14],[25,-20],[25,-26]].forEach(([px,pz])=>{
    cmkB(2,2.8,.1,0x6a4020,px,1.4,pz);
    const kn=new THREE.Mesh(new THREE.SphereGeometry(.09,6,5),new THREE.MeshLambertMaterial({color:0xccaa66,emissive:0x221100}));
    kn.position.set(px+(px<0?.6:-.6),.95,pz-.06);cityScene.add(kn);cityObjects.push(kn);
  });
  // לוח מודעות
  cmkB(.1,2.6,4,0x5a4010,-25.5,3.3,-6);
  cmkB(.08,2.2,3.5,0xd4c880,-25.55,3.3,-6);

  // ══ כנף מזרח — ארכיון + כספת ══
  // ארונות ארכיון — מרוחקים יותר, בשני שורות
  [[16,-14],[16,-20],[16,-26]].forEach(([px,pz])=>{
    cmkB(2.2,4,.9,0x9a9e98,px,2,pz);
    [.8,1.8,2.8].forEach(y=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(.5,.06,.04),new THREE.MeshLambertMaterial({color:0xddcc88,emissive:0x110800}));
      h.position.set(px,y+.15,pz-.44);cityScene.add(h);cityObjects.push(h);
    });
    cityBlds.push({x:px,z:pz,w:2.4,d:1.1});
  });
  // שולחן עבודה — מרוחק מהקיר, נוח לשימוש
  cmkB(5,1,2.2,0x3a3a30,18,.5,-34);cmkB(4.8,.06,2,0x4a6830,18,1.04,-34);
  cityBlds.push({x:18,z:-34,w:5.5,d:2.4});

  // ══ כספת — פלדה כבדה ══
  cmkB(4,.4,4.5,0x9a9890,22,.2,-42);  // בסיס
  cmkB(3,3.2,1.4,0x3a3e36,22,1.8,-42);cityBlds.push({x:22,z:-42,w:3.5,d:2});
  const sfDoor=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.8,.2),new THREE.MeshLambertMaterial({color:0x4a5045}));
  sfDoor.position.set(22,1.8,-41.3);cityScene.add(sfDoor);cityObjects.push(sfDoor);
  [[.88,.12],[.12,.88]].forEach(([w,h])=>{
    const hm=new THREE.Mesh(new THREE.BoxGeometry(w,h,.14),new THREE.MeshLambertMaterial({color:0xc0c8b8,emissive:0x101610}));
    hm.position.set(22,1.8,-41.2);cityScene.add(hm);cityObjects.push(hm);
  });
  const sfLed=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.1),new THREE.MeshLambertMaterial({color:0x00ff44,emissive:0x00cc33}));
  sfLed.position.set(23,2.9,-41.21);cityScene.add(sfLed);cityObjects.push(sfLed);
  G._citySafePos={x:22,z:-42};

  // ══ כנף מערב — חדר שידור ══
  // מסוף שידור — מרוחק מהקיר
  cmkB(4.5,2.2,1,0x141414,-18,1.1,-44);cmkB(4.3,.06,1,0x2a2a2a,-18,2.22,-44);
  [.4,.85,1.3,1.75].forEach(y=>{
    cmkB(4.1,.35,.85,0x1e1e1e,-18,y,-44);
  });
  // שולחן עבודה — רחוק מהמסוף
  cmkB(7,1,2.5,0x2a2218,-18,.5,-38);cmkB(6.8,.06,2.4,0x3a3220,-18,1.04,-38);
  cityBlds.push({x:-18,z:-38,w:7.5,d:3});
  cityBlds.push({x:-18,z:-44,w:5,d:1.5});
  cmkCyl(.08,.1,3.5,8,0x777770,-18,2.75,-44.5);
  const ag=new THREE.Mesh(new THREE.SphereGeometry(.2,8,8),new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xaa0800}));
  ag.position.set(-18,4.55,-44.5);cityScene.add(ag);cityObjects.push(ag);
  G._cityBroadcastPos={x:-18,z:-44};

  // ══ חדר פלטו ══
  // שולחן גדול — רחוק יותר מהכניסה לחדר, שפלטו יעמוד מאחוריו
  cmkB(12,1.1,5,0x4a1e06,0,.55,-49);cmkB(11.6,.06,4.6,0x2a1404,0,1.11,-49);cmkB(11.0,.04,4.0,0x1a4020,0,1.14,-49);
  cityBlds.push({x:0,z:-49,w:12.5,d:5.5});
  // מנורה על השולחן
  cmkB(2.2,2.8,2,0x0a0a0a,0,.9,-51.5);
  // ארון ספרים — על קיר המערב, מרוחק מהמרכז
  cmkB(10,6.5,.55,0x4a2a0a,-20,3.25,-52);
  // כסאות לפני השולחן — לפגישות
  [-4,0,4].forEach(px=>{
    cmkB(1.5,2.5,1.5,0x2a1a08,px,1.25,-44);
    cmkB(1.4,.12,1.4,0x3a2a10,px,2.5,-44);
  });
  // חלון גדול — על קיר המזרח
  const wg=new THREE.Mesh(new THREE.BoxGeometry(8.2,4,.06),new THREE.MeshLambertMaterial({color:0x88b8cc,transparent:true,opacity:.38,emissive:0x112233}));
  wg.position.set(20,5.35,-52);cityScene.add(wg);cityObjects.push(wg);

  // ══ שומרים ══
  // לובי — שניים שסורקים את הכניסה
  addCityGuard(-10,0,[[-10,-2],[-10,6],[10,6],[10,-2]],2.8);
  addCityGuard(10,0,[[10,-2],[10,6],[-10,6],[-10,-2]],2.8);
  // כנף מזרח
  addCityGuard(17,0,[[17,-12],[17,-24],[23,-24],[23,-12]],3.0);
  // כנף מערב
  addCityGuard(-17,0,[[-17,-12],[-17,-24],[-23,-24],[-23,-12]],3.0);
  // שומר כספת
  addCityGuard(18,0,[[18,-38],[18,-48],[24,-48],[24,-38]],3.2);

  cityCamera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,180);
  CITY.playerX=0;CITY.playerZ=11;CITY.playerYaw=Math.PI;
}

function addCityGuard(x,_floorY,waypoints,spd){
  const g=mkGuard(1.0);g.position.set(x,0,waypoints[0][1]);cityScene.add(g);cityObjects.push(g);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1.4,.18,.01),new THREE.MeshBasicMaterial({color:0x2255cc}));bar.position.set(0,2.5,0);g.add(bar);
  const det=new THREE.Mesh(new THREE.ConeGeometry(.3,.6,5),new THREE.MeshLambertMaterial({color:0xffff00,transparent:true,opacity:.85}));det.position.set(0,2.8,0);g.add(det);
  cityGuards.push({mesh:g,bar,det,waypoints,wpIdx:0,spd,state:'patrol',alertT:0,waitT:0,hp:60,mhp:60,atkT:0,_hitT:0});
}

function enterCityHall(){
  G.paused=true;
  fadeOut(()=>{
    if(!cityScene)buildCityScene();
    if(G.mission===14)setMission(15);
    CITY.inCity=true;
    CITY.playerX=0;CITY.playerZ=11;CITY.playerYaw=Math.PI;
    G.yaw=Math.PI;CITY.enterGrace=3.0;cityAlerted=false;
    if(cityCamera){cityCamera.position.set(0,6,18);cityCamera.lookAt(0,1,8);}
    cityGuards.forEach(g=>{g.state='patrol';g.alertT=0;g.waitT=0;g.hp=g.mhp;g.atkT=0;g._hitT=0;if(g.bar)g.bar.scale.x=1;});
    scene.remove(PB);cityScene.add(PB);
    PB.position.set(CITY.playerX,0,CITY.playerZ);
    document.getElementById('tb').textContent='🏛️ עיריית לוד — לובי';
    showN('🏛️ נכנסתם לעיריית לוד.\nהכספת בקומה ג׳. שמרו על עצמכם.');
    G.paused=false;fadeIn();
  });
}

function exitCityHall(){
  G.paused=true;
  fadeOut(()=>{
    CITY.inCity=false;
    cityScene.remove(PB);scene.add(PB);
    PB.position.set(80,0,-68);
    document.getElementById('tb').textContent='🐕 כלבי לוד — לוד';
    cityObjects.forEach(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
    cityObjects.length=0;cityGuards.length=0;
    cityScene=null;cityCamera=null;cityAlerted=false;
    G.particles=G.particles.filter(p=>!p.city);
    G.paused=false;fadeIn();
  });
}

function spawnPaltoInCity(){
  if(!cityScene||cityPalto)return;

  // פלטו — עומד מאחורי שולחנו
  const pm=mkPalto(1.1);pm.position.set(0,0,-38);cityScene.add(pm);cityObjects.push(pm);
  const barBg=new THREE.Mesh(new THREE.BoxGeometry(2.5,.2,.1),new THREE.MeshLambertMaterial({color:0x220033}));barBg.position.set(0,3.2,0);pm.add(barBg);
  const barFg=new THREE.Mesh(new THREE.BoxGeometry(2.5,.18,.12),new THREE.MeshLambertMaterial({color:0x2255cc}));barFg.position.set(0,3.2,.01);pm.add(barFg);
  cityPalto={mesh:pm,bar:barFg,x:0,z:-38,hp:300,mhp:300,dead:false,phase:1,_atkT:0,_hitT:0};

  // רקס — עומד לצד פלטו (אחי מומו)
  const rm=mkCommander(1.0);rm.position.set(6,0,-38);cityScene.add(rm);cityObjects.push(rm);
  // נורית זהובה מעל רקס
  const rind=new THREE.Mesh(new THREE.SphereGeometry(.35,8,8),new THREE.MeshLambertMaterial({color:0xddaa33,emissive:0x664400}));rind.position.set(0,3.2,0);rm.add(rind);
  G._cityReks={mesh:rm,x:6,z:-38};

  // תאורה דרמטית
  const pl=new THREE.PointLight(0x4488ff,4,18);pl.position.set(0,6,-38);cityScene.add(pl);cityObjects.push(pl);
  const rl=new THREE.PointLight(0xddaa33,2,10);rl.position.set(6,5,-38);cityScene.add(rl);cityObjects.push(rl);

  showN('💙 ד״ר פלטו: "ציפיתי לכם. לוד שלי — לעד."\n🟡 רקס עומד לצדו — קפוא.');
}

function spawnCityVFX(x,y,z,col,n=8){
  if(!cityScene)return;
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.1,4,4),new THREE.MeshBasicMaterial({color:col,transparent:true}));
    m.position.set(x,y,z);cityScene.add(m);
    G.particles.push({mesh:m,vx:(Math.random()-.5)*6,vy:Math.random()*5+2,vz:(Math.random()-.5)*6,life:.8,city:true});
  }
}

function updCityHall(dt){
  if(!CITY.inCity||G.paused||G.dlgOpen)return;
  const dog=G.dogs[G.dog];
  CITY.playerYaw=G.yaw;
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));
  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])   {inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']) {inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']) {inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}
  const il=Math.sqrt(inputX*inputX+inputZ*inputZ);
  const hasInput=il>.05;
  if(hasInput){
    const step=dog.spd*dt;
    let nx=CITY.playerX+(inputX/il)*step,nz=CITY.playerZ+(inputZ/il)*step;
    let bx=false,bz=false;
    for(const b of cityBlds){
      const hw=b.w/2+.65,hd=b.d/2+.65;
      if(nx>b.x-hw&&nx<b.x+hw&&CITY.playerZ>b.z-hd&&CITY.playerZ<b.z+hd)bx=true;
      if(CITY.playerX>b.x-hw&&CITY.playerX<b.x+hw&&nz>b.z-hd&&nz<b.z+hd)bz=true;
    }
    if(!bx)CITY.playerX=Math.max(-24,Math.min(24,nx));
    if(!bz)CITY.playerZ=Math.max(-50,Math.min(12,nz));
  }
  // קומה אחת — Y=0 תמיד
  PB.position.set(CITY.playerX,0,CITY.playerZ);
  // אנימציה
  if(hasInput){
    const moveAngle=Math.atan2(inputX/il,inputZ/il);
    let diff=(-moveAngle+Math.PI)-PB.rotation.y;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    PB.rotation.y+=diff*Math.min(1,12*dt);
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+(dogModel.position.y-_by)*.85;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }
  // מצלמה
  _vCamTarget.set(CITY.playerX+Math.sin(G.yaw)*7,5,CITY.playerZ+Math.cos(G.yaw)*7);
  cityCamera.position.lerp(_vCamTarget,.1);
  cityCamera.lookAt(CITY.playerX,1.2,CITY.playerZ);
  // שם
  document.getElementById('tb').textContent='🏛️ עיריית לוד';
  // יציאה דרום
  if(CITY.playerZ>12){exitCityHall();return;}
  // mission 15 — בתוך הבניין, מתקדמים מיד ל-16
  if(G.mission===15){
    setMission(16);
    showN('🗂️ הכספת בכנף ימין — אור ירוק!\nזהרו מהשומרים!');
  }
  // כספת — mission 16
  if(G.mission===16&&!citySafeFound&&G._citySafePos){
    if(d2(CITY.playerX,CITY.playerZ,G._citySafePos.x,G._citySafePos.z)<5){
      citySafeFound=true;
      spawnCityVFX(G._citySafePos.x,2,G._citySafePos.z,0x00ff44,14);
      showN('🗂️ הכספת פתוחה! הראיות בידיכם!\nפישקה: "קוד — תאריך הקמת לוד. פלטו אוהב רומנטיקה."');
      setTimeout(()=>setMission(17),1000);
    }
  }
  if(G.mission===17&&!cityPalto)spawnPaltoInCity();
  // קרב פלטו
  if(G.mission===17&&cityPalto&&!cityPalto.dead){
    const b=cityPalto;
    const dd=d2(CITY.playerX,CITY.playerZ,b.x,b.z);
    b._atkT=Math.max(0,b._atkT-dt);b._hitT=Math.max(0,b._hitT-dt);
    b.mesh.rotation.y+=dt*(b.phase===2?.8:.35);
    if(b.hp<b.mhp*.5&&b.phase===1){
      b.phase=2;
      showN('💙 פלטו: "רקס! פקד!"\n🟡 רקס: "...אני לא יכול."');
      haptic([40,20,40,20,60]);
      // רקס מסתובב ומתרחק
      if(G._cityReks)G._cityReks.mesh.rotation.y=Math.PI*.5;
    }
    if(dd<3.5&&b._atkT<=0){dmgPlayer(b.phase===2?26:16);b._atkT=1.0;haptic([40,20]);}
    if(!b._hitCD)b._hitCD=0;b._hitCD=Math.max(0,b._hitCD-dt);
    if(dd<5.5&&G.atkCD<=0&&b._hitT<=0&&b._hitCD<=0){
      const dmg=Math.round(dog.pow*11*(1+dog.lv*.1));b.hp-=dmg;sHit();haptic(25);
      if(b.mesh.children[0])flash(b.mesh.children[0]);
      spawnCityVFX(b.x,2,b.z,0xe74c3c,7);b._hitT=0.5;b._hitCD=0.5;
      if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
      if(b.hp<=0){
        b.dead=true;b.mesh.visible=false;sCapture();haptic([100,40,100,40,120]);
        addXP(150);G.score+=800;G.coins+=200;updCoins();spawnCityVFX(b.x,2,b.z,0xf5c518,28);
        showN('🏆 פלטו הובס!\n📡 עכשיו — חדר השידור בצד שמאל!');
        setTimeout(()=>setMission(18),700);
      }
    }
  }
  // חדר שידור — mission 18
  if(G.mission===18&&G._cityBroadcastPos&&!cityBroadcastDone){
    if(d2(CITY.playerX,CITY.playerZ,G._cityBroadcastPos.x,G._cityBroadcastPos.z)<5){
      cityBroadcastDone=true;
      showCut('final_broadcast',()=>{exitCityHall();setTimeout(()=>setMission(19),400);});
    }
  }
  updCityGuards(dt);
  if(CITY.enterGrace>0)CITY.enterGrace-=dt;
}

function updCityGuards(dt){
  const px=CITY.playerX,pz=CITY.playerZ;
  if(CITY.enterGrace>0)return;
  cityGuards.forEach((g,gi)=>{
    if(g.hp<=0)return;
    const gx=g.mesh.position.x,gz=g.mesh.position.z;
    const dd=d2(gx,gz,px,pz);
    g.atkT=Math.max(0,g.atkT-dt);g._hitT=Math.max(0,g._hitT-dt);
    let sees=dd<1.8;
    if(!sees&&dd<8){const toP=Math.atan2(px-gx,pz-gz);let ang=Math.abs(toP-g.mesh.rotation.y)%(Math.PI*2);if(ang>Math.PI)ang=Math.PI*2-ang;sees=ang<Math.PI*.45;}
    if(cityAlerted)sees=dd<14;
    const t=Date.now()*.001;
    g.det.material.color.setHex(g.state==='chase'?0xff2200:g.state==='search'?0xff8800:0xffff00);
    g.det.position.y=2.8+Math.sin(t*3+gi)*.1;
    if(sees&&g.state==='patrol'){g.state='chase';sAlert();if(!cityAlerted){showN(`⚠️ שומר ${gi+1} ראה אותך!`);cityGuards.forEach(o=>{if(d2(o.mesh.position.x,o.mesh.position.z,gx,gz)<22)o.state='search';});}}
    if(g.state==='chase'){
      const dx=px-gx,dz=pz-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      g.mesh.position.x+=dx/l*g.spd*1.3*dt;g.mesh.position.z+=dz/l*g.spd*1.3*dt;g.mesh.rotation.y=Math.atan2(dx,dz);
      if(dd<2.5&&g.atkT<=0){g.atkT=1.0;dmgPlayer(13);if(!cityAlerted){cityAlerted=true;showN('🚨 נתפסת!');}}
      if(!sees){g.alertT+=dt;if(g.alertT>5){g.state='search';g.alertT=0;}}
    } else if(g.state==='search'){
      const tx=px+(Math.random()-.5)*8,tz=pz+(Math.random()-.5)*8;
      const dx=tx-gx,dz=tz-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      if(l>1){g.mesh.position.x+=dx/l*g.spd*.6*dt;g.mesh.position.z+=dz/l*g.spd*.6*dt;g.mesh.rotation.y=Math.atan2(dx,dz);}
      g.alertT+=dt;if(g.alertT>7){g.state='patrol';g.alertT=0;}if(sees)g.state='chase';
    } else {
      if(g.waitT>0){g.waitT-=dt;return;}
      const wp=g.waypoints[g.wpIdx];
      const dx=wp[0]-gx,dz=wp[1]-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      if(l<1.4){g.wpIdx=(g.wpIdx+1)%g.waypoints.length;g.waitT=.6+Math.random()*.5;}
      else{g.mesh.position.x+=dx/l*g.spd*dt;g.mesh.position.z+=dz/l*g.spd*dt;g.mesh.rotation.y+=(Math.atan2(dx,dz)-g.mesh.rotation.y)*.1;}
    }
    // פגיעה בשומר — cooldown נפרד לכל שומר, לא G.atkCD
    if(!g._atkCD)g._atkCD=0;
    g._atkCD=Math.max(0,g._atkCD-dt);
    if(dd<4.5&&G.atkCD<=0&&g._hitT<=0&&g._atkCD<=0){
      const dmg=Math.round(G.dogs[G.dog].pow*9);g.hp-=dmg;haptic(18);
      if(g.mesh.children[0])flash(g.mesh.children[0]);
      g._hitT=0.5;g._atkCD=0.5;
      if(g.bar)g.bar.scale.x=Math.max(0,g.hp/g.mhp);
      if(g.hp<=0){g.hp=0;g.mesh.visible=false;haptic([40,20,40]);addXP(15);G.coins+=10;updCoins();showN('✅ שומר הוכנע!');}
      else g.state='chase';
    }
  });
}

function initFadeEl(){
  if(document.getElementById('fade-ov'))return;
  const f=document.createElement('div');
  f.id='fade-ov';
  f.style.cssText='position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:500;transition:opacity .6s;';
  document.body.appendChild(f);
}
function fadeOut(cb){initFadeEl();const f=document.getElementById('fade-ov');f.style.pointerEvents='all';f.style.opacity='1';setTimeout(cb,650);}
function fadeIn(){const f=document.getElementById('fade-ov');if(!f)return;setTimeout(()=>{f.style.opacity='0';f.style.pointerEvents='none';},80);}

function vmkB(sc,w,h,d,c,x,y,z){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;sc.add(m);mosqueObjects.push(m);return m;
}
function vmkTree(sc,x,z){
  const rnd=(a,b)=>a+(b-a)*Math.random();
  const h=rnd(3.5,5.5);
  const trMat=new THREE.MeshLambertMaterial({color:0x3a2208});
  // גזע
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.1,.16),rnd(.18,.26),h,7),trMat);
  tr.position.set(x,h/2,z);tr.rotation.z=rnd(-.07,.07);sc.add(tr);mosqueObjects.push(tr);
  // ענפים קצרים
  for(let i=0;i<2;i++){
    const ang=rnd(0,Math.PI*2),bl=rnd(.8,1.6);
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.03,.07,bl,5),trMat);
    br.rotation.z=Math.PI/2+rnd(-.3,.3);br.rotation.y=ang;
    br.position.set(x+Math.sin(ang)*bl*.35,h*.6+i*.5,z+Math.cos(ang)*bl*.35);
    sc.add(br);mosqueObjects.push(br);
  }
  // 2-3 כדורי עלים כהים (לילה)
  const darkGreen=new THREE.Color(0x0e3a0a);
  [[rnd(1.4,2.0),rnd(.3,.7),rnd(-.3,.3),rnd(-.3,.3)],
   [rnd(1.1,1.6),rnd(.9,1.5),rnd(-.5,.5),rnd(-.4,.4)],
   [rnd(.8,1.2),rnd(1.4,2.0),rnd(-.3,.3),rnd(-.3,.3)]
  ].forEach(([r,dy,ox,oz])=>{
    const lc=darkGreen.clone().offsetHSL(0,rnd(-.08,.08),rnd(-.04,.06));
    const lv=new THREE.Mesh(new THREE.SphereGeometry(r,8,7),new THREE.MeshLambertMaterial({color:lc}));
    lv.position.set(x+ox,h+dy,z+oz);sc.add(lv);mosqueObjects.push(lv);
  });
}
function vmkCyl(sc,rt,rb,h,seg,col,x,y,z){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),new THREE.MeshLambertMaterial({color:col}));
  m.position.set(x,y,z);sc.add(m);mosqueObjects.push(m);return m;
}

function buildMosqueScene(){
  mosqueObjects=[];
  mosqueScene=new THREE.Scene();
  mosqueScene.background=new THREE.Color(0x0a0e18);
  mosqueScene.fog=new THREE.FogExp2(0x0a0e18,.022);

  // === תאורה — מספיק לראות, אבל צבע קר ומחלה ===
  mosqueScene.add(new THREE.AmbientLight(0x8899cc,1.8)); // כחול-קר, מספיק בהיר
  const moon=new THREE.DirectionalLight(0xaabbdd,1.6);moon.position.set(-40,70,30);moon.castShadow=true;
  moon.shadow.mapSize.set(1024,1024);['left','right','top','bottom'].forEach((k,i)=>moon.shadow.camera[k]=[-60,60,60,-60][i]);
  mosqueScene.add(moon);

  // פנסי חצר — אור כתום-חום, מספיק לראות
  [[-14,0,-14],[14,0,-14],[-14,0,14],[14,0,14]].forEach(([x,,z])=>{
    vmkCyl(mosqueScene,.15,.2,4,6,0x3a2808,x,2,z);
    const lp=new THREE.Mesh(new THREE.SphereGeometry(.35,8,8),new THREE.MeshLambertMaterial({color:0xff9944,emissive:0x884422}));
    lp.position.set(x,4.3,z);mosqueScene.add(lp);mosqueObjects.push(lp);
    const pl=new THREE.PointLight(0xff8833,4.0,32);pl.position.set(x,4,z);mosqueScene.add(pl);
  });

  // אור ירוק-מחלה על הכיפה — נראה ברור
  const domeLight=new THREE.PointLight(0x00ff66,3.5,40);domeLight.position.set(0,14,0);mosqueScene.add(domeLight);
  // אור אדום על הכלוב — חזק וברור
  const cageLight=new THREE.PointLight(0xff2200,5.0,28);cageLight.position.set(-18,3,-28);mosqueScene.add(cageLight);
  // אור כחול מהצד
  const sideLight=new THREE.PointLight(0x4488ff,3.0,35);sideLight.position.set(30,5,0);mosqueScene.add(sideLight);
  // מילוי כללי — שלא יהיו פינות שחורות לחלוטין
  mosqueScene.add(new THREE.HemisphereLight(0x334466,0x221133,1.0));

  // === קרקע — אריחים ישנים, נראים ברור ===
  const gnd=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshLambertMaterial({color:0x3a3228}));
  gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;mosqueScene.add(gnd);mosqueObjects.push(gnd);
  // ריצוף — פסים נראים
  for(let i=-4;i<=4;i++){
    const tile=new THREE.Mesh(new THREE.PlaneGeometry(.25,100),new THREE.MeshLambertMaterial({color:0x252018}));
    tile.rotation.x=-Math.PI/2;tile.position.set(i*5,.02,0);mosqueScene.add(tile);mosqueObjects.push(tile);
  }
  for(let i=-4;i<=4;i++){
    const tile=new THREE.Mesh(new THREE.PlaneGeometry(100,.25),new THREE.MeshLambertMaterial({color:0x252018}));
    tile.rotation.x=-Math.PI/2;tile.position.set(0,.02,i*5);mosqueScene.add(tile);mosqueObjects.push(tile);
  }

  // שטיח מרכזי — אדום כהה, נראה ברור
  vmkB(mosqueScene,20,.05,20,0x6a0808,0,.03,0);
  for(let i=-2;i<=2;i++){
    vmkB(mosqueScene,.3,.06,20,0x8a1800,i*4,.04,0);
    vmkB(mosqueScene,20,.06,.3,0x8a1800,0,.04,i*4);
  }

  // === כתמי דם — גדולים וברורים (פסיכי) ===
  [[-8,8],[15,-18],[-22,-5],[5,2],[-10,-25],[20,5]].forEach(([x,z])=>{
    const blood=new THREE.Mesh(new THREE.CircleGeometry(1.0+Math.random()*.7,8),new THREE.MeshLambertMaterial({color:0x5a0000}));
    blood.rotation.x=-Math.PI/2;blood.position.set(x,.026,z);mosqueScene.add(blood);mosqueObjects.push(blood);
    // "שביל" דם — כמה טיפות קטנות שמובילות לאיפשהו
    for(let d=1;d<4;d++){
      const drop=new THREE.Mesh(new THREE.CircleGeometry(.15+Math.random()*.1,6),new THREE.MeshLambertMaterial({color:0x440000}));
      drop.rotation.x=-Math.PI/2;drop.position.set(x+(Math.random()-.5)*d*1.5,.027,z+d*1.2);mosqueScene.add(drop);mosqueObjects.push(drop);
    }
  });

  // === כלוב עצמות — על הרצפה, נראה ברור ===
  [[-25,10],[20,-35],[-15,25],[28,15],[-32,-18]].forEach(([x,z])=>{
    // "גוף" — קופסה שטוחה בצבע עצם
    vmkB(mosqueScene,1.4,.12,2.8,0x8a7a5a,x,.06,z);
    // "עצמות" — מקלות קצרים
    vmkB(mosqueScene,.18,.1,.18,0x9a8a6a,x+.5,.08,z-.8);
    vmkB(mosqueScene,.18,.1,.18,0x9a8a6a,x-.3,.08,z+.6);
    vmkB(mosqueScene,.6,.08,.1,0x9a8a6a,x,.07,z-1.2);
    vmkB(mosqueScene,.1,.08,.6,0x9a8a6a,x+.7,.07,z+.3);
  });

  // === כלובים ריקים על הקיר — מה היה בהם? ===
  [[-35,10],[-35,-10],[-35,-25],[35,5],[35,-15]].forEach(([x,z])=>{
    // מסגרת כלוב על הקיר
    vmkB(mosqueScene,2.5,.08,1.8,0x334433,x,2.6,z);  // גג
    vmkB(mosqueScene,2.5,.08,1.8,0x334433,x,.5,z);   // רצפה
    for(let b=0;b<5;b++)vmkB(mosqueScene,.08,2.1,.08,0x334433,x-1.0+b*.5,.05+1.05,z-0.9);
    for(let b=0;b<4;b++)vmkB(mosqueScene,.08,2.1,.08,0x334433,x-0.9,1.55,z-.8+b*.55);
    // דלת כלוב — פתוחה לרווחה (מה ברח?)
    vmkB(mosqueScene,.08,2.1,.7,0x445544,x+1.25+.35,1.55,z-.45);
  });

  // === עצי תמר יבשים — שרידי גינה ===
  [[-30,-30],[30,-30],[-30,30],[30,30],[-35,0],[35,0]].forEach(([x,z])=>{
    vmkB(mosqueScene,.4,5,.4,0x2a1c0a,x,2.5,z);
    [-1,1].forEach(sd=>{
      vmkB(mosqueScene,.12,2,.12,0x221508,x+sd*1.5,5.5,z);
      vmkB(mosqueScene,.12,2,.12,0x221508,x,5.5,z+sd*1.2);
    });
    // גולגולת על גזע העץ (פסיכי)
    const skull=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshLambertMaterial({color:0x9a8a6a}));
    skull.position.set(x,.22,z);skull.scale.set(1,.85,1);mosqueScene.add(skull);mosqueObjects.push(skull);
  });
  vmkB(mosqueScene,80,12,.8,0x0a0806,0,6,-44); // צפון
  vmkB(mosqueScene,37,12,.8,0x080604,-21.5,6,44); // דרום שמאל
  vmkB(mosqueScene,37,12,.8,0x080604,21.5,6,44);  // דרום ימין
  vmkB(mosqueScene,.8,12,88,0x090705,40,6,0);  // מזרח
  vmkB(mosqueScene,.8,12,88,0x090705,-40,6,0); // מערב
  // סדקים גדולים יותר — קירות ישנים מאוד
  [[0,8,-43.6],[0,4,-43.6],[-35,6,0,.8,12,.4],[20,5,44,.8,10,.4]].forEach(([x,y,z,w=80,h=.5,d=.4])=>vmkB(mosqueScene,w,h,d,0x040302,x,y,z));
  // קישוט קיר — מחק ירוק מעופש
  vmkB(mosqueScene,80,.2,.9,0x0a1a0a,0,10,-44);
  vmkB(mosqueScene,80,.2,.9,0x0a1a0a,0,10,44);
  // פסי חושך על הקיר
  for(let i=-3;i<=3;i++){
    vmkB(mosqueScene,.18,12,.22,0x1a1608,i*10,6,-43.7);
  }

  // === קירות חיצוניים — אבן נראית ===
  vmkB(mosqueScene,80,12,.8,0x3a3020,0,6,-44);
  vmkB(mosqueScene,37,12,.8,0x323020,-21.5,6,44);
  vmkB(mosqueScene,37,12,.8,0x323020,21.5,6,44);
  vmkB(mosqueScene,.8,12,88,0x363020,40,6,0);
  vmkB(mosqueScene,.8,12,88,0x363020,-40,6,0);
  // סדקים נראים
  [[0,8,-43.6],[0,4,-43.6]].forEach(([x,y,z])=>vmkB(mosqueScene,80,.4,.35,0x1a1610,x,y,z));
  vmkB(mosqueScene,.8,10,.4,0x1a1610,-35,6,0);
  // פס קישוט ירוק-כחלחל
  vmkB(mosqueScene,80,.35,.9,0x224422,0,10.2,-44);
  vmkB(mosqueScene,80,.35,.9,0x224422,0,10.2,44);

  // === המסגד הראשי — נראה, צבע אבן כהה ===
  vmkB(mosqueScene,30,12,24,0x2e2a1e,0,6,-8);
  vmkB(mosqueScene,30,12,.8,0x2a2618,0,6,16);
  // פסי אבן — נראים
  for(let i=0;i<6;i++)vmkB(mosqueScene,30,.18,.85,0x1e1c14,0,i*2,-8);

  // חלונות — ירוק מחלה מבפנים, נראה בבירור
  [[-10,6,-44],[0,6,-44],[10,6,-44]].forEach(([x,y,z])=>{
    vmkB(mosqueScene,2.8,2.8,.45,0x1a3020,x,y,z);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshLambertMaterial({color:0x003300,emissive:0x006600,side:THREE.DoubleSide}));
    glow.position.set(x,y,z+.3);mosqueScene.add(glow);mosqueObjects.push(glow);
    const wl=new THREE.PointLight(0x00aa44,2.5,10);wl.position.set(x,y,z+1);mosqueScene.add(wl);
  });

  // כיפה — ירוק-כהה נראה
  const dome=new THREE.Mesh(new THREE.SphereGeometry(8,16,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0x1a4a22}));
  dome.position.set(0,11.5,-8);mosqueScene.add(dome);mosqueObjects.push(dome);
  vmkCyl(mosqueScene,8,8,2,12,0x282414,0,10.5,-8);
  // פסי קישוט על הכיפה
  for(let i=0;i<8;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.2,8,.18),new THREE.MeshLambertMaterial({color:0x122a18}));rib.rotation.y=i*Math.PI/4;rib.position.set(0,11.5,-8);mosqueScene.add(rib);mosqueObjects.push(rib);}
  // הלל ירח
  const crescent=new THREE.Mesh(new THREE.TorusGeometry(.6,.08,6,16,Math.PI*1.4),new THREE.MeshLambertMaterial({color:0x886600,emissive:0x443300}));
  crescent.position.set(0,20,-8);crescent.rotation.z=-.3;mosqueScene.add(crescent);mosqueObjects.push(crescent);

  // === מינרטים — גבוהים ומאיימים, בצבע אבן ===
  [[-18,-20],[18,-20]].forEach(([mx,mz])=>{
    vmkCyl(mosqueScene,1.0,1.4,28,8,0x2a2618,mx,14,mz);
    vmkCyl(mosqueScene,1.8,1.0,2,8,0x222018,mx,28.5,mz);
    vmkCyl(mosqueScene,.6,1.0,2,8,0x2a2618,mx,30.5,mz);
    vmkCyl(mosqueScene,.08,.8,6,8,0x1a3a1a,mx,34,mz);
    // קוצים ברזל על הכרכוב
    for(let a=0;a<8;a++){
      const spk=new THREE.Mesh(new THREE.ConeGeometry(.13,.6,4),new THREE.MeshLambertMaterial({color:0x666660}));
      spk.position.set(mx+Math.sin(a*Math.PI/4)*1.9,29,mz+Math.cos(a*Math.PI/4)*1.9);
      mosqueScene.add(spk);mosqueObjects.push(spk);
    }
    // נורת מינרט — כתומה חיוורת
    const ml=new THREE.Mesh(new THREE.SphereGeometry(.28,6,6),new THREE.MeshLambertMaterial({color:0xcc6600,emissive:0x441100}));
    ml.position.set(mx,37,mz);mosqueScene.add(ml);mosqueObjects.push(ml);
    const mpl=new THREE.PointLight(0x882200,.8,10);mpl.position.set(mx,36,mz);mosqueScene.add(mpl);
  });

  // === קשתות כניסה — נראות, עם קוצים ===
  [-8,-2,4].forEach(x=>{
    const arch=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.5,6,12,Math.PI),new THREE.MeshLambertMaterial({color:0x2a2618}));
    arch.position.set(x,7,16.5);mosqueScene.add(arch);mosqueObjects.push(arch);
    [-.8,0,.8].forEach(ox=>{const sp=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,4),new THREE.MeshLambertMaterial({color:0x888880}));sp.position.set(x+ox,9.8,16.5);mosqueScene.add(sp);mosqueObjects.push(sp);});
  });
  [-8,-2,4].forEach(x=>{
    vmkB(mosqueScene,.22,7,.22,0x222018,x-2.5,3.5,16.4);
    vmkB(mosqueScene,.22,7,.22,0x222018,x+2.5,3.5,16.4);
  });

  // דלת — חום כהה נראית
  mosqueDoorMesh=vmkB(mosqueScene,3.2,5.5,.4,0x1a1008,-2,2.7,15.8);
  mosqueDoorLocked=false;
  // גריל ברזל — נראה
  for(let i=0;i<4;i++)vmkB(mosqueScene,.1,2,.12,0x555550,-3.5+i*.8,6,15.8);

  // === עמודי חצר — אבן, נראים ===
  [[-12,12],[-12,-12],[12,12],[12,-12],[-12,0],[12,0],[0,12],[0,-12]].forEach(([cx,cz])=>{
    vmkCyl(mosqueScene,.55,.65,6,8,0x2e2a1e,cx,3,cz);
    vmkB(mosqueScene,1.4,.4,1.4,0x262210,cx,6.2,cz);
    // סדקים נראים
    vmkB(mosqueScene,.12,5,.14,0x1a1810,cx+.3,3,cz);
    vmkB(mosqueScene,.1,3,.12,0x1a1810,cx-.22,4,cz+.15);
  });

  // קשתות בין עמודים
  [[-12,0],[12,0]].forEach(([cx,])=>{
    const a=new THREE.Mesh(new THREE.TorusGeometry(6,.35,6,12,Math.PI),new THREE.MeshLambertMaterial({color:0x282414}));
    a.rotation.z=Math.PI/2;a.position.set(cx,8,0);mosqueScene.add(a);mosqueObjects.push(a);
  });

  // === כלוב מומו — חושך מסביב ===
  const CX=-18,CZ=-30;
  for(let i=0;i<5;i++){vmkB(mosqueScene,.12,2.5,.12,0x334433,CX-3+i*1.5,1.25,CZ);}
  for(let i=0;i<5;i++){vmkB(mosqueScene,.12,2.5,.12,0x334433,CX-3+i*1.5,1.25,CZ+5);}
  vmkB(mosqueScene,.12,2.5,5.12,0x334433,CX-3,1.25,CZ+2.5);
  vmkB(mosqueScene,.12,2.5,5.12,0x334433,CX+3,1.25,CZ+2.5);
  vmkB(mosqueScene,6.12,.12,5.12,0x334433,CX,2.5,CZ+2.5);
  // רצפה של הכלוב — כתמי חלודה
  vmkB(mosqueScene,5.8,.08,4.8,0x1a0808,CX,0.04,CZ+2.5);
  mosqueCageInd=new THREE.Mesh(new THREE.SphereGeometry(.45,8,8),new THREE.MeshLambertMaterial({color:0xff69b4,emissive:0xaa2255}));
  mosqueCageInd.position.set(CX,3.5,CZ+2.5);mosqueScene.add(mosqueCageInd);
  G.cagePos={x:CX,z:CZ+2.5};

  // מודל מומו בתוך הכלוב
  const momoInCage=new THREE.Group();
  const s=.58;
  const mWH=new THREE.MeshLambertMaterial({color:0xf5f5f2});
  const mCR=new THREE.MeshLambertMaterial({color:0xeee4cc});
  const mPK=new THREE.MeshLambertMaterial({color:0xffb8c0});
  const mEY=new THREE.MeshLambertMaterial({color:0x1a1a24});
  function mAdd(geo,mat,px,py,pz,par){const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);(par||momoInCage).add(m);return m;}
  // גוף
  mAdd(new THREE.BoxGeometry(.42*s,.44*s,.88*s),mWH,0,.44*s,0);
  mAdd(new THREE.BoxGeometry(.4*s,.36*s,.32*s),mWH,0,.46*s,.36*s);
  mAdd(new THREE.BoxGeometry(.34*s,.14*s,.62*s),mCR,0,.26*s,0);
  // ראש
  const mhG=new THREE.Group();mhG.position.set(0,1*s,.4*s);momoInCage.add(mhG);
  const msk=new THREE.Mesh(new THREE.SphereGeometry(.26*s,10,8),mWH);msk.scale.set(1,1.05,.95);mhG.add(msk);
  // עיניים
  [-1,1].forEach(sd=>{const eg=new THREE.Group();eg.position.set(sd*.13*s,.06*s,.2*s);mhG.add(eg);mAdd(new THREE.SphereGeometry(.096*s,8,8),mEY,0,0,0,eg);});
  // אוזניים
  [-1,1].forEach(sd=>{const eG=new THREE.Group();eG.position.set(sd*.22*s,.1*s,-.05*s);eG.rotation.z=sd*.45;eG.rotation.x=-.12;mhG.add(eG);mAdd(new THREE.CylinderGeometry(.005*s,.18*s,.5*s,5),mWH,0,.25*s,0,eG);mAdd(new THREE.CylinderGeometry(.003*s,.12*s,.4*s,5),mPK,0,.23*s,.015*s,eG);});
  // רגליים
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([lx,lz])=>{const lg=new THREE.Group();lg.position.set(lx*.14*s,.42*s,lz*.22*s);momoInCage.add(lg);mAdd(new THREE.BoxGeometry(.13*s,.48*s,.13*s),mWH,0,-.24*s,0,lg);});
  // זנב
  const mtG=new THREE.Group();mtG.position.set(0,.52*s,-.44*s);mtG.rotation.x=.8;momoInCage.add(mtG);
  mAdd(new THREE.CylinderGeometry(.055*s,.04*s,.25*s,8),mCR,0,.12*s,0,mtG);
  // מיקום — יושבת בכלוב, מסתכלת החוצה
  momoInCage.position.set(CX,0,CZ+2.5);
  momoInCage.rotation.y=Math.PI/2;
  mosqueScene.add(momoInCage);
  mosqueCageInd.visible=true; // אינדיקטור מרחוק
  // שמור ref כדי להסתיר כשמשוחררת
  G.momoModel=momoInCage;

  // שלט מעל הכלוב — "אסור" — אדום בהיר
  vmkB(mosqueScene,4,.6,.1,0xaa0000,CX,4.5,CZ);

  // === עצי תמר יבשים — בצבעים הנראים ===
  [[-30,-30],[30,-30],[-30,30],[30,30],[-35,0],[35,0]].forEach(([x,z])=>{
    vmkB(mosqueScene,.4,5,.4,0x3a2810,x,2.5,z);
    [-1,1].forEach(sd=>{
      vmkB(mosqueScene,.15,2,.15,0x2a1e0a,x+sd*1.5,5.5,z);
      vmkB(mosqueScene,.15,2,.15,0x2a1e0a,x,5.5,z+sd*1.2);
    });
    // גולגולת על בסיס העץ — נראית ברור
    const skull=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshLambertMaterial({color:0xc8b88a}));
    skull.position.set(x,.22,z);skull.scale.set(1,.85,1);mosqueScene.add(skull);mosqueObjects.push(skull);
    // שקעי עיניים — כהים
    [-1,1].forEach(sd=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),new THREE.MeshLambertMaterial({color:0x1a1008}));ey.position.set(x+sd*.08,.28,z+.16);mosqueScene.add(ey);mosqueObjects.push(ey);});
  });

  // === שלטי אזהרה ערביים על הקירות — "מוות למי שמתקרב" (אסתטיקה בלבד) ===
  [[-38,10,0,Math.PI/2],[-38,-15,0,Math.PI/2],[38,5,0,-Math.PI/2],[38,-20,0,-Math.PI/2],[0,8,-43.2,0]].forEach(([x,y,z,ry=0])=>{
    const sign=new THREE.Mesh(new THREE.BoxGeometry(3.5,.9,.1),new THREE.MeshLambertMaterial({color:0x8a0000}));
    sign.position.set(x,y+3,z);sign.rotation.y=ry;mosqueScene.add(sign);mosqueObjects.push(sign);
    // פסי "כתב" על השלט — לבן
    for(let i=0;i<3;i++){const ln=new THREE.Mesh(new THREE.BoxGeometry(.8,.1,.12),new THREE.MeshLambertMaterial({color:0xeeeecc}));ln.position.set(x+(i-.9)*.9,y+3.05,z);ln.rotation.y=ry;mosqueScene.add(ln);mosqueObjects.push(ln);}
  });

  // === כלובים ריקים על הקיר מזרח — מה היה בהם? ===
  [[35,10],[35,-5],[35,-20]].forEach(([x,z])=>{
    vmkB(mosqueScene,2.5,.08,1.8,0x445544,x,2.6,z);
    vmkB(mosqueScene,2.5,.08,1.8,0x445544,x,.5,z);
    for(let b=0;b<5;b++)vmkB(mosqueScene,.08,2.1,.08,0x445544,x-1.0+b*.5,.05+1.05,z-0.9);
    for(let b=0;b<4;b++)vmkB(mosqueScene,.08,2.1,.08,0x445544,x-0.9,1.55,z-.8+b*.55);
    // דלת פתוחה
    vmkB(mosqueScene,.08,2.1,.7,0x556655,x+1.25+.35,1.55,z-.45);
    // כתם אדום בפנים הכלוב
    const bl=new THREE.Mesh(new THREE.CircleGeometry(.5,8),new THREE.MeshLambertMaterial({color:0x660000}));
    bl.rotation.x=-Math.PI/2;bl.position.set(x,.52,z);mosqueScene.add(bl);mosqueObjects.push(bl);
  });

  // === שרשרות ברזל תלויות מהתקרה — פסיכי ===
  [[0,5],[-15,-5],[15,-10],[-8,-20],[8,5],[-22,10],[22,-25]].forEach(([x,z])=>{
    const chainH=3+Math.random()*3;
    for(let s=0;s<Math.floor(chainH*2);s++){
      const link=new THREE.Mesh(new THREE.TorusGeometry(.18,.05,4,8),new THREE.MeshLambertMaterial({color:0x666658}));
      link.position.set(x,9-s*.5,z);link.rotation.x=s%2===0?Math.PI/2:0;
      mosqueScene.add(link);mosqueObjects.push(link);
    }
    // ווי ברזל בסוף השרשרת
    const hook=new THREE.Mesh(new THREE.TorusGeometry(.25,.06,4,8,Math.PI*1.5),new THREE.MeshLambertMaterial({color:0x777768}));
    hook.position.set(x,9-chainH,z);mosqueScene.add(hook);mosqueObjects.push(hook);
  });

  // === גופות כלבים — ברמת מודלי האויבים ===
  const corpseVariants=[
    [0x6a4828,0x9a7850,0x3a1a08], // חום-ג'ינג'י
    [0x282018,0x3e3028,0x100808], // שחור-אפור
    [0x5c3a18,0x8a5c30,0x2c1408], // חום כהה
    [0x1e1e28,0x2e2a38,0x0e0e18], // אפור-כחלחל
    [0x704a2a,0xa06840,0x382010], // חום-אדמה
  ];
  function mkCorpse(fc,bc,sc2){
    const g=new THREE.Group();
    const fur=new THREE.MeshLambertMaterial({color:fc});
    const belly=new THREE.MeshLambertMaterial({color:bc});
    const dark=new THREE.MeshLambertMaterial({color:sc2});
    const nosM=new THREE.MeshLambertMaterial({color:0x080404});
    const eyM=new THREE.MeshLambertMaterial({color:0x060202});
    const tongM=new THREE.MeshLambertMaterial({color:0xbb3333});
    const bloodM=new THREE.MeshLambertMaterial({color:0x3a0000});
    const clawM=new THREE.MeshLambertMaterial({color:0x1a1408});
    // ── גוף ראשי — שוכב על הצד ──
    // גוף (עכשיו מסובב על הצד, X הוא "גובה" בפועל)
    const body=new THREE.Mesh(new THREE.BoxGeometry(.56,.48,1.32),fur);
    body.position.set(0,.26,0);body.rotation.z=Math.PI/2;g.add(body);
    // חזה רחב — קדימה
    const chest=new THREE.Mesh(new THREE.BoxGeometry(.48,.38,.44),fur);
    chest.position.set(0,.28,.52);chest.rotation.z=Math.PI/2;g.add(chest);
    // בטן חשופה עם פרווה קלה יותר
    const bel=new THREE.Mesh(new THREE.BoxGeometry(.44,.3,1.0),belly);
    bel.position.set(.24,.26,.02);bel.rotation.z=Math.PI/2;g.add(bel);
    // אגן / כתפיים — שכמות
    const hip=new THREE.Mesh(new THREE.BoxGeometry(.46,.36,.34),dark);
    hip.position.set(0,.26,-.56);hip.rotation.z=Math.PI/2;g.add(hip);
    // צלעות נראות — 4 זוגות
    [-2,-1,0,1].forEach(i=>{
      const rib=new THREE.Mesh(new THREE.BoxGeometry(.022,.32,.06),dark);
      rib.position.set(.29,.28,i*.28);rib.rotation.z=Math.PI/2-.22;g.add(rib);
    });
    // ── צוואר — מחבר גוף לראש ──
    const nk=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,.26,7),fur);
    nk.position.set(.1,.29,.78);nk.rotation.z=Math.PI/2-.4;g.add(nk);
    // ── ראש מפורט ──
    const hG=new THREE.Group();hG.position.set(.14,.3,.98);hG.rotation.z=.7;g.add(hG);
    // גולגולת
    const skull=new THREE.Mesh(new THREE.BoxGeometry(.52,.48,.5),fur);skull.position.set(0,0,0);hG.add(skull);
    // חרטום
    const mzG=new THREE.Group();mzG.position.set(0,-.1,.28);hG.add(mzG);
    const snout=new THREE.Mesh(new THREE.BoxGeometry(.32,.2,.32),fur);snout.position.set(0,0,0);mzG.add(snout);
    // כלב מת — לסת פתוחה
    const jaw=new THREE.Mesh(new THREE.BoxGeometry(.28,.1,.28),dark);jaw.position.set(0,-.16,.04);mzG.add(jaw);
    // אף
    const nos=new THREE.Mesh(new THREE.SphereGeometry(.072,7,6),nosM);nos.scale.set(1.1,.65,.8);nos.position.set(0,.08,.16);mzG.add(nos);
    // לשון מחוץ ללסת — ארוכה ותלויה
    const tongG=new THREE.Group();tongG.position.set(0,-.12,.12);tongG.rotation.x=.5;mzG.add(tongG);
    const tong=new THREE.Mesh(new THREE.BoxGeometry(.14,.04,.26),tongM);tong.position.y=-.13;tongG.add(tong);
    const tongTip=new THREE.Mesh(new THREE.BoxGeometry(.12,.04,.1),tongM);tongTip.position.set(0,-.28,.04);tongG.add(tongTip);
    // עיניים סגורות — קמורות, חצי-עיניים
    [-1,1].forEach(sd=>{
      const eyLid=new THREE.Mesh(new THREE.BoxGeometry(.15,.05,.12),dark);
      eyLid.position.set(sd*.16,.14,.24);hG.add(eyLid);
      // קמרון העין הנסגרת
      const eyB=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6,0,Math.PI*2,0,Math.PI*.5),eyM);
      eyB.scale.set(1,.45,1);eyB.position.set(sd*.16,.14,.24);hG.add(eyB);
    });
    // שיניים נראות בלסת הפתוחה
    [-1,0,1].forEach(i=>{
      const tooth=new THREE.Mesh(new THREE.BoxGeometry(.055,.12,.055),new THREE.MeshLambertMaterial({color:0xbbbb99}));
      tooth.position.set(i*.1,-.2+.06,.12);mzG.add(tooth);
    });
    // ── אוזניים ──
    // אוזן עליונה — כפופה לצד
    const earG=new THREE.Group();earG.position.set(.22,.22,-.04);earG.rotation.z=1.1;earG.rotation.x=.1;hG.add(earG);
    const earOut=new THREE.Mesh(new THREE.CylinderGeometry(.03,.18,.4,5),fur);earOut.position.y=.2;earG.add(earOut);
    const earIn=new THREE.Mesh(new THREE.CylinderGeometry(.02,.12,.3,5),dark);earIn.position.set(0,.18,.012);earG.add(earIn);
    // אוזן תחתונה — שטוחה ברצפה
    const earG2=new THREE.Group();earG2.position.set(-.2,.02,-.04);earG2.rotation.z=-.3;earG2.rotation.x=.08;hG.add(earG2);
    const earOut2=new THREE.Mesh(new THREE.CylinderGeometry(.02,.16,.32,5),fur);earOut2.position.y=.16;earG2.add(earOut2);
    // ── 4 רגליים — עם עצמות ופרקים ──
    // רגליים קדמיות — פרושות קדימה
    [[.2,.0,.56,-.7,.08],[-.18,.0,.52,-.5,.08]].forEach(([lx,ly,lz,ra,rx],li)=>{
      const lg=new THREE.Group();lg.position.set(lx,.18+ly,lz);g.add(lg);
      // עצם עליונה
      const up=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,.38),fur);up.rotation.z=Math.PI/2+ra;up.position.set(0,0,.02);lg.add(up);
      const knee=new THREE.Group();knee.position.set(0,-.02,.38);lg.add(knee);
      // עצם תחתונה
      const lo=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.32),fur);lo.rotation.z=Math.PI/2+ra*.4;lo.position.set(0,0,.02);knee.add(lo);
      // כף — גדולה ופרושה
      const pw=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.22),dark);pw.position.set(0,-.04,.34);knee.add(pw);
      // ציפורניים
      [-1,0,1].forEach(i=>{const cl=new THREE.Mesh(new THREE.ConeGeometry(.025,.09,4),clawM);cl.position.set(i*.06,-.04,.42);cl.rotation.x=-.5;knee.add(cl);});
    });
    // רגליים אחוריות — כפופות יותר, לאחור
    [[.18,.0,-.5,.4,.0],[-.2,.0,-.52,.3,.0]].forEach(([lx,ly,lz,ra,rx],li)=>{
      const lg=new THREE.Group();lg.position.set(lx,.18+ly,lz);g.add(lg);
      const up=new THREE.Mesh(new THREE.BoxGeometry(.15,.12,.36),fur);up.rotation.z=Math.PI/2-ra;up.position.set(0,0,-.02);lg.add(up);
      const knee=new THREE.Group();knee.position.set(0,-.02,-.36);lg.add(knee);
      const lo=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.3),fur);lo.rotation.z=Math.PI/2-ra*.5;lo.position.set(0,0,-.02);knee.add(lo);
      const pw=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.22),dark);pw.position.set(0,-.04,-.32);knee.add(pw);
      [-1,0,1].forEach(i=>{const cl=new THREE.Mesh(new THREE.ConeGeometry(.025,.09,4),clawM);cl.position.set(i*.06,-.04,-.42);cl.rotation.x=.5;knee.add(cl);});
    });
    // ── זנב ── שוכב, כפוף
    const tailG=new THREE.Group();tailG.position.set(-.04,.22,-1.06);g.add(tailG);
    const t1=new THREE.Mesh(new THREE.CylinderGeometry(.068,.05,.4,7),fur);t1.position.set(0,0,0);t1.rotation.z=1.0;t1.rotation.x=-.18;tailG.add(t1);
    const t2=new THREE.Mesh(new THREE.CylinderGeometry(.04,.025,.28,6),fur);t2.position.set(-.3,.12,0);t2.rotation.z=.6;tailG.add(t2);
    // ── שלולית דם — גדולה ועם עומק ──
    const pool=new THREE.Mesh(new THREE.CircleGeometry(.9+Math.random()*.35,12),bloodM);
    pool.rotation.x=-Math.PI/2;pool.position.set(.08,.006,0);g.add(pool);
    // נהר דם קטן שמשתרע
    const stream=new THREE.Mesh(new THREE.PlaneGeometry(.18,.8),bloodM);
    stream.rotation.x=-Math.PI/2;stream.position.set(.08,.007,.68);g.add(stream);
    // טפטופים מסביב
    for(let i=0;i<6;i++){
      const drop=new THREE.Mesh(new THREE.CircleGeometry(.06+Math.random()*.09,6),bloodM);
      const ang=Math.random()*Math.PI*2,dist=.95+Math.random()*.7;
      drop.rotation.x=-Math.PI/2;drop.position.set(.08+Math.cos(ang)*dist,.008,Math.sin(ang)*dist);g.add(drop);
    }
    return g;
  }
  [[-25,10,0.4],[20,-35,1.2],[-15,25,-0.3],[28,15,2.0],[-32,-18,-1.0]].forEach(([x,z,ry],ci)=>{
    const [fc,bc,sc2]=corpseVariants[ci%corpseVariants.length];
    const corpse=mkCorpse(fc,bc,sc2);
    corpse.position.set(x,0,z);
    corpse.rotation.y=ry;
    mosqueScene.add(corpse);mosqueObjects.push(corpse);
  });

  // === סמלים מוסלמיים ===

  // מחראב (niche) בקיר הצפוני — כיוון קיבלה
  const mihrabArch=new THREE.Mesh(new THREE.TorusGeometry(2.2,.35,8,16,Math.PI),new THREE.MeshLambertMaterial({color:0x3a5a3a}));
  mihrabArch.position.set(0,6,-43.4);mosqueScene.add(mihrabArch);mosqueObjects.push(mihrabArch);
  vmkB(mosqueScene,4.4,4,.3,0x2a4030,0,3,-43.3); // גומחה
  vmkB(mosqueScene,3.8,3.5,.2,0x1a3020,0,3,-43.1); // פנים גומחה כהה
  // קישוט סביב המחראב — פסי זהב
  vmkB(mosqueScene,5,.2,.3,0x886600,0,8,-43.3);
  vmkB(mosqueScene,.2,6,.3,0x886600,-2.5,5,-43.3);
  vmkB(mosqueScene,.2,6,.3,0x886600,2.5,5,-43.3);

  // סהרונים על הקירות — סמל אסלאמי
  [[-38,6,10,Math.PI/2],[-38,6,-10,Math.PI/2],[38,6,10,-Math.PI/2],[38,6,-10,-Math.PI/2]].forEach(([x,y,z,ry])=>{
    const cr=new THREE.Mesh(new THREE.TorusGeometry(1.1,.12,8,20,Math.PI*1.5),new THREE.MeshLambertMaterial({color:0xccaa00,emissive:0x443300}));
    cr.position.set(x,y,z);cr.rotation.y=ry;cr.rotation.z=-.3;mosqueScene.add(cr);mosqueObjects.push(cr);
    // כוכב 6-קרני קטן מעל הסהר
    for(let p=0;p<6;p++){
      const pt=new THREE.Mesh(new THREE.ConeGeometry(.12,.35,3),new THREE.MeshLambertMaterial({color:0xddbb00,emissive:0x332200}));
      pt.position.set(x+Math.sin(p*Math.PI/3)*.5,y+1.6+Math.cos(p*Math.PI/3)*.5,z);
      pt.rotation.y=ry;pt.rotation.z=p*Math.PI/3;mosqueScene.add(pt);mosqueObjects.push(pt);
    }
  });

  // סהר + כוכב על הכיפה (מעל ההלל ירח)
  const topCr=new THREE.Mesh(new THREE.TorusGeometry(.9,.1,8,20,Math.PI*1.5),new THREE.MeshLambertMaterial({color:0xddbb00,emissive:0x554400}));
  topCr.position.set(0,21,-8);topCr.rotation.z=-.25;mosqueScene.add(topCr);mosqueObjects.push(topCr);
  for(let p=0;p<6;p++){
    const pt=new THREE.Mesh(new THREE.ConeGeometry(.1,.28,3),new THREE.MeshLambertMaterial({color:0xeedd00,emissive:0x443300}));
    pt.position.set(Math.sin(p*Math.PI/3)*.4,21.6+Math.cos(p*Math.PI/3)*.4,-8);
    pt.rotation.z=p*Math.PI/3;mosqueScene.add(pt);mosqueObjects.push(pt);
  }

  // טיח גיאומטרי על קיר המסגד הפנימי — ריבועים מסתובבים (נוף אסלאמי)
  [[-10,4,-7.5],[0,4,-7.5],[10,4,-7.5],[-10,7,-7.5],[0,7,-7.5],[10,7,-7.5]].forEach(([x,y,z])=>{
    const tile=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.5,.12),new THREE.MeshLambertMaterial({color:0x2a4a2a}));
    tile.position.set(x,y,z);tile.rotation.z=Math.PI/4;mosqueScene.add(tile);mosqueObjects.push(tile);
    const inner=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,.14),new THREE.MeshLambertMaterial({color:0x3a6a3a}));
    inner.position.set(x,y,z+.01);mosqueScene.add(inner);mosqueObjects.push(inner);
    const dot=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.15),new THREE.MeshLambertMaterial({color:0x886600}));
    dot.position.set(x,y,z+.02);dot.rotation.z=Math.PI/4;mosqueScene.add(dot);mosqueObjects.push(dot);
  });

  // כיתוב "אללה" מעל הדלת הפנימית — שלושה קשתות קישוט
  vmkB(mosqueScene,6,.25,.2,0x886600,0,9.5,16.3);
  vmkB(mosqueScene,6,.25,.2,0x664400,0,9,16.3);
  const calArch=new THREE.Mesh(new THREE.TorusGeometry(1.5,.12,6,16,Math.PI),new THREE.MeshLambertMaterial({color:0x886600}));
  calArch.position.set(0,8.5,16.3);mosqueScene.add(calArch);mosqueObjects.push(calArch);

  // collision — רק קירות חיצוניים + קירות מבנה, ללא גוף המסגד הפנימי
  mosqueBlds=[
    {x:0,z:-44,w:80,d:.8},{x:-21.5,z:44,w:37,d:.8},{x:21.5,z:44,w:37,d:.8},
    {x:40,z:0,w:.8,d:88},{x:-40,z:0,w:.8,d:88},
  ];

  mosqueCamera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,200);
  mosqueCamera.position.set(0,4,-7);
  mosqueCamera.lookAt(0,1,12);
  buildMosqueGuards();
  VILLA.playerX=0;VILLA.playerZ=12;
}

function buildMosqueGuards(){
  mosqueGuards=[];
  // שומר 1 — פטרול בחצי הצפוני, רחוק מהכניסה
  const wps1=[[-20,-15],[20,-15],[20,-35],[-20,-35]];
  addGuard(mosqueScene,wps1,0,0,-25,2.8,mosqueGuards);
  // שומר 2 — ליד כלוב מומו, בצד מערבי
  const wps2=[[-30,-20],[-30,-38],[-15,-38],[-15,-20]];
  addGuard(mosqueScene,wps2,-25,0,-30,2.5,mosqueGuards);
  // שומר 3 — גינה מזרחית עמוקה
  const wps3=[[30,-10],[38,-25],[30,-38],[22,-25]];
  addGuard(mosqueScene,wps3,32,0,-20,3,mosqueGuards);

  // ברונו — דוברמן מסיבי
  const brunoMesh=mkBruno(1.9);brunoMesh.position.set(-2,0,20);brunoMesh.rotation.y=Math.PI;brunoMesh.visible=false;mosqueScene.add(brunoMesh);
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.55,.09,6,12),new THREE.MeshLambertMaterial({color:0x888888}));
  chain.position.set(0,1.35*1.9,.4*1.9);chain.rotation.x=Math.PI/2;brunoMesh.add(chain);
  const brunoBar=new THREE.Mesh(new THREE.BoxGeometry(2.8,.18,.01),new THREE.MeshBasicMaterial({color:0xe74c3c}));brunoBar.position.set(0,4.5,0);brunoMesh.add(brunoBar);
  G.bruno={mesh:brunoMesh,hp:320,mhp:320,spd:5.5,alert:18,atk:3.8,atkT:0,bar:brunoBar,dead:false,phase:1,dashT:3,dashOn:false,dvx:0,dvz:0,patrolAngle:0};
  mosqueObjects.push(brunoMesh);
}

function addGuard(sc,waypoints,x,y,z,spd,arr){
  const g=mkGuard(1);g.position.set(x,y,z);sc.add(g);mosqueObjects.push(g);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1.4,.18,.01),new THREE.MeshBasicMaterial({color:0xe74c3c}));bar.position.set(0,2.5,0);g.add(bar);
  const det=new THREE.Mesh(new THREE.ConeGeometry(.3,.6,5),new THREE.MeshLambertMaterial({color:0xffff00,transparent:true,opacity:.9}));det.position.set(0,2.8,0);g.add(det);
  arr.push({mesh:g,bar,det,waypoints,wpIdx:0,spd,state:'patrol',alertT:0,waitT:0,hp:50,mhp:50,atkT:0});
}

// ════════════════════════════════════════════════
// ENTER / EXIT MOSQUE
// ════════════════════════════════════════════════
function enterMosque(){
  G.paused=true;
  fadeOut(()=>{
    if(!mosqueScene)buildMosqueScene();
    VILLA.inVilla=true;
    VILLA.playerX=0;VILLA.playerZ=12;
    VILLA.playerYaw=Math.PI;
    G.yaw=Math.PI; // מסתכל פנימה לתוך המסגד
    VILLA.detected=false;VILLA.alertCooldown=0;
    VILLA.enterGrace=5.0; // 5 שניות חסינות בכניסה
    mosqueAlerted=false;
    // אתחול מיקום המצלמה מיידית (לא lerp)
    if(mosqueCamera){
      mosqueCamera.position.set(0,4,37);
      mosqueCamera.lookAt(0,1,30);
    }
    mosqueAlerted=false;
    mosqueGuards.forEach(g=>{g.state='patrol';g.alertT=0;g.waitT=0;g.hp=g.mhp;g.atkT=0;if(g.bar)g.bar.scale.x=1;});
    if(G.bruno&&!G.bruno.dead){G.bruno.hp=G.bruno.mhp;G.bruno.phase=1;}
    if(mosqueCageInd){mosqueCageInd.visible=true;}
    // הוסף את הכלב לסצנת המסגד
    scene.remove(PB);
    mosqueScene.add(PB);
    PB.position.set(VILLA.playerX,0,VILLA.playerZ);
    document.getElementById('tb').textContent='🕌 המסגד הגדול — לוד';
    showN('זיפו: "בסדר. קל. מסתנן, מוצא את מומו, יוצאים.\nמה יכול להשתבש."');
    G.paused=false;
    fadeIn();
  });
}

function exitMosque(won){
  G.paused=true;
  fadeOut(()=>{
    VILLA.inVilla=false;
    mosqueScene.remove(PB);
    scene.add(PB);
    PB.position.set(0,0,-55);
    document.getElementById('tb').textContent='🐕 כלבי לוד — לוד';
    // dispose כל objects של המסגד כדי לפנות זיכרון GPU
    mosqueObjects.forEach(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
    mosqueObjects.length=0;
    mosqueGuards.length=0;
    mosqueScene=null; mosqueCamera=null;
    mosqueDoorMesh=null; mosqueDoorLocked=false; mosqueAlerted=false;
    G.particles=G.particles.filter(p=>!p.villa); // נקה חלקיקי מסגד
    if(won&&G.bruno&&G.bruno.dead){
      setMission(11);
    }
    G.paused=false;
    fadeIn();
  });
}
// alias לתאימות
function enterVilla(){enterMosque();}
function exitVilla(won){exitMosque(won);}

// ════════════════════════════════════════════════
// MOSQUE LOOP
// ════════════════════════════════════════════════
// וקטורים קבועים — לא מוקצים מחדש כל פריים
const _vFwd=new THREE.Vector3();
const _vRgt=new THREE.Vector3();
const _vCamTarget=new THREE.Vector3();

let villaWalkT=0;
function updVilla(dt){
  if(!VILLA.inVilla||G.paused||G.dlgOpen)return;
  const dog=G.dogs[G.dog];
  const spd=dog.spd;

  VILLA.playerYaw = G.yaw;
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));

  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])   {inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']) {inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']) {inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}

  const il=Math.sqrt(inputX*inputX+inputZ*inputZ);
  const hasInput=il>.05;
  const iln=hasInput?il:1;

  if(hasInput){
    const step=spd*dt;
    let nx=VILLA.playerX+(inputX/iln)*step;
    let nz=VILLA.playerZ+(inputZ/iln)*step;
    let bx=false,bz=false;
    for(const b of mosqueBlds){
      const hw=b.w/2+0.6,hd=b.d/2+0.6;
      if(nx>b.x-hw&&nx<b.x+hw&&VILLA.playerZ>b.z-hd&&VILLA.playerZ<b.z+hd)bx=true;
      if(VILLA.playerX>b.x-hw&&VILLA.playerX<b.x+hw&&nz>b.z-hd&&nz<b.z+hd)bz=true;
    }
    if(!bx)VILLA.playerX=Math.max(-38,Math.min(38,nx));
    if(!bz)VILLA.playerZ=Math.max(-43,Math.min(46,nz));
  }

  // מצלמה מאחורי השחקן — בדיוק כמו העולם הרגיל
  _vCamTarget.set(
    VILLA.playerX+Math.sin(G.yaw)*7,
    4,
    VILLA.playerZ+Math.cos(G.yaw)*7
  );
  mosqueCamera.position.lerp(_vCamTarget,.12);
  mosqueCamera.lookAt(VILLA.playerX,1,VILLA.playerZ);

  PB.position.set(VILLA.playerX,0,VILLA.playerZ);
  // כיוון הכלב — לכיוון ההליכה (ריאליסטי), לא לכיוון המצלמה
  if(hasInput){
    const moveAngle=Math.atan2(inputX/iln,inputZ/iln);
    const targetY=-moveAngle+Math.PI;
    let diff=targetY-PB.rotation.y;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    PB.rotation.y+=diff*Math.min(1,12*dt);
  }
  if(hasInput){
    villaWalkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(villaWalkT+lg.ph)*.38;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(villaWalkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(villaWalkT*2)*.35;
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+(dogModel.position.y-_by)*.85;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }

  // יציאה דרך השער דרום — רק אם הדלת לא נעולה
  if(VILLA.playerZ>45){
    if(G.mission===9&&!G.momoFreed)showN('זיפו: "אני לא יכול לעזוב בלי מומו!"');
    else if(mosqueDoorLocked)showN('🔒 הדלת נעולה! הבס את ברונו כדי לפתוח!');
    else exitMosque(G.momoFreed);
    return;
  }
  // שחרור מומו
  if(G.mission===9&&!G.momoFreed&&G.cagePos){
    if(d2(VILLA.playerX,VILLA.playerZ,G.cagePos.x,G.cagePos.z)<4){
      G.momoFreed=true;
      if(mosqueCageInd){mosqueCageInd.visible=false;}
      if(G.momoModel){G.momoModel.visible=false;}
      addXP(60);G.score+=200;sCapture();
      spawnVFX(G.cagePos.x,2,G.cagePos.z,0xff69b4,20);
      showN('🔓 מומו שוחררה!\nמומו: "ידעתי שתגיעו!"\nזיפו: "כמעט לא."\nברונו מרים את הראש...');
      // נעל את הדלת — הוסף חסימה קולקטורית ועדכן צבע
      setTimeout(()=>{
        mosqueDoorLocked=true;
        if(mosqueDoorMesh){mosqueDoorMesh.material.color.setHex(0x3a0808);}
        // מנעול ברזל — מוסיף mesh מעל הדלת
        const lock=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.5),new THREE.MeshLambertMaterial({color:0x888880}));
        lock.position.set(-2,2.8,15.6);mosqueScene.add(lock);mosqueObjects.push(lock);
        const lockBar=new THREE.Mesh(new THREE.BoxGeometry(1.8,.15,.5),new THREE.MeshLambertMaterial({color:0x777770}));
        lockBar.position.set(-2,3.6,15.6);mosqueScene.add(lockBar);mosqueObjects.push(lockBar);
        // הוסף את הדלת לcollision
        mosqueBlds.push({x:-2,z:15.8,w:3.2,d:.5});
        showN('🔒 הדלת ננעלה!\nברונו: "אַנְتُمْ مَحَاصِرُونَ!" (אתם לכודים!)');
      },800);
      setTimeout(()=>{
        mosqueAlerted=true;
        mosqueGuards.forEach(g=>g.state='chase');
        // ברונו נכנס מהדלת — spawn דרמטי
        if(G.bruno&&!G.bruno.dead){
          // מקם אותו ממש מחוץ לדלת
          G.bruno.mesh.position.set(-2,0,17.5);
          G.bruno.mesh.rotation.y=Math.PI; // מסתכל פנימה
          G.bruno.mesh.visible=true;
          G.bruno.alert=999; G.bruno.spd=8.5; G.bruno.dashT=0;
          // אפקט כניסה — VFX + ניפוץ הדלת
          spawnVFX(-2,1.5,17,0xff3300,22);
          spawnVFX(-2,1,16,0xff6600,14);
          if(mosqueDoorMesh){mosqueDoorMesh.material.color.setHex(0x1a0404);}
          showN('💢 BOOM! ברונו שובר את הדלת!\nברונו: "אַנْتُمْ مَيِّتُون!" (אתם מתים!)');
        }
      },1500);
    }
  }
  updVillaGuards(dt);
  updVillaBruno(dt);
  if(VILLA.alertCooldown>0)VILLA.alertCooldown-=dt;
}

// קול גילוי שומר
function sAlert(){tone(880,.08,'square',.18);setTimeout(()=>tone(1100,.12,'square',.22),90);}

function updVillaGuards(dt){
  const px=VILLA.playerX,pz=VILLA.playerZ;
  const t=Date.now()*.001;
  if(VILLA.enterGrace>0){VILLA.enterGrace-=dt;return;}
  mosqueGuards.forEach((g,gi)=>{
    if(g.hp<=0)return;
    const gx=g.mesh.position.x,gz=g.mesh.position.z;
    const dd=d2(gx,gz,px,pz);
    if(g.atkT>0)g.atkT-=dt;
    let sees=dd<1.5;
    if(!sees&&dd<7){const toP=Math.atan2(px-gx,pz-gz);let ang=Math.abs(toP-g.mesh.rotation.y)%(Math.PI*2);if(ang>Math.PI)ang=Math.PI*2-ang;sees=ang<Math.PI*.4;}
    // בדיקת חסימת קיר גם בתוך המסגד
    if(sees&&dd>2.5&&isBlockedByWall(gx,gz,px,pz,mosqueBlds))sees=false;
    if(mosqueAlerted)sees=dd<16;
    if(g.det){g.det.material.color.setHex(g.state==='chase'?0xff2200:g.state==='search'?0xff8800:0xffff00);g.det.position.y=2.8+Math.sin(t*3+gi)*.1;}
    if(sees&&g.state==='patrol'){
      g.state='chase';g.alertT=0;sAlert();
      if(!mosqueAlerted){showN(`⚠️ שומר ${gi+1} ראה אותך!`);mosqueGuards.forEach((o,oi)=>{if(oi!==gi&&d2(o.mesh.position.x,o.mesh.position.z,gx,gz)<22)o.state='search';});}
    }
    // אנימציית הליכה — שומרים זזים עם רגליים
    const isMoving=g.state==='chase'||g.state==='search'||(g.state==='patrol'&&g.waitT<=0);
    if(!g._walkT)g._walkT=gi*1.4; // phase offset שונה לכל שומר
    if(isMoving){
      g._walkT+=dt*7;
      // אנימצייה על ילדי הרגליים (עמודים 4-7 בgroup)
      let legIdx=0;
      g.mesh.traverse(child=>{
        if(child.isGroup&&child!==g.mesh){
          child.rotation.x=Math.sin(g._walkT+legIdx*Math.PI)*.32;
          legIdx++;
        }
      });
      // head bob
      g.mesh.position.y=Math.abs(Math.sin(g._walkT))*.05;
    } else {
      g.mesh.position.y=0;
    }
    if(g.state==='chase'){
      const dx=px-gx,dz=pz-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      g.mesh.position.x+=dx/l*g.spd*1.4*dt;g.mesh.position.z+=dz/l*g.spd*1.4*dt;g.mesh.rotation.y=Math.atan2(dx,dz);
      if(dd<2.2&&g.atkT<=0){g.atkT=1.0;dmgPlayer(12);if(!VILLA.detected){VILLA.detected=true;showN('🚨 נתפסת! ברונו מגיע!');mosqueAlerted=true;mosqueGuards.forEach(o=>o.state='chase');if(G.bruno&&!G.bruno.dead)G.bruno.alert=40;}}
      if(!sees){g.alertT+=dt;if(g.alertT>4){g.state='search';g.alertT=0;}}
    } else if(g.state==='search'){
      const tx=px+(Math.random()-.5)*6,tz=pz+(Math.random()-.5)*6;
      const dx=tx-gx,dz=tz-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      if(l>1){g.mesh.position.x+=dx/l*g.spd*.7*dt;g.mesh.position.z+=dz/l*g.spd*.7*dt;g.mesh.rotation.y=Math.atan2(dx,dz);}
      g.alertT+=dt;if(g.alertT>6){g.state='patrol';g.alertT=0;}
      if(sees)g.state='chase';
    } else {
      if(g.waitT>0){g.waitT-=dt;g.mesh.rotation.y+=.8*dt;return;}
      const wp=g.waypoints[g.wpIdx];
      const dx=wp[0]-gx,dz=wp[1]-gz,l=Math.sqrt(dx*dx+dz*dz)||1;
      if(l<1.2){g.wpIdx=(g.wpIdx+1)%g.waypoints.length;g.waitT=.8+Math.random()*.6;}
      else{g.mesh.position.x+=dx/l*g.spd*dt;g.mesh.position.z+=dz/l*g.spd*dt;g.mesh.rotation.y+=(Math.atan2(dx,dz)-g.mesh.rotation.y)*.1;}
    }
    if(g.bar)g.bar.scale.x=Math.max(0,g.hp/g.mhp);
  });
}

function updVillaBruno(dt){
  if(!G.bruno||G.bruno.dead)return;
  const b=G.bruno;
  const px=VILLA.playerX,pz=VILLA.playerZ;
  const bx=b.mesh.position.x,bz=b.mesh.position.z;
  const dd=d2(bx,bz,px,pz);
  // ברונו מגיע רק אחרי שמומו שוחרר
  if(!G.momoFreed){return;}
  if(b.hp<b.mhp*.4&&b.phase===1){b.phase=2;b.spd=7.5;showN('⚠️ ברונו מתפרע!');}
  if(dd<b.alert){
    b.dashT-=dt;
    if(b.dashT<=0&&!b.dashOn&&dd<20){b.dashOn=true;b.dashT=b.phase===2?2:3.2;const dx=px-bx,dz=pz-bz,l=Math.sqrt(dx*dx+dz*dz)||1;b.dvx=dx/l*22;b.dvz=dz/l*22;showN('💥 ברונו돌진!');}
    if(b.dashOn){b.mesh.position.x+=b.dvx*dt;b.mesh.position.z+=b.dvz*dt;b.dvx*=.88;b.dvz*=.88;if(Math.abs(b.dvx)<.5)b.dashOn=false;if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<b.atk)dmgPlayer(25);}
    else{const dx=px-bx,dz=pz-bz,l=Math.sqrt(dx*dx+dz*dz)||1;b.mesh.position.x+=dx/l*b.spd*dt;b.mesh.position.z+=dz/l*b.spd*dt;b.mesh.rotation.y=Math.atan2(dx,dz);if(dd<b.atk){b.atkT-=dt;if(b.atkT<=0){b.atkT=.9;dmgPlayer(18);}}}
  }
  if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
}

function spawnVFX(x,y,z,col,n=8){
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.1,4,4),new THREE.MeshBasicMaterial({color:col,transparent:true}));
    m.position.set(x,y,z);mosqueScene.add(m);
    G.particles.push({mesh:m,vx:(Math.random()-.5)*6,vy:Math.random()*5+2,vz:(Math.random()-.5)*6,life:.8,villa:true});
  }
}

// PICKUPS
// ════════════════════════════════════════════════
function buildPickups(){
  // אוכל על מדרכות ופינות כבישים — לא בתוך מבנים
  const candidates=[
    [14,2],[-14,-3],          // רחוב הרצל
    [2,-38],[0,40],            // שדרות ירושלים
    [-40,-15],[-40,18],        // רחוב הגפן
    [40,-18],[40,26],          // רחוב הדקל
    [6,-116],[-57,-120],       // פרברים צפון
    [-24,108],[30,106],        // גני אביב
  ];
  const spots=candidates.filter(([x,z])=>!isInBuilding(x,z,2.5));
  spots.slice(0,10).forEach(([x,z])=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(.38,7,7),new THREE.MeshLambertMaterial({color:0xe67e22,emissive:0x331100}));
    m.position.set(x,.38,z);scene.add(m);G.pickups.push({mesh:m,x,z,done:false});
  });
}
function buildBones(){
  // עצמות למשימת צד — על מדרכות ובגן
  const candidates=[[80,-22],[32,88],[-40,-18],[8,-78],[44,2]];
  const spots=candidates.filter(([x,z])=>!isInBuilding(x,z,2));
  spots.forEach(([x,z])=>{
    const g=new THREE.Group();
    const mat=new THREE.MeshLambertMaterial({color:0xfff5e0,emissive:0x221100});
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.55,7),mat);shaft.rotation.z=.5;g.add(shaft);
    const b1=new THREE.Mesh(new THREE.SphereGeometry(.13,6,5),mat);b1.position.set(.22,.14,0);g.add(b1);
    const b2=new THREE.Mesh(new THREE.SphereGeometry(.13,6,5),mat);b2.position.set(-.22,-.14,0);g.add(b2);
    g.position.set(x,.25,z);
    const gl=new THREE.Mesh(new THREE.SphereGeometry(.18,5,5),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x334422,transparent:true,opacity:.6}));gl.position.y=.5;g.add(gl);
    scene.add(g);
    G.bones.push({mesh:g,x,z,done:false});
  });
}

// ════════════════════════════════════════════════
// NPCS
// ════════════════════════════════════════════════
function buildNPCs(){
  const npcDefs=[
    {x:-60,z:62,name:'בלה הזקנה',type:'quest',av:'🐕‍🦺',buildFn:()=>mkBella(.85)},
    {x:10,z:-28,name:'שוקי',type:'recruit',av:'🐶',buildFn:()=>mkShuki(.85)},
    {x:-18,z:115,name:'בוקסר',type:'recruit',av:'🐶',buildFn:()=>mkBoxer(.85)},  // מדרכה גני אביב
    {x:80,z:42,name:'לולה',type:'recruit',av:'🐩',buildFn:()=>mkLola(.85)},       // פארק
    {x:11,z:-125,name:'פישקה',type:'recruit',av:'🐕',buildFn:()=>mkFishka(.85)},  // מדרכה ירושלים
    {x:-74,z:52,name:'🥩 מכולת השוק',type:'shop',av:'🏪',buildFn:()=>mkShuki(.7),shopItems:[
      {ico:'🍖',name:'מנת בשר',desc:'+40 בריאות',cost:30,fn:()=>shopBuy('hp')},
      {ico:'💊',name:'תרופה',desc:'+80 בריאות מלא',cost:60,fn:()=>shopBuy('hp_big')},
      {ico:'⚡',name:'מנת אנרגיה',desc:'+100 סטמינה',cost:20,fn:()=>shopBuy('stam')},
    ]},
    {x:-84,z:64,name:'🦷 דוכן הציוד',type:'shop',av:'🏪',buildFn:()=>mkBoxer(.7),shopItems:[
      {ico:'🦷',name:'חידוד שיניים',desc:'+3 כוח קבוע',cost:80,fn:()=>shopBuy('pow')},
      {ico:'🏃',name:'שמן מנועים',desc:'+0.5 מהירות קבוע',cost:60,fn:()=>shopBuy('spd')},
      {ico:'🛡️',name:'שריון פרוות',desc:'+20 HP מקס׳',cost:100,fn:()=>shopBuy('mhp')},
    ]},
  ];
  npcDefs.forEach(n=>{
    // וידוא מיקום בטוח — לא בתוך בניין ולא בתוך כביש
    let {x,z}=n;
    if(isInBuilding(x,z,2)||_isOnRoad(x,z)){
      // מצא נקודה קרובה על מדרכה
      for(const [sx,sz] of _SPAWN_POOL){
        if(!isInBuilding(sx,sz,2)&&!_isOnRoad(sx,sz)&&d2(sx,sz,x,z)<40){x=sx;z=sz;break;}
      }
    }
    const ng=n.buildFn();ng.position.set(x,0,z);scene.add(ng);
    const indCol=n.type==='shop'?0x00ccff:0xf5c518;
    const ind=new THREE.Mesh(new THREE.SphereGeometry(.32,6,6),new THREE.MeshLambertMaterial({color:indCol,emissive:n.type==='shop'?0x003344:0x443300}));ind.position.set(0,2.6,0);ng.add(ind);
    if(n.type==='shop'){
      const shopSign=new THREE.Mesh(new THREE.BoxGeometry(.6,.4,.08),new THREE.MeshLambertMaterial({color:0xf5c518,emissive:0x332200}));shopSign.position.set(0,3.2,0);ng.add(shopSign);
    }
    G.npcs.push({...n,x,z,col:0,mesh:ng,ind,talked:false,recruited:false});
  });
}

// ════════════════════════════════════════════════
// INPUT
// ════════════════════════════════════════════════
function setupInput(){
  document.addEventListener('keydown',e=>{G.keys[e.code]=true;if(e.code==='Tab')e.preventDefault();});
  document.addEventListener('keyup',e=>{G.keys[e.code]=false;});
  if(!isMob){const cv=document.getElementById('cv');cv.addEventListener('click',()=>cv.requestPointerLock());document.addEventListener('pointerlockchange',()=>{G.ml=document.pointerLockElement===cv;});document.addEventListener('mousemove',e=>{if(!G.ml)return;G.yaw-=e.movementX*.0025;G.pitch=Math.max(-.2,Math.min(1.1,G.pitch+e.movementY*.0025));});}
  else setupJoy();
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
function setupJoy(){
  const jz=document.getElementById('jz'),jk=document.getElementById('jk'),cz=document.getElementById('cz'),R=58;
  if(jz._joyReady)return; jz._joyReady=true; // מנע רישום כפול
  jz.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];G.joy={on:true,id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0};},{passive:false});
  jz.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier!==G.joy.id)continue;let dx=t.clientX-G.joy.sx,dy=t.clientY-G.joy.sy,l=Math.sqrt(dx*dx+dy*dy);if(l>R){dx=dx/l*R;dy=dy/l*R;}G.joy.dx=dx/R;G.joy.dy=dy/R;jk.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}},{passive:false});
  const ej=()=>{G.joy.on=false;G.joy.dx=0;G.joy.dy=0;jk.style.transform='translate(-50%,-50%)';};jz.addEventListener('touchend',ej);jz.addEventListener('touchcancel',ej);
  cz.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];G.cam={on:true,id:t.identifier,lx:t.clientX,ly:t.clientY};},{passive:false});
  cz.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier!==G.cam.id)continue;G.yaw-=(t.clientX-G.cam.lx)*.004;G.pitch=Math.max(-.2,Math.min(1.1,G.pitch+(t.clientY-G.cam.ly)*.004));G.cam.lx=t.clientX;G.cam.ly=t.clientY;}},{passive:false});
  const ec=()=>{G.cam.on=false;};cz.addEventListener('touchend',ec);cz.addEventListener('touchcancel',ec);
}
function mAtk(){doAtk();}function mE(){if(G.near)doInteract();}function mJmp(){if(G.onGround){G.velY=8;G.onGround=false;}}function mTab(){switchDog();}

// ════════════════════════════════════════════════
// MISSION ENGINE — strict gates
// ════════════════════════════════════════════════
function setMission(idx){
  if(idx<0||idx>=MISSIONS.length)return;
  if(idx<G.mission)return; // אף פעם לא חוזרים אחורה
  if(idx===G.mission&&idx!==0)return; // לא חוזרים על אותו שלב (חוץ מאתחול)
  G.mission=idx;
  MISSIONS[idx].unlock();
  updateMissionHUD();
  updateNavArrow();
  if(idx>0){showN(`📋 ${MISSIONS[idx].txt}`);saveGame();}
}

function updateMissionHUD(){
  let txt=MISSIONS[G.mission].txt;
  // Update counters dynamically
  if(G.mission===1)txt=txt.replace('0/3',`${G.foodEaten}/3`);
  if(G.mission===3)txt=txt.replace('0/3',`${G.enemiesKilled}/3`);
  if(G.mission===4)txt=txt.replace('0/2',`${G.recruitsDone}/2`);
  document.getElementById('mtx').textContent=txt;
}

function updateNavArrow(){
  const nav=document.getElementById('nav');
  if(G.mission>=23){nav.style.display='none';return;}
  if(G.mission===7){nav.style.display='none';return;}
  const m=MISSIONS[G.mission];
  if(!m||!m.hint){nav.style.display='none';return;}
  document.getElementById('nav-lbl').textContent=m.hint;
  nav.style.display='flex';
}

function nearestOf(arr,getFn){
  const px=PB.position.x,pz=PB.position.z;
  let best=null,bestD=Infinity;
  arr.forEach(o=>{
    const p=getFn(o);if(!p)return;
    const dd=d2(px,pz,p.x,p.z);
    if(dd<bestD){bestD=dd;best=p;}
  });
  return best;
}

function updateNavDirection(){
  if(G.mission===7)return;
  const m=MISSIONS[G.mission];if(!m)return;
  const px=PB.position.x,pz=PB.position.z;
  let tx,tz;
  if(G.mission===0){
    tx=-60;tz=60;
  } else if(G.mission===1){
    const p=nearestOf(G.pickups.filter(p=>!p.done),o=>({x:o.x,z:o.z}));
    if(!p)return;tx=p.x;tz=p.z;
  } else if(G.mission===2){
    const t=nearestOf(G.terrs.filter(t=>!t.cap),o=>({x:o.x,z:o.z}));
    if(!t)return;tx=t.x;tz=t.z;
  } else if(G.mission===3){
    const e=nearestOf(G.enemies.filter(e=>e.hp>0&&e.mesh.visible),o=>({x:o.mesh.position.x,z:o.mesh.position.z}));
    if(!e)return;tx=e.x;tz=e.z;
  } else if(G.mission===4){
    const n=nearestOf(G.npcs.filter(n=>n.type==='recruit'&&!n.recruited),o=>({x:o.x,z:o.z}));
    if(!n)return;tx=n.x;tz=n.z;
  } else if(G.mission===5){
    const t=nearestOf(G.terrs.filter(t=>!t.cap),o=>({x:o.x,z:o.z}));
    if(!t)return;tx=t.x;tz=t.z;
  } else if(G.mission===11||G.mission===12){
    tx=-60;tz=60; // מקום בלה
  } else if(G.mission===13){
    tx=G._fishkaEnemy?G._fishkaEnemy.x:35;tz=G._fishkaEnemy?G._fishkaEnemy.z:35;
  } else if(G.mission>=14&&G.mission<=19){
    tx=80;tz=-80; // עיריית לוד
  } else {
    const tgt=m.targetFn();if(!tgt)return;
    tx=(tgt.mesh?tgt.mesh.position.x:tgt.x)||0;
    tz=(tgt.mesh?tgt.mesh.position.z:tgt.z)||0;
  }
  const dx=tx-px, dz=tz-pz;
  const worldAngle=Math.atan2(dx,dz);
  const screenAngle=worldAngle-G.yaw+Math.PI;
  document.getElementById('nav-arrow').style.transform=`rotate(${screenAngle}rad)`;
  const dist=Math.round(Math.sqrt(dx*dx+dz*dz));
  document.getElementById('nav-lbl').textContent=`${m.hint} (${dist}מ׳)`;
}

// ════════════════════════════════════════════════
// LOOP
// ════════════════════════════════════════════════
let walkT=0;
function loop(){
  requestAnimationFrame(loop);
  // שדרוג: הגבל dt למניעת physics explode אחרי tab מוסתר
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, .05);
  // שדרוג: אל תרנדר כשהלשונית נסתרת — חסוך GPU
  if(document.hidden) return;
  if(VILLA.inVilla){
    if(!G.paused&&!G.dlgOpen&&!G.cutOpen)updVilla(dt);
    updPfx(dt);
    if(mosqueCamera)renderer.render(mosqueScene,mosqueCamera);
    updHUD();
    return;
  }
  if(CITY.inCity){
    updCityHall(dt);updPfx(dt);
    if(cityCamera)renderer.render(cityScene,cityCamera);
    updHUD();
    return;
  }
  if(!G.paused&&!G.dlgOpen&&!G.cutOpen){
    updPlayer(dt);updEnemies(dt);updPickups(dt);updTerrs(dt);updNPCs(dt);updPfx(dt);
    updateNavDirection();
    updSQPanel();
    if(G.mission>=12)updCh3Entities(dt);
    // פיצ'רים חדשים — throttle על מובייל לחסוך CPU
    const _fc=G._frameCount||0;
    updDayNight(dt);
    _updLampPool();
    updWeather(dt);
    updCars(dt);
    updHumanNPCs(dt);
    updCollectibles(dt);
    updBldCapture(dt);
    updCh5(dt); // פרק ה׳
    // כניסה למסגד — שחקן הגיע לדלת במשימה 8
    if(G.mission===8&&G.gateMarker){
      const px=PB.position.x,pz=PB.position.z;
      if(d2(px,pz,G.gateMarker.x,G.gateMarker.z)<5)setMission(9);
    }
    // כניסה לעירייה — משימה 15, ליד דלת הבניין
    if(G.mission===14||G.mission===15){
      const px=PB.position.x,pz=PB.position.z;
      if(d2(px,pz,80,-68)<5)enterCityHall();
    }
  }
  updCamera();updHUD();drawMM();renderer.render(scene,camera);
}

// ════════════════════════════════════════════════
// PLAYER UPDATE
// ════════════════════════════════════════════════
function updPlayer(dt){
  const dog=G.dogs[G.dog];
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));
  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp']){inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']){inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']){inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}
  // נרמול קלט
  const il=Math.sqrt(inputX*inputX+inputZ*inputZ)||1;
  const hasInput=Math.abs(inputX)+Math.abs(inputZ)>.01;
  // סטמינה משפיעה על מהירות — מתחת ל-20% → האטה, מתחת ל-5% → כמעט עצירה
  const stamFactor=dog.stam<20?0.4+dog.stam/20*0.6:dog.stam<5?0.2:1.0;
  const targetVX=hasInput?(inputX/il)*dog.spd*stamFactor:0;
  const targetVZ=hasInput?(inputZ/il)*dog.spd*stamFactor:0;
  // תאוצה/האטה הדרגתית
  const accel=hasInput?12:18; // האטה מהירה יותר מתאוצה
  G.vx+=(targetVX-G.vx)*Math.min(1,accel*dt);
  G.vz+=(targetVZ-G.vz)*Math.min(1,accel*dt);
  const moving=Math.abs(G.vx)+Math.abs(G.vz)>.05;
  if(moving){
    PB.rotation.y=Math.atan2(-G.vx,-G.vz);
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    // head bob — תנועה עם גוף
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
    dog.stam=Math.max(0,dog.stam-5*dt);
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+(dogModel.position.y-_by)*.85;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }
  // קפיצה — arc טבעי יותר עם coyote time קצר
  if(G.keys['Space']&&G.onGround){G.velY=9.5;G.onGround=false;spawnPfx(PB.position.x,.1,PB.position.z,0xc8a060,3);}
  // כוח משיכה מוגבר בנפילה (feel כבד יותר)
  const gravMul=G.velY<0?1.4:1;
  G.velY+=GRAV*gravMul*dt;
  PB.position.y+=G.velY*dt;
  const _gndY=getGroundY(PB.position.x,PB.position.z);
  if(PB.position.y<=_gndY){PB.position.y=_gndY;G.velY=0;G.onGround=true;}
  // תנועה עם collision — X וZ נבדקים בנפרד (sliding לאורך קירות)
  // pruning: בודקים רק בניינים בטווח 20 יחידות מהשחקן
  const nx=Math.max(-175,Math.min(175,PB.position.x+G.vx*dt));
  const nz=Math.max(-175,Math.min(175,PB.position.z+G.vz*dt));
  let blkX=false,blkZ=false;
  const px_=PB.position.x,pz_=PB.position.z;
  for(const b of blds){
    if(Math.abs(b.x-px_)>b.w/2+20||Math.abs(b.z-pz_)>b.d/2+20)continue;
    const hw=b.w/2+1,hd=b.d/2+1;
    if(nx>b.x-hw&&nx<b.x+hw&&pz_>b.z-hd&&pz_<b.z+hd)blkX=true;
    if(px_>b.x-hw&&px_<b.x+hw&&nz>b.z-hd&&nz<b.z+hd)blkZ=true;
  }
  if(!blkX)PB.position.x=nx; else G.vx*=.1;
  if(!blkZ)PB.position.z=nz; else G.vz*=.1;
  if(G.atkCD>0)G.atkCD-=dt;
  G._frameCount=(G._frameCount||0)+1; // עבור AI throttling
  if(G.keys['KeyF']&&G.atkCD<=0){doAtk();G.atkCD=.5;}
  if(G.keys['KeyE']){G.keys['KeyE']=false;if(G.near)doInteract();}
  if(G.keys['Tab']){G.keys['Tab']=false;switchDog();}
  dog.stam=Math.min(100,dog.stam+15*dt);
  if(!G._frameCount||G._frameCount%3===0)checkNear();
  checkCh2Triggers();
}

// ════════════════════════════════════════════════
// ATTACK — gated strictly
// ════════════════════════════════════════════════
function doAtk(){
  sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);
  const dog=G.dogs[G.dog],px=PB.position.x,pz=PB.position.z;
  spawnPfx(px,1,pz,0xf5c518,4);

      if(G.mission<3){showN('⚠️ עדיין לא הגיע הזמן לקרב!\nקודם השלם את המשימה הנוכחית.');return;}

  // בדוק אם יש אויב בטווח — אם לא, תן swing feedback קצר
  const _hasTarget=(()=>{
    if(VILLA.inVilla||CITY.inCity)return true;
    const anyE=G.enemies.some(e=>e.hp>0&&e.mesh.visible&&d2(e.mesh.position.x,e.mesh.position.z,px,pz)<5.5);
    const anyB=G.bosses.some(b=>!b.dead&&b.mesh.visible&&d2(b.mesh.position.x,b.mesh.position.z,px,pz)<6);
    const anyFish=G._fishkaEnemy&&!G._fishkaEnemy.caught&&d2(G._fishkaEnemy.x,G._fishkaEnemy.z,px,pz)<5;
    const anyT=G._titanEnemy&&!G._titanEnemy.dead&&d2(G._titanEnemy.x,G._titanEnemy.z,px,pz)<6;
    return anyE||anyB||anyFish||anyT;
  })();
  if(!_hasTarget){
    tone(180,.07,'square',.07); // "whoosh" קצר
    PB.rotation.z=.18;setTimeout(()=>PB.rotation.z=0,90);
    return;
  }

  // אויבים רגילים — מכל שלב 3 ואילך (לא בתוך המסגד)
  if(G.mission>=3&&!VILLA.inVilla){
    G.enemies.forEach(e=>{
      if(e.hp<=0||!e.mesh.visible)return;
      if(d2(e.mesh.position.x,e.mesh.position.z,px,pz)<4.2){
        const dmg=dog.pow*10*(1+dog.lv*.1);e.hp-=dmg;sHit();haptic(22);flash(e.mesh.children[0]);spawnBlood(e.mesh.position.x,1,e.mesh.position.z);showDmg(e.mesh.position.x,1,e.mesh.position.z,Math.round(dmg));
        if(e.hp<=0){e.hp=0;e.mesh.visible=false;sEDie();haptic([60,20,40]);addXP(20);G.score+=50;G.enemiesKilled++;G.totalKills++;
          const coins=10+Math.floor(Math.random()*8);G.coins+=coins;updCoins();showDmg(e.mesh.position.x,1.5,e.mesh.position.z,'+'+coins+'💰',true);
          updateMissionHUD();
          // בדיקה מיידית לגיסות טיטאן
          if(e._titan&&G.mission===21)_checkCh5Progress();
          if(G.mission===3&&G.enemiesKilled>=3){showN(`✅ הכנעת 3/3 אויבים! עוברים לשלב הבא!`);setTimeout(()=>setMission(4),1200);}
          else if(G.mission===3) showN(`⚔️ הכנעת ${G.enemiesKilled}/3 אויבים`);
          // ── respawn אויב חדש — לא עבור גיסות טיטאן ──
          if(!e._titan)setTimeout(()=>_respawnEnemy(e),4000+Math.random()*6000);
        }
      }
    });
  }

  // בוס — רק בשלב 6
  if(G.mission===6){
    G.bosses.forEach(b=>{
      if(b.dead||!b.mesh.visible)return;
      if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<4.5){
        const dmg=dog.pow*10*(1+dog.lv*.1);b.hp-=dmg;sHit();haptic(22);flash(b.mesh.children[0]);spawnBlood(b.mesh.position.x,1,b.mesh.position.z,16);showDmg(b.mesh.position.x,1,b.mesh.position.z,Math.round(dmg));
        if(b.hp<=0){b.dead=true;b.mesh.visible=false;sCapture();haptic([80,30,80]);addXP(80);G.score+=300;G.coins+=80;updCoins();spawnBlood(b.mesh.position.x,2,b.mesh.position.z,28);setTimeout(()=>showCut('win',()=>setMission(7)),600);}
      }
    });
  }

  // שומרי מסגד — מיסיון 9 ו-10
  if(VILLA.inVilla&&(G.mission===9||G.mission===10)){
    const px=VILLA.playerX,pz=VILLA.playerZ;
    mosqueGuards.forEach(g=>{
      if(g.hp<=0)return;
      if(d2(g.mesh.position.x,g.mesh.position.z,px,pz)<3.5){
        const dmg=dog.pow*9*(1+dog.lv*.1);g.hp-=dmg;sHit();haptic(20);
        if(g.mesh.children[0])flash(g.mesh.children[0]);
        spawnVFX(g.mesh.position.x,1,g.mesh.position.z,0xe74c3c,5);spawnBlood(g.mesh.position.x,1,g.mesh.position.z,8);showDmgVilla(Math.round(dmg));
        if(g.hp<=0){g.hp=0;g.state='patrol';g.mesh.visible=false;haptic([40,20,40]);addXP(15);G.score+=30;G.coins+=8;updCoins();showN('✅ שומר הוכנע!');}
        else{g.state='chase';}
      }
    });
  }

  // ברונו — boss פרק ב׳ בתוך המסגד (מיסיון 9 או 10)
  if(VILLA.inVilla&&(G.mission===9||G.mission===10)&&G.bruno&&!G.bruno.dead){
    const b=G.bruno;
    const px=VILLA.playerX,pz=VILLA.playerZ;
    if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<4.8){
      const dmg=dog.pow*10*(1+dog.lv*.1);b.hp-=dmg;sHit();haptic(25);
      flash(b.mesh.children[0]);
      spawnVFX(b.mesh.position.x,1,b.mesh.position.z,0xe74c3c,7);spawnBlood(b.mesh.position.x,1,b.mesh.position.z,14);showDmgVilla(Math.round(dmg));
      if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
      if(b.hp<=0){
        b.dead=true;b.mesh.visible=false;sCapture();haptic([100,40,100]);addXP(120);G.score+=500;G.coins+=120;updCoins();
        spawnVFX(b.mesh.position.x,2,b.mesh.position.z,0xf5c518,28);spawnBlood(b.mesh.position.x,2,b.mesh.position.z,30);
        // פתח את הדלת
        mosqueDoorLocked=false;
        if(mosqueDoorMesh){mosqueDoorMesh.material.color.setHex(0x3a2010);}
        mosqueBlds=mosqueBlds.filter(b=>!(Math.abs(b.x+2)<1&&Math.abs(b.z-15.8)<1));
        showN('🔓 הדלת נפתחה! ברח מהמסגד!');
        setTimeout(()=>showCut('win2',()=>{exitMosque(true);setTimeout(()=>setMission(11),800);}),1200);
      }
    }
    return;
  }
}
function flash(m){if(!m?.material)return;const o=m.material.color.getHex();m.material.color.setHex(0xff2222);setTimeout(()=>{if(m.material)m.material.color.setHex(o);},200);}

// ── מסך מוות ──
let _dyingLock=false;
function playerDeath(){
  if(_dyingLock)return;
  _dyingLock=true;
  G.paused=true;
  // עונש ניקוד
  const penalty=Math.min(G.score,Math.floor(G.score*.1));
  G.score=Math.max(0,G.score-penalty);
  // fade לאדום
  const hf=document.getElementById('hf');
  hf.style.transition='background .4s';
  hf.style.background='rgba(180,0,0,.85)';
  // הצג מסך
  let overlay=document.getElementById('death-ov');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='death-ov';
    overlay.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:250;pointer-events:all;';
    overlay.innerHTML=`
      <div style="font-size:clamp(32px,8vw,60px);margin-bottom:8px;">💀</div>
      <div style="color:#ff4444;font-size:clamp(20px,5vw,36px);font-weight:bold;text-shadow:0 0 20px #ff0000;margin-bottom:6px;">נפלת!</div>
      <div id="death-pen" style="color:#aaa;font-size:clamp(12px,3vw,16px);margin-bottom:22px;"></div>
      <button id="death-btn" style="background:#f5c518;color:#000;border:none;border-radius:10px;padding:10px 28px;font-size:16px;font-weight:bold;cursor:pointer;">קום והמשך ▶</button>`;
    document.body.appendChild(overlay);
    document.getElementById('death-btn').addEventListener('click',playerRespawn);
  }
  overlay.style.display='flex';
  document.getElementById('death-pen').textContent=penalty>0?`-${penalty} ניקוד`:'';
  sHit();setTimeout(()=>sHit(),300);
}
function playerRespawn(){
  const dog=G.dogs[G.dog];
  dog.hp=Math.round(dog.mhp*.35);
  // ריספאון — קרוב לנקודת התחלה או נקודה בטוחה
  if(VILLA.inVilla){VILLA.playerX=0;VILLA.playerZ=30;}
  else{PB.position.set(0,0,60);}
  // נקה overlay
  const ov=document.getElementById('death-ov');if(ov)ov.style.display='none';
  const hf=document.getElementById('hf');
  hf.style.background='rgba(231,76,60,.38)';
  setTimeout(()=>{hf.style.background='rgba(231,76,60,0)';hf.style.transition='background .08s';},800);
  // אויבים מסביב — דחף אותם הרחק
  G.enemies.forEach(e=>{if(e.hp>0&&e.mesh.visible){e.state='patrol';e.patT=3;}});
  if(VILLA.inVilla){mosqueGuards.forEach(g=>{if(g.hp>0)g.state='patrol';});mosqueAlerted=false;}
  G.paused=false;
  _dyingLock=false;
  showN('🐾 קמת! (' + Math.round(dog.hp) + '/' + dog.mhp + ' בריאות)');
}
function dmgPlayer(dmg){
  const dog=G.dogs[G.dog];
  dog.hp=Math.max(0,dog.hp-dmg);
  sHit();haptic(dmg>=20?[60,20,40]:30);
  const hf=document.getElementById('hf');
  hf.classList.add('on');setTimeout(()=>hf.classList.remove('on'),150);
  if(dog.hp<=0)playerDeath();
}

// ════════════════════════════════════════════════
// NEARBY & INTERACT
// ════════════════════════════════════════════════
function checkNear(){
  const px=PB.position.x,pz=PB.position.z;G.near=null;let best=5;
  G.pickups.forEach(p=>{if(p.done)return;const dd=d2(p.x,p.z,px,pz);if(dd<best){best=dd;G.near=p;}});
  G.bones.forEach(b=>{if(b.done)return;const dd=d2(b.x,b.z,px,pz);if(dd<best){best=dd;G.near=b;}});
  G.collectibles.forEach(c=>{if(c.done)return;const dd=d2(c.x,c.z,px,pz);if(dd<best){best=dd;G.near=c;}});
  G.npcs.forEach(n=>{
    if(n._dead)return;
    if(d2(n.x,n.z,px,pz)>90)return; // מחוץ לטווח // בלה מתה — לא ניתן לאינטראקציה
    const dd=d2(n.x,n.z,px,pz);if(dd<best){best=dd;G.near=n;}
  });
  if(G.near){
    _hudIP.style.display='block';
    if(G.near.type&&G.near.type.ico)_hudIP.textContent=`🟢 E — אסוף ${G.near.type.ico} ${G.near.type.name}`;
    else if(G.near.done!==undefined&&G.near.type==='bone')_hudIP.textContent='🟢 E — אסוף עצם 🦴';
    else if(G.near.done!==undefined)_hudIP.textContent='🟢 E — אסוף אוכל 🍖';
    else if(G.near.type==='shop')_hudIP.textContent=`🟢 E — ${G.near.name}`;
    else _hudIP.textContent=`🟢 E — דבר עם ${G.near.name}`;
  }
  else _hudIP.style.display='none';
}
function doInteract(){
  const o=G.near;if(!o)return;
  // קולקטיבל
  if(o.type&&o.type.ico){
    o.done=true;scene.remove(o.mesh);sPickup();haptic([15,8,20]);
    addXP(o.type.xp);G.coins+=o.type.coins;updCoins();G.collFound++;
    document.getElementById('coll-count').textContent=G.collFound;
    showN(`${o.type.ico} נמצא: ${o.type.name}!\n+${o.type.xp} XP  +${o.type.coins} 💰  (${G.collFound}/${G.collectibles.length})`);
    if(G.collFound>=G.collectibles.length)showN('⭐ כל הקולקטיבלים נאספו! +100 XP!'),addXP(100);
    return;
  }
  if(o.type==='bone'){
    // side quest bone
    o.done=true;scene.remove(o.mesh);sPickup();haptic([20,10,20]);G.sideQ.bones.n++;G.coins+=5;updCoins();
    showN(`🦴 עצם! (${G.sideQ.bones.n}/5 למשימת צד)`);
    updSQPanel();
    if(G.sideQ.bones.n>=5&&!G.sideQ.bones.done){G.sideQ.bones.done=true;addXP(40);G.coins+=50;updCoins();haptic([60,30,60]);showN('🏆 משימת צד: עצמות ברחוב — הושלמה!\n+40 XP + 50 💰');}
    return;
  }
  if(o.done!==undefined){
    // food
    if(G.mission<1){showN('⚠️ קודם דבר עם בלה הזקנה!');return;}
    o.done=true;scene.remove(o.mesh);const dog=G.dogs[G.dog];dog.hp=Math.min(dog.mhp,dog.hp+25);G.score+=10;G.foodEaten++;sPickup();haptic(15);addXP(5);
    updateMissionHUD();
    showN(`🍖 אכלת! +25 בריאות (${G.foodEaten}/3 מנות)`);
    if(G.mission===1&&G.foodEaten>=3)setMission(2);
  } else if(o.type==='quest')dlgElder(o);
  else if(o.type==='shop')openShop(o);
  else if(o.type==='recruit'){
    if(G.mission<4){showN(`${o.name}: "תחזור אליי מאוחר יותר..."`);return;}
    dlgRecruit(o);
  }
}

// ════════════════════════════════════════════════
// DIALOGS
// ════════════════════════════════════════════════
function dlgElder(n){
  if(n._dead)return; // בלה מתה — אין דיאלוג
  if(G.mission>0){openDlg(n.av,n.name,'כבר אמרתי לך — לך ותבצע את המשימות! 🐾',[{t:'בסדר!',fn:closeDlg}]);return;}
  openDlg(n.av,n.name,'אני בלה. הייתי מלכת הרחוב פעם...\n\nכנופיית "כלבי הגשר" שולטת בכל. כדי לנצח — אכלו, גייסו כלבים, ורק אז לחמו.\n\nהבנתם? אז קדימה!',
    [{t:'תודה בלה! קדימה',fn:()=>{closeDlg();setMission(1);showN('בלה: "קודם אכלו — כלב רעב לא לוחם!"');}},
     {t:'עוד שאלה...',fn:()=>{closeDlg();showN('בלה: "אין זמן לשאלות — לכו!"');}},]);
}
function dlgRecruit(n){
  const isFemale=n.name==='פישקה'||n.name==='לולה';
  if(n.recruited){openDlg(n.av,n.name,'אני כבר בכנופייה! יחד ננצח! 🐾',[{t:'מעולה!',fn:closeDlg}]);return;}
  const isMomo=G.dog==='momo';
  const momoTxt=isFemale
    ?`מומו! שמעתי עליך.\nאני מצטרפת — יש לי חשבון עם "כלבי הגשר"!`
    :`מומו! שמעתי עליך.\nאני מצטרף — יש לי חשבון עם "כלבי הגשר"!`;
  const otherTxt=isFemale
    ?`אולי אצטרף...\nאבל שלחו את מומו. היא יודעת לדבר. אני לא הולכת עם כל אחד.`
    :`אולי אצטרף...\nאבל שלחו את מומו. היא יודעת לדבר. אני לא הולך עם כל אחד.`;
  const welcomeBtn=isFemale?`ברוכה הבאה, ${n.name}! 🐾`:`ברוך הבא, ${n.name}! 🐾`;
  const cowardBtn=isFemale?'פחדנית! 😤':'פחדן! 😤';
  const bringMomoMsg=isFemale?`${n.name}: "תביאי את מומו."` :`${n.name}: "תביא את מומו."`;
  openDlg(n.av,n.name,isMomo?momoTxt:otherTxt,
    isMomo?[{t:welcomeBtn,fn:()=>{recruitDog(n);closeDlg();}}]:[{t:'אחזור עם מומו',fn:closeDlg},{t:cowardBtn,fn:()=>{closeDlg();showN(bringMomoMsg);}},]);
}
function recruitDog(n){
  const isFemale=n.name==='פישקה'||n.name==='לולה';
  n.recruited=true;n.mesh.children[0].material.color.setHex(0xf5c518);n.ind.material.color.setHex(0x2ecc71);
  G.gang++;G.recruitsDone++;document.getElementById('gc').textContent=G.gang;addXP(30);G.score+=75;sCapture();
  updateMissionHUD();
  showN(`${n.name} ${isFemale?'הצטרפה':'הצטרף'} לכנופייה! 🐾 (${G.recruitsDone}/2)`);
  if(G.recruitsDone>=2&&G.mission===4){showCut('ch2',()=>setMission(5));}
}

// ════════════════════════════════════════════════
// SWITCH DOG
// ════════════════════════════════════════════════
function switchDog(){
  const dl=['colin','zippo','momo'];
  let next=dl[(dl.indexOf(G.dog)+1)%3];
  // מומו נחטפה — אי אפשר לבחור אותה עד שמשוחררת
  if(next==='momo'&&G.ch2Active&&!G.momoFreed){
    next=dl[(dl.indexOf(next)+1)%3]; // דלג למגה הבא
    showN('👑 מומו נחטפה! אי אפשר לשחק איתה כרגע.');
  }
  G.dog=next;
  document.getElementById('hdn').textContent=G.dogs[G.dog].name;
  // שמור מיקום לפי הסצנה הנכונה
  const savedPos=PB.position.clone();
  const savedVillaX=VILLA.playerX,savedVillaZ=VILLA.playerZ;
  buildPlayer();
  // שחזר מיקום
  PB.position.copy(savedPos);
  if(VILLA.inVilla){VILLA.playerX=savedVillaX;VILLA.playerZ=savedVillaZ;PB.position.set(savedVillaX,0,savedVillaZ);}
  showN({colin:'🦴 קולין — כוח',zippo:'⚡ זיפו — מהירות',momo:'👑 מומו — כריזמה'}[G.dog]);
}

function checkCh2Triggers(){
  if(!G.ch2Active)return;
  const px=PB.position.x,pz=PB.position.z;
  // שלב 8 — הגיע לשער הוילה (marker בעולם הראשי)
  if(G.mission===8&&d2(px,pz,0,0)<8){
    // trigger כשנגשים לנקודת הוילה (טלפורט)
  }
}

// ════════════════════════════════════════════════
// ENEMIES AI — gated
// ════════════════════════════════════════════════
// כל אויב: state = 'patrol' | 'chase' | 'search'
// FOV: 120° קדימה, 40° אחורה רק בטווח קצר
// זיכרון: רודפים לנקודה אחרונה שנראתה + 4 שניות חיפוש
// תיאום: כשמגלים — מזעיקים אויבים קרובים
function isBlockedByWall(ax,az,bx,bz,walls){
  // בדיקה גסה: האם קו הראייה עובר דרך בניין
  const steps=6;
  for(let s=1;s<steps;s++){
    const t=s/steps;
    const ix=ax+(bx-ax)*t, iz=az+(bz-az)*t;
    for(const w of walls){
      if(ix>w.x-w.w/2&&ix<w.x+w.w/2&&iz>w.z-w.d/2&&iz<w.z+w.d/2)return true;
    }
  }
  return false;
}
function canSeePlayer(e,px,pz){
  const ex=e.mesh.position.x,ez=e.mesh.position.z;
  const dd=d2(ex,ez,px,pz);
  if(dd>e.alert)return false;
  // זווית ראייה
  const toPlayer=Math.atan2(px-ex,pz-ez);
  const facing=e.mesh.rotation.y;
  let angleDiff=Math.abs(toPlayer-facing)%(Math.PI*2);
  if(angleDiff>Math.PI)angleDiff=Math.PI*2-angleDiff;
  const fov=dd<5?Math.PI:Math.PI*(2/3);
  if(angleDiff>=fov/2)return false;
  // בדיקת חסימת קיר — לא רואים דרך בניינים
  if(dd>4&&isBlockedByWall(ex,ez,px,pz,blds))return false;
  return true;
}
function alertNearby(e,px,pz){
  G.enemies.forEach(other=>{
    if(other===e||other.hp<=0||!other.mesh.visible)return;
    if(d2(other.mesh.position.x,other.mesh.position.z,e.mesh.position.x,e.mesh.position.z)<20){
      other.state='chase';other.lastSeenX=px;other.lastSeenZ=pz;other.searchT=5;
    }
  });
}
function updEnemies(dt){
  const px=PB.position.x,pz=PB.position.z;
  if(G.mission>=3&&!VILLA.inVilla){
    G.enemies.forEach(e=>{
      if(e.hp<=0||!e.mesh.visible)return;
      const dd=d2(e.mesh.position.x,e.mesh.position.z,px,pz);
      const sees=canSeePlayer(e,px,pz);
      // מעברי state
      if(sees){
        if(e.state!=='chase'){alertNearby(e,px,pz);if(e.state==='patrol')showN('👁️ גילו אותך!');}
        e.state='chase';e.lastSeenX=px;e.lastSeenZ=pz;e.searchT=4;
      } else if(e.state==='chase'){
        e.state='search';e.searchT=4;
      }
      if(e.state==='chase'||e.state==='search'){
        const tx=e.state==='chase'?px:e.lastSeenX;
        const tz=e.state==='chase'?pz:e.lastSeenZ;
        const dx=tx-e.mesh.position.x,dz=tz-e.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;
        const spd=e.state==='search'?e.spd*.5:e.spd;
        // ── collision עם בניינים — אויב מחליק לאורך הקיר ──
        const enx=e.mesh.position.x+dx/l*spd*dt;
        const enz=e.mesh.position.z+dz/l*spd*dt;
        let eblkX=false,eblkZ=false;
        for(const b of blds){
          if(Math.abs(b.x-e.mesh.position.x)>b.w/2+16||Math.abs(b.z-e.mesh.position.z)>b.d/2+16)continue;
          const hw=b.w/2+.95,hd=b.d/2+.95;
          if(enx>b.x-hw&&enx<b.x+hw&&e.mesh.position.z>b.z-hd&&e.mesh.position.z<b.z+hd)eblkX=true;
          if(e.mesh.position.x>b.x-hw&&e.mesh.position.x<b.x+hw&&enz>b.z-hd&&enz<b.z+hd)eblkZ=true;
        }
        // החלקה לאורך הקיר + היגוי קל לעקוף פינות
        if(!eblkX)e.mesh.position.x=enx;
        else if(!eblkZ){e.mesh.position.z+=dz/l*spd*dt*1.35;if(!e._wallT)e._wallT=0;e._wallT+=dt;}
        if(!eblkZ)e.mesh.position.z=enz;
        else if(!eblkX){e.mesh.position.x+=dx/l*spd*dt*1.35;if(!e._wallT)e._wallT=0;e._wallT+=dt;}
        // אם תקוע יותר מ-1.5 שניות — נסה נקודה אחרת
        if(eblkX&&eblkZ){if(!e._wallT)e._wallT=0;e._wallT+=dt;if(e._wallT>1.5){e._wallT=0;e.patAng=(e.patAng||0)+Math.PI*.5+Math.random()*.4;e.state='patrol';e.patT=0.8;}}
        else e._wallT=Math.max(0,(e._wallT||0)-dt*2);
        e.mesh.rotation.y=Math.atan2(dx,dz);
        // תקיפה
        if(dd<e.atk&&e.state==='chase'){e.atkT-=dt;if(e.atkT<=0){e.atkT=1.2;dmgPlayer(8);}}
        // סוף חיפוש
        if(e.state==='search'){e.searchT-=dt;if(e.searchT<=0){e.state='patrol';e.patT=0;}}
      } else {
        // סיור — תנועה אקראית
        e.patT-=dt;
        if(e.patT<=0){e.patAng=Math.random()*Math.PI*2;e.patT=2+Math.random()*3;}
        const patX=e.homeX+Math.sin(e.patAng)*9,patZ=e.homeZ+Math.cos(e.patAng)*9;
        const dx=patX-e.mesh.position.x,dz=patZ-e.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;
        if(l>1.5){e.mesh.position.x+=dx/l*(e.spd*.3)*dt;e.mesh.position.z+=dz/l*(e.spd*.3)*dt;
          e.mesh.rotation.y+=(Math.atan2(dx,dz)-e.mesh.rotation.y)*.08;} // סיבוב חלק
      }
      if(e.bar){e.bar.scale.x=Math.max(0,e.hp/e.mhp);e.bar.material.color.setHex(e.state==='chase'?0xff4400:e.hp/e.mhp>.5?0xe74c3c:0xffff00);}
    });
  }
  // בוס — רק שלב 6
  if(G.mission===6){
    G.bosses.forEach(b=>{
      if(b.dead||!b.mesh.visible)return;
      const dd=d2(b.mesh.position.x,b.mesh.position.z,px,pz);
      if(b.hp<b.mhp*.5&&b.phase===1){b.phase=2;b.spd=6.5;showN("⚠️ ג'ק כועס!");}
      if(dd<b.alert){
        b.dashT-=dt;
        if(b.dashT<=0&&!b.dashOn&&dd<18){b.dashOn=true;b.dashT=b.phase===2?2.5:4;const dx=px-b.mesh.position.x,dz=pz-b.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;b.dvx=dx/l*18;b.dvz=dz/l*18;showN("👹 ג'ק돌진!");}
        if(b.dashOn){b.mesh.position.x+=b.dvx*dt;b.mesh.position.z+=b.dvz*dt;b.dvx*=.9;b.dvz*=.9;if(Math.abs(b.dvx)<.5)b.dashOn=false;if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<b.atk)dmgPlayer(20);}
        else{const dx=px-b.mesh.position.x,dz=pz-b.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;
          // collision עם בניינים לבוס
          const bnx=b.mesh.position.x+dx/l*b.spd*dt,bnz=b.mesh.position.z+dz/l*b.spd*dt;
          let bblkX=false,bblkZ=false;
          for(const bl of blds){if(Math.abs(bl.x-b.mesh.position.x)>bl.w/2+18||Math.abs(bl.z-b.mesh.position.z)>bl.d/2+18)continue;const hw=bl.w/2+1.2,hd=bl.d/2+1.2;if(bnx>bl.x-hw&&bnx<bl.x+hw&&b.mesh.position.z>bl.z-hd&&b.mesh.position.z<bl.z+hd)bblkX=true;if(b.mesh.position.x>bl.x-hw&&b.mesh.position.x<bl.x+hw&&bnz>bl.z-hd&&bnz<bl.z+hd)bblkZ=true;}
          if(!bblkX)b.mesh.position.x=bnx;else b.mesh.position.z+=dz/l*b.spd*dt;
          if(!bblkZ)b.mesh.position.z=bnz;else b.mesh.position.x+=dx/l*b.spd*dt;
          b.mesh.rotation.y=Math.atan2(dx,dz);if(dd<b.atk){b.atkT-=dt;if(b.atkT<=0){b.atkT=1;dmgPlayer(15);}}}
      }
      if(b.bar){b.bar.scale.x=Math.max(0,b.hp/b.mhp);b.bar.material.color.setHex(b.phase===2?0xff6600:0xff0000);}
    });
  }
  // ברונו — boss פרק ב׳, שלב 10
  if(G.mission===10&&G.bruno&&!G.bruno.dead&&G.bruno.mesh.visible){
    const b=G.bruno;
    const dd=d2(b.mesh.position.x,b.mesh.position.z,px,pz);
    if(b.hp<b.mhp*.4&&b.phase===1){b.phase=2;b.spd=7.5;showN('⚠️ ברונו מתפרע! גררר!');}
    if(dd<b.alert){
      b.dashT-=dt;
      if(b.dashT<=0&&!b.dashOn&&dd<20){b.dashOn=true;b.dashT=b.phase===2?2:3.5;const dx=px-b.mesh.position.x,dz=pz-b.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;b.dvx=dx/l*22;b.dvz=dz/l*22;showN('💥 ברונו돌진!');}
      if(b.dashOn){b.mesh.position.x+=b.dvx*dt;b.mesh.position.z+=b.dvz*dt;b.dvx*=.88;b.dvz*=.88;if(Math.abs(b.dvx)<.5)b.dashOn=false;if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<b.atk)dmgPlayer(25);}
      else{const dx=px-b.mesh.position.x,dz=pz-b.mesh.position.z,l=Math.sqrt(dx*dx+dz*dz)||1;
        // Bruno — collision
        const bnx2=b.mesh.position.x+dx/l*b.spd*dt,bnz2=b.mesh.position.z+dz/l*b.spd*dt;
        let bbl2X=false,bbl2Z=false;
        for(const bl of blds){if(Math.abs(bl.x-b.mesh.position.x)>bl.w/2+18)continue;const hw=bl.w/2+1.2,hd=bl.d/2+1.2;if(bnx2>bl.x-hw&&bnx2<bl.x+hw&&b.mesh.position.z>bl.z-hd&&b.mesh.position.z<bl.z+hd)bbl2X=true;if(b.mesh.position.x>bl.x-hw&&b.mesh.position.x<bl.x+hw&&bnz2>bl.z-hd&&bnz2<bl.z+hd)bbl2Z=true;}
        if(!bbl2X)b.mesh.position.x=bnx2;else b.mesh.position.z+=dz/l*b.spd*dt;
        if(!bbl2Z)b.mesh.position.z=bnz2;else b.mesh.position.x+=dx/l*b.spd*dt;
        b.mesh.rotation.y=Math.atan2(dx,dz);if(dd<b.atk){b.atkT-=dt;if(b.atkT<=0){b.atkT=.9;dmgPlayer(18);}}}
    }
    if(b.bar){b.bar.scale.x=Math.max(0,b.hp/b.mhp);b.bar.material.color.setHex(b.phase===2?0x8800ff:0xe74c3c);}
  }
}

// ════════════════════════════════════════════════
// PICKUPS ANIM
// ════════════════════════════════════════════════
function updPickups(dt){const t=Date.now()*.002;G.pickups.forEach(p=>{if(!p.done)p.mesh.position.y=.38+Math.sin(t+p.x)*.13;});G.bones.forEach(b=>{if(!b.done){b.mesh.position.y=.18+Math.sin(t*1.3+b.x)*.1;b.mesh.rotation.y+=dt*.8;}});}

// ════════════════════════════════════════════════
// NPC ANIM
// ════════════════════════════════════════════════
function updNPCs(dt){const t=Date.now()*.001;G.npcs.forEach((n,i)=>{if(n._dead)return;if(!n.recruited)n.mesh.rotation.y=Math.sin(t+i)*.22;n.ind.position.y=2.6+Math.sin(t*2.4+i)*.16;});}

// ════════════════════════════════════════════════
// TERRITORIES — gated & with defense
// ════════════════════════════════════════════════
function updTerrs(dt){
  if(G.mission<2)return; // לא ניתן לכבוש לפני שלב 2
  const px=PB.position.x,pz=PB.position.z;
  G.terrs.forEach(t=>{
    if(t.cap){
      // הגנה — אויבים מחזירים שטח אחרי 25 שניות (משלב 3)
      if(G.mission>=3){
        const eNear=G.enemies.some(e=>e.hp>0&&e.mesh.visible&&d2(e.mesh.position.x,e.mesh.position.z,t.x,t.z)<t.r*1.5);
        const pNear=d2(px,pz,t.x,t.z)<t.r*2;
        if(eNear&&!pNear){t.defTimer+=dt;if(t.defTimer>25){t.cap=false;G.terrCnt=Math.max(0,G.terrCnt-1);t.flag.material.color.setHex(0x9b59b6);showN(`⚠️ "${t.name}" נלקחה חזרה! חזור לשם!`);}}
        else t.defTimer=Math.max(0,t.defTimer-dt*2);
      }
      return;
    }
    if(d2(t.x,t.z,px,pz)<t.r){
      t.cap=true;G.terrCnt++;G.score+=100;addXP(40);sCapture();
      spawnPfx(t.x,3,t.z,0xf5c518,14);t.flag.material.color.setHex(0xf5c518);
      showN(`🏴 "${t.name}" עכשיו שלנו! (${G.terrCnt}/6)`);
      document.getElementById('tc').textContent=G.terrCnt;
      // gate: שלב 2 → 3 בכיבוש הראשון
      if(G.mission===2)setMission(3);
      // קאטסין בינוני ב-3 שטחים
      if(G.terrCnt===3&&!G._ch3shown){G._ch3shown=true;showCut('ch3',null);}
      // שלב 5 → 6 אחרי 4 שטחים
      if(G.terrCnt>=4&&G.mission===5)showCut('boss',()=>setMission(6));
    }
  });
  document.getElementById('tc').textContent=G.terrCnt;
}

// ════════════════════════════════════════════════
// XP & LEVEL
// ════════════════════════════════════════════════
function addXP(amt){
  const dog=G.dogs[G.dog];dog.xp+=amt;showXPPop('+'+amt+' XP');
  const need=XP_TO_LVL[Math.min(dog.lv,XP_TO_LVL.length-1)];
  if(dog.lv<5&&dog.xp>=need){dog.lv++;dog.xp=0;dog.mhp+=10;dog.hp=dog.mhp;dog.pow+=1;dog.spd+=.3;sLvlUp();haptic([50,30,50,30,80]);showLU(dog);}
  if(_hudXP){
    const pct=Math.min(100,dog.xp/Math.max(1,XP_TO_LVL[Math.min(dog.lv,XP_TO_LVL.length-1)])*100);
    _hudXP.style.width=pct+'%';
  }
  document.getElementById('lvv').textContent=dog.lv;
  // שדרוג: עדכן class קריטי על HP bar בעת שינוי XP/רמה
  if(_hudHP) _hudHP.classList.toggle('critical', dog.hp/dog.mhp < 0.25);
}
function showXPPop(t){const el=document.getElementById('xpp');el.textContent=t;el.style.display='block';el.style.animation='none';void el.offsetWidth;el.style.animation='floatUp 1.2s ease-out forwards';setTimeout(()=>el.style.display='none',1200);}
function showLU(dog){G.paused=true;document.getElementById('lu-su').textContent=`${dog.name} הגיעה לרמה ${dog.lv}!`;document.getElementById('lu-st').innerHTML=`<div class="lu-s"><div class="lu-v">+10</div><div class="lu-l">בריאות מקס׳</div></div><div class="lu-s"><div class="lu-v">+1</div><div class="lu-l">כוח</div></div><div class="lu-s"><div class="lu-v">+0.3</div><div class="lu-l">מהירות</div></div>`;document.getElementById('lu').style.display='flex';}
function closeLU(){document.getElementById('lu').style.display='none';G.paused=false;}

// ════════════════════════════════════════════════
// CAMERA
// ════════════════════════════════════════════════
// ── cache רפרנסים לאלמנטי HUD — פעם אחת בלבד ──
let _hudHP,_hudST,_hudXP,_hudSCV,_hudIP;
function cacheHUD(){
  _hudHP=document.getElementById('hpf');
  _hudST=document.getElementById('stf');
  _hudXP=document.getElementById('xpf');
  _hudSCV=document.getElementById('scv');
  _hudIP=document.getElementById('ip');
}

function updCamera(){
  const sz=G.dog==='momo'?.58:1,cd=8,ch=4+G.pitch*6;
  const px=PB.position.x,py=PB.position.y+1.1*sz,pz=PB.position.z;
  _vCamTarget.set(px+Math.sin(G.yaw)*cd,py+ch,pz+Math.cos(G.yaw)*cd);
  camera.position.lerp(_vCamTarget,.1);
  camera.lookAt(px,py+.7,pz);
}

// ════════════════════════════════════════════════
// HUD — עם מד בריאות דינמי וצבע HP לפי רמה
// ════════════════════════════════════════════════
let _lastStamWarn=0;
let _hudFrameCount=0; // שדרוג: גריסת HUD רק כל 3 frames — מונע reflow מיותר
function updHUD(){
  _hudFrameCount++;
  const dog=G.dogs[G.dog];

  // HP — תמיד (קריטי לחוויה)
  const hpPct=dog.hp/dog.mhp*100;
  _hudHP.style.width=hpPct+'%';
  // שדרוג: צבע HP דינמי — אדום/כתום/ירוק לפי כמה בריאות נשאר
  const hpColor = hpPct < 25
    ? 'linear-gradient(90deg,#c0392b,#e74c3c)' // קריטי — אדום כהה
    : hpPct < 50
      ? 'linear-gradient(90deg,#e67e22,#f39c12)' // נמוך — כתום
      : 'linear-gradient(90deg,#e74c3c,#ff6b6b)'; // רגיל
  _hudHP.style.background = hpColor;

  // שדרוג: דופק אדום על מסך כשHP קריטי
  const hf = document.getElementById('hf');
  if(hf){
    if(hpPct < 20 && !G.paused){
      const pulse = 0.15 + Math.abs(Math.sin(Date.now()*0.003)) * 0.18;
      hf.style.background = `rgba(231,76,60,${pulse})`;
    } else if(!hf.classList.contains('on')){
      hf.style.background = 'rgba(231,76,60,0)';
    }
  }

  // שאר HUD — כל 3 frames (חיסכון ב-DOM writes)
  if(_hudFrameCount % 3 !== 0) return;

  const st=dog.stam;
  _hudST.style.width=st+'%';
  _hudST.style.background=st<20
    ?'linear-gradient(90deg,#e74c3c,#ff6b6b)'
    :st<50
      ?'linear-gradient(90deg,#e67e22,#f39c12)'
      :'linear-gradient(90deg,#2ecc71,#55efc4)';
  _hudSCV.textContent=G.score;
  updCoins();

  // אזהרת עייפות — פעם ב-8 שניות
  if(st<15&&Date.now()-_lastStamWarn>8000){
    _lastStamWarn=Date.now();
    showN('😮‍💨 עייפות! '+dog.name+' מאבד מהירות — עצור לנוח');
  }
}

// ════════════════════════════════════════════════
// MINIMAP — throttled + שדרוגים
// ════════════════════════════════════════════════
let _mmFrame=0;
function drawMM(){
  _mmFrame++;
  // שדרוג: עדכן מינימפ כל 3 פריימים — canvas drawing יקר
  if(_mmFrame%3!==0) return;
  if(VILLA.inVilla){drawMMMosque();return;}
  const ctx=mmCtx,W=120,H=120,sc=.58;
  const px=PB.position.x,pz=PB.position.z,cx=W/2-px*sc,cy=H/2-pz*sc;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#152015';ctx.fillRect(0,0,W,H);
  // כבישים
  ctx.fillStyle='#3a3a3a';
  ctx.fillRect(0,cy-3,W,6);
  ctx.fillRect(cx-3,0,6,H);
  ctx.fillRect(cx-3+40*sc,0,5,H);
  ctx.fillRect(cx-3-40*sc,0,5,H);
  ctx.fillRect(0,cy-2+50*sc,W,5);
  ctx.fillRect(0,cy-2-50*sc,W,5);
  ctx.fillStyle='#2a2a2a';
  ctx.fillRect(cx-2+72*sc,0,4,H);
  // כיכר הכדורים
  ctx.fillStyle='#e8791a';ctx.beginPath();ctx.arc(cx+40*sc,cy,5,0,Math.PI*2);ctx.fill();
  // בית כנסת
  ctx.fillStyle='#5588ff';ctx.beginPath();ctx.arc(cx+72*sc,cy+96*sc,4,0,Math.PI*2);ctx.fill();
  // בריכת הנחת (פרק ה׳)
  ctx.fillStyle='#00aaff';ctx.beginPath();ctx.arc(cx-120*sc,cy+130*sc,4,0,Math.PI*2);ctx.fill();
  // שטחים
  G.terrs.forEach(t=>{ctx.fillStyle=t.cap?'#f5c518':'#9b59b6';ctx.beginPath();ctx.arc(cx+t.x*sc,cy+t.z*sc,4,0,Math.PI*2);ctx.fill();});
  // אויבים
  if(G.mission>=3){ctx.fillStyle='#e74c3c';G.enemies.forEach(e=>{if(e.hp>0&&e.mesh.visible)ctx.fillRect(cx+e.mesh.position.x*sc-2,cy+e.mesh.position.z*sc-2,5,5);});}
  if(G.mission===6){ctx.fillStyle='#ff6600';G.bosses.forEach(b=>{if(!b.dead)ctx.beginPath(),ctx.arc(cx+b.mesh.position.x*sc,cy+b.mesh.position.z*sc,6,0,Math.PI*2),ctx.fill();});}
  // NPCs — אייקון '!' לניתן לשיחה, ★ לגיוס
  G.npcs.forEach(n=>{
    if(n._dead)return;
    const nx2=cx+n.x*sc,nz2=cy+n.z*sc;
    if(n.type==='recruit'&&!n.recruited){
      ctx.fillStyle='#f5c518';ctx.beginPath();ctx.arc(nx2,nz2,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#111';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('★',nx2,nz2+2.5);
    } else if(n.type==='shop'||n.type==='quest'){
      ctx.fillStyle='#2ecc71';ctx.beginPath();ctx.arc(nx2,nz2,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.fillText('!',nx2,nz2+3);
    } else {
      ctx.fillStyle='#2ecc71';ctx.fillRect(nx2-2,nz2-2,4,4);
    }
  });
  // איסוף אוכל
  ctx.fillStyle='#e67e22';G.pickups.forEach(p=>{if(!p.done)ctx.fillRect(cx+p.x*sc-2,cy+p.z*sc-2,4,4);});
  // שדרוג: קולקטיבלס — נקודה כוכב קטנה צהובה
  ctx.fillStyle='#f5c518';
  G.collectibles&&G.collectibles.forEach(c=>{
    if(c.done)return;
    ctx.beginPath();ctx.arc(cx+c.x*sc,cy+c.z*sc,3,0,Math.PI*2);ctx.fill();
  });
  // שחקן — עם חץ כיוון
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+px*sc,cy+pz*sc,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f5c518';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx+px*sc,cy+pz*sc);ctx.lineTo(cx+px*sc-Math.sin(G.yaw)*8,cy+pz*sc-Math.cos(G.yaw)*8);ctx.stroke();
  ctx.strokeRect(0,0,W,H);
}

// מיניאפ פנימי — חצר המסגד (90x90 world units → 120px)
function drawMMMosque(){
  const ctx=mmCtx,W=120,H=120;
  const sc=120/88; // חצר 88x88 → 120px
  const ox=W/2,oz=H/2; // מרכז המסגד הוא 0,0 בעולם הפנימי
  ctx.clearRect(0,0,W,H);
  // רקע — כהה ומרוצף
  ctx.fillStyle='#0d1218';ctx.fillRect(0,0,W,H);
  // קירות
  ctx.fillStyle='#2a2618';
  ctx.fillRect(0,0,W,4);ctx.fillRect(0,H-4,W,4); // צ/ד
  ctx.fillRect(0,0,4,H);ctx.fillRect(W-4,0,4,H); // מ/מ
  // מבנה המסגד הראשי
  ctx.fillStyle='#1e2818';
  ctx.fillRect(ox+(-15)*sc,oz+(-20)*sc,30*sc,24*sc);
  // כלוב מומו
  ctx.fillStyle=G.momoFreed?'#2ecc71':'#ff69b4';
  ctx.fillRect(ox+(-21)*sc,oz+(-33)*sc,6*sc,5*sc);
  // שומרים
  ctx.fillStyle=mosqueAlerted?'#ff2200':'#e74c3c';
  mosqueGuards.forEach(g=>{
    if(g.hp<=0)return;
    const gx=g.mesh.position.x,gz=g.mesh.position.z;
    ctx.beginPath();ctx.arc(ox+gx*sc,oz+gz*sc,4,0,Math.PI*2);ctx.fill();
    // חץ כיוון
    ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ox+gx*sc,oz+gz*sc);
    ctx.lineTo(ox+gx*sc+Math.sin(g.mesh.rotation.y)*7,oz+gz*sc+Math.cos(g.mesh.rotation.y)*7);
    ctx.stroke();
  });
  // ברונו
  if(G.bruno&&!G.bruno.dead&&G.bruno.mesh.visible){
    ctx.fillStyle='#8800ff';
    ctx.beginPath();ctx.arc(ox+G.bruno.mesh.position.x*sc,oz+G.bruno.mesh.position.z*sc,6,0,Math.PI*2);ctx.fill();
  }
  // שחקן
  const spx=VILLA.playerX,spz=VILLA.playerZ;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ox+spx*sc,oz+spz*sc,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f5c518';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(ox+spx*sc,oz+spz*sc);
  ctx.lineTo(ox+spx*sc-Math.sin(G.yaw)*8,oz+spz*sc-Math.cos(G.yaw)*8);ctx.stroke();
  // כיתוב עליון
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,14);
  ctx.fillStyle='#88ccff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';
  ctx.fillText('🕌 המסגד',W/2,10);
  ctx.strokeStyle='#446644';ctx.lineWidth=1;ctx.strokeRect(0,0,W,H);
}

let mapFullOpen=false;
let mapZoomLevel=1; // 0.5 עד 4
let mapOffX=0,mapOffZ=0; // היסט pan (בקואורדינטות עולם)
let mapDragging=false,mapDragLast={x:0,y:0};

function toggleFS(){
  if(!document.fullscreenElement){document.documentElement.requestFullscreen().catch(()=>{});}
  else{document.exitFullscreen();}
  // update icon
  setTimeout(()=>{var b=document.getElementById('fs-btn');if(b)b.textContent=document.fullscreenElement?'✕ מסך מלא':'⛶ מסך מלא';},200);
}

// ── ROTATE OVERLAY ────────────────────────────────
var _rotDismissed=false;
function rotDismiss(){_rotDismissed=true;document.getElementById('rotate-ov').classList.remove('show');}
function rotGoFS(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
    setTimeout(()=>{document.getElementById('rotate-ov').classList.remove('show');},400);
  } else {
    document.getElementById('rotate-ov').classList.remove('show');
  }
}
function _checkRot(){
  var isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
  var isPortrait=window.innerHeight>window.innerWidth;
  document.getElementById('rotate-ov').classList.toggle('show',isTouch&&isPortrait&&!_rotDismissed);
}
window.addEventListener('resize',_checkRot);
window.addEventListener('orientationchange',function(){setTimeout(_checkRot,200);});
setTimeout(_checkRot,400);
function openFullMap(){
  if(VILLA.inVilla||G.dlgOpen||G.cutOpen||G.paused)return;
  mapFullOpen=true;
  mapRecenter();
  document.getElementById('map-full').style.display='flex';
  initMapEvents();
  if(window._mapInterval)clearInterval(window._mapInterval);
  window._mapInterval=setInterval(drawBigMap,150);
}

// mm-wrap — listener בJS כדי לבדוק state לפני פתיחה
(function(){
  function mmTap(e){
    if(G.dlgOpen||G.cutOpen||G.paused){e.stopPropagation();e.preventDefault();return;}
    openFullMap();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const mm=document.getElementById('mm-wrap');
    mm.addEventListener('touchend',mmTap,{passive:false});
    mm.addEventListener('click',mmTap);
  });
})();
function closeFullMap(){
  mapFullOpen=false;
  document.getElementById('map-full').style.display='none';
  if(window._mapInterval){clearInterval(window._mapInterval);window._mapInterval=null;}
}
function mapRecenter(){
  mapOffX=0;mapOffZ=0;
}
function mapZoom(dir){
  const steps=[0.4,0.6,0.8,1,1.5,2,3,4];
  const idx=steps.findIndex(s=>s>=mapZoomLevel-0.01);
  const next=Math.max(0,Math.min(steps.length-1,idx+dir));
  mapZoomLevel=steps[next];
  document.getElementById('map-zoom-lbl').textContent=Math.round(mapZoomLevel*100)+'%';
}
function initMapEvents(){
  const canvas=document.getElementById('mm-big');
  let dragging=false,lastX=0,lastY=0;
  let pinchDist=0;

  canvas.ontouchstart=e=>{
    e.preventDefault();
    if(e.touches.length===1){
      dragging=true;
      lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;
    } else if(e.touches.length===2){
      dragging=false;
      pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    }
  };
  canvas.ontouchmove=e=>{
    e.preventDefault();
    if(e.touches.length===1&&dragging){
      const S=canvas.width;
      const sc=(S/300)*mapZoomLevel;
      mapOffX-=(e.touches[0].clientX-lastX)/sc;
      mapOffZ-=(e.touches[0].clientY-lastY)/sc;
      lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;
    } else if(e.touches.length===2){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(pinchDist){
        mapZoomLevel=Math.max(.4,Math.min(4,mapZoomLevel*(d/pinchDist)));
        document.getElementById('map-zoom-lbl').textContent=Math.round(mapZoomLevel*100)+'%';
      }
      pinchDist=d;
    }
  };
  canvas.ontouchend=()=>{dragging=false;pinchDist=0;};

  // עכבר
  canvas.onmousedown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;};
  canvas.onmousemove=e=>{
    if(!dragging)return;
    const sc=(canvas.width/300)*mapZoomLevel;
    mapOffX-=(e.clientX-lastX)/sc;
    mapOffZ-=(e.clientY-lastY)/sc;
    lastX=e.clientX;lastY=e.clientY;
  };
  canvas.onmouseup=canvas.onmouseleave=()=>{dragging=false;};
  canvas.onwheel=e=>{e.preventDefault();mapZoom(e.deltaY<0?1:-1);};
}

function drawBigMap(){
  const canvas=document.getElementById('mm-big');
  const S=Math.min(window.innerWidth,window.innerHeight)-40;
  if(canvas.width!==S){canvas.width=S;canvas.height=S;canvas.style.width=S+'px';canvas.style.height=S+'px';}
  const ctx=canvas.getContext('2d');
  const W=S,H=S;
  const px=PB.position.x+mapOffX, pz=PB.position.z+mapOffZ;
  const sc=(S/300)*mapZoomLevel;
  const wx=x=>W/2+(x-px)*sc;
  const wz=z=>H/2+(z-pz)*sc;
  // רקע
  ctx.fillStyle='#0d1a0d';ctx.fillRect(0,0,W,H);
  // רשת
  ctx.strokeStyle='#1a2a1a';ctx.lineWidth=1;
  const grid=40;
  const startX=Math.floor((px-W/2/sc)/grid)*grid;
  const startZ=Math.floor((pz-H/2/sc)/grid)*grid;
  for(let i=startX;i<startX+W/sc+grid;i+=grid){ctx.beginPath();ctx.moveTo(wx(i),0);ctx.lineTo(wx(i),H);ctx.stroke();}
  for(let i=startZ;i<startZ+H/sc+grid;i+=grid){ctx.beginPath();ctx.moveTo(0,wz(i));ctx.lineTo(W,wz(i));ctx.stroke();}
  // רחובות ראשיים
  ctx.strokeStyle='#2e3e2e';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,wz(0));ctx.lineTo(W,wz(0));ctx.stroke();   // הרצל
  ctx.beginPath();ctx.moveTo(wx(0),0);ctx.lineTo(wx(0),H);ctx.stroke();   // ירושלים
  ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(wx(40),0);ctx.lineTo(wx(40),H);ctx.stroke(); // הדקל
  ctx.beginPath();ctx.moveTo(wx(-40),0);ctx.lineTo(wx(-40),H);ctx.stroke();// הגפן
  ctx.beginPath();ctx.moveTo(0,wz(50));ctx.lineTo(W,wz(50));ctx.stroke(); // וייצמן
  ctx.beginPath();ctx.moveTo(0,wz(-50));ctx.lineTo(W,wz(-50));ctx.stroke();// בן גוריון
  ctx.strokeStyle='#253525';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(wx(72),0);ctx.lineTo(wx(72),H);ctx.stroke(); // שד' בית הכנסת
  // כיכר הכדורים — עיגול כתום
  ctx.fillStyle='rgba(232,121,26,.7)';ctx.beginPath();ctx.arc(wx(40),wz(0),8*mapZoomLevel,0,Math.PI*2);ctx.fill();
  // בית כנסת — עיגול כחול
  ctx.fillStyle='rgba(85,136,255,.7)';ctx.beginPath();ctx.arc(wx(72),wz(96),6*mapZoomLevel,0,Math.PI*2);ctx.fill();
  if(mapZoomLevel>=1){
    ctx.fillStyle='#ffaa44';ctx.font=`bold ${Math.round(9*mapZoomLevel)}px sans-serif`;ctx.textAlign='center';
    ctx.fillText('כיכר הכדורים',wx(40),wz(0)-10*mapZoomLevel);
    ctx.fillStyle='#88aaff';ctx.fillText('בית כנסת',wx(72),wz(96)-9*mapZoomLevel);
  }
  // בניינים
  ctx.fillStyle='#253525';
  blds.forEach(b=>ctx.fillRect(wx(b.x)-b.w/2*sc,wz(b.z)-b.d/2*sc,b.w*sc,b.d*sc));
  // שטחים
  G.terrs.forEach(t=>{
    ctx.fillStyle=t.cap?'rgba(245,197,24,.2)':'rgba(155,89,182,.18)';
    ctx.beginPath();ctx.arc(wx(t.x),wz(t.z),(t.r||30)*sc,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=t.cap?'#f5c518':'#9b59b6';
    ctx.beginPath();ctx.arc(wx(t.x),wz(t.z),7,0,Math.PI*2);ctx.fill();
    if(mapZoomLevel>=0.8){ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(11*mapZoomLevel)}px sans-serif`;ctx.textAlign='center';ctx.fillText(t.name||'',wx(t.x),wz(t.z)-11);}
  });
  // NPCs
  G.npcs.forEach(n=>{
    ctx.fillStyle='#2ecc71';ctx.beginPath();ctx.arc(wx(n.x),wz(n.z),5,0,Math.PI*2);ctx.fill();
    if(mapZoomLevel>=1){ctx.fillStyle='#aaffaa';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(n.name||'',wx(n.x),wz(n.z)-9);}
  });
  // אויבים
  if(G.mission>=3){
    ctx.fillStyle='#e74c3c';
    G.enemies.forEach(e=>{if(e.hp>0&&e.mesh.visible){ctx.beginPath();ctx.arc(wx(e.mesh.position.x),wz(e.mesh.position.z),5,0,Math.PI*2);ctx.fill();}});
  }
  if(G.mission===6){
    ctx.fillStyle='#ff6600';
    G.bosses.forEach(b=>{if(!b.dead){ctx.beginPath();ctx.arc(wx(b.mesh.position.x),wz(b.mesh.position.z),9,0,Math.PI*2);ctx.fill();}});
  }
  // אוכל
  ctx.fillStyle='#e67e22';
  G.pickups.forEach(p=>{if(!p.done){ctx.beginPath();ctx.arc(wx(p.x),wz(p.z),4,0,Math.PI*2);ctx.fill();}});
  // שחקן האמיתי — מיקום קבוע ביחס ל-pan
  const realX=W/2-mapOffX*sc, realZ=H/2-mapOffZ*sc;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(realX,realZ,8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f5c518';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(realX,realZ);ctx.lineTo(realX-Math.sin(G.yaw)*16,realZ-Math.cos(G.yaw)*16);ctx.stroke();
  // קואורדינטות + zoom
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,H-26,W,26);
  ctx.fillStyle='#f5c518';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
  ctx.fillText(`📍 ${Math.round(PB.position.x)}, ${Math.round(PB.position.z)}  •  גרור להזזה • גלגל/פינץ׳ לזום`,W/2,H-9);
  // מפתח (רק בזום רגיל+)
  if(mapZoomLevel>=0.6){
    ctx.font='11px sans-serif';ctx.textAlign='left';
    [['#fff','אתה'],['#2ecc71','NPC'],['#e74c3c','אויב'],['#f5c518','כבוש'],['#9b59b6','חופשי'],['#e67e22','אוכל']].forEach(([c,l],i)=>{
      ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(4,i*16+4,60,14);
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(12,i*16+12,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ddd';ctx.fillText(l,22,i*16+16);
    });
  }
}

// ════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════
// שדרוג: תור התראות — במקום להחליף ישר, שמור בתור ותצג אחת אחרי השנייה
let NT=null;
let _notifQueue=[];
let _notifActive=false;
function showN(t){
  _notifQueue.push(t);
  if(!_notifActive) _processNotifQueue();
}
function _processNotifQueue(){
  if(!_notifQueue.length){_notifActive=false;return;}
  _notifActive=true;
  const t=_notifQueue.shift();
  const el=document.getElementById('notif');
  el.textContent=t;
  el.style.display='block';
  el.style.animation='none';
  void el.offsetWidth; // force reflow לאנימציה
  el.style.animation='notifSlide .3s ease-out';
  if(NT)clearTimeout(NT);
  NT=setTimeout(()=>{
    el.style.display='none';
    _processNotifQueue(); // הצג את הבאה
  }, _notifQueue.length > 0 ? 2000 : 3500); // קצר יותר אם יש עוד בתור
}

// ════════════════════════════════════════════════
// CH3-5: מודלים חדשים
// ════════════════════════════════════════════════

// רועה גרמני — כלב ביטחון עירוני
function mkGermanShepherd(sz){
  const g=new THREE.Group();
  const tan=new THREE.MeshLambertMaterial({color:0xc8963e}); // חום-זהוב
  const blk=new THREE.MeshLambertMaterial({color:0x181410}); // שחור-כהה (אוכף)
  const eyM=new THREE.MeshLambertMaterial({color:0x4a3010,emissive:0x1a0800});
  const blue=new THREE.MeshLambertMaterial({color:0x2255cc}); // קולר כחול עירוני
  // גוף אתלטי
  const b=new THREE.Mesh(new THREE.BoxGeometry(.52*sz,.48*sz,1.3*sz),tan);b.position.y=.72*sz;g.add(b);
  // אוכף שחור על הגב
  const saddle=new THREE.Mesh(new THREE.BoxGeometry(.5*sz,.14*sz,.9*sz),blk);saddle.position.set(0,.97*sz,-.05*sz);g.add(saddle);
  // חזה שחור
  const chest=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.3*sz,.32*sz),blk);chest.position.set(0,.76*sz,.52*sz);g.add(chest);
  // צוואר
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.18*sz,.22*sz,.34*sz,8),tan);nk.position.set(0,.96*sz,.56*sz);nk.rotation.x=-.3;g.add(nk);
  // קולר כחול
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.24*sz,.24*sz,.1*sz,12),blue);collar.position.set(0,.94*sz,.58*sz);g.add(collar);
  // תג מתכת על קולר
  const badge=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.1*sz,.04*sz),new THREE.MeshLambertMaterial({color:0xdddd88,emissive:0x333300}));badge.position.set(0,.88*sz,.84*sz);g.add(badge);
  // ראש
  const h=new THREE.Mesh(new THREE.BoxGeometry(.56*sz,.52*sz,.52*sz),tan);h.position.set(0,1.28*sz,.84*sz);g.add(h);
  // חרטום שחור
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.2*sz,.36*sz),blk);sn.position.set(0,1.1*sz,1.08*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.072*sz,6,5),new THREE.MeshLambertMaterial({color:0x060304}));ns.scale.set(1,.65,.75);ns.position.set(0,1.18*sz,1.26*sz);g.add(ns);
  [-1,1].forEach(s=>{
    // אוזניים זקופות — רועה גרמני
    const earG=new THREE.Group();earG.position.set(s*.24*sz,1.5*sz,.8*sz);earG.rotation.z=s*.06;g.add(earG);
    const earBase=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.08*sz,.12*sz),tan);earBase.position.y=0;earG.add(earBase);
    const earTip=new THREE.Mesh(new THREE.ConeGeometry(.065*sz,.28*sz,5),blk);earTip.position.y=.2*sz;earG.add(earTip);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.076*sz,6,5),eyM);eye.position.set(s*.22*sz,1.3*sz,1.06*sz);g.add(eye);
  });
  // רגליים
  [[.2,.34],[-.2,.34],[.2,-.38],[-.2,-.38]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.72*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.16*sz,.4*sz,.16*sz),tan);up.position.y=-.2*sz;lg.add(up);
    const kn=new THREE.Group();kn.position.y=-.4*sz;lg.add(kn);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.13*sz,.36*sz,.13*sz),tan);lo.position.y=-.18*sz;kn.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.1*sz,.22*sz),blk);pw.position.set(0,-.38*sz,.03*sz);kn.add(pw);
  });
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.06*sz,.04*sz,.42*sz,6),tan);tl.position.set(0,.68*sz,-.66*sz);tl.rotation.x=.65;g.add(tl);
  return g;
}

// מפקד רקס — צ׳יוואווה מודל מומו + שריון מפקד
function mkCommander(sz){
  const g=new THREE.Group();
  // בסיס מבנה גוף כמו מומו — אבל גדול יותר וכהה
  const WH=new THREE.MeshLambertMaterial({color:0xd4c4a0}); // שמנת כהה
  const BK=new THREE.MeshLambertMaterial({color:0x1a1510}); // כהה
  const NS=new THREE.MeshLambertMaterial({color:0x120a04});
  const EY=new THREE.MeshLambertMaterial({color:0x1a1a24});
  const armor=new THREE.MeshLambertMaterial({color:0x223366}); // שריון כחול-כהה
  const gold=new THREE.MeshLambertMaterial({color:0xddaa33,emissive:0x221100}); // זהב — דרגות
  // גוף
  {const _m=new THREE.Mesh(new THREE.BoxGeometry(.42*sz,.44*sz,.88*sz),WH);_m.position.set(0,.44*sz,0);g.add(_m);}
  const armorVest=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.4*sz,.5*sz),armor);armorVest.position.set(0,.52*sz,.22*sz);g.add(armorVest);
  // דרגות זהב על שרוול
  [-1,1].forEach(s=>{
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(.05*sz,.06*sz,.28*sz),gold);stripe.position.set(s*.24*sz,.6*sz,.16*sz);g.add(stripe);
  });
  // צוואר
  const nkG=new THREE.Group();nkG.position.set(0,.72*sz,.28*sz);nkG.rotation.x=-.22;g.add(nkG);
  {const _m=new THREE.Mesh(new THREE.BoxGeometry(.32*sz,.28*sz,.3*sz),WH);_m.position.set(0,.1*sz,0);nkG.add(_m);}
  // ראש — כמו מומו
  const hG=new THREE.Group();hG.position.set(0,1.*sz,.4*sz);hG.rotation.x=.06;g.add(hG);
  const sk=new THREE.Mesh(new THREE.SphereGeometry(.26*sz,12,10),WH);sk.scale.set(1,1.05,.95);sk.castShadow=true;hG.add(sk);
  // קסדת מפקד מעל הראש
  const helm=new THREE.Mesh(new THREE.SphereGeometry(.28*sz,8,6,0,Math.PI*2,0,Math.PI*.55),armor);helm.position.set(0,.12*sz,-.02*sz);hG.add(helm);
  const helmBrim=new THREE.Mesh(new THREE.BoxGeometry(.52*sz,.05*sz,.36*sz),armor);helmBrim.position.set(0,.04*sz,.04*sz);hG.add(helmBrim);
  const star=new THREE.Mesh(new THREE.SphereGeometry(.05*sz,5,4),gold);star.position.set(0,.28*sz,.22*sz);hG.add(star);
  // חרטום
  const mz=new THREE.Group();mz.position.set(0,-.1*sz,.22*sz);hG.add(mz);
  {const _m=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.16*sz,.22*sz),WH);_m.position.set(0,0,0);mz.add(_m);}
  const nm=new THREE.Mesh(new THREE.SphereGeometry(.055*sz,10,8),BK);nm.scale.set(1,.65,.8);nm.position.set(0,.06*sz,.12*sz);mz.add(nm);
  // עיניים רציניות
  [-1,1].forEach(sd=>{
    const eg=new THREE.Group();eg.position.set(sd*.13*sz,.06*sz,.2*sz);hG.add(eg);
    eg.add(new THREE.Mesh(new THREE.SphereGeometry(.096*sz,12,12),EY));
    // ניצוץ
    const sh=new THREE.Mesh(new THREE.SphereGeometry(.03*sz,5,5),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));sh.position.set(sd*.02,.04*sz,.09*sz);eg.add(sh);
  });
  // אוזניים גדולות — צ׳יוואווה
  [-1,1].forEach(sd=>{
    const eG=new THREE.Group();eG.position.set(sd*.22*sz,.1*sz,-.05*sz);eG.rotation.z=sd*.45;eG.rotation.x=-.12;hG.add(eG);
    const oe=new THREE.Mesh(new THREE.CylinderGeometry(.005*sz,.18*sz,.5*sz,5),WH);oe.position.y=.25*sz;oe.castShadow=true;eG.add(oe);
    const ie=new THREE.Mesh(new THREE.CylinderGeometry(.003*sz,.12*sz,.4*sz,5),new THREE.MeshLambertMaterial({color:0xffccaa}));ie.position.set(0,.23*sz,.015*sz);eG.add(ie);
  });
  // רגליים
  [[.14,.22],[-.14,.22],[.14,-.28],[-.14,-.28]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.44*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.3*sz,.12*sz),WH);up.position.y=-.15*sz;lg.add(up);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.16*sz,.08*sz,.2*sz),WH);pw.position.set(0,-.32*sz,.02*sz);lg.add(pw);
  });
  const tG=new THREE.Group();tG.position.set(0,.44*sz,-.44*sz);tG.rotation.x=.8;g.add(tG);
  {const _m=new THREE.Mesh(new THREE.CylinderGeometry(.055*sz,.04*sz,.25*sz,8),WH);_m.position.set(0,.12*sz,0);tG.add(_m);}
  g.position.y=0.11*sz;
  return g;
}

// ד״ר פלטו — כלב לבן, חליפה אפורה, שלט
function mkPalto(sz){
  const g=new THREE.Group();
  const wh=new THREE.MeshLambertMaterial({color:0xf5f0ec});
  const suit=new THREE.MeshLambertMaterial({color:0x555566}); // חליפה אפורה
  const tie=new THREE.MeshLambertMaterial({color:0x992222}); // עניבה אדומה
  const eyM=new THREE.MeshLambertMaterial({color:0x334455,emissive:0x111122});
  const remote=new THREE.MeshLambertMaterial({color:0x111111,emissive:0x000011});
  // גוף — עם חליפה
  const b=new THREE.Mesh(new THREE.BoxGeometry(.58*sz,.54*sz,1.2*sz),suit);b.position.y=.68*sz;g.add(b);
  // חולצה לבנה
  const shirt=new THREE.Mesh(new THREE.BoxGeometry(.44*sz,.4*sz,.16*sz),wh);shirt.position.set(0,.72*sz,.58*sz);g.add(shirt);
  // עניבה
  const t=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.32*sz,.04*sz),tie);t.position.set(0,.74*sz,.66*sz);g.add(t);
  // צוואר
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.18*sz,.22*sz,.3*sz,8),wh);nk.position.set(0,.96*sz,.5*sz);nk.rotation.x=-.25;g.add(nk);
  // שלט — ביד
  const rm=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.12*sz,.08*sz),remote);rm.position.set(.34*sz,.78*sz,.36*sz);g.add(rm);
  // נורית אדומה על שלט
  const led=new THREE.Mesh(new THREE.SphereGeometry(.025*sz,5,4),new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xaa0000}));led.position.set(.34*sz,.84*sz,.38*sz);g.add(led);
  // ראש עגול — כלב מטופח
  const h=new THREE.Mesh(new THREE.SphereGeometry(.3*sz,12,10),wh);h.scale.set(1.05,1,.95);h.position.set(0,1.32*sz,.78*sz);g.add(h);
  // פנים מטופחות
  const sn=new THREE.Mesh(new THREE.BoxGeometry(.24*sz,.18*sz,.28*sz),wh);sn.position.set(0,1.16*sz,1.02*sz);g.add(sn);
  const ns=new THREE.Mesh(new THREE.SphereGeometry(.072*sz,6,5),new THREE.MeshLambertMaterial({color:0x220a08}));ns.scale.set(1,.65,.8);ns.position.set(0,1.22*sz,1.16*sz);g.add(ns);
  // משקפיים — שני עיגולים
  [-1,1].forEach(s=>{
    const lens=new THREE.Mesh(new THREE.TorusGeometry(.07*sz,.012*sz,4,8),new THREE.MeshLambertMaterial({color:0x888870,emissive:0x222211}));lens.position.set(s*.13*sz,1.3*sz,1.06*sz);lens.rotation.y=Math.PI/2;g.add(lens);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.068*sz,8,7),eyM);eye.position.set(s*.13*sz,1.3*sz,1.06*sz);g.add(eye);
    // אוזניים קטנות
    const ear=new THREE.Mesh(new THREE.SphereGeometry(.09*sz,6,5),wh);ear.scale.set(1,1.2,.4);ear.position.set(s*.3*sz,1.38*sz,.76*sz);g.add(ear);
  });
  // רגליים
  [[.2,.32],[-.2,.32],[.2,-.36],[-.2,-.36]].forEach(([ex,ez])=>{
    const lg=new THREE.Group();lg.position.set(ex*sz,.68*sz,ez*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.44*sz,.18*sz),suit);up.position.y=-.22*sz;lg.add(up);
    const kn=new THREE.Group();kn.position.y=-.44*sz;lg.add(kn);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.15*sz,.4*sz,.15*sz),suit);lo.position.y=-.2*sz;kn.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.1*sz,.24*sz),new THREE.MeshLambertMaterial({color:0x222222}));pw.position.set(0,-.42*sz,.03*sz);kn.add(pw);
  });
  const tl=new THREE.Mesh(new THREE.BoxGeometry(.08*sz,.08*sz,.12*sz),suit);tl.position.set(0,.72*sz,-.62*sz);g.add(tl);
  g.position.y=0.23*sz;
  return g;
}

// ════════════════════════════════════════════════
// SPAWN CH3-5 ENTITIES
// ════════════════════════════════════════════════
function spawnFishkaHostile(){
  // הסתר את כל NPCים בשם פישקה
  G.npcs.forEach(n=>{
    if(n.name==='פישקה'){
      n._dead=true;
      n.mesh.visible=false;
      if(n.ind)n.ind.visible=false;
    }
  });

  // פישקה עוינת — מתחילה בשוק ורצה לכיכר (40,0)
  const startX=-68,startZ=52;
  const fm=mkFishka(1.3); // גדולה יותר — קל לראות
  fm.position.set(startX,0,startZ);
  fm.visible=true;
  fm.castShadow=true;
  scene.add(fm);

  // נורית אדומה מרחפת מעליה
  const ind=new THREE.Mesh(
    new THREE.SphereGeometry(.45,8,8),
    new THREE.MeshLambertMaterial({color:0xff2200,emissive:0x880000})
  );
  ind.position.set(0,3.2,0);fm.add(ind);
  const indL=new THREE.PointLight(0xff2200,3,6);indL.position.set(0,3.5,0);fm.add(indL);

  G._fishkaEnemy={mesh:fm,ind,x:startX,z:startZ,hp:90,mhp:90,caught:false,_runningToSquare:true};
  G._fishkaPos={x:startX,z:startZ};

  // 3 כלבי כנופייה — מוסתרים בכיכר עד שפישקה מגיעה
  G._kikarGangs=[];
  [[46,5],[34,5],[40,14]].forEach(([x,z])=>{
    const gm=mkEnemy(0x442200,1.1);gm.position.set(x,0,z);gm.visible=false;scene.add(gm);
    G._kikarGangs.push({mesh:gm,x,z,hp:80,mhp:80,dead:false});
  });

  G._kikarArrived=false;
  showN('🔴 פישקה בוגדת! רצה לכיכר הכדורים!\nרדוף אחריה!');
}

// ── שומרי דרך לפרק ב׳ — כלבי חאג׳ פריד על הדרך למסגד ──
function _spawnCh2PatrolGuards(){
  if(G._ch2PatrolSpawned)return;
  G._ch2PatrolSpawned=true;
  // 4 כלבים בנקודות מפתח על הדרך מרחוב הרצל למסגד
  const spots=[
    {x:-15,z:-45, hp:60},  // פרשת ירושלים-הרצל
    {x:-30,z:-65, hp:65},  // אמצע הדרך
    {x:-42,z:-85, hp:70},  // קרוב למסגד
    {x:-25,z:-90, hp:65},  // עוקף מזרחי
  ];
  G._ch2Guards=[];
  spots.forEach(({x,z,hp})=>{
    const gd=mkGermanShepherd(.9);
    gd.position.set(x,0,z);
    scene.add(gd);
    // נורית אדומה — עוינים
    const ind=new THREE.Mesh(new THREE.SphereGeometry(.28,6,6),
      new THREE.MeshLambertMaterial({color:0xcc2200,emissive:0x550000}));
    ind.position.set(0,2.4,0);gd.add(ind);
    G._ch2Guards.push({mesh:gd,ind,x,z,homeX:x,homeZ:z,hp,mhp:hp,_hitT:0,dead:false});
    G.enemies.push({mesh:gd,x,z,hp,mhp:hp,bar:null,_ch2Guard:true,
      alert:12,state:'patrol',patAng:Math.random()*Math.PI*2,patT:0,searchT:0,
      lastSeenX:0,lastSeenZ:0,spd:4,atk:2,atkT:1.2,homeX:x,homeZ:z,_hitT:0});
  });
}

function spawnGuardDogs(){
  // 3 רועים גרמנים + מפקד רקס — חוסמים יציאה מכיכר הכדורים (cx=40,cz=0)
  const spots=[[55,12],[55,-12],[25,0]];
  spots.forEach(([x,z])=>{
    const gd=mkGermanShepherd(1.05);gd.position.set(x,0,z);scene.add(gd);
    const ind=new THREE.Mesh(new THREE.SphereGeometry(.3,6,6),new THREE.MeshLambertMaterial({color:0x2255cc,emissive:0x001144}));ind.position.set(0,2.5,0);gd.add(ind);
    G.guardDogs.push({mesh:gd,x,z,hp:120,mhp:120,hostile:false,patrol:0});
  });
  // מפקד רקס — בכניסה הראשית של הכיכר
  const rm=mkCommander(.85);rm.position.set(40,-0,-18);scene.add(rm);
  const rind=new THREE.Mesh(new THREE.SphereGeometry(.32,7,7),new THREE.MeshLambertMaterial({color:0xddaa33,emissive:0x332200}));rind.position.set(0,2.7,0);rm.add(rind);
  G.reks={mesh:rm,ind:rind,x:40,z:-18,hp:200,mhp:200,hostile:false,turned:false};
  showN('🚨 כלבי ביטחון עירוניים הגיעו! המפקד רקס מוביל אותם.');
}

function spawnCityHallGuards(){
  // ══════════════════════════════════════════════════
  // 4 שומרים על פרימטר עיריית לוד (cx=80, cz=-80)
  // שומרים על 4 רבעי הבניין, חוזרים לפטרול אם השחקן ברח
  // ══════════════════════════════════════════════════
  const CX=80,CZ=-80;
  // waypoints לכל שומר — מלבן פטרול סביב הבניין
  const patrols=[
    // שומר 1 — חזית מזרח (ליד הכניסה הראשית)
    [[CX+7,CZ+13],[CX+17,CZ+13],[CX+17,CZ+4],[CX+7,CZ+4]],
    // שומר 2 — חזית מערב
    [[CX-7,CZ+13],[CX-17,CZ+13],[CX-17,CZ+4],[CX-7,CZ+4]],
    // שומר 3 — אחורי מזרח
    [[CX+17,CZ-4],[CX+17,CZ-14],[CX+7,CZ-14],[CX+7,CZ-4]],
    // שומר 4 — אחורי מערב
    [[CX-7,CZ-4],[CX-17,CZ-4],[CX-17,CZ-14],[CX-7,CZ-14]],
  ];
  G.cityHallGuards=[];
  patrols.forEach((wps)=>{
    const gd=mkGermanShepherd(1.0);
    gd.position.set(wps[0][0],0,wps[0][1]);
    scene.add(gd);
    // נורית כחולה קטנה מעל
    const ind=new THREE.Mesh(
      new THREE.SphereGeometry(.26,6,6),
      new THREE.MeshLambertMaterial({color:0x2266dd,emissive:0x001133})
    );
    ind.position.set(0,2.4,0);
    gd.add(ind);
    G.cityHallGuards.push({
      mesh:gd,ind,
      x:wps[0][0],z:wps[0][1],
      hp:110,mhp:110,
      waypoints:wps,wpIdx:0,
      state:'patrol', // 'patrol'|'chase'|'return'
      atkT:0,_hitT:0,
    });
  });
  showN('⚠️ שומרי עיריית לוד מסיירים בחוץ — שימו לב!');
}

function spawnPalto(){
  // בניין עיריית לוד כבר בעולם — פלטו נוצר מחוצה לו
  const pm=mkPalto(1.1);pm.position.set(80,0,-80);scene.add(pm);
  // HP bar
  const barBg=new THREE.Mesh(new THREE.BoxGeometry(2.5,.2,.1),new THREE.MeshLambertMaterial({color:0x330000}));barBg.position.set(0,3.2,0);pm.add(barBg);
  const barFg=new THREE.Mesh(new THREE.BoxGeometry(2.5,.18,.12),new THREE.MeshLambertMaterial({color:0x2255cc}));barFg.position.set(0,3.2,.01);pm.add(barFg);
  G.palto={mesh:pm,bar:barFg,x:80,z:-80,hp:300,mhp:300,dead:false,phase:1};
  G._paltoPos={x:80,z:-80};
  // Light on palto
  // removed extra PointLight
  showN('🏛️ ד״ר פלטו נמצא! הכנעו אותו!');
}

function buildCityHall(){
  // ══════════════════════════════════════════════════
  // עיריית לוד — Lod Municipality — מרשים ומוסמך
  // מיקום: 80,-80 (צפון-מזרח)
  // ══════════════════════════════════════════════════
  const cx=80,cz=-80;
  const stoneTex=_getBldTex('plasterNew',1);
  const stoneOld=_getBldTex('stone',0);
  const mkMat=(tex,col,rep1,rep2,rough=.75)=>{
    const t=tex.clone();t.needsUpdate=true;t.repeat.set(rep1,rep2);
    return new THREE.MeshStandardMaterial({map:t,color:col,roughness:rough,metalness:.02});
  };
  const goldM=new THREE.MeshStandardMaterial({color:0xd4aa22,roughness:.2,metalness:.8,emissive:0x221800});
  const govBlueM=new THREE.MeshStandardMaterial({color:0x1a3a8a,roughness:.55,emissive:0x041020});
  const marbleM=new THREE.MeshStandardMaterial({color:0xf0ece4,roughness:.62,metalness:.04});

  // ── גוף ראשי — בניין ממשלתי ישראלי, 3 קומות, מפואר ──
  const bodyM=mkMat(stoneTex,0xe5dece,5,2.5,.72);
  const body=new THREE.Mesh(new THREE.BoxGeometry(34,15,23),bodyM);
  body.position.set(cx,7.5,cz);body.castShadow=true;body.receiveShadow=true;scene.add(body);

  // פסי קומות — גוף מרכזי
  const bandM=new THREE.MeshStandardMaterial({color:0xd5cfc3,roughness:.88,metalness:.03});
  [5.1,10.2,15.0].forEach(y=>{
    const band=new THREE.Mesh(new THREE.BoxGeometry(34.6,.32,23.4),bandM);
    band.position.set(cx,y,cz);scene.add(band);
  });

  // קומה שלישית — מצומצמת, עם גג שטוח
  const top3M=mkMat(stoneTex,0xddd8cc,3.5,1.2,.74);
  const top3=new THREE.Mesh(new THREE.BoxGeometry(27,5.5,19),top3M);
  top3.position.set(cx,17.75,cz);top3.castShadow=true;scene.add(top3);
  // כרכוב קומה 3
  const topCornice=new THREE.Mesh(new THREE.BoxGeometry(28,.5,20),marbleM);
  topCornice.position.set(cx,20.5,cz);scene.add(topCornice);
  // שיני כרכוב עליון
  const toothM2=new THREE.MeshStandardMaterial({color:0xece8de,roughness:.82});
  for(let i=-13;i<=13;i+=1.5){
    const tooth=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,.28),toothM2);
    tooth.position.set(cx+i,20.8,cz-9.7);scene.add(tooth);
    const tooth2=tooth.clone();tooth2.position.z=cz+9.7;scene.add(tooth2);
  }

  // ── מרפסת ראשית על גג קומה 2 ──
  const balcM=new THREE.MeshStandardMaterial({color:0xd5cfc3,roughness:.82,metalness:.04});
  const balcFloor=new THREE.Mesh(new THREE.BoxGeometry(35,.35,24),balcM);
  balcFloor.position.set(cx,15.17,cz);scene.add(balcFloor);
  // מעקה ─ עמודי שיש
  const railM=new THREE.MeshStandardMaterial({color:0xe0dcd2,roughness:.62,metalness:.06});
  for(let i=-16.5;i<=16.5;i+=1.5){
    const rp=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.55,6),railM);
    rp.position.set(cx+i,15.55,cz-12);scene.add(rp);
    const rp2=rp.clone();rp2.position.z=cz+12;scene.add(rp2);
  }
  // מוט מעקה
  [{x:cx,z:cz-12,w:34,h:.18,d:.18},{x:cx,z:cz+12,w:34,h:.18,d:.18},{x:cx-17,z:cz,w:.18,h:.18,d:24},{x:cx+17,z:cz,w:.18,h:.18,d:24}].forEach(({x:rx,z:rz,w,h,d})=>{
    const r=new THREE.Mesh(new THREE.BoxGeometry(w||34,h||.18,d||.18),goldM);
    r.position.set(rx,15.84,rz);scene.add(r);
  });

  // ── עמודות קדמיות — 6 עמודות דוריות ──
  const colM=new THREE.MeshStandardMaterial({color:0xeceae0,roughness:.78,metalness:.03});
  [-12.5,-7.5,-2.5,2.5,7.5,12.5].forEach(ox=>{
    const col=new THREE.Mesh(new THREE.CylinderGeometry(.55,.65,15,14),colM);
    col.position.set(cx+ox,7.5,cz+12);col.castShadow=true;scene.add(col);
    const capBox=new THREE.Mesh(new THREE.BoxGeometry(1.45,.42,1.45),marbleM);
    capBox.position.set(cx+ox,15.2,cz+12);scene.add(capBox);
    const capCyl=new THREE.Mesh(new THREE.CylinderGeometry(.7,.56,.42,12),marbleM);
    capCyl.position.set(cx+ox,15.0,cz+12);scene.add(capCyl);
    const colBase=new THREE.Mesh(new THREE.BoxGeometry(1.42,.38,1.42),marbleM);
    colBase.position.set(cx+ox,.19,cz+12);scene.add(colBase);
    // קישוט זהב בראש העמוד
    for(let l=0;l<4;l++){
      const la=l/4*Math.PI*2;
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.14,5,5),goldM);
      leaf.scale.set(.5,1,.4);leaf.position.set(cx+ox+Math.sin(la)*.48,14.92,cz+12+Math.cos(la)*.48);scene.add(leaf);
    }
  });

  // ── פורטיקו — גג מעל הכניסה ──
  const porticoM=new THREE.MeshStandardMaterial({color:0xdad4c8,roughness:.8,metalness:.03});
  const portFloor=new THREE.Mesh(new THREE.BoxGeometry(28,.55,5),porticoM);
  portFloor.position.set(cx,15.22,cz+14.5);scene.add(portFloor);
  // אנטבלמן
  const entab=new THREE.Mesh(new THREE.BoxGeometry(28,.65,.75),new THREE.MeshStandardMaterial({color:0xd8d2c4,roughness:.82}));
  entab.position.set(cx,15.55,cz+14.5);scene.add(entab);
  // פדימנט משולש — מרשים
  const pedL=new THREE.Mesh(new THREE.BoxGeometry(14.2,.2,.5),new THREE.MeshStandardMaterial({color:0xe0d8c8,roughness:.84}));
  pedL.position.set(cx-7,16.55,cz+14.45);pedL.rotation.z=Math.atan2(3.5,14);scene.add(pedL);
  const pedR=new THREE.Mesh(new THREE.BoxGeometry(14.2,.2,.5),new THREE.MeshStandardMaterial({color:0xe0d8c8,roughness:.84}));
  pedR.position.set(cx+7,16.55,cz+14.45);pedR.rotation.z=-Math.atan2(3.5,14);scene.add(pedR);
  const pedBase=new THREE.Mesh(new THREE.BoxGeometry(28,.2,.5),new THREE.MeshStandardMaterial({color:0xe0d8c8,roughness:.84}));
  pedBase.position.set(cx,15.55,cz+14.45);scene.add(pedBase);
  // מסגרת זהב לפדימנט
  const pedFrame=new THREE.Mesh(new THREE.BoxGeometry(28.4,.18,.4),goldM);
  pedFrame.position.set(cx,15.53,cz+14.42);scene.add(pedFrame);
  // מגן דוד + מנורה בפדימנט (קישוט ממשלתי)
  for(let ri=0;ri<2;ri++){
    for(let si=0;si<3;si++){
      const sa=ri*Math.PI+si/3*Math.PI*2;
      const sb=new THREE.Mesh(new THREE.BoxGeometry(.07,.65,.06),goldM);
      sb.position.set(cx+Math.sin(sa)*.38,17.3+Math.cos(sa)*.38,cz+14.3);
      sb.rotation.y=sa;sb.rotation.z=Math.PI/3;scene.add(sb);
    }
  }

  // ── חלונות — שלוש קומות, מפורטים ──
  const glM=new THREE.MeshStandardMaterial({color:0xa8cce0,roughness:.04,metalness:.22,transparent:true,opacity:.82,emissive:0x0c1e2a});
  const frM2=new THREE.MeshStandardMaterial({color:0xe8e4da,roughness:.78,metalness:.04});
  const shutBlue=new THREE.MeshStandardMaterial({color:0x3355aa,roughness:.85});
  [[2.2,3.6],[2.2,8.4],[2.2,13.2]].forEach(([wW,wY])=>{
    for(let wx=-15;wx<=15;wx+=4.5){
      if(Math.abs(wx)<7&&wY<5)continue;
      const fr=new THREE.Mesh(new THREE.BoxGeometry(wW+.22,1.55,.24),frM2);
      fr.position.set(cx+wx,wY,cz+11.6);scene.add(fr);
      const gw=new THREE.Mesh(new THREE.BoxGeometry(wW,1.35,.12),glM.clone());
      gw.position.set(cx+wx,wY,cz+11.65);scene.add(gw);
      // קשת קטנה מעל חלון
      const wArch=new THREE.Mesh(new THREE.BoxGeometry(wW+.22,.22,.2),frM2);
      wArch.position.set(cx+wx,wY+.88,cz+11.6);scene.add(wArch);
      if(Math.random()<.38){
        const sh=new THREE.Mesh(new THREE.BoxGeometry(wW*.46,1.38,.1),shutBlue);
        sh.position.set(cx+wx-wW*.26,wY,cz+11.7);scene.add(sh);
        const sh2=sh.clone();sh2.position.x=cx+wx+wW*.26;scene.add(sh2);
      }
    }
    for(let wx=-14;wx<=14;wx+=4.5){
      const gw=new THREE.Mesh(new THREE.BoxGeometry(wW,1.35,.1),glM.clone());
      gw.position.set(cx+wx,wY,cz-11.6);scene.add(gw);
      const fr=new THREE.Mesh(new THREE.BoxGeometry(wW+.22,1.55,.2),frM2);
      fr.position.set(cx+wx,wY,cz-11.62);scene.add(fr);
    }
  });

  // ── שלט \"עיריית לוד\" — מרשים ──
  const signBg=new THREE.Mesh(new THREE.BoxGeometry(14,1.05,.28),govBlueM);
  signBg.position.set(cx,16.8,cz+14.4);scene.add(signBg);
  const signFr=new THREE.Mesh(new THREE.BoxGeometry(14.5,1.3,.24),new THREE.MeshStandardMaterial({color:0xf0ece4,roughness:.72}));
  signFr.position.set(cx,16.8,cz+14.35);scene.add(signFr);
  // פסי זהב על גבול השלט
  const signGold=new THREE.Mesh(new THREE.BoxGeometry(14.6,.12,.26),goldM);
  signGold.position.set(cx,17.45,cz+14.35);scene.add(signGold);
  const signGold2=signGold.clone();signGold2.position.y=16.15;scene.add(signGold2);

  // ── דגל ישראל — מעל הבניין, מפואר ──
  // 3 עמודי דגל
  [-8,0,8].forEach(ox=>{
    const flagPole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,6.5,6),
      new THREE.MeshStandardMaterial({color:0x999090,roughness:.55,metalness:.5}));
    flagPole.position.set(cx+ox,24.25,cz);scene.add(flagPole);
    const finBall=new THREE.Mesh(new THREE.SphereGeometry(.18,7,7),goldM);
    finBall.position.set(cx+ox,27.6,cz);scene.add(finBall);
    const flagW=new THREE.Mesh(new THREE.BoxGeometry(3,.08,1.7),
      new THREE.MeshStandardMaterial({color:0xf0f4f8,roughness:.8}));
    flagW.position.set(cx+ox+1.5,26.2,cz);scene.add(flagW);
    const str1=new THREE.Mesh(new THREE.BoxGeometry(3,.08,.3),
      new THREE.MeshStandardMaterial({color:0x002288,roughness:.8}));
    str1.position.set(cx+ox+1.5,26.2,cz+.55);scene.add(str1);
    const str2=str1.clone();str2.position.z=cz-.55;scene.add(str2);
  });

  // ── כניסה ראשית — ארקאד רחב, 5 קשתות ──
  [-10,-5,0,5,10].forEach(ox=>{
    const archFr=new THREE.Mesh(new THREE.BoxGeometry(3.8,6,.5),
      new THREE.MeshStandardMaterial({color:0xdcd6c6,roughness:.86}));
    archFr.position.set(cx+ox,3,cz+11.4);scene.add(archFr);
    const archTop=new THREE.Mesh(new THREE.TorusGeometry(1.9,.3,8,16,Math.PI),
      new THREE.MeshStandardMaterial({color:0xd8d2c2,roughness:.88}));
    archTop.position.set(cx+ox,6.0,cz+11.38);scene.add(archTop);
    if(ox===0){
      const archIn=new THREE.Mesh(new THREE.BoxGeometry(3.2,5.0,.55),
        new THREE.MeshStandardMaterial({color:0x3a4858,roughness:.9,metalness:.07}));
      archIn.position.set(cx,2.8,cz+11.25);scene.add(archIn);
    }
    // חלל קשת — כהה לעומק
    const archVoid=new THREE.Mesh(new THREE.BoxGeometry(3.0,5.5,.45),
      new THREE.MeshStandardMaterial({color:0x4a5570,roughness:.95}));
    archVoid.position.set(cx+ox,2.8,cz+11.3);scene.add(archVoid);
    // פס זהב על הקשת
    const ag=new THREE.Mesh(new THREE.TorusGeometry(1.92,.07,6,14,Math.PI),goldM);
    ag.position.set(cx+ox,6.0,cz+11.3);scene.add(ag);
  });
  // גגון כניסה — פס כחול-כהה עם פס זהב
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(22,.25,3.2),govBlueM);
  canopy.position.set(cx,7.2,cz+13.1);scene.add(canopy);
  const canopyGold=new THREE.Mesh(new THREE.BoxGeometry(22.2,.12,3.22),goldM);
  canopyGold.position.set(cx,7.33,cz+13.1);scene.add(canopyGold);

  // דלת כניסה — כנף כחולה-כהה
  const mainDoor=new THREE.Mesh(new THREE.BoxGeometry(3.0,5.0,.16),
    new THREE.MeshStandardMaterial({color:0x1a2840,roughness:.7,metalness:.15}));
  mainDoor.position.set(cx,2.5,cz+11.5);scene.add(mainDoor);
  const dh=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.9,6),
    new THREE.MeshStandardMaterial({color:0xddcc44,roughness:.22,metalness:.75,emissive:0x221800}));
  dh.rotation.z=Math.PI/2;dh.position.set(cx+.9,2.5,cz+11.62);scene.add(dh);

  // ── מדרגות כניסה — מרשימות ──
  const stepM2=new THREE.MeshStandardMaterial({color:0xd8d0bc,roughness:.88,metalness:0});
  [0,1,2,3].forEach(i=>{
    const st=new THREE.Mesh(new THREE.BoxGeometry(24-i*.5,.22,i*.5+.65),stepM2);
    st.position.set(cx,i*.24,cz+12.8+i*.55);st.receiveShadow=true;scene.add(st);
  });
  const plaza=new THREE.Mesh(new THREE.BoxGeometry(26,.18,3.5),stepM2);
  plaza.position.set(cx,.09,cz+14.6);plaza.receiveShadow=true;scene.add(plaza);

  // ── פנסי כניסה — 4 פנסי ממשלה ──
  [-11,-5.5,5.5,11].forEach(ox=>{
    const pol=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,5.5,8),
      new THREE.MeshStandardMaterial({color:0x3a3840,roughness:.65,metalness:.5}));
    pol.position.set(cx+ox,2.75,cz+15);scene.add(pol);
    // ראש פנסיה מרובע ממשלתי
    const lHead=new THREE.Mesh(new THREE.BoxGeometry(.52,.55,.52),
      new THREE.MeshStandardMaterial({color:0x282628,roughness:.6,metalness:.4}));
    lHead.position.set(cx+ox,5.75,cz+15);scene.add(lHead);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.2,7,6),
      new THREE.MeshStandardMaterial({color:0xffffcc,roughness:.1,emissive:0xbb9933}));
    bulb.position.set(cx+ox,5.65,cz+15);scene.add(bulb);
    // פס זהב על הפנסיה
    const lr=new THREE.Mesh(new THREE.BoxGeometry(.56,.08,.56),goldM);
    lr.position.set(cx+ox,5.77,cz+15);scene.add(lr);
  });

  // ── אנטנת שידור ──
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,5,5),
    new THREE.MeshStandardMaterial({color:0x888880,roughness:.65,metalness:.4}));
  ant.position.set(cx-11,23.5,cz+2);scene.add(ant);
  const antTop=new THREE.Mesh(new THREE.SphereGeometry(.2,6,5),
    new THREE.MeshStandardMaterial({color:0xff2200,emissive:0x880000}));
  antTop.position.set(cx-11,26.2,cz+2);scene.add(antTop);
  // מזגן גג
  const acBig=new THREE.Mesh(new THREE.BoxGeometry(3.2,.9,2.2),
    new THREE.MeshStandardMaterial({color:0xd8d0c8,roughness:.7,metalness:.14}));
  acBig.position.set(cx+9,21.2,cz-4);scene.add(acBig);

  // ── סמן כניסה ──
  const entInd=new THREE.Mesh(new THREE.SphereGeometry(.55,8,8),
    new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x1133aa}));
  entInd.position.set(cx,2.8,cz+16);scene.add(entInd);
  G._cityHallDoor={mesh:entInd,x:cx,z:cz+14};

  // ── קולידר ──
  blds.push(
    {x:cx-9,z:cz,w:14,d:23},
    {x:cx+9,z:cz,w:14,d:23},
    {x:cx,z:cz-11.5,w:34,d:.5},
    {x:cx-9,z:cz+11,w:14,d:.5},
    {x:cx+9,z:cz+11,w:14,d:.5}
  );

  // סמן שידור
  const broadcast=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),
    new THREE.MeshLambertMaterial({color:0xdd2200,emissive:0x660000}));
  broadcast.position.set(cx,2,cz-16);scene.add(broadcast);
}

// ════════════════════════════════════════════════
// CH3 INTERACTION — פישקה + פלטו + רקס
// ════════════════════════════════════════════════
function updCh3Entities(dt){
  const px=PB.position.x,pz=PB.position.z;
  const dog=G.dogs[G.dog];

  // תפיסת פישקה + קרב כיכר — mission 13
  if(G.mission===13&&G._fishkaEnemy&&!G._fishkaEnemy.caught){
    const fe=G._fishkaEnemy;

    // פישקה רצה לכיכר — מהירה יותר מזיפו (16 > 13) כדי שלא ניתן לתפוס אותה בדרך
    if(fe._runningToSquare){
      const targetX=40,targetZ=0;
      const dx=targetX-fe.x,dz=targetZ-fe.z,l=Math.sqrt(dx*dx+dz*dz)||1;
      if(l>2){
        fe.x+=dx/l*16*dt;fe.z+=dz/l*16*dt;
        fe.mesh.position.set(fe.x,0,fe.z);
        fe.mesh.rotation.y=Math.atan2(dx,dz);
      } else {
        // פישקה הגיעה לכיכר — הקרב מתחיל מיידית!
        fe._runningToSquare=false;
        fe.x=targetX;fe.z=targetZ;
        fe.mesh.position.set(fe.x,0,fe.z);
        G._fishkaPos={x:targetX,z:targetZ};
        // כנופייה מופיעה ברגע שפישקה נוחתת
        if(G._kikarGangs)G._kikarGangs.forEach(kg=>{kg.mesh.visible=true;});
        G._kikarArrived=true;
        showN('🔴 פישקה הגיעה לכיכר! הקרב מתחיל!');
        G.paused=true;
        setTimeout(()=>showCut('kikar_battle',()=>{G.paused=false;}),200);
      }
      return;
    }

    const dd=d2(fe.x,fe.z,px,pz);

    // כלבי הכנופייה של פישקה
    if(G._kikarGangs){
      G._kikarGangs.forEach(kg=>{
        if(kg.dead)return;
        const kdd=d2(kg.x,kg.z,px,pz);
        // הכלב נע לכיוון השחקן
        if(kdd>2){
          const ang=Math.atan2(px-kg.x,pz-kg.z);
          kg.x+=Math.sin(ang)*3.5*dt;kg.z+=Math.cos(ang)*3.5*dt;
          kg.mesh.position.set(kg.x,0,kg.z);
          kg.mesh.rotation.y=ang;
        }
        // תוקף — cooldown נפרד לכנופייה
        if(!kg._atkT)kg._atkT=0;
        kg._atkT=Math.max(0,kg._atkT-dt);
        if(kdd<2.5&&kg._atkT<=0){dmgPlayer(14);kg._atkT=1.2;}
        // ניתן לפגיעה — מגיב ל-F/כפתור התקפה, cooldown משלו
        if(!kg._hitT)kg._hitT=0;
        kg._hitT=Math.max(0,kg._hitT-dt);
        if(kdd<4&&G.atkCD<=0&&kg._hitT<=0){
          const dmg=Math.round(dog.pow*9);
          kg.hp-=dmg;haptic(18);spawnBlood(kg.x,1,kg.z,7);showDmg(kg.x,1,kg.z,dmg);
          kg._hitT=0.4;
          if(kg.hp<=0){kg.dead=true;kg.mesh.visible=false;sEDie();haptic([30,15,30]);addXP(22);G.coins+=12;updCoins();G.totalKills++;showN('✅ כלב הוכנע!');}
        }
      });
    }

    // פישקה בורחת ממך — אחרי שכל הכלבים ירדו
    const allGangDown=!G._kikarGangs||G._kikarGangs.every(k=>k.dead);
    if(allGangDown&&dd>2.5){
      const ang=Math.atan2(px-fe.x,pz-fe.z)+.2;
      fe.x+=Math.cos(ang)*2.2*dt;fe.z+=Math.sin(ang)*2.2*dt;
      fe.mesh.position.set(fe.x,0,fe.z);
    }

    // תפיסה — cooldown נפרד לפישקה
    if(!fe._hitT)fe._hitT=0;
    fe._hitT=Math.max(0,fe._hitT-dt);
    if(dd<4&&allGangDown&&G.atkCD<=0&&fe._hitT<=0){
      const dmg=Math.round(dog.pow*10);
      fe.hp-=dmg;haptic(20);spawnBlood(fe.x,1,fe.z,6);showDmg(fe.x,1,fe.z,dmg);
      fe._hitT=0.4;
      if(fe.hp<=0){
        fe.caught=true;fe.mesh.visible=false;sCapture();haptic([50,20,50]);
        addXP(50);G.coins+=70;updCoins();
        showN('✅ פישקה נלכדה!');
        setTimeout(()=>setMission(14),400);
      }
    }
    return;
  }

  // כלבי ביטחון — הימנעות או קרב (mission 15+)
  if(G.mission>=15&&G.mission<=18){
    G.guardDogs.forEach(gd=>{
      if(gd.hp<=0)return;
      // פטרול בסיסי
      gd.patrol=(gd.patrol||0)+dt;
      gd.mesh.rotation.y+=dt*.4;
      const dd=d2(gd.x,gd.z,px,pz);
      if(dd<3&&G.atkCD<=0){
        const dmg=15*(1+G.mission*.02);dmgPlayer(dmg);G.atkCD=1.2;
      }
      // ניתן להכנעה
      if(dd<3.5&&G.atkCD<=0){
        gd.hp-=dog.pow*7;haptic(15);spawnBlood(gd.x,1,gd.z,5);showDmg(gd.x,1,gd.z,Math.round(dog.pow*7));G.atkCD=.55;
        if(gd.hp<=0){gd.mesh.visible=false;sEDie();haptic([30,15,30]);addXP(25);G.coins+=15;updCoins();G.totalKills++;showN('✅ כלב ביטחון הוכנע');}
      }
    });
  }

  // ד״ר פלטו — mission 18
  if(G.mission===18&&G.palto&&!G.palto.dead){
    const b=G.palto;
    const dd=d2(b.x,b.z,px,pz);
    // פלטו מסתובב
    b.mesh.rotation.y+=dt*.5;
    // phase 2 — מתחת ל-50%
    if(b.hp<b.mhp*.5&&b.phase===1){
      b.phase=2;
      showN('💙 פלטו: "רקס! פקד!" — רקס לא זז.\nפלטו: "...מה קורה לך?!"');
      haptic([40,20,40,20,60]);
      // פלטו מאיץ
      b._spd=1.8;
    }
    // תקיפת שחקן
    if(dd<3&&G.atkCD<=0){
      const dmg=b.phase===2?28:18;dmgPlayer(dmg);G.atkCD=1.0;haptic([40,20]);
    }
    // השחקן תוקף
    if(dd<4&&G.atkCD<=0){
      const dmg=dog.pow*11*(1+dog.lv*.1);b.hp-=dmg;sHit();haptic(25);
      flash(b.mesh.children[0]);spawnBlood(b.x,1.5,b.z,14);showDmg(b.x,1.5,b.z,Math.round(dmg));G.atkCD=.55;
      if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
      if(b.hp<=0){
        b.dead=true;b.mesh.visible=false;sCapture();haptic([100,40,100,40,120]);
        addXP(150);G.score+=800;G.coins+=200;updCoins();
        spawnBlood(b.x,2,b.z,30);
        setTimeout(()=>setMission(19),500);
      }
    }
  }

  // mission 12 — הגיעו למקום בלה → bella_dead
  if(G.mission===12&&G._bellaMarker){
    const dd=d2(G._bellaMarker.x,G._bellaMarker.z,px,pz);
    if(dd<4){
      G._bellaMarker=null;
      setTimeout(()=>showCut('bella_dead',()=>{
        // מיד בסיום הדיאלוג — מחליפים לזיפו ופישקה מתחילה לרוץ לכיכר
        G.dog='zippo';
        document.getElementById('hdn').textContent=G.dogs['zippo'].name;
        const pos=PB.position.clone();buildPlayer();PB.position.copy(pos);
        spawnFishkaHostile(); // פישקה כבר רצה לכיכר בזמן ה-fishka_reveal
        setMission(13);
      }),300);
    }
  }

  // ══ שומרי פרימטר עיריית לוד — active מ-mission 14 ══
  if(G.mission>=14&&G.cityHallGuards&&G.cityHallGuards.length){
    const CX=80,CZ=-80;
    const LEASH=30; // אם השחקן מתרחק יותר מ-30 יחידות מהעירייה, השומר חוזר
    G.cityHallGuards.forEach(gd=>{
      if(gd.hp<=0)return;
      gd.atkT-=dt;
      gd._hitT-=dt;
      const dd=d2(gd.x,gd.z,px,pz);
      const playerInZone=d2(CX,CZ,px,pz)<LEASH;

      if(gd.state==='patrol'){
        // תנועה לנקודת פטרול הבאה
        const wp=gd.waypoints[gd.wpIdx];
        const dx=wp[0]-gd.x,dz=wp[1]-gd.z;
        const dist=Math.sqrt(dx*dx+dz*dz)||1;
        if(dist>1.2){
          gd.x+=dx/dist*2.4*dt;
          gd.z+=dz/dist*2.4*dt;
          gd.mesh.position.set(gd.x,0,gd.z);
          gd.mesh.rotation.y=Math.atan2(dx,dz);
        } else {
          gd.wpIdx=(gd.wpIdx+1)%gd.waypoints.length;
        }
        // שחקן נכנס לטווח אזעקה
        if(dd<7&&playerInZone) gd.state='chase';

      } else if(gd.state==='chase'){
        // שחקן ברח מחוץ לאזור — חזור לפטרול
        if(!playerInZone||d2(CX,CZ,gd.x,gd.z)>LEASH+5){
          gd.state='return'; return;
        }
        // רדיפה
        if(dd>1.6){
          const ang=Math.atan2(px-gd.x,pz-gd.z);
          gd.x+=Math.sin(ang)*4.8*dt;
          gd.z+=Math.cos(ang)*4.8*dt;
          gd.mesh.position.set(gd.x,0,gd.z);
          gd.mesh.rotation.y=ang;
        }
        // תקיפת שחקן
        if(dd<2.5&&gd.atkT<=0){
          dmgPlayer(16);gd.atkT=1.4;haptic([20,10]);
        }
        // השחקן מכה חזרה
        if(dd<3.2&&G.atkCD<=0&&gd._hitT<=0){
          const dmg=dog.pow*9;
          gd.hp-=dmg;sHit();haptic(15);
          spawnBlood(gd.x,1,gd.z,5);
          showDmg(gd.x,1.2,gd.z,Math.round(dmg));
          G.atkCD=.5;gd._hitT=.3;
          if(gd.hp<=0){
            gd.mesh.visible=false;sEDie();haptic([30,15,30]);
            addXP(22);G.coins+=14;updCoins();G.totalKills++;
            showN('✅ שומר עיריית לוד הוכנע');
          }
        }

      } else if(gd.state==='return'){
        // חזרה לנקודת הפטרול הראשונה
        const wp0=gd.waypoints[0];
        const dx=wp0[0]-gd.x,dz=wp0[1]-gd.z;
        const dist=Math.sqrt(dx*dx+dz*dz)||1;
        if(dist>1.5){
          gd.x+=dx/dist*5*dt;
          gd.z+=dz/dist*5*dt;
          gd.mesh.position.set(gd.x,0,gd.z);
          gd.mesh.rotation.y=Math.atan2(dx,dz);
        } else {
          gd.state='patrol';gd.wpIdx=0;
        }
      }
    });
  }

  // mission 15-18 מנוהלות ע״י מערכת CITY — updCityHall
}


function haptic(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}

// ══ Pause ══
function togglePause(e){
  if(e&&e.preventDefault)e.preventDefault(); // מנע double-fire touch+click
  if(!G.hud||G.dlgOpen||G.cutOpen||G.shopOpen)return;
  G.paused=!G.paused;
  const btn=document.getElementById('pause-btn');
  if(btn)btn.textContent=G.paused?'▶':'⏸';
  if(G.paused){
    showN('⏸ המשחק מושהה — לחץ P או ▶ להמשך');
  }
}

// ════════════════════════════════════════════════
// BLOOD PARTICLES
// ════════════════════════════════════════════════
function spawnBlood(x,y,z,n=10){
  if(!scene)return;
  for(let i=0;i<n;i++){
    const sz=.05+Math.random()*.1;
    const m=new THREE.Mesh(new THREE.SphereGeometry(sz,4,4),
      new THREE.MeshBasicMaterial({color:Math.random()<.6?0xcc0000:0x880000,transparent:true}));
    m.position.set(x+(Math.random()-.5)*.2,y,z+(Math.random()-.5)*.2);
    scene.add(m);
    const spd=2.5+Math.random()*5,ang=Math.random()*Math.PI*2;
    G.particles.push({mesh:m,vx:Math.cos(ang)*spd,vy:.5+Math.random()*3.5,vz:Math.sin(ang)*spd,life:.5+Math.random()*.35});
  }
  // splat שטוח על הקרקע
  for(let i=0;i<3;i++){
    const r=.08+Math.random()*.16;
    const m=new THREE.Mesh(new THREE.CircleGeometry(r,6),
      new THREE.MeshBasicMaterial({color:0x660000,transparent:true,opacity:.65,depthWrite:false}));
    m.rotation.x=-Math.PI/2;
    m.position.set(x+(Math.random()-.5)*1.8,.03,z+(Math.random()-.5)*1.8);
    scene.add(m);
    G.particles.push({mesh:m,vx:0,vy:0,vz:0,life:5+Math.random()*3});
  }
}

// ════════════════════════════════════════════════
// DAMAGE NUMBERS
// ════════════════════════════════════════════════
function showDmg(wx,wy,wz,txt,isCoin){
  // project 3D position to screen
  if(!camera||!renderer)return;
  const v=new THREE.Vector3(wx,wy+.5,wz);
  v.project(camera);
  const sw=renderer.domElement.clientWidth,sh=renderer.domElement.clientHeight;
  const sx=(v.x*.5+.5)*sw,sy=(-.5*v.y+.5)*sh;
  if(sx<0||sx>sw||sy<0||sy>sh)return;
  const el=document.createElement('div');
  el.className='dmg-num';
  el.textContent=txt;
  el.style.left=sx+'px';el.style.top=sy+'px';
  el.style.color=isCoin?'#f5c518':'#ff4444';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
function showDmgVilla(dmg){
  // inside mosque — simple screen-center flash
  const el=document.createElement('div');
  el.className='dmg-num';
  el.textContent=dmg;
  el.style.left=(50+Math.random()*20-10)+'%';
  el.style.top=(45+Math.random()*10-5)+'%';
  el.style.color='#ff4444';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}

// ════════════════════════════════════════════════
// COINS HUD
// ════════════════════════════════════════════════
function updCoins(){
  const v=document.getElementById('coin-val');
  const h=document.getElementById('coin-hud');
  if(v)v.textContent=G.coins;
  if(h)h.style.display=G.hud?'block':'none';
}

// ════════════════════════════════════════════════
// SHOP SYSTEM
// ════════════════════════════════════════════════
let _shopNPC=null;
function openShop(npc){
  if(G.paused||G.dlgOpen||G.cutOpen)return;
  _shopNPC=npc;
  G.paused=true;G.shopOpen=true;
  document.getElementById('sh-name').textContent=npc.name;
  document.getElementById('sh-coin-val').textContent=G.coins;
  const cont=document.getElementById('sh-items');cont.innerHTML='';
  (npc.shopItems||[]).forEach(item=>{
    const row=document.createElement('div');row.className='sh-item';
    row.innerHTML=`<div class="sh-ico">${item.ico}</div><div class="sh-info"><div class="sh-name">${item.name}</div><div class="sh-desc">${item.desc}</div></div><div class="sh-cost">💰${item.cost}</div>`;
    row.addEventListener('click',()=>{item.fn();document.getElementById('sh-coin-val').textContent=G.coins;});
    row.addEventListener('touchstart',()=>{item.fn();document.getElementById('sh-coin-val').textContent=G.coins;});
    cont.appendChild(row);
  });
  document.getElementById('shop-ov').classList.add('open');
}
function closeShop(){
  document.getElementById('shop-ov').classList.remove('open');
  G.paused=false;G.shopOpen=false;_shopNPC=null;
}
function shopBuy(type){
  const dog=G.dogs[G.dog];
  const costs={hp:30,hp_big:60,stam:20,pow:80,spd:60,mhp:100};
  const cost=costs[type];
  if(G.coins<cost){haptic([20,10,20]);showN('💰 אין מספיק מטבעות!');return;}
  G.coins-=cost;haptic([20,10,30]);
  if(type==='hp'){dog.hp=Math.min(dog.mhp,dog.hp+40);showN('🍖 +40 בריאות!');}
  else if(type==='hp_big'){dog.hp=dog.mhp;showN('💊 בריאות מלאה!');}
  else if(type==='stam'){dog.stam=Math.min(100,dog.stam+100);showN('⚡ +100 סטמינה!');}
  else if(type==='pow'){dog.pow+=3;showN('🦷 +3 כוח!');}
  else if(type==='spd'){dog.spd+=.5;showN('🏃 +0.5 מהירות!');}
  else if(type==='mhp'){dog.mhp+=20;dog.hp=Math.min(dog.hp+20,dog.mhp);showN('🛡️ +20 HP מקסימלי!');}
  updCoins();sPickup();
  document.getElementById('sh-coin-val').textContent=G.coins;
  saveGame();
}

// ════════════════════════════════════════════════
// SIDE QUESTS
// ════════════════════════════════════════════════
function updSQPanel(){
  const btn=document.getElementById(isMob?'sq-btn-mob':'sq-btn');
  if(!btn||G.mission<1){if(btn)btn.style.display='none';return;}
  btn.style.display='flex';
  // צבע הכפתור — ירוק אם יש משהו שהושלם לאחרונה
  const anyDone=G.sideQ.bones.done||G.sideQ.kills.done;
  btn.classList.toggle('has-done',anyDone);
  // בנה תוכן הפופאפ
  const inner=document.getElementById('sq-popup-inner');
  if(!inner)return;
  let html='<div style="color:#f5c518;font-weight:bold;font-size:12px;margin-bottom:4px;text-align:center;">📋 משימות צד</div>';
  // SQ1: עצמות
  html+=`<div class="sq-card${G.sideQ.bones.done?' done':''}">
    <div class="sq-title">${G.sideQ.bones.done?'✅':'🦴'} עצמות ברחוב</div>
    <div class="sq-prog">${G.sideQ.bones.done?'הושלם! +40XP +50💰':`${G.sideQ.bones.n}/5 עצמות נאספו`}</div>
  </div>`;
  // SQ2: ניצחונות
  html+=`<div class="sq-card${G.sideQ.kills.done?' done':''}">
    <div class="sq-title">${G.sideQ.kills.done?'✅':'⚔️'} 10 ניצחונות</div>
    <div class="sq-prog">${G.sideQ.kills.done?'הושלם! +60XP +100💰':`${G.totalKills}/10 אויבים`}</div>
  </div>`;
  inner.innerHTML=html;
  // בדוק אם SQ2 הושלמה
  if(!G.sideQ.kills.done&&G.totalKills>=10){
    G.sideQ.kills.done=true;addXP(60);G.coins+=100;updCoins();haptic([60,30,60]);
    showN('🏆 משימת צד: 10 ניצחונות — הושלמה!\n+60 XP + 100 💰');
    updSQPanel();saveGame();
  }
}
function toggleSQPopup(){
  const p=document.getElementById('sq-popup');
  if(!p)return;
  const isOpen=p.classList.contains('open');
  if(isOpen){p.classList.remove('open');}
  else{updSQPanel();p.classList.add('open');}
}
function closeSQPopup(){
  const p=document.getElementById('sq-popup');
  if(p)p.classList.remove('open');
}

