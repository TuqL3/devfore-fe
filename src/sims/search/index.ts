import type { SimEntrySearch } from '@/lib/types'

/** Mô phỏng bốn thuật toán tìm kiếm trên mảng.
 *
 *  Bốn thuật toán này cho **cùng một đáp án**, nên đáp án không dạy được gì.
 *  Thứ khác nhau là số phép so sánh, và con số đó chỉ có nghĩa khi đặt cạnh
 *  nhau trên **cùng một mục tiêu** — nên bảng điểm bốn dòng bên phải là trung
 *  tâm của trang, không phải phần trang trí.
 *
 *  Không gồm duyệt đồ thị (BFS/DFS) và so khớp chuỗi: chúng cũng tên là "tìm
 *  kiếm" nhưng cần mô hình dữ liệu và bộ vẽ khác hẳn — đồ thị phải xếp đỉnh,
 *  chuỗi phải gióng hai hàng. Mỗi cái là một engine riêng.
 *
 *  **Mỗi đoạn văn nằm trên đúng một dòng nguồn, dù dài.** `Prose` chạy qua
 *  `hardBreaks`, thứ biến mọi xuống dòng đơn thành ngắt dòng thật. Xem chú thích
 *  ở `sims/linux/index.ts`. */
export const SEARCH_SLUG = 'search-basics'

export const searchEntry: SimEntrySearch = {
  slug: SEARCH_SLUG,
  title: 'Four search algorithms',
  engine: 'search',
  category: 'Algorithms',
  tags: ['linear', 'binary', 'jump', 'interpolation'],
  description: `One array of 64 elements, one target, four ways to go looking. The answer is identical every time — what differs is **how many steps it takes to get there**, and that is the whole subject.

Press **Run** to watch it one comparison at a time: how far the remaining range shrinks, which slot is being opened, why the other half gets thrown away. Click any slot in the array to change the target, then run all four again and compare.`,
  guide: `## How to use it

Pick an algorithm in the left column and press **Run**. The scoreboard on the right holds the comparison count for **all four** on the current target — running one is enough to compare, because the other three are computed up front.

Change the target by clicking any slot in the array. The **a number that is not in the array** button shows how all four end when nothing is found — the part every lecture skips.

## The code panel running alongside

Below the grid is the source of the algorithm currently running. The executing line is highlighted on every tick, and the chips underneath show **what each variable holds** at that exact tick — \`lo\`, \`hi\`, \`mid\` for binary; \`step\`, \`i\` for jump.

This is the part worth looking at. Seeing \`lo = mid + 1\` light up **right after** \`a[mid] < x\` came out true, while the left half of the grid dims — three things joined in a single tick. Reading the code on paper leaves that join for the learner to build in their head, and that is exactly the hard part.

The **comparisons** counter at the top counts the times an element is actually read out and compared, not the lines of code executed. Binary search on the default target: 25 lines executed, but only **5** comparisons.

## This array is deliberately uneven, in three zones

The first third is dense (values 1–3 apart), the middle third is sparse (40–76 apart), the last third is dense again.

That shape is **forced by two tests**, not picked for looks:

1. On an evenly spaced array, interpolation wins on every target, and the learner walks away with the exact opposite of the truth: that interpolation is always fastest.
2. On an array split into just two zones (dense then sparse), interpolation's guess **always undershoots and never overshoots** — the \`hi = pos - 1\` branch is dead code, and the code panel has one line that never lights up.

Three zones satisfy both: the dense first zone pulls the guess short, the dense last zone makes it overshoot.

## Five targets worth clicking

| Click the slot holding | Linear | Binary | Jump | Interpolation |
|---|---|---|---|---|
| \`1276\` — slot 57, the default | 58 | **5** | 10 | 4 |
| \`23\` — slot 10, dense first zone | 11 | 6 | 5 | **11** |
| \`1261\` — slot 50, dense last zone | 51 | 6 | 10 | 7 |
| \`4\` — the first slot | **1** | 6 | 2 | 1 |
| not in the array | 64 | 6 | 4 | 2 |

Those five rows are five lessons, not five measurements:

1. **Row 1** is why binary search exists: 58 against 5.
2. **Row 2** is why interpolation is not always right — it loses to binary search on this very array.
3. **Row 3** is where interpolation **overshoots**: watch the \`hi = pos - 1\` line light up in the code panel.
4. **Row 4** is why linear search is not dead: with the target at the front it wins outright, and it does not need the array sorted.
5. **Row 5** is linear search's worst case — a full sweep of all 64 slots before it dares say "not here".

## Three things this simulation does NOT do

1. **It does not measure real time.** The unit here is **comparisons**, not milliseconds. Deliberately: milliseconds depend on the machine, the CPU cache, the browser — while the comparison count is a property of the algorithm itself. The playback tick is not real speed either: all four finish playing in roughly the same span, so linear search looks *frantic* rather than *slow*.

   A three-way comparison (\`==\`, then \`<\`) counts as **one**. That is the standard textbook count; counting two doubles every number without saying anything more.
2. **It does not count the cost of sorting.** The last three algorithms require a sorted array. Sorting costs O(n log n), more than a single linear sweep — so for "search once over unsorted data", linear is the right answer whatever the scoreboard says.
3. **No graphs, no strings.** BFS/DFS and string matching are also called search, but they are a different model.`,
}
