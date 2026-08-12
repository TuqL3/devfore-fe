import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { simApi } from '@/api/sim'
import { ApiError } from '@/lib/api'
import type { SimScenario } from '@/lib/types'
import { SimTimeline } from '@/components/SimTimeline'
import { SimCatalog, SimInsights } from '@/components/SimPanels'
import { PipelineEditor } from '@/components/PipelineEditor'
import { starterPipeline } from '@/lib/sim'
import { useT } from '@/lib/i18n'

/** Cùng số với `usecase.MaxSimRuns` phía server. Ở đây chỉ để đếm ngược cho học
 *  viên thấy; server mới là chỗ từ chối. */
const MAX_RUNS = 30

/** Cả bên phải màn hình của một bài lab mô phỏng: nơi lab container có terminal.
 *  Tự lo lấy thân — chấm điểm đọc lượt chạy gần nhất từ server, nên không có
 *  trạng thái nào phải bắn ngược lên trên. */
export function SimEditor({
  sessionID,
  scenario,
  live,
}: {
  sessionID: string
  scenario: SimScenario
  /** Phiên còn chạy. Hết giờ thì pipeline vẫn đọc được, chỉ không chạy thêm. */
  live: boolean
}) {
  const t = useT()
  const qc = useQueryClient()
  const [text, setText] = useState<string | null>(null)

  // Lượt đã chạy của chính phiên này. Cũng là chỗ khôi phục lại pipeline sau khi
  // tải lại trang: văn bản đã nằm sẵn trên server cùng kết quả của nó, giữ thêm
  // một bản trong localStorage là dựng nguồn sự thật thứ hai để lệch nhau.
  const runs = useQuery({
    queryKey: ['sim-runs', sessionID],
    queryFn: () => simApi.runs(sessionID),
  })

  const run = useMutation({
    mutationFn: (pipeline: string) => simApi.run(sessionID, pipeline),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sim-runs', sessionID] }),
  })

  // Chỉ đặt một lần, khi lịch sử về. Đặt lại mỗi lần render sẽ giẫm lên đúng
  // những gì học viên vừa gõ.
  useEffect(() => {
    if (text !== null || runs.data === undefined) return
    const last = runs.data.at(-1)
    setText(last ? last.pipeline : starterPipeline(scenario))
  }, [runs.data, text, scenario])

  const history = runs.data ?? []
  const latest = run.data ?? history.at(-1)?.result
  const used = history.length
  const spent = used >= MAX_RUNS

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <SimCatalog scenario={scenario} />

      <div className="rounded-xl border border-border bg-bg">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="font-mono text-xs text-fg-muted">pipeline.yml</span>
          <span className="ml-auto font-mono text-[11px] text-fg-subtle">
            {used}/{MAX_RUNS} {t('simEditor.runsUsed')}
          </span>
        </div>
        <PipelineEditor value={text ?? ''} onChange={setText} rows={12} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => text !== null && run.mutate(text)}
          disabled={!live || spent || run.isPending || !text?.trim()}
          title={
            !live
              ? t('simEditor.sessionEnded')
              : spent
                ? t('simEditor.runsSpent', { n: MAX_RUNS })
                : t('simEditor.runPipeline')
          }
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {run.isPending && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {run.isPending ? t('play.running') : t('simEditor.runPipeline')}
        </button>
        <p className="text-xs text-fg-subtle">
          {t('simEditor.gradeNote')}{' '}
          {/* Phiên lab giới hạn 30 lượt và hết giờ là đóng. Ai muốn thử thêm mà
              không sợ tốn lượt thì có chỗ khác, và nói ra thì hơn là để họ dè
              dặt từng cú bấm. */}
          <Link to="/sim" className="text-accent-soft hover:underline">
            {t('simEditor.playground')} →
          </Link>
        </p>
      </div>

      {/* Câu của server, không phải câu dựng ở đây: mỗi lời từ chối lúc parse
          đều gọi tên job, step hay khoá đang sai, và đó là thứ sửa được. */}
      {run.isError && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {run.error instanceof ApiError
            ? run.error.message
            : t('simEditor.runFailed')}
        </p>
      )}

      {latest ? (
        <>
          <SimTimeline result={latest} />
          <SimInsights lines={latest.insights} />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-sm text-fg-subtle">
          {t('simEditor.noRuns')}
        </p>
      )}
    </div>
  )
}
