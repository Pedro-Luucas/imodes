-- Create optimized function to get therapist patients in a single query
-- This eliminates the need for multiple round trips and significantly improves performance

CREATE OR REPLACE FUNCTION get_therapist_patients(p_therapist_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  full_name TEXT,
  first_name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_active BOOLEAN,
  subscription_active BOOLEAN,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.role,
    p.full_name,
    p.first_name,
    p.email,
    p.avatar_url,
    p.is_active,
    p.subscription_active,
    p.settings,
    p.created_at,
    p.updated_at
  FROM profiles p
  INNER JOIN patients pt ON pt.id = p.id
  WHERE pt.therapist_id = p_therapist_id
    AND p.role = 'patient'
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_therapist_patients(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_therapist_patients(UUID) IS 
'Optimized function to fetch all patients assigned to a therapist in a single query with JOIN. Returns patient profiles ordered by creation date.';
