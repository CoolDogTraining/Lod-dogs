// ── story.js — נרטיב, קאטסינים, הגדרות משימות ──
// ════════════════════════════════════════════════
// STORY
// ════════════════════════════════════════════════
const SLIDES=['לוד, ישראל.\nעיר של ניגודים — רחובות ישנים ורעש של חיים.','שלושה כלבי רחוב ללא בית.\nאבל עם חלום אחד...','קולין — חזק. זיפו — מהיר. מומו — חכמה.\nביחד הם יכבשו את העיר.','הם מתחילים מהתחתית.\nפחי אשפה. שינה תחת גשרים.','אבל לוד — תהיה שלהם. 🐕'];
let sIdx=0;
document.addEventListener('DOMContentLoaded',()=>{
  const el=document.getElementById('st-tx');
  if(el)el.textContent=SLIDES[0];
});
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

  // ══════════════════════════════════════════════
  // פרק ו׳ — "צל"
  // ══════════════════════════════════════════════
  ch6_open:{ch:'פרק ו׳ — צל',ti:'💔 הבוקר הכי שקט',tx:'מומו מצאה אותו לפני כולם.\n\nהיא לא צעקה. לא רצה לקרוא לאחרים.\nסתם עמדה שם כמה דקות.\n\nאחר כך הלכה לקולין.\n\nמומו: "רקס."\nקולין: "מה איתו?"\nמומו: "תבוא."'},
  ch6_reks_dead:{ch:'פרק ו׳ — צל',ti:'😶 שלושתם עמדו',tx:'לא היו סימני קרב. לא דם. לא שריטות.\nסתם — שקט.\n\nזיפו: "מה קרה לו?"\nמומו: "לא יודעת."\nקולין: "מישהו יודע שהוא כאן?"\n\nשתיקה.\n\nקולין: "קוברים אותו ליד הגשר. היום בערב. רק אנחנו."'},
  ch6_shadow_seen:{ch:'פרק ו׳ — צל',ti:'👁️ שבוע אחרי',tx:'קולין ראה אותו ברחוב שוק.\n\nאותה הליכה. שמאל-ימין, קצת כבד על הרגל הימנית.\nאותה הצלקת על הלסת.\n\nקולין קפא.\n\nהצל הסתובב. הסתכל לשנייה ישר אל קולין.\n\nואז נעלם בסמטה.\n\nקולין לא רדף. הוא חזר לבסיס ולא אמר כלום — שעה שלמה.'},
  ch6_shadow_zippo:{ch:'פרק ו׳ — צל',ti:'⚡ זיפו עוקב',tx:'זיפו מצא אותו ליד הנמל הישן.\n\nהצל ישב לבד. לא אכל. לא ישן.\nסתם הסתכל על המים.\n\nזיפו ניגש.\n\nזיפו: "רקס?"\nהצל הסתובב לאט.\nהצל: "אני מכיר אותך."\nזיפו: "אתה מכיר אותי. נכון. אז בוא—"\nהצל: "אתה מהכנופייה ששמה אותו שם."\n\nזיפו הבין שמשהו לא בסדר.\n\nזיפו: "מי אמר לך את זה?"'},
  ch6_lab_found:{ch:'פרק ו׳ — הבניין הנטוש',ti:'🔬 מה שהם מצאו',tx:'קומה תחתונה. דלת פלדה.\nבפנים — אור פלורסנט, ריח חריף של חומרים.\n\nכלובים. ציוד. מסכים.\n\nועל המסך הראשון — תמונה של רקס.\nואחריה תמונה של רקס.\nואחריה תמונה של רקס.\nכולן שונות בדקות — שלבים של אותו תהליך.\n\nמומו: "מה זה..."\nקולין: "אל תיגעו בשום דבר."'},
  ch6_recording:{ch:'פרק ו׳ — הקלטה',ti:'🎙️ קול ד"ר כץ',tx:'זיפו מצא את הנגן על השולחן.\n\nלחץ על PLAY.\n\nקול יבש, מדוד:\n"דגימה 7. כלב זכר, בוגר, ניסיון קרב גבוה. מקור: לוד.\nתהליך העתקה — הצלחה חלקית. זיכרונות עד 14 חודשים לאחור.\nחסר: זיכרונות חצי השנה האחרונה. ההתנהגות יציבה.\nמוכן לשחרור ניסיוני."\n\nהקלטה נגמרה.\n\nאיש לא דיבר דקה שלמה.'},
  ch6_shadow_fight:{ch:'פרק ו׳ — הצל',ti:'⚔️ הוא לא יצא בשקט',tx:'הצל עמד בין הכלובים.\n\nקולין: "אתה לא רקס. רקס מת. מישהו עשה אותך."\nהצל: "אני זוכר את לוד. אני זוכר את בלה. אני זוכר—"\nמומו: "אתה זוכר את מה שהוא זכר. זה לא אותו דבר."\n\nהצל הסתכל עליה. משהו ברצף שלו השתבש.\n\nואז הוא תקף.'},
  ch6_factory:{ch:'פרק ו׳ — המפעל',ti:'😱 יש עוד',tx:'מעבר לדלת האחורית — חדר גדול יותר.\n\nעוד כלובים. עשרה. חמישה עשר.\nחלקם עם עיניים פקוחות. חלקם לא.\n\nפרצופים שהכנופייה הכירה — כלבים שנעלמו מלוד בחודשים האחרונים.\n\nמומו: "כמה זמן זה קיים?"\nזיפו: "הריח... חצי שנה לפחות."\n\nקולין: "הוציאו את כולם מבחוץ."'},
  ch6_fire:{ch:'פרק ו׳ — שריפה',ti:'🔥 לוד לא תדע',tx:'הם הוציאו את כל הכלובים.\n\nהכלבים שבחוץ התפזרו לכל הכיוונים — בלי לפרוס, בלי לעצור.\nחופשיים בפעם הראשונה.\n\nקולין עמד בכניסה.\n\nהוא הפיל את הנגן על הרצפה.\nהלך לארון הכימיקלים. פתח אותו.\n\nזיפו: "קולין."\nקולין: "לכו. אני מסיים."'},
  ch6_ending:{ch:'פרק ו׳ — אחרי',ti:'🌆 שתיקה',tx:'הם ישבו על הגשר. הבניין בוער מאחוריהם.\n\nזיפו: "מה נגיד לאנשים?"\nקולין: "שהיה שריפה בבניין נטוש."\nמומו: "זה הכל?"\nקולין: "זה הכל."\n\nמומו הסתכלה על המים.\n\nמומו: "הוא חשב שהוא רקס. עד הסוף."\nזיפו: "אני יודע."\nמומו: "זה עצוב."\nקולין: "כן."\n\nאיש לא הוסיף כלום.\nלוד המשיכה לנוע מתחתם.\n\n🏁 פרק ו׳ — הסתיים.'},
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
     // ── הוסף שומרי דרך לפרק ב׳ — כלבי חאג׳ פריד שומרים על הגישה למסגד ──
     _spawnCh2PatrolGuards();
     showN('🕌 בלה: "מומו נחטפה! זיפו — רק אתה יכול להסתנן.\nקולין — חכה ליד הדלת הירוקה."\n⚠️ כלבי חאג׳ פריד שומרים על הדרך!');
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
  // 24 — סיום פרק ה׳ (לא סוף המשחק — ממשיך לפרק ו׳)
  {txt:'🏆 לוד — לעד ולנצח! 🐾',hint:'',targetFn:()=>({x:0,z:0}),unlock:()=>{
    setTimeout(()=>{
      showCut('ch5_finale',()=>{
        showCut('true_ending',()=>{
          showN('🐾 כלבי לוד — אגדה לעד!\n\n⏳ אבל הסיפור עוד לא נגמר...');
          _spawnFinalFireworks();
          // אחרי הזיקוקים — מעבר לפרק ו׳
          setTimeout(()=>setMission(25),6000);
        });
      });
    },1200);
  }},

  // ══════════════════════════════════════════════
  // פרק ו׳ — "צל"
  // ══════════════════════════════════════════════

  // 25 — גילוי רקס
  {txt:'2️⃣5️⃣ פרק ו׳: חזרו לבסיס — מומו מחכה 😶',
   hint:'בסיס הכנופייה',
   targetFn:()=>({x:0,z:60}),
   unlock:()=>{
     showCut('ch6_open',()=>{
       showCut('ch6_reks_dead',()=>{
         showN('💔 פרק ו׳ — "צל"\nרקס נמצא. הכנופייה צריכה להתאחד.');
       });
     });
   }},

  // 26 — הצל נראה לראשונה
  {txt:'2️⃣6️⃣ חקרו את שוק לוד — מישהו מוכר נראה שם 👁️',
   hint:'שוק לוד',
   targetFn:()=>({x:-60,z:60}),
   unlock:()=>{
     showCut('ch6_shadow_seen',()=>{
       showN('👁️ קולין ראה משהו בשוק.\nתחקרו את האזור.');
     });
   }},

  // 27 — זיפו עוקב
  {txt:'2️⃣7️⃣ זיפו: עקוב אחרי הצל לנמל הישן ⚡',
   hint:'נמל ישן — דרום לוד',
   targetFn:()=>({x:80,z:120}),
   unlock:()=>{
     showCut('ch6_shadow_zippo',()=>{
       showN('⚡ הצל יודע דברים שרק רקס יכול לדעת.\nהנמל הישן — תגלו מה הוא.');
     });
   }},

  // 28 — הבניין הנטוש
  {txt:'2️⃣8️⃣ חדרו לבניין הנטוש בדרום — הצל נכנס לשם 🔬',
   hint:'בניין נטוש — דרום',
   targetFn:()=>({x:90,z:100}),
   unlock:()=>{
     showN('🔬 ריח חריף. דלת פלדה. מישהו עבד כאן זמן רב.');
   }},

  // 29 — המעבדה
  {txt:'2️⃣9️⃣ בדקו את המעבדה — גלו מה מסתתר בפנים 😱',
   hint:'מעבדה — קומה תחתונה',
   targetFn:()=>({x:90,z:95}),
   unlock:()=>{
     showCut('ch6_lab_found',()=>{
       showCut('ch6_recording',()=>{
         showN('😱 ד"ר כץ. הוא עשה עוד כאלה.\nהצל מגן על המקום — היו מוכנים.');
       });
     });
   }},

  // 30 — קרב הצל
  {txt:'3️⃣0️⃣ הכנעו את הצל — הוא לא יצא בשקט ⚔️',
   hint:'הצל — מעבדה',
   targetFn:()=>G._shadowEnemy?{x:G._shadowEnemy.x,z:G._shadowEnemy.z}:{x:90,z:95},
   unlock:()=>{
     showCut('ch6_shadow_fight',()=>{
       _spawnShadowBoss();
       showN('⚔️ הצל חושב שהוא רקס.\nהוא יילחם כמו רקס.');
     });
   }},

  // 31 — המפעל המלא
  {txt:'3️⃣1️⃣ גלו מה מסתתר מאחורי הדלת האחורית 😱',
   hint:'דלת אחורית — מעבדה',
   targetFn:()=>({x:95,z:90}),
   unlock:()=>{
     showCut('ch6_factory',()=>{
       showN('😱 יש עוד. הרבה יותר.\nהוציאו את כל הכלובים — לפני שמסיימים.');
     });
   }},

  // 32 — שריפה וסיום
  {txt:'3️⃣2️⃣ הצתו את המקום — לוד לא תדע 🔥',
   hint:'ארון כימיקלים — מעבדה',
   targetFn:()=>({x:88,z:92}),
   unlock:()=>{
     showCut('ch6_fire',()=>{
       setTimeout(()=>{
         showCut('ch6_ending',()=>{
           showN('🏁 פרק ו׳ הסתיים.\n\nד"ר כץ נעלם. אבל לוד בטוחה.');
         });
       },2000);
     });
   }},
];

