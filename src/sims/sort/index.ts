import type { SimEntrySort } from '@/lib/types'

/** Mô phỏng bốn thuật toán sắp xếp trên cùng một mảng.
 *
 *  Bốn thuật toán này cho **cùng một kết quả**, nên kết quả không dạy được gì —
 *  giống hệt lý do của mô phỏng tìm kiếm. Nhưng ở đây thứ khác nhau có **hai**
 *  con số chứ không phải một: phép so và lần ghi. Chọn thắng tuyệt đối về lần ghi
 *  và thua tuyệt đối về phép so, nên một cột điểm duy nhất sẽ nói dối về nó.
 *
 *  Và có một biến thứ hai mà bên tìm kiếm không có: **thứ tự ban đầu**. Cùng một
 *  mảng đã sắp sẵn, nổi bọt tốn 23 phép so còn thuật toán nhanh tốn 276 — đúng
 *  chiều ngược với tên của chúng. Nên bốn nút thế mở đầu ở cột phải là trung tâm
 *  của trang, không phải phần trang trí.
 *
 *  Không gồm trộn (merge) và vun đống (heap): cả hai đều O(n log n) như nhanh
 *  nhưng cần thêm thứ mà một dải cột không vẽ được — trộn cần mảng phụ nằm song
 *  song, vun đống cần nhìn mảng như một cây nhị phân. Mỗi cái là một bộ vẽ riêng.
 *
 *  **Mỗi đoạn văn nằm trên đúng một dòng nguồn, dù dài.** `Prose` chạy qua
 *  `hardBreaks`, thứ biến mọi xuống dòng đơn thành ngắt dòng thật. Xem chú thích
 *  ở `sims/linux/index.ts`. */
export const SORT_SLUG = 'sorting-basics'

export const sortEntry: SimEntrySort = {
  slug: SORT_SLUG,
  title: 'Four sorting algorithms',
  engine: 'sort',
  category: 'Algorithms',
  tags: ['bubble', 'insertion', 'selection', 'quicksort'],
  description: `One array of 24 bars, four ways to put it in order. The result is identical every time — what differs is **how many comparisons and how many writes it costs**, and those two numbers do not move together: the algorithm that compares least is the one that writes most.

Press **Run** to watch each bar move, line of code by line of code. Then change the **starting arrangement** in the right column and run again: on an already-sorted array, the algorithm named "quick" costs 12× the one named "bubble".`,
  guide: `## How to use it

Pick an algorithm in the left column and press **Run**. The scoreboard on the right holds the comparisons and writes for **all four** on the current starting arrangement — running one is enough to compare, because the other three are computed up front.

Change the starting arrangement with the four buttons on the right. That is the most important variable on the page: same algorithm, different arrangement, and the number jumps from 23 to 276.

## What the bar colours mean

| Colour | Meaning |
|---|---|
| pale grey | outside the range under consideration, untouched this pass |
| orange | the two slots being compared |
| red | a slot that was just overwritten |
| black / white | quicksort's pivot |
| green | **in its final position**, never touched again |

Green is the colour worth watching, and it is stricter than it looks: it does **not** mean "this stretch is in order". Insertion sort keeps its whole left stretch in order with itself from the very first step, yet nothing turns green during its run — because a small value it has not reached yet can still slot into the middle of that stretch and push everything right. Bubble greens from the right, selection from the left, quicksort from the middle outwards.

## The code panel running alongside

Below the bars is the source of the algorithm currently running. The executing line is highlighted on every tick, and the chips underneath show **what each variable holds** at that exact tick.

This is the part worth looking at. Seeing \`a[j-1], a[j] = a[j], a[j-1]\` light up **right after** \`a[j-1] > a[j]\` came out true, while the bar walks back one more slot — three things joined in a single tick. Reading the code on paper leaves that join for the learner to build in their head, and that is exactly the hard part.

It plays **every line of code, one at a time**, skipping none, at a fixed tick — so the time you spend watching is proportional to the work the algorithm does, and that is another measuring stick rather than a presentation detail. Bubble sort from the already-sorted arrangement finishes in 4 seconds; the same algorithm from random takes over a minute. Quicksort from already-sorted is the longest trace on the page: 1336 lines of code executed, close to two minutes. There is no need to watch it all — the scoreboard on the right already has the final numbers; the playback is there to show *what it does*, not to be waited out.

## Four starting arrangements, and their real numbers

The left number is **comparisons**, the right one is **writes**. One swap is two writes.

| Starting arrangement | Bubble | Insertion | Selection | Quick |
|---|---|---|---|---|
| Random | 275 / 320 | 179 / 320 | 276 / **44** | **88** / 100 |
| Nearly sorted | 45 / 6 | **26** / 6 | 276 / 6 | 244 / 522 |
| Already sorted | **23** / 0 | **23** / 0 | 276 / 0 | 276 / 598 |
| Reversed | 276 / 552 | 276 / 552 | 276 / **24** | 276 / 310 |

Those four rows are four lessons, not four measurements:

1. **Row 1** is why quicksort exists: 88 against 179–276, and that gap widens with n rather than staying put.
2. **Row 2** is why insertion sort is not dead. Real data is mostly nearly sorted — a new log line appended at the end, a list that just gained one row — and insertion wins outright there: 26 comparisons, while selection still spends 276.
3. **Row 3** is the most valuable trap on the page: the most everyday shape of data, already sorted, is quicksort's **worst case**. The pivot is the last slot of the range, and the last slot of a sorted array is the largest value, so every partition peels off exactly one element.
4. **Row 4** is where the "writes" column speaks for itself: the same 276 comparisons as everything else, but selection writes only 24 times while bubble writes 552 — 23× more. Writing to flash, or to large records, is when that becomes the number to look at.

Watch selection's column: 276 on all four rows, unmoved. It has no best case, no worst case, and no way to stop early — because it has no way to find out the array is already sorted.

## Three things this simulation does NOT do

1. **It does not measure real time.** The units here are **comparisons** and **writes**, not milliseconds. Deliberately: milliseconds depend on the machine, the CPU cache, the browser — while those two numbers are properties of the algorithm itself. The playback tick is not real speed either: all four finish playing in roughly the same span, so bubble sort looks *frantic* rather than *slow*.
2. **It cannot demonstrate stability.** The array here is 24 distinct values, so there are no two equal elements to watch for which one comes first — and that is precisely the definition of stability. Showing it would need a second label on every bar and an extra row of labels, which is a different renderer. The *stable* / *unstable* chip on each algorithm is a claim in text, not something this screen proves.
3. **No merge sort or heap sort.** Both are O(n log n) like quicksort but need something a strip of bars cannot draw: merge needs a second array running alongside, heap needs the array seen as a binary tree.`,
}
