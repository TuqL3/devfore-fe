export interface User {
  id: number
  username: string
  email: string
  avatar_url: string | null
  status: string
  roles: string[]
  created_at: string
}

// Login and register answer with the user only. The tokens never reach this
// code — they arrive as HttpOnly cookies.

/** One signed-in device, as listed on the devices tab of the profile. */
export interface Session {
  id: string
  user_agent: string
  ip: string
  /** When that device signed in — survives the session id rotating. */
  created_at: string
  /** When it last refreshed. */
  last_seen: string
  /** True for the device doing the asking. */
  current: boolean
}

export interface Level {
  slug: string
  label: string
  hint: string
  rank: number
  course_count: number
}

export interface CourseSummary {
  id: number
  slug: string
  title: string
  description: string
  image_url: string | null
  level: string
  /** Only ever 'published' outside the admin listing, which is the one place
   *  drafts are visible. */
  status: 'draft' | 'published'
  lab_count: number
  student_count: number
  published_at: string | null
  updated_at: string
}

export interface Lab {
  id: number
  slug: string
  title: string
  description_md: string
  duration_minutes: number
  order_idx: number
  task_count: number
  points: number
}

export interface CourseDetail extends CourseSummary {
  enrolled: boolean
  labs: Lab[]
}

export interface Review {
  id: number
  title: string
  content_md: string
  order_idx: number
}

export interface LeaderRow {
  rank: number
  username: string
  avatar_url: string | null
  score: number
  labs_completed: number
  attempts: number
  updated_at: string
}

export interface LabTask {
  id: number
  title: string
  /** 'script' làm trong terminal, 'choice' chọn đáp án, 'command' gõ lệnh. */
  kind: 'script' | 'choice' | 'command'
  /** Chỉ phần chữ của các lựa chọn — đáp án đúng nằm ở server. Rỗng với
   *  nhiệm vụ thực hành. */
  options: string[]
  /** Đúng khi câu chỉ có một đáp án — để hiện radio thay vì checkbox. Server
   *  chỉ nói *bao nhiêu* đáp án, không nói đáp án nào. */
  single_answer: boolean
  /** Empty when the author has not written one; the hint tab says so rather
   *  than showing a blank panel. */
  hint: string
  points: number
  order_idx: number
}

export interface LabDetail extends Lab {
  tasks: LabTask[]
}

/** What one press of the check button changed. `points_awarded` is 0 for a task
 *  that was already passed, which is what makes a retry free. */
export interface CheckResult {
  passed: boolean
  points_awarded: number
  lab_completed: boolean
}

/** Phiên đã kết thúc thì mang thêm `submitted`: nộp bài. */
export type SessionStatus = 'running' | 'ended' | 'expired' | 'submitted'

/** Một lượt thực hành trong danh sách lịch sử. */
export interface LabHistoryRow {
  session_id: string
  lab_title: string
  lab_slug: string
  course_slug: string
  status: SessionStatus
  started_at: string
  ended_at: string | null
  correct: number
  total: number
}

/** Một câu trong báo cáo, kèm đáp án đúng. Server chỉ trả về khi phiên đã kết
 *  thúc — lúc đang làm thì đây chính là đáp án. */
export interface ReportAnswer {
  task_id: number
  title: string
  kind: LabTask['kind']
  points: number
  options: string[]
  /** Chỉ số đáp án đúng, đếm từ 0. */
  correct: number[]
  selected: number[]
  /** null khi học viên chưa từng bấm chấm câu này. */
  passed: boolean | null
  answered_at: string | null
  /** Số lần bấm chấm câu này. 1 nghĩa là đáp án ghi nhận là đáp án đầu tiên.
   *  null với các phiên chấm trước khi hệ thống đếm — không phải là 1. */
  attempts: number | null
}

/** Một tin nhắn trong phòng chat chung. `username` được chụp lại lúc gửi — đổi
 *  tên không viết lại lịch sử. `user_id` null khi tài khoản đã bị xoá. */
export interface ChatMessage {
  id: number
  user_id: number | null
  username: string
  body: string
  created_at: string
}

export interface ChatHistory {
  messages: ChatMessage[]
  online: number
}

/** Đăng nhập dừng giữa chừng vì tài khoản có lớp thứ hai. Chưa có phiên nào
 *  được tạo — token này chỉ cho phép đúng một việc: gửi mã lên. */
export interface MFAChallenge {
  mfa_required: true
  challenge: string
  expires_in: number
}

/** Phân biệt hai dạng trả về của `POST /api/auth/login`. Không có nó thì một
 *  challenge sẽ được render như User và UI hiện đã đăng nhập trên một phiên
 *  không tồn tại. */
export function isMFAChallenge(v: User | MFAChallenge): v is MFAChallenge {
  return 'mfa_required' in v
}

export interface TOTPStatus {
  enabled: boolean
  /** Số recovery code chưa dùng. 0 khi đang bật nghĩa là mất máy là mất tài khoản. */
  recovery_left: number
}

/** Một dòng nhật ký quản trị. Tên được chụp lại lúc ghi, nên vẫn đọc được sau
 *  khi tài khoản liên quan bị xoá. */
export interface AuditLog {
  id: number
  actor_name: string
  action: string
  target_type: string
  target_id: string
  target_name: string
  detail: string
  ip: string
  created_at: string
}

export interface AuditLogs {
  logs: AuditLog[]
  total: number
  limit: number
}

/** Một tài khoản trong bảng quản trị. Không mang password hash hay google_id —
 *  cả hai không có việc gì ở màn hình này. */
export interface ManagedUser {
  id: number
  username: string
  email: string
  avatar_url: string | null
  status: 'active' | 'pending' | 'banned'
  roles: string[]
  created_at: string
  /** Chỉ khác null khi đang bị khoá; mở khoá là xoá sạch cả ba trường. */
  banned_at: string | null
  banned_reason: string | null
  banned_by: string | null
}

export interface ManagedUsers {
  users: ManagedUser[]
  /** Tổng số khớp bộ lọc, có thể lớn hơn `users.length`. */
  total: number
  limit: number
}

/** Một container đang sống, như màn quản trị liệt kê. */
export interface RunningSession {
  id: string
  username: string
  lab_title: string
  started_at: string
  expires_at: string
  /** false khi hàng đã tạo nhưng container không lên — dạng của phiên mồ côi. */
  has_container: boolean
}

/** Lưu lượng của một bài lab. `answered`/`retried` chỉ đếm các câu có ghi số
 *  lần chấm — câu chấm trước khi hệ thống đếm không tính vào cả hai. */
export interface LabStat {
  lab_id: number
  lab_title: string
  course_title: string
  sessions: number
  submitted: number
  answered: number
  retried: number
}

/** Toàn cảnh admin trong một lần đọc. Là ảnh chụp hiện tại, không phải chuỗi
 *  thời gian: "tuần" ở đây là 7 ngày gần nhất, không chia theo ngày. */
export interface AdminStats {
  students: number
  active_students: number
  courses: number
  published: number
  sessions: number
  sessions_week: number
  running: number
  submitted: number
  labs: LabStat[]
}

export interface LabReport {
  session_id: string
  lab_title: string
  lab_slug: string
  course_slug: string
  status: SessionStatus
  started_at: string
  ended_at: string | null
  submitted_at: string | null
  correct: number
  total: number
  answers: ReportAnswer[]
}

export interface LabSession {
  id: string
  lab_id: number
  /** Where the session lives. Empty only if the lab or course row went away
   *  under a session that is still running — the id is still enough to end it. */
  lab_slug: string
  course_slug: string
  /** Tasks of this lab the student has already passed, in any session. Sent with
   *  the session so a reload restores the ticks. */
  passed_task_ids: number[]
  status: 'running' | 'ended' | 'expired'
  started_at: string
  expires_at: string
  seconds_left: number
  /** Path only. The websocket origin is derived from the API base so dev and
   *  prod do not need two different values here. */
  terminal_path: string
}
