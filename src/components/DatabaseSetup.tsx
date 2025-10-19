'use client'

import { useState } from 'react'
import { DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function DatabaseSetup() {
  const [copied, setCopied] = useState<string | null>(null)
  const [checkingData, setCheckingData] = useState(false)
  const [hasData, setHasData] = useState<boolean | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const checkForData = async () => {
    setCheckingData(true)
    try {
      // This would be called from the parent component to check if data exists
      // For now, we'll assume data exists if tables exist
      setHasData(true)
    } catch (error) {
      setHasData(false)
    } finally {
      setCheckingData(false)
    }
  }

  const sqlScripts = [
    {
      id: 'orders',
      title: 'Orders Table',
      description: 'Create the orders table for managing customer orders',
      sql: `CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
    },
    {
      id: 'tasks',
      title: 'Tasks Table',
      description: 'Create the tasks table for managing work assignments',
      sql: `CREATE TABLE tasks (
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
);`
    },
    {
      id: 'staff',
      title: 'Staff Table',
      description: 'Create the staff table for managing team members',
      sql: `CREATE TABLE staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('ceo', 'manager', 'staff')),
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
    },
    {
      id: 'rls',
      title: 'Row Level Security',
      description: 'Enable RLS and create policies',
      sql: `-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on staff" ON staff FOR ALL USING (true);`
    },
    {
      id: 'realtime',
      title: 'Realtime Configuration',
      description: 'Enable realtime for all tables',
      sql: `-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;`
    },
    {
      id: 'sample',
      title: 'Sample Data',
      description: 'Insert sample data for testing',
      sql: `-- Insert sample staff
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
('Design brochure', 'Create marketing brochure layout', 'sarah@universalprinting.com', (SELECT id FROM orders WHERE customer_name = 'XYZ Ltd'), 'in_progress', 'medium');`
    }
  ]

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <div className="flex items-center space-x-2 mb-4">
        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-foreground">Database Setup Required</h2>
      </div>
      
      <p className="text-muted-foreground mb-6">
        The database tables don't exist yet. Please run the following SQL scripts in your Supabase SQL editor to set up the required tables.
      </p>

      <div className="space-y-4">
        {sqlScripts.map((script) => (
          <div key={script.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground">{script.title}</h3>
                <p className="text-sm text-muted-foreground">{script.description}</p>
              </div>
              <button
                onClick={() => copyToClipboard(script.sql, script.id)}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {copied === script.id ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              <code>{script.sql}</code>
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">📋 Setup Instructions</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Go to your Supabase dashboard</li>
          <li>2. Navigate to the SQL Editor</li>
          <li>3. Copy and paste each SQL script above</li>
          <li>4. Run them in order (tables first, then RLS, then realtime, then sample data)</li>
          <li>5. Refresh this page to see the data</li>
        </ol>
      </div>
    </div>
  )
}
