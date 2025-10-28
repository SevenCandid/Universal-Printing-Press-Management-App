-- ============================================================================
-- Email Triggers for Universal Printing Press
-- ============================================================================
-- These triggers send automated email alerts for key events
-- Requires: Supabase Edge Function 'sendEmail' deployed
-- Alternative: Use client-side email sending with Resend API
-- ============================================================================

-- 1️⃣ CREATE FUNCTION TO SEND EMAIL VIA EDGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION send_email_notification(
  p_to TEXT[],
  p_subject TEXT,
  p_message TEXT,
  p_title TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_response TEXT;
BEGIN
  -- Get Supabase project URL
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sendEmail';
  
  -- Call Edge Function (using pg_net extension)
  -- Note: Requires pg_net extension to be enabled
  -- Enable with: CREATE EXTENSION IF NOT EXISTS pg_net;
  
  -- This is a placeholder - actual implementation depends on your setup
  -- You may need to use http extension or call from client-side
  
  RAISE NOTICE 'Email would be sent to % with subject: %', array_to_string(p_to, ','), p_subject;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email: %', SQLERRM;
END;
$$;

-- ============================================================================

-- 2️⃣ TRIGGER FUNCTION: Send email when new order is created
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_email_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ceo_manager_emails TEXT[];
  v_app_url TEXT;
BEGIN
  -- Get CEO and Manager emails
  SELECT array_agg(email)
  INTO v_ceo_manager_emails
  FROM profiles
  WHERE role IN ('ceo', 'manager')
    AND email IS NOT NULL;

  -- Get application URL (set this in your database settings)
  v_app_url := current_setting('app.settings.app_url', true);
  IF v_app_url IS NULL THEN
    v_app_url := 'http://localhost:3000';
  END IF;

  -- Send email if we have recipients
  IF array_length(v_ceo_manager_emails, 1) > 0 THEN
    PERFORM send_email_notification(
      v_ceo_manager_emails,
      '🧾 New Order Created - #' || NEW.order_number,
      'A new order has been created:

Customer: ' || NEW.customer_name || '
Order Number: ' || NEW.order_number || '
Amount: ₵' || COALESCE(NEW.total_amount::TEXT, '0.00') || '
Status: ' || COALESCE(NEW.order_status, 'Pending') || '

Click the button below to view the order in your dashboard.',
      '🧾 New Order Created',
      v_app_url || '/orders'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS email_on_new_order ON orders;
CREATE TRIGGER email_on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_on_new_order();

-- ============================================================================

-- 3️⃣ TRIGGER FUNCTION: Send email when task is assigned
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_email_on_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigned_email TEXT;
  v_app_url TEXT;
BEGIN
  -- Get assigned user's email
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT email
    INTO v_assigned_email
    FROM profiles
    WHERE id = NEW.assigned_to;

    -- Get application URL
    v_app_url := current_setting('app.settings.app_url', true);
    IF v_app_url IS NULL THEN
      v_app_url := 'http://localhost:3000';
    END IF;

    -- Send email if we have recipient
    IF v_assigned_email IS NOT NULL THEN
      PERFORM send_email_notification(
        ARRAY[v_assigned_email],
        '✅ New Task Assigned',
        'You have been assigned a new task:

Title: ' || COALESCE(NEW.title, 'Untitled Task') || '
Description: ' || COALESCE(NEW.description, 'No description') || '
Status: ' || COALESCE(NEW.status, 'Pending') || '

Click the button below to view the task in your dashboard.',
        '✅ New Task Assigned',
        v_app_url || '/tasks'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (only if tasks table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP TRIGGER IF EXISTS email_on_task_assigned ON tasks;
    CREATE TRIGGER email_on_task_assigned
      AFTER INSERT ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION trigger_email_on_task_assigned();
  END IF;
END $$;

-- ============================================================================

-- 4️⃣ SET APPLICATION URL (Required for email links)
-- ============================================================================

-- Set your application URL
-- Replace with your actual domain in production
ALTER DATABASE postgres SET app.settings.app_url = 'http://localhost:3000';

-- For production, use:
-- ALTER DATABASE postgres SET app.settings.app_url = 'https://yourapp.com';

-- ============================================================================

-- 5️⃣ TESTING
-- ============================================================================

-- Test email function (won't actually send without Edge Function deployed)
-- SELECT send_email_notification(
--   ARRAY['test@example.com'],
--   'Test Subject',
--   'Test message body',
--   'Test Title',
--   'https://example.com'
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- For actual email sending, you have TWO options:
--
-- OPTION 1: Edge Functions (Recommended for production)
--   - Deploy the Edge Function: supabase functions deploy sendEmail
--   - Set RESEND_API_KEY in Supabase dashboard secrets
--   - Triggers will call the Edge Function automatically
--
-- OPTION 2: Client-side (Simpler for development)
--   - Use the sendEmail helper in src/lib/sendEmail.ts
--   - Call it directly after order/task creation
--   - Requires RESEND_API_KEY in .env.local
--
-- The triggers above log notifications to help you debug
-- They won't actually send emails until you:
--   1. Deploy the Edge Function, OR
--   2. Implement client-side sending in your components
--
-- ============================================================================

