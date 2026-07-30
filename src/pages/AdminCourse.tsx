import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  adminApi,
  type AdminLab,
  type AdminOption,
  type AdminTask,
  type LabInput,
  type TaskInput,
} from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button, ErrorBox, Field, Input } from '@/components/ui'

const EMPTY_LAB: LabInput = {
  slug: '',
  title: '',
  description_md: '',
  duration_minutes: 60,
  lab_image_id: null,
  order_idx: 0,
}

const EMPTY_TASK: TaskInput = {
  title: '',
  hint: '',
  kind: 'script',
  check_script: '',
  options: [],
  expected_commands: '',
  points: 10,
  order_idx: 0,
}

// Two blanks, because a choice question needs at least two options and starting
// with none makes the author guess how to add the first.
const EMPTY_OPTIONS = [
  { text: '', correct: false },
  { text: '', correct: false },
]

const textarea =
  'w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25'

const select =
  'w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'transition focus:border-accent focus:ring-2 focus:ring-accent/25'

/** Labs of one course on the left, the questions of the selected lab on the
 *  right. One screen rather than two: writing a lab means writing its questions,
 *  and a page change between the two loses the thread every time. */
export default function AdminCourse() {
  const { id = '' } = useParams()
  const courseID = Number(id)
  const qc = useQueryClient()

  const [labForm, setLabForm] = useState<LabInput | null>(null)
  const [editingLab, setEditingLab] = useState<AdminLab | null>(null)
  // Which lab is open lives in the URL, not in state: it survives a reload, it
  // can be linked to, and Back steps between labs instead of leaving the page.
  const [params, setParams] = useSearchParams()
  const selectedID = Number(params.get('lab')) || null
  const setSelectedID = (id: number | null) =>
    setParams(id ? { lab: String(id) } : {}, { replace: !id })
  const [error, setError] = useState('')

  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: adminApi.courses })
  const course = courses.data?.find((c) => c.id === courseID)

  const images = useQuery({ queryKey: ['lab-images'], queryFn: adminApi.labImages })
  const labs = useQuery({
    queryKey: ['admin-labs', courseID],
    queryFn: () => adminApi.labs(courseID),
    enabled: Number.isFinite(courseID) && courseID > 0,
  })
  // Read back out of the list, so an edit to the lab is reflected here without
  // a second copy of it to keep in step.
  const selected = labs.data?.find((l) => l.id === selectedID) ?? null

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : 'không lưu được, thử lại')

  const afterLabs = () => {
    qc.invalidateQueries({ queryKey: ['admin-labs', courseID] })
    // The lab count on the course row changes with this.
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
    setLabForm(null)
    setEditingLab(null)
    setError('')
  }

  const saveLab = useMutation({
    mutationFn: (input: LabInput) =>
      editingLab
        ? adminApi.updateLab(editingLab.id, input)
        : adminApi.createLab(courseID, input),
    onSuccess: afterLabs,
    onError: fail,
  })

  const removeLab = useMutation({
    mutationFn: (labID: number) => adminApi.deleteLab(labID),
    onSuccess: (_, labID) => {
      // The right-hand panel is showing questions that no longer exist.
      if (selectedID === labID) setSelectedID(null)
      afterLabs()
    },
    onError: fail,
  })

  if (!Number.isFinite(courseID) || courseID <= 0) {
    return <p className="text-danger">Khoá học không hợp lệ.</p>
  }

  return (
    <div>
      <Link to="/admin/courses" className="text-sm text-accent-soft hover:underline">
        ← Danh sách khoá học
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-fg-strong">
        {course?.title ?? 'Nội dung khoá học'}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Mỗi lab là một phiên terminal. Mỗi nhiệm vụ là một câu hỏi được chấm bằng
        script chạy trong container của học viên.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg-strong">Lab</h2>
            <Button
              className="px-3 py-1.5 text-sm"
              onClick={() => {
                setEditingLab(null)
                setLabForm(EMPTY_LAB)
                setError('')
              }}
            >
              Thêm lab
            </Button>
          </div>

          {labForm && (
            <LabForm
              value={labForm}
              editing={Boolean(editingLab)}
              images={images.data ?? []}
              saving={saveLab.isPending}
              onChange={setLabForm}
              onCancel={() => {
                setLabForm(null)
                setEditingLab(null)
              }}
              onSubmit={() => saveLab.mutate(labForm)}
            />
          )}

          <ul className="mt-4 space-y-2">
            {labs.isLoading && <li className="text-sm text-fg-subtle">Đang tải…</li>}
            {labs.data?.length === 0 && (
              <li className="text-sm text-fg-subtle">Khoá này chưa có lab nào.</li>
            )}
            {labs.data?.map((l) => (
              <li
                key={l.id}
                className={
                  'rounded-lg border p-3 transition ' +
                  (selectedID === l.id ? 'border-accent bg-surface' : 'border-border')
                }
              >
                <button
                  onClick={() => setSelectedID(l.id)}
                  className="block w-full text-left"
                >
                  <span className="font-medium text-fg-strong">{l.title}</span>
                  <span className="ml-2 font-mono text-xs text-fg-subtle">{l.slug}</span>
                  <div className="mt-1 flex flex-wrap gap-2 font-mono text-xs text-fg-muted">
                    <span className="rounded bg-muted px-2 py-0.5">
                      {l.task_count} nhiệm vụ
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5">{l.points} điểm</span>
                    <span className="rounded bg-muted px-2 py-0.5">
                      {l.duration_minutes} phút
                    </span>
                    {/* Worth saying out loud: the session query joins lab_images
                        inner, so a lab without one fails at Start, not at save. */}
                    {l.lab_image_id === null && (
                      <span className="rounded bg-danger/10 px-2 py-0.5 text-danger">
                        chưa gán image — chưa chạy được
                      </span>
                    )}
                  </div>
                </button>
                <div className="mt-2 flex gap-2 text-sm">
                  <button
                    onClick={() => {
                      setEditingLab(l)
                      setLabForm({
                        slug: l.slug,
                        title: l.title,
                        description_md: l.description_md,
                        duration_minutes: l.duration_minutes,
                        lab_image_id: l.lab_image_id,
                        order_idx: l.order_idx,
                      })
                      setError('')
                    }}
                    className="rounded px-2 py-1 text-accent-soft transition hover:bg-muted"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      const msg =
                        `Xoá lab "${l.title}"?\n\n` +
                        `Mất theo ${l.task_count} nhiệm vụ và tiến độ học viên đã làm ở lab này. ` +
                        `Không khôi phục được.`
                      if (confirm(msg)) removeLab.mutate(l.id)
                    }}
                    className="rounded px-2 py-1 text-danger transition hover:bg-danger/10"
                  >
                    Xoá
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          {selected ? (
            // Keyed by lab: switching labs must drop the open form, the trial
            // result and the setup box with it, all of which describe the lab
            // that was showing a moment ago.
            <TaskPanel
              key={selected.id}
              lab={selected}
              onError={fail}
              clearError={() => setError('')}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-sm text-fg-subtle">
              Chọn một lab bên trái để xem và sửa nhiệm vụ của nó.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function LabForm({
  value,
  editing,
  images,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: LabInput
  editing: boolean
  images: { id: number; name: string; tag: string; active: boolean }[]
  saving: boolean
  onChange: (v: LabInput) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const set = <K extends keyof LabInput>(k: K, v: LabInput[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <h3 className="text-sm font-semibold text-fg-strong">
        {editing ? 'Sửa lab' : 'Lab mới'}
      </h3>
      <Field label="Tiêu đề">
        <Input value={value.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Slug" hint="duy nhất trên toàn hệ thống">
        <Input
          value={value.slug}
          variant="terminal"
          onChange={(e) => set('slug', e.target.value)}
          placeholder="linux-lab-1"
        />
      </Field>
      <Field label="Hướng dẫn" hint="hiện ở tab Hướng dẫn">
        <textarea
          rows={3}
          value={value.description_md}
          onChange={(e) => set('description_md', e.target.value)}
          className={textarea}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Thời lượng (phút)">
          <Input
            type="number"
            min={1}
            max={600}
            value={value.duration_minutes}
            onChange={(e) => set('duration_minutes', Number(e.target.value))}
          />
        </Field>
        <Field label="Thứ tự">
          <Input
            type="number"
            min={0}
            value={value.order_idx}
            onChange={(e) => set('order_idx', Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Image" hint="container học viên sẽ dùng">
        <select
          className={select}
          value={value.lab_image_id ?? ''}
          onChange={(e) =>
            set('lab_image_id', e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">— chưa chọn —</option>
          {images.map((im) => (
            <option key={im.id} value={im.id}>
              {im.name}:{im.tag}
              {im.active ? '' : ' (ngừng dùng)'}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="px-3 py-2 text-sm">
          {saving ? 'Đang lưu…' : editing ? 'Lưu' : 'Tạo lab'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-fg-muted transition hover:text-fg-strong"
        >
          Huỷ
        </button>
      </div>
    </form>
  )
}

/** Options of a choice question. Ticking more than one is allowed and turns it
 *  into a multiple-answer question — the student then has to pick exactly that
 *  set, no partial credit. */
function OptionsEditor({
  options,
  onChange,
}: {
  options: AdminOption[]
  onChange: (o: AdminOption[]) => void
}) {
  const patch = (i: number, o: Partial<AdminOption>) =>
    onChange(options.map((cur, j) => (i === j ? { ...cur, ...o } : cur)))

  const correct = options.filter((o) => o.correct).length

  return (
    <div className="space-y-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">Các lựa chọn</span>
        <span className="text-xs text-fg-subtle">
          tick vào ô đúng — tick nhiều = câu nhiều đáp án
        </span>
      </span>

      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={o.correct}
            onChange={(e) => patch(i, { correct: e.target.checked })}
            title="đáp án đúng"
            className="h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <Input
            value={o.text}
            onChange={(e) => patch(i, { text: e.target.value })}
            placeholder={`Lựa chọn ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            disabled={options.length <= 2}
            title={options.length <= 2 ? 'cần ít nhất 2 lựa chọn' : 'xoá lựa chọn'}
            className="shrink-0 rounded px-2 py-1 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange([...options, { text: '', correct: false }])}
          disabled={options.length >= 10}
          className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg transition hover:border-accent disabled:opacity-50"
        >
          Thêm lựa chọn
        </button>
        {/* The two ways an author leaves a question that cannot be answered
            correctly, both of which the server also refuses. */}
        {correct === 0 && (
          <span className="text-xs text-danger">chưa đánh dấu đáp án đúng</span>
        )}
        {correct > 0 && correct === options.length && (
          <span className="text-xs text-danger">tất cả đều đúng — không chấm được</span>
        )}
      </div>
    </div>
  )
}

function TaskPanel({
  lab,
  onError,
  clearError,
}: {
  lab: AdminLab
  onError: (e: unknown) => void
  clearError: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<TaskInput | null>(null)
  const [editing, setEditing] = useState<AdminTask | null>(null)
  // The command that performs the task. Kept out of TaskInput on purpose: it is
  // never saved, it only exists so a trial can check the passing direction too.
  const [setup, setSetup] = useState('')

  const trial = useMutation({
    mutationFn: (input: { script: string; setup: string }) =>
      adminApi.tryScript(lab.id, input.script, input.setup),
    onError,
  })

  const tasks = useQuery({
    queryKey: ['admin-tasks', lab.id],
    queryFn: () => adminApi.tasks(lab.id),
  })

  // Closing the form clears the trial with it: a verdict left on screen would
  // belong to the previous script and read as if it were about this one.
  const closeForm = () => {
    setForm(null)
    setEditing(null)
    setSetup('')
    trial.reset()
  }

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-tasks', lab.id] })
    // Task count and total points live on the lab row.
    qc.invalidateQueries({ queryKey: ['admin-labs'] })
    closeForm()
    clearError()
  }

  const save = useMutation({
    mutationFn: (input: TaskInput) =>
      editing ? adminApi.updateTask(editing.id, input) : adminApi.createTask(lab.id, input),
    onSuccess: done,
    onError,
  })

  const remove = useMutation({
    mutationFn: (taskID: number) => adminApi.deleteTask(taskID),
    onSuccess: done,
    onError,
  })

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) =>
    form && setForm({ ...form, [k]: v })

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-fg-strong">
          Nhiệm vụ — <span className="font-normal text-fg-muted">{lab.title}</span>
        </h2>
        <Button
          className="px-3 py-1.5 text-sm"
          onClick={() => {
            closeForm()
            setForm(EMPTY_TASK)
            clearError()
          }}
        >
          Thêm nhiệm vụ
        </Button>
      </div>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
          className="mt-3 space-y-3 rounded-lg border border-border bg-surface p-4"
        >
          <Field label="Loại nhiệm vụ">
            <select
              className={select}
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as TaskInput['kind']
                // Switching to a choice question with no options would leave the
                // author staring at a form with nothing to fill in.
                setForm({
                  ...form,
                  kind,
                  options:
                    kind === 'choice' && form.options.length === 0
                      ? EMPTY_OPTIONS
                      : form.options,
                })
                trial.reset()
              }}
            >
              <option value="script">Thực hành — chấm bằng script trong container</option>
              <option value="command">Gõ lệnh — chấm bằng lệnh đã gõ</option>
              <option value="choice">Lý thuyết — chọn đáp án</option>
            </select>
          </Field>

          <Field label="Đề bài">
            <textarea
              rows={2}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={textarea}
              placeholder={
                form.kind === 'choice'
                  ? 'Lệnh nào dùng để liệt kê file trong thư mục?'
                  : form.kind === 'command'
                    ? 'Xem phiên bản nhân hệ điều hành đang dùng.'
                    : 'Tạo thư mục birds trong thư mục home.'
              }
            />
          </Field>
          <Field label="Gợi ý" hint="để trống thì tab Gợi ý tự ẩn">
            <textarea
              rows={2}
              value={form.hint}
              onChange={(e) => set('hint', e.target.value)}
              className={textarea}
            />
          </Field>
          {form.kind === 'choice' && (
            <OptionsEditor
              options={form.options}
              onChange={(options) => setForm({ ...form, options })}
            />
          )}

          {form.kind === 'command' && (
            <>
              <Field label="Lệnh được chấp nhận" hint="mỗi dòng một lệnh">
                <textarea
                  rows={3}
                  value={form.expected_commands}
                  onChange={(e) => set('expected_commands', e.target.value)}
                  className={textarea + ' font-mono text-sm'}
                  placeholder={'uname -a\nuname --all'}
                />
              </Field>
              <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
                Đạt khi học viên đã gõ một trong các lệnh trên. Khoảng trắng thừa
                được bỏ qua, còn lại so khớp nguyên văn — <code className="font-mono">ls -la /</code>{' '}
                và <code className="font-mono">ls -al /</code> là hai lệnh khác
                nhau, muốn chấp nhận cả hai thì viết cả hai dòng.
                <br />
                Chỉ dùng cho lệnh không đổi gì trong máy (<code className="font-mono">uname</code>,{' '}
                <code className="font-mono">which</code>,{' '}
                <code className="font-mono">cat /proc/…</code>). Việc gì để lại
                kết quả thì dùng loại “Thực hành” — chấm kết quả chắc hơn chấm
                câu chữ.
              </p>
            </>
          )}

          {form.kind === 'script' && (
            <>
          <Field label="Script chấm" hint="exit code 0 = đúng">
            <textarea
              rows={3}
              value={form.check_script}
              onChange={(e) => set('check_script', e.target.value)}
              className={textarea + ' font-mono text-sm'}
              placeholder={'test -d "$HOME/birds"'}
            />
          </Field>
          {/* The three rules an author needs to know before their script runs.
              Getting any of them wrong fails students who did the task right. */}
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            Chạy bằng <code className="font-mono">/bin/sh -c</code>, user{' '}
            <code className="font-mono">student</code>, thư mục{' '}
            <code className="font-mono">/home/student</code>, tối đa 10 giây. Đây
            là exec riêng nên không thấy <code className="font-mono">cd</code> của
            học viên — dùng đường dẫn tuyệt đối. Chấm theo trạng thái cuối, đừng
            kiểm tra câu lệnh đã gõ.
          </p>

          <div className="space-y-3 rounded-md border border-border-strong bg-bg p-3">
            <Field
              label="Chạy thử"
              hint="container mới, không lưu gì"
            >
              <textarea
                rows={2}
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className={textarea + ' font-mono text-sm'}
                placeholder="Lệnh chuẩn bị (tuỳ chọn) — vd: mkdir -p &quot;$HOME/birds&quot;"
              />
            </Field>
            {/* Both directions matter. Without a setup command the container is
                untouched, so a correct script must FAIL — that is what catches
                the scripts which pass no matter what the student did. */}
            <p className="text-xs leading-relaxed text-fg-subtle">
              Bỏ trống lệnh chuẩn bị → container trắng, script đúng phải{' '}
              <strong className="text-fg-muted">trượt</strong>. Điền lệnh làm bài
              vào → script đúng phải <strong className="text-fg-muted">đạt</strong>.
              Chỉ đạt một chiều là script hỏng.
            </p>
            <button
              type="button"
              onClick={() => trial.mutate({ script: form.check_script, setup })}
              // No image means no container to try it in — the same reason the
              // lab cannot be started by a student.
              disabled={
                trial.isPending || !form.check_script.trim() || lab.lab_image_id === null
              }
              className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg transition hover:border-accent disabled:opacity-50"
            >
              {trial.isPending && (
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {trial.isPending ? 'Đang chạy…' : 'Chạy thử script'}
            </button>
            {lab.lab_image_id === null && (
              <p className="text-xs text-danger">
                Lab chưa gán image nên chưa chạy thử được — chọn image ở form lab
                bên trái.
              </p>
            )}

            {trial.data && (
              <div className="space-y-2 text-xs">
                {trial.data.setup_failed ? (
                  <p className="rounded border border-danger/40 bg-danger/10 px-2 py-1.5 text-danger">
                    Lệnh chuẩn bị lỗi (exit {trial.data.setup_exit_code}) — script
                    chưa được chạy.
                  </p>
                ) : (
                  <p
                    className={
                      'rounded px-2 py-1.5 ' +
                      (trial.data.passed
                        ? 'bg-success-soft text-success'
                        : 'bg-muted text-fg-muted')
                    }
                  >
                    {trial.data.passed ? 'Đạt' : 'Trượt'} — exit code{' '}
                    {trial.data.exit_code}
                  </p>
                )}
                {(trial.data.output || trial.data.setup_output) && (
                  <pre className="max-h-40 overflow-auto rounded bg-muted px-2 py-1.5 font-mono text-fg-muted">
                    {trial.data.setup_output}
                    {trial.data.output}
                  </pre>
                )}
              </div>
            )}
          </div>
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Điểm">
              <Input
                type="number"
                min={0}
                max={1000}
                value={form.points}
                onChange={(e) => set('points', Number(e.target.value))}
              />
            </Field>
            <Field label="Thứ tự">
              <Input
                type="number"
                min={0}
                value={form.order_idx}
                onChange={(e) => set('order_idx', Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending} className="px-3 py-2 text-sm">
              {save.isPending ? 'Đang lưu…' : editing ? 'Lưu' : 'Tạo nhiệm vụ'}
            </Button>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm text-fg-muted transition hover:text-fg-strong"
            >
              Huỷ
            </button>
          </div>
        </form>
      )}

      <ol className="mt-4 space-y-2">
        {tasks.isLoading && <li className="text-sm text-fg-subtle">Đang tải…</li>}
        {tasks.data?.length === 0 && (
          <li className="text-sm text-fg-subtle">Lab này chưa có nhiệm vụ nào.</li>
        )}
        {tasks.data?.map((t, i) => (
          <li key={t.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-fg">
                <span className="mr-2 font-mono text-xs text-fg-subtle">{i + 1}.</span>
                {t.title}
              </p>
              <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs text-accent-soft">
                {t.points} điểm
              </span>
            </div>
            {t.kind === 'command' ? (
              <pre className="mt-2 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                {t.expected_commands}
              </pre>
            ) : t.kind === 'choice' ? (
              <ul className="mt-2 space-y-1 text-xs">
                {t.options.map((o, j) => (
                  <li
                    key={j}
                    className={o.correct ? 'text-success' : 'text-fg-muted'}
                  >
                    {o.correct ? '✓' : '○'} {o.text}
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="mt-2 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                {t.check_script || '(chưa có script — nhiệm vụ này luôn tính là đúng)'}
              </pre>
            )}
            <div className="mt-2 flex gap-2 text-sm">
              <button
                onClick={() => {
                  closeForm()
                  setEditing(t)
                  setForm({
                    title: t.title,
                    hint: t.hint,
                    kind: t.kind,
                    check_script: t.check_script,
                    options: t.options.length ? t.options : EMPTY_OPTIONS,
                    expected_commands: t.expected_commands,
                    points: t.points,
                    order_idx: t.order_idx,
                  })
                  clearError()
                }}
                className="rounded px-2 py-1 text-accent-soft transition hover:bg-muted"
              >
                Sửa
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Xoá nhiệm vụ này?\n\n"${t.title}"\n\n` +
                        `Điểm học viên đã nhận cho nhiệm vụ này cũng mất theo.`,
                    )
                  )
                    remove.mutate(t.id)
                }}
                className="rounded px-2 py-1 text-danger transition hover:bg-danger/10"
              >
                Xoá
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
