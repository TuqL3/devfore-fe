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
import LabHistory from '@/pages/LabHistory'
import Chat from '@/pages/Chat'
import LabReport from '@/pages/LabReport'
import Admin from '@/pages/Admin'
import AdminDashboard from '@/pages/AdminDashboard'
import AdminUsers from '@/pages/AdminUsers'
import AdminAudit from '@/pages/AdminAudit'
import AdminWarRoom from '@/pages/AdminWarRoom'
import AdminCourse from '@/pages/AdminCourse'
import AdminCourseForm from '@/pages/AdminCourseForm'
import SimList from '@/pages/SimList'
import SimPlayground from '@/pages/SimPlayground'
import WarRoom from '@/pages/WarRoom'
import SharedDrill, { SharedDrillIndex } from '@/pages/SharedDrill'
import { NotFound } from '@/pages/NotFound'
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
        {/* Cùng màn làm bài, không có khoá học phía sau: thử thách War Room vào
            thẳng từ nav. `drill` tắt phần bài trước/bài sau và đổi đường quay
            lại — phần còn lại (terminal, đồng hồ, chấm, nộp) giống hệt. */}
        <Route path="/war-room/:labSlug" element={<LabRunner drill />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        {/* Báo cáo ca trực người ta đăng công khai. Ngoài ProtectedRoute một
            cách cố ý: nó là link dán vào chỗ khác, và bắt đăng nhập trước khi
            được xem thứ vừa bấm vào là mất người ngay ở cửa. Đường dẫn ngắn vì
            nó sống trong tin nhắn của người khác. */}
        <Route path="/r/:token" element={<SharedDrill />} />
        <Route path="/r" element={<SharedDrillIndex />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<LabHistory />} />
          <Route path="/chat" element={<Chat />} />
          {/* Trình mô phỏng ở dạng công cụ: không khoá học, không phiên,
              không điểm. Cần đăng nhập vì mỗi lượt chạy tốn CPU của server,
              không vì có gì để bảo vệ.
              Cả hai đều nằm trong Layout như mọi trang khác — bản trước tách ra
              toàn màn hình và kết cục là một trang không giống chỗ nào còn lại
              của trang web. */}
          <Route path="/sim" element={<SimList />} />
          <Route path="/sim/:slug" element={<SimPlayground />} />
          {/* Danh sách thử thách. Màn làm bài của nó nằm ngoài Layout, cùng chỗ
              với màn làm lab — nó cũng chiếm trọn màn hình. */}
          <Route path="/war-room" element={<WarRoom />} />
          {/* One screen for both ways in: opened from the list, or landed on
              straight after handing a lab in, which adds ?done=1. */}
          <Route path="/history/:id" element={<LabReport />} />
        </Route>

        {/* The guard here only keeps the screen out of sight; every admin
            endpoint checks the role itself, because this one runs on the
            client and anyone can edit a client. */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminLayout />}>
            {/* /admin itself stays a redirect rather than rendering the
                dashboard twice under two URLs. */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="war-room" element={<AdminWarRoom />} />
            <Route path="courses" element={<Admin />} />
            {/* Static before param: /admin/courses/new must not be read as a
                course whose id is "new". */}
            <Route path="courses/new" element={<AdminCourseForm />} />
            <Route path="courses/:id/edit" element={<AdminCourseForm />} />
            <Route path="courses/:id" element={<AdminCourse />} />
            {/* Đặt trong nhánh quản trị chứ không dựa vào cái ở dưới: `/admin`
                đã khớp rồi, nên route bắt-tất-cả ngoài kia không bao giờ tới
                lượt — AdminLayout sẽ hiện ra với chỗ nội dung trống. */}
            <Route path="*" element={<NotFound variant="admin" />} />
          </Route>
        </Route>

        {/* Cuối cùng, và trong Layout: đường dẫn không khớp gì vẫn nên có thanh
            điều hướng, vì thứ người lạc cần là đường ra. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
