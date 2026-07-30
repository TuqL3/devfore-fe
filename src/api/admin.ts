import { request } from "@/lib/api";
import type { CourseSummary } from "@/lib/types";

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
   *  tick, 'command' chấm bằng lệnh học viên đã gõ. */
  kind: "script" | "choice" | "command";
  /** The answer key. Only ever fetched and sent by admin screens. */
  check_script: string;
  options: AdminOption[];
  /** Các lệnh được chấp nhận, mỗi dòng một lệnh. Cũng là đáp án — admin-only. */
  expected_commands: string;
  points: number;
  order_idx: number;
};

export type AdminTask = TaskInput & { id: number };

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
};
