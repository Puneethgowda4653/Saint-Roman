import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'

interface AuditLog {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export function AuditLogsPage() {
  const { data, loading, error } = useApiResource<{ logs: AuditLog[] }>('/audit')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <p className="text-sm text-muted-foreground">
        Logs logins, product price changes, product deletions, order status changes, and refunds. Not a
        blanket log of every request (see project notes for why).
      </p>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load audit logs.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>{log.actor_email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action.replace(/_/g, ' ')}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{log.entity_type}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {log.details ? JSON.stringify(log.details) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {data.logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
