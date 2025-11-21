-- =============================================================================
-- DELETE OCTOBER ORDERS FROM DATABASE
-- =============================================================================
-- This script will DELETE all orders created in October 2024
-- Make sure you have a backup before running this!
-- =============================================================================

-- ⚠️ WARNING: This will permanently delete all October orders ⚠️
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT ⚠️

-- =============================================================================
-- STEP 1: VERIFICATION - See what will be deleted
-- =============================================================================

-- Count October 2024 orders
SELECT 
    COUNT(*) as total_october_orders,
    SUM(total_amount) as total_revenue,
    MIN(DATE(created_at)) as earliest_order_date,
    MAX(DATE(created_at)) as latest_order_date
FROM orders
WHERE DATE_PART('month', created_at) = 10  -- October is month 10
    AND DATE_PART('year', created_at) = 2024;

-- List all October 2024 orders that will be deleted
SELECT 
    id,
    order_number,
    customer_name,
    total_amount,
    payment_method,
    payment_status,
    order_status,
    created_at,
    DATE(created_at) as order_date
FROM orders
WHERE DATE_PART('month', created_at) = 10
    AND DATE_PART('year', created_at) = 2024
ORDER BY created_at ASC;

-- =============================================================================
-- STEP 2: CHECK FOR RELATED DATA (Tasks, Files, etc.)
-- =============================================================================

-- Check if any tasks are linked to October orders
SELECT 
    t.id as task_id,
    t.title,
    t.status,
    o.order_number,
    o.customer_name,
    o.created_at as order_date
FROM tasks t
INNER JOIN orders o ON t.order_id = o.id
WHERE DATE_PART('month', o.created_at) = 10
    AND DATE_PART('year', o.created_at) = 2024;

-- Check if any files are linked to October orders (only if order_files table exists)
-- Uncomment the following if you have an order_files table:
-- SELECT 
--     COUNT(*) as files_linked_to_october_orders
-- FROM order_files of
-- INNER JOIN orders o ON of.order_id = o.id
-- WHERE DATE_PART('month', o.created_at) = 10
--     AND DATE_PART('year', o.created_at) = 2024;

-- =============================================================================
-- STEP 3: BACKUP (Optional - Export before deleting)
-- =============================================================================

-- Uncomment the lines below to create a backup table before deletion
-- CREATE TABLE orders_backup_october_2024 AS
-- SELECT * FROM orders
-- WHERE DATE_PART('month', created_at) = 10
--     AND DATE_PART('year', created_at) = 2024;

-- =============================================================================
-- STEP 4: DELETE OCTOBER ORDERS
-- =============================================================================
-- ⚠️ UNCOMMENT THE LINES BELOW TO ACTUALLY DELETE ⚠️
-- ⚠️ MAKE SURE YOU'VE REVIEWED STEP 1 AND OPTIONALLY STEP 3 FIRST ⚠️

-- Option A: Delete orders created in October 2024
-- DELETE FROM orders
-- WHERE DATE_PART('month', created_at) = 10
--     AND DATE_PART('year', created_at) = 2024;

-- Option B: Delete orders before November 1, 2024 (safer - catches any before tracking start)
-- DELETE FROM orders
-- WHERE created_at < '2024-11-01'::date;

-- =============================================================================
-- STEP 5: VERIFICATION AFTER DELETION
-- =============================================================================
-- Run these after deletion to verify:

-- Check that no October orders remain
SELECT 
    COUNT(*) as remaining_october_orders
FROM orders
WHERE DATE_PART('month', created_at) = 10
    AND DATE_PART('year', created_at) = 2024;
-- Should return 0

-- Check total orders count
SELECT 
    COUNT(*) as total_orders,
    MIN(DATE(created_at)) as earliest_order_date,
    MAX(DATE(created_at)) as latest_order_date
FROM orders;
-- Earliest should be November 1, 2024 or later

-- =============================================================================
-- RECOVERY (If you need to restore from backup)
-- =============================================================================
-- If you created a backup table and need to restore:

-- INSERT INTO orders
-- SELECT * FROM orders_backup_october_2024;

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. This script deletes orders from October 2024 only
-- 2. Related tasks with order_id foreign keys should be handled
--    (they may cascade delete or need manual cleanup)
-- 3. Related files in order_files table should be checked
-- 4. Make sure you've reviewed all the data in STEP 1 before deleting
-- 5. Consider creating the backup table (STEP 3) before deletion
-- 6. After deletion, verify with STEP 5 queries

