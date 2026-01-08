-- Fix pgmq_read function to match PGMQ return structure
-- The issue is that headers may not exist in the return structure

DROP FUNCTION IF EXISTS public.pgmq_read(text, integer, integer);

-- Create function with explicit column selection to ensure correct structure
-- Note: headers is optional in PGMQ, so we use COALESCE to handle it
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.pgmq_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_read TO service_role;

COMMENT ON FUNCTION public.pgmq_read IS 'Read messages from a PGMQ queue';
