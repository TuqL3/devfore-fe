import { Link } from 'react-router-dom'

import { SIMS, SIM_INTRO } from '@/sims/registry'
import { customEntry } from '@/sims/custom'
import { CUSTOM_SLUG, isCustomised } from '@/sims/custom'
import { ALL_CMDS } from '@/sims/linux/commands'
import { ALGOS } from '@/sims/search/algos'
import { ALGOS as SORT_ALGOS, N as SORT_N } from '@/sims/sort/algos'
import type { SimEntry } from '@/lib/types'
import { Prose } from '@/components/MarkdownEditor'
import { ChevronRightIcon, LayersIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'

/** Danh sách các mô phỏng. Một trang riêng chứ không phải mấy cái nút đổi qua
 *  lại tại chỗ: sắp có nhiều mô phỏng, và một hàng nút dài dần là thứ hỏng lặng
 *  lẽ ở cái thứ tám. Mỗi mục có URL của riêng nó, gửi link được. */
export default function SimList() {
  const t = useT()
  // Dựng mỗi lần vẽ, không phải hằng số lúc nạp module: mô phỏng tự dựng lấy kịch
  // bản từ localStorage, nên quay lại đây sau khi sửa nó phải thấy số mới.
  const own = customEntry()

  return (
    // Bề rộng do `Layout` quyết (`max-w-6xl px-4`, bằng thanh nav). Bọc thêm ở
    // đây là kẹp hai lần và trang hẹp hơn header.
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-fg-strong">{t('simList.title')}</h1>
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
          {t('simList.learnCicd')}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hai mục riêng, không phải một lưới chung. Trong một lưới thì thẻ tự dựng
          chỉ là thẻ đầu tiên và thẻ thứ ba tràn xuống dòng — nhìn ra là lỗi xuống
          dòng, không ra hai loại khác hẳn nhau. Cái tự dựng sửa được và có AI;
          mấy cái kia là bài học cố định. Đó là khác biệt đáng một tiêu đề. */}
      {/* Tiêu đề mục đặt theo **chế độ**, tiêu đề thẻ đặt theo **engine**. Mục
          nới ra được khi có engine thứ hai nhận kịch bản tự dựng — lúc đó chỉ bỏ
          vế cuối của `note`. Thẻ thì không cần nới: mỗi thẻ vẫn thuộc đúng một
          engine. */}
      <Section
        title={t('simList.own')}
        note={t('simList.ownNote')}
        sims={[own]}
      />

      {SIMS.length > 0 && (
        <Section
          title={t('simList.builtin')}
          note={t('simList.builtinNote')}
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
  const t = useT()
  // Viền đứt cho cái tự dựng: nó là chỗ trống bạn tự lấp, không phải bài học thứ
  // ba do tác giả viết, và hai loại đó không nên trông giống nhau.
  const own = sim.slug === CUSTOM_SLUG

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
        {/* Mỗi engine đếm một thứ khác nhau. Một hàng chip chung cho cả hai thì
            phải là giao của hai bộ số, mà giao đó rỗng. */}
        <Stats sim={sim} />
        {/* Nói ra bộ step đang là bản khởi đầu hay bản bạn dựng. Không có dòng
            này thì hai trạng thái rất khác nhau trông y hệt trên thẻ. */}
        {own && (
          <Chip tone="accent">
            {isCustomised() ? t('play.yoursBuilt') : t('play.starterSet')}
          </Chip>
        )}
      </div>
    </Link>
  )
}

/** Mấy con số người ta cần biết trước khi bấm vào. Với CI/CD đó là bộ step to cỡ
 *  nào, chạy được mấy job cùng lúc, có bước nào hỏng ngẫu nhiên không; với Linux
 *  thì mấy câu đó vô nghĩa và câu đúng là có bao nhiêu lệnh. */
function Stats({ sim }: { sim: SimEntry }) {
  const t = useT()
  if (sim.engine === 'linux') {
    return (
      <>
        <Chip>{t('simList.commands', { n: ALL_CMDS.length })}</Chip>
        <Chip>{t('simList.inBrowser')}</Chip>
      </>
    )
  }
  if (sim.engine === 'search') {
    return (
      <>
        <Chip>{t('simList.algorithms', { n: ALGOS.length })}</Chip>
        <Chip>{t('simList.arrayItems', { n: 64 })}</Chip>
        <Chip>{t('simList.inBrowser')}</Chip>
      </>
    )
  }
  if (sim.engine === 'sort') {
    return (
      <>
        <Chip>{t('simList.algorithms', { n: SORT_ALGOS.length })}</Chip>
        <Chip>{t('simList.arrayItems', { n: SORT_N })}</Chip>
        <Chip>{t('simList.inBrowser')}</Chip>
      </>
    )
  }
  const steps = Object.values(sim.scenario.catalog ?? {})
  const flaky = steps.filter((s) => s.flaky).length
  const cacheable = steps.filter((s) => s.cacheable).length
  return (
    <>
      <Chip>{steps.length} step</Chip>
      <Chip>{sim.scenario.runner_count} runner</Chip>
      {cacheable > 0 && <Chip>{t('simList.cacheableSteps', { n: cacheable })}</Chip>}
      {flaky > 0 && <Chip tone="danger">{flaky} step flaky</Chip>}
    </>
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
