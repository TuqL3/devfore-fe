import { request } from "@/lib/api";
import type {
  SimGenResult,
  SimGenTurn,
  SimRun,
  SimRunResult,
  SimScenario,
} from "@/lib/types";

/** Bài mô phỏng dùng chung phiên lab với bài container: `start`, `check`,
 *  `submit` và `report` đi nguyên đường cũ. Chỉ bấm Run là mới, và đọc lại
 *  những lượt đã chạy. */
export const simApi = {
  /** Chạy pipeline. Server parse YAML — client gửi văn bản thô, vì một pipeline
   *  mà trình duyệt tự cho là hợp lệ là một pipeline được chấm theo hình dạng
   *  không ai bên kia đồng ý. */
  run: (sessionID: string, pipeline: string) =>
    request<SimRunResult>(`/api/lab-sessions/${sessionID}/sim/run`, {
      method: "POST",
      body: { pipeline },
    }),

  /** Lịch sử của phiên, cũ trước. Đọc được cả khi phiên đã kết thúc. */
  runs: (sessionID: string) =>
    request<{ runs: SimRun[] }>(`/api/lab-sessions/${sessionID}/sim/runs`).then(
      (r) => r.runs,
    ),
};

/** Sân chơi: cùng engine, không phiên, không nhiệm vụ, không điểm. Không lượt
 *  chạy nào được lưu — chính vì thế mà nó mở được mà không cần đăng ký khoá học
 *  nào, và cũng vì thế mà `run` và `warm` do client giữ. */
export const playgroundApi = {
  /** Chạy một pipeline. Gửi kèm cả kịch bản vì kịch bản nằm trong code, không
   *  trong database — server tính rồi quên, không đọc và không ghi gì.
   *
   *  `run` là lượt thứ mấy: nó nằm trong seed của bước flaky, nên bấm lại là một
   *  ván khác thật. `warm` là cache client tự nhớ từ lượt trước. Cả ba đều do
   *  client đưa lên và server không kiểm — ở đây không có gì được chấm, nên
   *  không có gì để gian lận. */
  preview: (input: {
    scenario: SimScenario;
    pipeline: string;
    run: number;
    warm: string[];
  }) => request<SimRunResult>("/api/sim/preview", { method: "POST", body: input }),

  /** Mô tả bằng lời, nhận về một kịch bản.
   *
   *  Khác `preview` ở một điểm quan trọng: cái trả về **đã được engine chạy thử
   *  trên server** — `CheckScenario` duyệt, rồi từng ví dụ đi qua `Parse`. Kịch
   *  bản nào không chạy được thì server đưa lỗi ngược cho AI sửa một lượt, hỏng
   *  tiếp thì báo lỗi chứ không trả ra. Nghĩa là thứ tới tay client là thứ bấm
   *  Chạy được, không phải thứ trông có vẻ đúng.
   *
   *  `history` là hội thoại trước đó, để "đổi runner thành 4" có nghĩa thay vì
   *  dựng lại từ đầu. Server cắt bớt phần đầu nếu dài. */
  generate: (input: { prompt: string; history: SimGenTurn[] }) =>
    request<SimGenResult>("/api/sim/generate", { method: "POST", body: input }),
};
