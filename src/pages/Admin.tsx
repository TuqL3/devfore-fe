import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui'

/** The course list. Adding and editing live at their own URLs, so this screen
 *  only ever shows the table — and Back from a form lands here rather than
 *  leaving the admin area. */
export default function Admin() {
  const qc = useQueryClient()
  const [error, setError] = useState('')

  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: adminApi.courses })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      setError('')
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'không xoá được, thử lại'),
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">Quản trị khoá học</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Thêm, sửa, xoá khoá học. Khoá ở trạng thái nháp không hiện ngoài danh
            sách công khai.
          </p>
        </div>
        <Link to="/admin/courses/new">
          <Button>Thêm khoá học</Button>
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-fg-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Khoá học</th>
              <th className="px-4 py-3 font-medium">Cấp độ</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Lab</th>
              <th className="px-4 py-3 font-medium">Học viên</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {courses.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                  Đang tải…
                </td>
              </tr>
            )}
            {courses.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                  Chưa có khoá học nào.
                </td>
              </tr>
            )}
            {courses.data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-fg-strong">{c.title}</div>
                  <div className="font-mono text-xs text-fg-subtle">{c.slug}</div>
                </td>
                <td className="px-4 py-3 text-fg-muted">{c.level}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'rounded px-2 py-0.5 text-xs ' +
                      (c.status === 'published'
                        ? 'bg-success-soft text-success'
                        : 'bg-muted text-fg-muted')
                    }
                  >
                    {c.status === 'published' ? 'đã đăng' : 'nháp'}
                  </span>
                </td>
                <td className="px-4 py-3 text-fg-muted">{c.lab_count}</td>
                <td className="px-4 py-3 text-fg-muted">{c.student_count}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    to={`/admin/courses/${c.id}`}
                    className="rounded px-2 py-1 text-accent-soft transition hover:bg-muted"
                  >
                    Lab &amp; nhiệm vụ
                  </Link>
                  <Link
                    to={`/admin/courses/${c.id}/edit`}
                    className="rounded px-2 py-1 text-accent-soft transition hover:bg-muted"
                  >
                    Sửa
                  </Link>
                  <button
                    onClick={() => {
                      // Deleting a course cascades to its labs, tasks, enrolments
                      // and scores. Naming what goes with it is the difference
                      // between a confirmation and a formality.
                      const msg =
                        `Xoá "${c.title}"?\n\n` +
                        `Mất theo: ${c.lab_count} lab (kèm nhiệm vụ), ` +
                        `${c.student_count} lượt ghi danh và toàn bộ điểm của khoá này. ` +
                        `Không khôi phục được.`
                      if (confirm(msg)) remove.mutate(c.id)
                    }}
                    disabled={remove.isPending}
                    className="rounded px-2 py-1 text-danger transition hover:bg-danger/10 disabled:opacity-50"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
