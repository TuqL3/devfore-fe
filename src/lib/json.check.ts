// Chạy: npm run check
//
// Ô JSON của màn admin là chỗ kịch bản mô phỏng và điều kiện chấm được nhập.
// Nhận nhầm một mảng hay giữ lại giá trị cũ khi văn bản đã hỏng đều dẫn tới một
// kết cục: tác giả bấm Lưu, màn hình nói xong, và thứ được lưu không phải thứ
// trên màn hình. Đó là lý do nhánh này có bài kiểm riêng.
//
// ponytail: assert của node, không framework — dự án này chưa có test runner
// nào, và thêm một cái cho một hàm thuần là cái giá lớn hơn thứ nó bảo vệ.
import assert from 'node:assert/strict'

import { parseJsonObject } from './json.ts'

// Ô trống là ý định hợp lệ: lab không có kịch bản, nhiệm vụ chưa viết goal.
assert.deepEqual(parseJsonObject(''), { value: null, error: '' })
assert.deepEqual(parseJsonObject('   \n  '), { value: null, error: '' })

// Object hợp lệ đi lên nguyên vẹn.
assert.deepEqual(parseJsonObject('{"version":1,"catalog":{"checkout":{"seconds":5}}}'), {
  value: { version: 1, catalog: { checkout: { seconds: 5 } } },
  error: '',
})

// Ba thứ server sẽ từ chối, phải bị chặn ngay tại ô — và quan trọng hơn: phải
// trả `value: null`, không phải giữ lại giá trị hợp lệ lần trước.
for (const bad of ['[1,2,3]', '"chuoi"', '42', 'null', '{"a":', 'khong-phai-json']) {
  const got = parseJsonObject(bad)
  assert.equal(got.value, null, `phải từ chối: ${bad}`)
  assert.notEqual(got.error, '', `phải báo lỗi: ${bad}`)
}

console.log('json.check: ok')
