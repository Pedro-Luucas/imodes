-- Expose PGMQ functions via PostgREST
-- This creates wrapper functions in a public schema that can be called via Supabase RPC
-- 
-- IMPORTANT: Run this migration AFTER installing PGMQ and creating the queues
-- (after migration 001_enable_pgmq.sql)

-- Expose PGMQ functions in public schema for PostgREST access
-- Note: Functions are created in public schema for easier RPC access

-- Drop existing functions if they exist (to allow re-running this migration)
DROP FUNCTION IF EXISTS public.pgmq_send(text, jsonb, integer);
DROP FUNCTION IF EXISTS public.pgmq_send_batch(text, jsonb[]);
DROP FUNCTION IF EXISTS public.pgmq_read(text, integer, integer);
DROP FUNCTION IF EXISTS public.pgmq_pop(text);
DROP FUNCTION IF EXISTS public.pgmq_archive(text, bigint);
DROP FUNCTION IF EXISTS public.pgmq_archive_batch(text, bigint[]);
DROP FUNCTION IF EXISTS public.pgmq_delete(text, bigint);

-- Function wrapper for send
CREATE OR REPLACE FUNCTION public.pgmq_send(
  queue_name text,
  msg jsonb,
  delay integer DEFAULT 0
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.send(queue_name, msg, delay);
END;
$$;

-- Function wrapper for send_batch
CREATE OR REPLACE FUNCTION public.pgmq_send_batch(
  queue_name text,
  msgs jsonb[]
)
RETURNS bigint[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.send_batch(queue_name, msgs);
END;
$$;

-- Function wrapper for read
-- Using explicit column selection to ensure correct structure
CREATE OR REPLACE FUNCTION public.pgmq_read(
  queue_name text,
  vt_timeout integer DEFAULT 30,
  qty integer DEFAULT 1
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.read_ct,
    m.enqueued_at,
    m.vt,
    m.message,
    NULL::jsonb as headers
  FROM pgmq.read(queue_name, vt_timeout, qty) AS m;
END;
$$;

-- Function wrapper for pop
-- Using explicit column selection to ensure correct structure
CREATE OR REPLACE FUNCTION public.pgmq_pop(
  queue_name text
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.read_ct,
    m.enqueued_at,
    m.vt,
    m.message,
    NULL::jsonb as headers
  FROM pgmq.pop(queue_name) AS m;
END;
$$;

-- Function wrapper for archive (single message)
CREATE OR REPLACE FUNCTION public.pgmq_archive(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.archive(queue_name, msg_id);
END;
$$;

-- Function wrapper for archive (multiple messages)
-- Note: PGMQ archive with msg_ids returns bigint[], not boolean
CREATE OR REPLACE FUNCTION public.pgmq_archive_batch(
  queue_name text,
  msg_ids bigint[]
)
RETURNS bigint[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.archive(queue_name, msg_ids);
END;
$$;

-- Function wrapper for delete
CREATE OR REPLACE FUNCTION public.pgmq_delete(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, msg_id);
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.pgmq_send TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_send_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_pop TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_archive TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_archive_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_delete TO authenticated;

-- Also grant to service_role (for server-side operations)
GRANT EXECUTE ON FUNCTION public.pgmq_send TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_send_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_read TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_pop TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_archive TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_archive_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_delete TO service_role;

-- Add comments
COMMENT ON FUNCTION public.pgmq_send IS 'Send a message to a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_send_batch IS 'Send multiple messages to a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_read IS 'Read messages from a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_pop IS 'Pop (read and delete) a message from a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_archive IS 'Archive a message from a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_archive_batch IS 'Archive multiple messages from a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_delete IS 'Delete a message from a PGMQ queue';
