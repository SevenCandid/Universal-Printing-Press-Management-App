# ⚡ Quick Setup - 3 Steps

Get all 4 new features working in **under 10 minutes**!

---

## Step 1: Database (3 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy-paste entire content of `setup-new-features.sql`
3. Click **Run**
4. Wait for "Success" message

✅ This creates the `notifications` table and storage policies

---

## Step 2: Storage Bucket (2 minutes)

1. **Supabase Dashboard** → **Storage** → **New Bucket**
2. Name: `company_files`
3. Privacy: **Private**
4. Click **Create**

✅ This enables file uploads/downloads

---

## Step 3: Enable Realtime (1 minute)

1. **Supabase Dashboard** → **Database** → **Replication**
2. Find `notifications` table
3. Toggle **ON**
4. Enable: **INSERT** and **UPDATE** events

✅ This enables real-time notifications

---

## 🎉 Done! Test Now

### Test Edit/Delete Orders
```
Visit: http://localhost:3000/ceo/orders
Click "Edit" on any order → Edit modal opens
Make changes → Click "Save"
Click "Delete" → Confirm deletion
```

### Test File Storage
```
Visit: http://localhost:3000/ceo/files
Click "Upload Files"
Select any file(s)
File appears in list
Click download icon → File downloads
```

### Test Notifications
```
Create a new order (existing modal)
→ Browser notification appears
→ Bell icon badge updates
→ Click bell to see notification
```

---

## 📧 Email Setup (Optional - 5 minutes)

**If you want automated emails:**

1. Get API key from [resend.com](https://resend.com) (free)
2. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```
3. Update sender email in `src/lib/sendEmail.ts` line 31:
   ```typescript
   from: 'Your Company <notifications@yourdomain.com>'
   ```
4. Test by creating an order

**Full guide:** See `EMAIL_SETUP_GUIDE.md`

---

## 🐛 Something Not Working?

| Issue | Fix |
|-------|-----|
| Edit button not showing | Check you're logged in as CEO or Manager |
| Files not uploading | Create `company_files` bucket (Step 2) |
| No notifications | Enable Realtime (Step 3) |
| Emails not sending | Add `RESEND_API_KEY` to `.env.local` |

---

## 📁 What You Got

✅ **Edit Orders** - Full order editing modal  
✅ **Delete Orders** - Confirmation dialog  
✅ **File Storage** - Company-wide file management  
✅ **Notifications** - Real-time in-app + browser  
✅ **Email Alerts** - Automated email system  

---

**Full Documentation:** See `NEW_FEATURES_IMPLEMENTATION.md`

**That's it! All features are ready to use.** 🚀

