# Universal Printing Press - New Features Setup

This document contains setup instructions for the three new features integrated into the UPP system.

---

## 🎯 Feature Overview

1. **Top Customers** - View leaderboard of top 10 customers by revenue
2. **File Storage System** - Upload/download/delete files per order
3. **Real-Time Notifications** - Browser notifications + in-app notification dropdown

---

## 1️⃣ Top Customers Feature

### Database Setup

Create the `top_customers` view in your Supabase SQL editor:

```sql
-- Create view for top 10 customers by total spending
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

-- Grant access to authenticated users
GRANT SELECT ON top_customers TO authenticated;
```

### Component Integration

The `CustomersBase` component is already created at:
- `src/components/rolebase/CustomersBase.tsx`

### Role-Specific Pages

Create page files for each role (examples):

#### CEO Page
**File:** `src/app/ceo/customers/page.tsx`
```typescript
import CustomersBase from '@/components/rolebase/CustomersBase'

export default function CEOCustomersPage() {
  return <CustomersBase role="ceo" />
}
```

#### Manager Page
**File:** `src/app/manager/customers/page.tsx`
```typescript
import CustomersBase from '@/components/rolebase/CustomersBase'

export default function ManagerCustomersPage() {
  return <CustomersBase role="manager" />
}
```

#### Board Page
**File:** `src/app/board/customers/page.tsx`
```typescript
import CustomersBase from '@/components/rolebase/CustomersBase'

export default function BoardCustomersPage() {
  return <CustomersBase role="board" />
}
```

#### Staff Page
**File:** `src/app/staff/customers/page.tsx`
```typescript
import CustomersBase from '@/components/rolebase/CustomersBase'

export default function StaffCustomersPage() {
  return <CustomersBase role="staff" />
}
```

---

## 2️⃣ File Storage System

### Supabase Storage Setup

1. **Create Storage Bucket** in Supabase Dashboard:
   - Go to Storage section
   - Click "New bucket"
   - Name: `order-files`
   - Set as **Public** or **Private** (recommended: Private for security)
   - Click "Create bucket"

2. **Set Bucket Policies** (if using private bucket):

```sql
-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload order files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-files');

-- Policy: Allow authenticated users to read files
CREATE POLICY "Authenticated users can view order files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-files');

-- Policy: Allow CEO and Manager to delete files
CREATE POLICY "CEO and Manager can delete order files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-files' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('ceo', 'manager')
  )
);
```

3. **Adjust File Size Limits** (optional):
   - In Supabase Dashboard → Settings → Storage
   - Adjust max file size as needed (default is usually 50MB)

### Component Updates

The `OrdersBase` component has been updated with:
- Expandable rows (click chevron icon or "Files" button)
- File upload with drag-and-drop UI
- File list with view/download and delete options
- Loading states and error handling

**File:** `src/components/rolebase/OrdersBase.tsx` ✅ Already updated

---

## 3️⃣ Real-Time Notification System

### Browser Notification Permission

The system will automatically request browser notification permission when a user first visits the app. Users can:
- **Allow** - Receive native browser notifications
- **Block** - Only receive in-app notifications
- **Dismiss** - Asked again later

### Component Integration

Two new components have been created:

1. **GlobalNotifier** (Realtime subscription engine)
   - `src/components/GlobalNotifier.tsx` ✅ Created
   - Subscribes to `orders` and `tasks` table changes
   - Provides notification context to entire app
   - Already integrated in `src/app/layout.tsx`

2. **NotificationsBase** (UI dropdown)
   - `src/components/rolebase/NotificationsBase.tsx` ✅ Created
   - Bell icon with unread badge
   - Dropdown with notification list
   - Mark as read / clear functionality

### Add Notification Bell to Navbar

You need to add the notification bell to your navigation components. Here's how:

#### Example: Add to Role-Specific Layouts

**File:** `src/app/ceo/layout.tsx` (and similarly for manager, board, staff)

```typescript
import NotificationsBase from '@/components/rolebase/NotificationsBase'

export default function CEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Your existing navbar/header */}
      <nav className="flex items-center justify-between p-4">
        <div>{/* Logo, menu items, etc. */}</div>
        
        {/* Add notification bell */}
        <div className="flex items-center gap-4">
          <NotificationsBase />
          {/* Other navbar items (user menu, theme toggle, etc.) */}
        </div>
      </nav>

      {/* Main content */}
      {children}
    </div>
  )
}
```

### Supabase Realtime Configuration

Ensure Realtime is enabled for the required tables in your Supabase dashboard:

1. Go to **Database** → **Replication**
2. Enable replication for:
   - ✅ `orders` table
   - ✅ `tasks` table
3. Select which events to broadcast:
   - ✅ INSERT
   - ✅ UPDATE
   - ✅ DELETE (optional)

### Notification Triggers

The system automatically sends notifications for:

#### Order Events
- 🧾 **New Order Created** - When a new order is inserted
- 📦 **Order Status Updated** - When order status changes
- 💰 **Payment Status Updated** - When payment status changes

#### Task Events
- ✅ **New Task Assigned** - When a new task is created
- 🎉 **Task Completed** - When task status changes to completed

### Customizing Notifications

To add more notification types, edit `src/components/GlobalNotifier.tsx`:

```typescript
// Example: Add notification for new staff assignment
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'staff_assignments' },
  (payload) => {
    // Handle staff assignment changes
    addNotification({
      type: 'general',
      title: '👥 New Staff Assignment',
      message: `You've been assigned to a task`,
      link: '/assignments',
    })
  }
)
```

---

## 🧪 Testing Checklist

### Top Customers
- [ ] View loads successfully at `/[role]/customers`
- [ ] Search filters customers correctly
- [ ] Phone numbers are clickable (tel: links)
- [ ] Email addresses are clickable (mailto: links)
- [ ] Statistics summary shows correct totals
- [ ] Ranking badges display correctly (gold, silver, bronze)

### File Storage
- [ ] "Files" button expands order row
- [ ] File upload works (single and multiple files)
- [ ] Uploaded files appear in list
- [ ] View/Download button opens file in new tab
- [ ] Delete button works (CEO/Manager only)
- [ ] File size displays correctly
- [ ] Upload progress shows loading state
- [ ] Storage bucket exists and is accessible

### Notifications
- [ ] Browser notification permission requested on first visit
- [ ] Bell icon appears in navbar
- [ ] Unread count badge shows correct number
- [ ] Dropdown opens/closes correctly
- [ ] Creating a new order triggers notification
- [ ] Updating order status triggers notification
- [ ] Native browser notification appears (if permission granted)
- [ ] In-app notification appears in dropdown
- [ ] "Mark as read" functionality works
- [ ] "Clear notification" works
- [ ] Clicking notification navigates to correct page
- [ ] Time ago formatting displays correctly

---

## 🔧 Troubleshooting

### Top Customers Not Loading
- Check if `top_customers` view exists in Supabase
- Verify `orders` table has `total_amount` column
- Check browser console for errors
- Ensure user is authenticated

### File Upload Fails
- Verify `order-files` bucket exists in Supabase Storage
- Check bucket policies allow authenticated users to upload
- Ensure file size is within limits
- Check browser console for error messages
- Verify Supabase storage keys are set in `.env.local`

### Notifications Not Working
- Check if Realtime is enabled for `orders` and `tasks` tables
- Verify user granted browser notification permission
- Open browser console to check for subscription errors
- Test by manually creating an order in Supabase dashboard
- Ensure `GlobalNotifier` is mounted in root layout

### Browser Notifications Not Appearing
- Check browser notification settings/permissions
- Ensure HTTPS is enabled (required for notifications on production)
- Try different browser (some browsers block notifications by default)
- Check if "Do Not Disturb" mode is enabled on OS level

---

## 📝 Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🎨 Styling Notes

All components use:
- **Tailwind CSS** for styling
- **shadcn/ui** components (Card, Button, Input)
- **@heroicons/react** for icons
- **Consistent spacing** and responsive grid
- **No border radius** (following user preference)

To modify styles, edit the component files directly or update your Tailwind configuration.

---

## 📚 Additional Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Next.js 15 Documentation](https://nextjs.org/docs)

---

## 🚀 Next Steps

1. Run the SQL scripts to create the `top_customers` view
2. Create the `order-files` storage bucket
3. Set up storage policies
4. Enable Realtime replication for `orders` and `tasks`
5. Create role-specific customer pages
6. Add `NotificationsBase` to your navbar components
7. Test all features thoroughly
8. Deploy to production

---

**Questions or Issues?**
Check the browser console for detailed error messages and refer to the Supabase dashboard for configuration status.

