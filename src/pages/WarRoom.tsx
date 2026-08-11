import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import { mdSummary } from '@/lib/mdSummary'
import { Card, ErrorBox } from '@/components/ui'
import { ChevronRightIcon, ClockIcon, TerminalIcon } from '@/components/icons'
import type { Lab, LabSession } from '@/lib/types'

/** War Room — thử thách có hạn giờ.
 *
 *  Khác lab của khoá học ở ba chỗ: vào thẳng từ nav không cần đăng ký khoá nào,
 *  hệ thống đã hỏng sẵn lúc bạn mở nó ra, và đồng hồ là một phần của đề bài chứ
 *  không phải hạn dọn rác của container — hết giờ là thua thật.
 *
 *  Thẻ ở đây chỉ **tóm tắt**. Đề bài đầy đủ có tiêu đề, khối lệnh và trích dẫn:
 *  đổ nguyên vào danh sách thì code tràn ngang, tiêu đề lặp lại tên vừa in, và
 *  một thẻ dài hơn cả màn hình. Chỗ đọc đề là màn làm bài, nơi đồng hồ đã chạy. */
export default function WarRoom() {
  const drills = useQuery({ queryKey: ['drills'], queryFn: labsApi.drills })
  const current = useQuery({ queryKey: ['lab-session'], queryFn: labsApi.current })
  const running = current.data ?? null

  return (
    // Không tự bọc bề rộng: `Layout` đã kẹp mọi trang vào `max-w-6xl px-4` —
    // đúng bề rộng của thanh nav. Bọc thêm ở đây là kẹp hai lần, và trang hẹp
    // hơn header thì đọc ra là lỗi bố cục chứ không ra chủ ý.
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-fg-strong">War Room</h1>
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
            Có đồng hồ
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-fg">
          Một hệ thống đang hỏng, một đồng hồ đang chạy, và không ai nói cho bạn
          biết hỏng ở đâu. Tìm ra và sửa trước khi hết giờ.
        </p>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          Mỗi lần vào là một lỗi khác, bốc ngẫu nhiên. Hết giờ mà chưa cứu được
          cũng là một kết quả — bạn vẫn nhận bản tường trình: mất bao lâu, hỏng ở
          đâu, và bạn đã gõ những gì.
        </p>
      </header>

      {running && <RunningNow session={running} />}

      {drills.isLoading && <p className="text-sm text-fg-subtle">Đang tải…</p>}
      {drills.isError && <ErrorBox>Không tải được danh sách thử thách.</ErrorBox>}
      {drills.data?.length === 0 && (
        <p className="text-sm text-fg-subtle">Chưa có thử thách nào.</p>
      )}

      <ul className="space-y-4">
        {(drills.data ?? []).map((d) => (
          <li key={d.slug}>
            <DrillCard drill={d} blocked={Boolean(running)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Một phiên đang chạy chặn mọi nút Bắt đầu — mỗi người một container. Nói ra
 *  chuyện đó kèm đường quay lại, thay vì để người dùng bấm vào một nút xám và tự
 *  đoán vì sao. */
function RunningNow({ session }: { session: LabSession }) {
  const to = session.incident
    ? `/war-room/${session.lab_slug}`
    : `/courses/${session.course_slug}/labs/${session.lab_slug}`
  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 p-4">
      <p className="text-sm text-fg">
        Bạn đang có một phiên chạy dở
        {session.incident ? ' — ca trực vẫn đang đếm giờ.' : '.'} Kết thúc nó rồi
        mới bắt đầu ca mới được.
      </p>
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-strong transition hover:border-accent"
      >
        Quay lại phiên đó
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </Card>
  )
}

function DrillCard({ drill, blocked }: { drill: Lab; blocked: boolean }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const start = useMutation({
    mutationFn: () => labsApi.start(drill.slug),
    onSuccess: (session) => {
      // Ghi thẳng vào cache thay vì để màn làm bài hỏi lại: nó quay về đây khi
      // chưa thấy phiên nào, nên một vòng fetch nữa là một lần nảy ngược.
      qc.setQueryData(['lab-session'], session)
      navigate(`/war-room/${drill.slug}`)
    },
  })

  // 409 nghĩa là đang có phiên khác chạy dở. Nói đúng chuyện đó: việc cần làm là
  // kết thúc phiên kia, không phải bấm lại.
  const busy = start.error instanceof ApiError && start.error.status === 409

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg-strong">{drill.title}</h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            {mdSummary(drill.description_md)}
          </p>

          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-fg-subtle">
            <Chip>
              <ClockIcon className="h-3.5 w-3.5" />
              {drill.duration_minutes} phút để cứu
            </Chip>
            <Chip>Container Linux thật</Chip>
            <Chip>Lỗi bốc ngẫu nhiên</Chip>
            <Chip>Không cần đăng ký khoá</Chip>
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending || blocked}
            title={blocked ? 'Đang có một phiên chạy dở — kết thúc nó trước' : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TerminalIcon className="h-4 w-4" />
            {start.isPending ? 'Đang dựng…' : 'Bắt đầu ca trực'}
          </button>
          {/* Cảnh báo đứng cạnh nút chứ không nằm cuối thẻ: bấm xong là đồng hồ
              chạy, không có màn xác nhận nào ở giữa. */}
          <p className="text-xs text-fg-subtle sm:text-right">
            Bấm là đồng hồ chạy ngay.
          </p>
        </div>
      </div>

      {busy && (
        <p className="mt-3 text-sm text-danger">
          Bạn đang có một phiên khác chạy dở. Kết thúc phiên đó rồi quay lại.
        </p>
      )}
      {start.isError && !busy && (
        <p className="mt-3 text-sm text-danger">
          Không bắt đầu được ca trực. Thử lại sau ít phút.
        </p>
      )}
    </Card>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
      {children}
    </li>
  )
}
