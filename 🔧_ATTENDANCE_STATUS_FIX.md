# 🔧 Attendance Status Constraint Fix

## ❌ Error

```
new row for relation "attendance" violates check constraint "attendance_status_check"
```

## 🔍 What's Wrong

The `attendance` table has a **CHECK constraint** on the `status` column, but the allowed values don't match what the code is trying to insert.

**Code is inserting:** `'checked_in'` and `'checked_out'`  
**Database expects:** Something different (possibly without underscores or different values)

---

## ✅ Solution (Choose One)

### Option 1: Quick Fix (Recommended) ⚡

**Use this if you have existing attendance data you want to keep.**

1. Open Supabase Dashboard → SQL Editor
2. Run this script: **`FIX_ATTENDANCE_STATUS_CONSTRAINT.sql`**
3. Refresh your app
4. Try checking in again

This will:
- ✅ Fix the constraint without deleting data
- ✅ Update any invalid status values
- ✅ Keep your existing records

---

### Option 2: Clean Setup (Fresh Start) 🆕

**Use this if you want to start fresh with a clean table.**

⚠️ **WARNING:** This deletes all existing attendance records!

1. Open Supabase Dashboard → SQL Editor
2. Run this script: **`ATTENDANCE_CLEAN_SETUP.sql`**
3. Refresh your app
4. Try checking in again

This will:
- ✅ Drop and recreate the table
- ✅ Set up everything correctly from scratch
- ❌ Delete all existing attendance data

---

## 📋 Step-by-Step (Option 1 - Recommended)

### 1. Open Supabase

1. Go to https://supabase.com/dashboard
2. Select your **Universal Printing Press** project
3. Click **SQL Editor** in the left sidebar

### 2. Run the Fix Script

1. Click **"New Query"**
2. Open `FIX_ATTENDANCE_STATUS_CONSTRAINT.sql` (in your project root)
3. Copy ALL the contents
4. Paste into Supabase SQL Editor
5. Click **"Run"** (or press `Ctrl+Enter`)

### 3. Verify Success

You should see output showing:

```
constraint_name              | check_clause
attendance_status_check      | (status IN ('checked_in', 'checked_out', 'absent', 'manual'))
```

### 4. Test the App

1. Go back to your app
2. Refresh the page
3. Go to Attendance page
4. Click "Check In"
5. ✅ Should work now!

---

## 🔍 What the Fix Does

### Before (Broken):
```sql
-- Constraint might have been:
CHECK (status IN ('checkin', 'checkout'))  -- ❌ No underscores
-- or
CHECK (status = ANY(ARRAY['checked-in', 'checked-out']))  -- ❌ Hyphens
-- or something else that doesn't match 'checked_in'
```

### After (Fixed):
```sql
-- Correct constraint:
CHECK (status IN ('checked_in', 'checked_out', 'absent', 'manual'))  -- ✅
```

---

## ✅ Valid Status Values

After the fix, these are the ONLY valid values for the `status` column:

| Status | When Used | Description |
|--------|-----------|-------------|
| `checked_in` | On check-in | User has clocked in |
| `checked_out` | On check-out | User has clocked out |
| `absent` | Manual entry | Marked absent by admin |
| `manual` | Manual entry | Manually added by admin |

---

## 🧪 Verification

After running the fix script, verify it worked:

### In Supabase SQL Editor:

```sql
-- Check the constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'attendance_status_check';
```

**Expected output:**
```
attendance_status_check | (status IN ('checked_in', 'checked_out', 'absent', 'manual'))
```

### In the app:

1. Open browser console (F12)
2. Go to Attendance page
3. Click "Check In"
4. Should see: "✅ Checked in successfully!"
5. No more constraint errors in console

---

## 🐛 Still Getting Errors?

### Error: "Permission denied"

**Solution:**
- Run the RLS policies from `ATTENDANCE_CLEAN_SETUP.sql`
- Make sure you're logged in
- Check your user role

### Error: "Table does not exist"

**Solution:**
- Run `ATTENDANCE_CLEAN_SETUP.sql` (Option 2)
- This creates the table from scratch

### Error: "Cannot drop constraint"

**Solution:**
- The constraint might have a different name
- Run this to find it:
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'attendance' 
AND constraint_type = 'CHECK';
```
- Then drop it manually:
```sql
ALTER TABLE attendance DROP CONSTRAINT <constraint_name>;
```

---

## 📚 Why This Happened

This error typically occurs when:

1. **Multiple setup scripts run** - Different scripts created different constraints
2. **Old migration** - Previous version used different status values
3. **Manual changes** - Someone edited the table structure manually
4. **Script conflict** - Multiple developers ran different setup scripts

---

## 🎯 Files Created

| File | Purpose |
|------|---------|
| `FIX_ATTENDANCE_STATUS_CONSTRAINT.sql` | Fixes constraint without deleting data ✅ |
| `ATTENDANCE_CLEAN_SETUP.sql` | Complete fresh setup (deletes data) |
| `ATTENDANCE_TABLE_SETUP.sql` | Original setup (may have had issues) |

**Use:** `FIX_ATTENDANCE_STATUS_CONSTRAINT.sql` (recommended)

---

## ✅ After the Fix

Once you run the fix script, the attendance system will:

- ✅ Accept check-ins with `status: 'checked_in'`
- ✅ Accept check-outs with `status: 'checked_out'`
- ✅ Validate all status values correctly
- ✅ Show proper error messages
- ✅ Work reliably

---

## 🚀 Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Ran `FIX_ATTENDANCE_STATUS_CONSTRAINT.sql`
- [ ] Saw success message with correct constraint
- [ ] Refreshed the app
- [ ] Tested check-in
- [ ] ✅ No more errors!

---

**Developer:** Frank Bediako  
**Email:** frankbediako38@gmail.com  
**Last Updated:** October 27, 2025

---

**👉 Run `FIX_ATTENDANCE_STATUS_CONSTRAINT.sql` in Supabase now to fix the constraint!**

