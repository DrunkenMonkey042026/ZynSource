import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, apiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import { useNavigate } from 'react-router-dom'
import { t } from '@/lib/i18n'

export function SaveSearchButton() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [saving, setSaving] = useState(false)

  function openDialog() {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'seeker') {
      toast({ title: t('Only seekers can save searches'), variant: 'error' })
      return
    }
    // Suggest a default name
    const parts: string[] = []
    if (params.get('q')) parts.push(params.get('q')!)
    if (params.get('city')) parts.push(params.get('city')!)
    if (params.get('skills')) parts.push(params.get('skills')!)
    setName(parts.join(' · ') || t('My search'))
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      await api.post('/saved-searches', {
        name,
        frequency,
        filters: {
          q: params.get('q') ?? '',
          city: params.get('city') ?? '',
          skills: params.get('skills') ?? '',
          jobType: params.get('jobType') ?? '',
          workMode: params.get('workMode') ?? '',
          expMin: params.get('expMin') ?? '',
          salaryMin: params.get('salaryMin') ?? '',
        },
      })
      toast({ title: t('Search saved — we\'ll email you matches'), variant: 'success' })
      qc.invalidateQueries({ queryKey: ['my-saved-searches'] })
      setOpen(false)
    } catch (err) {
      toast({ title: t('Could not save'), description: apiError(err), variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="rounded-full" onClick={openDialog}>
        <Bookmark className="h-4 w-4" /> {t('Save search')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Save this search')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('Name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1">
              <Label>{t('Email me')}</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('Daily')}</SelectItem>
                  <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={save} disabled={saving || !name.trim()}>{saving ? t('Saving…') : t('Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
