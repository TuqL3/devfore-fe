
/** Hai nút mở đúng hộp soạn bài của X và Facebook, kèm sẵn câu chữ.
 *
 *  Không nhúng SDK của bên nào: cả hai đều có URL chia sẻ dạng GET, và nhúng vào
 *  đổi lấy một script bên thứ ba theo dõi mọi người mở trang — trả một cái giá
 *  riêng tư cho một thứ hai cái link `https://` đã làm xong.
 *
 *  Facebook không nhận chữ soạn sẵn từ URL (họ bỏ tham số `quote` từ 2017), nên
 *  câu chữ ở đó đến từ thẻ `og:title` của trang. Đó chính là lý do endpoint
 *  preview bên server tồn tại — không có nó thì nút này mở ra một ô trắng. */
export function ShareTargets({ url, text }: { url: string; text: string }) {
  const enc = encodeURIComponent
  const targets = [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { id: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-fg-subtle">Post to</span>
      {targets.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-border-strong px-3 py-1 text-xs text-fg-muted transition hover:border-accent hover:text-fg"
        >
          {s.label}
        </a>
      ))}
    </div>
  )
}
