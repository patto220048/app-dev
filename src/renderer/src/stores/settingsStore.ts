import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SettingsState {
  settings: AppSettings
  showSettings: boolean
  setSettings: (settings: Partial<AppSettings>) => void
  setShowSettings: (show: boolean) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    apiProvider: 'fal',
    apiKey: '',
    language: 'en'
  },
  showSettings: false,

  setSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial }
    })),

  setShowSettings: (show) => set({ showSettings: show }),

  loadSettings: async () => {
    try {
      const saved = await (window as any).api.loadSettings()
      if (saved) {
        set({ settings: saved })
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  },

  saveSettings: async () => {
    try {
      const { settings } = get()
      await (window as any).api.saveSettings(JSON.stringify(settings))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }
}))
