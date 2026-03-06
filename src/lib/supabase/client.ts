import { createBrowserClient } from '@supabase/ssr'

/**
 * Singleton Supabase Browser Client
 * 
 * Performance impact for 100+ connections:
 * Without singleton: Each component calling createClient() creates a NEW
 * GoTrue client, a NEW Realtime websocket, and a NEW PostgREST connection.
 * With 10 components per page × 100 users = 1000 Supabase connections!
 * 
 * With singleton: 1 client per browser tab, reused across all components.
 * 100 users = 100 connections. Clean.
 */
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )

  return client
}
