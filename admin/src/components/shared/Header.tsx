import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useApiResource } from '@/hooks/useSupabase'

interface Notification {
  id: string
  type: string
  message: string
}

export function Header() {
  const { user, signOut } = useAuth()
  const { data } = useApiResource<{ notifications: Notification[]; count: number }>('/notifications')
  const [open, setOpen] = useState(false)

  return (
    <header className="relative flex h-14 items-center justify-between border-b px-4">
      <div />
      <div className="flex items-center gap-3">
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
            <Bell className="h-4 w-4" />
            {data && data.count > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                {data.count}
              </span>
            )}
          </Button>
          {open && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-md border bg-popover p-2 shadow-md">
              <p className="px-2 py-1 text-sm font-medium">Notifications</p>
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {data && data.notifications.length > 0 ? (
                  data.notifications.map((n) => (
                    <div key={n.id} className="rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      {n.message}
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Nothing to show right now.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
