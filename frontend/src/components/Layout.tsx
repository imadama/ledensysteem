import { type ReactNode } from 'react'
import AppHeader from './AppHeader'

type LayoutProps = {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell__main">{children}</main>
    </div>
  )
}

export default Layout

