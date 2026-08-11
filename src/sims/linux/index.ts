import type { SimEntryLinux } from '@/lib/types'

/** Mô phỏng mười lệnh Linux.
 *
 *  Nó **không** thay lab container. Container dạy gõ trong shell thật; cái này
 *  dạy thứ shell thật không vẽ ra — `chmod 755` đổi cái gì, `mkdir -p` mọc thêm
 *  mấy nhánh, gói tin của `curl` đi qua đâu. Hai thứ bù nhau, và trang này có
 *  một dòng chỉ sang bên kia cho ai muốn gõ thật.
 *
 *  Nội dung của từng lệnh nằm ở `commands.ts` cạnh phần chạy nó — tách chữ ra
 *  một file riêng thì sửa một câu là sửa hai chỗ.
 *
 *  **Mỗi đoạn văn phải nằm trên đúng một dòng nguồn, dù dài.** `Prose` chạy qua
 *  `hardBreaks` (`MarkdownEditor.tsx`), thứ biến mọi xuống dòng đơn thành ngắt
 *  dòng thật — gói lại cho vừa 80 cột trong file là gói luôn cả trên màn hình,
 *  và chữ đứng thành một cột hẹp giữa một thẻ rộng. Chỉ khối ``` là giữ nguyên
 *  xuống dòng. Luật này áp cho cả `teach` ở `commands.ts`. */
export const LINUX_SLUG = 'linux-co-ban'

export const linuxEntry: SimEntryLinux = {
  slug: LINUX_SLUG,
  title: 'Mười lệnh Linux',
  engine: 'linux',
  category: 'Hệ thống',
  tags: ['ls', 'grep', 'chmod', 'curl'],
  description: `Mười lệnh đủ để sống trong một máy chủ Linux. Mỗi lệnh một thẻ, bấm **Chạy** là kết quả hiện ra từng dòng một — cái cây mọc ra, gói tin đi qua từng chặng, chín ô quyền sáng lên theo nhóm. Xem, không phải đọc rồi tưởng tượng.

Cả mười lệnh dùng **chung một cây thư mục**: chạy \`cd\` ở thẻ 03 rồi quay lên bấm \`ls\` ở thẻ 02 là thấy chỗ mới, \`mkdir\` tạo thư mục thì \`find\` tìm ra nó. Nút Dựng lại đưa mọi thứ về như cũ.`,
  guide: `## Cách dùng

Mỗi thẻ là một lệnh, viết sẵn cả tham số. Bấm **Chạy**. Bấm lại để xem lần nữa.

Không gõ được gì, và đó là chủ ý: thứ đáng nhìn là *lệnh đó làm ra cái gì*. Muốn gõ thật thì lab container có shell Linux thật.

## Cây thư mục lúc mở

Thanh trên đầu trang viết \`~/project\`, còn \`pwd\` cũng nói vậy — \`~\` là lối viết tắt của **thư mục nhà**, ở đây là \`/home/dev\`. Hai cách viết chỉ cùng một chỗ.

\`\`\`
/home/dev                    ← "~" trỏ vào đây
└── project                  ← bạn đang đứng đây khi mới mở
    ├── .env                 600 — chỉ chủ sở hữu đọc
    ├── .git/
    │   └── HEAD
    ├── config/
    │   └── app.yaml
    ├── logs/
    │   └── api.log
    ├── package.json
    ├── README.md
    └── src/
        ├── app.ts
        └── api/
            └── v1/
                └── route.ts
\`\`\`

## Những thứ mô phỏng này KHÔNG làm

1. **Không kiểm quyền.** \`chmod 000\` rồi \`grep\` vẫn đọc được file đó. Ở đây không có khái niệm "người dùng khác" để mà từ chối ai — cột quyền là để nhìn, không phải để chặn.
2. **Không có shell.** Không đường ống \`|\`, không \`&&\`, không biến môi trường, và không có \`cat\` để mở một file ra đọc. Cả dòng lệnh viết sẵn, không gõ được gì.
3. **Mỗi lệnh đúng một ví dụ.** Tham số cố định nên \`curl\` chỉ đi tới \`/health\`, không bấm ra được câu 500; \`chmod\` chỉ diễn một chiều \`600 → 640\`. Mấy trạng thái không bấm tới được thì tả bằng lời ở mục "Vì sao đáng học" của từng thẻ.
4. **Mấy chỗ "bên ngoài" đều là dựng sẵn.** \`curl\` biết đúng ba đường (\`/health\`, \`/api/users\`, \`/api/orders\`), còn lại trả 404. \`ssh\` dừng ở lúc bắt tay xong, không mở shell. Log của \`tail -f\` là sáu dòng chạy vòng chứ không phải ngẫu nhiên — bấm lại vẫn đúng chuỗi đó.
5. **Không lưu gì.** Cây thư mục nằm trong RAM của trình duyệt. Đóng tab là mất hết những gì \`mkdir\` và \`chmod\` đã làm, y như bấm **Dựng lại**.

Ba cái đầu biến mất ở **lab container** — chỗ đó là Linux thật, gõ gì cũng được, và quyền thì chặn thật.

## Thứ tự đáng bấm

Mười thẻ bấm riêng lẻ được, nhưng ba mạch này bấm liền nhau mới thấy được điều chúng dạy. Mỗi mạch tính từ lúc **vừa mở trang hoặc vừa bấm Dựng lại**.

1. **08 \`chmod\` → 02 \`ls -la\`.** Chạy \`chmod\` trước, rồi lên bấm \`ls\`: cột quyền của \`.env\` đổi từ \`-rw-------\` sang \`-rw-r-----\`. Cùng một lệnh \`ls\`, kết quả khác — vì file đã khác.
2. **03 \`cd\` → 02 \`ls -la\`.** Cùng một lệnh, cùng tham số \`.\`, ra danh sách khác hẳn. Đó là toàn bộ ý nghĩa của "thư mục hiện hành".
3. **03 \`cd\` → 04 \`mkdir -p\`.** Tham số của \`mkdir\` là đường dẫn tương đối, nên nhánh mới mọc ở đâu là do bạn vừa đứng ở đâu.

Chạy mạch 2 rồi thì mạch 1 không còn thấy gì: sau \`cd\`, \`ls .\` đang nhìn vào \`~/project/src/api\` và \`.env\` không nằm trong đó. Bấm **Dựng lại** rồi làm lại — mà chỗ vướng đó chính là bài học của mạch 2.

Rồi so **05 \`grep -R\`** với **06 \`find\`**: hai lệnh nghe giống nhau, một cái lục ruột file, một cái đọc tên file.`,
}
