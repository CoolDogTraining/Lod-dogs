// ════════════════════════════════════════════════
// STORY
// ════════════════════════════════════════════════
const SLIDES=['לוד, ישראל.\nעיר של ניגודים — רחובות ישנים ורעש של חיים.','שלושה כלבי רחוב ללא בית.\nאבל עם חלום אחד...','קולין — חזק. זיפו — מהיר. מומו — חכמה.\nביחד הם יכבשו את העיר.','הם מתחילים מהתחתית.\nפחי אשפה. שינה תחת גשרים.','אבל לוד — תהיה שלהם. 🐕'];
let sIdx=0;
document.getElementById('st-tx').textContent=SLIDES[0];
function nextStory(){sIdx++;if(sIdx>=SLIDES.length){document.getElementById('story').style.display='none';document.getElementById('cs-scr').style.display='flex';return;}document.getElementById('st-tx').textContent=SLIDES[sIdx];}

// ════════════════════════════════════════════════
// CUTSCENES
// ════════════════════════════════════════════════
const CUTS={
  intro:{ch:'פתיחה',ti:'ברוכים הבאים ללוד',tx:'הרחובות פתוחים לפניכם.\nבלה הזקנה מחכה ליד השוק — דברו איתה קודם.'},
  ch2:{ch:'פרק 2',ti:'הכנופייה גדלה',tx:'גייסתם חברים.\nעכשיו אתם כוח אמיתי — הגיע הזמן לכבוש שטחים!'},
  ch3:{ch:'פרק 3',ti:'שליטה במחצית העיר',tx:'לוד מתחילה לפחד מכם.\nג\'ק הרוטווילר שמע עליכם — והוא כועס.'},
  boss:{ch:'קרב גמר',ti:'ג\'ק הרוטווילר',tx:'הוא מחכה לכם ברחוב הרצל.\nהכנו את עצמכם — זהו הקרב האחרון!'},
  win:{ch:'סוף פרק א׳',ti:'🏆 לוד שייכת לכלבים!',tx:'עשיתם את זה.\nמרחוב הרצל ועד תחנת הרכבת — לוד שלכם!\n\nאבל מנוחה? אין דבר כזה...'},
  ch2_open:{ch:'פרק ב׳ — המסגד הגדול',ti:'בלה מגיעה בריצה...',tx:'בלה: "מומו נחטפה! חאג׳ פריד לקחה אותה למסגד הגדול.\nהיא שמה אותה בכלוב בחצר הפנימית."\n\nקולין: "אני הולך לשם עכשיו."\nבלה: "צריך מוח, לא שרירים."\nזיפו: "...אני אכנס."'},
  ch2_stealth:{ch:'פרק ב׳ — סצנה 2',ti:'ההתגנבות',tx:'המסגד מוגן: 3 שומרים, מצלמה אחת שבורה,\nוברונו הדוברמן שסובב בחצר.\n\nזיפו: "בסדר. קל. מסתנן, מוצא את מומו, יוצאים.\nמה יכול להשתבש."'},
  ch2_momo:{ch:'פרק ב׳ — סצנה 3',ti:'מומו בכלא',tx:'מומו לא בוכה. היא מסתכלת על ברונו.\n\nמומו: "יש לך עיניים יפות. אמרו לך פעם?"\nברונו: "..."\nמומו: "בסדר אז נשב בשתיקה."\n\nזיפו מגיע. פותח את הכלוב.\nואז ברונו מרים את הראש.'},
  ch2_boss:{ch:'פרק ב׳ — קרב גמר',ti:'ברונו הדוברמן',tx:'קולין מחכה ליד דלת המסגד.\n\nקולין: "אז אתה ברונו."\nברונו: "גררר."\nקולין: "דיבור נהדר."\n\nברונו חזק יותר, מהיר יותר —\nאבל קולין לוחם בשביל משהו.\nזה תמיד עושה הבדל.'},
  win2:{ch:'סיום פרק ב׳',ti:'🐕 הכנופייה הולכת הביתה',tx:'מומו מסתכלת אחורה על ברונו.\n\nמומו: "הוא לא רע. הוא סתם לא הכיר שום דבר אחר."\nזיפו: "הוא כמעט הרג אותנו, מומו."\nמומו: "ראיתי משהו בעיניים שלו—"\nקולין: "מומו."\nמומו: "מה?"\nקולין: "הוא ניסה לאכול אותך."\n\nשתיקה.\n\nמומו: "...בסדר. נשכח מזה."'},
  ch3_open:{ch:'פרק ג׳ — הצינור',ti:'שוקי רץ לכיוונכם',tx:'שוקי: "קולין — בלה לא הייתה בשוק הבוקר."\nקולין: "היא תמיד שם בבוקר."\nשוקי: "אני יודע."\n\nהם הסתכלו אחד על השני.\n\nקולין: "בואו."'},
  bella_dead:{ch:'פרק ג׳ — הצינור',ti:'💔',tx:'היא שכבה בין הדוכנים. שקטה.\n\nמומו כרעה לידה. זיפו הסתובב הצידה.\n\nשוקי מצא קופסא קטנה בין רגליה — בקבוק זכוכית, ריח חריף.\nשוקי: "סם. לא של רחוב. זה מקצועי."\nקולין: "מישהו שהיא הכירה. מישהו שנכנס מקרוב."\n\nמומו: "מי?"\n\nאז זיפו ראה אותה — פישקה, עומדת בקצה השוק, מסתכלת עליהם.'},
  fishka_reveal:{ch:'פרק ג׳ — הצינור',ti:'🔪 פישקה',tx:'פישקה לא ברחה.\n\nזיפו: "פישקה. בואי לכאן."\nפישקה: "...לא."\nקולין: "את ידעת?"\nפישקה: "ד״ר פלטו שילם טוב. בלה הייתה מסכנת את הכל."\nמומו: "את ישנת לידנו. אכלת איתנו."\nפישקה: "כן." — חיוך קטן. — "זה היה מעניין."\n\nהיא מסתובבת ורצה לכיכר הכדורים.\n\nזיפו: "אחרי—"\nקולין: "זיפו, אתה הכי מהיר. רוץ!"'},
  kikar_battle:{ch:'פרק ג׳ — כיכר הכדורים',ti:'⚔️ הקרב בכיכר',tx:'זיפו תפס אותה ליד הכדור הצהוב.\n\nפישקה: "לבד? חכמה."\nמשרוקת חדה — מהצד השמאלי, מהימין, מאחורה.\nשלושה כלבים גדולים צצו בין הכדורים.\n\nזיפו הסתכל סביב. כיכר הכדורים, אור מהקרניות, צל ארוך.\n\nזיפו: "בסדר. נגמור את זה כאן."'},
  fishka_caught:{ch:'פרק ג׳ — הצינור',ti:'פישקה נלכדה',tx:'פישקה כרעה. זיפו עמד מעליה, נושם כבד.\n\nזיפו: "הראיות. איפה?"\nפישקה: "עיריית לוד. קומה שלישית. כספת."\nזיפו: "הקוד."\nפישקה: "תאריך הקמת לוד. פלטו חושב שזה רומנטי."\n\nזיפו: "ולמה אנחנו מאמינים לך?"\nפישקה: "כי הוא לא שילם לי את הסכום המלא. וזה מעצבן אותי."'},
  guards_arrive:{ch:'פרק ג׳ — הצינור',ti:'🚨 כלבי הביטחון',tx:'שלושה רועים גרמנים בקולרים כחולים חסמו את היציאה מהכיכר.\nואחריהם — כלב קטן בשריון. הוא פקד עליהם בשתיקה.\n\nמומו קפאה.\n\nמפקד: "צו עירוני. מתפזרים."\n\nהוא הסתכל לעיניה. שנייה ארוכה מדי.\n\nמומו (בלחש): "...רקס?"\n\nהמפקד הסב את ראשו.\nמפקד: "הלאה."'},
  ch4_open:{ch:'פרק ד׳ — העירייה',ti:'לילה אחד',tx:'בוקסר שרטט על האדמה.\n\nבוקסר: "כניסה ראשית — 3 שומרים. קומה ב׳ — מצלמות. שלישית — פלטו."\nזיפו: "ואם רקס שם?"\nמומו: "אני אדבר איתו."\nקולין: "מומו—"\nמומו: "אמרתי שאני אדבר. לא הבטחתי שהוא יקשיב."\n\nלוד ישנה. הם זזזו.'},
  ch4_boss:{ch:'פרק ד׳ — עיריית לוד',ti:'ד״ר פלטו',tx:'ד״ר פלטו עמד ליד החלון, גב אליהם.\n\nפלטו: "כבר ידעתי שתגיעו. פישקה לא הייתה אמינה מספיק."\nקולין: "זה נגמר, פלטו."\nפלטו: "נגמר?" — הוא התפנה. שלט שחור ביד. — "לוד שלי. אני בניתי אותה."\nקולין: "לוד לא שלך. היא של כולם."\n\nלחיצה על השלט — רקס נכנס.\nמומו: "רקס. אתה לא חייב לו כלום."\nרקס: "אני מצווה."\nמומו: "אני יודעת. אבל מצווה זה לא בוחר."'},
  reks_choice:{ch:'פרק ד׳ — המפנה',ti:'רקס בוחר',tx:'פלטו כרע. השלט התפצל על הרצפה.\n\nרקס עמד. הביט בשלט. בפלטו. במומו.\n\nרקס: "כל חיי ציייתתי. לא שאלתי. לא חשבתי."\nמומו: "אתה יכול לבחור עכשיו."\nרקס: "...אני לא יודע איך."\nמומו: "מתחילים בצעד אחד."\n\nרקס הצדיע לאט. פסע הצידה. המסדרון נפתח.\n\nמומו: "יפה."'},
  final_broadcast:{ch:'כלבי לוד — הסוף',ti:'📡 קול לוד',tx:'קולין הפעיל את הרמקולים.\n\nקולין: "תושבי לוד — מה שתשמעו עכשיו זה האמת."\n\nקול פלטו שידר ברחבי העיר.\nאנשים יצאו מבתים. עצרו ברחוב. הקשיבו.\n\nבחוץ, מומו ישבה ליד רקס.\nמומו: "מה תעשה עכשיו?"\nרקס: "לא יודע. זה מוזר."\nמומו: "מה?"\nרקס: "לא לדעת. אבל זה לא רע."\nמומו: "לא. זה נקרא חופש."\n\n🏆 כלבי לוד — אגדה לעד.'},
  // ── פרק ה׳ ──
  ch5_open:{ch:'פרק ה׳ — שחר',ti:'🌅 שלושה שבועות אחרי',tx:'לוד השתנתה.\nשלטים נקרעו. אנשים דיברו. כיכר הכדורים מלאה בחיים.\n\nאבל קולין לא ישן.\n\nמומו: "מה אתה שומע?"\nקולין: "משהו מגיע. מהצפון. לא יודע מה עדיין."\nזיפו: "אולי שקט?"\nקולין: "זיפו. שקט כזה לא מגיע לבד."'},
  reks_joins:{ch:'פרק ה׳ — הברית',ti:'🫡 רקס מגיע',tx:'רקס הגיע לבוקר. בלי שריון. בלי קולר.\n\nרקס: "שמעתי שיש בעיה."\nמומו: "בעיות יש תמיד."\nרקס: "הפעם שמעתי שם. טיטאן."\n\nהכלבים החליפו מבטים.\n\nרקס: "הוא היה לפני פלטו. לפני הכל. לוד הישנה.\nכשפלטו ירד — הוא חזר."\nקולין: "מה הוא רוצה?"\nרקס: "את כל מה שהוא חשב שזה שלו."'},
  new_threat:{ch:'פרק ה׳ — הצל',ti:'⚠️ הגיסות מגיעות',tx:'בשלושה בוקר — נבחיות מהצפון.\nכלבים גדולים, מצולקים, בלי קולרים.\n\nהם לא הגיעו לשאת — הם הגיעו לבדוק.\n\nזיפו: "חמישה. שישה. שמונה—"\nקולין: "אני ספרתי."\nמומו: "יש לנו עד הבוקר."\nרקס: "אני מכיר את המסלול שלהם. יש מקום — בריכת הנחת — שם הם מתאספים."\nקולין: "בריכת הנחת — צפון לגשר."\nרקס: "כן. אם נגיע שמה לפניהם..."'},
  titan_reveal:{ch:'פרק ה׳ — בריכת הנחת',ti:'💀 טיטאן',tx:'הוא היה גדול מגק. מברונו. מכולם.\nרוטווילר ענק, צלקת ישנה על הלסת, עיניים צהובות.\n\nטיטאן: "ראיתי אתכם בשידור. ילדים."\nקולין: "אנחנו כבשנו את לוד."\nטיטאן: "פלטו ייתן לי לחזור. תמיד כך היה."\nמומו: "פלטו נגמר."\nטיטאן: "אז — אתם."\n\nהוא קם לאטו. שמונה שיניים. הבל פה לבן בקור הבוקר.\n\nקולין: "רקס."\nרקס: "כאן."'},
  ch5_boss:{ch:'פרק ה׳ — קרב הסיום',ti:'🔥 לב העיר',tx:'הם נלחמו בין עמודי הגשר הישן.\nטיטאן מהיר יותר ממה שנראה. כבד ומדויק.\n\nקולין נפל פעם. קם.\nזיפו מסח את תשומת הלב. מומו היכה מהצד.\nרקס — מהאחור.\n\nטיטאן: "ארבעה עלי? מעניין."\nקולין: "לא. ארבעה בשבילה."\n\nטיטאן הסתכל עליו. הבין.\n\nאז קולין התנפל.'},
  ch5_finale:{ch:'פרק ה׳ — הבוקר',ti:'🏙️ לוד של כולם',tx:'השמש עלתה על לוד.\nהגשר עמד. בריכת הנחת שקטה.\n\nמומו ישבה ליד קולין.\nמומו: "כואב?"\nקולין: "כן."\nמומו: "טוב. כלומר — לא טוב. אבל—"\nקולין: "אני יודע מה התכוונת."\n\nרקס עמד מרחוק, מסתכל על העיר.\nזיפו: "מה אתה רואה?"\nרקס: "לא יודע. לא ראיתי את זה בעיניים כאלה. מלמטה."\nזיפו: "זה נקרא לחיות."\n\nארבעת הכלבים הסתכלו על לוד שלהם.'},
  true_ending:{ch:'כלבי לוד — הסוף האמיתי',ti:'🐾 ביחד',tx:'בשכונה בנו דבר קטן.\nלא פסל. לא אנדרטה.\nסתם — שולחן ועליו תמונה.\n\nבלה. שוקי. בוקסר.\nואחריהם — קולין, זיפו, מומו, רקס.\n\nהעיר עברה. עצרה. הסתכלה.\n\nאף אחד לא הסביר. לא צריך היה.\n\nלוד ידעה.\n\n🏆 כלבי לוד — אגדה לעד.'},
};
let cutCb=null;
function showCut(k,cb){
  const c=CUTS[k];
  document.getElementById('cut-ch').textContent=c.ch;
  document.getElementById('cut-ti').textContent=c.ti;
  document.getElementById('cut-tx').textContent='';
  document.getElementById('cut').style.display='flex';
  // דמות
  const portrait=_CUT_PORTRAITS[k]||'🐕';
  const portEl=document.getElementById('cut-portrait');
  if(portEl)portEl.textContent=portrait;
  cutCb=cb||null;G.paused=true;G.cutOpen=true;
  document.getElementById('mm-wrap').style.display='none';
  // Typewriter
  _currentCutTx=c.tx;_currentCutDone=false;
  if(_cutTypeInterval)clearInterval(_cutTypeInterval);
  const txEl=document.getElementById('cut-tx');
  let idx=0;
  _cutTypeInterval=setInterval(()=>{
    if(idx<_currentCutTx.length){txEl.textContent+=_currentCutTx[idx];idx++;}
    else{clearInterval(_cutTypeInterval);_cutTypeInterval=null;_currentCutDone=true;}
  },18);
}
function closeCut(){
  // אם הטייפרייטר עדיין רץ — לחיצה ראשונה מסיימת אותו
  if(_cutTypeInterval&&!_currentCutDone){skipTypewriter();return;}
  if(_cutTypeInterval){clearInterval(_cutTypeInterval);_cutTypeInterval=null;}
  document.getElementById('cut').style.display='none';G.paused=false;G.cutOpen=false;document.getElementById('mm-wrap').style.display='block';if(cutCb){cutCb();cutCb=null;}
}
function openDlg(av,sp,tx,choices){
  G.dlgOpen=true;
  document.getElementById('mm-wrap').style.display='none';
  document.getElementById('dlg-ov').style.display='flex';
  document.getElementById('dlg-av').textContent=av+' ';
  document.getElementById('dlg-spn').textContent=sp;
  document.getElementById('dlg-tx').textContent=tx;
  const ch=document.getElementById('dlg-ch');
  ch.innerHTML='';
  choices.forEach(c=>{
    const b=document.createElement('div');
    b.className='dc';
    b.textContent=c.t;
    // תיקון באג: click + touchstart גורמים לפונקציה להיקרא פעמיים במובייל
    // השתמש רק באחד מהם לפי סוג המכשיר
    const evtType = isMob ? 'touchstart' : 'click';
    b.addEventListener(evtType, e => { e.preventDefault(); c.fn(e); });
    ch.appendChild(b);
  });
}
function closeDlg(){G.dlgOpen=false;document.getElementById('mm-wrap').style.display='block';document.getElementById('dlg-ov').style.display='none';}
// ════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════
const isMob=('ontouchstart' in window);
const GRAV=-22, XP_TO_LVL=[0,80,200,380,600];
const BLDCOLS=[0xddd4c0,0xc8bfb0,0xe2d8c8,0xb8b0a4,0xd0c4b8,0xc4bcb0,0xe0d4c4,0xbab2a8,0xccc4b8,0xd8cfc4];
// ── צבעים לפי שכונה — לוד אמיתית ──
const COLS_CENTER=[0xd8cebc,0xccc3b0,0xddd3c0,0xd2c8b5,0xc8bfae,0xe0d6c6]; // מרכז — אבן ירושלמית
const COLS_NORTH =[0xbfb9ad,0xc8c0b4,0xb8b2a6,0xd0c8bc,0xc4bdb0,0xbcb5a8]; // רמת אשכול — בטון 70s
const COLS_SOUTH =[0xe8e2d8,0xf0ece4,0xe4dfd4,0xeeeae2,0xddd8ce,0xede9e0]; // גני אביב — חדש ובהיר
const COLS_OLD   =[0xc8b898,0xd4c4a0,0xbcae8c,0xd0c0a0,0xc4b490,0xd8c8a8]; // עיר עתיקה — חוואר
// ── צבעי תריסים נפוצים בלוד ──
const SHUTTER_COLS=[0x3a5c28,0x46602e,0x405068,0x4a5a70,0x995520,0x7a4418,0x446040,0x3a5040];

// ── טקסטורת אבן (shared — cloned per-building) ──
let _wTexSt=null,_wTexPl=null;
function _mkWallTexStone(){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#cfc5b2';tx.fillRect(0,0,sz,sz);
  const rowHeights=[26,30,28,32,24,28,30,26,34,28];let cy=0;
  for(const rh of rowHeights){
    let cx=-(Math.random()*28);
    while(cx<sz){
      const bw=44+Math.random()*55;
      const lv=Math.floor(Math.random()*20)-8;
      const base=195+lv;
      tx.fillStyle=`rgb(${base+Math.floor(Math.random()*8)},${base-12+Math.floor(Math.random()*8)},${base-22+Math.floor(Math.random()*6)})`;
      tx.fillRect(cx+1,cy+1,bw-1,rh-1);
      if(Math.random()<.28){tx.fillStyle=`rgba(70,60,46,${.03+Math.random()*.07})`;tx.fillRect(cx+Math.random()*(bw*.6),cy+Math.random()*(rh*.6),2+Math.random()*9,1+Math.random()*5);}
      cx+=bw;
    }
    tx.fillStyle='rgba(75,65,50,0.5)';tx.fillRect(0,cy,sz,1.5);
    cy+=rh;if(cy>sz)break;
  }
  for(let i=0;i<10;i++){tx.fillStyle=`rgba(55,45,35,${.015+Math.random()*.03})`;tx.beginPath();tx.ellipse(Math.random()*sz,Math.random()*sz,8+Math.random()*28,4+Math.random()*18,Math.random()*Math.PI,0,Math.PI*2);tx.fill();}
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _mkWallTexPlaster(){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  tx.fillStyle='#d8d0bc';tx.fillRect(0,0,sz,sz);
  for(let i=0;i<3200;i++){const px=Math.random()*sz,py=Math.random()*sz,r=.25+Math.random()*.7;const v=Math.floor(Math.random()*14)-5;tx.fillStyle=`rgba(${158+v},${146+v},${128+v},0.16)`;tx.beginPath();tx.arc(px,py,r,0,Math.PI*2);tx.fill();}
  for(let i=0;i<14;i++){tx.strokeStyle=`rgba(88,78,62,${.04+Math.random()*.07})`;tx.lineWidth=.35+Math.random()*.5;tx.beginPath();const sx=Math.random()*sz,sy=Math.random()*sz;tx.moveTo(sx,sy);tx.lineTo(sx+(Math.random()-.5)*44,sy+(Math.random()-.5)*44);tx.stroke();}
  // פסי לחות אנכיים
  for(let i=0;i<5;i++){const px=Math.random()*sz;tx.fillStyle=`rgba(60,52,40,${.02+Math.random()*.03})`;tx.fillRect(px,Math.random()*sz*.3,1+Math.random(),sz*.4+Math.random()*sz*.3);}
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function wTexStone(){if(!_wTexSt)_wTexSt=_mkWallTexStone();return _wTexSt;}
function wTexPlaster(){if(!_wTexPl)_wTexPl=_mkWallTexPlaster();return _wTexPl;}

// ── מערכת טקסטורות מורחבת לבתי כנסת, מסגד, עירייה ──
const _texCache={};
function _mkTexStone(v){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  const bases=['#d4c9a8','#cdc19f','#ddd2b0','#c8bc98','#e0d5b8','#d8cba6'];
  tx.fillStyle=bases[v%bases.length];tx.fillRect(0,0,sz,sz);
  const rowH=[24,28,26,30,22,28,32,26];let cy=0,ri=0;
  while(cy<sz){const rh=rowH[ri%rowH.length];let cx=-(Math.random()*30);
    while(cx<sz){const bw=42+Math.random()*52;const lv=Math.floor(Math.random()*22)-10;const br=195+lv;
      tx.fillStyle=`rgb(${br},${br-14+Math.floor(Math.random()*6)},${br-26+Math.floor(Math.random()*5)})`;tx.fillRect(cx+.8,cy+.8,bw-1.6,rh-1.6);
      if(Math.random()<.12){tx.fillStyle=`rgba(80,68,50,0.22)`;tx.beginPath();tx.moveTo(cx+bw-1,cy+1);tx.lineTo(cx+bw-4-Math.random()*5,cy+1);tx.lineTo(cx+bw-1,cy+5+Math.random()*7);tx.closePath();tx.fill();}
      cx+=bw;}
    tx.fillStyle=`rgba(70,58,42,${.45+Math.random()*.15})`;tx.fillRect(0,cy,sz,1.8);
    cy+=rh;ri++;}
  for(let i=0;i<14;i++){const g=tx.createRadialGradient(Math.random()*sz,Math.random()*sz,0,Math.random()*sz,Math.random()*sz,12+Math.random()*25);g.addColorStop(0,`rgba(55,48,35,${.06+Math.random()*.1})`);g.addColorStop(1,'rgba(55,48,35,0)');tx.fillStyle=g;tx.beginPath();tx.ellipse(Math.random()*sz,Math.random()*sz,14+Math.random()*22,7+Math.random()*14,Math.random()*Math.PI,0,Math.PI*2);tx.fill();}
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _mkTexPlasterNew(v){
  const sz=256,tc=document.createElement('canvas');tc.width=tc.height=sz;
  const tx=tc.getContext('2d');
  const bases=['#e8e2d8','#f0ece4','#e4dfd4','#eeeae2','#ddd8ce','#ede9e0'];
  tx.fillStyle=bases[v%bases.length];tx.fillRect(0,0,sz,sz);
  for(let i=0;i<4000;i++){const px=Math.random()*sz,py=Math.random()*sz,r=.15+Math.random()*.55;const vv=Math.floor(Math.random()*12)-6;tx.fillStyle=`rgba(${168+vv},${160+vv},${145+vv},0.07)`;tx.beginPath();tx.arc(px,py,r,0,Math.PI*2);tx.fill();}
  for(let y=0;y<sz;y+=sz/4){tx.fillStyle='rgba(130,120,105,0.12)';tx.fillRect(0,y,sz,1.5);}
  const t=new THREE.CanvasTexture(tc);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function _getBldTex(style,variant){
  const k=style+'_'+(variant%8);
  if(_texCache[k])return _texCache[k];
  let t;
  if(style==='stone')t=_mkTexStone(variant);
  else if(style==='plasterNew')t=_mkTexPlasterNew(variant);
  else t=_mkTexStone(variant); // fallback
  _texCache[k]=t;return t;
}

// תיקון באג: margin קשיח לא מתחשב בגודל השחקן (מומו sz=0.58)
function isInBuilding(x,z,margin){
  // margin דינמי לפי גודל הכלב הנוכחי אם לא הועבר ידנית
  const playerSz = (G && G.dogs && G.dog) ? (G.dogs[G.dog].sz || 1.0) : 1.0;
  const m = (margin !== undefined) ? margin : 0.8 + playerSz * 0.7;
  return blds.some(b=>Math.abs(x-b.x)<b.w/2+m&&Math.abs(z-b.z)<b.d/2+m);
}

// ════════════════════════════════════════════════
// MISSION DEFINITIONS — single source of truth
// ════════════════════════════════════════════════
// Each mission: {txt, target, check()}
// Gates are set here — nothing runs outside its gate
const MISSIONS=[
  // 0
  {txt:'1️⃣ דבר עם בלה הזקנה ליד השוק 🗣️',
   hint:'בלה ליד השוק',
   targetFn:()=>({x:-60,z:60}),
   unlock:()=>{}},
  // 1
  {txt:'2️⃣ אסוף 3 מנות אוכל 🍖  (נאספו: 0/3)',
   hint:'אוכל ברחוב',
   targetFn:()=>G.pickups.find(p=>!p.done)||{x:0,z:0},
   unlock:()=>{}},
  // 2
  {txt:'3️⃣ כנס לאזור רמת אשכול — כבוש שטח 🏴',
   hint:'רמת אשכול — צפון',
   targetFn:()=>G.terrs.find(t=>!t.cap)||{x:0,z:-130},
   unlock:()=>{}},
  // 3
  {txt:'4️⃣ הכנע 3 אויבי כנופיית "כלבי הגשר" ⚔️  (הובסו: 0/3)',
   hint:'אויבים ברחוב',
   targetFn:()=>G.enemies.find(e=>e.hp>0&&e.mesh.visible)||{x:0,z:0},
   unlock:()=>{G.enemies.forEach(e=>{e.mesh.visible=true;e.hp=e.mhp;});}},
  // 4
  {txt:'5️⃣ גייס 2 כלבים — החלף/י למומו ודבר איתם 🐾  (גויסו: 0/2)',
   hint:'מחכה לגיוס',
   targetFn:()=>G.npcs.find(n=>n.type==='recruit'&&!n.recruited)||{x:0,z:0},
   unlock:()=>{G.npcs.forEach(n=>{if(n.ind)n.ind.visible=true;});}},
  // 5
  {txt:'6️⃣ כבוש 4 שטחים ברחבי לוד 🏴',
   hint:'שטח ללא כיבוש',
   targetFn:()=>G.terrs.find(t=>!t.cap)||{x:0,z:0},
   unlock:()=>{}},
  // 6
  {txt:'7️⃣ מצא והכנע את ג\'ק הרוטווילר 👹',
   hint:"ג'ק ברחוב הרצל",
   targetFn:()=>G.bosses[0]||{x:25,z:20},
   unlock:()=>{G.bosses.forEach(b=>{b.mesh.visible=true;b.hp=b.mhp;b.dead=false;});}},
  // 7
  {txt:'🏆 לוד שייכת לכלבים! — המתן...',hint:'',targetFn:()=>({x:0,z:0}),unlock:()=>{
    setTimeout(()=>showCut('ch2_open',()=>setMission(8)),1800);
  }},
  // 8 — כנס למסגד
  {txt:'8️⃣ פרק ב׳: הגיעו לדלת המסגד הגדול 🕌',
   hint:'דלת המסגד — מרכז העיר',
   targetFn:()=>({x:-51,z:-100}),
   unlock:()=>{
     // אם השחקן מומו — עובר לקולין (מומו נחטפה)
     if(G.dog==='momo'){
       G.dog='colin';
       document.getElementById('hdn').textContent=G.dogs['colin'].name;
       const pos=PB.position.clone();buildPlayer();PB.position.copy(pos);
     }
     // אור ירוק על הדלת (נוסף רק עכשיו)
     const doorGlow=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),new THREE.MeshLambertMaterial({color:0x00ff88,emissive:0x00aa44}));
     doorGlow.position.set(-51,7,-100);scene.add(doorGlow);
     const pl=new THREE.PointLight(0x00ff88,1.5,12);pl.position.set(-51,6,-100);scene.add(pl);
     G.gateMarker={x:-51,z:-100};
     showN('🕌 בלה: "מומו נחטפה! זיפו — רק אתה יכול להסתנן.\nקולין — חכה ליד הדלת הירוקה."');
   }},
  // 9 — בתוך המסגד — שחרר את מומו
  {txt:'9️⃣ הסתנן למסגד ושחרר את מומו 🔓',
   hint:'דלת המסגד הירוקה',
   targetFn:()=>G.gateMarker||{x:-51,z:-100},
   unlock:()=>{
     showCut('ch2_stealth',()=>enterMosque());
   }},
  // 10 — קרב ברונו (במסגד)
  {txt:'🔟 קולין: הכנע את ברונו! ⚔️',
   hint:'ברונו — חצר המסגד',
   targetFn:()=>G.gateMarker||{x:-51,z:-100},
   unlock:()=>{
     showCut('ch2_boss',()=>{
       G.dog='colin';
       document.getElementById('hdn').textContent=G.dogs['colin'].name;
       const pos=PB.position.clone();buildPlayer();PB.position.copy(pos);
       enterMosque();
     });
   }},
  // 11 — פרק ב׳ הסתיים, פרק ג׳ נפתח
  {txt:'⏳ משהו לא בסדר... לכו לבלה ליד השוק.',hint:'בלה — השוק',
   targetFn:()=>({x:-60,z:60}),
   unlock:()=>{setTimeout(()=>showCut('ch3_open',()=>setMission(12)),1600);}},
  // 12 — מצאו את בלה
  {txt:'1️⃣2️⃣ מצאו את בלה ליד השוק 🔍',hint:'בלה — השוק',
   targetFn:()=>({x:-60,z:60}),
   unlock:()=>{
     // בלה מוסרת מהמפה — נשכבת על הצד (נפלה)
     const bella=G.npcs.find(n=>n.name==='בלה הזקנה');
     if(bella){
       if(bella.ind)bella.ind.visible=false;
       // הסובב אותה לשכיבה על הצד
       bella.mesh.rotation.z=Math.PI/2;
       bella.mesh.position.y=0.4;
       // הסר נדנוד
       bella._dead=true;
       // הוסף אפקט כהה — ריצפה אדומה-כהה מתחתיה
       if(scene){
         const bloodPool=new THREE.Mesh(
           new THREE.CircleGeometry(1.2,10),
           new THREE.MeshLambertMaterial({color:0x440000,transparent:true,opacity:.7,depthWrite:false})
         );
         bloodPool.rotation.x=-Math.PI/2;
         bloodPool.position.set(-60,.05,60);
         scene.add(bloodPool);
       }
     }
     G._bellaMarker={x:-60,z:60};
     // פישקה עוברת לשוק — עומדת בקצה השוק, רואה את הגופה
     const fishkaNPC=G.npcs.find(n=>n.name==='פישקה'&&!n._dead);
     if(fishkaNPC){
       fishkaNPC.x=-58;fishkaNPC.z=62;
       fishkaNPC.mesh.position.set(-58,0,62);
       fishkaNPC.mesh.visible=true;
       if(fishkaNPC.ind)fishkaNPC.ind.visible=false;
       // היא מסתכלת לכיוון בלה
       fishkaNPC.mesh.rotation.y=Math.atan2(-60-(-58),60-62);
     }
   }},
  // 13 — זיפו רודף אחרי פישקה לכיכר הכדורים
  {txt:'1️⃣3️⃣ זיפו: רדוף אחרי פישקה לכיכר הכדורים! 🟡',hint:'כיכר הכדורים',
   targetFn:()=>({x:40,z:0}),
   unlock:()=>{
     showCut('fishka_reveal',()=>{
       // פישקה כבר רצה (הופעלה מיד בסיום bella_dead)
       // fallback — אם נטען משמירה ישירות למשימה 13
       if(!G._fishkaEnemy){
         G.dog='zippo';
         document.getElementById('hdn').textContent=G.dogs['zippo'].name;
         const pos=PB.position.clone();buildPlayer();PB.position.copy(pos);
         spawnFishkaHostile();
       }
     });
   }},
  // 14 — כלבי ביטחון מגיעים + פישקה נלכדת
  {txt:'1️⃣4️⃣ פרק ד׳: הגיעו לעיריית לוד 🏛️',hint:'עיריית לוד — דלת כניסה',
   targetFn:()=>({x:80,z:-68}),
   unlock:()=>{
     showCut('fishka_caught',()=>{
       showCut('guards_arrive',()=>{
         spawnGuardDogs();
         spawnCityHallGuards();
         showCut('ch4_open',()=>{});
       });
     });
   }},
  // 15 — כנס לעירייה
  {txt:'1️⃣5️⃣ חדרו לבניין העיריה 🏛️',hint:'דלת עיריית לוד',
   targetFn:()=>({x:80,z:-68}),
   unlock:()=>{
     if(scene){const pl=new THREE.PointLight(0x4488ff,2.5,22);pl.position.set(80,14,-80);scene.add(pl);}
     showN('🏛️ הגיעו לדלת העירייה — כנסו פנימה!');
   }},
  // 16 — מצאו את הכספת (בתוך הבניין)
  {txt:'1️⃣6️⃣ מצאו את כספת המסמכים — קומה ג׳ 🗂️',hint:'כספת — קומה ג׳',
   targetFn:()=>({x:0,z:-18}),
   unlock:()=>{
     showN('🗂️ שוקי: "הכספת בקומה השלישית. קוד — תאריך הקמת לוד."');
   }},
  // 17 — הכנעו את פלטו
  {txt:'1️⃣7️⃣ הכנעו את ד״ר פלטו! 🐕‍🦺⚔️',hint:'ד״ר פלטו — קומה ג׳',
   targetFn:()=>({x:0,z:-25}),
   unlock:()=>{
     showCut('ch4_boss',()=>{ if(CITY.inCity)spawnPaltoInCity(); });
   }},
  // 18 — שדרו את הראיות
  {txt:'1️⃣8️⃣ הגיעו לחדר השידור — שדרו את הראיות! 📡',hint:'חדר שידור — קומה א׳',
   targetFn:()=>({x:0,z:28}),
   unlock:()=>{
     showCut('reks_choice',()=>{});
   }},
  // 19 — סיום + אנדרטה לבלה
  {txt:'🏆 כלבי לוד — אגדה לעד! 🐕',hint:'',targetFn:()=>({x:0,z:0}),unlock:()=>{
    // הסתר גופת בלה, סמן כמתה (למניעת דיאלוג)
    G.npcs.forEach(n=>{
      if(n.name==='בלה הזקנה'&&n.mesh){
        n.mesh.visible=false;
        n._dead=true;
      }
    });
    _spawnBellaMonument(-60, 60);
    setTimeout(()=>showN('🗿 אנדרטה לזכר בלה הוקמה בשכונה'),1200);
    // רקס ממתין בכיכר — נוצר עם מיקום קבוע, לא עוקב עד mission 21
    if(!G._reksAlly){
      _spawnReksAlly();
      G._reksAlly._waitAtPlaza=true; // דגל: עמוד בכיכר, אל תעקוב
    }
    setTimeout(()=>showCut('ch5_open',()=>setMission(20)),5000);
  }},
  // ── פרק ה׳ — שחר ──
  // 20 — פגוש את רקס בכיכר הכדורים
  {txt:'2️⃣0️⃣ פרק ה׳: פגוש את רקס בכיכר הכדורים 🫡',
   hint:'כיכר הכדורים',
   targetFn:()=>({x:40,z:0}),
   unlock:()=>{
     showN('🌅 פרק ה׳ — שחר\nרקס מחכה לכם בכיכר הכדורים.');
   }},
  // 21 — הכנע את גיסות טיטאן
  {txt:'2️⃣1️⃣ הכנע 5 כלבים מגיסות טיטאן 🐕⚔️  (הובסו: 0/5)',
   hint:'בריכת הנחת — צפון',
   targetFn:()=>G.enemies.find(e=>e.hp>0&&e.mesh.visible&&e._titan)||{x:-120,z:130},
   unlock:()=>{
     // ספוואן מיידי — לא מחכים לסגירת קאטסין
     _spawnTitanScouts();
     showCut('new_threat',()=>{
       showN('⚠️ גיסות טיטאן פשטו על בריכת הנחת!\nהגיעו לצפון הגשר והכניעו 5 מהם.');
     });
   }},
  // 22 — הגיעו לבריכת הנחת
  {txt:'2️⃣2️⃣ הגיעו לבריכת הנחת — צפון הגשר 💧',
   hint:'בריכת הנחת — צפון',
   targetFn:()=>({x:-120,z:130}),
   unlock:()=>{
     showN('💧 בריכת הנחת — רקס: "שם הוא מתכנן. נגיע לפניו."');
   }},
  // 23 — קרב טיטאן
  {txt:'2️⃣3️⃣ הכנעו את טיטאן! 💀🔥',
   hint:'טיטאן — בריכת הנחת',
   targetFn:()=>G._titanEnemy?{x:G._titanEnemy.x,z:G._titanEnemy.z}:{x:-120,z:130},
   unlock:()=>{
     showN('💀 טיטאן כאן! הילחמו יחד — זהו הקרב האחרון!');
   }},
  // 24 — סיום אמיתי
  {txt:'🏆 לוד — לעד ולנצח! 🐾',hint:'',targetFn:()=>({x:0,z:0}),unlock:()=>{
    setTimeout(()=>{
      showCut('ch5_finale',()=>{
        showCut('true_ending',()=>{
          showN('🐾 כלבי לוד — הסוף האמיתי!\n🏆 סיימתם את כל 5 הפרקים!');
          // אפקט זיקוקים
          _spawnFinalFireworks();
        });
      });
    },1200);
  }},
];

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
      _pfxReturn(p.mesh); // החזר ל-Pool במקום לזרוק
      G.particles.splice(i,1);
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
function selDog(d){G.dog=d;document.getElementById('cs-scr').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('hdn').textContent=G.dogs[d].name;if(isMob)document.getElementById('mob').style.display='block';G.hud=true;document.getElementById('coin-hud').style.display='block';document.getElementById('sq-btn').style.display='flex';init();if(window._csChapter!=null){const _ch=window._csChapter;window._csChapter=null;setTimeout(()=>{if(isMob)document.getElementById('mob').style.display='block';if(typeof setMission==='function')setMission(_ch);},400);}}

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
  renderer.setPixelRatio(Math.min(devicePixelRatio,isMob?1.5:2));
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
  mkRd(0,0,300,12,false);   // רחוב הרצל — E-W
  mkRd(0,0,12,300,true);    // שדרות ירושלים — N-S
  mkRd(-40,0,12,300,true);  // רחוב הגפן
  mkRd(40,0,12,300,true);   // רחוב הדקל
  mkRd(0,50,300,10,false);  // רחוב וייצמן
  mkRd(0,-50,300,10,false); // רחוב בן גוריון

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
  for(let bx=-85;bx<=85;bx+=32)for(let bz=-95;bz>=-155;bz-=32){
    // הימנע מבנייה על כבישים N-S (x=-40,0,40 ±8) ומכביש E-W (z=-50 ±8)
    if(Math.abs(bx)<16||Math.abs(bx+40)<16||Math.abs(bx-40)<16)continue;
    if(Math.abs(bz+50)<10)continue;
    bldHouse(bx,bz,4+Math.random()*2.5);
  }

  // === גני אביב — דרום ===
  for(let bx=-85;bx<=85;bx+=32)for(let bz=80;bz<=150;bz+=32){
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

  // חלונות — קדמי (z-) ואחורי (z+) ★
  const glsMat=new THREE.MeshStandardMaterial({color:0x7ab8d0,roughness:.04,metalness:.12,transparent:true,opacity:.72,emissive:0x061520});
  const frMat=new THREE.MeshLambertMaterial({color:0xf0e8d8});
  const shutCol=SHUTTER_COLS[Math.floor(Math.random()*SHUTTER_COLS.length)];
  const shutMat=new THREE.MeshLambertMaterial({color:shutCol});

  [[z-d/2-.04,1],[z+d/2+.04,-1]].forEach(([fz,side])=>{
    for(let wy=1.6;wy<h-.9;wy+=2.2){
      for(let wx=-w/2+1.6;wx<w/2-1.0;wx+=2.4){
        // מסגרת
        const fr=new THREE.Mesh(new THREE.BoxGeometry(1.12,1.22,.06),frMat);
        fr.position.set(x+wx,wy,fz-.02*side);scene.add(fr);
        // זכוכית
        const wn=new THREE.Mesh(new THREE.BoxGeometry(.9,.98,.04),glsMat.clone());
        wn.position.set(x+wx,wy,fz);scene.add(wn);
        // תריסים (~60% מהחלונות)
        if(Math.random()<.6){
          const sl=new THREE.Mesh(new THREE.BoxGeometry(.48,1.08,.04),shutMat);
          sl.position.set(x+wx-.49,wy,fz-.05*side);scene.add(sl);
          const sr=new THREE.Mesh(new THREE.BoxGeometry(.48,1.08,.04),shutMat);
          sr.position.set(x+wx+.49,wy,fz-.05*side);scene.add(sr);
        }
      }
    }
  });

  // חלונות צדדיים (x faces)
  [[x-w/2-.04,1],[x+w/2+.04,-1]].forEach(([fx,side])=>{
    for(let wy=2.0;wy<h-1.0;wy+=2.8){
      const wn=new THREE.Mesh(new THREE.BoxGeometry(.04,.88,.82),glsMat.clone());
      wn.position.set(fx,wy,z+(Math.random()-.5)*(d*.4));scene.add(wn);
    }
  });

  // מרפסות — קומה ראשונה ואילך
  if(h>7){
    for(let wy=2.5;wy<h-.8;wy+=4.4){
      const balW=Math.min(5,w-2);
      // רצפת מרפסת
      const bal=new THREE.Mesh(new THREE.BoxGeometry(balW,.13,1.2),new THREE.MeshLambertMaterial({color:dk(c,.88)}));
      bal.position.set(x,wy-.06,z-d/2-1.2/2);scene.add(bal);
      // עמודי מעקה
      for(let pi=-balW/2+.25;pi<=balW/2-.25;pi+=.52){
        const post=new THREE.Mesh(new THREE.BoxGeometry(.06,.62,.06),new THREE.MeshLambertMaterial({color:0x707068}));
        post.position.set(x+pi,wy+.3,z-d/2-1.1);scene.add(post);
      }
      // מוט מעקה עליון
      const rail=new THREE.Mesh(new THREE.BoxGeometry(balW,.06,.06),new THREE.MeshLambertMaterial({color:0x888880}));
      rail.position.set(x,wy+.64,z-d/2-1.1);scene.add(rail);
    }
  }

  // מזגן (AC) — קיר קדמי
  if(Math.random()<.25){
    const acx=x+(Math.random()-.5)*(w*.55);
    const acy=h*.35+Math.random()*h*.3;
    const ac=new THREE.Mesh(new THREE.BoxGeometry(.72,.42,.32),new THREE.MeshStandardMaterial({color:0xe8e5dd,roughness:.55}));
    ac.position.set(acx,acy,z-d/2-.18);scene.add(ac);
    const acF=new THREE.Mesh(new THREE.BoxGeometry(.64,.06,.28),new THREE.MeshLambertMaterial({color:0xd0cc88}));
    acF.position.set(acx,acy+.2,z-d/2-.18);scene.add(acF);
  }

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
    new THREE.MeshStandardMaterial({color:0
