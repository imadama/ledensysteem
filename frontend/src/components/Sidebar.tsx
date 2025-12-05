import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  LogOut, 
  X,
  Home,
  DollarSign,
  User,
  CreditCard,
  FileText,
  Monitor
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMemberAuth } from '../context/MemberAuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'platform-admin' | 'org-admin' | 'member'
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, organisation, logout } = useAuth()
  const { memberUser, memberLogout } = useMemberAuth()

  const platformAdminItems = [
    { name: 'Dashboard', icon: LayoutDashboard, view: 'dashboard', path: '/dashboard' },
    { name: 'Organisaties', icon: Building2, view: 'organisations', path: '/platform/organisations' },
    { name: 'Plannen', icon: FileText, view: 'plans', path: '/platform/plans' },
    { name: 'Instellingen', icon: Settings, view: 'settings', path: '/platform/settings' },
  ]

  const orgAdminItems = [
    { name: 'Dashboard', icon: LayoutDashboard, view: 'dashboard', path: '/organisation/dashboard' },
    { name: 'Leden', icon: Users, view: 'members', path: '/organisation/members' },
    { name: 'Contributies', icon: DollarSign, view: 'contributions', path: '/organisation/contributions' },
    { name: 'Beheerders', icon: Users, view: 'users', path: '/organisation/users' },
    { name: 'Monitor', icon: Monitor, view: 'monitor', path: '/monitor' },
    { name: 'Stripe', icon: CreditCard, view: 'stripe', path: '/organisation/settings/payments' },
    { name: 'Instellingen', icon: Settings, view: 'settings', path: '/organisation/subscription' },
  ]

  const memberItems = [
    { name: 'Dashboard', icon: Home, view: 'dashboard', path: '/portal/dashboard' },
    { name: 'Mijn Contributies', icon: DollarSign, view: 'contributions', path: '/portal/contribution' },
    { name: 'Profiel', icon: User, view: 'profile', path: '/portal/profile' },
  ]

  const menuItems = useMemo(() => {
    if (userRole === 'platform-admin') {
      return platformAdminItems
    } else if (userRole === 'org-admin') {
      return orgAdminItems
    } else {
      return memberItems
    }
  }, [userRole])

  const handleLogout = async () => {
    try {
      if (userRole === 'member') {
        await memberLogout()
        navigate('/portal/login')
      } else {
        await logout()
        navigate('/login')
      }
      onClose()
    } catch (error) {
      console.error('Kon niet uitloggen', error)
    }
  }

  const currentUser = userRole === 'member' ? memberUser : user
  const currentOrganisation = userRole === 'member' ? memberUser?.organisation : organisation

  const getUserDisplayName = () => {
    if (userRole === 'member' && memberUser) {
      // Try full name first, fall back to email if not available
      if (memberUser.member.first_name && memberUser.member.last_name) {
        return `${memberUser.member.first_name} ${memberUser.member.last_name}`
      }
      return memberUser.user.email || 'Gebruiker'
    }
    if (user && user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || 'Gebruiker'
  }

  const getUserInitials = () => {
    if (userRole === 'member' && memberUser) {
      const first = memberUser.member.first_name?.trim().charAt(0) ?? ''
      const last = memberUser.member.last_name?.trim().charAt(0) ?? ''
      return `${first}${last}`.toUpperCase() || memberUser.member.email?.charAt(0).toUpperCase() || 'M'
    }
    if (user) {
      const first = user.first_name?.trim().charAt(0) ?? ''
      const last = user.last_name?.trim().charAt(0) ?? ''
      return `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
    }
    return '?'
  }

  const getRoleLabel = () => {
    if (userRole === 'platform-admin') return 'Platform Admin'
    if (userRole === 'org-admin') return 'Organisatie Admin'
    return 'Lid'
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  if (!currentUser) {
    return null
  }

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 shadow-2xl`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              LedenSysteem
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {currentOrganisation?.name && (
          <div className="px-6 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {currentOrganisation.name}
            </p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`transition-colors duration-200 ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="font-medium transition-colors duration-200">
                  {item.name}
                </span>
                {active && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-80" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {getRoleLabel()}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-2 flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Uitloggen</span>
          </button>
        </div>
      </div>
    </>
  )
}

