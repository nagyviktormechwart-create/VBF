// Kiinduló szemrevételezési tételek. Ezek csak javaslatok: egyik sem kötelező, a teljes lista szakmai felülvizsgálata a felülvizsgáló feladata.
export const CHECK_TEMPLATE: { category: string; items: string[] }[] = [
  { category: 'Általános állapot', items: ['Villamos berendezések általános állapota', 'A berendezések hozzáférhetősége', 'Látható sérülések', 'Szakszerűtlen átalakítások', 'Veszélyes állapotok'] },
  { category: 'Elosztótáblák', items: ['Elosztótábla mechanikai állapota', 'Burkolatok megléte és állapota', 'Feszültség alatt álló részek érintés elleni védelme',
    'Védelmi készülékek azonosíthatósága', 'Áramköri feliratok', 'PE- és N-vezetők kialakítása'] },
  { category: 'Vezetékek és szerelvények', items: ['Vezetékek látható állapota', 'Kábelek és vezetékek rögzítése', 'Szerelvények állapota',
    'Kapcsolók és csatlakozóaljzatok állapota', 'Mechanikai védelem', 'Külső behatások elleni védelem'] },
  { category: 'Védelmi intézkedések', items: ['Védővezetők kialakítása', 'EPH-rendszer látható kialakítása', 'Áram-védőkapcsolók megléte, ahol alkalmazandó',
    'Túláramvédelmi eszközök', 'Védelmi eszközök jelölése'] },
  { category: 'Jelölések és dokumentáció', items: ['Figyelmeztető feliratok', 'Elosztótáblák feliratozása', 'Áramköri azonosítók', 'Rendelkezésre álló villamos dokumentáció'] },
];
// A mintajegyzőkönyv (MSZ HD 60364-6:2017) szerinti lista; a szöveget és a hivatkozásokat a felülvizsgáló hagyja jóvá, a tételek átnevezhetők.
export const REPORT_TEMPLATE: { category: string; items: string[] }[] = [
  { category: 'Szerkezetek szemrevételezése', items: [
    'a) megfelelnek a vonatkozó termékszabvány biztonsági követelményeinek (jelölések, tanúsítványok és gyártói információk alapján),',
    'b) az MSZ HD 60364 szabványsorozat és a gyártó előírásai szerinti a kiválasztásuk és a szerelésük, és',
    'c) nincsen olyan látható sérülésük, amely csökkentené a biztonságot.'] },
  { category: 'Szemrevételezés során történt ellenőrzések', items: [
    'a) az áramütés elleni védelmi mód (lásd az IEC 60364-4-41-et);',
    'b) tűzgátló szerkezetek és a tűz továbbterjedésének megakadályozására szolgáló más óvintézkedések, valamint a hőhatások elleni védelem megléte (lásd az IEC 60634-4-42-t és az IEC 60364-5-52:2009 527. fejezetét)',
    'c) a vezetők megfelelő kiválasztása a megengedett áram szempontjából (lásd az IEC 60364-4-43-at és az IEC 60364-5-52:2009 523. fejezetét)',
    'd) a védelmi eszközök és a megfigyelőkészülékek kiválasztása, beállítása, szelektivitása és koordinációja (lásd az IEC 60364-5-53:2001 536. fejezetét)',
    'e) ahol elő van írva, a megfelelő túlfeszültség-védelmi eszközök (SPD) kiválasztása, elhelyezése és szerelése (lásd az IEC 60364-5-53:2001-et és az IEC 60364-5-53:2001/AMD2:2015 534. fejezetét)',
    'f) a megfelelő leválasztó- és kapcsolókészülékek kiválasztása, elhelyezése és szerelése (lásd az IEC 60364-5-53:2001 536. fejezetét)',
    'g) a villamos szerkezetek és a védelmi módok külső hatásoknak és mechanikai igénybevételeknek megfelelő kiválasztása (lásd az IEC 60364-4-42:2010 422. fejezetét, az IEC 60364-5-51:2005 512.2. szakaszát és az IEC 60364-5-52:2009 522. fejezetét)',
    'h) a nulla- és a védővezető megjelölése (lásd az IEC 60364-5-51:2005 514.3. szakaszát)',
    'i) a kapcsolási rajzok, figyelmeztető feliratok vagy hasonló információk megléte (lásd az IEC 60364-5-51:2005 514.5. szakaszát)',
    'j) az áramkörök, túláramvédelmi eszközök, kapcsolók, csatlakozókapcsok stb. megjelölése (lásd az IEC 60364-5-51:2005 514. fejezetét)',
    'k) a kábelek és vezetékek végződéseinek és csatlakozásainak megfelelősége (lásd az IEC 60364-5-52:2009 526. fejezetét)',
    'l) a földelőberendezések, a védővezetők és azok csatlakozásainak kiválasztása és szerelése (lásd az IEC 60364-5-54-et)',
    'm) a szerkezetek könnyű kezeléséhez, azonosításához és karbantartásához szükséges hozzáférhetőség (lásd az IEC 60364-5-51:2005 513. és 514. fejezetét)',
    'n) az elektromágneses zavarok elleni intézkedések (lásd az IEC 60364-4-44:2007 444. fejezetét)',
    'o) a test csatlakoztatása a földelőberendezéshez (lásd az IEC 60364-4-41:2005 411. fejezetét)',
    'p) a kábel- és vezetékrendszerek kiválasztása és szerelése (lásd az IEC 60364-5-52:2009 521. és 522. fejezetét)'] },
  { category: 'Műszeres, méréses vizsgálatok', items: [
    'a) a vezetők folytonossága (6.4.3.2.) – MSZ EN 61557-4:2007', 'b) a szigetelési ellenállás (6.4.3.3.) – MSZ EN 61557-2:2007',
    'c) a szigetelési ellenállást a SELV-vel, PELV-vel és a villamos elválasztással megvalósított védelem hatásosságának ellenőrzése céljából (6.4.3.4.) - MSZ EN 61557-2:2007',
    'd) a szigetelési ellenállást a padlózat és a fal ellenállásának/impedanciájának ellenőrzése céljából (61.3.5)', 'e) a polaritás vizsgálatát (6.4.3.6.)',
    'f) a táplálás önműködő lekapcsolásával megvalósított védelmi mód hatásosságát (6.4.3.7.)', 'g) a kiegészítő védelem hatásosságát (6.4.3.8.)',
    'h) a fázissorrendet (6.4.3.9.)', 'i) a működést (6.4.3.10.)', 'j) a feszültségesést (6.4.3.11.)'] },
];
export const CHECK_CATEGORIES = [...CHECK_TEMPLATE.map(c => c.category), ...REPORT_TEMPLATE.map(c => c.category), 'Egyéb'];
