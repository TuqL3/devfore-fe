import { Fragment, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { CourseCard } from './Courses'
import { useLevels } from '@/lib/levels'
import { LevelMeter } from '@/components/LevelMeter'

const chips = [
  'Container Linux thật',
  'Chấm bằng trạng thái máy',
  'Thử thách có đồng hồ',
  'Mô phỏng chạy trong trình duyệt',
]

/** Bốn thứ làm được ở đây, và chỗ để đi tới từng cái.
 *
 *  Trước đây trang chủ chỉ nói về khoá học, nên War Room và Mô phỏng — hai thứ
 *  vào thẳng được, không cần đăng ký gì — chỉ ai bấm trúng thanh nav mới biết là
 *  có. Một tính năng không ai tìm thấy thì bằng không tồn tại.
 *
 *  `highlight` cho War Room: nó là thứ khác biệt nhất và mới nhất, và một lưới
 *  bốn ô giống hệt nhau thì không ô nào được nhìn trước. */
const FEATURES: {
  to: string
  title: string
  body: string
  bullets: string[]
  highlight?: true
}[] = [
  {
    to: '/war-room',
    title: 'War Room — thử thách có đồng hồ',
    body: 'Mở ra là hệ thống đã hỏng sẵn, không ai nói hỏng ở đâu. Tìm ra và sửa trước khi hết giờ.',
    bullets: ['Lỗi bốc ngẫu nhiên mỗi lượt', 'Đồng hồ và số người dùng đang chịu lỗi chạy ngay trên màn hình', 'Xong có bản tường trình: mất bao lâu, bạn đã gõ gì'],
    highlight: true,
  },
  {
    to: '/courses',
    title: 'Lab trên container thật',
    body: 'Mỗi bài mở một container Linux riêng, vào bằng terminal ngay trong trình duyệt. Không cài gì trên máy bạn.',
    bullets: ['Terminal thật, không phải video', 'Chấm theo trạng thái máy, không theo lệnh bạn gõ', 'Hết giờ là container tự dọn'],
  },
  {
    to: '/sim',
    title: 'Mô phỏng chạy được',
    body: 'Những thứ dựng thật thì đắt hoặc nguy hiểm, ở đây mô phỏng: pipeline CI/CD, lệnh Linux, thuật toán tìm kiếm.',
    bullets: ['Mở là dùng, không đăng ký, không chấm điểm', 'Tự dựng pipeline của riêng bạn — mô tả một câu, AI dựng kịch bản'],
  },
  {
    to: '/history',
    title: 'Lịch sử và tường trình',
    body: 'Mọi lượt làm được ghi lại: câu nào đúng, câu nào phải thử lại, và với ca trực là cả dòng thời gian lệnh đã gõ.',
    bullets: ['Xem lại từng lượt, kể cả lượt bỏ dở', 'Điểm và bảng xếp hạng theo khoá'],
  },
]

type Line = { kind: 'cmd' | 'ok' | 'head' | 'out'; text: string }

const LINES: Line[] = [
  { kind: 'cmd', text: 'docker compose up -d' },
  { kind: 'ok', text: '✔ network devforge_lab  created' },
  { kind: 'ok', text: '✔ container lab-api     started' },
  { kind: 'cmd', text: 'kubectl get pods -n lab' },
  { kind: 'head', text: 'NAME            READY   STATUS' },
  { kind: 'out', text: 'lab-api-7d9f2   1/1     Running' },
  { kind: 'out', text: 'lab-db-3c81a    1/1     Running' },
]

const lineColor: Record<Line['kind'], string> = {
  cmd: 'text-fg-strong',
  ok: 'text-success',
  head: 'text-fg-subtle',
  out: 'text-fg-muted',
}

// Stagger: each line waits for the one above it, commands a beat longer since
// they type themselves out.
const delays = LINES.reduce<number[]>((acc, _l, i) => {
  const prev = acc[i - 1] ?? 0
  acc.push(i === 0 ? 0.25 : prev + (LINES[i - 1].kind === 'cmd' ? 0.75 : 0.3))
  return acc
}, [])

function Terminal() {
  return (
    <div className="hero-stage">
      <span className="hero-blob hero-blob-a" aria-hidden="true" />
      <span className="hero-blob hero-blob-b" aria-hidden="true" />
      <div className="hero-term">
        <div className="hero-term-bar">
          <span className="term-dot bg-red-400" />
          <span className="term-dot bg-amber-400" />
          <span className="term-dot bg-emerald-400" />
          <span className="ml-2 font-mono text-xs text-fg-muted">
            devforge@lab: ~
          </span>
        </div>
        <div className="hero-body">
          {LINES.map((l, i) => (
            <div
              key={l.text}
              className={'hero-line ' + lineColor[l.kind]}
              style={{ animationDelay: `${delays[i]}s` }}
            >
              {l.kind === 'cmd' && <span className="text-accent-soft">$ </span>}
              {l.kind === 'cmd' ? (
                <span
                  className="hero-type"
                  style={{ '--ch': `${l.text.length}ch` } as CSSProperties}
                >
                  {l.text}
                </span>
              ) : (
                l.text
              )}
            </div>
          ))}
          <div
            className="hero-line text-fg-strong"
            style={{ animationDelay: `${delays[delays.length - 1] + 0.4}s` }}
          >
            <span className="text-accent-soft">
              $ <span className="term-caret" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    // Fills the first screen so the rest of the page starts below the fold.
    // 6.5rem is the sticky header plus <main>'s top padding; svh rather than
    // dvh so a mobile toolbar collapsing doesn't resize the hero mid-scroll.
    <section className="grid min-h-[calc(100svh-6.5rem)] items-center gap-12 py-8 md:grid-cols-2">
      <div className="space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
          <span className="term-dot bg-emerald-400" />
          Lab container thật, chạy trong trình duyệt
        </span>
        <h1 className="text-4xl font-bold leading-tight text-fg-strong md:text-5xl">
          Làm chủ quy trình{' '}
          {/* Gradient runs accent → accent-hover so it stays legible in both
              themes instead of washing out on white. */}
          <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
            DevOps &amp; Cloud-Native
          </span>
        </h1>
        <p className="text-lg text-fg-muted">
          Học DevOps qua lab thực hành. Mỗi bài lab cấp cho bạn một container Linux
          thật, truy cập qua terminal ngay trong trình duyệt.
        </p>
        <ul className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
          {chips.map((c) => (
            <li key={c} className="flex items-center gap-2 text-sm text-fg">
              <span className="font-mono text-accent-soft" aria-hidden="true">
                ✓
              </span>
              {c}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/courses"
            className="rounded-md bg-accent px-5 py-2.5 font-medium text-accent-fg shadow-lg shadow-accent/25 transition hover:bg-accent-hover"
          >
            Khám phá khoá học
          </Link>
          {/* Nút thứ hai trỏ vào War Room chứ không phải một mỏ neo cuộn xuống:
              thứ đáng thử ngay của trang này là một thử thách vào thẳng được,
              không phải một mục giải thích. */}
          <Link
            to="/war-room"
            className="rounded-md border border-border-strong px-5 py-2.5 font-medium text-fg transition hover:border-accent hover:text-accent-soft"
          >
            Thử một ca trực →
          </Link>
          <a
            href="#tinh-nang"
            className="self-center text-sm text-fg-muted underline-offset-4 transition hover:text-accent-soft hover:underline"
          >
            Xem có gì ↓
          </a>
        </div>
      </div>
      <Terminal />
    </section>
  )
}

function Features() {
  return (
    <Section
      id="tinh-nang"
      title="Có gì trong DevForge"
      subtitle="Bốn cách học, dùng chung một hạ tầng container."
    >
      {/* Ba cột, và thẻ nổi bật chiếm trọn hàng đầu: bốn thẻ chia ba cột thì
          hàng dưới lẻ một ô trống. Cách này vừa lấp kín vừa cho War Room đúng
          chỗ nó đáng được nhìn trước. */}
      <div className="reveal-stagger grid gap-5 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.to}
            to={f.to}
            className={
              'group flex flex-col rounded-xl border bg-surface p-6 transition hover:shadow-lg ' +
              (f.highlight
                ? 'border-accent/50 shadow-lg shadow-accent/10 hover:border-accent hover:shadow-accent/20 lg:col-span-3'
                : 'border-border hover:border-accent hover:shadow-accent/10')
            }
          >
            {/* Mũi tên bám hàng tiêu đề, không bám đáy thẻ: các thẻ có số
                gạch đầu dòng khác nhau nên đáy của chúng không bao giờ ngang
                nhau, và một hàng chữ "xem thêm" ở bốn độ cao khác nhau đọc ra
                là lệch chứ không ra bốn lối vào. */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-fg-strong">{f.title}</h3>
              <span className="flex shrink-0 items-center gap-2">
                {f.highlight && (
                  <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-medium text-accent-soft">
                    mới
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="text-accent-soft transition group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </div>
            <p className={'mt-2 text-sm text-fg-muted' + (f.highlight ? ' max-w-3xl' : '')}>
              {f.body}
            </p>
            {/* Thẻ rộng thì gạch đầu dòng dàn ngang — xếp dọc trong một ô rộng
                cả màn hình để lại một mảng trống bên phải. */}
            <ul
              className={
                'mt-4 gap-x-8 gap-y-1.5 text-sm text-fg-muted ' +
                (f.highlight ? 'grid sm:grid-cols-3' : 'space-y-1.5')
              }
            >
              {f.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="font-mono text-accent-soft" aria-hidden="true">
                    ›
                  </span>
                  <span className="min-w-0">{b}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </Section>
  )
}

function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="reveal scroll-mt-24 space-y-6 border-t border-border pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg-strong">{title}</h2>
          {subtitle && <p className="mt-1 text-fg-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

const STEPS = [
  {
    title: 'Chọn lab',
    body: 'Mỗi khoá gồm nhiều lab ngắn, xếp theo thứ tự từ nền tảng tới nâng cao.',
  },
  {
    title: 'Container khởi tạo',
    body: 'Hệ thống cấp một container Linux riêng cho bạn, kèm sẵn công cụ cần cho bài.',
  },
  {
    title: 'Làm và nộp task',
    body: 'Gõ lệnh trực tiếp trong terminal trình duyệt, hoàn thành từng task để lấy điểm.',
  },
]

const TOPICS = [
  {
    dir: 'linux-shell/',
    body: 'Quản lý tiến trình, quyền, systemd, viết script bash.',
    cmd: 'systemctl status nginx',
  },
  {
    dir: 'git/',
    body: 'Branch, rebase, giải quyết conflict, quy trình pull request.',
    cmd: 'git rebase -i main',
  },
  {
    dir: 'docker/',
    body: 'Viết Dockerfile, multi-stage build, compose nhiều service.',
    cmd: 'docker build -t api .',
  },
  {
    dir: 'kubernetes/',
    body: 'Pod, Deployment, Service, ConfigMap và debug cụm.',
    cmd: 'kubectl rollout status',
  },
  {
    dir: 'ci-cd/',
    body: 'Pipeline build, test, deploy tự động; quản lý secret.',
    cmd: 'gh workflow run deploy',
  },
  {
    dir: 'observability/',
    body: 'Log, metric, health check và xử lý sự cố khi chạy thật.',
    cmd: 'journalctl -u api -f',
  },
]

const FAQ = [
  {
    q: 'Tôi có cần cài gì trên máy không?',
    a: 'Không. Lab chạy trong container trên server, bạn thao tác qua terminal ngay trong trình duyệt. Chỉ cần trình duyệt và mạng.',
  },
  {
    q: 'Chưa biết gì về Linux thì bắt đầu ở đâu?',
    a: 'Chọn khoá gắn nhãn "Cơ bản". Các lab đầu đi từ lệnh nền tảng, không giả định kiến thức trước.',
  },
  {
    q: 'Lab có bị mất khi tôi đóng tab không?',
    a: 'Tiến độ task được lưu theo tài khoản. Container là môi trường tạm, khởi tạo lại khi bạn quay lại lab.',
  },
  {
    q: 'Có cần tài khoản để xem khoá học không?',
    a: 'Không, danh sách khoá học xem tự do. Đăng ký tài khoản khi bạn muốn ghi danh và lưu tiến độ.',
  },
  {
    q: 'War Room khác lab thường ở chỗ nào?',
    a: 'Lab thường là làm cho xong một việc. War Room là cứu một hệ thống đã hỏng sẵn, trong một khoảng thời gian cố định, và không ai nói cho bạn biết hỏng ở đâu — mò ra nguyên nhân chính là bài học. Không cần đăng ký khoá nào, vào thẳng từ thanh trên.',
  },
  {
    q: 'Mô phỏng có phải máy thật không?',
    a: 'Không, và nó không giả vờ là thật. Pipeline CI/CD, lệnh Linux hay thuật toán tìm kiếm ở đó chạy bằng mô hình, số giây là do tác giả kịch bản đặt ra. Thứ đáng học là luật và tỉ lệ — cái nào nhanh hơn cái nào và vì sao — chứ không phải con số tuyệt đối.',
  },
]

// Same query key as /courses, so navigating between the two reuses the cache.
function useCourses() {
  return useQuery({ queryKey: ['courses', {}], queryFn: () => coursesApi.list() })
}

/** Counted from the real course list — no invented numbers. */
function Stats() {
  const { data } = useCourses()
  if (!data || data.length === 0) return null

  const labs = data.reduce((n, c) => n + c.lab_count, 0)
  const students = data.reduce((n, c) => n + c.student_count, 0)
  const cells = [
    { n: data.length, label: 'khoá học' },
    { n: labs, label: 'bài lab' },
    // Hidden until there is at least one — an empty platform should not say "0".
    ...(students > 0 ? [{ n: students, label: 'lượt ghi danh' }] : []),
    { n: TOPICS.length, label: 'chủ đề' },
  ]

  // Same terminal framing as the hero, but themed rather than always dark —
  // it sits inline with the page instead of on top of the glow.
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
        <span className="term-dot bg-red-400" />
        <span className="term-dot bg-amber-400" />
        <span className="term-dot bg-emerald-400" />
        <span className="ml-2 font-mono text-xs text-fg-muted">
          devforge --stats
        </span>
      </div>
      <div className="overflow-x-auto px-4 py-4 font-mono text-sm">
        <div className="text-fg">
          <span className="text-success">$</span> cat content-overview.txt
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-2 pl-4">
          {cells.map((c) => (
            <div key={c.label} className="flex gap-2">
              <dt className="font-semibold text-accent-soft">{c.n}</dt>
              <dd className="text-fg">{c.label}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 text-success">
          $ <span className="term-caret" />
        </div>
      </div>
    </div>
  )
}

/** Counts come from /api/levels, so an empty level still renders with 0. */
function Levels() {
  const { levels } = useLevels()
  if (levels.length === 0) return null

  return (
    <Section title="Chọn theo trình độ" subtitle="Vào thẳng mức phù hợp với bạn.">
      {/* flex-1 instead of a fixed 3-column grid: with only two levels the
          cards stretch to fill the row rather than leaving a hole. */}
      <div className="reveal-stagger flex flex-wrap gap-4">
        {levels.map((l) => (
          <Link
            key={l.slug}
            to={`/courses?level=${l.slug}`}
            className="group relative flex min-w-64 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10"
          >
            <span className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
            <div className="flex items-center justify-between">
              <LevelMeter level={l.slug} />
              <span className="font-mono text-xs text-fg-subtle">
                {l.course_count} khoá
              </span>
            </div>
            <span className="mt-3 text-lg font-semibold text-fg-strong group-hover:text-accent-soft">
              {l.label}
            </span>
            <span className="mt-1 text-sm text-fg-muted">{l.hint}</span>
            <span className="mt-4 font-mono text-xs text-accent-soft">
              xem khoá học{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

function FeaturedCourses() {
  const { data, isLoading, isError } = useCourses()
  // Newest first, mirroring the "Latest content" rail on devops-daily.
  const featured = data
    ?.slice()
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, 3)

  return (
    <Section
      title="Khoá học mới nhất"
      subtitle="Bắt đầu từ một lộ trình có sẵn."
      action={
        <Link to="/courses" className="text-sm text-accent-soft hover:underline">
          Xem tất cả →
        </Link>
      }
    >
      {isLoading && <p className="text-fg-subtle">Đang tải…</p>}
      {isError && <p className="text-danger">Không tải được danh sách khoá học.</p>}
      {featured && featured.length === 0 && (
        <p className="text-fg-subtle">Chưa có khoá học nào được xuất bản.</p>
      )}
      <div className="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured?.map((c) => (
          <CourseCard key={c.id} c={c} />
        ))}
      </div>
    </Section>
  )
}

export default function Home() {
  return (
    <div className="space-y-12">
      <Hero />
      <Stats />
      {/* Ngay dưới hero: người vào lần đầu phải biết trang này làm được gì
          trước khi được hỏi "ba bước hoạt động thế nào". */}
      <Features />

      <Section
        id="how"
        title="Cách hoạt động"
        subtitle="Ba bước, không cài đặt gì trên máy."
      >
        <div className="reveal-stagger grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition hover:border-accent hover:shadow-lg hover:shadow-accent/10"
            >
              {/* Oversized ghost numeral fills what was dead space in the card. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-2 font-mono text-3xl font-bold text-accent/15"
              >
                {i + 1}
              </span>
              <h3 className="font-semibold text-fg-strong">
                <span className="font-mono text-accent-soft">0{i + 1}</span>{' '}
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-fg-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Levels />
      <FeaturedCourses />

      <Section title="Chủ đề bạn sẽ học" subtitle="Nội dung bám theo việc làm thật.">
        {/* One terminal listing instead of six flat boxes — same framing as the
            stats block, and directory names read better than card headings. */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
            <span className="term-dot bg-red-400" />
            <span className="term-dot bg-amber-400" />
            <span className="term-dot bg-emerald-400" />
            <span className="ml-2 font-mono text-xs text-fg-muted">
              devforge@lab: ~/topics
            </span>
          </div>
          <div className="overflow-x-auto px-4 py-4 text-sm">
            <div className="font-mono text-fg">
              <span className="text-success">$</span> ls -1 ~/topics
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(9rem,auto)_1fr]">
              {TOPICS.map((t) => (
                <Fragment key={t.dir}>
                  <dt className="font-mono text-accent-soft">{t.dir}</dt>
                  <dd className="text-fg-muted sm:mt-0">
                    {t.body}{' '}
                    <span className="hidden font-mono text-xs text-fg-subtle lg:inline">
                      # {t.cmd}
                    </span>
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div className="mt-4 font-mono text-success">
              $ <span className="term-caret" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Câu hỏi thường gặp">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {FAQ.map((f) => (
            // ponytail: native <details>, no accordion state or library needed
            <details key={f.q} className="group open:bg-muted/40">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-5 font-medium text-fg-strong transition hover:text-accent-soft">
                <span
                  className="font-mono text-accent-soft"
                  aria-hidden="true"
                >
                  ?
                </span>
                <span className="flex-1">{f.q}</span>
                <span className="text-lg leading-none text-fg-subtle transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 pl-11 text-sm text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="reveal relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="absolute -top-24 left-1/2 -z-10 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
        />
        <p className="font-mono text-xs text-fg-subtle">// bắt đầu</p>
        <h2 className="mt-2 text-2xl font-bold text-fg-strong sm:text-3xl">
          Sẵn sàng mở terminal đầu tiên?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-fg-muted">
          Tạo tài khoản để ghi danh khoá học và lưu tiến độ từng lab.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="rounded-md bg-accent px-5 py-2.5 font-medium text-accent-fg shadow-lg shadow-accent/25 transition hover:bg-accent-hover"
          >
            Đăng ký miễn phí
          </Link>
          <Link
            to="/courses"
            className="rounded-md border border-border-strong px-5 py-2.5 font-medium text-fg transition hover:border-accent hover:text-accent-soft"
          >
            Xem khoá học
          </Link>
        </div>
      </section>
    </div>
  )
}
