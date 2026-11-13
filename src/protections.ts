// Védelmi módok és érintésvédelmi osztályok jelölőlistái (a mintajegyzőkönyv felsorolása szerint); a jelölést a felülvizsgáló adja meg.
export const PROTECTION_GROUPS: { key: string; title: string; items: string[] }[] = [
  { key: 'systems', title: 'Felülvizsgált hálózati rendszerek', items: ['TN-C rendszer', 'TN-S rendszer', 'TN-C-S rendszer', 'TT rendszer', 'IT rendszer'] },
  { key: 'modes', title: 'Védelmi módok', items: ['A táplálás önműködő lekapcsolása (I.)', 'Kettős vagy megerősített szigetelés (II.)', 'Villamos elválasztás (III.)', 'SELV- és PELV-törpefeszültség (IV.)'] },
  { key: 'supplementary', title: 'Kiegészítő védelmek', items: ['Áram-védőkapcsolók (RCD)', 'Kiegészítő egyenpotenciálú összekötés (KEPH)'] },
  { key: 'skilled', title: 'Szakképzett és kioktatott személyek által irányított vagy felügyelt/irányított berendezések védelmi módjai',
    items: ['Környezet elszigetelése (KE)', 'Védelem földeletlen helyi egyenpotenciálú összekötéssel (HEPH)', 'Villamos elválasztás egynél több fogyasztókészülék táplálása esetén (IIIT)', 'Egyenpotenciálra hozó hálózat (EPH)'] },
  { key: 'basic', title: 'Alapvédelem', items: ['Aktív részek alapszigetelése (ASZ)', 'Védőfedések (VF)', 'Védőburkolatok (VB)'] },
  { key: 'basicSkilled', title: 'Alapvédelem szakképzett és kioktatott személyek által irányított vagy felügyelt/irányított berendezések esetében', items: ['Védőakadályok (VA)', 'Elérhető tartományon kívüli elhelyezés (EH)'] },
  { key: 'classes', title: 'Érintésvédelmi osztályok', items: ['0-s érintésvédelmi osztály (0)', '1-es érintésvédelmi osztály – PE-t igénylő szerkezetek (1)',
    '2-es érintésvédelmi osztály – kettős vagy megerősített szigetelésű szerkezet (2)', '3-as érintésvédelmi osztály – törpefeszültségű szerkezetek (3)'] },
];
