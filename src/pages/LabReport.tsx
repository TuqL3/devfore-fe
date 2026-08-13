import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { Card } from '@/components/ui'
import { ArrowLeftIcon, CheckIcon } from '@/components/icons'
import { Prose as Markdown } from '@/components/MarkdownEditor'
import { clockLabel } from '@/lib/clock'
import { formatWhen } from '@/lib/relativeTime'
import { locale, useT, type Key } from '@/lib/i18n'
import type {
  IncidentReport,
  LabReport as Report,
  ReportAnswer,
} from '@/lib/types'

/** One finished attempt: the score, then every question with the key beside
 *  what was answered. Reached from the history list, and from handing a lab in —
 *  the second adds ?done=1, which is the only difference between the two. */
export default function LabReport() {
  const t = useT()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const justSubmitted = params.get('done') === '1'

  const report = useQuery({
    queryKey: ['lab-report', id],
    queryFn: () => labsApi.report(id),
    enabled: Boolean(id),
  })

  if (report.isLoading) {
    return <p className="p-8 text-center text-sm text-fg-subtle">{t('common.loading')}</p>
  }

  if (report.isError || !report.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-danger">
          {t('report.loadError')}
        </p>
        <Link
          to="/history"
          className="mt-4 inline-block text-sm text-accent-soft hover:underline"
        >
          ← {t('report.backHistory')}
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
    // Bề rộng do `Layout` quyết — xem chú thích ở SimList.
    <div className="space-y-6">
      {justSubmitted && <Congrats report={r} pct={pct} />}

      <Link
        to="/history"
        className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        {t('report.backHistory')}
      </Link>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-fg-strong">{r.lab_title}</h1>
          <p className="mt-1 text-xs text-fg-subtle">
            {r.submitted_at
              ? t('report.submittedAt', { when: formatWhen(r.submitted_at) })
              : t('report.startedNotSubmitted', {
                  when: formatWhen(r.started_at),
                })}
          </p>
        </div>

        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-xs text-fg-muted">{t('report.result')}</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            <span className="text-2xl font-bold tabular-nums text-fg-strong">
              {r.correct}
            </span>{' '}
            / {r.total} {t('report.correctOf')}
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-success transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Trên phần câu hỏi: ở một ca trực, thứ đáng đọc trước là sự cố vừa rồi
          là gì và mất bao lâu mới cứu được. Danh sách câu hỏi vẫn nguyên bên
          dưới, không lab nào mất gì. */}
      {r.incident && (
        <IncidentPanel
          incident={r.incident}
          startedAt={r.started_at}
          sessionID={r.session_id}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <ol className="space-y-4">
          {r.answers.map((a, i) => (
            <AnswerCard key={a.task_id} answer={a} index={i} />
          ))}
        </ol>

        <Card className="self-start p-4 lg:sticky lg:top-8">
          <p className="font-medium text-fg-strong">{t('report.questionList')}</p>
          {/* Amber is a subset of green, not a fourth outcome: a question fixed
              on the third try is still a pass. Said this way rather than as a
              "Sai" tally, which counted only the questions left wrong at
              hand-in and so read zero on every completed lab. */}
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" />
              {t('report.right', { n: r.correct })}
            </span>
            {retried > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                {t('report.retried', { n: retried })}
              </span>
            )}
            {wrong > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
                {t('report.wrong', { n: wrong })}
              </span>
            )}
            {skipped > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-fg-subtle" />
                {t('report.skipped', { n: skipped })}
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
                      ? t('report.qTitleAttempts', { i: i + 1, n: a.attempts })
                      : t('report.qTitle', { i: i + 1 })
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
            {t('report.correctOf')}
            {retried > 0 && (
              <>
                {t('report.retriedTailBefore')}{' '}
                <strong className="text-amber-500">{retried}</strong>{' '}
                {t('report.retriedTailAfter')}
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}

/** Đăng kết quả ca trực lên một trang ai cũng mở được, và gỡ nó xuống.
 *
 *  Trang công khai chỉ mang **con số và tên sự cố** — không có dòng thời gian,
 *  không có lời giải. Dòng thời gian là bản ghi nguyên văn thứ người ta gõ vào
 *  shell, tức là chỗ một cái mật khẩu gõ nhầm hay tên host nội bộ lọt ra ngoài;
 *  danh sách cột được quyết ở câu SQL bên server chứ không phải ở đây. Câu chữ
 *  dưới nút nói thẳng điều đó **trước** khi bấm, không phải sau.
 *
 *  Không có cờ "đang công khai" đọc sẵn từ báo cáo: bấm Chia sẻ lần nữa trả về
 *  đúng link cũ chứ không sinh trang thứ hai, nên trạng thái lấy lại được bằng
 *  một cú bấm và báo cáo không phải mọc thêm một trường chỉ để hiển thị. */
function ShareRow({ sessionID }: { sessionID: string }) {
  const t = useT()
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const share = useMutation({
    mutationFn: () => labsApi.share(sessionID),
    onSuccess: (r) => setToken(r.token),
  })
  const unshare = useMutation({
    mutationFn: () => labsApi.unshare(sessionID),
    onSuccess: () => {
      setToken(null)
      setCopied(false)
    },
  })

  const url = token ? `${window.location.origin}/r/${token}` : ''

  return (
    <div className="mt-4 border-t border-border pt-4">
      {!token ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => share.mutate()}
            disabled={share.isPending}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-strong transition hover:border-accent disabled:opacity-40"
          >
            {share.isPending ? t('share.publishing') : t('share.publish')}
          </button>
          <p className="text-xs text-fg-subtle">{t('share.whatIsPublic')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs text-fg">
              {url}
            </code>
            <button
              onClick={() => {
                // `writeText` đòi ngữ cảnh bảo mật (https hoặc localhost). Không
                // có thì link vẫn nằm đó cho người ta bôi đen — báo là chưa chép
                // được còn hơn im lặng để họ tưởng đã chép.
                navigator.clipboard
                  ?.writeText(url)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false))
              }}
              className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-strong transition hover:border-accent"
            >
              {copied ? t('share.copied') : t('share.copy')}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-muted transition hover:border-accent hover:text-fg"
            >
              {t('share.open')}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => unshare.mutate()}
              disabled={unshare.isPending}
              className="text-xs text-danger hover:underline disabled:opacity-40"
            >
              {t('share.takeDown')}
            </button>
            <p className="text-xs text-fg-subtle">{t('share.whatIsPublic')}</p>
          </div>
        </div>
      )}
      {(share.isError || unshare.isError) && (
        <p className="mt-2 text-sm text-danger">{t('share.failed')}</p>
      )}
    </div>
  )
}

/** Phần hậu sự cố: mất bao lâu, tốn bao nhiêu, hỏng cái gì, và bạn đã gõ gì.
 *
 *  Dòng thời gian mới là chỗ dạy. Sửa được rồi mà không nhìn lại thì lần sau vẫn
 *  mất đúng ba phút đó cho một hướng sai — đây là thứ duy nhất trong cả sản phẩm
 *  chỉ ra được chuyện đó, vì nó là thứ duy nhất ghi lại thứ tự các lần thử. */
function IncidentPanel({
  incident,
  startedAt,
  sessionID,
}: {
  incident: IncidentReport
  startedAt: string
  sessionID: string
}) {
  const t = useT()
  const started = Date.parse(startedAt)
  const recovered = incident.recovered_at !== null
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold text-fg-strong">{t('report.incidentTitle')}</h2>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
            (recovered ? 'bg-success-soft text-success' : 'bg-danger/10 text-danger')
          }
        >
          {recovered ? t('report.recovered') : t('report.notRecovered')}
        </span>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-fg-muted">{t('report.mttr')}</dt>
          <dd className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-fg-strong">
            {recovered ? clockLabel(incident.downtime_seconds) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{t('report.failedRequests')}</dt>
          <dd className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-fg-strong">
            {recovered
              ? `~${incident.requests_failed.toLocaleString(locale())}`
              : '—'}
          </dd>
          {/* Cùng câu cảnh báo với dải lúc đang làm bài: con số này suy ra từ
              một tỉ lệ do tác giả gõ, không đo từ hệ thống nào. */}
          <dd className="mt-0.5 text-xs text-fg-subtle">
            {t('report.rpsNote', { rps: incident.rps })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{t('report.cause')}</dt>
          <dd className="mt-0.5 text-sm font-medium text-fg-strong">{incident.title}</dd>
        </div>
      </dl>

      <ShareRow sessionID={sessionID} />

      {incident.reveal_md.trim() && (
        <div className="mt-4 border-t border-border pt-4">
          <Markdown>{incident.reveal_md}</Markdown>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="font-medium text-fg-strong">{t('report.whatYouTyped')}</p>
        {incident.timeline.length === 0 ? (
          <p className="mt-1 text-sm text-fg-subtle">
            {t('report.noCommands')}
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-fg-subtle">
              {t('report.timelineNote')}
            </p>
            <ol className="mt-3 space-y-1 font-mono text-xs">
              {incident.timeline.map((entry, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-14 shrink-0 tabular-nums text-fg-subtle">
                    {/* Khoảng cách từ lúc bắt đầu, không phải giờ trong ngày:
                        thứ đáng đọc là "phút thứ mấy mới nhìn đúng chỗ". */}
                    {entry.at
                      ? `+${clockLabel((Date.parse(entry.at) - started) / 1000)}`
                      : '—'}
                  </span>
                  <span className="min-w-0 break-all text-fg">{entry.command}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Card>
  )
}

function Congrats({ report, pct }: { report: Report; pct: number }) {
  const t = useT()
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
        {all ? t('report.congratsAll') : t('report.congratsSome')}
      </p>
      <p className="mt-1 text-sm text-white/90">
        {t('report.congratsBody', {
          lab: report.lab_title,
          correct: report.correct,
          total: report.total,
          pct,
        })}
      </p>
    </div>
  )
}

const KIND_LABEL: Record<ReportAnswer['kind'], Key> = {
  script: 'lab.kind.script',
  command: 'lab.kind.command',
  choice: 'lab.kind.choice',
  sim: 'lab.kind.sim',
}

function AnswerCard({ answer, index }: { answer: ReportAnswer; index: number }) {
  const t = useT()
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
            {t('report.questionWord')}{' '}
            <strong className="text-fg-strong">{index + 1}</strong> /{' '}
            {t(KIND_LABEL[answer.kind])} · {answer.points} {t('report.pointsWord')}
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
              ? t('report.rightAfter', { n: answer.attempts ?? 0 })
              : right
                ? t('report.rightShort')
                : wrong
                  ? t('report.wrongShort')
                  : t('report.skippedShort')}
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
            {t('report.notAnswered')}
          </p>
        )}

        {answer.passed !== null && answer.kind === 'choice' && answer.options.length > 0 && (
          <div className="space-y-2 px-5 pb-4">
            <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
              {t('report.options')}
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
            {t('report.answeredAt', { when: formatWhen(answer.answered_at) })}
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
  const t = useT()
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
              {t('report.correctOption')}
            </span>
          )}
          {picked && (
            <span
              className={
                'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ' +
                (correct ? 'bg-muted text-fg-muted' : 'bg-danger/15 text-danger')
              }
            >
              {t('report.yourPick')}
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
