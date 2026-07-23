import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

const ROLES = ['admin', 'manager', 'warehouse', 'marketing', 'finance', 'support', 'vendor'] as const
type Role = (typeof ROLES)[number]

interface Member {
  id: string
  email: string | null
  full_name: string | null
  role: Role
}

export function TeamPage() {
  const { data, loading, error, refetch } = useApiResource<{ members: Member[] }>('/team')

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('manager')
  const [saving, setSaving] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await apiFetch('/team', {
        method: 'POST',
        body: JSON.stringify({ email, full_name: fullName || null, role }),
      })
      setTempPassword(result.temp_password)
      toast.success('Team member created')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create team member')
    } finally {
      setSaving(false)
    }
  }

  async function updateRole(member: Member, newRole: Role) {
    try {
      await apiFetch(`/team/${member.id}`, { method: 'PUT', body: JSON.stringify({ role: newRole }) })
      toast.success(`${member.email} is now ${newRole}`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEmail('')
      setFullName('')
      setRole('manager')
      setTempPassword(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New team member</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New team member</DialogTitle>
            </DialogHeader>
            {tempPassword ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  Account created. There's no email invite system configured, so share this temporary password
                  with them directly — it won't be shown again.
                </p>
                <code className="rounded-md bg-muted p-2 text-sm">{tempPassword}</code>
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-email">Email</Label>
                  <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-name">Full name</Label>
                  <Input id="t-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load team — admin role required.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.full_name ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Select value={member.role} onValueChange={(v) => v && updateRole(member, v as Role)}>
                    <SelectTrigger className="w-36">
                      <SelectValue>
                        <Badge variant="outline">{member.role}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {data.members.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No team members yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
