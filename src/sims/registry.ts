import type { SimEntry } from '@/lib/types'
import { NodeCi, FlakyE2e } from '@/sims/cicd'
import { CUSTOM_SLUG, customEntry } from '@/sims/custom'

/** Lời mở đầu trang danh sách. Một dòng chữ của cả trang, không thuộc mô phỏng
 *  nào — nên nó ở đây, cạnh danh sách nó giới thiệu. */
export const SIM_INTRO = `Những thứ học bằng cách nghịch thì nhanh hơn học bằng cách đọc, nhưng dựng thật thì đắt hoặc nguy hiểm. Ở đây chúng được mô phỏng: mở ra là dùng, không đăng ký gì, không chấm điểm, không lưu gì.

Chọn một mô phỏng bên dưới. Mỗi cái có bộ luật riêng và vài mẫu bấm-là-chạy để bắt đầu.`

/** Mọi mô phỏng, theo thứ tự hiện ra.
 *
 *  Thêm một cái: viết nội dung của nó, thêm một mục vào đây. Hết. Đó là cơ chế
 *  duy nhất cho phép danh sách này dài ra tới vài chục mà không sinh ra một hệ
 *  thống quản lý nội dung đi kèm.
 *
 *  `engine` nói ai chạy nó. Hôm nay chỉ có `'cicd'`; loại tiếp theo thêm giá trị
 *  mới và một nhánh ở chỗ vẽ kết quả — không đụng gì ở đây. */
export const SIMS: SimEntry[] = [
  {
    slug: "node-ci",
    title: "Node.js CI",
    engine: 'cicd',
    category: 'CI/CD',
    tags: ["checkout", "lint", "npm-ci"],
    scenario: NodeCi,
    description: `Mỗi lần bạn push code, một máy chủ tự chạy một loạt việc — lấy code, cài
thư viện, chạy test, build, đóng gói. Danh sách việc đó gọi là **pipeline**, khai
bằng một file YAML nằm ngay trong repo.

Cùng chừng ấy việc, **xếp kiểu này mất 8 phút, xếp kiểu kia mất 4**. Ở CI thật bạn
phải push rồi ngồi đợi mới biết mình xếp đúng chưa. Ở đây bấm một cái là thấy.

Bộ step dưới đây là của một dự án Node: cài, soi, test, build, đóng image. Không
có bước nào flaky — mọi thứ đỏ ở đây đều do pipeline viết ra thế.`,
    guide: `## Ba khoá, hết

\`\`\`yaml
jobs:
  build:              # tên job, bạn tự đặt
    steps: [checkout, npm-ci]
  test:
    needs: [build]    # đợi build xong mới bắt đầu
    steps: [checkout, npm-test]
    cache: [node_modules]
\`\`\`

Gõ sai tên khoá thì server báo lỗi kèm số dòng — nó không bỏ qua im lặng.

## Bốn luật quyết định mọi thứ

1. Job không có \`needs\` thì chạy ngay. Bộ này có **2 runner**, nên tối đa 2 job
   cùng lúc; job thứ 3 phải đợi.
2. \`needs\` là tự bắt mình xếp hàng. Một dòng thừa biến hai job đáng lẽ song song
   thành nối tiếp — pipeline dài gấp đôi mà không an toàn hơn chút nào.
3. \`docker-build\` cần \`dist\`, do \`npm-build\` tạo ra. Nó tìm ở hai chỗ: một step
   trước đó **trong cùng job**, hoặc một job trong chuỗi \`needs\`. Job chạy trước ở
   nhánh khác không tính — đĩa của runner đó không phải đĩa này.
4. Cache **chỉ ấm sang lượt sau**. Khai \`cache: [node_modules]\` thì lượt đang chạy
   vẫn trả đủ 90 giây cho \`npm-ci\`; bấm Chạy thêm một lượt nữa mới thấy nó rút
   xuống còn 10.

## Đọc biểu đồ

- Mỗi hàng là một job; số bên phải là runner nào và mất bao lâu.
- Hai thanh **chồng nhau theo chiều ngang** nghĩa là hai job chạy cùng lúc. Xếp
  nối nhau là nối tiếp.
- Ô trong thanh là step, rộng đúng theo số giây của nó.
- ⚡ là lấy từ cache, đỏ là hỏng, hàng xám "bỏ qua" là job không chạy vì thứ nó
  chờ đã hỏng.

> Số giây là **thời gian mô phỏng**, do tác giả kịch bản gõ ra, không đo từ CI
> thật. Thứ đáng học là tỉ lệ giữa các cách xếp job, không phải con số tuyệt đối.`,
  },
  {
    slug: "flaky-e2e",
    title: "Có bước flaky",
    engine: 'cicd',
    category: 'CI/CD',
    tags: ["e2e", "lint", "npm-ci"],
    scenario: FlakyE2e,
    description: `Giống bộ Node.js CI nhưng thêm \`e2e\` **hỏng 30% số lượt** và có **3 runner**.

Chạy đi chạy lại cùng một pipeline để thấy: có lượt xanh, có lượt đỏ, mà bạn
không sửa gì cả. Đó vừa là lý do người ta bấm retry, vừa là lý do retry không
phải cách sửa.`,
    guide: `Cú pháp giống hệt bộ Node.js CI: \`steps\`, \`needs\`, \`cache\`. Xem phần
hướng dẫn ở đó nếu chưa quen.

## Bước flaky

\`e2e\` khai \`flaky: 30\` — nó hỏng khoảng 30% số lượt, và kết quả gắn với **số
lượt**: bấm Chạy lại là một ván khác thật, không phải vẽ lại ván cũ.

Bấm chạy lại **có thể** đậu. Nhưng bạn không làm bước đó bớt hỏng, bạn chỉ tung
lại đồng xu. Hai cách sửa thật:

1. Làm bước đó hết flaky — nằm ngoài tầm của mô phỏng này.
2. **Cách ly** nó: cho \`e2e\` một nhánh riêng mà không job nào chờ, để nó đỏ mà
   không kéo theo ai.

## Thử cái này

Xếp \`lint\`, \`npm-test\` và \`e2e\` thành ba job không phụ thuộc nhau. Bộ này có 3
runner nên cả ba chạy cùng lúc — và khi \`e2e\` đỏ, hai job kia vẫn xong.

Rồi thử ngược lại: cho một job \`needs: [e2e]\`. Lúc \`e2e\` đỏ, job đó thành **bỏ
qua** — nó chưa từng chạy, không phải nó hỏng.`,
  },
]

export function findSim(slug: string): SimEntry | undefined {
  if (slug === CUSTOM_SLUG) return customEntry()
  return SIMS.find((s) => s.slug === slug)
}
