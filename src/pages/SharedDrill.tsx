import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Card, ErrorBox } from '@/components/ui'
import { ShareTargets } from '@/components/ShareTargets'
import { ChevronRightIcon, ClockIcon, TerminalIcon } from '@/components/icons'
import { clockLabel } from '@/lib/clock'
import { track } from '@/lib/analytics'
import { useT } from '@/lib/i18n'
import type { SharedDrill as Shared } from '@/lib/types'

/** Trang công khai của một ca trực đã xong. Route duy nhất của cả trang web mở
 *  được mà không cần đăng nhập gì.
 *
 *  Nó phải làm đúng hai việc, theo thứ tự đó: nói người kia đã cứu sự cố nhanh
 *  cỡ nào, và mời người đọc thử **đúng** sự cố ấy. Cái thứ hai là lý do trang này
 *  tồn tại — một trang khoe thành tích mà không có nút thử lại thì lan được một
 *  lần rồi tắt.
 *
 *  Vì thế tên sự cố bị giấu sau một cú bấm. Nó là spoiler: người đọc đang đứng
 *  trước lời mời đi tìm đúng cái lỗi mà dòng chữ đó gọi tên. Giấu chứ không cắt —
 *  kết quả này nói về đúng lỗi đó, và ai muốn biết thì có quyền biết. */
export default function SharedDrill() {
  const t = useT()
  const { token = '' } = useParams()
  const q = useQuery({
    queryKey: ['shared-drill', token],
    queryFn: () => labsApi.shared(token),
    retry: false,
  })

  if (q.isLoading) {
    return <p className="py-16 text-center text-sm text-fg-subtle">{t('common.loading')}</p>
  }
  // Token chưa từng tồn tại và token đã bị gỡ xuống trả lời giống hệt nhau — có
  // hay không có một link là chuyện không cần xác nhận với người lạ.
  if (q.isError || !q.data) {
    return (
      <Card className="mx-auto max-w-lg px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg">{t('shared.gone')}</p>
        <Link to="/war-room" className="mt-2 inline-block text-sm text-accent-soft hover:underline">
          {t('shared.toWarRoom')} →
        </Link>
      </Card>
    )
  }

  return <Result d={q.data} />
}

function Result({ d }: { d: Shared }) {
  const t = useT()
  const [spoiled, setSpoiled] = useState(false)

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
            War Room
          </span>
          <span className="text-xs text-fg-subtle">
            {new Date(d.started_at).toLocaleDateString()}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-fg-strong">
          {d.recovered
            ? t('shared.headlineFixed', { player: d.player })
            : t('shared.headlineFailed', { player: d.player })}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{d.lab_title}</p>
      </header>

      {/* Ba con số, con số cứu được đứng giữa và to nhất — đó là thứ người ta
          dán link để khoe, và cũng là thứ người đọc so mình với. */}
      <Card className="grid gap-px overflow-hidden bg-border sm:grid-cols-3">
        <Stat
          label={t('shared.outcome')}
          value={d.recovered ? t('shared.fixed') : t('shared.notFixed')}
          tone={d.recovered ? 'good' : 'bad'}
        />
        <Stat
          label={t('shared.downtime')}
          value={d.recovered ? clockLabel(d.downtime_seconds) : '—'}
          big
        />
        <Stat
          label={t('shared.requestsFailed')}
          value={d.recovered ? d.requests_failed.toLocaleString() : '—'}
          hint={t('shared.rpsNote', { rps: d.rps })}
        />
      </Card>

      {/* Tên lỗi nằm sau một cú bấm có cảnh báo, không phải sau một cái nhãn
          "xem thêm" trung tính: bấm nhầm ở đây là mất hẳn phần đáng chơi. */}
      <div className="mt-4">
        {spoiled ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-fg-subtle">{t('shared.faultWas')} </span>
            <span className="font-medium text-fg-strong">{d.incident_title}</span>
          </p>
        ) : (
          <button
            onClick={() => setSpoiled(true)}
            className="rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-fg-muted transition hover:border-accent/60 hover:text-fg"
          >
            {t('shared.revealFault')}
          </button>
        )}
      </div>

      <TryIt d={d} />

      {/* Người đọc thấy hay thì chuyền tiếp — đó là cách một link đi xa hơn một
          lần dán. Chữ soạn sẵn nói về kết quả của người khác, không nhận vơ. */}
      <div className="mt-6 flex justify-center">
        <ShareTargets
          url={window.location.href}
          text={
            d.recovered
              ? t('shared.passOn', { player: d.player, time: clockLabel(d.downtime_seconds) })
              : t('shared.passOnFailed', { player: d.player })
          }
        />
      </div>

      <p className="mt-8 text-center text-xs text-fg-subtle">{t('shared.simulatedNote')}</p>
    </div>
  )
}

/** Lời mời chơi lại đúng ca đó.
 *
 *  Container tốn tiền thật, nên cửa vào là đăng nhập — người chưa đăng nhập được
 *  đưa sang trang đăng nhập mang theo đường quay lại chính trang này, để họ về
 *  đúng chỗ đang đứng chứ không rơi về trang chủ. */
function TryIt({ d }: { d: Shared }) {
  const t = useT()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const start = useMutation({
    // Con số đáng đo nhất của cả tính năng: bao nhiêu người lạ đọc xong rồi
    // thật sự nhận ca. Lượt xem trang không trả lời được câu đó.
    mutationFn: () => {
      track('shared-drill-try', { lab: d.lab_slug })
      return labsApi.start(d.lab_slug, d.incident_id)
    },
    onSuccess: (session) => {
      qc.setQueryData(['lab-session'], session)
      navigate(`/war-room/${d.lab_slug}`)
    },
  })

  // 409: đang có phiên khác chạy dở. Việc cần làm là kết thúc phiên kia, không
  // phải bấm lại — nên nói đúng chuyện đó thay vì "thử lại".
  const busy = start.error instanceof ApiError && start.error.status === 409
  // 404 ở đây nghĩa là kịch bản đã bị tác giả gỡ. Không im lặng bốc một sự cố
  // khác: link này hứa đúng một ca, giao ca khác là thất hứa mà không ai biết.
  const gone = start.error instanceof ApiError && start.error.status === 404

  return (
    <Card className="mt-6 border-accent/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg-strong">{t('shared.tryTitle')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('shared.trySub')}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-fg-subtle">
            <Chip>
              <ClockIcon className="h-3.5 w-3.5" />
              {t('shared.sameFault')}
            </Chip>
            <Chip>{t('war.chipContainer')}</Chip>
            <Chip>{t('war.chipNoEnrol')}</Chip>
          </ul>
        </div>

        {user ? (
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TerminalIcon className="h-4 w-4" />
            {start.isPending ? t('war.starting') : t('shared.tryIt')}
          </button>
        ) : (
          <Link
            to="/login"
            state={{ from: location.pathname }}
            onClick={() => track('shared-drill-signin', { lab: d.lab_slug })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
          >
            {t('shared.signInToTry')}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {busy && <div className="mt-3"><ErrorBox>{t('war.blockedShort')}</ErrorBox></div>}
      {gone && <div className="mt-3"><ErrorBox>{t('shared.scenarioGone')}</ErrorBox></div>}
      {start.isError && !busy && !gone && (
        <div className="mt-3"><ErrorBox>{t('war.startFailed')}</ErrorBox></div>
      )}
    </Card>
  )
}

function Stat({
  label,
  value,
  hint,
  big,
  tone,
}: {
  label: string
  value: string
  hint?: string
  big?: boolean
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <p
        className={
          'mt-0.5 font-semibold tabular-nums ' +
          (big ? 'text-2xl ' : 'text-lg ') +
          (tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-danger' : 'text-fg-strong')
        }
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-fg-subtle">{hint}</p>}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
      {children}
    </li>
  )
}

/** Ai vào `/r` trống thì đưa về War Room, chứ không phải một trang 404 nói rằng
 *  đường dẫn sai — họ đang đi tìm đúng chỗ đó. */
export function SharedDrillIndex() {
  return <Navigate to="/war-room" replace />
}
