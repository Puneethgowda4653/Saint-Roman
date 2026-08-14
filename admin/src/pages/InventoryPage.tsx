import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search, Package, MoreHorizontal, History, PencilLine, X, Download, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

interface Product {
  id: string
  name: string
  image_url: string | null
  category: { id: string; name: string } | null
}

interface Variant {
  id: string
  sku: string | null
  size: string | null
  color: string | null
  price: number
  stock_quantity: number
  reserved_quantity: number
  available: number
  status: StockStatus
  product: Product | null
}

interface InventoryResponse {
  variants: Variant[]
  counts: Record<string, number>
}

interface Category {
  id: string
  name: string
}

interface Adjustment {
  id: string
  change_quantity: number
  reason: string
  note: string | null
  actor_email: string | null
  created_at: string
}

const STATUS_TABS: { value: StockStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

const STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: 'In Stock', className: 'border-transparent bg-green-500/10 text-green-600 dark:text-green-400' },
  low_stock: { label: 'Low Stock', className: 'border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  out_of_stock: { label: 'Out of Stock', className: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400' },
}

const REASONS = [
  { value: 'purchase_order', label: 'Purchase order (incoming stock)' },
  { value: 'manual_adjustment', label: 'Manual adjustment' },
  { value: 'cycle_count', label: 'Cycle count correction' },
  { value: 'return', label: 'Customer return' },
  { value: 'damage', label: 'Damage / write-off' },
]

function reasonLabel(value: string) {
  return REASONS.find((r) => r.value === value)?.label ?? value.replace(/_/g, ' ')
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

function buildQuery(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value)
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function variantsToCsv(variants: Variant[]) {
  const header = ['Product', 'Variant', 'SKU', 'On hand', 'Reserved', 'Available', 'Status']
  const rows = variants.map((v) => [
    v.product?.name ?? '',
    [v.size, v.color].filter(Boolean).join(' / '),
    v.sku ?? '',
    String(v.stock_quantity),
    String(v.reserved_quantity),
    String(v.available),
    STATUS_META[v.status].label,
  ])
  return [header, ...rows].map((r) => r.map((cell) => csvEscape(String(cell))).join(',')).join('\n')
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

function ProductThumb({ product }: { product: Product | null }) {
  if (product?.image_url) {
    return <img src={product.image_url} alt="" className="size-9 shrink-0 rounded-md border object-cover" />
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
      <Package className="size-4 text-muted-foreground" />
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

export function InventoryPage() {
  const [activeStatus, setActiveStatus] = useState<StockStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const queryPath = useMemo(
    () =>
      '/inventory' +
      buildQuery({
        stock_status: activeStatus || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: debouncedSearch || undefined,
      }),
    [activeStatus, categoryFilter, debouncedSearch]
  )

  const { data, loading, error, refetch } = useApiResource<InventoryResponse>(queryPath)
  const { data: categoriesData } = useApiResource<{ categories: Category[] }>('/categories')

  // Adjust dialog
  const [target, setTarget] = useState<Variant | null>(null)
  const [changeQuantity, setChangeQuantity] = useState('')
  const [reason, setReason] = useState('manual_adjustment')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // History drawer
  const [historyVariant, setHistoryVariant] = useState<Variant | null>(null)
  const [history, setHistory] = useState<Adjustment[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!historyVariant) {
      setHistory(null)
      return
    }
    setHistoryLoading(true)
    apiFetch(`/inventory/${historyVariant.id}/history`)
      .then((res: { adjustments: Adjustment[] }) => setHistory(res.adjustments))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setHistoryLoading(false))
  }, [historyVariant])

  function resetFilters() {
    setActiveStatus('')
    setCategoryFilter('all')
    setSearchInput('')
  }

  function openAdjust(variant: Variant) {
    setTarget(variant)
    setChangeQuantity('')
    setReason('manual_adjustment')
    setNote('')
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault()
    if (!target) return
    const delta = Number(changeQuantity)
    if (!delta) {
      toast.error('Enter a non-zero quantity (positive to add stock, negative to remove)')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ variant_id: target.id, change_quantity: delta, reason, note: note || null }),
      })
      toast.success('Stock updated')
      setTarget(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  function handleExportCsv() {
    if (!data) return
    downloadCsv(variantsToCsv(data.variants), `inventory-${Date.now()}.csv`)
    toast.success(`Exported ${data.variants.length} row${data.variants.length === 1 ? '' : 's'}`)
  }

  const columnCount = 7
  const counts = data?.counts
  const unitsOnHand = data?.variants.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock on hand across every product variant.</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={!data}>
          <Download />
          Export CSV
        </Button>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total SKUs" value={counts?.all ?? 0} />
        <StatCard label="Units on hand" value={unitsOnHand} />
        <StatCard label="Low Stock" value={counts?.low_stock ?? 0} accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Out of Stock" value={counts?.out_of_stock ?? 0} accent="text-red-600 dark:text-red-400" />
      </div>

      {/* ── Toolbar: search + category filter ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search product name or SKU…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoriesData?.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(activeStatus || categoryFilter !== 'all' || debouncedSearch) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Stock status pill tabs ── */}
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

      {error && (
        <p className="text-sm text-destructive">
          Couldn't load inventory — connect Supabase and run the Phase 3 schema to enable this.
        </p>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:h-8 [&>th]:py-1">
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <SkeletonRows columns={columnCount} />}

            {!loading && data && data.variants.length === 0 && (
              <EmptyState columns={columnCount} label="No variants match these filters." />
            )}

            {!loading &&
              data?.variants.map((variant) => (
                <TableRow
                  key={variant.id}
                  className={cn('[&>td]:py-2', variant.status === 'out_of_stock' && 'bg-destructive/5 hover:bg-destructive/10')}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProductThumb product={variant.product} />
                      <div className="flex flex-col">
                        <span className="font-medium">{variant.product?.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">
                          {variant.product?.category?.name ?? '—'} · {formatCurrency(variant.price)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[variant.size, variant.color].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{variant.sku ?? '—'}</TableCell>
                  <TableCell>{variant.stock_quantity}</TableCell>
                  <TableCell>{variant.reserved_quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_META[variant.status].className}>
                      {variant.available} · {STATUS_META[variant.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAdjust(variant)}>
                          <PencilLine />
                          Adjust stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryVariant(variant)}>
                          <History />
                          View history
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Adjust stock dialog ── */}
      <Dialog open={target !== null} onOpenChange={(next) => !next && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {target?.product?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="qty">Quantity change</Label>
              <Input
                id="qty"
                type="number"
                placeholder="e.g. 10 to add, -5 to remove"
                value={changeQuantity}
                onChange={(e) => setChangeQuantity(e.target.value)}
                required
              />
              {target && changeQuantity && !Number.isNaN(Number(changeQuantity)) && Number(changeQuantity) !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {target.stock_quantity} → {Math.max(0, target.stock_quantity + Number(changeQuantity))} on hand
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(value) => setReason(value ?? 'manual_adjustment')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Apply'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Adjustment history drawer ── */}
      <Sheet open={historyVariant !== null} onOpenChange={(next) => !next && setHistoryVariant(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{historyVariant?.product?.name}</SheetTitle>
            <SheetDescription>
              {[historyVariant?.size, historyVariant?.color].filter(Boolean).join(' / ') || 'Stock adjustment history'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {historyLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!historyLoading && history && history.length === 0 && (
              <p className="text-sm text-muted-foreground">No adjustments recorded yet.</p>
            )}
            {!historyLoading &&
              history?.map((a) => (
                <div key={a.id} className="flex flex-col gap-0.5 rounded-lg border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={cn('font-medium', a.change_quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {a.change_quantity > 0 ? '+' : ''}
                      {a.change_quantity}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{reasonLabel(a.reason)}</span>
                  {a.note && <span className="text-xs">{a.note}</span>}
                  {a.actor_email && <span className="text-xs text-muted-foreground">by {a.actor_email}</span>}
                </div>
              ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
