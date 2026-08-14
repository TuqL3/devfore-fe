import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { Card, ErrorBox } from '@/components/ui'
import { ArrowLeftIcon } from '@/components/icons'
import { formatWhen, timeAgo } from '@/lib/relativeTime'
import type { UserSimRun, UserSessionRow } from '@/lib/types'
import { useT } from '@/lib/i18n'

/** Hoạt động của một người: họ đã làm gì, và đã **gõ gì**.
 *
 *  Hai thứ đáng đọc nhất ở đây không phải con số:
 *
 *  1. **Pipeline họ viết trong mô phỏng.** Một pipeline sai nói chính xác phần
 *     nào của mô hình chưa vào đầu — thứ mà điểm số không bao giờ nói được.
 *  2. **Lịch sử lệnh trong ca trực.** Đây là thứ nhạy cảm nhất cả hệ thống lưu:
 *     bản ghi nguyên văn thứ một người gõ vào shell, kể cả cái mật khẩu họ gõ
 *     nhầm vào đó. Nên nó **không** nằm sẵn trong trang — phải bấm mở, và mỗi
 *     lần mở là một dòng trong nhật ký kiểm toán mang tên người mở.
 *
 *  Cả trang này cũng được ghi audit khi mở, vì đây là đọc việc của người khác
 *  chứ không phải đọc một con số của hệ thống. */
export default function AdminActivity() {
  const t = useT()
  const { id = '' } = useParams()
  const q = useQuery({
    queryKey: ['user-activity', id],
    queryFn: () => adminApi.userActivity(Number(id)),
    enabled: Boolean(id),
    retry: false,
  })

  if (q.isLoading) {
    return <p className="py-12 text-center text-sm text-fg-subtle">{t('common.loading')}</p>
  }
  if (q.isError || !q.data) return <ErrorBox>{t('activity.notFound')}</ErrorBox>

  const { summary: s, sessions, sim_runs: runs } = q.data

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        {t('activity.backUsers')}
      </Link>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-fg-strong">{s.username}</h1>
        {s.status === 'banned' && (
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
            {t('activity.banned')}
          </span>
        )}
        <span className="text-sm text-fg-muted">{s.email}</span>
        <span className="text-xs text-fg-subtle">
          {t('activity.joined', { when: formatWhen(s.created_at) })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Num label={t('activity.sessions')} value={s.sessions} />
        <Num label={t('activity.submitted')} value={s.submitted} />
        <Num label={t('activity.simRuns')} value={s.sim_runs} />
        <Num label={t('activity.chat')} value={s.chat_messages} />
        <Num label={t('activity.enrolments')} value={s.enrolments} />
      </div>

      <Sessions rows={sessions} />
      <SimRuns rows={runs} />
    </div>
  )
}

function Sessions({ rows }: { rows: UserSessionRow[] }) {
  const t = useT()
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">{t('activity.attempts')}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">{t('activity.attemptsNone')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <SessionRow key={r.session_id} r={r} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function SessionRow({ r }: { r: UserSessionRow }) {
  const t = useT()
  const [openLog, setOpenLog] = useState(false)
  // `enabled` chứ không phải gọi sẵn: mỗi lần gọi là một dòng audit, nên nó chỉ
  // được xảy ra khi có người thật sự bấm mở.
  const log = useQuery({
    queryKey: ['session-commands', r.session_id],
    queryFn: () => adminApi.sessionCommands(r.session_id),
    enabled: openLog,
    retry: false,
  })

  return (
    <li className="py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 truncate">
          {r.lab_title}
          {r.incident_title && (
            <span className="ml-2 text-xs text-fg-subtle">— {r.incident_title}</span>
          )}
        </span>
        <span
          className={
            'rounded px-1.5 py-0.5 text-[11px] ' +
            (r.status === 'submitted'
              ? 'bg-success-soft text-success'
              : 'bg-muted text-fg-muted')
          }
        >
          {r.status}
        </span>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {r.passed}/{r.total}
        </span>
        <span className="text-xs text-fg-subtle">{timeAgo(r.started_at)}</span>
        {r.has_commands && (
          <button
            onClick={() => setOpenLog((v) => !v)}
            className="rounded-md border border-border-strong px-2 py-0.5 text-xs text-fg-muted transition hover:border-accent hover:text-fg"
          >
            {openLog ? t('activity.hideCommands') : t('activity.showCommands')}
          </button>
        )}
      </div>

      {openLog && (
        <div className="mt-2">
          {/* Cảnh báo đứng TRÊN nội dung, không phải dưới: người đọc cần biết
              mình sắp đọc gì trước khi mắt chạm vào nó. */}
          <p className="text-[11px] text-fg-subtle">{t('activity.commandsWarning')}</p>
          {log.isLoading && <p className="mt-1 text-xs text-fg-subtle">{t('common.loading')}</p>}
          {log.isError && <p className="mt-1 text-xs text-danger">{t('dash.loadError')}</p>}
          {log.data !== undefined && (
            <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-fg">
              {log.data.trim() || t('activity.commandsEmpty')}
            </pre>
          )}
        </div>
      )}
    </li>
  )
}

/** Mọi pipeline người này đã viết trong mô phỏng, kèm nguyên văn.
 *
 *  Cắt ở server ở mức 4000 ký tự; nếu bản gốc dài hơn thì nói ra chứ không im
 *  lặng để người đọc tưởng nó kết thúc ở đó. */
function SimRuns({ rows }: { rows: UserSimRun[] }) {
  const t = useT()
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">{t('activity.simRunsTitle')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('activity.simRunsHint')}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">{t('activity.simRunsNone')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-fg-subtle">#{r.run_index}</span>
                <span className="min-w-0 flex-1 truncate text-fg-muted">
                  {r.lab_title || t('activity.playground')}
                </span>
                {r.total_seconds > 0 && (
                  <span className="font-mono text-xs tabular-nums text-fg-muted">
                    {r.total_seconds}s
                  </span>
                )}
                <span className="text-xs text-fg-subtle">{timeAgo(r.created_at)}</span>
                <button
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="rounded-md border border-border-strong px-2 py-0.5 text-xs text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  {open === r.id ? t('activity.hidePipeline') : t('activity.showPipeline')}
                </button>
              </div>
              {open === r.id && (
                <>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-fg">
                    {r.pipeline}
                  </pre>
                  {r.pipeline_length > r.pipeline.length && (
                    <p className="mt-1 text-[11px] text-fg-subtle">
                      {t('activity.pipelineTruncated', { n: r.pipeline_length })}
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-fg-strong">
        {value.toLocaleString()}
      </p>
    </Card>
  )
}
