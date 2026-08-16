import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ALGOS,
  DEFAULT_LAYOUT,
  LAYOUTS,
  N,
  layoutOf,
  scoreboard,
} from '@/sims/sort/algos'
import type { Algo, Frame } from '@/sims/sort/algos'
import type { SimEntrySort } from '@/lib/types'
import { Prose } from '@/components/MarkdownEditor'
import { ChartIcon, ChevronRightIcon } from '@/components/icons'

/** Bàn xem bốn thuật toán sắp xếp.
 *
 *  Cùng khung ba cột với `SearchBench`: danh sách bên trái, sân khấu ở giữa,
 *  trạng thái dùng chung bên phải. Ở đây "trạng thái dùng chung" là **thế mở
 *  đầu** — bốn thuật toán chỉ so được với nhau khi chúng xuất phát từ cùng một
 *  mảng, và ở sắp xếp thì thế mở đầu quyết định kết quả nhiều hơn cả việc chọn
 *  thuật toán nào.
 *
 *  ponytail: khung ba cột chép từ `SearchBench`, không tách ra dùng chung — chỗ
 *  thứ ba rồi, nhưng ba cái sân khấu khác nhau ở gần hết mọi thứ bên trong, phần
 *  chung còn lại đúng hai dòng class. Tách khi phần chung nhiều hơn phần riêng. */
export function SortBench({ sim }: { sim: SimEntrySort }) {
  const [layoutId, setLayoutId] = useState(DEFAULT_LAYOUT)
  const [sel, setSel] = useState(ALGOS[0].no)
  // Lượt thứ mấy của từng thuật toán. Dùng làm `key` cho phần chiếu lại, nên bấm
  // Chạy lần hai là một cây React mới và hiệu ứng chạy lại từ đầu.
  const [runs, setRuns] = useState<Record<string, number>>({})

  const algo = ALGOS.find((a) => a.no === sel) ?? ALGOS[0]
  // Cả bốn vết chạy là chừng ba nghìn khung hình, mỗi khung ôm một ảnh chụp mảng.
  // Tính lại ở mỗi nhịp chiếu — 25 lần một giây — là dựng rồi vứt chừng đó mảng
  // mỗi 40ms. Đây là chỗ `SearchBench` không cần nhớ gì mà chỗ này thì cần.
  const data = useMemo(() => layoutOf(layoutId).make(), [layoutId])
  const board = useMemo(() => scoreboard(data), [data])

  const pick = (id: string) => {
    setLayoutId(id)
    // Vết chạy cũ nói về một mảng khác. Để nguyên trên màn hình là nói dối.
    setRuns({})
  }

  return (
    <div className="mt-4">
      <Prose>{sim.description}</Prose>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <AlgoRail sel={sel} onSel={setSel} ran={runs} board={board} />
        <Stage
          key={algo.no + ':' + (runs[algo.no] ?? 0) + ':' + layoutId}
          algo={algo}
          data={data}
          runNo={runs[algo.no] ?? 0}
          onRun={() => setRuns((m) => ({ ...m, [algo.no]: (m[algo.no] ?? 0) + 1 }))}
        />
        <Board board={board} sel={sel} layoutId={layoutId} onPick={pick} />
      </div>

      {sim.guide.trim() && (
        <details className="mt-8 rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold text-fg-strong">
            Rules and limits of this simulator
          </summary>
          <div className="mt-3">
            <Prose>{sim.guide}</Prose>
          </div>
        </details>
      )}

      <Link
        to="/sim"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        See the other simulators
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

/** ponytail: `top-14` là chiều cao thanh nav của `Layout` gõ cứng vào đây — nav
 *  là `sticky top-0 z-40`. Cùng giả định với `SearchBench`. */
const STICK = 'lg:sticky lg:top-14 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto'

/** Vế đầu của một chuỗi độ phức tạp: `'O(n²) — O(n) nếu gần sắp'` → `'O(n²)'`.
 *  Dùng ở chỗ hẹp; chỗ rộng thì hiện cả chuỗi. */
const headline = (s: string) => s.split(' — ')[0]

// ── Cột trái ───────────────────────────────────────────────────────────────

function AlgoRail({
  sel,
  onSel,
  ran,
  board,
}: {
  sel: string
  onSel: (no: string) => void
  ran: Record<string, number>
  board: ReturnType<typeof scoreboard>
}) {
  return (
    <nav className={'shrink-0 lg:w-56 ' + STICK}>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {ALGOS.map((a, i) => {
          const on = a.no === sel
          return (
            <li key={a.no}>
              <button
                onClick={() => onSel(a.no)}
                aria-current={on ? 'true' : undefined}
                className={
                  'w-full whitespace-nowrap rounded-md px-2 py-2 text-left transition lg:whitespace-normal ' +
                  (on
                    ? 'bg-accent/15 text-accent-soft'
                    : 'text-fg-muted hover:bg-muted hover:text-fg')
                }
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] opacity-70">{a.no}</span>
                  <span className="text-sm font-medium">{a.name}</span>
                  {a.no in ran && (
                    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  )}
                </span>
                {/* Hai con số ngay trên nút: chọn thuật toán nào cũng thấy trước
                    cái giá của nó trên thế mở đầu đang chọn.

                    Chỉ lấy vế đầu của `big_o`: cột rail rộng 224px, mà mấy vế
                    điều kiện kiểu "— O(n) nếu gần sắp" đẩy hàng này dài gấp rưỡi
                    cột. `STICK` có `overflow-y-auto`, và CSS ép nốt trục ngang
                    thành `auto` theo — nên tràn ngang ở đây không cắt chữ mà mọc
                    ra một thanh cuộn ngang trong rail. Vế đầy đủ nằm ở đầu sân
                    khấu, chỗ có bề ngang cho nó. */}
                <span className="mt-0.5 hidden flex-wrap items-baseline gap-x-2 lg:flex">
                  <span className="font-mono text-[11px] opacity-70">{headline(a.big_o)}</span>
                  <span className="ml-auto font-mono text-xs">
                    {`${board[i].comparisons} cmp · ${board[i].writes} writes`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ── Cột giữa: sân khấu ─────────────────────────────────────────────────────

/** Mili giây cho **mỗi khung**, và mỗi khung là một dòng code chạy.
 *
 *  Chiếu đủ từng khung, không bỏ khung nào: mục đích của cả trang là nhìn kịp
 *  dòng code nào làm cột nào nhảy, mà bỏ khung là bỏ đúng cái đó.
 *
 *  Cái giá phải trả nói thẳng: vết dài ngắn chênh nhau hai chục lần, nên thời
 *  gian chiếu cũng chênh chừng đó. Thuật toán nhanh từ thế đã sắp sẵn có 1336
 *  dòng code chạy — chiếu hết là gần hai phút. Nổi bọt từ thế đã sắp sẵn có 50
 *  dòng, chiếu xong trong bốn giây. Đó là **sự thật về hai thuật toán đó**, không
 *  phải khuyết điểm của chỗ vẽ: bản trước ép cả bốn xong trong cùng một khoảng
 *  thời gian, và cái ép đó giấu mất chính con số đang muốn dạy.
 *
 *  Muốn nhanh hay chậm hơn thì đổi đúng một số ở đây. */
const FRAME_MS = 80

function Stage({
  algo,
  data,
  runNo,
  onRun,
}: {
  algo: Algo
  data: number[]
  runNo: number
  onRun: () => void
}) {
  const trace = useMemo(() => algo.run(data), [algo, data])
  const total = trace.frames.length
  // Khung đang chiếu. `-1` là chưa bấm Chạy: mảng hiện nguyên thế mở đầu, chưa ô
  // nào được tô — trạng thái đó khác hẳn "đã chạy xong".
  const [at, setAt] = useState(-1)

  useEffect(() => {
    if (runNo === 0 || total === 0) return
    setAt(0)
    if (total === 1) return
    let k = 0
    const id = setInterval(() => {
      k++
      setAt(k)
      if (k >= total - 1) clearInterval(id)
    }, FRAME_MS)
    return () => clearInterval(id)
  }, [runNo, total])

  const frame: Frame | null = at >= 0 && at < total ? trace.frames[at] : null
  const done = at >= total - 1 && runNo > 0

  return (
    <section className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent-soft">
          {algo.no}
        </span>
        <p className="font-mono text-[11px] tracking-[0.15em] text-fg-subtle">{algo.blurb}</p>
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">
          {algo.big_o} · {algo.space}
        </span>
        {algo.stable ? (
          <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
            stable
          </span>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-fg-muted">
            not stable
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <code className="font-mono text-lg font-semibold text-fg-strong">
          <span className="text-accent-soft">$ </span>
          {algo.cmd}
        </code>
        {/* Hai bộ đếm đứng cạnh nút Chạy, không nằm dưới đáy: đó là hai con số
            người ta đang chờ, và chúng nhảy lên ngay tầm mắt trong lúc chiếu.
            Đếm tới ĐÚNG khung đang chiếu, không phải tổng của cả vết — tổng thì
            nó đứng yên và không nói gì. */}
        <span className="ml-auto flex items-baseline gap-2 rounded-md border border-border px-3 py-1.5">
          <span className="text-[11px] text-fg-subtle">comparisons</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-accent-soft">
            {frame?.cmpSoFar ?? 0}
          </span>
        </span>
        <span className="flex items-baseline gap-2 rounded-md border border-border px-3 py-1.5">
          <span className="text-[11px] text-fg-subtle">writes</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-danger">
            {frame?.writeSoFar ?? 0}
          </span>
        </span>
        <button
          onClick={onRun}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
        >
          {runNo === 0 ? 'Run ▶' : 'Run again ↻'}
        </button>
      </div>

      <Bars data={data} frame={frame} />

      <div className="mt-3 min-h-12 rounded-lg border border-border bg-muted px-3 py-2">
        {runNo === 0 ? (
          <p className="font-mono text-xs text-fg-subtle">
            press Run to watch the bars move
            <span className="term-caret ml-0.5" />
          </p>
        ) : (
          <Readout frame={frame} at={at} total={total} done={done} trace={trace} />
        )}
      </div>

      <CodePanel algo={algo} frame={frame} />

      <div className="mt-4 border-t border-border pt-3">
        <Prose>{algo.teach}</Prose>
      </div>
    </section>
  )
}

/** Mảng vẽ thành dải cột, cao theo giá trị.
 *
 *  Không vẽ thành ô có số như bên tìm kiếm: ở đó mảng đứng yên và câu hỏi là "ô
 *  nào đang được mở ra"; ở đây mảng **đổi chỗ liên tục** và câu hỏi là "thứ tự đã
 *  gần đúng chưa". Một dải cột trả lời câu đó trong một cái liếc mắt — hình răng
 *  cưa thành hình bậc thang — còn 24 con số thì phải đọc từng cái rồi so trong
 *  đầu.
 *
 *  Thứ tự ưu tiên màu: đã chốt → vừa ghi → đang so → chốt của quicksort → ngoài
 *  đoạn. Chốt xanh đứng đầu vì nó là kết luận cuối cùng về ô đó; một ô đã chốt
 *  thì không bao giờ vừa-ghi hay đang-so nữa, nên thứ tự này không giấu gì. */
function Bars({ data, frame }: { data: number[]; frame: Frame | null }) {
  const a = frame?.a ?? data
  return (
    <div className="mt-4">
      <div className="flex h-48 items-end gap-[3px]" role="img" aria-label="24 bars, height by value">
        {a.map((v, i) => {
          const off = frame !== null && (i < frame.lo || i > frame.hi)
          const skin = frame?.done.includes(i)
            ? 'bg-success'
            : frame?.wrote.includes(i)
              ? 'bg-danger'
              : frame?.cmp?.includes(i)
                ? 'bg-accent'
                : frame?.pivot === i
                  ? 'bg-fg-strong'
                  : off
                    ? 'bg-muted'
                    : 'bg-border-strong'
          return (
            <div
              key={i}
              title={`index ${i} · value ${v}`}
              style={{ height: `${(v / N) * 100}%` }}
              className={'min-w-0 flex-1 rounded-t-sm transition-[background-color] ' + skin}
            />
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">Pale bars are outside the range under consideration. Amber is the pair being compared, red is a cell just written, green is a cell already in its final place.</p>
    </div>
  )
}

/** Một dòng nói *đang làm gì*, một dòng nói *xong rồi ra sao*.
 *
 *  Đếm hai con số khác nhau và phải gọi tên khác nhau: **bước** là dòng code đã
 *  chạy, **phép so** là lần thật sự đem hai ô ra so. Gọi cả hai là "bước" thì
 *  bảng điểm bên phải nói 88 mà chỗ này nói 398, và không ai biết cái nào đúng. */
function Readout({
  frame,
  at,
  total,
  done,
  trace,
}: {
  frame: Frame | null
  at: number
  total: number
  done: boolean
  trace: { comparisons: number; writes: number }
}) {
  return (
    <div className="space-y-0.5">
      <p className="font-mono text-xs text-fg-muted">
        <span className="text-accent-soft">
          {`step ${Math.min(at + 1, total)}/${total}`}
        </span>
        {frame && <> · {frame.note}</>}
      </p>
      {done && (
        <p className="line-in font-mono text-sm text-success">
          {`done — ${trace.comparisons} comparisons, ${trace.writes} writes`}
        </p>
      )}
    </div>
  )
}

/** Mã nguồn với dòng đang chạy được tô sáng, cộng một hàng chip cho mấy biến.
 *
 *  Đây là nửa còn lại của bài học. Dải cột nói *chuyện gì đang xảy ra*, bảng này
 *  nói *dòng nào làm ra chuyện đó* — và chúng sáng cùng một nhịp.
 *
 *  Code là chữ tĩnh trong `Algo.code`, không sinh ra từ hàm đang chạy: hai bản có
 *  thể lệch nhau, nên `sort.check.ts` canh bằng cách bắt **mọi dòng phải có lúc
 *  được chiếu sáng**. */
function CodePanel({ algo, frame }: { algo: Algo; frame: Frame | null }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-bg">
      <div className="flex items-baseline gap-2 border-b border-border px-3 py-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent/60" />
        <span className="font-mono text-xs text-fg-muted">{algo.file}</span>
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">
          {algo.big_o} time · {algo.space} space
        </span>
      </div>

      <div className="overflow-x-auto py-1">
        <div className="w-max min-w-full">
          {algo.code.map((line, i) => {
            const on = frame?.line === i + 1
            return (
              <p
                key={i}
                className={
                  'flex whitespace-pre px-3 font-mono text-xs leading-6 transition-colors ' +
                  (on ? 'bg-accent/15 text-fg-strong' : 'text-fg-muted')
                }
              >
                {/* Vạch trái thay cho việc đổi cả nền: dòng đang chạy phải nhận
                    ra được ngay cả khi mắt đang nhìn dải cột bên trên. */}
                <span
                  className={
                    'mr-3 w-4 shrink-0 border-l-2 pl-2 text-right tabular-nums ' +
                    (on ? 'border-accent text-accent-soft' : 'border-transparent text-fg-subtle')
                  }
                >
                  {i + 1}
                </span>
                {line || ' '}
              </p>
            )
          })}
        </div>
      </div>

      {/* Hàng biến luôn chiếm chỗ, kể cả khi rỗng: cao lên tụt xuống theo từng
          nhịp thì cả bảng code nhảy giật, mà mắt đang bám một dòng trong đó. */}
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 border-t border-border px-3 py-1.5">
        {frame?.vars.length ? (
          frame.vars.map((v) => (
            <span
              key={v.name}
              className="flex items-baseline gap-1.5 rounded border border-border px-2 py-0.5"
            >
              <span className="font-mono text-[11px] text-fg-subtle">{v.name}</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-fg-strong">
                {v.value}
              </span>
            </span>
          ))
        ) : (
          <span className="font-mono text-[11px] text-fg-subtle">no variables yet</span>
        )}
      </div>
    </div>
  )
}

// ── Cột phải: thế mở đầu và bảng điểm ──────────────────────────────────────

/** Bốn thế mở đầu, rồi tám con số cho **cùng một thế**.
 *
 *  Đây là lý do cả trang tồn tại, và nó có hai tầng. Tầng một: một thuật toán
 *  chạy đơn lẻ nói "276 phép so" mà không nói 276 là nhanh hay chậm; đặt cạnh 88
 *  thì nó tự nói. Tầng hai: đổi thế mở đầu rồi nhìn lại cũng tám con số đó — thứ
 *  vừa thắng đậm giờ thua đậm, và không dòng chữ nào dạy được điều đó bằng việc
 *  bấm một cái nút rồi thấy cột đảo chiều. */
function Board({
  board,
  sel,
  layoutId,
  onPick,
}: {
  board: ReturnType<typeof scoreboard>
  sel: string
  layoutId: string
  onPick: (id: string) => void
}) {
  const maxCmp = Math.max(...board.map((r) => r.comparisons), 1)
  const maxWrite = Math.max(...board.map((r) => r.writes), 1)
  const bestCmp = Math.min(...board.map((r) => r.comparisons))
  const bestWrite = Math.min(...board.map((r) => r.writes))

  return (
    <aside className={'shrink-0 lg:w-64 ' + STICK}>
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <ChartIcon className="h-4 w-4 shrink-0 text-accent-soft" />
          <span className="text-xs text-fg-subtle">starting order</span>
        </div>

        <ul className="mt-2 grid grid-cols-2 gap-1">
          {LAYOUTS.map((l) => {
            const on = l.id === layoutId
            return (
              <li key={l.id}>
                <button
                  onClick={() => onPick(l.id)}
                  aria-pressed={on}
                  title={l.hint}
                  className={
                    'w-full rounded-md border px-2 py-1.5 text-xs transition ' +
                    (on
                      ? 'border-accent bg-accent/10 font-medium text-accent-soft'
                      : 'border-border-strong text-fg-muted hover:border-accent/60 hover:text-fg')
                  }
                >
                  {l.name}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-fg-subtle">
          {layoutOf(layoutId).hint}
        </p>

        <ul className="mt-3 space-y-2.5 border-t border-border pt-3">
          {board.map((r) => (
            <li key={r.no}>
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    'text-xs ' +
                    (r.no === sel ? 'font-semibold text-accent-soft' : 'text-fg-muted')
                  }
                >
                  {r.name}
                </span>
                <span className="ml-auto font-mono text-xs tabular-nums">
                  <span className={r.comparisons === bestCmp ? 'text-success' : 'text-fg-muted'}>
                    {r.comparisons}
                  </span>
                  <span className="text-fg-subtle"> / </span>
                  <span className={r.writes === bestWrite ? 'text-success' : 'text-danger/80'}>
                    {r.writes}
                  </span>
                </span>
              </div>
              {/* Hai thanh chồng lên nhau: phép so ở trên, lần ghi ở dưới. Hai
                  con số trần thì phải đọc rồi trừ trong đầu; hai cặp thanh thì
                  chỗ đảo chiều — so ít nhất mà ghi nhiều nhất — nhìn ra ngay. */}
              <div className="mt-1 space-y-0.5">
                <Meter part={r.comparisons} whole={maxCmp} tone="accent" />
                <Meter part={r.writes} whole={maxWrite} tone="danger" />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-border pt-2 text-[11px] text-fg-subtle">
          Each row: comparisons / writes. Top bar is comparisons, bottom bar is writes.
        </p>
      </div>
    </aside>
  )
}

function Meter({
  part,
  whole,
  tone,
}: {
  part: number
  whole: number
  tone: 'accent' | 'danger'
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded bg-muted">
      <div
        className={
          'h-full rounded transition-all duration-500 ' +
          (tone === 'accent' ? 'bg-accent/60' : 'bg-danger/60')
        }
        style={{ width: `${(part / whole) * 100}%` }}
      />
    </div>
  )
}
