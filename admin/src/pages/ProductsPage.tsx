import { useState, type FormEvent } from 'react'
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
        barcode: barcode || null,
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
                  <Label htmlFor="p-barcode">Barcode</Label>
                  <Input id="p-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
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
                      <SelectValue placeholder="Select a category" />
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
                      <SelectValue />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.sku ?? '—'}</TableCell>
                <TableCell>{product.category?.name ?? '—'}</TableCell>
                <TableCell>{product.base_price}</TableCell>
                <TableCell>{product.product_variants?.length ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No products yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
