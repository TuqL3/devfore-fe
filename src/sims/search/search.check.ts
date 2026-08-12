// Chạy: npm run check
//
// Bốn thuật toán phải cho **cùng một đáp án** — cả mô phỏng này dựa trên đúng
// chỗ đó: nếu chúng khác nhau ở kết quả thì bảng so số phép so sánh vô nghĩa,
// vì lúc đó chúng đang làm hai việc khác nhau chứ không phải cùng một việc theo
// hai cách. Lệch một chỉ số ở nhị phân hay nội suy là kiểu sai nhìn không ra:
// vẫn trả về một con số, vẫn vẽ ra một hình đẹp.
//
// Từ khi có bảng code chạy song song, có thêm một nhóm bất biến: số dòng phải
// trỏ vào dòng có thật, và khung nào khai là "đang so" thì phải thật sự đang so.
// Sai chỗ đó là bảng code sáng nhầm dòng — vẫn chạy, vẫn đẹp, dạy sai.
//
// ponytail: assert của node, không framework — cùng lý do với sim.check.ts.
import assert from 'node:assert/strict'

import {
  ALGOS,
  DEFAULT_TARGET_INDEX,
  missingValue,
  scoreboard,
  seedData,
} from './algos.ts'

const data = seedData()
const n = data.length

// ── Mảng ───────────────────────────────────────────────────────────────────

assert.equal(n, 64)
for (let i = 1; i < n; i++) {
  assert.ok(data[i] > data[i - 1], `mảng phải tăng ngặt, hỏng ở ${i}`)
}
// Khoảng cách không đều — nếu đều thì nội suy trúng ngay phát đầu ở mọi mục
// tiêu và bài học của nó biến mất.
const gaps = new Set(data.slice(1).map((v, i) => v - data[i]))
assert.ok(gaps.size > 1, 'khoảng cách phải không đều')

assert.ok(DEFAULT_TARGET_INDEX > n / 2, 'mục tiêu mặc định phải ở nửa sau')

const missing = missingValue(data)
assert.equal(data.indexOf(missing), -1, 'giá trị "không có" phải thật sự không có')
assert.ok(
  missing > data[0] && missing < data[n - 1],
  'phải nằm trong khoảng của mảng, không phải ngoài rìa — ngoài rìa thì nội suy ' +
    'thoát ngay ở điều kiện vòng lặp và không diễn được gì',
)

// ── Cả bốn phải đồng ý, với MỌI mục tiêu ───────────────────────────────────

const targets = [
  ...data, // mọi phần tử có thật
  missing, // một khe ở giữa
  data[0] - 1, // trước đầu mảng
  data[n - 1] + 1, // sau cuối mảng
]

/** Mục tiêu nằm ngoài `[data[0], data[n-1]]`. Nội suy loại thẳng trường hợp này
 *  ở điều kiện vòng lặp, **không so lần nào** — nó biết trước là vô vọng. Ba
 *  thuật toán kia vẫn phải mở ít nhất một ô ra xem. */
const outOfRange = (t: number) => t < data[0] || t > data[n - 1]

for (const target of targets) {
  const want = data.indexOf(target)
  for (const a of ALGOS) {
    const t = a.run(data, target)
    const where = `${a.cmd} với ${target}`
    assert.equal(t.found, want, `${where}: ra ${t.found}, phải là ${want}`)

    // Không được so quá một lượt quét cả mảng. Vòng lặp vô hạn ở nội suy thì
    // treo luôn bài kiểm; trần này biến nó thành một dòng lỗi đọc được.
    assert.ok(t.comparisons <= n, `${where}: ${t.comparisons} phép so, quá nhiều`)
    assert.ok(t.frames.length <= n * 4, `${where}: ${t.frames.length} khung, quá nhiều`)
    if (!outOfRange(target)) {
      assert.ok(t.comparisons > 0, `${where}: phải có ít nhất một phép so`)
    }

    // `comparisons` phải đúng bằng số khung có so sánh. Hai chỗ đếm rời nhau là
    // hai chỗ lệch nhau: bảng điểm nói một số, bảng code đếm ra số khác.
    assert.equal(
      t.comparisons,
      t.frames.filter((f) => f.cmp !== null).length,
      `${where}: bộ đếm phép so lệch với số khung có so sánh`,
    )

    for (const f of t.frames) {
      assert.ok(
        f.line >= 1 && f.line <= a.code.length,
        `${where}: dòng ${f.line} không có trong ${a.file} (${a.code.length} dòng)`,
      )
      // Đoạn RỖNG được phép — `lo = hi + 1` là trạng thái thật sau nhát cắt
      // cuối, nghĩa là không còn ô nào chưa loại, và chỗ vẽ mờ hết cả lưới. Kẹp
      // nó lại cho "đẹp" là nói dối đúng cái khoảnh khắc thuật toán kết thúc.
      // Nhưng rỗng quá một ô thì là lỗi tính, không phải trạng thái.
      assert.ok(
        f.lo <= f.hi + 1,
        `${where}: đoạn [${f.lo}..${f.hi}] rỗng quá một ô — lỗi tính, không phải trạng thái`,
      )
      assert.ok(
        f.lo >= 0 && f.lo <= n && f.hi >= -1 && f.hi < n,
        `${where}: đoạn [${f.lo}..${f.hi}] ra ngoài mảng`,
      )

      if (f.probe === null) {
        // Dòng không đọc phần tử nào thì không được khai kết quả so sánh.
        assert.equal(f.cmp, null, `${where}: dòng ${f.line} không có ô mà vẫn có cờ so`)
        continue
      }
      assert.ok(
        f.probe >= f.lo && f.probe <= f.hi,
        `${where}: ô đang so (${f.probe}) nằm ngoài đoạn [${f.lo}..${f.hi}] — ` +
          'chỗ vẽ sẽ tô ô đó ở ngoài vùng sáng, nhìn ra là lỗi vẽ',
      )
      if (f.cmp !== null) {
        // Cờ so sánh phải khớp dữ liệu thật: chỗ vẽ tô màu theo nó chứ không tự
        // tính lại.
        const want_cmp =
          data[f.probe] === target ? 'eq' : data[f.probe] < target ? 'lt' : 'gt'
        assert.equal(f.cmp, want_cmp, `${where}: cờ so sánh ở ô ${f.probe} sai`)
      }
    }

    // Tìm thấy thì khung cuối phải là dòng `return`, và ô nó đang chỉ phải đúng
    // là ô tìm được — không phải tìm thấy rồi còn chỉ đi đâu khác.
    if (t.found !== -1) {
      const last = t.frames[t.frames.length - 1]
      assert.equal(last.probe, t.found, `${where}: khung cuối không chỉ vào ô tìm được`)
      assert.ok(
        a.code[last.line - 1].includes('return'),
        `${where}: khung cuối phải dừng ở dòng return, đang ở "${a.code[last.line - 1].trim()}"`,
      )
      assert.ok(
        t.frames.some((f) => f.cmp === 'eq' && f.probe === t.found),
        `${where}: phải có một phép so ra bằng ở ô ${t.found}`,
      )
    }
  }
}

// ── Chặn trên của từng thuật toán ──────────────────────────────────────────
//
// Con số trong phần "Vì sao đáng học" phải đúng, không phải nói cho hay.
{
  let worst = { linear: 0, binary: 0, jump: 0, interp: 0 }
  for (const target of targets) {
    const [li, bi, ju, ip] = ALGOS.map((a) => a.run(data, target).comparisons)
    worst = {
      linear: Math.max(worst.linear, li),
      binary: Math.max(worst.binary, bi),
      jump: Math.max(worst.jump, ju),
      interp: Math.max(worst.interp, ip),
    }
  }
  // 64 phần tử: nhị phân nhiều nhất ⌈log₂(65)⌉ = 7.
  assert.ok(worst.binary <= 7, `nhị phân tệ nhất ${worst.binary}, phải ≤ 7`)
  // Nhảy bước: ⌈64/8⌉ nhảy + 8 quét, cộng một lần so lặp ở cuối khối.
  assert.ok(worst.jump <= 17, `nhảy bước tệ nhất ${worst.jump}, phải ≤ 17`)
  assert.ok(worst.linear <= n, `tuần tự tệ nhất ${worst.linear}, phải ≤ ${n}`)
  // Nội suy KHÔNG được nhanh hơn ở trường hợp tệ nhất — đó là bài học của nó,
  // và một mảng làm nó luôn thắng là một mảng nói dối.
  assert.ok(
    worst.interp > worst.binary,
    `nội suy tệ nhất ${worst.interp} mà nhị phân ${worst.binary}: mảng này quá ` +
      'đều, không diễn được mặt xấu của nội suy',
  )
}

// Nội suy loại mục tiêu ngoài khoảng mà không so lần nào; ba cái kia thì phải so.
{
  const above = data[n - 1] + 1
  const [linear, binary, jump, interp] = ALGOS.map((a) => a.run(data, above).comparisons)
  assert.equal(interp, 0, 'nội suy phải thoát ngay, không so lần nào')
  assert.ok(linear > 0 && binary > 0 && jump > 0)
}

// ── Mục tiêu mặc định phải cho thấy khoảng cách ────────────────────────────

{
  const rows = scoreboard(data, data[DEFAULT_TARGET_INDEX])
  assert.equal(rows.length, 4)
  const [linear, binary] = rows
  assert.equal(linear.found, DEFAULT_TARGET_INDEX)
  assert.equal(binary.found, DEFAULT_TARGET_INDEX)
  // Lượt chạy đầu tiên phải tự nói ra bài học. Chênh dưới 5 lần thì bảng điểm
  // trông như sai số, không ra một sự khác biệt về bản chất.
  assert.ok(
    linear.comparisons >= binary.comparisons * 5,
    `mục tiêu mặc định: tuần tự ${linear.comparisons} vs nhị phân ${binary.comparisons}, chênh chưa đủ`,
  )
}

// ── Bảng code ──────────────────────────────────────────────────────────────
//
// Mỗi dòng code phải có lúc được chiếu sáng. Một dòng không khung nào trỏ tới là
// một dòng người học nhìn thấy mà không bao giờ hiểu nó chạy khi nào — hoặc tệ
// hơn, là dấu hiệu đoạn code trên màn hình đã lệch khỏi hàm đang chạy thật.
for (const a of ALGOS) {
  assert.ok(a.code.length > 0, `${a.file}: rỗng`)
  assert.ok(a.code[0].startsWith('def '), `${a.file}: dòng 1 phải là chữ ký hàm`)

  const seen = new Set<number>()
  for (const target of targets) {
    for (const f of a.run(data, target).frames) seen.add(f.line)
  }
  for (let ln = 2; ln <= a.code.length; ln++) {
    // Dòng `else:` không có gì để chạy — thân của nó mới là dòng sau.
    if (a.code[ln - 1].trim() === 'else:') continue
    assert.ok(
      seen.has(ln),
      `${a.file} dòng ${ln} (${a.code[ln - 1].trim()}) không bao giờ được chiếu sáng`,
    )
  }
}

assert.equal(ALGOS.length, 4)
assert.deepEqual(
  ALGOS.map((a) => a.no),
  ['01', '02', '03', '04'],
)

console.log('search.check: ok')
