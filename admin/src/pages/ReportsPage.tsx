import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales Report' },
  { value: 'customers', label: 'Customer Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'products', label: 'Product Performance Report' },
  { value: 'returns', label: 'Return Report' },
  { value: 'profit', label: 'Profit Report' },
]

interface ReportColumn {
  key: string
  label: string
}

interface ReportData {
  title: string
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
}

function toCsv(data: ReportData) {
  const header = data.columns.map((c) => `"${c.label}"`).join(',')
  const rows = data.rows.map((row) =>
    data.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','),
  )
  return [header, ...rows].join('\n')
}

function downloadCsv(data: ReportData) {
  const csv = toCsv(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.title.toLowerCase().replace(/\s+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const { data, loading, error } = useApiResource<ReportData>(`/reports/${reportType}`)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={(value) => setReportType(value ?? 'sales')}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={!data} onClick={() => data && downloadCsv(data)}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load this report.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              {data.columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, index) => (
              <TableRow key={index}>
                {data.columns.map((c) => (
                  <TableCell key={c.key}>{String(row[c.key] ?? '—')}</TableCell>
                ))}
              </TableRow>
            ))}
            {data.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={data.columns.length} className="text-center text-muted-foreground">
                  No data for this report yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
