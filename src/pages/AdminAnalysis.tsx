import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { Card, ErrorBox } from '@/components/ui'
import { clockLabel } from '@/lib/clock'
import type { CourseHealth, IncidentHealth, LabHealth, LabStat, TaskHealth } from '@/lib/types'

/** Phân tích — nội dung nào đang hỏng.
 *
 *  Bốn bảng, và cả bốn đều sắp xếp để thứ đáng sửa nổi lên đầu chứ không phải
 *  để tra cứu. Một bảng xếp theo tên là một bảng bắt người đọc tự tìm ra vấn
 *  đề; ở đây vấn đề tự trồi lên.
 *
 *  Con số quan trọng nhất trang này là **tỉ lệ đậu 0%**. Nó gần như không bao
 *  giờ nghĩa là "câu khó" — nó nghĩa là check script sai, và không có màn nào
 *  khác trên nền tảng nói được điều đó. */
export default function AdminAnalysis() {
  const q = useQuery({ queryKey: ['content-health'], queryFn: adminApi.contentHealth })
  // Số lần chấm lại chỉ có ở endpoint thống kê cũ. Giữ lại vì nó nói một chuyện
  // không cột nào khác nói được: một lab mà phần lớn câu phải bấm mấy lần mới
  // đậu là lab có đề mơ hồ hoặc thiếu gợi ý — khác hẳn với lab bị bỏ dở.
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })

  if (q.isLoading) {
    return <p className="py-12 text-center text-sm text-fg-subtle">Loading…</p>
  }
  if (q.isError || !q.data) return <ErrorBox>Could not read the numbers. Try reloading the page.</ErrorBox>
  const d = q.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">Analysis</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">Which content is not working. All four tables sort so the thing worth fixing rises to the top, rather than for looking things up.</p>
      </div>

      <Tasks rows={d.tasks} />
      <Labs rows={d.labs} retries={stats.data?.labs ?? []} />
      <Incidents rows={d.incidents} />
      <Courses rows={d.courses} />
    </div>
  )
}

function Tasks({ rows }: { rows: TaskHealth[] }) {
  const broken = rows.filter((r) => r.attempts >= 3 && r.pass_rate === 0)
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">Tasks</h2>
      <p className="mt-1 text-sm text-fg-muted">A 0% pass rate almost never means a hard question — it means the check script is wrong.</p>

      {/* Nghi vấn hỏng được kéo lên thành một câu, không để lẫn trong bảng: ba
          lượt thử mà không ai đậu là dấu hiệu script sai, và đó là thứ đáng sửa
          trước mọi thứ khác trên trang này. */}
      {broken.length > 0 && (
        <p className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {`${broken.length} tasks have been attempted and never passed. Check their scripts first.`}
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <Head cols={['Task', 'Lab', 'Attempts', 'Pass rate']} />
          <tbody>
            {rows.slice(0, 40).map((r) => (
              <tr key={r.task_id} className="border-t border-border">
                <td className="py-2 pr-3">{r.task_title}</td>
                <td className="py-2 pr-3 text-fg-muted">{r.lab_title}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.attempts}
                </td>
                <td className="py-2 text-right">
                  {r.attempts === 0 ? (
                    <span className="text-fg-subtle">never attempted</span>
                  ) : (
                    <Rate value={r.pass_rate} bad={r.pass_rate === 0} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Labs({ rows, retries }: { rows: LabHealth[]; retries: LabStat[] }) {
  const retryOf = (labID: number) => retries.find((r) => r.lab_id === labID)
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">Labs</h2>
      <p className="mt-1 text-sm text-fg-muted">Drop rate: attempts that ended as anything but a hand-in. High means too long, broken in the middle, or asking for something the instructions never mentioned.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <Head
            cols={[
              'Lab',
              'Starts',
              'Handed in',
              'Re-checked',
              'Dropped',
            ]}
          />
          <tbody>
            {rows.map((r) => (
              <tr key={r.lab_id} className="border-t border-border">
                <td className="py-2 pr-3">{r.lab_title}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.starts}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.submitted}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {(() => {
                    const st = retryOf(r.lab_id)
                    if (!st || st.answered === 0) return '—'
                    return `${Math.round((st.retried / st.answered) * 100)}%`
                  })()}
                </td>
                <td className="py-2 text-right">
                  {r.starts === 0 ? (
                    <span className="text-fg-subtle">never attempted</span>
                  ) : (
                    <Rate value={r.drop_rate} bad={r.drop_rate >= 70} invert />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Incidents({ rows }: { rows: IncidentHealth[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">War Room scenarios</h2>
      <p className="mt-1 text-sm text-fg-muted">Attempted but never recovered is the most suspicious row here: a break script that leaves a service unfixable looks exactly like a hard puzzle.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <Head cols={['Scenario', 'Attempts', 'Recovered', 'Fastest']} />
          <tbody>
            {rows.map((r) => (
              <tr key={r.incident_id} className="border-t border-border">
                <td className="py-2 pr-3">
                  {r.incident_title}
                  {!r.active && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-fg-muted">
                      retired
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.attempts}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">
                  {/* Đã có người thử mà chưa ai cứu được là hàng đáng nghi nhất
                      của cả trang: một script phá làm dịch vụ không thể sửa
                      trông y hệt một câu đố khó, cho tới khi có người đếm. */}
                  <span className={r.attempts > 0 && r.solved === 0 ? 'text-danger' : 'text-fg-muted'}>
                    {r.solved}
                  </span>
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-fg-muted">
                  {r.solved > 0 ? clockLabel(r.best_seconds) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Courses({ rows }: { rows: CourseHealth[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">Courses</h2>
      <p className="mt-1 text-sm text-fg-muted">Enrolment is one click. The gap between the three columns is what says whether the material is used.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <Head cols={['Course', 'Enrolled', 'Opened a lab', 'Handed one in']} />
          <tbody>
            {rows.map((r) => (
              <tr key={r.course_id} className="border-t border-border">
                <td className="py-2 pr-3">
                  <Link
                    to={`/admin/courses/${r.course_id}`}
                    className="text-accent-soft hover:underline"
                  >
                    {r.course_title}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.enrolled}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-fg-muted">
                  {r.started}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-fg-muted">
                  {r.finished}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Head({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="text-left text-[11px] uppercase tracking-wide text-fg-subtle">
        {cols.map((c, i) => (
          <th key={c} className={'pb-2 font-normal ' + (i === 0 ? '' : 'text-right')}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** Một tỉ lệ phần trăm kèm màu. `invert` cho những cột mà cao là xấu. */
function Rate({ value, bad, invert }: { value: number; bad?: boolean; invert?: boolean }) {
  const good = invert ? value < 40 : value >= 60
  return (
    <span
      className={
        'font-mono tabular-nums ' +
        (bad ? 'font-semibold text-danger' : good ? 'text-success' : 'text-fg-muted')
      }
    >
      {value}%
    </span>
  )
}
