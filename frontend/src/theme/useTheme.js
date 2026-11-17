import { useSyncExternalStore } from 'react'
import { getPreference, getTheme, setPreference, subscribe } from './theme'

// theme: what is showing now ('light' or 'dark'). preference: what the user chose,
// which can also be 'system'.
export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark')
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'system')
  return {
    theme,
    preference,
    setPreference,
    toggle: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
  }
}
