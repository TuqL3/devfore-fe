import { useLevels } from '@/lib/levels'

/** Signal-strength style bars: 1 filled for the lowest level, all for the top. */
export function LevelMeter({
  level,
  dim = 'bg-border-strong',
}: {
  level: string
  /** Colour of the unfilled bars — needs to change over dark artwork. */
  dim?: string
}) {
  const { rank, steps } = useLevels()
  const filled = rank(level)
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          className={'w-1.5 rounded-sm ' + (i < filled ? 'bg-accent' : dim)}
          style={{ height: `${8 + i * 5}px` }}
        />
      ))}
    </span>
  )
}
