import { Link } from 'react-router-dom'
import { useProfile } from '../features/auth/useProfile'
import { fromISODate, toISODate } from '../lib/schedule'

export function TodayPage() {
  const { data: profile } = useProfile()
  const today = fromISODate(toISODate(new Date()))
  const dateLabel = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="animate-fade-up pt-2">
      <p className="text-sm font-semibold tracking-widest text-accent uppercase">{dateLabel}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Hey, {profile?.display_name}</h1>

      {/* M3 replaces this with today's planned workout + "Start workout". */}
      <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">No split yet</h2>
        <p className="mt-1 text-muted">Build your weekly split and today&apos;s workout will show up here.</p>
        <Link
          to="/split"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 font-bold text-accent-ink transition active:scale-[0.97]"
        >
          Create your split
        </Link>
      </section>
    </div>
  )
}
