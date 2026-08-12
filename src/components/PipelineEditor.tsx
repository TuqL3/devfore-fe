import { useRef, useState } from 'react'

import { indent } from '@/lib/sim'
import { useT } from '@/lib/i18n'

/** Ô soạn pipeline, dùng chung cho sân chơi và cho lab.
 *
 *  Lý do nó là component riêng chứ không phải một `<textarea>` trần: phím Tab.
 *  YAML sống bằng thụt đầu dòng, mà Tab trong textarea mặc định là nhảy focus
 *  sang nút kế tiếp — nên đang gõ dở lại bị bắn xuống nút Chạy.
 *
 *  Chiếm phím Tab thì cắt mất đường đi bàn phím ra khỏi ô, nên có lối thoát tiêu
 *  chuẩn: **Esc rồi Tab**. Bấm Esc một cái là Tab kế tiếp đi ra ngoài như bình
 *  thường, sau đó ô lại nhận Tab như cũ. Người dùng chuột không mất gì, người
 *  dùng bàn phím không bị nhốt.
 */
export function PipelineEditor({
  value,
  onChange,
  rows = 12,
  className = '',
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  className?: string
  /** Cho phía ngoài chạm tới chính cái textarea. Có đúng một người dùng: nút chèn
   *  step ở bảng catalog, cần đọc chỗ con trỏ đang đứng rồi đặt nó lại sau khi
   *  chèn. Truyền ref vào rẻ hơn nhiều so với dựng thêm một tầng state chỉ để
   *  theo dõi con trỏ, mà con trỏ thì đổi theo từng phím gõ. */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const t = useT()
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = inputRef ?? own
  // Esc "tháo khoá" đúng một lần cho phím Tab ngay sau đó.
  const [escaped, setEscaped] = useState(false)

  return (
    <>
      <textarea
        ref={ref}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEscaped(true)
            return
          }
          if (e.key !== 'Tab' || escaped) {
            setEscaped(false)
            return
          }
          e.preventDefault()
          const el = e.currentTarget
          const next = indent(value, el.selectionStart, el.selectionEnd, e.shiftKey)
          onChange(next.text)
          // React vẽ lại xong mới đặt được con trỏ; đặt ngay bây giờ thì lần vẽ
          // kế tiếp ném nó về cuối ô.
          requestAnimationFrame(() => {
            const node = ref.current
            if (node) node.setSelectionRange(next.start, next.end)
          })
        }}
        onBlur={() => setEscaped(false)}
        rows={rows}
        className={
          'w-full resize-y bg-bg px-3 py-2.5 font-mono text-sm leading-relaxed text-fg outline-none ' +
          className
        }
      />
      {/* Nói ra, vì một ô nuốt phím Tab mà không báo gì là một ô hỏng dưới mắt
          người dùng bàn phím. */}
      <p className="px-3 pb-1.5 text-[10px] text-fg-subtle">
        {t('pipeline.tabHint')}
      </p>
    </>
  )
}
