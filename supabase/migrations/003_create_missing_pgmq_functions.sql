-- Create missing PGMQ wrapper functions
-- This migration creates the functions that may have failed in the previous migration

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

-- Function wrapper for pop
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

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.pgmq_send_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_pop TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_archive_batch TO authenticated;

-- Also grant to service_role (for server-side operations)
GRANT EXECUTE ON FUNCTION public.pgmq_send_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_pop TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_archive_batch TO service_role;

-- Add comments
COMMENT ON FUNCTION public.pgmq_send_batch IS 'Send multiple messages to a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_pop IS 'Pop (read and delete) a message from a PGMQ queue';
COMMENT ON FUNCTION public.pgmq_archive_batch IS 'Archive multiple messages from a PGMQ queue';
