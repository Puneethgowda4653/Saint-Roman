import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'

interface Summary {
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  orderCount: number
  averageOrderValue: number
  pendingReturns: number
  ordersByStatus: Record<string, number>
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function FinancePage() {
  const { data, loading, error } = useApiResource<Summary>('/finance/summary')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Finance</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load finance summary — connect Supabase and make sure Orders/Returns are set up.
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Revenue" value={formatCurrency(data.totalRevenue)} />
            <StatCard label="Refunds" value={formatCurrency(data.totalRefunds)} />
            <StatCard label="Net revenue" value={formatCurrency(data.netRevenue)} />
            <StatCard label="Avg. order value" value={formatCurrency(data.averageOrderValue)} />
            <StatCard label="Pending returns" value={String(data.pendingReturns)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Orders by status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.ordersByStatus).map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell className="capitalize">{status.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(data.ordersByStatus).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
