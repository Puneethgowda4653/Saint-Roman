import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type CouponType = 'percentage' | 'flat' | 'free_shipping'

interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  min_order_value: number
  usage_limit: number | null
  usage_count: number
  is_active: boolean
}

export function CouponsPage() {
  const { data, loading, error, refetch } = useApiResource<{ coupons: Coupon[] }>('/coupons')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [type, setType] = useState<CouponType>('percentage')
  const [value, setValue] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('0')
  const [usageLimit, setUsageLimit] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setCode('')
    setType('percentage')
    setValue('')
    setMinOrderValue('0')
    setUsageLimit('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(coupon: Coupon) {
    setEditingId(coupon.id)
    setCode(coupon.code)
    setType(coupon.type)
    setValue(String(coupon.value))
    setMinOrderValue(String(coupon.min_order_value))
    setUsageLimit(coupon.usage_limit != null ? String(coupon.usage_limit) : '')
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        code,
        type,
        value: Number(value) || 0,
        min_order_value: Number(minOrderValue) || 0,
        usage_limit: usageLimit === '' ? null : Number(usageLimit),
      }
      if (editingId) {
        await apiFetch(`/coupons/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Coupon updated')
      } else {
        await apiFetch('/coupons', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Coupon created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      await apiFetch(`/coupons/${coupon.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !coupon.is_active }) })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update coupon')
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!window.confirm(`Delete coupon "${code}"? This can't be undone.`)) return
    try {
      await apiFetch(`/coupons/${id}`, { method: 'DELETE' })
      toast.success('Coupon deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete coupon')
    }
  }

  function formatValue(coupon: Coupon) {
    if (coupon.type === 'percentage') return `${coupon.value}%`
    if (coupon.type === 'flat') return `₹${coupon.value}`
    return 'Free shipping'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New coupon</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit coupon' : 'New coupon'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-code">Code</Label>
                <Input id="c-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType((v as CouponType) ?? 'percentage')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat amount</SelectItem>
                      <SelectItem value="free_shipping">Free shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-value">Value {type === 'percentage' ? '(%)' : type === 'flat' ? '(₹)' : ''}</Label>
                  <Input
                    id="c-value"
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={type === 'free_shipping'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-min">Min order value (₹)</Label>
                  <Input id="c-min" type="number" value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-limit">Usage limit</Label>
                  <Input
                    id="c-limit"
                    type="number"
                    placeholder="Unlimited"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                  />
                </div>
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
          Couldn't load coupons — connect Supabase and run the Phase 5 coupons schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min order</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-medium">{coupon.code}</TableCell>
                <TableCell>{formatValue(coupon)}</TableCell>
                <TableCell className="text-muted-foreground">₹{coupon.min_order_value}</TableCell>
                <TableCell className="text-muted-foreground">
                  {coupon.usage_count}
                  {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ''}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={coupon.is_active ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(coupon)}
                  >
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon.id, coupon.code)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No coupons yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
