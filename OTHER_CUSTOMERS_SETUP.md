# 📋 Other Customers Feature - Setup Guide

Complete guide to set up and use the new "Other Customers" section.

---

## 🎯 What Was Added

### New Features:
1. **"Other Customers" Section** - Separate from Top Customers
2. **Add Customer** - Manual customer entry (CEO/Manager only)
3. **Edit Customer** - Update customer details
4. **Delete Customer** - Remove customers with confirmation
5. **Role-Based Access** - CEO/Manager can manage, others view Top Customers only

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Setup (2 min)

```sql
-- In Supabase SQL Editor:
-- Copy and run: customers-feature-setup.sql
```

This creates:
- ✅ `customers` table
- ✅ Row Level Security policies
- ✅ Indexes for performance
- ✅ Auto-update trigger

**Expected Output:**
```
NOTICE: ════════════════════════════════════════
NOTICE: Other Customers Feature Setup Complete!
NOTICE: ════════════════════════════════════════
```

### Step 2: Test the Feature

```
Visit: http://localhost:3000/ceo/customers
or:    http://localhost:3000/manager/customers
```

You should see:
- ✅ Top Customers section (existing)
- ✅ Divider line
- ✅ Other Customers section (new)
- ✅ "Add Customer" button (CEO/Manager only)

### Step 3: Add Your First Customer

1. Click **"Add Customer"** button
2. Fill in the form:
   - Full Name (required)
   - Email (optional)
   - Phone (optional)
   - Company (optional)
   - Notes (optional)
3. Click **"Add Customer"**
4. See success toast ✓
5. Customer appears in table immediately

---

## 📁 Files Created/Modified

**New Files:**
- ✅ `customers-feature-setup.sql` - Database setup
- ✅ `src/components/ui/AddCustomerModal.tsx` - Add customer modal
- ✅ `src/components/ui/EditCustomerModal.tsx` - Edit customer modal
- ✅ `OTHER_CUSTOMERS_SETUP.md` - This guide

**Modified Files:**
- ✅ `src/components/rolebase/CustomersBase.tsx` - Added Other Customers section

---

## 🎨 UI Structure

### Page Layout:
```
┌─────────────────────────────────────────┐
│  Top Customers                          │
│  [Search bar]                           │
│  ┌─────────────────────────────────┐   │
│  │ Customer Leaderboard Table      │   │
│  │ (Rank, Name, Phone, Email...)   │   │
│  └─────────────────────────────────┘   │
│  [Statistics Cards]                     │
├─────────────────────────────────────────┤  ← Divider
│  Other Customers     [+ Add Customer]   │
│  [Search bar]                           │
│  ┌─────────────────────────────────┐   │
│  │ Customer Directory Table        │   │
│  │ (Name, Phone, Email, Company... │   │
│  │  Notes, [Edit] [Delete])        │   │
│  └─────────────────────────────────┘   │
│  [Statistics Cards]                     │
└─────────────────────────────────────────┘
```

---

## 🔐 Role-Based Permissions

| Feature | CEO | Manager | Board | Staff |
|---------|-----|---------|-------|-------|
| View Top Customers | ✅ | ✅ | ✅ | ✅ |
| View Other Customers | ✅ | ✅ | ✅ | ✅ |
| Add Customer | ✅ | ✅ | ❌ | ❌ |
| Edit Customer | ✅ | ✅ | ❌ | ❌ |
| Delete Customer | ✅ | ✅ | ❌ | ❌ |

**Board and Staff users** see:
- Top Customers section only
- No "Add Customer" button
- No Edit/Delete buttons in Other Customers table

---

## 📊 Database Schema

### `customers` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `full_name` | TEXT | Customer name (required) |
| `email` | TEXT | Email address (optional) |
| `phone` | TEXT | Phone number (optional) |
| `company` | TEXT | Company/Organization (optional) |
| `notes` | TEXT | Additional notes (optional) |
| `category` | TEXT | 'top' or 'other' (default: 'other') |
| `created_by` | UUID | User who created the record |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

---

## ✨ Features in Detail

### 1. Add Customer
- **Who:** CEO and Manager only
- **How:** Click "+ Add Customer" button
- **Fields:**
  - Full Name (required)
  - Email (optional)
  - Phone (optional)
  - Company/Organization (optional)
  - Notes (optional)
- **Result:** Customer added to "Other Customers" list immediately

### 2. Edit Customer
- **Who:** CEO and Manager only
- **How:** Click pencil icon (✏️) next to customer
- **Features:**
  - Pre-filled form with current data
  - Update any field
  - Auto-save timestamp
- **Result:** Changes appear immediately

### 3. Delete Customer
- **Who:** CEO and Manager only
- **How:** Click trash icon (🗑️) next to customer
- **Safety:** Confirmation dialog appears
- **Result:** Customer removed from list

### 4. Search
- **Two separate search bars:**
  - Top Customers: Search name, phone, email
  - Other Customers: Search name, phone, email, company
- **Real-time filtering**
- **Case-insensitive**

### 5. Statistics
- **Top Customers:**
  - Total Customers
  - Total Orders
  - Total Revenue

- **Other Customers:**
  - Total Other Customers
  - Companies Represented

---

## 🧪 Testing Checklist

After setup, test:

### As CEO or Manager:
- [ ] Visit `/ceo/customers` or `/manager/customers`
- [ ] See both Top and Other Customers sections
- [ ] See "Add Customer" button
- [ ] Click "Add Customer"
  - [ ] Modal opens
  - [ ] Add required name
  - [ ] Add optional fields
  - [ ] Submit
  - [ ] Success toast appears
  - [ ] Customer appears in table
- [ ] Search in Other Customers
  - [ ] Type name → filters correctly
  - [ ] Clear search → shows all
- [ ] Click Edit (pencil icon)
  - [ ] Modal opens with pre-filled data
  - [ ] Change name
  - [ ] Save
  - [ ] Success toast appears
  - [ ] Table updates
- [ ] Click Delete (trash icon)
  - [ ] Confirmation dialog appears
  - [ ] Click "Cancel" → nothing happens
  - [ ] Click "Delete" → customer removed
  - [ ] Success toast appears

### As Board or Staff:
- [ ] Visit `/board/customers` or `/staff/customers`
- [ ] See Top Customers section only
- [ ] No "Add Customer" button visible
- [ ] If Other Customers section visible:
  - [ ] No Edit/Delete buttons
  - [ ] View-only access

---

## 🎨 Design Features

✅ **Consistent with existing style:**
- Tailwind CSS classes
- shadcn/ui components (Card, Button, Input)
- Same color scheme
- Responsive grid layout

✅ **User Experience:**
- Loading states
- Empty states with helpful messages
- Success/error toasts
- Confirmation dialogs for destructive actions
- Auto-refresh after changes
- Click-to-call phone links
- Mailto email links

✅ **Responsive:**
- Mobile-friendly tables
- Stacked layout on small screens
- Touch-friendly buttons

---

## 🔄 Real-Time Updates

**After any action (Add/Edit/Delete):**
- ✅ Table refreshes automatically
- ✅ No page reload needed
- ✅ Statistics update
- ✅ Search results update

---

## 🐛 Troubleshooting

### "Table customers does not exist"
**Fix:** Run `customers-feature-setup.sql` in Supabase SQL Editor

### "Permission denied for table customers"
**Fix:** RLS policies should auto-create. Check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'customers';
-- Should show 4 policies
```

### "Add Customer" button not showing
**Check:** User role must be 'ceo' or 'manager' (case-insensitive)

### Edit/Delete not working
**Check:** 
1. User has CEO or Manager role
2. Browser console for errors
3. Supabase RLS policies

### No customers showing in Other Customers
**This is normal if:**
- No customers added yet
- Category filter applied (only shows category='other')

---

## 📈 Future Enhancements (Optional)

Consider adding:
- 📧 Email customers directly from table
- 📞 Call log integration
- 🏷️ Tags/categories for customers
- 📎 Attach files to customer records
- 📊 Customer activity history
- 🔗 Link customers to orders
- 📥 Import customers from CSV
- 📤 Export customer list
- 🔍 Advanced search filters
- 📱 Customer mobile app view

---

## 🔧 Customization

### Change Required Fields

In `AddCustomerModal.tsx` and `EditCustomerModal.tsx`:
```typescript
// Make email required:
<Input
  type="email"
  required  // Add this
  ...
/>
```

### Add New Fields

1. **Database:**
```sql
ALTER TABLE customers ADD COLUMN new_field TEXT;
```

2. **Type Definition:**
```typescript
type OtherCustomer = {
  // ... existing fields
  new_field: string | null
}
```

3. **UI:** Add to forms and table

### Change Table Columns

In `CustomersBase.tsx`, modify the `<thead>` and `<tbody>` sections.

---

## 📝 Notes

- **Top Customers** data comes from `top_customers` VIEW (based on orders)
- **Other Customers** data comes from `customers` TABLE (manual entries)
- Both sections are independent
- Separation allows tracking high-value vs. prospective customers
- Category field allows future expansion (e.g., 'vip', 'inactive')

---

## ✅ Summary

**What you got:**
- ✅ Full customer management system
- ✅ Role-based access control
- ✅ Beautiful, responsive UI
- ✅ Real-time updates
- ✅ Search functionality
- ✅ Statistics dashboard
- ✅ Production-ready code

**All features work immediately after running the SQL setup!** 🎉

---

**Questions or Issues?**
Check browser console and Supabase SQL logs for detailed error messages.

