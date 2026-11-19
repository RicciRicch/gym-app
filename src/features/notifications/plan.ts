import { useEffect, useMemo } from 'react'
import { deviceTimeZone, PLAN_DAYS, planAhead } from '../../lib/reminders'
import { addDays, toISODate } from '../../lib/schedule'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'
import { usePlan, weeklyTarget } from '../schedule/plan'

const publishedKey = (userId: string) => `gym-app:push-plan:${userId}`

/**
 * Tells the server what is planned for the next two weeks (and the phone's time
 * zone), so the reminder job knows when a workout is due. Only sent when it changed.
 */
export function usePublishPushPlan() {
  const { user } = useAuth()
  const today = toISODate(new Date())
  const { split, plan } = usePlan(today, addDays(today, PLAN_DAYS - 1))

  const row = useMemo(() => {
    const timeZone = deviceTimeZone()
    if (!plan || !timeZone) return null
    return {
      time_zone: timeZone,
      mode: plan.mode,
      days: planAhead(plan.planned, today),
      weekly_target: Math.min(7, Math.max(1, weeklyTarget(split))),
    }
  }, [plan, split, today])

  useEffect(() => {
    if (!user || !row) return
    const signature = JSON.stringify(row)
    try {
      if (localStorage.getItem(publishedKey(user.id)) === signature) return
    } catch {
      /* storage blocked: publish every time */
    }
    void supabase
      .from('push_plans')
      .upsert({ user_id: user.id, ...row })
      .then(({ error }) => {
        if (error) return
        try {
          localStorage.setItem(publishedKey(user.id), signature)
        } catch {
          /* ignore */
        }
      })
  }, [user, row])
}
