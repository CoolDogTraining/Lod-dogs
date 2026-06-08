
// ── פריטים קוסמטיים ──
const COSMETICS=[
  // ── ספייק קולר — צווארון עם ציפורניים מתכתיות ──
  {id:'spike',ico:'⚡',name:'צווארון ספייק',desc:'מתכת כבדה. לא לכולם.',cost:50,
   apply:(grp)=>{
     const g2=new THREE.Group();
     const sz=grp._dogSz||1;
     // בסיס צווארון עור שחור
     const base=new THREE.Mesh(
       new THREE.CylinderGeometry(.22*sz,.22*sz,.11*sz,16),
       new THREE.MeshLambertMaterial({color:0x1a0a00,emissive:0x050200}));
     base.position.set(0,.92*sz,.52*sz);g2.add(base);
     // ספייקים מתכתיים סביב הצווארון
     const spikeM=new THREE.MeshLambertMaterial({color:0xb8b8b8,emissive:0x303030});
     for(let i=0;i<8;i++){
       const ang=(i/8)*Math.PI*2;
       const spk=new THREE.Mesh(new THREE.ConeGeometry(.025*sz,.12*sz,4),spikeM);
       spk.position.set(
         Math.cos(ang)*.22*sz+0,
         .92*sz+.06*sz,
         Math.sin(ang)*.22*sz+.52*sz
       );
       spk.rotation.z=-Math.cos(ang)*Math.PI*.45;
       spk.rotation.x=Math.sin(ang)*Math.PI*.45;
       g2.add(spk);
     }
     // תג מתכת קדמי
     const tag=new THREE.Mesh(
       new THREE.BoxGeometry(.09*sz,.07*sz,.03*sz),
       new THREE.MeshLambertMaterial({color:0xd4af37,emissive:0x443300}));
     tag.position.set(0,.92*sz,.74*sz);g2.add(tag);
     grp.add(g2);grp._cosSpike=g2;
   },remove:(grp)=>{if(grp._cosSpike){grp.remove(grp._cosSpike);grp._cosSpike=null;}}},

  // ── משקפי שמש — מסגרת עבה, עדשות כהות ──
  {id:'glasses',ico:'🕶️',name:'משקפי שמש',desc:'נינג׳ה. אל תשאל.',cost:40,
   apply:(grp)=>{
     const g2=new THREE.Group();
     const sz=grp._dogSz||1;
     const frameM=new THREE.MeshLambertMaterial({color:0x111111,emissive:0x050505});
     const lensM=new THREE.MeshLambertMaterial({color:0x001133,transparent:true,opacity:.82,emissive:0x000822});
     // עדשה שמאל
     const lL=new THREE.Mesh(new THREE.BoxGeometry(.19*sz,.13*sz,.05*sz),lensM);
     lL.position.set(-.16*sz,1.31*sz,.58*sz);g2.add(lL);
     // עדשה ימין
     const lR=new THREE.Mesh(new THREE.BoxGeometry(.19*sz,.13*sz,.05*sz),lensM);
     lR.position.set(.16*sz,1.31*sz,.58*sz);g2.add(lR);
     // מסגרת שמאל
     const fL=new THREE.Mesh(new THREE.BoxGeometry(.21*sz,.015*sz,.05*sz),frameM);
     fL.position.set(-.16*sz,1.375*sz,.58*sz);g2.add(fL);
     const fLb=fL.clone();fLb.position.y=1.245*sz;g2.add(fLb);
     // מסגרת ימין
     const fR=fL.clone();fR.position.x=.16*sz;g2.add(fR);
     const fRb=fLb.clone();fRb.position.x=.16*sz;g2.add(fRb);
     // גשר אמצעי
     const br=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.03*sz,.04*sz),frameM);
     br.position.set(0,1.315*sz,.58*sz);g2.add(br);
     // זרועות לצדדים
     [-1,1].forEach(side=>{
       const arm=new THREE.Mesh(new THREE.BoxGeometry(.18*sz,.025*sz,.03*sz),frameM);
       arm.position.set(side*.28*sz,1.31*sz,.46*sz);
       arm.rotation.y=side*0.3;g2.add(arm);
     });
     grp.add(g2);grp._cosGl=g2;
   },remove:(grp)=>{if(grp._cosGl){grp.remove(grp._cosGl);grp._cosGl=null;}}},

  // ── בנדנה — בד כרוך על הצוואר עם קשר ──
  {id:'bandana',ico:'🎀',name:'בנדנה אדומה',desc:'כלי לחימה פסיכולוגי.',cost:35,
   apply:(grp)=>{
     const g2=new THREE.Group();
     const sz=grp._dogSz||1;
     // בד בנדנה — cilinder שטוח
     const bn=new THREE.Mesh(
       new THREE.CylinderGeometry(.215*sz,.215*sz,.1*sz,14),
       new THREE.MeshLambertMaterial({color:0xcc1500,emissive:0x3a0500}));
     bn.position.set(0,.93*sz,.52*sz);g2.add(bn);
     // פסים לבנים על הבד
     [-.03,.03].forEach(oy=>{
       const stripe=new THREE.Mesh(
         new THREE.CylinderGeometry(.217*sz,.217*sz,.018*sz,14),
         new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x111111}));
       stripe.position.set(0,.93*sz+oy,.52*sz);g2.add(stripe);
     });
     // קשר — שתי לשוניות קטנות
     const knotM=new THREE.MeshLambertMaterial({color:0xaa1000,emissive:0x2a0300});
     const k1=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.08*sz,.06*sz),knotM);
     k1.position.set(.21*sz,.93*sz,.52*sz);k1.rotation.z=0.3;g2.add(k1);
     const k2=new THREE.Mesh(new THREE.BoxGeometry(.07*sz,.12*sz,.05*sz),knotM);
     k2.position.set(.19*sz,.87*sz,.52*sz);k2.rotation.z=-0.2;g2.add(k2);
     grp.add(g2);grp._cosBn=g2;
   },remove:(grp)=>{if(grp._cosBn){grp.remove(grp._cosBn);grp._cosBn=null;}}},

  // ── גלימת גיבור — גלימה עם צווארון זהב ושרשרת ──
  {id:'cape',ico:'🦸',name:'גלימת גיבור',desc:'רק לגיבור האמיתי.',cost:120,
   apply:(grp)=>{
     const g2=new THREE.Group();
     const sz=grp._dogSz||1;
     const capeM=new THREE.MeshLambertMaterial({
       color:0xcc0000,emissive:0x2a0000,side:THREE.DoubleSide});
     // גלימה ראשית — מרובעת עם קצה מחודד
     const shape=new THREE.Shape();
     shape.moveTo(-.38*sz,0);shape.lineTo(.38*sz,0);
     shape.lineTo(.3*sz,-.9*sz);shape.lineTo(0,-1.1*sz);
     shape.lineTo(-.3*sz,-.9*sz);shape.closePath();
     const geo=new THREE.ShapeGeometry(shape);
     const cape=new THREE.Mesh(geo,capeM);
     cape.position.set(0,.95*sz,-.48*sz);
     cape.rotation.x=-.18;g2.add(cape);
     // קפל אמצעי — פס כהה יותר
     const fold=new THREE.Mesh(
       new THREE.PlaneGeometry(.04*sz,.9*sz),
       new THREE.MeshLambertMaterial({color:0x990000,emissive:0x110000,side:THREE.DoubleSide}));
     fold.position.set(0,.95*sz,-.47*sz);fold.rotation.x=-.18;g2.add(fold);
     // צווארון זהב
     const colM=new THREE.MeshLambertMaterial({color:0xd4af37,emissive:0x4a3300});
     const col=new THREE.Mesh(new THREE.CylinderGeometry(.26*sz,.26*sz,.1*sz,14),colM);
     col.position.set(0,1.06*sz,.5*sz);g2.add(col);
     // כפתור/שרשרת
     const chain=new THREE.Mesh(new THREE.SphereGeometry(.04*sz,6,6),colM);
     chain.position.set(0,1.06*sz,.76*sz);g2.add(chain);
     grp.add(g2);grp._cosCape=g2;
   },remove:(grp)=>{if(grp._cosCape){grp.remove(grp._cosCape);grp._cosCape=null;}}},
];

function openCosmeticShop(){
  if(!G.hud)return;
  const el=document.getElementById('cos-shop');
  if(!el)return;
  G.shopOpen=true;G.paused=true;
  const owned=G._cosmetics||{};
  let html='<div style="color:#f5c518;font-weight:bold;font-size:14px;text-align:center;margin-bottom:8px">👗 חנות עיצוב</div>';
  COSMETICS.forEach(item=>{
    const have=owned[item.id];
    html+=`<div style="display:flex;align-items:center;gap:8px;margin:6px 0;background:rgba(255,255,255,.05);border-radius:8px;padding:6px">
      <span style="font-size:22px">${item.ico}</span>
      <div style="flex:1"><div style="font-weight:bold;font-size:12px">${item.name}</div><div style="color:#aaa;font-size:10px">${item.desc}</div></div>
      <button onclick="buyCos('${item.id}')" style="background:${have?'#e74c3c':'#f5c518'};border:none;border-radius:6px;padding:4px 10px;font-weight:bold;font-size:11px;cursor:pointer;color:#111">
        ${have?'🗑 הסר':'💰 '+item.cost}
      </button>
    </div>`;
  });
  html+='<button onclick="closeCosShop()" style="width:100%;margin-top:8px;background:rgba(255,255,255,.1);border:1px solid #555;border-radius:8px;padding:6px;color:#fff;cursor:pointer">✕ סגור</button>';
  el.innerHTML=html;
  el.style.display='block';
}

function closeCosShop(){
  const el=document.getElementById('cos-shop');
  if(el)el.style.display='none';
  G.shopOpen=false;G.paused=false;
}

function buyCos(id){
  const item=COSMETICS.find(c=>c.id===id);
  if(!item)return;
  if(!G._cosmetics)G._cosmetics={};
  if(G._cosmetics[id]){
    item.remove(PB);delete G._cosmetics[id];
    showN(`הסרת ${item.name} ✓`);
  } else {
    if(G.coins<item.cost){showN('💰 אין מספיק מטבעות!');return;}
    G.coins-=item.cost;updCoins();
    item.apply(PB);G._cosmetics[id]=true;
    showN(`✅ קנית ${item.name}!`);haptic([20,10,30]);
  }
  openCosmeticShop(); // רענן
  saveGame();
}
// ── ui.js — ממשק, יום/לילה, סביבה, מערכות, פרק ה׳, שמירה ──
// ════════════════════════════════════════════════
// ██ מחזור יום / לילה ██
// ════════════════════════════════════════════════
const _SKY_DAY  =new THREE.Color(0x5599cc);   // כחול יום
const _SKY_DUSK =new THREE.Color(0xd4723a);   // כתום שקיעה — לא אדום מוגזם
const _SKY_DUSK2=new THREE.Color(0x7a4060);   // סגול אחרי השקיעה
const _SKY_NIGHT=new THREE.Color(0x080c1a);   // לילה כחלחל
const _SKY_DAWN =new THREE.Color(0xd4855a);   // שחר כתום חם
const _tmpCol   =new THREE.Color();
function updDayNight(dt){
  G.dayTime=(G.dayTime+dt/600)%1; // 10 דקות = יממה מלאה
  const t=G.dayTime;

  // ── שמיים ריאליסטיים ──
  // 00:00-05:00 לילה→שחר  (t 0→0.21)
  // 05:00-07:00 שחר→יום   (t 0.21→0.29)
  // 07:00-15:00 יום        (t 0.29→0.625)
  // 15:00-17:30 יום→שקיעה (t 0.625→0.73)
  // 17:30-19:30 שקיעה→אחה"צ סגול (t 0.73→0.81)
  // 19:30-24:00 לילה        (t 0.81→1.0)

  let sky=_tmpCol;
  if(t<0.21){
    // לילה→שחר
    const f=t/0.21;
    sky.copy(_SKY_NIGHT).lerp(_SKY_DAWN,f*f); // slow at night, faster near dawn
    _ambLight&&(_ambLight.intensity=0.30+f*0.08,_ambLight.color.setHex(0x445588));
    _sunLight&&(_sunLight.intensity=0.02+f*0.04);
    _hemiLight&&(_hemiLight.intensity=0.18+f*0.06);
  } else if(t<0.29){
    // שחר→יום
    const f=(t-0.21)/0.08;
    sky.copy(_SKY_DAWN).lerp(_SKY_DAY,f);
    _ambLight&&(_ambLight.intensity=0.17+f*0.21,_ambLight.color.setHex(0xffb080));
    _sunLight&&(_sunLight.intensity=0.06+f*0.69);
    _hemiLight&&(_hemiLight.intensity=0.12+f*0.18);
  } else if(t<0.625){
    // יום מלא
    sky.copy(_SKY_DAY);
    _ambLight&&(_ambLight.intensity=0.38,_ambLight.color.setHex(0xfff6ee));
    _sunLight&&(_sunLight.intensity=0.75);
    _hemiLight&&(_hemiLight.intensity=0.30);
  } else if(t<0.73){
    // יום→שקיעה
    const f=(t-0.625)/0.105;
    sky.copy(_SKY_DAY).lerp(_SKY_DUSK,f);
    _ambLight&&(_ambLight.intensity=0.38-f*0.14,_ambLight.color.setHex(0xff9060));
    _sunLight&&(_sunLight.intensity=0.75-f*0.52);
    _hemiLight&&(_hemiLight.intensity=0.30-f*0.14);
  } else if(t<0.81){
    // שקיעה→סגול-לילה
    const f=(t-0.73)/0.08;
    sky.copy(_SKY_DUSK).lerp(_SKY_DUSK2,f);
    _ambLight&&(_ambLight.intensity=0.32-f*0.04,_ambLight.color.setHex(0x886688));
    _sunLight&&(_sunLight.intensity=Math.max(0,0.23-f*0.23));
    _hemiLight&&(_hemiLight.intensity=Math.max(0.16,0.22-f*0.06));
  } else {
    // סגול→לילה
    const f=(t-0.81)/0.19;
    sky.copy(_SKY_DUSK2).lerp(_SKY_NIGHT,f);
    _ambLight&&(_ambLight.intensity=Math.max(0.28,0.30-f*0.04),_ambLight.color.setHex(0x445588));
    _sunLight&&(_sunLight.intensity=0);
    _hemiLight&&(_hemiLight.intensity=Math.max(0.16,0.18-f*0.02));
  }

  if(scene) scene.background.copy(sky);

  // ── פנסי רחוב — emissive על כל הנורות ──
  const lampsOn=t>0.70||t<0.30;
  if(_streetLamps.length){
    const targetE=lampsOn?new THREE.Color(0x886633):new THREE.Color(0x000000);
    _streetLamps.forEach(({bulb})=>{ bulb.emissive.lerp(targetE,0.04); });
  }

  // ── עמדת שמש ──
  const sa=t*Math.PI*2-Math.PI/2;
  if(_sunLight) _sunLight.position.set(Math.cos(sa)*130,Math.max(5,Math.sin(sa)*100),60);

  // ── ערפל ──
  if(scene&&scene.fog){
    const isNight=t>0.75||t<0.27;
    scene.fog.near=isNight?70:85;
    scene.fog.far=isNight?220:280;
    scene.fog.color.copy(sky);
  }

  // ── שעון HUD ──
  const h=Math.floor(t*24),m=Math.floor((t*24-h)*60);
  const clockEl=document.getElementById('day-clock');
  const isNightHUD=t>0.75||t<0.27;
  if(clockEl&&G.hud){
    clockEl.style.display='block';
    clockEl.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${isNightHUD?'🌙':'☀️'}`;
  }
}

// ════════════════════════════════════════════════
// ██ מזג אוויר דינמי ██
// ════════════════════════════════════════════════
function buildRain(){
  // שכבה 1 — טיפות דקות (streak particles)
  const count=2200;
  _rainGeo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3);
  const vel=new Float32Array(count);   // מהירות אנכית אינדיווידואלית
  for(let i=0;i<count;i++){
    pos[i*3  ]=(Math.random()-.5)*70;  // LOCAL space — לא world!
    pos[i*3+1]=Math.random()*32;
    pos[i*3+2]=(Math.random()-.5)*70;
    vel[i]=22+Math.random()*10;
  }
  _rainGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  _rainGeo._vel=vel;
  _rainPoints=new THREE.Points(_rainGeo,new THREE.PointsMaterial({
    color:0xaad4f5,size:0.13,transparent:true,opacity:0,depthWrite:false,
    sizeAttenuation:true
  }));
  _rainPoints.visible=false;
  scene.add(_rainPoints);

  // שכבה 2 — טיפות גדולות יותר, נדירות
  const count2=320;
  const geo2=new THREE.BufferGeometry();
  const pos2=new Float32Array(count2*3);
  for(let i=0;i<count2;i++){pos2[i*3]=(Math.random()-.5)*60;pos2[i*3+1]=Math.random()*28;pos2[i*3+2]=(Math.random()-.5)*60;}
  geo2.setAttribute('position',new THREE.BufferAttribute(pos2,3));
  const pts2=new THREE.Points(geo2,new THREE.PointsMaterial({color:0x88bbdd,size:0.28,transparent:true,opacity:0,depthWrite:false}));
  pts2.visible=false;scene.add(pts2);
  _rainPoints._layer2=pts2;
  _rainPoints._geo2=geo2;

  // שלוליות על הקרקע — מראה נחמד כשיורד גשם
  const puddleMat=new THREE.MeshLambertMaterial({color:0x4488aa,transparent:true,opacity:0,depthWrite:false});
  const puddleSpots=[[-5,2],[15,-10],[-22,8],[8,45],[-60,50],[30,-3],[-40,30],[70,40]];
  const puddles=[];
  puddleSpots.forEach(([px,pz])=>{
    const m=new THREE.Mesh(new THREE.CircleGeometry(1.2+Math.random()*.8,12),puddleMat.clone());
    m.rotation.x=-Math.PI/2;m.position.set(px,.02,pz);scene.add(m);puddles.push(m);
  });
  _rainPoints._puddles=puddles;
  _rainPoints._opacity=0; // target opacity, for fade
}
function updWeather(dt){
  if(VILLA.inVilla||CITY.inCity)return;
  G.weatherT-=dt;
  if(G.weatherT<=0){
    const r=Math.random();
    if(r<0.52){G.weather='clear';G.weatherT=80+Math.random()*100;}
    else if(r<0.76){G.weather='overcast';G.weatherT=35+Math.random()*55;}
    else{G.weather='rain';G.weatherT=40+Math.random()*60;} // גשם לפחות 40 שניות!
    if(G.weather==='rain'&&!G.rainOn){
      G.rainOn=true;
      if(_rainPoints){_rainPoints.visible=true;if(_rainPoints._layer2)_rainPoints._layer2.visible=true;}
      // overlay מסך + צליל
      const rov=document.getElementById('rain-ov');if(rov)rov.style.opacity='1';
      _startRainSound();setRainVolume(1);
      showN('🌧️ החל לרדת גשם ברחובות לוד');
      document.getElementById('weather-bar').style.display='block';
    } else if(G.weather!=='rain'&&G.rainOn){
      // fade out — לא מיידי
      G.rainFadeOut=true;
      G.rainOn=false;
      const rov=document.getElementById('rain-ov');if(rov)rov.style.opacity='0';
      setRainVolume(0);
      if(G.weather==='clear')showN('☀️ הגשם פסק — האוויר רענן');
      document.getElementById('weather-bar').style.display='none';
    }
  }

  // Fade in/out opacity
  if(_rainPoints){
    const targetOp=G.rainOn?0.62:0;
    const cur=_rainPoints.material.opacity;
    const newOp=cur+(targetOp-cur)*Math.min(1,dt*1.2);
    _rainPoints.material.opacity=newOp;
    if(_rainPoints._layer2)_rainPoints._layer2.material.opacity=newOp*0.55;
    // שלוליות
    if(_rainPoints._puddles){
      _rainPoints._puddles.forEach(p=>{
        p.material.opacity+=(G.rainOn?0.35:0-p.material.opacity)*dt*0.5;
        p.material.opacity=Math.max(0,Math.min(0.38,p.material.opacity));
      });
    }
    if(newOp<0.01&&!G.rainOn){_rainPoints.visible=false;if(_rainPoints._layer2)_rainPoints._layer2.visible=false;G.rainFadeOut=false;}

    // עדכון particles — LOCAL space!
    if(G.rainOn&&PB){
      const px=PB.position.x,pz=PB.position.z;
      _rainPoints.position.set(px,0,pz);
      if(_rainPoints._layer2)_rainPoints._layer2.position.set(px,0,pz);
      const arr=_rainGeo.attributes.position.array;
      const vel=_rainGeo._vel;
      const arr2=_rainPoints._geo2.attributes.position.array;
      const windX=Math.sin(Date.now()*.0003)*.8, windZ=Math.cos(Date.now()*.00025)*.5;
      for(let i=0;i<arr.length/3;i++){
        arr[i*3  ]+=windX*dt;
        arr[i*3+1]-=vel[i]*dt;
        arr[i*3+2]+=windZ*dt;
        if(arr[i*3+1]<-1){  // reset ב-LOCAL space
          arr[i*3  ]=(Math.random()-.5)*70;
          arr[i*3+1]=28+Math.random()*6;
          arr[i*3+2]=(Math.random()-.5)*70;
        }
      }
      _rainGeo.attributes.position.needsUpdate=true;
      for(let i=0;i<arr2.length/3;i++){
        arr2[i*3+1]-=18*dt;
        if(arr2[i*3+1]<-1){arr2[i*3]=(Math.random()-.5)*60;arr2[i*3+1]=25+Math.random()*5;arr2[i*3+2]=(Math.random()-.5)*60;}
      }
      _rainPoints._geo2.attributes.position.needsUpdate=true;
    }
  }

  // ערפל גשם — מוסיף אווירה
  if(scene&&scene.fog){
    const rainFog=G.rainOn?0.85:1.0;
    scene.fog.far+=(G.rainOn?180:260-scene.fog.far)*dt*0.4*rainFog;
    scene.fog.near+=(G.rainOn?50:90-scene.fog.near)*dt*0.4;
  }
}

// ════════════════════════════════════════════════
// ██ אנשים ברחוב — מערכת מלאה ██
// ════════════════════════════════════════════════
// ── ערסים מלוד — פלטת צבעים ──
// חולצות: אדידס שחור, גוף לבן, פולו כהה, טרנינג אפור, ג'קט כהה
const _HUMAN_SHIRTS=[
  0xeeeeee, // גוף לבן
  0xf0f0f0, // גוף לבן שבור
  0x111111, // טרנינג שחור אדידס
  0x1a1a1a, // ג'קט שחור
  0x222233, // כחול כהה — פולו
  0x2a2a2a, // אפור כהה
  0x333322, // זית — צבאי
  0x881111, // אדום — ריאל מדריד
  0x113388, // כחול — בית"ר
  0xdddddd, // אפור בהיר — הודי
  0x0a0a0a, // שחור מוחלט
  0x444433, // כאקי
];
// מכנסיים: ג'ינס כהה, טרנינג שחור, שחור
const _HUMAN_PANTS=[
  0x1a1a2a, // טרנינג שחור
  0x222233, // ג'ינס כהה
  0x0d0d0d, // שחור מוחלט
  0x2a2218, // חאקי כהה
  0x111118, // כחול ג'ינס כהה
  0x1c1c1c, // אפור פחם
  0x181818, // שחור
  0x252510, // זית כהה
];
// גוונים מדיטרניים — ערביים, מזרחים, ספרדים
const _HUMAN_SKINS=[
  0xc8864c, // חום בינוני
  0xb87848, // חום כהה
  0xa06030, // חום עמוק
  0xd4a574, // חמישי בינוני
  0x8b5e3c, // חום כהה מאוד
  0x7a4828, // כהה
  0xe0a878, // בינוני-בהיר
  0x906040, // אדמה
];
// סוגי ערסים — מהירות נמוכה, הרבה בטלה
const _HUMAN_TYPES=[
  {name:'ערס',  hs:1.05, spd:0.9,  idleT:5,  walkRange:15},
  {name:'חינגר',hs:1.0,  spd:0.75, idleT:7,  walkRange:10},
  {name:'ג\'יגן',hs:1.08, spd:1.1,  idleT:3,  walkRange:20},
  {name:'זקן',  hs:0.88, spd:0.5,  idleT:10, walkRange:8},
  {name:'ילד שכונה',hs:0.74,spd:2.0,idleT:1,walkRange:18},
];

function mkHuman(shirtCol,skinCol,pantsCol,s){
  const g=new THREE.Group();
  g.scale.setScalar(s||1);
  const sk =new THREE.MeshLambertMaterial({color:skinCol});
  const sh =new THREE.MeshLambertMaterial({color:shirtCol});
  const pt =new THREE.MeshLambertMaterial({color:pantsCol});
  const so =new THREE.MeshLambertMaterial({color:0xf0f0f0}); // נעלי ספורט לבנות
  const hairDark=Math.random()<.7; // רוב הערסים — שיער כהה
  const hairCol=hairDark?0x0a0500:(Math.random()<.5?0x1a0e00:0x888070);
  const hair=new THREE.MeshLambertMaterial({color:hairCol});
  const goldM=new THREE.MeshLambertMaterial({color:0xd4a820,emissive:0x221000});

  // גוף — רחב, שרירי (ערסי)
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.40,.52,.22),sh);
  torso.position.y=.82;g.add(torso);
  // כתפיים רחבות
  [-1,1].forEach(sd=>{
    const shld=new THREE.Mesh(new THREE.BoxGeometry(.13,.16,.2),sh);
    shld.position.set(sd*.25,.98,0);g.add(shld);
  });
  // בטן — קצת בולטת
  const belly=new THREE.Mesh(new THREE.BoxGeometry(.36,.28,.14),sh);
  belly.position.set(0,.66,.05);g.add(belly);

  // ראש — מרובע, עגול
  const head=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.26),sk);
  head.position.y=1.24;g.add(head);

  // שיער — קצר וצמוד (ג'ל) או קרחת
  const hairStyle=Math.random();
  if(hairStyle<.5){
    // ג'ל — שכבה דקה על הראש
    const hairTop=new THREE.Mesh(new THREE.BoxGeometry(.29,.06,.27),hair);
    hairTop.position.y=1.39;g.add(hairTop);
  } else if(hairStyle<.75){
    // כיסוי ראש — כובע אחורה
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.3,.1,.28),new THREE.MeshLambertMaterial({color:0x111111}));
    cap.position.y=1.41;g.add(cap);
    const brim=new THREE.Mesh(new THREE.BoxGeometry(.28,.04,.18),new THREE.MeshLambertMaterial({color:0x0a0a0a}));
    brim.position.set(0,1.36,-.2);g.add(brim); // ויזור — אחורה
  } else {
    // כיפה סרוגה
    const kipa=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6,0,Math.PI*2,0,Math.PI*.45),
      new THREE.MeshLambertMaterial({color:[0x222244,0x442222,0x224422,0x1a1a1a][Math.floor(Math.random()*4)]}));
    kipa.position.y=1.37;g.add(kipa);
    const hairBase=new THREE.Mesh(new THREE.BoxGeometry(.29,.05,.27),hair);
    hairBase.position.y=1.39;g.add(hairBase);
  }

  // פנים — עיניים + גבות שחורות
  const eyeM=new THREE.MeshLambertMaterial({color:0x080808});
  const browM=new THREE.MeshLambertMaterial({color:0x0a0500});
  [-1,1].forEach(sd=>{
    const ey=new THREE.Mesh(new THREE.BoxGeometry(.055,.045,.03),eyeM);
    ey.position.set(sd*.082,1.245,.13);g.add(ey);
    const br=new THREE.Mesh(new THREE.BoxGeometry(.07,.025,.03),browM);
    br.position.set(sd*.082,1.285,.13);g.add(br);
  });
  // שפם על חלק
  if(Math.random()<.45){
    const must=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,.03),new THREE.MeshLambertMaterial({color:0x0a0500}));
    must.position.set(0,1.19,.135);g.add(must);
  }

  // שרשרת זהב — ערסי קלאסי
  if(Math.random()<.6){
    const chain=new THREE.Mesh(new THREE.TorusGeometry(.12,.012,4,12),goldM);
    chain.rotation.x=Math.PI/2;chain.position.set(0,.98,.11);g.add(chain);
  }

  // פסי אדידס — על הזרועות (3 פסים לבנים)
  const hasStripes=shirtCol===0x111111||shirtCol===0x1a1a1a||shirtCol===0x2a2a2a;
  const stripM=new THREE.MeshLambertMaterial({color:0xffffff});

  // זרועות — שריריות
  const armL=new THREE.Group();armL.position.set(-.26,.92,0);g.add(armL);
  const armR=new THREE.Group();armR.position.set( .26,.92,0);g.add(armR);
  [armL,armR].forEach(arm=>{
    const upper=new THREE.Mesh(new THREE.BoxGeometry(.13,.35,.13),sh);upper.position.y=-.17;arm.add(upper);
    if(hasStripes){
      [-0.04,0,0.04].forEach(dy=>{
        const s=new THREE.Mesh(new THREE.BoxGeometry(.14,.025,.14),stripM);s.position.y=-.1+dy;arm.add(s);
      });
    }
    const lower=new THREE.Mesh(new THREE.BoxGeometry(.11,.3,.11),sk);lower.position.y=-.42;arm.add(lower);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(.13,.11,.13),sk);hand.position.y=-.59;arm.add(hand);
  });

  // רגליים — מכנסי טרנינג רחבים
  const legL=new THREE.Group();legL.position.set(-.11,.56,0);g.add(legL);
  const legR=new THREE.Group();legR.position.set( .11,.56,0);g.add(legR);
  [legL,legR].forEach(leg=>{
    const upper=new THREE.Mesh(new THREE.BoxGeometry(.16,.44,.16),pt);upper.position.y=-.22;leg.add(upper);
    const lower=new THREE.Mesh(new THREE.BoxGeometry(.14,.38,.14),pt);lower.position.y=-.54;leg.add(lower);
    // נעל ספורט לבנה — עם סוליה עבה
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.17,.08,.24),so);shoe.position.set(0,-.76,.03);leg.add(shoe);
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.17,.04,.24),new THREE.MeshLambertMaterial({color:0xdddddd}));
    sole.position.set(0,-.8,.03);leg.add(sole);
  });

  g._head=head;
  g._armL=armL;g._armR=armR;
  g._legL=legL;g._legR=legR;
  // העלה את כל הגיאומטריה כך שתחתית הנעל תהיה בדיוק ב-y=0
  g._footY=0.26*(s||1);  // offset כדי שתחתית הנעל תהיה ב-y=0
  return g;
}

// מקומות מקלט מגשם — מרפסות ופינות בניינים
const _SHELTER_SPOTS=[
  {x:-74,z:50},{x:-60,z:42},{x:-10,z:-6},{x:8,z:6},
  {x:40,z:-6},{x:-38,z:-6},{x:38,z:6},{x:70,z:96},
];

function _spawnBellaMonument(mx,mz){
  const stone=new THREE.MeshLambertMaterial({color:0x888880});
  const dark =new THREE.MeshLambertMaterial({color:0x333330});
  const gold =new THREE.MeshLambertMaterial({color:0xc8a84b,emissive:new THREE.Color(0x443310)});
  const g=new THREE.Group();

  // בסיס אבן — שלוש שכבות
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.28,1.8),stone); base.position.y=0.14; g.add(base);
  const mid =new THREE.Mesh(new THREE.BoxGeometry(2.2,0.32,1.4),stone); mid.position.y=0.52;  g.add(mid);
  const top =new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.1),stone);  top.position.y=1.44;  g.add(top);

  // שלט זהב על הבסיס הקדמי
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.55,0.07),gold);
  plaque.position.set(0,0.85,0.57); g.add(plaque);

  // סילואט כלב — גוף+ראש+זנב פשוט מעל האנדרטה
  const dogBody=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.4,0.28),dark); dogBody.position.set(0,2.55,0);  g.add(dogBody);
  const dogHead=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.26),dark); dogHead.position.set(0.45,2.78,0); g.add(dogHead);
  // אוזניים
  const earL=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.18,0.1),dark); earL.position.set(0.42,2.96,0.1);  g.add(earL);
  const earR=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.18,0.1),dark); earR.position.set(0.42,2.96,-0.1); g.add(earR);
  // זנב — מוטה קצת
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.32,0.08),dark);
  tail.rotation.z=-0.5; tail.position.set(-0.42,2.7,0); g.add(tail);
  // רגליים — 4
  [[-0.22,0.22],[-0.22,-0.22],[0.22,0.22],[0.22,-0.22]].forEach(([lx,lz])=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.28,0.1),dark);
    leg.position.set(lx,2.22,lz); g.add(leg);
  });

  // הילה זהובה — טבעת מאחורה
  const halo=new THREE.Mesh(
    new THREE.TorusGeometry(0.45,0.04,6,20),
    new THREE.MeshLambertMaterial({color:0xffd966,emissive:new THREE.Color(0x665500)})
  );
  halo.position.set(0,2.62,0); g.add(halo);

  // פרחים קטנים סביב הבסיס
  const flowerC=[0xff6688,0xffaacc,0xff4466];
  for(let i=0;i<8;i++){
    const ang=i/8*Math.PI*2;
    const f=new THREE.Mesh(new THREE.SphereGeometry(0.1,5,4),
      new THREE.MeshLambertMaterial({color:flowerC[i%3]}));
    f.position.set(Math.sin(ang)*1.5,0.15,Math.cos(ang)*0.95); g.add(f);
  }

  g.position.set(mx,0,mz);
  g.castShadow=true; g.receiveShadow=true;
  scene.add(g);
  return g;
}

function buildHumanNPCs(){
  // נקודות התחלה על מדרכות בלבד
  const spots=[];
  for(let i=0;i<28;i++){
    const [sx,sz]=_randomSidewalkPt();
    if(!isInBuilding(sx,sz,1.5)) spots.push([sx,sz]);
  }
  // כמה מהשוק (אזור הומה) — נקודות מאחורי הדוכנים, לא על כביש
  [[-65,46],[-58,54],[-72,56],[-60,63]].forEach(([x,z])=>{
    if(!isInBuilding(x,z,2)&&!_isOnRoad(x,z)) spots.push([x,z]);
  });

  spots.slice(0,22).forEach(([x,z],i)=>{
    const type=_HUMAN_TYPES[i%_HUMAN_TYPES.length];
    const si=i%_HUMAN_SHIRTS.length;
    const h=mkHuman(
      _HUMAN_SHIRTS[si],
      _HUMAN_SKINS[i%_HUMAN_SKINS.length],
      _HUMAN_PANTS[i%_HUMAN_PANTS.length],
      type.hs
    );
    h.position.set(x,getGroundY(x,z)+(h._footY||0),z);
    scene.add(h);
    const [tx,tz]=_randomSidewalkPt();
    G.humanNPCs.push({
      mesh:h, x, z, homeX:x, homeZ:z,
      targetX:tx, targetZ:tz,
      finalTargetX:tx, finalTargetZ:tz,
      crossX:0, crossZ:0,
      waitT:Math.random()*type.idleT,
      spd:type.spd, type,
      wt:Math.random()*Math.PI*2,
      state:'walk',
      idleAnim:0,
      lookT:0,
      talkT:Math.random()*12,
    });
  });

  // ── יושבים מעשנים — 50% מהספסלים ──
  _benchSpots.forEach((b,i)=>{
    if(i%2!==0) return;
    const si=i%_HUMAN_SHIRTS.length;
    const h=mkHuman(
      _HUMAN_SHIRTS[si],
      _HUMAN_SKINS[i%_HUMAN_SKINS.length],
      _HUMAN_PANTS[i%_HUMAN_PANTS.length],
      false
    );
    // ספסל מושב ב-y=0.5. מרכז גוף הדמות y=0.82 → נרים ל-y=0.04 כדי לשבת עליו
    h.position.set(b.x, 0.04, b.z);
    // סובב לכיוון הספסל — גב לגב הספסל (ללא +Math.PI)
    h.rotation.y = b.ang;
    scene.add(h);

    // פוזה ישיבה: רגליים קדימה (מחשוף הברך), ידיים נרגעות
    // legL/R pivot ב-y=0.58 מעל האדמה → כשמקפלים כלפי מעלה הרגל זזה קדימה
    if(h._legL){ h._legL.rotation.x = -1.35; }  // רגל ימנית קדימה
    if(h._legR){ h._legR.rotation.x = -1.35; }
    // יד שמאל מונחת על הברך
    if(h._armL){ h._armL.rotation.x = 0.6; h._armL.rotation.z = 0.15; }
    // יד ימין מורמת עם סיגריה לפה
    if(h._armR){ h._armR.rotation.x = -0.9; h._armR.rotation.z = -0.2; }

    // סיגריה — מחוברת לקצה היד הימנית (y=-0.38 ביחס ל-armR)
    const cigMat = new THREE.MeshLambertMaterial({color:0xf0ece4});
    const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 5), cigMat);
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 5, 4),
      new THREE.MeshLambertMaterial({color:0xff5500, emissive:new THREE.Color(0xaa2200)})
    );
    ember.position.y = 0.12;
    const cigG = new THREE.Group();
    cigG.add(cig);
    cigG.add(ember);
    // הסיגריה אנכית, ביד הימנית, קצה קרוב לפה
    cigG.position.set(0, -0.38, 0);
    cigG.rotation.z = 0.3; // קצת זווית
    h._armR.add(cigG);

    G.humanNPCs.push({
      mesh:h, x:b.x, z:b.z, homeX:b.x, homeZ:b.z,
      targetX:b.x, targetZ:b.z,
      finalTargetX:b.x, finalTargetZ:b.z,
      crossX:0, crossZ:0,
      waitT:999, spd:0,
      type:_HUMAN_TYPES[0],
      wt:0, state:'sitting', idleAnim:0, lookT:0, talkT:999,
      _sittingBench:b, _smoker:true, _cigG:cigG,
    });
  });
}

function updHumanNPCs(dt){
  const px=PB.position.x,pz=PB.position.z;
  const t=Date.now()*.001;
  const isRaining=G.rainOn;
  const isNight=G.dayTime>0.72||G.dayTime<0.27;

  G.humanNPCs.forEach((n,i)=>{
    const shouldBeVisible=!isNight||(i%4===0);
    n.mesh.visible=shouldBeVisible;
    if(!shouldBeVisible) return;

    // ── מעשן יושב קבוע — יד לפה, עשן מהסיגריה ומהפה ──
    if(n._smoker){
      n.idleAnim+=dt;
      // מחזור עישון: עולה לפה (sin עולה), שוהה, יורד לברך
      // armR pivot ב-y=0.9, ראש ב-y=1.22 → צריך rotation.x ≈ -1.55 כדי שהיד תגיע לפה
      const cycle=Math.sin(n.idleAnim*0.4); // -1 עד 1
      const armAngle=-0.55+cycle*1.0; // טווח: -1.55 (לפה) עד 0.45 (לברך)
      if(n.mesh._armR) n.mesh._armR.rotation.x=armAngle;
      if(n.mesh._head) n.mesh._head.rotation.y=Math.sin(n.idleAnim*0.18)*0.12;

      // עשן מהסיגריה — תמיד עולה (כשהיד למטה)
      if(Math.random()<dt*2.0&&n._cigG){
        const wp=new THREE.Vector3();
        n._cigG.getWorldPosition(wp);
        // השתמש בpool של _pfxGet במקום ליצור mesh חדש
        const sm=_pfxGet(0xbbbbbb);
        sm.scale.setScalar(0.12);
        sm.position.copy(wp);sm.position.y+=0.06;
        scene.add(sm);
        G.particles.push({mesh:sm,vx:(Math.random()-.5)*0.07,vy:0.55+Math.random()*0.3,vz:(Math.random()-.5)*0.07,life:1.5,_smoke:1});
      }

      // עשן מהפה — נשיפה החוצה כשהיד יורדת מהשיא (cycle יורד מ-1)
      // מזהה רגע הנשיפה: cycle עובר מ->0.85 בירידה
      if(!n._lastCycle) n._lastCycle=0;
      const exhale = n._lastCycle>0.82 && cycle<=0.82;
      n._lastCycle=cycle;
      if(exhale&&n.mesh._head){
        const headWP=new THREE.Vector3();
        n.mesh._head.getWorldPosition(headWP);
        // כיוון הנשיפה — קדימה מהפנים של הדמות
        const fwd=new THREE.Vector3(Math.sin(n.mesh.rotation.y),0,Math.cos(n.mesh.rotation.y));
        for(let pi=0;pi<3;pi++){  // הפחת מ-5 ל-3
          const sm=_pfxGet(0xe8e8e8);
          sm.scale.setScalar(0.16+Math.random()*0.08);
          sm.position.copy(headWP);sm.position.y-=0.06;
          scene.add(sm);
          G.particles.push({
            mesh:sm,
            vx:fwd.x*0.4+(Math.random()-.5)*0.12,
            vy:0.18+Math.random()*0.15,
            vz:fwd.z*0.4+(Math.random()-.5)*0.12,
            life:0.9+Math.random()*0.4,
            _smoke:1
          });
        }
      }
      return;
    }

    const distToPlayer=d2(n.x,n.z,px,pz);

    // ── בריחה מנביחה/קרב ──
    if(distToPlayer<5&&G.atkCD<0.4&&G.atkCD>0&&n.state!=='flee'){
      n.state='flee';
      const ang=Math.atan2(n.x-px,n.z-pz);
      n.targetX=Math.max(-130,Math.min(130,n.x+Math.sin(ang)*18));
      n.targetZ=Math.max(-130,Math.min(130,n.z+Math.cos(ang)*18));
      n.waitT=0;
    }

    // ── גשם — למקלט ──
    if(isRaining&&n.state!=='shelter'&&n.state!=='flee'&&Math.random()<dt*.08){
      n.state='shelter';
      let bestS=_SHELTER_SPOTS[0],bestD=9999;
      _SHELTER_SPOTS.forEach(s=>{const d=d2(n.x,n.z,s.x,s.z);if(d<bestD){bestD=d;bestS=s;}});
      n.targetX=bestS.x+(Math.random()-.5)*3;
      n.targetZ=bestS.z+(Math.random()-.5)*3;
      n.waitT=0;
    }
    if(!isRaining&&n.state==='shelter'){n.state='idle';n.waitT=1+Math.random()*2;}

    // ── idle anim ──
    n.idleAnim+=dt;
    if(n.mesh._head){
      n.lookT+=dt;
      if(n.lookT>3+Math.random()*4){n.lookT=0;n.mesh._head.rotation.y=(Math.random()-.5)*.5;}
      n.mesh._head.position.y=1.22+Math.sin(n.idleAnim*1.1)*.008;
    }

    // ── חצייה: האם NPC עומד על קצה כביש וממתין? ──
    if(n.state==='waitCross'){
      // בדוק אם הכביש פנוי (אין מכוניות קרובות בציר החצייה)
      const carsClear=!G.cars.some(c=>{
        // מכונית רלוונטית אם היא נוסעת באזור החצייה הזו
        const distCW=d2(c.x,c.z,n.crossX,n.crossZ);
        return distCW<18&&!c.stopped;
      });
      if(carsClear){
        n.state='crossing';
        n.waitT=0;
      } else {
        // המשך לחכות — אנימציית idle
        if(n.mesh._legL){n.mesh._legL.rotation.x*=.85;n.mesh._legR.rotation.x*=.85;}
        if(n.mesh._armL){n.mesh._armL.rotation.x*=.85;n.mesh._armR.rotation.x*=.85;}
        return;
      }
    }

    n.waitT-=dt;
    const dx=n.targetX-n.x, dz=n.targetZ-n.z;
    const dist=Math.sqrt(dx*dx+dz*dz);

    // ── ישיבה על ספסל — ממתין לפג הזמן ──
    if(n.state==='sitting'){
      if(n.waitT<=0){
        // קום וחזור ללכת
        n.state='walk';
        n._sittingBench=null;
        n.mesh.position.y=getGroundY(n.x,n.z)+(n.mesh._footY||0);
        if(n.mesh._legL){n.mesh._legL.rotation.x=0;n.mesh._legR.rotation.x=0;}
        if(n.mesh._armL){n.mesh._armL.rotation.x=0;n.mesh._armR.rotation.x=0;}
        const sw=_SIDEWALKS[Math.floor(Math.random()*_SIDEWALKS.length)];
        const tt=Math.random();
        n.targetX=sw.x0+(sw.x1-sw.x0)*tt;
        n.targetZ=sw.z0+(sw.z1-sw.z0)*tt;
      }
      return; // אל תזיז אותו בזמן ישיבה
    }

    if(dist<0.7){
      // הגיע ליעד
      if(n.state==='crossing'){
        // סיים חצייה — המשך ללכת על המדרכה
        n.state='walk';
      }
      if(n.state==='flee'){n.state='idle';}
      if(n.state==='shelter'){n.waitT=isRaining?99:2;}
      else {
        // בחר יעד חדש על המדרכה
        let tx,tz,tries=0;
        do{
          const sw=_SIDEWALKS[Math.floor(Math.random()*_SIDEWALKS.length)];
          const tt=Math.random();
          tx=sw.x0+(sw.x1-sw.x0)*tt+(Math.random()-.5)*1.5;
          tz=sw.z0+(sw.z1-sw.z0)*tt+(Math.random()-.5)*1.5;
          tries++;
        }while(isInBuilding(tx,tz,1.5)&&tries<8);
        n.targetX=Math.max(-130,Math.min(130,tx));
        n.targetZ=Math.max(-130,Math.min(130,tz));
        n.waitT=n.type.idleT*(0.5+Math.random()*1.5);
        n.state='idle';

        // 15% סיכוי לשבת על ספסל קרוב
        if(Math.random()<0.15&&_benchSpots.length){
          let bestB=null,bestBd=9999;
          _benchSpots.forEach(b=>{const dd=d2(n.x,n.z,b.x,b.z);if(dd<28&&dd<bestBd){bestBd=dd;bestB=b;}});
          if(bestB){
            n.targetX=bestB.x; n.targetZ=bestB.z;
            n._sittingBench=bestB;
            n.state='toSit';
            n.waitT=0;
          }
        }

        // האם צריך לחצות כביש כדי להגיע ליעד?
        // בדיקה פשוטה: האם יש כביש בין הנקודה הנוכחית לנקודת היעד
        const midX=(n.x+n.targetX)/2, midZ=(n.z+n.targetZ)/2;
        if(_isOnRoad(midX,midZ)){
          // מצא מעבר חציה קרוב
          let bestCW=null,bestCWd=9999;
          _CROSSWALKS.forEach(cw=>{
            const dd=d2(n.x,n.z,cw.x,cw.z);
            if(dd<bestCWd){bestCWd=dd;bestCW=cw;}
          });
          if(bestCW&&bestCWd<40){
            // לך קודם למעבר החציה
            n.crossX=bestCW.x; n.crossZ=bestCW.z;
            n.finalTargetX=n.targetX; n.finalTargetZ=n.targetZ;
            n.targetX=bestCW.x+(Math.random()-.5)*2;
            n.targetZ=bestCW.z+(Math.random()-.5)*2;
            n.state='toCross'; // הולך למעבר חציה
          }
        }
      }
      // עצור אנימציה
      if(n.mesh._armL){n.mesh._armL.rotation.x*=.85;n.mesh._armR.rotation.x*=.85;}
      if(n.mesh._legL){n.mesh._legL.rotation.x*=.85;n.mesh._legR.rotation.x*=.85;}

    } else if(n.waitT<=0||n.state==='flee'||n.state==='shelter'||n.state==='toCross'||n.state==='crossing'){

      // הגיע למעבר חציה — חכה לפני חציה
      if(n.state==='toCross'&&dist<1.5){
        n.state='waitCross';
        return;
      }
      // הגיע לספסל — שב
      if(n.state==='toSit'&&dist<1.2){
        n.state='sitting';
        n.waitT=8+Math.random()*12;
        if(n._sittingBench) n.mesh.rotation.y=n._sittingBench.ang;
        if(n.mesh._legL){n.mesh._legL.rotation.x=-1.35;n.mesh._legR.rotation.x=-1.35;}
        if(n.mesh._armL){n.mesh._armL.rotation.x=0.6;}
        if(n.mesh._armR){n.mesh._armR.rotation.x=-0.9;}
        n.mesh.position.y=getGroundY(n.x,n.z)+(n.mesh._footY||0)+0.04;
        return;
      }

      // אחרי שעבר את מעבר החציה — המשך ליעד המקורי
      if(n.state==='crossing'&&dist<2){
        n.targetX=n.finalTargetX||n.targetX;
        n.targetZ=n.finalTargetZ||n.targetZ;
        n.state='walk';
      }

      // זוז
      const spd=n.state==='flee'?n.spd*2.2:n.spd;
      n.x+=dx/dist*spd*dt;
      n.z+=dz/dist*spd*dt;
      n.mesh.position.set(n.x,getGroundY(n.x,n.z)+(n.mesh._footY||0),n.z);
      n.mesh.rotation.y=Math.atan2(dx,dz);

      // אנימציית הליכה
      const animSpd=spd*3.2;
      n.wt+=dt*animSpd;
      const swing=n.state==='flee'?.6:.38;
      if(n.mesh._legL){n.mesh._legL.rotation.x=Math.sin(n.wt)*swing;}
      if(n.mesh._legR){n.mesh._legR.rotation.x=Math.sin(n.wt+Math.PI)*swing;}
      if(n.mesh._armL){n.mesh._armL.rotation.x=Math.sin(n.wt+Math.PI)*swing*.7;}
      if(n.mesh._armR){n.mesh._armR.rotation.x=Math.sin(n.wt)*swing*.7;}
      if(n.type.name==="ג'וגר") n.mesh.position.y=getGroundY(n.x,n.z)+(n.mesh._footY||0)+Math.abs(Math.sin(n.wt*1.5))*.07;
      if(n.mesh._head) n.mesh._head.rotation.y=0;
    }
  });
}

// ════════════════════════════════════════════════
// ██ מכוניות — מערכת מלאה ██
// ════════════════════════════════════════════════
const _CAR_COLS=[0xcc2222,0x2255cc,0x22aa44,0xddcc22,0xdddddd,0x224488,0xcc6622,0x553388,0x228888,0xcc44aa,0x884422,0x1a1a1a,0xee8822,0x44aacc];
function mkCar(col){
  const g=new THREE.Group();
  const bodyM=new THREE.MeshLambertMaterial({color:col});
  const darkBodyM=new THREE.MeshLambertMaterial({color:new THREE.Color(col).multiplyScalar(.7).getHex()});
  const glassM=new THREE.MeshLambertMaterial({color:0x88bbdd,transparent:true,opacity:.7});
  const tireM=new THREE.MeshLambertMaterial({color:0x111111});
  const rimM=new THREE.MeshLambertMaterial({color:0xaaaaaa,emissive:0x222222});
  const hlM=new THREE.MeshLambertMaterial({color:0xffffee,emissive:0x886633,emissiveIntensity:.5});
  const tlM=new THREE.MeshLambertMaterial({color:0xff1100,emissive:0x660000,emissiveIntensity:.5});
  const underM=new THREE.MeshLambertMaterial({color:0x222222});

  // גוף תחתון
  const low=new THREE.Mesh(new THREE.BoxGeometry(1.92,.52,4.1),bodyM);low.position.y=.56;g.add(low);
  // קבינה
  const cab=new THREE.Mesh(new THREE.BoxGeometry(1.68,.58,2.2),bodyM);cab.position.set(0,1.06,-.08);g.add(cab);
  // גג
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.58,.08,2.0),darkBodyM);roof.position.set(0,1.36,-.08);g.add(roof);
  // הוד
  const hood=new THREE.Mesh(new THREE.BoxGeometry(1.9,.14,1.2),darkBodyM);hood.position.set(0,.86,1.35);g.add(hood);
  // תא מטען
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(1.9,.18,.8),darkBodyM);trunk.position.set(0,.86,-1.7);g.add(trunk);
  // מגן קדמי
  const bumperF=new THREE.Mesh(new THREE.BoxGeometry(1.92,.25,.15),underM);bumperF.position.set(0,.42,2.09);g.add(bumperF);
  const bumperR=new THREE.Mesh(new THREE.BoxGeometry(1.92,.25,.15),underM);bumperR.position.set(0,.42,-2.09);g.add(bumperR);

  // שמשות
  const wsF=new THREE.Mesh(new THREE.BoxGeometry(1.5,.5,.06),glassM);wsF.position.set(0,1.1,.98);wsF.rotation.x=.28;g.add(wsF);
  const wsR=new THREE.Mesh(new THREE.BoxGeometry(1.5,.5,.06),glassM);wsR.position.set(0,1.1,-1.2);wsR.rotation.x=-.28;g.add(wsR);
  // חלונות צד
  [-1,1].forEach(sd=>{
    const sw=new THREE.Mesh(new THREE.BoxGeometry(.06,.38,.9),glassM);sw.position.set(sd*.84+sd*.001,1.1,-.08);g.add(sw);
  });

  // גלגלים — עם groups לאנימציית סיבוב
  const wheels=[];
  [[-.9,.32,1.4],[.9,.32,1.4],[-.9,.32,-1.4],[.9,.32,-1.4]].forEach(([wx,wy,wz],wi)=>{
    const wg=new THREE.Group();wg.position.set(wx,wy,wz);g.add(wg);
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.2,14),tireM);wh.rotation.z=Math.PI/2;wg.add(wh);
    // חישוקים — spoke אמיתיים
    for(let s=0;s<5;s++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.06,.22,.06),rimM);sp.rotation.z=s/5*Math.PI*2;sp.position.set(0,0,0);sp.position.y=0;wg.add(sp);}
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.22,8),rimM);cap.rotation.z=Math.PI/2;wg.add(cap);
    wheels.push(wg);
  });
  g._wheels=wheels;

  // פנסים קדמיים עם PointLight
  const hlL=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.06),hlM);hlL.position.set(-.55,.72,2.05);g.add(hlL);
  const hlR=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.06),hlM);hlR.position.set(.55,.72,2.05);g.add(hlR);
  // פנסי רכב — emissive בלבד (PointLight לכל מכונית יקר מדי)

  // פנסים אחוריים
  const tlL=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.06),tlM);tlL.position.set(-.55,.72,-2.05);g.add(tlL);
  const tlR=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.06),tlM);tlR.position.set(.55,.72,-2.05);g.add(tlR);

  // שלט לוחית רישוי קדמי (תוספת אסתטית)
  const plate=new THREE.Mesh(new THREE.BoxGeometry(.6,.18,.05),new THREE.MeshLambertMaterial({color:0xeeeebb}));
  plate.position.set(0,.5,2.07);g.add(plate);

  return g;
}

// ══════════════════════════════════════════════════════════════
// מערכת מכוניות עם waypoints — כיכר אמיתית + עקיפת בניינים
// כיכר הכדורים: cx=40, cz=0, רדיוס טבעת נסיעה ≈ 15
// כיוון הסתובבות בכיכר: נגד כיוון השעון (ימין ➜ כיכר ➜ שמאל)
// ══════════════════════════════════════════════════════════════

// עוזר: חישוב אורך מסלול waypoints
function _routeLength(pts){
  let len=0;
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0], dz=pts[i][1]-pts[i-1][1];
    len+=Math.sqrt(dx*dx+dz*dz);
  }
  return len;
}

// נקודות על טבעת הכיכר לפי זווית (cx=40, cz=0, r=15)
function _rkPt(angleDeg){ const a=angleDeg*Math.PI/180; return [40+Math.cos(a)*15, Math.sin(a)*15]; }

// מסלולים עם waypoints מלאים
// THREE.js coords: +x=מזרח, +z=דרום
// CCW בכיכר (ממבט מעל) = מזרח->צפון->מערב->דרום = זוויות יורדות (0->270->180->90->0)
// כיכר: cx=40, cz=0, רדיוס טבעת = 15
// כניסות/יציאות: הרצל z=±3.5, הדקל x=43/37
const _CAR_ROUTES=[

  // ═══ רחוב הרצל — נסיעה מזרחה (z=+3.5) ═══
  // בא מ-x=-145, נכנס לכיכר מהמערב (~150°), מקיף CCW: 150->90->30, יוצא מזרחה
  {loop:true, pts:[
    [-145, 3.5],
    [22,   3.5],          // לפני כניסה לכיכר
    ...[150,120,90,60,30].map(_rkPt), // CCW: דרום-מערב -> דרום -> דרום-מזרח
    [58,   3.5],          // יציאה לרחוב
    [145,  3.5],
  ]},

  // ═══ רחוב הרצל — נסיעה מערבה (z=-3.5) ═══
  // בא מ-x=+145, נכנס לכיכר מהמזרח (~330°), מקיף CCW: 330->270->210, יוצא מערבה
  {loop:true, pts:[
    [145,  -3.5],
    [58,   -3.5],         // לפני כניסה
    ...[330,270,210].map(_rkPt), // CCW: צפון-מזרח -> צפון -> צפון-מערב
    [22,   -3.5],         // יציאה לרחוב
    [-145, -3.5],
  ]},

  // ═══ רחוב הדקל (x=46) — נסיעה דרומה ═══
  // בא מ-z=-130 (צפון), נכנס לכיכר מהצפון (~270°), מקיף CCW: 270->210->150->90, יוצא דרומה
  {loop:true, pts:[
    [46,  -130],
    [46,   -18],          // לפני כניסה מהצפון
    ...[270,210,150,90].map(_rkPt), // CCW: צפון -> מערב -> דרום-מערב -> דרום
    [46,    18],          // יציאה דרומה
    [46,   130],
  ]},

  // ═══ רחוב הדקל (x=34) — נסיעה צפונה ═══
  // בא מ-z=+130 (דרום), נכנס לכיכר מהדרום (~90°), מקיף CCW: 90->30->330->270, יוצא צפונה
  {loop:true, pts:[
    [34,   130],
    [34,    18],          // לפני כניסה מהדרום
    ...[90,30,330,270].map(_rkPt),  // CCW: דרום -> דרום-מזרח -> צפון-מזרח -> צפון
    [34,   -18],          // יציאה צפונה
    [34,  -130],
  ]},

  // ═══ שדרות ירושלים — צפון→דרום (לא עוברות ליד הכיכר) ═══
  {loop:true, pts:[[3.5,-145],[3.5,145]]},

  // ═══ שדרות ירושלים — דרום→צפון ═══
  {loop:true, pts:[[-3.5,145],[-3.5,-145]]},

  // ═══ רחוב הגפן — צפון→דרום ═══
  {loop:true, pts:[[-37,-130],[-37,130]]},

  // ═══ רחוב הגפן — דרום→צפון ═══
  {loop:true, pts:[[-43,130],[-43,-130]]},

  // ═══ רחוב הרצל פס נוסף מזרחה (z=+6.5) ═══
  {loop:true, pts:[
    [-145, 6.5],
    [21,   6.5],
    ...[150,120,90,60,30].map(_rkPt),
    [59,   6.5],
    [145,  6.5],
  ]},

  // ═══ רחוב הרצל פס נוסף מערבה (z=-6.5) ═══
  {loop:true, pts:[
    [145,  -6.5],
    [59,   -6.5],
    ...[330,270,210].map(_rkPt),
    [21,   -6.5],
    [-145, -6.5],
  ]},
];

// חישוב מראש אורכי מסלולים
_CAR_ROUTES.forEach(r=>{ r._len=_routeLength(r.pts); });

// מיקום על מסלול לפי t∈[0,1)
function _routePos(pts, t){
  const totalLen=_routeLength(pts);
  let target=((t%1)+1)%1 * totalLen;
  let acc=0;
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0], dz=pts[i][1]-pts[i-1][1];
    const seg=Math.sqrt(dx*dx+dz*dz);
    if(acc+seg>=target){
      const frac=(target-acc)/seg;
      return {
        x: pts[i-1][0]+dx*frac,
        z: pts[i-1][1]+dz*frac,
        ang: Math.atan2(dx, dz),
      };
    }
    acc+=seg;
  }
  return {x:pts[pts.length-1][0],z:pts[pts.length-1][1],ang:0};
}

// מעברי חציה — מיקומים קבועים
const _CROSSWALKS=[
  {x:0,   z:0,   axis:'z', hw:8},  // הרצל × ירושלים
  {x:0,   z:0,   axis:'x', hw:8},
  {x:40,  z:0,   axis:'z', hw:8},  // הרצל × הדקל
  {x:40,  z:0,   axis:'x', hw:8},
  {x:-40, z:0,   axis:'z', hw:8},  // הרצל × הגפן
  {x:-40, z:0,   axis:'x', hw:8},
  {x:0,   z:50,  axis:'z', hw:7},  // הרצל × וייצמן
  {x:0,   z:-50, axis:'z', hw:7},
];

// האם ישות נמצאת בתוך כביש (אם כן — מכוניות צריכות לעצור)
function _isOnRoad(x, z){
  if(Math.abs(z)<8.5)   return true; // הרצל
  if(Math.abs(x)<8.5)   return true; // ירושלים
  if(Math.abs(x-40)<8.5) return true; // הדקל
  if(Math.abs(x+40)<8.5) return true; // הגפן
  if(Math.abs(z-50)<7||Math.abs(z+50)<7) return true; // וייצמן / בן גוריון
  // כיכר הכדורים — מרכז (40,0) רדיוס 22
  if(d2(x,z,40,0)<22) return true;
  return false;
}

function getGroundY(x,z){
  // כביש — top surface = 0.12
  if(_isOnRoad(x,z)) return 0.12;
  // מדרכות — top surface = 0.16 (swW=2.8, אז גבול מחוץ לכביש עד +2.8)
  if(Math.abs(z)>8.5&&Math.abs(z)<11.3) return 0.16;   // הרצל
  if(Math.abs(x)>8.5&&Math.abs(x)<11.3) return 0.16;   // ירושלים
  if(Math.abs(x+40)>8.5&&Math.abs(x+40)<11.3) return 0.16; // הגפן
  if(Math.abs(x-40)>8.5&&Math.abs(x-40)<11.3) return 0.16; // הדקל
  if(Math.abs(z-50)>7&&Math.abs(z-50)<9.8) return 0.16; // וייצמן
  if(Math.abs(z+50)>7&&Math.abs(z+50)<9.8) return 0.16; // בן גוריון
  return 0; // דשא
}

// בדיקה: האם ישות חוסמת חרטום מכונית (4 יחידות קדימה, רוחב 2)
function _isBlockingCar(car, ex, ez){
  const fwdX=car.x+Math.sin(car.ang)*4;
  const fwdZ=car.z+Math.cos(car.ang)*4;
  return d2(fwdX,fwdZ,ex,ez)<3.5;
}

// מדרכות — פסי הליכה במקביל לרחובות
const _SIDEWALKS=[
  // הרצל — מפוצל סביב כיכר הכדורים (x=40±22) ו-ירושלים (x=0±9)
  {x0:-130,z0:-13,x1:-9,  z1:-13}, // הרצל דרום מערב
  {x0:   9,z0:-13,x1: 18, z1:-13}, // הרצל דרום בין ירושלים לכיכר
  {x0:  62,z0:-13,x1:130, z1:-13}, // הרצל דרום מזרח לכיכר
  {x0:-130,z0: 13,x1:-9,  z1: 13}, // הרצל צפון מערב
  {x0:   9,z0: 13,x1: 18, z1: 13}, // הרצל צפון בין ירושלים לכיכר
  {x0:  62,z0: 13,x1:130, z1: 13}, // הרצל צפון מזרח לכיכר
  // ירושלים — מפוצל סביב הרצל (z=0±8.5) ו-וייצמן (z=50±7) ו-בן גוריון (z=-50±7)
  {x0: 11,z0:-120,x1: 11,z1:-57},  // ירושלים מזרח דרום
  {x0: 11,z0: -43,x1: 11,z1: -9},  // ירושלים מזרח בין דרום להרצל
  {x0: 11,z0:   9,x1: 11,z1: 43},  // ירושלים מזרח בין הרצל לצפון
  {x0: 11,z0:  57,x1: 11,z1:120},  // ירושלים מזרח צפון
  {x0: -11,z0:-120,x1:-11,z1:-57},
  {x0: -11,z0: -43,x1:-11,z1: -9},
  {x0: -11,z0:   9,x1:-11,z1: 43},
  {x0: -11,z0:  57,x1:-11,z1:120},
  // הגפן (x=-40) — מדרכה מזרחית
  {x0:-31,z0:-120,x1:-31,z1:-57},
  {x0:-31,z0: -43,x1:-31,z1: -9},
  {x0:-31,z0:   9,x1:-31,z1: 43},
  {x0:-31,z0:  57,x1:-31,z1:120},
  // הדקל (x=40) — מדרכה מערבית (לא הכיכר)
  {x0: 31,z0:-120,x1: 31,z1:-57},
  {x0: 31,z0: -43,x1: 31,z1: -9},
  {x0: 31,z0:   9,x1: 31,z1: 43},
  {x0: 31,z0:  57,x1: 31,z1:120},
];

function _randomSidewalkPt(){
  // מדרכות — נקודות בטוחות בלבד, לא בצמתים עם כבישים ניצבים
  for(let attempt=0;attempt<12;attempt++){
    const sw=_SIDEWALKS[Math.floor(Math.random()*_SIDEWALKS.length)];
    const t=Math.random();
    const x=sw.x0+(sw.x1-sw.x0)*t;
    const z=sw.z0+(sw.z1-sw.z0)*t;
    // דחה נקודות על כביש (צמתים) ובתוך בניינים
    if(!_isOnRoad(x,z)&&!isInBuilding(x,z,1.5)) return [x,z];
  }
  // fallback בטוח
  return [-30,13.4];
}

function _nearestSidewalkPt(nx,nz){
  let best=null,bestD=9999;
  _SIDEWALKS.forEach(sw=>{
    const dx=sw.x1-sw.x0,dz=sw.z1-sw.z0,len2=dx*dx+dz*dz;
    if(len2<0.01)return;
    const t=Math.max(0,Math.min(1,((nx-sw.x0)*dx+(nz-sw.z0)*dz)/len2));
    const cx=sw.x0+t*dx,cz=sw.z0+t*dz;
    const d=d2(nx,nz,cx,cz);
    if(d<bestD){bestD=d;best=[cx,cz];}
  });
  return best||[nx,nz];
}

let _hornCooldown=0;
function buildCars(){
  _CAR_ROUTES.forEach((route,ri)=>{
    // סנן waypoints שנמצאים בתוך בניינים מראש
    const safePts=route.pts.filter(([px,pz])=>{
      if(typeof blds==='undefined') return true;
      return !blds.some(b=>Math.abs(px-b.x)<b.w/2+0.6&&Math.abs(pz-b.z)<b.d/2+0.6);
    });
    if(safePts.length<2) return;
    const safeRoute={...route, pts:safePts, _len:_routeLength(safePts)};

    const nCars=1+(ri<6?1:0);
    for(let ci=0;ci<nCars;ci++){
      const car=mkCar(_CAR_COLS[(ri*2+ci)%_CAR_COLS.length]);
      const t0=((Math.random()+ci/nCars)%1);
      const pos=_routePos(safeRoute.pts, t0);
      car.position.set(pos.x,0,pos.z);
      car.rotation.y=pos.ang;
      scene.add(car);
      const spd=7+Math.random()*5;
      G.cars.push({mesh:car,route:safeRoute,t:t0,spd,x:pos.x,z:pos.z,ang:pos.ang,wheelRot:0,stopped:false});
    }
  });

  // ── מגרשי חנייה מוגדרים ──
  // כל מגרש: [מרכז x, מרכז z, כיוון 'x'/'z', מספר מקומות]
  const _LOTS=[
    // מגרש 1 — ממזרח לשוק (SW), כניסה מהגפן
    {cx:-58, cz:38, axis:'z', n:6},
    // מגרש 2 — צפון מרכז, בין ירושלים להדקל
    {cx:20,  cz:-38, axis:'x', n:7},
    // מגרש 3 — דרום, גני אביב
    {cx:-20, cz:100, axis:'x', n:5},
  ];

  _LOTS.forEach(({cx,cz,axis,n},li)=>{
    const slotW=3.2, slotD=5.5, gap=0.4;
    const totalW=n*(slotW+gap)-gap;
    // אספלט מגרש
    const lotFloor=new THREE.Mesh(
      new THREE.BoxGeometry(axis==='x'?totalW+2:slotD+2, 0.08, axis==='x'?slotD+2:totalW+2),
      new THREE.MeshLambertMaterial({color:0x242420})
    );
    lotFloor.position.set(cx,0.04,cz);
    lotFloor.receiveShadow=true;
    scene.add(lotFloor);

    for(let i=0;i<n;i++){
      const offset=(i-(n-1)/2)*(slotW+gap);
      const sx=axis==='x'? cx+offset : cx;
      const sz=axis==='x'? cz         : cz+offset;

      // קו חנייה לבן
      const lineW=axis==='x'?slotW:0.1, lineD=axis==='x'?0.1:slotD;
      const line=new THREE.Mesh(
        new THREE.BoxGeometry(lineW, 0.02, lineD),
        new THREE.MeshLambertMaterial({color:0xffffff})
      );
      line.position.set(
        axis==='x'? sx+slotW/2+gap/2 : sx-slotD/2-0.05,
        0.09,
        axis==='x'? sz               : sz+slotW/2+gap/2
      );
      scene.add(line);

      // מכונית חונה (בהסתברות 75%)
      if(Math.random()<0.75&&!isInBuilding(sx,sz,1.5)){
        const car=mkCar(_CAR_COLS[((li*n+i)*3+5)%_CAR_COLS.length]);
        car.position.set(sx,0,sz);
        car.rotation.y=axis==='x'?0:Math.PI/2;
        car._parked=true;
        scene.add(car);
      }
    }

    // שלט חנייה פשוט
    const signPole=new THREE.Mesh(
      new THREE.CylinderGeometry(0.05,0.05,2.2,5),
      new THREE.MeshLambertMaterial({color:0x555560})
    );
    signPole.position.set(cx+(axis==='x'?totalW/2+1.2:slotD/2+1.2), 1.1, cz);
    scene.add(signPole);
    const signBoard=new THREE.Mesh(
      new THREE.BoxGeometry(0.8,0.5,0.07),
      new THREE.MeshLambertMaterial({color:0x1144aa})
    );
    signBoard.position.set(cx+(axis==='x'?totalW/2+1.2:slotD/2+1.2), 2.5, cz);
    scene.add(signBoard);
  });
}

function updCars(dt){
  const px=PB.position.x,pz=PB.position.z;
  const isNight=G.dayTime>0.72||G.dayTime<0.27;
  _hornCooldown=Math.max(0,_hornCooldown-dt);

  G.cars.forEach(c=>{
    const routeLen=c.route._len||290;

    // בדוק חסימה — שחקן או NPC בחרטום
    let mustStop=_isBlockingCar(c,px,pz);
    if(!mustStop && G.humanNPCs){
      for(const n of G.humanNPCs){
        if(n.mesh.visible && _isBlockingCar(c,n.x,n.z)){mustStop=true;break;}
      }
    }
    // בדוק חסימה מול מכוניות אחרות — עצור במרחק סביר (6 יחידות)
    if(!mustStop){
      const fwdX=c.x+Math.sin(c.ang)*5.5;
      const fwdZ=c.z+Math.cos(c.ang)*5.5;
      for(const other of G.cars){
        if(other===c) continue;
        if(d2(fwdX,fwdZ,other.x,other.z)<3.8){mustStop=true;break;}
      }
    }
    c.stopped=mustStop;

    if(!mustStop){
      c.t+=dt*c.spd/routeLen;
      if(c.t>=1) c.t-=1;
    } else {
      // קרנית — פעם אחת, רק כשקרוב לשחקן
      if(_hornCooldown<=0 && d2(c.x,c.z,px,pz)<8){
        _hornCooldown=8+Math.random()*6; // הרבה יותר נדיר
        try{
          const ac=gAC();
          // צפצוף אחד עדין — לא כפול
          const o=ac.createOscillator(),g2=ac.createGain();
          o.connect(g2);g2.connect(ac.destination);
          o.type='sine';o.frequency.value=280+Math.random()*20;
          g2.gain.setValueAtTime(.055,ac.currentTime);
          g2.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);
          o.start();o.stop(ac.currentTime+.18);
        }catch(e){}
        // NPC קרוב — צעד אחורה מבועת
        if(G.humanNPCs){G.humanNPCs.forEach(n=>{
          if(d2(n.x,n.z,px,pz)<8&&n.state!=='flee'){
            const ang=Math.atan2(n.x-c.x,n.z-c.z);
            n.targetX=Math.max(-130,Math.min(130,n.x+Math.sin(ang)*3));
            n.targetZ=Math.max(-130,Math.min(130,n.z+Math.cos(ang)*3));
            n.waitT=0;n.state='walk';
          }
        });}
      }
    }

    const pos=_routePos(c.route.pts, c.t);
    c.x=pos.x; c.z=pos.z;
    c.mesh.position.x=c.x; c.mesh.position.z=c.z;

    // סיבוב חלק
    const angDiff=pos.ang-c.ang;
    const wrapped=((angDiff+Math.PI)%(Math.PI*2))-Math.PI;
    c.ang+=wrapped*Math.min(1,dt*8);
    c.mesh.rotation.y=c.ang;

    // גלגלים — רק כשנוסע
    if(!mustStop) c.wheelRot+=c.spd*dt*1.2;
    if(c.mesh._wheels) c.mesh._wheels.forEach((w,i)=>{ w.rotation.x=i<2?c.wheelRot:-c.wheelRot; });

    // פנסים
    // פנסי מכונית — emissive מנוהל בנפרד (אין PointLight)
  });
}

// ════════════════════════════════════════════════
// ██ קולקטיבלס נסתרים ██
// ════════════════════════════════════════════════
const _COLL_TYPES=[
  {name:'שרשרת זהב',col:0xf5c518,xp:18,coins:25,ico:'📿'},
  {name:'עיתון ישן',col:0xeeddaa,xp:8,coins:5,ico:'📰'},
  {name:'כדור כחול',col:0x3388ff,xp:12,coins:10,ico:'⚽'},
  {name:'פחית קולה',col:0xcc3322,xp:6,coins:4,ico:'🥫'},
  {name:'ספר מוסתר',col:0x2255aa,xp:22,coins:18,ico:'📚'},
  {name:'מפתח ישן',col:0xaaaaaa,xp:15,coins:12,ico:'🔑'},
];
function buildCollectibles(){
  const spots=[
    [15,35],[62,-20],[25,-100],[-30,-80],[88,50],[-55,-30],
    [70,108],[-15,130],[45,-55],[-90,-88],[108,20],[-108,60],
  ].filter(([x,z])=>!isInBuilding(x,z,2));
  const total=Math.min(12,spots.length);
  document.getElementById('coll-total').textContent=total;
  spots.slice(0,total).forEach(([x,z],i)=>{
    const type=_COLL_TYPES[i%_COLL_TYPES.length];
    const g=new THREE.Group();
    // כדור זוהר
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.2,8,8),
      new THREE.MeshLambertMaterial({color:type.col,emissive:new THREE.Color(type.col).multiplyScalar(.35),transparent:true,opacity:.88}));
    g.add(ball);
    // טבעת מסתובבת
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,6,18),
      new THREE.MeshLambertMaterial({color:type.col,emissive:new THREE.Color(type.col).multiplyScalar(.3)}));
    ring.rotation.x=Math.PI/2;g.add(ring);
    // ניצוץ פנימי
    const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),
      new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x888888}));
    g.add(spark);
    g.position.set(x,.55,z);
    scene.add(g);
    G.collectibles.push({mesh:g,ring,spark,x,z,type,done:false,t:Math.random()*Math.PI*2});
  });
  if(G.hud) document.getElementById('coll-hud').style.display='block';
}
function updCollectibles(dt){
  const t=Date.now()*.001;
  G.collectibles.forEach(c=>{
    if(c.done)return;
    c.t+=dt;
    c.mesh.position.y=.55+Math.sin(c.t*2)*.12;
    c.mesh.rotation.y+=dt*.8;
    c.ring.rotation.z+=dt*1.5;
    c.spark.rotation.x+=dt*2;
  });
}

// ════════════════════════════════════════════════
// ██ כיבוש בניינים ██
// ════════════════════════════════════════════════
const _BLD_CAP_SPOTS=[
  {x:-70,z:-26,name:'מחסן הגשר',r:5.5},
  {x:54,z:-26,name:'מסעדת הדקל',r:5},
  {x:-8,z:23,name:'בניין השוק',r:5},
  {x:22,z:23,name:'חנות הכלים',r:5},
  {x:-40,z:-22,name:'מחסן גני הגפן',r:5.5},
  {x:40,z:32,name:'עסק הדקל הדרומי',r:5},
];
function buildBldCapture(){
  _BLD_CAP_SPOTS.forEach(s=>{
    const polM=new THREE.MeshLambertMaterial({color:0x777770});
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.2,6),polM);
    // מצא גובה הבניין באזור
    const nearBld=blds.find(b=>Math.abs(b.x-s.x)<b.w/2+2&&Math.abs(b.z-s.z)<b.d/2+2);
    const bldH=nearBld?8:7;
    pole.position.set(s.x,bldH+1.1,s.z);scene.add(pole);
    const flag=new THREE.Mesh(new THREE.BoxGeometry(.85,.55,.05),
      new THREE.MeshLambertMaterial({color:0x9b59b6}));
    flag.position.set(s.x+.43,bldH+2.15,s.z);scene.add(flag);
    // טבעת כיבוש
    const ring=new THREE.Mesh(new THREE.TorusGeometry(s.r,.14,6,24),
      new THREE.MeshLambertMaterial({color:0x9b59b6,transparent:true,opacity:.45}));
    ring.rotation.x=Math.PI/2;ring.position.set(s.x,.12,s.z);scene.add(ring);
    G.capturedBlds.push({...s,flag,ring,pole,bldH,cap:false,capT:0,maxCapT:4});
  });
}
let _capProgEl,_capFillEl,_showingCapProg=false;
function updBldCapture(dt){
  if(G.mission<2)return;
  if(!_capProgEl){_capProgEl=document.getElementById('cap-prog');_capFillEl=document.getElementById('cap-prog-fill');}
  const px=PB.position.x,pz=PB.position.z;
  let anyCapturing=false;
  G.capturedBlds.forEach(b=>{
    if(b.cap){
      b.flag.material.color.setHex(0xf5c518);
      b.ring.material.color.setHex(0xf5c518);
      b.ring.material.opacity=.22;
      return;
    }
    const dist=d2sq(px,pz,b.x,b.z); // שדרוג: d2sq במקום d2 — ללא sqrt
    if(dist<b.r*b.r){ // השווה r² במקום r
      b.capT=Math.min(b.maxCapT,b.capT+dt);
      const pct=b.capT/b.maxCapT;
      b.ring.material.color.setHex(0xf5c518);
      b.ring.material.opacity=.35+pct*.4;
      b.ring.rotation.y+=dt*.8;
      if(_capProgEl){
        _capProgEl.style.display='block';
        _capProgEl.childNodes[0].textContent=`🏠 "${b.name}" — כיבוש...`;
        if(_capFillEl)_capFillEl.style.width=(pct*100)+'%';
      }
      anyCapturing=true;
      if(b.capT>=b.maxCapT){
        b.cap=true;
        b.flag.material.color.setHex(0xf5c518);
        sCapture();haptic([50,25,50]);
        addXP(35);G.coins+=30;updCoins();G.score+=80;
        showN(`🏠 "${b.name}" נכבש!\n+35 XP +30 💰`);
        spawnPfx(b.x,blds.find(bl=>Math.abs(bl.x-b.x)<bl.w/2+2)?8:5,b.z,0xf5c518,12);
      }
    } else {
      b.capT=Math.max(0,b.capT-dt*.5);
      b.ring.material.color.setHex(b.capT>0?0xf5c518:0x9b59b6);
      b.ring.material.opacity=.35+(b.capT/b.maxCapT)*.3;
    }
  });
  if(!anyCapturing&&_capProgEl)_capProgEl.style.display='none';
}

// ════════════════════════════════════════════════
// ██ קאטסצין מונפש ██
// ════════════════════════════════════════════════
let _cutTypeInterval=null,_currentCutTx='',_currentCutDone=false;
const _CUT_PORTRAITS={
  intro:'🐕',ch2:'🐾',ch3:'🏴',boss:'👹',win:'🏆',
  ch2_open:'🐕‍🦺',ch2_stealth:'⚡',ch2_momo:'👑',ch2_boss:'🦮',win2:'🐕‍🦺',
  ch3_open:'😰',bella_dead:'💔',fishka_reveal:'🔪',kikar_battle:'⚔️',
  fishka_caught:'😤',guards_arrive:'🚨',ch4_open:'🌙',ch4_boss:'🏛️',
  reks_choice:'💙',final_broadcast:'📡',
  // ── פרק ה׳ ──
  ch5_open:'🌅',reks_joins:'🫡',new_threat:'⚠️',titan_reveal:'💀',
  ch5_boss:'🔥',ch5_finale:'🏙️',true_ending:'🐾',
  // ── פרק ו׳ ──
  ch6_open:'💔',ch6_reks_dead:'😶',ch6_shadow_seen:'👁️',
  ch6_shadow_zippo:'⚡',ch6_lab_found:'🔬',ch6_recording:'🎙️',
  ch6_shadow_fight:'⚔️',ch6_factory:'😱',ch6_fire:'🔥',ch6_ending:'🌆',
};
function skipTypewriter(){
  if(_cutTypeInterval){clearInterval(_cutTypeInterval);_cutTypeInterval=null;}
  document.getElementById('cut-tx').textContent=_currentCutTx;
  _currentCutDone=true;
}

// ════════════════════════════════════════════════
// ██ פרק ה׳ — שחר ██
// ════════════════════════════════════════════════

// ── רקס כמלווה (ally NPC) ──
function _spawnReksAlly(){
  if(G._reksAlly)return;
  const r=mkCommander(1.05);
  r.position.set(42,0,2);
  scene.add(r);
  // הילה ירוקה מעליו
  const ind=new THREE.Mesh(
    new THREE.SphereGeometry(.28,6,6),
    new THREE.MeshLambertMaterial({color:0x2ecc71,emissive:0x1a9955})
  );
  ind.position.set(0,2.6,0);
  r.add(ind);
  G._reksAlly={mesh:r,ind,x:42,z:2};
  // אנימציית pulse לנורית
  G._reksAlly._t=0;
}

// ── גיסות טיטאן — 6 כלבים חזקים ──
function _spawnTitanScouts(){
  if(G._titanScoutsSpawned)return;
  G._titanScoutsSpawned=true;
  // מיקומים ליד בריכת הנחת (cx=-120, cz=130)
  // הבריכה נמצאת ב-x=-120,z=130, רוחב 30x30 (x:-135..-105, z:115..145)
  // הסקאוטים נפרסים מסביב לבריכה — לא בתוכה
  const spots=[
    [-100,118],[-100,130],[-100,142],  // מזרח לבריכה
    [-140,118],[-140,130],[-140,142],  // מערב לבריכה
  ];
  spots.forEach(([x,z])=>{
    const m=mkTitanScout(1.15);
    m.position.set(x,0,z);
    m.visible=true;
    scene.add(m);
    const barBg=new THREE.Mesh(new THREE.BoxGeometry(1.8,.16,.1),new THREE.MeshLambertMaterial({color:0x222222}));
    barBg.position.set(0,2.6,0);m.add(barBg);
    const barFg=new THREE.Mesh(new THREE.BoxGeometry(1.8,.14,.12),new THREE.MeshLambertMaterial({color:0xcc4400}));
    barFg.position.set(0,2.6,.01);m.add(barFg);
    const det=new THREE.Mesh(new THREE.SphereGeometry(.28,6,6),new THREE.MeshLambertMaterial({color:0x554400,emissive:0x221a00}));
    det.position.set(0,3.1,0);m.add(det);
    G.enemies.push({
      mesh:m,bar:barFg,
      x,z,homeX:x,homeZ:z,
      hp:80,mhp:80,
      spd:5.5,atk:2.5,atkT:1.2,
      alert:22,
      state:'patrol',patAng:Math.random()*Math.PI*2,patT:0,
      searchT:0,lastSeenX:0,lastSeenZ:0,
      _titan:true,
    });
  });
  // ── ספאון טיטאן הבוס ליד הבריכה — קפוא עד שהסקאוטים יובסו ──
  _spawnTitanBoss(true);
}

// ── עזר: קוץ שמופנה החוצה מגליל (ציר Y) בזווית a ──
function _radialSpike(R,colY,colZ,a,spikeLen,spikeR,mat,g){
  const spk=new THREE.Mesh(new THREE.ConeGeometry(spikeR,spikeLen,5),mat);
  spk.position.set(Math.cos(a)*R,colY,colZ+Math.sin(a)*R);
  // Default cone tip=+Y. rotation.x=PI/2 → tip becomes +Z,
  // rotation.y=PI/2-a → tip points in direction (cos a, 0, sin a)
  spk.rotation.x=Math.PI/2;
  spk.rotation.y=Math.PI/2-a;
  g.add(spk);
}


// ── מודל טיטאן — גרסה מהירה למובייל (~18 meshes) ──
function mkTitan(sz){
  const g=new THREE.Group();
  // ── חומרים ──
  const fur  =new THREE.MeshLambertMaterial({color:0x0c0906,emissive:0x050302});
  const muscle=new THREE.MeshLambertMaterial({color:0x180e06,emissive:0x060200});
  const sTan =new THREE.MeshLambertMaterial({color:0x3c1a08,emissive:0x0e0400});   // לחיים
  const sRed =new THREE.MeshLambertMaterial({color:0xa02020,emissive:0x500a0a});   // צלקות אדומות-חיות
  const eyOuter=new THREE.MeshLambertMaterial({color:0x100000,emissive:0x060000});
  const eyIris =new THREE.MeshLambertMaterial({color:0xff5500,emissive:0xff2200}); // כתום-אש
  const eyPup  =new THREE.MeshLambertMaterial({color:0x000000});
  const eyHl   =new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xcccccc});
  const ns    =new THREE.MeshLambertMaterial({color:0x060202});
  const fangM =new THREE.MeshLambertMaterial({color:0xf0e0b0,emissive:0x1c1808}); // שנהב
  const bloodM=new THREE.MeshLambertMaterial({color:0xc06060,emissive:0x3a1010}); // צבע דם בקצה ניב
  const tongue=new THREE.MeshLambertMaterial({color:0x8a1c1c,emissive:0x280808});
  const armorM=new THREE.MeshLambertMaterial({color:0x121008,emissive:0x060500});
  const spikeM=new THREE.MeshLambertMaterial({color:0x302818,emissive:0x0c0a06});
  const chainM=new THREE.MeshLambertMaterial({color:0x2c2c2c,emissive:0x0e0e0e});

  // ══════════════════════════════════
  //  גוף
  // ══════════════════════════════════
  const body=new THREE.Mesh(new THREE.BoxGeometry(.86*sz,.64*sz,1.76*sz),fur);
  body.position.y=.92*sz;g.add(body);

  // חזה בולט
  const chest=new THREE.Mesh(new THREE.BoxGeometry(.82*sz,.62*sz,.62*sz),fur);
  chest.position.set(0,.92*sz,.9*sz);g.add(chest);

  // שרירי ירכיים בצדדים
  [-1,1].forEach(s=>{
    const fl=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.54*sz,.92*sz),muscle);
    fl.position.set(s*.52*sz,.96*sz,.1*sz);g.add(fl);
  });

  // ══════════════════════════════════
  //  שריון גב — 3 לוחות עם קוצים מעליהם
  // ══════════════════════════════════
  [-0.42,-0.04,0.38].forEach(oz=>{
    const plateY=1.28*sz, plateZ=oz*sz;
    const plate=new THREE.Mesh(new THREE.BoxGeometry(.92*sz,.14*sz,.38*sz),armorM);
    plate.position.set(0,plateY,plateZ);g.add(plate);
    // שפה מורמת
    [-1,1].forEach(sx=>{
      const ridge=new THREE.Mesh(new THREE.BoxGeometry(.07*sz,.1*sz,.34*sz),spikeM);
      ridge.position.set(sx*.49*sz,plateY+.11*sz,plateZ);g.add(ridge);
    });
    // קוצים — tip of cone is UP, base is DOWN (no rotation needed — default)
    [-1,0,1].forEach(spx=>{
      const spk=new THREE.Mesh(new THREE.ConeGeometry(.07*sz,.34*sz,5),spikeM);
      // מרכז הקונוס ב־plateY+.07 (חצי גובה לוח) + .17 (חצי גובה קוץ)
      spk.position.set(spx*.27*sz, plateY+.24*sz, plateZ);
      g.add(spk); // tip points in default +Y ✓
    });
  });

  // ══════════════════════════════════
  //  צוואר שרירי
  // ══════════════════════════════════
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.33*sz,.43*sz,.54*sz,10),fur);
  nk.position.set(0,1.28*sz,.84*sz);nk.rotation.x=-.35;g.add(nk);
  // כתפיים
  [-1,1].forEach(s=>{
    const sh=new THREE.Mesh(new THREE.SphereGeometry(.32*sz,7,5),fur);
    sh.scale.set(1,.74,1.22);sh.position.set(s*.52*sz,1.14*sz,.46*sz);g.add(sh);
  });

  // ══════════════════════════════════
  //  ראש — תנוחת תקיפה (נמוך קדימה)
  // ══════════════════════════════════
  const hG=new THREE.Group();
  hG.position.set(0,1.62*sz,1.26*sz);hG.rotation.x=.28;g.add(hG);

  // גולגולת רחבה ומרובעת
  const skull=new THREE.Mesh(new THREE.BoxGeometry(.94*sz,.72*sz,.82*sz),fur);hG.add(skull);

  // מצח כבד
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.98*sz,.22*sz,.36*sz),fur);
  brow.position.set(0,.38*sz,.36*sz);hG.add(brow);

  // קמטי עצבנות מתחת למצח (V-shape)
  [-1,1].forEach(s=>{
    const wr=new THREE.Mesh(new THREE.BoxGeometry(.09*sz,.3*sz,.09*sz),sTan);
    wr.position.set(s*.19*sz,.24*sz,.5*sz);wr.rotation.z=s*.65;hG.add(wr);
  });

  // לחיים שריריות בולטות
  [-1,1].forEach(s=>{
    const jw=new THREE.Mesh(new THREE.BoxGeometry(.34*sz,.54*sz,.64*sz),sTan);
    jw.position.set(s*.34*sz,-.1*sz,.06*sz);hG.add(jw);
    const cb=new THREE.Mesh(new THREE.SphereGeometry(.15*sz,6,5),muscle);
    cb.scale.set(1,.6,1.2);cb.position.set(s*.4*sz,.12*sz,.24*sz);hG.add(cb);
  });

  // ══════════════════════════════════
  //  חרטום + פה + שיניים
  // ══════════════════════════════════
  // לסת עליונה
  const jawUp=new THREE.Mesh(new THREE.BoxGeometry(.58*sz,.3*sz,.54*sz),fur);
  jawUp.position.set(0,-.06*sz,.46*sz);hG.add(jawUp);
  const lipUp=new THREE.Mesh(new THREE.BoxGeometry(.56*sz,.1*sz,.52*sz),fur);
  lipUp.position.set(0,-.24*sz,.46*sz);hG.add(lipUp);

  // לסת תחתונה — פתוחה
  const jawLo=new THREE.Mesh(new THREE.BoxGeometry(.54*sz,.2*sz,.48*sz),fur);
  jawLo.position.set(0,-.42*sz,.44*sz);jawLo.rotation.x=.24;hG.add(jawLo);
  const lipLo=new THREE.Mesh(new THREE.BoxGeometry(.52*sz,.1*sz,.46*sz),fur);
  lipLo.position.set(0,-.56*sz,.44*sz);lipLo.rotation.x=.24;hG.add(lipLo);

  // לשון — גלויה
  const tng=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.07*sz,.32*sz),tongue);
  tng.position.set(0,-.5*sz,.52*sz);tng.rotation.x=.18;hG.add(tng);

  // ── ניבים עליונים (tip points DOWN = rotation.x=PI) ──
  [-1,1].forEach(s=>{
    // ניב ראשי — ענק
    const f=new THREE.Mesh(new THREE.ConeGeometry(.095*sz,.42*sz,6),fangM);
    f.position.set(s*.17*sz,-.16*sz,.7*sz);f.rotation.x=Math.PI;hG.add(f);
    // קצה דם
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.038*sz,.11*sz,5),bloodM);
    tip.position.set(0,-.22*sz,0);f.add(tip); // relative to fang center
  });
  // ── ניבים תחתונים (tip points UP = no rotation) ──
  [-1,1].forEach(s=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(.078*sz,.34*sz,6),fangM);
    f.position.set(s*.17*sz,-.54*sz,.66*sz);hG.add(f); // default tip +Y ✓
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.032*sz,.09*sz,5),bloodM);
    tip.position.set(0,.18*sz,0);f.add(tip);
  });
  // שיניים קטנות — שורה עליונה
  [-2,-1,0,1,2].forEach(ti=>{
    const t=new THREE.Mesh(new THREE.ConeGeometry(.046*sz,.2*sz,4),fangM);
    t.position.set(ti*.085*sz,-.2*sz,.72*sz);t.rotation.x=Math.PI;hG.add(t);
  });
  // שיניים קטנות — שורה תחתונה
  [-2,-1,0,1,2].forEach(ti=>{
    const t=new THREE.Mesh(new THREE.ConeGeometry(.038*sz,.16*sz,4),fangM);
    t.position.set(ti*.085*sz,-.52*sz,.68*sz);hG.add(t);
  });

  // אף שטוח
  const nose=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.18*sz,.14*sz),ns);
  nose.position.set(0,.04*sz,.7*sz);hG.add(nose);
  [-1,1].forEach(s=>{
    const nr=new THREE.Mesh(new THREE.SphereGeometry(.066*sz,5,4),ns);
    nr.scale.set(1,.55,.7);nr.position.set(s*.09*sz,.04*sz,.76*sz);hG.add(nr);
  });

  // ══════════════════════════════════
  //  צלקות — רחבות וגלויות
  // ══════════════════════════════════
  // צלקת X ראשית על הלסת
  const sc1=new THREE.Mesh(new THREE.BoxGeometry(.13*sz,.54*sz,.1*sz),sRed);
  sc1.position.set(.31*sz,-.04*sz,.38*sz);sc1.rotation.z=.44;hG.add(sc1);
  const sc1b=new THREE.Mesh(new THREE.BoxGeometry(.11*sz,.4*sz,.1*sz),sRed);
  sc1b.position.set(.19*sz,-.16*sz,.40*sz);sc1b.rotation.z=-.32;hG.add(sc1b);
  // צלקת מצח — אופקית
  const sc2=new THREE.Mesh(new THREE.BoxGeometry(.46*sz,.11*sz,.1*sz),sRed);
  sc2.position.set(-.05*sz,.38*sz,.4*sz);sc2.rotation.z=-.16;hG.add(sc2);
  // צלקת על הגשר
  const sc3=new THREE.Mesh(new THREE.BoxGeometry(.09*sz,.3*sz,.09*sz),sRed);
  sc3.position.set(.13*sz,-.04*sz,.62*sz);sc3.rotation.z=.22;hG.add(sc3);
  // דמעת מתחת לעין — "קרב ישן"
  [-1,1].forEach(s=>{
    const tear=new THREE.Mesh(new THREE.BoxGeometry(.07*sz,.24*sz,.07*sz),sRed);
    tear.position.set(s*.28*sz,-.02*sz,.48*sz);tear.rotation.z=s*.18;hG.add(tear);
  });

  // ══════════════════════════════════
  //  עיניים — כתום-אש עם אישון מאונך
  // ══════════════════════════════════
  [-1,1].forEach(s=>{
    const socket=new THREE.Mesh(new THREE.SphereGeometry(.18*sz,9,8),eyOuter);
    socket.position.set(s*.3*sz,.16*sz,.42*sz);hG.add(socket);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(.135*sz,8,7),eyIris);
    iris.position.set(s*.3*sz,.16*sz,.46*sz);hG.add(iris);
    const pup=new THREE.Mesh(new THREE.BoxGeometry(.046*sz,.15*sz,.07*sz),eyPup);
    pup.position.set(s*.3*sz,.16*sz,.54*sz);hG.add(pup);
    const hl=new THREE.Mesh(new THREE.SphereGeometry(.03*sz,4,4),eyHl);
    hl.position.set(s*.025,.05*sz,.12*sz);iris.add(hl);
    // טבעת זוהר סביב העין
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.16*sz,.022*sz,5,9),eyIris);
    ring.rotation.x=Math.PI/2;ring.position.set(s*.3*sz,.16*sz,.38*sz);hG.add(ring);
  });

  // אוזניים קרועות
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.28*sz,.18*sz),fur);
    ear.position.set(s*.44*sz,.44*sz,-.08*sz);ear.rotation.z=s*.24;hG.add(ear);
    const torn=new THREE.Mesh(new THREE.ConeGeometry(.1*sz,.2*sz,4),sTan);
    torn.position.set(s*.44*sz,.68*sz,-.08*sz);torn.rotation.z=s*.38;hG.add(torn);
    const notch=new THREE.Mesh(new THREE.BoxGeometry(.11*sz,.11*sz,.13*sz),sRed);
    notch.position.set(s*.54*sz,.52*sz,-.08*sz);hG.add(notch);
  });

  // ══════════════════════════════════
  //  4 רגליים — עמודים
  // ══════════════════════════════════
  [[.32,.92,.56],[-.32,.92,.56],[.32,.92,-.58],[-.32,.92,-.58]].forEach(([lx,ly,lz])=>{
    const lg=new THREE.Group();lg.position.set(lx*sz,ly*sz,lz*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.3*sz,.62*sz,.3*sz),fur);up.position.y=-.31*sz;lg.add(up);
    const kn=new THREE.Mesh(new THREE.SphereGeometry(.18*sz,6,5),fur);kn.position.y=-.64*sz;lg.add(kn);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.25*sz,.52*sz,.25*sz),fur);lo.position.y=-.94*sz;lg.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.4*sz,.17*sz,.44*sz),fur);pw.position.set(0,-1.22*sz,.07*sz);lg.add(pw);
    // טפרים — 4 לכף
    [-1.4,-.46,.46,1.4].forEach(cx=>{
      const cl=new THREE.Mesh(new THREE.ConeGeometry(.055*sz,.22*sz,4),spikeM);
      cl.rotation.x=Math.PI*.65;cl.position.set(cx*.09*sz,-1.28*sz,.22*sz);lg.add(cl);
    });
  });

  // ══════════════════════════════════
  //  זנב קצר
  // ══════════════════════════════════
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.1*sz,.06*sz,.3*sz,6),fur);
  tail.position.set(0,.94*sz,-.96*sz);tail.rotation.x=.44;g.add(tail);

  // ══════════════════════════════════
  //  קולר ספייק מסיבי
  // ══════════════════════════════════
  const collarY=1.28*sz, collarZ=.84*sz, collarR=.44*sz;
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(collarR-.02*sz,collarR-.02*sz,.22*sz,16),
    new THREE.MeshLambertMaterial({color:0x120e06,emissive:0x060402}));
  collar.position.set(0,collarY,collarZ);g.add(collar);
  // 12 קוצים מסביב — חיצוניים, orientation נכונה
  for(let i=0;i<12;i++){
    _radialSpike(collarR+.01*sz, collarY, collarZ, (i/12)*Math.PI*2, .44*sz, .075*sz, spikeM, g);
  }

  // ══════════════════════════════════
  //  שרשרת — TorusGeometry לטבעות אמיתיות
  // ══════════════════════════════════
  // 2 שרשראות שמשתלשלות מהקולר
  [-.18*sz,.18*sz].forEach(cx=>{
    for(let i=0;i<6;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.092*sz,.026*sz,5,8),chainM);
      ring.position.set(cx, collarY-.1*sz-i*.17*sz, collarZ+.06*sz);
      ring.rotation.x=(i%2===0)?0:Math.PI*.5;
      g.add(ring);
    }
  });

  // ══════════════════════════════════
  //  צלקות גוף — רחבות
  // ══════════════════════════════════
  // כתף שמאל
  const bs1=new THREE.Mesh(new THREE.BoxGeometry(.13*sz,.46*sz,.12*sz),sRed);
  bs1.position.set(.46*sz,1.06*sz,.28*sz);bs1.rotation.z=.42;g.add(bs1);
  // ירך ימין
  const bs2=new THREE.Mesh(new THREE.BoxGeometry(.11*sz,.42*sz,.11*sz),sRed);
  bs2.position.set(-.44*sz,.98*sz,-.08*sz);bs2.rotation.z=-.36;g.add(bs2);
  // חזה — פצע קרב
  const bs3=new THREE.Mesh(new THREE.BoxGeometry(.42*sz,.12*sz,.1*sz),sRed);
  bs3.position.set(0,.84*sz,1.08*sz);bs3.rotation.z=.28;g.add(bs3);

  g.position.y=.15*sz;
  return g;
}

// ── מודל כלב גיסות טיטאן ──
function mkTitanScout(sz){
  const g=new THREE.Group();
  const fur   =new THREE.MeshLambertMaterial({color:0x100e0a,emissive:0x040302});
  const sTan  =new THREE.MeshLambertMaterial({color:0x2e1208,emissive:0x080300});
  const sRed  =new THREE.MeshLambertMaterial({color:0x882020,emissive:0x300808});
  const eyM   =new THREE.MeshLambertMaterial({color:0xdd8800,emissive:0xaa5500});
  const eyHl  =new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x999999});
  const ns    =new THREE.MeshLambertMaterial({color:0x050202});
  const fangM =new THREE.MeshLambertMaterial({color:0xd8c89a,emissive:0x100e06});
  const armorM=new THREE.MeshLambertMaterial({color:0x0e1208,emissive:0x040604});
  const spikeM=new THREE.MeshLambertMaterial({color:0x242014,emissive:0x080604});

  // גוף
  const body=new THREE.Mesh(new THREE.BoxGeometry(.64*sz,.54*sz,1.38*sz),fur);
  body.position.y=.78*sz;g.add(body);
  // אפוד שריון
  const vest=new THREE.Mesh(new THREE.BoxGeometry(.68*sz,.5*sz,.58*sz),armorM);
  vest.position.set(0,.82*sz,.4*sz);g.add(vest);
  [-1,1].forEach(s=>{
    const pk=new THREE.Mesh(new THREE.BoxGeometry(.14*sz,.13*sz,.07*sz),
      new THREE.MeshLambertMaterial({color:0x080e08}));
    pk.position.set(s*.2*sz,.72*sz,.66*sz);g.add(pk);
  });
  // קוץ מרכזי על האפוד
  const vstSpk=new THREE.Mesh(new THREE.ConeGeometry(.06*sz,.22*sz,5),spikeM);
  vstSpk.position.set(0,.98*sz,.68*sz);g.add(vstSpk); // tip +Y ✓

  // צוואר
  const nk=new THREE.Mesh(new THREE.CylinderGeometry(.19*sz,.24*sz,.32*sz,7),fur);
  nk.position.set(0,1.0*sz,.58*sz);nk.rotation.x=-.3;g.add(nk);

  // ראש — נמוך קדימה
  const hG=new THREE.Group();
  hG.position.set(0,1.28*sz,.9*sz);hG.rotation.x=.26;g.add(hG);
  const skull=new THREE.Mesh(new THREE.BoxGeometry(.72*sz,.62*sz,.68*sz),fur);hG.add(skull);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.74*sz,.18*sz,.28*sz),fur);
  brow.position.set(0,.36*sz,.3*sz);hG.add(brow);
  [-1,1].forEach(s=>{
    const wr=new THREE.Mesh(new THREE.BoxGeometry(.07*sz,.24*sz,.07*sz),sTan);
    wr.position.set(s*.17*sz,.24*sz,.44*sz);wr.rotation.z=s*.6;hG.add(wr);
  });
  [-1,1].forEach(s=>{
    const jw=new THREE.Mesh(new THREE.BoxGeometry(.24*sz,.42*sz,.54*sz),sTan);
    jw.position.set(s*.3*sz,-.1*sz,.04*sz);hG.add(jw);
  });

  // חרטום + שיניים
  const jawUp=new THREE.Mesh(new THREE.BoxGeometry(.48*sz,.26*sz,.46*sz),fur);
  jawUp.position.set(0,-.06*sz,.38*sz);hG.add(jawUp);
  const jawLo=new THREE.Mesh(new THREE.BoxGeometry(.44*sz,.18*sz,.42*sz),fur);
  jawLo.position.set(0,-.36*sz,.38*sz);jawLo.rotation.x=.2;hG.add(jawLo);

  // ניבים עליונים (tip DOWN)
  [-1,1].forEach(s=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(.072*sz,.3*sz,5),fangM);
    f.position.set(s*.14*sz,-.14*sz,.6*sz);f.rotation.x=Math.PI;hG.add(f);
  });
  // ניבים תחתונים (tip UP)
  [-1,1].forEach(s=>{
    const f=new THREE.Mesh(new THREE.ConeGeometry(.058*sz,.24*sz,5),fangM);
    f.position.set(s*.14*sz,-.44*sz,.56*sz);hG.add(f);
  });
  // שיניים קטנות
  [-1,0,1].forEach(ti=>{
    const t=new THREE.Mesh(new THREE.ConeGeometry(.038*sz,.15*sz,4),fangM);
    t.position.set(ti*.1*sz,-.16*sz,.62*sz);t.rotation.x=Math.PI;hG.add(t);
    const tb=new THREE.Mesh(new THREE.ConeGeometry(.03*sz,.12*sz,4),fangM);
    tb.position.set(ti*.1*sz,-.42*sz,.58*sz);hG.add(tb);
  });

  const nose=new THREE.Mesh(new THREE.SphereGeometry(.07*sz,6,5),ns);
  nose.scale.set(1,.64,.74);nose.position.set(0,.04*sz,.58*sz);hG.add(nose);

  // צלקת
  const sc=new THREE.Mesh(new THREE.BoxGeometry(.1*sz,.38*sz,.08*sz),sRed);
  sc.position.set(.22*sz,-.02*sz,.3*sz);sc.rotation.z=.34;hG.add(sc);

  // עיניים ענבר
  [-1,1].forEach(s=>{
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.1*sz,7,6),eyM);
    eye.position.set(s*.25*sz,.14*sz,.36*sz);hG.add(eye);
    const pup=new THREE.Mesh(new THREE.BoxGeometry(.032*sz,.1*sz,.06*sz),
      new THREE.MeshLambertMaterial({color:0x000000}));
    pup.position.set(s*.25*sz,.14*sz,.42*sz);hG.add(pup);
    const hl=new THREE.Mesh(new THREE.SphereGeometry(.022*sz,4,4),eyHl);
    hl.position.set(s*.022,.04*sz,.12*sz);eye.add(hl);
  });

  // אוזניים
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(new THREE.BoxGeometry(.12*sz,.22*sz,.14*sz),fur);
    ear.position.set(s*.37*sz,.36*sz,-.05*sz);ear.rotation.z=s*.22;hG.add(ear);
  });

  // קסדה טקטית
  const helm=new THREE.Mesh(new THREE.SphereGeometry(.4*sz,8,6,0,Math.PI*2,0,Math.PI*.54),armorM);
  helm.scale.set(1,.88,.92);helm.position.set(0,.32*sz,0);hG.add(helm);

  // רגליים
  [[.24,.78,.4],[-.24,.78,.4],[.24,.78,-.44],[-.24,.78,-.44]].forEach(([lx,ly,lz])=>{
    const lg=new THREE.Group();lg.position.set(lx*sz,ly*sz,lz*sz);g.add(lg);
    const up=new THREE.Mesh(new THREE.BoxGeometry(.2*sz,.46*sz,.2*sz),fur);up.position.y=-.23*sz;lg.add(up);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(.16*sz,.38*sz,.16*sz),fur);lo.position.y=-.64*sz;lg.add(lo);
    const pw=new THREE.Mesh(new THREE.BoxGeometry(.26*sz,.12*sz,.3*sz),fur);pw.position.set(0,-.88*sz,.03*sz);lg.add(pw);
    [-1,1].forEach(cx=>{
      const cl=new THREE.Mesh(new THREE.ConeGeometry(.038*sz,.13*sz,4),spikeM);
      cl.rotation.x=Math.PI*.62;cl.position.set(cx*.08*sz,-.93*sz,.13*sz);lg.add(cl);
    });
  });

  // קולר ספייק — orientation נכונה
  const cY=1.0*sz, cZ=.58*sz, cR=.3*sz;
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(cR,cR,.14*sz,12),
    new THREE.MeshLambertMaterial({color:0x150a04,emissive:0x040100}));
  collar.position.set(0,cY,cZ);g.add(collar);
  for(let i=0;i<8;i++){
    _radialSpike(cR+.01*sz, cY, cZ, (i/8)*Math.PI*2, .26*sz, .05*sz, spikeM, g);
  }

  // זנב
  const tl=new THREE.Mesh(new THREE.CylinderGeometry(.05*sz,.04*sz,.24*sz,5),fur);
  tl.position.set(0,.78*sz,-.72*sz);tl.rotation.x=.5;g.add(tl);

  g.position.y=.13*sz;
  return g;
}
// ── spawn טיטאן הבוס ──
function _spawnTitanBoss(frozen){
  if(G._titanEnemy&&G._titanEnemy.mesh)return;
  const m=mkTitan(1.22);
  m.position.set(-120,0,130);
  scene.add(m);
  // HP bar גדול
  const barBg=new THREE.Mesh(new THREE.BoxGeometry(3,.22,.1),new THREE.MeshLambertMaterial({color:0x220000}));
  barBg.position.set(0,3.8,0);m.add(barBg);
  const barFg=new THREE.Mesh(new THREE.BoxGeometry(3,.2,.12),new THREE.MeshLambertMaterial({color:0xff4400,emissive:0x661100}));
  barFg.position.set(0,3.8,.01);m.add(barFg);
  const pl=new THREE.PointLight(0xff3300,3.2,26);pl.position.set(-120,3.5,130);scene.add(pl);
  const pl2=new THREE.PointLight(0xff6600,1.6,10);pl2.position.set(-120,.6,130);scene.add(pl2);
  G._titanEnemy={
    mesh:m,bar:barFg,light:pl,light2:pl2,
    x:-120,z:130,
    hp:500,mhp:500,
    spd:6.5,atk:3.2,atkT:1.0,
    alert:28,phase:1,
    dashT:3,dashOn:false,dvx:0,dvz:0,
    dead:false,_hitT:0,_hitCD:0,
    frozen:!!frozen, // קפוא עד שהסקאוטים יובסו
  };
  if(!frozen)showN('💀 טיטאן! בוס אגדי — לחצו תקיפה ליד כדי לפגוע!');
}

// ── עדכון טיטאן בפריים ──
function updTitan(dt){
  if(!G._titanEnemy||G._titanEnemy.dead)return;
  if(G._titanEnemy.frozen)return; // קפוא — לא זז ולא תוקף
  const b=G._titanEnemy;
  const px=PB.position.x,pz=PB.position.z;
  const bx=b.mesh.position.x,bz=b.mesh.position.z;
  const dd=d2(bx,bz,px,pz);

  // פאזה 2 — 40% HP
  if(b.hp<b.mhp*.4&&b.phase===1){
    b.phase=2;b.spd=8.5;
    showN('💀 טיטאן מתפרע! הוא מהיר יותר!');
    haptic([80,30,80,30,100]);
    if(b.light)b.light.color.setHex(0xff0000);
  }

  b._hitT=Math.max(0,b._hitT-dt);
  b._hitCD=Math.max(0,b._hitCD-dt);
  b.atkT=Math.max(0,b.atkT-dt);
  b.dashT-=dt;

  // dash
  if(b.dashT<=0&&!b.dashOn&&dd<24){
    b.dashOn=true;
    b.dashT=b.phase===2?2:3.5;
    const dx=px-bx,dz=pz-bz,l=Math.sqrt(dx*dx+dz*dz)||1;
    b.dvx=dx/l*(b.phase===2?26:20);
    b.dvz=dz/l*(b.phase===2?26:20);
    showN('💥 טיטאן돌진!');
  }
  if(b.dashOn){
    b.mesh.position.x+=b.dvx*dt;b.mesh.position.z+=b.dvz*dt;
    b.dvx*=.86;b.dvz*=.86;
    if(Math.abs(b.dvx)<.4)b.dashOn=false;
    if(d2(b.mesh.position.x,b.mesh.position.z,px,pz)<b.atk)dmgPlayer(b.phase===2?30:22);
  } else {
    const dx=px-bx,dz=pz-bz,l=Math.sqrt(dx*dx+dz*dz)||1;
    b.mesh.position.x+=dx/l*b.spd*dt;
    b.mesh.position.z+=dz/l*b.spd*dt;
    b.mesh.rotation.y=Math.atan2(dx,dz);
    if(dd<b.atk&&b.atkT<=0){b.atkT=b.phase===2?.8:1.1;dmgPlayer(b.phase===2?24:16);}
  }
  b.mesh.position.x=b.mesh.position.x;
  b.x=b.mesh.position.x;b.z=b.mesh.position.z;
  if(b.light){b.light.position.set(b.x,3,b.z);}
  if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);

  // פגיעת שחקן בטיטאן
  const dog=G.dogs[G.dog];
  const dd2=d2(b.x,b.z,px,pz);
  if(dd2<5.5&&G._atkFrame&&b._hitT<=0&&b._hitCD<=0){
    const dmg=Math.round(dog.pow*12*(1+dog.lv*.12));
    b.hp-=dmg;sHit();haptic(28);
    flash(b.mesh.children[0]);
    spawnBlood(b.x,1.5,b.z,18);
    showDmg(b.x,2,b.z,dmg);
    b._hitT=0.45;b._hitCD=0.45;
    if(b.bar)b.bar.scale.x=Math.max(0,b.hp/b.mhp);
    if(b.hp<=0){
      b.dead=true;b.mesh.visible=false;
      if(b.light)b.light.intensity=0;
      sCapture();haptic([120,50,120,50,150]);
      addXP(250);G.score+=1500;G.coins+=300;updCoins();
      spawnBlood(b.x,2,b.z,40);
      spawnPfx(b.x,2,b.z,0xf5c518,32);
      spawnPfx(b.x,2,b.z,0xff4400,24);
      showN('🏆 טיטאן הובס!');
      // ── רקס: התקף לב — overlay מלא שלא ניתן לפספס ──
      G._reksCollapsing=false;
      // שלב א׳: ניצחון קצר
      setTimeout(()=>{
        showN('רקס עומד בשקט. מסתכל על לוד מלמטה...');
      },2000);
      // שלב ב׳: מצלמה סינמטית + רקס מתחיל לקרוס + overlay
      setTimeout(()=>{
        G._reksCollapsing=true;
        G._reksCollapseT=0;
        // ── נעילת מצלמה סינמטית על רקס ──
        if(camera&&G._reksAlly&&G._reksAlly.mesh&&PB){
          const reksPos=G._reksAlly.mesh.position;
          const origCamPos=camera.position.clone();
          const origLookAt=new THREE.Vector3(PB.position.x,PB.position.y+1,PB.position.z);
          // מצלמה: מהצד הנמוך, ברמת הגובה של רקס הקורס
          const rexCam=new THREE.Vector3(reksPos.x+4, 2.2, reksPos.z+5);
          const rexLook=new THREE.Vector3(reksPos.x, 0.6, reksPos.z);
          G._cinemaMode=true;
          // lerp חד לנקודת הפתיחה
          let _lT=0;
          const _lI=setInterval(()=>{
            _lT+=16;
            const p=Math.min(_lT/600,1),e=1-Math.pow(1-p,3);
            camera.position.lerpVectors(origCamPos,rexCam,e);
            camera.lookAt(new THREE.Vector3().lerpVectors(origLookAt,rexLook,e));
            if(_lT>=600)clearInterval(_lI);
          },16);
          // אחרי ה-cutscene — שחרר מצלמה
          setTimeout(()=>{ G._cinemaMode=false; },8500);
        }
      setTimeout(()=>{
        G._reksCollapsing=true;
        G._reksCollapseT=0;
        // הבהובים אדומים בלבד — ללא החשכת מסך
        // הבהובים אדומים
        const fl=document.createElement('div');
        fl.style.cssText='position:fixed;inset:0;background:rgba(200,0,0,0);z-index:8501;pointer-events:none;transition:background 0.15s;';
        document.body.appendChild(fl);
        setTimeout(()=>fl.style.background='rgba(200,0,0,0.55)',50);
        setTimeout(()=>fl.style.background='rgba(200,0,0,0)',220);
        setTimeout(()=>fl.style.background='rgba(200,0,0,0.38)',420);
        setTimeout(()=>fl.style.background='rgba(200,0,0,0)',700);
        setTimeout(()=>fl.remove(),800);
        // טקסט מרכזי
        const txt=document.createElement('div');
        txt.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:8502;color:#ff3333;font-size:clamp(20px,5vw,30px);font-weight:bold;text-align:center;letter-spacing:2px;text-shadow:0 0 20px #ff0000,0 0 40px #880000;pointer-events:none;opacity:0;transition:opacity 0.5s;font-family:inherit;';
        txt.innerHTML='💔 רקס...<br><span style="font-size:0.6em;color:#ff8888;letter-spacing:1px;">\"אני... לא...\"</span>';
        document.body.appendChild(txt);
        setTimeout(()=>txt.style.opacity='1',600);
        setTimeout(()=>txt.style.opacity='0',3600);
        setTimeout(()=>txt.remove(),4100);
      },4500);
      // שלב ג׳: cutscene
      setTimeout(()=>{
        showCut('rex_heart_attack',()=>{
          G.mission=24;
          if(MISSIONS[24])MISSIONS[24].unlock();
          updateMissionHUD();updateNavArrow();saveGame();
        });
      },8500);
    }
  }
}

// ── עדכון רקס מלווה ──
function updReksAlly(dt){
  if(!G._reksAlly)return;
  const r=G._reksAlly;
  r._t=(r._t||0)+dt;
  // pulse נורית ירוקה
  if(r.ind&&!G._reksCollapsing)r.ind.material.emissive.setRGB(0,0.4+Math.sin(r._t*3)*.2,0.2);
  // mission 24+ — רקס קורס מהתקף לב
  if(G.mission>=24||G._reksCollapsing){
    // אנימציית נפילה: מסתובב על הצד, שוקע לאדמה
    const colT=G._reksCollapseT||0;
    G._reksCollapseT=(colT+0.016); // מצטבר בכל פריים
    const prog=Math.min(colT/2.5,1); // 2.5 שניות לנפילה מלאה
    r.mesh.rotation.z=prog*(Math.PI/2); // נוטה 90° על הצד
    r.mesh.position.y=Math.max(-0.4,0-prog*0.4); // שוקע לאדמה
    // נורית אדומה מהבהבת בהתחלה
    if(r.ind){
      if(colT<1.5) r.ind.material.emissive.setRGB(0.8+Math.sin(colT*12)*0.2,0,0);
      else r.ind.material.emissive.setRGB(0,0,0);
    }
    return;
  }
  // לפני mission 21 — עמוד בכיכר, אל תעקוב
  if(G.mission<21)return;
  // מ-mission 21 עד 23 — עקוב אחרי השחקן
  if(!PB)return;
  const px=PB.position.x,pz=PB.position.z;
  const dx=px+Math.sin(G.yaw+1.2)*3.5-r.x;
  const dz=pz+Math.cos(G.yaw+1.2)*3.5-r.z;
  const dist=Math.sqrt(dx*dx+dz*dz);
  if(dist>1.5){
    const spd=dist>12?18:dist>6?14:dist>3?9:5;
    const step=Math.min(spd*dt,dist);
    r.x+=dx/dist*step;r.z+=dz/dist*step;
    r.mesh.position.set(r.x,0,r.z);
    r.mesh.rotation.y=Math.atan2(dx,dz);
  }
}

// ── ספירת הריגות לפרק ה׳ ──
let _ch5ScoutKills=0;
function _checkCh5Progress(){
  if(G.mission!==21)return;
  const need=6; // ✅ תיקון: יש 6 סקאוטים בפועל
  const killed=G.enemies.filter(e=>e._titan&&e.hp<=0).length;
  if(killed!==_ch5ScoutKills){
    _ch5ScoutKills=killed;
    document.getElementById('mtx').textContent=`2️⃣1️⃣ הכנע 6 כלבים מגיסות טיטאן ⚔️  (הובסו: ${Math.min(_ch5ScoutKills,need)}/${need})`;
  }
  if(_ch5ScoutKills>=need&&G.mission===21&&!G._ch5ScoutsDone){
    G._ch5ScoutsDone=true;
    showN('✅ כל גיסות טיטאן הובסו!\n💀 טיטאן מגיע לתקוף!');
    setTimeout(()=>{
      // הפעל קרב ישירות — בלי קאטסינים שצריך ללחוץ
      G.mission=23;
      if(typeof MISSIONS!=='undefined'&&MISSIONS[23])MISSIONS[23].unlock();
      if(typeof updateMissionHUD==='function')updateMissionHUD();
      if(typeof updateNavArrow==='function')updateNavArrow();
      if(typeof saveGame==='function')saveGame();
      if(G._titanEnemy){G._titanEnemy.frozen=false;}
      else if(typeof _spawnTitanBoss==='function'){_spawnTitanBoss(false);}
    },1200);
  }
}

// ── זיקוקים לסיום ──
function _spawnFinalFireworks(){
  let count=0;
  const burst=()=>{
    if(count>18)return;count++;
    const x=(Math.random()-.5)*120,z=(Math.random()-.5)*120;
    const cols=[0xf5c518,0xff4400,0x3498db,0x2ecc71,0xff69b4,0xffffff];
    const col=cols[Math.floor(Math.random()*cols.length)];
    spawnPfx(x,8+Math.random()*12,z,col,28);
    spawnPfx(x,8+Math.random()*12,z,0xffffff,10);
    setTimeout(burst,320+Math.random()*400);
  };
  burst();
}

// ── בריכת הנחת — מבנה עולמי ──
function _buildPoolOfRest(){
  const cx=-120,cz=130;
  const mk=(geo,col,opts={})=>{
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col,...opts}));
    m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
  };
  mk(new THREE.BoxGeometry(30,0.3,30),0x8a9ea8).position.set(cx,0.15,cz);
  [[cx,cz-14.7,30,0.08,0.6],[cx,cz+14.7,30,0.08,0.6],
   [cx-14.7,cz,0.6,0.08,28.4],[cx+14.7,cz,0.6,0.08,28.4]].forEach(([x,z,w,h,d])=>{
    mk(new THREE.BoxGeometry(w,h,d),0xd0dce0).position.set(x,0.31,z);
  });
  for(let tx=-12;tx<=12;tx+=3)for(let tz=-12;tz<=12;tz+=3){
    if(Math.abs(tx)<7&&Math.abs(tz)<5)continue;
    const col=(Math.round((tx+tz)/3)%2===0)?0x7a8e98:0x96aab4;
    mk(new THREE.BoxGeometry(2.8,0.07,2.8),col).position.set(cx+tx,0.305,cz+tz);
  }
  mk(new THREE.BoxGeometry(13,0.6,9),0x2a4050).position.set(cx,0.0,cz);
  const water=mk(new THREE.BoxGeometry(12.2,0.14,8.2),0x1a7acc,
    {transparent:true,opacity:0.82,emissive:0x0a3a5a});
  water.position.set(cx,0.38,cz);G._poolWater=water;
  [[cx,cz-4.6,13,0.45,0.6],[cx,cz+4.6,13,0.45,0.6],
   [cx-6.6,cz,0.6,0.45,8.6],[cx+6.6,cz,0.6,0.45,8.6]].forEach(([x,z,w,h,d])=>{
    mk(new THREE.BoxGeometry(w,h,d),0xeee8d8).position.set(x,0.53,z);
  });
  [[-6.6,-4.6],[6.6,-4.6],[-6.6,4.6],[6.6,4.6]].forEach(([ox,oz])=>{
    mk(new THREE.BoxGeometry(0.65,0.45,0.65),0xfff4e8).position.set(cx+ox,0.53,cz+oz);
  });
  mk(new THREE.CylinderGeometry(1.5,1.7,0.4,12),0xd4cbb8).position.set(cx,0.6,cz);
  mk(new THREE.CylinderGeometry(0.15,0.2,2.6,8),0xc8c0a8).position.set(cx,1.9,cz);
  mk(new THREE.CylinderGeometry(0.65,0.85,0.22,12),0xe2d8c4).position.set(cx,3.25,cz);
  const jet=mk(new THREE.CylinderGeometry(0.04,0.2,1.4,8),0x88ccee,
    {transparent:true,opacity:0.6,emissive:0x224466});
  jet.position.set(cx,4.1,cz);G._poolJet=jet;
  mk(new THREE.SphereGeometry(0.22,8,6),0xddd4c0).position.set(cx,5.0,cz);
  [[cx-11,cz-11],[cx,cz-11],[cx+11,cz-11],
   [cx+11,cz],[cx+11,cz+11],[cx,cz+11],[cx-11,cz+11],[cx-11,cz]].forEach(([px,pz])=>{
    mk(new THREE.BoxGeometry(0.7,0.3,0.7),0xc8c0a8).position.set(px,0.15,pz);
    mk(new THREE.CylinderGeometry(0.25,0.32,5.5,10),0xd8d0b8).position.set(px,3.05,pz);
    mk(new THREE.BoxGeometry(0.8,0.28,0.8),0xc0b8a0).position.set(px,5.94,pz);
    mk(new THREE.BoxGeometry(0.28,0.32,0.28),0xffee88,{emissive:0x996600}).position.set(px,6.35,pz);
    const lamp=new THREE.PointLight(0xffcc66,0.7,12);lamp.position.set(px,6.5,pz);scene.add(lamp);
    blds.push({x:px,z:pz,w:1.2,d:1.2});
  });
  for(let bz=-11;bz<=11;bz+=5.5)
    mk(new THREE.BoxGeometry(24,0.28,0.4),0xb8a880).position.set(cx,6.08,cz+bz);
  for(let bx=-11;bx<=11;bx+=5.5)
    mk(new THREE.BoxGeometry(0.4,0.28,24),0xb8a880).position.set(cx+bx,6.08,cz);
  [[-10,0,3,0.5],[10,0,3,0.5],[0,-10,0.5,3],[0,10,0.5,3]].forEach(([ox,oz,sw,sd])=>{
    mk(new THREE.BoxGeometry(sw,0.18,sd),0xa89870).position.set(cx+ox,0.49,cz+oz);
    mk(new THREE.BoxGeometry(sw,0.35,0.15),0x887858).position.set(cx+ox,0.35,cz+oz-(sd/2-0.1));
    mk(new THREE.BoxGeometry(sw,0.35,0.15),0x887858).position.set(cx+ox,0.35,cz+oz+(sd/2-0.1));
  });
  [[-12,-12],[12,-12],[-12,12],[12,12]].forEach(([ox,oz])=>{
    mk(new THREE.CylinderGeometry(0.18,0.26,5,7),0x3a2208).position.set(cx+ox,2.5,cz+oz);
    mk(new THREE.ConeGeometry(0.95,6,7),0x1a5518).position.set(cx+ox,8.5,cz+oz);
  });
  [[-13,0],[13,0]].forEach(([ox,oz])=>{
    mk(new THREE.CylinderGeometry(0.22,0.3,4.5,8),0x3a2208).position.set(cx+ox,2.25,cz+oz);
    mk(new THREE.SphereGeometry(2.4,9,7),0x1e5c12).position.set(cx+ox,6.2,cz+oz);
  });
  const poolLight=new THREE.PointLight(0x2299dd,1.2,22);
  poolLight.position.set(cx,2.2,cz);scene.add(poolLight);
  G._poolLight=poolLight;
}


// ── עדכון פרק ה׳ בלולאת המשחק ──
function updCh5(dt){
  if(G.mission<20)return;
  // fallback: אם mission=21 והכלבים עדיין לא נוצרו — צור אותם עכשיו
  if(G.mission===21&&!G._titanScoutsSpawned){
    _spawnTitanScouts();
    // ודא שכל הגיסות גלויים
    G.enemies.forEach(e=>{if(e._titan&&e.mesh)e.mesh.visible=true;});
  }
  // fallback: ודא שרקס קיים
  if(G.mission>=20&&G.mission<=24&&!G._reksAlly) _spawnReksAlly();
  updReksAlly(dt);
  _checkCh5Progress();

  // ── קרב טיטאן ──
  if(G.mission===23){
    if(!G._titanEnemy)_spawnTitanBoss(false);
    if(G._titanEnemy){
      G._titanEnemy.frozen=false; // בטוח שלא קפוא
      updTitan(dt);
    }
  }

  // הגעה לבריכת הנחת — מיסיון 22 — פתח קאטסין (רק אם לא כבר נפתח מ-_checkCh5Progress)
  if(G.mission===22&&PB&&!G._poolCutPlaying){
    if(d2(PB.position.x,PB.position.z,-120,130)<18){
      // בדוק אם עוד לא הובסו כל הסקאוטים
      if(!G._ch5ScoutsDone){
        if(!G._titanWarnShown){
          G._titanWarnShown=true;
          const killed=G.enemies.filter(e=>e._titan&&e.hp<=0).length;
          showN(`⚠️ טיטאן מחכה — הכנע קודם את כל הסקאוטים!\n(הובסו: ${killed}/6)`);
          setTimeout(()=>{G._titanWarnShown=false;},4000);
        }
        return;
      }
      G._poolCutPlaying=true;
      showCut('titan_reveal',()=>{
        showCut('ch5_boss',()=>{
          if(G._titanEnemy){G._titanEnemy.frozen=false;}
          else{_spawnTitanBoss(false);}
          setMission(23);
          G._poolCutPlaying=false;
        });
      });
    }
  }
  // הגעה לכיכר — מיסיון 20 — הצג רקס לפני מעבר למיסיון 21
  if(G.mission===20&&PB&&!G._reksJoinCutPlaying){
    if(d2(PB.position.x,PB.position.z,40,0)<8){
      G._reksJoinCutPlaying=true;
      if(!G._reksAlly)_spawnReksAlly();
      showCut('reks_joins',()=>{
        showN('🫡 רקס הצטרף לכנופייה!\nהוא מכיר את בריכת הנחת — עקבו אחריו.');
        setMission(21);
        G._reksJoinCutPlaying=false;
      });
    }
  }
}


const SAVE_KEY='kalbei_lod_v1';
const SAVE_KEY_BACKUP='kalbei_lod_v1_bak';
function saveGame(){
  try{
    const dog=G.dogs[G.dog];
    const save={
      v:1,ts:Date.now(),
      dog:G.dog,mission:G.mission,
      score:G.score,coins:G.coins,gang:G.gang,
      foodEaten:G.foodEaten,enemiesKilled:G.enemiesKilled,
      recruitsDone:G.recruitsDone,totalKills:G.totalKills,
      sideQ:JSON.parse(JSON.stringify(G.sideQ)),
      daily:G.daily?JSON.parse(JSON.stringify(G.daily)):null,
      fishkaCaught:G._fishkaEnemy?.caught||false,
      guardsDone:G.guardDogs.filter(g=>g.hp<=0).length,
      // ── פרק ב׳ ──
      ch2Active:G.ch2Active,momoFreed:G.momoFreed,
      collFound:G.collFound||0,terrCnt:G.terrCnt||0,
      // ── פרק ה׳ ──
      ch5ScoutKills:_ch5ScoutKills||0,
      // ── פרק ו׳ ──
      ch6:{
        baseVisited:!!G._ch6BaseVisited,
        marketVisited:!!G._ch6MarketVisited,
        portVisited:!!G._ch6PortVisited,
        labVisited:!!G._ch6LabVisited,
        recordingPlayed:!!G._ch6RecordingPlayed,
        factoryVisited:!!G._ch6FactoryVisited,
        fireDone:!!G._ch6FireDone,
        shadowBossDead:!!G._shadowBossDead,
      },
      dogs:{
        colin:{...G.dogs.colin},
        zippo:{...G.dogs.zippo},
        momo:{...G.dogs.momo},
      },
      pos:PB?{x:Math.round(PB.position.x),y:0,z:Math.round(PB.position.z)}:{x:0,y:0,z:60},
    };
    // שמירה כפולה: קודם העתק הגרסה הנוכחית לbackup, אז כתוב חדשה
    try{const old=localStorage.getItem(SAVE_KEY);if(old)localStorage.setItem(SAVE_KEY_BACKUP,old);}catch(_){}
    localStorage.setItem(SAVE_KEY,JSON.stringify(save));
    // תיקון שיפור: feedback קצר על שמירה אוטומטית
    const sc=document.getElementById('sc');
    if(sc){const orig=sc.style.color;sc.style.color='#2ecc71';setTimeout(()=>{sc.style.color=orig;},600);}
  }catch(e){
    // תיקון באג: catch ריק מסתיר שגיאות קריטיות — מוסיפים console.warn
    console.warn('[saveGame] שגיאה בשמירה:', e);
  }
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
    const s=JSON.parse(raw);if(!s||s.v!==1)return false;
    // הסתר char select, הצג HUD
    document.getElementById('cs-scr').style.display='none';
    document.getElementById('hud').style.display='block';
    // שחזר state
    G.dog=s.dog||'colin';
    G.mission=s.mission||0;
    G.score=s.score||0;G.coins=s.coins||0;G.gang=s.gang||0;
    G.foodEaten=s.foodEaten||0;G.enemiesKilled=s.enemiesKilled||0;
    G.recruitsDone=s.recruitsDone||0;G.totalKills=s.totalKills||0;
    G.collFound=s.collFound||0;G.terrCnt=s.terrCnt||0;
    // ── שחזר state פרק ב׳ ──
    G.ch2Active=!!s.ch2Active;G.momoFreed=!!s.momoFreed;
    // ── שחזר state פרק ה׳ ──
    if(s.ch5ScoutKills)_ch5ScoutKills=s.ch5ScoutKills;
    // ── שחזר state פרק ו׳ ──
    if(s.ch6){
      G._ch6BaseVisited=!!s.ch6.baseVisited;
      G._ch6MarketVisited=!!s.ch6.marketVisited;
      G._ch6PortVisited=!!s.ch6.portVisited;
      G._ch6LabVisited=!!s.ch6.labVisited;
      G._ch6RecordingPlayed=!!s.ch6.recordingPlayed;
      G._ch6FactoryVisited=!!s.ch6.factoryVisited;
      G._ch6FireDone=!!s.ch6.fireDone;
      G._shadowBossDead=!!s.ch6.shadowBossDead;
    }
    // שחזר gateMarker אם היינו בפרק ב׳
    if(G.ch2Active&&G.mission>=8&&G.mission<=10)G.gateMarker={x:-51,z:-100};
    if(s.sideQ)G.sideQ=s.sideQ;
    if(s.daily)G.daily=s.daily;
    if(s.dogs){Object.keys(s.dogs).forEach(k=>{if(G.dogs[k])Object.assign(G.dogs[k],s.dogs[k]);});}
    document.getElementById('hdn').textContent=G.dogs[G.dog].name;
    if(isMob)document.getElementById('mob').style.display='block';
    G.hud=true;document.getElementById('coin-hud').style.display='block';
    if(isMob){document.getElementById('sq-btn-mob').classList.add('has-done');}else{document.getElementById('sq-btn').style.display='flex';}
  const db=document.getElementById('daily-btn');if(db)db.style.display='block';
  _daily_init();
    init();
    // אחרי init — שחזר מיקום (init מאפס ל-0,0,60)
    if(s.pos&&PB){PB.position.set(s.pos.x,0,s.pos.z);}
    // שחזר mission — init קרא setMission(0), נדרוס בלי לקרוא unlock() (כדי לא לפתוח קאטסינים שוב)
    G.mission=s.mission;
    // סדר את העולם לפי ה-mission שנשמר
    setTimeout(()=>{if(typeof _applyWorldState==='function')_applyWorldState(G.mission);},300);
    // שחזר גיסות טיטאן אם mission==21
    if(G.mission===21&&!G._titanScoutsSpawned){
      _spawnTitanScouts();
    }
    // שחזר רקס ally אם פרק ה׳ — ישירות, לא דרך timeout, ומוצמד לשחקן
    if(G.mission>=20&&G.mission<=24&&!G._reksAlly){
      _spawnReksAlly();
      if(G._reksAlly&&PB){
        G._reksAlly.x=PB.position.x+3;
        G._reksAlly.z=PB.position.z+3;
        G._reksAlly.mesh.position.set(PB.position.x+3,0,PB.position.z+3);
      }
    }
    // שחזר שטחים שנכבשו
    G.terrCnt=s.terrCnt||0;
    document.getElementById('tc').textContent=G.terrCnt;
    // שחזר אויבים — הצג אם mission>=3
    if(G.mission>=3){G.enemies.forEach(e=>{e.mesh.visible=true;});}
    if(G.mission>=6){G.bosses.forEach(b=>{b.mesh.visible=true;b.dead=false;});}
    if(G.mission>=4){G.npcs.forEach(n=>{if(n.ind&&n.type==='recruit')n.ind.visible=true;});}
    // שחזר קולקטיבלס — תיקון באג: null check לפני גישה ל-element
    const collCountEl=document.getElementById('coll-count');
    if(collCountEl)collCountEl.textContent=G.collFound;
    updateMissionHUD();updateNavArrow();
    G.gang=s.gang||0;document.getElementById('gc').textContent=G.gang;
    updCoins();updSQPanel();
    showN('✅ המשחק נטען בהצלחה! רמה '+G.dogs[G.dog].lv+' • משימה '+(G.mission+1));
    return true;
  }catch(e){
    console.warn('[loadGame] שמירה ראשית פגומה, מנסה backup...',e);
    try{
      const raw2=localStorage.getItem(SAVE_KEY_BACKUP);if(!raw2)return false;
      const s2=JSON.parse(raw2);if(!s2||s2.v!==1)return false;
      showN('⚠️ שמירה ראשית פגומה — נטענה גרסת backup');
      localStorage.setItem(SAVE_KEY,raw2); // שחזר מה-backup
      return loadGame(); // טען שוב
    }catch(e2){console.error('[loadGame] גם backup נכשל',e2);return false;}
  }
}
function deleteSave(){localStorage.removeItem(SAVE_KEY);showN('🗑️ שמירה נמחקה');}

// בדוק שמירה קיימת בchar select
(function checkSave(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return;
  try{
    const s=JSON.parse(raw);
    const btn=document.getElementById('cs-continue');
    if(!btn)return;
    const d=new Date(s.ts);
    const mName={0:'שיחה עם בלה',1:'איסוף אוכל',2:'כיבוש ראשון',3:'קרבות',4:'גיוס',5:'כיבוש שטחים',6:'ג׳ק הרוטווילר',7:'—',8:'המסגד',9:'חדירה',10:'ברונו',11:'ניצחון!',12:'בלה נפלה',13:'כיכר הכדורים',14:'פרק ד׳',15:'העירייה',16:'הכספת',17:'פלטו',18:'שידור',19:'אנדרטה',20:'רקס מגיע',21:'גיסות טיטאן',22:'בריכת הנחת',23:'טיטאן',24:'סיום אמיתי!',25:'פרק ו׳ — גילוי',26:'הצל נראה',27:'זיפו עוקב',28:'הבניין הנטוש',29:'המעבדה',30:'קרב הצל',31:'המפעל',32:'שריפה'};
    document.getElementById('cs-save-info').textContent=`רמה ${s.dogs?.[s.dog]?.lv||1} | ${mName[s.mission]||'—'} | 💰${s.coins||0}`;
    btn.style.display='block';
  }catch(e){}
})();

// ════════════════════════════════════════════════
// ██ פרק ו׳ — "צל" ██
// ════════════════════════════════════════════════

// boss הצל — עותק של רקס, נלחם כמו commander אבל עם HP גבוה יותר
function _spawnShadowBoss(){
  if(G._shadowEnemy)return;
  if(!scene)return;
  // בנה מודל דומה ל-reks (commander) — אבל עם גוון כהה יותר
  const grp=mkCommander(1.05);
  // גוון כהה לציון שהוא "עותק"
  grp.traverse(c=>{
    if(c.isMesh&&c.material){
      const m=c.material.clone();
      m.color.multiplyScalar(0.55);
      m.emissive=new THREE.Color(0x110022);
      c.material=m;
    }
  });
  // הילה סגולה — מסמנת שהוא לא "אמיתי"
  const aura=new THREE.Mesh(
    new THREE.SphereGeometry(.55,8,8),
    new THREE.MeshBasicMaterial({color:0x6600aa,transparent:true,opacity:.18,depthWrite:false})
  );
  grp.add(aura);
  grp.position.set(90,0,95);
  scene.add(grp);
  const enemy={
    mesh:grp,x:90,z:95,
    hp:320,mhp:320,        // חזק יותר מ-boss רגיל
    pow:14,spd:5.5,
    dead:false,_t:0,
    isShadow:true,         // דגל לזיהוי
    name:'הצל',
  };
  G._shadowEnemy=enemy;
  G.bosses.push(enemy);
  showN('⚔️ הצל — HP: 320\nהוא נלחם כמו רקס. היזהרו.');
}

// עדכון שמות משימות בmission map של שמירה
const _CH6_MISSION_NAMES={
  25:'פרק ו׳ — גילוי',26:'הצל נראה',27:'זיפו עוקב',
  28:'הבניין הנטוש',29:'המעבדה',30:'קרב הצל',
  31:'המפעל',32:'שריפה',
};

// שמירה אוטומטית כל 60 שניות — רק כשלא paused
setInterval(()=>{if(PB&&G.mission>0&&!G.paused)saveGame();},60000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&typeof PB!=='undefined'&&PB&&G.mission>0)saveGame();
});

// הערה: setMission ב-engine.js כבר קורא saveGame() בפנים — אין צורך ב-wrapper נוסף.
function _devJump(n){
  document.getElementById('devPanel').style.display='none';
  if(typeof G!=='undefined'){
    if(n<=G.mission)G.mission=n-1;
    // אפס titan scouts אם קופצים ל-21
    if(n===21){G._titanScoutsSpawned=false;}
    // אפס ch5 scout kills אם קופצים לפרק ה׳
    if(n>=20){_ch5ScoutKills=0;G._ch5ScoutsDone=false;}
    // אפס רקס ally כדי שייוצר מחדש ליד השחקן
    if(n>=20&&n<=24){
      if(G._reksAlly&&G._reksAlly.mesh){try{scene.remove(G._reksAlly.mesh);}catch(_){}}
      G._reksAlly=null;G._reksCollapsing=false;G._reksCollapseT=0;
    }
    // אפס ch6 state אם קופצים לפרק ו׳
    if(n>=25){
      G._ch6BaseVisited=false;G._ch6MarketVisited=false;G._ch6PortVisited=false;
      G._ch6LabVisited=false;G._ch6RecordingPlayed=false;
      G._ch6FactoryVisited=false;G._ch6FireDone=false;
      G._shadowEnemy=null;G._shadowBossDead=false;
      G._bigFireRunning=false;G._fireIntervalDead=true; // עצור interval ישן אם קיים
    }
    G._poolCutPlaying=false;G._reksJoinCutPlaying=false;
  }
  if(typeof setMission==='function') setMission(n);
  // סדר את העולם לפי ה-mission החדש
  setTimeout(()=>{if(typeof _applyWorldState==='function')_applyWorldState(n);},200);
}

// בחירת פרק ממסך בחירת הכלב
window._csChapter=null;
function csStartChapter(n){
  window._csChapter=n;
  if(typeof G!=='undefined'&&G.dog&&G.hud){
    window._csChapter=null;
    if(n<=G.mission)G.mission=n-1;
    if(typeof setMission==='function') setMission(n);
    // סדר את העולם לפי הפרק שנבחר
    setTimeout(()=>{if(typeof _applyWorldState==='function')_applyWorldState(n);},200);
  }
}
document.addEventListener('keydown',function(e){
  // Escape — סגור dev panel (לא toggle — מניעת גישה לא מכוונת)
  if(e.key==='Escape'){
    const p=document.getElementById('devPanel');
    if(p)p.style.display='none';
  }
  // P — השהה / המשך
  if(e.key==='p'||e.key==='P'){
    if(typeof togglePause==='function')togglePause();
  }
});

// ── Override MISSIONS[24].unlock — מעקף קאטסינים תקועים ──
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    if(typeof MISSIONS!=='undefined'&&MISSIONS[24]){
      MISSIONS[24].unlock=function(){
        showN('🏆 לוד שייכת לכלבים לעד! 🐾');
        if(typeof _spawnFinalFireworks==='function')_spawnFinalFireworks();
        setTimeout(()=>{
          if(typeof setMission==='function')setMission(25);
        },3000);
      };
    }
  },500);

  // ════════════════════════════════════════════════
  // 🔊 VOLUME CONTROL
  // ════════════════════════════════════════════════
  const volBtn=document.createElement('button');
  volBtn.id='vol-btn';volBtn.textContent='🔊';volBtn.title='עוצמת קול';
  volBtn.style.cssText='position:fixed;bottom:clamp(80px,15vh,120px);left:10px;z-index:26;background:rgba(0,0,0,.82);border:1.5px solid rgba(245,197,24,.5);color:#f5c518;border-radius:50%;width:42px;height:42px;font-size:18px;cursor:pointer;display:none;pointer-events:all;backdrop-filter:blur(3px);';
  volBtn.onclick=()=>{const p=document.getElementById('vol-panel');if(p)p.style.display=p.style.display==='none'?'block':'none';};
  document.body.appendChild(volBtn);

  const volPanel=document.createElement('div');volPanel.id='vol-panel';
  volPanel.style.cssText='position:fixed;bottom:clamp(130px,20vh,175px);left:10px;z-index:60;background:rgba(0,0,0,.95);border:1.5px solid rgba(245,197,24,.6);border-radius:12px;padding:12px 14px;display:none;min-width:165px;font-family:Arial Hebrew,Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.5);';
  volPanel.innerHTML=`
    <div style="color:#f5c518;font-size:11px;font-weight:bold;margin-bottom:8px;letter-spacing:1px;">🔊 עוצמת קול</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="color:#aaa;font-size:10px;width:40px;">מוזיקה</span>
      <input id="vol-music" type="range" min="0" max="100" value="65" style="flex:1;accent-color:#f5c518;cursor:pointer;" oninput="window._setMusicVol(this.value)">
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button id="vol-mute-btn" onclick="window._toggleMute()" style="flex:1;background:rgba(231,76,60,.2);border:1px solid #e74c3c;color:#e74c3c;border-radius:6px;padding:4px;font-size:11px;cursor:pointer;">🔇 השתק</button>
      <button onclick="document.getElementById('vol-panel').style.display='none'" style="flex:1;background:rgba(255,255,255,.05);border:1px solid #555;color:#aaa;border-radius:6px;padding:4px;font-size:11px;cursor:pointer;">✕ סגור</button>
    </div>`;
  document.body.appendChild(volPanel);

  window._isMuted=false;
  window._setMusicVol=function(val){
    const v=val/100;
    if(typeof _musicGain!=='undefined'&&_musicGain){try{_musicGain.gain.setTargetAtTime(v*0.22,_musicCtx.currentTime,0.3);}catch(e){}}
    try{localStorage.setItem('klb_musicVol',val);}catch(e){}
  };
  window._toggleMute=function(){
    window._isMuted=!window._isMuted;
    const btn=document.getElementById('vol-mute-btn');
    if(window._isMuted){window._setMusicVol(0);if(btn)btn.textContent='🔊 בטל השתק';}
    else{const mv=document.getElementById('vol-music')?.value||65;window._setMusicVol(mv);if(btn)btn.textContent='🔇 השתק';}
  };
  // שחזר עוצמה שמורה
  setTimeout(()=>{try{const mv=localStorage.getItem('klb_musicVol');if(mv){const el=document.getElementById('vol-music');if(el){el.value=mv;window._setMusicVol(mv);}}}catch(e){}},1500);

  // הצג כפתורי עזר אחרי בחירת כלב
  const _volCheck=setInterval(()=>{if(typeof G!=='undefined'&&G.hud){
    volBtn.style.display='block';
    // ── כפתור עץ כישורים ──
    const skBtn=document.createElement('button');
    skBtn.id='sk-open-btn';skBtn.textContent='🌟';skBtn.title='עץ כישורים';
    skBtn.style.cssText='position:fixed;bottom:clamp(130px,22vh,170px);left:10px;z-index:26;background:rgba(0,0,0,.82);border:1.5px solid rgba(52,152,219,.5);color:#3498db;border-radius:50%;width:42px;height:42px;font-size:18px;cursor:pointer;pointer-events:all;backdrop-filter:blur(3px);';
    skBtn.onclick=()=>{if(typeof openSkillTree==='function')openSkillTree();};
    document.body.appendChild(skBtn);
    clearInterval(_volCheck);
  }},500);

  // ════════════════════════════════════════════════
  // 🎮 כישור מיוחד — לחיצה ארוכה על כפתור ⚔️
  // (במקום כפתור נפרד שמוסיף עומס)
  // ════════════════════════════════════════════════
  setTimeout(()=>{
    const atkBtn=document.getElementById('ba');
    if(!atkBtn)return;
    let _holdTimer=null;
    let _didSkill=false;
    atkBtn.addEventListener('touchstart',e=>{
      _didSkill=false;
      _holdTimer=setTimeout(()=>{
        _didSkill=true;
        if(typeof _useSpecialSkill==='function')_useSpecialSkill();
        atkBtn.style.background='rgba(155,89,182,.9)';
        setTimeout(()=>atkBtn.style.background='rgba(231,76,60,.78)',400);
      },400);
    },{passive:true});
    atkBtn.addEventListener('touchend',()=>{
      clearTimeout(_holdTimer);
    },{passive:true});
    atkBtn.addEventListener('touchmove',()=>{
      clearTimeout(_holdTimer);
    },{passive:true});
    // רמז: הוסף תווית קטנה
    const hint=document.createElement('div');
    hint.style.cssText='position:absolute;bottom:-2px;right:-2px;font-size:8px;background:rgba(155,89,182,.9);border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;pointer-events:none;';
    hint.textContent='Q';
    atkBtn.style.position='relative';
    atkBtn.appendChild(hint);
  },800);

  // ════════════════════════════════════════════════
  // 🎬 כותרת פרק — Title Card
  // ════════════════════════════════════════════════
  const CHAPTER_TITLES={
    0:{num:'פרק א׳',sub:'לוד שלנו',color:'#8f8'},
    8:{num:'פרק ב׳',sub:'המסגד הגדול',color:'#8af'},
    12:{num:'פרק ג׳',sub:'השיבה',color:'#f88'},
    15:{num:'פרק ד׳',sub:'העירייה',color:'#ff8'},
    20:{num:'פרק ה׳',sub:'גיסות טיטאן',color:'#f8f'},
    25:{num:'פרק ו׳',sub:'הצל',color:'#8ff'},
  };
  const _chapterMissions=[0,8,12,15,20,25];
  let _lastChapterShown=-1;

  // CSS לכותרת פרק
  const chStyle=document.createElement('style');chStyle.textContent=`
    @keyframes chapterIn{0%{opacity:0;transform:translate(-50%,-50%) scale(1.18)}18%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(0.92)}}
    #chapter-title-ov{animation:chapterIn 3.2s cubic-bezier(.22,1,.36,1) forwards;pointer-events:none;}
  `;document.head.appendChild(chStyle);

  const chEl=document.createElement('div');chEl.id='chapter-title-ov';
  chEl.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300;text-align:center;font-family:Arial Hebrew,Arial,sans-serif;display:none;pointer-events:none;';
  document.body.appendChild(chEl);

  window._showChapterTitle=function(missionNum){
    const ch=CHAPTER_TITLES[missionNum];if(!ch)return;
    if(typeof G!=='undefined'&&(G.paused||G.dlgOpen))return;
    chEl.innerHTML=`<div style="background:rgba(0,0,0,0.82);border:2px solid ${ch.color};border-radius:16px;padding:clamp(14px,4vw,28px) clamp(28px,8vw,60px);box-shadow:0 0 60px rgba(0,0,0,.8),0 0 30px ${ch.color}44;"><div style="color:${ch.color};font-size:clamp(11px,2.5vw,14px);letter-spacing:4px;margin-bottom:8px;text-shadow:0 0 12px ${ch.color};">🐕 כלבי לוד</div><div style="color:#fff;font-size:clamp(26px,7vw,52px);font-weight:bold;letter-spacing:3px;margin-bottom:6px;">${ch.num}</div><div style="color:${ch.color};font-size:clamp(14px,3.5vw,22px);letter-spacing:2px;font-style:italic;text-shadow:0 0 16px ${ch.color};">"${ch.sub}"</div></div>`;
    chEl.style.display='block';chEl.style.animation='none';void chEl.offsetWidth;
    chEl.style.animation='chapterIn 3.2s cubic-bezier(.22,1,.36,1) forwards';
    setTimeout(()=>chEl.style.display='none',3300);
  };

  // hook לsetMission — זיהוי מעבר פרק
  const _origSM=window.setMission;
  if(typeof _origSM==='function'){
    window.setMission=function(n){
      _origSM(n);
      // stats screen
      if(typeof _missionStartStats!=='undefined'&&_missionStartStats&&n>_missionStartStats.mission){
        setTimeout(()=>_showMissionStats(n,_missionStartStats),200);
      }
      _missionStartStats={kills:G.enemiesKilled||0,terrs:G.terrCnt||0,score:G.score||0,coins:G.coins||0,time:Date.now(),mission:G.mission||0};
      // chapter title
      const ch=_chapterMissions.find(m=>m===n);
      if(ch!==undefined&&ch!==_lastChapterShown){_lastChapterShown=ch;setTimeout(()=>window._showChapterTitle(ch),800);}
    };
  }

  // ════════════════════════════════════════════════
  // 📊 STATS SCREEN בין משימות
  // ════════════════════════════════════════════════
  const statsEl=document.createElement('div');statsEl.id='mission-stats-ov';
  statsEl.style.cssText='position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:180;pointer-events:all;background:rgba(0,0,0,0.88);font-family:Arial Hebrew,Arial,sans-serif;';
  document.body.appendChild(statsEl);

  window._showMissionStats=function(newM,startStats){
    if(!startStats||!G)return;
    if(G.paused||G.cutOpen)return;
    const kills=(G.enemiesKilled||0)-startStats.kills;
    const terrs=(G.terrCnt||0)-startStats.terrs;
    const score=(G.score||0)-startStats.score;
    const coins=(G.coins||0)-startStats.coins;
    if(kills===0&&terrs===0&&score===0)return;
    const timeSec=Math.round((Date.now()-startStats.time)/1000);
    const timeStr=timeSec>60?`${Math.floor(timeSec/60)}:${String(timeSec%60).padStart(2,'0')}`:`${timeSec}s`;
    const dog=G.dogs[G.dog];
    const card=(icon,label,val)=>`<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 6px;border:1px solid rgba(255,255,255,0.08);"><div style="font-size:1.4em">${icon}</div><div style="color:#f5c518;font-weight:bold;font-size:clamp(13px,3.5vw,18px);">${val}</div><div style="color:#888;font-size:clamp(9px,2vw,11px);margin-top:2px;">${label}</div></div>`;
    statsEl.innerHTML=`<div style="background:linear-gradient(160deg,rgba(10,20,10,0.98),rgba(0,0,0,0.99));border:2px solid #f5c518;border-radius:18px;padding:clamp(14px,4vw,28px) clamp(18px,6vw,40px);text-align:center;max-width:min(360px,90vw);box-shadow:0 0 40px rgba(245,197,24,0.2);"><div style="font-size:clamp(13px,3vw,16px);color:#f5c518;letter-spacing:3px;margin-bottom:6px;">✅ משימה הושלמה!</div><div style="font-size:clamp(18px,5vw,28px);font-weight:bold;color:#fff;margin-bottom:18px;">📊 סיכום</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">${card('⚔️','אויבים',kills)}${card('🏴','שטחים',terrs)}${card('⭐','ניקוד','+'+score)}${card('💰','מטבעות','+'+coins)}${card('⏱️','זמן',timeStr)}${card('🐾','רמה',dog.lv)}</div><button onclick="document.getElementById('mission-stats-ov').style.display='none'" style="background:linear-gradient(135deg,#f5c518,#d4a017);color:#000;border:none;border-radius:12px;padding:clamp(9px,2.5vw,13px) clamp(28px,8vw,50px);font-size:clamp(14px,3.5vw,18px);font-weight:bold;cursor:pointer;width:100%;">המשך ▶</button></div>`;
    statsEl.style.display='flex';
    setTimeout(()=>{if(statsEl.style.display!=='none')statsEl.style.display='none';},8000);
  };

  // ════════════════════════════════════════════════
  // 🎓 TUTORIAL TOOLTIPS
  // ════════════════════════════════════════════════
  const tutStyle=document.createElement('style');tutStyle.textContent=`
    @keyframes tutIn{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes tutOut{from{opacity:1}to{opacity:0}}
  `;document.head.appendChild(tutStyle);

  const tutEl=document.createElement('div');tutEl.id='tutorial-toast';
  tutEl.style.cssText='position:fixed;bottom:clamp(170px,28vh,220px);left:50%;transform:translateX(-50%);background:rgba(0,20,40,0.95);border:1.5px solid #3498db;border-radius:10px;padding:8px 16px;color:#fff;font-size:clamp(11px,2.8vw,14px);z-index:55;display:none;pointer-events:none;text-align:center;max-width:80vw;font-family:Arial Hebrew,Arial,sans-serif;box-shadow:0 0 16px rgba(52,152,219,0.3);';
  document.body.appendChild(tutEl);

  let _shownTuts={};try{_shownTuts=JSON.parse(localStorage.getItem('klb_tutorials')||'{}');}catch(e){}
  const _TUTS=[
    {id:'move',delay:2500,text:'🕹️ W/A/S/D לתנועה, עכבר/גרירה לסיבוב מצלמה',mission:0},
    {id:'interact',delay:6000,text:'🟢 לחץ E ליד NPC לשוחח, ליד אוכל לאסוף',mission:0},
    {id:'attack',delay:4000,text:'⚔️ לחץ F לתקיפה — Q לכישור מיוחד',mission:3},
    {id:'combo',delay:3000,text:'💥 קולין: 4 מכות רצופות = מתקפת STUN!',mission:3,dog:'colin'},
    {id:'dash',delay:3000,text:'⚡ זיפו: Q = Dash Attack לקדימה',mission:3,dog:'zippo'},
    {id:'charm',delay:3000,text:'💜 מומו: Q = קסם אויב לצדנו ל-8 שניות',mission:3,dog:'momo'},
    {id:'map',delay:8000,text:'🗺️ לחץ על המיניmap לפתיחת מפה מלאה',mission:1},
    {id:'territory',delay:4000,text:'🏴 עמוד על הדגל כדי לכבוש שטח',mission:2},
  ];

  window._showTutorialToast=function(text){
    if(typeof G!=='undefined'&&(G.paused||G.dlgOpen||G.cutOpen)){setTimeout(()=>window._showTutorialToast(text),2000);return;}
    tutEl.textContent=text;tutEl.style.display='block';tutEl.style.animation='none';void tutEl.offsetWidth;
    tutEl.style.animation='tutIn 0.4s ease-out forwards';
    setTimeout(()=>{tutEl.style.animation='tutOut 0.5s ease-in forwards';setTimeout(()=>tutEl.style.display='none',500);},3500);
  };

  setInterval(()=>{
    if(typeof G==='undefined'||!G.hud)return;
    _TUTS.forEach(t=>{
      if(_shownTuts[t.id])return;
      if(G.mission<t.mission)return;
      if(t.dog&&G.dog!==t.dog)return;
      _shownTuts[t.id]=true;
      try{localStorage.setItem('klb_tutorials',JSON.stringify(_shownTuts));}catch(e){}
      setTimeout(()=>window._showTutorialToast(t.text),t.delay);
    });
  },3000);

});
