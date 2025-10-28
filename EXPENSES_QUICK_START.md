# 🚀 Expenses System - Quick Start Guide

## 5-Minute Setup

### Step 1: Database Setup (2 minutes)
```sql
-- Run this in Supabase SQL Editor:
-- File: EXPENSES_SYSTEM_SETUP.sql
```

✅ Creates `expenses` and `user_devices` tables  
✅ Sets up RLS policies  
✅ Configures triggers

### Step 2: Environment Variables (2 minutes)
```bash
# Add to .env.local (see EXPENSES_ENV_TEMPLATE.txt)

# Minimum required:
EXPENSE_ALERT_THRESHOLD=1000
RESEND_API_KEY=re_your_key_here
EMAIL_FROM="UPP <noreply@yourdomain.com>"
EXPENSE_ALERT_EMAILS="ceo@company.com,manager@company.com"
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Step 3: Test It! (1 minute)
1. Navigate to `/ceo/expenses` or `/manager/expenses`
2. Click "+ Add Expense"
3. Fill in:
   - Title: "Test Expense"
   - Amount: 2500
   - Category: Marketing
4. Click "Create Expense"

✅ You should see the expense in the table  
✅ Check your email for alert (if amount >= threshold)  
✅ Go to `/ceo/reports` to see updated metrics

---

## What You Get

### 📊 Expenses Page
- ✅ View all expenses
- ✅ Add/Edit/Delete (CEO & Manager only)
- ✅ Search & filter by category
- ✅ Date range filtering
- ✅ Export to CSV
- ✅ Real-time updates

### 📈 Reports Page
- ✅ Total Revenue card
- ✅ Total Expenses card
- ✅ Net Revenue card
- ✅ Profit Margin card (with quality indicator)

### 🔔 Notifications
- ✅ Email alerts for large expenses (>=₵1000)
- ✅ Push notifications (optional, requires FCM/OneSignal)
- ✅ In-app notifications

---

## File Locations

### Pages
```
/app/ceo/expenses/page.tsx
/app/manager/expenses/page.tsx
/app/board/expenses/page.tsx
/app/staff/expenses/page.tsx
```

### Components
```
/components/rolebase/ExpensesBase.tsx
/components/rolebase/ReportsBase.tsx (updated)
/components/layout/Sidebar.tsx (updated)
```

### Utilities
```
/lib/sendEmail.ts
/lib/pushNotify.ts
```

### Database
```
EXPENSES_SYSTEM_SETUP.sql
```

---

## Common Issues & Fixes

### "Table expenses does not exist"
**Fix:** Run `EXPENSES_SYSTEM_SETUP.sql` in Supabase

### "Permission denied"
**Fix:** Check RLS policies. Ensure user role is 'ceo' or 'manager' in profiles table

### "Email not sending"
**Fix:** 
1. Check RESEND_API_KEY is set
2. Verify domain is verified in Resend
3. Check spam folder

### "Expenses not showing in reports"
**Fix:** Hard refresh browser (Ctrl+Shift+R) or clear cache

### "Cannot add expense"
**Fix:** Check browser console for errors. Verify Supabase connection.

---

## Key Environment Variables

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `EXPENSE_ALERT_THRESHOLD` | Yes | Minimum amount to trigger alerts |
| `RESEND_API_KEY` | Yes (for email) | Resend API authentication |
| `EMAIL_FROM` | Yes (for email) | Sender email address |
| `EXPENSE_ALERT_EMAILS` | Yes (for email) | Alert recipients |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for email links |
| `FCM_SERVER_KEY` | No (for push) | Firebase server key |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | No (for push) | OneSignal app ID |

---

## Access Control

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| CEO | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ |
| Board | ✅ | ❌ | ❌ | ❌ |
| Staff | ✅ | ❌ | ❌ | ❌ |

---

## Testing Checklist

- [ ] Database tables created
- [ ] Environment variables set
- [ ] Can access `/ceo/expenses`
- [ ] Can add an expense
- [ ] Expense appears in table
- [ ] Expense appears in Reports
- [ ] Email alert received (if amount >= threshold)
- [ ] Can edit expense
- [ ] Can delete expense
- [ ] Real-time updates work
- [ ] CSV export works
- [ ] Search/filter works

---

## Need More Help?

📖 **Full Documentation:** `EXPENSES_SYSTEM_DOCUMENTATION.md`  
📋 **Implementation Summary:** `EXPENSES_SYSTEM_SUMMARY.md`  
🔧 **Environment Template:** `EXPENSES_ENV_TEMPLATE.txt`

---

## What's Next?

### Optional Enhancements:
- Set up push notifications (FCM/OneSignal)
- Add more expense categories
- Create expense approval workflow
- Add receipt upload functionality
- Create budget vs actual reports

### You're Done! 🎉

Your expenses system is fully functional and ready to use. The system will:
- ✅ Track all company expenses
- ✅ Calculate profit margins
- ✅ Send automatic alerts
- ✅ Update reports in real-time
- ✅ Secure with role-based access

**Happy expense tracking!** 💰📊

