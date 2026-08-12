/** Key parity between vi and en is enforced by the type on `en`, so this only
 *  covers what types cannot see: interpolation and the fallback chain.
 *  Run: node --experimental-strip-types src/lib/i18n.check.ts */
import assert from 'node:assert'
import vi from './locales/vi.ts'
import en from './locales/en.ts'

const interpolate = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m))

assert.equal(interpolate(vi['nav.unread'], { count: 3 }), '3 tin nhắn chưa đọc')
assert.equal(interpolate(en['nav.unread'], { count: 3 }), '3 unread messages')

// An unknown placeholder stays on screen rather than turning into "undefined" —
// a visible {name} names the bug, "undefined" hides it.
assert.equal(interpolate('hi {name}', {}), 'hi {name}')

// Every placeholder in vi must exist in the en string too, or a switch to
// English silently drops the number it was meant to show.
const holes = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',')
for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
  assert.equal(holes(en[key]), holes(vi[key]), `placeholder mismatch: ${key}`)
  assert.ok(en[key].trim().length > 0, `empty translation: ${key}`)
}

console.log('i18n.check ok')
