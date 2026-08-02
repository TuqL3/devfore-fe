import { useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** In markdown a lone newline continues the paragraph, so a list of commands
 *  typed one per line arrives as one run-on sentence. Two trailing spaces is
 *  markdown's own hard break, so the text stays valid markdown either way.
 *  ponytail: split on ``` to leave fenced blocks alone; `~~~` fences and
 *  indented code blocks are not handled — no hint here uses them. */
function hardBreaks(md: string): string {
  return md
    .split(/(```[\s\S]*?```)/g)
    .map((seg, i) => (i % 2 ? seg : seg.replace(/(?<=[^\n ])\n(?!\n|$)/g, '  \n')))
    .join('')
}

/** Rendered markdown, styled the same everywhere it appears. Exported because
 *  the editor preview and the student's hint tab must not drift apart — a hint
 *  that looks one way to its author and another to the learner is a bug. */
export function Prose({ children }: { children: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none text-sm prose-pre:overflow-x-auto">
      <Markdown remarkPlugins={[remarkGfm]}>{hardBreaks(children)}</Markdown>
    </div>
  )
}

type Tool =
  | {
      label: string
      title: string
      wrap: [string, string]
      mono?: boolean
      /** Selection spanning lines gets a fenced block instead — backticks around
       *  several lines are not code in markdown, they are stray backticks. */
      fence?: true
    }
  | { label: string; title: string; prefix: string }

const TOOLS: Tool[] = [
  { label: 'B', title: 'Đậm', wrap: ['**', '**'] },
  { label: 'I', title: 'Nghiêng', wrap: ['*', '*'] },
  { label: '</>', title: 'Mã', wrap: ['`', '`'], mono: true, fence: true },
  { label: '•', title: 'Danh sách', prefix: '- ' },
  { label: '1.', title: 'Danh sách đánh số', prefix: '1. ' },
  { label: '🔗', title: 'Liên kết', wrap: ['[', '](url)'] },
]

/** A selection that is nothing but one marked-up run. The inner part may not
 *  contain marks itself, so `*a* và *b*` is left alone rather than mangled into
 *  `a* và *b`. */
const WRAPPED = /^(\*{1,3}|_{1,3}|`{1,3})([^*_`]+)\1$/

/** The block form of the same thing. Body in group 2, to match WRAPPED. */
const FENCED = /^(```)\n([\s\S]*)\n```$/

/** A textarea with the six bits of markdown anyone actually uses, and a preview
 *  tab. A WYSIWYG editor here would mean storing HTML, sanitising it on the way
 *  out, and a megabyte of editor — for text that is already markdown elsewhere
 *  in this app. */
export function MarkdownEditor({
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)

  /** Puts the caret back where the author left it — a toolbar that dumps you at
   *  the end of the box is a toolbar you stop using. */
  const restore = (start: number, end: number) => {
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(start, end)
    })
  }

  const apply = (tool: Tool) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el

    if ('prefix' in tool) {
      // Whole lines, not the selection: a list marker in the middle of a line
      // is not a list. Empty selection means the line the caret sits on.
      const from = value.lastIndexOf('\n', s - 1) + 1
      const to = value.indexOf('\n', e)
      const end = to === -1 ? value.length : to
      const block = value
        .slice(from, end)
        .split('\n')
        .map((l) => tool.prefix + l)
        .join('\n')
      onChange(value.slice(0, from) + block + value.slice(end))
      restore(from, from + block.length)
      return
    }

    const sel = value.slice(s, e)
    const multiline = tool.fence && sel.includes('\n')
    const [open, close] = multiline ? ['```\n', '\n```'] : tool.wrap

    // Whatever emphasis the selection already carries comes off first: bold on
    // *free -h* means bold, not the ***free -h*** you get by wrapping again.
    // Clicking the same button twice then removes the marks instead of nesting.
    const bare = (multiline ? FENCED : WRAPPED).exec(sel)?.[2] ?? sel
    const body = sel === open + bare + close ? bare : open + bare + close
    const caret = sel === open + bare + close ? 0 : open.length

    onChange(value.slice(0, s) + body + value.slice(e))
    // Nothing selected: land inside the marks, ready to type.
    restore(s + caret, s + caret + (body.length - 2 * caret))
  }

  return (
    <div className="overflow-hidden rounded-md border border-border-strong bg-bg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
      <div className="flex items-center gap-1 border-b border-border bg-muted/50 px-2 py-1">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            aria-label={t.title}
            disabled={preview}
            // Keeps the caret and the selection in the textarea — without this
            // the button takes focus first and the toolbar acts on nothing.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(t)}
            className={
              'rounded px-2 py-1 text-xs text-fg-muted transition hover:bg-muted hover:text-fg-strong disabled:opacity-40 ' +
              ('mono' in t && t.mono ? 'font-mono' : '')
            }
          >
            {t.label}
          </button>
        ))}

        <span className="ml-auto flex gap-1">
          {[
            { on: false, label: 'Soạn' },
            { on: true, label: 'Xem trước' },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setPreview(t.on)}
              aria-pressed={preview === t.on}
              className={
                'rounded px-2 py-1 text-xs transition ' +
                (preview === t.on
                  ? 'bg-bg font-medium text-fg-strong'
                  : 'text-fg-muted hover:text-fg-strong')
              }
            >
              {t.label}
            </button>
          ))}
        </span>
      </div>

      {preview ? (
        // Same height as the box it replaces, so switching tabs does not make
        // the form jump under the pointer.
        <div className="overflow-y-auto px-3 py-2.5" style={{ minHeight: rows * 24 }}>
          {value.trim() ? (
            <Prose>{value}</Prose>
          ) : (
            <p className="text-sm text-fg-subtle">Chưa có nội dung.</p>
          )}
        </div>
      ) : (
        // field-sizing grows the box with the text: a hint three paragraphs long
        // was being written through a five-line window. `rows` is the minimum,
        // and the fallback where the browser has no field-sizing yet.
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="field-sizing-content block max-h-[60vh] w-full resize-y bg-transparent px-3 py-2.5 text-fg outline-none placeholder:text-fg-subtle"
        />
      )}
    </div>
  )
}
