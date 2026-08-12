import { request } from "@/lib/api";
import type {
  CheckResult,
  Lab,
  LabDetail,
  LabHistoryRow,
  LabReport,
  LabSession,
} from "@/lib/types";

export const labsApi = {
  detail: (courseSlug: string, labSlug: string) =>
    request<LabDetail>(`/api/courses/${courseSlug}/labs/${labSlug}`, {
      auth: false,
    }),

  /** Danh sách thử thách War Room. Không đi qua khoá học nào: thử thách không
   *  phải nội dung của khoá, và không ai phải đăng ký gì để vào. */
  drills: () => request<Lab[]>("/api/war-room", { auth: false }),

  /** Một thử thách kèm đề bài và nhiệm vụ. Cùng hình dạng với `detail` để màn
   *  làm bài không cần biết mình đang chạy bài của khoá hay một ca trực. */
  drill: (labSlug: string) =>
    request<LabDetail>(`/api/war-room/${labSlug}`, { auth: false }),

  start: (labSlug: string) =>
    request<LabSession>(`/api/labs/${labSlug}/start`, { method: "POST" }),

  /** null when the student has no container running, which is the normal case
   *  on a fresh page load rather than an error. */
  current: () =>
    request<{ session: LabSession | null }>("/api/lab-sessions/current").then(
      (r) => r.session,
    ),

  stop: (id: string) =>
    request<void>(`/api/lab-sessions/${id}`, { method: "DELETE" }),

  /** Grades one task against the running container. Scoped to the session
   *  because that is what decides which container the check runs in. */
  check: (sessionID: string, taskID: number, selected: number[] = []) =>
    request<CheckResult>(
      `/api/lab-sessions/${sessionID}/tasks/${taskID}/check`,
      { method: "POST", body: { selected } },
    ),

  /** Nộp bài: chốt kết quả, xoá container, trả luôn báo cáo — nộp xong là có
   *  kết quả ngay, không cần gọi thêm lần nữa. */
  submit: (sessionID: string) =>
    request<LabReport>(`/api/lab-sessions/${sessionID}/submit`, {
      method: "POST",
    }),

  history: () => request<LabHistoryRow[]>("/api/lab-sessions/history"),

  /** Báo cáo một phiên đã kết thúc. Server từ chối khi phiên còn chạy. */
  report: (sessionID: string) =>
    request<LabReport>(`/api/lab-sessions/${sessionID}/report`),
};

/** The terminal lives on the API host, not the Vite dev server, and the scheme
 *  has to track https so a deployed page does not try to open ws:// from a
 *  secure origin — browsers refuse that outright. */
export function terminalURL(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
  return new URL(path, base).toString().replace(/^http/, "ws");
}
