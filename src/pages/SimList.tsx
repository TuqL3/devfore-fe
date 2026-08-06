import { Link } from 'react-router-dom'

import { SIMS, SIM_INTRO } from '@/sims/registry'
import { customEntry } from '@/sims/custom'
import { CUSTOM_SLUG, isCustomised } from '@/sims/custom'
import type { SimEntry } from '@/lib/types'
import { Prose } from '@/components/MarkdownEditor'
import { ChevronRightIcon, LayersIcon } from '@/components/icons'

/** Danh sách các mô phỏng. Một trang riêng chứ không phải mấy cái nút đổi qua
 *  lại tại chỗ: sắp có nhiều mô phỏng, và một hàng nút dài dần là thứ hỏng lặng
 *  lẽ ở cái thứ tám. Mỗi mục có URL của riêng nó, gửi link được. */
export default function SimList() {
  // Dựng mỗi lần vẽ, không phải hằng số lúc nạp module: mô phỏng tự dựng lấy kịch
  // bản từ localStorage, nên quay lại đây sau khi sửa nó phải thấy số mới.
  const own = customEntry()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-fg-strong">Mô phỏng</h1>
        {/* Chữ do quản trị viết, không nhét cứng ở đây: mô phỏng thứ hai không
            nhất thiết là CI/CD, và sửa một câu không đáng một lần deploy. */}
        {/* Không bó bề ngang: bó lại thành một cột hẹp bên trái thì để trống
            nửa màn hình bên phải. */}
        {SIM_INTRO.trim() && (
          <div className="mt-1">
            <Prose>{SIM_INTRO}</Prose>
          </div>
        )}
        {/* Sân chơi không dạy CI/CD là gì — nó cho nghịch. Ai vào thẳng đây mà
            chưa biết gì thì phải có đường sang chỗ dạy, không thì họ ngồi trước
            một ô YAML trống và tự kết luận là mình không hiểu nổi. */}
        <Link
          to="/courses/ci-cd-co-ban"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
        >
          Chưa biết CI/CD là gì? Học từ đầu ở khoá CI/CD Cơ Bản
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hai mục riêng, không phải một lưới chung. Trong một lưới thì thẻ tự dựng
          chỉ là thẻ đầu tiên và thẻ thứ ba tràn xuống dòng — nhìn ra là lỗi xuống
          dòng, không ra hai loại khác hẳn nhau. Cái tự dựng sửa được và có AI;
          mấy cái kia là bài học cố định. Đó là khác biệt đáng một tiêu đề. */}
      <Section
        title="Mô phỏng của bạn"
        note="Bộ step do bạn đặt ra — mô tả một câu để AI dựng, hoặc sửa tay."
        sims={[own]}
      />

      {SIMS.length > 0 && (
        <Section
          title="Mô phỏng có sẵn"
          note="Bộ step và số giây do tác giả viết, không sửa được. Mỗi cái dạy một chuyện."
          sims={SIMS}
        />
      )}
    </div>
  )
}

function Section({
  title,
  note,
  sims,
}: {
  title: string
  note: string
  sims: SimEntry[]
}) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-fg-strong">{title}</h2>
      <p className="mt-0.5 text-sm text-fg-subtle">{note}</p>
      {/* Cùng một lưới hai cột ở cả hai mục: thẻ giữ nguyên bề rộng khi mắt đi từ
          mục này xuống mục kia, nên hai mục đọc ra là hai mục chứ không phải hai
          kiểu thẻ. */}
      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {sims.map((s) => (
          <li key={s.slug}>
            <SimCard sim={s} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function SimCard({ sim }: { sim: SimEntry }) {
  const catalog = sim.scenario.catalog ?? {}
  const steps = Object.values(catalog)
  // Viền đứt cho cái tự dựng: nó là chỗ trống bạn tự lấp, không phải bài học thứ
  // ba do tác giả viết, và hai loại đó không nên trông giống nhau.
  const own = sim.slug === CUSTOM_SLUG
  // Ba con số nói đúng thứ người ta cần biết trước khi bấm vào: bộ này to cỡ
  // nào, chạy được mấy job cùng lúc, và có bước nào hỏng ngẫu nhiên không.
  const flaky = steps.filter((s) => s.flaky).length
  const cacheable = steps.filter((s) => s.cacheable).length

  return (
    <Link
      to={`/sim/${sim.slug}`}
      className={
        'flex h-full flex-col rounded-xl p-4 transition hover:border-accent/60 hover:shadow-sm ' +
        (own
          ? 'border border-dashed border-border-strong bg-bg'
          : 'border border-border bg-surface')
      }
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-soft">
          <LayersIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg-strong">{sim.title}</p>
          <p className="mt-0.5 font-mono text-xs text-fg-subtle">{sim.slug}</p>
        </div>
        <ChevronRightIcon className="mt-2 h-4 w-4 shrink-0 text-fg-subtle" />
      </div>

      {sim.description.trim() && (
        // Văn bản trần, không render markdown: đây là dòng tóm tắt trên thẻ, và
        // một tiêu đề cấp hai bung ra giữa lưới thẻ thì phá cả hàng.
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">
          {plain(sim.description)}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-1.5 pt-3 font-mono text-[11px]">
        <Chip>{steps.length} step</Chip>
        <Chip>{sim.scenario.runner_count} runner</Chip>
        {cacheable > 0 && <Chip>{cacheable} step cache được</Chip>}
        {flaky > 0 && <Chip tone="danger">{flaky} step flaky</Chip>}
        {/* Nói ra bộ step đang là bản khởi đầu hay bản bạn dựng. Không có dòng
            này thì hai trạng thái rất khác nhau trông y hệt trên thẻ. */}
        {own && (
          <Chip tone="accent">{isCustomised() ? 'bạn đã dựng' : 'bộ khởi đầu'}</Chip>
        )}
      </div>
    </Link>
  )
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode
  tone?: 'danger' | 'accent'
}) {
  const skin =
    tone === 'danger'
      ? 'bg-danger/10 text-danger'
      : tone === 'accent'
        ? 'bg-accent/10 text-accent-soft'
        : 'bg-muted text-fg-muted'
  return <span className={'rounded px-1.5 py-0.5 ' + skin}>{children}</span>
}

/** Bỏ những dấu markdown hay gặp nhất để dòng tóm tắt đọc được. Không phải trình
 *  parse — chỗ này chỉ cần chữ, và một dấu sao sót lại thì cũng chỉ là một dấu
 *  sao. */
function plain(md: string): string {
  return md
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/[*_#>]/g, '')
    .trim()
}
