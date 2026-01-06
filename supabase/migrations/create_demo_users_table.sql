-- Create demo_users table for storing demonstration leads
-- This table stores data collected from the demo wizard for future marketing/email campaigns

CREATE TABLE IF NOT EXISTS demo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('therapist', 'patient', 'student', 'professor')),
  session_id TEXT, -- Temporary session ID (starts with "demo-"), not a real DB session
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional fields for future use
  contacted BOOLEAN DEFAULT FALSE,
  converted BOOLEAN DEFAULT FALSE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_demo_users_email ON demo_users(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_demo_users_created_at ON demo_users(created_at DESC);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_demo_users_role ON demo_users(role);

-- Create index on session_id for joining with sessions
CREATE INDEX IF NOT EXISTS idx_demo_users_session_id ON demo_users(session_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_demo_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_users_updated_at
  BEFORE UPDATE ON demo_users
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_users_updated_at();

-- Add comment
COMMENT ON TABLE demo_users IS 'Stores demonstration leads collected from the demo wizard. Used for marketing and email campaigns.';
