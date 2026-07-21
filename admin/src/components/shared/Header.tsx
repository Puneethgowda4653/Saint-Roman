import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
