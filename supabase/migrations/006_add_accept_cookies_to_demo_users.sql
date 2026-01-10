-- Add accept_cookies column to demo_users table for GDPR compliance
-- This column stores whether the user consented to cookies during the demo wizard

ALTER TABLE demo_users
ADD COLUMN IF NOT EXISTS accept_cookies BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN demo_users.accept_cookies IS 'GDPR compliance: Stores whether the user consented to cookies during the demonstration wizard. Defaults to false if not provided.';

-- Create index for filtering users who accepted cookies (useful for marketing campaigns)
CREATE INDEX IF NOT EXISTS idx_demo_users_accept_cookies ON demo_users(accept_cookies) WHERE accept_cookies = true;
