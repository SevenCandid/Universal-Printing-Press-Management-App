# 📋 Complete Setup Order - Fixed Version

Follow these steps in order to set up everything correctly.

---

## 🎯 The Right Order

### Step 1: Run Old Features SQL (3 min)
**File:** `setup-FIXED.sql`

This creates:
- ✅ `top_customers` view (without email column)
- ✅ Storage policies for `order-files` bucket

```sql
-- In Supabase SQL Editor
-- Copy and run: setup-FIXED.sql
```

---

### Step 2: Run New Features SQL (5 min)
**File:** `setup-new-features-FIXED.sql`

This creates:
- ✅ `notifications` table
- ✅ Adds missing columns to `orders` (including `customer_email`)
- ✅ Creates notification triggers
- ✅ Storage policies for `company_files` bucket

```sql
-- In Supabase SQL Editor
-- Copy and run: setup-new-features-FIXED.sql
```

---

### Step 3: Update Top Customers View (1 min)

Now that `customer_email` column exists, update the view:

```sql
-- Run this to add email to the view
CREATE OR REPLACE VIEW top_customers AS
SELECT
  customer_name,
  customer_phone,
  customer_email,  -- NOW this column exists!
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_name, customer_phone, customer_email
ORDER BY total_spent DESC
LIMIT 10;
```

---

### Step 4: Create Storage Buckets (3 min)

**Create TWO buckets:**

1. **Bucket 1:** `order-files`
   - Supabase Dashboard → Storage → New Bucket
   - Name: `order-files`
   - Privacy: Private
   - For: Per-order file uploads

2. **Bucket 2:** `company_files`
   - Same steps
   - Name: `company_files`
   - Privacy: Private
   - For: Company-wide file storage

---

### Step 5: Enable Realtime (1 min) - WHEN AVAILABLE

**Only if Realtime is available in your Supabase project:**

1. Go to **Database** → **Replication**
2. Enable for `notifications` table
3. Enable for `orders` table (optional, for order updates)
4. Select events: INSERT, UPDATE

**If "Coming Soon":**
- Skip for now
- All features still work
- Notifications require page refresh

---

## ✅ Verification Checklist

After completing all steps:

```sql
-- 1. Check top_customers view works
SELECT * FROM top_customers;

-- 2. Check notifications table exists
SELECT COUNT(*) FROM notifications;

-- 3. Check new columns exist in orders
SELECT customer_email, due_date, notes, updated_at 
FROM orders LIMIT 1;

-- 4. Check all storage policies
SELECT policyname FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
-- Should see ~8 policies (4 for order-files, 4 for company_files)

-- 5. Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notification%';
-- Should see order_created_notification trigger
```

---

## 🎨 What This Gives You

After all steps:

### Old Features (Still Working)
- ✅ Top 10 customers page with email
- ✅ Per-order file uploads

### New Features (Now Working)
- ✅ Edit orders
- ✅ Delete orders
- ✅ Company-wide file storage
- ✅ Real-time notifications (if enabled)
- ✅ Email alerts (with setup)

---

## 🐛 Common Issues & Fixes

### "View contains errors"
**Fix:** Run Step 3 to update the view with customer_email

### "Policy already exists"
**Fix:** Ignore - means it was already created, which is fine

### "Bucket not found" 
**Fix:** Create both buckets in Step 4

### "Realtime not available"
**Fix:** Skip Step 5, features still work without it

---

## 📁 File Reference

| File | Purpose | Order |
|------|---------|-------|
| `setup-FIXED.sql` | Old features without email | 1st |
| `setup-new-features-FIXED.sql` | New features + columns | 2nd |
| Top customers view update | Add email to view | 3rd |
| Storage buckets | Manual in dashboard | 4th |
| Realtime | Manual in dashboard | 5th |

---

## 🚀 Quick Test

After setup, test:

```bash
# 1. Go to customers page
http://localhost:3000/ceo/customers
# Should see top customers with phone AND email

# 2. Go to orders page
http://localhost:3000/ceo/orders
# Click "Edit" on any order - should open modal

# 3. Go to files page
http://localhost:3000/ceo/files
# Click "Upload Files" - should work

# 4. Create a new order
# Should see notification (refresh page if no Realtime)
```

---

## ⚡ Speed Run (All at Once)

If you want to run everything quickly:

```sql
-- Copy-paste ALL THREE in order:

-- 1. Old features (setup-FIXED.sql content)
-- 2. New features (setup-new-features-FIXED.sql content)  
-- 3. View update (SQL from Step 3)

-- Then create buckets manually in dashboard
```

---

## 📧 Email Setup (Optional)

After database setup complete:
1. Get Resend API key
2. Follow `EMAIL_SETUP_GUIDE.md`
3. Test email alerts

---

**All features will work after these steps!** 🎉

