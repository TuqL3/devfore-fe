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
      title: '① Một job làm hết',
      note: 'mốc để so — mọi việc chờ nhau',
      pipeline: 'jobs:\n  ci:\n    steps: [checkout, install, test, build]\n',
    },
    {
      title: '② Tách đôi',
      note: 'hai job, không needs — 2 runner cùng làm',
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
 *  `SIMS` tĩnh cùng mấy cái tác giả viết. */
export function customEntry(): SimEntry {
  return {
    slug: CUSTOM_SLUG,
    title: 'Mô phỏng của bạn',
    engine: 'cicd',
    category: 'Tự dựng',
    tags: ['tự dựng'],
    scenario: loadCustom(),
    editable: true,
    description: `Sân tập của riêng bạn: **bộ step ở đây do bạn đặt ra**, không phải do tác giả
viết. Mô tả hệ thống của bạn bằng một câu để AI dựng catalog, hoặc sửa thẳng JSON.

Khác mấy mô phỏng có sẵn ở một điểm quan trọng: **số giây ở đây là bạn hoặc AI
đoán**, không ai đo cả. Vẫn học được cách xếp job — đó là thứ mô phỏng này dạy —
nhưng đừng mang con số ra so với CI thật.

Mọi thứ nằm trong trình duyệt này. Đổi máy là mất.`,
    guide: `Cú pháp giống mọi mô phỏng khác: \`steps\`, \`needs\`, \`cache\`.

\`\`\`yaml
jobs:
  build:
    steps: [checkout, install, build]
    cache: [deps]
  test:
    needs: [build]
    steps: [checkout, install, test]
\`\`\`

## Bốn luật

1. Job không có \`needs\` chạy ngay. Số job cùng lúc bị chặn bởi \`runner_count\`.
2. \`needs\` là tự bắt mình xếp hàng.
3. Step khai \`consumes\` cần artifact đó có sẵn: hoặc do step trước **trong cùng
   job** tạo, hoặc do một job trong chuỗi \`needs\`. Nhánh song song không tính.
4. Cache **chỉ ấm sang lượt sau**, và job phải tự khai \`cache: [khoá]\` mới được
   giảm.

## Bộ step khởi đầu

\`checkout\` 5s · \`install\` 90s (cache \`deps\`) · \`test\` 120s · \`build\` 60s (tạo
\`dist\`). Đủ để thấy tách job ra thì nhanh hơn gộp. Gõ đè lên nó bất cứ lúc nào —
ở phần **Sửa catalog** bên dưới ô soạn.`,
  }
}
