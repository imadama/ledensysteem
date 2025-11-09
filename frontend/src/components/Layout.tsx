import TopNav from './TopNav'

type LayoutProps = {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-shell__main">{children}</main>
    </div>
  )
}

export default Layout

