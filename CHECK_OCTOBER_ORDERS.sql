-- =============================================================================
-- CHECK ORDERS IN OCTOBER
-- =============================================================================
-- This script checks if there are any orders in October
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Check orders in October 2024
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
WHERE DATE_PART('month', created_at) = 10  -- October is month 10
    AND DATE_PART('year', created_at) = 2024
ORDER BY created_at ASC;

-- Summary count
SELECT 
    COUNT(*) as total_october_orders,
    COUNT(DISTINCT DATE(created_at)) as unique_dates,
    SUM(total_amount) as total_revenue,
    MIN(DATE(created_at)) as first_order_date,
    MAX(DATE(created_at)) as last_order_date
FROM orders
WHERE DATE_PART('month', created_at) = 10
    AND DATE_PART('year', created_at) = 2024;

-- Check if there are any orders before November 1, 2024
SELECT 
    COUNT(*) as orders_before_november,
    MIN(DATE(created_at)) as earliest_order_date,
    MAX(DATE(created_at)) as latest_order_before_november,
    SUM(total_amount) as total_revenue_before_november
FROM orders
WHERE created_at < '2024-11-01'::date;

-- List all orders before November 1, 2024 (if any exist)
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
WHERE created_at < '2024-11-01'::date
ORDER BY created_at ASC;

-- Check the very first order in the database
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
ORDER BY created_at ASC
LIMIT 1;

-- Check the date range of all orders
SELECT 
    MIN(DATE(created_at)) as earliest_order_date,
    MAX(DATE(created_at)) as latest_order_date,
    COUNT(*) as total_orders,
    COUNT(DISTINCT DATE(created_at)) as unique_order_dates
FROM orders;

