-- =============================================================================
-- DELETE OCTOBER ORDERS - SIMPLE VERSION
-- =============================================================================
-- This will delete all orders created before November 1st (regardless of year)
-- Make sure you've reviewed what will be deleted first!
-- =============================================================================

-- STEP 1: See what will be deleted (RUN THIS FIRST!)
SELECT 
    COUNT(*) as orders_to_delete,
    MIN(DATE(created_at)) as earliest_date,
    MAX(DATE(created_at)) as latest_date,
    SUM(total_amount) as total_revenue
FROM orders
WHERE created_at < '2025-11-01'::date;

-- List the orders that will be deleted
SELECT 
    id,
    order_number,
    customer_name,
    total_amount,
    created_at,
    DATE(created_at) as order_date
FROM orders
WHERE created_at < '2025-11-01'::date
ORDER BY created_at ASC;

-- =============================================================================
-- STEP 2: DELETE ALL ORDERS BEFORE NOVEMBER 1st
-- =============================================================================
-- ⚠️ UNCOMMENT THE LINE BELOW TO ACTUALLY DELETE ⚠️
-- ⚠️ MAKE SURE YOU'VE REVIEWED STEP 1 FIRST ⚠️

-- DELETE FROM orders
-- WHERE created_at < '2025-11-01'::date;

-- =============================================================================
-- STEP 3: VERIFY DELETION (Run after deleting)
-- =============================================================================
-- After running the DELETE, verify with these queries:

-- Should return 0
SELECT 
    COUNT(*) as remaining_october_orders
FROM orders
WHERE created_at < '2025-11-01'::date;

-- Should show November 1st or later as earliest date
SELECT 
    COUNT(*) as total_orders,
    MIN(DATE(created_at)) as earliest_order_date,
    MAX(DATE(created_at)) as latest_order_date
FROM orders;

