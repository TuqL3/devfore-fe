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
  /** Shell dựng dịch vụ trước khi một kịch bản War Room phá nó. Nằm trên lab chứ
   *  không trên từng kịch bản: mọi kịch bản của một lab phá cùng một dịch vụ.
   *  Chỉ admin đọc được — nó mô tả đúng cái mặt phẳng mà lỗi đang giấu trong. */
  incident_setup: string;
  order_idx: number;
};

export type AdminLab = LabInput & {
  id: number;
  task_count: number;
  points: number;
  /** Số kịch bản đang bật. Khác 0 là thứ **duy nhất** làm lab này thành thử
   *  thách War Room — không có cột cờ nào khác nói điều đó. */
  incident_count: number;
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

/** Một kịch bản sự cố của War Room: một cách phá dịch vụ, bốc ngẫu nhiên mỗi
 *  lượt mở lab. */
export type IncidentInput = {
  title: string;
  /** Đáp án, theo nghĩa đen nhất: script này chạy trong container học viên và
   *  nội dung nó nói thẳng cái gì đang hỏng. Cùng mức tin cậy với
   *  `check_script` — chỉ đi qua endpoint admin, không bao giờ ra client. */
  break_script: string;
  /** Đọc sau khi hết lượt: chuyện gì đã xảy ra, và người ta thường tìm ra nó
   *  bằng cách nào. */
  reveal_md: string;
  /** Số request/giây sự cố được coi là làm hỏng. Con số tác giả gõ, không phải
   *  đo — mọi màn hình hiện nó đều nói vậy. */
  rps: number;
  /** Ngừng dùng là tắt cờ chứ không xoá: phiên đã chơi còn trỏ vào hàng này và
   *  bản tường trình vẫn phải đọc lại được. */
  active: boolean;
};

export type AdminIncident = IncidentInput & { id: number };

/** Một lab nhìn từ màn quản trị War Room. Kèm khoá học nó nằm trong, vì
 *  `labs.course_id` là NOT NULL nên mọi thử thách vẫn phải trú dưới một khoá —
 *  không nói ra thì admin không biết tìm lại nó ở đâu. */
export type AdminDrill = {
  id: number;
  slug: string;
  title: string;
  duration_minutes: number;
  lab_image_id: number | null;
  incident_setup: string;
  /** 'draft' = không hiện trong War Room, bất kể có kịch bản nào bật hay không.
   *  Tách khỏi `active` của từng kịch bản: cái này trả lời "thử thách có mở
   *  không", cái kia trả lời "lỗi nào bốc được khi đã mở". */
  status: 'draft' | 'published';
  /** null với thử thách tạo trong War Room — nó không thuộc khoá nào. Chỉ mấy
   *  cái tạo trước migration 000028 mới còn khoá. */
  course_id: number | null;
  course_title: string;
  /** Kịch bản còn bốc được. Bằng 0 nghĩa là lab đã rơi khỏi War Room mà chưa bị
   *  xoá — trạng thái mà danh sách này sinh ra để cho thấy. */
  incident_count: number;
  /** Cả kịch bản đã tắt, để lab không còn cái nào bật vẫn nói được đã có sẵn
   *  bao nhiêu công trong nó. */
  scenario_count: number;
};

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

  /** Mọi lab có kịch bản, kể cả lab chỉ còn kịch bản đã tắt — chính mấy cái đó
   *  là thứ không nhìn thấy ở đâu khác: rơi khỏi War Room mà chưa bị xoá. */
  drills: () => request<AdminDrill[]>('/api/admin/war-room'),

  /** Tạo thử thách. Route riêng chứ không dùng endpoint tạo lab: thử thách không
   *  có khoá để lồng dưới, và đó đúng là khác biệt duy nhất giữa hai thứ. */
  createDrill: (input: LabInput) =>
    request<AdminLab>('/api/admin/war-room', { method: 'POST', body: input }),

  /** Đăng bị từ chối (409) khi lab chưa có kịch bản nào đang bật — đăng lên rồi
   *  đưa học viên vào một container không hỏng gì đọc ra là nền tảng lỗi, không
   *  phải bài chưa viết xong. Rút xuống nháp thì không bao giờ bị từ chối. */
  setDrillStatus: (labID: number, status: 'draft' | 'published') =>
    request<void>(`/api/admin/labs/${labID}/drill-status`, {
      method: 'PUT',
      body: { status },
    }),

  incidents: (labID: number) =>
    request<AdminIncident[]>(`/api/admin/labs/${labID}/incidents`),

  createIncident: (labID: number, input: IncidentInput) =>
    request<AdminIncident>(`/api/admin/labs/${labID}/incidents`, {
      method: "POST",
      body: input,
    }),

  updateIncident: (incidentID: number, input: IncidentInput) =>
    request<AdminIncident>(`/api/admin/incidents/${incidentID}`, {
      method: "PUT",
      body: input,
    }),

  /** Chỉ xoá được kịch bản chưa ai chơi — server trả 409 kèm câu giải thích khi
   *  đã có phiên trỏ vào nó. Lúc đó việc cần làm là tắt, không phải xoá. */
  deleteIncident: (incidentID: number) =>
    request<void>(`/api/admin/incidents/${incidentID}`, { method: "DELETE" }),

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
