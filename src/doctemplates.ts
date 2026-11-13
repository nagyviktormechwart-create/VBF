// Szövegsablonok a későbbi jegyzőkönyvhöz. Az alapszövegek a mintajegyzőkönyvből származnak; a jogi és szakmai tartalmat a felülvizsgáló hagyja jóvá és szerkeszti.
export const DOC_TEMPLATES: { key: string; title: string; text: string }[] = [
  { key: 'reportTitle', title: 'A jelentés címe (fejléc, címlap)', text: 'VILLAMOS BIZTONSÁGI FELÜLVIZSGÁLATI JELENTÉS' },
  { key: 'standardTitle', title: 'A szabvány megnevezése (fejléc, címlap)', text: 'MSZ HD 60364-6:2017' },
  { key: 'qualIntro', title: 'Minősítő irat: bevezető mondat', text: 'Tárgyi erősáramú villamos berendezésen elvégeztük az MSZ HD 60364-6:2017 szerinti, időszakos felülvizsgálatot.' },
  { key: 'qualPrefix', title: 'Minősítő irat: minősítés előtti mondat', text: 'A felülvizsgált erősáramú berendezés az MSZ HD 60364-6:2017 szerint' },
  { key: 'qualNote', title: 'Minősítő irat: érvényességi megjegyzés', text: 'A jelen minősítést a felülvizsgálati dokumentáció további fejezetei és mellékletei alapozzák meg, a MINŐSÍTŐ IRAT kizárólag azokkal együtt érvényes.' },
  { key: 'qualScope', title: 'Minősítő irat: a minősített terület meghatározása', text: 'Jelen dokumentációban és a mellékletét képező jegyzőkönyvekben és bizonylatokban felsorolt érintésvédelmi módok, rendszerek, kiegészítő védelmek, berendezések, eszközök és áramkörök.' },
  { key: 'operatorNotes', title: 'Megjegyzések az üzemeltető, felelős vezető, tulajdonos, felhasználó részére', text: [
    'Tárgyi villamos-berendezés rendeltetésszerű használata, illetve ennek biztosítása kötelező',
    'Tárgyi villamos-berendezés időszakos karbantartása és a tárgyi villamos-berendezésre vonatkozó jogszabályokban előírt felülvizsgálatok és ellenőrzések elvégzése, illetve elvégeztetése kötelező',
    'Tárgyi villamos-berendezésen villamos szakképzettséget igénylő beavatkozást, változtatást, felújítást, karbantartást és egyéb tevékenységet csak villamosan szakképzett és arra felhatalmazott személy végezhet a hatályos jogszabályok előírásainak és vonatkozó szabványok követelményeinek betartásával.',
    'Tárgyi villamos-berendezésen történt bármilyen szakszerű változtatás után az érintett szakaszon és a változtatás által HD 60364 sorozat bármely követelménye a szempontjából érintett, már meglévő szakaszon az előírt vizsgálatokat el kell végezni – az erre vonatkozó jogszabályokat és előírásokat, illetve ezek változásait nyomon kell követni és be kell tartani, illetve tartatni.',
    '40/2017. (XII. 4.) NGM rendelet az összekötő és felhasználói berendezésekről, valamint a potenciálisan robbanásveszélyes közegben működő villamos berendezésekről és védelmi rendszerekről előírásainak betartása – amennyiben vonatkoznak a',
    '10/2016. (IV. 5.) NGM rendelet 19. § előírásainak betartása – amennyiben vonatkoznak a',
    'Létesítmény felelős vezetője pluszkövetelményeket megszabhat'].join('\n') },
  { key: 'periodic', title: 'Következő vizsgálat: időszakosságra vonatkozó mondat', text: 'A használatbavételt követően a villamos biztonsági felülvizsgálat elvégzéséről az üzemeltetőnek kötelessége gondoskodni legalább 3 évenként.' },
  { key: 'footnotes', title: 'Lábjegyzetek (a, b, c)', text: [
    'a Amennyiben az MSZ HD 60364-6:2017-et áramütés elleni védelem felülvizsgálataként készítik el, csak az áramütés elleni védelemre vonatkozó előírásokat kell ellenőrizni.',
    'b Az MSZ HD 60364-6:2017 lapja nem ír elő kötelezően záros határidőn belüli időszakos felülvizsgálatot. A jelenleg érvényes jogszabály, a 191/2009 (IX. 15) kormányrendelet, csak meghatározott építési tevékenységeknél, csak első MSZ HD 60364-6 szerinti felülvizsgálatot ír elő.',
    'c A villamos berendezés fajtájától függően a 10/2016. (IV. 5.) NGM vagy 40/2017. (XII. 4.) NGM rendelet szerelői ellenőrzést, illetve felülvizsgálatot írhat elő 3, illetve 6 éven belül.'].join('\n') },
  { key: 'regulations', title: 'A felülvizsgálattal kapcsolatos előírások', text: [
    '1995. évi XXVIII. Törvény a nemzeti szabványmódosításról, módosította. 2011. évi CXII. törvény',
    '191/2009. (IX. 15.) Korm. rendelet az építőipari kivitelezési tevékenységről',
    '21/2010. (V.14) NFGM rendelet egyes ipari és kereskedelmi tevékenységek gyakorlásához szükséges képesítésekről',
    '10/2016. (IV. 5.) NGM rendelet a munkaeszközök és használatuk biztonsági és egészségügyi követelményeinek minimális szintjéről',
    '40/2017. (XII. 4.) NGM rendelet az összekötő és felhasználói berendezésekről, valamint a potenciálisan robbanásveszélyes közegben működő villamos berendezésekről és védelmi rendszerekről'].join('\n') },
  { key: 'standards', title: 'A felülvizsgálattal kapcsolatos főbb szabványok', text: [
    'MSZ 1585:2016 Villamos berendezések üzemeltetése', 'MSZ EN 61557-1:2007 Általános követelmények', 'MSZ HD 60364-1:2009 Alapelvek, általános jellemzők elemzése, fogalmak',
    'MSZ HD 60364-7-701:2007 Különleges berendezésekre vagy helyiségekre vonatkozó követelmények.',
    'MSZ EN 61140:2003 Az áramütés elleni védelem. A villamos berendezésekre és a villamos szerkezetekre vonatkozó közös szempontok'].join('\n') },
  { key: 'abbreviations', title: 'A jegyzőkönyvben használt rövidítések', text: ['MF\tMegfelelő', 'NEM\tNem megfelelő', 'NA\tA vizsgálat nem alkalmazható', 'N.M\tNem mérhető érték', 'É.v.\tÉrintésvédelmi osztály', 'V.v.F\tVédővezető folytonos', 'Kar.\tKarakterisztika'].join('\n') },
  { key: 'contents', title: 'Tartalom (a címlapon)', text: ['1. Alapdokumentáció (tartalmazza a Tájékoztató megrendelő részére iratot)', '2. Jegyzőkönyvek', '3. Bizonylatok', '• Végzettség igazolása', '• A felülvizsgálat során használt műszer(ek) hitelesítésének igazolása'].join('\n') },
  { key: 'guideTitle', title: 'Útmutató a megrendelőnek: bevezető mondat', text: 'E dokumentáció fontos és értékes dokumentum, amelyet meg kell őrizni.' },
  { key: 'guide', title: 'Útmutató a megrendelőnek', text: [
    '1) Ennek az állapotfelmérő dokumentációnak az a célja, hogy lehetőség szerint megállapítsa azt, hogy az adott villamos berendezés a további működés szempontjából kielégítő állapotban van vagy sem. A dokumentáció azonosít minden olyan károsodást, állagromlást, hibát és/vagy állapotot, amely növelheti a veszélyt.',
    '2) A dokumentációt megrendelő személy kap a dokumentációból egy eredeti példányt és a felülvizsgáló megtart egy másodpéldányt.',
    '3) Az eredeti dokumentációt biztonságos helyen meg kell őrizni, és minden olyan személynek a rendelkezésére kell bocsátani, aki a jövőben a villamos berendezést felülvizsgálja vagy azon munkát végez. Ha az ingatlan megüresedik, akkor ezt a dokumentációt az új tulajdonossal/bérlővel meg kell ismertetni a villamos berendezésnek a dokumentáció készítésének idején érvényes állapotának részleteivel együtt.',
    '4) A fontos teljes mértékben azonosítani a berendezésnek azt a kiterjedését, amelyre a dokumentáció vonatkozik, valamint a felülvizsgálat esetleges korlátozásait. A felülvizsgálónak ezekről a dokumentációt megrendelő személlyel és más érdekelt felekkel (engedélyező hatóság, biztosítótársaság, jelzálog-hitelező és hasonlók) meg kell állapodnia még a felülvizsgálat elvégzése előtt.',
    '5) A felülvizsgálat során előfordulhatnak olyan üzemeltetési korlátozások, mint pl. a berendezés vagy a szerkezetek egyes részeihez való hozzáférhetetlenségek. A felülvizsgáló ezeket a dokumentációban feltünteti.',
    '6) A „Veszély áll fenn” észrevételek azt jelentik, hogy a berendezés használata veszélyes, és javasolt, hogy kompetens személy azonnal elvégezze a hibajavítást.',
    '7) A „Potenciálisan veszélyes” észrevételek azt jelentik, hogy a berendezés használata veszélyes lehet, és javasolt, hogy kompetens személy sürgősen végezze el a hibajavítást.',
    '8) Ha a dokumentáció további vizsgálatot ír elő, mert a felülvizsgáló olyan nyilvánvaló hiányosságot tárt fel, amelyet az adott szemrevételezés kiterjedése és korlátozásai miatt nem lehet teljes mértékben azonosítani, akkor ilyen esetekben haladéktalanul további vizsgálatra van szükség a nyilvánvaló hiányosság természetének és mértékének megállapítására.',
    '9) Biztonsági okokból a villamos berendezést megfelelő időközönként kompetens személynek ismételten felül kell vizsgálnia. A következő felülvizsgálat javasolt időpontja a dokumentációban fel van tüntetve.'].join('\n') },
];
export const DEFECT_SEVERITY_SUGGESTIONS = ['Nem jelent közvetlen életveszélyt', 'Potenciálisan veszélyes', 'Veszély áll fenn', 'További vizsgálat szükséges'];
