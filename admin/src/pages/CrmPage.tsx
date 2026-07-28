import { Fragment, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Member {
  id: string
  name: string
  email: string | null
  order_count: number
  lifetime_value: number
}

interface Segment {
  id: string
  name: string
  description: string | null
  min_orders: number
  min_spend: number
  member_count: number
  members: Member[]
}

export function CrmPage() {
  const { data, loading, error, refetch } = useApiResource<{
    segments: Segment[]
    total_customers: number
  }>('/crm/segments')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [minOrders, setMinOrders] = useState('0')
  const [minSpend, setMinSpend] = useState('0')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setDescription('')
    setMinOrders('0')
    setMinSpend('0')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/crm/segments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || null,
          min_orders: Number(minOrders) || 0,
          min_spend: Number(minSpend) || 0,
        }),
      })
      toast.success('Segment created')
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save segment')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete segment "${name}"?`)) return
    try {
      await apiFetch(`/crm/segments/${id}`, { method: 'DELETE' })
      toast.success('Segment deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete segment')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM — Segments</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total_customers} total customers
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger render={<Button>New segment</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New segment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. VIP customers" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-desc">Description</Label>
                <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-orders">Min. orders</Label>
                  <Input id="c-orders" type="number" value={minOrders} onChange={(e) => setMinOrders(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-spend">Min. spend (₹)</Label>
                  <Input id="c-spend" type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load segments.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.segments.map((seg) => (
              <Fragment key={seg.id}>
                <TableRow>
                  <TableCell className="font-medium">
                    {seg.name}
                    {seg.description && (
                      <span className="block text-xs text-muted-foreground">{seg.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    ≥ {seg.min_orders} orders · ≥ ₹{seg.min_spend} spent
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={() => setExpanded(expanded === seg.id ? null : seg.id)}
                    >
                      {seg.member_count}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(seg.id, seg.name)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded === seg.id && (
                  <TableRow key={`${seg.id}-members`}>
                    <TableCell colSpan={4} className="bg-muted/40">
                      {seg.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No customers match this segment yet.</p>
                      ) : (
                        <ul className="flex flex-col gap-1 text-sm">
                          {seg.members.map((m) => (
                            <li key={m.id} className="flex justify-between">
                              <span>{m.name}{m.email ? ` · ${m.email}` : ''}</span>
                              <span className="text-muted-foreground">
                                {m.order_count} orders · ₹{m.lifetime_value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {data.segments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No segments yet. Create one to group customers by orders and spend.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
