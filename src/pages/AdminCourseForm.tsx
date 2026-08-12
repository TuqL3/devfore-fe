import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi, type CourseInput } from '@/api/admin'
import { coursesApi } from '@/api/courses'
import { ApiError } from '@/lib/api'
import { Button, ErrorBox, Field, Input } from '@/components/ui'
import { useT } from '@/lib/i18n'

const EMPTY: CourseInput = {
  slug: '',
  title: '',
  description: '',
  image_url: null,
  level: 'beginner',
  status: 'draft',
}

/** Add or edit a course, as its own screen at its own URL. It used to be a panel
 *  that opened above the table: nothing in the address bar said it was open, so
 *  Back left the admin area entirely and the list stayed on screen underneath
 *  competing for attention with the form. */
export default function AdminCourseForm() {
  const t = useT()
  const { id } = useParams()
  const editing = id !== undefined
  const courseID = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState<CourseInput | null>(editing ? null : EMPTY)
  const [error, setError] = useState('')

  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: adminApi.courses })
  const levels = useQuery({ queryKey: ['levels'], queryFn: coursesApi.levels })
  const course = editing ? courses.data?.find((c) => c.id === courseID) : undefined

  // Filled once the list lands, which is also what makes opening this URL
  // directly work rather than only arriving from the table.
  useEffect(() => {
    if (!course || form) return
    setForm({
      slug: course.slug,
      title: course.title,
      description: course.description,
      image_url: course.image_url,
      level: course.level,
      status: course.status,
    })
  }, [course, form])

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : t('form.saveFailed'))

  const save = useMutation({
    mutationFn: (input: CourseInput) =>
      editing ? adminApi.updateCourse(courseID, input) : adminApi.createCourse(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      // The public catalogue reads its own cache, and this may have just
      // published a course or pulled one back to draft.
      qc.invalidateQueries({ queryKey: ['courses'] })
      navigate('/admin/courses')
    },
    onError: fail,
  })

  if (editing && !courses.isLoading && !course) {
    return (
      <div className="space-y-3">
        <p className="text-danger">{t('form.notFound')}</p>
        <Link to="/admin/courses" className="text-sm text-accent-soft hover:underline">
          ← {t('form.backList')}
        </Link>
      </div>
    )
  }

  if (!form) return <p className="text-sm text-fg-subtle">{t('common.loading')}</p>

  const set = <K extends keyof CourseInput>(k: K, v: CourseInput[K]) =>
    setForm({ ...form, [k]: v })

  return (
    <div>
      <Link to="/admin/courses" className="text-sm text-accent-soft hover:underline">
        ← {t('form.backList')}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-fg-strong">
        {editing ? course?.title : t('form.newCourse')}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(form)
        }}
        className="mt-6 max-w-3xl space-y-4 rounded-lg border border-border bg-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('form.titleField')}>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={t('form.titlePlaceholder')}
            />
          </Field>
          <Field label="Slug" hint={t('form.slugHint')}>
            <Input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="linux-co-ban"
              variant="terminal"
            />
          </Field>
        </div>

        <Field label={t('form.description')}>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder={t('form.descriptionPlaceholder')}
          />
        </Field>

        <Field label={t('form.cover')} hint={t('form.coverHint')}>
          <CoverPicker
            url={form.image_url}
            onChange={(url) => set('image_url', url)}
            onError={fail}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('form.level')}>
            <select
              value={form.level}
              onChange={(e) => set('level', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            >
              {(levels.data ?? []).map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('form.status')} hint={t('form.statusHint')}>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as CourseInput['status'])}
              className="w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            >
              <option value="draft">{t('form.draft')}</option>
              <option value="published">{t('form.published')}</option>
            </select>
          </Field>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? t('form.saving')
              : editing
                ? t('form.saveChanges')
                : t('form.createCourse')}
          </Button>
          <Link
            to="/admin/courses"
            className="rounded-md px-3 py-2.5 text-sm text-fg-muted transition hover:text-fg-strong"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  )
}

/** Picks a cover by uploading it. The file goes up as soon as it is chosen, so
 *  the form holds a URL either way and saving a course stays a plain JSON PUT.
 *  Courses seeded with an external link keep working — the preview shows
 *  whatever URL is stored, and uploading replaces it. */
function CoverPicker({
  url,
  onChange,
  onError,
}: {
  url: string | null
  onChange: (url: string | null) => void
  onError: (e: unknown) => void
}) {
  const t = useT()
  const upload = useMutation({
    mutationFn: (file: File) => adminApi.uploadImage(file),
    onSuccess: (res) => onChange(res.url),
    onError,
  })

  return (
    <div className="space-y-2">
      {url && (
        <div className="flex items-center gap-3">
          <img
            src={url}
            alt=""
            className="h-16 w-28 shrink-0 rounded border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-danger transition hover:underline"
          >
            {t('form.removeImage')}
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        disabled={upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Cleared so picking the same file again — after a failed upload —
          // still fires a change event.
          e.target.value = ''
          if (file) upload.mutate(file)
        }}
        className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg hover:file:border-accent"
      />
      {upload.isPending && (
        <p className="text-xs text-fg-subtle">{t('form.uploading')}</p>
      )}
    </div>
  )
}
