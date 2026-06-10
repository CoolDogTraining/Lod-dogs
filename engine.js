// ── engine.js — מנוע המשחק: state, עולם, שחקן, אויבים, input, combat, loop ──
// ════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════
const G={
  dog:'colin',
  dogs:{
    colin:{name:'קולין',hp:100,mhp:100,stam:100,spd:11,pow:9,sz:1.0,xp:0,lv:1},
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
  // ── פרק ו׳ — "צל" ──
  _shadowEnemy:null,
  _shadowBossDead:false,
  _ch6MarketVisited:false,
  _ch6PortVisited:false,
  _ch6LabVisited:false,
  _ch6RecordingPlayed:false,
  _ch6FactoryVisited:false,
  _ch6FireDone:false,
  _bigFireRunning:false,
  _fireIntervalDead:false,
  _ch8ZippoForced:false,
};

let scene,camera,renderer,clock,mmCtx;
let PB,dogModel,dogTail,dogLegs=[];
const blds=[];
// Zone Groups — כל אזור עטוף ב-Group. _updLOD מציג רק zones קרובים לשחקן.
const _zoneGroups=[];  // [{group, cx, cz, r}]
let _currentZoneGroup=null; // ה-Group הפעיל כרגע ב-buildWorld

// ════════════════════════════════════════════════
// SKILLS STATE — כישורים ייחודיים לכל כלב
// ════════════════════════════════════════════════
let _comboCount=0, _comboTimer=0;
const _COMBO_WINDOW=1.4;
let _charmedEnemy=null, _charmedTimer=0;
const _CHARM_DUR=8;
let _dashCooldown=0, _dashActive=false, _dashTimer=0;
let _dashVX=0, _dashVZ=0;
const _DASH_DUR=0.22, _DASH_SPEED=28, _DASH_CD=2.5;
let _stunCooldown=0;
const _STUN_CD=4;
let _missionStartStats=null; // לסטטיסטיקות בין משימות
// ── רפרנסים לאורות — לשימוש במחזור יום/לילה ──
let _ambLight=null,_sunLight=null,_fillLight=null,_hemiLight=null;
let _rainPoints=null,_rainGeo=null;


// ════════════════════════════════════════════════
// MUSIC — מוזיקת רקע פרוצדורלית
// ════════════════════════════════════════════════
let _musicCtx=null,_musicGain=null,_musicMode='explore',_musicNodes=[];
let _musicBeat=0,_musicInterval=null;

const _SCALES={
  explore:[0,2,3,5,7,8,10], // מינורי — חקירה
  combat: [0,1,3,5,6,8,10], // פריגי — מתח
  boss:   [0,2,4,7,9],      // מייג׳ור — אפי
  night:  [0,3,5,6,7,10],   // דוריאני — לילה
};
const _BASE_FREQ=110; // A2

function _freqOfNote(scale,step,oct=0){
  const notes=_SCALES[scale]||_SCALES.explore;
  const n=notes[((step%notes.length)+notes.length)%notes.length];
  return _BASE_FREQ*Math.pow(2,(n+oct*12)/12);
}

function _playMusicNote(freq,dur,vol=0.04,wave='sine',delay=0){
  if(!_musicCtx||!_musicGain)return;
  try{
    const o=_musicCtx.createOscillator();
    const g=_musicCtx.createGain();
    o.connect(g);g.connect(_musicGain);
    o.type=wave;o.frequency.setValueAtTime(freq,_musicCtx.currentTime+delay);
    g.gain.setValueAtTime(0,_musicCtx.currentTime+delay);
    g.gain.linearRampToValueAtTime(vol,_musicCtx.currentTime+delay+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,_musicCtx.currentTime+delay+dur);
    o.start(_musicCtx.currentTime+delay);
    o.stop(_musicCtx.currentTime+delay+dur+0.05);
  }catch(e){}
}

function _musicTick(){
  if(!_musicCtx)return;
  const mode=_musicMode;
  const beat=_musicBeat;
  const bps=mode==='combat'?0.22:mode==='boss'?0.18:0.35;

  // בס — כל beat זוגי
  if(beat%2===0){
    _playMusicNote(_freqOfNote(mode,0,-1),bps*1.8,0.06,'triangle');
  }
  // מלודיה — כל 4 beats
  if(beat%4===0){
    const step=Math.floor(Math.random()*7);
    _playMusicNote(_freqOfNote(mode,step,1),bps*3,0.03,'sine');
  }
  // אקורד רקע
  if(beat%8===0){
    [0,2,4].forEach((s,i)=>{
      _playMusicNote(_freqOfNote(mode,s,0),bps*8,0.015,'sine',i*0.01);
    });
  }
  // תופים — combat בלבד
  if(mode==='combat'||mode==='boss'){
    if(beat%2===0)_playMusicNote(60,0.08,0.05,'square'); // kick
    if(beat%4===2)_playMusicNote(200,0.04,0.03,'square'); // snare
  }

  _musicBeat=(beat+1)%32;
  const nextBps=mode==='combat'?0.22:mode==='boss'?0.18:0.35;
  _musicInterval=setTimeout(_musicTick,nextBps*1000);
}

function startMusic(){
  if(_musicCtx)return;
  try{
    _musicCtx=new(window.AudioContext||window.webkitAudioContext)();
    _musicGain=_musicCtx.createGain();
    _musicGain.gain.setValueAtTime(0.22,_musicCtx.currentTime);
    _musicGain.connect(_musicCtx.destination);
    // Chrome דורש resume() לאחר gesture
    const _resume=()=>{
      if(_musicCtx&&_musicCtx.state==='suspended'){
        _musicCtx.resume().then(()=>{if(!_musicInterval)_musicTick();});
      }
      document.removeEventListener('touchstart',_resume);
      document.removeEventListener('click',_resume);
      document.removeEventListener('keydown',_resume);
    };
    if(_musicCtx.state==='suspended'){
      document.addEventListener('touchstart',_resume,{once:true});
      document.addEventListener('click',_resume,{once:true});
      document.addEventListener('keydown',_resume,{once:true});
    } else {
      _musicTick();
    }
  }catch(e){console.warn('Music init failed',e);}
}

function setMusicMode(mode){
  if(_musicMode===mode)return;
  _musicMode=mode;
  if(!_musicCtx)return;
  // fade transition
  const targetVol=mode==='night'?0.1:0.18;
  if(_musicGain)_musicGain.gain.linearRampToValueAtTime(targetVol,_musicCtx.currentTime+1.5);
}

function stopMusic(){
  if(_musicInterval)clearTimeout(_musicInterval);
  if(_musicGain)_musicGain.gain.linearRampToValueAtTime(0,(_musicCtx?.currentTime||0)+1);
  setTimeout(()=>{try{_musicCtx?.close();}catch(e){}; _musicCtx=null;_musicGain=null;},1500);
}

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
function selDog(d){G.dog=d;document.getElementById('cs-scr').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('hdn').textContent=G.dogs[d].name;if(isMob)document.getElementById('mob').style.display='block';G.hud=true;document.getElementById('coin-hud').style.display='block';if(!isMob){if(isMob){document.getElementById('sq-btn-mob').classList.add('has-done');}else{document.getElementById('sq-btn').style.display='flex';}}startMusic();init();if(window._csChapter!=null){const _ch=window._csChapter;window._csChapter=null;setTimeout(()=>{if(isMob)document.getElementById('mob').style.display='block';if(typeof setMission==='function')setMission(_ch);},400);}}

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
  G._poolCutPlaying=false;G._reksJoinCutPlaying=false;G._titanWarnShown=false;

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
  scene=new THREE.Scene();scene.background=new THREE.Color(0x4a90d0);scene.fog=new THREE.Fog(0x88bbdd,60,180);
  camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,300);
  clock=new THREE.Clock();
  mmCtx=document.getElementById('mm').getContext('2d');
  buildLights();buildSky();buildWorld();_initLampPool();
  _buildZoned(buildCityHall,    80,  -80, 100); // עיריית לוד
  _buildZoned(buildLabExterior, 25, -125,  90); // מעבדה
  _buildZoned(buildHospitalExterior, 62, -118, 90); // בית חולים
  buildPlayer();buildEnemies();buildBoss();buildPickups();buildBones();buildNPCs();
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
    mesh._isCloud=true;
    scene.add(mesh);
  });

  // שמש
  const sunD=new THREE.Mesh(new THREE.CircleGeometry(4.5,24),new THREE.MeshBasicMaterial({color:0xfffef0,side:THREE.DoubleSide,depthWrite:false}));
  sunD.position.set(110,62,-185);sunD.lookAt(0,0,0);sunD._isCloud=true;scene.add(sunD);
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

function _isOnRoad(x, z){
  if(Math.abs(z)<8.5)   return true; // הרצל
  if(Math.abs(x)<8.5)   return true; // ירושלים
  if(Math.abs(x-40)<8.5) return true; // הדקל
  if(Math.abs(x+40)<8.5) return true; // הגפן
  if(Math.abs(z-50)<7||Math.abs(z+50)<7) return true; // וייצמן / בן גוריון
  if(d2(x,z,40,0)<22) return true; // כיכר
  return false;
}

// ════════════════════════════════════════════════
// WORLD — compact Lod (~150x150 units)
// ════════════════════════════════════════════════
// ZONE GROUP HELPERS — visibility streaming לפי מרחק
// ════════════════════════════════════════════════
// _buildZoned: מריץ פונקציית בנייה בתוך Group. Group מוסתר/מוצג לפי מרחק שחקן.
function _buildZoned(buildFn, cx, cz, r){
  const g=new THREE.Group();
  scene.add(g);
  _zoneGroups.push({group:g, cx, cz, r});
  // Monkey-patch זמני של scene.add כדי לנתב ל-group
  const origAdd=scene.add.bind(scene);
  scene.add=function(obj){ g.add(obj); };
  try{ buildFn(); } finally{ scene.add=origAdd; }
}

// ════════════════════════════════════════════════
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
    const gnd=new THREE.Mesh(new THREE.PlaneGeometry(700,700,1,1),
      new THREE.MeshStandardMaterial({map:tex,roughness:.98,metalness:0,color:0xffffff}));
    gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;gnd._isGround=true;scene.add(gnd);
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

  // === רמת אשכול — צפון (zone: מרכז 0,-130, r=110) ===
  _buildZoned(()=>{
    for(let bx=-80;bx<=80;bx+=48)for(let bz=-100;bz>=-160;bz-=48){
      if(Math.abs(bx)<16||Math.abs(bx+40)<16||Math.abs(bx-40)<16)continue;
      if(Math.abs(bz+50)<10)continue;
      bldHouse(bx,bz,4+Math.random()*2.5);
    }
  }, 0, -130, 110);

  // === גני אביב — דרום (zone: מרכז 0,120, r=100) ===
  _buildZoned(()=>{
    for(let bx=-80;bx<=80;bx+=48)for(let bz=85;bz<=155;bz+=48){
      if(Math.abs(bx)<16||Math.abs(bx+40)<16||Math.abs(bx-40)<16)continue;
      if(Math.abs(bz-50)<10)continue;
      if(Math.abs(bx-64)<22&&Math.abs(bz-96)<28)continue;
      if(Math.abs(bx-64)<14&&Math.abs(bz-80)<14)continue;
      bldHouse(bx,bz,3.5+Math.random()*2);
    }
  }, 0, 120, 100);

  // === מקומות מפתח — עטופים ב-Zone Groups ===
  _buildZoned(()=>bldPark(80,-22),          80, -22, 80);
  _buildZoned(()=>bldMarket(-80,55),       -80,  55, 90);
  _buildZoned(()=>bldStation(-5,-155),      -5,-155, 90);
  _buildZoned(()=>bldMosque(-55,75),       -55,  75, 90);
  _buildZoned(()=>bldSynagogue(72,96),      72,  96, 90);
  mkRd(72,71,12,60,true); // שדרות בית הכנסת — N-S כניסה
  _buildZoned(bldBigMosque,                -65, -100, 100); // מסגד גדול — מיקום אמיתי
  buildDogBase();            // בסיס כלבי לוד — פרק ו׳ (קטן, לא צריך zone)
  bldBallsSquare(40,0);    // כיכר הכדורים — תמיד במרכז

  // שטחי כיבוש
  addTerr(40,0,18,'כיכר הכדורים');
  addTerr(0,-5,20,'כיכר רחוב הרצל');
  addTerr(-68,52,22,'שוק לוד');
  addTerr(80,-22,20,'פארק גני איילון');
  addTerr(0,-145,22,'רמת אשכול');
  addTerr(-5,-150,25,'תחנת הרכבת');
  addTerr(-52,73,20,'העיר העתיקה');

  addTerr(72,96,18,'שכונת גני אביב — בית הכנסת');
  addTerr(228,-152,50,'אזור תעשייה APEX');
  addStreetDeco();

  // ── Zone wrapping — פונקציות בנייה גדולות עטופות ב-Zone Groups ──
  // כל zone מוצג/מוסתר לפי מרחק השחקן ב-_updLOD
  _buildZoned(buildIndustrialZone, 228, -152, 160); // אזור תעשייה — רחוק ורב-meshes
}

function _mkConcreteTexture(sz,dark){
  const c=document.createElement('canvas');c.width=c.height=sz;
  const tx=c.getContext('2d');
  tx.fillStyle=dark?'#3a3e3e':'#5a5e5c';tx.fillRect(0,0,sz,sz);
  const tW=Math.floor(sz/4),tH=Math.floor(sz/3);
  for(let ty=0;ty<sz;ty+=tH) for(let tx2=0;tx2<sz;tx2+=tW){
    const v=Math.floor((dark?26:36)+Math.random()*16);
    tx.fillStyle=`rgb(${v},${v+1},${v})`;tx.fillRect(tx2+1,ty+1,tW-2,tH-2);
  }
  tx.strokeStyle=dark?'#181a1a':'#242626';tx.lineWidth=1.5;
  for(let ty=0;ty<sz;ty+=tH){tx.beginPath();tx.moveTo(0,ty);tx.lineTo(sz,ty);tx.stroke();}
  for(let tx2=0;tx2<sz;tx2+=tW){tx.beginPath();tx.moveTo(tx2,0);tx.lineTo(tx2,sz);tx.stroke();}
  for(let i=0;i<60;i++){
    const rx=Math.random()*sz,ry=Math.random()*sz,rr=1+Math.random()*4;
    tx.fillStyle=Math.random()<.4?`rgba(90,50,20,${.12+Math.random()*.22})`:`rgba(38,38,40,${.1+Math.random()*.18})`;
    tx.beginPath();tx.arc(rx,ry,rr,0,Math.PI*2);tx.fill();
  }
  for(let i=0;i<8;i++){
    let cx=Math.random()*sz,cy=Math.random()*sz;
    tx.strokeStyle=`rgba(12,12,12,${.35+Math.random()*.4})`;tx.lineWidth=.6;tx.beginPath();tx.moveTo(cx,cy);
    for(let j=0;j<4;j++){cx+=(Math.random()-.5)*22;cy+=(Math.random()-.5)*20;tx.lineTo(cx,cy);}tx.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _mkMetalTexture(sz,col){
  const c=document.createElement('canvas');c.width=c.height=sz;
  const tx=c.getContext('2d');
  const [r,g,b]=col||[70,75,80];
  tx.fillStyle=`rgb(${Math.min(255,r+20)},${Math.min(255,g+20)},${Math.min(255,b+20)})`;tx.fillRect(0,0,sz,sz);
  for(let y=0;y<sz;y+=8){
    const v=Math.floor(-6+Math.random()*12);
    tx.fillStyle=`rgba(${r+v},${g+v},${b+v},0.6)`;tx.fillRect(0,y,sz,4+Math.floor(Math.random()*4));
  }
  for(let y=12;y<sz;y+=24) for(let x=10;x<sz;x+=20){
    tx.fillStyle=`rgba(${r-15},${g-15},${b-15},0.9)`;
    tx.beginPath();tx.arc(x+(Math.random()*4-2),y+(Math.random()*4-2),2.5,0,Math.PI*2);tx.fill();
    tx.fillStyle=`rgba(${r+20},${g+20},${b+20},0.5)`;
    tx.beginPath();tx.arc(x-.8,y-.8,1.2,0,Math.PI*2);tx.fill();
  }
  for(let i=0;i<30;i++){
    const rx=Math.random()*sz,ry=Math.random()*sz;
    tx.fillStyle=`rgba(110,55,15,${.08+Math.random()*.22})`;tx.fillRect(rx,ry,2+Math.random()*8,.5+Math.random()*2);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _mkRoofTexture(sz){
  const c=document.createElement('canvas');c.width=c.height=sz;
  const tx=c.getContext('2d');tx.fillStyle='#222825';tx.fillRect(0,0,sz,sz);
  for(let y=0;y<sz;y+=12){
    tx.fillStyle=`rgba(${36+Math.floor(Math.random()*10)},${38+Math.floor(Math.random()*8)},${34+Math.floor(Math.random()*8)},1)`;
    tx.fillRect(0,y,sz,10);tx.fillStyle='rgba(12,13,11,0.8)';tx.fillRect(0,y+10,sz,2);
  }
  for(let i=0;i<40;i++){
    const rx=Math.random()*sz,ry=Math.random()*sz;
    tx.fillStyle=`rgba(80,40,10,${.06+Math.random()*.16})`;
    tx.beginPath();tx.arc(rx,ry,3+Math.random()*10,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _mkAsphaltDark(sz){
  const c=document.createElement('canvas');c.width=c.height=sz;
  const tx=c.getContext('2d');tx.fillStyle='#2a2e2e';tx.fillRect(0,0,sz,sz);
  for(let i=0;i<1800;i++){
    const x=Math.random()*sz,y=Math.random()*sz;
    const v=Math.floor(28+Math.random()*28);
    tx.fillStyle=`rgb(${v},${v},${v})`;tx.beginPath();tx.arc(x,y,.3+Math.random()*.9,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

let _warehouseInterior=false; // האם השחקן בתוך המחסן

function buildIndustrialZone(){
  // === טקסטורות ===
  const cTex =_mkConcreteTexture(256,false); cTex.repeat.set(3,2);
  const cTexD=_mkConcreteTexture(256,true);  cTexD.repeat.set(3,2);
  const mTex =_mkMetalTexture(256,[68,72,76]); mTex.repeat.set(4,2);
  const mTexR=_mkMetalTexture(256,[78,74,68]); mTexR.repeat.set(3,2);
  const rTex =_mkRoofTexture(256); rTex.repeat.set(5,3);
  const aTex =_mkAsphaltDark(256); aTex.repeat.set(10,10);

  const MAT=(tex,col,rough,met)=>{
    const t2=tex.clone();t2.needsUpdate=true;
    return new THREE.MeshStandardMaterial({map:t2,color:col||0xffffff,roughness:rough||.88,metalness:met||0});
  };
  const MMAT=(tex,col)=>new THREE.MeshStandardMaterial({map:tex,color:col||0xffffff,roughness:.55,metalness:.45});
  const LM=c=>new THREE.MeshLambertMaterial({color:c});

  // קואורדינטות מרכזיות — מרוחק ומרווח
  // גבולות: X=180-275, Z=-90 עד -215
  const IX=228, IZ=-152;  // מרכז האזור

  // ── עזר: בנייה עם/בלי collision ──
  const iB=(w,h,d,mat,x,z,oy)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,oy!==undefined?oy:h/2,z);
    m.castShadow=m.receiveShadow=true;scene.add(m);blds.push({x,z,w,d});return m;
  };
  const iBC=(w,h,d,mat,x,z,oy)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,oy!==undefined?oy:h/2,z);
    m.castShadow=m.receiveShadow=true;scene.add(m);return m;
  };

  // ══════════════════════════════════════════════
  // קרקע תעשייתית
  const floorM=new THREE.MeshStandardMaterial({map:aTex.clone(),roughness:.96,color:0xeeeeee});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(100,130),floorM);
  fl.rotation.x=-Math.PI/2;fl.position.set(IX,.01,IZ);fl.receiveShadow=true;fl._isGround=true;scene.add(fl);

  // כביש גישה מהעיר לאזור (x=215, z=-55 עד z=-90)
  mkRd(215,-72,10,36,true);   // connector מהעיר לשער
  // כבישים פנימיים
  mkRd(IX,-90,10,130,true);    // ציר N-S ראשי
  mkRd(IX+18,-90,8,130,true);  // ציר N-S שניוני
  mkRd(IX,-90,90,9,false);     // כביש כניסה E-W

  // ══════════════════════════════════════════════
  // A: מחסן APEX — WH_X=205, WH_Z=-125
  // כניסה דרומית פתוחה (בלי קיר דרומי ב-collision)
  // ══════════════════════════════════════════════
  const WH_X=205, WH_Z=-125;
  const WH_W=30, WH_D=22, WH_H=9;

  const wallM=MMAT(mTex.clone(),0xf0e8dc);
  const roofM=new THREE.MeshStandardMaterial({map:rTex.clone(),roughness:.92,metalness:.12,color:0xc8c4b8});

  // 3 קירות בלבד — צפון, מזרח, מערב (ללא דרום — שם הדלת)
  // קיר צפוני
  iBC(WH_W,.2,WH_H,wallM, WH_X, WH_Z-WH_D/2, WH_H/2);
  // קיר מזרחי
  iBC(.2,WH_H,WH_D,wallM, WH_X+WH_W/2, WH_Z, WH_H/2);
  // קיר מערבי
  iBC(.2,WH_H,WH_D,wallM, WH_X-WH_W/2, WH_Z, WH_H/2);

  // collision box — רק 3 צדדים (לא חוסם כניסה דרומית)
  // צפון
  blds.push({x:WH_X, z:WH_Z-WH_D/2, w:WH_W, d:.4});
  // מזרח
  blds.push({x:WH_X+WH_W/2, z:WH_Z, w:.4, d:WH_D});
  // מערב
  blds.push({x:WH_X-WH_W/2, z:WH_Z, w:.4, d:WH_D});

  // גג
  const roofL=iBC(WH_W+.4,.35,WH_D/2+.2,roofM.clone(),WH_X,WH_Z-WH_D/4, WH_H+.15);
  roofL.rotation.z=.28;roofL.position.x+=WH_W*.23;
  const roofR=iBC(WH_W+.4,.35,WH_D/2+.2,roofM.clone(),WH_X,WH_Z-WH_D/4, WH_H+.15);
  roofR.rotation.z=-.28;roofR.position.x-=WH_W*.23;
  // שתי כנפות אחוריות
  const roofBL=iBC(WH_W+.4,.35,WH_D/2+.2,roofM.clone(),WH_X,WH_Z+WH_D/4, WH_H+.15);
  roofBL.rotation.z=.28;roofBL.position.x+=WH_W*.23;
  const roofBR=iBC(WH_W+.4,.35,WH_D/2+.2,roofM.clone(),WH_X,WH_Z+WH_D/4, WH_H+.15);
  roofBR.rotation.z=-.28;roofBR.position.x-=WH_W*.23;

  // קורות גג
  const beamM=MMAT(_mkMetalTexture(64,[88,92,98]),0xbbbbbb);
  for(let bi=-12;bi<=12;bi+=8){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.14,.17,WH_H-.5,6),beamM.clone());
    b.position.set(WH_X+bi,WH_H*.45,WH_Z-WH_D*.4);b.rotation.z=Math.PI/2;scene.add(b);
  }

  // ── דלת מגלגלת בפתח הדרומי ──
  // כאשר המשימה לא 42+ — הדלת "סגורה" (ויזואלית בלבד, לא collision)
  const doorMatW=MMAT(_mkMetalTexture(256,[50,52,55]),0xbbbbbb);
  // 2 כנפות דלת (שמאל/ימין) — לא חוסמות, רק ויזואל
  const dL=iBC(WH_W/2-.5,WH_H-.3,.18,doorMatW,WH_X-WH_W/4,WH_Z+WH_D/2-.09, WH_H*.45);
  const dR=iBC(WH_W/2-.5,WH_H-.3,.18,doorMatW,WH_X+WH_W/4,WH_Z+WH_D/2-.09, WH_H*.45);
  G._warehouseDoorL=dL; G._warehouseDoorR=dR;
  // סורגי דלת
  for(let si=0;si<5;si++){
    const ds=new THREE.Mesh(new THREE.BoxGeometry(WH_W,.12,.1),LM(0x444444));
    ds.position.set(WH_X,1.4+si*1.4,WH_Z+WH_D/2-.08);scene.add(ds);
  }
  // מסגרת פתח
  const fmM=LM(0x2a2a2a);
  [[WH_X-WH_W/2-.1,WH_H/2,WH_Z+WH_D/2,.22,WH_H,.22],
   [WH_X+WH_W/2+.1,WH_H/2,WH_Z+WH_D/2,.22,WH_H,.22],
   [WH_X,WH_H+.1,WH_Z+WH_D/2, WH_W+.44,.22,.22]].forEach(([x,y,z,w,h,d])=>{
    const fm=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fmM.clone());
    fm.position.set(x,y,z);scene.add(fm);
  });

  // שלט APEX + אור
  const apexM=new THREE.MeshStandardMaterial({color:0x0d001a,emissive:0x330055,roughness:.4});
  const apexS=new THREE.Mesh(new THREE.BoxGeometry(9,2,.15),apexM);
  apexS.position.set(WH_X,WH_H+1.2,WH_Z+WH_D/2+.1);scene.add(apexS);
  const sL=new THREE.PointLight(0x9900ee,2,16);sL.position.set(WH_X,WH_H+2.5,WH_Z+WH_D/2);scene.add(sL);

  // ── פנים מחסן (מינימלי — מה שנראה מבפנים) ──
  // רצפת מחסן
  const inFloor=new THREE.Mesh(new THREE.PlaneGeometry(WH_W-.4,WH_D-.4),
    new THREE.MeshStandardMaterial({map:_mkConcreteTexture(256,true),roughness:.95,color:0xcccccc}));
  inFloor.rotation.x=-Math.PI/2;inFloor.position.set(WH_X,.02,WH_Z);inFloor._isGround=true;scene.add(inFloor);
  // תאורת פנים
  [[WH_X-8,8,WH_Z-6],[WH_X+8,8,WH_Z-6],[WH_X,8,WH_Z+4]].forEach(([lx,ly,lz])=>{
    const il=new THREE.PointLight(0xffe8b0,1.1,20);il.position.set(lx,ly,lz);scene.add(il);
    const lb=new THREE.Mesh(new THREE.BoxGeometry(1.2,.3,1.8),new THREE.MeshStandardMaterial({color:0x333333,roughness:.4,metalness:.8}));
    lb.position.set(lx,ly+.15,lz);scene.add(lb);
  });
  // ארגזים בפנים
  const iCrateM=MMAT(_mkConcreteTexture(128,true),0xbbaa88);
  [[WH_X-11,WH_Z-8],[WH_X-9,WH_Z-8],[WH_X-11,WH_Z-6],
   [WH_X+10,WH_Z-7],[WH_X+8,WH_Z-7]].forEach(([cx,cz])=>{
    const cr=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.8,1.8),iCrateM.clone());
    cr.position.set(cx,.9,cz);scene.add(cr);
  });
  // לוגו APEX על קיר פנימי
  const logoM=new THREE.MeshStandardMaterial({color:0x0a001a,emissive:0x550088});
  const logo=new THREE.Mesh(new THREE.PlaneGeometry(6,2.5),logoM);
  logo.position.set(WH_X,4.5,WH_Z-WH_D/2+.12);scene.add(logo);
  // PointLight מסמן נקודת trigger
  const trigL=new THREE.PointLight(0x8800cc,.8,8);trigL.position.set(WH_X,2,WH_Z-WH_D*.35);scene.add(trigL);

  // שמור trigger
  G.warehouseEntrance={x:WH_X, z:WH_Z+WH_D/2, r:4};
  G.warehouseInside  ={x:WH_X, z:WH_Z-WH_D*.35};

  // ══════════════════════════════════════════════
  // B: מפעל מתכות — 245, -140 (מרווח ימינה)
  // ══════════════════════════════════════════════
  const FX=248, FZ=-140;
  const factM=MMAT(mTexR.clone(),0xe8e0d0);
  iB(24,11,18,factM,FX,FZ);
  iBC(25,.5,19,new THREE.MeshStandardMaterial({map:rTex.clone(),roughness:.9,metalness:.15,color:0xb0aca0}),FX,FZ,11.25);
  // ארובות
  [[FX-7,FZ-4],[FX+5,FZ+3]].forEach(([cx,cz])=>{
    const chM=MMAT(_mkConcreteTexture(128,true),0xaaaaaa);
    const ch=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,13,10),chM.clone());
    ch.position.set(cx,6.5,cz);ch.castShadow=true;scene.add(ch);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1,.8,10),LM(0x333333));
    cap.position.set(cx,13.4,cz);scene.add(cap);
    for(let si=0;si<3;si++){
      const smk=new THREE.Mesh(new THREE.SphereGeometry(1.3+si*.7,8,8),
        new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.14,depthWrite:false}));
      smk.position.set(cx+(Math.random()-.5)*1.5,14.5+si*2,cz+(Math.random()-.5)*1.5);
      smk._isCloud=true;scene.add(smk);
    }
  });
  // חלונות מפעל
  for(let wi=0;wi<4;wi++){
    const wf=new THREE.Mesh(new THREE.BoxGeometry(.12,3,3.5),MMAT(_mkMetalTexture(64,[38,40,42]),0xaaaaaa));
    wf.position.set(FX-12.06,5,FZ-6+wi*5);scene.add(wf);
    const wg=new THREE.Mesh(new THREE.BoxGeometry(.07,2.6,3.1),new THREE.MeshStandardMaterial({color:0x334455,transparent:true,opacity:.5,roughness:.1}));
    wg.position.set(FX-12.1,5,FZ-6+wi*5);scene.add(wg);
  }
  // ספוט ניצוצות
  const spkL=new THREE.PointLight(0xff7700,1.5,10);spkL.position.set(FX-4,6,FZ+3);scene.add(spkL);
  G._indSparkLight=spkL; G._indSparkT=0;

  // ══════════════════════════════════════════════
  // C: תא שמירה + שער כניסה — x=195, z=-90
  // ══════════════════════════════════════════════
  const GBX=195, GBZ=-97;
  iB(9,5,8,MMAT(cTex.clone(),0xe8e4dc),GBX,GBZ);
  iBC(9.5,.3,8.5,roofM.clone(),GBX,GBZ,5.15);
  // חלון
  const gw=new THREE.Mesh(new THREE.BoxGeometry(.1,1.6,1.8),new THREE.MeshStandardMaterial({color:0x1a3322,transparent:true,opacity:.6}));
  gw.position.set(GBX-4.55,3.2,GBZ-.5);scene.add(gw);
  const GATE_X=215, GATE_Z=-90;
  // עמודי שער
  [[GATE_X-6,GATE_Z],[GATE_X+6,GATE_Z]].forEach(([gx,gz])=>{
    const gp=new THREE.Mesh(new THREE.BoxGeometry(1.4,7,1),MMAT(cTexD.clone(),0xbbbbbb));
    gp.position.set(gx,3.5,gz);scene.add(gp);
    const gc=new THREE.Mesh(new THREE.BoxGeometry(1.7,.5,1.3),LM(0x666666));
    gc.position.set(gx,7.25,gz);scene.add(gc);
  });
  const bar=new THREE.Mesh(new THREE.BoxGeometry(11.6,.25,.25),LM(0xdd2200));
  bar.position.set(GATE_X,5,GATE_Z);scene.add(bar);
  const bar2=new THREE.Mesh(new THREE.BoxGeometry(11.6,.25,.25),LM(0xffffff));
  bar2.position.set(GATE_X,4.72,GATE_Z);scene.add(bar2);
  // שלט WARNING
  const warn=new THREE.Mesh(new THREE.BoxGeometry(4.5,1.4,.1),
    new THREE.MeshStandardMaterial({color:0x110000,emissive:0x330000}));
  warn.position.set(GATE_X,6.5,GATE_Z);scene.add(warn);

  // ══════════════════════════════════════════════
  // D: מכולות — שתי שורות
  // ══════════════════════════════════════════════
  [
    [206,-158,0x2a4a2a],[215,-158,0x3a2a2a],[224,-158,0x2a2a4a],[233,-158,0x4a3a1a],[242,-158,0x1a3a3a],
    [209,-170,0x3a1a3a],[220,-170,0x1a4a2a],[231,-170,0x4a4a1a],
  ].forEach(([cx,cz,col])=>{
    const r=(col>>16)&0xff,g=(col>>8)&0xff,b=col&0xff;
    const cM=MMAT(_mkMetalTexture(256,[r+40,g+40,b+40]),col);
    iB(9,4.5,4.5,cM,cx,cz);
    for(let ci=0;ci<3;ci++){
      const cs=new THREE.Mesh(new THREE.BoxGeometry(.2,4.5,.2),LM(0x1a1a1a));
      cs.position.set(cx-3.5+ci*3.5,2.25,cz);scene.add(cs);
    }
  });

  // ══════════════════════════════════════════════
  // E: מיכלי דלק — אשכול
  // ══════════════════════════════════════════════
  [[258,-110,6,11],[258,-127,5,9],[264,-118,4.5,8],[270,-110,4,7]].forEach(([tx,tz,tr,th])=>{
    const tM=MMAT(_mkMetalTexture(256,[100,96,82]),0xddd0b0);
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(tr,tr,th,14),tM.clone());
    tank.position.set(tx,th/2,tz);tank.castShadow=true;scene.add(tank);
    blds.push({x:tx,z:tz,w:tr*2+1,d:tr*2+1});
    const dom=new THREE.Mesh(new THREE.SphereGeometry(tr+.2,14,7,0,Math.PI*2,0,Math.PI/2),tM.clone());
    dom.position.set(tx,th,tz);scene.add(dom);
    [th*.28,th*.58].forEach(sy=>{
      const st=new THREE.Mesh(new THREE.CylinderGeometry(tr+.05,tr+.05,.4,14,1,true),LM(0xcc3300));
      st.position.set(tx,sy,tz);scene.add(st);
    });
  });
  // צינורות
  const pM=new THREE.MeshStandardMaterial({color:0x888880,roughness:.5,metalness:.6});
  const pp=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,12,8),pM);
  pp.rotation.z=Math.PI/2;pp.position.set(264,-118,4);scene.add(pp);

  // ══════════════════════════════════════════════
  // F: חניית משאיות + קרון רכבת נטוש
  // ══════════════════════════════════════════════
  const pkM=new THREE.MeshStandardMaterial({map:aTex.clone(),roughness:.97,color:0xcccccc});
  const pk=new THREE.Mesh(new THREE.PlaneGeometry(38,24),pkM);
  pk.rotation.x=-Math.PI/2;pk.position.set(220,-.01,-195);pk.receiveShadow=true;pk._isGround=true;scene.add(pk);
  for(let ci=0;ci<5;ci++){
    const cl=new THREE.Mesh(new THREE.PlaneGeometry(.14,24),new THREE.MeshLambertMaterial({color:0xffffff}));
    cl.rotation.x=-Math.PI/2;cl.position.set(202+ci*7,.015,-195);scene.add(cl);
  }
  // קרון רכבת
  const trM=MMAT(_mkMetalTexture(256,[85,78,70]),0xccbbaa);
  const train=new THREE.Mesh(new THREE.BoxGeometry(30,4.5,4.5),trM);
  train.position.set(245,2.25,-200);train.castShadow=train.receiveShadow=true;scene.add(train);
  blds.push({x:245,z:-200,w:30,d:5});
  for(let ti=0;ti<5;ti++){
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.65,10),LM(0x181818));
    wh.rotation.z=Math.PI/2;wh.position.set(231+ti*5,1,-201.6);scene.add(wh);
    const wh2=wh.clone();wh2.position.z=-198.4;scene.add(wh2);
  }

  // ══════════════════════════════════════════════
  // G: גדר היקפית — X=180-275, Z=-90 עד -215
  // ══════════════════════════════════════════════
  const fPM=MMAT(_mkMetalTexture(64,[75,80,85]),0xcccccc);
  const fWM=LM(0x6677889);
  const FENCE=[
    [180,-90, 275,-90],   // צפון
    [275,-90, 275,-215],  // מזרח
    [275,-215,180,-215],  // דרום
    [180,-215,180,-90],   // מערב
  ];
  FENCE.forEach(([x1,z1,x2,z2])=>{
    const len=Math.sqrt((x2-x1)**2+(z2-z1)**2);
    const steps=Math.floor(len/6);
    for(let fi=0;fi<=steps;fi++){
      const t=fi/steps;
      const fx=x1+(x2-x1)*t,fz=z1+(z2-z1)*t;
      const fp=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,3.4,6),fPM.clone());
      fp.position.set(fx,1.7,fz);scene.add(fp);
      const sp=new THREE.Mesh(new THREE.ConeGeometry(.15,.45,4),LM(0x445566));
      sp.position.set(fx,3.55,fz);scene.add(sp);
    }
    [1,1.9,2.8].forEach(fh=>{
      const fw=new THREE.Mesh(new THREE.BoxGeometry(len,.05,.05),LM(0x667788));
      fw.position.set((x1+x2)/2,fh,(z1+z2)/2);fw.rotation.y=Math.atan2(x2-x1,z2-z1);scene.add(fw);
    });
  });

  // ══════════════════════════════════════════════
  // H: תאורה — 10 עמודים
  // ══════════════════════════════════════════════
  [[205,-96],[228,-96],[255,-96],[275,-110],[275,-145],[275,-180],
   [228,-180],[195,-145],[205,-160],[248,-160]].forEach(([lx,lz])=>{
    const lpM=MMAT(_mkMetalTexture(64,[85,88,94]),0xcccccc);
    const lp=new THREE.Mesh(new THREE.CylinderGeometry(.11,.15,9,8),lpM.clone());
    lp.position.set(lx,4.5,lz);scene.add(lp);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(3,.13,.13),lpM.clone());
    arm.position.set(lx+1.5,9.05,lz);scene.add(arm);
    const lh=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1.6),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.4,metalness:.8}));
    lh.position.set(lx+3,8.8,lz);scene.add(lh);
    const pl=new THREE.PointLight(0xffe090,.95,32);pl.position.set(lx+3,8.5,lz);scene.add(pl);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.5,6,6),
      new THREE.MeshBasicMaterial({color:0xffee88,transparent:true,opacity:.22,depthWrite:false}));
    glow.position.set(lx+3,8.5,lz);scene.add(glow);
  });

  // ══════════════════════════════════════════════
  // I: פרופס — חביות, ארגזים
  // ══════════════════════════════════════════════
  const brM=MMAT(_mkMetalTexture(128,[90,60,30]),0xcc9955);
  [[207,-115],[209,-115],[208,-117],[212,-115],[214,-115],
   [230,-108],[232,-108],[231,-110]].forEach(([bx,bz])=>{
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,1.25,10),brM.clone());
    b.position.set(bx,.625,bz);scene.add(b);
    const rg=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.14,10),LM(0x2a2a2a));
    rg.position.set(bx,.55,bz);scene.add(rg);
  });
  const crM=MMAT(_mkConcreteTexture(128,false),0xccbb88);
  [[218,-110,0],[219.6,-110,0],[218,-111.7,0],[218,-110,1.5],[219.6,-110,1.5]].forEach(([cx,cz,cy])=>{
    const cr=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.7,1.7),crM.clone());
    cr.position.set(cx,.85+cy,cz);scene.add(cr);
  });

  // ══════════════════════════════════════════════
  // J: שלטי אזהרה
  // ══════════════════════════════════════════════
  [[188,-91],[222,-91],[268,-100],[268,-155]].forEach(([sx,sz])=>{
    const sp=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2.8,6),LM(0x888888));
    sp.position.set(sx,1.4,sz);scene.add(sp);
    const sb=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,.06),
      new THREE.MeshStandardMaterial({color:0xffaa00,emissive:0x332200}));
    sb.position.set(sx,3,sz);scene.add(sb);
  });

  // ══════════════════════════════════════════════
  G.indZoneCenter={x:IX, z:IZ};
  G.warehousePos ={x:WH_X, z:WH_Z};
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
  const pg=new THREE.Mesh(new THREE.PlaneGeometry(40,35),new THREE.MeshLambertMaterial({color:0x3d8a2a}));pg.rotation.x=-Math.PI/2;pg.position.set(x,.07,z);pg._isGround=true;scene.add(pg);
  for(let i=0;i<7;i++)bldTree(x+(Math.random()-.5)*32,z+(Math.random()-.5)*26);
  mkB(2.5,.35,.8,0x5c3317,x-5,.2,z-7);
}

function buildDogBase(){
  const X=105,Z=25;
  const wM=new THREE.MeshLambertMaterial({color:0xf0ddb0});
  const rM=new THREE.MeshLambertMaterial({color:0xc0392b});
  const wdM=new THREE.MeshLambertMaterial({color:0x6b3f1a});
  const gM=new THREE.MeshLambertMaterial({color:0xf5c518});

  // רצפת חצר — quad אחד
  const yard=new THREE.Mesh(new THREE.PlaneGeometry(22,18),new THREE.MeshLambertMaterial({color:0xd4b896}));
  yard.rotation.x=-Math.PI/2;yard.position.set(X,.06,Z);yard._isGround=true;scene.add(yard);

  // בניין — שני קוביות (גוף+גג)
  const body=mkB(12,4,7,0xf0ddb0,X,2,Z-4);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(9,2.5,4),rM);
  roof.position.set(X,5.25,Z-4);roof.rotation.y=Math.PI/4;scene.add(roof);
  blds.push({x:X,z:Z-4,w:12,d:7});

  // דלת + 2 חלונות — 3 קוביות
  mkB(1.8,2.8,.15,0x6b3f1a,X,1.4,Z-.55);
  mkB(1.6,1.2,.12,0x88ccff,X-3.5,2.8,Z-.52);
  mkB(1.6,1.2,.12,0x88ccff,X+3.5,2.8,Z-.52);

  // שלט — קוביה אחת
  mkB(6,.7,.15,0xf5c518,X,1,Z-.48);

  // עמוד דגל — 2 קוביות
  mkB(.15,6,.15,0x6b3f1a,X-7,3,Z-7);
  mkB(2.5,1.5,.08,0xf5c518,X-5.75,5.5,Z-7);

  // גדר — 4 קוביות בלבד
  mkB(22,.8,.25,0x6b3f1a,X,.4,Z+6.8);
  mkB(22,.8,.25,0x6b3f1a,X,.4,Z-14.8);
  mkB(.25,.8,20,0x6b3f1a,X-10.8,.4,Z-4);
  mkB(.25,.8,20,0x6b3f1a,X+10.8,.4,Z-4);

  // שני עצים
  bldTree(X-8,Z+4);bldTree(X+8,Z+4);

  addTerr(X,Z,12,'בסיס כלבי לוד');
}

function bldMarket(x,z){
  const awningCols=[0xcc2200,0x2255aa,0x228833,0xcc7700,0x882299,0xaa1133];
  const woodM  =new THREE.MeshLambertMaterial({color:0x6b3f1a});
  const woodLtM=new THREE.MeshLambertMaterial({color:0x8B5a2a});
  const whiteM =new THREE.MeshLambertMaterial({color:0xffffff});
  const wallM  =new THREE.MeshLambertMaterial({color:0xf0e6cc});

  for(let i=0;i<6;i++){
    const sx=x+i*6.2, sz=z;

    // ── גוף הדוכן ──
    const stall=new THREE.Mesh(new THREE.BoxGeometry(5.6,2.8,3.2),wallM);
    stall.position.set(sx,1.4,sz);stall.castShadow=true;stall.receiveShadow=true;scene.add(stall);

    // ── 4 עמודי פינה ──
    [[-2.6,1.8],[2.6,1.8],[-2.6,-1.8],[2.6,-1.8]].forEach(([ox,oz])=>{
      const post=new THREE.Mesh(new THREE.BoxGeometry(.22,3.1,.22),woodM);
      post.position.set(sx+ox,1.55,sz+oz);scene.add(post);
    });

    // ── מרקיזה משופעת — 2 חלקים ──
    const awCol=awningCols[i%awningCols.length];
    const awM=new THREE.MeshLambertMaterial({color:awCol});
    // חלק אחורי גבוה
    const awBack=new THREE.Mesh(new THREE.BoxGeometry(6,.12,1.8),awM);
    awBack.position.set(sx,3.1,sz+0.6);awBack.rotation.x=-0.18;scene.add(awBack);
    // חלק קדמי משופע ומוארך
    const awFront=new THREE.Mesh(new THREE.BoxGeometry(6,.1,2.2),awM);
    awFront.position.set(sx,2.65,sz-1.5);awFront.rotation.x=0.32;scene.add(awFront);
    // פסים לבנים על המרקיזה
    for(let s=0;s<4;s++){
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.28,.14,2.2),whiteM);
      strip.position.set(sx-2.1+s*1.4,2.67,sz-1.5);strip.rotation.x=0.32;scene.add(strip);
    }
    // שוליים קדמיים — גדילים קצרים
    for(let f=0;f<8;f++){
      const fringe=new THREE.Mesh(new THREE.BoxGeometry(.18,.3,.06),awM);
      fringe.position.set(sx-2.6+f*.74,2.22,sz-2.55);scene.add(fringe);
    }

    // ── דלפק עץ ──
    const counter=new THREE.Mesh(new THREE.BoxGeometry(5.2,.55,1.1),woodLtM);
    counter.position.set(sx,.28,sz-1.6);counter.castShadow=true;scene.add(counter);
    // לוח קדמי של הדלפק
    const front=new THREE.Mesh(new THREE.BoxGeometry(5.2,.6,.12),woodM);
    front.position.set(sx,.3,sz-2.17);scene.add(front);

    // ── מוצרים על הדלפק — כדורים צבעוניים (פירות/ירקות) ──
    const prodCols=[0xff4400,0xffcc00,0xff8800,0x44bb22,0xcc2244,0xffee44];
    for(let p=0;p<5;p++){
      const prod=new THREE.Mesh(
        new THREE.SphereGeometry(.22,6,5),
        new THREE.MeshLambertMaterial({color:prodCols[(i+p)%prodCols.length]})
      );
      prod.position.set(sx-1.8+p*.9,.62,sz-1.6);scene.add(prod);
    }

    // ── שלט מעל הדוכן ──
    const sign=new THREE.Mesh(new THREE.BoxGeometry(3.2,.6,.12),woodM);
    sign.position.set(sx,2.88,sz+1.72);scene.add(sign);
    const signTrim=new THREE.Mesh(new THREE.BoxGeometry(3.4,.08,.14),new THREE.MeshLambertMaterial({color:0xf5c518}));
    signTrim.position.set(sx,2.58,sz+1.72);scene.add(signTrim);
    const signTrim2=signTrim.clone();signTrim2.position.y=3.18;scene.add(signTrim2);

    // ── קולידר — רק לבניין האחורי, לא לדלפק הפתוח ──
    blds.push({x:sx,z:sz+0.8,w:5.6,d:1.6});
  }

  // ── גג/מבנה מקשר מעל כל הדוכנים ──
  const roofBeam=new THREE.Mesh(new THREE.BoxGeometry(6.2*6+1,.18,.28),woodM);
  roofBeam.position.set(x+6.2*2.5,3.14,z+1.72);scene.add(roofBeam);
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
  for(let i=0;i<13;i++){
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
  for(let i=0;i<13;i++){
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
  // 8 PointLights דינמיים — זזים תמיד לפנסים הקרובים לשחקן
  for(let i=0;i<13;i++){
    const pl=new THREE.PointLight(0xffd97a,0,18);
    pl.position.set(0,4.5,0);
    scene.add(pl);
    _lampLightPool.push(pl);
  }
}
function _updLampPool(){
  if(!_streetLamps.length||!PB)return;
  const lampsOn=G.dayTime>0.72||G.dayTime<0.28;
  const targetI=lampsOn?1.1:0;

  // מצא 8 הפנסים הקרובים לשחקן
  const px=PB.position.x,pz=PB.position.z;
  const sorted=_streetLamps
    .map((l,i)=>({l,i,d:(l.x-px)*(l.x-px)+(l.z-pz)*(l.z-pz)}))
    .sort((a,b)=>a.d-b.d)
    .slice(0,8);

  sorted.forEach(({l},i)=>{
    const pl=_lampLightPool[i];
    pl.position.set(l.x,4.5,l.z);
    pl.intensity+=(targetI-pl.intensity)*0.06;
  });
  // שאר ה-lights כבים
  for(let i=sorted.length;i<_lampLightPool.length;i++){
    _lampLightPool[i].intensity*=0.85;
  }
  // עדכן צבע הנורה
  _streetLamps.forEach(l=>{
    if(l.bulb){
      const t=lampsOn?1:0;
      const cur=l.bulb.emissive.r;
      const nr=cur+(t-cur)*0.05;
      l.bulb.emissive.setRGB(nr*1.0,nr*0.85,nr*0.3);
    }
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
    dogLegs.push({node:lg,ph:d.ph,paw:pw});
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
  for(let i=0;i<13;i++){const link=new THREE.Mesh(new THREE.TorusGeometry(.08*sz,.025*sz,4,8),metal);const a=i/8*Math.PI*2;link.position.set(Math.sin(a)*.22*sz,1.04*sz,.64*sz+Math.cos(a)*.22*sz);link.rotation.y=a;g.add(link);}
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
  // מרכז גהה — מזרח צפון
  [55,-112],[68,-108],[72,-122],[58,-128],
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
  // הסר mesh ישן מה-scene לפני החלפה
  if(e.mesh){try{scene.remove(e.mesh);}catch(_){}}
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
  _lodStaticObjs=null;_lodShadowObjs=null; // reset LOD cache on scene switch
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
    if(dd<5.5&&G._atkFrame&&b._hitT<=0&&b._hitCD<=0){
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
    // פגיעה בשומר — רק כשלוחצים attack
    if(!g._atkCD)g._atkCD=0;
    g._atkCD=Math.max(0,g._atkCD-dt);
    if(dd<4.5&&G._atkFrame&&g._hitT<=0&&g._atkCD<=0){
      const dmg=Math.round(G.dogs[G.dog].pow*9);g.hp-=dmg;haptic(18);
      if(g.mesh.children[0])flash(g.mesh.children[0]);
      g._hitT=0.5;g._atkCD=0.5;
      if(g.bar)g.bar.scale.x=Math.max(0,g.hp/g.mhp);
      if(g.hp<=0){g.hp=0;g.mesh.visible=false;haptic([40,20,40]);addXP(15);G.coins+=10;updCoins();showN('✅ שומר הוכנע!');}
      else{g.state='chase';g.alertT=0;}
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
  for(let i=0;i<13;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.2,8,.18),new THREE.MeshLambertMaterial({color:0x122a18}));rib.rotation.y=i*Math.PI/4;rib.position.set(0,11.5,-8);mosqueScene.add(rib);mosqueObjects.push(rib);}
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
  _lodStaticObjs=null;_lodShadowObjs=null;
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
    if(G.mission===9&&!G.momoFreed){if(!G._zippoExitWarned){G._zippoExitWarned=true;showN('זיפו: "אני לא יכול לעזוב בלי מומו!"');}}
    else if(mosqueDoorLocked)showN('🔒 הדלת נעולה! הבס את ברונו כדי לפתוח!');
    else exitMosque(G.momoFreed);
    return;
  }
  G._zippoExitWarned=false;
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
    {x:-80,z:51,name:'🥩 מכולת השוק',type:'shop',av:'🏪',buildFn:()=>mkShuki(.7),shopItems:[
      {ico:'🍖',name:'מנת בשר',desc:'+40 בריאות',cost:30,fn:()=>shopBuy('hp')},
      {ico:'💊',name:'תרופה',desc:'+80 בריאות מלא',cost:60,fn:()=>shopBuy('hp_big')},
      {ico:'⚡',name:'מנת אנרגיה',desc:'+100 סטמינה',cost:20,fn:()=>shopBuy('stam')},
    ]},
    {x:-67.6,z:51,name:'🦷 דוכן הציוד',type:'shop',av:'🏪',buildFn:()=>mkBoxer(.7),shopItems:[
      {ico:'🦷',name:'חידוד שיניים',desc:'+3 כוח קבוע',cost:80,fn:()=>shopBuy('pow')},
      {ico:'🏃',name:'שמן מנועים',desc:'+0.5 מהירות קבוע',cost:60,fn:()=>shopBuy('spd')},
      {ico:'🛡️',name:'שריון פרוות',desc:'+20 HP מקס׳',cost:100,fn:()=>shopBuy('mhp')},
    ]},
    {x:-55.2,z:51,name:'👗 חנות עיצוב',type:'shop',av:'🏪',buildFn:()=>mkLola(.7),shopItems:[
      {ico:'⚡',name:'צוארון ספייק',desc:'מתכת כבדה. לא לכולם.',cost:50,fn:()=>buyCos('spike')},
      {ico:'🕶️',name:'משקפי שמש',desc:'נינג׳ה. אל תשאל.',cost:40,fn:()=>buyCos('glasses')},
      {ico:'🎀',name:'בנדנה אדומה',desc:'כלי לחימה פסיכולוגי.',cost:35,fn:()=>buyCos('bandana')},
      {ico:'🦸',name:'גלימת גיבור',desc:'רק לגיבור האמיתי.',cost:120,fn:()=>buyCos('cape')},
    ]},
  ];
  npcDefs.forEach(n=>{
    // וידוא מיקום בטוח — לא בתוך בניין ולא בתוך כביש
    // חנויות לא מוזזות — הן חייבות לעמוד ליד הדוכן שלהן
    let {x,z}=n;
    if(n.type!=='shop' && (isInBuilding(x,z,2)||_isOnRoad(x,z))){
      // מצא נקודה קרובה על מדרכה
      for(const [sx,sz] of _SPAWN_POOL){
        if(!isInBuilding(sx,sz,2)&&!_isOnRoad(sx,sz)&&d2(sx,sz,x,z)<40){x=sx;z=sz;break;}
      }
    }
    const ng=n.buildFn();
    ng.position.set(x,0,z);
    // חנויות — יסתכלו לכיוון מרכז העיר (איפה השחקן מתחיל)
    if(n.type==='shop'){
      const dx=0-x, dz=60-z;
      ng.rotation.y=Math.atan2(dx,dz);
    }
    scene.add(ng);
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
function mAtk(){
  if(LAB.inLab){
    if(G.atkCD<=0){
      const _c=G.dog==='zippo'?0.28:0.5;
      G._labAtk=true;G.atkCD=_c;
      sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);
    }
  } else if(TA.inTA){
    const _c=G.dog==='zippo'?0.28:0.5;
    if(G.atkCD<=0){G.atkCD=_c;sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);G._taAtkFrame=true;setTimeout(()=>{G._taAtkFrame=false;},250);}
  } else {doAtk();}
}function mF(){
  G._z18FireMob=true;setTimeout(()=>{G._z18FireMob=false;},200);
}function mE(){
  if(G.mission===32&&!G._ch6FireDone&&G._fireNearActive){G._fireKeyMob=true;return;}
  // סמן eKeyFrame בכל המשימות — מאפשר doInteract גם לפני חידוש checkNear
  G._eKeyFrame=true;setTimeout(()=>{G._eKeyFrame=false;},200);
  if(G.near)doInteract();
}function mJmp(){if(G.onGround){G.velY=8;G.onGround=false;}}function mTab(){switchDog();}

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
  if(G._gameComplete){
    const mp=document.getElementById('mp');if(mp)mp.style.display='none';return;
  }
  let txt=MISSIONS[G.mission].txt;
  // Update counters dynamically
  if(G.mission===1)txt=txt.replace('0/3',`${G.foodEaten}/3`);
  if(G.mission===3)txt=txt.replace('0/3',`${G.enemiesKilled}/3`);
  if(G.mission===4)txt=txt.replace('0/2',`${G.recruitsDone}/2`);
  document.getElementById('mtx').textContent=txt;
}

let _navTargetWorld=null;

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

function updateNavArrow(){
  // מופעל מ-updHUD — רק מפעיל/מכבה
  const el=document.getElementById('nav-edge-arrow');
  if(!el)return;
  const m=MISSIONS[G.mission];
  const _exploreMode=G.mission===23||G.mission===24;
  const hide=!m||(!_exploreMode&&(!m.hint||m.hint===''))||G.mission===7||G.mission===19;
  if(hide){el.style.display='none';return;}
  el.style.display='flex';
}

function updateNavDirection(){
  if(G.mission===7)return;
  const m=MISSIONS[G.mission];if(!m)return;
  const el=document.getElementById('nav-edge-arrow');
  const lbl=document.getElementById('nav-edge-lbl');
  if(!el||!lbl)return;
  // TA — השתמש במיקום TA ובתargetFn ישירות
  if(typeof TA!=='undefined'&&TA.inTA){
    const px=TA.playerX,pz=TA.playerZ;
    const tgt=m.targetFn?m.targetFn():null;if(!tgt)return;
    const tx=tgt.x||0,tz=tgt.z||0;
    const dx=tx-px,dz=tz-pz;
    const dist=Math.round(Math.sqrt(dx*dx+dz*dz));
    const worldAngle=Math.atan2(dx,dz);
    const camAngle=worldAngle-(G.yaw+Math.PI);
    const W=window.innerWidth,H=window.innerHeight;
    const cx=W/2,cy=H/2;
    const rx=-Math.sin(camAngle),ry=-Math.cos(camAngle);
    const scale=Math.min(Math.abs(rx)>0?(cx*.55)/Math.abs(rx):Infinity,Math.abs(ry)>0?(cy*.55)/Math.abs(ry):Infinity);
    el.style.left=Math.round(cx+rx*scale)+'px';el.style.top=Math.round(cy+ry*scale)+'px';
    el.style.transform='translate(-50%,-50%)';el.style.display='flex';
    const icon=document.getElementById('nav-edge-icon');
    if(icon)icon.style.transform=`rotate(${Math.atan2(rx,ry)}rad)`;
    lbl.textContent=dist<50?`📍 ${m.hint}`:`${m.hint} ${dist}מ׳`;
    _navTargetWorld={x:tx,z:tz};
    return;
  }
  const px=PB.position.x,pz=PB.position.z;
  let tx,tz;
  if(G.mission===0){tx=-60;tz=60;}
  else if(G.mission===1){const p=nearestOf(G.pickups.filter(p=>!p.done),o=>({x:o.x,z:o.z}));if(!p)return;tx=p.x;tz=p.z;}
  else if(G.mission===2){const t=nearestOf(G.terrs.filter(t=>!t.cap),o=>({x:o.x,z:o.z}));if(!t)return;tx=t.x;tz=t.z;}
  else if(G.mission===3){const e=nearestOf(G.enemies.filter(e=>e.hp>0&&e.mesh.visible),o=>({x:o.mesh.position.x,z:o.mesh.position.z}));if(!e)return;tx=e.x;tz=e.z;}
  else if(G.mission===4){const n=nearestOf(G.npcs.filter(n=>n.type==='recruit'&&!n.recruited),o=>({x:o.x,z:o.z}));if(!n)return;tx=n.x;tz=n.z;}
  else if(G.mission===5){const t=nearestOf(G.terrs.filter(t=>!t.cap),o=>({x:o.x,z:o.z}));if(!t)return;tx=t.x;tz=t.z;}
  else if(G.mission===11||G.mission===12){tx=-60;tz=60;}
  else if(G.mission===13){tx=G._fishkaEnemy?G._fishkaEnemy.x:35;tz=G._fishkaEnemy?G._fishkaEnemy.z:35;}
  else if(G.mission>=14&&G.mission<=15){tx=80;tz=-80;} // דלת עירייה
  else if(G.mission===16){
    // כספת — אם בעירייה הוביל לכספת, אחרת לדלת
    if(CITY.inCity&&G._citySafePos){tx=G._citySafePos.x;tz=G._citySafePos.z;}
    else{tx=80;tz=-80;}
  }
  else if(G.mission===17){
    // פלטו — שומר חי קרוב, או פלטו עצמו
    if(CITY.inCity){
      if(cityPalto&&!cityPalto.dead){tx=cityPalto.mesh.position.x;tz=cityPalto.mesh.position.z;}
      else{const g=nearestOf(cityGuards.filter(g=>g.hp>0),o=>({x:o.mesh.position.x,z:o.mesh.position.z}));if(g){tx=g.mesh.position.x;tz=g.mesh.position.z;}else{tx=0;tz=-25;}}
    }else{tx=80;tz=-80;}
  }
  else if(G.mission===18){
    if(CITY.inCity&&G._cityBroadcastPos){tx=G._cityBroadcastPos.x;tz=G._cityBroadcastPos.z;}
    else{tx=80;tz=-80;}
  }
  else if(G.mission===19){tx=80;tz=-80;} // יציאה מעירייה
  else if(G.mission===25){tx=105;tz=25;}
  else if(G.mission===26){tx=-60;tz=60;}
  else if(G.mission===27){tx=25;tz=-125;}
  else if(G.mission>=28&&G.mission<=32){
    tx=25;tz=-125; // כניסה למעבדה
    if(LAB.inLab){
      // בתוך מעבדה — הוביל לאויב חי קרוב
      const labEnemies=(G._labGuards||[]).filter(e=>!e.dead);
      if(G.mission===30&&G._shadowEnemy&&!G._shadowEnemy.dead){tx=G._shadowEnemy.x;tz=G._shadowEnemy.z;}
      else if(labEnemies.length>0){
        const le=nearestOf(labEnemies,o=>({x:o.x,z:o.z}));
        if(le){tx=le.x;tz=le.z;}
      }
    }
  }
  else if(G.mission===23||G.mission===24){
    // חקירת עולם — הוביל לנקודת עניין קרובה שלא ביקרנו
    const poi=[{x:-120,z:130,n:'בריכת הנחת'},{x:0,z:-68,n:'צפון העיר'},{x:40,z:0,n:'כיכר הכדורים'},{x:-80,z:51,n:'שוק לוד'},{x:-51,z:-100,n:'המסגד'},{x:62,z:-118,n:'מרכז גהה'}];
    const unvisited=poi.filter(p=>!G[`_visited_${p.n}`]);
    if(unvisited.length>0){
      const nearest=nearestOf(unvisited,o=>o);
      if(nearest){tx=nearest.x;tz=nearest.z;
        // סמן כנבקר כשקרובים מספיק
        if(d2(px,pz,nearest.x,nearest.z)<15)G[`_visited_${nearest.n}`]=true;
      }
    }else{tx=0;tz=0;} // מרכז העיר
  } else {
    const tgt=m.targetFn();if(!tgt)return;
    tx=(tgt.mesh?tgt.mesh.position.x:tgt.x)||0;
    tz=(tgt.mesh?tgt.mesh.position.z:tgt.z)||0;
  }
  const dx=tx-px,dz=tz-pz;
  const dist=Math.round(Math.sqrt(dx*dx+dz*dz));
  // כיוון בעולם → זווית על המסך
  const worldAngle=Math.atan2(dx,dz);
  const camAngle=worldAngle-(G.yaw+Math.PI);
  // מיקום החץ על שפת המסך
  const W=window.innerWidth,H=window.innerHeight;
  const margin=36;
  const cx=W/2,cy=H/2;
  const rx=-Math.sin(camAngle),ry=-Math.cos(camAngle);
  // מוצאים את נקודת החיתוך עם שפת המסך
  const scale=Math.min(
    Math.abs(rx)>0?(cx*0.55)/Math.abs(rx):Infinity,
    Math.abs(ry)>0?(cy*0.55)/Math.abs(ry):Infinity
  );
  const ex=Math.round(cx+rx*scale);
  const ey=Math.round(cy+ry*scale);
  // סיבוב החץ המשולש
  const arrowAngle=Math.atan2(rx,ry); // ← כיוון החץ
  el.style.left=ex+'px';
  el.style.top=ey+'px';
  el.style.transform=`translate(-50%,-50%)`;
  el.style.display='flex';
  // סובבים רק את המשולש
  const icon=document.getElementById('nav-edge-icon');
  if(icon)icon.style.transform=`rotate(${arrowAngle}rad)`;
  // תווית מרחק
  lbl.textContent=dist<50?`📍 ${m.hint}`:`${m.hint} ${dist}מ׳`;
  // נקודת יעד על המיניmap
  _navTargetWorld={x:tx,z:tz};
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
    updateNavDirection();
    if(mosqueCamera)renderer.render(mosqueScene,mosqueCamera);
    updHUD();
    return;
  }
  if(LAB.inLab){
    if(!G.paused&&!G.dlgOpen&&!G.cutOpen)updLab(dt);
    updPfx(dt);
    updateNavDirection();
    if(labCamera)renderer.render(labScene,labCamera);
    updHUD();
    return;
  }
  if(HOSP.inHosp){
    if(!G.paused&&!G.dlgOpen&&!G.cutOpen)updHosp(dt);
    updPfx(dt);
    updateNavDirection();
    if(hospCamera)renderer.render(hospScene,hospCamera);
    updHUD();
    return;
  }
  if(CITY.inCity){
    updCityHall(dt);updPfx(dt);
    updateNavDirection();
    if(cityCamera)renderer.render(cityScene,cityCamera);
    updHUD();
    return;
  }
  if(TA.inTA){
    updTelAviv(dt);updPfx(dt);
    updateNavDirection();
    if(taCamera)renderer.render(taScene,taCamera);
    updHUD();
    return;
  }
  if(!G.paused&&!G.dlgOpen&&!G.cutOpen&&!G._grabPaused){
    try{updPlayer(dt);}catch(e){console.error('updPlayer:',e);}
    try{updEnemies(dt);}catch(e){console.error('updEnemies:',e);}
    try{updPickups(dt);}catch(e){}
    // מוד מוזיקה דינמי
    (()=>{
      const anyClose=G.enemies.some(e=>e.hp>0&&e.mesh.visible&&d2(e.mesh.position.x,e.mesh.position.z,PB.position.x,PB.position.z)<18);
      const bossClose=(G.bosses&&G.bosses.some(b=>!b.dead&&d2(b.mesh.position.x,b.mesh.position.z,PB.position.x,PB.position.z)<25))||(G.bruno&&!G.bruno.dead)||(G.palto&&!G.palto.dead);
      const isNight=G.dayTime>0.72||G.dayTime<0.28;
      if(bossClose)setMusicMode('boss');
      else if(anyClose)setMusicMode('combat');
      else if(isNight)setMusicMode('night');
      else setMusicMode('explore');
    })();updTerrs(dt);updNPCs(dt);updPfx(dt);
    updateNavDirection();
    updSQPanel();updOWE(dt);_daily_trackDistance();
    updReputationHUD();
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
    updCh6(dt); // פרק ו׳
    updCh7(dt); // פרק ז׳
    try{updCh8(dt);}catch(e){console.error('updCh8:',e);}
    if(G.mission>=48)try{updCh9(dt);}catch(e){console.error('updCh9:',e);}
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
    // פרק ט׳ — כניסה לתל אביב: רק מישיון 53, אחרי שהשחקן עמד ליד הרכבת
    if(G.mission===53&&!TA.inTA){
      const px=PB.position.x,pz=PB.position.z;
      if(d2(px,pz,-40,150)<8)enterTelAviv();
    }
  }
  updCamera();updHUD();drawMM();_updLOD();renderer.render(scene,camera);
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
  if(dogModel&&dogModel._bipedalMode){
    // מצב עמידה — שומרים על הסיבוב, רק הרגליים האחוריות מתנדנדות קצת
    if(moving){PB.rotation.y=Math.atan2(-G.vx,-G.vz);walkT+=dt*3;
      dogLegs[2].node.rotation.x=Math.sin(walkT)*.12;
      dogLegs[3].node.rotation.x=Math.sin(walkT+Math.PI)*.12;
      dog.stam=Math.max(0,dog.stam-5*dt);}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.003)*.25;
  } else if(moving){
    PB.rotation.y=Math.atan2(-G.vx,-G.vz);
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    // head bob — תנועה עם גוף
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
    dog.stam=Math.max(0,dog.stam-5*dt);
  } else if(!dogModel||!dogModel._bipedalMode){
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
  const nx=Math.max(-280,Math.min(280,PB.position.x+G.vx*dt));
  const nz=Math.max(-280,Math.min(280,PB.position.z+G.vz*dt));
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
  // ── עדכון skills state ──
  if(_comboTimer>0){_comboTimer-=dt;if(_comboTimer<=0)_comboCount=0;}
  if(_stunCooldown>0)_stunCooldown-=dt;
  if(_dashCooldown>0)_dashCooldown-=dt;
  if(_charmedTimer>0){_charmedTimer-=dt;if(_charmedTimer<=0){_releaseCharm();showN('💜 הקסם פג.');}}
  // ── Dash movement (זיפו) ──
  if(_dashActive){
    PB.position.x+=_dashVX*dt;PB.position.z+=_dashVZ*dt;
    _dashVX*=0.78;_dashVZ*=0.78;_dashTimer-=dt;
    if(_dashTimer<=0)_dashActive=false;
  }
  // ── זיהוי שכונה כל ~2 שניות ──
  G._zoneCheckT=(G._zoneCheckT||0)+dt;
  if(G._zoneCheckT>2){G._zoneCheckT=0;_checkZone(PB.position.x,PB.position.z);}
  // ── Charmed enemy attacks foes ──
  if(_charmedEnemy&&_charmedEnemy.hp>0&&_charmedEnemy.mesh.visible){
    let nearestFoe=null,bd2=999;
    G.enemies.forEach(f=>{if(f===_charmedEnemy||f._charmed||f.hp<=0)return;const dd=(f.mesh.position.x-_charmedEnemy.mesh.position.x)**2+(f.mesh.position.z-_charmedEnemy.mesh.position.z)**2;if(dd<bd2){bd2=dd;nearestFoe=f;}});
    if(nearestFoe&&bd2<36){nearestFoe.hp=Math.max(0,nearestFoe.hp-6*dt*20);if(nearestFoe.hp<=0){nearestFoe.mesh.visible=false;sEDie();addXP(15);}}
  }
  // ── Stunned enemies — just take damage, no freeze ──
  // זיפו: מהירות תקיפה כפולה
  const _atkCooldown=G.dog==='zippo'?0.28:0.5;
  if(G.keys['KeyF']&&G.atkCD<=0){doAtk();G.atkCD=_atkCooldown;}
  if(G.keys['KeyQ']){G.keys['KeyQ']=false;_useSpecialSkill();}
  if(G.keys['KeyE']){G.keys['KeyE']=false;checkNear();if(G.near)doInteract();}
  if(G.keys['Tab']){G.keys['Tab']=false;switchDog();}
  dog.stam=Math.min(100,dog.stam+15*dt);
  if(!G._frameCount||G._frameCount%3===0)checkNear();
  checkCh2Triggers();
}

// ════════════════════════════════════════════════
// ATTACK — gated strictly
// ════════════════════════════════════════════════

// ── Ragdoll — אנימציית מוות פשוטה ──
function _ragdoll(grp){
  if(!grp||grp._ragdolling)return;
  grp._ragdolling=true;
  const dir=(Math.random()<0.5)?1:-1;
  // אסוף כל materials מהgroup
  const mats=[];
  grp.traverse(c=>{if(c.isMesh&&c.material){
    c.material=c.material.clone();c.material.transparent=true;mats.push(c.material);
  }});
  let t=0;
  const anim=setInterval(()=>{
    t+=0.06;
    grp.rotation.z=dir*(Math.PI/2)*Math.min(1,t*2.5);
    grp.position.y=Math.max(-0.4,grp.position.y-t*0.18);
    if(t>=1){
      clearInterval(anim);
      // fade
      let op=1;
      const fade=setInterval(()=>{
        op-=0.07;
        mats.forEach(m=>m.opacity=Math.max(0,op));
        if(op<=0){clearInterval(fade);grp.visible=false;}
      },40);
    }
  },33);
}
function doAtk(){
  G._atkFrame=true;setTimeout(()=>G._atkFrame=false,150);
  sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);
  const dog=G.dogs[G.dog],px=PB.position.x,pz=PB.position.z;
  spawnPfx(px,1,pz,0xf5c518,4);

  // כישורים הוסרו

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
        // זיפו: קריטי-היט
        const _isCrit=G.dog==='zippo'&&Math.random()<(dog._critChance||0.15);
        const dmg=(dog.pow*10*(1+dog.lv*.1))*(_isCrit?2.2:1);
        e.hp-=dmg;e.state='chase';e.lastSeenX=px;e.lastSeenZ=pz;e.searchT=8;sHit();haptic(22);flash(e.mesh.children[0]);spawnBlood(e.mesh.position.x,1,e.mesh.position.z);
        showDmg(e.mesh.position.x,1,e.mesh.position.z,(_isCrit?'💥 ':'')+Math.round(dmg));
        if(_isCrit)haptic([80,20,80]);
        if(e.hp<=0){e.hp=0;e.mesh.visible=false;sEDie();haptic([60,20,40]);addXP(20);G.score+=50;G.enemiesKilled++;G.totalKills++;
          if(G.daily){G.daily.kills=(G.daily.kills||0)+1;_daily_check();}
          const coins=10+Math.floor(Math.random()*8);G.coins+=coins;updCoins();showDmg(e.mesh.position.x,1.5,e.mesh.position.z,'+'+coins+'💰',true);
          _ragdoll(e.mesh);
          updateMissionHUD();
          if(e._titan&&G.mission===21){
            _checkCh5Progress();
            // בדיקה ישירה — אם כל 6 מתו, הפעל טיטאן עכשיו
            const _titanDead=G.enemies.filter(x=>x._titan&&x.hp<=0).length;
            if(_titanDead>=6&&!G._ch5ScoutsDone){
              G._ch5ScoutsDone=true;
              showN('✅ כל גיסות טיטאן הובסו!\n💀 טיטאן מגיע לתקוף!');
              setTimeout(()=>{
                G.mission=23;
                if(MISSIONS[23])MISSIONS[23].unlock();
                updateMissionHUD();updateNavArrow();
                if(G._titanEnemy){G._titanEnemy.frozen=false;}
                else if(typeof _spawnTitanBoss==='function'){_spawnTitanBoss(false);}
                showN('💀 טיטאן תוקף!');
              },1200);
            }
          }
          if(G.mission===3&&G.enemiesKilled>=3){showN(`✅ הכנעת 3/3 אויבים! עוברים לשלב הבא!`);setTimeout(()=>setMission(4),1200);}
          else if(G.mission===3) showN(`⚔️ הכנעת ${G.enemiesKilled}/3 אויבים`);
          if(!e._titan&&!e._isSuperSoldier&&G.mission!==3)setTimeout(()=>_respawnEnemy(e),4000+Math.random()*6000);
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

// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// LOD — Level of Detail v2: קל + מהיר + לא מסתיר קרקע
// אסטרטגיה: Shadow culling בלבד (ללא visibility culling לסטטיקה),
//             visibility culling רק לאויבים ו-NPCs,
//             matrixAutoUpdate=false לאובייקטים רחוקים.
// ════════════════════════════════════════════════
let _lodFrame=0;
let _lodStaticObjs=null;   // נאסף פעם אחת
let _lodShadowObjs=null;   // רק אובייקטים שמטילים צל

function _initLODStatics(){
  _lodStaticObjs=[];
  _lodShadowObjs=[];
  const _tmpV=new THREE.Vector3();
  // סמן meshes דינמיים — הם זזים ולא שייכים ל-LOD סטטי
  const _dynRoots=new Set();
  const _markDyn=(arr)=>arr.forEach(e=>{if(e.mesh)_dynRoots.add(e.mesh);});
  _markDyn(G.enemies);_markDyn(G.bosses);_markDyn(G.npcs);
  // סמן PB ואת כל ה-subtree שלו כדינמי (כולל dogModel ו-meshes פנימיים)
  if(PB)_dynRoots.add(PB);
  scene.traverse(obj=>{
    if(!obj.isMesh)return;
    // דלג על meshes דינמיים ועל כל ילדיהם, וגם על _lodExempt
    let p=obj;while(p){if(_dynRoots.has(p)||p._lodExempt)return;p=p.parent;}
    if(obj._isCloud||obj._isGround){
      obj.visible=true;
      if(obj._isGround){obj.receiveShadow=true;obj.castShadow=false;}
      return;
    }
    obj.getWorldPosition(_tmpV);
    obj._lodX=_tmpV.x;
    obj._lodZ=_tmpV.z;
    _lodStaticObjs.push(obj);
    _lodShadowObjs.push(obj); // כל mesh סטטי — לvisibility culling + shadow
  });
}

function _updLOD(){
  _lodFrame++;
  if(!PB)return;
  const px=PB.position.x, pz=PB.position.z;

  // ── כל frame: AI throttle לפי מרחק ──
  G.enemies.forEach(e=>{
    if(!e.mesh)return;
    const dx=e.mesh.position.x-px, dz=e.mesh.position.z-pz;
    const d2=dx*dx+dz*dz;
    e._lodSkip = d2>14400?6 : d2>4900?3 : 1;   // >120 / >70 / else
  });

  // ── כל 10 frames (~0.16s): zone group visibility ──
  // hysteresis: zone נפתח ב-r, נסגר ב-r×1.35 — מונע flickering בגבול
  if(_lodFrame%10===0){
    _zoneGroups.forEach(z=>{
      const dx=z.cx-px, dz=z.cz-pz;
      const d2=dx*dx+dz*dz;
      if(z.group.visible){
        // נסגר רק אם רחוק יותר מ-r×1.35
        const closeR=z.r*1.35;
        z.group.visible = d2 < closeR*closeR;
      } else {
        // נפתח ב-r רגיל
        z.group.visible = d2 < z.r*z.r;
      }
    });
  }

  // ── כל 45 frames (~0.75s): shadow culling ──
  if(_lodFrame%45!==0)return;
  if(!_lodShadowObjs)return;

  _lodShadowObjs.forEach(obj=>{
    if(obj._isCloud||obj._isGround)return;
    const dx=obj._lodX-px, dz=obj._lodZ-pz;
    const d2=dx*dx+dz*dz;
    const near=d2<3600;   // <60 יחידות
    obj.castShadow   = near && obj._canShadow!==false;
    obj.receiveShadow= d2<6400;  // <80
  });
}

// ── ZONE DEFINITIONS — שמות שכונות לפי מיקום ──
const _ZONES=[
  {x:0,   z:0,   r:30, name:'רחוב הרצל'},
  {x:40,  z:0,   r:22, name:'כיכר הכדורים'},
  {x:0,   z:-50, r:25, name:'רחוב בן גוריון'},
  {x:0,   z:50,  r:25, name:'רחוב וייצמן'},
  {x:-40, z:0,   r:20, name:'רחוב הגפן'},
  {x:40,  z:0,   r:20, name:'רחוב הדקל'},
  {x:72,  z:96,  r:28, name:'קרית בית הכנסת'},
  {x:-51, z:-100,r:35, name:'שכונת המסגד'},
  {x:-60, z:55,  r:30, name:'שוק לוד'},
  {x:50,  z:90,  r:28, name:'רמת אשכול'},
  {x:-50, z:-100,r:28, name:'שכונת הגשר'},
  {x:80,  z:-80, r:22, name:'כיכר העירייה'},
  {x:228, z:-152, r:60, name:'אזור תעשייה APEX'},
];
let _lastZone='',_zoneToastTimer=null;

function _checkZone(px,pz){
  let found='';
  let bestR=999;
  _ZONES.forEach(z=>{
    const d=Math.sqrt((px-z.x)**2+(pz-z.z)**2);
    if(d<z.r&&z.r<bestR){bestR=z.r;found=z.name;}
  });
  if(found&&found!==_lastZone){
    _lastZone=found;
    _showZoneToast(found);
  }
}

function _showZoneToast(name){
  const el=document.getElementById('zone-toast');
  if(!el)return;
  el.textContent='📍 '+name;
  el.style.display='block';
  el.style.animation='none';void el.offsetWidth;
  el.style.animation='zoneIn 0.35s ease-out forwards';
  clearTimeout(_zoneToastTimer);
  _zoneToastTimer=setTimeout(()=>{
    el.style.animation='zoneOut 0.5s ease-in forwards';
    setTimeout(()=>el.style.display='none',500);
  },2800);
}

// ════════════════════════════════════════════════
// SKILL FUNCTIONS — כישורים ייחודיים
// ════════════════════════════════════════════════
function _showComboHit(n){
  if(n<=1)return;
  const labels={2:'2x Combo!',3:'3x Combo!! 🔥',4:'⚡ STUN INCOMING!'};
  const txt=labels[n];if(!txt)return;
  let el=document.getElementById('combo-pop');
  if(!el){el=document.createElement('div');el.id='combo-pop';
    el.style.cssText='position:fixed;top:38%;left:50%;transform:translate(-50%,-50%);font-size:clamp(18px,5vw,28px);font-weight:bold;color:#f5c518;text-shadow:0 0 16px #f5c518,0 2px 4px #000;pointer-events:none;z-index:60;display:none;font-family:Arial Hebrew,Arial,sans-serif;';
    document.body.appendChild(el);}
  el.textContent=txt;el.style.display='block';el.style.animation='none';void el.offsetWidth;
  el.style.animation='floatUp 0.9s ease-out forwards';setTimeout(()=>el.style.display='none',900);
}
function _colinStunAttack(){
  if(!PB)return;
  const px=PB.position.x,pz=PB.position.z;
  const dog=G.dogs['colin'];
  const dmg=dog.pow*25*(1+dog.lv*0.12);
  let stunned=0;
  G.enemies.forEach(e=>{
    if(e.hp<=0||!e.mesh.visible)return;
    const dist=Math.sqrt((e.mesh.position.x-px)**2+(e.mesh.position.z-pz)**2);
    if(dist<5.5){
      e.hp=Math.max(0,e.hp-dmg);
      spawnPfx(e.mesh.position.x,1,e.mesh.position.z,0xf5c518,10);
      stunned++;
      if(e.hp<=0){
        e.hp=0;e.mesh.visible=false;sEDie();haptic([60,20,40]);
        addXP(20);G.score+=50;G.enemiesKilled++;G.totalKills++;
        if(G.daily){G.daily.kills=(G.daily.kills||0)+1;_daily_check();}
        updateMissionHUD();
        if(G.mission===3&&G.enemiesKilled>=3){showN('\u2705 \u05d4\u05db\u05e0\u05e2\u05ea 3/3 \u05d0\u05d5\u05d9\u05d1\u05d9\u05dd! \u05e2\u05d5\u05d1\u05e8\u05d9\u05dd \u05dc\u05e9\u05dc\u05d1 \u05d4\u05d1\u05d0!');setTimeout(()=>setMission(4),1200);}
        else if(G.mission===3)showN(`\u26d4 \u05d4\u05db\u05e0\u05e2\u05ea ${G.enemiesKilled}/3 \u05d0\u05d5\u05d9\u05d1\u05d9\u05dd`);
        if(!e._titan&&!e._isSuperSoldier&&G.mission!==3)setTimeout(()=>_respawnEnemy(e),4000+Math.random()*6000);
      } else {
        if(e.bar)e.bar.material.color.setHex(0xffff00);
      }
    }
  });
  if(stunned>0){showN(`💥 STUN! קולין השתיק ${stunned} אויבים!`);haptic([100,40,100]);sCapture();}
  for(let i=0;i<13;i++){const a=(i/8)*Math.PI*2;spawnPfx(px+Math.cos(a)*2.5,0.3,pz+Math.sin(a)*2.5,0xe67e22,3);}
}
function _momoCharm(){
  if(!PB)return;
  if(_charmedEnemy){_releaseCharm();return;}
  const px=PB.position.x,pz=PB.position.z;
  let closest=null,bestDist=12;
  G.enemies.forEach(e=>{if(e.hp<=0||!e.mesh.visible)return;const dist=Math.sqrt((e.mesh.position.x-px)**2+(e.mesh.position.z-pz)**2);if(dist<bestDist){bestDist=dist;closest=e;}});
  if(!closest){showN('💜 אין אויב קרוב לקסום!');return;}
  _charmedEnemy=closest;_charmedTimer=_CHARM_DUR;closest._charmed=true;
  closest.mesh.traverse(c=>{if(c.isMesh&&c.material){c._origColor=c.material.color.getHex();c.material=c.material.clone();c.material.color.setHex(0xff69b4);c.material.emissive=new THREE.Color(0x550033);}});
  const aura=new THREE.Mesh(new THREE.SphereGeometry(0.8,7,7),new THREE.MeshBasicMaterial({color:0xff69b4,transparent:true,opacity:0.22,depthWrite:false}));
  aura.name='_charmAura';closest.mesh.add(aura);
  spawnPfx(closest.mesh.position.x,1.5,closest.mesh.position.z,0xff69b4,12);
  showN(`💜 קסם! האויב עובד לצדנו ל-${_CHARM_DUR} שניות!`);haptic([30,15,50]);
}
function _releaseCharm(){
  if(!_charmedEnemy)return;
  const e=_charmedEnemy;e._charmed=false;
  e.mesh.traverse(c=>{if(c.isMesh&&c.material&&c._origColor!==undefined){c.material.color.setHex(c._origColor);c.material.emissive=new THREE.Color(0x000000);delete c._origColor;}});
  const aura=e.mesh.getObjectByName('_charmAura');if(aura)e.mesh.remove(aura);
  _charmedEnemy=null;_charmedTimer=0;
}
function _useSpecialSkill(){
  if(!G||!G.dog)return;
  if(G.dog==='colin'){_colinStunAttack();_stunCooldown=_STUN_CD;}
  else if(G.dog==='zippo'){_dashCooldown=0;doAtk();}
  else if(G.dog==='momo'){_momoCharm();}
}

// ════════════════════════════════════════════════
// SKILL TREE — עץ כישורים לכל כלב
// ════════════════════════════════════════════════
const SKILL_DEFS={
  colin:[
    {id:'armor',    ico:'🛡️', name:'שריון כבד',    desc:'מפחית נזק נכנס ב-3 לכל מכה',       cost:[1,2,3], maxLv:3, apply:(dog,lv)=>{dog._armor=(dog._armor||0)+3;}},
    {id:'stun_dur', ico:'⚡', name:'STUN ממושך',   desc:'מאריך זמן הstun ב-1 שנייה',         cost:[2,3],   maxLv:2, apply:(dog,lv)=>{window._STUN_BASE=(window._STUN_BASE||2.5)+1;}},
    {id:'aoe',      ico:'💥', name:'פיצוץ רחב',    desc:'רדיוס STUN גדול יותר (+1.5)',       cost:[3],     maxLv:1, apply:(dog,lv)=>{}},
  ],
  zippo:[
    {id:'dash_cd',  ico:'⚡', name:'Dash מהיר',    desc:'מפחית cooldown Dash ב-0.5 שניות',   cost:[1,2],   maxLv:2, apply:(dog,lv)=>{window._DASH_CD=Math.max(1,(_DASH_CD||2.5)-0.5);}},
    {id:'crit',     ico:'🎯', name:'קריטי משופר',  desc:'+8% סיכוי קריטי',                   cost:[2,3,3], maxLv:3, apply:(dog,lv)=>{dog._critChance=(dog._critChance||0.15)+0.08;}},
    {id:'dash_dmg', ico:'🔥', name:'Dash מסוכן',   desc:'Dash מוסיף נזק לאויבים בנתיב',     cost:[3],     maxLv:1, apply:(dog,lv)=>{dog._dashDmg=true;}},
  ],
  momo:[
    {id:'charm_dur',ico:'💜', name:'קסם ממושך',    desc:'+3 שניות לזמן הקסם',                cost:[1,2],   maxLv:2, apply:(dog,lv)=>{window._CHARM_DUR=(_CHARM_DUR||8)+3;}},
    {id:'charm_r',  ico:'🌀', name:'קסם מרחוק',    desc:'טווח קסם גדל ב-4',                  cost:[2,3],   maxLv:2, apply:(dog,lv)=>{}},
    {id:'aura',     ico:'✨', name:'הילת ריפוי',   desc:'מומו מחלימה 2HP לשנייה כשHP<50%',   cost:[3],     maxLv:1, apply:(dog,lv)=>{dog._healAura=true;}},
  ],
};

// מידע על רמות כישורים שנרכשו — נשמר לpersist
// נשמר ב-G.skillLevels = { colin:{armor:1, stun_dur:0...}, ... }

function openSkillTree(){
  if(!G||!G.dog)return;
  G.paused=true;
  const dog=G.dogs[G.dog];
  const skills=SKILL_DEFS[G.dog]||[];
  if(!G.skillLevels)G.skillLevels={};
  if(!G.skillLevels[G.dog])G.skillLevels[G.dog]={};
  if(!G.skillPoints)G.skillPoints={colin:0,zippo:0,momo:0};
  const pts=G.skillPoints[G.dog]||0;

  document.getElementById('sk-dog-name').textContent=dog.name;
  document.getElementById('sk-points').textContent=pts;

  const container=document.getElementById('sk-nodes');
  container.innerHTML=skills.map(sk=>{
    const curLv=G.skillLevels[G.dog][sk.id]||0;
    const isMax=curLv>=sk.maxLv;
    const cost=sk.cost[curLv]||99;
    const canAfford=pts>=cost&&!isMax;
    const cls=isMax?'maxed':canAfford?'unlocked':curLv>0?'unlocked':'locked';
    const lvBar=Array.from({length:sk.maxLv},(_,i)=>
      `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 1px;background:${i<curLv?'#f5c518':'rgba(255,255,255,0.15)'}"></span>`
    ).join('');
    return `<div class="sk-node ${cls}" onclick="buySkill('${sk.id}')">
      <div class="sk-ico">${sk.ico}</div>
      <div class="sk-info">
        <div class="sk-name">${sk.name}</div>
        <div class="sk-desc">${sk.desc}</div>
        <div class="sk-cost">${isMax?'✅ מקסימום':canAfford?`💠 עלות: ${cost} נקודות`:`🔒 עלות: ${cost} נקודות`}</div>
      </div>
      <div class="sk-lvl">${lvBar}</div>
    </div>`;
  }).join('');

  document.getElementById('skill-tree-ov').classList.add('open');
}

window.openSkillTree=openSkillTree;

window.buySkill=function(id){
  if(!G.skillLevels||!G.skillLevels[G.dog])return;
  if(!G.skillPoints)G.skillPoints={colin:0,zippo:0,momo:0};
  const curLv=G.skillLevels[G.dog][id]||0;
  const sk=SKILL_DEFS[G.dog]?.find(s=>s.id===id);
  if(!sk||curLv>=sk.maxLv)return;
  const cost=sk.cost[curLv]||99;
  if((G.skillPoints[G.dog]||0)<cost){showN('❌ אין מספיק נקודות כישור!');return;}
  G.skillPoints[G.dog]-=cost;
  G.skillLevels[G.dog][id]=curLv+1;
  sk.apply(G.dogs[G.dog],curLv+1);
  haptic([30,10,50]);
  showN(`✅ ${sk.name} שודרג לרמה ${curLv+1}!`);
  openSkillTree(); // רענן תצוגה
};

window.closeSkillTree=function(){
  document.getElementById('skill-tree-ov').classList.remove('open');
  G.paused=false;
};

// כישור point מתקבלת בכל level up
const _origAddXP=window.addXP;
// נוסיף skillPoints ב-addXP כשעולים רמה — patch בתוך engine
function _grantSkillPoint(dogId){
  if(!G.skillPoints)G.skillPoints={colin:0,zippo:0,momo:0};
  G.skillPoints[dogId]=(G.skillPoints[dogId]||0)+1;
  showN(`🌟 נקודת כישור חדשה! סה"כ: ${G.skillPoints[dogId]} — פתח עץ כישורים`);
}

// heal aura passive — מומו
setInterval(()=>{
  if(!G||!PB)return;
  const dog=G.dogs[G.dog];
  if(G.dog==='momo'&&dog._healAura&&dog.hp/dog.mhp<0.5&&!G.paused){
    dog.hp=Math.min(dog.mhp,dog.hp+2);
  }
},1000);

// ── מסך מוות משופר ──
let _dyingLock=false;
function playerDeath(){
  if(_dyingLock)return;
  _dyingLock=true;
  G.paused=true;
  const penalty=Math.min(G.score,Math.floor(G.score*.1));
  G.score=Math.max(0,G.score-penalty);
  // CSS אנימציות אם לא קיים
  if(!document.getElementById('death-style')){
    const s=document.createElement('style');s.id='death-style';
    s.textContent=`
      @keyframes deathFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes deathPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
      #death-ov{animation:deathFadeIn 0.6s ease-out forwards;}
      #death-btn{transition:transform 0.15s;}
      #death-btn:active{transform:scale(0.93);}
    `;document.head.appendChild(s);
  }
  // fade לאדום
  const hf=document.getElementById('hf');
  hf.style.transition='background .4s';hf.style.background='rgba(180,0,0,.85)';
  const dog=G.dogs[G.dog];
  const tips=['טיפ: לחץ Q לכישור מיוחד','טיפ: מומו מקסמת אויבים עם Q','טיפ: זיפו עושה Dash עם Q','טיפ: קולין STUN אחרי 4 מכות','טיפ: אסוף אוכל 🍖 לחידוש בריאות','טיפ: כנס לחנות לרכישת שדרוגים'];
  const tip=tips[Math.floor(Math.random()*tips.length)];
  let overlay=document.getElementById('death-ov');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='death-ov';
    overlay.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:250;pointer-events:all;background:radial-gradient(ellipse at center,rgba(80,0,0,0.97),rgba(0,0,0,0.98));';
    document.body.appendChild(overlay);
  }
  overlay.style.display='flex';
  overlay.innerHTML=`
    <div style="font-size:clamp(52px,14vw,88px);margin-bottom:10px;animation:deathPulse 0.5s ease 0.3s">💀</div>
    <div style="color:#ff3333;font-size:clamp(22px,6vw,44px);font-weight:bold;text-shadow:0 0 30px #ff0000,0 0 60px #880000;margin-bottom:8px;letter-spacing:3px;">נפלת!</div>
    <div style="color:#888;font-size:clamp(11px,3vw,15px);margin-bottom:6px;">${penalty>0?`-${penalty} ניקוד`:''}</div>
    <div style="color:#555;font-size:clamp(10px,2.5vw,13px);margin-bottom:28px;font-style:italic;">${tip}</div>
    <button id="death-btn" onclick="playerRespawn()" style="background:linear-gradient(135deg,#f5c518,#d4a017);color:#000;border:none;border-radius:14px;padding:clamp(10px,3vw,14px) clamp(28px,8vw,48px);font-size:clamp(14px,4vw,20px);font-weight:bold;cursor:pointer;box-shadow:0 0 24px rgba(245,197,24,0.55);letter-spacing:2px;">קום והמשך ▶</button>
    <div style="color:#555;font-size:clamp(10px,2.2vw,12px);margin-top:16px;">❤️ ${Math.round(dog.mhp*0.35)}/${dog.mhp} HP • ⭐ רמה ${dog.lv} • 💰 ${G.coins}</div>
  `;
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
  const _armor=dog._armor||0;
  const _actual=Math.max(1,Math.round(dmg-_armor));
  dog.hp=Math.max(0,dog.hp-_actual);
  // ── lag bar: הורד מיד ──
  _lagHPTarget=dog.hp/dog.mhp*100;
  sHit();
  if(_actual>=20)haptic([80,30,60]);
  else if(_actual>=10)haptic([50,20,40]);
  else haptic(25);
  const hf=document.getElementById('hf');
  hf.classList.add('on');setTimeout(()=>hf.classList.remove('on'),150);
  // ── כיוון הנזק ──
  _showDmgDir();
  if(dog.hp<=0)playerDeath();
}

// מציא את כיוון הנזק לפי האויב הקרוב ביותר
function _showDmgDir(){
  if(!PB)return;
  let closestEnemy=null,minDist=999;
  G.enemies.forEach(e=>{if(e.hp<=0||!e.mesh.visible)return;const d=Math.sqrt((e.mesh.position.x-PB.position.x)**2+(e.mesh.position.z-PB.position.z)**2);if(d<minDist){minDist=d;closestEnemy=e;}});
  if(!closestEnemy||minDist>20)return;
  // זווית בין הכלב לאויב ביחס לכיוון מבט
  const dx=closestEnemy.mesh.position.x-PB.position.x;
  const dz=closestEnemy.mesh.position.z-PB.position.z;
  const angle=Math.atan2(dx,dz)-G.yaw; // relative angle
  const deg=((angle*180/Math.PI)%360+360)%360;
  let dir;
  if(deg<45||deg>=315)dir='north';
  else if(deg<135)dir='east';
  else if(deg<225)dir='south';
  else dir='west';
  const el=document.getElementById('dmg-'+dir);
  if(!el)return;
  el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.style.opacity='0',350);
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
    if(d2(n.x,n.z,px,pz)>90)return; // מחוץ לטווח
    // מוניטין — תגובה כשמתקרב לראשונה
    if(!n._repReacted&&d2(n.x,n.z,px,pz)<6){n._repReacted=true;_triggerRepReaction(n);setTimeout(()=>{n._repReacted=false;},15000);}
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
    if(G.daily){G.daily.bones=(G.daily.bones||0)+1;G.daily.coins=(G.daily.coins||0)+5;_daily_check();}
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

// forceDog — החלף לכלב מסוים (מהסיפור, לא מהשחקן)
function forceDog(dog, msg){
  if(dog==='all')return; // 'all' = רק הודעה, לא מחליף
  const valid=['colin','zippo','momo'];
  if(!valid.includes(dog))return;
  if(G.dog===dog){if(msg)showN(msg);return;}
  const savedPos=PB.position.clone();
  G.dog=dog;
  document.getElementById('hdn').textContent=G.dogs[G.dog].name;
  buildPlayer();
  PB.position.copy(savedPos);
  if(msg)showN(msg);
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
      // LOD disabled
      const dd=d2(e.mesh.position.x,e.mesh.position.z,px,pz);
      const sees=canSeePlayer(e,px,pz)||dd<6;
      // מעברי state
      if(sees){
        if(e.state!=='chase'){alertNearby(e,px,pz);if(e.state==='patrol')showN('👁️ גילו אותך!');}
        e.state='chase';e.lastSeenX=px;e.lastSeenZ=pz;e.searchT=6;
      } else if(e.state==='chase'){
        e.searchT-=dt;
        if(e.searchT<=0){e.state='search';e.searchT=4;}
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
function updNPCs(dt){const t=Date.now()*.001;G.npcs.forEach((n,i)=>{if(n._dead)return;
  if(n.type==='shop'){const dx=PB.position.x-n.x,dz=PB.position.z-n.z;n.mesh.rotation.y=Math.atan2(dx,dz);}
  else if(!n.recruited){n.mesh.rotation.y=Math.sin(t+i)*.22;}
  n.ind.position.y=2.6+Math.sin(t*2.4+i)*.16;});}

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
  if(dog.lv<5&&dog.xp>=need){
    dog.lv++;dog.xp=0;
    // שיפורים ייחודיים לכל כלב
    const id=G.dog;
    if(id==='zippo'){
      // זיפו — גיבור: מהירות + קריטי עולים, HP מעט
      dog.mhp+=8;dog.hp=dog.mhp;dog.pow+=2;dog.spd+=0.8;dog._critChance=(dog._critChance||0.15)+0.05;
      showLU(dog,['+8 HP','+2 כוח','+0.8 מהירות','+5% קריטי']);
    } else if(id==='colin'){
      // קולין — לוחם: HP + כוח, מהירות מינימלית
      dog.mhp+=18;dog.hp=dog.mhp;dog.pow+=3;dog.spd+=0.2;dog._armor=(dog._armor||0)+2;
      showLU(dog,['+18 HP','+3 כוח','+2 שריון','+0.2 מהירות']);
    } else {
      // מומו — תמיכה: HP בינוני + מהירות + מחזירה אנרגיה מהר
      dog.mhp+=12;dog.hp=dog.mhp;dog.pow+=1;dog.spd+=0.5;dog._stamRegen=(dog._stamRegen||1)+0.5;
      showLU(dog,['+12 HP','+1 כוח','+0.5 מהירות','+0.5 התחדשות סטמינה']);
    }
    sLvlUp();haptic([50,30,50,30,80]);
    _grantSkillPoint(G.dog); // נקודת כישור חדשה!
  }
  if(_hudXP){
    const pct=Math.min(100,dog.xp/Math.max(1,XP_TO_LVL[Math.min(dog.lv,XP_TO_LVL.length-1)])*100);
    _hudXP.style.width=pct+'%';
  }
  document.getElementById('lvv').textContent=dog.lv;
  // שדרוג: עדכן class קריטי על HP bar בעת שינוי XP/רמה
  if(_hudHP) _hudHP.classList.toggle('critical', dog.hp/dog.mhp < 0.25);
}
function showXPPop(t){const el=document.getElementById('xpp');el.textContent=t;el.style.display='block';el.style.animation='none';void el.offsetWidth;el.style.animation='floatUp 1.2s ease-out forwards';setTimeout(()=>el.style.display='none',1200);}
function showLU(dog,bonuses){
  G.paused=true;
  document.getElementById('lu-su').textContent=`${dog.name} הגיעה לרמה ${dog.lv}!`;
  const bs=bonuses||['+10 HP','+1 כוח','+0.3 מהירות'];
  document.getElementById('lu-st').innerHTML=bs.map(b=>{
    const [v,...rest]=b.split(' ');
    return `<div class="lu-s"><div class="lu-v">${v}</div><div class="lu-l">${rest.join(' ')}</div></div>`;
  }).join('');
  document.getElementById('lu').style.display='flex';
}
function closeLU(){document.getElementById('lu').style.display='none';G.paused=false;}

// ════════════════════════════════════════════════
// CAMERA
// ════════════════════════════════════════════════
// ── cache רפרנסים לאלמנטי HUD — פעם אחת בלבד ──
let _hudHP,_hudHPLag,_hudST,_hudXP,_hudSCV,_hudIP;
let _lagHPTarget=100; // lag bar — מתעדכן לאט אחרי נזק
function cacheHUD(){
  _hudHP=document.getElementById('hpf');
  _hudHPLag=document.getElementById('hplag');
  _hudST=document.getElementById('stf');
  _hudXP=document.getElementById('xpf');
  _hudSCV=document.getElementById('scv');
  _hudIP=document.getElementById('ip');
}

function updCamera(){
  if(G._cinemaMode)return; // אנימציה סינמטית — לא נגעים במצלמה
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
  // ── LAG BAR — כתום, מתפוגג לאחר נזק ──
  if(_hudHPLag){
    if(hpPct<_lagHPTarget) _lagHPTarget=hpPct; // ירידה מיידית
    else _lagHPTarget=Math.min(100,_lagHPTarget+0.4); // עלייה איטית
    _hudHPLag.style.width=_lagHPTarget+'%';
  }
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
  if(_mmFrame%3!==0) return;
  if(typeof TA!=='undefined'&&TA.inTA){drawMMTelAviv();return;}
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
  // אזור תעשייה — x=130-205, z=-65 עד -165
  ctx.fillStyle='rgba(75,85,108,0.7)';ctx.fillRect(cx+180*sc,cy+(-215)*sc,95*sc,125*sc);
  ctx.strokeStyle='#aabbdd';ctx.lineWidth=1.2;ctx.strokeRect(cx+180*sc,cy+(-215)*sc,95*sc,125*sc);
  // שלט APEX
  ctx.fillStyle='#cc44ff';ctx.beginPath();ctx.arc(cx+205*sc,cy+(-125)*sc,4,0,Math.PI*2);ctx.fill();
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
  // נקודת יעד GPS — כוכב/X צהוב מהבהב
  if(_navTargetWorld){
    const tx2=cx+_navTargetWorld.x*sc,tz2=cy+_navTargetWorld.z*sc;
    const blink=Math.sin(Date.now()*.006)>.0;
    if(blink){
      ctx.strokeStyle='#f5c518';ctx.lineWidth=1.5;
      const r=5;
      // X
      ctx.beginPath();ctx.moveTo(tx2-r,tz2-r);ctx.lineTo(tx2+r,tz2+r);ctx.stroke();
      ctx.beginPath();ctx.moveTo(tx2+r,tz2-r);ctx.lineTo(tx2-r,tz2+r);ctx.stroke();
      // עיגול
      ctx.beginPath();ctx.arc(tx2,tz2,r+2,0,Math.PI*2);ctx.stroke();
    }
  }
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
  // רקע — שכונות צבועות
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

  // ── אזורים/שכונות ──
  const zones=[
    {x:0,z:-100,r:55,col:'rgba(100,60,20,0.18)',name:'שכונת הגשר'},
    {x:-60,z:55,r:40,col:'rgba(20,80,60,0.18)',name:'שוק לוד'},
    {x:50,z:90,r:38,col:'rgba(40,40,120,0.18)',name:'רמת אשכול'},
    {x:72,z:96,r:22,col:'rgba(60,20,100,0.18)',name:'קרית בית הכנסת'},
    {x:-50,z:-100,r:30,col:'rgba(120,30,30,0.18)',name:'שכונת כנופיית הגשר'},
  ];
  zones.forEach(z=>{
    ctx.fillStyle=z.col;
    ctx.beginPath();ctx.arc(wx(z.x),wz(z.z),z.r*sc,0,Math.PI*2);ctx.fill();
    if(mapZoomLevel>=0.7){
      ctx.fillStyle='rgba(255,255,255,0.18)';ctx.font=`${Math.round(9*mapZoomLevel)}px sans-serif`;
      ctx.textAlign='center';ctx.fillText(z.name,wx(z.x),wz(z.z));
    }
  });

  // רשת
  ctx.strokeStyle='#161d16';ctx.lineWidth=1;
  const grid=40;
  const startX=Math.floor((px-W/2/sc)/grid)*grid;
  const startZ=Math.floor((pz-H/2/sc)/grid)*grid;
  for(let i=startX;i<startX+W/sc+grid;i+=grid){ctx.beginPath();ctx.moveTo(wx(i),0);ctx.lineTo(wx(i),H);ctx.stroke();}
  for(let i=startZ;i<startZ+H/sc+grid;i+=grid){ctx.beginPath();ctx.moveTo(0,wz(i));ctx.lineTo(W,wz(i));ctx.stroke();}
  // רחובות ראשיים
  const roads=[
    {x1:-200,z1:0,x2:200,z2:0,w:4,col:'#3a5a3a',name:'רח׳ הרצל',lx:0,lz:0},
    {x1:0,z1:-200,x2:0,z2:200,w:4,col:'#3a5a3a',name:'שד׳ ירושלים',lx:0,lz:-80},
    {x1:40,z1:-200,x2:40,z2:200,w:3,col:'#2d4a2d',name:'רח׳ הדקל',lx:40,lz:30},
    {x1:-40,z1:-200,x2:-40,z2:200,w:3,col:'#2d4a2d',name:'רח׳ הגפן',lx:-40,lz:30},
    {x1:-200,z1:50,x2:200,z2:50,w:2.5,col:'#253a25',name:'רח׳ וייצמן',lx:80,lz:50},
    {x1:-200,z1:-50,x2:200,z2:-50,w:2.5,col:'#253a25',name:'רח׳ בן גוריון',lx:80,lz:-50},
    {x1:72,z1:-200,x2:72,z2:200,w:2,col:'#1e301e',name:'שד׳ בית הכנסת',lx:72,lz:60},
  ];
  roads.forEach(r=>{
    ctx.strokeStyle=r.col;ctx.lineWidth=r.w;
    ctx.beginPath();ctx.moveTo(wx(r.x1),wz(r.z1));ctx.lineTo(wx(r.x2),wz(r.z2));ctx.stroke();
    if(mapZoomLevel>=1&&r.name){
      ctx.fillStyle='rgba(180,220,180,0.7)';ctx.font=`${Math.round(8*mapZoomLevel)}px sans-serif`;
      ctx.textAlign='center';ctx.fillText(r.name,wx(r.lx),wz(r.lz)-5);
    }
  });
  // נקודות עניין
  const pois=[
    {x:40,z:0,col:'rgba(232,121,26,.85)',r:7,icon:'⚽',name:'כיכר הכדורים'},
    {x:72,z:96,col:'rgba(85,136,255,.85)',r:6,icon:'✡',name:'בית כנסת'},
    {x:-51,z:-100,col:'rgba(180,140,60,.85)',r:7,icon:'🕌',name:'מסגד הגדול'},
    {x:80,z:-80,col:'rgba(200,200,200,.85)',r:6,icon:'🏛',name:'עיריית לוד'},
    {x:-67,z:55,col:'rgba(60,200,100,.85)',r:5,icon:'🏪',name:'שוק לוד'},
    {x:35,z:35,col:'rgba(255,80,80,.75)',r:5,icon:'🐕',name:'כנופיית הגשר'},
  ];
  pois.forEach(p=>{
    ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(wx(p.x),wz(p.z),p.r*Math.max(0.7,mapZoomLevel),0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5;ctx.stroke();
    if(mapZoomLevel>=0.8){
      ctx.font=`bold ${Math.round(10*mapZoomLevel)}px sans-serif`;ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(wx(p.x)-30*mapZoomLevel,wz(p.z)-20*mapZoomLevel,60*mapZoomLevel,14*mapZoomLevel);
      ctx.fillStyle='#fff';ctx.fillText(p.name,wx(p.x),wz(p.z)-8*mapZoomLevel);
    }
  });
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
// ██ ABANDONED LAB — בניין נטוש / מעבדה ██
// מיקום: (25, -125) — שכונת הגשר (שכונה ענייה, צפון)
// ════════════════════════════════════════════════
const LAB={inLab:false,playerX:0,playerZ:8,playerYaw:Math.PI,enterGrace:0};
let labScene=null,labCamera=null,labObjects=[];

function buildLabExterior(){
  const x=25,z=-125;
  const wallM=new THREE.MeshLambertMaterial({color:0x4a3e2e,emissive:0x080603});
  const roofM=new THREE.MeshLambertMaterial({color:0x2a2218,emissive:0x040301});
  const rustM=new THREE.MeshLambertMaterial({color:0x6a3a1a,emissive:0x0d0500});

  // גוף ראשי — בניין מלבני נמוך וכבד
  const body=new THREE.Mesh(new THREE.BoxGeometry(18,6,14),wallM);
  body.position.set(x,3,z);body.castShadow=true;body.receiveShadow=true;scene.add(body);
  // קומה שנייה — חלקית, קצה שבור
  const top=new THREE.Mesh(new THREE.BoxGeometry(10,3,8),wallM);
  top.position.set(x-2,7.5,z-1);top.castShadow=true;scene.add(top);
  // גג שטוח עם קצוות שבורים
  const roof=new THREE.Mesh(new THREE.BoxGeometry(18.4,0.4,14.4),roofM);
  roof.position.set(x,6.2,z);scene.add(roof);
  const roof2=new THREE.Mesh(new THREE.BoxGeometry(10.4,0.4,8.4),roofM);
  roof2.position.set(x-2,9.2,z-1);scene.add(roof2);
  // פסי חלודה על הקירות
  [[-6,3,z+7],[ 3,2,z+7],[ 7,4,z+7]].forEach(([ox,oy,oz])=>{
    const rust=new THREE.Mesh(new THREE.BoxGeometry(0.3,oy,0.15),rustM);
    rust.position.set(x+ox,oy/2,oz);scene.add(rust);
  });
  // חלונות אטומים — לוחות עץ
  const boardM=new THREE.MeshLambertMaterial({color:0x3a2a14,emissive:0x060400});
  [[-5,3.5],[ 1,3.5],[ 5,3.5]].forEach(([ox,oy])=>{
    const win=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.4,0.2),boardM);
    win.position.set(x+ox,oy,z+7.1);scene.add(win);
    // פס אלכסוני על החלון
    const cross=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.2,0.22),boardM);
    cross.position.set(x+ox,oy,z+7.15);cross.rotation.z=0.5;scene.add(cross);
  });
  // דלת כניסה — ברזל ישן, כהה
  const doorM=new THREE.MeshLambertMaterial({color:0x1a1208,emissive:0x030200});
  const door=new THREE.Mesh(new THREE.BoxGeometry(2.2,3.5,0.3),doorM);
  door.position.set(x,1.75,z+7.15);scene.add(door);
  // פס אנטנה/צינור על הגג
  const pipeM=new THREE.MeshLambertMaterial({color:0x2a2020,emissive:0x050303});
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,4,6),pipeM);
  pipe.position.set(x+6,8,z);scene.add(pipe);
  // שלט "סכנה" מקולקל
  const signM=new THREE.MeshLambertMaterial({color:0x8a6a00,emissive:0x1a1000});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.0,0.1),signM);
  sign.position.set(x,5.2,z+7.2);sign.rotation.z=0.08;scene.add(sign);
  // זרקור כחול מעל הדלת
  const labLight=new THREE.PointLight(0x4488ff,1.5,12);
  labLight.position.set(x,5.5,z+6);scene.add(labLight);
  // marker כניסה — נצנץ כחול
  const ind=new THREE.Mesh(
    new THREE.SphereGeometry(0.35,8,8),
    new THREE.MeshBasicMaterial({color:0x4488ff})
  );
  ind.position.set(x,4.2,z+7);scene.add(ind);
  G._labDoorInd=ind;
  // שמור refs לאנימציית שריפה/קריסה
  G._labBldMeshes={body,top,roof,roof2,pipe,sign};
  G._labBldMat={wall:wallM,roof:roofM};
  G._labBuilt=true;
}

// ── flickering lights registry (populated in buildLabScene, animated in updLab) ──
let _labFlickerLights=[];
let _labFlickerT=0;

function buildLabScene(){
  labScene=new THREE.Scene();
  labScene.background=new THREE.Color(0x030508);
  labScene.fog=new THREE.FogExp2(0x030508,.032);
  labCamera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,.1,120);
  labScene.add(labCamera);
  _labFlickerLights=[];

  const _add=m=>{m.castShadow=true;m.receiveShadow=true;labScene.add(m);labObjects.push(m);return m;};
  const _addNS=m=>{labScene.add(m);labObjects.push(m);return m;};
  // helper — build box and add
  const _box=(w,h,d,col,em,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshLambertMaterial({color:col,emissive:em||0x000000}));
    m.position.set(x,y,z);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    _add(m);return m;
  };
  const _cyl=(rt,rb,h,seg,col,em,x,y,z,rx,rz)=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),
      new THREE.MeshLambertMaterial({color:col,emissive:em||0x000000}));
    m.position.set(x,y,z);
    if(rx)m.rotation.x=rx;if(rz)m.rotation.z=rz;
    _add(m);return m;
  };

  // ════════════════════════════════
  // LIGHTS — מפחיד, לא שחור
  // ════════════════════════════════
  // אמביינט — מספיק לראות אבל כהה
  labScene.add(new THREE.AmbientLight(0x0d1f18,3.5));
  // hemisphere — ירוק מעל, כחול מתחת
  labScene.add(new THREE.HemisphereLight(0x002a14,0x000d1a,1.2));

  // נאון ירוק ראשי מהתקרה
  const mainL=new THREE.PointLight(0x00ff88,4.5,40);
  mainL.position.set(0,7,0);_addNS(mainL);
  _labFlickerLights.push({light:mainL,base:4.5,type:'flicker',t:0,period:0.18});

  // אור אדום — צד שמאל (כלובים)
  const redL=new THREE.PointLight(0xff1500,5.0,22);
  redL.position.set(-10,4,-2);_addNS(redL);
  _labFlickerLights.push({light:redL,base:5.0,type:'pulse',t:0,period:1.1});

  // אור כחול-חשמלי — צד ימין (מחולל)
  const blueL=new THREE.PointLight(0x0066ff,3.5,20);
  blueL.position.set(10,4,-5);_addNS(blueL);
  _labFlickerLights.push({light:blueL,base:3.5,type:'arc',t:0,period:0.08});

  // אור ירוק-רדיואקטיבי על מיכלי השיבוט
  [[-4,3,-11],[4,3,-11]].forEach(([x,y,z])=>{
    const gl=new THREE.PointLight(0x00ff44,3.5,10);
    gl.position.set(x,y,z);_addNS(gl);
    _labFlickerLights.push({light:gl,base:3.5,type:'bubble',t:Math.random()*6,period:0.6+Math.random()*0.5});
  });

  // אור לבן-קר מהתקרה (מנורה שבורה)
  const coldL=new THREE.PointLight(0xccffee,2.0,15);
  coldL.position.set(-5,7,-7);_addNS(coldL);
  _labFlickerLights.push({light:coldL,base:2.0,type:'flicker',t:2,period:0.13});

  // אור כתום על שולחן הנגן
  const recL=new THREE.PointLight(0xff6600,2.5,8);
  recL.position.set(1.5,4,-10);_addNS(recL);

  // ════════════════════════════════
  // FLOOR — רצפת מתכת עם רשת
  // ════════════════════════════════
  _box(30,0.12,30,0x0a0d0b,0x000000,0,0,0);
  // רשת מתכת — פסי גריל
  for(let i=-14;i<=14;i+=2){
    _box(30,0.04,0.08,0x111814,0x020402,0,0.07,i);
    _box(0.08,0.04,30,0x111814,0x020402,i,0.07,0);
  }
  // כתמי שמן/נוזל
  [[0,-2,0x1a0800],[-5,4,0x001a08],[6,-8,0x0a0012],[-8,1,0x1a0000]].forEach(([rx,rz,col])=>{
    const stain=new THREE.Mesh(new THREE.PlaneGeometry(1.2+Math.random()*1.5,0.9+Math.random()),
      new THREE.MeshLambertMaterial({color:col,transparent:true,opacity:0.75}));
    stain.rotation.x=-Math.PI/2;stain.position.set(rx,0.02,rz);_addNS(stain);
  });
  // כתמי דם על הרצפה
  [[-9,-3],[-11,2],[-12,-6]].forEach(([bx,bz])=>{
    const blood=new THREE.Mesh(new THREE.PlaneGeometry(0.6+Math.random()*0.8,0.5+Math.random()*0.6),
      new THREE.MeshLambertMaterial({color:0x3a0000,transparent:true,opacity:0.9}));
    blood.rotation.x=-Math.PI/2;blood.position.set(bx,0.02,bz);_addNS(blood);
  });

  // ════════════════════════════════
  // WALLS — לוחות מתכת, ריוטים, צינורות
  // ════════════════════════════════
  const wallCol=0x0e1512,wallEm=0x010201;
  // 4 קירות
  _box(30,9,0.35,wallCol,wallEm,0,4.5,-14.85);  // צפון
  _box(30,9,0.35,wallCol,wallEm,0,4.5,14.85);   // דרום
  _box(0.35,9,30,wallCol,wallEm,-14.85,4.5,0);  // מערב
  _box(0.35,9,30,wallCol,wallEm,14.85,4.5,0);   // מזרח

  // לוחות מתכת — פאנלים על הקיר הצפוני
  for(let pi=0;pi<6;pi++){
    _box(4.5,7,0.12,0x121a14,0x020303,-11+pi*4.8,4,-14.7);
    // ריוטים על הלוחות
    [[-2,-3],[-2,3],[2,-3],[2,3]].forEach(([ox,oy])=>{
      _cyl(0.07,0.07,0.1,6,0x1a2018,0x030302,-11+pi*4.8+ox,4+oy,-14.65);
    });
  }
  // פסי אזהרה צהוב-שחור על הקיר הצפוני
  for(let s=0;s<7;s++){
    _box(1.0,0.3,0.08,s%2===0?0x1a1400:0x0a0a06,s%2===0?0x1a1000:0x000000,-12+s*4,0.5,-14.7);
  }
  // פאנלים על קיר מזרח (דלת יציאה)
  _box(0.1,7,10,0x121810,0x010201,14.7,4.5,2);
  _box(0.1,7,10,0x0e1410,0x010201,14.7,4.5,-8);

  // ════════════════════════════════
  // CEILING — תקרת בטון, קורות, חוטים
  // ════════════════════════════════
  _box(30.4,0.3,30.4,0x0a0e0c,0x010101,0,9,0);
  // קורות תקרה
  for(let b=0;b<4;b++){
    _box(30,0.35,0.5,0x0d1210,0x010201,0,8.8,-9+b*6);  // E-W
    _box(0.5,0.35,30,0x0d1210,0x010201,-9+b*6,8.8,0);  // N-S
  }
  // נורות פלואורסנט על התקרה — כמה שבורות
  [[-7,8.6,-5],[1,8.6,-5],[9,8.6,-5],[-7,8.6,5],[5,8.6,5]].forEach(([x,y,z],i)=>{
    _box(3.2,0.1,0.22,0x111a14,0x010201,x,y,z);
    const tubeM=new THREE.MeshLambertMaterial({color:0xaaffcc,emissive:i===2?0x002200:0x44cc88});
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,3.0,8),tubeM);
    tube.rotation.z=Math.PI/2;tube.position.set(x,y-0.12,z);_addNS(tube);
    if(i!==2){
      const fl=new THREE.PointLight(0x44ffaa,1.8,10);fl.position.set(x,y-0.5,z);_addNS(fl);
      _labFlickerLights.push({light:fl,base:1.8,type:'fluorescent',t:i*1.3,period:0.07+i*0.03});
    }
  });
  // שרשראות תלויות מהתקרה
  [[-3,0],[-1,-9],[7,-6]].forEach(([cx,cz])=>{
    for(let link=0;link<6;link++){
      _box(0.12,0.28,0.08,0x1a1810,0x020201,cx,8.4-link*0.5,cz,0,link%2===0?0:Math.PI/2);
    }
    // ווי ברזל בסוף
    _box(0.25,0.08,0.08,0x222018,0x030201,cx,8.4-6*0.5,cz);
  });

  // ════════════════════════════════
  // TESLA COILS — שני טסלה קויל ראשיים
  // ════════════════════════════════
  const _buildTeslaCoil=(x,z,scale=1)=>{
    const h=scale;
    // בסיס מתכת
    _box(1.2*h,0.25,1.2*h,0x1a2020,0x020304,x,0.12,z);
    _box(0.9*h,0.2,0.9*h,0x222828,0x030404,x,0.32,z);
    // גוף ראשי — גליל
    _cyl(0.22*h,0.28*h,2.5*h,12,0x1e2820,0x020403,x,1.5*h,z);
    // גוף עליון
    _cyl(0.2*h,0.22*h,1.0*h,12,0x242e26,0x030404,x,2.75*h+0.5*h,z);
    // כיפה — טורוס
    const torusM=new THREE.MeshLambertMaterial({color:0x2a3828,emissive:0x042008});
    const torus=new THREE.Mesh(new THREE.TorusGeometry(0.55*h,0.18*h,8,20),torusM);
    torus.position.set(x,3.5*h,z);_add(torus);
    // כדור על הקצה — דולק
    const ballM=new THREE.MeshLambertMaterial({color:0x80ffee,emissive:0x40ffcc});
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.32*h,12,10),ballM);
    ball.position.set(x,4.1*h,z);_addNS(ball);
    // אור מהכדור
    const tcL=new THREE.PointLight(0x00ffee,4.5*h,14*h);
    tcL.position.set(x,4.2*h,z);_addNS(tcL);
    _labFlickerLights.push({light:tcL,base:4.5*h,type:'arc',t:Math.random()*3,period:0.06+Math.random()*0.04});
    // חישוקי סליל על הגוף
    for(let r=0;r<8;r++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.28*h,0.03*h,6,14),
        new THREE.MeshLambertMaterial({color:0x334030,emissive:0x041008}));
      ring.position.set(x,0.5*h+r*0.32*h,z);_addNS(ring);
    }
    // כבלים לאדמה
    [[-0.7,0],[0.7,0],[0,-0.7],[0,0.7]].forEach(([ox,oz])=>{
      _cyl(0.04,0.04,0.4,6,0x0a0e0c,0x010101,x+ox,0.2,z+oz,0.3);
    });
    return {light:tcL};
  };
  _buildTeslaCoil(-8,-10,1.1);  // שמאל-אחורי
  _buildTeslaCoil(7,-8,0.95);   // ימין-אחורי

  // ════════════════════════════════
  // CLONE TANKS — מיכלי שיבוט
  // ════════════════════════════════
  const tankGlassM=new THREE.MeshLambertMaterial({color:0x003318,transparent:true,opacity:0.35,emissive:0x001a08});
  const tankFluidM=new THREE.MeshLambertMaterial({color:0x004a20,transparent:true,opacity:0.55,emissive:0x003314});
  const tankFrameM=new THREE.MeshLambertMaterial({color:0x1c2420,emissive:0x020302});
  [[-4.5,-11],[0.5,-11],[5.5,-11]].forEach(([tx,tz],i)=>{
    // בסיס
    _box(1.5,0.25,1.5,0x1a1e1c,0x020201,tx,0.12,tz);
    // גוף זכוכית
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.65,4.0,16),tankGlassM);
    tank.position.set(tx,2.25,tz);_addNS(tank);
    labObjects.push(tank);
    // נוזל פנימי
    const fluid=new THREE.Mesh(new THREE.CylinderGeometry(0.58,0.60,3.6,16),tankFluidM);
    fluid.position.set(tx,2.05,tz);_addNS(fluid);
    labObjects.push(fluid);
    // מכסה עליון + תחתון
    _cyl(0.68,0.68,0.2,16,0x1c2420,0x020302,tx,4.35,tz);
    _cyl(0.68,0.68,0.2,16,0x1c2420,0x020302,tx,0.25,tz);
    // בועות — גלגלים קטנים
    for(let b=0;b<5;b++){
      const bubble=new THREE.Mesh(new THREE.SphereGeometry(0.05+Math.random()*0.06,6,5),
        new THREE.MeshLambertMaterial({color:0x80ffaa,transparent:true,opacity:0.6,emissive:0x004420}));
      bubble.position.set(tx+(Math.random()-0.5)*0.8,0.4+b*0.7,tz+(Math.random()-0.5)*0.8);
      _addNS(bubble);labObjects.push(bubble);
    }
    // מספר דגימה
    _box(0.6,0.35,0.06,0x001a08,0x004420,tx,1.0,tz+0.67);
    // צינורות חיבור לקיר
    _cyl(0.06,0.06,1.6+i*0.4,6,0x161e18,0x010201,tx-0.3,3.5,tz+(i===1?0.6:0.55),0,0.4);
    // אינדיקטור LED
    const ledM=new THREE.MeshLambertMaterial({color:i===1?0xff2200:0x00ff44,emissive:i===1?0xcc0000:0x00cc22});
    _addNS(new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),ledM)).position.set(tx+0.7,0.9,tz+0.1);
  });
  // ״תמונה״ של רקס בתוך מיכל — סיבוב איטי
  const reksInTankM=new THREE.MeshLambertMaterial({color:0x554420,emissive:0x221a08,transparent:true,opacity:0.8});
  const reksInTank=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,8),reksInTankM);
  reksInTank.scale.set(0.8,1.1,0.7);
  reksInTank.position.set(0.5,2.2,-11);
  _addNS(reksInTank);labObjects.push(reksInTank);
  G._labReksInTank=reksInTank; // לאנימציה ב-updLab

  // ════════════════════════════════
  // OPERATING TABLE — שולחן ניתוחים
  // ════════════════════════════════
  const opTableM=new THREE.MeshLambertMaterial({color:0x202e28,emissive:0x020402});
  const steelM=new THREE.MeshLambertMaterial({color:0x2a3830,emissive:0x030503});
  // שולחן
  _box(3.2,0.12,1.4,0x2c3a30,0x030403,5,0.96,3);
  // רגליים
  [[5-1.4,3-0.6],[5+1.4,3-0.6],[5-1.4,3+0.6],[5+1.4,3+0.6]].forEach(([lx,lz])=>{
    _box(0.1,0.96,0.1,0x1c2820,0x020302,lx,0.48,lz);
  });
  // ראש השולחן — כרית מקולקלת
  _box(2.6,0.1,1.0,0x1a0a08,0x080200,5,1.08,3);
  // רצועות עצירה
  [[5-0.8,0.14,3],[5+0.8,0.14,3]].forEach(([bx,by,bz])=>{
    _box(0.12,0.14,1.6,0x2a1800,0x0c0600,bx,by+1.04,bz);
  });
  _box(3.4,0.12,0.1,0x2a1800,0x0c0600,5,1.15,3-0.3);
  _box(3.4,0.12,0.1,0x2a1800,0x0c0600,5,1.15,3+0.3);
  // מנורת ניתוח — מעל השולחן
  _box(0.08,3.0,0.08,0x1a2018,0x020301,5,7.5,3);
  const lampArmM=new THREE.MeshLambertMaterial({color:0x222e22,emissive:0x030402});
  const lampArm=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.1,0.1),lampArmM);
  lampArm.position.set(5,6.2,3);_add(lampArm);
  const lampHead=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.55,0.25,10),steelM);
  lampHead.position.set(5,5.9,3);_add(lampHead);
  const lampBulb=new THREE.PointLight(0xffffff,3.0,6);
  lampBulb.position.set(5,5.6,3);_addNS(lampBulb);
  _labFlickerLights.push({light:lampBulb,base:3.0,type:'flicker',t:5,period:0.22});

  // ════════════════════════════════
  // MAIN MONITOR WALL — קיר מסכים
  // ════════════════════════════════
  const monitorFrameM=new THREE.MeshLambertMaterial({color:0x0f1810,emissive:0x010201});
  const monGreenM=new THREE.MeshLambertMaterial({color:0x002200,emissive:0x00aa44});   // רקס — ירוק
  const monRedM=new THREE.MeshLambertMaterial({color:0x1a0000,emissive:0x880000});     // שגיאה — אדום
  const monOffM=new THREE.MeshLambertMaterial({color:0x050505,emissive:0x000000});     // כבוי
  const monBlueM=new THREE.MeshLambertMaterial({color:0x001220,emissive:0x0033aa});    // data — כחול
  // 8 מסכים בגודל שונה
  const monData=[
    [-11,6,-14.6,1.6,1.1,monGreenM],  // רקס 1
    [-8.0,6,-14.6,1.6,1.1,monGreenM], // רקס 2
    [-5.0,6,-14.6,1.6,1.1,monGreenM], // רקס 3
    [-2.0,6,-14.6,1.6,1.1,monRedM],   // שגיאה
    [1.0,6,-14.6,1.6,1.1,monBlueM],   // data
    [4.0,6,-14.6,1.6,1.1,monBlueM],   // data
    [7.0,5.2,-14.6,2.2,3.0,monGreenM],// מסך גדול — ראשי
    [-9.5,2.8,-14.6,2.0,1.6,monOffM], // כבוי
  ];
  monData.forEach(([mx,my,mz,mw,mh,mat])=>{
    _box(mw+0.2,mh+0.2,0.12,0x0a100c,0x010101,mx,my,mz);     // מסגרת
    const sc=new THREE.Mesh(new THREE.BoxGeometry(mw,mh,0.1),mat);
    sc.position.set(mx,my,mz+0.06);_add(sc);
    if(mat!==monOffM){
      const sl=new THREE.PointLight(mat===monGreenM?0x00ff44:mat===monRedM?0xff2200:0x0055ff,0.6,4);
      sl.position.set(mx,my,mz+0.5);_addNS(sl);
    }
  });
  // שרטוט-קיר ענק — מפת DNA/תהליך שיבוט
  _box(5.5,3.5,0.08,0x000e06,0x002a10,-2,2.5,-14.62);

  // ════════════════════════════════
  // CONTROL PANEL — פאנל בקרה גדול
  // ════════════════════════════════
  // בסיס הפאנל
  _box(8.0,0.2,1.5,0x181e18,0x020201,-4,0.9,11);
  _box(8.0,2.5,0.12,0x141c14,0x020201,-4,2.15,11.74); // לוח אחורי
  // מכשירים על הפאנל
  for(let i=0;i<10;i++){
    const knobM=new THREE.MeshLambertMaterial({color:0x1a2018,emissive:0x020201});
    _cyl(0.1,0.1,0.14,8,0x202820,0x030302,-8.2+i*1.6,1.2,11.1,Math.PI/2);
    // LED קטן
    const ledCol=i%3===0?0xff2200:i%3===1?0x00ff44:0x0088ff;
    _addNS(new THREE.Mesh(new THREE.SphereGeometry(0.055,6,6),
      new THREE.MeshLambertMaterial({color:ledCol,emissive:ledCol}))).position.set(-8.2+i*1.6,1.35,11.12);
  }
  // שני מסכי CRT על הפאנל
  [[-6.5,2.2,11.7],[-2.5,2.2,11.7]].forEach(([cx,cy,cz])=>{
    _box(1.2,0.9,0.6,0x0e1610,0x010201,cx,cy,cz);    // גוף CRT
    const crtM=new THREE.MeshLambertMaterial({color:0x001a06,emissive:0x009933});
    _box(0.88,0.66,0.08,0x001a06,0x009933,cx,cy,cz+0.3);  // מסך
    const crtL=new THREE.PointLight(0x00ff44,0.8,3);crtL.position.set(cx,cy,cz+0.8);_addNS(crtL);
    _labFlickerLights.push({light:crtL,base:0.8,type:'crt',t:Math.random()*4,period:0.9+Math.random()*0.4});
  });
  // מד לחץ — gauge
  _cyl(0.28,0.28,0.08,16,0x1a2018,0x020201,-1.5,1.55,11.72);
  _cyl(0.22,0.22,0.05,16,0x0d1208,0x010101,-1.5,1.6,11.72);
  // ידיות מנוף
  [[-3.5,1.45,11.15],[-4.8,1.45,11.15]].forEach(([lx,ly,lz])=>{
    _box(0.1,0.4,0.1,0x222820,0x030302,lx,ly,lz);
    _box(0.22,0.08,0.22,0x1a2018,0x020201,lx,ly+0.24,lz);
  });

  // ════════════════════════════════
  // CAGES — כלובים (קיר שמאל)
  // ════════════════════════════════
  const cageBarM=new THREE.MeshLambertMaterial({color:0x1c2c1c,emissive:0x020402});
  const cageLockM=new THREE.MeshLambertMaterial({color:0x3a1010,emissive:0x120202});
  [[-11,-5],[-11,-3],[-11,-1],[-11,1]].forEach(([cx,cz],i)=>{
    // רצפת כלוב
    _box(2.4,0.1,2.4,0x141c14,0x010201,cx,0.05,cz);
    // 4 קיר כלוב (עמודים)
    for(let side=0;side<4;side++){
      const isZ=side<2;
      const off=side%2===0?-1.2:1.2;
      for(let b=0;b<6;b++){
        const barX=isZ?cx+(-2.4+b*0.88):cx+off;
        const barZ=isZ?cz+off:cz+(-2.4+b*0.88);
        if(isZ)_box(0.07,2.4,0.07,0x1c2c1c,0x020402,barX,1.2,cz+off);
        else _box(0.07,2.4,0.07,0x1c2c1c,0x020402,cx+off,1.2,barZ);
      }
    }
    // גג הכלוב
    _box(2.4,0.08,2.4,0x141c14,0x010201,cx,2.44,cz);
    // אור אדום/ירוק מעל הכלוב
    const clCol=i<2?0xff1100:0x001a00;
    const clL=new THREE.PointLight(i<2?0xff2200:0x002200,i<2?2.0:0.5,5);
    clL.position.set(cx,3.5,cz);_addNS(clL);
    if(i<2)_labFlickerLights.push({light:clL,base:2.0,type:'pulse',t:i*0.7,period:0.8});
    // מנעול
    _box(0.22,0.28,0.1,0x3a1010,0x120202,cx+1.22,1.1,cz-1.18);
    // כתמי שריטות על הרצפה
    _box(0.08,0.02,1.2,0x2a0a0a,0x0a0000,cx-0.4,0.08,cz);
    _box(0.08,0.02,0.8,0x2a0a0a,0x0a0000,cx+0.3,0.08,cz-0.2);
  });

  // ════════════════════════════════
  // PIPES — צינורות (Metal Gear style)
  // ════════════════════════════════
  const pipeM=new THREE.MeshLambertMaterial({color:0x1a2418,emissive:0x020301});
  const pipeRustM=new THREE.MeshLambertMaterial({color:0x3a1808,emissive:0x0c0400});
  const pipeGlowM=new THREE.MeshLambertMaterial({color:0x002a18,emissive:0x001a0c});
  // צינורות אופקיים על קיר צפוני
  [[-14,6,-10,28],[-14,5,-6,20],[-14,7.5,2,22]].forEach(([px,py,pz,len],i)=>{
    const pm=i===1?pipeRustM:i===2?pipeGlowM:pipeM;
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,len,10),pm);
    p.rotation.z=Math.PI/2;p.position.set(px+len/2,py,pz);_add(p);
    // חיבורים
    [0,len].forEach(ox=>{
      _cyl(0.28,0.28,0.3,10,0x1a2018,0x020201,px+ox,py,pz,0,Math.PI/2);
    });
    if(i===2){
      const pipeL=new THREE.PointLight(0x00ff88,0.7,6);pipeL.position.set(px+len/2,py+0.5,pz);_addNS(pipeL);
    }
  });
  // צינורות אנכיים
  [[-13,4,8],[12,4,-11],[-5,4,13],[10,4,10]].forEach(([px,py,pz])=>{
    _cyl(0.18,0.18,8,10,0x161e14,0x020201,px,py,pz);
    _cyl(0.26,0.26,0.25,10,0x1a2018,0x020301,px,5.5,pz);  // חיבור
  });
  // צינור ראשי אדום — קיר מערב
  const bigPipe=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,28,12),pipeRustM);
  bigPipe.rotation.z=Math.PI/2;bigPipe.position.set(0,5.5,-14.2);_add(bigPipe);
  const warningStripe=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.5,12),
    new THREE.MeshLambertMaterial({color:0x1a1200,emissive:0x0a0800}));
  [-8,-4,0,4,8].forEach(ox=>{warningStripe.clone().position.set(ox,5.5,-14.2);_add(warningStripe.clone());});

  // ════════════════════════════════
  // GENERATOR — מחולל חשמל (פינה ימין)
  // ════════════════════════════════
  _box(3.0,2.2,2.0,0x161e14,0x020201,11,1.1,4);   // גוף
  _box(3.0,0.15,2.0,0x202820,0x020301,11,2.3,4);  // גג
  _cyl(0.7,0.7,1.6,16,0x0e1610,0x010201,11,1.8,4,Math.PI/2);  // גליל מנוע
  _cyl(0.75,0.75,0.2,16,0x1a2018,0x020201,11,1.8,3.2,Math.PI/2);
  _cyl(0.75,0.75,0.2,16,0x1a2018,0x020201,11,1.8,4.8,Math.PI/2);
  // נורית ירוקה על המחולל
  _addNS(new THREE.Mesh(new THREE.SphereGeometry(0.1,6,6),
    new THREE.MeshLambertMaterial({color:0x00ff44,emissive:0x00cc22}))).position.set(12.3,2.4,4);
  const genL=new THREE.PointLight(0x00ff44,1.5,5);genL.position.set(12,2.5,4);_addNS(genL);
  _labFlickerLights.push({light:genL,base:1.5,type:'bubble',t:0,period:0.3});
  // צינור פליטה
  _cyl(0.2,0.2,2.5,8,0x1a1810,0x020201,12.5,4.5,3);

  // ════════════════════════════════
  // JAKOB'S LADDER — מעלה ניצוץ חשמלי
  // ════════════════════════════════
  const _buildJakob=(x,z)=>{
    // שני עמודים
    _box(0.1,4.5,0.1,0x222820,0x030402,x-0.3,2.25,z);
    _box(0.1,4.5,0.1,0x222820,0x030402,x+0.3,2.25,z);
    // בסיס
    _box(0.8,0.15,0.4,0x1a2018,0x020201,x,0.07,z);
    // מוט V-שייפד
    for(let h=0;h<4;h++){
      const spread=0.3+h*0.18;
      _box(spread*2+0.1,0.04,0.04,0x00eecc,0x009977,x,0.5+h*0.9,z);
    }
    // אור קשת
    const arcL=new THREE.PointLight(0x00ffee,2.5,5);arcL.position.set(x,3.5,z);_addNS(arcL);
    _labFlickerLights.push({light:arcL,base:2.5,type:'arc',t:Math.random()*2,period:0.04+Math.random()*0.04});
  };
  _buildJakob(-11,-12);
  _buildJakob(12,6);

  // ════════════════════════════════
  // WARNING SIGNS — שלטי אזהרה
  // ════════════════════════════════
  // BIOHAZARD
  _box(1.4,1.4,0.06,0x1a0e00,0x0a0600,-5,3.5,-14.65);
  _box(1.0,1.0,0.04,0x1a1000,0x0a0800,-5,3.5,-14.62);
  // DANGER
  _box(2.4,0.7,0.06,0x1a0000,0x0e0000,5,6.5,-14.65);
  _box(2.0,0.45,0.04,0x1a0600,0x0e0300,5,6.5,-14.62);
  // שלט מידע — מספרי ניסוי
  _box(1.8,0.9,0.06,0x001008,0x000e04,-12,4.5,-14.65);
  _box(1.4,0.65,0.04,0x001410,0x001208,-12,4.5,-14.62);
  // פסי אזהרה על הרצפה ליד הכלובים
  for(let s=0;s<5;s++){
    _box(0.4,0.02,2.4,s%2===0?0x1a1200:0x0e0000,s%2===0?0x0a0800:0x060000,-13.2,0.03,-5+s*2);
  }

  // ════════════════════════════════
  // CAGE ROOM DOORWAY — כניסה לחדר הכלובים
  // ════════════════════════════════
  // עמודי מסגרת — שני צידי הפתח
  _box(0.28,4.8,0.28,0x2a1a1a,0x0a0303,-9,2.4,-3.2);   // עמוד צפוני
  _box(0.28,4.8,0.28,0x2a1a1a,0x0a0303,-9,2.4, 1.2);   // עמוד דרומי
  // משקוף עליון
  _box(0.3,0.28,4.72,0x2a1a1a,0x0a0303,-9,4.85,-1.0);
  // קיר מעל הפתח
  _box(0.22,1.1,4.6,0x0e1210,0x010101,-9,5.6,-1.0);
  // שלט "⚠ כלובים" — אדום
  const cageDoorSign=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,2.6),
    new THREE.MeshLambertMaterial({color:0x4a0000,emissive:0x220000}));
  cageDoorSign.position.set(-9,5.55,-1.0);_addNS(cageDoorSign);
  // תאורה אדומה מהבהבת מעל הפתח
  const cageDoorL=new THREE.PointLight(0xff1100,4.0,12);
  cageDoorL.position.set(-9,5.2,-1.0);_addNS(cageDoorL);
  _labFlickerLights.push({light:cageDoorL,base:4.0,type:'pulse',t:0,period:0.65});
  // נורית אדומה גלויה
  const cageDoorBulb=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8),
    new THREE.MeshBasicMaterial({color:0xff2200}));
  cageDoorBulb.position.set(-9,4.55,-1.0);_addNS(cageDoorBulb);
  // פסי אזהרה צהוב-שחור על הרצפה בפתח
  for(let s=0;s<6;s++){
    _box(1.6,0.025,0.4,s%2===0?0x2a1a00:0x0e0e0e,s%2===0?0x140c00:0x000000,-9.8,0.02,-3.0+s*0.72);
  }

  // ════════════════════════════════
  // MAIN TABLE — שולחן ראשי (ד"ר כץ)
  // ════════════════════════════════
  const tableM=new THREE.MeshLambertMaterial({color:0x1a2a1c,emissive:0x020302});
  const metalM=new THREE.MeshLambertMaterial({color:0x252e24,emissive:0x030402});
  const glassM=new THREE.MeshLambertMaterial({color:0x003318,transparent:true,opacity:0.55,emissive:0x001a08});
  const mainT=new THREE.Mesh(new THREE.BoxGeometry(5.5,0.14,2.2),tableM);
  mainT.position.set(0,0.97,-10.5);_add(mainT);
  [[0-2.5,-10.5+1.0],[0-2.5,-10.5-1.0],[0+2.5,-10.5+1.0],[0+2.5,-10.5-1.0]].forEach(([lx,lz])=>{
    _box(0.1,0.97,0.1,0x1c2418,0x020301,lx,0.485,lz);
  });
  // כלי מעבדה
  [[-2,1.1,-10.5],[-0.5,1.1,-10.5],[1.2,1.1,-10.5],[2.2,1.1,-11.0]].forEach(([ix,iy,iz],i)=>{
    const items=[
      new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.08,0.45,8),glassM),
      new THREE.Mesh(new THREE.BoxGeometry(0.7,0.45,0.5),metalM),
      new THREE.Mesh(new THREE.BoxGeometry(0.28,0.45,0.28),new THREE.MeshLambertMaterial({color:0x6a0000,emissive:0x280000})),
      new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.1,0.3,8),new THREE.MeshLambertMaterial({color:0x003318,transparent:true,opacity:0.7,emissive:0x001a08})),
    ];
    const obj=items[i]||items[0];
    obj.position.set(ix,iy,iz);_add(obj);
  });
  // מסך מחשב ישן על השולחן
  _box(0.85,0.65,0.65,0x0e1410,0x010201,-1.2,1.45,-10.6);  // גוף CRT
  _box(0.72,0.52,0.08,0x001a06,0x008830,-1.2,1.48,-10.26);  // מסך
  _addNS(new THREE.PointLight(0x00bb44,0.7,3)).position.set(-1.2,1.7,-9.8);

  // ════════════════════════════════
  // RECORDER — נגן הקלטות (mission 29)
  // ════════════════════════════════
  const recorder=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.22,0.45),
    new THREE.MeshLambertMaterial({color:0x0a1408,emissive:0x000e04}));
  recorder.position.set(1.5,1.12,-10.5);_add(recorder);
  // כפתורים
  [[0.14,0],[0,0],[-0.14,0]].forEach(([ox,oz])=>{
    _cyl(0.045,0.045,0.06,8,0x1a2818,0x020301,1.5+ox,1.25,-10.5+oz,Math.PI/2);
  });
  const recBtn=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.07,8),
    new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xaa0000}));
  recBtn.position.set(1.5,1.27,-10.5);_add(recBtn);
  // רצועת קלטת
  _box(0.55,0.08,0.32,0x0d1508,0x010201,1.5,1.24,-10.48);
  G._labRecorder=recorder;

  // ════════════════════════════════
  // EXIT DOOR — דלת יציאה (ימין)
  // ════════════════════════════════
  _box(2.2,3.5,0.3,0x0c1410,0x010201,14.75,1.75,8);
  // מסגרת
  _box(2.6,0.18,0.32,0x1a2018,0x020201,14.75,3.6,8);
  _box(0.18,3.5,0.32,0x1a2018,0x020201,14.75-1.1,1.75,8);
  _box(0.18,3.5,0.32,0x1a2018,0x020201,14.75+1.1,1.75,8);
  // שלט יציאה
  _box(1.5,0.45,0.1,0x001a08,0x008830,14.8,3.9,8);
  const exitLight=new THREE.PointLight(0x00ff44,2.8,8);
  exitLight.position.set(14,3.5,8);_addNS(exitLight);
  _labFlickerLights.push({light:exitLight,base:2.8,type:'flicker',t:10,period:0.25});

  // ════════════════════════════════
  // INDICATOR — מצביע לנגן (mission 29)
  // ════════════════════════════════
  const recInd=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,6),
    new THREE.MeshBasicMaterial({color:0xff4400}));
  recInd.position.set(1.5,1.75,-10.5);_addNS(recInd);
  G._labRecInd=recInd;
}

// ── spawn הצל בתוך labScene (mission 30) ──
function _spawnShadowInLab(){
  if(G._shadowEnemy||!labScene)return;
  const grp=mkCommander(1.05);
  grp.traverse(c=>{
    if(c.isMesh&&c.material){
      const m=c.material.clone();
      m.color.multiplyScalar(0.45);
      m.emissive=new THREE.Color(0x220033);
      c.material=m;
    }
  });
  const aura=new THREE.Mesh(
    new THREE.SphereGeometry(.65,8,8),
    new THREE.MeshBasicMaterial({color:0x7700cc,transparent:true,opacity:.22,depthWrite:false})
  );
  grp.add(aura);
  grp.position.set(0,0,13);
  labScene.add(grp);
  G._shadowEnemy={
    mesh:grp,x:0,z:13,
    hp:320,mhp:320,pow:14,spd:4.5,
    dead:false,_atkT:0,_hitT:0,isShadow:true,name:'הצל',
    _inLab:true,
  };
  G.bosses.push(G._shadowEnemy);
  showN('⚔️ הצל — HP: 320\nהוא חיכה פה. היזהרו.');
}

function enterLab(){
  _lodStaticObjs=null;_lodShadowObjs=null;
  G.paused=true;
  fadeOut(()=>{
    if(!labScene)buildLabScene();
    LAB.inLab=true;
    LAB.playerX=0;LAB.playerZ=8;LAB.playerYaw=Math.PI;
    G.yaw=Math.PI;LAB.enterGrace=3.0;
    if(labCamera){
      labCamera.position.set(0,4,12);
      labCamera.lookAt(0,1,0);
    }
    scene.remove(PB);
    labScene.add(PB);
    PB.position.set(LAB.playerX,0,LAB.playerZ);
    
    if(G.mission===30&&!G._shadowBossDead){
      showN('⚠️ משהו מסתובב כאן...');
      setTimeout(_spawnShadowInLab,800);
    } else {
      showN('😨 ריח חריף. אור ירוק. מישהו עבד פה זמן רב.');
    }
    G.paused=false;
    fadeIn();
  });
}

function exitLab(){
  G.paused=true;
  fadeOut(()=>{
    LAB.inLab=false;
    if(labScene)labScene.remove(PB);
    scene.add(PB);
    PB.position.set(25,0,-118);
    
    // dispose
    labObjects.forEach(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
    labObjects.length=0;
    labScene=null;labCamera=null;
    G._labRecorder=null;G._labRecInd=null;
    // נקה הצל מה-labScene אם מת/יצא
    if(G._shadowEnemy&&G._shadowEnemy._inLab){
      G._shadowEnemy._inLab=false;
    }
    G.paused=false;
    fadeIn();
  });
}

// updLab — loop בתוך המעבדה
function updLab(dt){
  if(!LAB.inLab||G.paused||G.dlgOpen)return;
  LAB.enterGrace=Math.max(0,(LAB.enterGrace||0)-dt);
  // atkCD — יורד כאן כי updPlayer לא רץ במעבדה
  if(G.atkCD>0)G.atkCD-=dt;
  const _labAtkCD=G.dog==='zippo'?0.28:0.5;
  if(G.keys['KeyF']&&G.atkCD<=0){G._labAtk=true;G.atkCD=_labAtkCD;sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);}

  // ── אנימציית תאורה: flicker / arc / pulse ──
  _labFlickerT+=dt;
  if(_labFlickerLights&&_labFlickerLights.length){
    _labFlickerLights.forEach(fl=>{
      fl.t+=dt;
      const L=fl.light;
      if(!L)return;
      switch(fl.type){
        case'flicker':{
          // מהבהב אקראי — כמו נורה שעומדת לפוח
          if(fl.t>fl.period){
            fl.t=0;fl.period=0.08+Math.random()*0.25;
            L.intensity=Math.random()<0.12?0:fl.base*(0.6+Math.random()*0.7);
          }
          break;}
        case'arc':{
          // ניצוץ חשמלי — כמו טסלה קויל
          const arcNoise=Math.sin(fl.t*80)*0.3+Math.sin(fl.t*137)*0.2+Math.random()*0.5;
          L.intensity=Math.max(0,fl.base*(0.5+arcNoise));
          break;}
        case'pulse':{
          // פעימה איטית — כמו אות חיים
          L.intensity=fl.base*(0.5+0.5*Math.sin(fl.t*Math.PI*2/fl.period));
          break;}
        case'bubble':{
          // בועות במיכל — נע ועולה
          L.intensity=fl.base*(0.7+0.3*Math.sin(fl.t*3.1+fl.base));
          break;}
        case'fluorescent':{
          // נאון ישן — הבהוב סרט
          if(fl.t>fl.period){
            fl.t=0;fl.period=0.04+Math.random()*0.08;
            L.intensity=Math.random()<0.05?0:fl.base*(0.85+Math.random()*0.3);
          }
          break;}
        case'crt':{
          // מסך CRT — scan-line flicker
          L.intensity=fl.base*(0.8+0.2*Math.sin(fl.t*7));
          break;}
      }
    });
  }

  // ── אנימציית רקס במיכל — סיבוב איטי ועלייה ─
  if(G._labReksInTank){
    G._labReksInTank.rotation.y=_labFlickerT*0.4;
    G._labReksInTank.position.y=2.2+Math.sin(_labFlickerT*0.8)*0.15;
  }

  const spd=G.dogs[G.dog].spd;
  // תנועה — בדיוק כמו עולם רגיל: וקטורים לפי G.yaw (עכבר/מגע)
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));
  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])   {inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']) {inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']) {inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}
  const iln=Math.hypot(inputX,inputZ)||1;
  let nx=LAB.playerX+(inputX/iln)*spd*dt;
  let nz=LAB.playerZ+(inputZ/iln)*spd*dt;
  nx=Math.max(-13,Math.min(13,nx));
  nz=Math.max(-14,Math.min(13,nz));
  LAB.playerX=nx;LAB.playerZ=nz;
  PB.position.set(LAB.playerX,0,LAB.playerZ);
  // ── אנימציית הליכה — זהה ל-updPlayer ──
  const _labMoving=Math.abs(inputX)>.01||Math.abs(inputZ)>.01;
  if(_labMoving){
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y+=(_by-dogModel.position.y)*.15;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }
  // השחקן מסתובב לכיוון התנועה — בדיוק כמו updPlayer
  if(Math.abs(inputX)>.01||Math.abs(inputZ)>.01)
    PB.rotation.y=Math.atan2(-inputX,-inputZ);
  // מצלמה — בדיוק כמו updCamera() בעולם הרגיל (עם pitch)
  if(labCamera){
    const sz=G.dog==='momo'?.58:1,cd=8,ch=4+G.pitch*6;
    const px=LAB.playerX,py=1.1*sz,pz=LAB.playerZ;
    _vCamTarget.set(px+Math.sin(G.yaw)*cd,py+ch,pz+Math.cos(G.yaw)*cd);
    labCamera.position.lerp(_vCamTarget,.1);
    labCamera.lookAt(px,py+.7,pz);
  }
  // ── mission 30: קרב הצל בתוך המעבדה ──
  if(G.mission===30&&G._shadowEnemy&&!G._shadowEnemy.dead&&G._shadowEnemy._inLab){
    const se=G._shadowEnemy;
    const px=LAB.playerX,pz=LAB.playerZ;
    const dd=Math.hypot(se.x-px,se.z-pz);
    // תנועה — רודף
    if(dd>1.8){
      const ang=Math.atan2(px-se.x,pz-se.z);
      se.x+=Math.sin(ang)*se.spd*dt;
      se.z+=Math.cos(ang)*se.spd*dt;
      se.mesh.position.set(se.x,0,se.z);
      se.mesh.rotation.y=ang;
    }
    // תקיפה
    se._atkT=Math.max(0,(se._atkT||0)-dt);
    if(dd<2.5&&se._atkT<=0){dmgPlayer(se.pow);se._atkT=1.1;haptic([30,15,30]);}
    // פגיעה מהשחקן — F במקלדת או כפתור תקיפה במובייל
    se._hitT=Math.max(0,(se._hitT||0)-dt);
    if(dd<4&&G._labAtk&&se._hitT<=0){
      G._labAtk=false;
      const dog=G.dogs[G.dog];
      const dmg=Math.round(dog.pow*10*(1+dog.lv*.1));
      se.hp-=dmg;haptic(22);
      spawnBlood(se.x,1.5,se.z,8);
      showDmg(se.x,2,se.z,dmg);
      se._hitT=0.45;
      if(se.bar)se.bar.scale.x=Math.max(0,se.hp/se.mhp);
      if(se.hp<=0){
        se.dead=true;se.mesh.visible=false;
        G._shadowBossDead=true;
        sCapture();haptic([80,30,80,30,100]);
        addXP(180);G.coins+=150;updCoins();
        spawnBlood(se.x,2,se.z,20);
        showN('⚔️ הצל הובס.\n\n"הוא לא היה אויב. הוא היה כלי."');
        G.paused=true;
        setTimeout(()=>showCut('ch6_shadow_fight',()=>{
          G.paused=false;
          setMission(31);
          showN('🚪 מצא את הדלת הצדדית ביציאה מימין');
        }),600);
      }
    }
    // HP bar
    if(!se.bar&&se.mesh){
      const bg=new THREE.Mesh(new THREE.BoxGeometry(1.2,.12,.1),
        new THREE.MeshBasicMaterial({color:0x330033}));
      bg.position.set(0,2.8,0);se.mesh.add(bg);
      const bar=new THREE.Mesh(new THREE.BoxGeometry(1.2,.12,.1),
        new THREE.MeshBasicMaterial({color:0xaa00cc}));
      bar.position.set(0,.001,0.01);bg.add(bar);se.bar=bar;
    }
  }
  // נגן הקלטות — mission 29
  if(G.mission===29&&!G._ch6RecordingPlayed&&G._labRecorder){
    const d=Math.hypot(LAB.playerX-1.5,LAB.playerZ+10.5);
    if(G._labRecInd)G._labRecInd.rotation.y+=dt*2;
    if(d<2.5){
      G._ch6RecordingPlayed=true;
      if(G._labRecInd)G._labRecInd.visible=false;
      G.paused=true;
      setTimeout(()=>showCut('ch6_recording',()=>{
        G.paused=false;
        setMission(30);
        // הצל מופיע מיד בתוך המעבדה — הקרב מתחיל
        setTimeout(_spawnShadowInLab,500);
      }),400);
    }
  }
  // יציאה — mission 28 (גילוי ראשוני) — אוטומטי אחרי 5 שניות
  if(G.mission===28&&!G._ch6LabVisited){
    G._ch6LabVisited=true;
    showCut('ch6_lab_found',()=>setMission(29));
  }
  // יציאה דרך הדלת הצדדית — mission 31 (מפעל)
  if(G.mission===31&&!G._ch6FactoryVisited&&LAB.playerX>12&&LAB.playerZ>6){
    G._ch6FactoryVisited=true;
    G.paused=true;
    setTimeout(()=>showCut('ch6_factory',()=>{
      G.paused=false;
      exitLab();
      setTimeout(()=>setMission(32),800);
    }),300);
  }
  // יציאה רגילה — דלת ימין mission 30+ (אחרי הקלטה)
  if(G.mission===30&&LAB.playerX>13){
    exitLab();
  }
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
        if(kdd<4&&G._atkFrame&&kg._hitT<=0){
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
    if(dd<4&&allGangDown&&G._atkFrame&&fe._hitT<=0){
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
      if(!gd._atkT)gd._atkT=0;
      gd._atkT=Math.max(0,gd._atkT-dt);
      if(dd<3&&gd._atkT<=0){
        const dmg=15*(1+G.mission*.02);dmgPlayer(dmg);gd._atkT=1.4;
      }
      // ניתן להכנעה
      if(dd<3.5&&G._atkFrame){
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
    // תקיפת שחקן — cooldown נפרד לפלטו
    if(!b._atkT)b._atkT=0;
    b._atkT=Math.max(0,b._atkT-dt);
    if(dd<3&&b._atkT<=0){
      const dmg=b.phase===2?28:18;dmgPlayer(dmg);b._atkT=1.0;haptic([40,20]);
    }
    // השחקן תוקף — רק בלחיצת כפתור (_atkFrame)
    if(dd<4&&G._atkFrame){
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
      const bellaX=G._bellaMarker.x, bellaZ=G._bellaMarker.z;
      G._bellaMarker=null;
      // ── מצלמה סינמטית — מסתכלת למטה על מקום בלה ──
      if(camera&&PB){
        const origCamPos=camera.position.clone();
        const origLookAt=new THREE.Vector3(PB.position.x,PB.position.y+1,PB.position.z);
        const bellaCam=new THREE.Vector3(bellaX+3.5, 3.5, bellaZ+5);
        const bellaLook=new THREE.Vector3(bellaX, 0.3, bellaZ);
        G._cinemaMode=true;
        let _lT=0;
        const _lI=setInterval(()=>{
          _lT+=16;
          const p=Math.min(_lT/500,1),e=1-Math.pow(1-p,3);
          camera.position.lerpVectors(origCamPos,bellaCam,e);
          camera.lookAt(new THREE.Vector3().lerpVectors(origLookAt,bellaLook,e));
          if(_lT>=500)clearInterval(_lI);
        },16);
        setTimeout(()=>{ G._cinemaMode=false; },4000);
      }
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
        if(dd<3.2&&G._atkFrame&&gd._hitT<=0){
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
// CH5 UPDATE — כניסה לפרק ה׳ (missions 20-24)
// ════════════════════════════════════════════════
// updCh5 מוגדרת ב-ui.js — כל ה-logic של פרק ה׳ שם

// ════════════════════════════════════════════════
// _applyWorldState — מסדר את העולם לפי mission
// נקרא בכל פתיחת פרק (_devJump, csStartChapter, loadGame)
// ════════════════════════════════════════════════
function _applyWorldState(m){
  if(!PB)return;

  // ── פרק א׳ (0-7): עולם נקי ──
  // בלה חיה, אין gateMarker, אין fishka hostile
  if(m<=7){
    G.npcs.forEach(n=>{n._dead=false;if(n.mesh)n.mesh.visible=true;});
    G.ch2Active=false;G.momoFreed=false;
    G.gateMarker=null;G._bellaMarker=null;
  }

  // ── פרק ב׳ (8-11): בלה חיה, gateMarker קיים ──
  if(m>=8){
    G.ch2Active=true;
    G.gateMarker={x:-51,z:-100};
    // בלה עדיין חיה
    G.npcs.forEach(n=>{if(n.name==='בלה הזקנה')n._dead=false;});
  }

  // ── פרק ג׳ (12+): בלה מתה ──
  if(m>=12){
    G.npcs.forEach(n=>{if(n.name==='בלה הזקנה'){n._dead=true;if(n.mesh)n.mesh.visible=false;}});
    G._bellaMarker=null; // כבר עבר
    // fishka כבוי — הקרב כבר הסתיים
    if(G._fishkaEnemy&&m>13){G._fishkaEnemy.caught=true;if(G._fishkaEnemy.mesh)G._fishkaEnemy.mesh.visible=false;}
    // מומו חופשית
    G.momoFreed=true;
  }

  // ── פרק ד׳ (14-19): עיריית לוד פתוחה ──
  if(m>=14){
    // שומרי עירייה — מופעלים ב-updCh3Entities
  }

  // ── פרק ה׳ (20+): רקס ally ──
  if(m>=20){
    if(!G._reksAlly&&typeof _spawnReksAlly==='function'){
      _spawnReksAlly();
      if(G._reksAlly&&PB){
        G._reksAlly.x=PB.position.x+3;
        G._reksAlly.z=PB.position.z+3;
        G._reksAlly.mesh.position.set(PB.position.x+3,0,PB.position.z+3);
      }
    }
    // titan scouts
    if(m===21&&!G._titanScoutsSpawned&&typeof _spawnTitanScouts==='function'){
      _spawnTitanScouts();
    }
    // titan boss
    if(m>=22&&m<=23&&typeof _spawnTitanBoss==='function'){
      if(!G._titanEnemy)_spawnTitanBoss(false);
      else G._titanEnemy.frozen=false;
    }
    // titan dead אם mission 24+
    if(m>=24&&G._titanEnemy){G._titanEnemy.dead=true;if(G._titanEnemy.mesh)G._titanEnemy.mesh.visible=false;}
  }

  // ── פרק ו׳ (25+): רקס מת ──
  if(m>=25){
    // רקס ally נעלם
    if(G._reksAlly&&G._reksAlly.mesh)G._reksAlly.mesh.visible=false;
    // כל state פרק ו׳ שכבר עבר
    if(m>25)G._ch6BaseVisited=true;
    if(m>26)G._ch6MarketVisited=true;
    if(m>27)G._ch6PortVisited=true;
    if(m>28)G._ch6LabVisited=true;
    if(m>29)G._ch6RecordingPlayed=true;
    if(m>30){G._shadowBossDead=true;if(G._shadowEnemy)G._shadowEnemy.dead=true;}
    if(m>31)G._ch6FactoryVisited=true;
    if(m>32)G._ch6FireDone=true;
    // boss הצל — יspawn בתוך המעבדה בכניסה למשימה 30 (ראה enterLab)
  }

  // ── אויבים — הצג לפי פרק ──
  if(m>=3)G.enemies.forEach(e=>{e.mesh.visible=true;});
  if(m>=4)G.npcs.forEach(n=>{if(n.ind&&n.type==='recruit')n.ind.visible=true;});

  updateMissionHUD();
  updateNavArrow();
}

// ════════════════════════════════════════════════
// ZIPPO LIGHTER — מצית זיפו (פריט עלילתי, mission 32)
// ════════════════════════════════════════════════
let _zippoLighterMesh=null;

function _buildZippoLighter(){
  if(!scene||_zippoLighterMesh)return;
  const g=new THREE.Group();
  const goldM=new THREE.MeshStandardMaterial({color:0xc8960a,roughness:.28,metalness:.82,emissive:new THREE.Color(0x2a1a00)});
  const goldD=new THREE.MeshStandardMaterial({color:0x9a7000,roughness:.35,metalness:.75,emissive:new THREE.Color(0x150c00)});
  const engM =new THREE.MeshStandardMaterial({color:0x7a5500,roughness:.55,metalness:.5,emissive:new THREE.Color(0x080400)});
  // גוף
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.07),goldM));
  // פסים דקורטיביים
  [-1,1].forEach(sx=>{const s=new THREE.Mesh(new THREE.BoxGeometry(.002,.14,.072),engM);s.position.set(sx*.06,0,0);g.add(s);});
  // חריטת "19"
  const n1=new THREE.Mesh(new THREE.BoxGeometry(.008,.08,.008),engM);n1.position.set(-.022,-.01,.036);g.add(n1);
  const n9c=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.008,10),engM);n9c.rotation.x=Math.PI/2;n9c.position.set(.022,.02,.036);g.add(n9c);
  const n9t=new THREE.Mesh(new THREE.BoxGeometry(.008,.036,.008),engM);n9t.position.set(.032,-.012,.036);g.add(n9t);
  // כיסוי פתוח
  const lidG=new THREE.Group();lidG.position.y=.13;lidG.rotation.x=-.6;g.add(lidG);
  lidG.add(new THREE.Mesh(new THREE.BoxGeometry(.12,.09,.07),goldD));
  // ציר
  const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.074,6),goldD);hinge.rotation.z=Math.PI/2;hinge.position.set(0,.133,-.034);g.add(hinge);
  // גלגלת
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.02,8),goldD);wheel.rotation.z=Math.PI/2;wheel.position.set(.01,.19,0);g.add(wheel);
  // להבה פנימית
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.022,.065,6),
    new THREE.MeshStandardMaterial({color:0xff9900,emissive:new THREE.Color(0xff5500),transparent:true,opacity:.9,roughness:.1}));
  flame.position.y=.24;g.add(flame);
  // הילה חיצונית
  const outerFlame=new THREE.Mesh(new THREE.ConeGeometry(.038,.055,6),
    new THREE.MeshStandardMaterial({color:0xffcc00,emissive:new THREE.Color(0xff8800),transparent:true,opacity:.35,roughness:.1}));
  outerFlame.position.y=.235;g.add(outerFlame);
  const flameLight=new THREE.PointLight(0xff7700,2.2,4);flameLight.position.y=.28;g.add(flameLight);
  g._flame=flame;g._outerFlame=outerFlame;g._flameLight=flameLight;
  g.scale.setScalar(1.8);
  g.visible=false;
  scene.add(g);
  _zippoLighterMesh=g;
}

function _updateZippoLighter(){
  if(!_zippoLighterMesh||!_zippoLighterMesh.visible||!PB)return;
  const t=Date.now()*.001;
  // כף יד קדמית ימין: dogLegs[0] — x=+0.135, z=+0.36, paw at y≈-0.21 מהמודל
  // במצב דו-רגלי מחובר ל-dogLegs[0].paw בעולם
  if(dogLegs&&dogLegs[0]&&dogLegs[0].paw){
    const pawPos=new THREE.Vector3();
    dogLegs[0].paw.getWorldPosition(pawPos);
    _zippoLighterMesh.position.copy(pawPos);
    _zippoLighterMesh.rotation.y=PB.rotation.y+0.1;
    _zippoLighterMesh.rotation.z=0.15;
    _zippoLighterMesh.rotation.x=-0.3;
  }
  if(_zippoLighterMesh._flame){
    _zippoLighterMesh._flame.scale.setScalar(.82+Math.sin(t*12)*.2);
    _zippoLighterMesh._flame.position.y=.21+Math.sin(t*11)*.006;
  }
  if(_zippoLighterMesh._outerFlame){
    _zippoLighterMesh._outerFlame.scale.setScalar(.75+Math.sin(t*9)*.25);
    _zippoLighterMesh._outerFlame.material.opacity=.25+Math.sin(t*13)*.14;
  }
  if(_zippoLighterMesh._flameLight)
    _zippoLighterMesh._flameLight.intensity=1.8+Math.sin(t*15)*.8;
}

let _deodorantMesh=null;

function _buildDeodorant(){
  if(!scene||_deodorantMesh)return;
  const g=new THREE.Group();
  // גוף פחית — אלומיניום כחול-לבן
  const bodyM=new THREE.MeshStandardMaterial({color:0x1a4a8a,roughness:.35,metalness:.75,emissive:new THREE.Color(0x040c18)});
  const capM =new THREE.MeshStandardMaterial({color:0xddeeff,roughness:.25,metalness:.5});
  const labelM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6});
  // פחית ראשית
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.22,10),bodyM);
  body.castShadow=true;g.add(body);
  // פס לבן עליון
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(.056,.056,.05,10),labelM);
  stripe.position.y=.07;g.add(stripe);
  // כיסוי עליון
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.042,.055,.04,10),capM);
  cap.position.y=.13;g.add(cap);
  // חרטום ריסוס
  const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.06,8),capM);
  nozzle.position.y=.17;g.add(nozzle);
  // כפתור לחיצה
  const btn=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.025,8),
    new THREE.MeshStandardMaterial({color:0xff4400,roughness:.4,emissive:new THREE.Color(0x220800)}));
  btn.position.y=.22;g.add(btn);
  g.scale.setScalar(1.8);
  g.visible=false;
  scene.add(g);
  _deodorantMesh=g;
}

function _updateDeodorant(){
  if(!_deodorantMesh||!_deodorantMesh.visible||!PB)return;
  // כף יד קדמית שמאל: dogLegs[1] — x=-0.135, z=+0.36
  if(dogLegs&&dogLegs[1]&&dogLegs[1].paw){
    const pawPos=new THREE.Vector3();
    dogLegs[1].paw.getWorldPosition(pawPos);
    _deodorantMesh.position.copy(pawPos);
    _deodorantMesh.rotation.y=PB.rotation.y-0.1;
    _deodorantMesh.rotation.z=-0.15;
    _deodorantMesh.rotation.x=-0.5; // מוטה קדימה — כאילו מרסס
  }
}

function _showZ18WeaponMode(){
  if(!_zippoLighterMesh)_buildZippoLighter();
  if(!_deodorantMesh)_buildDeodorant();
  if(_zippoLighterMesh)_zippoLighterMesh.visible=true;
  if(_deodorantMesh)_deodorantMesh.visible=true;
  // מצב דו-רגלי
  if(dogModel&&G.dog==='zippo'&&!dogModel._bipedalMode){
    dogModel._bipedalMode=true;
    dogModel._bipedalYOffset=0.5;
    PB.position.y+=0.5;
    if(dogLegs[0])dogLegs[0].node.rotation.x=-1.3;
    if(dogLegs[1])dogLegs[1].node.rotation.x=-1.3;
    dogModel.rotation.x=0.6;
  }
}

function _hideZ18WeaponMode(){
  if(_zippoLighterMesh)_zippoLighterMesh.visible=false;
  if(_deodorantMesh)_deodorantMesh.visible=false;
  if(dogModel&&dogModel._bipedalMode){
    dogModel._bipedalMode=false;
    dogModel.rotation.x=0;
    PB.position.y=Math.max(0,PB.position.y-(dogModel._bipedalYOffset||0.5));
    dogModel._bipedalYOffset=0;
    if(dogLegs[0])dogLegs[0].node.rotation.x=0;
    if(dogLegs[1])dogLegs[1].node.rotation.x=0;
  }
}

// aliases לתאימות לאחור — mission 32 (שריפה)
const _showZippoLighter=_showZ18WeaponMode;
const _hideZippoLighter=_hideZ18WeaponMode;

// ════════════════════════════════════════════════
// CH6 UPDATE — פרק ו׳: "צל" (missions 25-32)
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// FIRE — שריפה ראליסטית + קריסה (mission 32)
// ════════════════════════════════════════════════
function _buildBurntRuins(BX,BZ){
  const charM=()=>new THREE.MeshLambertMaterial({color:0x1a0d05,emissive:0x0a0300});
  const ashM=()=>new THREE.MeshLambertMaterial({color:0x2a2218,emissive:0x060400});
  const emberM=new THREE.MeshBasicMaterial({color:0xff3300});
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x,y,z);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.receiveShadow=true;m.castShadow=true;scene.add(m);
    return m;
  };
  // רצפה שטוחה — בסיס שרוף
  add(new THREE.BoxGeometry(19,0.35,15),charM(),BX,0.17,BZ);
  // שכבת אפר על הרצפה
  add(new THREE.BoxGeometry(17,0.12,13),ashM(),BX,0.36,BZ);

  // שרידי קירות — לוחות שטוחים על הקרקע בזוויות שונות
  add(new THREE.BoxGeometry(14,0.4,2.5),charM(),BX-1,0.5,BZ+3,   0.08, 0.2,0);
  add(new THREE.BoxGeometry(10,0.4,2.0),charM(),BX+3,0.45,BZ-4,  0.05,-0.3,0);
  add(new THREE.BoxGeometry(7, 0.4,1.8),charM(),BX-5,0.4, BZ-2,  0.06, 0.5,0);
  add(new THREE.BoxGeometry(5, 0.4,1.5),charM(),BX+2,0.42,BZ+1,  0.04,-0.15,0);

  // קטעי קיר עומדים חלקית — גבוהים קצת
  add(new THREE.BoxGeometry(0.3,1.8,4),charM(),BX-8,0.9,BZ+1,     0,0.1, 0.18);
  add(new THREE.BoxGeometry(0.3,1.2,3),charM(),BX+7,0.6,BZ-2,     0,-0.2,-0.14);
  add(new THREE.BoxGeometry(3,1.4,0.3),charM(),BX-2,0.7,BZ-6,    0.15, 0,  0.08);

  // חתיכות בטון קטנות מפוזרות
  [[4,1],[-3,3],[7,-1],[-6,-3],[2,-5],[-4,5],[6,4],[-1,-4],[5,-4],[-7,2]].forEach(([ox,oz],i)=>{
    const s=0.4+Math.random()*1.2;
    add(new THREE.BoxGeometry(s,s*.4,s*0.9+(i%3)*0.3),charM(),
      BX+ox+(Math.random()-.5),s*.2,BZ+oz+(Math.random()-.5),
      (Math.random()-.5)*.3,(Math.random()-.5)*Math.PI,(Math.random()-.5)*.25);
  });

  // גחלים — נקודות כתומות זוהרות
  [[1,2],[-3,-1],[4,-3],[-5,3],[2,4],[-1,-3],[3,1],[-4,-4]].forEach(([ox,oz])=>{
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.1,5,4),emberM);
    e.position.set(BX+ox,0.4+Math.random()*0.3,BZ+oz);
    scene.add(e);
  });
  // אור גחלים עמום — ממשיך לדגדג
  const emberLight=new THREE.PointLight(0xff2200,1.5,18);
  emberLight.position.set(BX,1.5,BZ);scene.add(emberLight);
  let _eT=0;
  const _eInt=setInterval(()=>{
    _eT+=0.1;
    emberLight.intensity=0.8+Math.sin(_eT*2.3)*0.4+Math.random()*0.5;
    if(_eT>60)clearInterval(_eInt); // כבה אחרי דקה
  },80);
}

function _startBigFire(){
  if(G._bigFireRunning)return;
  G._bigFireRunning=true;
  G._fireIntervalDead=false;
  const BX=25,BZ=-125;
  const bld=G._labBldMeshes||{};
  const mat=G._labBldMat||{};

  // ── 4 אורות אש ממוקמים סביב הבניין ──
  const fireLights=[];
  [[BX,5,BZ+5],[BX-5,4,BZ-3],[BX+5,4,BZ-3],[BX,9,BZ-1]].forEach(([lx,ly,lz])=>{
    const l=new THREE.PointLight(0xff4400,0,45);l.position.set(lx,ly,lz);scene.add(l);fireLights.push(l);
  });
  // אור עשן — לבנבן גבוה
  const smokeL=new THREE.PointLight(0x887766,0,30);smokeL.position.set(BX,18,BZ);scene.add(smokeL);

  // ── כדורי זוהר ──
  const mkGlow=(r,col,op)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),
      new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));
    m._lodExempt=true; // לא תגע בו LOD
    scene.add(m);return m;
  };
  const innerGlow=mkGlow(8,0xff4400,0);   // זוהר כתום פנימי
  const outerGlow=mkGlow(16,0xff1100,0);  // זוהר אדום חיצוני
  innerGlow.position.set(BX,4,BZ);
  outerGlow.position.set(BX,5,BZ);

  // ── מצב התחלתי של הבניין ──
  const origBodyY=bld.body?bld.body.position.y:3;
  const origTopX=bld.top?bld.top.position.x:23;
  const origTopY=bld.top?bld.top.position.y:7.5;
  const origTopZ=bld.top?bld.top.position.z:-126;
  const origRoofY=bld.roof?bld.roof.position.y:6.2;
  const origRoof2Y=bld.roof2?bld.roof2.position.y:9.2;
  const origPipeY=bld.pipe?bld.pipe.position.y:8;
  const origSignY=bld.sign?bld.sign.position.y:5.2;

  // ── צבעי חרוך ──
  const charWall=new THREE.Color(0x1a0800);
  const origWall=new THREE.Color(0x4a3e2e);
  const origRoofC=new THREE.Color(0x2a2218);
  const charRoof=new THREE.Color(0x0e0500);

  let _t=0,_colT=0,_done=false;

  const fireInterval=setInterval(()=>{
    if(G._fireIntervalDead){clearInterval(fireInterval);return;}
    _t+=0.08;
    const norm=Math.min(1,_t/8);  // 0→1 במהלך 8 שניות ראשונות

    // ── חרוך הבניין בהדרגה ──
    if(mat.wall){
      mat.wall.color.copy(origWall).lerp(charWall,norm);
      mat.wall.emissive.setRGB(norm*0.35,norm*0.06,0);
    }
    if(mat.roof){
      mat.roof.color.copy(origRoofC).lerp(charRoof,norm);
      mat.roof.emissive.setRGB(norm*0.25,norm*0.04,0);
    }

    // ── אורות מהבהבים ──
    const baseI=Math.min(12,_t*1.8);
    fireLights.forEach((l,i)=>{
      l.intensity=baseI*(0.5+Math.random()*1.0)*(1+Math.sin(_t*7+i*1.3)*0.3);
      if(_t>5)l.color.setHSL(0.05+Math.random()*0.06,1,0.5); // גוון מתחלף
    });
    smokeL.intensity=Math.min(3,_t*0.4);

    // ── כדורי זוהר ──
    innerGlow.material.opacity=Math.min(0.35,norm*0.4+Math.random()*0.05);
    outerGlow.material.opacity=Math.min(0.18,norm*0.2+Math.random()*0.03);
    innerGlow.scale.setScalar(0.8+norm*0.6+Math.random()*0.1);
    outerGlow.scale.setScalar(0.7+norm*0.5);

    // ── להבות — עולות מכל הבניין ──
    const fCount=Math.min(25,Math.floor(_t*3));
    for(let i=0;i<fCount;i++){
      const col=[0xff8800,0xff4400,0xffcc00,0xff2200,0xff6600,0xffaa00][Math.floor(Math.random()*6)];
      const m=_pfxGet(col);
      const fromRoof=Math.random()<norm*0.6;
      const baseH=fromRoof?(6+Math.random()*4):(0.3+Math.random()*2);
      m.position.set(BX+(Math.random()-.5)*18,baseH,BZ+(Math.random()-.5)*14);
      m.scale.setScalar(0.5+Math.random()*1.8*norm);
      scene.add(m);
      G.particles.push({mesh:m,vx:(Math.random()-.5)*3,vy:5+Math.random()*10,vz:(Math.random()-.5)*2.5,life:0.8+Math.random()*2.2});
    }
    // ── עשן כבד ──
    const sCount=Math.min(12,Math.floor(_t*1.5));
    for(let i=0;i<sCount;i++){
      const bright=Math.round(0x0a+norm*0x16);
      const sm=_pfxGet((bright<<16)|(bright<<8)|bright);
      sm.material=sm.material.clone();sm.material.opacity=0.45+Math.random()*0.3;
      sm.scale.setScalar(2.5+Math.random()*3*norm);
      sm.position.set(BX+(Math.random()-.5)*14,8+Math.random()*8,BZ+(Math.random()-.5)*10);
      scene.add(sm);
      G.particles.push({mesh:sm,vx:(Math.random()-.5)*2,vy:1.5+Math.random()*3,vz:(Math.random()-.5)*2,life:3+Math.random()*4});
    }
    // ── ניצוצות (גוברים עם הזמן) ──
    if(Math.random()<Math.min(0.95,norm*1.2)){
      const sc=Math.floor(3+norm*10);
      for(let i=0;i<sc;i++){
        const sp=_pfxGet(Math.random()<0.5?0xffee00:0xff8800);sp.scale.setScalar(0.25+Math.random()*0.4);
        const ang=Math.random()*Math.PI*2,spd=3+Math.random()*6;
        sp.position.set(BX+(Math.random()-.5)*16,1+Math.random()*8,BZ+(Math.random()-.5)*12);
        scene.add(sp);
        G.particles.push({mesh:sp,vx:Math.cos(ang)*spd,vy:3+Math.random()*8,vz:Math.sin(ang)*spd,life:0.25+Math.random()*0.6});
      }
    }

    // ── רעידה (t=8-9) ──
    if(_t>8&&_t<9&&bld.body){
      bld.body.position.x=BX+(Math.random()-.5)*0.5;
      bld.body.position.z=BZ+(Math.random()-.5)*0.4;
      if(bld.top){bld.top.position.x=origTopX+(Math.random()-.5)*0.6;}
      // רעש קריסה — פצצות גדולות לפני
      if(Math.random()<0.25){
        for(let i=0;i<20;i++){
          const dc=[0x4a3e2e,0x3a2a1a,0x8a6a00][i%3];
          const dm=_pfxGet(dc);dm.scale.setScalar(0.8+Math.random()*2);
          dm.position.set(BX+(Math.random()-.5)*22,6+Math.random()*6,BZ+(Math.random()-.5)*16);
          scene.add(dm);
          G.particles.push({mesh:dm,vx:(Math.random()-.5)*10,vy:3+Math.random()*8,vz:(Math.random()-.5)*10,life:1.2+Math.random()});
        }
      }
    }

    // ── קריסה (t=9→10.5) ──
    if(_t>=9&&bld.body){
      _colT+=0.08;
      const ct=Math.min(1,_colT/1.8);
      const ease=ct*ct*(3-2*ct); // smoothstep
      // גוף ראשי שוקע
      bld.body.position.x=BX;
      bld.body.position.z=BZ;
      bld.body.position.y=origBodyY-ease*10;
      bld.body.rotation.z=ease*0.08;
      // גג ראשי קורס
      if(bld.roof){bld.roof.position.y=origRoofY-ease*11;bld.roof.rotation.z=ease*0.06;}
      // קומה שנייה נופלת הצידה
      if(bld.top){
        bld.top.rotation.z=ease*1.4;
        bld.top.position.x=origTopX+ease*7;
        bld.top.position.y=origTopY-ease*6;
        bld.top.position.z=origTopZ+ease*3;
      }
      if(bld.roof2){bld.roof2.rotation.z=ease*1.2;bld.roof2.position.y=origRoof2Y-ease*12;}
      if(bld.pipe){bld.pipe.rotation.z=ease*-0.9;bld.pipe.position.y=origPipeY-ease*8;}
      if(bld.sign){bld.sign.position.y=origSignY-ease*7;bld.sign.rotation.x=ease*0.6;}
      // פסולת קריסה מאסיבית
      if(_colT<1.6){
        for(let i=0;i<18;i++){
          const dc=[0x4a3e2e,0x3a2010,0x1a0800,0x8a6a00][i%4];
          const dm=_pfxGet(dc);dm.scale.setScalar(0.8+Math.random()*2.5);
          dm.position.set(BX+(Math.random()-.5)*24,2+Math.random()*8,BZ+(Math.random()-.5)*18);
          scene.add(dm);
          G.particles.push({mesh:dm,vx:(Math.random()-.5)*12,vy:-1+Math.random()*8,vz:(Math.random()-.5)*12,life:1.5+Math.random()*2});
        }
        // ענן אבק קריסה
        for(let i=0;i<6;i++){
          const dust=_pfxGet(0x8a7a6a);dust.material=dust.material.clone();dust.material.opacity=0.6;
          dust.scale.setScalar(3+Math.random()*4);
          dust.position.set(BX+(Math.random()-.5)*20,0.5+Math.random()*3,BZ+(Math.random()-.5)*16);
          scene.add(dust);
          G.particles.push({mesh:dust,vx:(Math.random()-.5)*6,vy:0.5+Math.random()*2,vz:(Math.random()-.5)*6,life:4+Math.random()*3});
        }
      }
    }

    // ── סוף — שאריות שרופות + cutscene ──
    if(_t>=10.5&&!_done){
      _done=true;clearInterval(fireInterval);
      G._fireIntervalDead=true;
      fireLights.forEach(l=>scene.remove(l));scene.remove(smokeL);
      scene.remove(innerGlow);scene.remove(outerGlow);
      innerGlow.geometry.dispose();outerGlow.geometry.dispose();
      // הסתר את שברי הבניין המפורקים
      Object.values(bld).forEach(m=>{if(m&&m.visible!==undefined)m.visible=false;});
      // ── שאריות שרופות סטטיות ──
      _buildBurntRuins(BX,BZ);
      G.paused=true;
      setTimeout(()=>showCut('ch6_fire',()=>{
        setTimeout(()=>showCut('ch6_ending',()=>{
          G.paused=false;
          G._gameComplete=false;
          const mp=document.getElementById('mp');if(mp)mp.style.display='block';
          const nav=document.getElementById('nav');if(nav)nav.style.display='block';
          showN('🏁 פרק ו׳ הסתיים! פרק ז׳ מתחיל...');
          setTimeout(()=>setMission(33),2000);
        }),1500);
      }),600);
    }
  },80);
}

function updCh6(dt){
  const _hudIP=document.getElementById('ip');
  if(G.mission<25||G.mission>32)return;
  if(!PB||LAB.inLab)return;
  const px=PB.position.x,pz=PB.position.z;

  // ── mission 25: הגיעו לבסיס כלבי לוד ──
  if(G.mission===25&&!G._ch6BaseVisited){
    if(d2(px,pz,105,25)<10){
      G._ch6BaseVisited=true;
      if(G._reksAlly&&G._reksAlly.mesh)G._reksAlly.mesh.visible=false;
      showCut('ch6_open',()=>setMission(26));
    }
  }

  // ── mission 26: שוק לוד — קולין רואה את הצל ──
  if(G.mission===26&&!G._ch6MarketVisited){
    if(d2(px,pz,-60,60)<8){
      G._ch6MarketVisited=true;
      showCut('ch6_shadow_seen',()=>setMission(27));
    }
  }

  // ── mission 27: עקוב אחרי הצל — מגיע לבניין הנטוש ──
  if(G.mission===27&&!G._ch6PortVisited){
    if(d2(px,pz,25,-125)<8){
      G._ch6PortVisited=true;
      showCut('ch6_shadow_zippo',()=>setMission(28));
    }
  }

  // ── missions 28-30: כניסה למעבדה ──
  if((G.mission===28||G.mission===29||G.mission===30)&&!LAB.inLab){
    // ind מהבל בניין ישן
    if(G._labDoorInd){
      G._labDoorInd.position.y=4.2+Math.sin(Date.now()*.003)*0.2;
    }
    if(d2(px,pz,25,-125)<4&&!LAB.inLab){
      enterLab();
    }
  }

  // ── mission 31: חוזרים למעבדה לגלות "את השאר" ──
  if(G.mission===31&&!G._ch6FactoryVisited&&!LAB.inLab){
    if(G._labDoorInd)G._labDoorInd.visible=true;
    if(d2(px,pz,25,-125)<4){
      enterLab(); // בתוך updLab יקרה ch6_factory
    }
  }

  // ── mission 32: שריפה — מחוץ לבניין ──
  if(G.mission===32&&!G._ch6FireDone){
    const nearFire=d2(px,pz,25,-125)<9;
    // עדכן מצית זיפו — מוצג מעל הקרקע ליד הכלב
    if(typeof _updateZippoLighter==='function')_updateZippoLighter(dt);
    if(typeof _updateDeodorant==='function')_updateDeodorant();
    if(nearFire){
      G._fireNearActive=true;
      // הדגש: רק זיפו יכול להצית
      const isZippo=G.dog==='zippo';
      if(_hudIP){
        _hudIP.textContent=isZippo?'🔥 E — הצת את המעבדה (מצית זיפו)':'🔥 רק זיפו יכול להצית כאן!';
        _hudIP.style.display='block';
      }
      if((G.keys['KeyE']||G._fireKeyMob)&&isZippo){
        G.keys['KeyE']=false;G._fireKeyMob=false;
        G._ch6FireDone=true;
        if(G._labDoorInd)G._labDoorInd.visible=false;
        if(_hudIP){_hudIP.textContent='';_hudIP.style.display='none';}
        G._fireNearActive=false;
        // הסתר מצית ואז שרוף
        if(typeof _hideZippoLighter==='function')_hideZippoLighter();
        _startBigFire();
      } else if((G.keys['KeyE']||G._fireKeyMob)&&!isZippo){
        G.keys['KeyE']=false;G._fireKeyMob=false;
        showN('🔥 רק זיפו יכול להצית — החלף לזיפו!');
      }
    } else {
      G._fireNearActive=false;
      if(_hudIP&&_hudIP.textContent.includes('הצת')){_hudIP.textContent='';_hudIP.style.display='none';}
    }
  }
  // הסתר מצית אם לא במשימה 32
  if(G.mission!==32&&typeof _hideZippoLighter==='function')_hideZippoLighter();
}


// ════════════════════════════════════════════════
// REPUTATION — מוניטין בעיר
// ════════════════════════════════════════════════
// רמות: 0=לא ידוע, 1=מוכרים, 2=מפחידים, 3=אגדה
function getReputation(){
  const kills=G.totalKills,terrs=G.terrCnt,lv=G.dogs[G.dog].lv;
  if(kills>=30&&terrs>=4&&lv>=4)return 3;
  if(kills>=15&&terrs>=2)return 2;
  if(kills>=5||terrs>=1)return 1;
  return 0;
}
const _REP_NAMES=['לא ידוע','מוכרים','מפחידים','🌟 אגדה'];
const _REP_REACTIONS=[
  null, // 0 — ניטרלי
  ['שמעתי עליכם...','אל תקרבו!','הכלבים של לוד!'],
  ['!אחד מהכלבים המפורסמים','ברחו! הכלבים!','כולם ידברו על זה!'],
  ['!אגדה!','כלבי לוד לעד!','לא האמנתי שאראה אתכם!'],
];

function _triggerRepReaction(npc){
  const rep=getReputation();
  if(rep===0)return;
  const reactions=_REP_REACTIONS[rep];
  if(!reactions||!npc)return;
  const txt=reactions[Math.floor(Math.random()*reactions.length)];
  // הצג בועת דיבור מעל ה-NPC
  showDmg(npc.x,2.5,npc.z,txt,true);
  // ברמה 2+ — בורחים
  if(rep>=2&&npc.state!=='flee'){
    npc.state='flee';
    npc._fleeT=4+Math.random()*3;
  }
}

// עדכון מוניטין ב-HUD
function updReputationHUD(){
  const el=document.getElementById('rep-hud');
  if(!el)return;
  const rep=getReputation();
  if(rep===0){el.style.display='none';return;}
  el.style.display='block';
  el.textContent='⭐'.repeat(rep)+' '+_REP_NAMES[rep];
  el.style.color=rep===3?'#f5c518':rep===2?'#e74c3c':'#aaa';
}
// ════════════════════════════════════════════════
// HIT FLASH — מהבהב אדום בעת פגיעה
// ════════════════════════════════════════════════
function flash(mesh){
  if(!mesh||!mesh.material)return;
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  mats.forEach(m=>{
    if(!m._origEmissive){m._origEmissive=m.emissive?m.emissive.getHex():0x000000;}
    if(m.emissive)m.emissive.setHex(0xff4444);
  });
  setTimeout(()=>{
    mats.forEach(m=>{if(m.emissive&&m._origEmissive!==undefined)m.emissive.setHex(m._origEmissive);});
  },120);
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
function showDmg(wx,wy,wz,txt,colorOrCoin){
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
  el.style.color=colorOrCoin===true?'#f5c518':typeof colorOrCoin==='string'?colorOrCoin:'#ff4444';
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
  if(v)v.textContent=G.coins||0;
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
  let _shopReady=false;
  setTimeout(()=>{_shopReady=true;},350); // חסום קליקים ל-350ms אחרי פתיחה
  (npc.shopItems||[]).forEach(item=>{
    const row=document.createElement('div');row.className='sh-item';
    row.innerHTML=`<div class="sh-ico">${item.ico}</div><div class="sh-info"><div class="sh-iname">${item.name}</div><div class="sh-desc">${item.desc}</div></div><div class="sh-cost">💰${item.cost}</div>`;
    row.addEventListener('pointerup',e=>{
      e.stopPropagation();
      if(!_shopReady)return;
      item.fn();
      document.getElementById('sh-coin-val').textContent=G.coins;
    });
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
  const allDogs=Object.values(G.dogs);
  if(type==='hp'){dog.hp=Math.min(dog.mhp,dog.hp+40);showN('🍖 +40 בריאות!');}
  else if(type==='hp_big'){dog.hp=dog.mhp;showN('💊 בריאות מלאה!');}
  else if(type==='stam'){dog.stam=Math.min(100,dog.stam+100);showN('⚡ +100 סטמינה!');}
  else if(type==='pow'){allDogs.forEach(d=>d.pow+=3);showN('🦷 +3 כוח לכל הכלבים!');}
  else if(type==='spd'){allDogs.forEach(d=>d.spd+=.5);showN('🏃 +0.5 מהירות לכל הכלבים!');}
  else if(type==='mhp'){allDogs.forEach(d=>{d.mhp+=20;d.hp=Math.min(d.hp+20,d.mhp);});showN('🛡️ +20 HP מקסימלי לכל הכלבים!');}
  updCoins();sPickup();
  document.getElementById('sh-coin-val').textContent=G.coins;
  saveGame();
}

function buyCos(type){
  const costs={spike:50,glasses:40,bandana:35,cape:120};
  const cost=costs[type]||50;
  if(G.coins<cost){haptic([20,10,20]);showN('💰 אין מספיק מטבעות!');return;}
  if(G.cosmetics&&G.cosmetics[type]){showN('✅ כבר יש לך פריט זה!');return;}
  G.coins-=cost;
  if(!G.cosmetics)G.cosmetics={};
  G.cosmetics[type]=true;
  const names={spike:'צוארון ספייק',glasses:'משקפי שמש',bandana:'בנדנה אדומה',cape:'גלימת גיבור'};
  showN(`✅ ${names[type]} — נרכש!`);
  haptic([20,10,30]);updCoins();saveGame();
}
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


// ════════════════════════════════════════════════
// 🌍 OPEN WORLD EVENTS — אירועי עולם פתוח
// ════════════════════════════════════════════════
const OWE={
  active:null,       // האירוע הפעיל כרגע
  cooldown:0,        // שניות עד האירוע הבא
  mesh:null,         // mesh של ה-NPC/אירוע
  ind:null,          // אינדיקטור '!'
  _timer:0,          // טיימר לסיום אירוע
};

const OWE_TYPES=[
  {
    id:'lost_dog',
    emoji:'🐕',
    title:'כלב אבוד!',
    desc:'כלב קטן מסתובב ומחפש בעלים. עזור לו!',
    action:'E — החזר את הכלב',
    reward:()=>({coins:40,xp:30,msg:'🐕 כלב הוחזר! +40💰 +30XP'}),
    color:0xffaa00,
    minMission:1,
  },
  {
    id:'street_fight',
    emoji:'⚔️',
    title:'קטטה ברחוב!',
    desc:'שני כלבים ריבים ליד הכביש. עצור את זה!',
    action:'E — הפרד את הקטטה',
    reward:()=>({coins:60,xp:40,msg:'✊ קטטה הופסקה! +60💰 +40XP'}),
    color:0xff4400,
    minMission:2,
  },
  {
    id:'robbery',
    emoji:'🏪',
    title:'שוד בחנות!',
    desc:'כלב חשוד בורח עם אוכל. תפוס אותו!',
    action:'E — עצור את הגנב',
    reward:()=>({coins:80,xp:50,msg:'🏪 גנב נעצר! +80💰 +50XP'}),
    color:0xff0066,
    minMission:3,
  },
  {
    id:'injured_dog',
    emoji:'🩹',
    title:'כלב פצוע!',
    desc:'כלב שכב בצד הדרך — פצוע ובצרה.',
    action:'E — עזור לכלב',
    reward:()=>({coins:30,xp:25,hp:20,msg:'🩹 כלב טופל! +30💰 +25XP +20HP'}),
    color:0x00ccff,
    minMission:1,
  },
  {
    id:'cat_chase',
    emoji:'🐈',
    title:'חתול על הגג!',
    desc:'חתול בורח ומפיל זבל. תרדוף!',
    action:'E — בתר את החתול',
    reward:()=>({coins:50,xp:35,msg:'🐈 חתול הוכנע! +50💰 +35XP'}),
    color:0xaa44ff,
    minMission:2,
  },
];

// נקודות spawn אפשריות לאירועים — על המדרכה, לא בתוך בניין
const OWE_SPOTS=[
  [20,30],[40,-10],[-30,20],[0,-40],[50,40],[-50,10],
  [10,60],[60,-30],[-20,-30],[30,-60],[70,20],[-10,50],
];

function _owe_spawn(){
  if(OWE.active||G.mission<1||G.paused||G.dlgOpen||G.cutOpen)return;
  // בחר סוג אקראי מתאים
  const valid=OWE_TYPES.filter(t=>t.minMission<=G.mission);
  if(!valid.length)return;
  const type=valid[Math.floor(Math.random()*valid.length)];
  // בחר מיקום רחוק מהשחקן (לפחות 25 יחידות, לא יותר מ-90)
  const px=PB?PB.position.x:0,pz=PB?PB.position.z:0;
  const spot=OWE_SPOTS.filter(([x,z])=>{
    const d=Math.sqrt((x-px)**2+(z-pz)**2);
    return d>20&&d<80&&!isInBuilding(x,z,2);
  });
  if(!spot.length)return;
  const [sx,sz]=spot[Math.floor(Math.random()*spot.length)];
  // בנה mesh ויזואלי — כדור מהבהב
  const geo=new THREE.SphereGeometry(0.5,8,6);
  const mat=new THREE.MeshLambertMaterial({color:type.color,emissive:new THREE.Color(type.color).multiplyScalar(0.4)});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(sx,1.5,sz);
  scene.add(mesh);
  // אינדיקטור '!'
  const ind=document.createElement('div');
  ind.className='owe-indicator';
  ind.innerHTML=`${type.emoji}<span>${type.title}</span>`;
  ind.style.cssText=`position:fixed;background:rgba(0,0,0,.85);color:#fff;border:2px solid #${type.color.toString(16).padStart(6,'0')};border-radius:10px;padding:4px 10px;font-size:13px;font-weight:bold;display:none;pointer-events:none;z-index:30;gap:6px;align-items:center;`;
  document.body.appendChild(ind);
  OWE.active={type,x:sx,z:sz,done:false};
  OWE.mesh=mesh;
  OWE.ind=ind;
  OWE._timer=90; // 90 שניות לפני שהאירוע מסתיים לבד
  showN(`${type.emoji} ${type.title} — ${type.desc}`);
}

function updOWE(dt){
  if(VILLA.inVilla||CITY.inCity||LAB.inLab)return;
  // cooldown בין אירועים
  if(!OWE.active){
    OWE.cooldown=Math.max(0,(OWE.cooldown||120)-dt);
    if(OWE.cooldown<=0){
      OWE.cooldown=90+Math.random()*60; // 90-150 שניות עד אירוע הבא
      if(Math.random()<0.7)_owe_spawn(); // 70% סיכוי
    }
    return;
  }
  const ev=OWE.active;
  // עדכן טיימר
  OWE._timer-=dt;
  if(OWE._timer<=0){_owe_clear(false);return;} // פג תוקף
  // אנימציה
  if(OWE.mesh){
    OWE.mesh.position.y=1.5+Math.sin(Date.now()*.003)*0.3;
    OWE.mesh.rotation.y+=dt*1.5;
    OWE.mesh.material.emissive=new THREE.Color(ev.type.color).multiplyScalar(0.3+Math.sin(Date.now()*.004)*.2);
  }
  // מיקום אינדיקטור
  if(OWE.ind&&OWE.mesh){
    const pos=OWE.mesh.position.clone().project(camera);
    const near=d2(ev.x,ev.z,PB.position.x,PB.position.z)<8;
    if(pos.z<1&&pos.z>-1&&!near){
      OWE.ind.style.display='flex';
      OWE.ind.style.left=`${(pos.x*.5+.5)*window.innerWidth}px`;
      OWE.ind.style.top=`${(-.5*pos.y+.5)*window.innerHeight-40}px`;
    } else {OWE.ind.style.display='none';}
    // כשקרובים — הצג prompt
    if(near){
      // אם E נלחץ
      if(G._atkFrame||G._eKeyFrame){
        _owe_complete(ev);
      }
    }
  }
}

function _owe_complete(ev){
  const r=ev.type.reward();
  G.coins+=r.coins||0;
  if(r.xp)addXP(r.xp);
  if(r.hp){const d=G.dogs[G.dog];d.hp=Math.min(d.mhp,d.hp+(r.hp||0));}
  showN(r.msg);
  haptic([40,20,60]);
  updCoins();
  // אתגר יומי — ספור אירועי עולם פתוח
  if(G.daily){G.daily.worldEvents=(G.daily.worldEvents||0)+1;_daily_check();}
  saveGame();
  _owe_clear(true);
}

function _owe_clear(success){
  if(OWE.mesh){scene.remove(OWE.mesh);OWE.mesh=null;}
  if(OWE.ind){OWE.ind.remove();OWE.ind=null;}
  OWE.active=null;
  OWE.cooldown=success?60:30; // הצלחה → המתן יותר
}

// ────────────────────────────────────────────
// הוסף E-key frame detection
// ────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.code==='KeyE'){G._eKeyFrame=true;setTimeout(()=>G._eKeyFrame=false,200);}
});


// ════════════════════════════════════════════════
// 📅 DAILY CHALLENGES — אתגרים יומיים
// ════════════════════════════════════════════════
const DAILY_CHALLENGES=[
  {id:'kills',    icon:'⚔️', heb:'הכנע {n} אויבים',   ns:[3,5,8],    reward:[50,80,120]},
  {id:'bones',    icon:'🦴', heb:'אסוף {n} עצמות',     ns:[3,5,8],    reward:[40,70,100]},
  {id:'distance', icon:'🏃', heb:'רוץ {n} מטר',         ns:[200,400,700],reward:[30,60,100]},
  {id:'coins',    icon:'💰', heb:'אסוף {n} מטבעות',    ns:[100,200,350],reward:[0,0,0]}, // תגמול בXP
  {id:'worldEvents',icon:'🌍',heb:'השלם {n} אירועי עולם',ns:[1,2,3],  reward:[60,100,150]},
  {id:'terrs',    icon:'🏳️', heb:'כבוש {n} שטחים',     ns:[1,2,3],    reward:[70,110,160]},
];

function _daily_todayKey(){
  const d=new Date();
  return `daily_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

function _daily_init(){
  const key=_daily_todayKey();
  const saved=localStorage.getItem(key);
  if(saved){
    G.daily=JSON.parse(saved);
    return;
  }
  // יום חדש — בחר 3 אתגרים אקראיים
  const shuffled=[...DAILY_CHALLENGES].sort(()=>Math.random()-.5).slice(0,3);
  const diff=Math.min(2,Math.floor((G.totalKills||0)/15)); // קושי לפי ניסיון
  G.daily={
    key,
    challenges:shuffled.map(c=>({
      id:c.id, icon:c.icon, heb:c.heb,
      target:c.ns[diff], reward:c.reward[diff],
      progress:0, done:false,
    })),
    kills:0, bones:0, distance:0, coins:0, worldEvents:0, terrs:0,
    claimed:[false,false,false],
  };
  _daily_save();
}

function _daily_save(){
  if(!G.daily)return;
  try{localStorage.setItem(G.daily.key,JSON.stringify(G.daily));}catch(_){}
}

function _daily_check(){
  if(!G.daily)return;
  G.daily.challenges.forEach((c,i)=>{
    if(c.done)return;
    const prog=G.daily[c.id]||0;
    c.progress=prog;
    if(prog>=c.target){
      c.done=true;
      if(c.reward>0){G.coins+=c.reward;updCoins();}
      addXP(50);
      haptic([60,30,60]);
      showN(`📅 אתגר יומי: ${c.icon} הושלם! +${c.reward}💰 +50XP`);
      _daily_save();
      saveGame();
      updDailyUI();
    }
  });
}

// ─── hook אתגרים לאירועים קיימים ───────────────────────

// track distance
let _dailyLastX=null,_dailyLastZ=null;
function _daily_trackDistance(){
  if(!G.daily||!PB)return;
  const x=PB.position.x,z=PB.position.z;
  if(_dailyLastX!==null){
    const d=Math.sqrt((x-_dailyLastX)**2+(z-_dailyLastZ)**2);
    if(d<5){G.daily.distance=(G.daily.distance||0)+d;_daily_check();}
  }
  _dailyLastX=x;_dailyLastZ=z;
}

function updDailyUI(){
  const el=document.getElementById('daily-panel-inner');
  if(!el||!G.daily)return;
  let html='<div style="color:#f5c518;font-weight:bold;font-size:12px;margin-bottom:6px;text-align:center;">📅 אתגרים יומיים</div>';
  G.daily.challenges.forEach(c=>{
    const pct=Math.min(100,Math.round((c.progress/c.target)*100));
    const label=c.heb.replace('{n}',c.target);
    html+=`<div class="sq-card${c.done?' done':''}">
      <div class="sq-title">${c.done?'✅':c.icon} ${label}</div>
      <div class="sq-prog">${c.done?`הושלם! +${c.reward}💰`:`${c.progress}/${c.target} (${pct}%)`}</div>
      ${!c.done?`<div style="background:#333;border-radius:4px;height:4px;margin-top:4px;"><div style="background:#f5c518;height:4px;border-radius:4px;width:${pct}%"></div></div>`:''}
    </div>`;
  });
  el.innerHTML=html;
}


// ── הוסף rep-hud לDOM ──
document.addEventListener('DOMContentLoaded',()=>{
  const rh=document.createElement('div');
  rh.id='rep-hud';
  rh.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(0,0,0,.7);border:1px solid #f5c518;border-radius:8px;padding:3px 12px;color:#f5c518;font-size:12px;font-weight:bold;display:none;pointer-events:none;';
  document.body.appendChild(rh);
  // cos-shop
  const cs=document.createElement('div');
  cs.id='cos-shop';
  cs.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:60;background:rgba(10,15,10,.97);border:2px solid #f5c518;border-radius:14px;padding:16px;width:min(320px,85vw);display:none;color:#fff;';
  document.body.appendChild(cs);
  // daily panel
  const dp=document.createElement('div');
  dp.id='daily-panel';
  dp.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:60;background:rgba(10,10,20,.97);border:2px solid #4af;border-radius:14px;padding:16px;width:min(300px,82vw);display:none;';
  dp.innerHTML='<div id="daily-panel-inner"></div><button onclick="document.getElementById(\'daily-panel\').style.display=\'none\'" style="width:100%;margin-top:10px;background:#222;color:#aaa;border:none;border-radius:8px;padding:8px;font-size:14px;cursor:pointer;">X סגור</button>';
  document.body.appendChild(dp);
  // daily button
  const db=document.createElement('button');
  db.id='daily-btn';
  db.style.cssText='position:fixed;top:50%;right:10px;transform:translateY(-50%);z-index:26;background:rgba(0,30,60,.9);border:2px solid #4af;border-radius:10px;color:#4af;font-size:20px;width:42px;height:42px;display:none;cursor:pointer;';
  db.innerHTML='📅';
  db.title='אתגרים יומיים';
  db.onclick=()=>{
    const p=document.getElementById('daily-panel');
    updDailyUI();
    p.style.display=p.style.display==='none'?'block':'none';
  };
  document.body.appendChild(db);
  // init daily on load
  setTimeout(()=>{if(typeof _daily_init==='function')_daily_init();},500);
});



// ════════════════════════════════════════════════
// פרק ח׳ — "אינסטינקט"
// ════════════════════════════════════════════════
let _z18Enemy=null;
const Z18_HP=850, Z18_SPD=5.8;
let _ch8WitnessCount=0;  // NPC conversations
let _ch8WarehouseCleared=false;
let _ch8GrabTriggered=false;
let _ch8WaveCount=0;
const _APEX_LOGO_COL=0x220033;


// ════════════════════════════════════════════════
// מרכז גהה — Interior Scene
// ════════════════════════════════════════════════
const HOSP={inHosp:false,playerX:0,playerZ:8,playerYaw:Math.PI,enterGrace:0};
let hospScene=null,hospCamera=null,hospObjects=[];
let _hospFlickerLights=[],_hospFlickerT=0;

// ════════════════════════════════════════════════
// מרכז גהה — מרכז בריאות הנפש הנטוש, לוד
// מיקום: (-15, -148) — צפון העיר
// ════════════════════════════════════════════════
const SHAFIYA_X=62, SHAFIYA_Z=-118;
function buildHospitalExterior(){
  const x=SHAFIYA_X, z=SHAFIYA_Z;

  // חומרים — בניין מוסדי ישן, בטון מצהיב
  const wallM  = new THREE.MeshLambertMaterial({color:0xd4c89a, emissive:0x080700});
  const wall2M = new THREE.MeshLambertMaterial({color:0xbfb488, emissive:0x060500});
  const roofM  = new THREE.MeshLambertMaterial({color:0x888070, emissive:0x050503});
  const rustM  = new THREE.MeshLambertMaterial({color:0x7a5a30, emissive:0x0d0700});
  const boardM = new THREE.MeshLambertMaterial({color:0x3a2a14, emissive:0x060400});
  const ironM  = new THREE.MeshLambertMaterial({color:0x2a2020, emissive:0x040303});

  // ── גוף ראשי ──
  const body = new THREE.Mesh(new THREE.BoxGeometry(24,7,16), wallM);
  body.position.set(x,3.5,z); body.castShadow=true; body.receiveShadow=true; scene.add(body);

  // ── כנף צדדית (ל שמאל) ──
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8,5.5,10), wall2M);
  wing.position.set(x-16,2.75,z+3); wing.castShadow=true; scene.add(wing);

  // ── קומה שנייה חלקית — ריקבון ──
  const top = new THREE.Mesh(new THREE.BoxGeometry(14,3.5,10), wall2M);
  top.position.set(x+3,8.75,z-2); top.castShadow=true; scene.add(top);

  // ── גגות ──
  const roof1 = new THREE.Mesh(new THREE.BoxGeometry(24.6,0.5,16.6), roofM);
  roof1.position.set(x,7.25,z); scene.add(roof1);
  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(8.6,0.5,10.6), roofM);
  roof2.position.set(x-16,5.75,z+3); scene.add(roof2);
  const roof3 = new THREE.Mesh(new THREE.BoxGeometry(14.6,0.5,10.6), roofM);
  roof3.position.set(x+3,10.5,z-2); scene.add(roof3);

  // ── חלונות סורגים — אופייני לבי"ח נפש ──
  const winM = new THREE.MeshLambertMaterial({color:0x1a1008, emissive:0x020100});
  [[-8,4],[0,4],[8,4],[-8,1.5],[0,1.5],[8,1.5]].forEach(([ox,oy])=>{
    // חלון
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.2,1.8,0.2), winM);
    win.position.set(x+ox, oy+1, z+8.1); scene.add(win);
    // סורגים אנכיים
    for(let b=-0.7;b<=0.8;b+=0.35){
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08,1.8,0.18), ironM);
      bar.position.set(x+ox+b, oy+1, z+8.2); scene.add(bar);
    }
    // סורג אופקי
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.08,0.18), ironM);
    hbar.position.set(x+ox, oy+1, z+8.2); scene.add(hbar);
  });

  // ── חלונות בכנף ──
  [[0,3],[-2.5,3]].forEach(([ox,oy])=>{
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.8,1.6,0.2), winM);
    win.position.set(x-16+ox, oy, z+8.1); scene.add(win);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.08,0.18), ironM);
    bar.position.set(x-16+ox, oy, z+8.2); scene.add(bar);
  });

  // ── דלת כניסה ראשית — שבורה למחצה ──
  const doorFrM = new THREE.MeshLambertMaterial({color:0x6a5a3a, emissive:0x0a0800});
  const doorFr = new THREE.Mesh(new THREE.BoxGeometry(3.8,0.4,0.4), doorFrM);
  doorFr.position.set(x, 4.2, z+8.1); scene.add(doorFr); // משקוף עליון
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.3,4,0.3), doorFrM);
  doorL.position.set(x-1.9, 2, z+8.1); scene.add(doorL);
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.3,4,0.3), doorFrM);
  doorR.position.set(x+1.9, 2, z+8.1); scene.add(doorR);
  // דלת שמאל — פתוחה מעט
  const dlM = new THREE.MeshLambertMaterial({color:0x2a1a08, emissive:0x040200});
  const dl = new THREE.Mesh(new THREE.BoxGeometry(1.7,3.8,0.15), dlM);
  dl.position.set(x-0.6, 1.9, z+8.0); dl.rotation.y=0.35; scene.add(dl);
  // דלת ימין — סגורה
  const dr = new THREE.Mesh(new THREE.BoxGeometry(1.7,3.8,0.15), dlM);
  dr.position.set(x+0.9, 1.9, z+8.1); scene.add(dr);

  // ── שלט "מרכז גהה" ישן ומקולקל ──
  const signBodyM = new THREE.MeshLambertMaterial({color:0x4a3a18, emissive:0x080600});
  const signBody = new THREE.Mesh(new THREE.BoxGeometry(5.5,1.2,0.15), signBodyM);
  signBody.position.set(x, 5.8, z+8.25); signBody.rotation.z=0.03; scene.add(signBody);
  // אותיות — רצועת צבע בהיר שדהה
  const signTextM = new THREE.MeshBasicMaterial({color:0x887850});
  const signText = new THREE.Mesh(new THREE.BoxGeometry(4.2,0.5,0.12), signTextM);
  signText.position.set(x, 5.8, z+8.32); scene.add(signText);

  // ── עמודי כניסה ישנים ──
  [x-2.8, x+2.8].forEach(px2=>{
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.25,4.5,8), wall2M);
    col.position.set(px2, 2.25, z+8.5); scene.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.2,0.6), roofM);
    cap.position.set(px2, 4.6, z+8.5); scene.add(cap);
  });

  // ── גדר ברזל נטוש סביב הבניין ──
  const fenceM = new THREE.MeshLambertMaterial({color:0x1a1818, emissive:0x030303});
  for(let fx=-12;fx<=12;fx+=2.2){
    if(Math.abs(fx)<4)continue; // פתח לדלת
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.1,2.2,0.1), fenceM);
    fp.position.set(x+fx, 1.1, z+10.5); scene.add(fp);
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.3,4), fenceM);
    ft.position.set(x+fx, 2.4, z+10.5); scene.add(ft); // חוד
  }
  // קורת גדר אופקית
  const frail = new THREE.Mesh(new THREE.BoxGeometry(24,0.1,0.1), fenceM);
  frail.position.set(x, 1.8, z+10.5); scene.add(frail);

  // ── עגלת חולים ישנה בחצר ──
  const bedM = new THREE.MeshLambertMaterial({color:0x888878, emissive:0x050504});
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2,0.35,0.9), bedM);
  bed.position.set(x+9, 0.2, z+9); scene.add(bed);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.2,0.9), ironM);
  leg1.position.set(x+8.1, 0.1, z+9); scene.add(leg1);
  const leg2 = leg1.clone(); leg2.position.set(x+9.9, 0.1, z+9); scene.add(leg2);

  // ── צינורות/מזגנים ישנים על הגג ──
  [[2,8],[x-4,7.3],[x+6,7.3]].forEach(([ox,oy],i)=>{
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,1.0), ironM);
    ac.position.set(i===0?x+ox:ox, oy, z-4+i*2); scene.add(ac);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.5,6), ironM);
    pipe.position.set(i===0?x+ox+0.5:ox+0.5, oy+1.5, z-4+i*2); scene.add(pipe);
  });

  // ── תאורה — אור ירקרק חולני ──
  const hospLight = new THREE.PointLight(0x88cc88, 1.8, 18);
  hospLight.position.set(x, 6, z+7); scene.add(hospLight);
  // אור כחלחל עמום פנימי (דולף מחלון)
  const innerLight = new THREE.PointLight(0x4466aa, 0.6, 10);
  innerLight.position.set(x-3, 3.5, z+6); scene.add(innerLight);

  // ── אינדיקטור כניסה — עיגול ירוק מהבהב ──
  const ind = new THREE.Mesh(
    new THREE.SphereGeometry(0.38,8,8),
    new THREE.MeshBasicMaterial({color:0x44ff88})
  );
  ind.position.set(x, 3.5, z+8.3); scene.add(ind);
  G._hospDoorInd = ind;

  // שמור refs
  G._hospBuilt = true;
  G._hospX = x; G._hospZ = z;
}


// ════════════════════════════════════════════════
// buildHospScene — פנים מרכז גהה הנטוש
// ════════════════════════════════════════════════
function buildHospScene(){
  hospScene=new THREE.Scene();
  hospScene.background=new THREE.Color(0x0a0c14);
  hospScene.fog=new THREE.FogExp2(0x0a0c14,.016);
  hospCamera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,.1,160);
  hospScene.add(hospCamera);
  _hospFlickerLights=[];

  const _add=m=>{m.castShadow=true;m.receiveShadow=true;hospScene.add(m);hospObjects.push(m);return m;};
  const _addNS=m=>{hospScene.add(m);hospObjects.push(m);return m;};
  const _box=(w,h,d,col,em,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshLambertMaterial({color:col,emissive:em||0}));
    m.position.set(x,y,z);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    _add(m);return m;
  };
  const _cyl=(rt,rb,h,seg,col,em,x,y,z,rx)=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),
      new THREE.MeshLambertMaterial({color:col,emissive:em||0}));
    m.position.set(x,y,z);if(rx)m.rotation.x=rx;
    _add(m);return m;
  };

  // ════════════════════════════
  // תאורה — חולנית אבל נראית
  // ════════════════════════════
  hospScene.add(new THREE.AmbientLight(0x1a1e2e,5.5));
  hospScene.add(new THREE.HemisphereLight(0x1a2040,0x0a1008,2.2));

  // נאון ראשי — מסדרון מרכזי
  [[-16,7.5,0],[0,7.5,0],[16,7.5,0]].forEach(([x,y,z],i)=>{
    const L=new THREE.PointLight(0xaabbff,4.5,28);
    L.position.set(x,y,z);_addNS(L);
    _hospFlickerLights.push({light:L,base:4.5,type:'fluorescent',t:i*0.4,period:0.08+i*0.03});
  });

  // אורות מסדרון שמאל — ירוק-לבן
  [[-12,6,-10],[-12,6,8]].forEach(([x,y,z])=>{
    const L=new THREE.PointLight(0x88ddaa,3.2,22);
    L.position.set(x,y,z);_addNS(L);
    _hospFlickerLights.push({light:L,base:3.2,type:'flicker',t:Math.random(),period:0.18});
  });

  // אור אדום חירום — עמום אבל נוכח
  [[-5,3.5,-12],[5,3.5,-12],[0,3,-18]].forEach(([x,y,z],i)=>{
    const L=new THREE.PointLight(0xff2200,1.8,12);
    L.position.set(x,y,z);_addNS(L);
    _hospFlickerLights.push({light:L,base:1.8,type:'pulse',t:i*1.1,period:2.2});
  });

  // אור ירוק ב-arena של Z-07
  const arenaMainL=new THREE.PointLight(0x44bb66,3.0,20);
  arenaMainL.position.set(0,7,-16);_addNS(arenaMainL);
  _hospFlickerLights.push({light:arenaMainL,base:3.0,type:'flicker',t:0.8,period:0.22});

  // ════════════════════════════
  // רצפה — גדולה יותר (52x40)
  // ════════════════════════════
  _box(52,0.1,40,0x0e0f14,0x010101,0,0,0);
  // אריחים
  for(let tx=-12;tx<=12;tx+=2){
    for(let tz=-9;tz<=9;tz+=2){
      if(Math.random()<0.12){
        _box(1.9,0.04,0.9,0x0c0d10,0,tx,0.06,tz);
      } else {
        _box(1.85,0.03,1.85,0x101218,0,tx,0.06,tz);
      }
    }
  }
  // כתמי לחות כהים
  [[0,-3],[5,2],[-4,6],[3,-8],[-6,-5],[7,4]].forEach(([sx,sz])=>{
    const st=new THREE.Mesh(new THREE.PlaneGeometry(1.5+Math.random()*2,1+Math.random()*1.5),
      new THREE.MeshLambertMaterial({color:0x050608,transparent:true,opacity:0.85}));
    st.rotation.x=-Math.PI/2;st.position.set(sx,0.02,sz);_addNS(st);
  });
  // כתמי דם על הרצפה
  [[-8,3],[-9,-1],[-10,5],[-7,-4]].forEach(([bx,bz])=>{
    const bl=new THREE.Mesh(new THREE.PlaneGeometry(0.4+Math.random()*0.7,0.3+Math.random()*0.5),
      new THREE.MeshLambertMaterial({color:0x2a0000,transparent:true,opacity:0.9}));
    bl.rotation.x=-Math.PI/2;bl.position.set(bx,0.02,bz);_addNS(bl);
  });

  // ════════════════════════════
  // קירות — בטון מצהיב עם טפטים קרועים
  // ════════════════════════════
  const wCol=0x14151c,wEm=0x010101;
  // קיר צפון
  _box(52,9,0.3,wCol,wEm,0,4.5,-19.85);
  // קיר דרום
  _box(52,9,0.3,wCol,wEm,0,4.5,19.85);
  // קיר מערב
  _box(0.3,9,40,wCol,wEm,-25.85,4.5,0);
  // קיר מזרח — עם דלת יציאה
  _box(0.3,9,16,wCol,wEm,25.85,4.5,-8);
  _box(0.3,9,10,wCol,wEm,25.85,4.5,11);
  // משקוף דלת יציאה
  _box(0.3,2.2,4,wCol,wEm,25.85,8.1,3);

  // פאנלים — טפט ממוסד ישן מתקלף
  const tapetM=new THREE.MeshLambertMaterial({color:0x1a1c22,emissive:0x020202});
  for(let i=0;i<13;i++){
    const pw=3.2+Math.random()*0.5, ph=3+Math.random()*0.8;
    const panel=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,0.08),tapetM);
    panel.position.set(-24+i*4,3.5+Math.random()*0.5,-19.75);_addNS(panel);
  }
  // פסי עובש ירוק על הקירות
  [[0,1.5,-15.7],[0,1.5,15.7],[-15.7,1.5,0]].forEach(([wx,wy,wz])=>{
    const mold=new THREE.Mesh(new THREE.PlaneGeometry(12+Math.random()*6,1.2+Math.random()*0.6),
      new THREE.MeshLambertMaterial({color:0x0a1a06,emissive:0x020602,transparent:true,opacity:0.7}));
    mold.rotation.x=wx===0?0:-Math.PI/2;
    if(wx!==0)mold.rotation.y=Math.PI/2;
    mold.position.set(wx,wy,wz);_addNS(mold);
  });

  // ════════════════════════════
  // תקרה — בטון סדוק עם צינורות
  // ════════════════════════════
  _box(32.4,0.4,32.4,0x0e0f14,0x010101,0,9,0);
  // קורות בטון
  for(let b=-3;b<=3;b+=3){
    _box(32,0.5,0.6,0x0c0d10,0,0,8.75,b);
    _box(0.6,0.5,32,0x0c0d10,0,b,8.75,0);
  }
  // צינורות עיגולים על התקרה
  [[-6,8.6,-6],[4,8.6,-6],[-6,8.6,4],[4,8.6,4]].forEach(([x,y,z])=>{
    _cyl(0.18,0.18,32,6,0x0d0e12,0,x,y,z,Math.PI/2);
    // חיבורי ט-pipe
    _cyl(0.16,0.16,2,6,0x0b0c10,0,x,y-0.9,z);
  });
  // נורות פלואורסנט — חלקן שבורות
  [[-7,8.5,-6],[1,8.5,-6],[9,8.5,-6],[-7,8.5,4],[3,8.5,4]].forEach(([x,y,z],i)=>{
    _box(3.5,0.1,0.2,0x181920,0,x,y,z);
    const broken=i===2||i===4;
    const tubeM=new THREE.MeshLambertMaterial({
      color:broken?0x111214:0xbbccff,
      emissive:broken?0:0x4466cc
    });
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,3.3,8),tubeM);
    tube.rotation.z=Math.PI/2;tube.position.set(x,y-0.1,z);_addNS(tube);
    if(!broken){
      const fl=new THREE.PointLight(0x8899ff,2.2,12);fl.position.set(x,y-0.5,z);_addNS(fl);
      _hospFlickerLights.push({light:fl,base:2.2,type:'fluorescent',t:i*0.7,period:0.06+i*0.02});
    }
  });

  // ════════════════════════════
  // מסדרון — חדרים צדדיים
  // ════════════════════════════
  // מחיצה מסדרון שמאל
  _box(0.2,9,28,wCol,wEm,-8,4.5,2);
  // פתחי חדרים (דלתות שבורות)
  [[-3],[3],[9]].forEach(([dz])=>{
    const doorM=new THREE.MeshLambertMaterial({color:0x0c0d10,emissive:0x010101});
    const door=new THREE.Mesh(new THREE.BoxGeometry(0.15,3.2,1.6),doorM);
    door.position.set(-5.9,1.6,dz);door.rotation.y=0.4+Math.random()*0.3;_add(door);
    // מסגרת
    _box(0.2,3.5,0.1,0x181920,0,-6.05,1.75,dz-0.9);
    _box(0.2,3.5,0.1,0x181920,0,-6.05,1.75,dz+0.9);
    _box(0.2,0.1,1.8,0x181920,0,-6.05,3.5,dz);
    // מספר חדר
    const numM=new THREE.MeshBasicMaterial({color:0x2a2a3a});
    const num=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.3,0.2),numM);
    num.position.set(-5.9,2.8,dz);_addNS(num);
  });

  // ════════════════════════════
  // רהיטים — עגומים ונטושים
  // ════════════════════════════
  // מיטות בית חולים הפוכות/שבורות
  const bedFrameM=new THREE.MeshLambertMaterial({color:0x181920,emissive:0x010101});
  const mattM=new THREE.MeshLambertMaterial({color:0x1a1c20,emissive:0x010101});
  [
    [4,0,2, 0.1],
    [7,0,-2, -0.15],
    [-3,0,-6, 0.05],
    [2,0,-10, 0.2],
  ].forEach(([bx,by,bz,tilt])=>{
    const frame=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.15,0.9),bedFrameM);
    frame.position.set(bx,0.45,bz);frame.rotation.z=tilt;_add(frame);
    const matt=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.12,0.85),mattM);
    matt.position.set(bx,0.54,bz);matt.rotation.z=tilt;_add(matt);
    // רגליים
    [[-0.85,0.2],[-0.85,-0.2],[0.85,0.2],[0.85,-0.2]].forEach(([lx,lz])=>{
      _box(0.08,0.45,0.08,0x141518,0,bx+lx,0.22,bz+lz);
    });
    // כרית קרועה
    const pilM=new THREE.MeshLambertMaterial({color:0x14151a,emissive:0x010101});
    const pil=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.1,0.38),pilM);
    pil.position.set(bx+0.65,0.62,bz);pil.rotation.z=tilt+0.1;_add(pil);
  });

  // כיסא גלגלים שבור
  const chairM=new THREE.MeshLambertMaterial({color:0x141416,emissive:0x010101});
  _box(0.45,0.08,0.4,0x141416,0,-2,0.5,6); // מושב
  _box(0.08,0.55,0.35,chairM,0,-2,0.28,6); // רגל אמצע
  _box(0.4,0.5,0.05,chairM,0,-2,0.25,5.8);  // גב
  // גלגל
  _cyl(0.2,0.2,0.06,12,0x0a0a0c,0,-2.25,0.2,6,Math.PI/2);
  _cyl(0.2,0.2,0.06,12,0x0a0a0c,0,-1.75,0.2,6,Math.PI/2);

  // שולחן עגול קטן — עם תיק/קופסאות
  _box(0.8,0.06,0.8,0x181a1e,0,9,0.68,2);
  _cyl(0.06,0.08,0.68,6,0x141518,0,9,0.34,2);
  // קופסת תרופות על השולחן
  _box(0.2,0.1,0.12,0x1a1c22,0x020202,9.2,0.76,2);
  _box(0.16,0.08,0.1,0x0e1018,0,8.85,0.76,2.1);

  // ========================
  // ריהוט מסדרון — חולי נפש
  // ========================
  // לוח מחיקה ישן עם כתיבה מוזרה
  _box(3.2,1.8,0.1,0x0c0e12,0,-14,3.5,-10);
  // "כתיבה" — פסי גיר על הלוח
  [[0,0.2],[0.3,-0.3],[-0.4,0.1],[0.5,0.4],[-0.2,-0.2]].forEach(([cx,cy])=>{
    const chalk=new THREE.Mesh(new THREE.BoxGeometry(0.8+Math.random()*0.6,0.04,0.04),
      new THREE.MeshBasicMaterial({color:0x3a3c50}));
    chalk.position.set(-14+cx,3.5+cy,-9.94);_addNS(chalk);
  });

  // כרסא טיפול ישן — עם רצועות
  _box(0.7,0.1,1.4,0x1a1818,0,7,0.45,-12); // מושב
  _box(0.7,0.85,0.1,0x1a1818,0,7,0.9,-11.35); // גב
  // רצועות
  [[7.25,0.5,-12.4],[6.75,0.5,-12.4],[7.25,0.5,-11.6],[6.75,0.5,-11.6]].forEach(([rx,ry,rz])=>{
    _box(0.08,0.06,0.45,0x2a2018,0,rx,ry,rz);
  });

  // ========================
  // פרטים מפחידים
  // ========================
  // שלט "מחלקה ג'" נופל מהקיר
  const signM2=new THREE.MeshLambertMaterial({color:0x1a1c22,emissive:0x020202});
  const sign2=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.7,0.1),signM2);
  sign2.position.set(0,5.5,-15.7);sign2.rotation.z=0.25;_addNS(sign2);

  // מסמכים/ניירות פזורים על הרצפה
  [[-1,3],[2,5],[-3,1],[4,-2],[0,-6],[-5,4]].forEach(([px,pz])=>{
    const paper=new THREE.Mesh(new THREE.PlaneGeometry(0.35+Math.random()*0.2,0.28+Math.random()*0.15),
      new THREE.MeshLambertMaterial({color:0x1a1c20,emissive:0x020202}));
    paper.rotation.x=-Math.PI/2;paper.rotation.z=Math.random()*Math.PI;
    paper.position.set(px,0.02,pz);_addNS(paper);
  });

  // ========================
  // Z-07 ARENA — בסוף הכניסה
  // ========================
  // ריצפת arena שונה
  _box(14,0.12,14,0x0a0a0e,0x010101,0,0.01,-16);
  // כלוב ברזל — המקום שZ-07 היה בו
  const cageM=new THREE.MeshLambertMaterial({color:0x0c0c10,emissive:0x010101});
  for(let ci=-2;ci<=2;ci++){
    _box(0.1,4,0.1,cageM,0,ci*1.4-5,2,-18.5);
    _box(0.1,4,0.1,cageM,0,ci*1.4+5,2,-18.5);
  }
  _box(5.4,0.1,0.1,cageM,0,-5,4,-18.5);
  _box(5.4,0.1,0.1,cageM,0,5,4,-18.5);
  // שרשראות מהכלוב
  for(let lk=0;lk<5;lk++){
    _box(0.12,0.2,0.08,0x181818,0,-5,4-lk*0.22,-18.3,0,lk%2===0?0:Math.PI/2);
    _box(0.12,0.2,0.08,0x181818,0,5,4-lk*0.22,-18.3,0,lk%2===0?0:Math.PI/2);
  }
  // כתם גדול בתוך הכלוב
  const arenaBlood=new THREE.Mesh(new THREE.PlaneGeometry(3.5,3),
    new THREE.MeshLambertMaterial({color:0x1a0000,transparent:true,opacity:0.85}));
  arenaBlood.rotation.x=-Math.PI/2;arenaBlood.position.set(0,0.02,-10.5);_addNS(arenaBlood);

  // אור Z-07 arena — אדום מרתפי
  const arenaL=new THREE.PointLight(0xaa0000,3.5,18);
  arenaL.position.set(0,5,-16);_addNS(arenaL);
  _hospFlickerLights.push({light:arenaL,base:3.5,type:'pulse',t:0,period:1.5});

  // ========================
  // דלת יציאה
  // ========================
  const exitM=new THREE.MeshLambertMaterial({color:0x0c0e12,emissive:0x010101});
  const exitDoor=new THREE.Mesh(new THREE.BoxGeometry(0.15,3.2,1.8),exitM);
  exitDoor.position.set(25.7,1.6,3);_addNS(exitDoor);
  // שלט יציאה ירוק דולק מעל הדלת
  const exitSign=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.35,0.08),
    new THREE.MeshLambertMaterial({color:0x003300,emissive:0x005500}));
  exitSign.position.set(25.7,4.5,3);_addNS(exitSign);
  const exitL=new THREE.PointLight(0x00aa22,0.8,5);
  exitL.position.set(25.5,4.2,3);_addNS(exitL);

  // ========================
  // אינדיקטור Z-07
  // ========================
  const z07ind=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),
    new THREE.MeshBasicMaterial({color:0xff0000}));
  z07ind.position.set(0,3,-16);_addNS(z07ind);
  G._hospZ07Ind=z07ind;
}

// ════════════════════════════════════════════════
// enterHosp / exitHosp
// ════════════════════════════════════════════════
function enterHosp(){
  _lodStaticObjs=null;_lodShadowObjs=null;
  G.paused=true;
  fadeOut(()=>{
    if(!hospScene)buildHospScene();
    HOSP.inHosp=true;
    HOSP.playerX=0;HOSP.playerZ=12;HOSP.playerYaw=Math.PI;
    G.yaw=Math.PI;HOSP.enterGrace=2.5;
    if(hospCamera){
      hospCamera.position.set(0,4,16);
      hospCamera.lookAt(0,1,0);
    }
    scene.remove(PB);
    hospScene.add(PB);
    PB.position.set(HOSP.playerX,0,HOSP.playerZ);
    // ספון חיילי על בתוך ה-scene
    _hospSpawnSoldiers();
    showN('🏥 מרכז גהה. 20 שנה נטוש.\nמשהו זז כאן.');
    G.paused=false;
    fadeIn();
  });
}

function exitHosp(){
  G.paused=true;
  fadeOut(()=>{
    HOSP.inHosp=false;
    if(hospScene)hospScene.remove(PB);
    scene.add(PB);
    PB.position.set(SHAFIYA_X,0,SHAFIYA_Z+8);
    hospObjects.forEach(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
    hospObjects.length=0;
    hospScene=null;hospCamera=null;
    G._hospZ07Ind=null;
    G.paused=false;
    fadeIn();
  });
}

// ════════════════════════════════════════════════
// חיילי על בתוך ה-interior
// ════════════════════════════════════════════════
function _hospSpawnSoldiers(){
  if(_superSoldiers.length>0)return;
  if(!hospScene)return;
  const positions=[[6,0,4],[-4,0,2],[2,0,-4]];
  positions.forEach(([x,y,z])=>{
    const mesh=mkSuperSoldier(0x1a1a2e);
    mesh.position.set(x,y,z);
    hospScene.add(mesh);
    const bar=hpBar(mesh,1.8,2.8);
    // HP bar צריך להיות ב-hospScene
    if(bar.parent)bar.parent.remove(bar);
    hospScene.add(bar);
    _superSoldiers.push({
      mesh,bar,hp:SUPER_HP,mhp:SUPER_HP,spd:SUPER_SPD,
      atk:SUPER_ATK,atkT:0,state:'patrol',
      homeX:x,homeZ:z,patAng:Math.random()*Math.PI*2,patT:2,
      lastSeenX:0,lastSeenZ:0,searchT:0,
      _chargeT:0,_chargeReady:false,_chargeActive:false,
      _cvx:0,_cvz:0,_slamT:0,_howlT:0,
      _hitFlash:0,_isSuperSoldier:true
    });
  });
}

// ════════════════════════════════════════════════
// mkZ07Model — מודל ייחודי ל-Z-07: זיפו על סטרואידים
// ════════════════════════════════════════════════
function mkZ07Model(){
  const BK=new THREE.MeshLambertMaterial({color:0x080810,emissive:0x030308});
  const DK=new THREE.MeshLambertMaterial({color:0x050508,emissive:0x020205});
  const SC=new THREE.MeshLambertMaterial({color:0x2a1018,emissive:0x0a0408}); // צלקות
  const AR=new THREE.MeshLambertMaterial({color:0x1a1a24,emissive:0x080810}); // שריון
  const IMPL=new THREE.MeshLambertMaterial({color:0x141428,emissive:0x0a0a1e}); // שתלים
  const EY=new THREE.MeshBasicMaterial({color:0xff0000});
  const EYDM=new THREE.MeshBasicMaterial({color:0x220000}); // עין פגועה
  const TUBE=new THREE.MeshLambertMaterial({color:0x1a1a1a,emissive:0x080808});

  const g=new THREE.Group();
  const S=1.35; // scale factor vs regular soldier

  const _m=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set((x||0),(y||0),(z||0));
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.castShadow=true;g.add(m);return m;
  };

  // ── גוף ── (מסיבי — פי 1.35)
  _m(new THREE.BoxGeometry(0.9*S,0.72*S,1.3*S), BK, 0,0.65*S,0.05*S);
  // חזה רחב במיוחד
  _m(new THREE.BoxGeometry(1.0*S,0.55*S,0.62*S), BK, 0,0.76*S,0.52*S);
  // לוחית שריון על החזה — פגומה
  _m(new THREE.BoxGeometry(0.78*S,0.44*S,0.12*S), AR, 0,0.8*S,0.8*S);
  _m(new THREE.BoxGeometry(0.38*S,0.42*S,0.1*S), AR, -0.18*S,0.78*S,0.82*S); // פיצול שריון שמאל
  // בורג/אחיזה על השריון
  _m(new THREE.CylinderGeometry(0.04*S,0.04*S,0.1*S,6), IMPL, 0.2*S,0.9*S,0.84*S);
  _m(new THREE.CylinderGeometry(0.04*S,0.04*S,0.1*S,6), IMPL, -0.2*S,0.7*S,0.84*S);
  // אחורי — שרירי
  _m(new THREE.BoxGeometry(0.82*S,0.58*S,0.48*S), DK, 0,0.62*S,-0.5*S);
  // בטן
  _m(new THREE.BoxGeometry(0.72*S,0.32*S,0.42*S), BK, 0,0.42*S,0.28*S);
  // צלעות
  [-0.16,-0.02,0.12].forEach(oy=>{
    _m(new THREE.BoxGeometry(0.76*S,0.065*S,0.065*S), SC, 0,0.44*S+oy,0.22*S);
  });

  // ── שתלי עמוד שדרה — שורה של ניסויים ──
  [0.58,0.42,0.26,0.1].forEach((sy,i)=>{
    _m(new THREE.BoxGeometry(0.14*S,0.14*S,0.12*S), IMPL, 0,sy*S,-0.52*S);
    // חיבור צינור בין שתלים
    if(i<3)_m(new THREE.CylinderGeometry(0.025*S,0.025*S,0.16*S,6), TUBE, 0,(sy-0.08)*S,-0.52*S);
  });

  // ── צוואר ──
  _m(new THREE.BoxGeometry(0.5*S,0.42*S,0.48*S), BK, 0,1.14*S,0.4*S);
  // קולר שבור — מתכת
  _m(new THREE.BoxGeometry(0.58*S,0.1*S,0.58*S), AR, 0,1.26*S,0.4*S);
  // שרשרת קולר שבורה — קטע אחד חסר
  [-0.22,-0.1,0.1,0.22].forEach(cx=>{
    _m(new THREE.BoxGeometry(0.08*S,0.06*S,0.06*S), TUBE, cx*S,1.27*S,0.68*S);
  });

  // ── ראש ── 
  const hG=new THREE.Group();
  hG.position.set(0,1.42*S,0.65*S);hG.rotation.x=0.18;g.add(hG);

  const _mH=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x||0,y||0,z||0);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.castShadow=true;hG.add(m);return m;
  };

  // גולגולת — גדולה ומרובעת
  _mH(new THREE.BoxGeometry(0.66*S,0.62*S,0.72*S), BK, 0,0,0);
  // לחיים מסיביות
  _mH(new THREE.BoxGeometry(0.22*S,0.32*S,0.38*S), DK, -0.3*S,-0.05*S,0.08*S);
  _mH(new THREE.BoxGeometry(0.22*S,0.32*S,0.38*S), DK,  0.3*S,-0.05*S,0.08*S);
  // מצח — גבה וקמוט
  _mH(new THREE.BoxGeometry(0.6*S,0.22*S,0.26*S), BK, 0,0.26*S,0.24*S);
  // קמטי מצח
  [-0.14,0.14].forEach(cx=>{
    _mH(new THREE.BoxGeometry(0.04*S,0.18*S,0.06*S), SC, cx*S,0.24*S,0.3*S,0.3);
  });

  // לוט — מוארך עם ביטוי כועס
  _mH(new THREE.BoxGeometry(0.36*S,0.26*S,0.44*S), BK, 0,-0.16*S,0.3*S);
  // אף
  const ns=new THREE.Mesh(new THREE.SphereGeometry(0.11*S,8,8), DK);
  ns.scale.set(1,0.7,0.88);ns.position.set(0,0.02*S,0.38*S);ns.castShadow=true;hG.add(ns);
  // חניכיים נראות
  _mH(new THREE.BoxGeometry(0.3*S,0.06*S,0.06*S), SC, 0,-0.26*S,0.34*S);

  // שיניים — בולטות
  [-0.08,0,0.08].forEach(tx=>{
    _mH(new THREE.BoxGeometry(0.06*S,0.1*S,0.04*S),
      new THREE.MeshLambertMaterial({color:0xddd8c0,emissive:0x0a0a08}),
      tx*S,-0.22*S,0.38*S);
  });

  // ── עיניים ──
  // עין שמאל — שלמה, אדומה בוערת
  const eGL=new THREE.Group();
  eGL.position.set(-0.2*S,0.1*S,0.32*S);hG.add(eGL);

  const eyeBaseL=new THREE.Mesh(new THREE.SphereGeometry(0.098*S,10,10),
    new THREE.MeshLambertMaterial({color:0x0a0005,emissive:0x040002}));
  eyeBaseL.castShadow=true;eGL.add(eyeBaseL);
  const pupilL=new THREE.Mesh(new THREE.SphereGeometry(0.068*S,8,8),EY);
  pupilL.position.z=0.065*S;eGL.add(pupilL);
  const glowL=new THREE.Mesh(new THREE.SphereGeometry(0.082*S,8,8),
    new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:0.5}));
  glowL.position.z=0.052*S;eGL.add(glowL);
  // אור נקודתי מהעין השמאלית
  const eyeLightL=new THREE.PointLight(0xff0000,1.2,3.5);
  eyeLightL.position.set(-0.2*S,0.1*S,0.42*S);hG.add(eyeLightL);
  g._eyeL=pupilL;g._eyeLLight=eyeLightL;

  // עין ימין — פגועה, כבה — צלקת מעל
  const eGR=new THREE.Group();
  eGR.position.set(0.2*S,0.1*S,0.32*S);hG.add(eGR);
  const eyeBaseR=new THREE.Mesh(new THREE.SphereGeometry(0.098*S,10,10),
    new THREE.MeshLambertMaterial({color:0x060005,emissive:0x020001}));
  eyeBaseR.castShadow=true;eGR.add(eyeBaseR);
  const pupilR=new THREE.Mesh(new THREE.SphereGeometry(0.068*S,8,8),EYDM);
  pupilR.position.z=0.065*S;eGR.add(pupilR);
  g._eyeR=pupilR;
  // צלקת על עין ימין
  _mH(new THREE.BoxGeometry(0.06*S,0.22*S,0.06*S), SC, 0.2*S,0.1*S,0.35*S, 0.3,0,0.25);
  _mH(new THREE.BoxGeometry(0.04*S,0.18*S,0.04*S), SC, 0.22*S,0.06*S,0.36*S, 0.4,0,-0.3);

  // ── אוזניים — שבורות, אחת קרועה ──
  [-1,1].forEach(sd=>{
    const eG=new THREE.Group();
    eG.position.set(sd*0.3*S,0.26*S,-0.15*S);
    eG.rotation.z=sd*0.4;eG.rotation.x=-0.7;hG.add(eG);
    const earM=new THREE.Mesh(new THREE.BoxGeometry(0.16*S,0.32*S,0.1*S),BK);
    earM.position.y=0.16*S;earM.castShadow=true;eG.add(earM);
    if(sd===1){ // אוזן ימין — קרועה
      const tearM=new THREE.Mesh(new THREE.BoxGeometry(0.08*S,0.14*S,0.1*S),SC);
      tearM.position.set(0.04*S,0.26*S,0);eG.add(tearM);
    }
  });

  // ── שתל גולגולת ──
  _mH(new THREE.BoxGeometry(0.22*S,0.1*S,0.26*S), IMPL, 0,0.34*S,-0.12*S);
  _mH(new THREE.BoxGeometry(0.08*S,0.16*S,0.08*S), IMPL, -0.08*S,0.44*S,-0.1*S);
  _mH(new THREE.BoxGeometry(0.08*S,0.16*S,0.08*S), IMPL,  0.08*S,0.44*S,-0.1*S);
  // LED אדום על השתל — כבה (Phase 3)
  const crownLed=new THREE.Mesh(new THREE.BoxGeometry(0.05*S,0.05*S,0.05*S),
    new THREE.MeshBasicMaterial({color:0xff0000}));
  crownLed.position.set(0,0.5*S,-0.1*S);hG.add(crownLed);
  g._crownLed=crownLed;

  // ── כתפיים — מכוסות שריון ──
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.36*S,0.36*S,0.58*S), BK, sd*0.66*S,0.86*S,0.3*S);
    // כיסוי כתף
    _m(new THREE.BoxGeometry(0.4*S,0.16*S,0.54*S), AR, sd*0.66*S,1.04*S,0.28*S);
    // זרוע קדמית עבה
    _m(new THREE.BoxGeometry(0.28*S,0.58*S,0.26*S), DK, sd*0.7*S,0.56*S,0.38*S);
    // ברך קדמית
    _m(new THREE.BoxGeometry(0.24*S,0.52*S,0.24*S), BK, sd*0.64*S,0.16*S,0.46*S);
    // כף עם טפרים ארוכים
    _m(new THREE.BoxGeometry(0.26*S,0.18*S,0.3*S), DK, sd*0.62*S,-0.1*S,0.52*S);
    [-0.1,0,0.1].forEach(cx=>{
      _m(new THREE.BoxGeometry(0.05*S,0.16*S,0.05*S), DK, sd*0.62*S+cx*sd,-0.24*S,0.6*S);
    });
    // שתל כתף
    _m(new THREE.BoxGeometry(0.32*S,0.12*S,0.2*S), IMPL, sd*0.72*S,0.98*S,0.22*S);
    _m(new THREE.CylinderGeometry(0.035*S,0.035*S,0.12*S,6), IMPL, sd*0.76*S,0.96*S,0.2*S);
  });

  // ── רגליים אחוריות — עמודי בטון ──
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.34*S,0.52*S,0.36*S), BK, sd*0.32*S,0.0*S,-0.32*S);
    _m(new THREE.BoxGeometry(0.3*S,0.38*S,0.32*S), DK, sd*0.3*S,-0.42*S,-0.24*S);
    _m(new THREE.BoxGeometry(0.28*S,0.16*S,0.42*S), BK, sd*0.28*S,-0.64*S,-0.1*S);
    [-0.1,0,0.1].forEach(cx=>{
      _m(new THREE.BoxGeometry(0.05*S,0.12*S,0.05*S), DK, sd*0.28*S+cx*sd,-0.76*S,0.04*S);
    });
    // שתל ברך
    _m(new THREE.BoxGeometry(0.3*S,0.1*S,0.3*S), IMPL, sd*0.3*S,-0.06*S,-0.22*S);
  });

  // ── זנב קצר כועס ──
  const tG=new THREE.Group();tG.position.set(0,0.78*S,-0.66*S);tG.rotation.x=0.5;g.add(tG);
  const t1=new THREE.Mesh(new THREE.CylinderGeometry(0.12*S,0.08*S,0.32*S,8),BK);
  t1.position.y=0.16*S;t1.castShadow=true;tG.add(t1);
  g._tail=tG;

  // ── צלקות גדולות על הגוף ──
  [
    [0,0.72*S,0.62*S, 0,0,0.4],
    [-0.3*S,0.52*S,0.58*S, 0,0,-0.3],
    [0.2*S,0.38*S,0.62*S, 0.2,0,0.15],
    [0,0.62*S,-0.4*S, 0,0,0.2],
  ].forEach(([x,y,z,rx,ry,rz])=>{
    _m(new THREE.BoxGeometry(0.045*S,0.42*S,0.045*S), SC, x,y,z,rx,ry,rz);
  });

  // ── אורת הילה ──
  const aura=new THREE.PointLight(0xff0000,2.5,8);
  aura.position.set(0,1.5*S,0);g.add(aura);g._aura=aura;

  g.castShadow=true;
  return g;
}

function _buildZ07Interior(){
  if(_z07Enemy)return;
  const mesh=mkZ07Model(); // מודל ייחודי ל-Z-07
  mesh.position.set(0,0,-16);
  if(hospScene)hospScene.add(mesh);

  const bar=hpBar(mesh,2.8,3.8);
  bar.material.color.setHex(0xff0000);
  if(bar.parent)bar.parent.remove(bar);
  if(hospScene)hospScene.add(bar);

  _z07Enemy={
    mesh,bar,x:0,z:-10,
    hp:Z07_HP,mhp:Z07_HP,spd:Z07_SPD,
    x:0,z:-16,
    atk:3.8,atkT:0,dead:false,
    _phase:1,_chargeT:0,_chargeActive:false,_cvx:0,_cvz:0,
    _slamT:0,_howlT:0,_hitT:0,_hitCD:0,_ctrlOff:false
  };
  G._z07Enemy=_z07Enemy;
}

// ════════════════════════════════════════════════
// updHosp — לולאת פנים בית החולים
// ════════════════════════════════════════════════
function updHosp(dt){
  if(!HOSP.inHosp||G.paused||G.dlgOpen)return;
  HOSP.enterGrace=Math.max(0,(HOSP.enterGrace||0)-dt);
  if(G.atkCD>0)G.atkCD-=dt;
  const _hospAtkCD=G.dog==='zippo'?0.28:0.5;
  if(G.keys['KeyF']&&G.atkCD<=0){G._hospAtk=true;G.atkCD=_hospAtkCD;sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);}

  // ── flickering lights ──
  _hospFlickerT+=dt;
  _hospFlickerLights.forEach(fl=>{
    fl.t+=dt;const L=fl.light;if(!L)return;
    switch(fl.type){
      case'flicker':if(fl.t>fl.period){fl.t=0;fl.period=0.08+Math.random()*0.25;L.intensity=Math.random()<0.12?0:fl.base*(0.6+Math.random()*0.7);}break;
      case'fluorescent':if(fl.t>fl.period){fl.t=0;fl.period=0.04+Math.random()*0.08;L.intensity=Math.random()<0.05?0:fl.base*(0.85+Math.random()*0.3);}break;
      case'pulse':L.intensity=fl.base*(0.5+0.5*Math.sin(fl.t*Math.PI*2/fl.period));break;
      case'arc':L.intensity=Math.max(0,fl.base*(0.5+Math.sin(fl.t*80)*0.3+Math.random()*0.5));break;
    }
  });

  // ── תנועה ──
  const spd=G.dogs[G.dog].spd;
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));
  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])   {inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']) {inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']) {inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}
  const iln=Math.hypot(inputX,inputZ)||1;
  let nx=HOSP.playerX+(inputX/iln)*spd*dt;
  let nz=HOSP.playerZ+(inputZ/iln)*spd*dt;
  nx=Math.max(-24,Math.min(24,nx));
  nz=Math.max(-18,Math.min(18,nz));
  HOSP.playerX=nx;HOSP.playerZ=nz;
  PB.position.set(HOSP.playerX,0,HOSP.playerZ);

  // ── אנימציית הליכה ──
  const _hMoving=Math.abs(inputX)>.01||Math.abs(inputZ)>.01;
  if(_hMoving){
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y+=(_by-dogModel.position.y)*.15;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }
  if(Math.abs(inputX)>.01||Math.abs(inputZ)>.01)
    PB.rotation.y=Math.atan2(-inputX,-inputZ);

  // ── מצלמה ──
  if(hospCamera){
    const sz=G.dog==='momo'?.58:1,cd=8,ch=4+G.pitch*6;
    const hpx=HOSP.playerX,hpy=1.1*sz,hpz=HOSP.playerZ;
    _vCamTarget.set(hpx+Math.sin(G.yaw)*cd,hpy+ch,hpz+Math.cos(G.yaw)*cd);
    hospCamera.position.lerp(_vCamTarget,.1);
    hospCamera.lookAt(hpx,hpy+.7,hpz);
  }

  // ── חיילי על בתוך ה-interior ──
  const dog=G.dogs[G.dog];
  _superSoldiers.forEach(e=>{
    if(e.hp<=0||!e.mesh.visible)return;
    const ex=e.mesh.position.x,ez=e.mesh.position.z;
    const px=HOSP.playerX,pz=HOSP.playerZ;
    const dd=d2(ex,ez,px,pz);

    e.atkT=Math.max(0,e.atkT-dt);
    e._chargeT=Math.max(0,e._chargeT-dt);
    e._slamT=Math.max(0,e._slamT-dt);

    // state
    if(dd<14){e.state='chase';e.lastSeenX=px;e.lastSeenZ=pz;}
    else if(e.state==='chase'){e.searchT-=dt;if(e.searchT<=0)e.state='patrol';}
    if(e.state!=='chase')return;

    // charge
    if(!e._chargeActive&&e._chargeT<=0&&dd>5&&dd<12){
      e._chargeT=5.5;
      showN('⚡ חייל על טוען...');
      setTimeout(()=>{
        if(e.hp<=0)return;
        e._chargeActive=true;
        const dx2=px-e.mesh.position.x,dz2=pz-e.mesh.position.z;
        const l=Math.sqrt(dx2*dx2+dz2*dz2)||1;
        e._cvx=dx2/l*18;e._cvz=dz2/l*18;
        setTimeout(()=>{e._chargeActive=false;e._cvx=0;e._cvz=0;},600);
      },900);
    }

    if(e._chargeActive){
      e.mesh.position.x+=e._cvx*dt;e.mesh.position.z+=e._cvz*dt;
      if(d2(e.mesh.position.x,e.mesh.position.z,px,pz)<2.8){
        dmgPlayer(14);e._chargeActive=false;haptic([40,15,40]);showN('💥 ריסוק!');
      }
    } else {
      const dx=px-ex,dz=pz-ez,l=Math.sqrt(dx*dx+dz*dz)||1;
      e.mesh.position.x+=dx/l*e.spd*dt;
      e.mesh.position.z+=dz/l*e.spd*dt;
      e.mesh.rotation.y=Math.atan2(dx,dz);
      if(e._slamT<=0&&dd<3.5){
        e._slamT=4.0;haptic([60,20,60]);dmgPlayer(16);showN('🔨 מחיצה!');
      }
      if(dd<e.atk&&e.atkT<=0){e.atkT=1.6;dmgPlayer(10);haptic(25);}
    }

    // פגיעת שחקן
    if(dd<4.5&&(G._hospAtk||G._atkFrame)&&e.hp>0){
      G._hospAtk=false;
      const dmg=Math.round(dog.pow*10*(1+dog.lv*.1));
      e.hp-=dmg;flash(e.mesh.children[0]);
      spawnBlood(ex,1,ez,8);showDmg(ex,1,ez,Math.round(dmg));haptic(22);
      if(e.hp<=0){
        e.hp=0;e.mesh.visible=false;sEDie();
        haptic([60,20,50]);addXP(50);G.score+=150;G.coins+=20;updCoins();
        showN('✅ חייל על הוכנע!');
        const alive=_superSoldiers.filter(s=>s.hp>0&&s.mesh.visible).length;
        if(alive===0&&G.mission===35){
          showN('✅ המסדרון נוקה. התקדמו לעומק הבניין...');
          setTimeout(()=>{
            setMission(36);
            setTimeout(()=>showCut('ch7_katz_intercom',()=>{
              setMission(37);
              showN('🔒 הדלתות ננעלות. רדו לתחתית.');
              setTimeout(()=>showN('🔒 הדלתות ננעלות!\nקולין: "אנחנו לא מתפצלים."\nרדו לתחתית.'),500);
            }),1000);
          },1500);
        }
      }
    }
    if(e.bar)e.bar.scale.x=Math.max(0,e.hp/e.mhp);
  });

  // ── Z-07 בתוך ה-interior ──
  if(G.mission===38&&_z07Enemy&&!_z07Enemy.dead){
    const b=_z07Enemy;
    b.x=b.mesh.position.x;b.z=b.mesh.position.z;
    if(G._hospZ07Ind){
      G._hospZ07Ind.position.y=2+Math.sin(_hospFlickerT*3)*0.3;
      if(b.hp/b.mhp<0.25)G._hospZ07Ind.visible=false;
    }
    updZ07Interior(dt,b);
  }

  // ── אינדיקטור Z-07 ──
  if(G._hospZ07Ind&&G.mission===37){
    G._hospZ07Ind.position.y=2+Math.sin(_hospFlickerT*3)*0.3;
    G._hospZ07Ind.material.color.setHex(Math.sin(_hospFlickerT*4)>0?0xff0000:0x880000);
  }

  // ── Mission 37: הגיע לתחתית → ספון Z-07 ──
  if(G.mission===37&&!G._z07Spawned){
    const distToArena=d2(HOSP.playerX,HOSP.playerZ,0,-12);
    if(distToArena<7){
      G._z07Spawned=true;
      setMission(38);
      _buildZ07Interior();
      setTimeout(()=>showCut('ch7_z07_intro',()=>{}),600);
    }
  }

  // ── יציאה — דלת מזרח (רק אחרי סיום הקרב) ──
  const distExit=d2(HOSP.playerX,HOSP.playerZ,25.0,3);
  if(distExit<2.5&&HOSP.enterGrace<=0&&G.mission!==37&&G.mission!==38){
    exitHosp();
  }
}

// Z-07 inside interior
function updZ07Interior(dt,b){
  const px=HOSP.playerX,pz=HOSP.playerZ;
  const dd=d2(b.x,b.z,px,pz);
  const dog=G.dogs[G.dog];

  b.atkT=Math.max(0,b.atkT-dt);
  b._chargeT=Math.max(0,b._chargeT-dt);
  b._slamT=Math.max(0,b._slamT-dt);
  b._hitT=Math.max(0,b._hitT-dt);
  b._hitCD=Math.max(0,b._hitCD-dt);

  const hpPct=b.hp/b.mhp;
  if(hpPct<=0.5&&b._phase===1){
    b._phase=2;
    showN('🔴 Z-07 יולל — חיזוקים מגיעים!\nמומו: "הם כואבים. הרמקולים כואבים להם."');
    b.spd*=0.8;if(b.mesh._aura)b.mesh._aura.color.setHex(0xaa0000);
  }
  if(hpPct<=0.25&&b._phase===2){
    b._phase=3;b._ctrlOff=true;b.spd*=0.65;
    // כבה עיניים ושתלים
    b.mesh.traverse(c=>{
      if(c.isMesh&&c.material&&c.material.color){
        const h=c.material.color.getHex();
        if(h===0xff0000||h===0xff4400||h===0xff2200)c.material.color.setHex(0x1a0000);
      }
    });
    if(b.mesh._aura)b.mesh._aura.intensity=0.25;
    if(b.mesh._eyeLLight)b.mesh._eyeLLight.intensity=0;
    if(b.mesh._crownLed)b.mesh._crownLed.material.color.setHex(0x110000);
    showN('👁️ העיניים האדומות כבו.\nZ-07 מסתכל סביבו — בלבול.\nהשליטה נקטעה.');
  }

  if(!b._chargeActive){
    const dx=px-b.x,dz=pz-b.z,l=Math.sqrt(dx*dx+dz*dz)||1;
    b.mesh.position.x+=dx/l*b.spd*dt;
    b.mesh.position.z+=dz/l*b.spd*dt;
    b.mesh.rotation.y=Math.atan2(dx,dz);
    if(b._chargeT<=0&&dd>5&&dd<16&&!b._ctrlOff){
      b._chargeT=5.0;
      setTimeout(()=>{
        if(b.dead)return;
        b._chargeActive=true;
        const dx2=px-b.x,dz2=pz-b.z,l2=Math.sqrt(dx2*dx2+dz2*dz2)||1;
        b._cvx=dx2/l2*22;b._cvz=dz2/l2*22;
        setTimeout(()=>{b._chargeActive=false;b._cvx=0;b._cvz=0;},700);
      },1000);
    }
    if(b._slamT<=0&&dd<4){b._slamT=3.5;haptic([80,25,80]);dmgPlayer(22);showN('🔨 מחיצת Z-07!');}
    if(dd<b.atk&&b.atkT<=0){b.atkT=1.4;dmgPlayer(12);haptic(35);}
  } else {
    b.mesh.position.x+=b._cvx*dt;b.mesh.position.z+=b._cvz*dt;
    if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<3.5){
      dmgPlayer(20);b._chargeActive=false;haptic([60,20,60]);showN('💥 ריסוק! Z-07 תפס אותך!');
    }
  }

  if(dd<5.5&&G.atkCD<=0&&b._hitT<=0&&(G._hospAtk||G._atkFrame)){
    G._hospAtk=false;
    const dmg=Math.round(dog.pow*13*(1+dog.lv*.12));
    b.hp-=dmg;sHit();haptic(30);
    flash(b.mesh.children[0]);
    spawnBlood(b.x,1.5,b.z,12);showDmg(b.x,2,b.z,Math.round(dmg));
    b._hitT=0.4;b._hitCD=0.4;G.atkCD=0.55;
    if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
    if(b.hp<=0){
      b.dead=true;b.mesh.visible=false;
      if(b.mesh._aura)b.mesh._aura.intensity=0;
      sCapture();haptic([120,50,100,30,120]);
      addXP(300);G.score+=2000;G.coins+=150;updCoins();
      spawnBlood(b.x,2,b.z,20);
      G.paused=true;
      setTimeout(()=>showCut('ch7_ending',()=>{
        G.paused=false;
        exitHosp();
        setTimeout(()=>setMission(40),1800);
      }),800);
    }
  }
}


// ════════════════════════════════════════════════
// פרק ז׳ — "מקור"
// חיילי על, שפיה, קרב Z-07
// ════════════════════════════════════════════════

// ── מבנה שפיה (בית חולים נטוש) ──
const SHAFIYA={
  entered:false,playerX:0,playerZ:0,playerYaw:0,
  doorLocked:false,alerted:false
};
let _shafiyaObjects=[],_shafiyaGuards=[],_shafiyaCamera=null,_shafiyaScene=null;
let _z07Enemy=null,_z07Phase=1,_z07PhaseDone=false;
let _superSoldiers=[];  // חיילי העל בעולם הפתוח (missions 35+)

// ── קבועים ──
const SUPER_HP=220, SUPER_SPD=3.4, SUPER_ATK=2.8;
const Z07_HP=700, Z07_SPD=4.8;

// ────────────────────────────────────────────────
// בניית חייל-על (Super Soldier)
// ────────────────────────────────────────────────
function mkSuperSoldier(col){
  // גרסה מופחתת — ~15 meshes במקום 49 (למניעת WebGL overflow)
  const c=col||0x0d0d12;
  const BK=new THREE.MeshLambertMaterial({color:c,emissive:0x050508});
  const DK=new THREE.MeshLambertMaterial({color:0x080810,emissive:0x020205});
  const EY=new THREE.MeshBasicMaterial({color:0xff0000});
  const IMPL=new THREE.MeshLambertMaterial({color:0x222240,emissive:0x080818});

  const g=new THREE.Group();
  const _m=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x||0,y||0,z||0);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.castShadow=true;g.add(m);return m;
  };

  // גוף ראשי — קופסתי ושריר
  _m(new THREE.BoxGeometry(0.72,0.68,1.2), BK, 0,0.62,0);
  // חזה
  _m(new THREE.BoxGeometry(0.8,0.5,0.5), BK, 0,0.72,0.45);
  // צוואר
  _m(new THREE.BoxGeometry(0.44,0.35,0.44), BK, 0,1.1,0.35);
  // קולר מתכתי
  const led=_m(new THREE.BoxGeometry(0.52,0.1,0.52), IMPL, 0,1.22,0.35);
  g._led=led;

  // ראש
  const hG=new THREE.Group();
  hG.position.set(0,1.38,0.58);hG.rotation.x=0.14;g.add(hG);
  const sk=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.52,0.58),BK);
  sk.castShadow=true;hG.add(sk);
  // לוט
  const sn=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.2,0.32),DK);
  sn.position.set(0,-0.12,0.26);hG.add(sn);

  // עיניים אדומות
  [-1,1].forEach(sd=>{
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),EY);
    p.position.set(sd*0.16,0.08,0.28);hG.add(p);
    if(sd===-1)g._eyeL=p;else g._eyeR=p;
  });

  // כתפיים + זרועות (מפושטות)
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.28,0.7,0.22), DK, sd*0.56,0.62,0.38);
    // רגל קדמית
    _m(new THREE.BoxGeometry(0.22,0.44,0.22), BK, sd*0.52,0.2,-0.3);
  });

  // רגליים אחוריות
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.26,0.52,0.28), BK, sd*0.26,0.08,-0.28);
  });

  // זנב
  const tG=new THREE.Group();tG.position.set(0,0.72,-0.6);tG.rotation.x=0.6;g.add(tG);
  const t1=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.06,0.25,6),BK);
  t1.position.y=0.12;t1.castShadow=true;tG.add(t1);
  g._tail=tG;

  g.castShadow=true;
  return g;
}

// helper — add mesh to group
function _mInG(geo,mat,grp,x,y,z,rx,ry,rz){
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x||0,y||0,z||0);
  if(rx)mesh.rotation.x=rx;if(ry)mesh.rotation.y=ry;if(rz)mesh.rotation.z=rz;
  mesh.castShadow=true;grp.add(mesh);return mesh;
}

// ────────────────────────────────────────────────
// ספון חיילי על לעולם הפתוח (mission 35)
// ────────────────────────────────────────────────
function _spawnSuperSoldiers(){
  if(_superSoldiers.length>0)return;
  // חיילי על — בתוך מרכז גהה (קואורדינטות יחסיות לבניין)
  const bx=SHAFIYA_X, bz=SHAFIYA_Z;
  const positions=[
    [bx-6, bz+2],   // מסדרון שמאל
    [bx+5, bz-3],   // חדר ימין
    [bx,   bz-6],   // עומק הבניין
  ];
  positions.forEach(([x,z])=>{
    const mesh=mkSuperSoldier(0x1a1a2e);
    mesh.position.set(x,0,z);
    scene.add(mesh);
    const bar=hpBar(mesh,1.8,2.8);
    _superSoldiers.push({
      mesh,bar,hp:SUPER_HP,mhp:SUPER_HP,spd:SUPER_SPD,
      atk:SUPER_ATK,atkT:0,state:'patrol',
      homeX:x,homeZ:z,patAng:Math.random()*Math.PI*2,patT:2,
      lastSeenX:0,lastSeenZ:0,searchT:0,
      _chargeT:0,_chargeReady:false,_chargeActive:false,
      _cvx:0,_cvz:0,_slamT:0,_howlT:0,
      _hitFlash:0,_isSuperSoldier:true
    });
  });
}

// ────────────────────────────────────────────────
// עדכון חיילי על — AI + מכות מיוחדות
// ────────────────────────────────────────────────
function updSuperSoldiers(dt){
  if(!_superSoldiers.length||G.mission<35)return;
  const px=PB.position.x,pz=PB.position.z;
  const dog=G.dogs[G.dog];

  _superSoldiers.forEach(e=>{
    if(e.hp<=0||!e.mesh.visible)return;
    const ex=e.mesh.position.x,ez=e.mesh.position.z;
    const dd=d2(ex,ez,px,pz);

    // ── Timers ──
    e.atkT=Math.max(0,e.atkT-dt);
    e._chargeT=Math.max(0,e._chargeT-dt);
    e._slamT=Math.max(0,e._slamT-dt);
    e._howlT=Math.max(0,e._howlT-dt);
    if(e._hitFlash>0){e._hitFlash-=dt;if(e._hitFlash<=0)_resetSuperColor(e);}

    // ── State transitions ──
    if(dd<18){
      if(e.state==='patrol')showN('💀 חייל על גילה אותך!');
      e.state='chase';e.lastSeenX=px;e.lastSeenZ=pz;e.searchT=10;
    } else if(e.state==='chase'){
      e.searchT-=dt;
      if(e.searchT<=0){e.state='patrol';}
    }

    if(e.state!=='chase')return;

    // ── Charge attack — טעינה ודהירה ──
    if(!e._chargeActive&&e._chargeT<=0&&dd>5&&dd<16){
      // התחלת טעינה — הצג אינדיקטור
      e._chargeT=3.5;
      e._chargeReady=true;
      spawnPfx(ex,0.5,ez,0xff2200,6);
      showN('⚡ חייל על טוען מתקפה!');
      setTimeout(()=>{
        if(e.hp<=0)return;
        // ביצוע ריצה
        e._chargeReady=false;
        e._chargeActive=true;
        const dx2=e.lastSeenX-e.mesh.position.x,dz2=e.lastSeenZ-e.mesh.position.z;
        const l=Math.sqrt(dx2*dx2+dz2*dz2)||1;
        e._cvx=dx2/l*18; e._cvz=dz2/l*18;
        setTimeout(()=>{e._chargeActive=false;e._cvx=0;e._cvz=0;},600);
      },900);
    }

    // ── Charge movement ──
    if(e._chargeActive){
      e.mesh.position.x+=e._cvx*dt;
      e.mesh.position.z+=e._cvz*dt;
      // פגיעה במהלך ריצה
      if(d2(e.mesh.position.x,e.mesh.position.z,px,pz)<2.8){
        dmgPlayer(14);e._chargeActive=false;e._cvx=0;e._cvz=0;
        haptic([40,15,40]);showN('💥 ריסוק!');
      }
    } else {
      // ── תנועה רגילה ──
      const dx=px-ex,dz=pz-ez,l=Math.sqrt(dx*dx+dz*dz)||1;
      e.mesh.position.x+=dx/l*e.spd*dt;
      e.mesh.position.z+=dz/l*e.spd*dt;
      e.mesh.rotation.y=Math.atan2(dx,dz);

      // ── Slam — קפיצה ומחיצה ──
      if(e._slamT<=0&&dd<3.5){
        e._slamT=4.0;
        spawnBlood(ex,0.5,ez,8);spawnPfx(ex,0.2,ez,0xff4400,6);
        haptic([60,20,60]);dmgPlayer(16);showN('🔨 מחיצה!');
        // רעידת מצלמה
        camera.position.y+=1.2;setTimeout(()=>{camera.position.y-=1.2;},80);
      }

      // ── Howl — קריאה לעזרה ──
      if(e._howlT<=0&&dd<10&&Math.random()<0.008){
        e._howlT=15;
        showN('🐺 יללה! חיזוקים מגיעים!');
        spawnPfx(ex,2,ez,0x880000,10);
        // מגרה אויבים רגילים קרובים
        G.enemies.forEach(reg=>{
          if(reg.hp>0&&reg.mesh.visible&&d2(reg.mesh.position.x,reg.mesh.position.z,ex,ez)<25){
            reg.state='chase';reg.lastSeenX=px;reg.lastSeenZ=pz;reg.searchT=8;
          }
        });
      }

      // ── תקיפה רגילה ──
      if(dd<e.atk&&e.atkT<=0){e.atkT=1.6;dmgPlayer(10);haptic(25);}
    }

    // ── פגיעת שחקן ──
    if(dd<4.5&&G._atkFrame&&e.hp>0){
      const dmg=Math.round(dog.pow*10*(1+dog.lv*.1));
      e.hp-=dmg;flash(e.mesh.children[0]);
      spawnBlood(ex,1,ez,10);showDmg(ex,1,ez,Math.round(dmg));
      haptic(25);e._hitFlash=0.15;
      _flashSuperRed(e);
      if(e.hp<=0){
        e.hp=0;e.mesh.visible=false;sEDie();
        haptic([70,25,50]);addXP(50);G.score+=150;G.coins+=25;updCoins();
        _ragdoll(e.mesh);
        showN('✅ חייל על הוכנע!');
        // בדוק אם כולם מוכנעים → mission 35 done
        const alive=_superSoldiers.filter(s=>s.hp>0&&s.mesh.visible).length;
        if(alive===0&&G.mission===35){
          showN('✅ המארב הוכנע! המשיכו לשפיה.');
          setTimeout(()=>setMission(36),1800);
        }
      }
    }

    if(e.bar){
      e.bar.scale.x=Math.max(0,e.hp/e.mhp);
      e.bar.material.color.setHex(e.state==='chase'?0xff0000:0xe74c3c);
    }
  });
}

function _flashSuperRed(e){
  e.mesh.traverse(c=>{
    if(c.isMesh&&c.material&&c!==e.mesh._eyeL&&c!==e.mesh._eyeR){
      if(!c._origCol)c._origCol=c.material.color.getHex();
      c.material.color.setHex(0xff2200);
    }
  });
}
function _resetSuperColor(e){
  e.mesh.traverse(c=>{
    if(c.isMesh&&c.material&&c._origCol!==undefined){
      c.material.color.setHex(c._origCol);
    }
  });
}

// ════════════════════════════════════════════════
// Z-07 — בוס פרק ז׳
// ════════════════════════════════════════════════
function _buildZ07(){
  if(_z07Enemy)return;
  const mesh=mkSuperSoldier(0x0a0a16);
  // Z-07 גדול יותר
  mesh.scale.setScalar(1.35);
  // צלקות ניסוי נוספות
  mesh.traverse(c=>{
    if(c.isMesh&&c.material&&!(c===mesh._eyeL||c===mesh._eyeR)){
      c.material=c.material.clone();
      if(c.material.emissive)c.material.emissive.setHex(0x1a0022);
    }
  });
  // אורת הילה אדומה
  const aura=new THREE.PointLight(0xff0000,2.5,8);
  aura.position.set(0,1.5,0);mesh.add(aura);mesh._aura=aura;

  mesh.position.set(SHAFIYA_X,0,SHAFIYA_Z-8);
  scene.add(mesh);
  const bar=hpBar(mesh,2.5,3.5);
  bar.material.color.setHex(0xff0000);

  _z07Enemy={
    mesh,bar,x:SHAFIYA_X,z:SHAFIYA_Z-8,
    hp:Z07_HP,mhp:Z07_HP,spd:Z07_SPD,
    atk:3.8,atkT:0,dead:false,
    _phase:1,_chargeT:0,_chargeActive:false,_cvx:0,_cvz:0,
    _slamT:0,_howlT:0,_hitT:0,_hitCD:0,
    _ctrlOff:false  // עיניים כבות — פאזה 3
  };
  G._z07Enemy=_z07Enemy;
}

function updZ07(dt){
  if(!_z07Enemy||_z07Enemy.dead||G.mission!==38)return;
  const b=_z07Enemy;
  const px=PB.position.x,pz=PB.position.z;
  b.x=b.mesh.position.x;b.z=b.mesh.position.z;
  const dd=d2(b.x,b.z,px,pz);
  const dog=G.dogs[G.dog];

  b.atkT=Math.max(0,b.atkT-dt);
  b._chargeT=Math.max(0,b._chargeT-dt);
  b._slamT=Math.max(0,b._slamT-dt);
  b._howlT=Math.max(0,b._howlT-dt);
  b._hitT=Math.max(0,b._hitT-dt);
  b._hitCD=Math.max(0,b._hitCD-dt);

  const hpPct=b.hp/b.mhp;

  // ── פאזה 2: Howl + חיילים נוספים (50% HP) ──
  if(hpPct<=0.5&&b._phase===1&&!_z07PhaseDone){
    b._phase=2;_z07PhaseDone=true;
    spawnPfx(b.x,2,b.z,0xff0000,20);
    haptic([100,40,100]);
    setTimeout(()=>showCut('ch7_z07_phase2',()=>{}),300);
    // ספון 2 חיילים רגילים כתגבורת
    [[-5,-208],[5,-212]].forEach(([sx,sz])=>{
      const reg=mkEnemy(0x2a1a2e,1);reg.position.set(sx,0,sz);scene.add(reg);
      const regBar=hpBar(reg,1.4,2.3);
      G.enemies.push({mesh:reg,hp:80,mhp:80,spd:4,alert:18,atk:2.6,atkT:0,bar:regBar,
        homeX:sx,homeZ:sz,patAng:0,patT:0,state:'chase',
        lastSeenX:px,lastSeenZ:pz,searchT:12,zone:'שפיה'});
    });
    // Z-07 מאט קצת — מדמם
    b.spd*=0.8;
    if(b.mesh._aura)b.mesh._aura.color.setHex(0xaa0000);
  }

  // ── פאזה 3: עיניים כבות, בלגן (25% HP) ──
  if(hpPct<=0.25&&b._phase===2){
    b._phase=3;
    // כיבוי עיניים
    b.mesh.traverse(c=>{if(c.isMesh&&c.material&&c.material.color){
      if(c.material.color.getHex()===0xff0000)c.material.color.setHex(0x220000);
    }});
    if(b.mesh._aura)b.mesh._aura.intensity=0.4;
    b._ctrlOff=true;
    showN('👁️ העיניים האדומות כבו.\nZ-07 מסתכל סביבו — בלבול.\nהשליטה נקטעה.');
    b.spd*=0.65;
  }

  // ── תנועה ──
  if(!b._chargeActive){
    const dx=px-b.x,dz=pz-b.z,l=Math.sqrt(dx*dx+dz*dz)||1;
    const spd=b._ctrlOff?b.spd*0.7:b.spd;
    b.mesh.position.x+=dx/l*spd*dt;
    b.mesh.position.z+=dz/l*spd*dt;
    b.mesh.rotation.y=Math.atan2(dx,dz);

    // ── Charge attack ──
    if(b._chargeT<=0&&dd>6&&dd<20&&!b._ctrlOff){
      b._chargeT=5.0;
      spawnPfx(b.x,0.5,b.z,0xff4400,8);
      showN('⚡ Z-07 טוען...');
      setTimeout(()=>{
        if(b.dead)return;
        b._chargeActive=true;
        const dx2=px-b.x,dz2=pz-b.z,l2=Math.sqrt(dx2*dx2+dz2*dz2)||1;
        b._cvx=dx2/l2*22;b._cvz=dz2/l2*22;
        setTimeout(()=>{b._chargeActive=false;b._cvx=0;b._cvz=0;},700);
      },1000);
    }

    // ── Slam ──
    if(b._slamT<=0&&dd<4){
      b._slamT=3.5;
      spawnBlood(b.x,0.5,b.z,12);haptic([80,25,80]);
      dmgPlayer(22);showN('🔨 מחיצת Z-07!');
      camera.position.y+=1.8;setTimeout(()=>{camera.position.y-=1.8;},100);
    }

    // ── תקיפה רגילה ──
    if(dd<b.atk&&b.atkT<=0){b.atkT=1.4;dmgPlayer(12);haptic(35);}
  } else {
    // charge בתנועה
    b.mesh.position.x+=b._cvx*dt;
    b.mesh.position.z+=b._cvz*dt;
    if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<3.5){
      dmgPlayer(20);b._chargeActive=false;haptic([60,20,60]);showN('💥 ריסוק! Z-07 תפס אותך!');
    }
  }

  // ── פגיעת שחקן ──
  if(dd<5.5&&G._atkFrame&&b._hitT<=0&&b._hitCD<=0){
    const dmg=Math.round(dog.pow*13*(1+dog.lv*.12));
    b.hp-=dmg;sHit();haptic(30);
    flash(b.mesh.children[0]);
    spawnBlood(b.x,1.5,b.z,16);showDmg(b.x,2,b.z,Math.round(dmg));
    b._hitT=0.4;b._hitCD=0.4;G.atkCD=0.55;
    if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);

    if(b.hp<=0){
      b.dead=true;b.mesh.visible=false;
      if(b.mesh._aura)b.mesh._aura.intensity=0;
      sCapture();haptic([120,50,100,30,120]);
      addXP(300);G.score+=2000;G.coins+=150;updCoins();
      spawnBlood(b.x,2,b.z,30);
      for(let i=0;i<15;i++)spawnPfx(
        b.x+(Math.random()-.5)*4,1+Math.random()*2,b.z+(Math.random()-.5)*4,
        0xff2200,3
      );
      G.paused=true;
      setTimeout(()=>showCut('ch7_ending',()=>{
        G.paused=false;
        setMission(39); // mission 39 = "מוצאים את כ"ץ" (עתידי)
        showN('🔜 פרק ז׳ הסתיים. כ"ץ עדיין בחוץ.');
      }),800);
    }
  }

  if(b.bar){b.bar.scale.x=Math.max(0,b.hp/b.mhp);}
}

// ════════════════════════════════════════════════
// לוגיקת משימות 33-38
// ════════════════════════════════════════════════

// שרידי המעבדה — אובייקטים לאינטראקציה
let _ch7DebrisItems=[], _ch7TagFound=false, _ch7FilesFound=false;

function _spawnCh7DebrisItems(){
  if(_ch7DebrisItems.length>0)return;
  // תג מתכת — ID tag מעבדה, חרוך אבל קריא
  const tagGrp=new THREE.Group();
  // הגוף הראשי של התג
  const tagBody=new THREE.Mesh(
    new THREE.BoxGeometry(0.5,0.06,0.32),
    new THREE.MeshLambertMaterial({color:0x888888,emissive:0x444444})
  );
  tagGrp.add(tagBody);
  // שרשרת קטנה
  const chainM=new THREE.MeshLambertMaterial({color:0x555555,emissive:0x222222});
  for(let i=0;i<5;i++){
    const link=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.04),chainM);
    link.position.set(0,0.04+i*0.05,0); tagGrp.add(link);
  }
  // כתב Z-01 (רצועת צבע אדומה)
  const labelM=new THREE.MeshBasicMaterial({color:0xcc2200});
  const label=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.015,0.08),labelM);
  label.position.set(0,0.038,0); tagGrp.add(label);
  tagGrp.position.set(27,0.4,-123);
  tagGrp.rotation.z=0.18;
  scene.add(tagGrp);
  const tagLight=new THREE.PointLight(0xccddff,1.5,6);tagLight.position.set(27,1.8,-123);scene.add(tagLight);
  _ch7DebrisItems.push({mesh:tagGrp,type:'tag',collected:false,light:tagLight});

  // קבצים שנחשפו מהשריפה — ניירות חרוכים עם גחלים
  const fileGrp=new THREE.Group();
  // שכבות ניירות
  for(let i=0;i<4;i++){
    const pg=new THREE.Mesh(
      new THREE.BoxGeometry(0.48-i*0.03, 0.015, 0.36-i*0.02),
      new THREE.MeshLambertMaterial({
        color: i===0?0x1a0a00 : i===1?0x2a1000 : 0x3a1800,
        emissive: i===0?0x220800 : 0x110400
      })
    );
    pg.position.y = i*0.018;
    pg.rotation.y = (Math.random()-0.5)*0.15;
    fileGrp.add(pg);
  }
  // גחלים קטנות על הניירות
  [[-0.1,0.08,-0.05],[0.12,0.075,0.08],[-0.05,0.078,0.1]].forEach(([ex,ey,ez])=>{
    const em=new THREE.Mesh(
      new THREE.BoxGeometry(0.04,0.04,0.04),
      new THREE.MeshBasicMaterial({color:0xff4400})
    );
    em.position.set(ex,ey,ez); fileGrp.add(em);
  });
  fileGrp.position.set(23,0.4,-126);
  scene.add(fileGrp);
  const fileLight=new THREE.PointLight(0xff5500,1.2,5);fileLight.position.set(23,1.5,-126);scene.add(fileLight);
  _ch7DebrisItems.push({mesh:fileGrp,type:'files',collected:false,light:fileLight});
}

function updCh7(dt){
  if(G.mission<33||G.mission>38)return;
  const px=PB.position.x,pz=PB.position.z;

  // ── Mission 33: מצאו את התג ──
  if(G.mission===33){
    if(!G._ch7Started){
      G._ch7Started=true;
      forceDog('colin','קולין מוביל את הסריקה');
      setTimeout(()=>showCut('ch7_open',()=>{}),600);
    }
    _spawnCh7DebrisItems();
    const ip=document.getElementById('ip');
    const tagItem=_ch7DebrisItems.find(i=>i.type==='tag'&&!i.collected);
    if(tagItem){
      const dd=d2(tagItem.mesh.position.x,tagItem.mesh.position.z,px,pz);
      if(dd<3){
        if(ip){ip.textContent='🔍 E — בדוק תג';ip.style.display='block';}
        if(G.keys['KeyE']||G._eKeyFrame){
          G.keys['KeyE']=false;G._eKeyFrame=false;
          tagItem.collected=true;
          tagItem.mesh.visible=false;
          if(tagItem.light)tagItem.light.intensity=0;
          _ch7TagFound=true;
          showCut('ch7_tag_found',()=>{
            setTimeout(()=>setMission(34),800);
          });
        }
      } else {
        if(ip&&ip.style.display!=='none')ip.style.display='none';
      }
      // מרחף + סיבוב
      const _t33=Date.now()*0.001;
      tagItem.mesh.position.y=0.4+Math.sin(_t33*2)*0.12;
      tagItem.mesh.rotation.y=_t33*0.8;
      if(tagItem.light)tagItem.light.position.y=tagItem.mesh.position.y+1.1;
    }
  }

  // ── Mission 34: מצאו את הקבצים שנחשפו בשריפה ──
  if(G.mission===34){
    _spawnCh7DebrisItems(); // חלק מהחפצים כבר קיימים
    const ip=document.getElementById('ip');
    const fileItem=_ch7DebrisItems.find(i=>i.type==='files'&&!i.collected);
    if(fileItem){
      const dd=d2(fileItem.mesh.position.x,fileItem.mesh.position.z,px,pz);
      if(dd<3){
        if(ip){ip.textContent='📄 E — קרא קבצים';ip.style.display='block';}
        if(G.keys['KeyE']||G._eKeyFrame){
          G.keys['KeyE']=false;G._eKeyFrame=false;
          fileItem.collected=true;
          fileItem.mesh.visible=false;
          if(fileItem.light)fileItem.light.intensity=0;
          _ch7FilesFound=true;
          showN('📄 הקבצים חשפו: מתקן גיבוי — בית החולים הנטוש שפיה.\nכ"ץ לא הספיק לשרוף הכל.');
          setTimeout(()=>{
            showCut('ch7_zippo_crisis',()=>{
              setMission(35);
            });
          },1200);
        }
      } else {
        if(ip&&ip.style.display!=='none')ip.style.display='none';
      }
      // מרחף — קובץ שנחשף מהאפר
      const _t34=Date.now()*0.001;
      fileItem.mesh.position.y=0.4+Math.sin(_t34*2.5+1)*0.1;
      fileItem.mesh.rotation.y=_t34*0.5;
      if(fileItem.light)fileItem.light.position.y=fileItem.mesh.position.y+1.1;
    }
  }

  // ── Mission 35: הגיעו לכניסת מרכז גהה — כניסה לInterior ──
  if(G.mission===35){
    if(G._hospDoorInd){
      G._hospDoorInd.position.y=3.5+Math.sin(Date.now()*.005)*0.3;
      G._hospDoorInd.material.color.setHex(Math.sin(Date.now()*.01)>0?0x44ff88:0x22cc55);
    }
    const distToHosp=d2(px,pz,SHAFIYA_X,SHAFIYA_Z+8);
    if(distToHosp<5&&!HOSP.inHosp&&!G._hospEntering){
      G._hospEntering=true;
      if(G._hospDoorInd)G._hospDoorInd.visible=false;
      enterHosp();
    }
  }

  // missions 36-38 מטופלות ב-updHosp בתוך ה-interior
}


// ════════════════════════════════════════════════
// Z-18 MODEL — זיפו כהה, Super Saiyan Rose
// ════════════════════════════════════════════════
function mkZ18Model(){
  const S=1.18; // גדול מזיפו ב-18%
  const BK=new THREE.MeshLambertMaterial({color:0x18141e,emissive:0x100c16});
  const DK=new THREE.MeshLambertMaterial({color:0x0e0a14,emissive:0x090712});
  const ROSE=new THREE.MeshLambertMaterial({color:0x5a1a3e,emissive:0x3a0f28}); // ורוד-כהה — בהיר יותר
  const ROSEHI=new THREE.MeshLambertMaterial({color:0x7a2050,emissive:0x500f36}); // הדגשות ורוד — בהיר יותר
  const AR=new THREE.MeshLambertMaterial({color:0x221630,emissive:0x160f22}); // שריון כהה
  const EY=new THREE.MeshBasicMaterial({color:0xff1166}); // עיניים ארגמן-ורוד
  const EYG=new THREE.MeshBasicMaterial({color:0xff3377,transparent:true,opacity:0.85});

  const g=new THREE.Group();
  const _m=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x||0,y||0,z||0);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.castShadow=true;g.add(m);return m;
  };

  // ── גוף — מבנה זיפו, גדול יותר ──
  _m(new THREE.BoxGeometry(0.74*S,0.7*S,1.22*S), BK, 0,0.64*S,0.05*S);
  _m(new THREE.BoxGeometry(0.82*S,0.52*S,0.58*S), BK, 0,0.74*S,0.52*S);
  _m(new THREE.BoxGeometry(0.7*S,0.54*S,0.44*S), DK, 0,0.6*S,-0.5*S);
  // שריון חזה — ורוד-כהה עם פרטים
  _m(new THREE.BoxGeometry(0.72*S,0.46*S,0.1*S), AR, 0,0.78*S,0.78*S);
  _m(new THREE.BoxGeometry(0.28*S,0.42*S,0.08*S), ROSE, -0.2*S,0.78*S,0.82*S);
  _m(new THREE.BoxGeometry(0.28*S,0.42*S,0.08*S), ROSEHI, 0.2*S,0.76*S,0.82*S);
  // פרטי ורוד על הגוף
  [-0.14,0,0.14].forEach(oy=>{
    _m(new THREE.BoxGeometry(0.72*S,0.055*S,0.055*S), ROSE, 0,0.44*S+oy*S,0.22*S);
  });
  // בטן
  _m(new THREE.BoxGeometry(0.64*S,0.3*S,0.4*S), BK, 0,0.42*S,0.28*S);

  // ── שתלי עמוד שדרה — ורוד-כהה ──
  [0.6,0.44,0.28,0.12].forEach((sy,i)=>{
    _m(new THREE.BoxGeometry(0.12*S,0.12*S,0.1*S), ROSEHI, 0,sy*S,-0.54*S);
    if(i<3)_m(new THREE.CylinderGeometry(0.022*S,0.022*S,0.14*S,6),ROSE,0,(sy-0.08)*S,-0.54*S);
  });

  // ── צוואר + קולר כהה ──
  _m(new THREE.BoxGeometry(0.46*S,0.4*S,0.46*S), BK, 0,1.12*S,0.4*S);
  _m(new THREE.BoxGeometry(0.54*S,0.1*S,0.54*S), AR, 0,1.24*S,0.4*S);
  // LED ורוד על קולר
  _m(new THREE.BoxGeometry(0.08*S,0.05*S,0.05*S),
    new THREE.MeshBasicMaterial({color:0xff0066}), 0,1.24*S,0.66*S);

  // ── ראש ──
  const hG=new THREE.Group();
  hG.position.set(0,1.4*S,0.64*S);hG.rotation.x=0.15;g.add(hG);
  const _mH=(geo,mat,x,y,z,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x||0,y||0,z||0);
    if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;
    m.castShadow=true;hG.add(m);return m;
  };

  _mH(new THREE.BoxGeometry(0.58*S,0.56*S,0.68*S), BK, 0,0,0);
  _mH(new THREE.BoxGeometry(0.2*S,0.3*S,0.36*S), DK, -0.28*S,-0.04*S,0.08*S);
  _mH(new THREE.BoxGeometry(0.2*S,0.3*S,0.36*S), DK,  0.28*S,-0.04*S,0.08*S);
  _mH(new THREE.BoxGeometry(0.52*S,0.2*S,0.24*S), BK, 0,0.24*S,0.22*S);
  // קמטי מצח אנכיים — כועס/קר
  [-0.12,0.12].forEach(cx=>{
    _mH(new THREE.BoxGeometry(0.035*S,0.16*S,0.05*S), ROSE, cx*S,0.22*S,0.28*S,0.25);
  });
  _mH(new THREE.BoxGeometry(0.34*S,0.24*S,0.42*S), BK, 0,-0.15*S,0.3*S);
  // אף
  const nsG=new THREE.Mesh(new THREE.SphereGeometry(0.1*S,8,8),DK);
  nsG.scale.set(1,0.7,0.85);nsG.position.set(0,0.02*S,0.37*S);hG.add(nsG);
  // שיניים
  [-0.07,0,0.07].forEach(tx=>{
    _mH(new THREE.BoxGeometry(0.055*S,0.09*S,0.04*S),
      new THREE.MeshLambertMaterial({color:0xccc8b0,emissive:0x080806}), tx*S,-0.2*S,0.37*S);
  });

  // ── עיניים — ארגמן ורוד זוהר ──
  [-1,1].forEach(sd=>{
    const eG=new THREE.Group();
    eG.position.set(sd*0.18*S,0.1*S,0.3*S);hG.add(eG);
    const eyeBase=new THREE.Mesh(new THREE.SphereGeometry(0.085*S,10,10),
      new THREE.MeshLambertMaterial({color:0x080005,emissive:0x050002}));
    eyeBase.castShadow=true;eG.add(eyeBase);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(0.06*S,8,8),EY);
    pupil.position.z=0.06*S;eG.add(pupil);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(0.075*S,8,8),EYG);
    glow.position.z=0.048*S;eG.add(glow);
    if(sd===-1){
      g._eyeL=pupil;
      const el=new THREE.PointLight(0xff0066,1.5,4);el.position.set(-0.18*S,0.1*S,0.44*S);hG.add(el);
      g._eyeLLight=el;
    } else {
      g._eyeR=pupil;
      const er=new THREE.PointLight(0xff0066,1.5,4);er.position.set(0.18*S,0.1*S,0.44*S);hG.add(er);
      g._eyeRLight=er;
    }
  });

  // ── אוזניים — שטוחות לאחור לגמרי ──
  [-1,1].forEach(sd=>{
    const eG=new THREE.Group();
    eG.position.set(sd*0.26*S,0.2*S,-0.18*S);
    eG.rotation.z=sd*0.5;eG.rotation.x=-0.85;hG.add(eG);
    const earM=new THREE.Mesh(new THREE.BoxGeometry(0.14*S,0.28*S,0.09*S),BK);
    earM.position.y=0.14*S;earM.castShadow=true;eG.add(earM);
  });

  // ── שתל גולגולת — ורוד-כהה ──
  _mH(new THREE.BoxGeometry(0.2*S,0.09*S,0.24*S), ROSEHI, 0,0.32*S,-0.12*S);
  _mH(new THREE.BoxGeometry(0.07*S,0.14*S,0.07*S), ROSE, -0.07*S,0.42*S,-0.1*S);
  _mH(new THREE.BoxGeometry(0.07*S,0.14*S,0.07*S), ROSE,  0.07*S,0.42*S,-0.1*S);
  const crownLed=new THREE.Mesh(new THREE.BoxGeometry(0.045*S,0.045*S,0.045*S),
    new THREE.MeshBasicMaterial({color:0xff0066}));
  crownLed.position.set(0,0.5*S,-0.1*S);hG.add(crownLed);
  g._crownLed=crownLed;

  // ── כתפיים — שריון ורוד-כהה ──
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.34*S,0.34*S,0.54*S), BK, sd*0.62*S,0.84*S,0.28*S);
    _m(new THREE.BoxGeometry(0.38*S,0.14*S,0.5*S), ROSEHI, sd*0.62*S,1.0*S,0.26*S);
    _m(new THREE.BoxGeometry(0.26*S,0.56*S,0.24*S), DK, sd*0.68*S,0.54*S,0.36*S);
    _m(new THREE.BoxGeometry(0.22*S,0.5*S,0.22*S), BK, sd*0.62*S,0.14*S,0.44*S);
    _m(new THREE.BoxGeometry(0.24*S,0.16*S,0.28*S), DK, sd*0.6*S,-0.1*S,0.5*S);
    [-0.09,0,0.09].forEach(cx=>{
      _m(new THREE.BoxGeometry(0.046*S,0.15*S,0.046*S), DK, sd*0.6*S+cx*sd,-0.22*S,0.58*S);
    });
  });

  // ── רגליים אחוריות ──
  [-1,1].forEach(sd=>{
    _m(new THREE.BoxGeometry(0.3*S,0.48*S,0.32*S), BK, sd*0.3*S,0.0*S,-0.3*S);
    _m(new THREE.BoxGeometry(0.26*S,0.36*S,0.28*S), DK, sd*0.28*S,-0.4*S,-0.22*S);
    _m(new THREE.BoxGeometry(0.26*S,0.14*S,0.38*S), BK, sd*0.26*S,-0.62*S,-0.1*S);
    [-0.09,0,0.09].forEach(cx=>{
      _m(new THREE.BoxGeometry(0.045*S,0.11*S,0.045*S), DK, sd*0.26*S+cx*sd,-0.73*S,0.04*S);
    });
  });

  // ── זנב — שטוח כלפי מטה ──
  const tG=new THREE.Group();tG.position.set(0,0.74*S,-0.64*S);tG.rotation.x=0.3;g.add(tG);
  const t1=new THREE.Mesh(new THREE.CylinderGeometry(0.1*S,0.07*S,0.28*S,8),BK);
  t1.position.y=0.14*S;t1.castShadow=true;tG.add(t1);
  g._tail=tG;

  // ── הילה ורודה-כהה — PointLight ──
  const aura=new THREE.PointLight(0xcc0066,6.0,14);
  aura.position.set(0,1.2*S,0);g.add(aura);g._aura=aura;
  // אור fill — מאיר את הגוף מלמטה כדי שיהיה נראה
  const fill=new THREE.PointLight(0x330022,3.0,8);
  fill.position.set(0,0.5*S,0.5*S);g.add(fill);

  // ── Dark Flame particles (placeholder — animated in updZ18) ──
  g._darkFlameT=0;

  g.castShadow=true;
  g._lodExempt=true; // פטור מ-LOD — Z18 תמיד נראה
  return g;
}

// ════════════════════════════════════════════════
// _triggerZ18GrabScene — אנימציה סינמטית: Z-18 אוחז במומו
// ════════════════════════════════════════════════
function _triggerZ18GrabScene(){
  // ── בנה מודלים ──
  const SCENE_X=108, SCENE_Z=22;
  const z18mesh=mkZ18Model();
  z18mesh.position.set(SCENE_X, 0, SCENE_Z+5);
  z18mesh.rotation.y=Math.PI;
  z18mesh._lodExempt=true;
  scene.add(z18mesh);

  // מומו dummy מלא
  const momoDummy=new THREE.Group();
  momoDummy._lodExempt=true;
  const mBodyM=new THREE.MeshLambertMaterial({color:0xd4a0c8,emissive:0x3a1a30});
  const mBody=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.36,0.55),mBodyM);
  mBody.position.set(0,0.42,0);momoDummy.add(mBody);
  const mHead=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.34,0.38),mBodyM);
  mHead.position.set(0,0.76,0.15);momoDummy.add(mHead);
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.05,0.2,6),
      new THREE.MeshLambertMaterial({color:0xb07898}));
    ear.position.set(s*0.2,0.95,0.15);ear.rotation.z=s*0.35;momoDummy.add(ear);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.28,0.16),mBodyM);
    leg.position.set(s*0.16,0.1,0.1);momoDummy.add(leg);
  });
  const mTail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.03,0.32,6),
    new THREE.MeshLambertMaterial({color:0xb07898}));
  mTail.position.set(0,0.38,-0.28);mTail.rotation.x=0.8;momoDummy.add(mTail);
  momoDummy.position.set(SCENE_X-1.5, 0, SCENE_Z+1);
  scene.add(momoDummy);

  // אורות סצנה
  const grabLight=new THREE.PointLight(0xff0044,0,16);
  grabLight.position.set(SCENE_X,4,SCENE_Z+2);
  scene.add(grabLight);
  const fillL=new THREE.PointLight(0x220011,3,10);
  fillL.position.set(SCENE_X-3,2,SCENE_Z);
  scene.add(fillL);

  // שמור מצב מצלמה לחזרה
  const origCamPos=camera.position.clone();
  const origLookAt=new THREE.Vector3(PB.position.x,PB.position.y+1.2,PB.position.z);

  // עצור updCamera — שלטון מלא על המצלמה
  G._cinemaMode=true;
  G.paused=true;

  // יעדי מצלמה סינמטיים — מלפנים ומהצד, נמוך וקרוב — רואים ישירות Z18+מומו
  const cam1=new THREE.Vector3(SCENE_X+3, 2.2, SCENE_Z+9);   // פתיחה — מלפנים-ימין
  const cam2=new THREE.Vector3(SCENE_X+1, 1.6, SCENE_Z+6);   // zoom in — ממש קרוב
  const camLook=new THREE.Vector3(SCENE_X+0.5, 1.8, SCENE_Z+1.8); // גובה צוואר מומו
  let _camPhase=0; // 0=פתיחה, 1=zoom in

  // קבע מצלמה מיידית לנקודת פתיחה — אין lerp ראשוני שמרצד
  camera.position.copy(cam1);
  camera.lookAt(camLook);

  // ticker קטן — רק zoom in עדין בשלב ב
  const _camTick=setInterval(()=>{
    if(_camPhase===1) camera.position.lerp(cam2, 0.03);
    camera.lookAt(camLook);
  },16);

  // -- שלב א: Z18 נוחת (0→600ms) --
  haptic([80,20,80,20,80]);
  let _fC=0;
  const _flashI=setInterval(()=>{
    _fC++;grabLight.intensity=_fC%2===0?5.5:0;
    if(_fC>=8){clearInterval(_flashI);grabLight.intensity=4;}
  },75);

  // -- שלב ב (600ms): אחיזה + מומו מורמת --
  setTimeout(()=>{
    haptic([120,30,80,30,60]);
    showN('😱 Z-18 פרץ לבסיס! מומו!!');
    _camPhase=1; // zoom in

    let _lT=0;
    const _lI=setInterval(()=>{
      _lT+=16;
      const p=Math.min(_lT/500,1), e=1-Math.pow(1-p,2);
      // Z18 מתכופף ומושיט יד לצוואר
      z18mesh.rotation.x = e*0.35;
      z18mesh.position.z = (SCENE_Z+5) - e*3.8; // מתקדם בחדות
      z18mesh.position.y = e*0.3; // מתרומם מעט
      // מומו נמשכת לעבר Z18 ועולה לגובה צוואר
      momoDummy.position.y = e*1.2;          // גובה צוואר
      momoDummy.position.x = SCENE_X-1.5+e*2.2; // נמשכת ימינה
      momoDummy.rotation.z = e*0.4;           // נוטה בצד
      grabLight.intensity = 4+Math.sin(_lT*0.025)*1.8;
      if(_lT>=500)clearInterval(_lI);
    },16);
  },600);

  // -- שלב ג (1700ms): מומו נישאת — זעקה ופרחים --
  setTimeout(()=>{
    for(let i=0;i<16;i++)
      spawnPfx(SCENE_X-0.5+(Math.random()-.5)*2.5, 1.5+Math.random()*2,
        SCENE_Z+1+(Math.random()-.5)*2, 0xff0066, 3);
    haptic([60,20,100,20,60]);
    showN('💔 מומו: "זיפו—!"');
    for(let i=0;i<8;i++){
      const ang=i/8*Math.PI*2;
      spawnPfx(SCENE_X-0.5+Math.cos(ang)*2, 2.2,
        SCENE_Z+1+Math.sin(ang)*2, 0xdd0055, 4);
    }
  },1700);

  // -- שלב ד (2500ms): Z18 נסוג --
  setTimeout(()=>{
    haptic([40,20,80]);
    showN('⚠️ Z-18 נסוג לאזור APEX עם מומו!');
    let _rT=0;
    const _rI=setInterval(()=>{
      _rT+=16;
      z18mesh.position.z+=0.2; z18mesh.position.x+=0.05;
      momoDummy.position.z+=0.2; momoDummy.position.x+=0.05;
      grabLight.intensity=Math.max(0,grabLight.intensity-0.07);
      fillL.intensity=Math.max(0,fillL.intensity-0.05);
      if(_rT>=600)clearInterval(_rI);
    },16);
  },2500);

  // -- שלב ה (3300ms): מצלמה חוזרת → cleanup → cutscene --
  setTimeout(()=>{
    _camPhase=2;
    clearInterval(_camTick);
    let _retT=0;
    const _retI=setInterval(()=>{
      _retT+=16;
      const p=Math.min(_retT/700,1), e=1-Math.pow(1-p,3);
      camera.position.lerpVectors(cam2, origCamPos, e);
      camera.lookAt(new THREE.Vector3().lerpVectors(camLook, origLookAt, e));
      if(_retT>=700){
        clearInterval(_retI);
        scene.remove(z18mesh);scene.remove(momoDummy);
        scene.remove(grabLight);scene.remove(fillL);
        G._cinemaMode=false; // שחרר שליטת מצלמה
        G.paused=false;
        showCut('ch8_zippo_returns',()=>{
          setMission(46);buildZ18();_lodStaticObjs=null;_lodShadowObjs=null;
        });
      }
    },16);
  },3300);
}


// פנל סינמטי צדדי — מציג את האנימציה
let _grabPanelEl=null;
function _showGrabPanel(){
  if(_grabPanelEl)return;
  // עצור את המשחק — כמו התקף הלב של רקס
  G._grabPaused=true;

  const el=document.createElement('div');
  el.id='grab-panel';
  el.style.cssText=`
    position:fixed;inset:0;background:rgba(5,0,12,0.94);
    z-index:9000;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    font-family:inherit;
  `;

  // CSS אנימציה
  if(!document.getElementById('grab-panel-style')){
    const s=document.createElement('style');
    s.id='grab-panel-style';
    s.textContent=`
      @keyframes grab-in{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
      @keyframes grab-pulse-border{0%,100%{box-shadow:0 0 28px #cc006699,inset 0 0 40px rgba(150,0,60,0.12);}50%{box-shadow:0 0 50px #ff008888,inset 0 0 60px rgba(200,0,80,0.18);}}
      #grab-panel{animation:grab-in 0.45s ease-out forwards;}
      @keyframes grab-title-flash{0%,100%{opacity:1;}50%{opacity:0.6;}}
      #grab-title{animation:grab-title-flash 1.1s ease-in-out infinite;}
    `;
    document.head.appendChild(s);
  }

  // כותרת
  const title=document.createElement('div');
  title.id='grab-title';
  title.style.cssText='color:#ff2266;font-size:clamp(18px,4vw,26px);font-weight:bold;letter-spacing:3px;text-align:center;margin-bottom:18px;text-shadow:0 0 16px #ff0055;';
  title.textContent='💔 Z-18 תופס את מומו!';
  el.appendChild(title);

  // Canvas לאנימציה
  const cvs=document.createElement('canvas');
  const cvsSize=Math.min(window.innerWidth*.7,340);
  cvs.width=340;cvs.height=280;
  cvs.style.cssText=`width:${cvsSize}px;height:${Math.round(cvsSize*280/340)}px;border-radius:8px;border:2px solid #cc0066;box-shadow:0 0 30px #cc006655;`;
  el.appendChild(cvs);

  // תיאור
  const desc=document.createElement('div');
  desc.id='grab-panel-desc';
  desc.style.cssText='color:#ffaacc;font-size:clamp(12px,2.5vw,16px);text-align:center;margin-top:16px;line-height:1.6;max-width:320px;text-shadow:0 0 8px #ff006644;';
  desc.textContent='Z-18 פורץ לבסיס';
  el.appendChild(desc);

  // כפתור המשך — מופיע אחרי 3 שניות
  const cont=document.createElement('div');
  cont.style.cssText='color:#ff6699;font-size:13px;margin-top:20px;opacity:0;transition:opacity 0.5s;cursor:pointer;border:1px solid #cc0066;padding:8px 20px;border-radius:6px;';
  cont.textContent='הבן / הביני (הקש/י להמשיך)';
  el.appendChild(cont);
  setTimeout(()=>cont.style.opacity='1',3000);
  cont.onclick=()=>_closeGrabPanel();

  document.body.appendChild(el);
  _grabPanelEl=el;

  // אנימציה על canvas
  const ctx=cvs.getContext('2d');
  const W=340,H=280;
  let animT=0;
  const descTexts=[
    'Z-18 פורץ לבסיס',
    '💔 מומו נתפסת!',
    'Z-18 אוחז בה בכוח',
    'זיפו — בוא מהר!'
  ];
  let descIdx=0;

  G._grabPanelAnim=setInterval(()=>{
    animT+=16;
    const t=animT/1000;
    ctx.clearRect(0,0,W,H);

    // רקע
    ctx.fillStyle='#050008';
    ctx.fillRect(0,0,W,H);
    const grad=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,130);
    grad.addColorStop(0,'rgba(180,0,60,0.25)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

    // אפקט וינייט
    const vig=ctx.createRadialGradient(W/2,H/2,60,W/2,H/2,160);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(1,'rgba(0,0,20,0.7)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);

    // מומו (ורוד, שמאל) — מרקדת / נישאת
    const grabProg=animT>800?Math.min((animT-800)/900,1):0;
    const momoX=90+(grabProg*30);
    const momoY=140+Math.sin(t*4)*(grabProg>0.5?2:5)-(grabProg*28);
    const momoRot=grabProg*0.4;

    ctx.save();
    ctx.translate(momoX,momoY);
    ctx.rotate(momoRot);
    // גוף מומו
    ctx.fillStyle='#d4a0c8';
    ctx.beginPath();ctx.ellipse(0,0,22,16,0,0,Math.PI*2);ctx.fill();
    // ראש
    ctx.fillStyle='#e0b0d4';
    ctx.beginPath();ctx.arc(0,-20,16,0,Math.PI*2);ctx.fill();
    // אוזניים
    ctx.fillStyle='#c090b8';
    ctx.beginPath();ctx.ellipse(-10,-34,5,9,-.4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(10,-34,5,9,.4,0,Math.PI*2);ctx.fill();
    // עיניים — פחד
    const eyeOpen=grabProg>0.3?0.6+Math.sin(t*8)*0.4:1;
    ctx.fillStyle='#ff88aa';
    ctx.beginPath();ctx.ellipse(-6,-22,3.5,3.5*eyeOpen,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(6,-22,3.5,3.5*eyeOpen,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#220011';
    ctx.beginPath();ctx.arc(-6,-22,1.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(6,-22,1.5,0,Math.PI*2);ctx.fill();
    // רגליים
    ctx.fillStyle='#c090b8';
    ctx.beginPath();ctx.ellipse(-8,14,5,10,-.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(8,14,5,10,.2,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // Z-18 (ימין)
    const z18X=220;const z18Y=135;
    // גוף Z-18
    ctx.fillStyle='#0a0012';
    ctx.beginPath();ctx.ellipse(z18X,z18Y,28,22,0,0,Math.PI*2);ctx.fill();
    // ראש
    ctx.fillStyle='#120018';
    ctx.beginPath();ctx.arc(z18X,z18Y-30,20,0,Math.PI*2);ctx.fill();
    // עיניים זוהרות
    const eyeG=0.75+Math.sin(t*5)*0.25;
    const eyeSize=3.5+Math.sin(t*3)*0.5;
    ctx.fillStyle=`rgba(255,0,80,${eyeG})`;
    ctx.beginPath();ctx.arc(z18X-8,z18Y-32,eyeSize,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(z18X+8,z18Y-32,eyeSize,0,Math.PI*2);ctx.fill();
    // הילה אדומה
    ctx.strokeStyle=`rgba(220,0,90,${0.25+Math.sin(t*2)*0.15})`;
    ctx.lineWidth=4;ctx.beginPath();ctx.arc(z18X,z18Y-5,32,0,Math.PI*2);ctx.stroke();

    // יד Z-18 אוחזת
    if(grabProg>0){
      const armEndX=momoX+20;
      const armEndY=momoY-5;
      const armStartX=z18X-20;
      const armStartY=z18Y+5;
      ctx.strokeStyle=`rgba(18,0,30,${Math.min(1,grabProg*1.5)})`;
      ctx.lineWidth=9;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(armStartX,armStartY);ctx.lineTo(armEndX,armEndY);ctx.stroke();
      // "טפרים"
      if(grabProg>0.5){
        const gp=(grabProg-0.5)*2;
        ctx.strokeStyle=`rgba(200,0,50,${gp*0.8})`;
        ctx.lineWidth=2;
        for(let i=-2;i<=2;i++){
          ctx.beginPath();ctx.moveTo(armEndX,armEndY);ctx.lineTo(armEndX+i*5,armEndY-10*gp);ctx.stroke();
        }
      }
    }

    // particles חרדה
    if(grabProg>0.3&&Math.random()>0.5){
      ctx.fillStyle=`rgba(255,0,80,${Math.random()*0.6})`;
      const px2=momoX+(Math.random()-.5)*40;
      const py2=momoY+(Math.random()-.5)*35;
      ctx.beginPath();ctx.arc(px2,py2,Math.random()*4+1,0,Math.PI*2);ctx.fill();
    }
    // ניצוצות שחורים של Z-18
    if(Math.random()>0.7){
      ctx.fillStyle=`rgba(150,0,60,${Math.random()*0.5})`;
      const px2=z18X+(Math.random()-.5)*50;
      const py2=z18Y+(Math.random()-.5)*45;
      ctx.beginPath();ctx.arc(px2,py2,Math.random()*3+1,0,Math.PI*2);ctx.fill();
    }

    // עדכן תיאור
    const newDescIdx=Math.min(Math.floor(animT/1000),descTexts.length-1);
    if(newDescIdx!==descIdx){
      descIdx=newDescIdx;
      const d=document.getElementById('grab-panel-desc');
      if(d)d.textContent=descTexts[descIdx];
    }
  },16);
}

function _closeGrabPanel(){
  if(G._grabPanelAnim){clearInterval(G._grabPanelAnim);G._grabPanelAnim=null;}
  if(_grabPanelEl){
    _grabPanelEl.style.transition='opacity 0.45s';
    _grabPanelEl.style.opacity='0';
    setTimeout(()=>{if(_grabPanelEl){_grabPanelEl.remove();_grabPanelEl=null;}},450);
  }
  G._grabPaused=false;
}

// ════════════════════════════════════════════════
// buildZ18 — בניית Z-18 בעולם
// ════════════════════════════════════════════════
function buildZ18(){
  if(_z18Enemy)return;
  const mesh=mkZ18Model();
  mesh.position.set(105,0,15);  // ליד הכניסה לבסיס
  scene.add(mesh);
  const bar=hpBar(mesh,2.8,4.0);
  bar.material.color.setHex(0xcc0066);

  _z18Enemy={
    mesh,bar,
    hp:Z18_HP,mhp:Z18_HP,spd:Z18_SPD,
    atk:4.0,atkT:0,dead:false,
    _phase:1,
    _shadowT:0,  // Shadow Step cooldown
    _darkFlameT:0,
    _grabDone:false,
    _chargeT:0,_chargeActive:false,_cvx:0,_cvz:0,
    _hitT:0,_hitCD:0
  };
  G._z18Enemy=_z18Enemy;
  // הוסף ל-G.bosses כדי ש-LOD לא יסתיר את המודל
  G.bosses.push(_z18Enemy);
}

// ════════════════════════════════════════════════
// updZ18 — AI + מכות מיוחדות
// ════════════════════════════════════════════════
function updZ18(dt){
  if(!_z18Enemy||_z18Enemy.dead||G.mission!==46)return;
  const b=_z18Enemy;
  const px=PB.position.x,pz=PB.position.z;
  b.mesh.position.y=0; // keep grounded — בבסיס
  const dd=d2(b.mesh.position.x,b.mesh.position.z,px,pz);
  const dog=G.dogs[G.dog];

  b.atkT=Math.max(0,b.atkT-dt);
  b._shadowT=Math.max(0,b._shadowT-dt);
  b._darkFlameT=Math.max(0,b._darkFlameT-dt);
  b._chargeT=Math.max(0,b._chargeT-dt);
  b._hitT=Math.max(0,b._hitT-dt);
  b._hitCD=Math.max(0,b._hitCD-dt);

  // ── הילה מתפשטת — פולס ──
  if(b.mesh._aura){
    const pulse=0.8+0.2*Math.sin(Date.now()*0.004);
    b.mesh._aura.intensity=(b._phase===2?5.5:3.5)*pulse;
  }

  // ── פאזה 2 (50% HP) ── 
  if(b.hp/b.mhp<=0.5&&b._phase===1){
    b._phase=2;b.spd*=1.3;
    showCut('ch8_z18_phase2',()=>{});
    // העיניים מתעצמות
    if(b.mesh._eyeLLight)b.mesh._eyeLLight.intensity=3.5;
    if(b.mesh._eyeRLight)b.mesh._eyeRLight.intensity=3.5;
    if(b.mesh._eyeLLight)b.mesh._eyeLLight.color.setHex(0xff00aa);
    if(b.mesh._eyeRLight)b.mesh._eyeRLight.color.setHex(0xff00aa);
    if(b.mesh._aura)b.mesh._aura.color.setHex(0xff0088);
    // Dark Flame burst
    for(let i=0;i<12;i++)spawnPfx(
      b.mesh.position.x+(Math.random()-.5)*3,
      0.5+Math.random()*2,
      b.mesh.position.z+(Math.random()-.5)*3,
      0xcc0066,3
    );
    haptic([100,40,100,40,100]);
  }

  // ── תנועה + מכות ──
  if(!b._chargeActive&&!b._shadowStepping){
    // תנועה לעבר השחקן
    const dx=px-b.mesh.position.x,dz=pz-b.mesh.position.z;
    const l=Math.sqrt(dx*dx+dz*dz)||1;
    b.mesh.position.x+=dx/l*b.spd*dt;
    b.mesh.position.z+=dz/l*b.spd*dt;
    b.mesh.rotation.y=Math.atan2(dx,dz);

    // ── Shadow Step — קפיצה לאחור השחקן ──
    if(b._shadowT<=0&&dd<12&&Math.random()<0.008){
      b._shadowT=b._phase===2?4.0:6.5;
      b._shadowStepping=true;
      // נעלם לחצי שנייה
      b.mesh.visible=false;
      spawnPfx(b.mesh.position.x,1,b.mesh.position.z,0xcc0066,8);
      setTimeout(()=>{
        if(b.dead)return;
        // מופיע מאחורי השחקן
        const ang=G.yaw+Math.PI+((Math.random()-.5)*0.6);
        b.mesh.position.x=PB.position.x+Math.sin(ang)*2.5;
        b.mesh.position.z=PB.position.z+Math.cos(ang)*2.5;
        b.mesh.visible=true;
        b._shadowStepping=false;
        spawnPfx(b.mesh.position.x,1,b.mesh.position.z,0xff0088,8);
        showN('👁️ Shadow Step!');
        haptic(30);
        // מכה מיידית מהגב
        const ddNow=d2(b.mesh.position.x,b.mesh.position.z,px,pz);
        if(ddNow<3){dmgPlayer(18);haptic([50,20,50]);}
      },400);
    }

    // ── Dark Flame — גל אש כהה ──
    if(b._darkFlameT<=0&&b._phase>=2&&dd<10){
      b._darkFlameT=5.0;
      showN('🌑 Dark Flame!');
      haptic([60,25,60]);
      // פיצוץ particles ורודים-שחורים
      for(let i=0;i<8;i++){
        const ang=i/8*Math.PI*2;
        spawnPfx(
          b.mesh.position.x+Math.cos(ang)*2,0.5,
          b.mesh.position.z+Math.sin(ang)*2,
          0xaa0044,4
        );
      }
      if(dd<5){dmgPlayer(22);haptic([70,25,70]);}
    }

    // ── מכה רגילה ──
    if(dd<b.atk&&b.atkT<=0){
      b.atkT=b._phase===2?0.9:1.3;
      dmgPlayer(b._phase===2?15:11);
      haptic(30);
    }
  }

  // ── קרב זיפו — מצית + דאודורנט (Metal Gear style) ──
  if(G.dog==='zippo'&&G.mission===46){
    // הצג מצית ברגע הקרב
    if(_zippoLighterMesh&&!_zippoLighterMesh.visible){
      _zippoLighterMesh.visible=true;
    }

    // ── מכה רגילה: להבה קטנה מהמצית (כל מכה = אש) ──
    if(dd<5.5&&G._atkFrame&&b._hitT<=0){
      const dmg=Math.round(dog.pow*14*(1+dog.lv*.12));
      b.hp-=dmg;sHit();haptic(28);
      flash(b.mesh.children[0]);
      // גל אש לכיוון Z18
      const ang=Math.atan2(b.mesh.position.x-PB.position.x, b.mesh.position.z-PB.position.z);
      for(let i=0;i<18;i++){
        const spread=(Math.random()-.5)*0.6;
        const dist=0.6+Math.random()*3.5;
        spawnPfx(
          PB.position.x+Math.sin(ang+spread)*dist,
          0.5+Math.random()*1.4,
          PB.position.z+Math.cos(ang+spread)*dist,
          Math.random()>.4?0xff5500:0xffaa00, 3.5);
      }
      // ניצוצות לבן-צהוב
      for(let i=0;i<6;i++)
        spawnPfx(b.mesh.position.x+(Math.random()-.5)*1.5,
          1.0+Math.random(),b.mesh.position.z+(Math.random()-.5)*1.5,
          Math.random()>.5?0xffdd00:0xffffff, 2);
      // אור אש — מהמצית
      const fl=new THREE.PointLight(0xff5500,14,7);
      fl.position.copy(PB.position).y+=0.8;
      scene.add(fl);
      let _flt=0;
      const _flI=setInterval(()=>{_flt+=16;fl.intensity=Math.max(0,14-(_flt/200)*14)*(0.8+Math.random()*0.4);if(_flt>=200){clearInterval(_flI);scene.remove(fl);}},16);
      // המצית מבזיקה
      if(_zippoLighterMesh){
        if(_zippoLighterMesh._flameLight)_zippoLighterMesh._flameLight.intensity=9;
        if(_zippoLighterMesh._flame)_zippoLighterMesh._flame.scale.setScalar(2.2);
        setTimeout(()=>{if(_zippoLighterMesh){if(_zippoLighterMesh._flameLight)_zippoLighterMesh._flameLight.intensity=2.2;if(_zippoLighterMesh._flame)_zippoLighterMesh._flame.scale.setScalar(1);}},200);
      }
      // כוויה על Z18
      if(b.mesh._aura){b.mesh._aura.color.setHex(0xff6600);setTimeout(()=>{if(!b.dead&&b.mesh._aura)b.mesh._aura.color.setHex(0xcc0066);},300);}
      showDmg(b.mesh.position.x,2,b.mesh.position.z,Math.round(dmg),'#ff5500');
      b._hitT=0.4;b._hitCD=0.4;G.atkCD=0.5;
      if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
    }

    // ── כל 5 שניות: להבה ענקית אוטומטית (בלי לחצן נפרד) ──
    if(!b._flameCD)b._flameCD=0;
    b._flameCD=Math.max(0,b._flameCD-dt);
    if(b._flameCD<=0&&dd<9&&G.dog==='zippo'){
      b._flameCD=5.0;
      haptic([80,30,120,30,80]);
      showN('🔥 להבת זיפו!');
      if(_zippoLighterMesh){
        _zippoLighterMesh.scale.setScalar(4.5);
        if(_zippoLighterMesh._flameLight)_zippoLighterMesh._flameLight.intensity=18;
        if(_zippoLighterMesh._flame)_zippoLighterMesh._flame.scale.setScalar(4);
        setTimeout(()=>{if(_zippoLighterMesh){_zippoLighterMesh.scale.setScalar(1.8);if(_zippoLighterMesh._flameLight)_zippoLighterMesh._flameLight.intensity=2.2;if(_zippoLighterMesh._flame)_zippoLighterMesh._flame.scale.setScalar(1);}},700);
      }
      const ang2=Math.atan2(b.mesh.position.x-PB.position.x, b.mesh.position.z-PB.position.z);
      for(let i=0;i<36;i++){
        const spread=(Math.random()-.5)*0.8;
        const dist=1.5+Math.random()*6;
        spawnPfx(PB.position.x+Math.sin(ang2+spread)*dist,0.3+Math.random()*2,PB.position.z+Math.cos(ang2+spread)*dist,Math.random()>.4?0xff5500:0xffaa00,5);
      }
      const bigL=new THREE.PointLight(0xff5500,28,14);
      bigL.position.copy(PB.position).y+=1;scene.add(bigL);
      let _bT=0;const _bI=setInterval(()=>{_bT+=16;bigL.intensity=Math.max(0,28-(_bT/800)*28)*(0.7+Math.random()*0.6);if(_bT>=800){clearInterval(_bI);scene.remove(bigL);}},16);
      if(dd<9){
        const flameDmg=Math.round(dog.pow*55*(1+dog.lv*.12));
        b.hp-=flameDmg;b._hitT=0.8;b._hitCD=0.8;
        flash(b.mesh.children[0]);
        showDmg(b.mesh.position.x,2.5,b.mesh.position.z,Math.round(flameDmg),'#ff4400');
        haptic([100,40,80]);
        if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
        if(b.mesh._aura)b.mesh._aura.color.setHex(0xff5500);
        setTimeout(()=>{if(!b.dead&&b.mesh._aura)b.mesh._aura.color.setHex(0xcc0066);},800);
      }
    }

    // ── מוות Z18 ──
    if(b.hp<=0&&!b.dead){
      b.dead=true;b.mesh.visible=false;
      if(b.mesh._aura)b.mesh._aura.intensity=0;
      if(b.mesh._eyeLLight)b.mesh._eyeLLight.intensity=0;
      if(b.mesh._eyeRLight)b.mesh._eyeRLight.intensity=0;
      _hideZ18WeaponMode(); // הסתר מצית + דאודורנט
      sCapture();haptic([120,50,100,30,120]);
      addXP(400);G.score+=3000;G.coins+=200;updCoins();
      for(let i=0;i<16;i++)spawnPfx(
        b.mesh.position.x+(Math.random()-.5)*5,0.5+Math.random()*3,
        b.mesh.position.z+(Math.random()-.5)*5, 0xcc0066,3
      );
      G.paused=true;
      setTimeout(()=>showCut('ch8_ending',()=>{
        G.paused=false;
        setMission(47);
        showN('🔜 APEX נמשך. פרק ט׳ בקרוב.');
      }),1000);
    }
  }
  if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
}

// ════════════════════════════════════════════════
// updCh8 — לולאת פרק ח
// ════════════════════════════════════════════════
function updCh8(dt){
  if(G.mission<40||G.mission>47)return;
  const px=PB.position.x,pz=PB.position.z;
  // ── אנימציית ניצוצות מפעל ──
  if(G._indSparkLight){
    G._indSparkT=(G._indSparkT||0)+dt;
    const flicker=Math.sin(G._indSparkT*18)*.5+.5;
    G._indSparkLight.intensity=flicker*2.2*(Math.random()>.85?2:1);
    if(Math.random()>.97)G._indSparkLight.color.setHex(Math.random()>.5?0xff6600:0xffaa00);
  }

  // ── Mission 40: עדויות NPC ──
  if(G.mission===40){
    if(!G._ch8WitnessInit){
      G._ch8WitnessInit=true;
      _ch8WitnessCount=0;
      // בנה mesh לכל עד — NPC פשוט עם אינדיקטור
      const wDefs=[
        {x:-68,z:44,buildFn:()=>mkShuki(.82)},
        {x:-55,z:60,buildFn:()=>mkBoxer(.80)},
        {x:-80,z:30,buildFn:()=>mkBella(.78)}
      ];
      G._ch8Witnesses=wDefs.map((w,i)=>{
        const mesh=w.buildFn();
        mesh.position.set(w.x,0,w.z);
        // סבב לכיוון השחקן — כלפי מרכז
        mesh.rotation.y=Math.atan2(0-w.x, 60-w.z);
        scene.add(mesh);
        // אינדיקטור שאלה צהוב
        const ind=new THREE.Mesh(
          new THREE.SphereGeometry(.28,6,6),
          new THREE.MeshLambertMaterial({color:0xffcc00,emissive:0x443300})
        );
        ind.position.set(0,2.5,0);
        mesh.add(ind);
        return {mesh,ind,x:w.x,z:w.z,talked:false};
      });
    }
    const witnesses=G._ch8Witnesses||[{x:-68,z:44},{x:-55,z:60},{x:-80,z:30}];
    const ip=document.getElementById('ip');
    let nearAny=false;
    witnesses.forEach((w,i)=>{
      if(w.talked)return; // כבר דיברנו
      const wx=w.x||w.mesh?.position.x, wz=w.z||w.mesh?.position.z;
      if(d2(px,pz,wx,wz)<4){
        nearAny=true;
        if(ip){ip.textContent='💬 E — דבר';ip.style.display='block';}
        if(G._eKeyFrame||G.keys['KeyE']){
          G._eKeyFrame=false;G.keys['KeyE']=false;
          w.talked=true;
          if(w.ind)w.ind.visible=false; // הסר אינדיקטור
          _ch8WitnessCount++;
          const lines=[
            'תושב: \\"הכלב של השכן... נעלם אמש. הוא לא הבין.\\"',
            'ילדה: \\"הכלב שלנו, בוקסר, לא היה בבוקר. הוא לא בורח אף פעם.\\"',
            'זקן: \\"שלושה כלבים מהרחוב הזה. שבוע אחד. משהו לא בסדר.\\"'
          ];
          showN(`🐾 ${lines[i]}`);
          if(_ch8WitnessCount>=3){
            setTimeout(()=>{
              showN('🐾 מומו: \\"הדפוס ברור. זה לא מקרי.\\"');
              setTimeout(()=>setMission(41),2000);
            },1500);
          }
        }
      }
    });
    if(!nearAny&&ip&&ip.style.display!=='none'&&ip.textContent.includes('דבר'))
      ip.style.display='none';
  }

  // ── Mission 41: אזור תעשייה APEX — קרב חיילי על ──
  if(G.mission===41){
    if(G._ch8Witnesses&&!G._ch8WitnessesHidden){
      G._ch8WitnessesHidden=true;
      G._ch8Witnesses.forEach(w=>{if(w.ind)w.ind.visible=false;});
    }
    const inZone = px>178 && px<280 && pz<-86 && pz>-220;

    // ── reset אם נשמר מצב שבור מגרסה קודמת ──
    if(inZone && G._ch8TrailReached && !G._ch8ClearCheck){
      // נלחמנו כבר? בדוק אם יש אויבי תעשייה בכלל
      const existEnemies = G.enemies.filter(e=>e.zone==='תעשייה').length;
      if(existEnemies===0){
        // אין אויבים — כנראה save ישן. ספון מחדש
        G._ch8TrailReached=false;
      }
    }

    // ── ספון אויבים בכניסה לזון ──
    if(inZone && !G._ch8TrailReached){
      G._ch8TrailReached=true;
      G._ch8ClearCheck=true;
      G._ch8Advancing42=false;
      showN('🏭 מומו: "הריח מוביל לאזור התעשייה. מישהו כאן."');
      [[208,-110],[225,-115],[240,-108],[215,-130]].forEach(([sx,sz])=>{
        const mesh=mkSuperSoldier(0x1a1020);
        mesh.position.set(sx,0,sz);scene.add(mesh);
        const bar=hpBar(mesh,1.8,2.8);
        G.enemies.push({mesh,hp:SUPER_HP,mhp:SUPER_HP,spd:SUPER_SPD,
          alert:22,atk:SUPER_ATK,atkT:0,bar,
          homeX:sx,homeZ:sz,patAng:Math.random()*Math.PI*2,patT:2,state:'patrol',
          lastSeenX:0,lastSeenZ:0,searchT:0,zone:'תעשייה',
          _chargeT:0,_chargeReady:false,_chargeActive:false,
          _cvx:0,_cvz:0,_slamT:0,_howlT:0,_hitFlash:0,_isSuperSoldier:true});
      });
      _lodStaticObjs=null;_lodShadowObjs=null; // רענן LOD אחרי spawn חיילים חדשים
    }

    // ── בדוק ניקוי ──
    if(G._ch8TrailReached){
      const alive=G.enemies.filter(e=>e.hp>0&&e.mesh&&e.mesh.visible&&e.zone==='תעשייה').length;
      if(alive===0&&!G._ch8Advancing42){
        G._ch8Advancing42=true;
        G._ch8ClearCheck=false;
        setTimeout(()=>{if(G.mission===41)setMission(42);},1200);
      }
    }
  }

  // ── Mission 42: מחסן APEX — כנס ומצא ראיות ──
  if(G.mission===42){
    const wPos=G.warehousePos||{x:205,z:-125};
    const doorZ=wPos.z+11;
    const distDoor=d2(px,pz,wPos.x,doorZ);
    if(distDoor<30&&!G._ch8WarehouseGuardsSpawned){
      G._ch8WarehouseGuardsSpawned=true;
      [[wPos.x-8,doorZ+4],[wPos.x+9,doorZ+4],[wPos.x,wPos.z-6]].forEach(([sx,sz])=>{
        const mesh=mkSuperSoldier(0x0d0820);
        mesh.position.set(sx,0,sz);scene.add(mesh);
        const bar=hpBar(mesh,1.8,2.8);
        G.enemies.push({mesh,hp:SUPER_HP,mhp:SUPER_HP,spd:SUPER_SPD,
          alert:18,atk:SUPER_ATK,atkT:0,bar,
          homeX:sx,homeZ:sz,patAng:0,patT:0,state:'patrol',
          lastSeenX:0,lastSeenZ:0,searchT:0,zone:'מחסן',
          _chargeT:0,_chargeReady:false,_chargeActive:false,
          _cvx:0,_cvz:0,_slamT:0,_howlT:0,_hitFlash:0,_isSuperSoldier:true});
      });
      _lodStaticObjs=null;_lodShadowObjs=null; // רענן LOD אחרי spawn שומרי מחסן
    }
    // trigger כניסה למחסן — zone-based
    const insideWH = px>wPos.x-15 && px<wPos.x+15 && pz>wPos.z-12 && pz<wPos.z+12;
    if(insideWH&&!G._ch8WarehouseReached){
      G._ch8WarehouseReached=true;
      showCut('ch8_warehouse',()=>{
        showN('📦 לוגו APEX. ארגון. כסף. תכנית גדולה.');
        setTimeout(()=>{if(G.mission===42)setMission(43);},2500);
      });
    }
  }

  // ── Mission 43: חזרה לבסיס האמיתי ──
  if(G.mission===43){
    const dist=d2(px,pz,105,25);
    if(dist<10&&!G._ch8HomeReached){
      G._ch8HomeReached=true;
      showCut('ch8_they_know',()=>setMission(44));
    }
  }

  // ── Mission 44: Z-18 מופיע ליד הבסיס ──
  if(G.mission===44){
    if(!G._ch8ZippoForced){G._ch8ZippoForced=true;forceDog('zippo','זיפו יוצא לסיור');}
    const dist=d2(px,pz,105,10);
    if(dist<10&&!G._ch8Z18FirstSeen){
      G._ch8Z18FirstSeen=true;
      // בנה Z-18 preview — עומד מרחוק מחוץ לבסיס
      if(!G._z18Preview){
        const pm=mkZ18Model();
        pm.position.set(105,-0.1,-8);
        scene.add(pm);G._z18Preview=pm;
      }
      showCut('ch8_z18_first',()=>{
        // Z-18 נעלם
        if(G._z18Preview){scene.remove(G._z18Preview);G._z18Preview=null;}
        setMission(45);
      });
    }
  }

  // ── Mission 45: קרב בבסיס ללא זיפו + grab מומו ──
  if(G.mission===45){
    if(!G._ch8Wave1Done){
      // ספון גל חיילי APEX שתוקפים את הבסיס
      forceDog('colin','קולין ומומו מגנים על הבסיס');
      if(!G._ch8WaveSpawned){
        G._ch8WaveSpawned=true;
        // אויבים תוקפים מכל כיוון אל הבסיס
        [[95,40],[115,40],[100,8],[110,8],[88,25],[122,25]].forEach(([sx,sz])=>{
          const mesh=mkSuperSoldier(0x0d0d20);
          mesh.position.set(sx,0,sz);scene.add(mesh);
          const bar=hpBar(mesh,1.8,2.8);
          G.enemies.push({mesh,hp:SUPER_HP,mhp:SUPER_HP,spd:SUPER_SPD,
            alert:20,atk:SUPER_ATK,atkT:0,bar,
            homeX:sx,homeZ:sz,patAng:0,patT:0,state:'chase',
            lastSeenX:px,lastSeenZ:pz,searchT:12,zone:'ch8wave',
            _chargeT:0,_chargeReady:false,_chargeActive:false,
            _cvx:0,_cvz:0,_slamT:0,_howlT:0,_hitFlash:0,_isSuperSoldier:true});
        });
        _lodStaticObjs=null;_lodShadowObjs=null; // רענן LOD אחרי spawn גל תקיפה
        showN('⚠️ APEX תוקפים את הבסיס! הגן על הבסיס!');
        haptic([100,30,100]);
      }
      // בדוק ניקוי
      const alive=G.enemies.filter(e=>e.hp>0&&e.mesh.visible&&e.zone==='ch8wave').length;
      if(alive===0&&G._ch8WaveSpawned&&!G._ch8GrabTriggered){
        G._ch8Wave1Done=true;
        G._ch8GrabTriggered=true;
        // Z-18 מופיע בבסיס ואוחז במומו — אנימציה סינמטית
        setTimeout(()=>{
          _triggerZ18GrabScene();
        },800);
      }
    }
  }

  // ── Mission 46: קרב Z-18 ──
  if(G.mission===46){
    // הצג נשקי זיפו פעם אחת
    if(!G._z18FightTipShown){
      G._z18FightTipShown=true;
      _showZ18WeaponMode();
      setTimeout(()=>showN('🔥 F = ניצוצות זיפו | Q = מצית×דאודורנט (5s cooldown)'),1200);
    }
    // עדכן מיקום מצית + דאודורנט בכל frame
    if(typeof _updateZippoLighter==='function')_updateZippoLighter(dt);
    if(typeof _updateDeodorant==='function')_updateDeodorant();
    updZ18(dt);
  }
}


// ════════════════════════════════════════════════
// תל אביב — פרק ט׳ — עיר שלמה
// ════════════════════════════════════════════════

const TA = {inTA:false, playerX:0, playerZ:0, playerYaw:0, enterGrace:0};
let taScene=null, taCamera=null, taObjects=[], taEnemies=[];

// ── כלי עזר מקומיים (מקבילים לכלי לוד, עובדים על taScene) ──
const _taLamps=[];         // {bulb, x, z}
const _taLampPool=[];      // pool של PointLights
const _taBldList=[];       // collision: [{x,z,w,d}]

var _taAdd=function(m){ taScene.add(m); taObjects.push(m); return m; };

function _taDk(c,f){
  return ((Math.floor(((c>>16)&0xff)*f)<<16)|
          (Math.floor(((c>>8 )&0xff)*f)<<8 )|
           Math.floor((c&0xff)*f));
}
function _taRnd(a,b){ return a+(b-a)*Math.random(); }

// טקסטורות — זהות ללוד, נוצרות פעם אחת ב-buildTelAvivScene
let _taRoadTex=null, _taSidewalkTex=null,
    _taWallTex=null, _taWallStone=null,
    _taRoofTex=null, _taAsphalt=null;

function _taMkRoadTex(){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#1e2222';tx.fillRect(0,0,sz,sz);
  for(let i=0;i<2400;i++){
    const x=Math.random()*sz,y=Math.random()*sz,r=.25+Math.random()*1.1;
    const v=Math.floor(22+Math.random()*28);
    tx.fillStyle=`rgb(${v},${v},${v})`;
    tx.beginPath();tx.arc(x,y,r,0,Math.PI*2);tx.fill();
  }
  for(let i=0;i<35;i++){
    const x1=Math.random()*sz,y1=Math.random()*sz;
    tx.strokeStyle=`rgba(${38+Math.floor(Math.random()*18)},${38+Math.floor(Math.random()*18)},${38+Math.floor(Math.random()*18)},0.35)`;
    tx.lineWidth=.5+Math.random()*1.4;
    tx.beginPath();tx.moveTo(x1,y1);tx.lineTo(x1+(Math.random()-.5)*28,y1+(Math.random()-.5)*28);tx.stroke();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _taMkSidewalkTex(){
  const sz=128,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#b2aaa0';tx.fillRect(0,0,sz,sz);
  tx.strokeStyle='rgba(75,70,62,0.5)';tx.lineWidth=1.5;
  for(let x=0;x<sz;x+=22){tx.beginPath();tx.moveTo(x,0);tx.lineTo(x,sz);tx.stroke();}
  for(let y=0;y<sz;y+=22){tx.beginPath();tx.moveTo(0,y);tx.lineTo(sz,y);tx.stroke();}
  for(let i=0;i<80;i++){
    const px=Math.random()*sz,py=Math.random()*sz,r=.3+Math.random()*1.4;
    tx.fillStyle=`rgba(85,80,72,${.04+Math.random()*.07})`;
    tx.beginPath();tx.arc(px,py,r,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _taMkWallTex(dark){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  const base=dark?'#3a3c3a':'#c8c0b4';
  tx.fillStyle=base;tx.fillRect(0,0,sz,sz);
  const tW=Math.floor(sz/4),tH=Math.floor(sz/3);
  for(let ty=0;ty<sz;ty+=tH) for(let tx2=0;tx2<sz;tx2+=tW){
    const v=Math.floor((dark?22:188)+Math.random()*(dark?18:22));
    const vg=dark?v:v-4,vb=dark?v-2:v-8;
    tx.fillStyle=`rgb(${v},${Math.max(0,vg)},${Math.max(0,vb)})`;
    tx.fillRect(tx2+1,ty+1,tW-2,tH-2);
  }
  tx.strokeStyle=dark?'#181a18':'#9a9288';tx.lineWidth=1.2;
  for(let ty=0;ty<sz;ty+=tH){tx.beginPath();tx.moveTo(0,ty);tx.lineTo(sz,ty);tx.stroke();}
  for(let tx2=0;tx2<sz;tx2+=tW){tx.beginPath();tx.moveTo(tx2,0);tx.lineTo(tx2,sz);tx.stroke();}
  for(let i=0;i<50;i++){
    const rx=Math.random()*sz,ry=Math.random()*sz,rr=.8+Math.random()*3;
    tx.fillStyle=`rgba(${dark?10:80},${dark?10:75},${dark?10:60},${.08+Math.random()*.15})`;
    tx.beginPath();tx.arc(rx,ry,rr,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _taMkRoofTex(){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');tx.fillStyle='#1e201c';tx.fillRect(0,0,sz,sz);
  for(let y=0;y<sz;y+=11){
    tx.fillStyle=`rgba(${34+Math.floor(Math.random()*8)},${36+Math.floor(Math.random()*7)},${30+Math.floor(Math.random()*7)},1)`;
    tx.fillRect(0,y,sz,9);tx.fillStyle='rgba(10,11,8,0.7)';tx.fillRect(0,y+9,sz,2);
  }
  for(let i=0;i<35;i++){
    const rx=Math.random()*sz,ry=Math.random()*sz;
    tx.fillStyle=`rgba(70,35,8,${.05+Math.random()*.14})`;
    tx.beginPath();tx.arc(rx,ry,2+Math.random()*8,0,Math.PI*2);tx.fill();
  }
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ── כביש תל אביב (מוסיף ל-taObjects) ──
function _taRd(cx,cz,w,len,vert){
  if(!_taRoadTex)_taRoadTex=_taMkRoadTex();
  if(!_taSidewalkTex)_taSidewalkTex=_taMkSidewalkTex();

  const rc=_taRoadTex.clone();rc.needsUpdate=true;
  rc.repeat.set(vert?w/8:len/8, vert?len/8:w/8);
  const rMat=new THREE.MeshStandardMaterial({map:rc,roughness:.93,metalness:0,color:0xdddddd});
  const road=new THREE.Mesh(new THREE.BoxGeometry(vert?w:len,.12,vert?len:w),rMat);
  road.position.set(cx,.06,cz);road.receiveShadow=true;road._isGround=true;
  _taAdd(road);

  // קו מרכזי
  const ylMat=new THREE.MeshLambertMaterial({color:0xffdd00});
  if(!vert){
    (()=>{const _ym=new THREE.Mesh(new THREE.BoxGeometry(len,.01,.1),ylMat);_ym.position.set(cx,.14,cz);_taAdd(_ym);})();
    const wMat=new THREE.MeshLambertMaterial({color:0xeeeeee});
    for(let i=cx-len/2+5;i<cx+len/2-4;i+=9){
      const m=new THREE.Mesh(new THREE.BoxGeometry(4,.01,.18),wMat);
      m.position.set(i,.14,cz);_taAdd(m);
    }
  } else {
    const yl=new THREE.Mesh(new THREE.BoxGeometry(.1,.01,len),ylMat);
    yl.position.set(cx,.14,cz);_taAdd(yl);
  }

  // מדרכות
  const swW=2.6;
  const sc=_taSidewalkTex.clone();sc.needsUpdate=true;
  const swMat=new THREE.MeshStandardMaterial({map:sc,roughness:.87,metalness:0,color:0xfafafa});
  if(!vert){
    [w/2+swW/2,-(w/2+swW/2)].forEach(oz=>{
      const sw=new THREE.Mesh(new THREE.BoxGeometry(len,.15,swW),swMat.clone());
      sw.position.set(cx,.075,cz+oz);sw.receiveShadow=true;_taAdd(sw);
      const curb=new THREE.Mesh(new THREE.BoxGeometry(len,.1,.16),new THREE.MeshLambertMaterial({color:0x909088}));
      curb.position.set(cx,.18,cz+oz+(oz>0?.85:-.85));_taAdd(curb);
    });
  } else {
    [w/2+swW/2,-(w/2+swW/2)].forEach(ox=>{
      const sw=new THREE.Mesh(new THREE.BoxGeometry(swW,.15,len),swMat.clone());
      sw.position.set(cx+ox,.075,cz);sw.receiveShadow=true;_taAdd(sw);
      const curb=new THREE.Mesh(new THREE.BoxGeometry(.16,.1,len),new THREE.MeshLambertMaterial({color:0x909088}));
      curb.position.set(cx+ox+(ox>0?.85:-.85),.18,cz);_taAdd(curb);
    });
  }
}

// ── בניין עירוני תל אביב — כמו bldBlock בלוד ──
// פלטות צבעים: בוז׳אוס, באוהאוס, בין-לאומי
const _TA_COLS_BAUHAUS =[0xf2ebe0,0xede4d5,0xf5eedc,0xe8e0cc,0xf0e8d5,0xe5dcc8,0xf8f2e5,0xeae2d5];
const _TA_COLS_MODERN  =[0xdde0e8,0xe0e4ec,0xd8dce5,0xe5e8f0,0xcdd3df,0xd5dae8,0xe2e8f5];
const _TA_COLS_OLD_JAFFA=[0xe0c8a0,0xd4b888,0xdcc099,0xc8a870,0xe0c88a,0xd4ba90];
const _TA_COLS_SEA     =[0xd8eaf5,0xcce0f0,0xd0e5f2,0xc5daea,0xd5e8f0];
const _TA_SHUTTER_COLS =[0x5a8a5a,0x8a5a5a,0x5a5a8a,0x7a6a4a,0x3a6a8a,0x8a7a3a,0x6a3a6a];

function _taBldBlock(x,z,w,d,h,zone){
  if(!_taWallTex) _taWallTex=_taMkWallTex(false);
  if(!_taRoofTex) _taRoofTex=_taMkRoofTex();

  // בחר פלטה לפי אזור
  let cols;
  if(zone==='sea')      cols=_TA_COLS_SEA;
  else if(zone==='jaffa')cols=_TA_COLS_OLD_JAFFA;
  else if(zone==='mod') cols=_TA_COLS_MODERN;
  else                  cols=_TA_COLS_BAUHAUS;

  const c=cols[Math.floor(Math.random()*cols.length)];
  const tC=_taWallTex.clone();tC.needsUpdate=true;tC.repeat.set(w/4,h/4);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.87,metalness:0});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;
  _taAdd(bld);_taBldList.push({x,z,w,d});

  // פרפט + איטום
  const pCol=_taDk(c,.78);
  const par=new THREE.Mesh(new THREE.BoxGeometry(w+.4,.45,d+.4),new THREE.MeshLambertMaterial({color:pCol}));
  par.position.set(x,h+.22,z);_taAdd(par);
  const seal=new THREE.Mesh(new THREE.BoxGeometry(w-.1,.06,d-.1),new THREE.MeshLambertMaterial({color:0x1e1e1c}));
  seal.position.set(x,h+.03,z);_taAdd(seal);

  // מיכל מים (65%)
  if(Math.random()<.65){
    const wx=x+(Math.random()-.5)*(w*.5),wz=z+(Math.random()-.5)*(d*.5);
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.68,8),new THREE.MeshLambertMaterial({color:0xc8c4bc}));
    wt.position.set(wx,h+.54,wz);_taAdd(wt);
  }

  // חלונות + תריסים — canvas texture
  const shutCol=_TA_SHUTTER_COLS[Math.floor(Math.random()*_TA_SHUTTER_COLS.length)];
  (()=>{
    const sc=64,tc=document.createElement('canvas');tc.width=sc*4;tc.height=sc*4;
    const tx=tc.getContext('2d');
    tx.clearRect(0,0,tc.width,tc.height);
    const cols2=Math.max(2,Math.floor(w/2.5)), rows2=Math.max(2,Math.floor(h/2.4));
    for(let r=0;r<rows2;r++) for(let c2=0;c2<cols2;c2++){
      const px=(c2/cols2)*tc.width+6, py=(r/rows2)*tc.height+6;
      const pw=tc.width/cols2-10, ph=tc.height/rows2-10;
      tx.fillStyle=`rgba(100,175,215,${.5+Math.random()*.35})`;
      tx.fillRect(px,py,pw,ph);
      tx.strokeStyle='rgba(235,225,205,.85)';tx.lineWidth=2;
      tx.strokeRect(px-1,py-1,pw+2,ph+2);
      if(Math.random()<.55){
        const sr=((shutCol>>16)&0xff),sg=((shutCol>>8)&0xff),sb=(shutCol&0xff);
        tx.fillStyle=`rgba(${sr},${sg},${sb},.78)`;
        tx.fillRect(px-1,py-1,pw*.45+2,ph+2);
      }
    }
    const winTex=new THREE.CanvasTexture(tc);
    const winMat=new THREE.MeshLambertMaterial({map:winTex,transparent:true,alphaTest:.04});
    const wp1=new THREE.Mesh(new THREE.PlaneGeometry(w*.88,h*.84),winMat);
    wp1.position.set(x,h/2+.1,z-d/2-.04);_taAdd(wp1);
    const wp2=new THREE.Mesh(new THREE.PlaneGeometry(w*.88,h*.84),winMat.clone());
    wp2.position.set(x,h/2+.1,z+d/2+.04);wp2.rotation.y=Math.PI;_taAdd(wp2);
    // צדדים
    const wpc=new THREE.Mesh(new THREE.PlaneGeometry(d*.78,h*.72),winMat.clone());
    wpc.position.set(x-w/2-.04,h/2+.1,z);wpc.rotation.y=-Math.PI/2;_taAdd(wpc);
  })();

  // מרפסות — סגנון ת"א
  if(h>7){
    for(let wy=3.2;wy<h-.9;wy+=4.2){
      const bw=Math.min(5.5,w-1.5);
      const bal=new THREE.Mesh(new THREE.BoxGeometry(bw,.11,1.1),new THREE.MeshLambertMaterial({color:_taDk(c,.86)}));
      bal.position.set(x,wy-.05,z-d/2-.55);_taAdd(bal);
      // מעקה דק
      const rail=new THREE.Mesh(new THREE.BoxGeometry(bw,.48,.07),new THREE.MeshLambertMaterial({color:0x888882}));
      rail.position.set(x,wy+.28,z-d/2-1.0);_taAdd(rail);
    }
  }

  // דלת כניסה
  const dc=new THREE.Color().setHSL(Math.random()*.1+.04,.5,.2+Math.random()*.08);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.0,.07),new THREE.MeshStandardMaterial({color:dc,roughness:.8,metalness:.06}));
  door.position.set(x+(Math.random()-.5)*(w*.3),.99,z-d/2-.05);_taAdd(door);
}

// ── בית פרטי ת"א ──
function _taBldHouse(x,z,h,zone){
  if(!_taWallTex) _taWallTex=_taMkWallTex(false);
  const cols=zone==='jaffa'?_TA_COLS_OLD_JAFFA:zone==='sea'?_TA_COLS_SEA:_TA_COLS_BAUHAUS;
  const c=cols[Math.floor(Math.random()*cols.length)];
  const tC=_taWallTex.clone();tC.needsUpdate=true;tC.repeat.set(8/3.6,h/3.6);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.86,metalness:0});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(8,h,8),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;_taAdd(bld);
  _taBldList.push({x,z,w:8,d:8});

  // גג שטוח + פרפט
  const par=new THREE.Mesh(new THREE.BoxGeometry(8.35,.38,8.35),new THREE.MeshLambertMaterial({color:_taDk(c,.76)}));
  par.position.set(x,h+.19,z);_taAdd(par);
  const seal=new THREE.Mesh(new THREE.BoxGeometry(7.8,.05,7.8),new THREE.MeshLambertMaterial({color:0x1e1e1c}));
  seal.position.set(x,h+.02,z);_taAdd(seal);
  if(Math.random()<.6){
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.6,8),new THREE.MeshLambertMaterial({color:0xccc8c0}));
    wt.position.set(x+(Math.random()-.5)*2,h+.5,z+(Math.random()-.5)*2);_taAdd(wt);
  }

  // חלונות
  const shutCol=_TA_SHUTTER_COLS[Math.floor(Math.random()*_TA_SHUTTER_COLS.length)];
  const glsMat=new THREE.MeshStandardMaterial({color:0x7ab8d0,roughness:.05,metalness:.12,transparent:true,opacity:.7,emissive:0x061520});
  const frMat=new THREE.MeshLambertMaterial({color:0xeee5d5});
  const shutMat=new THREE.MeshLambertMaterial({color:shutCol});
  [-1.8,1.8].forEach(wx=>{
    for(let wy=1.4;wy<h-.7;wy+=h/Math.ceil(h/2)){
      const fr=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.12,.07),frMat);
      fr.position.set(x+wx,wy,z-4.02);_taAdd(fr);
      const wn=new THREE.Mesh(new THREE.BoxGeometry(.86,.92,.05),glsMat.clone());
      wn.position.set(x+wx,wy,z-4.0);_taAdd(wn);
      const sl=new THREE.Mesh(new THREE.BoxGeometry(.43,1.02,.04),shutMat);
      sl.position.set(x+wx-.44,wy,z-4.04);_taAdd(sl);
      const sr=new THREE.Mesh(new THREE.BoxGeometry(.43,1.02,.04),shutMat);
      sr.position.set(x+wx+.44,wy,z-4.04);_taAdd(sr);
    }
  });
  // דלת
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.92,.07),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(Math.random()*.1+.04,.5,.2),roughness:.8}));
  door.position.set(x,.95,z-4.04);_taAdd(door);
  // מרפסת (לבתים גבוהים)
  if(h>5){
    const bal=new THREE.Mesh(new THREE.BoxGeometry(3.5,.1,1.0),new THREE.MeshLambertMaterial({color:_taDk(c,.84)}));
    bal.position.set(x,h*.52+.15,z-4.0-.5);_taAdd(bal);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(3.5,.44,.07),new THREE.MeshLambertMaterial({color:0x888880}));
    rail.position.set(x,h*.52+.4,z-4.0-.95);_taAdd(rail);
  }
}

// ── עץ (מעתיק מבלוד, מוסיף ל-taScene) ──
function _taBldTree(x,z){
  const rnd=_taRnd;
  const type=Math.random();
  if(type<.35){
    const h=rnd(4,6.5);
    const trMat=new THREE.MeshLambertMaterial({color:0x4a2e0a});
    const tr1=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.12,.17),rnd(.2,.28),h*.6,7),trMat);
    tr1.position.set(x,h*.3,z);tr1.rotation.z=rnd(-.07,.07);tr1.castShadow=true;_taAdd(tr1);
    const tr2=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.09,.14),rnd(.12,.17),h*.5,6),trMat);
    tr2.position.set(x+rnd(-.12,.12),h*.7,z+rnd(-.1,.1));tr2.rotation.z=rnd(-.1,.1);tr2.castShadow=true;_taAdd(tr2);
    const greenBase=new THREE.Color(0x2d6b1a);
    [[rnd(1.7,2.5),rnd(.3,.8),rnd(-.3,.3),rnd(-.3,.3)],
     [rnd(1.3,2.0),rnd(1.2,1.8),rnd(-.5,.5),rnd(-.5,.5)],
     [rnd(1.1,1.6),rnd(1.7,2.3),rnd(-.4,.4),rnd(-.4,.4)],
     [rnd(.8,1.3),rnd(.9,1.4),rnd(-.7,.7),rnd(-.6,.6)]
    ].forEach(([r,dy,ox,oz])=>{
      const lc=greenBase.clone().offsetHSL(0,0,rnd(-.05,.07));
      const sph=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),new THREE.MeshLambertMaterial({color:lc}));
      sph.position.set(x+ox,h+dy,z+oz);sph.castShadow=true;_taAdd(sph);
    });
  } else if(type<.6){
    const h=rnd(3.5,6);
    const trMat=new THREE.MeshLambertMaterial({color:0x3a2208});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(.1,.2,h,6),trMat);
    tr.position.set(x,h/2,z);tr.castShadow=true;_taAdd(tr);
    const totalH=rnd(5,9);
    [0,.28,.54,.76].forEach((t,i)=>{
      const yr=h+totalH*t, r=rnd(.5,.75)*(1-t*.68), sh=totalH*(1-t)*.52;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(r,sh,7),new THREE.MeshLambertMaterial({color:new THREE.Color(0x1a4a10).offsetHSL(0,0,i*.03)}));
      cone.position.set(x+rnd(-.05,.05),yr+sh*.45,z+rnd(-.05,.05));cone.castShadow=true;_taAdd(cone);
    });
  } else if(type<.8){
    // תמר — שכיח מאוד בת"א
    const h=rnd(5.5,9.5);
    const trMat=new THREE.MeshLambertMaterial({color:0x6b4218});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.13,.19),rnd(.2,.27),h,8),trMat);
    tr.rotation.z=rnd(-.05,.05);tr.position.set(x,h/2,z);tr.castShadow=true;_taAdd(tr);
    for(let i=0;i<5;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(rnd(.17,.21),.03,4,10),trMat);
      ring.rotation.x=Math.PI/2;ring.position.set(x,h*(.2+i*.14),z);_taAdd(ring);
    }
    const nFronds=Math.round(rnd(7,11));
    for(let i=0;i<nFronds;i++){
      const ang=i/nFronds*Math.PI*2+rnd(-.12,.12);
      const reach=rnd(2.4,3.8), drop=rnd(.25,.75);
      const frondMat=new THREE.MeshLambertMaterial({color:new THREE.Color(0x3a7018).offsetHSL(0,rnd(-.07,.07),rnd(-.05,.05))});
      for(let s=0;s<3;s++){
        const nt=(s+1)/3;
        const fx=x+Math.sin(ang)*reach*nt, fz=z+Math.cos(ang)*reach*nt;
        const fy=h+.4-drop*nt*nt;
        const frond=new THREE.Mesh(new THREE.BoxGeometry(rnd(.07,.12),rnd(.08,.14),reach/3*rnd(.85,1.1)),frondMat);
        frond.position.set(fx,fy,fz);frond.rotation.y=ang;frond.rotation.x=rnd(.18,.45)*nt;
        frond.castShadow=true;_taAdd(frond);
      }
    }
  } else {
    // שיטה
    const h=rnd(3,5);
    const trMat=new THREE.MeshLambertMaterial({color:0x5a3812});
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.11,.18),rnd(.18,.28),h,7),trMat);
    tr.position.set(x,h/2,z);tr.castShadow=true;_taAdd(tr);
    for(let i=0;i<4;i++){
      const ang=rnd(0,Math.PI*2),len=rnd(1.4,2.6);
      for(let s=0;s<2;s++){
        const t=(s+1)/2;
        const bx=x+Math.cos(ang)*len*t,bz=z+Math.sin(ang)*len*t;
        const b=new THREE.Mesh(new THREE.CylinderGeometry(rnd(.03,.06),rnd(.05,.09),len*.6,5),trMat);
        b.position.set(bx,h*.8+rnd(-.3,.3),bz);b.rotation.z=rnd(.4,.9);b.rotation.y=ang;_taAdd(b);
      }
      const umbrella=new THREE.Mesh(new THREE.SphereGeometry(rnd(1.0,1.8),9,7),new THREE.MeshLambertMaterial({color:new THREE.Color(0x486820).offsetHSL(0,0,rnd(-.05,.06))}));
      umbrella.scale.y=.38;umbrella.position.set(x+Math.cos(ang)*len,h*.75+rnd(.2,.5),z+Math.sin(ang)*len);_taAdd(umbrella);
    }
  }
}

// ── פנס רחוב ת"א ──
function _taLamp(x,z){
  const poleMat=new THREE.MeshLambertMaterial({color:0x484858});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,5,6),poleMat);
  pole.position.set(x,2.5,z);pole.castShadow=true;_taAdd(pole);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.9,5),poleMat);
  arm.rotation.z=Math.PI/2;arm.position.set(x+.45,5,z);_taAdd(arm);
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.2,.16,.3,7),new THREE.MeshLambertMaterial({color:0x2a2a28}));
  lamp.position.set(x+.9,4.9,z);_taAdd(lamp);
  const bulbMat=new THREE.MeshLambertMaterial({color:0xfffcaa,emissive:new THREE.Color(0,0,0)});
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,5,4),bulbMat);
  bulb.position.set(x+.9,4.85,z);_taAdd(bulb);
  _taLamps.push({bulb:bulbMat,x:x+.9,z});
}

// ── שלט רחוב ת"א ──
function _taSign(x,z,name,rotY){
  const poleMat=new THREE.MeshStandardMaterial({color:0x7a8090,roughness:.35,metalness:.75});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,3.6,8),poleMat);
  pole.position.set(x,1.8,z);pole.castShadow=true;_taAdd(pole);
  const W=512,H=128,tc=document.createElement('canvas');tc.width=W;tc.height=H;
  const tx=tc.getContext('2d');
  tx.fillStyle='#0f3d8a';tx.fillRect(0,0,W,H);
  tx.fillStyle='#1a7a1a';tx.fillRect(0,H-28,W,28);
  tx.strokeStyle='#ffffff';tx.lineWidth=4;tx.strokeRect(3,3,W-6,H-6);
  tx.fillStyle='#ffffff';tx.font='bold 50px Arial';tx.textAlign='center';tx.textBaseline='middle';
  tx.fillText(name,W/2,H/2-16);
  tx.font='20px Arial';tx.fillText(name.replace(/רח׳/g,'').replace(/שד׳/g,'').trim(),W/2,H-14);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(3.2,.8,.08),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(tc),side:THREE.DoubleSide,roughness:.5}));
  sign.position.set(x,3.5,z);if(rotY)sign.rotation.y=rotY;_taAdd(sign);
}

// ── ספסל ת"א ──
function _taBench(x,z,ang){
  const wood=new THREE.MeshLambertMaterial({color:0x8B5a2a});
  const metal=new THREE.MeshLambertMaterial({color:0x555560});
  const g=new THREE.Group();
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,.1,.55),wood);seat.position.set(0,.5,0);g.add(seat);
  [-0.55,0,0.55].forEach(oy=>{
    const sl=new THREE.Mesh(new THREE.BoxGeometry(1.75,.07,.14),wood);sl.position.set(0,.52,oy*.28);g.add(sl);
  });
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.8,.55,.08),wood);back.position.set(0,.9,-.22);g.add(back);
  [-0.7,0.7].forEach(ox=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.55),metal);leg.position.set(ox,.25,0);g.add(leg);
    const br=new THREE.Mesh(new THREE.BoxGeometry(.08,.35,.08),metal);br.position.set(ox,.7,-.2);br.rotation.x=.4;g.add(br);
  });
  g.position.set(x,0,z);g.rotation.y=ang||0;g.castShadow=true;
  _taAdd(g);
}

// ── חסימה: האם נקודה בתוך בניין ─
function _taInBld(x,z,margin){
  margin=margin||0;
  return _taBldList.some(b=>Math.abs(x-b.x)<b.w/2+margin&&Math.abs(z-b.z)<b.d/2+margin);
}

// ════════════════════════════════════════════════
// BUILD TEL AVIV SCENE
// גריד: X מזרח/מערב, Z צפון/דרום
// מרכז = (0,0) = צומת אלנבי/דיזנגוף
// צפון = Z שלילי (לים), דרום = Z חיובי (יפו)
// עיר: X=(-220..220), Z=(-250..200) — ענקית
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// ZONE SYSTEM — תל אביב
// ════════════════════════════════════════════════
const _taZoneGroups=[];  // [{group, cx, cz, r}]

function _taBuildZoned(buildFn, cx, cz, r){
  const g=new THREE.Group();
  taScene.add(g);
  _taZoneGroups.push({group:g,cx,cz,r,visible:true});
  const prev=window._taCurZone;
  window._taCurZone=g;
  // patch _taAdd so ALL helpers (tree, lamp, bench, sign, bld) route into group
  const _origTA=_taAdd;
  window._taAdd=function(m){g.add(m);taObjects.push(m);return m;};
  try{ buildFn(); } finally{ window._taAdd=_origTA; window._taCurZone=prev; }
}

function _taUpdZones(){
  if(!TA.inTA||!_taZoneGroups.length)return;
  const px=TA.playerX,pz=TA.playerZ;
  _taZoneGroups.forEach(z=>{
    const dx=z.cx-px,dz=z.cz-pz,d2=dx*dx+dz*dz;
    const closeR=z.r*(z.group.visible?1.35:1.0);
    z.group.visible=d2<closeR*closeR;
  });
}

// override _taAdd to support zones
function _taAddZ(m){
  const g=window._taCurZone;
  if(g){ g.add(m); taObjects.push(m); return m; }
  taScene.add(m); taObjects.push(m); return m;
}

// ════════════════════════════════════════════════
// BUILD TEL AVIV SCENE — 5 שכונות ברורות
// ════════════════════════════════════════════════
// ZONES:
//  A. שכונת הבוז׳אוס הלבן — x=-120..40, z=-80..40 (מרכז)
//  B. שוק הכרמל + יפו דרום — x=-180..-60, z=50..200
//  C. שכונת הצפון המודרנית — x=-120..80, z=-200..-90
//  D. נמל תל אביב — x=110..210, z=-210..-100
//  E. טיילת הים — x=120..210, z=-90..180
// ════════════════════════════════════════════════
function buildTelAvivScene(){
  taScene=new THREE.Scene();
  taScene.background=new THREE.Color(0x87c0d8);
  taScene.fog=new THREE.Fog(0x90c0dc,140,520);
  window._taCurZone=null;

  // ── תאורה גלובלית ──
  const amb=new THREE.AmbientLight(0xfff8f0,1.7);taScene.add(amb);
  const sun=new THREE.DirectionalLight(0xfffbe8,2.5);
  sun.position.set(90,160,70);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-320;sun.shadow.camera.right=320;
  sun.shadow.camera.top=320;sun.shadow.camera.bottom=-320;
  sun.shadow.camera.far=700;sun.shadow.bias=-0.0002;
  taScene.add(sun);
  const hemi=new THREE.HemisphereLight(0xadd4f0,0x5a7848,0.85);taScene.add(hemi);
  const fill=new THREE.DirectionalLight(0x8ab8e0,0.3);fill.position.set(-100,60,-50);taScene.add(fill);

  // ── קרקע ──
  (()=>{
    const sz=512,tc=document.createElement('canvas');tc.width=tc.height=sz;
    const tx=tc.getContext('2d');
    tx.fillStyle='#252424';tx.fillRect(0,0,sz,sz);
    for(let i=0;i<3000;i++){const x=Math.random()*sz,y=Math.random()*sz,v=Math.floor(22+Math.random()*28);tx.fillStyle=`rgb(${v},${v},${v})`;tx.beginPath();tx.arc(x,y,.3+Math.random()*.9,0,Math.PI*2);tx.fill();}
    const tex=new THREE.CanvasTexture(tc);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(65,65);
    const gnd=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({map:tex,roughness:.97,color:0xffffff}));
    gnd.rotation.x=-Math.PI/2;gnd.position.y=-.01;gnd.receiveShadow=true;gnd._isGround=true;taScene.add(gnd);taObjects.push(gnd);
  })();

  // ── כבישים ראשיים (תמיד גלויים — לא ב-zone) ──
  _taBuildRoads();

  // ── ים + חוף (תמיד גלוי) ──
  _taBuildSea();

  // ── ZONE A: בוז׳אוס לבן — מרכז ──
  _taBuildZoned(_taBuildZone_Bauhaus, -40, -20, 160);

  // ── ZONE B: שוק הכרמל + יפו ──
  _taBuildZoned(_taBuildZone_Carmel, -120, 120, 150);

  // ── ZONE C: צפון מודרני ──
  _taBuildZoned(_taBuildZone_North, -20, -150, 160);

  // ── ZONE D: נמל ──
  _taBuildZoned(_taBuildZone_Port, 165, -155, 130);

  // ── ZONE E: טיילת ──
  _taBuildZoned(_taBuildZone_Tayelet, 160, 30, 140);

  // ── ZONE F: יפו עתיקה (דרום-מזרח) ──
  _taBuildZoned(_taBuildZone_Jaffa, -60, 160, 130);

  // ── מצלמה ──
  taCamera=new THREE.PerspectiveCamera(62,window.innerWidth/window.innerHeight,.1,550);
  taCamera.position.set(0,7,120);taCamera.lookAt(0,1,110);

  // ── pool פנסים ──
  _taLampPool.length=0;
  for(let i=0;i<14;i++){const pl=new THREE.PointLight(0xffd97a,0,22);taScene.add(pl);_taLampPool.push(pl);}
}

// ════════════════════════════════════════════════
// כבישים — גריד תל אביב
// ════════════════════════════════════════════════
function _taBuildRoads(){
  // E-W (z קבוע)
  [[80,14],[30,14],[-30,13],[-80,13],[-130,12],[-175,11],[140,11]].forEach(([z,w])=>_taRd(0,z,w,460,false));
  // N-S (x קבוע)
  [[-60,13],[0,14],[55,12],[115,11],[-120,10],[-180,9]].forEach(([x,w])=>_taRd(x,0,w,520,true));
  // שלטי רחוב
  [[-62,82,'שד׳ דיזנגוף / אלנבי',0],[2,32,'ארלוזורוב / קינג ג׳ורג׳',0],
   [57,82,'בן יהודה / אלנבי',0],[-62,-82,'דיזנגוף / בן יהודה',0],
   [2,-62,'ארלוזורוב',Math.PI/2],[57,-132,'בן יהודה / פינסקר',0],
  ].forEach(([x,z,n,r])=>_taSign(x,z,n,r));
}

// ════════════════════════════════════════════════
// ים וחוף
// ════════════════════════════════════════════════
function _taBuildSea(){
  // ים
  const seaMat=new THREE.MeshLambertMaterial({color:0x1a70a8,transparent:true,opacity:.88});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(130,560),seaMat);
  sea.rotation.x=-Math.PI/2;sea.position.set(210,.04,0);taScene.add(sea);taObjects.push(sea);
  // גלים
  for(let i=0;i<14;i++){
    const wv=new THREE.Mesh(new THREE.PlaneGeometry(130,1.6),new THREE.MeshLambertMaterial({color:0x55c0f0,transparent:true,opacity:.28}));
    wv.rotation.x=-Math.PI/2;wv.position.set(210,.06,-260+i*42);taScene.add(wv);taObjects.push(wv);
  }
  // חול
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(20,560),new THREE.MeshLambertMaterial({color:0xd8c888}));
  sand.rotation.x=-Math.PI/2;sand.position.set(157,.03,0);taScene.add(sand);taObjects.push(sand);
}

// ════════════════════════════════════════════════
// ZONE A — בוז׳אוס לבן (מרכז העיר, x=-120..60, z=-80..40)
// פלטה: שמנת-לבן, מרפסות, תריסים ירוקים/כחולים
// ════════════════════════════════════════════════
function _taBuildZone_Bauhaus(){
  const B_COLS=[0xf5f0e8,0xeee8d8,0xf8f4ec,0xe8e2d4,0xf2ece0,0xfaf6ee];
  const B_SHUT=[0x3a6a3a,0x2a5a8a,0x6a5a2a,0x8a3a2a];

  // שורות בניינים בין הרחובות
  // בין אלנבי(z=80) לקינג ג׳ורג׳(z=30): z=54
  for(let bx=-170;bx<=120;bx+=42){
    if(_taFarFromRoad(bx,54)){
      _taZBld(bx,54, 16+Math.random()*6, 10, 8+Math.random()*10, B_COLS, B_SHUT, 'bauhaus');
    }
  }
  // בין קינג ג׳ורג׳(30) לגורדון(-30): z=0
  for(let bx=-165;bx<=115;bx+=40){
    if(_taFarFromRoad(bx,0)){
      _taZBld(bx,0, 18+Math.random()*6, 10, 9+Math.random()*12, B_COLS, B_SHUT, 'bauhaus');
    }
  }
  // בין גורדון(-30) לבן יהודה(-80): z=-54
  for(let bx=-160;bx<=110;bx+=40){
    if(_taFarFromRoad(bx,-54)){
      _taZBld(bx,-54, 15+Math.random()*5, 10, 8+Math.random()*9, B_COLS, B_SHUT, 'bauhaus');
    }
  }
  // לאורך דיזנגוף — בתים פרטיים
  for(let bz=-75;bz<=25;bz+=30){
    if(_taFarFromRoad(-85,bz)&&_taFarFromRoad(-38,bz)){
      _taZHouse(-85,bz, 4+Math.random()*3, B_COLS, B_SHUT);
      _taZHouse(-38,bz, 4+Math.random()*3, B_COLS, B_SHUT);
    }
  }
  // עצים לאורך הרחובות
  for(let bx=-185;bx<=145;bx+=16){
    _taBldTree(bx,70);_taBldTree(bx,90);
    _taBldTree(bx,-42);_taBldTree(bx,-68);
  }
  for(let bz=-75;bz<=35;bz+=18){
    _taBldTree(-70,bz);_taBldTree(-52,bz);
    _taBldTree(-8,bz);_taBldTree(8,bz);
  }
  // ספסלים ופנסים
  for(let bx=-180;bx<=140;bx+=28){
    _taBench(bx,87,0);_taBench(bx,73,Math.PI);
    _taLamp(bx,74);_taLamp(bx,86);
  }
  for(let bz=-70;bz<=30;bz+=28){
    _taBench(-63,bz,Math.PI/2);_taLamp(-62,bz);
    _taBench(3,bz,Math.PI/2);_taLamp(2,bz);
  }
  // כיכר דיזנגוף — עיגולית
  (()=>{
    const DX=-60, DZ=-10;
    const sqF=new THREE.Mesh(new THREE.CircleGeometry(16,24),new THREE.MeshStandardMaterial({color:0xd5cfc0,roughness:.9}));
    sqF.rotation.x=-Math.PI/2;sqF.position.set(DX,.07,DZ);_taAddZ(sqF);
    const fount=new THREE.Mesh(new THREE.CylinderGeometry(4,.5,1.2,16),new THREE.MeshLambertMaterial({color:0xb8b0a0}));
    fount.position.set(DX,.6,DZ);_taAddZ(fount);
    const water=new THREE.Mesh(new THREE.CircleGeometry(3.5,16),new THREE.MeshLambertMaterial({color:0x4a9ac8,transparent:true,opacity:.8}));
    water.rotation.x=-Math.PI/2;water.position.set(DX,1.25,DZ);_taAddZ(water);
    for(let i=0;i<7;i++)_taBldTree(DX+Math.cos(i/7*Math.PI*2)*20,DZ+Math.sin(i/7*Math.PI*2)*18);
    [[DX-14,DZ-8,0],[DX+14,DZ-8,0],[DX-14,DZ+8,Math.PI],[DX+14,DZ+8,Math.PI]].forEach(([x,z,a])=>_taBench(x,z,a));
    G._taDizengoffSq={x:DX,z:DZ};
  })();
}

// ════════════════════════════════════════════════
// ZONE B — שוק הכרמל + יפו צפונית (x=-200..-50, z=40..200)
// פלטה: כתום/חום/קרם חם, דוכנים, צפיפות
// ════════════════════════════════════════════════
function _taBuildZone_Carmel(){
  const C_COLS=[0xdec898,0xd4b880,0xe0cc9a,0xc8a870,0xd8bc8c];
  const C_SHUT=[0xaa4400,0x885500,0x664400];

  // בניינים סביב השוק
  [[-160,115],[-130,115],[-105,115],[-160,150],[-130,150],[-105,150],
   [-75,55],[-105,55],[-135,55],[-160,55]].forEach(([bx,bz])=>{
    if(_taFarFromRoad(bx,bz))
      _taZHouse(bx,bz, 3.5+Math.random()*3, C_COLS, C_SHUT);
  });
  for(let bx=-190;bx<=-60;bx+=36){
    if(_taFarFromRoad(bx,78)&&_taFarFromRoad(bx,93)){
      _taZHouse(bx,78, 4+Math.random()*3, C_COLS, C_SHUT);
      _taZHouse(bx,93, 3+Math.random()*3, C_COLS, C_SHUT);
    }
  }
  // השוק עצמו
  _taBuildMarket();
  // עצים — דקלים + שיטים
  for(let bx=-195;bx<=-55;bx+=20){_taBldTree(bx,65);_taBldTree(bx,100);}
  for(let bz=45;bz<=190;bz+=20){_taBldTree(-195,bz);_taBldTree(-55,bz);}
  // פנסים
  for(let bx=-190;bx<=-55;bx+=26){_taLamp(bx,65);_taLamp(bx,100);}
}

// ════════════════════════════════════════════════
// ZONE C — צפון מודרני (x=-140..90, z=-220..-90)
// פלטה: אפור-כחול, בניינים גבוהים, זכוכית
// ════════════════════════════════════════════════
function _taBuildZone_North(){
  const N_COLS=[0xd5dce8,0xc8d4e4,0xdce4f0,0xcad4e2,0xe0e8f4];
  const N_SHUT=[0x444466,0x224466,0x446688];

  // בין בן יהודה(-80) לפינסקר(-130): z=-105
  for(let bx=-170;bx<=120;bx+=42){
    if(_taFarFromRoad(bx,-105)){
      _taZBld(bx,-105, 18+Math.random()*8, 12, 12+Math.random()*16, N_COLS, N_SHUT, 'mod');
    }
  }
  // בין פינסקר(-130) ל-z=-175
  for(let bx=-165;bx<=115;bx+=40){
    if(_taFarFromRoad(bx,-152)){
      _taZBld(bx,-152, 16+Math.random()*6, 10, 10+Math.random()*12, N_COLS, N_SHUT, 'mod');
    }
  }
  // צפון מאוד (z=-200)
  for(let bx=-130;bx<=100;bx+=38){
    if(_taFarFromRoad(bx,-200)){
      _taZBld(bx,-200, 14+Math.random()*6, 10, 8+Math.random()*10, N_COLS, N_SHUT, 'mod');
    }
  }
  // לאורך N-S
  for(let bz=-210;bz<=-95;bz+=36){
    if(_taFarFromRoad(-85,bz)&&_taFarFromRoad(-38,bz)){
      _taZBld(-85,bz, 14,10, 10+Math.random()*12, N_COLS, N_SHUT, 'mod');
      _taZBld(28,bz, 12,10, 11+Math.random()*10, N_COLS, N_SHUT, 'mod');
    }
  }
  // בניין APEX — בתוך ZONE C
  _taBuildApex();
  // עצים מודרניים — ברושים דקים
  for(let bx=-145;bx<=85;bx+=18){_taBldTree(bx,-92);_taBldTree(bx,-118);}
  for(let bz=-215;bz<=-95;bz+=20){_taBldTree(-130,bz);_taBldTree(82,bz);}
  // כיכר רבין (ב-zone C)
  _taBuildRabinSquare();
  // פנסים
  for(let bx=-150;bx<=90;bx+=26){_taLamp(bx,-92);_taLamp(bx,-118);_taLamp(bx,-165);}
  for(let bz=-215;bz<=-95;bz+=28){_taLamp(-130,bz);_taLamp(-8,bz);}
}

// ════════════════════════════════════════════════
// ZONE D — נמל (x=110..210, z=-220..-100)
// פלטה: תעשייתי, בטון, כהה
// ════════════════════════════════════════════════
function _taBuildZone_Port(){
  _taBuildPort();
  // מחסני נמל + rstaurant strip
  const P_COLS=[0x9a9a8c,0x888880,0xb0a898];
  const P_SHUT=[0x444444,0x223344];
  for(let bz=-210;bz<=-105;bz+=36){
    _taZBld(130,bz, 14,10, 6+Math.random()*4, P_COLS, P_SHUT, 'mod');
  }
  // דקלים לאורך הנמל
  for(let bz=-200;bz<=-110;bz+=22){_taBldTree(120,bz);_taBldTree(155,bz);}
  for(let bx=118;bx<=200;bx+=22){_taBldTree(bx,-210);_taBldTree(bx,-105);}
  // פנסים
  for(let bz=-200;bz<=-110;bz+=24){_taLamp(118,bz);_taLamp(158,bz);}
}

// ════════════════════════════════════════════════
// ZONE E — טיילת הים (x=120..210, z=-90..180)
// פלטה: ים, חול, בתי קפה לבנים
// ════════════════════════════════════════════════
function _taBuildZone_Tayelet(){
  const T_COLS=[0xf8f4f0,0xf0ece4,0xfcf8f4,0xe8e4dc];
  const T_SHUT=[0x4488aa,0x2266aa,0x44aa88];
  // טיילת
  const prom=new THREE.Mesh(new THREE.BoxGeometry(20,.22,300),new THREE.MeshStandardMaterial({color:0xd0c8b2,roughness:.9}));
  prom.position.set(143,.11,45);_taAddZ(prom);
  // ספסלים לאורך
  for(let bz=-80;bz<=170;bz+=20){
    _taBench(138,bz,Math.PI/2);_taBench(150,bz,-Math.PI/2);
    _taLamp(140,bz);
  }
  // בתי קפה קטנים
  for(let bz=-70;bz<=160;bz+=55){
    _taZHouse(132,bz, 3.5, T_COLS, T_SHUT);
  }
  // מגדלי מלון לאורך הים
  [[128,-60],[128,0],[128,60],[128,120]].forEach(([bx,bz])=>{
    _taZBld(bx,bz, 12,10, 20+Math.random()*14, T_COLS, T_SHUT, 'sea');
  });
  // דקלים — הים תמיד
  for(let bz=-80;bz<=170;bz+=14){_taBldTree(148,bz);}
  for(let bz=-80;bz<=170;bz+=22){_taBldTree(130,bz);}
  G._taBeachPos={x:148,z:40};
}

// ════════════════════════════════════════════════
// ZONE F — יפו עתיקה (x=-120..20, z=120..230)
// פלטה: אבן, חום-עתיק, צפוף
// ════════════════════════════════════════════════
function _taBuildZone_Jaffa(){
  const J_COLS=[0xd4b888,0xc8a870,0xdcc099,0xb89858,0xe0c080];
  const J_SHUT=[0x885522,0x664411,0x773311];
  // בתים ישנים צפופים
  for(let bx=-110;bx<=10;bx+=28){
    for(let bz=130;bz<=220;bz+=30){
      if(_taFarFromRoad(bx,bz)){
        _taZHouse(bx,bz, 3+Math.random()*3.5, J_COLS, J_SHUT);
        _taZHouse(bx+12,bz+12, 2.8+Math.random()*2.5, J_COLS, J_SHUT);
      }
    }
  }
  // כנסיית יפו
  (()=>{
    const CX=-40, CZ=190;
    const body=new THREE.Mesh(new THREE.BoxGeometry(14,10,18),new THREE.MeshStandardMaterial({color:0xd0c0a0,roughness:.88}));
    body.position.set(CX,5,CZ);body.castShadow=true;_taAddZ(body);_taBldList.push({x:CX,z:CZ,w:14,d:18});
    const tower=new THREE.Mesh(new THREE.BoxGeometry(5,18,5),new THREE.MeshStandardMaterial({color:0xc8b898,roughness:.9}));
    tower.position.set(CX-4.5,9,CZ-9);tower.castShadow=true;_taAddZ(tower);
    const cross_v=new THREE.Mesh(new THREE.BoxGeometry(.3,2.5,.3),new THREE.MeshLambertMaterial({color:0xc0a858}));
    cross_v.position.set(CX-4.5,18.5,CZ-9);_taAddZ(cross_v);
    const cross_h=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,.3),new THREE.MeshLambertMaterial({color:0xc0a858}));
    cross_h.position.set(CX-4.5,17.8,CZ-9);_taAddZ(cross_h);
  })();
  // עצי תאנה ועתיקים
  for(let bx=-115;bx<=15;bx+=22){_taBldTree(bx,135);_taBldTree(bx,220);}
  for(let bz=135;bz<=215;bz+=22){_taBldTree(-115,bz);_taBldTree(15,bz);}
  // פנסים עתיקים (צהובים יותר)
  for(let bx=-110;bx<=10;bx+=28){_taLamp(bx,140);_taLamp(bx,200);}
}

// ════════════════════════════════════════════════
// HELPERS — בניינים לפי zone
// ════════════════════════════════════════════════
function _taFarFromRoad(x,z){
  // True אם הנקודה לא חוסמת רחוב ראשי
  const roads=[
    {x:null,z:80,w:null,h:20},{x:null,z:30,w:null,h:20},{x:null,z:-30,w:null,h:18},
    {x:null,z:-80,w:null,h:18},{x:null,z:-130,w:null,h:16},{x:null,z:-175,w:null,h:16},{x:null,z:140,w:null,h:16},
    {x:-60,z:null,w:18,h:null},{x:0,z:null,w:20,h:null},{x:55,z:null,w:16,h:null},
    {x:115,z:null,w:16,h:null},{x:-120,z:null,w:14,h:null},{x:-180,z:null,w:12,h:null},
  ];
  return !roads.some(r=>{
    if(r.z!==null) return Math.abs(z-r.z)<r.h/2+6;
    if(r.x!==null) return Math.abs(x-r.x)<r.w/2+6;
    return false;
  });
}

function _taZBld(x,z,w,d,h,cols,shutCols,zone){
  const c=cols[Math.floor(Math.random()*cols.length)];
  const sc=Math.floor(Math.random()*shutCols.length);
  if(!_taWallTex)_taWallTex=_taMkWallTex(false);
  const tC=_taWallTex.clone();tC.needsUpdate=true;tC.repeat.set(w/4,h/4);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.87,metalness:0});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;_taAddZ(bld);
  _taBldList.push({x,z,w,d});
  // פרפט
  const par=new THREE.Mesh(new THREE.BoxGeometry(w+.4,.45,d+.4),new THREE.MeshLambertMaterial({color:_taDk(c,.76)}));
  par.position.set(x,h+.22,z);_taAddZ(par);
  // גג
  const seal=new THREE.Mesh(new THREE.BoxGeometry(w-.15,.07,d-.15),new THREE.MeshLambertMaterial({color:0x1e1e1c}));
  seal.position.set(x,h+.03,z);_taAddZ(seal);
  // מיכל מים 65%
  if(Math.random()<.65){
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.68,8),new THREE.MeshLambertMaterial({color:0xc8c4bc}));
    wt.position.set(x+(Math.random()-.5)*(w*.5),h+.54,z+(Math.random()-.5)*(d*.5));_taAddZ(wt);
  }
  // חלונות + תריסים
  (()=>{
    const sc2=64,tc=document.createElement('canvas');tc.width=sc2*4;tc.height=sc2*4;
    const tx=tc.getContext('2d');tx.clearRect(0,0,tc.width,tc.height);
    const cols2=Math.max(2,Math.floor(w/2.5)),rows2=Math.max(2,Math.floor(h/2.4));
    const shut=shutCols[Math.floor(Math.random()*shutCols.length)];
    const sr=((shut>>16)&0xff),sg=((shut>>8)&0xff),sb=(shut&0xff);
    for(let r=0;r<rows2;r++) for(let c2=0;c2<cols2;c2++){
      const px=(c2/cols2)*tc.width+6,py=(r/rows2)*tc.height+6;
      const pw=tc.width/cols2-10,ph=tc.height/rows2-10;
      tx.fillStyle=`rgba(100,175,215,${.5+Math.random()*.35})`;tx.fillRect(px,py,pw,ph);
      tx.strokeStyle='rgba(235,225,205,.85)';tx.lineWidth=2;tx.strokeRect(px-1,py-1,pw+2,ph+2);
      if(Math.random()<.55){tx.fillStyle=`rgba(${sr},${sg},${sb},.78)`;tx.fillRect(px-1,py-1,pw*.45+2,ph+2);}
    }
    const wTex=new THREE.CanvasTexture(tc);
    const wMat=new THREE.MeshLambertMaterial({map:wTex,transparent:true,alphaTest:.04});
    const wp=new THREE.Mesh(new THREE.PlaneGeometry(w*.88,h*.84),wMat);
    wp.position.set(x,h/2+.1,z-d/2-.04);_taAddZ(wp);
    const wp2=new THREE.Mesh(new THREE.PlaneGeometry(w*.88,h*.84),wMat.clone());
    wp2.position.set(x,h/2+.1,z+d/2+.04);wp2.rotation.y=Math.PI;_taAddZ(wp2);
  })();
  // מרפסות (בוז׳אוס + sea)
  if(h>7&&(zone==='bauhaus'||zone==='sea')){
    for(let wy=3.2;wy<h-.9;wy+=4.2){
      const bw=Math.min(5.5,w-1.5);
      const bal=new THREE.Mesh(new THREE.BoxGeometry(bw,.11,1.1),new THREE.MeshLambertMaterial({color:_taDk(c,.84)}));
      bal.position.set(x,wy-.05,z-d/2-.55);_taAddZ(bal);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(bw,.48,.07),new THREE.MeshLambertMaterial({color:0x888882}));
      rail.position.set(x,wy+.28,z-d/2-1.0);_taAddZ(rail);
    }
  }
  // דלת
  const dc=new THREE.Color().setHSL(Math.random()*.1+.04,.5,.22+Math.random()*.06);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.0,.07),new THREE.MeshStandardMaterial({color:dc,roughness:.8}));
  door.position.set(x+(Math.random()-.5)*(w*.3),.99,z-d/2-.05);_taAddZ(door);
}

function _taZHouse(x,z,h,cols,shutCols){
  const c=cols[Math.floor(Math.random()*cols.length)];
  if(!_taWallTex)_taWallTex=_taMkWallTex(false);
  const tC=_taWallTex.clone();tC.needsUpdate=true;tC.repeat.set(2,h/3.5);
  const wallMat=new THREE.MeshStandardMaterial({map:tC,color:new THREE.Color(c),roughness:.86});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(8,h,8),wallMat);
  bld.position.set(x,h/2,z);bld.castShadow=true;bld.receiveShadow=true;_taAddZ(bld);
  _taBldList.push({x,z,w:8,d:8});
  const par=new THREE.Mesh(new THREE.BoxGeometry(8.35,.38,8.35),new THREE.MeshLambertMaterial({color:_taDk(c,.74)}));
  par.position.set(x,h+.19,z);_taAddZ(par);
  if(Math.random()<.6){
    const wt=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.56,8),new THREE.MeshLambertMaterial({color:0xccc8c0}));
    wt.position.set(x+(Math.random()-.5)*2,h+.48,z+(Math.random()-.5)*2);_taAddZ(wt);
  }
  const shut=shutCols[Math.floor(Math.random()*shutCols.length)];
  const glsMat=new THREE.MeshStandardMaterial({color:0x7ab8d0,roughness:.05,metalness:.12,transparent:true,opacity:.7});
  const frMat=new THREE.MeshLambertMaterial({color:0xeee5d5});
  const shutMat=new THREE.MeshLambertMaterial({color:shut});
  [-1.8,1.8].forEach(wx=>{
    for(let wy=1.4;wy<h-.7;wy+=Math.max(2,h/Math.ceil(h/2))){
      const fr=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.12,.07),frMat);
      fr.position.set(x+wx,wy,z-4.02);_taAddZ(fr);
      const wn=new THREE.Mesh(new THREE.BoxGeometry(.86,.92,.05),glsMat.clone());
      wn.position.set(x+wx,wy,z-4.0);_taAddZ(wn);
      const sl=new THREE.Mesh(new THREE.BoxGeometry(.43,1.02,.04),shutMat);
      sl.position.set(x+wx-.44,wy,z-4.04);_taAddZ(sl);
    }
  });
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.92,.07),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(Math.random()*.1+.04,.5,.2),roughness:.8}));
  door.position.set(x,.95,z-4.04);_taAddZ(door);
  if(h>4.5){
    const bal=new THREE.Mesh(new THREE.BoxGeometry(3.5,.1,1.0),new THREE.MeshLambertMaterial({color:_taDk(c,.82)}));
    bal.position.set(x,h*.52+.15,z-4.0-.5);_taAddZ(bal);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(3.5,.44,.07),new THREE.MeshLambertMaterial({color:0x888880}));
    rail.position.set(x,h*.52+.4,z-4.0-.95);_taAddZ(rail);
  }
}

// ════════════════════════════════════════════════
// שוק הכרמל
// ════════════════════════════════════════════════
function _taBuildMarket(){
  const MX=-90, MZ=100;
  const mktFloor=new THREE.Mesh(new THREE.PlaneGeometry(80,70),new THREE.MeshLambertMaterial({color:0xb0a890}));
  mktFloor.rotation.x=-Math.PI/2;mktFloor.position.set(MX,.05,MZ);_taAddZ(mktFloor);
  const awningCols=[0xcc2200,0x2255aa,0x228833,0xcc7700,0x882299,0xaa1133,0xdd9900,0x116633];
  for(let row=0;row<5;row++) for(let col=0;col<7;col++){
    const ax=MX-33+col*11, az=MZ-28+row*14;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,2.8,6),new THREE.MeshLambertMaterial({color:0x888880}));
    pole.position.set(ax,1.4,az);_taAddZ(pole);
    const aw=new THREE.Mesh(new THREE.BoxGeometry(10,.15,12),new THREE.MeshLambertMaterial({color:awningCols[(row*7+col)%awningCols.length]}));
    aw.position.set(ax,2.95,az);aw.rotation.x=.08*(row%2?1:-1);_taAddZ(aw);
    if(Math.random()<.75){
      const prodCols=[0xff6600,0xffcc00,0x44aa22,0xee2244,0xff8800,0xffee00,0x22aa88];
      const prod=new THREE.Mesh(new THREE.BoxGeometry(2.5,.7,2),new THREE.MeshLambertMaterial({color:prodCols[Math.floor(Math.random()*prodCols.length)]}));
      prod.position.set(ax,0.35,az+3.5);_taAddZ(prod);
    }
  }
  // נירה הכלבה
  (()=>{
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(.7,.5,.9),new THREE.MeshLambertMaterial({color:0xc8b090}));
    body.position.y=.55;g.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.45,.4,.5),new THREE.MeshLambertMaterial({color:0xc8b090}));
    head.position.set(0,.88,.5);g.add(head);
    [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.06,5,4),new THREE.MeshLambertMaterial({color:0x333322}));e.position.set(s*.12,.9,.77);g.add(e);});
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.5,6),new THREE.MeshLambertMaterial({color:0xb89878}));
    tail.rotation.z=.8;tail.position.set(0,.7,-.48);g.add(tail);
    g.position.set(MX-32,0,MZ+26);taScene.add(g);taObjects.push(g);
    G._taNiraPos={x:MX-32,z:MZ+26};
    G._taMarketPos={x:MX,z:MZ};
  })();
  // שלט שוק
  const sc=document.createElement('canvas');sc.width=400;sc.height=100;
  const stx=sc.getContext('2d');
  stx.fillStyle='#8B2200';stx.fillRect(0,0,400,100);
  stx.fillStyle='#FFE070';stx.font='bold 52px Arial';stx.textAlign='center';stx.textBaseline='middle';
  stx.fillText('שוק הכרמל',200,50);
  const mkSign=new THREE.Mesh(new THREE.BoxGeometry(8,2,.15),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc),side:THREE.DoubleSide}));
  mkSign.position.set(MX,5,MZ-35);taScene.add(mkSign);taObjects.push(mkSign);
}

// ════════════════════════════════════════════════
// בניין APEX
// ════════════════════════════════════════════════
function _taBuildApex(){
  const AX=70, AZ=-130;
  if(!_taWallTex)_taWallTex=_taMkWallTex(false);
  const apexWall=_taMkWallTex(true);
  const tC=apexWall.clone();tC.needsUpdate=true;tC.repeat.set(4,5);
  const wMat=new THREE.MeshStandardMaterial({map:tC,color:0x3a3a3e,roughness:.85,metalness:.12});
  const body=new THREE.Mesh(new THREE.BoxGeometry(18,22,16),wMat);
  body.position.set(AX,11,AZ);body.castShadow=true;body.receiveShadow=true;_taAddZ(body);
  _taBldList.push({x:AX,z:AZ,w:18,d:16});
  // פרפט כהה
  const par=new THREE.Mesh(new THREE.BoxGeometry(18.6,.5,16.6),new THREE.MeshLambertMaterial({color:0x1e1e24}));
  par.position.set(AX,22.25,AZ);_taAddZ(par);
  // חלונות מרושתים
  const eyeM=new THREE.MeshStandardMaterial({color:0x1a1a2e,emissive:0x080820,roughness:.1,transparent:true,opacity:.82});
  for(let r=0;r<5;r++) for(let c=-2;c<=2;c++){
    const wn=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.5,.08),eyeM.clone());
    wn.position.set(AX+c*3.2,3.5+r*3.6,AZ-8.04);_taAddZ(wn);
    const grH=new THREE.Mesh(new THREE.BoxGeometry(2.3,.06,.06),new THREE.MeshLambertMaterial({color:0x444444}));
    grH.position.set(AX+c*3.2,3.5+r*3.6,AZ-8.02);_taAddZ(grH);
  }
  // לוגו APEX
  const logoBar=new THREE.Mesh(new THREE.BoxGeometry(10,.3,1),new THREE.MeshStandardMaterial({color:0xcc0000,emissive:0x550000}));
  logoBar.position.set(AX,22.4,AZ-4);_taAddZ(logoBar);
  const apexL=new THREE.PointLight(0x8800cc,3.5,28);apexL.position.set(AX,13,AZ-9);_taAddZ(apexL);
  // דלת
  const door=new THREE.Mesh(new THREE.BoxGeometry(2.8,3.2,.12),new THREE.MeshStandardMaterial({color:0x1a1a1e,roughness:.4,metalness:.7}));
  door.position.set(AX,1.6,AZ-8.06);_taAddZ(door);
  // כניסת גג
  const roofEntry=new THREE.Mesh(new THREE.BoxGeometry(16,.4,2),new THREE.MeshLambertMaterial({color:0x202028}));
  roofEntry.position.set(AX,22.2,AZ+7);_taAddZ(roofEntry);
  G._taApexBldPos={x:AX,z:AZ};
  G._taLabRoofEntry={x:AX,z:AZ+7};
  // מעבדה אחורית
  _taBuildApexLab(AX,AZ-18);
}

function _taBuildApexLab(LX,LZ){
  const labFloor=new THREE.Mesh(new THREE.PlaneGeometry(20,18),new THREE.MeshStandardMaterial({color:0x1a1a20,roughness:.98}));
  labFloor.rotation.x=-Math.PI/2;labFloor.position.set(LX,.02,LZ);labFloor._isGround=true;_taAddZ(labFloor);
  for(let i=-6;i<=6;i+=6){
    const labL=new THREE.PointLight(0xb0d8ff,1.5,15);labL.position.set(LX+i,4,LZ);_taAddZ(labL);
    const lb=new THREE.Mesh(new THREE.BoxGeometry(3,.2,1.5),new THREE.MeshStandardMaterial({color:0x333355,roughness:.4,metalness:.8}));
    lb.position.set(LX+i,4.1,LZ);_taAddZ(lb);
  }
  [[LX-7,LZ-4],[LX,LZ-4],[LX+7,LZ-4]].forEach(([cx,cz])=>{
    const desk=new THREE.Mesh(new THREE.BoxGeometry(3,.08,1.2),new THREE.MeshLambertMaterial({color:0x2a2a30}));
    desk.position.set(cx,.8,cz);_taAddZ(desk);
    const screen=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.2,.05),new THREE.MeshStandardMaterial({color:0x001830,emissive:0x003366,emissiveIntensity:.8}));
    screen.position.set(cx,1.5,cz-.6);_taAddZ(screen);
    const sc2=document.createElement('canvas');sc2.width=180;sc2.height=120;
    const stx=sc2.getContext('2d');stx.fillStyle='#001830';stx.fillRect(0,0,180,120);
    stx.fillStyle='#00ff88';stx.font='10px monospace';
    ['APEX://Z-01','STATUS:ACTIVE','LAT:32.08','LON:34.78','DNA:▓▓▓▓░░'].forEach((t,i)=>stx.fillText(t,6,16+i*16));
    screen.material.map=new THREE.CanvasTexture(sc2);screen.material.needsUpdate=true;
  });
  for(let i=-7;i<=7;i+=7){
    const cage=new THREE.Mesh(new THREE.BoxGeometry(2.5,2,2.2),new THREE.MeshStandardMaterial({color:0x333338,wireframe:true}));
    cage.position.set(LX+i,1,LZ+4);_taAddZ(cage);
  }
  G._taLabInteriorPos={x:LX,z:LZ};
}

// ════════════════════════════════════════════════
// כיכר רבין
// ════════════════════════════════════════════════
function _taBuildRabinSquare(){
  const RX=0, RZ=-60;
  const sqFloor=new THREE.Mesh(new THREE.PlaneGeometry(55,48),new THREE.MeshStandardMaterial({color:0xd5cfc0,roughness:.92}));
  sqFloor.rotation.x=-Math.PI/2;sqFloor.position.set(RX,.07,RZ);sqFloor._isGround=true;_taAddZ(sqFloor);
  const monument=new THREE.Mesh(new THREE.CylinderGeometry(.8,.9,12,12),new THREE.MeshStandardMaterial({color:0xd8d0c0,roughness:.9}));
  monument.position.set(RX,6,RZ);monument.castShadow=true;_taAddZ(monument);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(2,2,.5,12),new THREE.MeshStandardMaterial({color:0xb8b0a0,roughness:.88}));
  cap.position.set(RX,12.25,RZ);_taAddZ(cap);
  for(let i=0;i<8;i++){const ang=i/8*Math.PI*2;_taBldTree(RX+Math.cos(ang)*20,RZ+Math.sin(ang)*16);}
  [[RX-16,RZ-14,0],[RX+16,RZ-14,0],[RX-16,RZ+14,Math.PI],[RX+16,RZ+14,Math.PI],
   [RX-24,RZ,Math.PI/2],[RX+24,RZ,-Math.PI/2]].forEach(([x,z,a])=>_taBench(x,z,a));
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(42,32),new THREE.MeshLambertMaterial({color:0x3a8822}));
  grass.rotation.x=-Math.PI/2;grass.position.set(RX,.06,RZ+6);_taAddZ(grass);
  // שלט
  const rsc=document.createElement('canvas');rsc.width=320;rsc.height=80;
  const rstx=rsc.getContext('2d');rstx.fillStyle='#1a2a6a';rstx.fillRect(0,0,320,80);
  rstx.fillStyle='#fff';rstx.font='bold 40px Arial';rstx.textAlign='center';rstx.textBaseline='middle';
  rstx.fillText('כיכר רבין',160,40);
  const rsign=new THREE.Mesh(new THREE.BoxGeometry(6,1.5,.1),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(rsc),side:THREE.DoubleSide}));
  rsign.position.set(RX,3,RZ-26);_taAddZ(rsign);
  G._taRabinPos={x:RX,z:RZ};
}

// ════════════════════════════════════════════════
// נמל
// ════════════════════════════════════════════════
function _taBuildPort(){
  const PX=168, PZ=-155;
  const dock=new THREE.Mesh(new THREE.PlaneGeometry(80,65),new THREE.MeshLambertMaterial({color:0x747470}));
  dock.rotation.x=-Math.PI/2;dock.position.set(PX,.06,PZ);dock._isGround=true;_taAddZ(dock);
  const pier=new THREE.Mesh(new THREE.BoxGeometry(80,.9,1.5),new THREE.MeshLambertMaterial({color:0x525248}));
  pier.position.set(PX,.45,PZ-32);_taAddZ(pier);
  // עגורנים
  [PX-22,PX,PX+22].forEach(ex=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(.9,14,.9),new THREE.MeshLambertMaterial({color:0xcc4400}));
    post.position.set(ex,7,PZ-28);_taAddZ(post);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(18,.65,.65),new THREE.MeshLambertMaterial({color:0xcc4400}));
    arm.position.set(ex+7,14.3,PZ-28);_taAddZ(arm);
    const cable=new THREE.Mesh(new THREE.BoxGeometry(.18,10,.18),new THREE.MeshLambertMaterial({color:0x888880}));
    cable.position.set(ex+16,9.3,PZ-28);_taAddZ(cable);
    _taLamp(ex,PZ-14);
  });
  // מחסנים
  [[PX-22,PZ+10,22,12,6],[PX+20,PZ+10,18,10,5.5]].forEach(([wx,wz,ww,wd,wh])=>{
    const wh2=new THREE.Mesh(new THREE.BoxGeometry(ww,wh,wd),new THREE.MeshLambertMaterial({color:0x9a9a8c}));
    wh2.position.set(wx,wh/2,wz);_taAddZ(wh2);_taBldList.push({x:wx,z:wz,w:ww,d:wd});
  });
  // סירות
  [[PX-10,.7,PZ-28],[PX+12,.65,PZ-30]].forEach(([sx,sy,sz])=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(9,1.4,3),new THREE.MeshLambertMaterial({color:0xe8d4a0}));
    b.position.set(sx,sy,sz);_taAddZ(b);
  });
  // שלט נמל
  const nsc=document.createElement('canvas');nsc.width=320;nsc.height=90;
  const nstx=nsc.getContext('2d');nstx.fillStyle='#1a3a8a';nstx.fillRect(0,0,320,90);
  nstx.fillStyle='#fff';nstx.font='bold 44px Arial';nstx.textAlign='center';nstx.textBaseline='middle';
  nstx.fillText('נמל תל אביב',160,45);
  const portSign=new THREE.Mesh(new THREE.BoxGeometry(8,2.2,.15),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(nsc),side:THREE.DoubleSide}));
  portSign.position.set(PX,5,PZ+5);_taAddZ(portSign);
  G._taPortPos={x:PX,z:PZ};
}

// ════════════════════════════════════════════════
// ENTER / EXIT
// ════════════════════════════════════════════════
function enterTelAviv(){
  G.paused=true;
  fadeOut(()=>{
    if(!taScene)buildTelAvivScene();
    TA.inTA=true;
    TA.playerX=0;TA.playerZ=110;
    TA.playerYaw=Math.PI;G.yaw=Math.PI;
    TA.enterGrace=3.0;
    if(taCamera){taCamera.position.set(0,7,126);taCamera.lookAt(0,1,115);}
    scene.remove(PB);taScene.add(PB);
    PB.position.set(TA.playerX,0,TA.playerZ);
    showN('🌆 תל אביב.\nזיפו: "אני יודע לאן ללכת."');
    G.paused=false;fadeIn();
  });
}

function exitTelAviv(){
  G.paused=true;
  fadeOut(()=>{
    TA.inTA=false;
    if(taScene)taScene.remove(PB);
    scene.add(PB);
    PB.position.set(-40,0,150);
    taObjects.forEach(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}
    });
    taObjects.length=0;taEnemies.length=0;_taBldList.length=0;_taLamps.length=0;_taLampPool.length=0;_taZoneGroups.length=0;
    taScene=null;taCamera=null;
    _taRoadTex=null;_taSidewalkTex=null;_taWallTex=null;_taRoofTex=null;
    G.paused=false;fadeIn();
  });
}

// ════════════════════════════════════════════════
// UPD TEL AVIV
// ════════════════════════════════════════════════
function updTelAviv(dt){
  if(!TA.inTA||G.paused||G.dlgOpen)return;
  TA.enterGrace=Math.max(0,(TA.enterGrace||0)-dt);
  if(G.atkCD>0)G.atkCD-=dt;
  const _taAtkCD=G.dog==='zippo'?0.28:0.5;
  if(G.keys['KeyF']&&G.atkCD<=0){
    G.atkCD=_taAtkCD;sBark();PB.rotation.z=.22;setTimeout(()=>PB.rotation.z=0,180);
    G._taAtkFrame=true;setTimeout(()=>{G._taAtkFrame=false;},250);
  }
  // תנועה
  const spd=G.dogs[G.dog].spd*1.05;
  _vFwd.set(-Math.sin(G.yaw),0,-Math.cos(G.yaw));
  _vRgt.set( Math.cos(G.yaw),0,-Math.sin(G.yaw));
  let inputX=0,inputZ=0;
  if(G.keys['KeyW']||G.keys['ArrowUp'])   {inputX+=_vFwd.x;inputZ+=_vFwd.z;}
  if(G.keys['KeyS']||G.keys['ArrowDown']) {inputX-=_vFwd.x;inputZ-=_vFwd.z;}
  if(G.keys['KeyA']||G.keys['ArrowLeft']) {inputX-=_vRgt.x;inputZ-=_vRgt.z;}
  if(G.keys['KeyD']||G.keys['ArrowRight']){inputX+=_vRgt.x;inputZ+=_vRgt.z;}
  if(G.joy.on){inputX+=_vFwd.x*(-G.joy.dy)+_vRgt.x*G.joy.dx;inputZ+=_vFwd.z*(-G.joy.dy)+_vRgt.z*G.joy.dx;}
  const iln=Math.hypot(inputX,inputZ)||1;
  let nx=TA.playerX+(inputX/iln)*spd*dt;
  let nz=TA.playerZ+(inputZ/iln)*spd*dt;
  // collision
  const mg=0.9;
  if(_taBldList.some(b=>Math.abs(nx-b.x)<b.w/2+mg&&Math.abs(TA.playerZ-b.z)<b.d/2+mg))nx=TA.playerX;
  if(_taBldList.some(b=>Math.abs(TA.playerX-b.x)<b.w/2+mg&&Math.abs(nz-b.z)<b.d/2+mg))nz=TA.playerZ;
  nx=Math.max(-230,Math.min(225,nx));nz=Math.max(-270,Math.min(210,nz));
  TA.playerX=nx;TA.playerZ=nz;
  PB.position.set(TA.playerX,0,TA.playerZ);
  // אנימציה
  const _taMoving=Math.abs(inputX)>.01||Math.abs(inputZ)>.01;
  if(_taMoving){
    walkT+=dt*8;
    dogLegs.forEach(lg=>{lg.node.rotation.x=Math.sin(walkT+lg.ph)*.38;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y=_by+Math.abs(Math.sin(walkT))*.09;}
    if(dogTail)dogTail.rotation.z=Math.sin(walkT*2)*.35;
  } else {
    dogLegs.forEach(lg=>{lg.node.rotation.x*=.85;});
    if(dogModel){const _by=dogModel._baseY||0.25;dogModel.position.y+=(_by-dogModel.position.y)*.15;}
    if(dogTail)dogTail.rotation.z=Math.sin(Date.now()*.002)*.1;
  }
  if(_taMoving)PB.rotation.y=Math.atan2(-inputX,-inputZ);
  // מצלמה
  if(taCamera){
    const sz=G.dog==='momo'?.58:1,cd=9,ch=5+G.pitch*7;
    _vCamTarget.set(TA.playerX+Math.sin(G.yaw)*cd,1.1*sz+ch,TA.playerZ+Math.cos(G.yaw)*cd);
    taCamera.position.lerp(_vCamTarget,.1);
    taCamera.lookAt(TA.playerX,1.1*sz+.7,TA.playerZ);
  }
  // LOD zones + פנסים + אויבים + triggers
  _taUpdZones();
  _taUpdLamps();
  _updTAEnemies(dt);
  _checkTAMissionTriggers();
}

// ════════════════════════════════════════════════
// MINIMAP תל אביב
// ════════════════════════════════════════════════
function drawMMTelAviv(){
  const ctx=mmCtx,W=120,H=120;
  const sc=0.22; // TA world ±230 → ~50px offset each side → fits in 120px
  const px=TA.playerX,pz=TA.playerZ;
  const cx=W/2-px*sc, cy=H/2-pz*sc;
  ctx.clearRect(0,0,W,H);

  // רקע — ים בצד מערב
  ctx.fillStyle='#141c24';ctx.fillRect(0,0,W,H);
  // ים
  ctx.fillStyle='#1a5580';
  const seaX=cx+160*sc;
  if(seaX<W)ctx.fillRect(Math.max(0,seaX),0,W-Math.max(0,seaX),H);

  // שכונות בצבעים שונים
  const zones=[
    {x:-40,z:-20,w:160,d:120,col:'rgba(200,190,160,0.35)',label:'בוז׳אוס'},
    {x:-120,z:120,w:130,d:150,col:'rgba(180,140,80,0.35)',label:'כרמל'},
    {x:-20,z:-150,w:200,d:130,col:'rgba(150,170,200,0.35)',label:'צפון'},
    {x:165,z:-155,w:90,d:120,col:'rgba(100,110,120,0.4)',label:'נמל'},
    {x:-60,z:170,w:150,d:110,col:'rgba(190,160,100,0.35)',label:'יפו'},
  ];
  zones.forEach(z=>{
    ctx.fillStyle=z.col;
    ctx.fillRect(cx+(z.x-z.w/2)*sc,cy+(z.z-z.d/2)*sc,z.w*sc,z.d*sc);
  });

  // כבישים E-W
  ctx.fillStyle='#4a4a4a';
  [80,30,-30,-80,-130,-175,140].forEach(z=>{
    ctx.fillRect(0,cy+z*sc-1.5,W,3);
  });
  // כבישים N-S
  [-60,0,55,115,-120,-180].forEach(x=>{
    ctx.fillRect(cx+x*sc-1.5,0,3,H);
  });

  // נקודות עניין
  // כיכר דיזנגוף
  if(G._taDizengoffSq){
    ctx.fillStyle='#44aaff';ctx.beginPath();ctx.arc(cx+G._taDizengoffSq.x*sc,cy+G._taDizengoffSq.z*sc,4,0,Math.PI*2);ctx.fill();
  }
  // שוק הכרמל
  if(G._taMarketPos){
    ctx.fillStyle='#ff8822';ctx.beginPath();ctx.arc(cx+G._taMarketPos.x*sc,cy+G._taMarketPos.z*sc,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff8822';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('שוק',cx+G._taMarketPos.x*sc,cy+G._taMarketPos.z*sc-5);
  }
  // בניין APEX
  if(G._taApexBldPos){
    ctx.fillStyle='#cc44ff';ctx.beginPath();ctx.arc(cx+G._taApexBldPos.x*sc,cy+G._taApexBldPos.z*sc,4,0,Math.PI*2);ctx.fill();
  }
  // נמל
  if(G._taPortPos){
    ctx.fillStyle='#4488cc';ctx.beginPath();ctx.arc(cx+G._taPortPos.x*sc,cy+G._taPortPos.z*sc,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4488cc';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('נמל',cx+G._taPortPos.x*sc,cy+G._taPortPos.z*sc-5);
  }
  // כיכר רבין
  if(G._taRabinPos){
    ctx.fillStyle='#88ff44';ctx.beginPath();ctx.arc(cx+G._taRabinPos.x*sc,cy+G._taRabinPos.z*sc,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#88ff44';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('רבין',cx+G._taRabinPos.x*sc,cy+G._taRabinPos.z*sc-5);
  }
  // נירה
  if(G._taNiraPos&&G.mission<=55){
    ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(cx+G._taNiraPos.x*sc,cy+G._taNiraPos.z*sc,3,0,Math.PI*2);ctx.fill();
  }

  // אויבים
  ctx.fillStyle='#ff3322';
  taEnemies.forEach(e=>{
    if(e.hp<=0||!e.mesh||!e.mesh.visible)return;
    ctx.fillRect(cx+e.mesh.position.x*sc-2,cy+e.mesh.position.z*sc-2,4,4);
  });

  // יעד GPS — מהבהב
  if(_navTargetWorld){
    const tx2=cx+_navTargetWorld.x*sc,tz2=cy+_navTargetWorld.z*sc;
    if(Math.sin(Date.now()*.006)>.0){
      ctx.strokeStyle='#f5c518';ctx.lineWidth=1.5;const r=5;
      ctx.beginPath();ctx.moveTo(tx2-r,tz2-r);ctx.lineTo(tx2+r,tz2+r);ctx.stroke();
      ctx.beginPath();ctx.moveTo(tx2+r,tz2-r);ctx.lineTo(tx2-r,tz2+r);ctx.stroke();
      ctx.beginPath();ctx.arc(tx2,tz2,r+2,0,Math.PI*2);ctx.stroke();
    }
  }

  // שחקן — עיגול לבן + חץ
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(cx+px*sc,cy+pz*sc,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f5c518';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx+px*sc,cy+pz*sc);
  ctx.lineTo(cx+px*sc-Math.sin(G.yaw)*8,cy+pz*sc-Math.cos(G.yaw)*8);ctx.stroke();

  // כיתוב "תל אביב" למעלה
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,13);
  ctx.fillStyle='#88ddff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';
  ctx.fillText('🌆 תל אביב',W/2,10);
  ctx.strokeStyle='#335566';ctx.lineWidth=1;ctx.strokeRect(0,0,W,H);
}

// hook drawMM to use TA version
// drawMM מוגדרת כבר ב-engine — נדרוס אותה עם גרסת TA-aware
// (function declaration hoisting = הגרסה הזו שולטת)

// ════════════════════════════════════════════════
// TRIGGERS — missions 53-62
// ════════════════════════════════════════════════
function _checkTAMissionTriggers(){
  if(!TA.inTA)return;
  const px=TA.playerX,pz=TA.playerZ;

  if(G.mission===53&&!G._ta53done){
    const mp=G._taMarketPos||{x:-90,z:100};
    if(d2(px,pz,mp.x,mp.z)<24){
      G._ta53done=true;
      showCut('ch9_tel_aviv_arrive',()=>{
        G.mission=54;MISSIONS[54].unlock();updateMissionHUD();updateNavArrow();saveGame();
        showN(`📋 ${MISSIONS[54].txt}`);
      });
    }
  }

  if(G.mission===54&&!G._ta54done){
    const np=G._taNiraPos||{x:-122,z:126};
    if(d2(px,pz,np.x,np.z)<10){
      G._ta54done=true;
      G.mission=55;MISSIONS[55].unlock();updateMissionHUD();updateNavArrow();saveGame();
      showN(`📋 ${MISSIONS[55].txt}`);
    }
  }

  if(G.mission===55&&!G._ta55done){
    const np=G._taNiraPos||{x:-122,z:126};
    if(d2(px,pz,np.x,np.z)<8){
      G._ta55done=true;
      showCut('ch9_carmel_market',()=>{
        G.mission=56;MISSIONS[56].unlock();updateMissionHUD();updateNavArrow();saveGame();
        showN(`📋 ${MISSIONS[56].txt}`);
      });
    }
  }

  if(G.mission===56&&!G._ta56done){
    const ap=G._taApexBldPos||{x:70,z:-130};
    if(d2(px,pz,ap.x,ap.z)<14){
      G._ta56done=true;
      showCut('ch9_dizengoff_approach',()=>{
        G.mission=57;MISSIONS[57].unlock();updateMissionHUD();updateNavArrow();saveGame();
        showN(`📋 ${MISSIONS[57].txt}`);
      });
    }
  }

  if(G.mission===57&&!G._ta57done){
    const rp=G._taLabRoofEntry||{x:70,z:-123};
    if(d2(px,pz,rp.x,rp.z)<9){
      G._ta57done=true;
      showCut('ch9_apex_lab_found',()=>{
        G.mission=58;MISSIONS[58].unlock();updateMissionHUD();updateNavArrow();saveGame();
        showN(`📋 ${MISSIONS[58].txt}`);
      });
    }
  }

  if(G.mission===58&&!G._ta58done){
    const lp=G._taLabInteriorPos||{x:70,z:-148};
    if(d2(px,pz,lp.x,lp.z)<12){
      G._ta58done=true;
      forceDog('zippo','זיפו מוביל');
      showCut('ch9_katz_appears',()=>{
        showCut('ch9_katz_truth',()=>{
          G.mission=59;MISSIONS[59].unlock();updateMissionHUD();updateNavArrow();saveGame();
          showN(`📋 ${MISSIONS[59].txt}`);
          // spawn אויבים יוצאים מהבניין
          const ap=G._taApexBldPos||{x:70,z:-130};
          [[ap.x-14,ap.z-8],[ap.x+14,ap.z-8],[ap.x-8,ap.z-16],[ap.x+8,ap.z-16],[ap.x,ap.z-20]]
            .forEach(([ex,ez])=>_spawnTAEnemy(ex,ez));
          showN('⚔️ APEX רץ לנמל! עצרו אותם!');
        });
      });
    }
  }

  if(G.mission===59&&!G._ta59done){
    // הפגש עם Colin לפני הנמל
    if(taEnemies.filter(e=>e.hp>0&&e.mesh&&e.mesh.visible).length===0&&taEnemies.length>0){
      G._ta59done=true;
      forceDog('colin','קולין מוביל');
      showN('🏃 קולין: "הנמל! לנמל!"');
      G.mission=60;MISSIONS[60].unlock();updateMissionHUD();updateNavArrow();saveGame();
    }
  }

  if(G.mission===60&&!G._ta60done){
    const pp=G._taPortPos||{x:168,z:-155};
    if(d2(px,pz,pp.x,pp.z)<25){
      G._ta60done=true;
      showCut('ch9_port_battle',()=>{
        const PP=G._taPortPos||{x:168,z:-155};
        [[PP.x-18,PP.z-10],[PP.x+14,PP.z-8],[PP.x-12,PP.z+8],[PP.x+10,PP.z+8],
         [PP.x,PP.z-18],[PP.x-5,PP.z-6],[PP.x+5,PP.z-6]].forEach(([ex,ez])=>_spawnTAEnemy(ex,ez));
        G.mission=61;MISSIONS[61].unlock();updateMissionHUD();updateNavArrow();saveGame();
        showN(`📋 ${MISSIONS[61].txt}`);
      });
    }
  }

  if(G.mission===61&&!G._ta61done){
    // המשך רק אחרי שמנקים את הנמל
    if(taEnemies.filter(e=>e.hp>0&&e.mesh&&e.mesh.visible).length===0&&taEnemies.length>0){
      G._ta61done=true;
      forceDog('zippo','זיפו מוביל');
      showN('🏛️ זיפו: "הבוס נסוג לכיכר רבין!"');
      G.mission=62;MISSIONS[62].unlock();updateMissionHUD();updateNavArrow();saveGame();
      showN(`📋 ${MISSIONS[62].txt}`);
      setTimeout(()=>_spawnTARabinFight(),1000);
    }
  }

  if(G.mission===62&&G._taBossMgr&&G._taBossMgr.dead&&!G._taKatzSacDone){
    G._taKatzSacDone=true;
    showCut('ch9_katz_sacrifice',()=>{
      showCut('ch9_ending',()=>{
        G.mission=63;MISSIONS[63].unlock();updateMissionHUD();updateNavArrow();saveGame();
        exitTelAviv();
      });
    });
  }
}

// ════════════════════════════════════════════════
// ENEMIES
// ════════════════════════════════════════════════
function _spawnTAEnemy(x,z){
  if(!taScene)return;
  const mesh=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1,1.2,.8),new THREE.MeshLambertMaterial({color:0x1a1a2e}));
  body.position.y=.6;mesh.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshLambertMaterial({color:0x1a1a2e}));
  head.position.y=1.55;mesh.add(head);
  const eyeM=new THREE.MeshLambertMaterial({color:0xff2200,emissive:0xcc0000});
  [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.05),eyeM);e.position.set(s*.18,1.58,.36);mesh.add(e);});
  mesh.position.set(x,0,z);mesh.castShadow=true;
  taScene.add(mesh);taObjects.push(mesh);
  const bg=new THREE.Mesh(new THREE.BoxGeometry(2,.18,.05),new THREE.MeshLambertMaterial({color:0x333333}));
  bg.position.set(0,2.4,0);mesh.add(bg);
  const fill=new THREE.Mesh(new THREE.BoxGeometry(2,.14,.06),new THREE.MeshLambertMaterial({color:0xff3300}));
  fill.position.set(0,2.4,.01);mesh.add(fill);
  const e={mesh,bar:fill,hp:55,mhp:55,spd:5.8,atk:12,atkT:0,state:'patrol',homeX:x,homeZ:z,_alertT:0};
  taEnemies.push(e);return e;
}

function _updTAEnemies(dt){
  if(!TA.inTA)return;
  const px=TA.playerX,pz=TA.playerZ;
  const dog=G.dogs[G.dog];
  taEnemies.forEach(e=>{
    if(e.hp<=0||!e.mesh||!e.mesh.visible)return;
    const ex=e.mesh.position.x,ez=e.mesh.position.z;
    const dd=d2(ex,ez,px,pz);
    e.atkT=Math.max(0,e.atkT-dt);
    if(dd<22)e.state='chase';else if(dd>38)e.state='patrol';
    if(e.state==='chase'){
      const ang=Math.atan2(px-ex,pz-ez);
      e.mesh.position.x+=Math.sin(ang)*e.spd*dt;
      e.mesh.position.z+=Math.cos(ang)*e.spd*dt;
      e.mesh.rotation.y=ang;
      if(dd<2.2&&e.atkT<=0){
        e.atkT=1.1;
        const _dog=G.dogs[G.dog];
        _dog.hp=Math.max(0,_dog.hp-e.atk);haptic(25);
        e.mesh.rotation.z=.3;setTimeout(()=>{if(e.mesh)e.mesh.rotation.z=0;},200);
        if(_dog.hp<=0)playerDeath();
      }
    } else {
      e._alertT=(e._alertT||0)+dt;
      if(e._alertT>2.5){e._alertT=0;const a=Math.random()*Math.PI*2;e.mesh.position.x=e.homeX+Math.cos(a)*4;e.mesh.position.z=e.homeZ+Math.sin(a)*4;}
    }
    if((G.keys['KeyF']||G._taAtkFrame)&&dd<2.8&&G.atkCD<=0){
      e.hp-=dog.atk;
      if(e.bar)e.bar.scale.x=Math.max(0,e.hp/e.mhp);
      if(e.hp<=0){e.mesh.visible=false;sBark();addXP(30);G.coins+=15;updCoins();spawnBlood(e.mesh.position.x,1,e.mesh.position.z,8);}
    }
  });
  // עדכן בוס
  if(G._taBossMgr&&!G._taBossMgr.dead){
    const b=G._taBossMgr;
    if(b.hp<=0){b.dead=true;if(b.mesh)b.mesh.visible=false;sBark();addXP(200);G.coins+=100;updCoins();}
    else{
      const bd=d2(b.mesh.position.x,b.mesh.position.z,px,pz);
      b.atkT=Math.max(0,b.atkT-dt);
      if(bd<25){const ang=Math.atan2(px-b.mesh.position.x,pz-b.mesh.position.z);b.mesh.position.x+=Math.sin(ang)*b.spd*dt;b.mesh.position.z+=Math.cos(ang)*b.spd*dt;}
      if(bd<2.5&&b.atkT<=0){b.atkT=1.4;const _dog=G.dogs[G.dog];_dog.hp=Math.max(0,_dog.hp-b.atk);haptic(40);if(_dog.hp<=0)playerDeath();}
      if((G.keys['KeyF']||G._taAtkFrame)&&bd<3.2&&G.atkCD<=0){b.hp-=dog.atk;if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);}
    }
  }
}

function _spawnTARabinFight(){
  if(!taScene)return;
  showN('⚔️ חיילי APEX — הקיפו!');
  const R=G._taRabinPos||{x:0,z:-60};
  taEnemies.length=0; // נקה אויבים קודמים
  [[R.x-16,R.z-12],[R.x+16,R.z-12],[R.x-16,R.z+12],[R.x+16,R.z+12],
   [R.x,R.z-22],[R.x,R.z+22],[R.x-8,R.z-6],[R.x+8,R.z-6]]
    .forEach(([x,z])=>_spawnTAEnemy(x,z));
  _spawnTACommander(R.x,R.z-4);
}

function _spawnTACommander(x,z){
  if(!taScene)return;
  const mesh=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.6,1),new THREE.MeshLambertMaterial({color:0x0a0a1e}));
  body.position.y=.8;mesh.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.9,.85,.85),new THREE.MeshLambertMaterial({color:0x0a0a1e}));
  head.position.y=1.93;mesh.add(head);
  [-1,1].forEach(s=>{const sh=new THREE.Mesh(new THREE.BoxGeometry(.5,.2,.8),new THREE.MeshLambertMaterial({color:0xcc0000}));sh.position.set(s*.8,1.5,0);mesh.add(sh);});
  mesh.position.set(x,0,z);taScene.add(mesh);taObjects.push(mesh);
  const BOSS_HP=250;
  const bg=new THREE.Mesh(new THREE.BoxGeometry(2.4,.2,.06),new THREE.MeshLambertMaterial({color:0x222222}));
  bg.position.set(0,2.8,0);mesh.add(bg);
  const fill=new THREE.Mesh(new THREE.BoxGeometry(2.4,.16,.07),new THREE.MeshLambertMaterial({color:0xff0000}));
  fill.position.set(0,2.8,.01);mesh.add(fill);
  G._taBossMgr={mesh,bar:fill,hp:BOSS_HP,mhp:BOSS_HP,dead:false,atkT:0,spd:4,atk:28,homeX:x,homeZ:z};
  taEnemies.push(G._taBossMgr);
  showN('⚠️ מפקד APEX — בוס!');
}

function updCh9(dt){
  if(G.mission<48||G.mission>53)return;
  if(TA.inTA)return;
  const px=PB.position.x, pz=PB.position.z;

  if(G.mission===50&&!G._ch9_50done){
    if(d2(px,pz,205,-114)<12){G._ch9_50done=true;setMission(51);}
  }
  if(G.mission===51&&!G._ch9_51done){
    if(d2(px,pz,215,-125)<8){G._ch9_51done=true;MISSIONS[51].unlock();}
  }
  if(G.mission===52&&!G._ch9_52done){
    if(d2(px,pz,-40,150)<10){G._ch9_52done=true;MISSIONS[52].unlock();}
  }
  // 53 → proximity ל-enterTelAviv מטופל ב-main loop
}
