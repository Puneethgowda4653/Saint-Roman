import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { BarcodeSvg } from '@/components/shared/BarcodeSvg'
import { printBarcodeLabels } from '@/lib/barcodePrint'
import { Barcode as BarcodeIcon } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Variant {
  size: string
  color: string
  price: number
  stock_quantity: number
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sku: string | null
  barcode: string | null
  brand: string | null
  hsn_code: string | null
  gst_percent: number | null
  cost_price: number | null
  base_price: number
  status: 'draft' | 'active' | 'archived'
  category: Category | null
  product_variants: Variant[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const emptyVariant: Variant = { size: '', color: '', price: 0, stock_quantity: 0 }

export function ProductsPage() {
  const { data, loading, error, refetch } = useApiResource<{ products: Product[] }>('/products')
  const { data: categoriesData } = useApiResource<{ categories: Category[] }>('/categories')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [brand, setBrand] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [status, setStatus] = useState<Product['status']>('draft')
  const [categoryId, setCategoryId] = useState<string>('')
  const [variants, setVariants] = useState<Variant[]>([{ ...emptyVariant }])
  const [saving, setSaving] = useState(false)

  // Table controls: search, filters, sort, bulk selection. All client-side — the full product
  // list is already fetched, this just slices/reorders/tags what's shown.
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortKey, setSortKey] = useState<'price' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const LOW_STOCK_THRESHOLD = 10

  function stockOf(product: Product) {
    return product.product_variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
  }

  function stockLevel(product: Product): 'out' | 'low' | 'in' {
    const stock = stockOf(product)
    if (stock === 0) return 'out'
    if (stock < LOW_STOCK_THRESHOLD) return 'low'
    return 'in'
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setImageUrl('')
    setSku('')
    setBarcode('')
    setBrand('')
    setHsnCode('')
    setGstPercent('')
    setCostPrice('')
    setBasePrice('')
    setStatus('draft')
    setCategoryId('')
    setVariants([{ ...emptyVariant }])
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  const visibleProducts = useMemo(() => {
    let list = data?.products ?? []

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.sku ?? '').toLowerCase().includes(query) ||
          (p.brand ?? '').toLowerCase().includes(query),
      )
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category?.id === categoryFilter)
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (stockFilter !== 'all') {
      list = list.filter((p) => stockLevel(p) === stockFilter)
    }
    if (sortKey === 'price') {
      list = [...list].sort((a, b) => (sortDir === 'asc' ? a.base_price - b.base_price : b.base_price - a.base_price))
    }
    return list
  }, [data, searchQuery, categoryFilter, statusFilter, stockFilter, sortKey, sortDir])

  function toggleSort() {
    if (sortKey !== 'price') {
      setSortKey('price')
      setSortDir('asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === visibleProducts.length ? new Set() : new Set(visibleProducts.map((p) => p.id)),
    )
  }

  async function bulkSetStatus(newStatus: Product['status']) {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })),
      )
      toast.success(`${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'} set to ${newStatus}`)
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed')
    }
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} selected product${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`)) return
    try {
      await Promise.all(Array.from(selectedIds).map((id) => apiFetch(`/products/${id}`, { method: 'DELETE' })))
      toast.success(`${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'} deleted`)
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk delete failed')
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description ?? '')
    setImageUrl(product.image_url ?? '')
    setSku(product.sku ?? '')
    setBarcode(product.barcode ?? '')
    setBrand(product.brand ?? '')
    setHsnCode(product.hsn_code ?? '')
    setGstPercent(product.gst_percent != null ? String(product.gst_percent) : '')
    setCostPrice(product.cost_price != null ? String(product.cost_price) : '')
    setBasePrice(String(product.base_price))
    setStatus(product.status)
    setCategoryId(product.category?.id ?? '')
    setVariants(
      product.product_variants.length > 0
        ? product.product_variants.map(({ size, color, price, stock_quantity }) => ({
          size,
          color,
          price,
          stock_quantity,
        }))
        : [{ ...emptyVariant }],
    )
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name,
        slug: slugify(name),
        description,
        image_url: imageUrl || null,
        sku: sku || null,
        brand: brand || null,
        hsn_code: hsnCode || null,
        gst_percent: gstPercent === '' ? 0 : Number(gstPercent),
        cost_price: costPrice === '' ? null : Number(costPrice),
        base_price: Number(basePrice) || 0,
        status,
        category_id: categoryId || null,
        variants: variants.filter((v) => v.size || v.color),
      }

      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Product updated')
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Product created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' })
      toast.success('Product deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const statusVariant: Record<Product['status'], 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    draft: 'secondary',
    archived: 'outline',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New product</Button>} />
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit product' : 'New product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Product photo</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} folder="ellora/products" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-sku">SKU</Label>
                  <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-price">Base price</Label>
                  <Input
                    id="p-price"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-cost">Cost price (for Profit Report, not shown publicly)</Label>
                  <Input
                    id="p-cost"
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-brand">Brand</Label>
                  <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Barcode</Label>
                  {editingId ? (
                    barcode ? (
                      <div className="flex flex-col gap-2 rounded-md border p-2">
                        <BarcodeSvg value={barcode} height={40} fontSize={11} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            printBarcodeLabels([
                              { id: editingId, name, sku, barcode, base_price: Number(basePrice) || 0 },
                            ])
                          }
                        >
                          Print label
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Generating…</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">Auto-generated after you save</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-hsn">HSN code</Label>
                  <Input id="p-hsn" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-gst">GST %</Label>
                  <Input
                    id="p-gst"
                    type="number"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category">
                        {(value: string) => categoriesData?.categories.find((c) => c.id === value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesData?.categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus((value as Product['status']) ?? 'draft')}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value: Product['status']) =>
                          ({ draft: 'Draft', active: 'Active', archived: 'Archived' })[value]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-description">Description</Label>
                <Textarea
                  id="p-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariants((prev) => [...prev, { ...emptyVariant }])}
                  >
                    Add variant
                  </Button>
                </div>
                {variants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Size"
                      value={variant.size}
                      onChange={(e) => updateVariant(index, { size: e.target.value })}
                    />
                    <Input
                      placeholder="Color"
                      value={variant.color}
                      onChange={(e) => updateVariant(index, { color: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={variant.price || ''}
                      onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      placeholder="Stock"
                      value={variant.stock_quantity || ''}
                      onChange={(e) => updateVariant(index, { stock_quantity: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load products — connect Supabase and run the Phase 2 schema to enable this.
        </p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or brand"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All categories">
                  {(value: string) =>
                    value === 'all' ? 'All categories' : (categoriesData?.categories.find((c) => c.id === value)?.name ?? 'All categories')
                  }
                </SelectValue>
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
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses">
                  {(value: string) =>
                    ({ all: 'All statuses', draft: 'Draft', active: 'Active', archived: 'Archived' } as Record<string, string>)[value] ?? 'All statuses'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value ?? 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All stock levels">
                  {(value: string) =>
                    ({ all: 'All stock levels', in: 'In stock', low: 'Low stock', out: 'Out of stock' } as Record<string, string>)[value] ?? 'All stock levels'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock levels</SelectItem>
                <SelectItem value="in">In stock</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => bulkSetStatus('active')}>
                Set active
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkSetStatus('archived')}>
                Archive
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={bulkDelete}>
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  printBarcodeLabels(
                    data.products
                      .filter((p) => selectedIds.has(p.id))
                      .map((p) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, base_price: p.base_price })),
                  )
                }
              >
                <BarcodeIcon className="mr-1 h-3.5 w-3.5" />
                Print labels
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={visibleProducts.length > 0 && selectedIds.size === visibleProducts.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1" onClick={toggleSort}>
                    Price
                    {sortKey === 'price' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => {
                const level = stockLevel(product)
                const stock = stockOf(product)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {product.image_url && (
                            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.sku ?? 'No SKU'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name ?? '—'}</TableCell>
                    <TableCell>{product.base_price}</TableCell>
                    <TableCell>
                      {level === 'out' && <Badge variant="destructive">Out of stock</Badge>}
                      {level === 'low' && (
                        <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                          Low: {stock}
                        </Badge>
                      )}
                      {level === 'in' && (
                        <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                          In stock: {stock}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!product.barcode}
                        title={product.barcode ?? 'No barcode yet'}
                        onClick={() =>
                          printBarcodeLabels([
                            { id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, base_price: product.base_price },
                          ])
                        }
                      >
                        <BarcodeIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {visibleProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {data.products.length === 0 ? 'No products yet.' : 'No products match your filters.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}