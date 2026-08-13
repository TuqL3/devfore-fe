import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import { mdSummary } from '@/lib/mdSummary'
import { Card, ErrorBox } from '@/components/ui'
import { ChevronRightIcon, ClockIcon, TerminalIcon } from '@/components/icons'
import { clockLabel } from '@/lib/clock'
import type { Lab, LabSession } from '@/lib/types'
import { useT } from '@/lib/i18n'

/** War Room — thử thách có hạn giờ.
 *
 *  Khác lab của khoá học ở ba chỗ: vào thẳng từ nav không cần đăng ký khoá nào,
 *  hệ thống đã hỏng sẵn lúc bạn mở nó ra, và đồng hồ là một phần của đề bài chứ
 *  không phải hạn dọn rác của container — hết giờ là thua thật.
 *
 *  Thẻ ở đây chỉ **tóm tắt**. Đề bài đầy đủ có tiêu đề, khối lệnh và trích dẫn:
 *  đổ nguyên vào danh sách thì code tràn ngang, tiêu đề lặp lại tên vừa in, và
 *  một thẻ dài hơn cả màn hình. Chỗ đọc đề là màn làm bài, nơi đồng hồ đã chạy. */
export default function WarRoom() {
  const t = useT()
  const drills = useQuery({ queryKey: ['drills'], queryFn: labsApi.drills })
  const current = useQuery({ queryKey: ['lab-session'], queryFn: labsApi.current })
  const running = current.data ?? null

  return (
    // Không tự bọc bề rộng: `Layout` đã kẹp mọi trang vào `max-w-6xl px-4` —
    // đúng bề rộng của thanh nav. Bọc thêm ở đây là kẹp hai lần, và trang hẹp
    // hơn header thì đọc ra là lỗi bố cục chứ không ra chủ ý.
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-fg-strong">War Room</h1>
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
            {t('war.timed')}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-fg">
          {t('war.lead')}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          {t('war.sub')}
        </p>
      </header>

      {running && <RunningNow session={running} />}

      <DailyCard blocked={Boolean(running)} />

      {drills.isLoading && (
        <p className="text-sm text-fg-subtle">{t('common.loading')}</p>
      )}
      {drills.isError && <ErrorBox>{t('war.loadError')}</ErrorBox>}
      {drills.data?.length === 0 && (
        <p className="text-sm text-fg-subtle">{t('war.empty')}</p>
      )}

      <ul className="space-y-4">
        {(drills.data ?? []).map((d) => (
          <li key={d.slug}>
            <DrillCard drill={d} blocked={Boolean(running)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Một phiên đang chạy chặn mọi nút Bắt đầu — mỗi người một container. Nói ra
 *  chuyện đó kèm đường quay lại, thay vì để người dùng bấm vào một nút xám và tự
 *  đoán vì sao. */
function RunningNow({ session }: { session: LabSession }) {
  const t = useT()
  const to = session.incident
    ? `/war-room/${session.lab_slug}`
    : `/courses/${session.course_slug}/labs/${session.lab_slug}`
  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 p-4">
      <p className="text-sm text-fg">
        {t('war.blockedBefore')}
        {session.incident ? t('war.blockedIncident') : '.'}{' '}
        {t('war.blockedAfter')}
      </p>
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-strong transition hover:border-accent"
      >
        {t('war.backToSession')}
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </Card>
  )
}

/** Ca trực hôm nay: **cùng một sự cố cho tất cả mọi người**, đổi lúc nửa đêm UTC.
 *
 *  Đây là thứ khiến bảng xếp hạng có nghĩa. Danh sách bên dưới bốc sự cố ngẫu
 *  nhiên mỗi lượt chạy — đúng cho việc luyện tập, nhưng hai người chơi hai sự cố
 *  khác nhau thì hai con số của họ không so được với nhau. Ở đây thì so được, và
 *  đó là toàn bộ lý do khối này đứng trên cùng.
 *
 *  Chưa có kịch bản nào được xuất bản thì server trả 404 và khối này biến mất —
 *  vẽ một cái bảng rỗng là hứa một thử thách không tồn tại. */
function DailyCard({ blocked }: { blocked: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const daily = useQuery({ queryKey: ['daily-drill'], queryFn: labsApi.daily, retry: false })

  const start = useMutation({
    mutationFn: () => labsApi.start(daily.data!.lab_slug, daily.data!.incident_id),
    onSuccess: (session) => {
      qc.setQueryData(['lab-session'], session)
      navigate(`/war-room/${daily.data!.lab_slug}`)
    },
  })

  if (daily.isLoading || daily.isError || !daily.data) return null
  const d = daily.data
  const busy = start.error instanceof ApiError && start.error.status === 409

  return (
    <Card className="mb-6 border-accent/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-soft">
              {t('daily.badge')}
            </span>
            <span className="font-mono text-xs text-fg-subtle">{d.day}</span>
          </div>
          <h2 className="mt-2 font-semibold text-fg-strong">{d.lab_title}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('daily.sameForAll')}</p>
        </div>

        <button
          onClick={() => start.mutate()}
          disabled={start.isPending || blocked}
          title={blocked ? t('war.blockedTitle') : undefined}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <TerminalIcon className="h-4 w-4" />
          {start.isPending ? t('war.starting') : t('daily.start')}
        </button>
      </div>

      {busy && <p className="mt-3 text-sm text-danger">{t('war.blockedShort')}</p>}
      {start.isError && !busy && (
        <p className="mt-3 text-sm text-danger">{t('war.startFailed')}</p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
          {t('daily.board')}
        </p>
        {d.leaders.length === 0 ? (
          // Chưa ai cứu được hôm nay là một trạng thái đáng nói ra, không phải
          // một khoảng trắng: nó là lời mời đứng đầu bảng.
          <p className="mt-2 text-sm text-fg-subtle">{t('daily.empty')}</p>
        ) : (
          <ol className="mt-2 space-y-1">
            {d.leaders.map((l, i) => (
              <li key={l.player + i} className="flex items-baseline gap-3 text-sm">
                <span className="w-5 shrink-0 text-right font-mono text-xs text-fg-subtle">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-fg">{l.player}</span>
                <span className="font-mono tabular-nums text-fg-strong">
                  {clockLabel(l.downtime_seconds)}
                </span>
                <span className="hidden font-mono text-xs tabular-nums text-fg-subtle sm:inline">
                  {t('daily.requests', { n: l.requests_failed.toLocaleString() })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}

function DrillCard({ drill, blocked }: { drill: Lab; blocked: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const start = useMutation({
    mutationFn: () => labsApi.start(drill.slug),
    onSuccess: (session) => {
      // Ghi thẳng vào cache thay vì để màn làm bài hỏi lại: nó quay về đây khi
      // chưa thấy phiên nào, nên một vòng fetch nữa là một lần nảy ngược.
      qc.setQueryData(['lab-session'], session)
      navigate(`/war-room/${drill.slug}`)
    },
  })

  // 409 nghĩa là đang có phiên khác chạy dở. Nói đúng chuyện đó: việc cần làm là
  // kết thúc phiên kia, không phải bấm lại.
  const busy = start.error instanceof ApiError && start.error.status === 409

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg-strong">{drill.title}</h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            {mdSummary(drill.description_md)}
          </p>

          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-fg-subtle">
            <Chip>
              <ClockIcon className="h-3.5 w-3.5" />
              {t('war.minutesToFix', { n: drill.duration_minutes })}
            </Chip>
            <Chip>{t('war.chipContainer')}</Chip>
            <Chip>{t('war.chipRandom')}</Chip>
            <Chip>{t('war.chipNoEnrol')}</Chip>
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending || blocked}
            title={blocked ? t('war.blockedTitle') : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TerminalIcon className="h-4 w-4" />
            {start.isPending ? t('war.starting') : t('war.start')}
          </button>
          {/* Cảnh báo đứng cạnh nút chứ không nằm cuối thẻ: bấm xong là đồng hồ
              chạy, không có màn xác nhận nào ở giữa. */}
          <p className="text-xs text-fg-subtle sm:text-right">
            {t('war.clockWarning')}
          </p>
        </div>
      </div>

      {busy && (
        <p className="mt-3 text-sm text-danger">
          {t('war.blockedShort')}
        </p>
      )}
      {start.isError && !busy && (
        <p className="mt-3 text-sm text-danger">
          {t('war.startFailed')}
        </p>
      )}
    </Card>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
      {children}
    </li>
  )
}
