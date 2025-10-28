# ⚡ Quick Start Guide - New Features

**3 simple steps to get everything working!**

---

## Step 1: Database (2 minutes)

Open **Supabase SQL Editor** and run:

```sql
-- Create top customers view
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

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime for tasks (if you have this table)
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

✅ Done? Great!

---

## Step 2: Storage (1 minute)

1. Go to **Supabase Dashboard → Storage**
2. Click **"New bucket"**
3. Name: `order-files`
4. Select: **Private**
5. Click **"Create bucket"**
6. Click on the bucket → **Policies** → **"New Policy"**
7. Use template: **"Allow authenticated users to insert"**
8. Repeat for: **"Allow authenticated users to select"** and **"Allow authenticated users to delete"**

✅ Done? Great!

---

## Step 3: Test (2 minutes)

### Test Customers Page:
```
Visit: http://localhost:3000/ceo/customers
```
- Should see top 10 customers
- Try searching
- Click phone/email links

### Test File Upload:
```
Visit: http://localhost:3000/ceo/orders
```
- Click chevron icon on any order
- Upload a file
- View/download it
- Delete it (if CEO/Manager)

### Test Notifications:
```
1. Allow browser notifications when prompted
2. Open two browser windows side-by-side
3. In window 1: Go to orders page
4. In window 2: Create a new order (or update existing)
5. Watch window 1 for:
   - Native browser notification
   - Bell icon badge updates
   - Notification in dropdown
```

✅ All working? You're done! 🎉

---

## 🔧 Quick Fixes

### "View does not exist"
→ Run Step 1 SQL scripts

### "Storage bucket not found"
→ Create `order-files` bucket (Step 2)

### "File upload fails"
→ Check bucket policies (Step 2, step 7)

### "No notifications appearing"
→ Enable Realtime in Dashboard → Database → Replication

### "Browser notifications blocked"
→ Check browser settings → Allow notifications for your site

---

## 📍 URLs to Access New Features

- **CEO Customers**: `/ceo/customers`
- **Manager Customers**: `/manager/customers`
- **Board Customers**: `/board/customers`
- **Staff Customers**: `/staff/customers`
- **File Upload**: Expand any order in `/[role]/orders`
- **Notifications**: Bell icon in top-right corner (all pages)

---

## 🎨 What You'll See

### Top Customers Page
```
┌─────────────────────────────────────────┐
│  Top Customers                          │
│  [Search box]                           │
│                                         │
│  Rank | Name | Phone | Email | Orders  │
│  🥇 1  | John | 123   | john@ | 45     │
│  🥈 2  | Jane | 456   | jane@ | 32     │
│  🥉 3  | Bob  | 789   | bob@  | 28     │
└─────────────────────────────────────────┘
```

### File Upload (Expanded Order)
```
┌─────────────────────────────────────────┐
│  Order Files                            │
│  ┌─────────────────────────────────┐   │
│  │  📤 Click to upload files       │   │
│  │  or drag and drop               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📎 invoice.pdf    [👁️] [🗑️]          │
│  📎 design.png     [👁️] [🗑️]          │
└─────────────────────────────────────────┘
```

### Notification Dropdown
```
┌─────────────────────────────────────────┐
│  Notifications      [Mark all read]     │
├─────────────────────────────────────────┤
│  🧾 New Order Created                   │
│     Order #1234 - John Doe              │
│     2m ago                         [×]  │
├─────────────────────────────────────────┤
│  📦 Order Status Updated                │
│     Order #1233 is now completed        │
│     1h ago                         [×]  │
└─────────────────────────────────────────┘
```

---

## 💡 Pro Tips

1. **Search is instant** - No need to click search button
2. **Files auto-refresh** - Upload completes automatically
3. **Notifications stack** - Up to 50 recent notifications
4. **Click notification** - Auto-navigates to relevant page
5. **Right-click links** - Phone/email links work with system apps

---

## 📞 Need Help?

1. Check `SETUP_INSTRUCTIONS.md` for detailed guide
2. Check `IMPLEMENTATION_SUMMARY.md` for technical overview
3. Check browser console for error messages
4. Verify Supabase dashboard configurations

---

**That's it! Enjoy your new features! 🎉**

