import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface Settings {
  site_title?: string
  currency?: string
  tax_percent?: number
}

export function SettingsPage() {
  const { data, loading, error } = useApiResource<{ settings: Settings }>('/settings')
  const [form, setForm] = useState<Settings>({})
  const [saving, setSaving] = useState(false)

  const settings = form.site_title !== undefined ? form : data?.settings ?? {}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Site Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">
              Couldn't load settings yet — connect Supabase and create the `settings` table to enable this.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="site_title">Site title</Label>
              <Input
                id="site_title"
                value={settings.site_title ?? ''}
                onChange={(e) => setForm({ ...settings, site_title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency ?? ''}
                onChange={(e) => setForm({ ...settings, currency: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax_percent">Tax %</Label>
              <Input
                id="tax_percent"
                type="number"
                value={settings.tax_percent ?? ''}
                onChange={(e) => setForm({ ...settings, tax_percent: Number(e.target.value) })}
              />
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
