import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'
import Home from '@/pages/Home'
import Courses from '@/pages/Courses'
import CourseDetail from '@/pages/CourseDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
      </Route>
    </Routes>
  )
}
