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

// ── People (for the logs page dropdown), alphabetised ───────
export async function getUsers() {
  const { data, error } = await supabase
    .from('sweatsheet_users')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data ?? []
}

// ── Workout days for ONE person (newest first) ──────────────
// Each day comes back with its exercises and the sets under each
// exercise. Exercises and sets are sorted in the page.
export async function getWorkoutDays(userId) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select(`
      id,
      performed_date,
      title,
      created_at,
      sweatsheet_workout_exercises (
        id,
        sweatsheet_workouts ( name ),
        sweatsheet_workout_sets ( set_number, reps, weight )
      )
    `)
    .eq('user_id', userId)
    .order('performed_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// Exercise catalog, for the picker.
export async function getWorkouts() {
  const { data, error } = await supabase
    .from('sweatsheet_workouts')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data
}

// Save a whole logged day: the day, its exercises, and each exercise's sets.
export async function saveWorkoutDay(entry) {
  const { data: day, error: dayErr } = await supabase
    .from('sweatsheet_workout_days')
    .insert({ user_id: entry.userId, performed_date: entry.performedDate, title: entry.title || null })
    .select('id').single()
  if (dayErr) throw dayErr

  for (const ex of entry.exercises) {
    const { data: exRow, error: exErr } = await supabase
      .from('sweatsheet_workout_exercises')
      .insert({ day_id: day.id, workout_id: ex.workoutId })
      .select('id').single()
    if (exErr) throw exErr

    const sets = ex.sets
      .map((s, i) => ({
        exercise_id: exRow.id,
        set_number: i + 1,
        reps:   s.reps   === '' || s.reps   == null ? null : Number(s.reps),
        weight: s.weight === '' || s.weight == null ? null : Number(s.weight),
      }))
      .filter(s => s.reps !== null || s.weight !== null)   // drop blank sets
    if (sets.length) {
      const { error: setErr } = await supabase.from('sweatsheet_workout_sets').insert(sets)
      if (setErr) throw setErr
    }
  }
  return day.id
}
