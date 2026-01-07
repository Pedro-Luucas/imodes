-- Enable PGMQ extension
-- This extension provides message queue functionality on PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues for canvas operations
-- canvas-autosave: Queue for canvas autosave operations
SELECT pgmq.create('canvas-autosave');

-- notifications: Queue for notification creation
SELECT pgmq.create('notifications');

-- canvas-checkpoints: Queue for checkpoint creation with screenshots
SELECT pgmq.create('canvas-checkpoints');

-- Note: RLS (Row Level Security) configuration for PostgREST exposure
-- should be done via Supabase Dashboard:
-- 1. Go to Database > Extensions
-- 2. Enable pgmq extension
-- 3. Go to Database > Replication > PostgREST
-- 4. Expose pgmq_public schema functions (send, send_batch, read, pop, archive, delete)
-- 5. Configure RLS policies for the queues to prevent anonymous access

-- Example RLS policies (to be applied via Supabase Dashboard or SQL Editor):
-- 
-- For canvas-autosave queue:
-- CREATE POLICY "Authenticated users can send to canvas-autosave"
--   ON pgmq.q_canvas_autosave FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
--
-- For notifications queue:
-- CREATE POLICY "Authenticated users can send to notifications"
--   ON pgmq.q_notifications FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
--
-- For canvas-checkpoints queue:
-- CREATE POLICY "Authenticated users can send to canvas-checkpoints"
--   ON pgmq.q_canvas_checkpoints FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
