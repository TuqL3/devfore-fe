import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import { playgroundApi } from '@/api/sim'
import { ApiError } from '@/lib/api'
import { findSim } from '@/sims/registry'
import type {
  SimEntryCicd,
  SimExample,
  SimGenTurn,
  SimRunResult,
  SimScenario,
} from '@/lib/types'
import { LinuxBench } from '@/components/LinuxBench'
import { SearchBench } from '@/components/SearchBench'
import { SortBench } from '@/components/SortBench'
import { SimTimeline } from '@/components/SimTimeline'
import { SimCatalog, SimInsights } from '@/components/SimPanels'
import { PipelineEditor } from '@/components/PipelineEditor'
import { addStep, starterPipeline } from '@/lib/sim'
import { CustomSeed, isCustomised, saveCustom } from '@/sims/custom'
import { Card } from '@/components/ui'
import { ConfirmModal, PromptModal } from '@/components/ConfirmModal'
import { Prose } from '@/components/MarkdownEditor'
import { ArrowLeftIcon } from '@/components/icons'

/** Một mô phỏng: viết pipeline bên trái, xem lịch chạy bên phải.
 *
 *  Nằm trong `Layout` như mọi trang khác — thử tách ra toàn màn hình rồi bỏ: nó
 *  mất thanh nav và trông không giống chỗ nào còn lại của trang web, đổi lấy
 *  chiều rộng mà cột kết quả dính theo màn hình đã giải quyết xong.
 *
 *  Thứ tự trên xuống là thứ tự người mới cần: **đây là gì** → **bấm thử một
 *  mẫu** → ô soạn → phần tra cứu (gập sẵn). Bản trước mở đầu bằng một bức tường
 *  cú pháp, và câu hỏi đầu tiên nó không trả lời là câu quan trọng nhất: cái này
 *  để làm gì.
 *
 *  Không phiên, không container, không chấm điểm, không lưu lượt chạy nào. */
export default function SimPlayground() {
  const { slug = '' } = useParams()
  // Tra trong registry, không gọi server: nội dung mô phỏng nằm trong bundle
  // này. Không có trạng thái tải, không có lỗi mạng, không có màn chờ.
  const sim = findSim(slug)

  if (!sim) {
    return (
      <Card className="mx-auto max-w-lg px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg">No such simulator</p>
        <Link to="/sim" className="mt-2 inline-block text-sm text-accent-soft hover:underline">
          ← Back to the list
        </Link>
      </Card>
    )
  }

  return (
    <>
      <Link
        to="/sim"
        className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Simulator list
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-fg-strong">{sim.title}</h1>
      {/* Rẽ theo engine, một lần, ngay đây. Sau dòng này TypeScript biết `sim`
          là mục CI/CD nên `sim.scenario` vẫn là bắt buộc trong cả `Bench` —
          engine thứ hai không bắt 800 dòng bên dưới phải đi kiểm một giá trị
          không bao giờ thiếu ở đường đi của chúng. */}
      {sim.engine === 'linux' ? (
        <LinuxBench key={sim.slug} sim={sim} />
      ) : sim.engine === 'search' ? (
        <SearchBench key={sim.slug} sim={sim} />
      ) : sim.engine === 'sort' ? (
        <SortBench key={sim.slug} sim={sim} />
      ) : (
        // Đổi mô phỏng là đổi catalog: ô soạn và kết quả cũ không còn nghĩa gì.
        <Bench key={sim.slug} sim={sim} />
      )}
    </>
  )
}

/** Một lượt đã chạy, giữ lại để so. `label` là tên mẫu đã bấm, hoặc "Tự viết"
 *  khi người dùng tự gõ — nhãn mới là thứ làm hàng so sánh đọc được. */
type Run = { key: string; label: string; result: SimRunResult }

/** Giữ tối đa chừng này lượt. Quá số đó thì bảng so sánh dài hơn màn hình và
 *  không còn so được gì nữa — lượt cũ nhất rơi ra. */
const MAX_COMPARE = 8

/** Mẫu người dùng tự lưu, để trong localStorage theo từng kịch bản.
 *
 *  Không gửi lên server, và đó là chủ ý: sân chơi không lưu gì cả — không phiên,
 *  không lượt chạy, không bảng nào. Dựng một endpoint chỉ để cất mấy đoạn YAML
 *  là phá đúng tính chất khiến nó mở được mà không cần đăng ký gì. Đổi lại: đổi
 *  máy là mất. */
const mineKey = (slug: string) => `sim-mau:${slug}`

function loadMine(slug: string): SimExample[] {
  try {
    const raw = JSON.parse(localStorage.getItem(mineKey(slug)) ?? '[]')
    return Array.isArray(raw) ? (raw as SimExample[]) : []
  } catch {
    // localStorage hỏng thì mất mấy cái mẫu, không phải mất cả trang.
    return []
  }
}

function Bench({ sim }: { sim: SimEntryCicd }) {
  // Kịch bản đang chạy. Với mô phỏng tác giả viết thì đây là hằng số — bộ step
  // và số giây của nó chính là bài học, và không có gì trên màn hình sửa được
  // nó. Chỉ mô phỏng tự dựng mới đổi được, và `sim.scenario` của nó đã là bản
  // đọc từ localStorage.
  const [scenario, setScenario] = useState<SimScenario>(sim.scenario)
  const [text, setText] = useState(() => starterPipeline(scenario))
  const editor = useRef<HTMLTextAreaElement>(null)
  // Lượt thứ mấy, và cache còn ấm từ lượt trước. Trang tự giữ vì không có hàng
  // nào trên server để đọc — và không cần, vì không có gì được chấm.
  const [runIndex, setRunIndex] = useState(0)
  const [warm, setWarm] = useState<string[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  // Mọi lượt đã chạy, giữ lại để đặt cạnh nhau. Một biểu đồ trơ trọi nói "455
  // giây" mà không nói 455 là nhanh hay chậm — bài học ở đây là phép so sánh,
  // nên hai vế phải cùng nằm trên màn hình.
  const [history, setHistory] = useState<Run[]>([])
  const [shown, setShown] = useState<string | null>(null)
  const [mine, setMine] = useState<SimExample[]>(() => loadMine(sim.slug))
  const [naming, setNaming] = useState(false)
  // Mẫu đang chờ xác nhận xoá. Giữ cả object chứ không chỉ tên, để hộp thoại đọc
  // được tên ra mà không phải dò lại danh sách.
  const [deleting, setDeleting] = useState<SimExample | null>(null)

  const saveMine = (next: SimExample[]) => {
    setMine(next)
    localStorage.setItem(mineKey(sim.slug), JSON.stringify(next))
  }

  const run = useMutation({
    mutationFn: () =>
      playgroundApi.preview({
        scenario,
        pipeline: text,
        run: runIndex + 1,
        warm,
      }),
    onSuccess: (res) => {
      const label = picked ?? 'Your own'
      const key = `${label}#${res.run_index}#${history.length}`
      setHistory((h) => [...h, { key, label, result: res }].slice(-MAX_COMPARE))
      setShown(key)
      setRunIndex((n) => n + 1)
      setWarm(res.warm_caches)
    },
  })

  // Ctrl/Cmd+Enter chạy, vì tay đang ở trong ô soạn và với chuột lên nút là
  // quãng đường duy nhất trong vòng lặp sửa-chạy-xem.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !run.isPending) {
        run.mutate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run])

  const load = (ex: SimExample) => {
    // Bấm lại chính mẫu đang chọn là tắt nó: về đúng pipeline khởi đầu. Không có
    // đường này thì chọn một mẫu rồi là mắc kẹt trong nó, phải xoá tay cả ô soạn
    // mới quay lại được chỗ xuất phát.
    const off = picked === ex.title
    setText(off ? starterPipeline(scenario) : ex.pipeline)
    setPicked(off ? null : ex.title)
    // Lịch sử so sánh KHÔNG bị xoá — đổi mẫu chính là lúc cần nó nhất. Nhưng
    // cache ấm thì có: giữ lại sẽ làm mẫu vừa nạp chạy nhanh một cách khó hiểu,
    // và đúng phép so sánh mấy nút này tồn tại để tạo ra thì hỏng.
    setWarm([])
    setRunIndex(0)
    run.reset()
  }

  /** Chèn một step vào ô soạn và trả con trỏ về đúng chỗ vừa chèn, để bấm mấy
   *  cái liên tiếp là ra một danh sách chứ không phải nhảy lung tung.
   *
   *  `setSelectionRange` phải đợi React vẽ lại: gọi ngay thì nó đặt con trỏ lên
   *  văn bản cũ, rồi lượt vẽ sau ghi đè mất. */
  const insertStep = (name: string) => {
    const next = addStep(text, editor.current?.selectionStart ?? 0, name)
    if (!next) return
    setText(next.text)
    setPicked(null)
    requestAnimationFrame(() => {
      editor.current?.focus()
      editor.current?.setSelectionRange(next.caret, next.caret)
    })
  }

  /** Đổi catalog là đổi luật chơi: mọi lượt đã chạy trước đó tính bằng bảng giá
   *  khác, đặt cạnh lượt mới thì phép so sánh nói dối. Nên lịch sử bị xoá — khác
   *  hẳn lúc đổi mẫu, chỗ mà giữ lịch sử mới là cái hay. Ô soạn thì giữ: pipeline
   *  đang viết thường vẫn dùng được với catalog mới. */
  const applyScenario = (next: SimScenario | null) => {
    saveCustom(next)
    setScenario(next ?? CustomSeed)
    setHistory([])
    setShown(null)
    setWarm([])
    setRunIndex(0)
    setPicked(null)
    run.reset()
  }

  const examples = scenario.examples ?? []
  // Chỉ mô phỏng tự dựng mới sửa được catalog. Mô phỏng tác giả viết là cứng:
  // bộ step của nó là bài học, và một ô mời sửa nó đi ngay bên dưới vừa mâu
  // thuẫn với bài học vừa mời người mới đi chệch khỏi nó.
  const editable = sim.editable === true
  const custom = editable && isCustomised()
  const current = history.find((r) => r.key === shown) ?? history.at(-1)

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {/* "Đây là gì" do tác giả kịch bản viết. Trước đó ba đoạn này là chữ
            nhét cứng nói về push code và pipeline YAML — đúng với CI/CD và sai
            với mọi mô phỏng khác. */}
        {sim.description.trim() && (
          <Card className="p-4">
            <Prose>{sim.description}</Prose>
            {examples.length > 0 && (
              <p className="mt-3 text-sm text-fg-subtle">
                Nothing to type yet: press one of the examples below → Run the pipeline → look at the total time. Then press another and compare the two numbers.
              </p>
            )}
            <p className="mt-2 text-sm">
              <Link
                to="/courses/ci-cd-co-ban"
                className="text-accent-soft hover:underline"
              >
                Want the structured, graded version? → the CI/CD Basics course
              </Link>
            </p>
          </Card>
        )}

        {/* Ở mô phỏng tự dựng, dựng catalog là **bước 0** — không có bộ step thì
            mấy nút mẫu và ô soạn bên dưới chẳng nói lên gì. Nên nó nằm đây, mở
            sẵn, chứ không gập trong panel "nâng cao" ở cuối cột như bản trước:
            chỗ đó là chỗ dành cho thứ người ta đi tìm, còn cái này là thứ phải
            đập vào mắt trước. */}
        {editable && <ScenarioChat onApply={applyScenario} />}

        {examples.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-fg">Built-in examples</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {examples.map((ex) => (
                <ExampleButton
                  key={ex.title}
                  example={ex}
                  active={picked === ex.title}
                  onPick={() => load(ex)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-fg">Your examples</p>
            <button
              onClick={() => setNaming(true)}
              disabled={!text.trim()}
              className="ml-auto rounded-md border border-border-strong px-2 py-0.5 text-xs text-fg-muted transition hover:text-fg-strong disabled:opacity-40"
            >
              Save the current pipeline
            </button>
          </div>
          {mine.length === 0 ? (
            <p className="text-xs text-fg-subtle">
              No saved examples yet. Write a pipeline and press the button above to keep it — it stays in this browser and is not sent anywhere.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {mine.map((ex) => (
                <ExampleButton
                  key={ex.title}
                  example={ex}
                  active={picked === ex.title}
                  onPick={() => load(ex)}
                  onDelete={() => setDeleting(ex)}
                />
              ))}
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="font-mono text-xs text-fg-muted">pipeline.yml</span>
            <span className="ml-auto font-mono text-[11px] text-fg-subtle">
              {runIndex === 0
                ? 'not run yet'
                : `ran ${runIndex} times`}
            </span>
          </div>
          <PipelineEditor
            value={text}
            onChange={(v) => {
              setText(v)
              setPicked(null)
            }}
            rows={11}
            inputRef={editor}
          />
          {/* Nút nằm trong chính thẻ chứa ô soạn: sửa xong là bấm, không phải
              tìm. */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2.5">
            <button
              onClick={() => run.mutate()}
              disabled={run.isPending || !text.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {run.isPending && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {run.isPending ? 'Running…' : 'Run the pipeline'}
            </button>
            <span className="font-mono text-[11px] text-fg-subtle">Ctrl+Enter</span>
            {/* Cache ấm là trạng thái duy nhất trang này mang giữa các lượt, nên
                nó phải nhìn thấy được và bỏ được — không thì một lượt nhanh bất
                ngờ đọc thành engine sai. */}
            {warm.length > 0 && (
              <button
                onClick={() => {
                  setWarm([])
                  setRunIndex(0)
                }}
                title={`Forget the warm caches (${warm.join(', ')}) and count from run 1 again`}
                className="ml-auto rounded-md border border-border-strong px-2 py-1 text-xs text-fg-muted transition hover:text-fg-strong"
              >
                Clear the cache
              </button>
            )}
          </div>
        </Card>

        {/* Gập sẵn cả hai: người mới đã có phần "Đây là gì" và mấy nút mẫu, còn
            đây là thứ mở ra khi đã có câu hỏi cụ thể. Mở sẵn thì chúng đẩy ô
            soạn xuống dưới màn hình — đúng lỗi của bản trước. */}
        <SimCatalog scenario={scenario} open={false} onPick={insertStep} />

        {/* Chỉ ở mô phỏng tự dựng. Mấy cái tác giả viết là cứng — xem `editable`. */}
        {editable && (
          <CatalogEditor
            scenario={scenario}
            custom={custom}
            onApply={applyScenario}
          />
        )}

        {sim.guide.trim() && (
          <details className="rounded-xl border border-border bg-bg">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
              Syntax and rules
            </summary>
            <div className="border-t border-border px-3 py-3">
              {/* Phần hướng dẫn gọi tên step cụ thể và nói thẳng có mấy runner.
                  Dựng catalog khác xong thì mấy câu đó thành sai, mà sai kiểu tệ
                  nhất — vẫn đọc như thật. Rẻ nhất là nói ra, chứ không phải giấu
                  cả khối đi: nửa nói về cú pháp YAML thì vẫn đúng. */}
              {custom && (
                <p className="mb-3 text-xs text-fg-muted">
                  Running the catalog you built. What follows was written for the starter set — the syntax rules still hold, but read the step names and runner count from the “Available steps” panel.
                </p>
              )}
              <Prose>{sim.guide}</Prose>
            </div>
          </details>
        )}
      </div>

      {/* Dính theo màn hình. `top` phải né header của site — nó cũng sticky và
          cao khoảng 57px. Chỉ từ `lg`: dưới mức đó lưới xếp một cột và kết quả
          vốn đã nằm ngay dưới nút, đúng chiều cuộn. */}
      <div className="space-y-3 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        {run.isError && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {run.error instanceof ApiError
              ? run.error.message
              : 'Cannot run right now, try again.'}
          </p>
        )}

        {history.length > 0 && (
          <Compare
            runs={history}
            shown={shown}
            onPick={setShown}
            onClear={() => {
              setHistory([])
              setShown(null)
            }}
          />
        )}

        {current ? (
          <>
            <SimTimeline result={current.result} />
            <SimInsights lines={current.result.insights} />
          </>
        ) : (
          !run.isError && (
            <div className="rounded-xl border border-dashed border-border-strong px-4 py-14 text-center">
              <p className="text-sm text-fg-muted">The schedule will appear here.</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-fg-subtle">
                {examples.length > 0
                  ? 'Press an example on the left, then Run the pipeline.'
                  : 'Write a pipeline on the left, then Run the pipeline.'}
              </p>
            </div>
          )
        )}
      </div>

      {naming && (
        <PromptModal
          title="Save the example"
          label="Name this example"
          placeholder="Song song + cache"
          initialValue={picked ?? ''}
          hint={(v) =>
            mine.some((m) => m.title === v) ? 'An example with this name exists — saving overwrites it.' : ''
          }
          onClose={() => setNaming(false)}
          onConfirm={(name) => {
            // Trùng tên thì ghi đè, không để hai mục giống hệt nhau mà chỉ một
            // cái là bản mới.
            saveMine([...mine.filter((m) => m.title !== name), { title: name, pipeline: text }])
            setPicked(name)
            setNaming(false)
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Delete this example?"
          confirmLabel="Delete"
          tone="danger"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            saveMine(mine.filter((m) => m.title !== deleting.title))
            if (picked === deleting.title) setPicked(null)
            setDeleting(null)
          }}
        >
          <p>
            The example{' '}
            <strong className="text-fg-strong">{deleting.title}</strong>{' '}
            will be gone. Nobody loses progress — the playground is not graded.
          </p>
        </ConfirmModal>
      )}
    </div>
  )
}

/** Mấy lượt đã chạy, xếp cạnh nhau theo đúng thời lượng của chúng.
 *
 *  Đây mới là chỗ bài học hiện ra. Một biểu đồ Gantt nói "455 giây" nhưng không
 *  nói 455 là nhanh hay chậm; hai thanh cạnh nhau, một dài gấp đôi thanh kia,
 *  thì nói. Bấm một hàng để xem lại biểu đồ của lượt đó.
 *
 *  Thang đo lấy theo lượt lâu nhất, nên thanh dài nhất luôn chạm mép: cái đáng
 *  đọc là tỉ lệ giữa các thanh, không phải bề rộng tuyệt đối. */
function Compare({
  runs,
  shown,
  onPick,
  onClear,
}: {
  runs: Run[]
  shown: string | null
  onPick: (key: string) => void
  onClear: () => void
}) {
  const max = Math.max(...runs.map((r) => r.result.total_seconds), 1)
  const best = Math.min(...runs.map((r) => r.result.total_seconds))

  return (
    <div className="rounded-xl border border-border bg-bg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-fg-strong">
          {`Compare ${runs.length} runs`}
        </span>
        <button
          onClick={onClear}
          className="ml-auto rounded px-2 py-0.5 text-xs text-fg-subtle transition hover:text-fg-strong"
        >
          Clear
        </button>
      </div>

      <ul className="divide-y divide-border">
        {runs.map((r) => {
          const secs = r.result.total_seconds
          const failed = r.result.status === 'failed'
          return (
            <li key={r.key}>
              <button
                onClick={() => onPick(r.key)}
                className={
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left transition ' +
                  (r.key === shown ? 'bg-accent/10' : 'hover:bg-muted/50')
                }
              >
                <span className="w-28 shrink-0 truncate text-xs text-fg-muted" title={r.label}>
                  {r.label}
                </span>
                <span className="relative h-4 min-w-0 flex-1 overflow-hidden rounded bg-muted/60">
                  <span
                    className={
                      'absolute inset-y-0 left-0 rounded ' +
                      (failed
                        ? 'bg-danger/60'
                        : secs === best
                          ? 'bg-success/70'
                          : 'bg-accent/40')
                    }
                    style={{ width: `${(secs / max) * 100}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-fg">
                  {secs}s
                </span>
                {/* Lượt thứ mấy chỉ có nghĩa khi cache đã ấm, và đúng lúc đó nó
                    là cả bài học: cùng một pipeline, lượt hai ngắn hơn. */}
                <span className="w-10 shrink-0 text-right font-mono text-[10px] text-fg-subtle">
                  #{r.result.run_index}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Một nút mẫu. Dùng cho cả mẫu tác giả viết lẫn mẫu người dùng tự lưu — hai thứ
 *  đó khác nhau ở chỗ lấy từ đâu và có xoá được không, không khác ở chỗ bấm. */
function ExampleButton({
  example,
  active,
  onPick,
  onDelete,
}: {
  example: SimExample
  active: boolean
  onPick: () => void
  onDelete?: () => void
}) {
  return (
    // Hai nút nằm cạnh nhau trong luồng bình thường. Bản trước cho nút xoá
    // `absolute` ở góc phải, và nó đè thẳng lên chữ "bấm lại để bỏ" — không có
    // cách nào để một phần tử ngoài luồng biết nó đang che thứ gì.
    <div
      className={
        'flex items-stretch rounded-lg border transition ' +
        (active
          ? 'border-accent bg-accent/10'
          : 'border-border-strong bg-surface hover:border-accent/50')
      }
    >
      <button
        onClick={onPick}
        title={
          active
            ? 'Press again to drop this example and go back to the starter pipeline'
            : 'Load this example into the editor'
        }
        className="min-w-0 flex-1 px-3 py-2 text-left"
      >
        <span className="block truncate text-sm font-medium text-fg-strong">
          {example.title}
        </span>
        {/* Chỉ ghi chú của tác giả. Chuyện bấm lại để bỏ nằm ở tooltip: viền
            sáng đã nói mẫu này đang được chọn, thêm một dòng chữ nữa chỉ làm
            hàng nút rối. */}
        {example.note && (
          <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">
            {example.note}
          </span>
        )}
      </button>
      {/* Nút xoá là anh em của nút nạp, không lồng bên trong: button trong
          button là HTML không hợp lệ và trình duyệt tự gỡ ra theo cách không ai
          đoán được. */}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete this example"
          aria-label={`Delete the example ${example.title}`}
          className="shrink-0 rounded-r-lg px-2.5 text-sm text-fg-subtle transition hover:bg-danger/10 hover:text-danger"
        >
          ✕
        </button>
      )}
    </div>
  )
}

/** Sửa thẳng kịch bản: thêm step, đổi giá, đổi số runner.
 *
 *  Đây **không** phải tính năng cho người mới, và nó gập lại vì thế. Người vừa mở
 *  trang chưa biết nên thêm job gì thì một ô JSON trống không trả lời được câu
 *  hỏi nào của họ — mấy nút mẫu và mấy dòng nhận xét sau khi chạy mới trả lời.
 *
 *  Nó có ở đây cho người đã biết mình muốn gì: soạn một kịch bản, thử, rồi chép
 *  JSON ra dán vào `src/sims/` hay `labs.sim_scenario`. Không có màn quản trị nào
 *  cho việc đó, và cái vòng lặp thay thế — sửa file, khởi động lại, bấm thử — đủ
 *  chậm để không ai viết nổi lab thứ mười.
 *
 *  Chỉ ở sân chơi. Lab chấm điểm đọc kịch bản từ server, và cho client gửi lên
 *  catalog của chính nó ở chỗ có điểm là tự chấm điểm cho mình. */
function CatalogEditor({
  scenario,
  custom,
  onApply,
}: {
  scenario: SimScenario
  custom: boolean
  onApply: (next: SimScenario | null) => void
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(scenario, null, 2))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Áp dụng xong, kịch bản đi ra rồi quay lại đã được chuẩn hoá — nên ô soạn viết
  // lại theo nó. Không làm thế thì bản trong ô và bản đang chạy trôi khỏi nhau mà
  // không có dấu hiệu gì.
  useEffect(() => {
    setDraft(JSON.stringify(scenario, null, 2))
    setError('')
  }, [scenario])

  const apply = () => {
    let parsed: SimScenario
    try {
      parsed = JSON.parse(draft) as SimScenario
    } catch (e) {
      setError(e instanceof Error ? e.message : 'the JSON cannot be parsed')
      return
    }
    // Ba thứ trang này sẽ nổ nếu thiếu. Trần runner, độ dài step, khoảng flaky —
    // để server từ chối, nó đã có sẵn câu tiếng Việt cho từng cái và chép luật
    // sang đây là dựng chỗ thứ hai để hai bên lệch nhau.
    if (!parsed?.catalog || typeof parsed.catalog !== 'object') {
      setError('the "catalog" key is missing')
      return
    }
    if (Object.keys(parsed.catalog).length === 0) {
      setError('"catalog" has no steps yet')
      return
    }
    if (typeof parsed.runner_count !== 'number' || parsed.runner_count < 1) {
      setError('"runner_count" must be a number of at least 1')
      return
    }
    setError('')
    onApply(parsed)
  }

  return (
    <details className="rounded-xl border border-border bg-bg">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
        Edit the catalog as JSON
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-fg-subtle">
          advanced
        </span>
        <span className="ml-auto rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-normal text-accent-soft">
          {custom ? 'built by you' : 'starter set'}
        </span>
      </summary>
      <div className="border-t border-border px-3 py-3">
        <div className="space-y-2">
          <textarea
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full resize-y rounded-md border border-border bg-bg-subtle px-2.5 py-2 font-mono text-xs text-fg outline-none focus:border-accent"
          />
          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={apply}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover"
            >
              Apply
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(draft)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }}
              className="rounded-md border border-border-strong px-2.5 py-1.5 text-xs text-fg-muted transition hover:text-fg-strong"
            >
              {copied ? 'Copied' : 'Copy the JSON'}
            </button>
            {/* ponytail: không còn nút "chép từ mô phỏng có sẵn" — mô phỏng
                CI/CD cố định đã gỡ, và ô soạn vốn đã mở sẵn kịch bản đang chạy
                nên chép từ bộ khởi đầu chỉ là chép lại đúng thứ đang hiện. */}
            {custom && (
              <button
                onClick={() => onApply(null)}
                className="ml-auto rounded-md border border-border-strong px-2.5 py-1.5 text-xs text-fg-muted transition hover:text-fg-strong"
              >
                Back to the starter set
              </button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">
            Applying clears the comparison history — older runs were priced differently.
          </p>
        </div>
      </div>
    </details>
  )
}

/** Mô tả bằng lời, AI dựng catalog.
 *
 *  Điểm khiến nó khác một ô "hỏi AI" thông thường: kịch bản trả về **đã được
 *  engine chạy thử trên server** — `CheckScenario` duyệt, rồi từng ví dụ đi qua
 *  `Parse`. Cái nào không chạy được thì server đưa lỗi ngược cho model sửa một
 *  lượt; hỏng tiếp thì báo lỗi chứ không trả ra. Nên thứ tới đây là thứ bấm Chạy
 *  được, không phải thứ trông có vẻ đúng.
 *
 *  Cái nó **không** làm được: biết `npm-ci` thật mất bao lâu trên CI của bạn. Số
 *  giây là ước lượng. Với sân chơi thì không sao — bài học ở đây là hình dạng
 *  pipeline, không phải con số — nên câu đó nằm ngay dưới ô nhập, không giấu. */
function ScenarioChat({ onApply }: { onApply: (next: SimScenario) => void }) {
  const [prompt, setPrompt] = useState('')
  // Lịch sử để câu sau sửa được câu trước ("đổi runner thành 4") thay vì dựng
  // lại từ đầu. Server tự cắt bớt phần đầu nếu dài, nên chỗ này không cần cắt.
  const [history, setHistory] = useState<SimGenTurn[]>([])
  const [notes, setNotes] = useState<{ text: string; attempts: number } | null>(null)

  const gen = useMutation({
    mutationFn: (text: string) => playgroundApi.generate({ prompt: text, history }),
    onSuccess: (res, text) => {
      onApply(res.scenario)
      setNotes({ text: res.notes, attempts: res.attempts })
      setHistory((h) => [
        ...h,
        { role: 'user', text },
        // Lượt assistant mang JSON chứ không mang lời: đó là thứ câu sau sửa.
        { role: 'assistant', text: JSON.stringify(res.scenario) },
      ])
      setPrompt('')
    },
  })

  const send = () => {
    const text = prompt.trim()
    if (text && !gen.isPending) gen.mutate(text)
  }

  const started = history.length > 0

  return (
    // Khối cấp một, ngang hàng với thẻ "đây là gì" — không lồng trong panel nào,
    // nên viền ở đây không tạo ra khung-trong-khung. Nền nhạt màu nhấn để nó là
    // thứ mắt chạm vào trước khi xuống ô soạn.
    <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-sm font-medium text-fg-strong">Build a step set with AI</p>
        <p className="text-sm text-fg-subtle">
          Describe your system in one sentence.
        </p>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter gửi, Enter xuống dòng: mô tả một hệ thống thường dài
          // hơn một dòng, và Enter-để-gửi ở đây là cắt câu người ta đang viết.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            send()
          }
        }}
        rows={3}
        placeholder={
          started
            ? 'Keep editing: "add a migration step", "make it 4 runners"…'
            : 'Design a CI/CD pipeline for a Node.js + MySQL + Redis project serving millions of users'
        }
        className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={send}
          disabled={gen.isPending || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gen.isPending && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {gen.isPending
            ? 'Building…'
            : started
              ? 'Send'
              : 'Build the step set'}
        </button>
        <span className="font-mono text-[11px] text-fg-subtle">Ctrl+Enter</span>
        {started && (
          <button
            onClick={() => {
              setHistory([])
              setNotes(null)
              gen.reset()
            }}
            className="ml-auto rounded-md border border-border-strong px-2 py-1 text-[11px] text-fg-muted transition hover:text-fg-strong"
          >
            Start over
          </button>
        )}
      </div>

      {gen.isError && (
        <p className="text-sm text-danger">
          {gen.error instanceof ApiError
            ? gen.error.message
            : 'Cannot build right now, try again.'}
        </p>
      )}

      {/* Kết quả là chữ, không phải hộp. Câu thứ hai nói engine đã chạy thử —
          người dùng không nhìn thấy vòng kiểm đó, mà nó đúng là thứ phân biệt
          "AI đoán" với "đã kiểm". */}
      {notes && (
        <p className="text-sm text-fg-muted">
          {notes.text}{' '}
          <span className="text-fg-subtle">
            {notes.attempts > 1
              ? 'The first draft did not run on the engine and was repaired until it did.'
              : 'The engine ran every example before returning it.'}
          </span>
        </p>
      )}

      <p className="text-xs text-fg-subtle">
        The seconds are an AI estimate, not measured from a real CI. You can edit them by hand under
        <span className="text-fg-muted"> Edit the catalog as JSON</span>{' '}
        below the editor.
      </p>
    </div>
  )
}
