import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderTree, Package, Boxes, ClipboardList, Undo2, Users, Wallet, Newspaper, HelpCircle, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/returns', label: 'Returns', icon: Undo2 },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/blog-posts', label: 'Blog Posts', icon: Newspaper },
  { to: '/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="px-4 py-5 text-lg font-semibold">Ellora Admin</div>
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
