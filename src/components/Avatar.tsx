import type { User } from '@/lib/types'

/** Google avatar when there is one, otherwise the first two letters. */
export function Avatar({
  user,
  className = 'h-7 w-7 text-xs',
}: {
  user: User
  className?: string
}) {
  if (user.avatar_url)
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={'shrink-0 rounded-md object-cover ' + className}
      />
    )
  return (
    <span
      className={
        'flex shrink-0 items-center justify-center rounded-md bg-accent font-mono font-bold text-accent-fg ' +
        className
      }
    >
      {user.username.slice(0, 2).toUpperCase()}
    </span>
  )
}
