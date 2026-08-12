import { useEffect, useState, type ComponentType } from 'react'
import { applyTheme, getTheme, setTheme, watchSystem, type Theme } from '@/lib/theme'
import { useT } from '@/lib/i18n'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'

const MODES: {
  value: Theme
  Icon: ComponentType<{ className?: string }>
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system'
}[] = [
  { value: 'light', Icon: SunIcon, labelKey: 'theme.light' },
  { value: 'dark', Icon: MoonIcon, labelKey: 'theme.dark' },
  { value: 'system', Icon: MonitorIcon, labelKey: 'theme.system' },
]

/** Ba icon sát nhau, cho thanh trên cùng và màn đăng nhập — nơi khách chưa đăng
 *  nhập cần đổi được giao diện mà không có trang Hồ sơ nào để vào.
 *
 *  Người đã đăng nhập chọn ở **Hồ sơ → Giao diện**, nơi có chỗ cho ảnh xem trước
 *  thật. Hai chỗ, hai hình dạng: nhét ảnh xem trước vào một thanh cao 14 thì
 *  không xem được gì, mà ba icon không nhãn trong một trang cài đặt thì trông
 *  như nút chưa làm xong. */
export function ThemeToggle() {
  const [theme, set] = useState<Theme>(getTheme)
  const t = useT()

  useEffect(() => watchSystem(() => applyTheme(getTheme())), [])

  function pick(t: Theme) {
    setTheme(t)
    set(t)
  }

  return (
    <div role="group" aria-label={t('theme.group')} className="flex rounded-lg border border-border bg-surface p-0.5">
      {MODES.map(({ value, Icon, labelKey }) => (
        <button
          key={value}
          onClick={() => pick(value)}
          title={t(labelKey)}
          aria-label={t(labelKey)}
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
