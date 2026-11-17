import { Link } from 'react-router-dom'

/** "Feed  Friends" as the page title: the current one bright, the other a quiet link. */
export function SocialTabs({ active, requests = 0 }: { active: 'feed' | 'friends'; requests?: number }) {
  const tab = (key: 'feed' | 'friends', to: string, label: string, count = 0) =>
    key === active ? (
      <h1 className="text-3xl font-black tracking-tight">{label}</h1>
    ) : (
      <Link to={to} replace className="relative flex min-h-11 items-center text-3xl font-black tracking-tight text-muted/60 transition active:scale-95">
        {label}
        {count > 0 && (
          <span className="ml-1.5 grid min-w-5 place-items-center self-start rounded-full bg-accent px-1 text-[11px] leading-5 font-black text-accent-ink">
            {count}
          </span>
        )}
      </Link>
    )
  return (
    <nav aria-label="Social" className="flex items-baseline gap-5 pt-2">
      {tab('feed', '/feed', 'Feed')}
      {tab('friends', '/friends', 'Friends', requests)}
    </nav>
  )
}
