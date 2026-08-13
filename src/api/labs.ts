import { request } from "@/lib/api";
import { getLang } from "@/lib/i18n";
import type {
  CheckResult,
  DailyDrill,
  Lab,
  LabDetail,
  LabHistoryRow,
  LabReport,
  LabSession,
  SharedDrill,
  WeeklyBoard,
  DrillStreak,
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

  /** `incidentID` xin đúng một kịch bản thay vì bốc ngẫu nhiên — đó là cách một
   *  link chia sẻ và ca trực hôm nay giao đúng sự cố đó cho người bấm vào. Server
   *  từ chối nếu kịch bản không thuộc lab này, không im lặng bốc cái khác. */
  start: (labSlug: string, incidentID?: number) =>
    request<LabSession>(
      `/api/labs/${labSlug}/start` + (incidentID ? `?incident=${incidentID}` : ""),
      { method: "POST" },
    ),

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

  /** Đăng báo cáo ca trực lên một trang công khai, trả về token của link. Bấm
   *  lần nữa trả đúng token cũ — người bấm lại là người làm mất link, không phải
   *  người xin thêm một trang thứ hai. */
  share: (sessionID: string) =>
    request<{ token: string }>(`/api/lab-sessions/${sessionID}/share`, {
      method: "POST",
    }),

  /** Gỡ trang công khai xuống. Link cũ chết hẳn — đăng lại sinh token mới. */
  unshare: (sessionID: string) =>
    request<void>(`/api/lab-sessions/${sessionID}/share`, { method: "DELETE" }),

  /** Trang công khai. Route duy nhất của cả nền tảng không cần đăng nhập, nên
   *  `auth: false` ở đây không phải tiện tay mà là cả tính năng. */
  shared: (token: string) =>
    request<SharedDrill>(`/api/shared-drills/${token}`, { auth: false }),

  /** Ca trực hôm nay: cùng một kịch bản cho tất cả mọi người, cộng bảng xếp hạng
   *  trong ngày. Cũng công khai — bắt người lạ đăng nhập chỉ để xem hôm nay có
   *  gì là mất họ ngay ở cửa.
   *
   *  `day` (YYYY-MM-DD) đọc ca của một ngày đã qua. Server từ chối ngày mai —
   *  kịch bản tính được cho mọi ngày, nên không chặn thì ai cũng xem trước được
   *  ca ngày mai, mà "chưa ai thấy trước" là toàn bộ ý nghĩa của ca trực hôm
   *  nay. */
  daily: (day?: string) =>
    request<DailyDrill>("/api/daily-drill" + (day ? `?day=${day}` : ""), {
      auth: false,
    }),

  /** Bảng bảy ngày. Công khai như bảng ngày. */
  weekly: () => request<WeeklyBoard>("/api/weekly-board", { auth: false }),

  /** Chuỗi ngày của chính mình — số duy nhất trong nhóm này chỉ có nghĩa với một
   *  người, nên nó nằm sau đăng nhập. */
  streak: () => request<DrillStreak>("/api/my-drill-streak"),
};

/** The terminal lives on the API host, not the Vite dev server, and the scheme
 *  has to track https so a deployed page does not try to open ws:// from a
 *  secure origin — browsers refuse that outright. */
export function terminalURL(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
  const url = new URL(path, base);
  // A WebSocket opened from JavaScript cannot set request headers, so the
  // language rides in the query string instead. Without it the server would
  // answer close frames in the browser's language rather than the chosen one.
  url.searchParams.set("lang", getLang());
  return url.toString().replace(/^http/, "ws");
}
