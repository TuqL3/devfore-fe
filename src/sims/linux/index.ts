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
export const LINUX_SLUG = 'linux-basics'

export const linuxEntry: SimEntryLinux = {
  slug: LINUX_SLUG,
  title: 'Ten Linux commands',
  engine: 'linux',
  category: 'Systems',
  tags: ['ls', 'grep', 'chmod', 'curl'],
  description: `Ten commands are enough to live on a Linux server. One card per command — press **Run** and the output appears line by line: the tree grows, the packet crosses each hop, the nine permission cells light up group by group. Watch it, instead of reading it and imagining.

All ten share **one directory tree**: run \`cd\` on card 03, go back up and press \`ls\` on card 02, and you land somewhere new; \`mkdir\` creates a directory and \`find\` then turns it up. The Rebuild button puts everything back.`,
  guide: `## How to use it

Each card is one command, arguments already written out. Press **Run**. Press it again to watch it once more.

There is nothing to type, and that is on purpose: the thing worth looking at is *what the command produces*. To type for real, the container lab has an actual Linux shell.

## The tree at startup

The bar at the top of the page says \`~/project\`, and \`pwd\` agrees — \`~\` is shorthand for the **home directory**, here \`/home/dev\`. Two spellings, one place.

\`\`\`
/home/dev                    ← "~" points here
└── project                  ← where you stand on opening
    ├── .env                 600 — owner-only read
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

## Things this simulation does NOT do

1. **It does not enforce permissions.** Run \`chmod 000\` and \`grep\` still reads the file. There is no notion of "another user" here to refuse anyone — the permission column is there to be seen, not to block.
2. **There is no shell.** No \`|\` pipes, no \`&&\`, no environment variables, and no \`cat\` to open a file and read it. The whole command line is pre-written and cannot be edited.
3. **Exactly one example per command.** The arguments are fixed, so \`curl\` only ever goes to \`/health\` and no click produces a 500; \`chmod\` only plays the \`600 → 640\` direction. States you cannot click your way to are described in words under each card's "Why it is worth learning".
4. **Everything "outside" is staged.** \`curl\` knows exactly three routes (\`/health\`, \`/api/users\`, \`/api/orders\`) and answers 404 for the rest. \`ssh\` stops once the handshake completes and never opens a shell. The \`tail -f\` log is six lines on a loop rather than random — press again and you get the same sequence.
5. **Nothing is saved.** The tree lives in the browser's memory. Close the tab and everything \`mkdir\` and \`chmod\` did is gone, exactly as if you had pressed **Rebuild**.

The first three disappear in the **container lab** — that one is real Linux, anything can be typed, and permissions really do block.

## An order worth clicking

The ten cards work on their own, but these three chains have to be clicked back to back to show what they teach. Each chain starts from **a freshly opened page or a fresh Rebuild**.

1. **08 \`chmod\` → 02 \`ls -la\`.** Run \`chmod\` first, then go up and press \`ls\`: the permission column on \`.env\` changes from \`-rw-------\` to \`-rw-r-----\`. Same \`ls\` command, different output — because the file changed.
2. **03 \`cd\` → 02 \`ls -la\`.** Same command, same \`.\` argument, a completely different listing. That is the entire meaning of "current directory".
3. **03 \`cd\` → 04 \`mkdir -p\`.** The argument to \`mkdir\` is a relative path, so where the new branch grows depends on where you were just standing.

Run chain 2 and chain 1 shows nothing: after \`cd\`, \`ls .\` is looking at \`~/project/src/api\` and \`.env\` is not in there. Press **Rebuild** and start over — and that snag is exactly the lesson of chain 2.

Then compare **05 \`grep -R\`** with **06 \`find\`**: two commands that sound alike, one digging through file contents, the other reading file names.`,
}
