# Database Setup Guide

## Required Tables

Run these SQL commands in your Supabase SQL editor to create the necessary tables:

### 1. Orders Table
```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Tasks Table
```sql
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Staff Table
```sql
CREATE TABLE staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('ceo', 'manager', 'staff')),
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff" ON staff FOR ALL USING (true);
```

## Realtime Configuration

Enable realtime for all tables:

```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
```

## Sample Data

Insert some sample data to test the application:

```sql
-- Insert sample staff
INSERT INTO staff (name, email, role, department) VALUES
('John Doe', 'john@universalprinting.com', 'ceo', 'Management'),
('Jane Smith', 'jane@universalprinting.com', 'manager', 'Operations'),
('Mike Johnson', 'mike@universalprinting.com', 'staff', 'Printing'),
('Sarah Wilson', 'sarah@universalprinting.com', 'staff', 'Design');

-- Insert sample orders
INSERT INTO orders (customer_name, total_amount, description, status) VALUES
('ABC Corporation', 2500.00, 'Business cards and letterheads', 'pending'),
('XYZ Ltd', 1200.00, 'Brochures and flyers', 'in_progress'),
('DEF Inc', 3100.00, 'Annual report printing', 'completed');

-- Insert sample tasks
INSERT INTO tasks (title, description, assigned_to, order_id, status, priority) VALUES
('Print business cards', 'Design and print 1000 business cards', 'mike@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'ABC Corporation'), 'pending', 'high'),
('Design brochure', 'Create marketing brochure layout', 'sarah@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'XYZ Ltd'), 'in_progress', 'medium');
```

## Testing the Application

1. Start the development server: `npm run dev`
2. Navigate to the dashboard to see the Supabase connection test
3. Go to Orders page to see real-time order updates
4. Go to Tasks page to see role-based task filtering
5. Test staff assignment by clicking "Assign" on orders
6. Test task status updates by clicking status buttons
7. Check browser console for real-time event logs

## Role Testing

To test different user roles, update the `getCurrentUser()` function in `src/lib/auth.ts`:

- Change `role: 'ceo'` to see all tasks and orders
- Change `role: 'manager'` to see all tasks but limited permissions
- Change `role: 'staff'` to see only assigned tasks














