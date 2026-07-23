import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

type Status = 'open' | 'in_progress' | 'resolved' | 'closed'
type Priority = 'low' | 'medium' | 'high'

const STATUSES: Status[] = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']

const statusVariant: Record<Status, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'destructive',
  in_progress: 'secondary',
  resolved: 'default',
  closed: 'outline',
}

interface Ticket {
  id: string
  customer_name: string
  customer_email: string | null
  subject: string
  message: string | null
  status: Status
  priority: Priority
}

export function SupportPage() {
  const { data, loading, error, refetch } = useApiResource<{ tickets: Ticket[] }>('/support')

  async function updateTicket(ticket: Ticket, patch: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    try {
      await apiFetch(`/support/${ticket.id}`, { method: 'PUT', body: JSON.stringify(patch) })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Support Tickets</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load support tickets.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  {ticket.customer_name}
                  <div className="text-xs text-muted-foreground">{ticket.customer_email}</div>
                </TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{ticket.message}</TableCell>
                <TableCell>
                  <Select value={ticket.priority} onValueChange={(v) => v && updateTicket(ticket, { priority: v as Priority })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={ticket.status} onValueChange={(v) => v && updateTicket(ticket, { status: v as Status })}>
                    <SelectTrigger className="w-36">
                      <SelectValue>
                        <Badge variant={statusVariant[ticket.status]}>{ticket.status.replace(/_/g, ' ')}</Badge>
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
            {data.tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No support tickets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
