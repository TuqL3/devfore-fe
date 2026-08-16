import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { Card } from '@/components/ui'
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
  StopIcon,
  TerminalIcon,
} from '@/components/icons'
import type { LabHistoryRow, SessionStatus } from '@/lib/types'
import { formatWhen } from '@/lib/relativeTime'

/** How a finished session reads. `running` is the one still open, and it is the
 *  only row that leads back into the lab rather than into a report. */
const STATUS: Record<
  SessionStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  submitted: {
    label: 'Handed in',
    dot: 'bg-success',
    text: 'text-success',
    bg: 'bg-success-soft',
  },
  running: {
    label: 'Running',
    dot: 'bg-accent',
    text: 'text-accent-soft',
    bg: 'bg-accent/10',
  },
  ended: {
    label: 'Abandoned',
    dot: 'bg-fg-subtle',
    text: 'text-fg-muted',
    bg: 'bg-muted',
  },
  expired: {
    label: 'Timed out',
    dot: 'bg-danger',
    text: 'text-danger',
    bg: 'bg-danger/10',
  },
}

type Filter = 'all' | SessionStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Handed in' },
  { key: 'running', label: 'Running' },
  { key: 'ended', label: 'Abandoned' },
  { key: 'expired', label: 'Timed out' },
]

export default function LabHistory() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const history = useQuery({ queryKey: ['lab-history'], queryFn: labsApi.history })
  const all = useMemo(() => history.data ?? [], [history.data])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        (!q || r.lab_title.toLowerCase().includes(q)),
    )
  }, [all, filter, query])

  return (
    // Bề rộng do `Layout` quyết — xem chú thích ở SimList.
    <div>
      <h1 className="text-2xl font-bold text-fg-strong">Lab history</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Every time you open a lab is one run. Open a run to review each question.
      </p>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search labs…"
            aria-label="Search labs…"
            className="w-full rounded-lg border border-border-strong bg-bg py-2.5 pr-3 pl-9 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ' +
                (filter === f.key
                  ? 'bg-accent text-accent-fg'
                  : 'text-fg-muted hover:text-fg-strong')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {history.isLoading && (
          <p className="py-10 text-center text-sm text-fg-subtle">Loading…</p>
        )}

        {history.isError && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            Could not load the history, try again later.
          </p>
        )}

        {!history.isLoading && all.length === 0 && (
          <Card className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
              <TerminalIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-fg">
              You have not done any labs yet
            </p>
            <Link
              to="/courses"
              className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
            >
              Browse courses
            </Link>
          </Card>
        )}

        {!history.isLoading && all.length > 0 && shown.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-subtle">
            No run matches the filter.
          </p>
        )}

        {shown.map((row) => (
          <HistoryCard key={row.session_id} row={row} />
        ))}
      </div>
    </div>
  )
}

function HistoryCard({ row }: { row: LabHistoryRow }) {
  const s = STATUS[row.status]
  const running = row.status === 'running'
  // A running session has no report to read yet; the only useful thing to do
  // with it is go back to the terminal it left open.
  const href = running
    ? `/courses/${row.course_slug}/labs/${row.lab_slug}`
    : `/history/${row.session_id}`

  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-xl border border-border border-l-4 bg-surface p-4 shadow-sm transition hover:border-accent/50"
      style={{ borderLeftColor: 'var(--accent)' }}
    >
      <span
        className={'grid h-9 w-9 shrink-0 place-items-center rounded-lg ' + s.bg}
      >
        {running ? (
          <TerminalIcon className={'h-4 w-4 ' + s.text} />
        ) : row.status === 'submitted' ? (
          <CheckIcon className={'h-4 w-4 ' + s.text} />
        ) : (
          <StopIcon className={'h-4 w-4 ' + s.text} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg-strong">{row.lab_title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            {formatWhen(row.started_at)}
          </span>
          {/* Only where it means something. A session that was walked away from
              has a correct count, but it is the count at the moment it lapsed,
              not a result anybody handed in. */}
          {row.status === 'submitted' && (
            <span className="tabular-nums">
              {row.correct}/{row.total} correct
            </span>
          )}
        </p>
      </div>

      <span
        className={
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
          s.bg +
          ' ' +
          s.text
        }
      >
        <span className={'h-1.5 w-1.5 rounded-full ' + s.dot} aria-hidden="true" />
        {s.label}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-subtle" />
    </Link>
  )
}
