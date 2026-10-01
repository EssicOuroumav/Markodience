/** Un template est recréé à chaque navigation : le contenu de chaque onglet entre avec une animation douce. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
