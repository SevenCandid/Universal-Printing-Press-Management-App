-- =====================================================
-- ATTENDANCE BREAKS & LEAVE REQUESTS SETUP
-- =====================================================
-- This script adds break tracking and leave request features
-- Run this in Supabase SQL Editor after the main attendance setup

-- =====================================================
-- 1. CREATE BREAKS TABLE
-- =====================================================
-- Track breaks separately from daily check-in/check-out

CREATE TABLE IF NOT EXISTS public.breaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    break_end TIMESTAMPTZ,
    break_duration INTEGER, -- in minutes, calculated when break ends
    break_type VARCHAR(50) DEFAULT 'regular', -- regular, lunch, personal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON public.breaks(attendance_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_id ON public.breaks(user_id);
CREATE INDEX IF NOT EXISTS idx_breaks_created_at ON public.breaks(created_at DESC);

-- Add comment
COMMENT ON TABLE public.breaks IS 'Tracks employee breaks during work hours';

-- =====================================================
-- 2. CREATE LEAVE REQUESTS TABLE
-- =====================================================
-- Allow staff to request leave, holidays, or provide absence explanations

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('leave', 'holiday', 'sick_leave', 'excuse', 'personal', 'emergency')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewer_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure end_date is not before start_date
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON public.leave_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE public.leave_requests IS 'Employee leave and absence requests with approval workflow';

-- =====================================================
-- 3. ADD TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Breaks table trigger
CREATE OR REPLACE FUNCTION update_breaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS breaks_updated_at ON public.breaks;
CREATE TRIGGER breaks_updated_at
    BEFORE UPDATE ON public.breaks
    FOR EACH ROW
    EXECUTE FUNCTION update_breaks_updated_at();

-- Leave requests table trigger
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER leave_requests_updated_at
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_requests_updated_at();

-- =====================================================
-- 4. AUTO-CALCULATE BREAK DURATION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.break_end IS NOT NULL AND NEW.break_start IS NOT NULL THEN
        NEW.break_duration = EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_break_duration_trigger ON public.breaks;
CREATE TRIGGER calculate_break_duration_trigger
    BEFORE INSERT OR UPDATE ON public.breaks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_break_duration();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- ==================
-- BREAKS POLICIES
-- ==================

-- Staff can view their own breaks
DROP POLICY IF EXISTS "Users can view own breaks" ON public.breaks;
CREATE POLICY "Users can view own breaks"
    ON public.breaks FOR SELECT
    USING (auth.uid() = user_id);

-- Staff can insert their own breaks
DROP POLICY IF EXISTS "Users can create own breaks" ON public.breaks;
CREATE POLICY "Users can create own breaks"
    ON public.breaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Staff can update their own breaks (only to end them)
DROP POLICY IF EXISTS "Users can update own breaks" ON public.breaks;
CREATE POLICY "Users can update own breaks"
    ON public.breaks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Managers/CEO can view all breaks
DROP POLICY IF EXISTS "Managers can view all breaks" ON public.breaks;
CREATE POLICY "Managers can view all breaks"
    ON public.breaks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
        )
    );

-- ==================
-- LEAVE REQUESTS POLICIES
-- ==================

-- Staff can view their own leave requests
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Users can view own leave requests"
    ON public.leave_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Staff can create their own leave requests
DROP POLICY IF EXISTS "Users can create own leave requests" ON public.leave_requests;
CREATE POLICY "Users can create own leave requests"
    ON public.leave_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Staff can update their own pending requests (cancel)
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON public.leave_requests;
CREATE POLICY "Users can update own pending leave requests"
    ON public.leave_requests FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

-- CEO/Managers can view all leave requests
DROP POLICY IF EXISTS "Managers can view all leave requests" ON public.leave_requests;
CREATE POLICY "Managers can view all leave requests"
    ON public.leave_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
        )
    );

-- CEO/Managers can approve/reject leave requests
DROP POLICY IF EXISTS "Managers can manage leave requests" ON public.leave_requests;
CREATE POLICY "Managers can manage leave requests"
    ON public.leave_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
        )
    );

-- =====================================================
-- 6. CREATE HELPFUL VIEWS
-- =====================================================

-- View: Active breaks (not ended yet)
CREATE OR REPLACE VIEW active_breaks AS
SELECT 
    b.*,
    p.name as user_name,
    p.email as user_email,
    a.check_in as attendance_check_in
FROM breaks b
JOIN profiles p ON b.user_id = p.id
JOIN attendance a ON b.attendance_id = a.id
WHERE b.break_end IS NULL
ORDER BY b.break_start DESC;

-- View: Leave requests with user details
CREATE OR REPLACE VIEW leave_requests_detailed AS
SELECT 
    lr.*,
    p.name as requester_name,
    p.email as requester_email,
    p.role as requester_role,
    reviewer.name as reviewer_name,
    (lr.end_date - lr.start_date + 1) as days_requested
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
LEFT JOIN profiles reviewer ON lr.reviewed_by = reviewer.id
ORDER BY lr.created_at DESC;

-- View: Pending leave requests (for management)
CREATE OR REPLACE VIEW pending_leave_requests AS
SELECT *
FROM leave_requests_detailed
WHERE status = 'pending'
ORDER BY created_at ASC;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.breaks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;

-- Grant access to views
GRANT SELECT ON active_breaks TO authenticated;
GRANT SELECT ON leave_requests_detailed TO authenticated;
GRANT SELECT ON pending_leave_requests TO authenticated;

-- =====================================================
-- 8. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment below to add sample leave request types documentation
/*
INSERT INTO public.leave_requests (user_id, request_type, start_date, end_date, reason, status)
VALUES 
    (auth.uid(), 'holiday', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '14 days', 'Family vacation', 'pending'),
    (auth.uid(), 'sick_leave', CURRENT_DATE, CURRENT_DATE, 'Not feeling well', 'pending');
*/

-- =====================================================
-- 9. NOTIFICATIONS (Optional Enhancement)
-- =====================================================

-- Function to notify CEO of new leave requests
CREATE OR REPLACE FUNCTION notify_leave_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for CEO/Managers
    -- Note: Using 'read' column (not 'is_read')
    INSERT INTO public.notifications (user_id, title, message, link, type, read)
    SELECT 
        id,
        'New Leave Request',
        (SELECT name FROM profiles WHERE id = NEW.user_id) || ' has requested ' || NEW.request_type || ' from ' || NEW.start_date || ' to ' || NEW.end_date,
        '/ceo/attendance',
        'leave_request',
        false
    FROM profiles
    WHERE role IN ('ceo', 'manager', 'executive_assistant');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_request_notification ON public.leave_requests;
CREATE TRIGGER leave_request_notification
    AFTER INSERT ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_leave_request();

-- Function to notify user of leave request decision
CREATE OR REPLACE FUNCTION notify_leave_decision()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        -- Note: Using 'read' column (not 'is_read')
        INSERT INTO public.notifications (user_id, title, message, link, type, read)
        VALUES (
            NEW.user_id,
            'Leave Request ' || UPPER(NEW.status),
            'Your ' || NEW.request_type || ' request from ' || NEW.start_date || ' to ' || NEW.end_date || ' has been ' || NEW.status,
            '/staff/attendance',
            'leave_decision',
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_decision_notification ON public.leave_requests;
CREATE TRIGGER leave_decision_notification
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_leave_decision();

-- =====================================================
-- SETUP COMPLETE! ✅
-- =====================================================

-- Verify tables were created
SELECT 
    'breaks' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'breaks') as column_count
FROM breaks
UNION ALL
SELECT 
    'leave_requests' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'leave_requests') as column_count
FROM leave_requests;

-- Show RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('breaks', 'leave_requests')
ORDER BY tablename, policyname;

