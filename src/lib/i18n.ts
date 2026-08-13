import { useSyncExternalStore } from 'react'
import vi from '@/lib/locales/vi'
import en from '@/lib/locales/en'

export type Lang = 'vi' | 'en'
export type Key = keyof typeof vi

const DICTS: Record<Lang, Record<Key, string>> = { vi, en }
const KEY = 'lang'

/** Vietnamese is the product default; only an explicit pick stores 'en'. */
let lang: Lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'vi'
document.documentElement.lang = lang

const subs = new Set<() => void>()

export const getLang = () => lang

export function setLang(l: Lang) {
  lang = l
  localStorage.setItem(KEY, l)
  document.documentElement.lang = l
  subs.forEach((f) => f())
}

/** BCP-47 tag for `toLocaleDateString` and friends. Dates were pinned to
 *  'vi-VN' all over the app, which printed 12/08/2026 to an English reader. */
export const locale = () => (lang === 'en' ? 'en-GB' : 'vi-VN')

function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

/** Falls back to Vietnamese, then to the key itself — a raw key on screen is
 *  louder than an empty string, and something has to render either way. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const s = DICTS[lang][key] ?? vi[key] ?? key
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m)) : s
}

/** Components call this, not `t` directly: the subscription is what re-renders
 *  them when the language changes. `t` alone works anywhere, but a component
 *  using it keeps the old language on screen until something else re-renders. */
export function useT() {
  useSyncExternalStore(subscribe, getLang)
  return t
}
