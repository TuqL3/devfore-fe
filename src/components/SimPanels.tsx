import type { SimScenario } from '@/lib/types'

/** Hai mảnh mà cả bài lab lẫn sân chơi đều cần, tách ra ở đây thay vì nhét một
 *  cờ chế độ vào `SimEditor`. Hai màn hình khác nhau ở chỗ có phiên hay không,
 *  có chấm điểm hay không — không khác ở chỗ hiển thị catalog và nhận xét. */

/** Những step lab này có, kèm giá của từng cái. Không phải đáp án: pipeline
 *  viết ra từ đúng bảng này, giấu đi thì chỉ còn cách đoán tên.
 *
 *  Có `onPick` thì mỗi dòng thành một cái nút chèn thẳng step vào ô soạn. Nó đổi
 *  câu hỏi người mới phải trả lời: không còn là "gõ tên gì vào đây" mà là "chọn
 *  cái nào trong mấy cái đang nhìn thấy". Không có `onPick` — màn lab — thì bảng
 *  vẫn chỉ là bảng tra. */
export function SimCatalog({
  scenario,
  open = true,
  onPick,
}: {
  scenario: SimScenario
  open?: boolean
  onPick?: (name: string) => void
}) {
  const steps = Object.entries(scenario.catalog).sort(([a], [b]) => a.localeCompare(b))

  return (
    <details className="rounded-xl border border-border bg-bg" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-fg-strong [&::-webkit-details-marker]:hidden">
        Step dùng được
        <span className="ml-auto font-mono text-xs text-fg-subtle">
          {scenario.runner_count} runner
          {scenario.cache_restore_seconds
            ? ` · cache ${scenario.cache_restore_seconds}s`
            : ''}
        </span>
      </summary>
      {onPick && (
        <p className="border-t border-border px-3 pt-2 text-xs text-fg-subtle">
          Bấm một step để chèn vào job đang sửa — không cần thuộc tên.
        </p>
      )}
      <ul className="divide-y divide-border border-t border-border">
        {steps.map(([name, spec]) => {
          const row = (
            <>
              <code className="font-mono text-xs text-accent-soft">{name}</code>
              <span className="font-mono text-xs text-fg-muted">{spec.seconds}s</span>
              {spec.cacheable && <Tag>cache {spec.cacheable}</Tag>}
              {spec.produces && <Tag>tạo {spec.produces}</Tag>}
              {spec.consumes && <Tag>cần {spec.consumes}</Tag>}
              {/* Nói thẳng tỉ lệ hỏng. Giấu đi thì một lượt đỏ đọc thành "mình
                  viết sai", trong khi không có gì để sửa cả. */}
              {spec.flaky ? <Tag tone="danger">flaky {spec.flaky}%</Tag> : null}
            </>
          )
          return (
            <li key={name}>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(name)}
                  title={`Chèn ${name} vào pipeline`}
                  className="flex w-full flex-wrap items-baseline gap-x-2 px-3 py-1.5 text-left transition hover:bg-muted"
                >
                  {row}
                  <span aria-hidden="true" className="ml-auto text-xs text-fg-subtle">
                    +
                  </span>
                </button>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/** Nhận xét engine sinh ra sau một lượt chạy. Rỗng thì không hiện gì — một khung
 *  trống nói "không có gì để cải thiện" mạnh hơn thực tế. */
export function SimInsights({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <ul className="space-y-1.5 rounded-xl border border-border bg-bg p-3">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-fg-muted">
          <span aria-hidden="true" className="text-accent-soft">
            →
          </span>
          <span className="min-w-0 flex-1">{line}</span>
        </li>
      ))}
    </ul>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <span
      className={
        'rounded px-1.5 py-0.5 text-[10px] ' +
        (tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-muted text-fg-subtle')
      }
    >
      {children}
    </span>
  )
}
