export interface User {
  id: number
  username: string
  email: string
  avatar_url: string | null
  status: string
  roles: string[]
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface AuthResponse extends TokenPair {
  user: User
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
  username: string
  score: number
}
