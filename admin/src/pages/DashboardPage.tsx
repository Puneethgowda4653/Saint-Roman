import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
}

interface LowStockVariant {
  id: string
  productName: string
  variantLabel: string | null
  stockQuantity: number
}

interface Summary {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  totalActiveProducts: number
  pendingReturns: number
  ordersByStatus: Record<string, number>
  lowStockVariants: LowStockVariant[]
  recentOrders: RecentOrder[]
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data, loading, error } = useApiResource<Summary>('/dashboard/summary')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load dashboard data.</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Orders" value={String(data.totalOrders)} />
            <StatCard label="Revenue" value={formatCurrency(data.totalRevenue)} />
            <StatCard label="Customers" value={String(data.totalCustomers)} />
            <StatCard label="Active Products" value={String(data.totalActiveProducts)} />
            <StatCard label="Pending Returns" value={String(data.pendingReturns)} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.status.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.recentOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No orders yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low stock</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lowStockVariants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{variant.variantLabel ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={variant.stockQuantity === 0 ? 'destructive' : 'secondary'}>
                            {variant.stockQuantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.lowStockVariants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nothing low on stock.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Orders by status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-sm">
                  {status.replace(/_/g, ' ')}: {count}
                </Badge>
              ))}
              {Object.keys(data.ordersByStatus).length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
