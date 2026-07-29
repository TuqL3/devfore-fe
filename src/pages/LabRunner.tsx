import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import type { LabSession } from '@/lib/types'
import { Button } from '@/components/ui'
import { LabTerminal } from '@/components/LabTerminal'

export default function LabRunner() {
  const { slug = '', labSlug = '' } = useParams()
  const qc = useQueryClient()
  const [notice, setNotice] = useState('')

  const lab = useQuery({
    queryKey: ['lab', slug, labSlug],
    queryFn: () => labsApi.detail(slug, labSlug),
  })

  const current = useQuery({
    queryKey: ['lab-session'],
    queryFn: labsApi.current,
  })

  const start = useMutation({
    mutationFn: () => labsApi.start(labSlug),
    onSuccess: (s) => {
      setNotice('')
      qc.setQueryData(['lab-session'], s)
    },
    onError: (e) =>
      setNotice(e instanceof ApiError ? e.message : 'không khởi động được lab'),
  })

  const stop = useMutation({
    mutationFn: (id: string) => labsApi.stop(id),
    onSettled: () => qc.setQueryData(['lab-session'], null),
  })

  const session = current.data ?? null
  // A session belonging to another lab is still the student's one slot, so the
  // page has to say so rather than offering a Start that will 409.
  const mine = session && lab.data ? session.lab_id === lab.data.id : false

  if (lab.isError) {
    return (
      <div className="py-16 text-center">
        <p className="text-danger">Không tìm thấy bài lab này.</p>
        <Link
          to={`/courses/${slug}`}
          className="mt-3 inline-block text-sm text-accent-soft hover:underline"
        >
          ← Về khoá học
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={`/courses/${slug}`}
            className="text-sm text-fg-muted transition hover:text-accent-soft"
          >
            ← Về khoá học
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-fg-strong">
            {lab.data?.title ?? 'Đang tải…'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {session && mine && <Countdown session={session} />}
          {session && mine ? (
            <Button
              onClick={() => stop.mutate(session.id)}
              disabled={stop.isPending}
              className="bg-danger hover:bg-danger"
            >
              {stop.isPending ? 'Đang đóng…' : 'Kết thúc phiên'}
            </Button>
          ) : (
            <Button
              onClick={() => start.mutate()}
              disabled={start.isPending || current.isLoading}
            >
              {start.isPending ? 'Đang khởi động…' : 'Bắt đầu làm bài'}
            </Button>
          )}
        </div>
      </header>

      {notice && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {notice}
        </p>
      )}
      {session && !mine && (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
          Bạn đang có một phiên lab khác đang chạy. Mỗi lúc chỉ được mở một phiên.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="order-2 h-[28rem] overflow-hidden rounded-lg border border-border bg-[#0b0e14] p-2 lg:order-1">
          {session && mine ? (
            <LabTerminal
              terminalPath={session.terminal_path}
              onClosed={(reason) => {
                setNotice(reason)
                qc.setQueryData(['lab-session'], null)
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
              Bấm “Bắt đầu làm bài” để mở terminal.
            </div>
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg-strong">
              Nhiệm vụ{' '}
              <span className="font-mono text-xs text-fg-subtle">
                {lab.data?.tasks.length ?? 0}
              </span>
            </h2>
            <ol className="mt-3 space-y-2">
              {lab.data?.tasks.map((t, i) => (
                <li key={t.id} className="flex gap-2 text-sm text-fg-muted">
                  <span className="font-mono text-xs text-fg-subtle">{i + 1}.</span>
                  <span className="flex-1">{t.title}</span>
                  <span className="font-mono text-xs text-accent-soft">
                    {t.points}đ
                  </span>
                </li>
              ))}
              {lab.data?.tasks.length === 0 && (
                <li className="text-sm text-fg-subtle">Bài này chưa có nhiệm vụ nào.</li>
              )}
            </ol>
          </section>

          {lab.data?.description_md && (
            <section className="prose prose-sm max-w-none rounded-lg border border-border bg-surface p-4 dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lab.data.description_md}
              </ReactMarkdown>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

/** Counts down from expires_at rather than from seconds_left, so a tab left in
 *  the background wakes up showing the real remaining time instead of however
 *  far its own interval happened to get. */
function Countdown({ session }: { session: LabSession }) {
  const [left, setLeft] = useState(() => remaining(session.expires_at))

  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(session.expires_at)), 1000)
    return () => clearInterval(t)
  }, [session.expires_at])

  const mins = Math.floor(left / 60)
  return (
    <span
      className={
        'font-mono text-sm ' + (mins < 5 ? 'text-danger' : 'text-fg-muted')
      }
      title="Container sẽ tự bị xoá khi hết giờ"
    >
      {String(mins).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
    </span>
  )
}

function remaining(expiresAt: string): number {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000))
}
