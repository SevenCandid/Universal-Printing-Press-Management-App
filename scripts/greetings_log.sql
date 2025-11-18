-- Create greetings_log table for tracking all sent greetings
-- Run this in your Supabase SQL Editor
--
-- Location: scripts/greetings_log.sql
-- Also available at: CREATE_GREETINGS_LOG_TABLE.sql (root directory)

-- Create the greetings_log table
CREATE TABLE IF NOT EXISTS greetings_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'whatsapp')),
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL, -- email for email type, phone for SMS/WhatsApp type
  message_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('success', 'failed')),
  error_message TEXT, -- Only populated if delivery_status is 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) -- Track who sent the greeting
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_greetings_log_created_at ON greetings_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_greetings_log_message_type ON greetings_log(message_type);
CREATE INDEX IF NOT EXISTS idx_greetings_log_delivery_status ON greetings_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_greetings_log_type_status ON greetings_log(message_type, delivery_status);

-- Enable Row Level Security (RLS)
ALTER TABLE greetings_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all logs
CREATE POLICY "Allow authenticated users to read greetings_log"
  ON greetings_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated users to insert greetings_log"
  ON greetings_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update logs (for status updates)
CREATE POLICY "Allow authenticated users to update greetings_log"
  ON greetings_log
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE greetings_log IS 'Stores logs of all greeting messages (email, SMS, and WhatsApp) sent to clients';
COMMENT ON COLUMN greetings_log.message_type IS 'Type of message: email, sms, or whatsapp';
COMMENT ON COLUMN greetings_log.client_contact IS 'Email address for email type, phone number for SMS/WhatsApp type';
COMMENT ON COLUMN greetings_log.delivery_status IS 'Status of delivery: success or failed';

-- If the table already exists, run this to add WhatsApp support:
-- ALTER TABLE greetings_log DROP CONSTRAINT IF EXISTS greetings_log_message_type_check;
-- ALTER TABLE greetings_log ADD CONSTRAINT greetings_log_message_type_check 
--   CHECK (message_type IN ('email', 'sms', 'whatsapp'));



