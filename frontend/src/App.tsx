import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterOrganisationPage from './pages/RegisterOrganisationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import OrganisationDashboardPage from './pages/OrganisationDashboardPage'
import OrganisationUsersPage from './pages/OrganisationUsersPage'
import PlatformOrganisationsPage from './pages/PlatformOrganisationsPage'
import PlatformOrganisationDetailPage from './pages/PlatformOrganisationDetailPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-organisation" element={<RegisterOrganisationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/dashboard" element={<ProtectedRoute component={DashboardPage} />} />
        <Route
          path="/organisation/dashboard"
          element={<ProtectedRoute component={OrganisationDashboardPage} />}
        />
        <Route
          path="/organisation/users"
          element={<ProtectedRoute component={OrganisationUsersPage} />}
        />
        <Route
          path="/platform/organisations"
          element={<ProtectedRoute component={PlatformOrganisationsPage} />}
        />
        <Route
          path="/platform/organisations/:id"
          element={<ProtectedRoute component={PlatformOrganisationDetailPage} />}
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
