import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LoadingSpinner from './components/LoadingSpinner'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Dashboard from './pages/Dashboard'
import Questions from './pages/Questions'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Pages inside this layout need a logged-in user; otherwise -> /login.
function ProtectedLayout() {
  const { user, checking } = useAuth()

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <LoadingSpinner label="Loading…" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex bg-base text-ink">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

function LoginRoute() {
  const { user, checking } = useAuth()
  if (checking) return null
  return user ? <Navigate to="/" replace /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          {/* Public on purpose: they must work for people who cannot log in. */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
