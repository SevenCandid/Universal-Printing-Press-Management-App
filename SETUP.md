# Universal Printing Press - Setup Guide

## 🚀 Quick Start

### 1. Environment Setup
Copy the environment file:
```bash
cp env.local.example .env.local
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
The application will automatically detect if the database tables don't exist and show a setup guide. Follow these steps:

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the SQL scripts in order:**

#### Step 1: Create Tables
```sql
-- Orders Table
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

-- Tasks Table
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

-- Staff Table
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

#### Step 2: Enable Row Level Security
```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff" ON staff FOR ALL USING (true);
```

#### Step 3: Enable Realtime
```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
```

#### Step 4: Insert Sample Data
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

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Application
Navigate to [http://localhost:3000](http://localhost:3000) (or the port shown in terminal)

## 🎯 Features

### Orders Management
- ✅ Real-time order updates
- ✅ Staff assignment with searchable modal
- ✅ Status tracking and visual indicators
- ✅ Order-to-task linking

### Tasks Management
- ✅ Role-based task visibility
- ✅ Interactive status updates
- ✅ Priority and due date tracking
- ✅ Smart status transitions

### Staff Assignment
- ✅ Searchable staff selection
- ✅ Real-time staff data
- ✅ Automatic task creation
- ✅ Task reassignment

### Role-based Access
- ✅ CEO/Manager: Full access
- ✅ Staff: Limited to assigned tasks
- ✅ Permission-based UI rendering

## 🔧 Troubleshooting

### Database Connection Issues
- Ensure Supabase credentials are correct in `.env.local`
- Check that all tables are created in the correct order
- Verify RLS policies are set up correctly

### Build Issues
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Restart development server

### Realtime Issues
- Check Supabase dashboard for realtime logs
- Verify tables are added to realtime publication
- Check browser console for connection errors

## 📱 Testing

1. **Dashboard**: Shows connection status and live data
2. **Orders Page**: Displays orders with assignment options
3. **Tasks Page**: Shows role-based task filtering
4. **Staff Assignment**: Test the assignment modal
5. **Real-time Updates**: Make changes in Supabase dashboard

## 🎨 Customization

### User Roles
Update `src/lib/auth.ts` to change current user role:
```typescript
export const getCurrentUser = (): User => {
  return {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@universalprinting.com',
    role: 'ceo', // Change to 'manager' or 'staff' to test different roles
    department: 'Management'
  }
}
```

### Branding
- Update logo files in `public/assets/logo/`
- Modify colors in `tailwind.config.js`
- Update company name in components

## 📚 Documentation

- [Database Setup Guide](database-setup.md)
- [API Documentation](docs/api.md)
- [Component Documentation](docs/components.md)














