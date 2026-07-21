import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface Variant {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  price: number
  stock_quantity: number
  reserved_quantity: number
  product: { id: string; name: string } | null
}

const reasons = [
  { value: 'purchase_order', label: 'Purchase order (incoming stock)' },
  { value: 'manual_adjustment', label: 'Manual adjustment' },
  { value: 'cycle_count', label: 'Cycle count correction' },
  { value: 'return', label: 'Customer return' },
  { value: 'damage', label: 'Damage / write-off' },
]

export function InventoryPage() {
  const { data, loading, error, refetch } = useApiResource<{ variants: Variant[] }>('/inventory')

  const [target, setTarget] = useState<Variant | null>(null)
  const [changeQuantity, setChangeQuantity] = useState('')
  const [reason, setReason] = useState('manual_adjustment')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  function openAdjust(variant: Variant) {
    setTarget(variant)
    setChangeQuantity('')
    setReason('manual_adjustment')
    setNote('')
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault()
    if (!target) return
    const delta = Number(changeQuantity)
    if (!delta) {
      toast.error('Enter a non-zero quantity (positive to add stock, negative to remove)')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ variant_id: target.id, change_quantity: delta, reason, note: note || null }),
      })
      toast.success('Stock updated')
      setTarget(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load inventory — connect Supabase and run the Phase 3 schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.variants.map((variant) => {
              const available = variant.stock_quantity - variant.reserved_quantity
              return (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.product?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[variant.size, variant.color].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{variant.sku ?? '—'}</TableCell>
                  <TableCell>{variant.stock_quantity}</TableCell>
                  <TableCell>{variant.reserved_quantity}</TableCell>
                  <TableCell>
                    <Badge variant={available <= 0 ? 'secondary' : 'default'}>{available}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openAdjust(variant)}>
                      Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {data.variants.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No variants yet — add variants to a product first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={target !== null} onOpenChange={(next) => !next && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {target?.product?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="qty">Quantity change</Label>
              <Input
                id="qty"
                type="number"
                placeholder="e.g. 10 to add, -5 to remove"
                value={changeQuantity}
                onChange={(e) => setChangeQuantity(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(value) => setReason(value ?? 'manual_adjustment')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Apply'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
