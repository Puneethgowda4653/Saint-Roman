import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Orders', 'Revenue', 'Customers', 'Products'].map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        KPI widgets go live once the products, orders, and customer modules ship in later phases.
      </p>
    </div>
  )
}
