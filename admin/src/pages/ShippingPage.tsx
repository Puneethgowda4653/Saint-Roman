import { useState, useEffect, type FormEvent } from 'react'
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

interface Rate {
  id: string
  zone_name: string
  min_order: number
  rate: number
  free_above: number | null
  active: boolean
}

interface Shipment {
  id: string
  order_number: string
  customer_name: string
  status: string
  courier: string | null
  tracking_number: string | null
  total: number
}

export function ShippingPage() {
  const rates = useApiResource<{ rates: Rate[] }>('/shipping/rates')
  const shipments = useApiResource<{ shipments: Shipment[] }>('/shipping/shipments')

  // ---- Rate rule form ----
  const [open, setOpen] = useState(false)
  const [zoneName, setZoneName] = useState('')
  const [minOrder, setMinOrder] = useState('0')
  const [rate, setRate] = useState('')
  const [freeAbove, setFreeAbove] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setZoneName('')
    setMinOrder('0')
    setRate('')
    setFreeAbove('')
  }

  async function handleCreateRate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/shipping/rates', {
        method: 'POST',
        body: JSON.stringify({
          zone_name: zoneName,
          min_order: Number(minOrder) || 0,
          rate: Number(rate) || 0,
          free_above: freeAbove ? Number(freeAbove) : null,
        }),
      })
      toast.success('Rate rule created')
      setOpen(false)
      resetForm()
      rates.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rate')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRate(id: string, zone: string) {
    if (!window.confirm(`Delete rate rule "${zone}"?`)) return
    try {
      await apiFetch(`/shipping/rates/${id}`, { method: 'DELETE' })
      toast.success('Rate rule deleted')
      rates.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rate')
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Shipments */}
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Shipping</h1>
        <h2 className="text-lg font-medium">Shipments</h2>
        {shipments.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {shipments.error && <p className="text-sm text-destructive">Couldn't load shipments.</p>}
        {shipments.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.data.shipments.map((s) => (
                <ShipmentRow key={s.id} shipment={s} onSaved={shipments.refetch} />
              ))}
              {shipments.data.shipments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No shipments yet. Orders appear here once they reach processing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Rate rules */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Shipping rate rules</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger render={<Button>New rate rule</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New rate rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-zone">Zone name</Label>
                  <Input id="s-zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} required placeholder="e.g. All India" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-min">Applies when subtotal ≥ (₹)</Label>
                  <Input id="s-min" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-rate">Shipping fee (₹)</Label>
                  <Input id="s-rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-free">Free above (₹, optional)</Label>
                  <Input id="s-free" type="number" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} />
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
        {rates.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rates.error && <p className="text-sm text-destructive">Couldn't load rates.</p>}
        {rates.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Subtotal ≥</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Free above</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.data.rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.zone_name}</TableCell>
                  <TableCell>₹{r.min_order}</TableCell>
                  <TableCell>₹{r.rate}</TableCell>
                  <TableCell className="text-muted-foreground">{r.free_above != null ? `₹${r.free_above}` : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRate(r.id, r.zone_name)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rates.data.rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No rate rules yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

function ShipmentRow({ shipment, onSaved }: { shipment: Shipment; onSaved: () => void }) {
  const [courier, setCourier] = useState(shipment.courier ?? '')
  const [tracking, setTracking] = useState(shipment.tracking_number ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCourier(shipment.courier ?? '')
    setTracking(shipment.tracking_number ?? '')
  }, [shipment.courier, shipment.tracking_number])

  const dirty = courier !== (shipment.courier ?? '') || tracking !== (shipment.tracking_number ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch(`/shipping/shipments/${shipment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ courier: courier || null, tracking_number: tracking || null }),
      })
      toast.success('Shipment updated')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shipment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{shipment.order_number}</TableCell>
      <TableCell>{shipment.customer_name}</TableCell>
      <TableCell className="capitalize text-muted-foreground">{shipment.status.replace(/_/g, ' ')}</TableCell>
      <TableCell>
        <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier" className="h-8" />
      </TableCell>
      <TableCell>
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking #" className="h-8" />
      </TableCell>
      <TableCell>
        <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? '…' : 'Save'}
        </Button>
      </TableCell>
    </TableRow>
  )
}
