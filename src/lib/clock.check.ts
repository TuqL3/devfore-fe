// Chạy: npm run check
//
// Hàm này viết ra hai con số người ta đọc như sự thật: MTTR của một ca trực, và
// "phút thứ mấy bạn mới nhìn đúng chỗ" ở từng dòng lịch sử lệnh. Sai một nhánh
// thì không có gì đỏ — chỉ là 3661 giây hiện thành 01:01 và không ai nhận ra
// mất một tiếng.
//
// ponytail: assert của node, không framework — cùng lý do với json.check.ts.
import assert from 'node:assert/strict'
import { clockLabel } from './clock.ts'

assert.equal(clockLabel(0), '00:00')
assert.equal(clockLabel(59), '00:59')
assert.equal(clockLabel(400), '06:40')
// Đúng mốc một giờ là chỗ nhánh đổi: dưới nó là mm:ss, từ nó trở đi phải có giờ.
assert.equal(clockLabel(3599), '59:59')
assert.equal(clockLabel(3600), '1:00:00')
assert.equal(clockLabel(3661), '1:01:01')
// Lệch đồng hồ trong container có thể cho ra một mốc trước lúc phiên bắt đầu.
// Kẹp về 0 chứ không in số âm: "-01:30" đọc ra là lỗi của bài, không phải của
// đồng hồ.
assert.equal(clockLabel(-90), '00:00')
// Giây lẻ làm tròn, không cắt: 1.6 giây là 2 giây.
assert.equal(clockLabel(1.6), '00:02')

console.log('clock.check: ok')
