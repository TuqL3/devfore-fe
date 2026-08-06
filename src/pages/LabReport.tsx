import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { Card } from '@/components/ui'
import { ArrowLeftIcon, CheckIcon } from '@/components/icons'
import { formatWhen } from '@/lib/relativeTime'
import type { LabReport as Report, ReportAnswer } from '@/lib/types'

/** One finished attempt: the score, then every question with the key beside
 *  what was answered. Reached from the history list, and from handing a lab in —
 *  the second adds ?done=1, which is the only difference between the two. */
export default function LabReport() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const justSubmitted = params.get('done') === '1'

  const report = useQuery({
    queryKey: ['lab-report', id],
    queryFn: () => labsApi.report(id),
    enabled: Boolean(id),
  })

  if (report.isLoading) {
    return <p className="p-8 text-center text-sm text-fg-subtle">Đang tải…</p>
  }

  if (report.isError || !report.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-danger">
          Không xem được lượt này. Có thể phiên vẫn đang chạy, hoặc không phải của
          bạn.
        </p>
        <Link
          to="/history"
          className="mt-4 inline-block text-sm text-accent-soft hover:underline"
        >
          ← Lịch sử thực hành
        </Link>
      </div>
    )
  }

  const r = report.data
  const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
  // Three buckets, not two: a question never attempted is not a wrong answer,
  // and counting it as one told a student they got ten wrong when they answered
  // none.
  const wrong = r.answers.filter((a) => a.passed === false).length
  const skipped = r.answers.filter((a) => a.passed === null).length
  // The row only keeps the last answer, so a question got wrong and then fixed
  // reads as a plain pass — which is why every report used to say "Sai (0)". The
  // attempt count is the only trace left of the wrong ones. Null is not counted:
  // a session graded before the count existed says nothing either way.
  const retried = r.answers.filter(
    (a) => a.passed === true && a.attempts !== null && a.attempts > 1,
  ).length

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {justSubmitted && <Congrats report={r} pct={pct} />}

      <Link
        to="/history"
        className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Lịch sử thực hành
      </Link>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-fg-strong">{r.lab_title}</h1>
          <p className="mt-1 text-xs text-fg-subtle">
            {r.submitted_at
              ? `Nộp lúc ${formatWhen(r.submitted_at)}`
              : `Bắt đầu ${formatWhen(r.started_at)} — chưa nộp`}
          </p>
        </div>

        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-xs text-fg-muted">Kết quả</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            <span className="text-2xl font-bold tabular-nums text-fg-strong">
              {r.correct}
            </span>{' '}
            / {r.total} câu đúng
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-success transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <ol className="space-y-4">
          {r.answers.map((a, i) => (
            <AnswerCard key={a.task_id} answer={a} index={i} />
          ))}
        </ol>

        <Card className="self-start p-4 lg:sticky lg:top-8">
          <p className="font-medium text-fg-strong">Danh sách câu hỏi</p>
          {/* Amber is a subset of green, not a fourth outcome: a question fixed
              on the third try is still a pass. Said this way rather than as a
              "Sai" tally, which counted only the questions left wrong at
              hand-in and so read zero on every completed lab. */}
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" />
              Đúng ({r.correct})
            </span>
            {retried > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Phải thử lại ({retried})
              </span>
            )}
            {wrong > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
                Sai ({wrong})
              </span>
            )}
            {skipped > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-fg-subtle" />
                Chưa làm ({skipped})
              </span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.answers.map((a, i) => {
              const late = a.passed === true && a.attempts !== null && a.attempts > 1
              return (
                <a
                  key={a.task_id}
                  href={`#cau-${i + 1}`}
                  title={
                    a.attempts && a.attempts > 1
                      ? `Câu ${i + 1} — chấm ${a.attempts} lần`
                      : `Câu ${i + 1}`
                  }
                  className={
                    'grid h-8 w-8 place-items-center rounded-md font-mono text-xs transition ' +
                    (late
                      ? 'bg-amber-500/15 text-amber-500 hover:brightness-110'
                      : a.passed
                        ? 'bg-success-soft text-success hover:brightness-110'
                        : a.passed === false
                          ? 'bg-danger/10 text-danger hover:brightness-110'
                          : 'bg-muted text-fg-subtle hover:text-fg-strong')
                  }
                >
                  {String(i + 1).padStart(2, '0')}
                </a>
              )
            })}
          </div>

          <p className="mt-4 border-t border-border pt-3 text-sm text-fg-muted">
            <strong className="text-fg-strong">
              {r.correct}/{r.total}
            </strong>{' '}
            câu đúng
            {retried > 0 && (
              <>
                , trong đó{' '}
                <strong className="text-amber-500">{retried}</strong> câu phải thử
                lại
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}

function Congrats({ report, pct }: { report: Report; pct: number }) {
  const all = report.total > 0 && report.correct === report.total
  return (
    <div
      className={
        'rounded-xl px-6 py-5 text-white ' +
        (all
          ? 'bg-gradient-to-r from-emerald-600 to-green-500'
          : 'bg-gradient-to-r from-amber-600 to-orange-500')
      }
    >
      <p className="text-lg font-bold">
        {all ? '🎉 Chúc mừng bạn đã hoàn thành bài thực hành!' : 'Đã nộp bài'}
      </p>
      <p className="mt-1 text-sm text-white/90">
        Bạn đã nộp “{report.lab_title}” với kết quả {report.correct}/{report.total}{' '}
        câu đúng ({pct}%).
      </p>
    </div>
  )
}

const KIND_LABEL: Record<ReportAnswer['kind'], string> = {
  script: 'Thực hành',
  command: 'Gõ lệnh',
  choice: 'Lý thuyết',
  sim: 'Pipeline',
}

function AnswerCard({ answer, index }: { answer: ReportAnswer; index: number }) {
  const right = answer.passed === true
  const wrong = answer.passed === false
  // Passed, but not on the first press. The card stays a pass — this only says
  // how it got there, which is the part the stored answer overwrote.
  const late = right && answer.attempts !== null && answer.attempts > 1

  return (
    <li id={`cau-${index + 1}`} className="scroll-mt-8">
      <Card
        className={
          'overflow-hidden ' +
          (late
            ? 'border-amber-500/40'
            : right
              ? 'border-success/40'
              : wrong
                ? 'border-danger/40'
                : '')
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <p className="text-sm text-fg-muted">
            Câu <strong className="text-fg-strong">{index + 1}</strong> /{' '}
            {KIND_LABEL[answer.kind]} · {answer.points} điểm
          </p>
          <span
            className={
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
              (late
                ? 'bg-amber-500/15 text-amber-500'
                : right
                  ? 'bg-success-soft text-success'
                  : wrong
                    ? 'bg-danger/10 text-danger'
                    : 'bg-muted text-fg-muted')
            }
          >
            {late
              ? `✓ Đúng sau ${answer.attempts} lần`
              : right
                ? '✓ Đúng'
                : wrong
                  ? '✕ Sai'
                  : 'Chưa làm'}
          </span>
        </div>

        <p className="px-5 py-4 leading-relaxed font-medium text-fg-strong">
          {answer.title}
        </p>

        {/* Only a choice question has anything to lay out. A script one was
            marked by what it found in the container, and there is no list of
            options to show either side of. */}
        {answer.passed === null && (
          <p className="px-5 pb-4 text-sm text-fg-subtle">
            Bạn chưa trả lời câu này, nên đáp án đúng không được hiển thị.
          </p>
        )}

        {answer.passed !== null && answer.kind === 'choice' && answer.options.length > 0 && (
          <div className="space-y-2 px-5 pb-4">
            <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
              Các đáp án
            </p>
            {answer.options.map((text, i) => (
              <Option
                key={i}
                text={text}
                letter={String.fromCharCode(65 + i)}
                correct={answer.correct.includes(i)}
                picked={answer.selected.includes(i)}
              />
            ))}
          </div>
        )}

        {answer.answered_at && (
          <p className="border-t border-border px-5 py-2.5 text-xs text-fg-subtle">
            Trả lời lúc {formatWhen(answer.answered_at)}
          </p>
        )}
      </Card>
    </li>
  )
}

function Option({
  text,
  letter,
  correct,
  picked,
}: {
  text: string
  letter: string
  correct: boolean
  picked: boolean
}) {
  // Four states in two flags. The one that has to stand out is picked-and-wrong:
  // it is the only line the student needs to read twice.
  const tone = correct
    ? 'border-success/50 bg-success/10'
    : picked
      ? 'border-danger/50 bg-danger/10'
      : 'border-border'

  return (
    <div className={'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ' + tone}>
      <span className="mt-0.5 w-4 shrink-0 text-center">
        {correct ? (
          <CheckIcon className="h-4 w-4 text-success" />
        ) : picked ? (
          <span className="text-sm text-danger">✕</span>
        ) : (
          <span className="block h-1.5 w-1.5 rounded-full bg-fg-subtle" />
        )}
      </span>
      <span className="font-mono text-xs text-fg-subtle">{letter}.</span>
      <span className="min-w-0 flex-1 text-sm text-fg">
        {text}
        <span className="mt-1 flex flex-wrap gap-1.5">
          {correct && (
            <span className="rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-medium uppercase text-success">
              Đáp án đúng
            </span>
          )}
          {picked && (
            <span
              className={
                'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ' +
                (correct ? 'bg-muted text-fg-muted' : 'bg-danger/15 text-danger')
              }
            >
              Bạn đã chọn
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
