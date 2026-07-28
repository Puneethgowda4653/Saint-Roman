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

interface Campaign {
  id: string
  name: string
  channel: string
  spend: number
  coupon_code: string | null
  start_date: string | null
  end_date: string | null
  status: string
  attributed_revenue: number
  attributed_orders: number
  roas: number | null
}

interface Summary {
  total_spend: number
  attributed_revenue: number
  attributed_orders: number
  overall_roas: number | null
}

const CHANNELS = ['google', 'meta', 'tiktok', 'email', 'other']

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export function MarketingPage() {
  const { data, loading, error, refetch } = useApiResource<{
    campaigns: Campaign[]
    summary: Summary
  }>('/marketing')
  const { data: couponsData } = useApiResource<{ coupons: Coupon[] }>('/coupons')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('google')
  const [spend, setSpend] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setName('')
    setChannel('google')
    setSpend('')
    setCouponCode('')
    setStartDate('')
    setEndDate('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/marketing', {
        method: 'POST',
        body: JSON.stringify({
          name,
          channel,
          spend: Number(spend) || 0,
          coupon_code: couponCode || null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      })
      toast.success('Campaign created')
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    try {
      await apiFetch(`/marketing/${id}`, { method: 'DELETE' })
      toast.success('Campaign deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marketing</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger render={<Button>New campaign</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="m-name">Name</Label>
                <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v ?? 'other')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="m-spend">Spend (₹)</Label>
                <Input
                  id="m-spend"
                  type="number"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Coupon code (attribution)</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="m-start">Start date</Label>
                  <Input id="m-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="m-end">End date</Label>
                  <Input id="m-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
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
      {error && <p className="text-sm text-destructive">Couldn't load campaigns.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total spend" value={`₹${data.summary.total_spend}`} />
            <StatCard label="Attributed revenue" value={`₹${data.summary.attributed_revenue}`} />
            <StatCard label="Attributed orders" value={String(data.summary.attributed_orders)} />
            <StatCard
              label="Overall ROAS"
              value={data.summary.overall_roas != null ? `${data.summary.overall_roas}×` : '—'}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Coupon</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{c.channel}</TableCell>
                  <TableCell className="text-muted-foreground">{c.coupon_code ?? '—'}</TableCell>
                  <TableCell>₹{c.spend}</TableCell>
                  <TableCell>₹{c.attributed_revenue}</TableCell>
                  <TableCell>{c.attributed_orders}</TableCell>
                  <TableCell>{c.roas != null ? `${c.roas}×` : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id, c.name)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No campaigns yet.
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
