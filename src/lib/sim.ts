// Tương đối, không alias `@/`: file này bị `sim.check.ts` kéo vào project node
// (`module: nodenext`), nơi alias không có đuôi `.ts` nên không phân giải được.
import type { SimScenario } from './types.ts'

/** Khung ban đầu cho ô soạn chưa có gì: một job hợp lệ dùng đúng một step. Ô
 *  trống thì lượt Run đầu tiên chỉ trả về "pipeline đang trống", và bài học đầu
 *  tiên thành cú pháp YAML.
 *
 *  Step nào thì lấy từ **ví dụ đầu tiên của tác giả**, không phải theo bảng chữ
 *  cái. Tác giả viết ví dụ đó để mở màn, nên step mở màn của nó là step hợp lý
 *  để bắt đầu; sắp theo chữ cái thì một bộ có `build` và `checkout` sẽ ra
 *  `steps: [build]` — build trước khi lấy code, vô nghĩa ngay dòng đầu.
 *
 *  Không có ví dụ nào thì quay về thứ tự chữ cái: vẫn là một pipeline chạy được,
 *  chỉ không chắc đẹp. */
export function starterPipeline(scenario: SimScenario): string {
  const names = Object.keys(scenario.catalog)
  const first =
    scenario.examples?.[0]?.pipeline.match(/steps:\s*\[\s*([\w.-]+)/)?.[1] ??
    names.sort()[0] ??
    'checkout'
  // Ví dụ có thể trỏ tới step đã bị xoá khỏi catalog — kịch bản tự dựng sửa được
  // cả hai nửa, và một pipeline khởi đầu không parse được là nút Chạy hỏng sẵn.
  const safe = names.includes(first) ? first : (names.sort()[0] ?? 'checkout')
  return `jobs:\n  build:\n    steps: [${safe}]\n`
}

/** Kết quả của một lần bấm vào step trong bảng catalog: văn bản mới và chỗ con
 *  trỏ nhảy tới. `null` nghĩa là không tìm được chỗ nào để chèn — gọi xong không
 *  đổi gì cả. */
export type StepAdded = { text: string; caret: number }

/** Dòng `steps: [a, b]`. Chỉ nhận dạng viết một dòng, vì đó là dạng mọi mẫu và
 *  cả phần hướng dẫn dùng. Dạng khối (`- checkout` xuống dòng) parse được ở
 *  server nhưng không chèn được bằng một biểu thức, và người viết được dạng đó
 *  không cần cái nút này.
 *
 *  ponytail: dạng khối thì nút im lặng không làm gì. Đổi khi nào mẫu nào đó viết
 *  bằng dạng khối. */
const STEPS_LINE = /^(\s*steps:\s*\[)([^\]]*)(\].*)$/

/** Chèn tên một step vào danh sách `steps` gần con trỏ nhất.
 *
 *  "Gần nhất" đếm bằng số dòng, và khi trên với dưới bằng nhau thì lấy **dưới**.
 *  Cái đuôi đó không phải chi tiết vặt: con trỏ hay nằm ở dòng tên job, mà dòng
 *  `steps` của job đó nằm ngay dưới còn dòng `steps` của job trước nằm ngay trên.
 *  Ưu tiên trên là chèn vào nhầm job — đúng cú bấm mà sai chỗ, kiểu sai người
 *  dùng phải tự nhìn ra.
 *
 *  Không dò cấu trúc YAML để biết con trỏ thuộc job nào. Cách đó đúng hơn và cần
 *  một parser trong trình duyệt cho một cái nút; luật khoảng cách này trả lời
 *  đúng cho mọi hình dạng mà mấy mẫu và phần hướng dẫn dạy.
 *  ponytail: đổi khi nào có mẫu mà luật khoảng cách chọn nhầm.
 *
 *  Step trùng vẫn chèn. Chạy cùng một việc hai lần là chuyện pipeline thật có
 *  thật, và một cái nút tự ý bỏ qua cú bấm dạy sai hơn là một dòng thừa nhìn
 *  thấy được.
 */
export function addStep(text: string, caret: number, step: string): StepAdded | null {
  const lines = text.split('\n')

  // Dòng chứa con trỏ, tính theo số ký tự đã đi qua.
  let at = 0
  let cursorLine = 0
  for (let i = 0; i < lines.length; i++) {
    // +1 cho ký tự xuống dòng.
    const end = at + lines[i].length
    if (caret <= end) {
      cursorLine = i
      break
    }
    at = end + 1
    cursorLine = i
  }

  let target = -1
  for (let d = 0; d < lines.length; d++) {
    const below = cursorLine + d
    if (below < lines.length && STEPS_LINE.test(lines[below])) {
      target = below
      break
    }
    const above = cursorLine - d
    if (above >= 0 && STEPS_LINE.test(lines[above])) {
      target = above
      break
    }
  }
  if (target === -1) return null

  const m = lines[target].match(STEPS_LINE)
  if (!m) return null
  const [, head, inside, tail] = m
  const list = inside.trim()
  const next = list === '' ? step : `${list}, ${step}`
  lines[target] = head + next + tail

  // Con trỏ đặt ngay sau tên vừa chèn, tức là trước dấu `]`. Gõ tiếp là gõ vào
  // đúng danh sách vừa sửa chứ không phải ở đâu đó bên dưới.
  const before = lines.slice(0, target).reduce((n, line) => n + line.length + 1, 0)
  return { text: lines.join('\n'), caret: before + head.length + next.length }
}

/** Bề rộng một nấc thụt. YAML dùng khoảng trắng, không dùng tab thật — chèn ký
 *  tự tab vào file YAML là cách chắc chắn nhất để nó không parse được. */
export const INDENT = '  '

/** Kết quả của một lần bấm Tab trong ô soạn: văn bản mới và chỗ con trỏ phải
 *  nhảy tới. Tách khỏi component vì đây là phần duy nhất có thể sai một cách âm
 *  thầm — con trỏ lệch một ký tự thì gõ tiếp là hỏng, mà nhìn thì không thấy. */
export type Indented = { text: string; start: number; end: number }

/** Thụt vào hoặc lùi ra.
 *
 *  Không có vùng chọn thì chỉ chèn hai khoảng trắng tại con trỏ, như mọi editor.
 *  Có vùng chọn thì thụt **cả** các dòng nó chạm vào — đó là lý do người ta bôi
 *  đen nhiều dòng rồi bấm Tab, và chèn đúng hai khoảng trắng đè lên vùng chọn sẽ
 *  xoá mất phần họ vừa bôi.
 */
export function indent(
  text: string,
  start: number,
  end: number,
  outdent = false,
): Indented {
  // Con trỏ đơn, thụt vào: chèn tại chỗ và đẩy con trỏ theo.
  if (start === end && !outdent) {
    return {
      text: text.slice(0, start) + INDENT + text.slice(start),
      start: start + INDENT.length,
      end: start + INDENT.length,
    }
  }

  // Mọi trường hợp còn lại làm việc theo dòng: từ đầu dòng chứa `start` tới hết
  // dòng chứa `end`.
  const from = text.lastIndexOf('\n', start - 1) + 1
  const toNL = text.indexOf('\n', end)
  const to = toNL === -1 ? text.length : toNL

  const before = text.slice(0, from)
  const after = text.slice(to)
  let firstDelta = 0
  let totalDelta = 0

  const lines = text.slice(from, to).split('\n').map((line, i) => {
    if (!outdent) {
      // Dòng trống thì không thụt: để lại hai khoảng trắng lơ lửng ở cuối dòng.
      if (line === '') return line
      if (i === 0) firstDelta = INDENT.length
      totalDelta += INDENT.length
      return INDENT + line
    }
    const cut = line.startsWith(INDENT) ? INDENT.length : line.startsWith(' ') ? 1 : 0
    if (i === 0) firstDelta = -cut
    totalDelta -= cut
    return line.slice(cut)
  })

  return {
    text: before + lines.join('\n') + after,
    // Con trỏ đầu chỉ dịch theo dòng của chính nó; con trỏ cuối dịch theo tổng
    // của mọi dòng đã đổi.
    start: Math.max(from, start + firstDelta),
    end: Math.max(from, end + totalDelta),
  }
}
