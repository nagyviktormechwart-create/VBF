import type { FieldDef, FieldType } from './db';

export const FIELD_GROUPS = ['Impedancia- és zárlati mérések', 'Szigetelési ellenállás', 'Védővezető és EPH', 'ÁVK-vizsgálatok',
  'Védelmi készülékek', 'Hálózati adatok', 'Vezetékek és vezetők', 'Egyéb mérési adatok'] as const;
const [G0, G1, G2, G3, G4, G5, G6, G7] = FIELD_GROUPS;

const BY_LABEL: Record<string, string> = {
  'Hurokimpedancia': G0, 'Vonali impedancia': G0, 'Várható zárlati áram': G0, 'Szigetelési ellenállás': G1,
  'PE-folytonosság': G2, 'EPH-folytonosság': G2, 'Egyéb vezető folytonossága': G2, 'Vizsgált vezető vagy szerkezeti elem': G2, 'Vizsgált csatlakozási pont': G2,
  'ÁVK kioldóáram': G3, 'ÁVK típusa': G3, 'ÁVK névleges hibaárama': G3, 'ÁVK pólusszáma': G3,
  'Védelmi készülék típusa': G4, 'Védelmi készülék karakterisztikája': G4, 'Védelmi készülék pólusszáma': G4, 'Védelmi készülék megszakítóképessége': G4, 'Névleges áram': G4,
  'Névleges feszültség': G5, 'Betáplálás': G5, 'Elosztó azonosítója': G5, 'PE/N állapot': G5, 'Áramkör azonosítója': G5, 'Áramkör megnevezése': G5,
  'Vezető anyaga': G6, 'Vezető keresztmetszete': G6, 'Mérési módszer': G7, 'Mérési körülmények': G7, 'Mérési megjegyzés': G7 };

// A mező csoportja: a megadott kategória, ennek hiányában a név alapján, végül „Egyéb mérési adatok”.
export function categoryOf(f: { label: string; category?: string }): string {
  if (f.category && (FIELD_GROUPS as readonly string[]).includes(f.category)) return f.category;
  return /^ÁVK kioldási idő/.test(f.label) ? G3 : BY_LABEL[f.label] ?? G7;
}

const mk = (label: string, unit = '', type: FieldType = 'decimal', options?: string[]): FieldDef =>
  ({ id: label + '|' + unit, label, unit, type, ...(options ? { options } : {}) });
const TRIP = ['1/2x 0°', '1/2x 180°', '1x 0°', '1x 180°', '5x 0°', '5x 180°'];
// Választható mezőkönyvtár: a meglévő katalógus mezői mellett ezek is kiválaszthatók (szöveges mezőknél a lista csak javaslat).
export const LIBRARY: FieldDef[] = [
  mk('Áramkör azonosítója', '', 'text'), mk('Áramkör megnevezése', '', 'text'),
  mk('ÁVK típusa', '', 'text', ['AC', 'A', 'F', 'B']), mk('ÁVK névleges hibaárama', 'mA'), mk('ÁVK pólusszáma', '', 'text', ['2', '4']),
  mk('ÁVK kioldási idő', 'ms'), ...TRIP.map(t => mk('ÁVK kioldási idő ' + t, 'ms')), mk('ÁVK kioldóáram', 'mA'),
  mk('Védelmi készülék karakterisztikája', '', 'text', ['B', 'C', 'D', 'K', 'Z', 'gG']), mk('Védelmi készülék pólusszáma', '', 'text', ['1', '2', '3', '4']),
  mk('Védelmi készülék megszakítóképessége', 'kA'), mk('Mérési módszer', '', 'text'), mk('Mérési körülmények', '', 'text'), mk('Mérési megjegyzés', '', 'text'),
  mk('Vizsgált csatlakozási pont', '', 'text'), mk('Egyéb vezető folytonossága', 'Ω'),
];
