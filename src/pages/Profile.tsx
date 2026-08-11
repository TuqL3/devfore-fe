import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { coursesApi } from '@/api/courses'
import { ApiError } from '@/lib/api'
import {
  applyTheme,
  getTheme,
  setTheme,
  watchSystem,
  type Theme,
} from '@/lib/theme'
import type { Session } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { SignOutButton } from '@/components/SignOutButton'
import { TwoFactor } from '@/components/TwoFactor'
import {
  Button,
  ErrorBox,
  Field,
  Input,
  PasswordInput,
} from '@/components/ui'
import { BookIcon, CheckIcon, LogOutIcon, MonitorIcon } from '@/components/icons'

const statusLabel: Record<string, string> = {
  active: 'đang hoạt động',
  pending: 'chờ kích hoạt',
  banned: 'bị khoá',
}

const statusDot: Record<string, string> = {
  active: 'bg-emerald-500',
  pending: 'bg-amber-500',
  banned: 'bg-red-500',
}

const TABS = [
  'Thông tin',
  'Giao diện',
  'Khoá học',
  'Mật khẩu',
  'Thiết bị',
  'Nguy hiểm',
] as const
type Tab = (typeof TABS)[number]

export default function Profile() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('Thông tin')
  // Signing out — here or on another device — empties the user. Rendering
  // nothing would leave a blank page behind.
  if (!user) return <Navigate to="/login" replace />

  const joined = new Date(user.created_at)

  return (
    // Bề rộng do `Layout` quyết (`max-w-6xl`, bằng thanh nav) — xem chú thích ở
    // SimList.
    <div className="space-y-8">
      <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
        />
        <div className="flex flex-wrap items-center gap-5">
          <Avatar user={user} className="h-20 w-20 rounded-xl text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-fg-strong">
              {user.username}
            </h1>
            <p className="mt-1 break-all text-fg-muted">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isAdmin && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs font-semibold text-accent-fg">
                  admin
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-fg-muted">
                <span
                  aria-hidden="true"
                  className={
                    'term-dot ' + (statusDot[user.status] ?? 'bg-zinc-500')
                  }
                />
                {statusLabel[user.status] ?? user.status}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-fg-muted">
                tham gia {joined.toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Same terminal framing as the rest of the site; prints only the fields
          GET /api/me actually returns. */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
          <span className="term-dot bg-red-400" />
          <span className="term-dot bg-amber-400" />
          <span className="term-dot bg-emerald-400" />
          <span className="ml-2 font-mono text-xs text-fg-muted">
            devforge@lab: ~
          </span>
        </div>
        <div className="overflow-x-auto px-4 py-4 font-mono text-sm">
          <div className="text-fg">
            <span className="text-success">$</span> id
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[7rem_1fr]">
            <Line label="uid" value={String(user.id)} />
            <Line label="user" value={user.username} />
            <Line label="email" value={user.email} />
            <Line
              label="groups"
              value={user.roles?.length ? user.roles.join(',') : 'user'}
            />
            <Line label="status" value={user.status} />
            <Line label="since" value={joined.toISOString().slice(0, 10)} />
          </dl>
          <div className="mt-3 text-success">
            $ <span className="term-caret" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2 border-b border-border pb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'rounded-t-md px-4 py-2 text-sm font-medium transition ' +
                (tab === t
                  ? t === 'Nguy hiểm'
                    ? 'border-b-2 border-danger bg-muted text-danger'
                    : 'border-b-2 border-accent bg-muted text-fg-strong'
                  : 'border-b-2 border-transparent text-fg-muted hover:bg-muted hover:text-fg-strong')
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div key={tab} className="page-enter min-h-80 pt-6">
          {tab === 'Thông tin' && <ProfileForm />}
          {tab === 'Giao diện' && <Appearance />}
          {tab === 'Khoá học' && <MyCourses />}
          {tab === 'Mật khẩu' && (
            <div className="space-y-8">
              <PasswordForm />
              <TwoFactor />
              <SignOutEverywhere />
            </div>
          )}
          {tab === 'Thiết bị' && <DeviceList />}
          {tab === 'Nguy hiểm' && <DangerZone />}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover"
        >
          <BookIcon className="h-4 w-4" />
          Khám phá khoá học
        </Link>
        <SignOutButton className="inline-flex items-center gap-2 rounded-md border border-border-strong px-5 py-2.5 font-medium text-fg transition hover:border-danger hover:text-danger">
          <LogOutIcon className="h-4 w-4" />
          Đăng xuất
        </SignOutButton>
      </div>
    </div>
  )
}

function errText(mut: { isError: boolean; error: unknown }, fallback: string) {
  if (!mut.isError) return ''
  return mut.error instanceof ApiError ? mut.error.message : fallback
}

function AvatarUpload() {
  const { user, uploadAvatar } = useAuth()
  const mut = useMutation({ mutationFn: uploadAvatar })

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file twice still fires onChange.
    e.target.value = ''
    if (file) mut.mutate(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-bg p-4">
      {user && <Avatar user={user} className="h-16 w-16 rounded-xl text-xl" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">Ảnh đại diện</p>
        <p className="mt-0.5 text-xs text-fg-subtle">
          png, jpg, gif hoặc webp — tối đa 2MB
        </p>
        {mut.isError && (
          <p className="mt-2 text-sm text-danger">
            {errText(mut, 'Tải ảnh thất bại')}
          </p>
        )}
      </div>
      <label className="shrink-0 cursor-pointer rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-fg transition hover:border-accent hover:text-accent-soft">
        {mut.isPending ? 'Đang tải…' : 'Chọn ảnh'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={onPick}
          disabled={mut.isPending}
          className="sr-only"
        />
      </label>
    </div>
  )
}

/** The courses this student signed up for, newest first, each with how far they
 *  got. Progress comes from the server rather than being counted here, so this
 *  and the leaderboard can never disagree. */
function MyCourses() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-courses'],
    queryFn: coursesApi.mine,
  })

  if (isLoading)
    return <p className="py-10 text-center text-sm text-fg-subtle">Đang tải…</p>

  if (isError)
    return <ErrorBox>Không tải được danh sách khoá học, thử lại.</ErrorBox>

  if (!data || data.length === 0)
    return (
      <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
        <BookIcon className="mx-auto h-6 w-6 text-fg-subtle" />
        <p className="mt-3 text-sm font-medium text-fg">Bạn chưa đăng ký khoá nào</p>
        <p className="mt-1 text-sm text-fg-subtle">
          Đăng ký một khoá là điều kiện để bắt đầu làm lab của nó.
        </p>
        <Link
          to="/courses"
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
        >
          Xem danh sách khoá học
        </Link>
      </div>
    )

  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.id}>
          <Link
            to={`/courses/${c.slug}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong"
          >
            {c.image_url ? (
              <img
                src={c.image_url}
                alt=""
                className="h-14 w-20 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="grid h-14 w-20 shrink-0 place-items-center rounded-md bg-muted text-fg-subtle">
                <BookIcon className="h-5 w-5" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg-strong">{c.title}</p>
              <p className="mt-0.5 truncate text-sm text-fg-muted">{c.description}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-fg-subtle">
                <span>
                  {c.labs_completed}/{c.lab_count} lab
                </span>
                <span>·</span>
                <span>{c.score} điểm</span>
                <span>·</span>
                <span>đăng ký {c.enrolled_at.slice(0, 10)}</span>
                {/* A course pulled back to draft stays on the shelf of somebody
                    who already started it, so it has to say what happened. */}
                {c.status === 'draft' && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500">tạm ẩn</span>
                  </>
                )}
              </p>
            </div>

            {/* Bar rather than a percentage: the number is small and the shape
                is what gets read at a glance. */}
            <div className="hidden w-28 shrink-0 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width:
                      c.lab_count > 0
                        ? `${Math.min(100, (c.labs_completed / c.lab_count) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ProfileForm() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    username: user?.username ?? '',
    email: user?.email ?? '',
  })

  const mut = useMutation({ mutationFn: () => updateProfile(form) })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AvatarUpload />

      <Field label="Username" hint="3-32 ký tự, chữ và số">
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          autoComplete="username"
          minLength={3}
          maxLength={32}
          required
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          required
        />
      </Field>

      {mut.isError && <ErrorBox>{errText(mut, 'Cập nhật thất bại')}</ErrorBox>}
      {mut.isSuccess && (
        <p className="text-sm text-success">Đã lưu thay đổi.</p>
      )}
      <Button type="submit" disabled={mut.isPending}>
        {mut.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </form>
  )
}

/** Ba lựa chọn giao diện, mỗi cái một ảnh xem trước.
 *
 *  Ảnh xem trước dùng **màu cứng**, không dùng biến của theme đang bật: ô "Sáng"
 *  phải trông sáng ngay cả khi trang đang tối, nếu không thì cả ba ô giống hệt
 *  nhau và người ta phải bấm thử từng cái mới biết mình chọn gì.
 *
 *  Cũng vì thế nó không dùng lại `ThemeToggle` — thứ ở thanh trên là ba cái nút
 *  cho khách chưa đăng nhập, còn đây là một màn cài đặt. Hai chỗ, hai việc. */
function Appearance() {
  const [theme, set] = useState<Theme>(getTheme)
  useEffect(() => watchSystem(() => applyTheme(getTheme())), [])

  function pick(t: Theme) {
    setTheme(t)
    set(t)
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fg-strong">Giao diện</h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Màu nền của trang. Đổi là thấy ngay, không cần lưu.
        </p>
      </div>

      <div role="radiogroup" aria-label="Giao diện" className="grid gap-4 sm:grid-cols-3">
        {THEME_CHOICES.map((c) => (
          <ThemeCard
            key={c.value}
            choice={c}
            selected={theme === c.value}
            onSelect={() => pick(c.value)}
          />
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-bg p-3 text-xs text-fg-subtle">
        <MonitorIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Lựa chọn này lưu trong <strong className="font-medium">trình duyệt
          này</strong>, không theo tài khoản — mở bằng máy khác hoặc trình duyệt
          khác thì phải chọn lại.
        </span>
      </p>
    </section>
  )
}

const THEME_CHOICES: {
  value: Theme
  label: string
  note: string
  /** `null` = nửa sáng nửa tối, cho lựa chọn "Theo hệ thống". */
  dark: boolean | null
}[] = [
  { value: 'light', label: 'Sáng', note: 'Nền trắng, hợp phòng nhiều đèn.', dark: false },
  { value: 'dark', label: 'Tối', note: 'Mặc định của DevForge.', dark: true },
  {
    value: 'system',
    label: 'Theo hệ thống',
    note: 'Đi theo cài đặt sáng/tối của máy bạn.',
    dark: null,
  },
]

function ThemeCard({
  choice,
  selected,
  onSelect,
}: {
  choice: (typeof THEME_CHOICES)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={
        'group overflow-hidden rounded-xl border text-left transition ' +
        (selected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border hover:border-border-strong')
      }
    >
      <ThemePreview dark={choice.dark} />
      <div className="flex items-start gap-2 border-t border-border bg-surface p-3">
        <span
          aria-hidden="true"
          className={
            'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition ' +
            (selected ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong')
          }
        >
          {selected && <CheckIcon className="h-2.5 w-2.5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg-strong">
            {choice.label}
          </span>
          <span className="mt-0.5 block text-xs text-fg-subtle">{choice.note}</span>
        </span>
      </div>
    </button>
  )
}

/** Một cửa sổ tí hon: thanh tiêu đề, cột trái, vài dòng chữ giả.
 *
 *  Màu viết cứng bằng hex chứ không lấy từ biến theme — xem chú thích ở
 *  `Appearance`. `null` thì cắt chéo: nửa trái sáng, nửa phải tối. */
function ThemePreview({ dark }: { dark: boolean | null }) {
  if (dark === null) {
    return (
      <div className="relative h-24">
        <Mock dark={false} />
        {/* Nửa tối chồng lên, cắt chéo — nói "hai cái này tuỳ lúc" rõ hơn bất kỳ
            dòng chữ nào. */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        >
          <Mock dark />
        </div>
      </div>
    )
  }
  return (
    <div className="h-24">
      <Mock dark={dark} />
    </div>
  )
}

function Mock({ dark }: { dark: boolean }) {
  const c = dark
    ? { bg: '#18181b', bar: '#27272a', panel: '#1f1f23', line: '#3f3f46' }
    : { bg: '#fafafa', bar: '#f0f0f1', panel: '#ffffff', line: '#d4d4d8' }
  return (
    <div className="flex h-full w-full flex-col" style={{ background: c.bg }}>
      <div
        className="flex items-center gap-1 px-2 py-1.5"
        style={{ background: c.bar }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#ea580c' }} />
        <span className="ml-1 h-1.5 w-8 rounded-full" style={{ background: c.line }} />
        <span className="h-1.5 w-6 rounded-full" style={{ background: c.line }} />
      </div>
      <div className="flex min-h-0 flex-1 gap-1.5 p-2">
        <div className="w-8 rounded" style={{ background: c.panel }} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded p-1.5" style={{ background: c.panel }}>
          <span className="h-1.5 w-full rounded-full" style={{ background: c.line }} />
          <span className="h-1.5 w-4/5 rounded-full" style={{ background: c.line }} />
          <span className="h-1.5 w-2/3 rounded-full" style={{ background: '#ea580c', opacity: 0.7 }} />
        </div>
      </div>
    </div>
  )
}

function PasswordForm() {
  const { changePassword } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [mismatch, setMismatch] = useState(false)

  const mut = useMutation({
    mutationFn: () => changePassword(form.current, form.next),
    onSuccess: () => setForm({ current: '', next: '', confirm: '' }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // Checked here rather than server-side: the confirm field never leaves
    // the browser, it only guards against typos.
    const bad = form.next !== form.confirm
    setMismatch(bad)
    if (!bad) mut.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Mật khẩu hiện tại" hint="bỏ trống nếu đăng nhập bằng Google">
        <PasswordInput
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
          autoComplete="current-password"
        />
      </Field>
      <Field label="Mật khẩu mới" hint="tối thiểu 8 ký tự">
        <PasswordInput
          value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Nhập lại mật khẩu mới">
        <PasswordInput
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      {mismatch && <ErrorBox>Hai mật khẩu không khớp.</ErrorBox>}
      {mut.isError && <ErrorBox>{errText(mut, 'Đổi mật khẩu thất bại')}</ErrorBox>}
      {mut.isSuccess && (
        <p className="text-sm text-success">
          Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất, máy này vẫn đăng
          nhập.
        </p>
      )}
      <Button type="submit" disabled={mut.isPending}>
        {mut.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  )
}

const SESSIONS = ['sessions'] as const

function DeviceList() {
  const { logout } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: SESSIONS,
    queryFn: authApi.sessions,
    retry: false,
  })

  const mut = useMutation({
    // Signing out the current device is exactly what logout() already does —
    // revoke the session and clear the cookies — so reuse it rather than
    // duplicating the cleanup here.
    mutationFn: (s: Session) =>
      s.current ? logout() : authApi.revokeSession(s.id),
    onSuccess: (_r, s) => {
      if (s.current) {
        nav('/login', { replace: true })
        return
      }
      void qc.invalidateQueries({ queryKey: SESSIONS })
    },
  })

  if (isLoading) return <p className="text-sm text-fg-subtle">Đang tải…</p>
  if (isError) return <ErrorBox>Không tải được danh sách thiết bị.</ErrorBox>

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Mỗi phiên đăng nhập còn hiệu lực trên tài khoản. Không nhận ra thiết bị
        nào thì thoát nó ra, rồi đổi mật khẩu.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {data?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium text-fg-strong">
                {deviceLabel(s.user_agent)}
                {s.current && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 font-mono text-[10px] uppercase text-success">
                    máy này
                  </span>
                )}
              </p>
              {/* The raw header on hover: the pretty label is a guess, this is
                  what the server actually recorded. */}
              <p
                className="mt-0.5 truncate font-mono text-xs text-fg-subtle"
                title={s.user_agent}
              >
                {s.ip} · đăng nhập {new Date(s.created_at).toLocaleString('vi-VN')}
              </p>
              <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                hoạt động {timeAgo(s.last_seen)}
              </p>
            </div>
            <button
              onClick={() => mut.mutate(s)}
              disabled={mut.isPending}
              className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-fg transition hover:border-danger hover:text-danger disabled:opacity-40"
            >
              {s.current ? 'Thoát máy này' : 'Thoát'}
            </button>
          </li>
        ))}
      </ul>

      {mut.isError && <ErrorBox>{errText(mut, 'Thoát thất bại')}</ErrorBox>}
    </div>
  )
}

/**
 * User-Agent strings are not a format, they are a pile of history, so this is a
 * best-effort label and the raw string stays available in the title attribute.
 * Order matters: Edge and Opera both claim to be Chrome, and Chrome claims to
 * be Safari.
 */
function deviceLabel(ua: string) {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : ''
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  if (browser && os) return `${browser} trên ${os}`
  return browser || os || 'Thiết bị không rõ'
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
]

// ponytail: Intl.RelativeTimeFormat is built in — no date library for this.
function timeAgo(iso: string) {
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
  let diff = (Date.parse(iso) - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) < size) return rtf.format(Math.round(diff), unit)
    diff /= size
  }
  return rtf.format(Math.round(diff), 'week')
}

// Changing the password already evicts the other devices. This is for the case
// where there is nothing to change — a session left open on a machine that is
// no longer yours.
function SignOutEverywhere() {
  const { logoutEverywhere } = useAuth()
  const nav = useNavigate()
  const [armed, setArmed] = useState(false)

  const mut = useMutation({
    mutationFn: logoutEverywhere,
    // This device goes with the rest, so /profile has nothing left to render.
    // Leaving explicitly beats letting it fall through to a blank page.
    onSuccess: () => nav('/login', { replace: true }),
  })

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h3 className="font-semibold text-fg-strong">Thoát mọi thiết bị</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Huỷ mọi phiên đăng nhập của tài khoản, kể cả máy này. Dùng khi bạn để
          quên đăng nhập ở máy khác. Mật khẩu không đổi — đăng nhập lại như bình
          thường.
        </p>
      </div>

      {mut.isError && <ErrorBox>{errText(mut, 'Không thoát được')}</ErrorBox>}

      {armed ? (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogOutIcon className="h-4 w-4" />
            {mut.isPending ? 'Đang thoát…' : 'Chắc chắn, thoát hết'}
          </button>
          <button
            onClick={() => setArmed(false)}
            disabled={mut.isPending}
            className="rounded-md border border-border-strong px-4 py-2.5 font-medium text-fg transition hover:border-accent hover:text-accent-soft"
          >
            Huỷ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setArmed(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2.5 font-medium text-fg transition hover:border-danger hover:text-danger"
        >
          <LogOutIcon className="h-4 w-4" />
          Thoát mọi thiết bị
        </button>
      )}
    </div>
  )
}

/**
 * Chrome fills anything that looks like a login form, which would pre-fill both
 * confirmation fields and defeat the point of them. `autoComplete` alone is
 * ignored here, so the fields start read-only and open up on focus — autofill
 * runs at render time and skips read-only inputs.
 */
function useNoAutofill() {
  const [locked, setLocked] = useState(true)
  return {
    readOnly: locked,
    onFocus: () => setLocked(false),
    autoComplete: 'off' as const,
  }
}

function DangerZone() {
  const { user, deleteAccount } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const noFillName = useNoAutofill()
  const noFillPass = useNoAutofill()
  const mut = useMutation({ mutationFn: () => deleteAccount(password) })

  // Typing the username is the guard against a reflex click; the password is
  // the guard against someone else using a stolen session.
  const armed = confirm === user?.username

  return (
    <div className="space-y-4 rounded-xl border border-danger/40 bg-danger/5 p-5">
      <div>
        <h3 className="font-semibold text-danger">Xoá tài khoản vĩnh viễn</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Tài khoản, các khoá học đã ghi danh và toàn bộ tiến độ sẽ bị xoá khỏi
          hệ thống. Thao tác này không thể hoàn tác.
        </p>
      </div>

      <Field label={`Gõ "${user?.username}" để xác nhận`}>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={user?.username}
          spellCheck={false}
          {...noFillName}
        />
      </Field>
      <Field label="Mật khẩu" hint="bỏ trống nếu đăng nhập bằng Google">
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mật khẩu hiện tại"
          {...noFillPass}
        />
      </Field>

      {mut.isError && <ErrorBox>{errText(mut, 'Xoá thất bại')}</ErrorBox>}
      <button
        onClick={() => mut.mutate()}
        disabled={!armed || mut.isPending}
        className="w-full rounded-md bg-danger px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mut.isPending ? 'Đang xoá…' : 'Xoá tài khoản của tôi'}
      </button>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-accent-soft">{label}</dt>
      <dd className="break-all text-fg-muted">{value}</dd>
    </>
  )
}
