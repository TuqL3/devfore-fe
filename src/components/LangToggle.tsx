import { getLang, setLang, useT, type Lang } from '@/lib/i18n'

const LANGS: { value: Lang; short: string; labelKey: 'lang.vi' | 'lang.en' }[] = [
  { value: 'vi', short: 'VI', labelKey: 'lang.vi' },
  { value: 'en', short: 'EN', labelKey: 'lang.en' },
]

/** Two codes side by side in the top bar, next to the theme toggle. It stays
 *  visible when signed in as well: unlike theme, a wrong language hides the
 *  menu someone would have to open to fix it. */
export function LangToggle() {
  const t = useT()
  const lang = getLang()

  return (
    <div
      role="group"
      aria-label={t('lang.group')}
      className="flex rounded-lg border border-border bg-surface p-0.5"
    >
      {LANGS.map(({ value, short, labelKey }) => (
        <button
          key={value}
          onClick={() => setLang(value)}
          title={t(labelKey)}
          aria-label={t(labelKey)}
          aria-pressed={lang === value}
          className={
            'rounded-md px-1.5 py-1 font-mono text-xs transition ' +
            (lang === value
              ? 'bg-muted text-accent-soft'
              : 'text-fg-subtle hover:text-fg-strong')
          }
        >
          {short}
        </button>
      ))}
    </div>
  )
}
