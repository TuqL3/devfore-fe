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
      note: `lấy chỉ số i = ${i}`,
    })
    const cmp = cmpOf(data[i], target)
    t.emit({
      line: 3,
      lo: i,
      hi: n - 1,
      probe: i,
      cmp,
      vars: [...vars, { name: 'a[i]', value: String(data[i]) }],
      note: `so a[${i}] = ${data[i]} với ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({
        line: 4,
        lo: i,
        hi: n - 1,
        probe: i,
        cmp: null,
        vars,
        note: 'trả về chỉ số',
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
    note: 'hết mảng, không có',
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
    note: 'đặt hai đầu đoạn',
  })

  while (lo <= hi) {
    t.emit({
      line: 3,
      lo,
      hi,
      probe: null,
      cmp: null,
      vars: v(),
      note: `đoạn còn ${hi - lo + 1} ô`,
    })
    // `(lo + hi) >> 1` chứ không phải chia rồi làm tròn: cùng kết quả, và đây là
    // dạng mọi sách viết. Tràn số nguyên — cái bug nổi tiếng của nhị phân —
    // không xảy ra ở JS vì số ở đây là double.
    const mid = (lo + hi) >> 1
    const vm = [...v(), { name: 'mid', value: String(mid) }]
    t.emit({ line: 4, lo, hi, probe: mid, cmp: null, vars: vm, note: `giữa là ô ${mid}` })

    const cmp = cmpOf(data[mid], target)
    t.emit({
      line: 5,
      lo,
      hi,
      probe: mid,
      cmp,
      vars: [...vm, { name: 'a[mid]', value: String(data[mid]) }],
      note: `so a[${mid}] = ${data[mid]} với ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({ line: 6, lo, hi, probe: mid, cmp: null, vars: vm, note: 'trả về chỉ số' })
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
      note: cmp === 'lt' ? `${data[mid]} < ${target} → đúng` : `${data[mid]} < ${target} → sai`,
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
        note: 'nhỏ hơn → vứt nửa trái',
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
        note: 'lớn hơn → vứt nửa phải',
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
    note: 'đoạn rỗng, không có',
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
    note: `bước nhảy √${n} = ${step}`,
  })
  t.emit({
    line: 3,
    lo: 0,
    hi: n - 1,
    probe: null,
    cmp: null,
    vars: v(),
    note: 'bắt đầu từ khối đầu tiên',
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
      note: `so cuối khối, ô ${end}`,
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
        note: 'nhảy sang khối sau',
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
      note: 'nhảy hết mảng, không có',
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
      note: `quét trong khối [${block}..${end}]`,
    })
    const cmp = cmpOf(data[i], target)
    t.emit({
      line: 7,
      lo: block,
      hi: end,
      probe: i,
      cmp,
      vars: [...vi, { name: 'a[i]', value: String(data[i]) }],
      note: `so a[${i}] = ${data[i]} với ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({
        line: 8,
        lo: block,
        hi: end,
        probe: i,
        cmp: null,
        vars: vi,
        note: 'trả về chỉ số',
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
    note: 'hết khối, không có',
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

  t.emit({ line: 2, lo, hi, probe: null, cmp: null, vars: v(), note: 'đặt hai đầu đoạn' })

  while (lo <= hi && target >= data[lo] && target <= data[hi]) {
    t.emit({
      line: 3,
      lo,
      hi,
      probe: null,
      cmp: null,
      vars: v(),
      note: `mục tiêu nằm trong [${data[lo]}..${data[hi]}]`,
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
      note: 'độ rộng giá trị của đoạn',
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
      note: `đoán ô ${pos} theo giá trị`,
    })

    const cmp = cmpOf(data[pos], target)
    t.emit({
      line: 6,
      lo,
      hi,
      probe: pos,
      cmp,
      vars: [...vp, { name: 'a[pos]', value: String(data[pos]) }],
      note: `so a[${pos}] = ${data[pos]} với ${target}`,
    })
    if (cmp === 'eq') {
      t.emit({ line: 7, lo, hi, probe: pos, cmp: null, vars: vp, note: 'trả về chỉ số' })
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
      note: cmp === 'lt' ? `${data[pos]} < ${target} → đúng` : `${data[pos]} < ${target} → sai`,
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
        note: 'nhỏ hơn → bỏ phần trái',
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
        note: 'lớn hơn → bỏ phần phải',
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
    note: 'ra ngoài khoảng, không có',
  })
  return t.done(-1)
}

// ── Bộ bốn ─────────────────────────────────────────────────────────────────

export const ALGOS: Algo[] = [
  {
    no: '01',
    cmd: 'linear_search(a, x)',
    file: 'linear_search.py',
    name: 'Tuần tự',
    blurb: 'ĐI TỪ ĐẦU TỚI CUỐI',
    big_o: 'O(n)',
    space: 'O(1)',
    needs_sorted: false,
    code: LINEAR_CODE,
    run: linear,
    teach: `Mở từng ô một, từ trái sang. Không cần mảng sắp xếp — và đó là ưu điểm duy nhất nhưng cũng là ưu điểm thật: dữ liệu chưa sắp thì ba thuật toán còn lại **không dùng được**, sắp nó lại tốn O(n log n), đắt hơn cả một lần quét.

Tìm một lần trên mảng chưa sắp thì tuần tự là đúng. Tìm nghìn lần thì sắp trước rồi nhị phân.

Bản ở đây cố ý viết ngây thơ: gặp ô lớn hơn mục tiêu vẫn đi tiếp. Mảng đã sắp thì dừng được ngay tại đó — nhưng dừng sớm chỉ giúp lúc không tìm thấy, còn độ phức tạp vẫn là O(n).`,
  },
  {
    no: '02',
    cmd: 'binary_search(a, x)',
    file: 'binary_search.py',
    name: 'Nhị phân',
    blurb: 'CẮT ĐÔI MỖI BƯỚC',
    big_o: 'O(log n)',
    space: 'O(1)',
    needs_sorted: true,
    code: BINARY_CODE,
    run: binary,
    teach: `So với ô giữa, rồi **vứt hẳn một nửa**. Vứt được vì mảng đã sắp: ô giữa nhỏ hơn mục tiêu thì cả nửa trái cũng nhỏ hơn, không cần nhìn.

64 phần tử → nhiều nhất 6 lần so. 1 triệu phần tử → 20 lần. Gấp đôi dữ liệu chỉ tốn thêm **một** phép so; đó là ý nghĩa của log.

Đây là thuật toán bị viết sai nhiều nhất trong nghề. Hai chỗ chết người nằm ngay trong đoạn code bên trên: \`lo <= hi\` chứ không phải \`<\`, và \`mid + 1\` / \`mid - 1\` chứ không phải \`mid\` — để \`mid\` thì đoạn không co lại và vòng lặp chạy mãi.`,
  },
  {
    no: '03',
    cmd: 'jump_search(a, x)',
    file: 'jump_search.py',
    name: 'Nhảy bước',
    blurb: 'NHẢY √n RỒI QUÉT',
    big_o: 'O(√n)',
    space: 'O(1)',
    needs_sorted: true,
    code: JUMP_CODE,
    run: jump,
    teach: `Nhảy từng khối √n phần tử cho tới khi vượt qua mục tiêu, rồi quét tuần tự **trong đúng khối đó**. Với 64 phần tử thì khối rộng 8: nhiều nhất 8 lần nhảy cộng 8 lần quét.

Chậm hơn nhị phân, nhanh hơn tuần tự. Vậy dùng làm gì? Vì nó chỉ đi **tới** chứ không nhảy lùi. Trên băng từ, trên danh sách liên kết, trên dữ liệu đọc theo dòng — nhảy về sau rất đắt hoặc không làm được, còn nhị phân thì nhảy qua nhảy lại liên tục.

Bước √n không phải chọn bừa: nhảy n/k lần rồi quét k ô, tổng nhỏ nhất đúng khi k = √n. \`end(lo)\` trong code là ô cuối của khối bắt đầu ở \`lo\`.`,
  },
  {
    no: '04',
    cmd: 'interpolation_search(a, x)',
    file: 'interpolation_search.py',
    name: 'Nội suy',
    blurb: 'ĐOÁN THEO GIÁ TRỊ',
    big_o: 'O(log log n) — nếu đều',
    space: 'O(1)',
    needs_sorted: true,
    code: INTERP_CODE,
    run: interpolation,
    teach: `Nhị phân luôn cắt giữa. Nội suy thì **đoán**: tìm số 950 trong mảng từ 0 tới 1000 thì nhìn gần cuối, chứ ai lại mở giữa. Đúng cách bạn tra từ điển giấy.

Dữ liệu rải đều thì nó thắng đậm, O(log log n) — 1 triệu phần tử tra hết 4 lần. Nhưng cái "nếu đều" đó là điều kiện thật: dữ liệu lệch nặng (một cụm dày rồi một khoảng trống lớn) thì mỗi lần đoán chỉ bỏ được vài ô, và nó **tụt về O(n)**, chậm hơn cả nhị phân.

Mảng ở đây lệch đúng như thế, và lệch theo ba vùng để xem được cả hai kiểu đoán sai. Bấm ô có giá trị \`23\` ở vùng dày đầu: nội suy mất 11 phép so, nhị phân chỉ 6 — nó **thua**. Để ý dòng \`pos = ...\`: vùng thưa ở giữa làm \`span\` rất lớn, nên dự đoán bị kéo về sát \`lo\` và đoạn chỉ co được vài ô mỗi vòng.

Rồi bấm ô \`1261\` ở vùng dày cuối để xem kiểu sai ngược lại: dòng \`hi = pos - 1\` sáng lên — nó đoán **vượt** qua mục tiêu.`,
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
