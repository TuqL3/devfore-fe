// Chạy: npm run check
//
// Bốn thuật toán phải cho **cùng một mảng đã sắp**, từ cả bốn thế mở đầu. Cả mô
// phỏng này dựa vào đúng chỗ đó: nếu chúng ra kết quả khác nhau thì bảng điểm hai
// cột kia đang so hai việc khác nhau chứ không phải một việc làm theo bốn cách.
// Lệch một chỉ số ở thuật toán nhanh là kiểu sai nhìn không ra — vẫn trả về một
// mảng, vẫn vẽ ra một hình đẹp, chỉ có hai ô đứng nhầm chỗ.
//
// Nhóm bất biến thứ hai là của phần vẽ: khung nào khai "đang so hai ô này" thì
// hai ô đó phải nằm trong đoạn đang xét, và ô nào khai "đã chốt" thì phải đang
// giữ đúng giá trị cuối cùng của nó. Sai chỗ đó là mô phỏng tô xanh một ô sẽ còn
// bị đẩy đi chỗ khác — vẫn chạy, vẫn đẹp, dạy sai.
//
// ponytail: assert của node, không framework — cùng lý do với search.check.ts.
import assert from 'node:assert/strict'

import { ALGOS, DEFAULT_LAYOUT, LAYOUTS, N, layoutOf, scoreboard } from './algos.ts'

// ── Bốn thế mở đầu ─────────────────────────────────────────────────────────

const inversions = (a: number[]) => {
  let k = 0
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) k++
  return k
}
const MAX_INV = (N * (N - 1)) / 2

for (const l of LAYOUTS) {
  const a = l.make()
  assert.equal(a.length, N, `${l.id}: phải có ${N} ô`)
  assert.deepEqual(
    [...a].sort((x, y) => x - y),
    Array.from({ length: N }, (_, i) => i + 1),
    `${l.id}: phải là hoán vị của 1..${N} — cột cao bằng nhau thì không nhìn ra ô nào đi đâu`,
  )
  // Hai lần gọi phải ra cùng một mảng. `Math.random` lọt vào đây là bảng điểm
  // trong phần hướng dẫn sai ngay lần tải trang sau.
  assert.deepEqual(l.make(), a, `${l.id}: không tất định`)
}

assert.equal(inversions(layoutOf('da-sap').make()), 0)
assert.equal(inversions(layoutOf('dao-nguoc').make()), MAX_INV)
assert.equal(
  inversions(layoutOf('gan-sap').make()),
  3,
  'gần sắp phải đúng ba chỗ hỏng — nhiều hơn thì chèn hết "gần như chạy không"',
)
{
  // Thế ngẫu nhiên phải thật sự lộn xộn. Trộn ra một mảng gần sắp là mất luôn
  // trường hợp trung bình, và bốn dòng bảng điểm xích lại gần nhau hết.
  const inv = inversions(layoutOf('ngau-nhien').make())
  assert.ok(
    inv > MAX_INV * 0.3 && inv < MAX_INV * 0.7,
    `thế ngẫu nhiên có ${inv}/${MAX_INV} cặp nghịch — quá gần một đầu, trộn lại đi`,
  )
}

assert.ok(LAYOUTS.some((l) => l.id === DEFAULT_LAYOUT))

// ── Cả bốn phải sắp đúng, từ cả bốn thế ────────────────────────────────────

const want = Array.from({ length: N }, (_, i) => i + 1)

for (const layout of LAYOUTS) {
  const input = layout.make()
  for (const a of ALGOS) {
    const where = `${a.cmd} từ thế "${layout.name}"`
    const t = a.run(input)
    const last = t.frames[t.frames.length - 1]

    assert.ok(t.frames.length > 0, `${where}: không có khung nào`)
    assert.deepEqual(last.a, want, `${where}: mảng cuối chưa sắp xong`)
    assert.deepEqual(input, layout.make(), `${where}: đã sửa vào mảng gốc của người gọi`)
    assert.equal(last.done.length, N, `${where}: kết thúc mà còn ô chưa chốt`)

    // Trần chống vòng lặp vô hạn: O(n²) phép so là chặn trên thật của cả bốn,
    // và mỗi phép so kéo theo nhiều nhất vài dòng code.
    assert.ok(t.comparisons <= N * N, `${where}: ${t.comparisons} phép so, quá nhiều`)
    assert.ok(t.frames.length <= N * N * 6, `${where}: ${t.frames.length} khung, quá nhiều`)
    assert.equal(t.comparisons, last.cmpSoFar, `${where}: bộ đếm phép so lệch với khung cuối`)
    assert.equal(t.writes, last.writeSoFar, `${where}: bộ đếm lần ghi lệch với khung cuối`)

    let cmpSeen = 0
    let writeSeen = 0
    for (const f of t.frames) {
      cmpSeen += f.cmp ? 1 : 0
      writeSeen += f.wrote.length
      const at = `${where}, khung dòng ${f.line}`

      assert.ok(
        f.line >= 1 && f.line <= a.code.length,
        `${at}: không có dòng đó trong ${a.file} (${a.code.length} dòng)`,
      )
      assert.equal(f.a.length, N, `${at}: ảnh chụp mảng sai kích thước`)
      assert.equal(f.cmpSoFar, cmpSeen, `${at}: số phép so cộng dồn lệch`)
      assert.equal(f.writeSoFar, writeSeen, `${at}: số lần ghi cộng dồn lệch`)

      // Đoạn RỖNG được phép — `lo = hi + 1` là trạng thái thật khi không còn gì
      // để xét. Rỗng quá một ô thì là lỗi tính, không phải trạng thái.
      assert.ok(f.lo <= f.hi + 1, `${at}: đoạn [${f.lo}..${f.hi}] rỗng quá một ô`)
      assert.ok(
        f.lo >= 0 && f.lo <= N && f.hi >= -1 && f.hi < N,
        `${at}: đoạn [${f.lo}..${f.hi}] ra ngoài mảng`,
      )

      for (const i of f.cmp ?? []) {
        assert.ok(
          i >= f.lo && i <= f.hi,
          `${at}: ô đang so (${i}) nằm ngoài đoạn [${f.lo}..${f.hi}] — chỗ vẽ sẽ tô ` +
            'sáng một ô ở trong vùng đã mờ, nhìn ra ngay là lỗi',
        )
      }
      for (const i of f.wrote) {
        assert.ok(i >= f.lo && i <= f.hi, `${at}: ghi vào ô ${i} ngoài đoạn đang xét`)
      }
      if (f.pivot !== null) {
        assert.ok(f.pivot >= f.lo && f.pivot <= f.hi, `${at}: chốt ${f.pivot} ngoài đoạn`)
      }

      // Ô đã chốt phải đang giữ đúng giá trị cuối cùng của nó. Đây là chỗ canh
      // nghiêm nhất của cả file: `done` là thứ được tô xanh, và tô xanh một ô còn
      // bị đẩy đi nữa là dạy sai — mà mắt thường không bắt được, vì mảng vẫn sắp
      // xong đúng ở khung cuối.
      for (const i of f.done) {
        assert.equal(f.a[i], want[i], `${at}: ô ${i} khai đã chốt nhưng giá trị còn sai`)
      }
      // Và đã chốt thì không được ghi đè nữa.
      for (const i of f.wrote) {
        assert.ok(!f.done.includes(i), `${at}: ghi vào ô ${i} đã khai là chốt`)
      }
    }
  }
}

// ── Mỗi thuật toán phải giữ đúng lời hứa của nó ────────────────────────────
//
// Mấy con số trong phần bài học phải đúng, không phải nói cho hay.

const runOn = (layoutId: string) => {
  const data = layoutOf(layoutId).make()
  const rows = scoreboard(data)
  const by = (no: string) => rows.find((r) => r.no === no)!
  return { bubble: by('01'), insert: by('02'), select: by('03'), quick: by('04') }
}

const ALL_PAIRS = (N * (N - 1)) / 2

{
  // Chọn: số phép so là hằng số, ở MỌI thế mở đầu. Đó là cả bài học của nó, và
  // là thứ duy nhất trong bảng điểm không nhúc nhích.
  const counts = new Set(LAYOUTS.map((l) => runOn(l.id).select.comparisons))
  assert.equal(counts.size, 1, `chọn phải luôn tốn như nhau, đang có ${[...counts]}`)
  assert.equal([...counts][0], ALL_PAIRS, `chọn phải so đúng ${ALL_PAIRS} cặp`)
  // ...và ghi ít nhất, ở mọi thế. Con số này là lý do nó còn được dùng.
  for (const l of LAYOUTS) {
    const r = runOn(l.id)
    assert.ok(
      r.select.writes <= Math.min(r.bubble.writes, r.insert.writes, r.quick.writes),
      `thế "${l.name}": chọn ghi ${r.select.writes}, không còn là ít nhất`,
    )
    assert.ok(r.select.writes <= 2 * (N - 1), `thế "${l.name}": chọn ghi quá ${2 * (N - 1)}`)
  }
}

{
  // Nổi bọt trên mảng đã sắp: dừng sau đúng một lượt, không ghi lần nào. Không có
  // cờ `swapped` thì nó vẫn quét đủ 276 cặp — và dòng `return` không bao giờ sáng.
  const r = runOn('da-sap')
  assert.equal(r.bubble.comparisons, N - 1, 'nổi bọt phải dừng sau một lượt quét')
  assert.equal(r.bubble.writes, 0, 'nổi bọt không được ghi gì trên mảng đã sắp')
}

{
  // Chèn trên mảng gần sắp: gần như tuyến tính. Nếu con số này trôi lên gần n²
  // thì thế "gần sắp" đã bị làm hỏng quá nhiều chỗ và bài học biến mất.
  const r = runOn('gan-sap')
  assert.ok(
    r.insert.comparisons < N * 2,
    `chèn trên mảng gần sắp tốn ${r.insert.comparisons} phép so, phải dưới ${N * 2}`,
  )
  assert.ok(
    r.insert.comparisons * 5 < r.select.comparisons,
    'chèn phải bỏ xa chọn trên mảng gần sắp, không thì thế này không dạy gì',
  )
}

{
  // Đảo ngược là trường hợp tệ nhất của cả chèn lẫn nổi bọt: mọi cặp đều nghịch.
  const r = runOn('dao-nguoc')
  assert.equal(r.insert.comparisons, ALL_PAIRS, 'chèn phải so hết mọi cặp')
  assert.equal(r.insert.writes, 2 * ALL_PAIRS, 'mỗi cặp nghịch là một lần đổi chỗ')
}

{
  // Thuật toán nhanh: thắng đậm ở thế ngẫu nhiên...
  const rand = runOn('ngau-nhien')
  assert.ok(
    rand.quick.comparisons * 2 < rand.select.comparisons,
    `ngẫu nhiên: nhanh ${rand.quick.comparisons} vs chọn ${rand.select.comparisons}, ` +
      'chênh chưa đủ để lượt chạy đầu tiên tự nói ra bài học',
  )
  // ...và tệ nhất bảng ở thế đã sắp sẵn, vì chốt lấy ô cuối. Đây là cái bẫy đáng
  // giá nhất của cả mô phỏng: dạng dữ liệu đời thường nhất lại là trường hợp xấu
  // nhất. Mất tính chất này (đổi sang chốt trung vị) là mất luôn bài học.
  const sorted = runOn('da-sap')
  assert.equal(sorted.quick.comparisons, ALL_PAIRS, 'nhanh phải suy biến về O(n²)')
  assert.ok(
    sorted.quick.comparisons > sorted.bubble.comparisons * 5,
    'trên mảng đã sắp, nhanh phải thua nổi bọt thật đậm',
  )
}

// ── Bảng code ──────────────────────────────────────────────────────────────
//
// Mỗi dòng phải có lúc được chiếu sáng. Một dòng không khung nào trỏ tới là một
// dòng người học nhìn thấy mà không bao giờ biết nó chạy khi nào — hoặc tệ hơn,
// là dấu hiệu đoạn chữ trên màn hình đã lệch khỏi cái hàm đang chạy thật.

for (const a of ALGOS) {
  assert.ok(a.code.length > 0, `${a.file}: rỗng`)
  assert.ok(a.code[0].startsWith('def '), `${a.file}: dòng 1 phải là chữ ký hàm`)

  const seen = new Set<number>()
  for (const l of LAYOUTS) for (const f of a.run(l.make()).frames) seen.add(f.line)

  for (let ln = 1; ln <= a.code.length; ln++) {
    const src = a.code[ln - 1].trim()
    // Dòng trắng và dòng `def` không phải lệnh chạy được — thuật toán nhanh có
    // hai hàm trong một bảng code.
    if (src === '' || src.startsWith('def ')) continue
    assert.ok(seen.has(ln), `${a.file} dòng ${ln} (${src}) không bao giờ được chiếu sáng`)
  }
}

assert.equal(ALGOS.length, 4)
assert.deepEqual(
  ALGOS.map((a) => a.no),
  ['01', '02', '03', '04'],
)
assert.equal(new Set(ALGOS.map((a) => a.file)).size, 4)

console.log('sort.check: ok')
