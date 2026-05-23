// ══════════════════════════════════════════════════════════
// improvements.js — שיפורים ושדרוגים ל"כלבי לוד"
// הוסף את השורה הבאה לindex.html לפני </body>:
//   <script src="improvements.js"></script>
// ══════════════════════════════════════════════════════════

// ════════════════════════════════════════════════
// 1. 🎮 כישורים ייחודיים לכל כלב (מגוון קרב)
//    קולין: Combo + Stun
//    זיפו:  Dash Attack + Dodge
//    מומו:  Charm (הפוך אויב לעוזר זמני)
// ════════════════════════════════════════════════

// ── מונה combo ──
let _comboCount = 0;
let _comboTimer = 0;
const _COMBO_WINDOW = 1.4; // שניות בין מכות לשמירת combo

// ── Charm state ──
let _charmedEnemy = null;
let _charmedTimer = 0;
const _CHARM_DUR = 8; // שניות

// ── Dodge state (זיפו) ──
let _dashCooldown = 0;
let _dashActive = false;
let _dashTimer = 0;
const _DASH_DUR = 0.22;
const _DASH_SPEED = 28;
const _DASH_CD = 2.5;
let _dashVX = 0, _dashVZ = 0;

// ── Stun state (קולין) ──
let _stunCooldown = 0;
const _STUN_CD = 4;

// override doAtk המקורי — עוטף אותו עם לוגיקת כישור
const _origDoAtk = window.doAtk;
window.doAtk = function() {
  if (typeof _origDoAtk === 'function') _origDoAtk();
  _handleSkill();
};

function _handleSkill() {
  if (!G || !G.dog || !PB) return;
  const dog = G.dog;

  // ── קולין: Combo ──
  if (dog === 'colin') {
    _comboCount++;
    _comboTimer = _COMBO_WINDOW;
    _showComboHit(_comboCount);

    // כל 4 מכות — Stun Attack חזק
    if (_comboCount >= 4) {
      _comboCount = 0;
      if (_stunCooldown <= 0) {
        _colinStunAttack();
        _stunCooldown = _STUN_CD;
      }
    }
  }

  // ── זיפו: Dash Attack אוטומטי אם CD פנוי ──
  if (dog === 'zippo' && _dashCooldown <= 0 && !_dashActive) {
    // Dash לכיוון תנועה
    const fwdX = -Math.sin(G.yaw);
    const fwdZ = -Math.cos(G.yaw);
    _dashVX = fwdX * _DASH_SPEED;
    _dashVZ = fwdZ * _DASH_SPEED;
    _dashActive = true;
    _dashTimer = _DASH_DUR;
    _dashCooldown = _DASH_CD;
    spawnPfx(PB.position.x, 0.5, PB.position.z, 0x3498db, 6);
    showN('⚡ Dash Attack!');
  }

  // ── מומו: Charm ──
  if (dog === 'momo') {
    _momoCharm();
  }
}

function _showComboHit(n) {
  if (n <= 1) return;
  const labels = { 2: '2x Combo!', 3: '3x Combo!! 🔥', 4: '⚡ STUN INCOMING!' };
  const txt = labels[n];
  if (!txt) return;
  let el = document.getElementById('combo-pop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'combo-pop';
    el.style.cssText = `
      position:fixed; top:38%; left:50%; transform:translate(-50%,-50%);
      font-size:clamp(18px,5vw,28px); font-weight:bold; color:#f5c518;
      text-shadow:0 0 16px #f5c518, 0 2px 4px #000;
      pointer-events:none; z-index:60; display:none;
      font-family:Arial Hebrew, Arial, sans-serif;
    `;
    document.body.appendChild(el);
  }
  el.textContent = txt;
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'floatUp 0.9s ease-out forwards';
  setTimeout(() => { el.style.display = 'none'; }, 900);
}

function _colinStunAttack() {
  if (!PB) return;
  const px = PB.position.x, pz = PB.position.z;
  const dog = G.dogs['colin'];
  const dmg = dog.pow * 25 * (1 + dog.lv * 0.12);
  let stunned = 0;
  // פגיעה בכל אויב בטווח 5
  G.enemies.forEach(e => {
    if (e.hp <= 0 || !e.mesh.visible) return;
    const dist = Math.sqrt((e.mesh.position.x - px) ** 2 + (e.mesh.position.z - pz) ** 2);
    if (dist < 5.5) {
      e.hp = Math.max(0, e.hp - dmg);
      e._stunned = true;
      e._stunnedT = 2.5; // 2.5 שניות stunned
      spawnPfx(e.mesh.position.x, 1, e.mesh.position.z, 0xf5c518, 10);
      if (e.bar) e.bar.material.color.setHex(0xffff00);
      stunned++;
    }
  });
  if (stunned > 0) {
    showN(`💥 STUN! קולין השתיק ${stunned} אויבים!`);
    if (typeof haptic === 'function') haptic([100, 40, 100]);
    if (typeof sCapture === 'function') sCapture();
  }
  // אפקט פיצוץ אדמה
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spawnPfx(px + Math.cos(a) * 2.5, 0.3, pz + Math.sin(a) * 2.5, 0xe67e22, 3);
  }
}

function _momoCharm() {
  if (!PB) return;
  // אם כבר יש אויב מוקסם — בטל
  if (_charmedEnemy) {
    _releaseCharm();
    return;
  }
  const px = PB.position.x, pz = PB.position.z;
  let closest = null, bestDist = 12;
  G.enemies.forEach(e => {
    if (e.hp <= 0 || !e.mesh.visible) return;
    const dist = Math.sqrt((e.mesh.position.x - px) ** 2 + (e.mesh.position.z - pz) ** 2);
    if (dist < bestDist) { bestDist = dist; closest = e; }
  });
  if (!closest) { showN('💜 אין אויב קרוב לקסום!'); return; }

  // סמן את האויב כ"מוקסם"
  _charmedEnemy = closest;
  _charmedTimer = _CHARM_DUR;
  closest._charmed = true;
  // צבע ורוד
  closest.mesh.traverse(c => {
    if (c.isMesh && c.material) {
      c._origColor = c.material.color.getHex();
      c.material = c.material.clone();
      c.material.color.setHex(0xff69b4);
      c.material.emissive = new THREE.Color(0x550033);
    }
  });
  // הילה ורודה
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 7, 7),
    new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true, opacity: 0.22, depthWrite: false })
  );
  aura.name = '_charmAura';
  closest.mesh.add(aura);
  spawnPfx(closest.mesh.position.x, 1.5, closest.mesh.position.z, 0xff69b4, 12);
  showN(`💜 קסם! האויב עובד לצדנו ל-${_CHARM_DUR} שניות!`);
  if (typeof haptic === 'function') haptic([30, 15, 50]);
}

function _releaseCharm() {
  if (!_charmedEnemy) return;
  const e = _charmedEnemy;
  e._charmed = false;
  // שחזר צבע מקורי
  e.mesh.traverse(c => {
    if (c.isMesh && c.material && c._origColor !== undefined) {
      c.material.color.setHex(c._origColor);
      c.material.emissive = new THREE.Color(0x000000);
      delete c._origColor;
    }
  });
  const aura = e.mesh.getObjectByName('_charmAura');
  if (aura) e.mesh.remove(aura);
  _charmedEnemy = null;
  _charmedTimer = 0;
}

// ── עדכון skill בכל frame — hook לתוך loop ──
const _origLoop = window.loop;
window.loop = function() {
  // אל תקרא לloop המקורי שוב — רק הוסף לתוכו
  // במקום זה, עדכן state בכל requestAnimationFrame
  _skillUpdate();
  if (typeof _origLoop === 'function') _origLoop();
};

// ── הסרת loop כפול — במקום לעטוף, hook אחרי init ──
// גישה נכונה: השתמש ב-requestAnimationFrame נוסף
(function _skillLoop() {
  requestAnimationFrame(_skillLoop);
  if (!G || !PB) return;
  const dt = 1 / 60; // קירוב

  // Combo timer
  if (_comboTimer > 0) {
    _comboTimer -= dt;
    if (_comboTimer <= 0) _comboCount = 0;
  }

  // Stun cooldown + enemies
  if (_stunCooldown > 0) _stunCooldown -= dt;
  G.enemies && G.enemies.forEach(e => {
    if (e._stunned) {
      e._stunnedT -= dt;
      // אויב stunned לא זז
      e.state = 'patrol';
      if (e._stunnedT <= 0) { e._stunned = false; delete e._stunnedT; }
    }
    // אויב מוקסם — תוקף אויבים אחרים
    if (e._charmed && e.hp > 0 && e.mesh.visible) {
      let nearestFoe = null; let bd2 = 999;
      G.enemies.forEach(f => {
        if (f === e || f._charmed || f.hp <= 0) return;
        const d = (f.mesh.position.x - e.mesh.position.x) ** 2 + (f.mesh.position.z - e.mesh.position.z) ** 2;
        if (d < bd2) { bd2 = d; nearestFoe = f; }
      });
      if (nearestFoe && bd2 < 25) {
        nearestFoe.hp = Math.max(0, nearestFoe.hp - 6 * dt * 20);
        if (nearestFoe.hp <= 0) {
          nearestFoe.mesh.visible = false;
          if (typeof sEDie === 'function') sEDie();
          if (typeof addXP === 'function') addXP(15);
        }
      }
    }
  });

  // Charm timer
  if (_charmedTimer > 0) {
    _charmedTimer -= dt;
    if (_charmedTimer <= 0) { _releaseCharm(); showN('💜 הקסם פג.'); }
  }

  // Dash (זיפו)
  if (_dashCooldown > 0) _dashCooldown -= dt;
  if (_dashActive && PB) {
    PB.position.x += _dashVX * dt;
    PB.position.z += _dashVZ * dt;
    _dashVX *= 0.78;
    _dashVZ *= 0.78;
    _dashTimer -= dt;
    if (_dashTimer <= 0) { _dashActive = false; }
  }
})();

function _skillUpdate() {} // placeholder — הלוגיקה ב-_skillLoop

// ── כפתור מובייל לכישור מיוחד ──
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const abs = document.getElementById('abs');
    if (!abs) return;
    const skillBtn = document.createElement('div');
    skillBtn.className = 'ab';
    skillBtn.id = 'skill-btn';
    skillBtn.style.cssText = `
      background:rgba(155,89,182,.85);border-color:#9b59b6;
      font-size:clamp(16px,4vw,22px);
    `;
    skillBtn.textContent = '💜';
    skillBtn.title = 'כישור מיוחד';
    skillBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _useSpecialSkill(); });
    skillBtn.addEventListener('click', _useSpecialSkill);
    abs.appendChild(skillBtn);
  }, 800);
});

function _useSpecialSkill() {
  if (!G || !G.dog) return;
  if (G.dog === 'colin') { _colinStunAttack(); _stunCooldown = _STUN_CD; }
  else if (G.dog === 'zippo') { _dashCooldown = 0; if (typeof doAtk === 'function') doAtk(); }
  else if (G.dog === 'momo') { _momoCharm(); }
}

// קיצור מקלדת Q לכישור מיוחד
document.addEventListener('keydown', e => {
  if (e.code === 'KeyQ' && !G.paused && !G.dlgOpen) _useSpecialSkill();
});


// ════════════════════════════════════════════════
// 2. 📍 מרקר יעד על המיניmap (נקודה מהבהבת)
//    כבר קיים בסיסי — משפרים ל"Pin" מדויק עם כיתוב
// ════════════════════════════════════════════════
// hook drawMM המקורי — הוסף pin ברור יותר
const _origDrawMM = window.drawMM;
window.drawMM = function() {
  if (typeof _origDrawMM === 'function') _origDrawMM();
  // ציור פין יעד מעל הכול
  if (!mmCtx || !_navTargetWorld || !PB) return;
  const ctx = mmCtx, W = 120, H = 120, sc = 0.58;
  const px = PB.position.x, pz = PB.position.z;
  const cx = W / 2 - px * sc, cy = H / 2 - pz * sc;
  const tx = cx + _navTargetWorld.x * sc;
  const tz = cy + _navTargetWorld.z * sc;
  const t = Date.now() * 0.005;
  const pulse = 0.6 + Math.sin(t) * 0.4;

  // עיגול מהבהב גדול
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#f5c518';
  ctx.beginPath();
  ctx.arc(tx, tz, 5, 0, Math.PI * 2);
  ctx.fill();
  // הילה חיצונית
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = pulse * 0.5;
  ctx.beginPath();
  ctx.arc(tx, tz, 8, 0, Math.PI * 2);
  ctx.stroke();
  // כיתוב קטן
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎯', tx, tz + 2.5);
  ctx.restore();
};


// ════════════════════════════════════════════════
// 3. 💀 מסך מוות משופר — fade, אנימציה, respawn מ-checkpoint
// ════════════════════════════════════════════════
const _origPlayerDeath = window.playerDeath;
window.playerDeath = function() {
  if (typeof _dyingLock !== 'undefined' && _dyingLock) return;
  if (typeof _origPlayerDeath === 'function') _origPlayerDeath();
  // שפר את המסך שנוצר
  setTimeout(_enhanceDeathScreen, 50);
};

function _enhanceDeathScreen() {
  const ov = document.getElementById('death-ov');
  if (!ov || ov._enhanced) return;
  ov._enhanced = true;

  // רקע שחור עם אנימציית fade
  ov.style.cssText += `
    background: radial-gradient(ellipse at center, rgba(80,0,0,0.97), rgba(0,0,0,0.98));
    animation: deathFadeIn 0.6s ease-out forwards;
  `;

  // הוסף CSS animation אם לא קיים
  if (!document.getElementById('death-style')) {
    const style = document.createElement('style');
    style.id = 'death-style';
    style.textContent = `
      @keyframes deathFadeIn {
        from { opacity: 0; } to { opacity: 1; }
      }
      @keyframes deathShake {
        0%,100% { transform:translateX(0); }
        20% { transform:translateX(-8px); }
        40% { transform:translateX(8px); }
        60% { transform:translateX(-5px); }
        80% { transform:translateX(5px); }
      }
      #death-ov .death-icon {
        font-size: clamp(52px, 14vw, 88px);
        animation: deathShake 0.5s ease-in-out 0.3s;
        display: block; text-align: center; margin-bottom: 10px;
      }
      #death-ov .death-title {
        color: #ff3333;
        font-size: clamp(22px, 6vw, 44px);
        font-weight: bold;
        text-shadow: 0 0 30px #ff0000, 0 0 60px #880000;
        margin-bottom: 8px;
        letter-spacing: 3px;
      }
      #death-ov .death-sub {
        color: #888; font-size: clamp(12px,3vw,15px);
        margin-bottom: 28px; line-height: 1.6;
        text-align: center; max-width: 80vw;
      }
      #death-btn {
        background: linear-gradient(135deg, #f5c518, #d4a017) !important;
        color: #000 !important; border: none !important;
        border-radius: 14px !important;
        padding: clamp(10px,3vw,14px) clamp(28px,8vw,48px) !important;
        font-size: clamp(14px,4vw,20px) !important;
        font-weight: bold !important; cursor: pointer !important;
        box-shadow: 0 0 24px rgba(245,197,24,0.55) !important;
        letter-spacing: 2px !important;
        animation: none !important;
        transition: transform 0.15s !important;
      }
      #death-btn:active { transform: scale(0.93) !important; }
      #death-stats {
        color: #666; font-size: clamp(10px,2.5vw,13px);
        margin-top: 16px; line-height: 1.7; text-align:center;
      }
    `;
    document.head.appendChild(style);
  }

  // בנה HTML חדש
  const dog = G.dogs[G.dog];
  const penalty = Math.min(G.score, Math.floor(G.score * 0.1));
  const tipMessages = [
    'טיפ: לחץ Q לכישור מיוחד',
    'טיפ: מומו יכולה לקסום אויבים עם Q',
    'טיפ: זיפו מבצע Dash עם Q',
    'טיפ: קולין STUN מופעל לאחר 4 מכות',
    'טיפ: אסוף אוכל 🍖 לחידוש בריאות',
    'טיפ: הכנס לחנות לרכישת שדרוגים',
  ];
  const tip = tipMessages[Math.floor(Math.random() * tipMessages.length)];

  ov.innerHTML = `
    <div class="death-icon">💀</div>
    <div class="death-title">נפלת!</div>
    <div class="death-sub">
      ${penalty > 0 ? `-${penalty} ניקוד` : 'ללא עונש ניקוד'}<br>
      <span style="color:#555;font-size:0.85em">${tip}</span>
    </div>
    <button id="death-btn" onclick="playerRespawn()">קום והמשך ▶</button>
    <div id="death-stats">
      ❤️ ${Math.round(dog.hp)}/${dog.mhp} HP אחרי ריספאון
      &nbsp;•&nbsp; ⭐ רמה ${dog.lv}
      &nbsp;•&nbsp; 💰 ${G.coins} מטבעות
    </div>
  `;
}


// ════════════════════════════════════════════════
// 4. 📊 Stats screen בין משימות
//    מוצג בסוף כל mission לפני הבאה
// ════════════════════════════════════════════════
let _missionStartStats = null;

// שמור stats בתחילת משימה
const _origSetMission = window.setMission;
window.setMission = function(n) {
  if (typeof G !== 'undefined' && PB) {
    _missionStartStats = {
      kills: G.enemiesKilled || 0,
      terrs: G.terrCnt || 0,
      score: G.score || 0,
      coins: G.coins || 0,
      time: Date.now(),
      mission: G.mission || 0,
    };
  }
  if (typeof _origSetMission === 'function') _origSetMission(n);
  // הצג stats אחרי עיכוב קצר
  setTimeout(() => _showMissionStats(n), 200);
};

function _showMissionStats(newMission) {
  if (!_missionStartStats || !G) return;
  if (newMission <= _missionStartStats.mission) return; // לא הקדמה
  if (newMission === 0) return;
  if (G.paused || G.cutOpen) return; // אל תפריע לקאטסין

  const killsDelta = (G.enemiesKilled || 0) - _missionStartStats.kills;
  const terrsDelta = (G.terrCnt || 0) - _missionStartStats.terrs;
  const scoreDelta = (G.score || 0) - _missionStartStats.score;
  const coinsDelta = (G.coins || 0) - _missionStartStats.coins;
  const timeSec = Math.round((Date.now() - _missionStartStats.time) / 1000);
  const timeStr = timeSec > 60
    ? `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, '0')}`
    : `${timeSec}s`;

  // הצג רק אם יש משהו מעניין
  if (killsDelta === 0 && terrsDelta === 0 && scoreDelta === 0) return;

  let el = document.getElementById('mission-stats-ov');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mission-stats-ov';
    el.style.cssText = `
      position:fixed; inset:0; display:none; align-items:center;
      justify-content:center; z-index:180; pointer-events:all;
      background:rgba(0,0,0,0.88);
      font-family:Arial Hebrew, Arial, sans-serif;
    `;
    document.body.appendChild(el);
  }

  const dog = G.dogs[G.dog];
  el.innerHTML = `
    <div style="
      background:linear-gradient(160deg,rgba(10,20,10,0.98),rgba(0,0,0,0.99));
      border:2px solid #f5c518; border-radius:18px;
      padding:clamp(14px,4vw,28px) clamp(18px,6vw,40px);
      text-align:center; max-width:min(360px,90vw);
      box-shadow:0 0 40px rgba(245,197,24,0.2);
    ">
      <div style="font-size:clamp(13px,3vw,16px);color:#f5c518;letter-spacing:3px;margin-bottom:6px;">
        ✅ משימה הושלמה!
      </div>
      <div style="font-size:clamp(18px,5vw,28px);font-weight:bold;color:#fff;margin-bottom:18px;">
        📊 סיכום
      </div>
      <div style="
        display:grid;grid-template-columns:1fr 1fr;gap:8px;
        margin-bottom:20px;text-align:center;
      ">
        ${_statCard('⚔️', 'אויבים הוכנעו', killsDelta)}
        ${_statCard('🏴', 'שטחים נכבשו', terrsDelta)}
        ${_statCard('⭐', 'ניקוד הושג', '+' + scoreDelta)}
        ${_statCard('💰', 'מטבעות', '+' + coinsDelta)}
        ${_statCard('⏱️', 'זמן משימה', timeStr)}
        ${_statCard('🐾', 'רמה נוכחית', dog.lv)}
      </div>
      <button id="stats-continue-btn" style="
        background:linear-gradient(135deg,#f5c518,#d4a017);
        color:#000; border:none; border-radius:12px;
        padding:clamp(9px,2.5vw,13px) clamp(28px,8vw,50px);
        font-size:clamp(14px,3.5vw,18px); font-weight:bold;
        cursor:pointer; letter-spacing:1px; width:100%;
      ">המשך ▶</button>
    </div>
  `;
  el.style.display = 'flex';
  el.style.animation = 'none';

  document.getElementById('stats-continue-btn').onclick = () => {
    el.style.display = 'none';
    _missionStartStats = null;
  };

  // סגירה אוטומטית אחרי 8 שניות
  setTimeout(() => { if (el.style.display !== 'none') el.style.display = 'none'; }, 8000);
}

function _statCard(icon, label, value) {
  return `
    <div style="
      background:rgba(255,255,255,0.05); border-radius:10px;
      padding:8px 6px; border:1px solid rgba(255,255,255,0.08);
    ">
      <div style="font-size:1.4em">${icon}</div>
      <div style="color:#f5c518;font-weight:bold;font-size:clamp(13px,3.5vw,18px);">${value}</div>
      <div style="color:#888;font-size:clamp(9px,2vw,11px);margin-top:2px;">${label}</div>
    </div>
  `;
}


// ════════════════════════════════════════════════
// 5. 🔊 Volume Control — סליידר בתפריט
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(_buildVolumeControl, 1000);
});

function _buildVolumeControl() {
  // כפתור פתיחה
  const btn = document.createElement('button');
  btn.id = 'vol-btn';
  btn.textContent = '🔊';
  btn.title = 'עוצמת קול';
  btn.style.cssText = `
    position:fixed; bottom:clamp(80px,15vh,120px); left:10px;
    z-index:26; background:rgba(0,0,0,.82); border:1.5px solid rgba(245,197,24,.5);
    color:#f5c518; border-radius:50%; width:42px; height:42px;
    font-size:18px; cursor:pointer; display:none; pointer-events:all;
    backdrop-filter:blur(3px);
  `;
  btn.onclick = _toggleVolPanel;
  document.body.appendChild(btn);

  // פאנל
  const panel = document.createElement('div');
  panel.id = 'vol-panel';
  panel.style.cssText = `
    position:fixed; bottom:clamp(130px,20vh,175px); left:10px;
    z-index:60; background:rgba(0,0,0,.95);
    border:1.5px solid rgba(245,197,24,.6); border-radius:12px;
    padding:12px 14px; display:none; min-width:160px;
    font-family:Arial Hebrew, Arial, sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,.5);
  `;
  panel.innerHTML = `
    <div style="color:#f5c518;font-size:11px;font-weight:bold;margin-bottom:8px;letter-spacing:1px;">🔊 עוצמת קול</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="color:#aaa;font-size:10px;width:40px;">מוזיקה</span>
      <input id="vol-music" type="range" min="0" max="100" value="65"
        style="flex:1;accent-color:#f5c518;cursor:pointer;"
        oninput="_setMusicVol(this.value)">
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="color:#aaa;font-size:10px;width:40px;">SFX</span>
      <input id="vol-sfx" type="range" min="0" max="100" value="80"
        style="flex:1;accent-color:#3498db;cursor:pointer;"
        oninput="_setSfxVol(this.value)">
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button onclick="_toggleMute()" id="vol-mute-btn"
        style="flex:1;background:rgba(231,76,60,.2);border:1px solid #e74c3c;color:#e74c3c;
               border-radius:6px;padding:4px;font-size:11px;cursor:pointer;">
        🔇 השתק
      </button>
      <button onclick="document.getElementById('vol-panel').style.display='none'"
        style="flex:1;background:rgba(255,255,255,.05);border:1px solid #555;color:#aaa;
               border-radius:6px;padding:4px;font-size:11px;cursor:pointer;">
        ✕ סגור
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // הצג כפתור כשמשחק מתחיל
  const _checkHUD = setInterval(() => {
    if (typeof G !== 'undefined' && G.hud) {
      btn.style.display = 'block';
      clearInterval(_checkHUD);
    }
  }, 500);
}

let _isMuted = false;
let _sfxVolume = 0.8;

function _toggleVolPanel() {
  const p = document.getElementById('vol-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function _setMusicVol(val) {
  const v = val / 100;
  if (typeof _musicGain !== 'undefined' && _musicGain) {
    try { _musicGain.gain.setTargetAtTime(v * 0.22, _musicCtx.currentTime, 0.3); } catch(e) {}
  }
  // שמור
  try { localStorage.setItem('klb_musicVol', val); } catch(e) {}
}

function _setSfxVol(val) {
  _sfxVolume = val / 100;
  try { localStorage.setItem('klb_sfxVol', val); } catch(e) {}
}

function _toggleMute() {
  _isMuted = !_isMuted;
  const btn = document.getElementById('vol-mute-btn');
  if (_isMuted) {
    _setMusicVol(0);
    _sfxVolume = 0;
    if (btn) btn.textContent = '🔊 בטל השתק';
  } else {
    const musicVal = document.getElementById('vol-music')?.value || 65;
    const sfxVal = document.getElementById('vol-sfx')?.value || 80;
    _setMusicVol(musicVal);
    _sfxVolume = sfxVal / 100;
    if (btn) btn.textContent = '🔇 השתק';
  }
}

// שחזר עוצמת קול שמורה
setTimeout(() => {
  try {
    const mv = localStorage.getItem('klb_musicVol');
    const sv = localStorage.getItem('klb_sfxVol');
    if (mv) {
      const el = document.getElementById('vol-music');
      if (el) { el.value = mv; _setMusicVol(mv); }
    }
    if (sv) {
      const el = document.getElementById('vol-sfx');
      if (el) { el.value = sv; _sfxVolume = sv / 100; }
    }
  } catch(e) {}
}, 1500);


// ════════════════════════════════════════════════
// 6. 📳 Haptic בכל פגיעה קרבית (מובייל)
//    override dmgPlayer ו-doAtk לוודא haptic תמיד
// ════════════════════════════════════════════════
const _origDmgPlayer = window.dmgPlayer;
window.dmgPlayer = function(dmg) {
  // הפעל haptic חזק לפי עוצמת נזק
  if (typeof haptic === 'function') {
    if (dmg >= 20) haptic([80, 30, 60]);
    else if (dmg >= 10) haptic([50, 20, 40]);
    else haptic(25);
  }
  if (typeof _origDmgPlayer === 'function') _origDmgPlayer(dmg);
};


// ════════════════════════════════════════════════
// 7. 🎬 כותרת פרק — Full-screen Title Card
//    מופיעה בתחילת כל פרק חדש
// ════════════════════════════════════════════════

const CHAPTER_TITLES = {
  0:  { num: 'פרק א׳', sub: 'לוד שלנו', color: '#8f8' },
  8:  { num: 'פרק ב׳', sub: 'המסגד הגדול', color: '#8af' },
  12: { num: 'פרק ג׳', sub: 'השיבה', color: '#f88' },
  15: { num: 'פרק ד׳', sub: 'העירייה', color: '#ff8' },
  20: { num: 'פרק ה׳', sub: 'גיסות טיטאן', color: '#f8f' },
  25: { num: 'פרק ו׳', sub: 'הצל', color: '#8ff' },
};

// hook לזיהוי מעבר פרק
const _chapterMissions = [0, 8, 12, 15, 20, 25];
let _lastChapterShown = -1;

// wrap setMission לזיהוי מעבר פרק
const _origSetMission2 = window.setMission;
window.setMission = function(n) {
  if (typeof _origSetMission2 === 'function') _origSetMission2(n);
  const chapterStart = _chapterMissions.find(m => m === n);
  if (chapterStart !== undefined && chapterStart !== _lastChapterShown) {
    _lastChapterShown = chapterStart;
    setTimeout(() => _showChapterTitle(chapterStart), 800);
  }
};

function _showChapterTitle(missionNum) {
  const ch = CHAPTER_TITLES[missionNum];
  if (!ch) return;
  if (G && (G.paused || G.dlgOpen)) return;

  // CSS
  if (!document.getElementById('chapter-title-style')) {
    const s = document.createElement('style');
    s.id = 'chapter-title-style';
    s.textContent = `
      @keyframes chapterIn {
        0%   { opacity:0; transform:translate(-50%,-50%) scale(1.18); }
        18%  { opacity:1; transform:translate(-50%,-50%) scale(1.0); }
        70%  { opacity:1; transform:translate(-50%,-50%) scale(1.0); }
        100% { opacity:0; transform:translate(-50%,-50%) scale(0.92); }
      }
      #chapter-title-ov {
        animation: chapterIn 3.2s cubic-bezier(.22,1,.36,1) forwards;
        pointer-events: none;
      }
    `;
    document.head.appendChild(s);
  }

  let el = document.getElementById('chapter-title-ov');
  if (!el) {
    el = document.createElement('div');
    el.id = 'chapter-title-ov';
    el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      z-index:300; text-align:center;
      font-family:Arial Hebrew, Arial, sans-serif;
      display:none; pointer-events:none;
    `;
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <div style="
      background:rgba(0,0,0,0.82); border:2px solid ${ch.color};
      border-radius:16px; padding:clamp(14px,4vw,28px) clamp(28px,8vw,60px);
      box-shadow:0 0 60px rgba(0,0,0,.8), 0 0 30px ${ch.color}44;
    ">
      <div style="
        color:${ch.color}; font-size:clamp(11px,2.5vw,14px);
        letter-spacing:4px; margin-bottom:8px; text-transform:uppercase;
        text-shadow:0 0 12px ${ch.color};
      ">🐕 כלבי לוד</div>
      <div style="
        color:#fff; font-size:clamp(26px,7vw,52px); font-weight:bold;
        letter-spacing:3px; text-shadow:0 0 20px rgba(255,255,255,.3);
        margin-bottom:6px;
      ">${ch.num}</div>
      <div style="
        color:${ch.color}; font-size:clamp(14px,3.5vw,22px);
        letter-spacing:2px; font-style:italic;
        text-shadow:0 0 16px ${ch.color};
      ">"${ch.sub}"</div>
    </div>
  `;

  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'chapterIn 3.2s cubic-bezier(.22,1,.36,1) forwards';
  setTimeout(() => { el.style.display = 'none'; }, 3300);
}


// ════════════════════════════════════════════════
// 8. 🎓 Tutorial Tooltips — פעם ראשונה בלבד
// ════════════════════════════════════════════════

const _TUTORIALS = [
  { id: 'move',    delay: 2000,  text: '🕹️ W/A/S/D לתנועה, עכבר לסיבוב מצלמה', mission: 0 },
  { id: 'interact',delay: 6000,  text: '🟢 לחץ E ליד NPC לשוחח, ליד אוכל לאסוף', mission: 0 },
  { id: 'attack',  delay: 5000,  text: '⚔️ לחץ F לתקיפה, Q לכישור מיוחד', mission: 3 },
  { id: 'combo',   delay: 3000,  text: '💥 קולין: 4 מכות רצופות = מתקפת STUN', mission: 3 },
  { id: 'dash',    delay: 3000,  text: '⚡ זיפו: Q = Dash Attack מהיר', mission: 3 },
  { id: 'charm',   delay: 3000,  text: '💜 מומו: Q = קסם אויב לצדנו', mission: 3 },
  { id: 'map',     delay: 8000,  text: '🗺️ לחץ על המיניmap לפתיחת מפה מלאה', mission: 1 },
  { id: 'territory',delay: 4000, text: '🏴 עמוד על השטח כדי לכבוש אותו', mission: 2 },
  { id: 'save',    delay: 10000, text: '💾 המשחק נשמר אוטומטית בכל עשר שניות', mission: 1 },
];

let _shownTutorials = {};
try {
  _shownTutorials = JSON.parse(localStorage.getItem('klb_tutorials') || '{}');
} catch(e) {}

function _checkTutorials() {
  if (!G || !G.hud) return;
  _TUTORIALS.forEach(t => {
    if (_shownTutorials[t.id]) return;
    if (G.mission < t.mission) return;
    // הצג רק אם רלוונטי לכלב הנוכחי
    if (t.id === 'combo' && G.dog !== 'colin') return;
    if (t.id === 'dash'  && G.dog !== 'zippo') return;
    if (t.id === 'charm' && G.dog !== 'momo') return;

    _shownTutorials[t.id] = true;
    try { localStorage.setItem('klb_tutorials', JSON.stringify(_shownTutorials)); } catch(e) {}
    setTimeout(() => _showTutorialToast(t.text), t.delay);
  });
}

function _showTutorialToast(text) {
  if (!G || G.paused || G.dlgOpen || G.cutOpen) {
    setTimeout(() => _showTutorialToast(text), 2000);
    return;
  }
  let el = document.getElementById('tutorial-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tutorial-toast';
    el.style.cssText = `
      position:fixed; bottom:clamp(170px,28vh,220px); left:50%;
      transform:translateX(-50%);
      background:rgba(0,20,40,0.95); border:1.5px solid #3498db;
      border-radius:10px; padding:8px 16px; color:#fff;
      font-size:clamp(11px,2.8vw,14px); z-index:55; display:none;
      pointer-events:none; text-align:center; max-width:80vw;
      font-family:Arial Hebrew, Arial, sans-serif;
      box-shadow:0 0 16px rgba(52,152,219,0.3);
    `;
    document.body.appendChild(el);
  }

  if (!document.getElementById('tutorial-style')) {
    const s = document.createElement('style');
    s.id = 'tutorial-style';
    s.textContent = `
      @keyframes tutIn  { from { opacity:0; transform:translateX(-50%) translateY(14px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes tutOut { from { opacity:1; } to { opacity:0; } }
    `;
    document.head.appendChild(s);
  }

  el.textContent = text;
  el.style.display = 'block';
  el.style.animation = 'tutIn 0.4s ease-out forwards';
  setTimeout(() => {
    el.style.animation = 'tutOut 0.5s ease-in forwards';
    setTimeout(() => { el.style.display = 'none'; }, 500);
  }, 3500);
}

// בדוק tutorials כל 3 שניות
setInterval(_checkTutorials, 3000);


// ════════════════════════════════════════════════
// 9. 🔒 הסתרת devPanel ב-Production
//    Escape מוסתר אם לא ב-dev mode
// ════════════════════════════════════════════════
const _isDev = location.search.includes('dev') || location.search.includes('debug');

if (!_isDev) {
  // override: Escape לא יפתח devPanel
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      const p = document.getElementById('devPanel');
      if (p) p.style.display = 'none'; // תמיד סגור במקום toggle
    }
  }, true); // capture phase — לפני handler המקורי
}

// ════════════════════════════════════════════════
// 10. ⏸️ שמירה אוטומטית לא רצה כש-paused
//     override setInterval
// ════════════════════════════════════════════════
// (הסתמך על setInterval שכבר קיים — רק הוסף guard)
const _origSaveGame = window.saveGame;
window.saveGame = function() {
  if (typeof G !== 'undefined' && G.paused && G.mission === 0) return; // אל תשמור בתוך cutscene פתיחה
  if (typeof _origSaveGame === 'function') _origSaveGame();
};

// ════════════════════════════════════════════════
// 11. 🎆 כותרת פרק גם ב-Chapter Select
// ════════════════════════════════════════════════
window.csStartChapterEnhanced = function(n) {
  if (typeof csStartChapter === 'function') csStartChapter(n);
};


// ════════════════════════════════════════════════
// init — מוודא שהשיפורים נטענו
// ════════════════════════════════════════════════
console.log('%c🐕 improvements.js נטען — כלבי לוד v2.0', 'color:#f5c518;font-weight:bold;font-size:14px');
