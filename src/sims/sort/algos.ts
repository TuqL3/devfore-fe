/** Bốn thuật toán sắp xếp trên cùng một mảng, mỗi cái trả về **vết chạy** chứ
 *  không trả về mảng đã sắp.
 *
 *  Kết quả thì cả bốn giống nhau — cùng một mảng tăng dần, nên kết quả không dạy
 *  được gì. Thứ khác nhau là *đường đi tới đó*, và ở sắp xếp thì "đường đi" có
 *  **hai** con số chứ không phải một: bao nhiêu **phép so**, bao nhiêu **lần
 *  ghi**. Chọn thắng tuyệt đối về lần ghi và thua tuyệt đối về phép so; nói mỗi
 *  "nhanh hơn" là bỏ mất đúng chỗ đó.
 *
 *  Một khung hình là **một dòng code chạy**, không phải một phép so — cùng lý do
 *  với `sims/search/algos.ts`: người học cần thấy `a[j-1], a[j] = a[j], a[j-1]`
 *  chạy *ngay sau khi* `a[j-1] > a[j]` cho ra đúng, mới nối được cái cột vừa nhảy
 *  chỗ với dòng code làm nó nhảy.
 *
 *  Mỗi khung mang theo **ảnh chụp cả mảng** (`Frame.a`), không phải một danh sách
 *  thao tác để chỗ vẽ tự dựng lại. Mảng 24 số × chừng nghìn khung là vài trăm KB
 *  sống trong đúng một lượt chiếu — đổi lại chỗ vẽ nhảy tới khung bất kỳ mà không
 *  cần phát lại từ đầu, và đó là thứ cho phép bỏ bớt khung khi vết quá dài (xem
 *  `SortBench`). Danh sách thao tác thì rẻ hơn về bộ nhớ và đắt hơn về mọi thứ
 *  khác.
 *
 *  Không import gì từ `@/`: file này chạy trong `sort.check.ts` bằng node. */

/** Một biến để theo dõi, hiện thành chip dưới bảng code. */
export interface Var {
  name: string
  value: string
}

/** Một dòng code vừa chạy xong.
 *
 *  `lo`/`hi` là đoạn thuật toán **còn phải xét**; phần ngoài đoạn được vẽ mờ. Với
 *  nổi bọt đoạn co lại từ bên phải, với chọn thì từ bên trái, với nhanh thì nó
 *  nhảy theo đệ quy — nhìn ba cái đoạn đó co khác nhau là nửa bài học.
 *
 *  `done` là những ô đã nằm **đúng chỗ cuối cùng**, không bao giờ động vào nữa.
 *  Nó khác hẳn "đoạn đã có thứ tự": chèn giữ một đoạn trái luôn có thứ tự với
 *  nhau, nhưng một ô nhỏ chưa xét tới có thể chen vào giữa đoạn đó và đẩy tất cả
 *  sang phải — nên trong suốt lượt chạy của chèn, `done` rỗng. Tô xanh đoạn trái
 *  của chèn là dạy sai, và `sort.check.ts` canh chỗ này bằng cách bắt mọi ô trong
 *  `done` phải đang giữ đúng giá trị của nó ở mảng đã sắp. */
export interface Frame {
  /** Dòng trong `Algo.code`, đếm từ 1. */
  line: number
  /** Ảnh chụp cả mảng ngay sau khi dòng này chạy. */
  a: number[]
  lo: number
  hi: number
  /** Hai ô đang được đem ra so. Cả hai đều là ô thật đang nằm trên mảng — không
   *  có "giá trị đang cầm trên tay", xem chú thích ở `insertion`. */
  cmp: [number, number] | null
  /** Ô vừa bị ghi. Đổi chỗ là hai ô. */
  wrote: number[]
  done: number[]
  /** Ô chốt của thuật toán nhanh. `null` với ba cái còn lại. */
  pivot: number | null
  vars: Var[]
  note: string
  /** Số phép so và lần ghi **tính tới hết khung này**.
   *
   *  Nằm trong khung chứ không tính lại ở chỗ vẽ: bộ đếm phải nhảy đúng theo nhịp
   *  chiếu, mà chỗ vẽ có bỏ bớt khung — cộng dồn ở đó thì cứ bỏ một khung là mất
   *  luôn mấy phép so trong đó, và con số cuối cùng không khớp bảng điểm. */
  cmpSoFar: number
  writeSoFar: number
}

export interface Trace {
  frames: Frame[]
  /** Số lần so hai phần tử với nhau. Con số thứ nhất của bảng điểm. */
  comparisons: number
  /** Số ô bị ghi. Một lần đổi chỗ là **hai** lần ghi — vì nó thật sự là hai lệnh
   *  gán, kể cả khi hai ô đó là một (xem phần bài học của thuật toán nhanh). */
  writes: number
}

export interface Algo {
  no: string
  /** Tên hàm, hiện ở dòng lệnh. */
  cmd: string
  /** Tên file hiện trên đầu bảng code. */
  file: string
  name: string
  blurb: string
  big_o: string
  space: string
  /** Hai phần tử bằng nhau có giữ nguyên thứ tự cũ không. */
  stable: boolean
  /** Mã nguồn, mỗi phần tử một dòng. `Frame.line` trỏ vào đây. */
  code: string[]
  teach: string
  run: (input: number[]) => Trace
}

// ── Mảng và bốn thế mở đầu ─────────────────────────────────────────────────

/** 24 cột. Chọn bằng hai ràng buộc chứ không phải cho tròn số:
 *
 *  - đủ lớn để O(n²) và O(n log n) tách ra thành hai con số khác hẳn nhau — nổi
 *    bọt 276 phép so, nhanh khoảng 90; ở n = 12 thì tỉ lệ đó tụt xuống còn hơn
 *    hai lần và trông như sai số;
 *  - đủ nhỏ để 24 cột nằm vừa một hàng đọc được, không phải cuộn ngang — mà nhìn
 *    được **cả mảng cùng lúc** chính là thứ làm thấy được đoạn chưa xét co lại. */
export const N = 24

/** Thế mở đầu. Ở tìm kiếm, thứ dùng chung giữa bốn thuật toán là **mục tiêu**; ở
 *  sắp xếp thì là **thứ tự ban đầu**, và nó là biến quan trọng hơn nhiều: cùng
 *  một mảng đã sắp sẵn, nổi bọt tốn 23 phép so còn thuật toán nhanh tốn 276 — tức
 *  là gấp 12 lần, và đúng chiều ngược với cái tên của chúng. */
export interface Layout {
  id: string
  name: string
  /** Một dòng nói vì sao thế này đáng bấm. */
  hint: string
  make: () => number[]
}

/** Trộn tất định bằng Lehmer (MINSTD), không phải `Math.random`: hai người mở hai
 *  màn hình vẫn đang nói về cùng một mảng, và bảng điểm trong phần hướng dẫn vẫn
 *  đúng sau khi tải lại trang.
 *
 *  Hằng nhân 48271 chứ không phải 1103515245 của glibc: `s` tới 2³¹, nhân
 *  1103515245 là 2,3 × 10¹⁸ — vượt số nguyên an toàn của double và phép chia dư
 *  sau đó trả về rác. */
function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i + 1)
  let s = 20260813 % 2147483647
  for (let i = n - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ascending = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

/** Đã sắp rồi, trừ ba cặp kề nhau bị đổi chỗ. Ba chỗ hỏng, ở ba quãng khác nhau
 *  của mảng — một chỗ thì chèn xong trong một lượt và trông như may mắn. */
function nearlySorted(n: number): number[] {
  const a = ascending(n)
  for (const i of [3, 11, 18]) [a[i], a[i + 1]] = [a[i + 1], a[i]]
  return a
}

export const LAYOUTS: Layout[] = [
  {
    id: 'ngau-nhien',
    name: 'Ngẫu nhiên',
    hint: 'Trường hợp trung bình. Đây là con số hay được trích dẫn.',
    make: () => shuffled(N),
  },
  {
    id: 'gan-sap',
    name: 'Gần sắp xếp',
    hint: 'Ba cặp bị đổi chỗ. Chèn gần như chạy không, ba cái kia không biết.',
    make: () => nearlySorted(N),
  },
  {
    id: 'da-sap',
    name: 'Đã sắp sẵn',
    hint: 'Không còn gì để làm. Nổi bọt dừng sau một lượt, nhanh thì tệ nhất.',
    make: () => ascending(N),
  },
  {
    id: 'dao-nguoc',
    name: 'Đảo ngược',
    hint: 'Mọi cặp đều sai chỗ. Trường hợp tệ nhất của chèn và của nổi bọt.',
    make: () => ascending(N).reverse(),
  },
]

export const DEFAULT_LAYOUT = LAYOUTS[0].id

export function layoutOf(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
}

// ── Chỗ gom khung hình ─────────────────────────────────────────────────────

/** Thứ mỗi thuật toán khai cho một khung. Phần lặp lại (ảnh chụp mảng, danh sách
 *  ô đã chốt, hai bộ đếm) do `tracer` tự điền — bắt bốn thuật toán tự chép ba
 *  thứ đó vào từng lời gọi là ba chỗ để chép sót. */
interface Emit {
  line: number
  lo: number
  hi: number
  cmp?: [number, number]
  wrote?: number[]
  pivot?: number
  vars?: Var[]
  note: string
}

/** Bộ đếm tự tăng theo nội dung khung, không đếm tay: khai `cmp` là cộng một phép
 *  so, khai `wrote` là cộng đúng số ô đã ghi. Không có chỗ thứ hai để lệch. */
function tracer(a: number[]) {
  const frames: Frame[] = []
  const fixed = new Set<number>()
  let comparisons = 0
  let writes = 0
  return {
    /** Ô này đã nằm đúng chỗ cuối cùng. */
    fix(...ix: number[]) {
      for (const i of ix) fixed.add(i)
    },
    emit(e: Emit) {
      if (e.cmp) comparisons++
      writes += e.wrote?.length ?? 0
      frames.push({
        line: e.line,
        a: [...a],
        lo: e.lo,
        hi: e.hi,
        cmp: e.cmp ?? null,
        wrote: e.wrote ?? [],
        done: [...fixed],
        pivot: e.pivot ?? null,
        vars: e.vars ?? [],
        note: e.note,
        cmpSoFar: comparisons,
        writeSoFar: writes,
      })
    },
    end(): Trace {
      return { frames, comparisons, writes }
    },
  }
}

const num = (name: string, value: number): Var => ({ name, value: String(value) })

// ── 01 Nổi bọt ─────────────────────────────────────────────────────────────

const BUBBLE_CODE = [
  'def bubble_sort(a):',
  '    for end in range(len(a) - 1, 0, -1):',
  '        swapped = False',
  '        for j in range(end):',
  '            if a[j] > a[j + 1]:',
  '                a[j], a[j + 1] = a[j + 1], a[j]',
  '                swapped = True',
  '        if not swapped:',
  '            return',
]

function bubble(input: number[]): Trace {
  const a = [...input]
  const t = tracer(a)
  const n = a.length

  for (let end = n - 1; end > 0; end--) {
    const v = () => [num('end', end)]
    t.emit({ line: 2, lo: 0, hi: end, vars: v(), note: `lượt quét mới, tới ô ${end}` })
    t.emit({ line: 3, lo: 0, hi: end, vars: v(), note: 'lượt này chưa đổi chỗ lần nào' })

    let swapped = false
    for (let j = 0; j < end; j++) {
      const vj = [...v(), num('j', j)]
      t.emit({ line: 4, lo: 0, hi: end, vars: vj, note: `xét cặp kề nhau ${j} và ${j + 1}` })
      t.emit({
        line: 5,
        lo: 0,
        hi: end,
        cmp: [j, j + 1],
        vars: vj,
        note: `so ${a[j]} với ${a[j + 1]}`,
      })
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        t.emit({
          line: 6,
          lo: 0,
          hi: end,
          wrote: [j, j + 1],
          vars: vj,
          note: 'trái lớn hơn phải → đổi chỗ',
        })
        swapped = true
        t.emit({ line: 7, lo: 0, hi: end, vars: vj, note: 'ghi nhận: lượt này có đổi chỗ' })
      }
    }

    // Ô cuối đoạn đã nhận đúng giá trị lớn nhất của đoạn — chốt được từ đây, và
    // đó là lý do lượt sau ngắn hơn lượt trước.
    t.fix(end)
    t.emit({
      line: 8,
      lo: 0,
      hi: end - 1,
      vars: v(),
      note: swapped
        ? `ô ${end} đã chốt, lượt này còn đổi chỗ nên quét tiếp`
        : 'cả lượt không đổi chỗ lần nào',
    })
    if (!swapped) {
      for (let i = 0; i < end; i++) t.fix(i)
      t.emit({ line: 9, lo: 0, hi: -1, note: 'mảng đã có thứ tự — dừng sớm' })
      return t.end()
    }
  }

  t.fix(0)
  t.emit({ line: 2, lo: 0, hi: -1, note: 'hết lượt quét, xong' })
  return t.end()
}

// ── 02 Chèn ────────────────────────────────────────────────────────────────

/** Bản **đổi chỗ**, không phải bản dịch-rồi-đặt.
 *
 *  Bản sách giáo khoa cầm `key = a[i]` trên tay rồi dịch từng ô sang phải; nó
 *  ghi ít hơn một nửa. Nhưng lúc đó ô `i` trên màn hình đang giữ một giá trị đã
 *  bị chép đè, còn giá trị thật thì nằm ngoài mảng — muốn vẽ đúng thì phải thêm
 *  một cột "đang cầm trên tay" bay lơ lửng, và mọi phép so trở thành "so một ô
 *  với một thứ không ở trên màn hình".
 *
 *  Bản đổi chỗ so hai ô thật, ghi hai ô thật, và cột nhỏ đi bộ sang trái từng
 *  nhịp một. Cái giá phải trả là con số ghi gấp đôi — nói thẳng trong phần bài
 *  học, chứ không giấu. */
const INSERT_CODE = [
  'def insertion_sort(a):',
  '    for i in range(1, len(a)):',
  '        j = i',
  '        while j > 0 and a[j - 1] > a[j]:',
  '            a[j - 1], a[j] = a[j], a[j - 1]',
  '            j -= 1',
]

function insertion(input: number[]): Trace {
  const a = [...input]
  const t = tracer(a)
  const n = a.length

  for (let i = 1; i < n; i++) {
    t.emit({ line: 2, lo: 0, hi: i, vars: [num('i', i)], note: `tới lượt ô ${i}` })
    let j = i
    t.emit({
      line: 3,
      lo: 0,
      hi: i,
      vars: [num('i', i), num('j', j)],
      note: 'bắt đầu lùi từ chính nó',
    })

    for (;;) {
      const vj = [num('i', i), num('j', j)]
      if (j === 0) {
        t.emit({ line: 4, lo: 0, hi: i, vars: vj, note: 'đã tới đầu mảng, dừng' })
        break
      }
      t.emit({
        line: 4,
        lo: 0,
        hi: i,
        cmp: [j - 1, j],
        vars: vj,
        note: `so ${a[j - 1]} bên trái với ${a[j]}`,
      })
      if (a[j - 1] <= a[j]) break

      ;[a[j - 1], a[j]] = [a[j], a[j - 1]]
      t.emit({
        line: 5,
        lo: 0,
        hi: i,
        wrote: [j - 1, j],
        vars: vj,
        note: 'trái lớn hơn → lùi thêm một ô',
      })
      j--
      t.emit({ line: 6, lo: 0, hi: i, vars: [num('i', i), num('j', j)], note: `giờ đang ở ô ${j}` })
    }
  }

  // Chốt hết một lượt ở đây, không chốt dần: đoạn trái của chèn có thứ tự với
  // nhau nhưng chưa ô nào đứng đúng chỗ cuối cùng — một ô nhỏ chưa xét tới vẫn
  // chen được vào giữa và đẩy cả đoạn sang phải. Xem chú thích ở `Frame.done`.
  for (let i = 0; i < n; i++) t.fix(i)
  t.emit({ line: 2, lo: 0, hi: -1, note: 'hết mảng, xong' })
  return t.end()
}

// ── 03 Chọn ────────────────────────────────────────────────────────────────

const SELECT_CODE = [
  'def selection_sort(a):',
  '    for i in range(len(a) - 1):',
  '        m = i',
  '        for j in range(i + 1, len(a)):',
  '            if a[j] < a[m]:',
  '                m = j',
  '        if m != i:',
  '            a[i], a[m] = a[m], a[i]',
]

function selection(input: number[]): Trace {
  const a = [...input]
  const t = tracer(a)
  const n = a.length

  for (let i = 0; i < n - 1; i++) {
    t.emit({ line: 2, lo: i, hi: n - 1, vars: [num('i', i)], note: `đi tìm số nhỏ nhất cho ô ${i}` })
    let m = i
    t.emit({
      line: 3,
      lo: i,
      hi: n - 1,
      vars: [num('i', i), num('m', m)],
      note: 'tạm coi ô đầu đoạn là nhỏ nhất',
    })

    for (let j = i + 1; j < n; j++) {
      const vj = [num('i', i), num('m', m), num('j', j)]
      t.emit({ line: 4, lo: i, hi: n - 1, vars: vj, note: `xét ô ${j}` })
      t.emit({
        line: 5,
        lo: i,
        hi: n - 1,
        cmp: [j, m],
        vars: vj,
        note: `so ${a[j]} với số nhỏ nhất đang giữ ${a[m]}`,
      })
      if (a[j] < a[m]) {
        m = j
        t.emit({
          line: 6,
          lo: i,
          hi: n - 1,
          vars: [num('i', i), num('m', m), num('j', j)],
          note: `nhỏ hơn → số nhỏ nhất giờ ở ô ${m}`,
        })
      }
    }

    t.emit({
      line: 7,
      lo: i,
      hi: n - 1,
      vars: [num('i', i), num('m', m)],
      note: m === i ? 'nó vốn đã đứng đúng chỗ, khỏi đổi' : `số nhỏ nhất nằm ở ô ${m}`,
    })
    if (m !== i) {
      ;[a[i], a[m]] = [a[m], a[i]]
      t.emit({
        line: 8,
        lo: i,
        hi: n - 1,
        wrote: [i, m],
        vars: [num('i', i), num('m', m)],
        note: `đưa ${a[i]} về ô ${i} — một lần đổi chỗ cho cả lượt quét`,
      })
    }
    t.fix(i)
  }

  // Ô cuối không cần lượt nào: mọi ô khác đã chốt thì nó chỉ còn một chỗ để nằm.
  t.fix(n - 1)
  t.emit({ line: 2, lo: n - 1, hi: n - 2, note: 'còn đúng một ô, không cần xét' })
  return t.end()
}

// ── 04 Nhanh ───────────────────────────────────────────────────────────────

/** Hai hàm trong một bảng code. Nhét `partition` vào trong `quicksort` thì được
 *  một hàm dài mười mấy dòng với hai tầng lặp lồng nhau, đọc khó hơn hẳn — mà
 *  bảng code này để đọc là chính. `sort.check.ts` bỏ qua dòng trắng và dòng `def`
 *  khi kiểm "mọi dòng phải có lúc sáng lên". */
const QUICK_CODE = [
  'def quicksort(a, lo, hi):',
  '    if lo >= hi:',
  '        return',
  '    p = partition(a, lo, hi)',
  '    quicksort(a, lo, p - 1)',
  '    quicksort(a, p + 1, hi)',
  '',
  'def partition(a, lo, hi):',
  '    pivot = a[hi]',
  '    i = lo',
  '    for j in range(lo, hi):',
  '        if a[j] < pivot:',
  '            a[i], a[j] = a[j], a[i]',
  '            i += 1',
  '    a[i], a[hi] = a[hi], a[i]',
  '    return i',
]

function quick(input: number[]): Trace {
  const a = [...input]
  const t = tracer(a)

  const partition = (lo: number, hi: number): number => {
    const pivot = a[hi]
    const base = () => [num('lo', lo), num('hi', hi), num('pivot', pivot)]
    t.emit({
      line: 9,
      lo,
      hi,
      pivot: hi,
      vars: base(),
      note: `lấy ô cuối đoạn làm chốt: ${pivot}`,
    })
    let i = lo
    t.emit({
      line: 10,
      lo,
      hi,
      pivot: hi,
      vars: [...base(), num('i', i)],
      note: 'i là ranh giới của phần nhỏ hơn chốt',
    })

    for (let j = lo; j < hi; j++) {
      const vj = [...base(), num('i', i), num('j', j)]
      t.emit({ line: 11, lo, hi, pivot: hi, vars: vj, note: `xét ô ${j}` })
      t.emit({
        line: 12,
        lo,
        hi,
        pivot: hi,
        cmp: [j, hi],
        vars: vj,
        note: `so ${a[j]} với chốt ${pivot}`,
      })
      if (a[j] < pivot) {
        ;[a[i], a[j]] = [a[j], a[i]]
        t.emit({
          line: 13,
          lo,
          hi,
          pivot: hi,
          wrote: [i, j],
          vars: vj,
          note:
            i === j
              ? 'nó vốn đã ở phía nhỏ hơn — vẫn tốn hai lệnh gán để đổi chỗ với chính nó'
              : `nhỏ hơn chốt → đẩy về ô ${i}`,
        })
        i++
        t.emit({
          line: 14,
          lo,
          hi,
          pivot: hi,
          vars: [...base(), num('i', i), num('j', j)],
          note: `ranh giới sang ô ${i}`,
        })
      }
    }

    ;[a[i], a[hi]] = [a[hi], a[i]]
    t.emit({
      line: 15,
      lo,
      hi,
      pivot: i,
      wrote: [i, hi],
      vars: [...base(), num('i', i)],
      note: `đưa chốt về đúng ranh giới, ô ${i}`,
    })
    t.fix(i)
    t.emit({
      line: 16,
      lo,
      hi,
      vars: [...base(), num('i', i)],
      note: `ô ${i} chốt xong — trái nhỏ hơn, phải lớn hơn`,
    })
    return i
  }

  const sort = (lo: number, hi: number) => {
    const v = [num('lo', lo), num('hi', hi)]
    t.emit({ line: 2, lo, hi, vars: v, note: `đoạn [${lo}..${hi}]` })
    if (lo >= hi) {
      if (lo === hi) t.fix(lo)
      t.emit({
        line: 3,
        lo,
        hi,
        vars: v,
        note: lo === hi ? `còn một ô → ô ${lo} đã đúng chỗ` : 'đoạn rỗng, quay về',
      })
      return
    }

    const p = partition(lo, hi)
    t.emit({ line: 4, lo, hi, vars: [...v, num('p', p)], note: `chốt nằm ở ô ${p}` })
    t.emit({
      line: 5,
      lo,
      hi,
      vars: [...v, num('p', p)],
      note: `xuống nửa trái [${lo}..${p - 1}]`,
    })
    sort(lo, p - 1)
    t.emit({
      line: 6,
      lo,
      hi,
      vars: [...v, num('p', p)],
      note: `xuống nửa phải [${p + 1}..${hi}]`,
    })
    sort(p + 1, hi)
  }

  sort(0, a.length - 1)
  return t.end()
}

// ── Bộ bốn ─────────────────────────────────────────────────────────────────

export const ALGOS: Algo[] = [
  {
    no: '01',
    cmd: 'bubble_sort(a)',
    file: 'bubble_sort.py',
    name: 'Nổi bọt',
    blurb: 'ĐỔI CHỖ HAI Ô KỀ NHAU',
    big_o: 'O(n²)',
    space: 'O(1)',
    stable: true,
    code: BUBBLE_CODE,
    run: bubble,
    teach: `Quét từ trái sang, gặp cặp kề nhau sai thứ tự thì đổi chỗ. Hết một lượt thì số lớn nhất đã trôi về cuối — nên lượt sau ngắn hơn lượt trước đúng một ô.

Cờ \`swapped\` là toàn bộ giá trị còn lại của nó. Một lượt không đổi chỗ lần nào nghĩa là mọi cặp kề nhau đều đúng thứ tự, tức là cả mảng đã có thứ tự — dừng luôn. Bấm thế **Đã sắp sẵn** để xem: 23 phép so, 0 lần ghi, xong. Đó là trường hợp duy nhất nó thắng, và nó thắng tuyệt đối.

Ngoài trường hợp đó thì đây là thuật toán tệ nhất trong bốn cái: cùng O(n²) phép so như chọn, nhưng số lần ghi thì gấp hàng chục lần vì nó đẩy từng ô một thay vì nhấc thẳng tới đích. Nó sống sót trong sách giáo khoa vì dễ giải thích, không phải vì đáng dùng.`,
  },
  {
    no: '02',
    cmd: 'insertion_sort(a)',
    file: 'insertion_sort.py',
    name: 'Chèn',
    blurb: 'LÙI VỀ CHỖ CỦA MÌNH',
    big_o: 'O(n²) — O(n) nếu gần sắp',
    space: 'O(1)',
    stable: true,
    code: INSERT_CODE,
    run: insertion,
    teach: `Cách người ta xếp bài trên tay: cầm quân mới, lùi nó về bên trái tới khi gặp quân nhỏ hơn. Mỗi ô chỉ đi đúng quãng đường nó cần đi — và đó là chỗ khác biệt với ba cái kia, vốn quét cả đoạn dù có việc hay không.

Bấm thế **Gần sắp xếp** rồi so cột "phép so": chèn tốn hơn 20 phép một chút, chọn vẫn tốn đủ 276. Dữ liệu thật hầu hết là gần sắp — log mới nối vào cuối, danh sách vừa thêm một dòng — nên đây là lý do mọi thư viện chuẩn vẫn gọi chèn cho những đoạn ngắn bên trong thuật toán nhanh.

Chú ý đoạn trái **không** được tô xanh trong lúc chạy, dù nó đã có thứ tự. Vì đó mới là "có thứ tự với nhau", chưa phải "đúng chỗ cuối cùng": một ô nhỏ chưa xét tới vẫn chen vào giữa được và đẩy cả đoạn sang phải.

Bản ở đây đổi chỗ hai ô thật một nhịp. Bản sách giáo khoa cầm giá trị trên tay rồi dịch từng ô sang phải, ghi ít hơn một nửa — nhưng lúc đó cái đang so nằm ngoài mảng, không vẽ ra được. Số **phép so** thì hai bản giống hệt nhau.`,
  },
  {
    no: '03',
    cmd: 'selection_sort(a)',
    file: 'selection_sort.py',
    name: 'Chọn',
    blurb: 'QUÉT CẢ ĐOẠN, ĐỔI MỘT LẦN',
    big_o: 'O(n²)',
    space: 'O(1)',
    stable: false,
    code: SELECT_CODE,
    run: selection,
    teach: `Quét cả đoạn còn lại để tìm số nhỏ nhất, rồi đổi nó về đầu đoạn. Đúng một lần đổi chỗ cho mỗi lượt quét.

Số phép so của nó là **hằng số**: 276 với mảng 24 ô, bất kể thế mở đầu là gì. Bấm lần lượt cả bốn thế mà xem — ba thuật toán kia nhảy số loạn lên, riêng dòng của chọn đứng im. Không có trường hợp tốt, không có trường hợp xấu, và cũng không dừng sớm được: nó không có cách nào biết mảng đã sắp rồi.

Đổi lại, nó ghi **ít nhất**: nhiều nhất 23 lần đổi chỗ, tức 46 lần ghi, so với hàng trăm của nổi bọt. Con số đó mới là lý do nó tồn tại. Ghi vào bộ nhớ flash, vào ô EEPROM có hạn số lần ghi, hay vào một bản ghi to mà mỗi lần chép là chép cả trăm byte — chỗ đó thì đếm lần ghi mới đúng, và chọn thắng.

Nó **không ổn định**: cú đổi chỗ tầm xa nhấc một phần tử vượt qua những phần tử bằng nó, làm mất thứ tự cũ giữa chúng. Ba mươi phần trăm số lỗi "sắp xếp hai lần thì thứ tự nhảy loạn" đến từ đúng chỗ này.`,
  },
  {
    no: '04',
    cmd: 'quicksort(a, 0, len(a) - 1)',
    file: 'quicksort.py',
    name: 'Nhanh',
    blurb: 'CHIA ĐÔI QUANH MỘT CHỐT',
    big_o: 'O(n log n) — O(n²) nếu chốt xấu',
    space: 'O(log n)',
    stable: false,
    code: QUICK_CODE,
    run: quick,
    teach: `Chọn một ô làm **chốt**, đẩy mọi số nhỏ hơn về bên trái nó và số lớn hơn về bên phải. Chốt đứng đúng chỗ vĩnh viễn ngay lúc đó — cột xanh đầu tiên hiện ra giữa mảng chứ không phải ở rìa, khác hẳn ba cái kia. Rồi làm lại đúng như thế với hai đoạn hai bên.

Với thế **Ngẫu nhiên** nó tốn 88 phép so, trong khi ba cái kia tốn từ 179 tới 276. Chênh lệch đó lớn dần theo n: 1000 phần tử thì là chừng 10.000 so với 500.000.

Giờ bấm **Đã sắp sẵn** và nhìn lại. 276 phép so — bằng đúng thuật toán chọn, tệ nhất bảng. Vì chốt lấy ô cuối đoạn, mà ô cuối của một mảng đã sắp chính là **số lớn nhất**: mỗi lần chia tách ra được đúng một phần tử, và cây đệ quy sâu n tầng thay vì log n. Kiểu dữ liệu đời thường nhất — đã sắp sẵn — lại chính là trường hợp tệ nhất của nó. Bản thật chữa bằng cách lấy trung vị của ba ô, hoặc chọn chốt ngẫu nhiên.

Cột "lần ghi" ở thế đó còn dựng đứng hơn nữa, và một nửa là ghi thừa: khi \`i\` và \`j\` trỏ cùng một ô, dòng \`a[i], a[j] = a[j], a[i]\` vẫn chạy hai lệnh gán để đổi chỗ một ô với chính nó. Bảng điểm đếm đúng cái máy làm, không đếm cái đáng lẽ phải làm.`,
  },
]

/** Hai con số của cả bốn, trên **cùng một thế mở đầu**. Đây là bảng điểm — cái mà
 *  cả mô phỏng này tồn tại để tạo ra.
 *
 *  Chạy cả bốn tốn chừng ba nghìn khung hình, nên chỗ gọi phải nhớ kết quả theo
 *  thế mở đầu (`useMemo`) chứ không gọi lại mỗi lần vẽ — khác với bảng điểm bên
 *  tìm kiếm, nơi một vết chạy chỉ có hơn trăm khung và tính lại thì rẻ hơn là lo
 *  nó lệch. */
export function scoreboard(
  data: number[],
): { no: string; name: string; comparisons: number; writes: number }[] {
  return ALGOS.map((a) => {
    const t = a.run(data)
    return { no: a.no, name: a.name, comparisons: t.comparisons, writes: t.writes }
  })
}
