// ============================================================
//  db.js — one place for all Supabase access.
//  Every page imports the functions it needs from here, so no
//  database code is ever copy-pasted into a page again.
//  When your schema changes, you edit this file only.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

async function loadConfig() {
  const r = await fetch('/api/config', { cache: 'no-store' })
  if (!r.ok) throw new Error('Config request failed with HTTP ' + r.status)
  return r.json()
}

const { supabaseUrl, supabaseAnonKey } = await loadConfig()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
// Lightweight feed for the calendar. No exercise/set join here.
export async function getWorkoutCalendarDays(userId) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select('id, performed_date, title, created_at')
    .eq('user_id', userId)
    .order('performed_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// Detailed feed for the visible log list. Each day comes back with its
// exercises and sets, capped to the latest 10 sessions.
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
    .limit(10)

  if (error) throw error
  return data ?? []
}

// ── Distinct session titles this person has used before ─────
// Powers the "pick a past title" chips + autocomplete in the
// new-session modal. Returns [{ title, count }] ordered by how
// often each title is used (most-used first); recency breaks
// ties because rows arrive newest-first and the sort is stable.
// Titles are de-duplicated case-insensitively, keeping the most
// recent spelling as the display label.
export async function getTitlesForUser(userId) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select('title, created_at')
    .eq('user_id', userId)
    .not('title', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  const byKey = new Map()
  for (const row of data ?? []) {
    const title = (row.title || '').replace(/\s+/g, ' ').trim()
    if (!title) continue
    const key = title.toLowerCase()
    const existing = byKey.get(key)
    if (existing) existing.count++
    else byKey.set(key, { title, count: 1 })   // first seen = most recent spelling
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count)
}

// ── Exercise catalog for the picker (excludes soft-deleted) ──
export async function getWorkouts() {
  const { data, error } = await supabase
    .from('sweatsheet_workouts')
    .select('id, name')
    .eq('deleted', false)
    .order('name')

  if (error) throw error
  return data ?? []
}

// ── ONE workout day with its exercises + sets ───────────────
// Used by the log page to rebuild a session from the ?day= id
// (e.g. after a refresh, or when editing from the logs page).
export async function getWorkoutDay(dayId) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select(`
      id,
      performed_date,
      title,
      user_id,
      sweatsheet_workout_exercises (
        id,
        sweatsheet_workouts ( name ),
        sweatsheet_workout_sets ( set_number, reps, weight )
      )
    `)
    .eq('id', dayId)
    .single()

  if (error) throw error
  return data
}

// ── Escape ILIKE wildcards so a title is matched literally ──
// % and _ are LIKE wildcards; \ is the escape char. Without this,
// a title like "Day_1" would also match "DayX1".
function escapeLike(s) {
  return String(s).replace(/([\\%_])/g, '\\$1')
}

// ── The most recent OTHER day with the same title (read-only) ─
// Powers the "Last time" reference panel on the log page: given the
// session you're editing, find that person's previous session with
// the same title and return it (exercises + sets), or null if none.
// Matching is case-insensitive; the current day is excluded by id.
export async function getPreviousDayByTitle({ userId, title, excludeDayId }) {
  if (!userId || !title || !String(title).trim()) return null

  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .select(`
      id,
      performed_date,
      title,
      sweatsheet_workout_exercises (
        id,
        sweatsheet_workouts ( name ),
        sweatsheet_workout_sets ( set_number, reps, weight )
      )
    `)
    .eq('user_id', userId)
    .ilike('title', escapeLike(title))
    .neq('id', excludeDayId)
    .order('performed_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

// ── Create a session (the day row only). Returns the new id. ─
export async function createWorkoutDay({ userId, performedDate, title }) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_days')
    .insert({ user_id: userId, performed_date: performedDate, title: title || null })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// ── Add one exercise to a day, plus any number of sets ──────
// `sets` is an array of { reps, weight }. Fully-blank rows are
// dropped; the rest are numbered 1..n. Returns the new exercise
// id and the sets that were actually saved.
export async function addExerciseWithSets({ dayId, workoutId, sets = [] }) {
  const { data: ex, error: exErr } = await supabase
    .from('sweatsheet_workout_exercises')
    .insert({ workout_day_id: dayId, exercise_id: workoutId })
    .select('id')
    .single()
  if (exErr) throw exErr

  const clean = sets
    .map(s => ({
      reps:   s.reps   === '' || s.reps   == null ? null : Number(s.reps),
      weight: s.weight === '' || s.weight == null ? null : Number(s.weight),
    }))
    .filter(s => s.reps !== null || s.weight !== null)
    .map((s, i) => ({ workout_exercise_id: ex.id, set_number: i + 1, ...s }))

  let inserted = []
  if (clean.length) {
    const { data, error } = await supabase
      .from('sweatsheet_workout_sets')
      .insert(clean)
      .select('set_number, reps, weight')
    if (error) throw error
    inserted = data ?? []
  }
  return { exerciseId: ex.id, sets: inserted }
}

// ── Add a single set to an existing exercise ────────────────
export async function addSet({ exerciseId, setNumber, reps, weight }) {
  const { data, error } = await supabase
    .from('sweatsheet_workout_sets')
    .insert({
      workout_exercise_id: exerciseId,
      set_number: setNumber,
      reps:   reps   === '' || reps   == null ? null : Number(reps),
      weight: weight === '' || weight == null ? null : Number(weight),
    })
    .select('set_number, reps, weight')
    .single()

  if (error) throw error
  return data
}
