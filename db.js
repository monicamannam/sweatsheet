// ============================================================
//  db.js — one place for all Supabase access.
//  Every page imports the functions it needs from here, so no
//  database code is ever copy-pasted into a page again.
//  When your schema changes, you edit this file only.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// The publishable key is safe to ship in client code — it's
// protected by your Supabase Row Level Security policies.
const SUPABASE_URL      = 'https://axjdyxxwjqkzjptykjrk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_bxbvx2jVlmlqx_UgjGBqnA_CicT3EFM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Categories, alphabetised ────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase
    .from('sweatsheet_categories')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data ?? []
}

// ── Exercises (with their category name joined in) ──────────
export async function getExercises() {
  const { data, error } = await supabase
    .from('sweatsheet_workouts')
    .select('*, sweatsheet_categories(name)')
    .eq('deleted', false)
    .order('name')

  if (error) throw error
  return data ?? []
}

// ── Workout days (newest first) ─────────────────────────────
// Each day comes back with its person, its exercises, and the
// sets under each exercise. Exercises and sets are sorted in the
// page (workout-logs.html). Matches these tables:
//   sweatsheet_workout_days(user_id, performed_date, title)
//   sweatsheet_workout_exercises(workout_day_id, exercise_id)
//   sweatsheet_workout_sets(workout_exercise_id, set_number, reps, weight)
export async function getWorkoutDays() {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select(`
      id,
      performed_date,
      title,
      created_at,
      sweatsheet_users ( name ),
      sweatsheet_workout_exercises (
        id,
        sweatsheet_workouts ( name ),
        sweatsheet_workout_sets ( set_number, reps, weight )
      )
    `)
    .order('performed_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
