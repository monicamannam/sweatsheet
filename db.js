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

// ── Workout logs ────────────────────────────────────────────
// PLACEHOLDER. I don't know your logged-workouts table yet, so
// this returns nothing and the page shows a clean empty state.
// To make it live: create your logs table in Supabase, then
// replace the body below with the commented query and adjust
// the table name + columns to match your schema.
export async function getWorkoutLogs() {
  return []   // <-- delete this line once your query below is ready

  /*
  const { data, error } = await supabase
    .from('sweatsheet_logs')                       // your logs table
    .select('*, sweatsheet_workouts(name)')        // join the exercise name
    .order('performed_at', { ascending: false })
  if (error) throw error
  return data ?? []
  */
}
