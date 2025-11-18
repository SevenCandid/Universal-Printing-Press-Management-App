-- Create manual_clients table for storing manually added client contacts
-- Run this in your Supabase SQL Editor

-- Create the manual_clients table
CREATE TABLE IF NOT EXISTS manual_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT, -- Optional notes about the client
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_clients_email ON manual_clients(email);
CREATE INDEX IF NOT EXISTS idx_manual_clients_created_at ON manual_clients(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE manual_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all manual clients
CREATE POLICY "Allow authenticated users to read manual_clients"
  ON manual_clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert manual clients
CREATE POLICY "Allow authenticated users to insert manual_clients"
  ON manual_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update manual clients
CREATE POLICY "Allow authenticated users to update manual_clients"
  ON manual_clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete manual clients
CREATE POLICY "Allow authenticated users to delete manual_clients"
  ON manual_clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment to table
COMMENT ON TABLE manual_clients IS 'Stores manually added client contacts for greetings system';
COMMENT ON COLUMN manual_clients.email IS 'Client email address (must be unique)';
COMMENT ON COLUMN manual_clients.phone IS 'Client phone number';


