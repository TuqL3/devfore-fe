export type Theme = 'light' | 'dark' | 'system'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

/** Dark is the product default; `system` only applies if the user picks it. */
export function getTheme(): Theme {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'system' ? v : 'dark'
}

export function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(t: Theme) {
  // `system` is stored, not inferred from a missing key — no key means dark.
  localStorage.setItem(KEY, t)
  applyTheme(t)
}

/** Re-apply on OS change; only matters while the user is on `system`. */
export function watchSystem(onChange: () => void) {
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
