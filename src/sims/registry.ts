import type { SimEntry } from '@/lib/types'
import { CUSTOM_SLUG, customEntry } from '@/sims/custom'
import { linuxEntry } from '@/sims/linux'
import { searchEntry } from '@/sims/search'

/** Lời mở đầu trang danh sách. Một dòng chữ của cả trang, không thuộc mô phỏng
 *  nào — nên nó ở đây, cạnh danh sách nó giới thiệu. */
export const SIM_INTRO = `Những thứ học bằng cách nghịch thì nhanh hơn học bằng cách đọc, nhưng dựng thật thì đắt hoặc nguy hiểm. Ở đây chúng được mô phỏng: mở ra là dùng, không đăng ký gì, không chấm điểm, không lưu gì.

Chọn một mô phỏng bên dưới. Mỗi cái có bộ luật riêng và vài mẫu bấm-là-chạy để bắt đầu.`

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
]

export function findSim(slug: string): SimEntry | undefined {
  if (slug === CUSTOM_SLUG) return customEntry()
  return SIMS.find((s) => s.slug === slug)
}
