import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface Status {
  configured: boolean
  provider: string
  model: string
}

export function AiPage() {
  const { data: status, loading } = useApiResource<Status>('/ai/status')

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [keywords, setKeywords] = useState('')
  const [tone, setTone] = useState('')

  const [description, setDescription] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoMeta, setSeoMeta] = useState('')

  const [genDesc, setGenDesc] = useState(false)
  const [genSeo, setGenSeo] = useState(false)

  async function handleGenerateDescription() {
    if (!name) {
      toast.error('Enter a product name first')
      return
    }
    setGenDesc(true)
    try {
      const res = await apiFetch('/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({ name, brand, category, keywords, tone }),
      })
      setDescription(res.description)
      toast.success('Description generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenDesc(false)
    }
  }

  async function handleGenerateSeo() {
    if (!name) {
      toast.error('Enter a product name first')
      return
    }
    setGenSeo(true)
    try {
      const res = await apiFetch('/ai/generate-seo', {
        method: 'POST',
        body: JSON.stringify({ name, category }),
      })
      setSeoTitle(res.title)
      setSeoMeta(res.meta_description)
      toast.success('SEO metadata generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenSeo(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Control Center</h1>
        {status && (
          <p className="text-sm text-muted-foreground">
            Provider: {status.provider} · Model: {status.model} ·{' '}
            {status.configured ? (
              <span className="text-green-600">key configured</span>
            ) : (
              <span className="text-destructive">no API key</span>
            )}
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {status && !status.configured && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Add your Gemini API key to enable AI</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Get a free key from Google AI Studio, then add these lines to{' '}
              <code className="rounded bg-muted px-1">server/.env</code> and restart the API server:
            </p>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash   # optional`}
            </pre>
            <p>You can still fill in the form below — generation will work as soon as the key is set.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-name">Product name</Label>
              <Input id="ai-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Classic Denim Jacket" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-brand">Brand</Label>
                <Input id="ai-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-cat">Category</Label>
                <Input id="ai-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-kw">Keywords (optional)</Label>
              <Input id="ai-kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma separated" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-tone">Tone (optional)</Label>
              <Input id="ai-tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. bold, minimal, luxury" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerateDescription} disabled={genDesc}>
                {genDesc ? 'Generating…' : 'Generate description'}
              </Button>
              <Button variant="outline" onClick={handleGenerateSeo} disabled={genSeo}>
                {genSeo ? 'Generating…' : 'Generate SEO'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                {description && (
                  <Button variant="ghost" size="sm" onClick={() => copy(description)}>
                    Copy
                  </Button>
                )}
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Generated product description will appear here…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>SEO title</Label>
                {seoTitle && (
                  <Button variant="ghost" size="sm" onClick={() => copy(seoTitle)}>
                    Copy
                  </Button>
                )}
              </div>
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title…" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>SEO meta description</Label>
                {seoMeta && (
                  <Button variant="ghost" size="sm" onClick={() => copy(seoMeta)}>
                    Copy
                  </Button>
                )}
              </div>
              <Textarea value={seoMeta} onChange={(e) => setSeoMeta(e.target.value)} rows={2} placeholder="SEO meta description…" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
