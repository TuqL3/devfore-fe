import { useEffect, useState, type ComponentType } from 'react'
import { applyTheme, getTheme, setTheme, watchSystem, type Theme } from '@/lib/theme'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'

const MODES: { value: Theme; Icon: ComponentType<{ className?: string }>; label: string }[] = [
  { value: 'light', Icon: SunIcon, label: 'Giao diện sáng' },
  { value: 'dark', Icon: MoonIcon, label: 'Giao diện tối' },
  { value: 'system', Icon: MonitorIcon, label: 'Theo hệ thống' },
]

export function ThemeToggle() {
  const [theme, set] = useState<Theme>(getTheme)

  useEffect(() => watchSystem(() => applyTheme(getTheme())), [])

  function pick(t: Theme) {
    setTheme(t)
    set(t)
  }

  return (
    <div className="flex rounded-lg border border-border bg-surface p-0.5">
      {MODES.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => pick(value)}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          className={
            'rounded-md p-1.5 transition ' +
            (theme === value
              ? 'bg-muted text-accent-soft'
              : 'text-fg-subtle hover:text-fg-strong')
          }
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
