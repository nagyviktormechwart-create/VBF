// Az egyfájlos (dupla kattintással megnyitható) változatban nincs service worker.
export function registerSW(_options?: unknown) { return async (_reload?: boolean) => {}; }
