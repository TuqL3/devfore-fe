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
export const SORT_SLUG = 'sap-xep-co-ban'

export const sortEntry: SimEntrySort = {
  slug: SORT_SLUG,
  title: 'Bốn thuật toán sắp xếp',
  engine: 'sort',
  category: 'Giải thuật',
  tags: ['nổi bọt', 'chèn', 'chọn', 'quicksort'],
  description: `Cùng một mảng 24 cột, bốn cách xếp chúng lại cho đúng thứ tự. Kết quả giống hệt nhau — thứ khác nhau là **tốn bao nhiêu phép so và bao nhiêu lần ghi**, và hai con số đó không đi cùng chiều: thuật toán so ít nhất lại là thuật toán ghi nhiều nhất.

Bấm **Chạy** để xem từng cột nhảy chỗ theo từng dòng code. Rồi đổi **thế mở đầu** ở cột phải và chạy lại: trên mảng đã sắp sẵn, thuật toán tên là "nhanh" tốn gấp 12 lần thuật toán tên là "nổi bọt".`,
  guide: `## Cách dùng

Chọn thuật toán ở cột trái, bấm **Chạy**. Bảng điểm bên phải giữ số phép so và số lần ghi của **cả bốn** trên thế mở đầu hiện tại — chạy một cái là đủ để so, vì ba cái kia được tính sẵn.

Đổi thế mở đầu bằng bốn nút bên phải. Đó là biến quan trọng nhất của cả trang: cùng một thuật toán, đổi thế mở đầu là con số nhảy từ 23 lên 276.

## Cột màu gì nghĩa là gì

| Màu | Nghĩa |
|---|---|
| xám nhạt | ngoài đoạn đang xét, lượt này không đụng tới |
| cam | hai ô đang được đem ra so |
| đỏ | ô vừa bị ghi đè |
| đen / trắng | ô chốt của thuật toán nhanh |
| xanh lá | **đã đứng đúng chỗ cuối cùng**, không bao giờ động vào nữa |

Xanh lá là màu đáng để ý nhất, và nó nghiêm hơn vẻ ngoài: nó **không** có nghĩa "đoạn này đã có thứ tự". Thuật toán chèn giữ cả một đoạn trái luôn có thứ tự với nhau ngay từ đầu, nhưng suốt lượt chạy của nó không ô nào xanh — vì một ô nhỏ chưa xét tới vẫn chen được vào giữa đoạn đó và đẩy tất cả sang phải. Nổi bọt xanh dần từ phải, chọn xanh dần từ trái, nhanh thì xanh từ giữa ra hai bên.

## Bảng code chạy song song

Dưới dải cột là mã nguồn của thuật toán đang chạy. Dòng đang thực thi được tô sáng theo từng nhịp, và mấy cái chip bên dưới là **biến đang giữ giá trị gì** ở đúng nhịp đó.

Đây là chỗ đáng nhìn nhất. Thấy \`a[j-1], a[j] = a[j], a[j-1]\` sáng lên **ngay sau khi** \`a[j-1] > a[j]\` cho ra đúng, và cùng lúc đó cột đang đi bộ lùi thêm một ô — ba thứ nối vào nhau trong một nhịp. Đọc code trên giấy thì phần nối đó người học phải tự dựng trong đầu, mà đó đúng là phần khó.

Chiếu **đủ từng dòng code một**, không bỏ dòng nào, nhịp cố định — nên thời gian ngồi xem tỉ lệ thẳng với lượng việc thuật toán làm, và đó là một cái thước nữa chứ không phải chuyện trình chiếu. Nổi bọt từ thế đã sắp sẵn xong trong 4 giây; cũng nó từ thế ngẫu nhiên mất hơn một phút. Thuật toán nhanh từ thế đã sắp sẵn là vết dài nhất của cả trang: 1336 dòng code chạy, gần hai phút. Không cần xem hết — bảng điểm bên phải đã có số cuối, phần chiếu là để thấy *nó làm gì* chứ không phải để chờ.

## Bốn thế mở đầu, và con số thật của chúng

Số bên trái là **phép so**, số bên phải là **lần ghi**. Một lần đổi chỗ là hai lần ghi.

| Thế mở đầu | Nổi bọt | Chèn | Chọn | Nhanh |
|---|---|---|---|---|
| Ngẫu nhiên | 275 / 320 | 179 / 320 | 276 / **44** | **88** / 100 |
| Gần sắp xếp | 45 / 6 | **26** / 6 | 276 / 6 | 244 / 522 |
| Đã sắp sẵn | **23** / 0 | **23** / 0 | 276 / 0 | 276 / 598 |
| Đảo ngược | 276 / 552 | 276 / 552 | 276 / **24** | 276 / 310 |

Bốn dòng đó là bốn bài học, không phải bốn phép đo:

1. **Dòng 1** là lý do thuật toán nhanh tồn tại: 88 so với 179–276, và khoảng cách đó giãn ra theo n chứ không đứng yên.
2. **Dòng 2** là lý do chèn chưa chết. Dữ liệu thật hầu hết là gần sắp — log mới nối vào cuối, danh sách vừa thêm một dòng — và chèn ăn đứt ở đó: 26 phép so, trong khi chọn vẫn cứ 276.
3. **Dòng 3** là cái bẫy đáng giá nhất của cả trang: dạng dữ liệu đời thường nhất, đã sắp sẵn, lại là **trường hợp tệ nhất** của thuật toán nhanh. Chốt lấy ô cuối đoạn, mà ô cuối của mảng đã sắp chính là số lớn nhất, nên mỗi lần chia chỉ tách ra được một phần tử.
4. **Dòng 4** là chỗ cột "lần ghi" tự nói: cùng 276 phép so như mọi cái khác, nhưng chọn chỉ ghi 24 lần còn nổi bọt ghi 552 — gấp 23 lần. Ghi vào flash hay vào bản ghi to thì đó mới là con số phải nhìn.

Để ý cột của **chọn**: 276 ở cả bốn dòng, không nhúc nhích. Nó không có trường hợp tốt, không có trường hợp xấu, và cũng không dừng sớm được — vì nó không có cách nào biết mảng đã sắp rồi.

## Ba thứ mô phỏng này KHÔNG làm

1. **Không đo thời gian thật.** Đơn vị ở đây là **phép so** và **lần ghi**, không phải mili giây. Cố ý: mili giây phụ thuộc máy, cache CPU, trình duyệt — còn hai con số kia là thuộc tính của chính thuật toán. Nhịp chiếu lại cũng không phải tốc độ thật: cả bốn chiếu xong trong khoảng thời gian bằng nhau, nên nổi bọt trông *gấp gáp* chứ không trông *lâu*.
2. **Không diễn được tính ổn định.** Mảng ở đây là 24 giá trị khác nhau, nên không có hai phần tử bằng nhau để xem cái nào đứng trước — mà đó chính là định nghĩa của ổn định. Muốn thấy nó phải cho mỗi cột một nhãn phụ và vẽ thêm một hàng nhãn, tức là một bộ vẽ khác. Chip *ổn định* / *không ổn định* trên đầu mỗi thuật toán là chữ, không phải thứ chứng minh được trên màn hình này.
3. **Không có trộn và vun đống.** Merge sort và heap sort cũng O(n log n) nhưng cần thứ một dải cột không vẽ được: trộn cần mảng phụ nằm song song, vun đống cần nhìn mảng như một cây nhị phân.`,
}
