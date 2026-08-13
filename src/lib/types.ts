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
  /** Bắt đầu bài này có tạo container không. Nằm ở danh sách để hộp thoại trước
   *  nút Bắt đầu thôi hứa một container mà lab mô phỏng không bao giờ tạo. */
  is_sim: boolean
  task_count: number
  points: number
}

/** Một step trong catalog của lab mô phỏng: mất bao lâu và làm gì với những
 *  thứ quanh nó. Không có trường nào là bí mật — học viên phải đọc được hết
 *  thì mới viết được pipeline. */
export interface SimStepSpec {
  seconds: number
  /** Khoá cache mà công việc của step này thuộc về. Job phải tự khai khoá đó
   *  mới được giảm giá — quên khai chính là lỗi bài học muốn dạy. */
  cacheable?: string
  produces?: string
  consumes?: string
  /** Phần trăm số lượt hỏng, 0..100. */
  flaky?: number
}

/** Một pipeline tác giả viết sẵn, bấm một cái là nạp vào ô soạn.
 *
 *  Bài học ở đây là một phép so sánh — cùng chừng ấy việc, xếp hai kiểu thì mất
 *  hai khoảng thời gian khác nhau — mà so sánh thì cần đủ hai vế. Một ô soạn
 *  trống bắt người mới tự nghĩ ra cả hai. */
export interface SimExample {
  title: string
  /** Một dòng nói cách xếp này tốn bao nhiêu và vì sao. */
  note?: string
  pipeline: string
}

/** Nửa do tác giả viết của một lab mô phỏng. `null` nghĩa là lab container. */
export interface SimScenario {
  version: number
  runner_count: number
  cache_restore_seconds?: number
  catalog: Record<string, SimStepSpec>
  /** Engine không đọc trường này; nó chỉ để dựng mấy nút mẫu. */
  examples?: SimExample[]
}

/** Một lượt trong hội thoại nhờ AI dựng kịch bản. Lượt `assistant` mang JSON
 *  kịch bản lần trước, nên câu tiếp theo có thể là "đổi runner thành 4" thay vì
 *  phải mô tả lại từ đầu. */
export interface SimGenTurn {
  role: "user" | "assistant"
  text: string
}

/** Kết quả một lượt nhờ AI. `scenario` đã qua `CheckScenario` và từng ví dụ đã
 *  qua `Parse` **trên server** — thứ tới đây là thứ bấm Chạy được.
 *
 *  `attempts` là số lần server phải hỏi model. Bằng 2 nghĩa là lần đầu engine
 *  không chạy được và chính câu báo lỗi của engine đã sửa nó. Hiện ra cho người
 *  dùng thấy, vì đó là khác biệt giữa một câu trả lời may mắn và một câu đã kiểm. */
export interface SimGenResult {
  scenario: SimScenario
  notes: string
  attempts: number
}

/** Một khoá học viên đã đăng ký, kèm tiến độ của chính họ. Điểm và số lab đã
 *  xong lấy từ course_scores — cùng nguồn với bảng xếp hạng, nên hai chỗ không
 *  thể nói khác nhau. */
export interface EnrolledCourse extends CourseSummary {
  score: number
  labs_completed: number
  enrolled_at: string
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
  /** 'script' làm trong terminal, 'choice' chọn đáp án, 'command' gõ lệnh,
   *  'sim' chấm theo lượt chạy pipeline gần nhất. */
  kind: 'script' | 'choice' | 'command' | 'sim'
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
  /** Có giá trị thì đây là lab mô phỏng: không có container, không có terminal,
   *  học viên viết pipeline. `null` là lab container như cũ. Đây là thứ duy
   *  nhất phân biệt hai loại — không có cờ thứ hai để lệch với nó. */
  sim_scenario: SimScenario | null
  tasks: LabTask[]
}

/** Phần chung của mọi mô phỏng — thứ danh sách cần để vẽ một cái thẻ, không cần
 *  biết engine nào chạy nó. */
interface SimEntryBase {
  slug: string
  title: string
  category: string
  tags: string[]
  /** Trả lời "đây là gì" — thẻ đầu tiên, và bản rút gọn trên danh sách. */
  description: string
  /** Cú pháp và luật của riêng mô phỏng này. Rỗng thì mục đó tự ẩn. */
  guide: string
}

/** Một mô phỏng trong danh sách. Nội dung nằm trong code (`src/sims/`), không
 *  trong database và không có màn quản trị — xem chú thích ở `registry.ts`.
 *
 *  Union theo `engine`, không phải một interface có mấy trường tuỳ chọn: mỗi
 *  engine mang đúng dữ liệu của nó và **bắt buộc**. Kiểu tuỳ chọn thì
 *  `sim.scenario` thành `SimScenario | undefined` ở khắp 862 dòng của
 *  `SimPlayground`, tức là 862 dòng phải học cách sống với một giá trị không bao
 *  giờ thiếu ở đường đi của chúng. Rẽ nhánh một lần rồi TypeScript tự thu hẹp. */
export type SimEntry = SimEntryCicd | SimEntryLinux | SimEntrySearch | SimEntrySort

export interface SimEntryCicd extends SimEntryBase {
  engine: 'cicd'
  scenario: SimScenario
  /** Người dùng có được sửa catalog không.
   *
   *  Chỉ đúng với mô phỏng tự dựng. Mô phỏng tác giả viết là **cứng**: bộ step
   *  và số giây của nó chính là bài học, và một ô mời sửa nó đi ngay bên dưới
   *  vừa mâu thuẫn với bài học vừa mời người mới đi chệch khỏi nó. */
  editable?: boolean
}

/** Mô phỏng lệnh Linux. Không có `scenario` vì không có gì để server chạy — cả
 *  hệ thống file lẫn mười lệnh nằm trong trình duyệt, xem `src/sims/linux/`. */
export interface SimEntryLinux extends SimEntryBase {
  engine: 'linux'
}

/** Mô phỏng thuật toán tìm kiếm. Cũng không có `scenario`: mảng và bốn thuật
 *  toán nằm trong `src/sims/search/`, server không biết gì về nó. */
export interface SimEntrySearch extends SimEntryBase {
  engine: 'search'
}

/** Mô phỏng thuật toán sắp xếp. Cũng không có `scenario`: bốn thuật toán và bốn
 *  thế mở đầu nằm trong `src/sims/sort/`. */
export interface SimEntrySort extends SimEntryBase {
  engine: 'sort'
}

/** Một step trong kết quả chạy. `cached` nghĩa là công việc được khôi phục chứ
 *  không phải làm lại. `flaky` bật với mọi step tác giả khai là flaky, hỏng hay
 *  không — cờ chứ không phải câu chữ, để chỗ đọc lại không phải so khớp văn. */
export interface SimRunStep {
  uses: string
  start: number
  end: number
  status: 'success' | 'failed' | 'skipped'
  cached?: boolean
  cache_key?: string
  flaky?: boolean
  reason?: string
}

/** `runner` là -1 với job không bao giờ chạy. `skipped` khác `failed`: job đó
 *  không có kết quả của riêng nó, gọi là hỏng thì chỉ sai chỗ cho học viên. */
export interface SimRunJob {
  name: string
  runner: number
  start: number
  end: number
  status: 'success' | 'failed' | 'skipped'
  reason?: string
  steps: SimRunStep[]
}

/** Một lần bấm Run, trọn vẹn. Server tính cả timeline trong một lần nên đây là
 *  mốc thời gian chứ không phải luồng sự kiện. */
export interface SimRunResult {
  run_index: number
  status: 'success' | 'failed'
  total_seconds: number
  /** Chuỗi job kết thúc ở job xong muộn nhất, lần ngược theo `needs`. Là xấp xỉ
   *  khi runner ít hơn số job sẵn sàng: xếp hàng đợi runner không phải phụ
   *  thuộc dữ liệu nên không hiện ra trong chuỗi. */
  critical_path: string[]
  jobs: SimRunJob[]
  insights: string[]
  /** Khoá cache còn ấm sau lượt này, mang sang lượt sau. */
  warm_caches: string[]
}

/** Một lượt đã lưu. Mang theo cả pipeline vì kết quả trơ trọi thì không kiểm
 *  lại được: không có văn bản sinh ra nó thì không phân biệt được bản phát lại
 *  trung thực với bản viết lại. */
export interface SimRun {
  run_index: number
  pipeline: string
  result: SimRunResult
  created_at: string
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

/** Một tin nhắn. `username` chụp lại lúc gửi — đổi tên không viết lại lịch sử.
 *  `peer_id` null là phòng chung, có giá trị là tin nhắn riêng. Tin đã xoá giữ
 *  lại hàng nhưng `body` rỗng, để id và thứ tự không xô lệch chỗ người khác
 *  đang đọc. */
export interface ChatMessage {
  id: number
  user_id: number | null
  username: string
  peer_id: number | null
  body: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

/** Sự kiện đẩy qua socket. `update` là tin đã có bị sửa hoặc xoá — client thay
 *  thế theo id chứ không nối thêm. */
export interface ChatEvent {
  kind: 'message' | 'update'
  message: ChatMessage
}

export interface ChatHistory {
  messages: ChatMessage[]
  online: number
}

/** Một cuộc trò chuyện riêng trong sidebar. Phòng chung không nằm ở đây — nó
 *  luôn tồn tại, một hàng nói điều đó là một hàng có thể mất. */
export interface ChatConversation {
  peer_id: number
  username: string
  avatar_url: string | null
  last_body: string
  last_at: string | null
  last_deleted: boolean
}

/** Một người trong danh bạ, để bắt đầu trò chuyện riêng. */
export interface ChatPerson {
  id: number
  username: string
  avatar_url: string | null
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

/** Một lệnh học viên đã gõ trong lúc trực. `at` null với lệnh mà shell ghi không
 *  kèm thời gian — phiên chạy trước lúc image lab bật dấu thời gian vẫn có danh
 *  sách đáng đọc, chỉ là không có giờ. */
export interface IncidentCommand {
  at: string | null
  command: string
}

/** Nửa "ca trực" của báo cáo. Chỉ có ở lab sự cố; gọi tên sự cố nên chỉ tồn tại
 *  sau khi phiên đã kết thúc. */
export interface IncidentReport {
  title: string
  reveal_md: string
  /** Số request/giây **giả định** của kịch bản, do tác giả gõ chứ không ai đo.
   *  Gửi kèm để màn hình nói rõ `requests_failed` suy ra từ đâu. */
  rps: number
  /** null nghĩa là dịch vụ chưa bao giờ sống lại — hết giờ cũng là một kết quả,
   *  không phải một trường bị thiếu. */
  recovered_at: string | null
  downtime_seconds: number
  requests_failed: number
  timeline: IncidentCommand[]
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
  /** null với mọi lab không phải lab sự cố. Đây là thứ màn kết quả rẽ nhánh để
   *  quyết định có vẽ phần ca trực hay không. */
  incident: IncidentReport | null
}

export interface LabSession {
  id: string
  lab_id: number
  /** Where the session lives. Empty only if the lab or course row went away
   *  under a session that is still running — the id is still enough to end it. */
  lab_slug: string
  course_slug: string
  /** Nhiệm vụ đã đậu **trong chính phiên này** (`lab_answers WHERE session_id`),
   *  không phải mọi phiên: mở lại lab là làm lại từ đầu. Gửi kèm phiên để tải
   *  lại trang không mất dấu tick — và ở lab sự cố, hết sạch nhiệm vụ chính là
   *  thứ nói dịch vụ đã sống lại. */
  passed_task_ids: number[]
  status: 'running' | 'ended' | 'expired'
  started_at: string
  expires_at: string
  seconds_left: number
  /** Path only. The websocket origin is derived from the API base so dev and
   *  prod do not need two different values here. */
  terminal_path: string
  /** null trừ khi phiên này bốc trúng một sự cố. Chỉ mang `rps` — tên sự cố, nó
   *  phá cái gì, tìm ra bằng cách nào đều là thứ học viên đang phải tự mò, nên
   *  không cái nào rời server lúc phiên còn chạy. */
  incident: { rps: number } | null
}
