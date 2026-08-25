/** Bốn thuật toán tìm kiếm trên mảng đã sắp xếp, mỗi cái trả về **vết chạy**
 *  chứ không trả về đáp án.
 *
 *  Đáp án thì cả bốn giống nhau — đó chính là lý do không dạy được gì bằng đáp
 *  án. Thứ khác nhau là *đường đi tới đó*: tuần tự đi 58 phép so, nhị phân đi 5.
 *
 *  Một khung hình là **một dòng code chạy**, không phải một phép so sánh. Khác
 *  biệt đó là cả điểm: người học cần thấy `lo = mid + 1` chạy *ngay sau khi*
 *  `a[mid] < x` cho ra đúng, mới nối được câu "vì nhỏ hơn nên vứt nửa trái" với
 *  dòng code làm việc vứt đó. Gộp cả vòng lặp vào một khung thì phần nối đó
 *  người học phải tự làm trong đầu — mà đó đúng là phần khó.
 *
 *  Nên `comparisons` đếm riêng, không phải `frames.length`: bảng điểm so số phép
 *  so sánh, còn số khung hình chỉ là chuyện trình chiếu.
 *
 *  Không import gì từ `@/`: file này chạy trong `search.check.ts` bằng node. */

/** Một biến để theo dõi, hiện thành chip dưới bảng code. */
export interface Var {
  name: string
  value: string
}

/** Một dòng code vừa chạy xong.
 *
 *  `lo`/`hi` là đoạn thuật toán **còn phải xét**. Với tuần tự thì đoạn đó chỉ co
 *  lại từ bên trái; với nhị phân nó co từ cả hai đầu — và nhìn hai cái đoạn đó
 *  co khác nhau chính là toàn bộ bài học.
 *
 *  `probe` là `null` ở những dòng không đọc phần tử nào (gán biến, tăng chỉ số).
 *  Bắt nó phải có giá trị thì mấy dòng đó buộc phải bịa ra một ô đang-so không
 *  tồn tại, và ô đó sẽ sáng lên trên lưới ở đúng lúc thuật toán chưa nhìn nó. */
export interface Frame {
  /** Dòng trong `Algo.code`, đếm từ 1. */
  line: number
  lo: number
  hi: number
  probe: number | null
  /** `data[probe]` so với mục tiêu. `null` khi dòng này không so gì. */
  cmp: 'lt' | 'eq' | 'gt' | null
  vars: Var[]
  note: string
}

export interface Trace {
  frames: Frame[]
  /** Chỉ số tìm được, `-1` là không có. */
  found: number
  /** Số lần thật sự so một phần tử với mục tiêu. Đây là con số lên bảng điểm. */
  comparisons: number
}

export interface Algo {
  no: string
  /** Tên hàm, hiện ở dòng lệnh. `x` được thay bằng mục tiêu đang tìm. */
  cmd: string
  /** Tên file hiện trên đầu bảng code. */
  file: string
  name: string
  blurb: string
  big_o: string
  space: string
  /** Bắt buộc mảng phải sắp xếp trước không. */
  needs_sorted: boolean
  /** Mã nguồn, mỗi phần tử một dòng. `Frame.line` trỏ vào đây. */
  code: string[]
  teach: string
  run: (data: number[], target: number) => Trace
}

const cmpOf = (a: number, b: number): 'lt' | 'eq' | 'gt' =>
  a === b ? 'eq' : a < b ? 'lt' : 'gt'

/** Mảng lúc mở: 64 phần tử, tăng ngặt, **ba vùng** — dày (giá trị cách nhau
 *  1–3), thưa (cách nhau 40–76), rồi lại dày.
 *
 *  Hình dạng này bị ép ra bởi hai bài kiểm, không phải chọn cho vui:
 *
 *  1. Mảng tăng gần đều thì nội suy đoán trúng trong một hai bước ở **mọi** mục
 *     tiêu, tệ nhất còn nhanh hơn nhị phân — lúc đó câu "dữ liệu lệch thì nội
 *     suy tụt về O(n)" trong phần bài học không có gì trên màn hình chứng minh,
 *     và người học rút ra kết luận ngược: nội suy luôn thắng, dùng luôn đi. Bản
 *     đầu đúng là như thế. Ràng buộc: `worst.interp > worst.binary`.
 *  2. Bản thứ hai chia hai vùng, dày trước thưa sau. Dự đoán của nội suy khi đó
 *     **luôn hụt**, không bao giờ vượt — nhánh `hi = pos - 1` chết hẳn, tức là
 *     bảng code có một dòng không bao giờ sáng và mô phỏng chỉ dạy được nửa
 *     thuật toán. Ràng buộc: mọi dòng code phải có lúc được chiếu sáng.
 *
 *  Ba vùng thoả cả hai: vùng dày đầu kéo dự đoán hụt, vùng dày cuối làm nó vượt.
 *
 *  Sinh bằng công thức chứ không phải `Math.random`: hai người mở hai màn hình
 *  vẫn đang nói về cùng một mảng. */
export function seedData(n = 64): number[] {
  const out: number[] = []
  const from = Math.floor(n / 3)
  const to = Math.floor((n * 2) / 3)
  let v = 4
  for (let i = 0; i < n; i++) {
    out.push(v)
    const sparse = i >= from && i < to
    v += sparse ? 40 + ((i * 13) % 37) : 1 + ((i * 7) % 3)
  }
  return out
}

/** Mục tiêu lúc mở: gần cuối mảng.
 *
 *  Chọn cố ý. Mục tiêu ở đầu thì tuần tự thắng, và người học rút ra đúng bài học
 *  ngược. Ở gần cuối thì khoảng cách 58 với 5 phép so sánh hiện ra ngay lượt
 *  chạy đầu tiên, không phải đi tìm. */
export const DEFAULT_TARGET_INDEX = 57

/** Một giá trị **không nằm** trong mảng, để xem cả bốn thuật toán kết thúc ra
 *  sao khi không tìm thấy — phần mà mọi bài giảng đều bỏ qua. Lấy khe giữa hai
 *  phần tử liền nhau nên nó nằm trong khoảng của mảng, không phải ngoài rìa. */
export function missingValue(data: number[]): number {
  for (let i = 1; i < data.length; i++) {
    if (data[i] - data[i - 1] > 1) return data[i] - 1
  }
  return data[data.length - 1] + 1
}

/** Chỗ gom khung hình. Mỗi thuật toán dựng một cái rồi `emit` theo từng dòng nó
 *  chạy — `comparisons` tự tăng khi khung có so sánh thật, nên không có chỗ nào
 *  đếm tay và đếm lệch. */
function tracer() {
  const frames: Frame[] = []
  let comparisons = 0
  return {
    emit(f: Frame) {
      if (f.cmp !== null) comparisons++
      frames.push(f)
    },
    done(found: number): Trace {
      return { frames, found, comparisons }
    },
  }
}

// ── 01 Tuần tự ─────────────────────────────────────────────────────────────

const LINEAR_CODE = [
  'def linear_search(a, x):',
  '    for i in range(len(a)):',
  '        if a[i] == x:',
  '            return i',
  '    return -1',
]

function linear(data: number[], target: number): Trace {
  const t = tracer()
  const n = data.length
  for (let i = 0; i < n; i++) {
    const vars = [{ name: 'i', value: String(i) }]
    t.emit({
      line: 2,
      lo: i,
      hi: n - 1,
      probe: null,
      cmp: null,
      vars,
      note: `take index i = ${i}`,
    })
    const cmp = cmpOf(data[i], target)
    t.emit({
      line: 3,
      lo: i,
      hi: n - 1,
      probe: i,
      cmp,
      vars: [...vars, { name: 'a[i]', value: String(data[i]) }],
      note: `compare a[${i}] = ${data[i]} with ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({
        line: 4,
        lo: i,
        hi: n - 1,
        probe: i,
        cmp: null,
        vars,
        note: 'return the index',
      })
      return t.done(i)
    }
  }
  t.emit({
    line: 5,
    lo: n - 1,
    hi: n - 1,
    probe: null,
    cmp: null,
    vars: [],
    note: 'end of the array, not here',
  })
  return t.done(-1)
}

// ── 02 Nhị phân ────────────────────────────────────────────────────────────

const BINARY_CODE = [
  'def binary_search(a, x):',
  '    lo, hi = 0, len(a) - 1',
  '    while lo <= hi:',
  '        mid = (lo + hi) // 2',
  '        if a[mid] == x:',
  '            return mid',
  '        if a[mid] < x:',
  '            lo = mid + 1',
  '        else:',
  '            hi = mid - 1',
  '    return -1',
]

function binary(data: number[], target: number): Trace {
  const t = tracer()
  let lo = 0
  let hi = data.length - 1
  const v = () => [
    { name: 'lo', value: String(lo) },
    { name: 'hi', value: String(hi) },
  ]

  t.emit({
    line: 2,
    lo,
    hi,
    probe: null,
    cmp: null,
    vars: v(),
    note: 'set both ends of the range',
  })

  while (lo <= hi) {
    t.emit({
      line: 3,
      lo,
      hi,
      probe: null,
      cmp: null,
      vars: v(),
      note: `${hi - lo + 1} slots left in the range`,
    })
    // `(lo + hi) >> 1` chứ không phải chia rồi làm tròn: cùng kết quả, và đây là
    // dạng mọi sách viết. Tràn số nguyên — cái bug nổi tiếng của nhị phân —
    // không xảy ra ở JS vì số ở đây là double.
    const mid = (lo + hi) >> 1
    const vm = [...v(), { name: 'mid', value: String(mid) }]
    t.emit({ line: 4, lo, hi, probe: mid, cmp: null, vars: vm, note: `the middle is slot ${mid}` })

    const cmp = cmpOf(data[mid], target)
    t.emit({
      line: 5,
      lo,
      hi,
      probe: mid,
      cmp,
      vars: [...vm, { name: 'a[mid]', value: String(data[mid]) }],
      note: `compare a[${mid}] = ${data[mid]} with ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({ line: 6, lo, hi, probe: mid, cmp: null, vars: vm, note: 'return the index' })
      return t.done(mid)
    }

    // Dòng rẽ nhánh, `cmp: null`. Nó KHÔNG phải một phép so mới: giá trị
    // `a[mid]` vừa được đọc ở dòng trên, và cách đếm chuẩn của nhị phân là một
    // phép so ba nhánh cho mỗi ô mở ra. Khai `cmp` ở đây là bảng điểm đội lên
    // gấp đôi trong khi thuật toán không làm gì thêm.
    t.emit({
      line: 7,
      lo,
      hi,
      probe: mid,
      cmp: null,
      vars: vm,
      note: cmp === 'lt' ? `${data[mid]} < ${target} → true` : `${data[mid]} < ${target} → false`,
    })

    if (cmp === 'lt') {
      lo = mid + 1
      t.emit({
        line: 8,
        lo,
        hi,
        probe: null,
        cmp: null,
        vars: v(),
        note: 'smaller → throw away the left half',
      })
    } else {
      hi = mid - 1
      t.emit({
        line: 10,
        lo,
        hi,
        probe: null,
        cmp: null,
        vars: v(),
        note: 'larger → throw away the right half',
      })
    }
  }
  t.emit({
    line: 11,
    lo,
    hi,
    probe: null,
    cmp: null,
    vars: [],
    note: 'empty range, not here',
  })
  return t.done(-1)
}

// ── 03 Nhảy bước ───────────────────────────────────────────────────────────

const JUMP_CODE = [
  'def jump_search(a, x):',
  '    step = int(sqrt(len(a)))',
  '    lo = 0',
  '    while lo < len(a) and a[end(lo)] < x:',
  '        lo += step',
  '    for i in range(lo, end(lo) + 1):',
  '        if a[i] == x:',
  '            return i',
  '    return -1',
]

function jump(data: number[], target: number): Trace {
  const t = tracer()
  const n = data.length
  // √n là bước tối ưu: nhảy n/k lần rồi quét k ô, tổng nhỏ nhất khi k = √n.
  const step = Math.max(1, Math.floor(Math.sqrt(n)))
  let block = 0
  const endOf = (b: number) => Math.min(b + step, n) - 1
  const v = () => [
    { name: 'step', value: String(step) },
    { name: 'lo', value: String(block) },
  ]

  t.emit({
    line: 2,
    lo: 0,
    hi: n - 1,
    probe: null,
    cmp: null,
    vars: v(),
    note: `jump size √${n} = ${step}`,
  })
  t.emit({
    line: 3,
    lo: 0,
    hi: n - 1,
    probe: null,
    cmp: null,
    vars: v(),
    note: 'start from the first block',
  })

  while (block < n) {
    const end = endOf(block)
    const cmp = cmpOf(data[end], target)
    t.emit({
      line: 4,
      lo: block,
      hi: n - 1,
      probe: end,
      cmp,
      vars: [...v(), { name: 'a[end]', value: String(data[end]) }],
      note: `compare the end of the block, slot ${end}`,
    })
    if (cmp !== 'lt') break
    block += step
    if (block < n) {
      t.emit({
        line: 5,
        lo: block,
        hi: n - 1,
        probe: null,
        cmp: null,
        vars: v(),
        note: 'jump to the next block',
      })
    }
  }

  if (block >= n) {
    t.emit({
      line: 9,
      lo: n - 1,
      hi: n - 1,
      probe: null,
      cmp: null,
      vars: [],
      note: 'jumped past the whole array, not here',
    })
    return t.done(-1)
  }

  const end = endOf(block)
  for (let i = block; i <= end; i++) {
    const vi = [...v(), { name: 'i', value: String(i) }]
    t.emit({
      line: 6,
      lo: block,
      hi: end,
      probe: null,
      cmp: null,
      vars: vi,
      note: `sweep inside the block [${block}..${end}]`,
    })
    const cmp = cmpOf(data[i], target)
    t.emit({
      line: 7,
      lo: block,
      hi: end,
      probe: i,
      cmp,
      vars: [...vi, { name: 'a[i]', value: String(data[i]) }],
      note: `compare a[${i}] = ${data[i]} with ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({
        line: 8,
        lo: block,
        hi: end,
        probe: i,
        cmp: null,
        vars: vi,
        note: 'return the index',
      })
      return t.done(i)
    }
    // Mảng đã sắp: vượt qua mục tiêu rồi thì phía sau không còn cửa nào.
    if (cmp === 'gt') break
  }
  t.emit({
    line: 9,
    lo: block,
    hi: end,
    probe: null,
    cmp: null,
    vars: [],
    note: 'end of the block, not here',
  })
  return t.done(-1)
}

// ── 04 Nội suy ─────────────────────────────────────────────────────────────

const INTERP_CODE = [
  'def interpolation_search(a, x):',
  '    lo, hi = 0, len(a) - 1',
  '    while lo <= hi and a[lo] <= x <= a[hi]:',
  '        span = a[hi] - a[lo]',
  '        pos = lo + (x - a[lo]) * (hi - lo) // span',
  '        if a[pos] == x:',
  '            return pos',
  '        if a[pos] < x:',
  '            lo = pos + 1',
  '        else:',
  '            hi = pos - 1',
  '    return -1',
]

function interpolation(data: number[], target: number): Trace {
  const t = tracer()
  let lo = 0
  let hi = data.length - 1
  const v = () => [
    { name: 'lo', value: String(lo) },
    { name: 'hi', value: String(hi) },
  ]

  t.emit({ line: 2, lo, hi, probe: null, cmp: null, vars: v(), note: 'set both ends of the range' })

  while (lo <= hi && target >= data[lo] && target <= data[hi]) {
    t.emit({
      line: 3,
      lo,
      hi,
      probe: null,
      cmp: null,
      vars: v(),
      note: `the target lies within [${data[lo]}..${data[hi]}]`,
    })

    // Đoán theo **giá trị**, không phải cắt đôi theo vị trí: mục tiêu nằm bao
    // nhiêu phần trăm giữa hai đầu thì đoán ô ở bấy nhiêu phần trăm.
    const span = data[hi] - data[lo]
    t.emit({
      line: 4,
      lo,
      hi,
      probe: null,
      cmp: null,
      vars: [...v(), { name: 'span', value: String(span) }],
      note: 'the value span of the range',
    })

    const raw =
      span === 0 ? lo : lo + Math.floor(((target - data[lo]) * (hi - lo)) / span)
    // Kẹp lại. Phép chia trên có thể ra ngoài đoạn khi dữ liệu lệch nặng, và một
    // chỉ số ngoài đoạn là đọc trúng ô đã bị loại — vòng lặp không kết thúc.
    const pos = Math.min(hi, Math.max(lo, raw))
    const vp = [...v(), { name: 'pos', value: String(pos) }]
    t.emit({
      line: 5,
      lo,
      hi,
      probe: pos,
      cmp: null,
      vars: vp,
      note: `guess slot ${pos} from the value`,
    })

    const cmp = cmpOf(data[pos], target)
    t.emit({
      line: 6,
      lo,
      hi,
      probe: pos,
      cmp,
      vars: [...vp, { name: 'a[pos]', value: String(data[pos]) }],
      note: `compare a[${pos}] = ${data[pos]} with ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({ line: 7, lo, hi, probe: pos, cmp: null, vars: vp, note: 'return the index' })
      return t.done(pos)
    }

    // Cùng lý do với dòng 7 của nhị phân: rẽ nhánh, không phải phép so mới.
    t.emit({
      line: 8,
      lo,
      hi,
      probe: pos,
      cmp: null,
      vars: vp,
      note: cmp === 'lt' ? `${data[pos]} < ${target} → true` : `${data[pos]} < ${target} → false`,
    })

    if (cmp === 'lt') {
      lo = pos + 1
      t.emit({
        line: 9,
        lo,
        hi,
        probe: null,
        cmp: null,
        vars: v(),
        note: 'smaller → drop the left part',
      })
    } else {
      hi = pos - 1
      t.emit({
        line: 11,
        lo,
        hi,
        probe: null,
        cmp: null,
        vars: v(),
        note: 'larger → drop the right part',
      })
    }
  }
  t.emit({
    line: 12,
    lo,
    hi,
    probe: null,
    cmp: null,
    vars: [],
    note: 'outside the value range, not here',
  })
  return t.done(-1)
}

// ── Bộ bốn ─────────────────────────────────────────────────────────────────

export const ALGOS: Algo[] = [
  {
    no: '01',
    cmd: 'linear_search(a, x)',
    file: 'linear_search.py',
    name: 'Linear',
    blurb: 'WALK FROM START TO END',
    big_o: 'O(n)',
    space: 'O(1)',
    needs_sorted: false,
    code: LINEAR_CODE,
    run: linear,
    teach: `Open one slot at a time, left to right. It does not need a sorted array — the only advantage it has, but a real one: on unsorted data the other three are **unusable**, and sorting first costs O(n log n), more than a single sweep.

Searching once over unsorted data, linear is the right answer. Searching a thousand times, sort first and use binary search.

The version here is deliberately naive: it keeps going even after passing a slot larger than the target. On a sorted array it could stop right there — but stopping early only helps when the value is absent, and the complexity is still O(n).`,
  },
  {
    no: '02',
    cmd: 'binary_search(a, x)',
    file: 'binary_search.py',
    name: 'Binary',
    blurb: 'HALVE IT EVERY STEP',
    big_o: 'O(log n)',
    space: 'O(1)',
    needs_sorted: true,
    code: BINARY_CODE,
    run: binary,
    teach: `Compare against the middle slot, then **throw away a whole half**. That is allowed because the array is sorted: if the middle is smaller than the target, the entire left half is smaller too, and there is nothing to look at.

64 elements → at most 6 comparisons. 1 million elements → 20. Doubling the data costs **one** more comparison; that is what log means.

This is the most frequently miswritten algorithm in the trade. Both fatal spots are in the code above: \`lo <= hi\` rather than \`<\`, and \`mid + 1\` / \`mid - 1\` rather than \`mid\` — leave it at \`mid\` and the range stops shrinking and the loop runs forever.`,
  },
  {
    no: '03',
    cmd: 'jump_search(a, x)',
    file: 'jump_search.py',
    name: 'Jump',
    blurb: 'JUMP √n THEN SWEEP',
    big_o: 'O(√n)',
    space: 'O(1)',
    needs_sorted: true,
    code: JUMP_CODE,
    run: jump,
    teach: `Jump one √n-sized block at a time until you pass the target, then sweep linearly **inside that one block**. With 64 elements the block is 8 wide: at most 8 jumps plus 8 sweep steps.

Slower than binary, faster than linear. So what is it for? Because it only ever moves **forward**, never backwards. On magnetic tape, on a linked list, on data read as a stream — seeking backwards is expensive or impossible, while binary search jumps back and forth constantly.

The √n step is not arbitrary: jump n/k times then sweep k slots, and the total is smallest exactly when k = √n. \`end(lo)\` in the code is the last slot of the block starting at \`lo\`.`,
  },
  {
    no: '04',
    cmd: 'interpolation_search(a, x)',
    file: 'interpolation_search.py',
    name: 'Interpolation',
    blurb: 'GUESS FROM THE VALUE',
    big_o: 'O(log log n) — if evenly spread',
    space: 'O(1)',
    needs_sorted: true,
    code: INTERP_CODE,
    run: interpolation,
    teach: `Binary search always cuts in the middle. Interpolation **guesses**: looking for 950 in an array running 0 to 1000, you look near the end — nobody opens the middle. Exactly how you look a word up in a paper dictionary.

On evenly spread data it wins decisively, O(log log n) — 1 million elements in 4 probes. But that "if evenly spread" is a real condition: on badly skewed data (a dense cluster then a large gap) each guess eliminates only a few slots, and it **degrades to O(n)**, slower than binary search.

The array here is skewed in exactly that way, and skewed into three zones so both kinds of bad guess are visible. Click the slot holding \`23\` in the dense first zone: interpolation spends 11 comparisons, binary only 6 — it **loses**. Watch the \`pos = ...\` line: the sparse middle zone makes \`span\` very large, so the prediction is dragged close to \`lo\` and the range shrinks by only a few slots per round.

Then click the slot holding \`1261\` in the dense last zone to see the opposite failure: the \`hi = pos - 1\` line lights up — it guessed **past** the target.`,
  },
]

/** Số phép so sánh của cả bốn, cho cùng một mục tiêu. Đây là bảng điểm — cái mà
 *  cả mô phỏng này tồn tại để tạo ra. Chạy cả bốn là 4 × O(n) trên 64 phần tử,
 *  rẻ hơn nhiều so với việc dựng một chỗ nhớ kết quả rồi lo nó lệch. */
export function scoreboard(
  data: number[],
  target: number,
): { no: string; name: string; comparisons: number; found: number }[] {
  return ALGOS.map((a) => {
    const t = a.run(data, target)
    return { no: a.no, name: a.name, comparisons: t.comparisons, found: t.found }
  })
}
