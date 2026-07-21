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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

const STATUSES = ['requested', 'approved', 'rejected', 'picked_up', 'inspecting', 'refunded', 'exchanged'] as const
type Status = (typeof STATUSES)[number]

const statusVariant: Record<Status, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  requested: 'secondary',
  approved: 'outline',
  rejected: 'destructive',
  picked_up: 'outline',
  inspecting: 'outline',
  refunded: 'default',
  exchanged: 'default',
}

interface OrderItem {
  id: string
  product_name: string
  variant_label: string | null
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  order_items: OrderItem[]
}

interface ReturnRow {
  id: string
  quantity: number
  reason: string | null
  status: Status
  refund_amount: number | null
  order: { order_number: string; customer_name: string } | null
  order_item: { product_name: string; variant_label: string | null } | null
}

export function ReturnsPage() {
  const { data, loading, error, refetch } = useApiResource<{ returns: ReturnRow[] }>('/returns')
  const { data: ordersData } = useApiResource<{ orders: Order[] }>('/orders')

  const [open, setOpen] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [orderItemId, setOrderItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedOrder = ordersData?.orders.find((o) => o.id === orderId)

  function resetForm() {
    setOrderId('')
    setOrderItemId('')
    setQuantity('1')
    setReason('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!orderId || !orderItemId) {
      toast.error('Select an order and item')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/returns', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          order_item_id: orderItemId,
          quantity: Number(quantity) || 1,
          reason: reason || null,
        }),
      })
      toast.success('Return requested')
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create return')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(ret: ReturnRow, status: Status | null) {
    if (!status || status === ret.status) return
    try {
      await apiFetch(`/returns/${ret.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      toast.success(
        status === 'refunded'
          ? `Refunded — stock restocked for ${ret.order_item?.product_name}`
          : `Return marked ${status.replace(/_/g, ' ')}`,
      )
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update return')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Returns & Refunds</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New return</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New return</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Order</Label>
                <Select value={orderId} onValueChange={(value) => { setOrderId(value ?? ''); setOrderItemId('') }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordersData?.orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_number} — {o.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Item</Label>
                <Select value={orderItemId} onValueChange={(value) => setOrderItemId(value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOrder?.order_items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.product_name} {item.variant_label ? `(${item.variant_label})` : ''} — qty {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="r-qty">Quantity</Label>
                <Input id="r-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="r-reason">Reason</Label>
                <Textarea id="r-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create return'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load returns — connect Supabase and run the Phase 4 returns schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.returns.map((ret) => (
              <TableRow key={ret.id}>
                <TableCell className="font-medium">
                  {ret.order?.order_number} — {ret.order?.customer_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ret.order_item?.product_name} {ret.order_item?.variant_label ? `(${ret.order_item.variant_label})` : ''}
                </TableCell>
                <TableCell>{ret.quantity}</TableCell>
                <TableCell>{ret.refund_amount}</TableCell>
                <TableCell>
                  <Select value={ret.status} onValueChange={(value) => handleStatusChange(ret, value as Status | null)}>
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        <Badge variant={statusVariant[ret.status]}>{ret.status.replace(/_/g, ' ')}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {data.returns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No returns yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
