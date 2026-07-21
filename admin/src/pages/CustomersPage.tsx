import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  order_count: number
  lifetime_value: number
}

export function CustomersPage() {
  const { data, loading, error, refetch } = useApiResource<{ customers: Customer[] }>('/customers')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setName('')
    setEmail('')
    setPhone('')
    setNotes('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(customer: Customer) {
    setEditingId(customer.id)
    setName(customer.name)
    setEmail(customer.email ?? '')
    setPhone(customer.phone ?? '')
    setNotes(customer.notes ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { name, email: email || null, phone: phone || null, notes: notes || null }
      if (editingId) {
        await apiFetch(`/customers/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Customer updated')
      } else {
        await apiFetch('/customers', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Customer created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    try {
      await apiFetch(`/customers/${id}`, { method: 'DELETE' })
      toast.success('Customer deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New customer</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit customer' : 'New customer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-notes">Notes</Label>
                <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load customers — connect Supabase and run the Phase 4 schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Lifetime value</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-muted-foreground">{customer.email ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{customer.phone ?? '—'}</TableCell>
                <TableCell>{customer.order_count}</TableCell>
                <TableCell>{customer.lifetime_value}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id, customer.name)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
