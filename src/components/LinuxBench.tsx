import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ALL_CMDS, SECTIONS, initState, nextLogLine } from '@/sims/linux/commands'
import type { LinuxCmd, LinuxResult, LinuxState } from '@/sims/linux/commands'
import { isDir, modeString, short, walk } from '@/sims/linux/fs'
import type { SimEntryLinux } from '@/lib/types'
import { Prose } from '@/components/MarkdownEditor'
import { ChevronRightIcon, TerminalIcon } from '@/components/icons'

/** Bàn xem mười lệnh Linux: danh sách lệnh bên trái, sân khấu ở giữa, cây thư
 *  mục sống bên phải.
 *
 *  Ba cột chứ không phải mười cái thẻ xếp dọc. Bản trước là mười thẻ cao giống
 *  hệt nhau, và nó giấu mất điều đáng nói nhất: **cả mười lệnh dùng chung một
 *  cây file**. Thứ đó không nói bằng chữ được — phải thấy `mkdir` mọc thêm một
 *  nhánh vào đúng cái cây mà `ls` vừa liệt kê, ngay bên cạnh, cùng lúc.
 *
 *  Cột trái và cột phải dính theo màn hình, chỉ sân khấu ở giữa cuộn. Không gõ
 *  được gì: dòng lệnh do tác giả viết sẵn, bấm Chạy rồi xem. Lý do ở đầu
 *  `commands.ts`.
 *
 *  Màu đi theo chủ đề sáng/tối của trang — `ui.tsx` đã ghi lý do không khoá một
 *  hộp tối vĩnh viễn. Chất terminal ở đây đến từ chữ mono, nhịp hiện dần và bố
 *  cục. */
export function LinuxBench({ sim }: { sim: SimEntryLinux }) {
  // Cây bị **sửa tại chỗ** — `mkdir` đẩy node mới vào, `chmod` gán lại `mode`.
  // Không sao: mọi lượt chạy đều ghi vào `runs`, và lần vẽ lại vì `runs` đọc
  // luôn cây mới. Đổi sang cây bất biến thì mỗi lệnh phải dựng lại đường dẫn tới
  // node vừa sửa — một thư viện cây chỉ để bảng bên phải đổi một dòng.
  const [st, setSt] = useState<LinuxState>(initState)
  const [sel, setSel] = useState(ALL_CMDS[0].no)
  // Kết quả **giữ theo từng lệnh**, không phải một chỗ dùng chung: bấm sang lệnh
  // khác rồi quay lại phải thấy đúng thứ mình vừa chạy. `n` là lượt thứ mấy —
  // nó làm `key` cho phần vẽ, và cây React mới là cách duy nhất bắt hiệu ứng CSS
  // chạy lại từ đầu.
  const [runs, setRuns] = useState<Record<string, { res: LinuxResult; n: number }>>({})
  // Node vừa bị lượt chạy gần nhất sửa. Chỉ của **một** lượt: giữ dồn lại thì
  // sau năm lệnh cả cây sáng trưng và không còn chỉ ra được cái gì.
  const [touched, setTouched] = useState<string[]>([])

  const cmd = ALL_CMDS.find((c) => c.no === sel) ?? ALL_CMDS[0]
  const cur = runs[cmd.no]

  const run = () => {
    const res = cmd.run(cmd.arg ?? '', st)
    setRuns((m) => ({ ...m, [cmd.no]: { res, n: (m[cmd.no]?.n ?? 0) + 1 } }))
    setTouched('changed' in res ? (res.changed ?? []) : [])
  }

  const reset = () => {
    setSt(initState())
    setRuns({})
    setTouched([])
  }

  return (
    <div className="mt-4">
      <Prose>{sim.description}</Prose>

      {/* Dưới `lg` thì xếp dọc: cột lệnh thành một hàng cuộn ngang, cây xuống
          dưới cùng. Ba cột 288px trên màn hình điện thoại là ba cột không đọc
          được cột nào. */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <CmdRail sel={sel} onSel={setSel} ran={runs} onReset={reset} />
        <Stage cmd={cmd} res={cur?.res ?? null} runNo={cur?.n ?? 0} onRun={run} />
        <FsTree st={st} touched={touched} />
      </div>

      {sim.guide.trim() && (
        <details className="mt-8 rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold text-fg-strong">
            Luật và giới hạn của mô phỏng này
          </summary>
          <div className="mt-3">
            <Prose>{sim.guide}</Prose>
          </div>
        </details>
      )}

      {/* Mấy giới hạn ở phần luật đều biến mất ở container thật. Ai đọc tới đây
          là người đã sẵn sàng cho chỗ đó — không có đường sang thì họ dừng ở mô
          phỏng và tưởng đó là hết. */}
      <Link
        to="/courses"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        Muốn gõ trong Linux thật? Lab có container với terminal thật
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

/** ponytail: `top-14` là chiều cao thanh nav của `Layout` gõ cứng vào đây — nav
 *  là `sticky top-0 z-40`. Nav cao lên là hai thanh chồng nhau. Đổi sang một
 *  biến CSS dùng chung khi nào có chỗ thứ ba cần con số này. */
const STICK = 'lg:sticky lg:top-14 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto'

// ── Cột trái: danh sách lệnh ───────────────────────────────────────────────

function CmdRail({
  sel,
  onSel,
  ran,
  onReset,
}: {
  sel: string
  onSel: (no: string) => void
  ran: Record<string, unknown>
  onReset: () => void
}) {
  return (
    <nav className={'shrink-0 lg:w-52 ' + STICK}>
      {/* Cuộn ngang ở màn hình hẹp, xếp dọc từ `lg`. Cùng một danh sách, không
          phải hai bản dựng riêng. */}
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:block lg:overflow-visible lg:pb-0">
        {SECTIONS.map((sec) => (
          <li key={sec.no} className="lg:mb-3">
            <p className="hidden px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-fg-subtle lg:block">
              {sec.title}
            </p>
            <ul className="flex gap-1 lg:block lg:space-y-0.5">
              {sec.cmds.map((c) => {
                const on = c.no === sel
                return (
                  <li key={c.no}>
                    <button
                      onClick={() => onSel(c.no)}
                      aria-current={on ? 'true' : undefined}
                      className={
                        'flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-left font-mono text-sm transition ' +
                        (on
                          ? 'bg-accent/15 text-accent-soft'
                          : 'text-fg-muted hover:bg-muted hover:text-fg')
                      }
                    >
                      <span className="text-[10px] opacity-70">{c.no}</span>
                      <span className="flex-1">{c.cmd}</span>
                      {/* Chấm = đã chạy ít nhất một lượt. Mười lệnh nhìn giống
                          nhau thì không nhớ nổi mình đã xem cái nào. */}
                      {c.no in ran && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
      <button
        onClick={onReset}
        className="mt-2 w-full rounded-md border border-border-strong px-2 py-1.5 text-xs text-fg-muted transition hover:border-accent/60 hover:text-fg"
      >
        Dựng lại
      </button>
    </nav>
  )
}

// ── Cột giữa: sân khấu ─────────────────────────────────────────────────────

function Stage({
  cmd,
  res,
  runNo,
  onRun,
}: {
  cmd: LinuxCmd
  res: LinuxResult | null
  runNo: number
  onRun: () => void
}) {
  return (
    <section className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-baseline gap-3">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent-soft">
          {cmd.no}
        </span>
        <p className="font-mono text-[11px] tracking-[0.15em] text-fg-subtle">
          {cmd.blurb}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Dòng lệnh là chữ, không phải ô nhập. Một cái viền ô ở đây là lời mời
            gõ vào chỗ không gõ được. */}
        <code className="font-mono text-xl font-semibold text-fg-strong">
          <span className="text-accent-soft">$ </span>
          {cmd.cmd}
          {cmd.arg && <span className="ml-2 font-normal text-accent-soft">{cmd.arg}</span>}
        </code>
        <button
          onClick={onRun}
          className="ml-auto shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
        >
          {runNo === 0 ? 'Chạy ▶' : 'Chạy lại ↻'}
        </button>
      </div>

      <div className="mt-4 min-h-40 rounded-lg border border-border bg-muted p-4">
        {res ? (
          <ResultView key={runNo} res={res} />
        ) : (
          <p className="font-mono text-xs text-fg-subtle">
            bấm Chạy để xem<span className="term-caret ml-0.5" />
          </p>
        )}
      </div>

      {/* Không gập nữa. Ở bản mười thẻ, phần này là `<details>` vì mười khối chữ
          mở sẵn đẩy trang dài gấp đôi — giờ chỉ có một lệnh trên màn hình, mà
          hình với lời giải thích thì đáng đọc cùng nhau. */}
      <div className="mt-4 border-t border-border pt-3">
        <Prose>{cmd.teach}</Prose>
      </div>
    </section>
  )
}

// ── Cột phải: cây thư mục sống ─────────────────────────────────────────────

/** Toàn bộ cây file, vẽ lại sau mỗi lượt chạy.
 *
 *  Đây là lý do bố cục ba cột tồn tại. `mkdir` mọc thêm nhánh ở đây, `chmod` đổi
 *  cột quyền ở đây, `cd` dời cái dấu đang-đứng ở đây — cùng một cái cây mà cả
 *  mười lệnh đang nói tới, chứ không phải mười cái ảnh rời nhau.
 *
 *  Gốc là `/` chứ không phải `~/project`: `cd` đi ra ngoài được, và một cái cây
 *  giấu mất chỗ người dùng đang đứng thì tệ hơn ba dòng thừa. */
function FsTree({ st, touched }: { st: LinuxState; touched: string[] }) {
  const hot = new Set(touched)
  const rows: { path: string; name: string; depth: number; dir: boolean; mode: string }[] =
    [{ path: '/', name: '/', depth: 0, dir: true, mode: '' }]
  walk(st.root, '/', (node, path) => {
    rows.push({
      path,
      name: node.name,
      depth: path.split('/').length - 1,
      dir: isDir(node),
      mode: modeString(node),
    })
  })

  return (
    <aside className={'shrink-0 lg:w-72 ' + STICK}>
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <TerminalIcon className="h-4 w-4 shrink-0 text-accent-soft" />
          <span className="text-xs text-fg-subtle">đang ở</span>
          <code className="min-w-0 flex-1 truncate text-right font-mono text-xs text-fg-strong">
            {short(st.cwd)}
          </code>
        </div>

        <div className="mt-2 overflow-x-auto">
          <div className="w-max">
            {rows.map((r) => {
              const here = r.path === st.cwd
              const changed = hot.has(r.path)
              return (
                <p
                  key={r.path}
                  style={{ paddingLeft: r.depth * 12 }}
                  className={
                    'whitespace-pre rounded px-1 font-mono text-xs ' +
                    (here
                      ? 'bg-accent/15 text-accent-soft'
                      : changed
                        ? 'text-accent-soft'
                        : r.dir
                          ? 'text-fg-muted'
                          : 'text-fg-subtle')
                  }
                >
                  {r.dir ? '▸ ' : '· '}
                  {r.name}
                  {r.dir && r.name !== '/' && '/'}
                  {here && <span className="ml-1 text-[10px]">← bạn ở đây</span>}
                  {/* Quyền chỉ hiện ở node vừa đổi. Hiện cho mọi dòng thì cột
                      này rộng gấp đôi phần tên, và thứ `chmod` vừa làm chìm
                      giữa mười lăm dòng giống hệt. */}
                  {changed && (
                    <span className="ml-2 rounded bg-accent/15 px-1 text-[10px]">
                      {r.mode}
                    </span>
                  )}
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Hiện dần ───────────────────────────────────────────────────────────────

/** Nhịp hiện của từng dòng, tính bằng mili giây.
 *
 *  Không phải một con số chung: `ls` có thể ra mười lăm dòng và nhỏ giọt 400ms
 *  mỗi dòng thì thành tra tấn, còn ba chặng của `curl` mà hiện trong 120ms thì
 *  không kịp đọc ra là chúng đi lần lượt. Số dòng càng ít, nhịp càng chậm. */
const STEP = {
  chip: 40,
  row: 55,
  tree: 110,
  match: 130,
  perm: 200,
  hop: 400,
} as const

/** Độ trễ của phần tử thứ `i`, dạng thuộc tính style.
 *
 *  Cả hiệu ứng nằm ở CSS (`.line-in` trong `index.css`), không có bộ đếm giờ nào
 *  trong JS: không state, không dọn dẹp, và `prefers-reduced-motion` đã được lo
 *  ngay tại chỗ định nghĩa class. */
const at = (i: number, step: number) => ({ animationDelay: `${i * step}ms` })

// ── Vẽ kết quả ─────────────────────────────────────────────────────────────

function ResultView({ res }: { res: LinuxResult }) {
  switch (res.kind) {
    case 'error':
      return <p className="line-in font-mono text-xs text-danger">{res.text}</p>
    case 'path':
      return <PathView res={res} />
    case 'list':
      return <ListView res={res} />
    case 'tree':
      return <TreeView res={res} />
    case 'matches':
      return <MatchesView res={res} />
    case 'stream':
      return <StreamView res={res} />
    case 'perms':
      return <PermsView res={res} />
    case 'hops':
      return <HopsView res={res} />
  }
}

type Of<K extends LinuxResult['kind']> = Extract<LinuxResult, { kind: K }>

/** Khung cuộn ngang cho mọi thứ dạng dòng. Một dòng code hay một đường dẫn dài
 *  hơn sân khấu là chuyện thường — không có khung này thì nó đẩy cả trang trượt
 *  ngang. */
const Scroll = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto">{children}</div>
)

function PathView({ res }: { res: Of<'path'> }) {
  const moved = res.from !== res.to
  return (
    <div>
      {moved && (
        <p className="line-in font-mono text-xs text-fg-subtle">
          <span className="line-through">{short(res.from)}</span> →
        </p>
      )}
      <Scroll>
        <p
          className="line-in whitespace-pre font-mono text-2xl text-accent-soft"
          style={at(moved ? 1 : 0, 180)}
        >
          {short(res.to)}
          <span className="term-caret ml-1" />
        </p>
      </Scroll>
      {res.entries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {res.entries.map((e, i) => (
            <span
              key={e.name}
              style={at(i + 2, STEP.chip)}
              className={
                'line-in rounded px-2 py-1 font-mono text-xs ' +
                (e.dir ? 'bg-accent/10 text-accent-soft' : 'bg-bg text-fg-muted')
              }
            >
              {e.name}
              {e.dir && '/'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ListView({ res }: { res: Of<'list'> }) {
  return (
    <div>
      <p className="line-in mb-2 font-mono text-xs text-fg-subtle">{res.at}</p>
      <Scroll>
        <table className="font-mono text-sm">
          <tbody>
            {res.rows.map((r, i) => (
              <tr key={r.name} className="line-in" style={at(i + 1, STEP.row)}>
                {/* Cột quyền đứng đầu vì nó là thứ `chmod` sửa — hai lệnh phải
                    nhìn vào cùng một chỗ. */}
                <td className="whitespace-pre pr-4 text-fg-subtle">{r.mode}</td>
                <td className="pr-4 text-right tabular-nums text-fg-subtle">{r.size}</td>
                <td
                  className={
                    'whitespace-pre ' +
                    (r.dir ? 'font-medium text-accent-soft' : 'text-fg')
                  }
                >
                  {r.name}
                  {r.dir && '/'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      {res.rows.length === 0 && (
        <p className="line-in font-mono text-sm text-fg-subtle">thư mục rỗng</p>
      )}
    </div>
  )
}

function TreeView({ res }: { res: Of<'tree'> }) {
  return (
    <div>
      <Scroll>
        <div className="w-max">
          {res.lines.map((l, i) => (
            <p
              key={i}
              style={{ paddingLeft: l.depth * 22, ...at(i, STEP.tree) }}
              className={
                'line-in whitespace-pre font-mono text-sm ' +
                (l.hit ? 'text-accent-soft' : 'text-fg-subtle')
              }
            >
              {l.dir ? '▸ ' : '· '}
              {l.name}
              {l.dir && '/'}
              {l.hit && (
                <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px]">
                  {res.hitLabel}
                </span>
              )}
            </p>
          ))}
        </div>
      </Scroll>
      <p
        className="line-in mt-3 text-xs text-fg-subtle"
        style={at(res.lines.length, STEP.tree)}
      >
        {res.note}
      </p>
    </div>
  )
}

function MatchesView({ res }: { res: Of<'matches'> }) {
  return (
    <div>
      <p className="line-in mb-2 text-xs text-fg-subtle">
        {res.hits.length} khớp trong {res.scanned} file
      </p>
      <Scroll>
        <div className="w-max space-y-1">
          {res.hits.map((h, i) => (
            <p
              key={i}
              style={at(i + 1, STEP.match)}
              className="line-in whitespace-pre font-mono text-sm"
            >
              <span className="text-accent-soft">
                {h.path}:{h.line}
              </span>
              <span className="text-fg-muted">
                : {h.text.slice(0, h.from)}
                <mark className="rounded bg-accent/25 px-0.5 text-fg-strong">
                  {h.text.slice(h.from, h.to)}
                </mark>
                {h.text.slice(h.to)}
              </span>
            </p>
          ))}
        </div>
      </Scroll>
      {res.hits.length === 0 && (
        <p className="line-in font-mono text-sm text-fg-subtle">không có dòng nào khớp</p>
      )}
    </div>
  )
}

/** `-f` là *follow*, và thứ duy nhất chứng minh được điều đó là chữ tự hiện
 *  thêm. Một ảnh chụp mấy dòng cuối thì đúng với `tail` trần, không đúng với
 *  `tail -f`.
 *
 *  Đây là chỗ duy nhất còn một bộ đếm giờ trong JS: mấy chỗ kia chỉ xếp nhịp cho
 *  một danh sách đã biết trước, còn chỗ này sinh ra dòng mới thật. */
function StreamView({ res }: { res: Of<'stream'> }) {
  const [extra, setExtra] = useState<string[]>([])
  const [live, setLive] = useState(true)

  useEffect(() => {
    if (!live) return
    let i = 0
    const id = setInterval(() => {
      // Cắt còn 14 dòng: sân khấu không được cao dần mãi.
      setExtra((x) => [...x, nextLogLine(i++)].slice(-14))
    }, 1100)
    return () => clearInterval(id)
  }, [live])

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={
            'h-2 w-2 rounded-full ' + (live ? 'animate-pulse bg-success' : 'bg-fg-subtle')
          }
        />
        <span className="font-mono text-xs text-fg-subtle">{res.file}</span>
        <button
          onClick={() => setLive((v) => !v)}
          className="ml-auto rounded border border-border-strong px-2 py-0.5 font-mono text-[11px] text-fg-muted transition hover:text-fg"
        >
          {live ? 'Ctrl-C' : 'theo dõi lại'}
        </button>
      </div>
      <Scroll>
        <div className="w-max">
          {res.lines.map((l, i) => (
            <p
              key={'seed' + i}
              style={at(i, 70)}
              className="line-in whitespace-pre font-mono text-sm text-fg-subtle"
            >
              {l}
            </p>
          ))}
          {/* Dòng mới không có độ trễ: nó vừa tới thật, không phải một mục trong
              danh sách đang được xếp nhịp. */}
          {extra.map((l, i) => (
            <p
              key={'new' + i}
              className="line-in whitespace-pre font-mono text-sm text-fg"
            >
              {l}
            </p>
          ))}
          {live && (
            <p className="font-mono text-sm text-fg-subtle">
              <span className="term-caret" />
            </p>
          )}
        </div>
      </Scroll>
    </div>
  )
}

const GROUPS = ['chủ sở hữu', 'nhóm', 'mọi người']
const BITS: { ch: string; v: number }[] = [
  { ch: 'r', v: 4 },
  { ch: 'w', v: 2 },
  { ch: 'x', v: 1 },
]

/** Ba chữ số thành chín ô bật/tắt. Cả bài học của `chmod` nằm ở chỗ
 *  `7 = 4+2+1`, và không có cách nào nói câu đó bằng chữ nhanh bằng chỉ vào chín
 *  cái ô — nhất là khi chúng sáng lên lần lượt theo từng nhóm. */
function PermsView({ res }: { res: Of<'perms'> }) {
  const oct = (m: number) => m.toString(8).padStart(3, '0')
  const opened = (res.after & ~res.before & 0o777) !== 0
  return (
    <div>
      <p className="line-in font-mono text-sm">
        <span className="text-fg-subtle line-through">{oct(res.before)}</span>
        <span className="mx-2 text-fg-subtle">→</span>
        <span className="text-2xl font-semibold text-accent-soft">{oct(res.after)}</span>
        <span className="ml-3 text-fg-muted">{res.file}</span>
      </p>
      <div className="mt-3 space-y-1.5">
        {GROUPS.map((g, i) => {
          const d = (res.after >> (6 - 3 * i)) & 7
          return (
            <div
              key={g}
              className="line-in flex items-center gap-3"
              style={at(i + 1, STEP.perm)}
            >
              <span className="w-24 shrink-0 text-xs text-fg-subtle">{g}</span>
              <span className="font-mono text-sm text-fg-subtle">{d}</span>
              <div className="flex gap-1.5">
                {BITS.map((b) => (
                  <span
                    key={b.ch}
                    className={
                      'grid h-7 w-7 place-items-center rounded font-mono text-sm ' +
                      ((d & b.v) !== 0
                        ? 'bg-accent/20 text-accent-soft'
                        : 'bg-bg text-fg-subtle')
                    }
                  >
                    {(d & b.v) !== 0 ? b.ch : '-'}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p
        className="line-in mt-3 text-xs text-fg-subtle"
        style={at(GROUPS.length + 1, STEP.perm)}
      >
        {opened ? '🔓 vừa mở thêm cho người khác' : '🔒 vừa siết lại'}
      </p>
    </div>
  )
}

function HopsView({ res }: { res: Of<'hops'> }) {
  return (
    <div>
      <Scroll>
        <div className="flex w-max items-stretch gap-2">
          {res.hops.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                style={at(i * 2, STEP.hop / 2)}
                className={
                  'line-in rounded-lg border px-3 py-2 ' +
                  (h.state === 'ok' ? 'border-accent/50' : 'border-danger/60')
                }
              >
                <p className="font-mono text-sm text-fg-strong">{h.title}</p>
                <p
                  className={
                    'font-mono text-xs ' +
                    (h.state === 'ok' ? 'text-fg-subtle' : 'text-danger')
                  }
                >
                  {h.sub}
                </p>
              </div>
              {i < res.hops.length - 1 && (
                <span
                  style={at(i * 2 + 1, STEP.hop / 2)}
                  className="line-in font-mono text-sm text-fg-subtle"
                >
                  ···
                </span>
              )}
            </div>
          ))}
        </div>
      </Scroll>
      <p
        className="line-in mt-3 font-mono text-xs text-fg-subtle"
        style={at(res.hops.length * 2, STEP.hop / 2)}
      >
        {res.note}
      </p>
      <Scroll>
        <pre
          className="line-in mt-2 w-max font-mono text-sm text-fg-muted"
          style={at(res.hops.length * 2 + 1, STEP.hop / 2)}
        >
          {res.body.join('\n')}
        </pre>
      </Scroll>
    </div>
  )
}
