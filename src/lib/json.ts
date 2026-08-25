/** Kết quả đọc một object JSON do người gõ tay. `value` là null khi văn bản
 *  chưa dùng được — kể cả lúc nó hỏng chứ không phải lúc nó trống, vì gửi lên
 *  server một giá trị cũ trong khi ô đang chứa thứ khác là cách âm thầm nhất để
 *  lưu ra thứ tác giả không nhìn thấy. */
export type JsonObjectResult = {
  value: Record<string, unknown> | null
  /** Rỗng nghĩa là không có gì sai — kể cả khi ô trống. */
  error: string
}

/** Đọc một object JSON. Ô trống là ý định hợp lệ ("không có gì ở đây"), còn
 *  mảng hay số thì không: cả kịch bản mô phỏng lẫn điều kiện chấm đều được
 *  server đọc thành object, nên đưa mảng lên chỉ đổi lỗi cú pháp ở đây thành
 *  lỗi 422 sau khi tác giả tưởng đã lưu xong. */
export function parseJsonObject(text: string): JsonObjectResult {
  if (!text.trim()) return { value: null, error: '' }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { value: null, error: 'invalid JSON' }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { value: null, error: 'expected a JSON object, not an array or a bare value' }
  }
  return { value: parsed as Record<string, unknown>, error: '' }
}
