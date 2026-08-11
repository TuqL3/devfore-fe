/** Đoạn mở đầu của một khối markdown, ở dạng chữ trơn.
 *
 *  Dùng cho thẻ trong danh sách: đề bài đầy đủ có tiêu đề, khối lệnh và trích
 *  dẫn — đổ nguyên vào một ô rộng nửa màn hình thì code tràn ngang và thẻ dài cả
 *  nghìn pixel. Màn làm bài mới là chỗ đọc đề; ở đây chỉ cần đủ để chọn.
 *
 *  Lấy **đoạn văn đầu tiên**, không phải N ký tự đầu: cắt giữa một khối lệnh cho
 *  ra chuỗi rác, còn tiêu đề thì lặp lại đúng cái tên đã in ngay bên trên. */
export function mdSummary(md: string, maxLen = 180): string {
  const lines = md.split('\n')
  const para: string[] = []
  let inFence = false

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('```')) {
      inFence = !inFence
      // Khối lệnh kết thúc mà đã gom được chữ thì dừng — đoạn văn đã xong.
      if (!inFence && para.length) break
      continue
    }
    if (inFence) continue
    // Tiêu đề, trích dẫn, gạch ngang: không phải câu mở đầu.
    if (!line || line.startsWith('#') || line.startsWith('>') || /^[-*_]{3,}$/.test(line)) {
      if (para.length) break
      continue
    }
    para.push(line)
  }

  return clamp(stripInline(para.join(' ')), maxLen)
}

/** Bỏ dấu markdown trong dòng, giữ nguyên chữ. Không phải parser: chỉ mấy dấu
 *  hay gặp trong một câu mở đầu. */
function stripInline(s: string): string {
  return s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [chữ](link) → chữ
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cắt ở ranh giới từ. Cắt giữa từ đọc như lỗi hiển thị, không như một bản tóm
 *  tắt. */
function clamp(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  const cut = s.slice(0, maxLen)
  const space = cut.lastIndexOf(' ')
  return (space > maxLen * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}
