import { request } from "@/lib/api";
import type {
  CourseSummary,
  CourseDetail,
  Review,
  LeaderRow,
} from "@/lib/types";

export const coursesApi = {
  list: () => request<CourseSummary[]>("/api/courses", { auth: false }),

  detail: (slug: string) => request<CourseDetail>(`/api/courses/${slug}`),

  enroll: (slug: string) =>
    request<void>(`/api/courses/${slug}/enroll`, { method: "POST" }),

  reviews: (slug: string) =>
    request<Review[]>(`/api/courses/${slug}/reviews`, { auth: false }),

  leaderboard: (slug: string) =>
    request<LeaderRow[]>(`/api/courses/${slug}/leaderboard`, { auth: false }),
};
