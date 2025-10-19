-- Add sample data to existing Universal Printing Press database
-- Run this in your Supabase SQL Editor

-- Insert sample staff (only if not already exists)
INSERT INTO staff (name, email, role, department) VALUES
('John Doe', 'john@universalprinting.com', 'ceo', 'Management'),
('Jane Smith', 'jane@universalprinting.com', 'manager', 'Operations'),
('Mike Johnson', 'mike@universalprinting.com', 'staff', 'Printing'),
('Sarah Wilson', 'sarah@universalprinting.com', 'staff', 'Design')
ON CONFLICT (email) DO NOTHING;

-- Insert sample orders (only if not already exists)
INSERT INTO orders (customer_name, total_amount, description, status) VALUES
('ABC Corporation', 2500.00, 'Business cards and letterheads', 'pending'),
('XYZ Ltd', 1200.00, 'Brochures and flyers', 'in_progress'),
('DEF Inc', 3100.00, 'Annual report printing', 'completed'),
('GHI Company', 1800.00, 'Marketing materials', 'pending'),
('JKL Enterprises', 3200.00, 'Product catalogs', 'in_progress')
ON CONFLICT DO NOTHING;

-- Insert sample tasks (only if not already exists)
INSERT INTO tasks (title, description, assigned_to, order_id, status, priority) VALUES
('Print business cards', 'Design and print 1000 business cards', 'mike@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'ABC Corporation' LIMIT 1), 'pending', 'high'),
('Design brochure', 'Create marketing brochure layout', 'sarah@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'XYZ Ltd' LIMIT 1), 'in_progress', 'medium'),
('Print annual report', 'Print and bind 500 annual reports', 'mike@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'DEF Inc' LIMIT 1), 'completed', 'high'),
('Create marketing materials', 'Design flyers and posters', 'sarah@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'GHI Company' LIMIT 1), 'pending', 'medium'),
('Print product catalogs', 'Print 1000 product catalogs', 'mike@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'JKL Enterprises' LIMIT 1), 'in_progress', 'low')
ON CONFLICT DO NOTHING;

-- Verify data was inserted
SELECT 'Staff count:' as info, COUNT(*) as count FROM staff
UNION ALL
SELECT 'Orders count:', COUNT(*) FROM orders
UNION ALL
SELECT 'Tasks count:', COUNT(*) FROM tasks;
