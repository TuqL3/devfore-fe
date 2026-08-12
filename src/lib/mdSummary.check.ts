// Chạy: npm run check
//
// Hỏng ở đây không đỏ ở đâu cả — nó chỉ làm thẻ trong danh sách hiện một dòng
// rác: nửa khối lệnh, hoặc đúng cái tiêu đề vừa in ngay bên trên, hoặc một câu
// đứt giữa từ.
//
// ponytail: assert của node, không framework — cùng lý do với json.check.ts.
import assert from 'node:assert/strict'
import { mdSummary } from './mdSummary.ts'

// Tiêu đề bị bỏ qua, lấy đoạn văn đầu tiên.
assert.equal(
  mdSummary('# Ca trực đầu tiên\n\n**23:41.** Điện thoại rung.\n'),
  '23:41. Điện thoại rung.',
)

// Nhiều dòng liền nhau là một đoạn; đoạn thứ hai không lấy.
assert.equal(
  mdSummary('Dòng một\ndòng hai\n\nĐoạn sau không lấy.'),
  'Dòng một dòng hai',
)

// Khối lệnh không được lọt vào tóm tắt, kể cả khi nó đứng trước đoạn văn.
assert.equal(
  mdSummary('```sh\nhttpd -p 8080\n```\n\nDịch vụ web chạy ở cổng 8080.'),
  'Dịch vụ web chạy ở cổng 8080.',
)

// Dấu inline bị bóc, chữ giữ nguyên.
assert.equal(
  mdSummary('Xem `curl -i` và [tài liệu](https://x.dev) rồi **sửa**.'),
  'Xem curl -i và tài liệu rồi sửa.',
)

// Trích dẫn và gạch ngang không phải câu mở đầu.
assert.equal(mdSummary('> ghi chú\n\n---\n\nCâu thật.'), 'Câu thật.')

// Cắt ở ranh giới từ, có dấu ba chấm.
const long = mdSummary('một hai ba bốn năm sáu bảy tám chín mười', 20)
assert.ok(long.endsWith('…'), `phải kết bằng dấu ba chấm: ${long}`)
assert.ok(long.length <= 21, `dài quá mức: ${long}`)
assert.ok(!long.includes('mư'), `cắt giữa từ: ${long}`)

// Không có gì để tóm tắt thì trả chuỗi rỗng, không phải "undefined".
assert.equal(mdSummary(''), '')
assert.equal(mdSummary('# Chỉ có tiêu đề'), '')

console.log('mdSummary.check: ok')
