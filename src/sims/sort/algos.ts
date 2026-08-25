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
    id: 'random',
    name: 'Random',
    hint: 'The average case. This is the number people quote.',
    make: () => shuffled(N),
  },
  {
    id: 'nearly-sorted',
    name: 'Nearly sorted',
    hint: 'Three pairs swapped. Insertion barely works; the other three cannot tell.',
    make: () => nearlySorted(N),
  },
  {
    id: 'sorted',
    name: 'Already sorted',
    hint: 'Nothing left to do. Bubble stops after one pass; quicksort hits its worst case.',
    make: () => ascending(N),
  },
  {
    id: 'reversed',
    name: 'Reversed',
    hint: 'Every pair is out of order. Worst case for insertion and for bubble.',
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
    t.emit({ line: 2, lo: 0, hi: end, vars: v(), note: `new pass, up to slot ${end}` })
    t.emit({ line: 3, lo: 0, hi: end, vars: v(), note: 'no swap in this pass yet' })

    let swapped = false
    for (let j = 0; j < end; j++) {
      const vj = [...v(), num('j', j)]
      t.emit({ line: 4, lo: 0, hi: end, vars: vj, note: `looking at the adjacent pair ${j} and ${j + 1}` })
      t.emit({
        line: 5,
        lo: 0,
        hi: end,
        cmp: [j, j + 1],
        vars: vj,
        note: `compare ${a[j]} with ${a[j + 1]}`,
      })
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        t.emit({
          line: 6,
          lo: 0,
          hi: end,
          wrote: [j, j + 1],
          vars: vj,
          note: 'left is bigger than right → swap',
        })
        swapped = true
        t.emit({ line: 7, lo: 0, hi: end, vars: vj, note: 'noted: this pass did swap' })
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
        ? `slot ${end} is settled; this pass still swapped, so keep going`
        : 'the whole pass made no swap',
    })
    if (!swapped) {
      for (let i = 0; i < end; i++) t.fix(i)
      t.emit({ line: 9, lo: 0, hi: -1, note: 'the array is in order — stop early' })
      return t.end()
    }
  }

  t.fix(0)
  t.emit({ line: 2, lo: 0, hi: -1, note: 'no passes left, done' })
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
    t.emit({ line: 2, lo: 0, hi: i, vars: [num('i', i)], note: `slot ${i} takes its turn` })
    let j = i
    t.emit({
      line: 3,
      lo: 0,
      hi: i,
      vars: [num('i', i), num('j', j)],
      note: 'start walking back from itself',
    })

    for (;;) {
      const vj = [num('i', i), num('j', j)]
      if (j === 0) {
        t.emit({ line: 4, lo: 0, hi: i, vars: vj, note: 'reached the front of the array, stop' })
        break
      }
      t.emit({
        line: 4,
        lo: 0,
        hi: i,
        cmp: [j - 1, j],
        vars: vj,
        note: `compare ${a[j - 1]} on the left with ${a[j]}`,
      })
      if (a[j - 1] <= a[j]) break

      ;[a[j - 1], a[j]] = [a[j], a[j - 1]]
      t.emit({
        line: 5,
        lo: 0,
        hi: i,
        wrote: [j - 1, j],
        vars: vj,
        note: 'left is bigger → walk back one more slot',
      })
      j--
      t.emit({ line: 6, lo: 0, hi: i, vars: [num('i', i), num('j', j)], note: `now at slot ${j}` })
    }
  }

  // Chốt hết một lượt ở đây, không chốt dần: đoạn trái của chèn có thứ tự với
  // nhau nhưng chưa ô nào đứng đúng chỗ cuối cùng — một ô nhỏ chưa xét tới vẫn
  // chen được vào giữa và đẩy cả đoạn sang phải. Xem chú thích ở `Frame.done`.
  for (let i = 0; i < n; i++) t.fix(i)
  t.emit({ line: 2, lo: 0, hi: -1, note: 'end of the array, done' })
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
    t.emit({ line: 2, lo: i, hi: n - 1, vars: [num('i', i)], note: `go find the smallest value for slot ${i}` })
    let m = i
    t.emit({
      line: 3,
      lo: i,
      hi: n - 1,
      vars: [num('i', i), num('m', m)],
      note: 'assume the first slot of the range is the smallest for now',
    })

    for (let j = i + 1; j < n; j++) {
      const vj = [num('i', i), num('m', m), num('j', j)]
      t.emit({ line: 4, lo: i, hi: n - 1, vars: vj, note: `look at slot ${j}` })
      t.emit({
        line: 5,
        lo: i,
        hi: n - 1,
        cmp: [j, m],
        vars: vj,
        note: `compare ${a[j]} with the current smallest ${a[m]}`,
      })
      if (a[j] < a[m]) {
        m = j
        t.emit({
          line: 6,
          lo: i,
          hi: n - 1,
          vars: [num('i', i), num('m', m), num('j', j)],
          note: `smaller → the smallest is now at slot ${m}`,
        })
      }
    }

    t.emit({
      line: 7,
      lo: i,
      hi: n - 1,
      vars: [num('i', i), num('m', m)],
      note: m === i ? 'it was already in the right place, no swap' : `the smallest sits at slot ${m}`,
    })
    if (m !== i) {
      ;[a[i], a[m]] = [a[m], a[i]]
      t.emit({
        line: 8,
        lo: i,
        hi: n - 1,
        wrote: [i, m],
        vars: [num('i', i), num('m', m)],
        note: `move ${a[i]} to slot ${i} — one swap for the whole pass`,
      })
    }
    t.fix(i)
  }

  // Ô cuối không cần lượt nào: mọi ô khác đã chốt thì nó chỉ còn một chỗ để nằm.
  t.fix(n - 1)
  t.emit({ line: 2, lo: n - 1, hi: n - 2, note: 'one slot left, nothing to examine' })
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
      note: `take the last slot as pivot: ${pivot}`,
    })
    let i = lo
    t.emit({
      line: 10,
      lo,
      hi,
      pivot: hi,
      vars: [...base(), num('i', i)],
      note: 'i is the boundary of the part below the pivot',
    })

    for (let j = lo; j < hi; j++) {
      const vj = [...base(), num('i', i), num('j', j)]
      t.emit({ line: 11, lo, hi, pivot: hi, vars: vj, note: `look at slot ${j}` })
      t.emit({
        line: 12,
        lo,
        hi,
        pivot: hi,
        cmp: [j, hi],
        vars: vj,
        note: `compare ${a[j]} with the pivot ${pivot}`,
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
              ? 'it was already on the smaller side — still two assignments to swap it with itself'
              : `below the pivot → push it to slot ${i}`,
        })
        i++
        t.emit({
          line: 14,
          lo,
          hi,
          pivot: hi,
          vars: [...base(), num('i', i), num('j', j)],
          note: `boundary moves to slot ${i}`,
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
      note: `move the pivot onto the boundary, slot ${i}`,
    })
    t.fix(i)
    t.emit({
      line: 16,
      lo,
      hi,
      vars: [...base(), num('i', i)],
      note: `slot ${i} is settled — smaller on the left, bigger on the right`,
    })
    return i
  }

  const sort = (lo: number, hi: number) => {
    const v = [num('lo', lo), num('hi', hi)]
    t.emit({ line: 2, lo, hi, vars: v, note: `range [${lo}..${hi}]` })
    if (lo >= hi) {
      if (lo === hi) t.fix(lo)
      t.emit({
        line: 3,
        lo,
        hi,
        vars: v,
        note: lo === hi ? `one slot left → slot ${lo} is in place` : 'empty range, return',
      })
      return
    }

    const p = partition(lo, hi)
    t.emit({ line: 4, lo, hi, vars: [...v, num('p', p)], note: `the pivot sits at slot ${p}` })
    t.emit({
      line: 5,
      lo,
      hi,
      vars: [...v, num('p', p)],
      note: `descend into the left half [${lo}..${p - 1}]`,
    })
    sort(lo, p - 1)
    t.emit({
      line: 6,
      lo,
      hi,
      vars: [...v, num('p', p)],
      note: `descend into the right half [${p + 1}..${hi}]`,
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
    name: 'Bubble',
    blurb: 'SWAP TWO ADJACENT SLOTS',
    big_o: 'O(n²)',
    space: 'O(1)',
    stable: true,
    code: BUBBLE_CODE,
    run: bubble,
    teach: `Sweep left to right, and swap any adjacent pair that is out of order. After one pass the largest value has floated to the end — so the next pass is exactly one slot shorter.

The \`swapped\` flag is the whole of its remaining value. A pass with no swap at all means every adjacent pair is in order, which means the entire array is in order — stop right there. Press the **Already sorted** arrangement and watch: 23 comparisons, 0 writes, done. That is the one case it wins, and it wins outright.

Outside that case this is the worst of the four: the same O(n²) comparisons as selection, but dozens of times the writes, because it nudges values one slot at a time instead of lifting them straight to their destination. It survives in textbooks because it is easy to explain, not because it is worth using.`,
  },
  {
    no: '02',
    cmd: 'insertion_sort(a)',
    file: 'insertion_sort.py',
    name: 'Insertion',
    blurb: 'WALK BACK TO ITS OWN PLACE',
    big_o: 'O(n²) — O(n) when nearly sorted',
    space: 'O(1)',
    stable: true,
    code: INSERT_CODE,
    run: insertion,
    teach: `The way people sort cards in their hand: pick up the new card and walk it left until you meet a smaller one. Each slot travels exactly as far as it needs to — and that is what sets it apart from the other three, which sweep the whole range whether there is work there or not.

Press the **Nearly sorted** arrangement and compare the "comparisons" column: insertion spends a little over 20, selection still spends the full 276. Real data is mostly nearly sorted — a new log line appended at the end, a list that just gained a row — which is why every standard library still calls insertion sort for the short ranges inside quicksort.

Notice that the left stretch is **not** painted green while it runs, even though it is in order. That is only "in order with itself", not yet "in its final place": a small value not yet reached can still slot into the middle and push the whole stretch right.

The version here swaps two real slots per tick. The textbook version holds the value in hand and shifts each slot right, writing less than half as much — but then the thing being compared lives outside the array and cannot be drawn. The **comparison** count is identical between the two.`,
  },
  {
    no: '03',
    cmd: 'selection_sort(a)',
    file: 'selection_sort.py',
    name: 'Selection',
    blurb: 'SCAN THE RANGE, SWAP ONCE',
    big_o: 'O(n²)',
    space: 'O(1)',
    stable: false,
    code: SELECT_CODE,
    run: selection,
    teach: `Sweep the rest of the range to find the smallest value, then swap it to the front of the range. Exactly one swap per pass.

Its comparison count is **constant**: 276 on a 24-slot array, whatever the starting arrangement. Click through all four arrangements and watch — the other three algorithms jump around, while selection's row does not move. No best case, no worst case, and no way to stop early: it has no way to find out the array is already sorted.

In exchange, it writes the **least**: at most 23 swaps, so 46 writes, against hundreds for bubble. That number is the reason it exists. Writing to flash, to EEPROM cells with a limited write count, or to large records where every copy moves hundreds of bytes — that is where counting writes is the right measure, and selection wins.

It is **not stable**: the long-range swap lifts an element past others equal to it, destroying their original order. Thirty percent of "sorting twice scrambles the order" bugs come from exactly here.`,
  },
  {
    no: '04',
    cmd: 'quicksort(a, 0, len(a) - 1)',
    file: 'quicksort.py',
    name: 'Quick',
    blurb: 'SPLIT IN TWO AROUND A PIVOT',
    big_o: 'O(n log n) — O(n²) on a bad pivot',
    space: 'O(log n)',
    stable: false,
    code: QUICK_CODE,
    run: quick,
    teach: `Pick one slot as the **pivot**, push everything smaller to its left and everything larger to its right. The pivot lands in its permanent place right then — the first green bar appears in the middle of the array rather than at an edge, unlike the other three. Then do exactly the same to the two ranges on either side.

On the **Random** arrangement it spends 88 comparisons, while the other three spend between 179 and 276. That gap widens with n: at 1000 elements it is roughly 10,000 against 500,000.

Now press **Already sorted** and look again. 276 comparisons — the same as selection sort, the worst on the board. Because the pivot is the last slot of the range, and the last slot of a sorted array is the **largest value**: every partition peels off exactly one element, and the recursion tree is n levels deep instead of log n. The most everyday shape of data — already sorted — is its worst case. Real implementations fix this by taking the median of three slots, or by picking the pivot at random.

The "writes" column on that arrangement is steeper still, and half of it is wasted: when \`i\` and \`j\` point at the same slot, the line \`a[i], a[j] = a[j], a[i]\` still runs two assignments to swap a slot with itself. The scoreboard counts what the machine does, not what it ought to have done.`,
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
