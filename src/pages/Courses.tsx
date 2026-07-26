import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { coursesApi } from '@/api/courses'
import type { CourseSummary } from '@/lib/types'

const levelLabel: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

function CourseCard({ c }: { c: CourseSummary }) {
  return (
    <Link
      to={`/courses/${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-violet-600"
    >
      {c.image_url && (
        <img src={c.image_url} alt={c.title} className="h-40 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-0.5 text-violet-300">
            {levelLabel[c.level] ?? c.level}
          </span>
          <span>{c.lab_count} lab</span>
          <span>· {c.student_count} học viên</span>
        </div>
        <h3 className="font-semibold text-white group-hover:text-violet-300">{c.title}</h3>
        <p className="line-clamp-2 text-sm text-slate-400">{c.description}</p>
      </div>
    </Link>
  )
}

export default function Courses() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.list,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Khoá học</h1>
      {isLoading && <p className="text-slate-500">Đang tải…</p>}
      {isError && <p className="text-red-400">Không tải được danh sách khoá học.</p>}
      {data && data.length === 0 && (
        <p className="text-slate-500">Chưa có khoá học nào được xuất bản.</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <CourseCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}
