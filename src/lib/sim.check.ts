// Chạy: npm run check
//
// Con trỏ lệch một ký tự sau khi bấm Tab là kiểu hỏng không ai nhìn thấy: gõ
// tiếp mới biết, và lúc đó đã không rõ vì sao. Nên phần tính toán tách khỏi
// component và có bài kiểm riêng.
//
// ponytail: assert của node, không framework — cùng lý do với json.check.ts.
import assert from 'node:assert/strict'

import { addStep, indent, starterPipeline } from './sim.ts'
import type { StepAdded } from './sim.ts'

// Con trỏ đơn: chèn hai khoảng trắng tại chỗ, con trỏ đi theo.
assert.deepEqual(indent('jobs:', 5, 5), { text: 'jobs:  ', start: 7, end: 7 })
assert.deepEqual(indent('ab', 1, 1), { text: 'a  b', start: 3, end: 3 })

// Vùng chọn nhiều dòng: thụt CẢ hai dòng, không phải thay vùng chọn bằng khoảng
// trắng. Đây là chỗ dễ sai nhất.
{
  const src = 'a\nb\nc'
  const got = indent(src, 0, 3) // chạm dòng "a" và "b"
  assert.equal(got.text, '  a\n  b\nc')
  assert.equal(got.end, 7, 'con trỏ cuối phải dịch theo tổng số khoảng trắng đã chèn')
}

// Vùng chọn trong MỘT dòng vẫn thụt cả dòng — không nuốt mất chữ đang bôi đen.
assert.equal(indent('abc', 1, 2).text, '  abc')

// Dòng trống không được thụt: hai khoảng trắng lơ lửng ở cuối dòng.
assert.equal(indent('a\n\nb', 0, 3).text, '  a\n\n  b')

// Lùi ra: bỏ đúng một nấc, và không bao giờ ăn quá.
assert.equal(indent('    a', 0, 5, true).text, '  a')
assert.equal(indent('  a', 0, 3, true).text, 'a')
assert.equal(indent('a', 0, 1, true).text, 'a')
assert.equal(indent(' a', 0, 2, true).text, 'a', 'một khoảng trắng lẻ vẫn bỏ được')

// Con trỏ không bao giờ chạy ra trước đầu dòng khi lùi ra.
{
  const got = indent('  a', 2, 2, true)
  assert.equal(got.text, 'a')
  assert.ok(got.start >= 0 && got.start <= got.text.length)
}

// --- addStep: bấm một step trong bảng catalog là nó vào pipeline ---
//
// Cùng loại hỏng với indent: chèn nhầm dòng thì người dùng thấy ngay, nhưng chèn
// đúng dòng mà con trỏ lệch thì phải gõ tiếp mới lộ.

const TWO = ['jobs:', '  build:', '    steps: [checkout]', '  test:', '    steps: [npm-ci]', ''].join('\n')

/** `assert.ok` không thu hẹp kiểu ở đây — @types/node không có trong dự án này —
 *  nên phần "chèn được" và phần "chèn ra cái gì" tách làm hai. */
function added(text: string, caret: number, step: string): StepAdded {
  const got = addStep(text, caret, step)
  if (got === null) throw new Error(`addStep phải chèn được ${step}`)
  return got
}

// Con trỏ ở dòng tên job "test" → chèn vào steps của "test", không phải của
// "build". Dòng steps của job trước nằm ngay TRÊN con trỏ và của job này nằm ngay
// DƯỚI, nên đây là chỗ luật hoà-thì-lấy-dưới phải đúng.
{
  const got = added(TWO, TWO.indexOf('  test:') + 3, 'npm-test')
  assert.match(got.text, /steps: \[checkout\]/, 'job build không được đụng vào')
  assert.match(got.text, /steps: \[npm-ci, npm-test\]/)
  assert.equal(
    got.text.slice(got.caret, got.caret + 1),
    ']',
    'con trỏ phải nằm ngay trước dấu đóng ngoặc của danh sách vừa sửa',
  )
}

// Con trỏ ở ngay dòng `steps:` thì chèn vào chính dòng đó.
assert.match(
  added(TWO, TWO.indexOf('    steps: [npm-ci]') + 5, 'lint').text,
  /steps: \[npm-ci, lint\]/,
)

// Chưa bấm vào ô soạn bao giờ: con trỏ ở 0, không có dòng steps nào phía trên.
// Lấy dòng steps đầu tiên chứ không được im lặng bỏ qua cú bấm.
assert.match(added(TWO, 0, 'lint').text, /steps: \[checkout, lint\]/)

// Danh sách rỗng: không được đẻ ra dấu phẩy lơ lửng.
assert.equal(
  added('jobs:\n  a:\n    steps: []\n', 99, 'checkout').text,
  'jobs:\n  a:\n    steps: [checkout]\n',
)

// Step trùng vẫn chèn — chạy hai lần là chuyện thật, nút không được tự ý bỏ qua.
assert.match(added('    steps: [checkout]', 0, 'checkout').text, /\[checkout, checkout\]/)

// Không có dòng steps nào (dạng khối, hoặc ô soạn bị xoá sạch): trả null, không
// đoán bừa chỗ chèn.
assert.equal(addStep('jobs:\n  a:\n    steps:\n      - checkout\n', 0, 'lint'), null)
assert.equal(addStep('', 0, 'lint'), null)

// Con trỏ quá cuối văn bản không được làm hỏng phép tính dòng.
assert.ok(addStep(TWO, 10_000, 'lint') !== null)

// --- starterPipeline: mở màn bằng step tác giả chọn, không phải theo chữ cái ---

// Bộ có `build` và `checkout`: theo bảng chữ cái sẽ ra "build" — build trước khi
// lấy code. Ví dụ đầu của tác giả nói step mở màn là checkout.
{
  const sc = {
    version: 1,
    runner_count: 2,
    catalog: { build: { seconds: 60 }, checkout: { seconds: 5 } },
    examples: [{ title: '①', pipeline: 'jobs:\n  ci:\n    steps: [checkout, build]\n' }],
  }
  assert.equal(starterPipeline(sc), 'jobs:\n  build:\n    steps: [checkout]\n')
}

// Không có ví dụ nào: quay về thứ tự chữ cái, vẫn phải ra pipeline chạy được.
assert.equal(
  starterPipeline({
    version: 1,
    runner_count: 1,
    catalog: { build: { seconds: 60 }, checkout: { seconds: 5 } },
  }),
  'jobs:\n  build:\n    steps: [build]\n',
)

// Ví dụ trỏ tới step đã bị xoá khỏi catalog — kịch bản tự dựng sửa được cả hai
// nửa. Phải rơi về step có thật, không được đẻ ra pipeline không parse nổi.
assert.equal(
  starterPipeline({
    version: 1,
    runner_count: 1,
    catalog: { checkout: { seconds: 5 } },
    examples: [{ title: '①', pipeline: 'jobs:\n  ci:\n    steps: [đã-xoá]\n' }],
  }),
  'jobs:\n  build:\n    steps: [checkout]\n',
)

console.log('sim.check: ok')
