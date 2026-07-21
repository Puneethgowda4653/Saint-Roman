import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface Faq {
  id: string
  question: string
  answer: string
  sort_order: number
}

export function FaqsPage() {
  const { data, loading, error, refetch } = useApiResource<{ faqs: Faq[] }>('/cms/faqs')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setQuestion('')
    setAnswer('')
    setSortOrder('0')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(faq: Faq) {
    setEditingId(faq.id)
    setQuestion(faq.question)
    setAnswer(faq.answer)
    setSortOrder(String(faq.sort_order))
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { question, answer, sort_order: Number(sortOrder) || 0 }
      if (editingId) {
        await apiFetch(`/cms/faqs/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('FAQ updated')
      } else {
        await apiFetch('/cms/faqs', { method: 'POST', body: JSON.stringify(body) })
        toast.success('FAQ created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save FAQ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, question: string) {
    if (!window.confirm(`Delete "${question}"? This can't be undone.`)) return
    try {
      await apiFetch(`/cms/faqs/${id}`, { method: 'DELETE' })
      toast.success('FAQ deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete FAQ')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQs</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New FAQ</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-question">Question</Label>
                <Input id="f-question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-answer">Answer</Label>
                <Textarea id="f-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-sort">Sort order</Label>
                <Input
                  id="f-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
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
          Couldn't load FAQs — connect Supabase and run the Phase 3 CMS schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.faqs.map((faq) => (
              <TableRow key={faq.id}>
                <TableCell className="font-medium">{faq.question}</TableCell>
                <TableCell className="text-muted-foreground">{faq.sort_order}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(faq)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(faq.id, faq.question)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.faqs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No FAQs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
