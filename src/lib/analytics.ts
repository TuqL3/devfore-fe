/** Đo xem có ai bấm vào link chia sẻ không.
 *
 *  Umami, không phải Google Analytics: nó không đặt cookie, không lưu địa chỉ IP,
 *  và không cần một biểu ngữ xin phép — mà một biểu ngữ xin phép trên trang công
 *  khai `/r/:token` là đúng thứ giết chết cái phễu vừa dựng.
 *
 *  Không cấu hình thì không tải gì. Bốn dòng dưới đây là toàn bộ lý do: đo đạc là
 *  thứ tuỳ chọn của môi trường, không phải một phụ thuộc của ứng dụng, và bản
 *  dựng dev phải chạy được mà không cần dựng thêm một máy chủ thống kê.
 *
 *  ponytail: chèn thẻ script bằng tay thay vì thêm gói `@umami/*`. Gói đó bọc
 *  đúng năm dòng này. */
const SRC = import.meta.env.VITE_UMAMI_SRC as string | undefined
const SITE = import.meta.env.VITE_UMAMI_ID as string | undefined

export function startAnalytics() {
  if (!SRC || !SITE) return
  const s = document.createElement('script')
  s.src = SRC
  s.defer = true
  s.dataset.websiteId = SITE
  // Không chặn render: `defer` để nó chạy sau khi trang dựng xong. Một trang
  // trắng vì máy chủ thống kê chậm là đổi trải nghiệm lấy số liệu.
  document.head.appendChild(s)
}

/** Đếm một hành động có tên. Chỉ dùng cho vài chỗ mà lượt xem trang không trả
 *  lời được — "có bao nhiêu người lạ bấm Thử ca này", chứ không phải mọi cú bấm
 *  trên trang web.
 *
 *  Chưa cắm thống kê thì đây là hàm rỗng, nên chỗ gọi không cần kiểm tra gì. */
export function track(event: string, data?: Record<string, string | number>) {
  const w = window as unknown as {
    umami?: { track: (e: string, d?: Record<string, unknown>) => void }
  }
  w.umami?.track(event, data)
}
