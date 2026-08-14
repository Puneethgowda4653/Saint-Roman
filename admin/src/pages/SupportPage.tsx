import { useEffect, useMemo, useState } from 'react'
import { Search, Inbox, MoreHorizontal, Eye, Trash2, Mail, Phone, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

type Status = 'open' | 'in_progress' | 'resolved' | 'closed'
type Priority = 'low' | 'medium' | 'high'

const STATUSES: Status[] = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']

const STATUS_TABS: { value: Status | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_META: Record<Status, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400' },
  in_progress: { label: 'In progress', className: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  resolved: { label: 'Resolved', className: 'border-transparent bg-green-500/10 text-green-600 dark:text-green-400' },
  closed: { label: 'Closed', className: 'border-transparent bg-muted text-muted-foreground' },
}

const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'border-transparent bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  high: { label: 'High', className: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400' },
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

interface Ticket {
  id: string
  ticket_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  subject: string
  message: string | null
  status: Status
  priority: Priority
  internal_note: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface TicketsResponse {
  tickets: Ticket[]
  counts: Record<string, number>
}

// ─── Small pure helpers ─────────────────────────────────────────────────

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function buildQuery(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value)
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

// ─── Small subcomponents ────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={cn('text-xl font-semibold', accent)}>{value}</CardContent>
    </Card>
  )
}

function CustomerAvatar({ name }: { name: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {getInitials(name)}
    </div>
  )
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full max-w-24 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function EmptyState({ label, columns }: { label: string; columns: number }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="size-8" />
          <p className="text-sm">{label}</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────

export function SupportPage() {
  const [activeStatus, setActiveStatus] = useState<Status | ''>('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null)
  const [drawerNote, setDrawerNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const queryPath = useMemo(
    () =>
      '/support' +
      buildQuery({
        status: activeStatus || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: debouncedSearch || undefined,
      }),
    [activeStatus, priorityFilter, debouncedSearch]
  )

  const { data, loading, error, refetch } = useApiResource<TicketsResponse>(queryPath)

  const drawerTicket = data?.tickets.find((t) => t.id === drawerTicketId) ?? null

  useEffect(() => {
    setDrawerNote(drawerTicket?.internal_note ?? '')
  }, [drawerTicket?.id, drawerTicket?.internal_note])

  function resetFilters() {
    setActiveStatus('')
    setPriorityFilter('all')
    setSearchInput('')
  }

  async function updateTicket(ticket: Ticket, patch: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    try {
      await apiFetch(`/support/${ticket.id}`, { method: 'PUT', body: JSON.stringify(patch) })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket')
    }
  }

  async function handleSaveNote() {
    if (!drawerTicketId) return
    setSavingNote(true)
    try {
      await apiFetch(`/support/${drawerTicketId}`, { method: 'PUT', body: JSON.stringify({ internal_note: drawerNote }) })
      toast.success('Note saved')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDelete(ticket: Ticket) {
    if (!window.confirm(`Delete ticket ${ticket.ticket_number}? This can't be undone.`)) return
    try {
      await apiFetch(`/support/${ticket.id}`, { method: 'DELETE' })
      toast.success('Ticket deleted')
      if (drawerTicketId === ticket.id) setDrawerTicketId(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ticket')
    }
  }

  const columnCount = 6
  const counts = data?.counts

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Support Tickets</h1>
        <p className="text-sm text-muted-foreground">Every message from the storefront's contact form, in one queue.</p>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open" value={counts?.open ?? 0} accent="text-red-600 dark:text-red-400" />
        <StatCard label="In progress" value={counts?.in_progress ?? 0} accent="text-blue-600 dark:text-blue-400" />
        <StatCard label="Resolved" value={counts?.resolved ?? 0} accent="text-green-600 dark:text-green-400" />
        <StatCard label="Closed" value={counts?.closed ?? 0} />
      </div>

      {/* ── Toolbar: search + priority filter ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ticket #, customer, email, subject…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority">
              {(value: string) => (value === 'all' ? 'Priority' : PRIORITY_META[value as Priority].label)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(activeStatus || priorityFilter !== 'all' || debouncedSearch) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Status pill tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === '' ? counts?.all : counts?.[tab.value]
          const active = activeStatus === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
              <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {count ?? '–'}
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-destructive">Couldn't load support tickets.</p>}

      {/* ── Table ── */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:h-8 [&>th]:py-1">
              <TableHead>Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <SkeletonRows columns={columnCount} />}

            {!loading && data && data.tickets.length === 0 && (
              <EmptyState
                columns={columnCount}
                label={activeStatus ? `No ${formatStatus(activeStatus)} tickets.` : 'No support tickets match these filters.'}
              />
            )}

            {!loading &&
              data?.tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-no-row-click]')) return
                    setDrawerTicketId(ticket.id)
                  }}
                  className={cn(
                    'cursor-pointer [&>td]:py-2',
                    ticket.status === 'open' && ticket.priority === 'high' && 'bg-destructive/5 hover:bg-destructive/10'
                  )}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-medium">{ticket.ticket_number}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(ticket.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CustomerAvatar name={ticket.customer_name} />
                      <div className="flex flex-col">
                        <span className="font-medium">{ticket.customer_name}</span>
                        <span className="text-xs text-muted-foreground">{ticket.customer_email ?? ticket.customer_phone ?? '—'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-col">
                      <span className="truncate font-medium">{ticket.subject}</span>
                      <span className="truncate text-xs text-muted-foreground">{ticket.message}</span>
                    </div>
                  </TableCell>
                  <TableCell data-no-row-click>
                    <Select
                      value={ticket.priority}
                      onValueChange={(v) => v && v !== ticket.priority && updateTicket(ticket, { priority: v as Priority })}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue>
                          <Badge variant="outline" className={PRIORITY_META[ticket.priority].className}>
                            {PRIORITY_META[ticket.priority].label}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_META[p].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell data-no-row-click>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => v && v !== ticket.status && updateTicket(ticket, { status: v as Status })}
                    >
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue>
                          <Badge variant="outline" className={STATUS_META[ticket.status].className}>
                            {STATUS_META[ticket.status].label}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell data-no-row-click>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDrawerTicketId(ticket.id)}>
                          <Eye />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(ticket)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Ticket detail drawer ── */}
      <Sheet open={drawerTicketId !== null} onOpenChange={(next) => !next && setDrawerTicketId(null)}>
        <SheetContent>
          {drawerTicket && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{drawerTicket.ticket_number}</SheetTitle>
                <SheetDescription>
                  Received {formatRelativeTime(drawerTicket.created_at)}
                  {drawerTicket.resolved_at && ` · Resolved ${formatRelativeTime(drawerTicket.resolved_at)}`}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_META[drawerTicket.status].className}>
                    {STATUS_META[drawerTicket.status].label}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_META[drawerTicket.priority].className}>
                    {PRIORITY_META[drawerTicket.priority].label} priority
                  </Badge>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer</h3>
                  <div className="flex items-center gap-2">
                    <CustomerAvatar name={drawerTicket.customer_name} />
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{drawerTicket.customer_name}</span>
                      {drawerTicket.customer_email && (
                        <a href={`mailto:${drawerTicket.customer_email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Mail className="size-3" />
                          {drawerTicket.customer_email}
                        </a>
                      )}
                      {drawerTicket.customer_phone && (
                        <a href={`tel:${drawerTicket.customer_phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Phone className="size-3" />
                          {drawerTicket.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{drawerTicket.subject}</h3>
                  <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{drawerTicket.message || '—'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Priority</span>
                    <Select
                      value={drawerTicket.priority}
                      onValueChange={(v) => v && updateTicket(drawerTicket, { priority: v as Priority })}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_META[p].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</span>
                    <Select value={drawerTicket.status} onValueChange={(v) => v && updateTicket(drawerTicket, { status: v as Status })}>
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Internal note</h3>
                  <Textarea
                    value={drawerNote}
                    onChange={(e) => setDrawerNote(e.target.value)}
                    rows={3}
                    placeholder="Only visible to the team — not sent to the customer."
                  />
                </div>
              </div>

              <SheetFooter>
                <Button variant="outline" onClick={() => handleDelete(drawerTicket)}>
                  <Trash2 />
                  Delete ticket
                </Button>
                <Button onClick={handleSaveNote} disabled={savingNote}>
                  {savingNote ? 'Saving…' : 'Save note'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
