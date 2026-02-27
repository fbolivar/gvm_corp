-- Fix: support_tickets.assigned_to must FK to public.profiles (not auth.users)
-- PostgREST can only resolve joins within the public schema.
-- profiles.id === auth.users.id, so semantically identical, but PostgREST needs public.profiles

-- Drop the FK to auth.users if it exists
ALTER TABLE support_tickets
    DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;

-- Add FK to public.profiles instead
ALTER TABLE support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_profiles_fkey
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
