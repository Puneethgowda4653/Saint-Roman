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

const STATUSES = [
  'pending', 'processing', 'packed', 'ready_to_ship', 'shipped',
  'delivered', 'cancelled', 'returned', 'refund_initiated', 'refund_completed',
] as const

type Status = (typeof STATUSES)[number]

interface OrderItem {
  id: string
  product_name: string
  variant_label: string | null
  quantity: number
  unit_price: number
  line_total: number
}

interface Order {
  id: string
  order_number: string
  status: Status
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  total: number
  order_items: OrderItem[]
}

interface InventoryVariant {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  price: number
  stock_quantity: number
  product: { id: string; name: string } | null
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface LineDraft {
  variantId: string
  quantity: number
}

const statusVariant: Record<Status, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  processing: 'secondary',
  packed: 'outline',
  ready_to_ship: 'outline',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  returned: 'destructive',
  refund_initiated: 'destructive',
  refund_completed: 'destructive',
}

export function OrdersPage() {
  const { data, loading, error, refetch } = useApiResource<{ orders: Order[] }>('/orders')
  const { data: inventoryData } = useApiResource<{ variants: InventoryVariant[] }>('/inventory')
  const { data: customersData } = useApiResource<{ customers: Customer[] }>('/customers')

  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingFee, setShippingFee] = useState('0')
  const [lines, setLines] = useState<LineDraft[]>([{ variantId: '', quantity: 1 }])
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setCustomerId('')
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setShippingFee('0')
    setLines([{ variantId: '', quantity: 1 }])
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function findVariant(id: string) {
    return inventoryData?.variants.find((v) => v.id === id)
  }

  function handleSelectCustomer(id: string) {
    setCustomerId(id)
    const customer = customersData?.customers.find((c) => c.id === id)
    if (customer) {
      setCustomerName(customer.name)
      setCustomerEmail(customer.email ?? '')
      setCustomerPhone(customer.phone ?? '')
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const validLines = lines.filter((l) => l.variantId && l.quantity > 0)
    if (validLines.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    setSaving(true)
    try {
      const items = validLines.map((l) => {
        const variant = findVariant(l.variantId)!
        return {
          variant_id: variant.id,
          product_name: variant.product?.name ?? 'Unknown product',
          variant_label: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
          quantity: l.quantity,
          unit_price: variant.price,
        }
      })

      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId || null,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          shipping_fee: Number(shippingFee) || 0,
          items,
        }),
      })
      toast.success('Order created')
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(order: Order, status: Status | null) {
    if (!status || status === order.status) return
    try {
      await apiFetch(`/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      toast.success(`Order ${order.order_number} marked ${status.replace(/_/g, ' ')}`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}>
          <DialogTrigger render={<Button>New order</Button>} />
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Existing customer (optional)</Label>
                <Select value={customerId} onValueChange={(value) => handleSelectCustomer(value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in / new customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="o-name">Customer name</Label>
                <Input id="o-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="o-email">Email</Label>
                  <Input id="o-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="o-phone">Phone</Label>
                  <Input id="o-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLines((prev) => [...prev, { variantId: '', quantity: 1 }])}
                  >
                    Add item
                  </Button>
                </div>
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
                    <Select value={line.variantId} onValueChange={(value) => updateLine(index, { variantId: value ?? '' })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryData?.variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.product?.name} — {[v.size, v.color].filter(Boolean).join('/') || 'default'} ({v.stock_quantity} in stock)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 1 })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="o-shipping">Shipping fee</Label>
                <Input
                  id="o-shipping"
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create order'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load orders — connect Supabase and run the Phase 3 orders schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell className="text-muted-foreground">{order.order_items?.length ?? 0}</TableCell>
                <TableCell>{order.total}</TableCell>
                <TableCell>
                  <Select value={order.status} onValueChange={(value) => handleStatusChange(order, value as Status | null)}>
                    <SelectTrigger className="w-44">
                      <SelectValue>
                        <Badge variant={statusVariant[order.status]}>{order.status.replace(/_/g, ' ')}</Badge>
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
            {data.orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
