import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "@/api/courses";
import { useAuth } from "@/context/AuthContext";
import type { CourseDetail as Course, Lab } from "@/lib/types";

const TABS = [
  "Nội dung khoá học",
  "Ôn tập",
  "Bảng xếp hạng",
  "Trạng thái",
] as const;
type Tab = (typeof TABS)[number];

const levelLabel: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export default function CourseDetail() {
  const { slug = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Nội dung khoá học");

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => coursesApi.detail(slug),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (isError || !course)
    return <p className="text-red-400">Không tìm thấy khoá học.</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6 lg:order-1 order-2">
        <div>
          <h1 className="text-3xl font-bold text-white">{course.title}</h1>
          <p className="mt-2 text-slate-400">{course.description}</p>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-4 py-2 text-sm font-medium transition " +
                (tab === t
                  ? "border-b-2 border-violet-500 text-white"
                  : "text-slate-400 hover:text-slate-200")
              }
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Nội dung khoá học" && <ContentTab labs={course.labs} />}
        {tab === "Ôn tập" && <ReviewsTab slug={slug} />}
        {tab === "Bảng xếp hạng" && <LeaderboardTab slug={slug} />}
        {tab === "Trạng thái" && <StatusTab course={course} />}
      </div>

      <Sidebar course={course} />
    </div>
  );
}

function Sidebar({ course }: { course: Course }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const enroll = useMutation({
    mutationFn: () => coursesApi.enroll(course.slug),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["course", course.slug] }),
  });

  return (
    <aside className="lg:order-2 order-1 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      {course.image_url && (
        <img
          src={course.image_url}
          alt={course.title}
          className="w-full rounded-lg object-cover"
        />
      )}
      <dl className="space-y-2 text-sm">
        <Row label="Cấp độ" value={levelLabel[course.level] ?? course.level} />
        <Row label="Số lab" value={String(course.lab_count)} />
        <Row label="Học viên" value={String(course.student_count)} />
      </dl>

      {course.enrolled ? (
        <div className="rounded-md bg-green-900/30 px-4 py-2 text-center text-sm text-green-400">
          Đã đăng ký
        </div>
      ) : user ? (
        <button
          onClick={() => enroll.mutate()}
          disabled={enroll.isPending}
          className="w-full rounded-md bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {enroll.isPending ? "Đang đăng ký…" : "Đăng ký"}
        </button>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="w-full rounded-md bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
        >
          Đăng nhập để đăng ký
        </button>
      )}
      {enroll.isError && (
        <p className="text-sm text-red-400">Đăng ký thất bại, thử lại.</p>
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

function ContentTab({ labs }: { labs: Lab[] }) {
  if (labs.length === 0)
    return <p className="text-slate-500">Khoá học chưa có bài lab nào.</p>;
  return (
    <ol className="space-y-3">
      {labs.map((l, i) => (
        <li
          key={l.id}
          className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm text-violet-300">
            {i + 1}
          </span>
          <div className="flex-1">
            <h4 className="font-medium text-white">{l.title}</h4>
            <p className="text-sm text-slate-400">
              {l.duration_minutes} phút · {l.task_count} task · {l.points} điểm
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReviewsTab({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["course", slug, "reviews"],
    queryFn: () => coursesApi.reviews(slug),
  });
  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (!data || data.length === 0)
    return <p className="text-slate-500">Chưa có nội dung ôn tập.</p>;
  return (
    <div className="space-y-4">
      {data.map((r) => (
        <div
          key={r.id}
          className="rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <h4 className="font-medium text-white">{r.title}</h4>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-300">
            {r.content_md}
          </pre>
        </div>
      ))}
    </div>
  );
}

function LeaderboardTab({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["course", slug, "leaderboard"],
    queryFn: () => coursesApi.leaderboard(slug),
  });
  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (!data || data.length === 0)
    return (
      <p className="text-slate-500">
        Chưa có dữ liệu xếp hạng — sẽ có sau khi tính năng chấm điểm hoàn thiện.
      </p>
    );
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-400">
        <tr>
          <th className="py-2">#</th>
          <th>Học viên</th>
          <th className="text-right">Điểm</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={row.username} className="border-t border-slate-800">
            <td className="py-2 text-slate-500">{i + 1}</td>
            <td className="text-slate-200">{row.username}</td>
            <td className="text-right text-violet-300">{row.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusTab({ course }: { course: Course }) {
  return (
    <dl className="space-y-2 text-sm">
      <Row
        label="Trạng thái đăng ký"
        value={course.enrolled ? "Đã đăng ký" : "Chưa đăng ký"}
      />
      <Row label="Số lab" value={String(course.lab_count)} />
      <Row label="Học viên" value={String(course.student_count)} />
      <Row
        label="Cập nhật"
        value={new Date(course.updated_at).toLocaleDateString("vi-VN")}
      />
    </dl>
  );
}
