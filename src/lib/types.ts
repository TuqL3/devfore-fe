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
  /** Empty when the author has not written one; the hint tab says so rather
   *  than showing a blank panel. */
  hint: string
  points: number
  order_idx: number
}

export interface LabDetail extends Lab {
  tasks: LabTask[]
}

export interface LabSession {
  id: string
  lab_id: number
  status: 'running' | 'ended' | 'expired'
  started_at: string
  expires_at: string
  seconds_left: number
  /** Path only. The websocket origin is derived from the API base so dev and
   *  prod do not need two different values here. */
  terminal_path: string
}
