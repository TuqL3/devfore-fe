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
export const SEARCH_SLUG = 'tim-kiem-co-ban'

export const searchEntry: SimEntrySearch = {
  slug: SEARCH_SLUG,
  title: 'Bốn thuật toán tìm kiếm',
  engine: 'search',
  category: 'Giải thuật',
  tags: ['tuần tự', 'nhị phân', 'nhảy bước', 'nội suy'],
  description: `Cùng một mảng 64 phần tử, cùng một mục tiêu, bốn cách đi tìm. Đáp án giống hệt nhau — thứ khác nhau là **đi bao nhiêu bước mới tới**, và đó là toàn bộ nội dung của môn này.

Bấm **Chạy** để xem từng phép so sánh một: đoạn còn phải xét co lại tới đâu, ô nào đang được mở ra, vì sao nửa còn lại bị vứt. Bấm bất kỳ ô nào trong mảng để đổi mục tiêu, rồi chạy lại cả bốn mà so.`,
  guide: `## Cách dùng

Chọn thuật toán ở cột trái, bấm **Chạy**. Bảng điểm bên phải giữ số phép so sánh của **cả bốn** cho mục tiêu hiện tại — chạy một cái là đủ để so, vì ba cái kia được tính sẵn.

Đổi mục tiêu bằng cách bấm vào một ô bất kỳ trong mảng. Nút **một số không có trong mảng** cho xem cả bốn kết thúc thế nào khi không tìm thấy — phần mà mọi bài giảng đều lướt qua.

## Bảng code chạy song song

Dưới lưới là mã nguồn của thuật toán đang chạy. Dòng đang thực thi được tô sáng theo từng nhịp, và mấy cái chip bên dưới là **biến đang giữ giá trị gì** ở đúng nhịp đó — \`lo\`, \`hi\`, \`mid\` với nhị phân; \`step\`, \`i\` với nhảy bước.

Đây là chỗ đáng nhìn nhất. Thấy \`lo = mid + 1\` sáng lên **ngay sau khi** \`a[mid] < x\` cho ra đúng, và cùng lúc đó nửa trái của lưới mờ đi — ba thứ nối vào nhau trong một nhịp. Đọc code trên giấy thì phần nối đó người học phải tự dựng trong đầu, mà đó đúng là phần khó.

Bộ đếm **phép so sánh** góc trên đếm số lần thật sự đọc một phần tử ra so, không phải số dòng code đã chạy. Nhị phân với mục tiêu mặc định: 25 dòng chạy, nhưng chỉ **5** phép so.

## Mảng này cố tình lệch, ba vùng

Một phần ba đầu dày (giá trị cách nhau 1–3), một phần ba giữa thưa (cách nhau 40–76), một phần ba cuối lại dày.

Hình dạng đó bị **hai bài kiểm ép ra**, không phải chọn cho vui:

1. Mảng tăng đều thì nội suy thắng ở mọi mục tiêu, và người học rút ra kết luận ngược hẳn với sự thật: cứ nội suy là nhanh nhất.
2. Mảng chỉ chia hai vùng (dày trước, thưa sau) thì dự đoán của nội suy **luôn hụt, không bao giờ vượt** — nhánh \`hi = pos - 1\` trong code chết hẳn, và bảng code có một dòng không bao giờ sáng.

Ba vùng thoả cả hai: vùng dày đầu kéo dự đoán hụt, vùng dày cuối làm nó vượt.

## Năm mục tiêu đáng bấm

| Bấm ô có giá trị | Tuần tự | Nhị phân | Nhảy bước | Nội suy |
|---|---|---|---|---|
| \`1276\` — ô 57, mặc định | 58 | **5** | 10 | 4 |
| \`23\` — ô 10, vùng dày đầu | 11 | 6 | 5 | **11** |
| \`1261\` — ô 50, vùng dày cuối | 51 | 6 | 10 | 7 |
| \`4\` — ô đầu tiên | **1** | 6 | 2 | 1 |
| không có trong mảng | 64 | 6 | 4 | 2 |

Năm dòng đó là năm bài học, không phải năm phép đo:

1. **Dòng 1** là lý do nhị phân tồn tại: 58 so với 5.
2. **Dòng 2** là lý do nội suy không phải lúc nào cũng đúng — nó thua cả nhị phân trên chính mảng này.
3. **Dòng 3** là chỗ nội suy **đoán vượt**: xem dòng \`hi = pos - 1\` sáng lên trong bảng code.
4. **Dòng 4** là lý do tuần tự chưa chết: mục tiêu ở đầu thì nó thắng tuyệt đối, và nó không cần mảng phải sắp.
5. **Dòng 5** là trường hợp tệ nhất của tuần tự — quét trọn 64 ô rồi mới dám nói "không có".

## Ba thứ mô phỏng này KHÔNG làm

1. **Không đo thời gian thật.** Đơn vị ở đây là **phép so sánh**, không phải mili giây. Cố ý: mili giây phụ thuộc máy, cache CPU, trình duyệt — còn số phép so sánh là thuộc tính của chính thuật toán. Nhịp chiếu lại cũng không phải tốc độ thật: cả bốn chiếu xong trong khoảng thời gian bằng nhau, nên tuần tự trông *gấp gáp* chứ không trông *lâu*.

   Một phép so ba nhánh (\`==\`, rồi \`<\`) đếm là **một**. Đó là cách đếm chuẩn của sách giáo khoa; đếm hai thì mọi con số đội gấp đôi mà không nói thêm điều gì.
2. **Không tính chi phí sắp xếp.** Ba thuật toán cuối đòi mảng đã sắp. Sắp tốn O(n log n), đắt hơn một lần quét tuần tự — nên "tìm một lần trên dữ liệu chưa sắp" thì tuần tự mới là đáp án đúng, dù bảng điểm nói gì.
3. **Không có đồ thị, không có chuỗi.** BFS/DFS và so khớp chuỗi cũng gọi là tìm kiếm nhưng là mô hình khác.`,
}
