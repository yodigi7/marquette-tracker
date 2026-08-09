import { Link, Outlet } from 'react-router'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { to: '/', label: 'Today' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <nav className="flex items-center gap-4 px-4 py-3">
          <span className="font-semibold">Marquette Tracker</span>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex gap-3 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className="text-stone-500 hover:text-stone-900">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
