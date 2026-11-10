import { create } from 'zustand';
import { registerSW } from 'virtual:pwa-register';

interface InstallEvent extends Event { prompt: () => Promise<void> }
export const usePwa = create<{ needRefresh: boolean; offlineReady: boolean; update: () => void; installEvent: InstallEvent | null }>(() => ({
  needRefresh: false, offlineReady: false, update: () => {}, installEvent: null }));

export function initPwa() {
  const updateSW = registerSW({
    onNeedRefresh() { usePwa.setState({ needRefresh: true }); },
    onOfflineReady() { usePwa.setState({ offlineReady: true }); },
  });
  usePwa.setState({ update: () => { void updateSW(true); } });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); usePwa.setState({ installEvent: e as InstallEvent }); });
  window.addEventListener('appinstalled', () => usePwa.setState({ installEvent: null }));
  // Tartós tárhely kérése: ez csökkenti annak esélyét, hogy a böngésző szükség esetén törölje az adatbázist.
  void navigator.storage?.persist?.();
}
