import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import { MemberAuthProvider } from './context/MemberAuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MemberProtectedRoute from './components/MemberProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterOrganisationPage from './pages/RegisterOrganisationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import OrganisationDashboardPage from './pages/OrganisationDashboardPage'
import OrganisationUsersPage from './pages/OrganisationUsersPage'
import PlatformOrganisationsPage from './pages/PlatformOrganisationsPage'
import PlatformOrganisationDetailPage from './pages/PlatformOrganisationDetailPage'
import PlatformPlansPage from './pages/PlatformPlansPage'
import PlatformSettingsPage from './pages/PlatformSettingsPage'
import OrganisationMembersListPage from './pages/OrganisationMembersListPage'
import OrganisationMemberDetailPage from './pages/OrganisationMemberDetailPage'
import OrganisationMembersImportPage from './pages/OrganisationMembersImportPage'
import OrganisationPaymentsSettingsPage from './pages/OrganisationPaymentsSettingsPage'
import OrganisationContributionsOverviewPage from './pages/OrganisationContributionsOverviewPage'
import OrganisationSubscriptionPage from './pages/OrganisationSubscriptionPage'
import SubscriptionHistoryPage from './pages/SubscriptionHistoryPage'
import MemberLoginPage from './pages/member/MemberLoginPage'
import MemberActivationPage from './pages/member/MemberActivationPage'
import MemberDashboardPage from './pages/member/MemberDashboardPage'
import MemberProfilePage from './pages/member/MemberProfilePage'
import MemberContributionPage from './pages/member/MemberContributionPage'
import MemberContributionSuccessPage from './pages/member/MemberContributionSuccessPage'
import MemberContributionCancelPage from './pages/member/MemberContributionCancelPage'
import MonitorPage from './pages/MonitorPage'
import PublicMemberRegistrationPage from './pages/PublicMemberRegistrationPage'
import PublicMemberRegistrationSuccessPage from './pages/PublicMemberRegistrationSuccessPage'

function App() {
  return (
    <AuthProvider>
      <MemberAuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-organisation" element={<RegisterOrganisationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/aanmelden" element={<PublicMemberRegistrationPage />} />
        <Route path="/aanmelden/succes" element={<PublicMemberRegistrationSuccessPage />} />

          <Route path="/portal/login" element={<MemberLoginPage />} />
          <Route path="/portal/activate" element={<MemberActivationPage />} />
          <Route path="/portal/dashboard" element={<MemberProtectedRoute component={MemberDashboardPage} />} />
          <Route path="/portal/profile" element={<MemberProtectedRoute component={MemberProfilePage} />} />
          <Route path="/portal/contribution" element={<MemberProtectedRoute component={MemberContributionPage} />} />
          <Route path="/portal/contribution/success" element={<MemberProtectedRoute component={MemberContributionSuccessPage} />} />
          <Route path="/portal/contribution/cancel" element={<MemberProtectedRoute component={MemberContributionCancelPage} />} />

        <Route path="/dashboard" element={<ProtectedRoute component={DashboardPage} />} />
        <Route
          path="/organisation/dashboard"
          element={<ProtectedRoute component={OrganisationDashboardPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/users"
          element={<ProtectedRoute component={OrganisationUsersPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/members"
          element={<ProtectedRoute component={OrganisationMembersListPage} roles={['org_admin']} />}
        />
        <Route path="/organisation/members/new" element={<PublicMemberRegistrationPage />} />
        <Route
          path="/organisation/members/import"
          element={<ProtectedRoute component={OrganisationMembersImportPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/settings/payments"
          element={<ProtectedRoute component={OrganisationPaymentsSettingsPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/contributions"
          element={<ProtectedRoute component={OrganisationContributionsOverviewPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/subscription"
          element={<ProtectedRoute component={OrganisationSubscriptionPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/subscription/history"
          element={<ProtectedRoute component={SubscriptionHistoryPage} roles={['org_admin']} />}
        />
        <Route
          path="/organisation/members/:id"
          element={<ProtectedRoute component={OrganisationMemberDetailPage} roles={['org_admin']} />}
        />
        <Route
          path="/platform/organisations"
          element={<ProtectedRoute component={PlatformOrganisationsPage} />}
        />
        <Route
          path="/platform/organisations/:id"
          element={<ProtectedRoute component={PlatformOrganisationDetailPage} />}
        />
        <Route
          path="/platform/plans"
          element={<ProtectedRoute component={PlatformPlansPage} roles={['platform_admin']} />}
        />
        <Route
          path="/platform/settings"
          element={<ProtectedRoute component={PlatformSettingsPage} roles={['platform_admin']} />}
        />
        <Route
          path="/monitor"
          element={<ProtectedRoute component={MonitorPage} roles={['monitor', 'org_admin']} noLayout={true} />}
        />

          <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </MemberAuthProvider>
    </AuthProvider>
  )
}

export default App
