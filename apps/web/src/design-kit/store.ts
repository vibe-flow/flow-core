/**
 * L'état du kit, mémorisé dans le localStorage : ce qu'on a réglé (thème, variantes) et la forme
 * du panneau. Les cadres de la planche (`?v=all`) partagent la même clé et se resynchronisent
 * à chaque écriture (événement `storage`).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeValues } from './css-tokens'
import type { KitState, TweakValue } from './values'

export const PANEL_WIDTH = { min: 280, max: 560, default: 340 }

interface DesignKitStore extends KitState {
  mode: 'light' | 'dark'
  panelOpen: boolean
  panelWidth: number
  /** Les variantes à l'écran (`<slug>/<id>`) — éphémère, non mémorisé. */
  onScreen: string[]
  setTheme: <K extends keyof ThemeValues>(key: K, value: ThemeValues[K]) => void
  setTweak: (variantKey: string, name: string, value: TweakValue) => void
  setMode: (mode: 'light' | 'dark') => void
  setPanelOpen: (open: boolean) => void
  setPanelWidth: (width: number) => void
  setOnScreen: (keys: string[]) => void
  reset: () => void
}

export const STORAGE_KEY = 'design-kit'

export const useDesignKit = create<DesignKitStore>()(
  persist(
    (set) => ({
      theme: {},
      tweaks: {},
      mode: 'light',
      panelOpen: false,
      panelWidth: PANEL_WIDTH.default,
      onScreen: [],
      setTheme: (key, value) => set((s) => ({ theme: { ...s.theme, [key]: value } })),
      setTweak: (variantKey, name, value) =>
        set((s) => ({
          tweaks: { ...s.tweaks, [variantKey]: { ...s.tweaks[variantKey], [name]: value } },
        })),
      setMode: (mode) => set({ mode }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setPanelWidth: (w) =>
        set({ panelWidth: Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, Math.round(w))) }),
      setOnScreen: (onScreen) => set({ onScreen }),
      reset: () => set({ theme: {}, tweaks: {}, mode: 'light' }),
    }),
    {
      name: STORAGE_KEY,
      partialize: ({ onScreen: _onScreen, ...rest }) => rest,
    },
  ),
)

// Un autre onglet ou un cadre de la planche a écrit : on relit.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) void useDesignKit.persist.rehydrate()
  })
}
