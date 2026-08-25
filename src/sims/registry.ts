import type { SimEntry } from '@/lib/types'
import { CUSTOM_SLUG, customEntry } from '@/sims/custom'
import { linuxEntry } from '@/sims/linux'
import { searchEntry } from '@/sims/search'
import { sortEntry } from '@/sims/sort'

/** Lời mở đầu trang danh sách. Một dòng chữ của cả trang, không thuộc mô phỏng
 *  nào — nên nó ở đây, cạnh danh sách nó giới thiệu. */
export const SIM_INTRO = `Some things are learned faster by poking at them than by reading about them, but building the real thing is expensive or dangerous. Here they are simulated: open one and use it — no sign-up, no grading, nothing saved.

Pick a simulator below. Each one has its own rules and a few click-to-run examples to start from.`

/** Mọi mô phỏng có kịch bản cố định, theo thứ tự hiện ra.
 *
 *  Thêm một cái: viết nội dung của nó, thêm một mục vào đây. Hết. Đó là cơ chế
 *  duy nhất cho phép danh sách này dài ra tới vài chục mà không sinh ra một hệ
 *  thống quản lý nội dung đi kèm.
 *
 *  `engine` nói ai chạy nó, và quyết định luôn cả hình dạng của mục. `'linux'`
 *  chạy hết trong trình duyệt và không mang gì; `'cicd'` chạy trên server và
 *  mang theo một `scenario` — mục `'cicd'` duy nhất là mô phỏng tự dựng, và nó
 *  không nằm ở đây vì kịch bản của nó đọc từ localStorage (xem `sims/custom.ts`,
 *  ghép vào danh sách ở `SimList`). Loại tiếp theo thêm một nhánh vào union ở
 *  `lib/types.ts` và một nhánh ở `SimPlayground` — không đụng gì ở đây. */
export const SIMS: SimEntry[] = [
  // Đứng đầu vì nó là thứ nền: ai chưa biết `cd` với `grep` thì cũng chưa đọc
  // được một dòng log của CI/CD bên dưới.
  linuxEntry,
  // Giải thuật đứng sau Linux, trước CI/CD: nó không cần biết gì về hệ điều
  // hành hay pipeline, nên là chỗ vào rẻ nhất cho người chưa quen thứ nào.
  searchEntry,
  // Sắp xếp đứng sau tìm kiếm vì nó nợ tìm kiếm một câu: ba trong bốn thuật toán
  // bên kia đòi mảng đã sắp, và "sắp thì tốn bao nhiêu" là câu hỏi bên kia cố ý
  // để lại.
  sortEntry,
]

export function findSim(slug: string): SimEntry | undefined {
  if (slug === CUSTOM_SLUG) return customEntry()
  return SIMS.find((s) => s.slug === slug)
}
