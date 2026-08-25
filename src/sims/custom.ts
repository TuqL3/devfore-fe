import type { SimEntry, SimScenario } from '@/lib/types'

/** Slug của mô phỏng người dùng tự dựng. Cố định, một cái duy nhất: đặt tên,
 *  liệt kê và xoá nhiều bản là một CRUD nhỏ trong localStorage, và chưa ai cần
 *  cái thứ hai. */
export const CUSTOM_SLUG = 'custom'

const storageKey = `sim-catalog:${CUSTOM_SLUG}`

/** Bộ step khởi đầu.
 *
 *  Không để trống. Catalog rỗng thì nút Chạy không chạy được và ô soạn không có
 *  gì để gợi ý — trang chết ngay lần mở đầu tiên, kể cả khi máy chủ chưa bật AI.
 *  Bốn step này đủ để một pipeline chạy ra hai con số khác nhau, và đủ nhàm để
 *  không ai nhầm nó với một bài học.
 *
 *  `install` đắt và cache được, `build` tạo artifact `dist`: hai thứ đó là điều
 *  kiện để phép so sánh nào cũng hiện ra được ngay từ đầu. */
export const CustomSeed: SimScenario = {
  version: 1,
  runner_count: 2,
  cache_restore_seconds: 10,
  catalog: {
    checkout: { seconds: 5 },
    install: { seconds: 90, cacheable: 'deps' },
    test: { seconds: 120 },
    build: { seconds: 60, produces: 'dist' },
  },
  examples: [
    {
      title: '① One job does everything',
      note: 'the baseline — every step waits for the last',
      pipeline: 'jobs:\n  ci:\n    steps: [checkout, install, test, build]\n',
    },
    {
      title: '② Split in two',
      note: 'two jobs, no needs — 2 runners work at once',
      pipeline:
        'jobs:\n  test:\n    steps: [checkout, install, test]\n' +
        '  build:\n    steps: [checkout, install, build]\n',
    },
  ],
}

/** Kịch bản đang dùng: bản người dùng tự dựng, hoặc bộ khởi đầu.
 *
 *  Kiểm ba thứ trang này sẽ nổ nếu thiếu. Mọi giới hạn còn lại (trần runner, độ
 *  dài step, khoảng flaky) để server từ chối — chép luật sang đây là dựng chỗ
 *  thứ hai để hai bên lệch nhau. */
export function loadCustom(): SimScenario {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return CustomSeed
    const sc = JSON.parse(raw) as SimScenario
    if (!sc?.catalog || typeof sc.catalog !== 'object') return CustomSeed
    if (Object.keys(sc.catalog).length === 0) return CustomSeed
    if (typeof sc.runner_count !== 'number' || sc.runner_count < 1) return CustomSeed
    return sc
  } catch {
    return CustomSeed
  }
}

export function saveCustom(sc: SimScenario | null) {
  if (sc) localStorage.setItem(storageKey, JSON.stringify(sc))
  else localStorage.removeItem(storageKey)
}

/** Có phải người dùng đã sửa gì chưa, hay vẫn là bộ khởi đầu. Đọc từ chỗ lưu chứ
 *  không so hai object: so sâu hai kịch bản để trả lời một câu hỏi nhị phân là
 *  đắt hơn hẳn thứ nó đáng. */
export function isCustomised(): boolean {
  try {
    return localStorage.getItem(storageKey) !== null
  } catch {
    return false
  }
}

/** Mô phỏng của người dùng, dựng ra mỗi lần đọc vì kịch bản của nó nằm trong
 *  localStorage chứ không trong bundle. Đó là lý do nó không nằm trong mảng
 *  `SIMS` tĩnh cùng mấy cái tác giả viết.
 *
 *  **Chỉ CI/CD có cái này, và đó là kết luận chứ không phải hàng chờ làm tiếp.**
 *  Một engine đáng có chế độ tự dựng khi kịch bản của nó là *dữ liệu thuần* và
 *  bài học nằm trong *luật* chứ không trong dữ liệu. CI/CD đạt cả hai: catalog
 *  chỉ là `{step: giây}` nên AI điền được và `CheckScenario` duyệt được, còn thứ
 *  đang dạy — thứ tự, song song, cache, đường găng — không đổi dù bạn đặt tên
 *  step là gì. Engine khác trượt: bài học của mô phỏng Linux *là* mười lệnh cố
 *  định, nên một cây thư mục tự bịa không dạy thêm gì.
 *
 *  Hệ quả cho engine sau này: thiếu một trong hai điều kiện thì "tự dựng" chỉ là
 *  một ô nhập không ai dùng. Đừng thêm cho đủ bộ. */
export function customEntry(): SimEntry {
  return {
    slug: CUSTOM_SLUG,
    // Tên nói đúng phạm vi. "Mô phỏng của bạn" hứa dựng được bất cứ thứ gì,
    // trong khi engine duy nhất nhận kịch bản tự dựng là CI/CD — và đó là kết
    // luận, không phải thiếu sót tạm thời; lý do ở chú thích của hàm này.
    title: 'Your CI/CD pipeline',
    engine: 'cicd',
    // Chủ đề, không phải chế độ. `'Tự dựng'` trả lời câu "sửa được không", mà
    // cột này trả lời câu "về cái gì" — để lúc danh sách nhóm theo `category`
    // thì nó rơi đúng nhóm CI/CD, kể cả khi đang là mô phỏng CI/CD duy nhất.
    category: 'CI/CD',
    tags: ['your own'],
    scenario: loadCustom(),
    editable: true,
    description: `Your own practice ground: **the step catalog here is yours**, not the author's. Describe your system in one sentence and let the AI build the catalog, or edit the JSON directly.

It is a **CI/CD pipeline** — the only engine that accepts a scenario you build, because its scenario is plain data and the lesson lives in the job-scheduling rules rather than in the step list. The other simulations teach through their own fixed content, so there is nothing there for you to build.

One thing to remember: **the seconds here are a guess, yours or the AI's**, nobody measured them. You still learn how to schedule jobs — that is what this simulation teaches — but do not hold those numbers up against a real CI.

Everything lives in this browser. Switch machines and it is gone.`,
    guide: `Three keys, that is all: \`steps\`, \`needs\`, \`cache\`.

\`\`\`yaml
jobs:
  build:
    steps: [checkout, install, build]
    cache: [deps]
  test:
    needs: [build]
    steps: [checkout, install, test]
\`\`\`

## Four rules

1. A job with no \`needs\` starts immediately. How many run at once is capped by \`runner_count\`.
2. \`needs\` is putting yourself in a queue.
3. A step that declares \`consumes\` requires that artifact to exist: either produced by an earlier step **in the same job**, or by a job somewhere up the \`needs\` chain. A parallel branch does not count.
4. Cache **only goes warm on the next run**, and a job has to declare \`cache: [key]\` itself to get the discount.

## The starting catalog

\`checkout\` 5s · \`install\` 90s (cache \`deps\`) · \`test\` 120s · \`build\` 60s (produces \`dist\`). Enough to show that splitting jobs beats merging them. Overwrite it whenever you like — under **Edit catalog**, below the editor.`,
  }
}
