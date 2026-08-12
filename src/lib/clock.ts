/** mm:ss dưới một giờ, h:mm:ss trên đó. Giây trần là con số duy nhất người ta
 *  không tự quy đổi trong đầu khi so hai lượt.
 *
 *  Ở `lib` chứ không nằm trong component nào: mô phỏng CI/CD, dải sự cố và báo
 *  cáo ca trực đều đọc cùng một khoảng thời gian, và ba bản sao là ba cơ hội để
 *  một cái làm tròn khác hai cái kia.
 *
 *  `SimTimeline` vẫn giữ bản riêng của nó, cùng thân hàm — nó nằm ngoài phạm vi
 *  đã báo cho lần sửa này. Gộp nốt là một dòng import, không phải một dự án. */
export function clockLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`
}
