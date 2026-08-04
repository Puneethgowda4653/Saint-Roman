import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

interface Banner {
  id: string
  title: string
  subtitle: string | null
  link_url: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  placement: string
  badge_text: string | null
}

const PLACEMENT_OPTIONS = [
  { value: 'products_hero', label: 'Products page hero' },
  { value: 'homepage_offer', label: 'Homepage offer card' },
]

export function BannersPage() {
  const { data, loading, error, refetch } = useApiResource<{ banners: Banner[] }>('/banners')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [placement, setPlacement] = useState('products_hero')
  const [badgeText, setBadgeText] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setSubtitle('')
    setLinkUrl('')
    setImageUrl('')
    setSortOrder('0')
    setPlacement('products_hero')
    setBadgeText('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(banner: Banner) {
    setEditingId(banner.id)
    setTitle(banner.title)
    setSubtitle(banner.subtitle ?? '')
    setLinkUrl(banner.link_url ?? '')
    setImageUrl(banner.image_url ?? '')
    setSortOrder(String(banner.sort_order))
    setPlacement(banner.placement || 'products_hero')
    setBadgeText(banner.badge_text ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title,
        subtitle: subtitle || null,
        link_url: linkUrl || null,
        image_url: imageUrl || null,
        sort_order: Number(sortOrder) || 0,
        placement,
        badge_text: badgeText || null,
      }
      if (editingId) {
        await apiFetch(`/banners/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Banner updated')
      } else {
        await apiFetch('/banners', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Banner created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      await apiFetch(`/banners/${banner.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !banner.is_active }) })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update banner')
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    try {
      await apiFetch(`/banners/${id}`, { method: 'DELETE' })
      toast.success('Banner deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete banner')
    }
  }

  function placementLabel(value: string) {
    return PLACEMENT_OPTIONS.find((o) => o.value === value)?.label ?? value
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banners</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New banner</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit banner' : 'New banner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-title">Title</Label>
                <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-subtitle">Subtitle / description</Label>
                <Input id="b-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-placement">Show on</Label>
                <select
                  id="b-placement"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PLACEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-badge">Badge text (e.g. "50% Off")</Label>
                <Input
                  id="b-badge"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="50% Off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-link">Link URL</Label>
                <Input
                  id="b-link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="products.html?category=womens-fashion"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Banner image</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} folder="ellora/banners" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-sort">Sort order</Label>
                <Input id="b-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
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
      {error && <p className="text-sm text-destructive">Couldn't load banners.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  {banner.image_url ? (
                    <img src={banner.image_url} alt="" className="h-10 w-14 rounded object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{banner.title}</div>
                  {banner.subtitle && (
                    <div className="text-xs text-muted-foreground">{banner.subtitle}</div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{banner.badge_text ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{placementLabel(banner.placement)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{banner.sort_order}</TableCell>
                <TableCell>
                  <Badge
                    variant={banner.is_active ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(banner)}
                  >
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(banner)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(banner.id, banner.title)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No banners yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}