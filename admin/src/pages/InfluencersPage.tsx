import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Coupon {
  code: string
}

interface Influencer {
  id: string
  name: string
  email: string | null
  coupon_code: string | null
  commission_percent: number
  sales: number
  commission_earned: number
}

export function InfluencersPage() {
  const { data, loading, error, refetch } = useApiResource<{ influencers: Influencer[] }>('/influencers')
  const { data: couponsData } = useApiResource<{ coupons: Coupon[] }>('/coupons')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('10')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setName('')
    setEmail('')
    setCouponCode('')
    setCommissionPercent('10')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/influencers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: email || null,
          coupon_code: couponCode || null,
          commission_percent: Number(commissionPercent) || 0,
        }),
      })
      toast.success('Influencer created')
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save influencer')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    try {
      await apiFetch(`/influencers/${id}`, { method: 'DELETE' })
      toast.success('Influencer deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete influencer')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Influencers</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger render={<Button>New influencer</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New influencer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="i-name">Name</Label>
                <Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="i-email">Email</Label>
                <Input id="i-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Coupon code (their attribution link)</Label>
                <Select value={couponCode} onValueChange={(v) => setCouponCode(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coupon" />
                  </SelectTrigger>
                  <SelectContent>
                    {couponsData?.coupons.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="i-commission">Commission %</Label>
                <Input
                  id="i-commission"
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load influencers.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Coupon</TableHead>
              <TableHead>Commission %</TableHead>
              <TableHead>Sales (attributed)</TableHead>
              <TableHead>Commission earned</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.influencers.map((inf) => (
              <TableRow key={inf.id}>
                <TableCell className="font-medium">{inf.name}</TableCell>
                <TableCell className="text-muted-foreground">{inf.coupon_code ?? '—'}</TableCell>
                <TableCell>{inf.commission_percent}%</TableCell>
                <TableCell>₹{inf.sales}</TableCell>
                <TableCell>₹{inf.commission_earned}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(inf.id, inf.name)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.influencers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No influencers yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
