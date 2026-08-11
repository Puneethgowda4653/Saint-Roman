import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Search,
  Star,
  Truck,
  Rocket,
  Zap,
  Plane,
  Package,
  MoreHorizontal,
  Eye,
  Printer,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { printOrderInvoice, printShippingLabel, printShippingLabels } from '@/lib/orderPrint'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

const STATUSES = [
  'pending', 'processing', 'packed', 'ready_to_ship', 'shipped',
  'delivered', 'cancelled', 'returned', 'refund_initiated', 'refund_completed',
] as const

type Status = (typeof STATUSES)[number]

// Mirrors NEXT_STATUSES in server/routes/orders.js — keep both in sync by hand, there's no
// shared package between the two codebases.
const NEXT_STATUSES: Record<Status, Status[]> = {
  pending: ['packed', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['ready_to_ship', 'shipped', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: ['refund_initiated'],
  refund_initiated: ['refund_completed'],
  refund_completed: [],
}

const CONFIRM_REQUIRED_STATUSES: Status[] = ['cancelled', 'refund_initiated', 'refund_completed']

const STATUS_TABS: { value: Status | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
]

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

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

interface OrderItem {
  id: string
  product_name: string
  variant_label: string | null
  quantity: number
  unit_price: number
  line_total: number
  image_url: string | null
}

interface ShippingAddress {
  address?: string
  city?: string
  district?: string
  pincode?: string
  country?: string
}

interface Order {
  id: string
  order_number: string
  status: Status
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  subtotal: number
  shipping_fee: number
  discount_amount: number
  coupon_code: string | null
  total: number
  payment_method: string | null
  payment_status: string | null
  tracking_number: string | null
  courier: string | null
  shipped_at: string | null
  delivered_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  order_items: OrderItem[]
  sla_breached: boolean
  high_value: boolean
}

interface TimelineEntry {
  id: string
  actor_email: string | null
  details: { order_number?: string; old_status?: string; new_status?: string; bulk?: boolean } | null
  created_at: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
  limit: number
  offset: number
  counts: Record<string, number>
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

interface BulkResult {
  updated: string[]
  failed: { id: string; order_number: string | null; reason: string }[]
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

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

function formatAddress(addr: ShippingAddress | null) {
  if (!addr) return 'No address on file'
  return [addr.address, addr.city, addr.district, addr.pincode, addr.country].filter(Boolean).join(', ')
}

// Not real brand logos (no such assets in this project) — just visually distinct generic icons
// keyed by courier name, with Truck as the fallback for anything unrecognized, per the "static
// icon map ... generic truck fallback" spec.
const COURIER_ICONS: Record<string, typeof Truck> = {
  delhivery: Truck,
  bluedart: Zap,
  'blue dart': Zap,
  shiprocket: Rocket,
  dtdc: Truck,
  fedex: Plane,
  ekart: Truck,
  xpressbees: Truck,
}

function getCourierIcon(courier: string | null) {
  if (!courier) return Truck
  return COURIER_ICONS[courier.trim().toLowerCase()] ?? Truck
}

function paymentBadge(order: Order): { label: string; className: string } {
  if (order.payment_status === 'refunded') {
    return { label: 'Refunded', className: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400' }
  }
  if (order.payment_status === 'paid') {
    return { label: 'Paid', className: 'border-transparent bg-green-500/10 text-green-600 dark:text-green-400' }
  }
  if (order.payment_method === 'cod') {
    return { label: 'COD', className: 'border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400' }
  }
  return { label: formatStatus(order.payment_status ?? 'unpaid'), className: 'border-transparent bg-muted text-muted-foreground' }
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

function ordersToCsv(orders: Order[]) {
  const header = ['Order #', 'Date', 'Customer', 'Phone', 'Status', 'Payment', 'Total', 'Courier', 'Tracking']
  const rows = orders.map((o) => [
    o.order_number,
    new Date(o.created_at).toISOString(),
    o.customer_name,
    o.customer_phone ?? '',
    o.status,
    o.payment_status ?? o.payment_method ?? '',
    String(o.total),
    o.courier ?? '',
    o.tracking_number ?? '',
  ])
  return [header, ...rows].map((r) => r.map((cell) => csvEscape(String(cell))).join(',')).join('\n')
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

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, String(value))
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

// ─── Small subcomponents ────────────────────────────────────────────────

function ItemsThumbnails({ items }: { items: OrderItem[] }) {
  if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  const shown = items.slice(0, 3)
  const extra = items.length - shown.length
  const fullList = items.map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ''} × ${i.quantity}`).join('\n')

  return (
    <div className="flex items-center -space-x-2" title={fullList}>
      {shown.map((item, i) =>
        item.image_url ? (
          <img
            key={item.id}
            src={item.image_url}
            alt=""
            className="size-7 rounded-full border-2 border-background object-cover"
            style={{ zIndex: shown.length - i }}
          />
        ) : (
          <div
            key={item.id}
            className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted"
            style={{ zIndex: shown.length - i }}
          >
            <Package className="size-3.5 text-muted-foreground" />
          </div>
        )
      )}
      {extra > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  )
}

function TrackingCell({ order }: { order: Order }) {
  if (!order.tracking_number) {
    return <span className="text-xs text-muted-foreground">Not shipped</span>
  }
  const Icon = getCourierIcon(order.courier)
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex flex-col leading-tight">
        <span>{order.tracking_number}</span>
        {order.courier && <span className="text-muted-foreground">{order.courier}</span>}
      </span>
    </div>
  )
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
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

export function OrdersPage() {
  // Filters
  const [activeStatus, setActiveStatus] = useState<Status | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [minTotal, setMinTotal] = useState('')
  const [maxTotal, setMaxTotal] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [courierFilter, setCourierFilter] = useState('all')

  // Pagination
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Drawer
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<{ order: Order; timeline: TimelineEntry[] } | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerNotes, setDrawerNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Confirm dialog for cancel/refund transitions
  const [confirmAction, setConfirmAction] = useState<{ ids: string[]; status: Status } | null>(null)

  // New order dialog
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingFee, setShippingFee] = useState('0')
  const [lines, setLines] = useState<LineDraft[]>([{ variantId: '', quantity: 1 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
  }, [activeStatus, debouncedSearch, dateFrom, dateTo, paymentStatus, minTotal, maxTotal, city, pincode, courierFilter, pageSize])

  const queryPath = useMemo(() => {
    return (
      '/orders' +
      buildQuery({
        status: activeStatus || undefined,
        search: debouncedSearch || undefined,
        date_from: dateFrom || undefined,
        // Inclusive of the whole day — a plain date string would otherwise mean midnight UTC of
        // that date, excluding anything created later that same day.
        date_to: dateTo ? `${dateTo}T23:59:59.999` : undefined,
        payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
        min_total: minTotal || undefined,
        max_total: maxTotal || undefined,
        city: city || undefined,
        pincode: pincode || undefined,
        courier: courierFilter !== 'all' ? courierFilter : undefined,
        limit: pageSize,
        offset: page * pageSize,
      })
    )
  }, [activeStatus, debouncedSearch, dateFrom, dateTo, paymentStatus, minTotal, maxTotal, city, pincode, courierFilter, page, pageSize])

  const { data, loading, error, refetch } = useApiResource<OrdersResponse>(queryPath)
  const { data: couriersData } = useApiResource<{ couriers: string[] }>('/orders/couriers')
  const { data: inventoryData } = useApiResource<{ variants: InventoryVariant[] }>('/inventory')
  const { data: customersData } = useApiResource<{ customers: Customer[] }>('/customers')

  useEffect(() => {
    setSelectedIds(new Set())
  }, [queryPath])

  useEffect(() => {
    if (!drawerOrderId) {
      setDrawerData(null)
      return
    }
    setDrawerLoading(true)
    apiFetch(`/orders/${drawerOrderId}`)
      .then((res: { order: Order; timeline: TimelineEntry[] }) => {
        setDrawerData(res)
        setDrawerNotes(res.order.notes ?? '')
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load order'))
      .finally(() => setDrawerLoading(false))
  }, [drawerOrderId])

  function applyDatePreset(preset: 'today' | '7d' | '30d') {
    const to = new Date()
    const from = new Date()
    if (preset === '7d') from.setDate(from.getDate() - 6)
    if (preset === '30d') from.setDate(from.getDate() - 29)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  function resetFilters() {
    setActiveStatus('')
    setSearchInput('')
    setDateFrom('')
    setDateTo('')
    setPaymentStatus('all')
    setMinTotal('')
    setMaxTotal('')
    setCity('')
    setPincode('')
    setCourierFilter('all')
  }

  const visibleIds = data?.orders.map((o) => o.id) ?? []
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someSelected = visibleIds.some((id) => selectedIds.has(id))
  const headerCheckedState: boolean | 'indeterminate' = allSelected ? true : someSelected ? 'indeterminate' : false

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleIds) : new Set())
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function requestStatusChange(orderIds: string[], status: Status) {
    if (orderIds.length === 0) return
    if (CONFIRM_REQUIRED_STATUSES.includes(status)) {
      setConfirmAction({ ids: orderIds, status })
    } else {
      applyStatusChange(orderIds, status)
    }
  }

  async function applyStatusChange(orderIds: string[], status: Status) {
    if (orderIds.length === 1) {
      try {
        await apiFetch(`/orders/${orderIds[0]}`, { method: 'PUT', body: JSON.stringify({ status }) })
        toast.success(`Order marked ${formatStatus(status)}`)
        refetch()
        if (drawerOrderId === orderIds[0]) {
          setDrawerOrderId(null)
          setDrawerOrderId(orderIds[0])
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      }
      return
    }

    try {
      const result: BulkResult = await apiFetch('/orders/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ ids: orderIds, status }),
      })
      if (result.updated.length > 0) {
        toast.success(`${result.updated.length} order${result.updated.length === 1 ? '' : 's'} marked ${formatStatus(status)}`)
      }
      for (const failure of result.failed) {
        toast.error(`${failure.order_number ?? 'Order'}: ${failure.reason}`)
      }
      refetch()
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed')
    }
  }

  async function handleExportCsv() {
    try {
      const exportPath =
        '/orders' +
        buildQuery({
          status: activeStatus || undefined,
          search: debouncedSearch || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo ? `${dateTo}T23:59:59.999` : undefined,
          payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
          min_total: minTotal || undefined,
          max_total: maxTotal || undefined,
          city: city || undefined,
          pincode: pincode || undefined,
          courier: courierFilter !== 'all' ? courierFilter : undefined,
          limit: 10000,
          offset: 0,
        })
      const res: OrdersResponse = await apiFetch(exportPath)
      downloadCsv(ordersToCsv(res.orders), `orders-${Date.now()}.csv`)
      toast.success(`Exported ${res.orders.length} order${res.orders.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  function handleExportSelectedCsv() {
    if (!data) return
    const selected = data.orders.filter((o) => selectedIds.has(o.id))
    downloadCsv(ordersToCsv(selected), `orders-selected-${Date.now()}.csv`)
    toast.success(`Exported ${selected.length} order${selected.length === 1 ? '' : 's'}`)
  }

  function handleBulkGenerateLabels() {
    if (!data) return
    const selected = data.orders.filter((o) => selectedIds.has(o.id))
    printShippingLabels(selected)
  }

  async function handleSaveNotes() {
    if (!drawerOrderId) return
    setSavingNotes(true)
    try {
      await apiFetch(`/orders/${drawerOrderId}`, { method: 'PUT', body: JSON.stringify({ notes: drawerNotes }) })
      toast.success('Notes saved')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  // ── New order dialog handlers (unchanged behaviour from the previous version of this page) ──

  function resetOrderForm() {
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
      resetOrderForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  const columnCount = 9
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const currentPageDisplay = page + 1
  const rangeStart = data && data.total > 0 ? data.offset + 1 : 0
  const rangeEnd = data ? Math.min(data.offset + data.orders.length, data.total) : 0

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download />
            Export CSV
          </Button>
          <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetOrderForm() }}>
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
                  <Input id="o-shipping" type="number" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
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
      </div>

      {/* ── Toolbar: search, date range, payment status, value range, city/pincode, courier ── */}
      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, customer, phone, AWB…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => applyDatePreset('today')}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => applyDatePreset('7d')}>7d</Button>
            <Button variant="outline" size="sm" onClick={() => applyDatePreset('30d')}>30d</Button>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>

          <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v ?? 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Payment status">
                {(value: string) => (value === 'all' ? 'Payment status' : formatStatus(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="unpaid">Unpaid / COD</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={courierFilter} onValueChange={(v) => setCourierFilter(v ?? 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Courier">
                {(value: string) => (value === 'all' ? 'Courier' : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All couriers</SelectItem>
              {couriersData?.couriers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(activeStatus || debouncedSearch || dateFrom || dateTo || paymentStatus !== 'all' || minTotal || maxTotal || city || pincode || courierFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Min ₹" type="number" value={minTotal} onChange={(e) => setMinTotal(e.target.value)} className="w-24" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input placeholder="Max ₹" type="number" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} className="w-24" />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-32" />
          <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-28" />
        </div>
      </div>

      {/* ── Status pill tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === '' ? data?.counts.all : data?.counts[tab.value]
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
          Couldn't load orders — connect Supabase and run the Phase 3 + Phase 11 orders schema to enable this.
        </p>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:h-8 [&>th]:py-1">
              <TableHead className="w-8">
                <Checkbox checked={headerCheckedState} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <SkeletonRows columns={columnCount} />}

            {!loading && data && data.orders.length === 0 && (
              <EmptyState
                columns={columnCount}
                label={activeStatus ? `No ${formatStatus(activeStatus)} orders.` : 'No orders match these filters.'}
              />
            )}

            {!loading &&
              data?.orders.map((order) => {
                const payment = paymentBadge(order)
                const isSelected = selectedIds.has(order.id)
                return (
                  <TableRow
                    key={order.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-no-row-click]')) return
                      setDrawerOrderId(order.id)
                    }}
                    className={cn(
                      'cursor-pointer [&>td]:py-1.5',
                      order.sla_breached && 'bg-destructive/5 hover:bg-destructive/10'
                    )}
                  >
                    <TableCell data-no-row-click>
                      <Checkbox checked={isSelected} onCheckedChange={(c) => toggleSelectOne(order.id, c)} aria-label="Select order" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 font-medium">
                          {order.order_number}
                          {order.high_value && <Star className="size-3 fill-amber-400 text-amber-400" />}
                        </span>
                        <span className={cn('text-xs', order.sla_breached ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                          {formatRelativeTime(order.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{order.customer_name}</span>
                        {order.customer_phone && <span className="text-xs text-muted-foreground">{order.customer_phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ItemsThumbnails items={order.order_items} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={payment.className}>
                        {payment.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell data-no-row-click>
                      <Select
                        value={order.status}
                        onValueChange={(value) => value && value !== order.status && requestStatusChange([order.id], value as Status)}
                      >
                        <SelectTrigger size="sm" className="w-40">
                          <SelectValue>
                            <Badge variant={statusVariant[order.status]}>{formatStatus(order.status)}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={order.status}>{formatStatus(order.status)} (current)</SelectItem>
                          {NEXT_STATUSES[order.status].map((s) => (
                            <SelectItem key={s} value={s}>
                              {formatStatus(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TrackingCell order={order} />
                    </TableCell>
                    <TableCell data-no-row-click>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDrawerOrderId(order.id)}>
                            <Eye />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printOrderInvoice(order)}>
                            <Printer />
                            Print invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!NEXT_STATUSES[order.status].includes('cancelled')}
                            onClick={() => requestStatusChange([order.id], 'cancelled')}
                          >
                            <Ban />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => v && setPageSize(Number(v))}>
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Showing {rangeStart}-{rangeEnd} of {data.total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft />
              </Button>
              <span className="px-1 text-xs">
                {currentPageDisplay} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPageDisplay >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-popover p-2 text-sm shadow-lg ring-1 ring-foreground/10">
          <span className="px-2 font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => requestStatusChange([...selectedIds], 'packed')}>
            Mark as Packed
          </Button>
          <Button size="sm" variant="outline" onClick={() => requestStatusChange([...selectedIds], 'shipped')}>
            Mark as Shipped
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkGenerateLabels}>
            Generate labels
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportSelectedCsv}>
            Export CSV
          </Button>
          <Button size="sm" variant="destructive" onClick={() => requestStatusChange([...selectedIds], 'cancelled')}>
            Cancel
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X />
          </Button>
        </div>
      )}

      {/* ── Confirm dialog for cancel/refund transitions ── */}
      <Dialog open={confirmAction !== null} onOpenChange={(next) => !next && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction && `Mark ${confirmAction.ids.length} order${confirmAction.ids.length === 1 ? '' : 's'} as ${formatStatus(confirmAction.status)}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This can't be undone from here. Double-check before continuing.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmAction) applyStatusChange(confirmAction.ids, confirmAction.status)
                setConfirmAction(null)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Order detail drawer ── */}
      <Sheet open={drawerOrderId !== null} onOpenChange={(next) => !next && setDrawerOrderId(null)}>
        <SheetContent>
          {drawerLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!drawerLoading && drawerData && (
            <>
              <SheetHeader>
                <SheetTitle>{drawerData.order.order_number}</SheetTitle>
                <SheetDescription>
                  {formatStatus(drawerData.order.status)} · {formatRelativeTime(drawerData.order.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printOrderInvoice(drawerData.order)}>
                    <Printer />
                    Print invoice
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printShippingLabel(drawerData.order)}>
                    <Printer />
                    Print shipping label
                  </Button>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Items</h3>
                  <div className="flex flex-col gap-2">
                    {drawerData.order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="size-10 rounded-md border object-cover" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
                            <Package className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col text-sm">
                          <span>{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ''}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(drawerData.order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span>{drawerData.order.shipping_fee > 0 ? formatCurrency(drawerData.order.shipping_fee) : 'Free'}</span>
                    </div>
                    {drawerData.order.discount_amount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Discount{drawerData.order.coupon_code ? ` (${drawerData.order.coupon_code})` : ''}</span>
                        <span>-{formatCurrency(drawerData.order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatCurrency(drawerData.order.total)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Shipping address</h3>
                  <p className="text-sm">{drawerData.order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{formatAddress(drawerData.order.shipping_address)}</p>
                  {drawerData.order.customer_phone && <p className="text-sm text-muted-foreground">{drawerData.order.customer_phone}</p>}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Payment</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={paymentBadge(drawerData.order).className}>
                      {paymentBadge(drawerData.order).label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{drawerData.order.payment_method ?? 'Not recorded'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Status timeline</h3>
                  {drawerData.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {drawerData.timeline.map((entry) => (
                        <div key={entry.id} className="flex flex-col text-sm">
                          <span>
                            {entry.details?.old_status ? `${formatStatus(entry.details.old_status)} → ` : ''}
                            {formatStatus(entry.details?.new_status ?? '')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('en-IN')}
                            {entry.actor_email ? ` · ${entry.actor_email}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Internal notes</h3>
                  <Textarea value={drawerNotes} onChange={(e) => setDrawerNotes(e.target.value)} rows={3} />
                </div>
              </div>

              <SheetFooter>
                <Button variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving…' : 'Save notes'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
