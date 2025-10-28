-- ============================================================================
-- Fix Top Customers View - Column Order Issue
-- ============================================================================
-- This fixes the "cannot change name of view column" error
-- by dropping and recreating the view
-- ============================================================================

-- 1. Drop the existing view
DROP VIEW IF EXISTS top_customers CASCADE;

-- 2. Recreate with correct columns (without customer_email if it doesn't exist yet)
CREATE OR REPLACE VIEW top_customers AS
SELECT
  customer_name,
  customer_phone,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_name, customer_phone
ORDER BY total_spent DESC
LIMIT 10;

-- 3. Grant access
GRANT SELECT ON top_customers TO authenticated;

-- 4. Test the view
SELECT * FROM top_customers LIMIT 3;

-- ============================================================================
-- NOTES:
-- - If you want to add customer_email later, run this again after the column exists
-- - To add customer_email: First run setup-new-features-FIXED.sql (adds column)
-- - Then run the update below
-- ============================================================================

-- AFTER customer_email column exists, you can update to:
/*
DROP VIEW IF EXISTS top_customers CASCADE;

CREATE OR REPLACE VIEW top_customers AS
SELECT
  customer_name,
  customer_phone,
  customer_email,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_name, customer_phone, customer_email
ORDER BY total_spent DESC
LIMIT 10;

GRANT SELECT ON top_customers TO authenticated;
*/

