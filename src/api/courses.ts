import { request } from "@/lib/api";
import type {
  CourseSummary,
  CourseDetail,
  Level,
  Review,
  LeaderRow,
} from "@/lib/types";

export type CourseFilter = { level?: string; q?: string };

export const coursesApi = {
  // Filtering and search happen in SQL; the client only forwards the params.
  list: (f: CourseFilter = {}) => {
    const qs = new URLSearchParams()
    if (f.level) qs.set("level", f.level);
    if (f.q?.trim()) qs.set("q", f.q.trim());
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<CourseSummary[]>(`/api/courses${suffix}`, { auth: false });
  },

  levels: () => request<Level[]>("/api/levels", { auth: false }),

  detail: (slug: string) => request<CourseDetail>(`/api/courses/${slug}`),

  enroll: (slug: string) =>
    request<void>(`/api/courses/${slug}/enroll`, { method: "POST" }),

  unenroll: (slug: string) =>
    request<void>(`/api/courses/${slug}/enroll`, { method: "DELETE" }),

  reviews: (slug: string) =>
    request<Review[]>(`/api/courses/${slug}/reviews`, { auth: false }),

  leaderboard: (slug: string) =>
    request<LeaderRow[]>(`/api/courses/${slug}/leaderboard`, { auth: false }),
};
