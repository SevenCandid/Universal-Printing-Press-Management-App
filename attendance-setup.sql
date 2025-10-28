-- ============================================================================
-- ATTENDANCE SYSTEM SETUP
-- ============================================================================
-- Smart attendance tracking with GPS/location verification
-- ============================================================================

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'checked_in',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Enable Row Level Security (RLS)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
CREATE POLICY "Users can view their own attendance" ON attendance
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance;
CREATE POLICY "Users can insert their own attendance" ON attendance
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attendance" ON attendance;
CREATE POLICY "Users can update their own attendance" ON attendance
    FOR UPDATE
    USING (auth.uid() = user_id);

-- CEO and Manager can view all attendance records
DROP POLICY IF EXISTS "CEO and Manager can view all attendance" ON attendance;
CREATE POLICY "CEO and Manager can view all attendance" ON attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'manager')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_updated_at ON attendance;
CREATE TRIGGER trigger_update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_updated_at();

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Attendance table created successfully!';
    RAISE NOTICE '✅ RLS policies enabled';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Triggers set up';
END $$;

-- Verify table structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

