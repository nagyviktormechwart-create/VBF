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
export const CHECK_CATEGORIES = [...CHECK_TEMPLATE.map(c => c.category), 'Egyéb'];
