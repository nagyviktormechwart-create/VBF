import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'auto';
const KEY = 'vn-theme';
const read = (): ThemeMode => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch { return 'auto'; } };
const resolve = (m: ThemeMode) => (m === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : m);
const apply = (m: ThemeMode) => { document.documentElement.dataset.theme = resolve(m); };

export const useTheme = create<{ mode: ThemeMode; set: (m: ThemeMode) => void }>(set => ({
  mode: read(),
  set: m => { try { localStorage.setItem(KEY, m); } catch { /* a téma nem kritikus adat */ } apply(m); set({ mode: m }); },
}));
export const isDark = () => document.documentElement.dataset.theme === 'dark';

// A rendszerbeállítás változását „automatikus” módban követi.
export function initTheme() {
  apply(useTheme.getState().mode);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (useTheme.getState().mode === 'auto') apply('auto'); });
}
