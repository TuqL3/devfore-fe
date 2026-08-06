import { request } from "@/lib/api";
import type {
  AdminStats,
  AuditLogs,
  CourseSummary,
  ManagedUsers,
  RunningSession,
} from "@/lib/types";

export type UserFilter = {
  q?: string;
  status?: "active" | "pending" | "banned" | "";
  role?: "admin" | "student" | "";
};

/** What the course form sends. The server derives everything else — counts,
 *  timestamps, published_at — so they are deliberately not here. */
export type CourseInput = {
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  level: string;
  status: "draft" | "published";
};

export type LabInput = {
  slug: string;
  title: string;
  description_md: string;
  duration_minutes: number;
  /** null = chưa gán image. Lab như vậy lưu được nhưng học viên chưa mở được. */
  lab_image_id: number | null;
  /** Kịch bản mô phỏng. Có giá trị nghĩa là lab này chạy pipeline chứ không chạy
   *  container — server từ chối lab vừa có image vừa có kịch bản. Kiểu để lỏng
   *  vì server cũng chỉ kiểm tới mức "là một object": hiểu được nội dung là việc
   *  của engine, không phải của form này. */
  sim_scenario: Record<string, unknown> | null;
  order_idx: number;
};

export type AdminLab = LabInput & {
  id: number;
  task_count: number;
  points: number;
};

/** `correct` is the answer key — only admin endpoints ever carry it. */
export type AdminOption = { text: string; correct: boolean };

export type TaskInput = {
  title: string;
  hint: string;
  /** 'script' chấm bằng shell trong container, 'choice' chấm bằng đáp án đã
   *  tick, 'command' chấm bằng lệnh học viên đã gõ, 'sim' chấm bằng lượt chạy
   *  pipeline gần nhất. */
  kind: "script" | "choice" | "command" | "sim";
  /** The answer key. Only ever fetched and sent by admin screens. */
  check_script: string;
  options: AdminOption[];
  /** Các lệnh được chấp nhận, mỗi dòng một lệnh. Cũng là đáp án — admin-only. */
  expected_commands: string;
  /** Điều kiện đạt của bài mô phỏng. Cũng là đáp án: nó nói thẳng lịch chạy mà
   *  đề bài đang đòi, nên chỉ đi qua đúng các endpoint admin. */
  sim_goal: Record<string, unknown> | null;
  points: number;
  order_idx: number;
};

export type AdminTask = TaskInput & { id: number };

/** Một bài trong tab Ôn tập của khoá học. Không thuộc lab nào — nó là tài liệu
 *  của cả khoá, đọc được mà không cần mở container. */
export type ReviewInput = {
  title: string;
  content_md: string;
  order_idx: number;
};

export type AdminReview = ReviewInput & { id: number };

export type LabImage = {
  id: number;
  name: string;
  tag: string;
  description: string;
  active: boolean;
};

/** Result of trying a script in a throwaway container. `output` is stdout and
 *  stderr together — the whole point is seeing what went wrong. */
export type TryScriptResult = {
  exit_code: number;
  passed: boolean;
  output: string;
  setup_exit_code: number;
  setup_output: string;
  setup_failed: boolean;
};

export const adminApi = {
  tryScript: (labID: number, script: string, setup: string) =>
    request<TryScriptResult>("/api/admin/check-scripts/try", {
      method: "POST",
      body: { lab_id: labID, script, setup },
    }),

  /** Same shape as the public listing, drafts included. */
  courses: () => request<CourseSummary[]>("/api/admin/courses"),

  createCourse: (input: CourseInput) =>
    request<CourseSummary>("/api/admin/courses", { method: "POST", body: input }),

  updateCourse: (id: number, input: CourseInput) =>
    request<CourseSummary>(`/api/admin/courses/${id}`, {
      method: "PUT",
      body: input,
    }),

  deleteCourse: (id: number) =>
    request<void>(`/api/admin/courses/${id}`, { method: "DELETE" }),

  labImages: () => request<LabImage[]>("/api/admin/lab-images"),

  /** Uploads a cover image and returns where it will be served from. Separate
   *  from saving the course because a new course has no id to attach it to. */
  uploadImage: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ url: string }>("/api/admin/uploads/image", { body });
  },

  labs: (courseID: number) =>
    request<AdminLab[]>(`/api/admin/courses/${courseID}/labs`),

  createLab: (courseID: number, input: LabInput) =>
    request<AdminLab>(`/api/admin/courses/${courseID}/labs`, {
      method: "POST",
      body: input,
    }),

  updateLab: (labID: number, input: LabInput) =>
    request<AdminLab>(`/api/admin/labs/${labID}`, { method: "PUT", body: input }),

  deleteLab: (labID: number) =>
    request<void>(`/api/admin/labs/${labID}`, { method: "DELETE" }),

  tasks: (labID: number) =>
    request<AdminTask[]>(`/api/admin/labs/${labID}/tasks`),

  createTask: (labID: number, input: TaskInput) =>
    request<AdminTask>(`/api/admin/labs/${labID}/tasks`, {
      method: "POST",
      body: input,
    }),

  updateTask: (taskID: number, input: TaskInput) =>
    request<AdminTask>(`/api/admin/tasks/${taskID}`, {
      method: "PUT",
      body: input,
    }),

  deleteTask: (taskID: number) =>
    request<void>(`/api/admin/tasks/${taskID}`, { method: "DELETE" }),

  reviews: (courseID: number) =>
    request<AdminReview[]>(`/api/admin/courses/${courseID}/reviews`),

  createReview: (courseID: number, input: ReviewInput) =>
    request<AdminReview>(`/api/admin/courses/${courseID}/reviews`, {
      method: "POST",
      body: input,
    }),

  updateReview: (reviewID: number, input: ReviewInput) =>
    request<AdminReview>(`/api/admin/reviews/${reviewID}`, {
      method: "PUT",
      body: input,
    }),

  deleteReview: (reviewID: number) =>
    request<void>(`/api/admin/reviews/${reviewID}`, { method: "DELETE" }),

  stats: () => request<AdminStats>("/api/admin/stats"),

  auditLogs: (f: { action?: string; actor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (f.action) qs.set("action", f.action);
    if (f.actor?.trim()) qs.set("actor", f.actor.trim());
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<AuditLogs>(`/api/admin/audit-logs${suffix}`);
  },

  runningSessions: () =>
    request<RunningSession[]>("/api/admin/lab-sessions"),

  /** Xoá container của người khác. Đáp án đã chấm vẫn giữ — chấm ghi ngay lúc
   *  bấm, không đợi nộp. */
  killSession: (id: string) =>
    request<void>(`/api/admin/lab-sessions/${id}`, { method: "DELETE" }),

  users: (f: UserFilter = {}) => {
    const qs = new URLSearchParams();
    if (f.q?.trim()) qs.set("q", f.q.trim());
    if (f.status) qs.set("status", f.status);
    if (f.role) qs.set("role", f.role);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<ManagedUsers>(`/api/admin/users${suffix}`);
  },

  /** Khoá hoặc mở khoá. `reason` chỉ dùng khi khoá, server bỏ qua lúc mở. */
  setBanned: (id: number, banned: boolean, reason = "") =>
    request<void>(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: { banned, reason },
    }),

  setAdmin: (id: number, admin: boolean) =>
    request<void>(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: { admin },
    }),
};
