import { Link } from 'react-router-dom'
import hero from '@/assets/hero.png'

const chips = [
  'Thực hành trực tiếp',
  'Môi trường Linux',
  'Quản lý Git',
  'Container hóa',
]

export default function Home() {
  return (
    <div className="grid items-center gap-10 py-8 md:grid-cols-2">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
          Làm Chủ Quy Trình DevOps &amp; Cloud-Native
        </h1>
        <p className="text-lg text-slate-400">
          Học DevOps qua lab thực hành. Mỗi bài lab cấp cho bạn một container Linux
          thật, truy cập qua terminal ngay trong trình duyệt.
        </p>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <Link
            to="/courses"
            className="rounded-md bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-500"
          >
            Khám phá khóa học
          </Link>
        </div>
      </div>
      <img
        src={hero}
        alt="DevOps"
        className="w-full rounded-xl border border-slate-800"
      />
    </div>
  )
}
