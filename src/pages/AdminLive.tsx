import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { Card, ErrorBox } from '@/components/ui'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ChevronRightIcon, TerminalIcon } from '@/components/icons'
import { timeAgo } from '@/lib/relativeTime'
import type { RunningSession, SystemEvent } from '@/lib/types'

/** Đang diễn ra — màn đầu tiên của khu quản trị.
 *
 *  Câu hỏi nó trả lời là "ngay lúc này có gì đang chạy, và có gì đang hỏng".
 *  Bản trước chỉ có bốn ô số và một danh sách container; thứ nó không bao giờ
 *  nói được là **có gì hỏng không** — mọi sự cố đều chui vào log rồi bay mất
 *  cùng container.
 *
 *  Thứ tự trên xuống là thứ tự cần biết: sức chứa còn bao nhiêu (thứ duy nhất
 *  hỏng thì cả nền tảng dừng), rồi sự cố, rồi ai đang làm gì, rồi số liệu nền. */
export default function AdminLive() {
  const [hours, setHours] = useState(24)
  const q = useQuery({
    queryKey: ['admin-overview', hours],
    queryFn: () => adminApi.overview(hours),
    // Màn này là "ngay bây giờ". Số liệu cũ 5 phút ở đây không phải chậm, mà là
    // sai — nó mô tả một trạng thái không còn tồn tại.
    refetchInterval: 15_000,
  })

  if (q.isLoading) {
    return <p className="py-12 text-center text-sm text-fg-subtle">Loading…</p>
  }
  if (q.isError || !q.data) return <ErrorBox>Could not read the numbers. Try reloading the page.</ErrorBox>

  const d = q.data
  const used = d.counts.running
  const slots = d.max_slots > 0 ? d.max_slots : 1
  const pct = Math.min(100, Math.round((used / slots) * 100))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">Happening now</h1>
          <p className="mt-1 text-sm text-fg-muted">What is running this minute, and what is failing.</p>
        </div>
        {/* Một cửa sổ thời gian cho mọi con số bên dưới. Trộn "hôm nay" với
            "tuần này" trên cùng một dải là mời người đọc cộng trừ sai. */}
        <div className="flex gap-1">
          {[24, 24 * 7, 24 * 30].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={
                'rounded-md border px-2.5 py-1 text-xs transition ' +
                (h === hours
                  ? 'border-accent bg-accent/10 text-accent-soft'
                  : 'border-border-strong text-fg-muted hover:text-fg')
              }
            >
              {`${h / 24} days`}
            </button>
          ))}
        </div>
      </div>

      {/* Sức chứa đứng đầu vì nó là thứ duy nhất ở đây mà hết là cả nền tảng
          dừng: kín chỗ nghĩa là người mới bấm Bắt đầu và bị từ chối. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-fg-strong">Container capacity</h2>
          <span className="font-mono text-sm tabular-nums text-fg-strong">
            {used} / {d.max_slots}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={
              'h-full rounded-full transition-[width] ' +
              (pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-amber-500' : 'bg-success')
            }
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          {pct >= 90 ? 'Nearly full — the next lab start may be refused.' : 'Full means the next person to press Start is turned away. It is the one thing here that stops the whole platform when it runs out.'}
        </p>
      </Card>

      <EventStrip summary={d.events ?? []} hours={hours} />

      <RunningList rows={d.running} />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Num label="lab starts" value={d.counts.sessions} />
        <Num label="hand-ins" value={d.counts.submitted} />
        <Num label="simulator runs" value={d.counts.sim_runs} />
        <Num label="messages" value={d.counts.chat_messages} />
        <Num label="new accounts" value={d.counts.new_users} />
        <Num label="total accounts" value={d.counts.users} />
        <Num label="banned" value={d.counts.banned} tone={d.counts.banned > 0} />
        <Num label="public reports" value={d.counts.shared_reports} />
      </div>
    </div>
  )
}

/** Tóm tắt sự cố, rồi mở ra dòng chi tiết.
 *
 *  Đếm trước, danh sách sau: câu hỏi đầu tiên là "có gì hỏng không", và bắt
 *  người ta cuộn một danh sách để tự đếm là trả lời sai câu đó. */
function EventStrip({ summary, hours }: { summary: { kind: string; severity: string; n: number }[]; hours: number }) {
  const [open, setOpen] = useState<string | null>(null)
  const feed = useQuery({
    queryKey: ['admin-events', open],
    queryFn: () => adminApi.events(open ?? ''),
    enabled: open !== null,
  })

  const errors = summary.filter((s) => s.severity === 'error')
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-fg-strong">System failures</h2>
        <span className="text-xs text-fg-subtle">{`last ${hours / 24} days`}</span>
      </div>

      {summary.length === 0 ? (
        // Không có sự cố nào là một câu trả lời, không phải một khoảng trắng.
        <p className="mt-2 text-sm text-success">Nothing failed in this window.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {summary.map((s) => (
            <li key={s.kind + s.severity}>
              <button
                onClick={() => setOpen(open === s.kind ? null : s.kind)}
                className={
                  'rounded-full border px-3 py-1 text-xs transition ' +
                  (open === s.kind ? 'border-accent text-accent-soft' : 'border-border-strong') +
                  (s.severity === 'error' ? ' text-danger' : ' text-fg-muted')
                }
              >
                <span className="font-mono">{s.kind}</span>
                <span className="ml-2 font-semibold tabular-nums">{s.n}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.length === 0 && summary.length > 0 && (
        <p className="mt-2 text-xs text-fg-subtle">Warnings only, no errors.</p>
      )}

      {open && (
        <div className="mt-4 border-t border-border pt-3">
          {feed.isLoading && <p className="text-sm text-fg-subtle">Loading…</p>}
          <ul className="space-y-2">
            {(feed.data ?? []).map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function EventRow({ e }: { e: SystemEvent }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="font-mono text-[11px] text-fg-subtle">{timeAgo(e.at)}</span>
      <span
        className={
          'rounded px-1.5 text-[11px] ' +
          (e.severity === 'error' ? 'bg-danger/10 text-danger' : 'bg-muted text-fg-muted')
        }
      >
        {e.severity}
      </span>
      <span className="min-w-0 flex-1 text-fg">{e.detail}</span>
      {e.actor_name && (
        <Link
          to={`/admin/users/${e.actor_id}`}
          className="text-xs text-accent-soft hover:underline"
        >
          {e.actor_name}
        </Link>
      )}
      {e.subject && <span className="font-mono text-[11px] text-fg-subtle">{e.subject}</span>}
    </li>
  )
}

/** Ai đang chiếm container ngay lúc này, và nút kết thúc hộ.
 *
 *  Giữ nguyên từ bản cũ vì nó vốn đúng: quyết định ở đây là "người này còn nên
 *  giữ cái này không", mà một cái id thì không trả lời được nửa nào của câu đó. */
function RunningList({ rows }: { rows: RunningSession[] }) {
  const qc = useQueryClient()
  const [target, setTarget] = useState<RunningSession | null>(null)

  const kill = useMutation({
    mutationFn: (id: string) => adminApi.killSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      setTarget(null)
    },
  })

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">Live containers</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">No containers running.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <TerminalIcon className="h-4 w-4 shrink-0 text-fg-subtle" />
              <Link
                to={`/admin/users/${s.user_id}`}
                className="font-medium text-accent-soft hover:underline"
              >
                {s.username}
              </Link>
              <span className="min-w-0 flex-1 truncate text-fg-muted">{s.lab_title}</span>
              <span className="font-mono text-xs tabular-nums text-fg-subtle">
                {`${minutesLeft(s.expires_at)} min left`}
              </span>
              <button
                onClick={() => setTarget(s)}
                className="rounded-md border border-border-strong px-2 py-1 text-xs text-danger transition hover:border-danger"
              >
                Kill
              </button>
            </li>
          ))}
        </ul>
      )}

      {target && (
        <ConfirmModal
          title={`Kill “${target.username}”'s session?`}
          confirmLabel={kill.isPending ? 'Killing…' : 'Kill the session'}
          tone="danger"
          busy={kill.isPending}
          onConfirm={() => kill.mutate(target.id)}
          onClose={() => setTarget(null)}
        >
          The container and everything unfinished inside it is deleted. Their terminal closes immediately, with no warning.
        </ConfirmModal>
      )}
    </Card>
  )
}

/** Phút còn lại của một container, tính từ hạn của nó. Tính ở đây chứ không
 *  lấy từ server: một con số đếm ngược gửi kèm sẽ đứng im cho tới lần tải sau. */
function minutesLeft(expiresAt: string): number {
  return Math.max(0, Math.round((Date.parse(expiresAt) - Date.now()) / 60000))
}

function Num({ label, value, tone }: { label: string; value: number; tone?: boolean }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <p
        className={
          'mt-0.5 text-xl font-semibold tabular-nums ' +
          (tone ? 'text-danger' : 'text-fg-strong')
        }
      >
        {value.toLocaleString()}
      </p>
    </Card>
  )
}

/** Link sang màn phân tích, để màn này không phải gánh thêm bảng nào. */
export function AnalysisLink() {
  return (
    <Link
      to="/admin/analysis"
      className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
    >
      See content analysis
      <ChevronRightIcon className="h-3.5 w-3.5" />
    </Link>
  )
}
