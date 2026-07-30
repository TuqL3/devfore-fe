import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '@/components/AdminLayout'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import VerifyEmail from '@/pages/VerifyEmail'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import AuthCallback from '@/pages/AuthCallback'
import Home from '@/pages/Home'
import Courses from '@/pages/Courses'
import CourseDetail from '@/pages/CourseDetail'
import Profile from '@/pages/Profile'
import LabRunner from '@/pages/LabRunner'
import Admin from '@/pages/Admin'
import AdminCourse from '@/pages/AdminCourse'
import AdminCourseForm from '@/pages/AdminCourseForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* The lab runner owns the whole viewport — a site header above a terminal
          steals rows from it and puts a second nav in front of someone who is
          meant to be looking at one thing. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/courses/:slug/labs/:labSlug" element={<LabRunner />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* The guard here only keeps the screen out of sight; every admin
            endpoint checks the role itself, because this one runs on the
            client and anyone can edit a client. */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminLayout />}>
            {/* /admin has no screen of its own yet — the dashboard that would
                live there is not built, so it opens the section that is. */}
            <Route index element={<Navigate to="/admin/courses" replace />} />
            <Route path="courses" element={<Admin />} />
            {/* Static before param: /admin/courses/new must not be read as a
                course whose id is "new". */}
            <Route path="courses/new" element={<AdminCourseForm />} />
            <Route path="courses/:id/edit" element={<AdminCourseForm />} />
            <Route path="courses/:id" element={<AdminCourse />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
