import type { User } from '@/lib/types'

/** Google avatar when there is one, otherwise the first two letters.
 *
 *  Takes only the two fields it reads rather than a whole User: the chat screen
 *  draws people it knows by name and picture alone, and demanding an email and a
 *  role list to render initials would mean inventing them at every call site. */
export function Avatar({
  user,
  className = 'h-7 w-7 text-xs',
}: {
  user: Pick<User, 'username' | 'avatar_url'>
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
