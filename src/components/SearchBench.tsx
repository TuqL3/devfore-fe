import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ALGOS,
  DEFAULT_TARGET_INDEX,
  missingValue,
  scoreboard,
  seedData,
} from '@/sims/search/algos'
import type { Algo, Frame } from '@/sims/search/algos'
import type { SimEntrySearch } from '@/lib/types'
import { Prose } from '@/components/MarkdownEditor'
import { useT, type Key } from '@/lib/i18n'
import { ChartIcon, ChevronRightIcon } from '@/components/icons'

/** Bàn xem bốn thuật toán tìm kiếm.
 *
 *  Cùng khung ba cột với mô phỏng Linux: danh sách bên trái, sân khấu ở giữa,
 *  trạng thái dùng chung bên phải. Ở đây "trạng thái dùng chung" là **mục tiêu**
 *  và **bảng điểm** — bốn thuật toán chỉ so được với nhau khi chúng đang tìm
 *  cùng một số, và bảng điểm là thứ duy nhất trên màn hình nói ra điều đó.
 *
 *  ponytail: khung ba cột chép từ `LinuxBench`, không tách ra dùng chung. Hai
 *  chỗ dùng thì một hàm `<Bench3Cols>` với năm cái prop đắt hơn là chép. Tách khi
 *  có chỗ thứ ba. */
export function SearchBench({ sim }: { sim: SimEntrySearch }) {
  const t = useT()
  // Mảng là hằng số — không sửa được, và đó là chủ ý: hình dạng lệch của nó
  // chính là bài học của thuật toán nội suy. Xem chú thích ở `seedData`.
  const [data] = useState(seedData)
  const [target, setTarget] = useState(() => seedData()[DEFAULT_TARGET_INDEX])
  const [sel, setSel] = useState(ALGOS[0].no)
  // Lượt thứ mấy của từng thuật toán. Dùng làm `key` cho phần chiếu lại, nên bấm
  // Chạy lần hai là một cây React mới và hiệu ứng chạy lại từ đầu.
  const [runs, setRuns] = useState<Record<string, number>>({})

  const algo = ALGOS.find((a) => a.no === sel) ?? ALGOS[0]
  const board = scoreboard(data, target)

  const pick = (v: number) => {
    setTarget(v)
    // Vết chạy cũ nói về một mục tiêu khác. Để nguyên trên màn hình là nói dối.
    setRuns({})
  }

  return (
    <div className="mt-4">
      <Prose>{sim.description}</Prose>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <AlgoRail sel={sel} onSel={setSel} ran={runs} board={board} />
        <Stage
          key={algo.no + ':' + (runs[algo.no] ?? 0) + ':' + target}
          algo={algo}
          data={data}
          target={target}
          runNo={runs[algo.no] ?? 0}
          onRun={() => setRuns((m) => ({ ...m, [algo.no]: (m[algo.no] ?? 0) + 1 }))}
          onPick={pick}
        />
        <Board
          board={board}
          sel={sel}
          target={target}
          data={data}
          onPick={pick}
          onReset={() => pick(data[DEFAULT_TARGET_INDEX])}
        />
      </div>

      {sim.guide.trim() && (
        <details className="mt-8 rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold text-fg-strong">
            {t('bench.rules')}
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
        {t('search.otherSims')}
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

/** ponytail: `top-14` là chiều cao thanh nav của `Layout` gõ cứng vào đây — nav
 *  là `sticky top-0 z-40`. Cùng giả định với `LinuxBench`. */
const STICK = 'lg:sticky lg:top-14 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto'

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
                  'w-full whitespace-nowrap rounded-md px-2 py-2 text-left transition ' +
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
                {/* Số phép so sánh ngay trên nút: chọn thuật toán nào cũng thấy
                    trước cái giá của nó, không phải bấm vào mới biết. */}
                <span className="mt-0.5 hidden items-baseline gap-2 lg:flex">
                  <span className="font-mono text-[11px] opacity-70">{a.big_o}</span>
                  <span className="ml-auto font-mono text-xs">
                    {board[i].comparisons} so
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

/** Tổng thời gian chiếu lại, tính bằng mili giây.
 *
 *  Nhịp chia đều cho số bước chứ không phải một con số cố định mỗi bước: tuần tự
 *  có 64 bước, 420ms mỗi bước là 27 giây ngồi nhìn. Chia ra thì mọi thuật toán
 *  chiếu xong trong khoảng bằng nhau, và **chính cái đó** làm thấy được sự khác
 *  biệt — nhị phân xong trong 5 nhịp thong thả, tuần tự phải chạy 64 nhịp gấp
 *  gáp mới kịp cùng lúc. */
const PLAY_MS = 2600
const paceOf = (n: number) => Math.min(500, Math.max(60, Math.round(PLAY_MS / n)))

function Stage({
  algo,
  data,
  target,
  runNo,
  onRun,
  onPick,
}: {
  algo: Algo
  data: number[]
  target: number
  runNo: number
  onRun: () => void
  onPick: (v: number) => void
}) {
  const t = useT()
  const trace = algo.run(data, target)
  const total = trace.frames.length
  // Bước đang chiếu. `-1` là chưa bấm Chạy: mảng hiện nguyên vẹn, chưa loại ô
  // nào — trạng thái đó khác hẳn "đã chạy xong và không tìm thấy".
  const [at, setAt] = useState(-1)

  useEffect(() => {
    if (runNo === 0 || total === 0) return
    setAt(0)
    if (total === 1) return
    const ms = paceOf(total)
    let k = 0
    const id = setInterval(() => {
      k++
      setAt(k)
      if (k >= total - 1) clearInterval(id)
    }, ms)
    return () => clearInterval(id)
  }, [runNo, total])

  const frame: Frame | null = at >= 0 && at < total ? trace.frames[at] : null
  const done = at >= total - 1 && runNo > 0
  // Phép so đã chạy tới nhịp này. Đếm lại từ đầu vết mỗi lần vẽ — 130 phần tử,
  // rẻ hơn hẳn việc nhét một bộ đếm vào state rồi lo nó lệch với `at`.
  const soFar =
    at < 0 ? 0 : trace.frames.slice(0, at + 1).filter((f) => f.cmp !== null).length

  return (
    <section className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent-soft">
          {algo.no}
        </span>
        <p className="font-mono text-[11px] tracking-[0.15em] text-fg-subtle">
          {algo.blurb}
        </p>
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">
          {algo.big_o} · {algo.space}
        </span>
        {algo.needs_sorted ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-fg-muted">
            {t('search.needsSorted')}
          </span>
        ) : (
          <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
            {t('search.noSortNeeded')}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <code className="font-mono text-xl font-semibold text-fg-strong">
          <span className="text-accent-soft">$ </span>
          {algo.cmd.replace('x', String(target))}
        </code>
        {/* Bộ đếm đứng cạnh nút Chạy, không nằm dưới đáy: nó là con số người ta
            đang chờ, và số nhảy lên ngay tầm mắt trong lúc chiếu là nửa sức hút
            của cả trang. Đếm phép so THẬT SỰ ĐÃ CHẠY tới nhịp này, không phải
            tổng của cả vết — tổng thì nó đứng yên và không nói gì. */}
        <span className="ml-auto flex items-baseline gap-2 rounded-md border border-border px-3 py-1.5">
          <span className="text-[11px] text-fg-subtle">{t('search.comparisons')}</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-accent-soft">
            {soFar}
          </span>
        </span>
        <button
          onClick={onRun}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
        >
          {runNo === 0 ? t('bench.run') : t('bench.rerun')}
        </button>
      </div>

      <Cells data={data} target={target} frame={frame} found={done ? trace.found : -1} onPick={onPick} />

      <div className="mt-3 min-h-12 rounded-lg border border-border bg-muted px-3 py-2">
        {runNo === 0 ? (
          <p className="font-mono text-xs text-fg-subtle">
            {t('search.pressRun')}
            <span className="term-caret ml-0.5" />
          </p>
        ) : (
          <Readout
            frame={frame}
            at={at}
            total={total}
            done={done}
            found={trace.found}
            comparisons={trace.comparisons}
          />
        )}
      </div>

      <CodePanel algo={algo} frame={frame} />

      <div className="mt-4 border-t border-border pt-3">
        <Prose>{algo.teach}</Prose>
      </div>
    </section>
  )
}

/** Mã nguồn với dòng đang chạy được tô sáng, cộng một hàng chip cho mấy biến.
 *
 *  Đây là nửa còn lại của bài học. Cái lưới nói *chuyện gì đang xảy ra*, bảng
 *  này nói *dòng nào làm ra chuyện đó* — và chúng sáng cùng một nhịp, nên phần
 *  nối hai thứ lại người học không phải tự dựng trong đầu.
 *
 *  Code là chữ tĩnh trong `Algo.code`, không phải sinh ra từ hàm đang chạy: hai
 *  bản có thể lệch nhau, nên `search.check.ts` canh bằng cách bắt **mọi dòng
 *  phải có lúc được chiếu sáng** — dòng không bao giờ sáng là dấu hiệu đoạn chữ
 *  trên màn hình đã rời khỏi cái hàm nó mô tả. */
function CodePanel({ algo, frame }: { algo: Algo; frame: Frame | null }) {
  const t = useT()
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
                    ra được ngay cả khi mắt đang nhìn cái lưới bên trên. */}
                <span
                  className={
                    'mr-3 w-4 shrink-0 border-l-2 pl-2 text-right tabular-nums ' +
                    (on ? 'border-accent text-accent-soft' : 'border-transparent text-fg-subtle')
                  }
                >
                  {i + 1}
                </span>
                {line}
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
          <span className="font-mono text-[11px] text-fg-subtle">
            {t('search.noVars')}
          </span>
        )}
      </div>
    </div>
  )
}

/** Một dòng nói *đang làm gì*, một dòng nói *xong rồi ra sao*.
 *
 *  Đếm hai con số khác nhau và phải gọi tên khác nhau: **bước** là dòng code đã
 *  chạy, **phép so** là lần thật sự đọc một phần tử ra so. Gọi cả hai là "bước"
 *  thì bảng điểm bên phải nói 5 mà chỗ này nói 25, và không ai biết cái nào
 *  đúng. */
function Readout({
  frame,
  at,
  total,
  done,
  found,
  comparisons,
}: {
  frame: Frame | null
  at: number
  total: number
  done: boolean
  found: number
  comparisons: number
}) {
  const t = useT()
  const CMP: Record<'lt' | 'eq' | 'gt', Key> = {
    lt: 'search.lt',
    gt: 'search.gt',
    eq: 'search.eq',
  }
  return (
    <div className="space-y-0.5">
      <p className="font-mono text-xs text-fg-muted">
        <span className="text-accent-soft">
          {t('search.stepOf', { at: Math.min(at + 1, total), total })}
        </span>
        {frame && <> · {frame.note}</>}
        {frame?.cmp && <> · {t(CMP[frame.cmp])}</>}
      </p>
      {done && (
        <p className="line-in font-mono text-sm">
          {found === -1 ? (
            <span className="text-danger">
              {t('search.notFoundAfter', { n: comparisons })}
            </span>
          ) : (
            <span className="text-success">
              {t('search.foundAt', { i: found, n: comparisons })}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

/** Mảng vẽ thành lưới 8×8 chứ không phải một dải ngang.
 *
 *  64 ô ba chữ số xếp một hàng là hơn 2000px, tức là luôn phải cuộn ngang và
 *  không bao giờ nhìn được cả mảng cùng lúc — mà "cả mảng cùng lúc" chính là thứ
 *  làm thấy được nhị phân vứt đi một nửa. Lưới đọc theo hàng nên đoạn `[lo, hi]`
 *  vẫn liền mạch. */
function Cells({
  data,
  target,
  frame,
  found,
  onPick,
}: {
  data: number[]
  target: number
  frame: Frame | null
  found: number
  onPick: (v: number) => void
}) {
  const t = useT()
  return (
    <div className="mt-4">
      <div className="grid grid-cols-8 gap-1">
        {data.map((v, i) => {
          const out = frame !== null && (i < frame.lo || i > frame.hi)
          const probe = frame?.probe === i
          const hit = found === i
          const isTarget = v === target
          return (
            <button
              key={i}
              onClick={() => onPick(v)}
              title={t('search.cellTitle', { i, v })}
              className={
                'rounded py-1 text-center font-mono text-xs tabular-nums transition ' +
                (hit
                  ? 'bg-success text-bg font-semibold'
                  : probe
                    ? 'bg-accent text-accent-fg font-semibold'
                    : out
                      ? 'bg-bg text-fg-subtle opacity-35 line-through'
                      : isTarget
                        ? 'bg-accent/15 text-accent-soft ring-1 ring-accent/40'
                        : 'bg-muted text-fg-muted hover:bg-accent/10 hover:text-fg')
              }
            >
              {v}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">
        {t('search.pickHint')}
      </p>
    </div>
  )
}

// ── Cột phải: bảng điểm ────────────────────────────────────────────────────

/** Bốn con số cho **cùng một mục tiêu**.
 *
 *  Đây là lý do cả trang tồn tại. Một thuật toán chạy đơn lẻ nói "5 phép so" mà
 *  không nói 5 là nhanh hay chậm; đặt cạnh con số 58 thì nó tự nói. Cả bốn được
 *  tính lại mỗi lần đổi mục tiêu — 4 × 64 phép, rẻ hơn hẳn việc dựng một chỗ nhớ
 *  rồi lo nó lệch với thứ đang hiện trên sân khấu. */
function Board({
  board,
  sel,
  target,
  data,
  onPick,
  onReset,
}: {
  board: ReturnType<typeof scoreboard>
  sel: string
  target: number
  data: number[]
  onPick: (v: number) => void
  onReset: () => void
}) {
  const t = useT()
  const max = Math.max(...board.map((r) => r.comparisons), 1)
  const best = Math.min(...board.map((r) => r.comparisons))
  const found = board[0].found

  return (
    <aside className={'shrink-0 lg:w-64 ' + STICK}>
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <ChartIcon className="h-4 w-4 shrink-0 text-accent-soft" />
          <span className="text-xs text-fg-subtle">{t('search.looking')}</span>
          <code className="ml-auto font-mono text-sm font-semibold text-fg-strong">
            {target}
          </code>
        </div>

        <p className="mt-2 text-[11px] text-fg-subtle">
          {found === -1
            ? t('search.notInArray')
            : t('search.atCell', { i: found })}
        </p>

        <ul className="mt-2 space-y-2">
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
                <span
                  className={
                    'ml-auto font-mono text-xs tabular-nums ' +
                    (r.comparisons === best ? 'text-success' : 'text-fg-muted')
                  }
                >
                  {r.comparisons}
                </span>
              </div>
              {/* Thanh dài theo số phép so. Bốn con số trần thì phải đọc rồi trừ
                  trong đầu; bốn cái thanh thì chênh lệch nhìn ra ngay. */}
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                <div
                  className={
                    'h-full rounded transition-all duration-500 ' +
                    (r.comparisons === best ? 'bg-success' : 'bg-accent/60')
                  }
                  style={{ width: `${(r.comparisons / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <button
            onClick={() => onPick(missingValue(data))}
            className="w-full rounded-md border border-border-strong px-2 py-1.5 text-xs text-fg-muted transition hover:border-accent/60 hover:text-fg"
          >
            {t('search.missingNumber')}
          </button>
          <button
            onClick={onReset}
            className="w-full rounded-md border border-border-strong px-2 py-1.5 text-xs text-fg-muted transition hover:border-accent/60 hover:text-fg"
          >
            {t('bench.reset')}
          </button>
        </div>
      </div>
    </aside>
  )
}
