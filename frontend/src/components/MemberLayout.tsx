import MemberTopNav from './MemberTopNav'

type MemberLayoutProps = {
  children: React.ReactNode
}

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <MemberTopNav />
      <main className="app-shell__main">{children}</main>
    </div>
  )
}

export default MemberLayout


