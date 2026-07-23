import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  product_name: string
  variant_label: string | null
  quantity: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: string
  order_items: OrderItem[]
}

// Module 12, Warehouse Dashboard — thin pass. No picking/packing/QC/barcode-scanning hardware
// integration (none exists), no separate warehouse tables — this is a filtered, action-oriented
// view over the same `orders` data Order Management already owns, using the order_status stages
// that already model warehouse fulfillment (processing -> packed -> ready_to_ship -> shipped).
const STAGES: { status: string; label: string; next: string; nextLabel: string }[] = [
  { status: 'processing', label: 'Picking', next: 'packed', nextLabel: 'Mark packed' },
  { status: 'packed', label: 'Packing done — QC', next: 'ready_to_ship', nextLabel: 'Mark ready to ship' },
  { status: 'ready_to_ship', label: 'Ready to ship', next: 'shipped', nextLabel: 'Mark shipped' },
]

export function WarehousePage() {
  const { data, loading, error, refetch } = useApiResource<{ orders: Order[] }>('/orders')

  async function advance(order: Order, nextStatus: string) {
    try {
      await apiFetch(`/orders/${order.id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) })
      toast.success(`${order.order_number} → ${nextStatus.replace(/_/g, ' ')}`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Warehouse</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load orders.</p>}

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const orders = data.orders.filter((o) => o.status === stage.status)
            return (
              <Card key={stage.status}>
                <CardHeader>
                  <CardTitle>
                    {stage.label} ({orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{order.order_number}</span>
                        <span className="text-muted-foreground">{order.customer_name}</span>
                      </div>
                      <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                        {order.order_items.map((item) => (
                          <li key={item.id}>
                            {item.product_name}
                            {item.variant_label ? ` (${item.variant_label})` : ''} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" className="mt-2 w-full" onClick={() => advance(order, stage.next)}>
                        {stage.nextLabel}
                      </Button>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
