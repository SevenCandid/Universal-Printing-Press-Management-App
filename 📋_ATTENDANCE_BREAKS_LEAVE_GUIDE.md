# 📋 Attendance Breaks & Leave Request System - Complete Guide

## 🎉 New Features Overview

Your attendance system now includes:

### ✅ Break Tracking
- **Start/End Breaks**: Staff can take breaks during work hours without affecting daily check-in/out
- **Break Types**: 
  - ☕ Regular Break
  - 🍽️ Lunch Break  
  - 🚻 Personal Break
- **Real-time Tracking**: Live break duration updates
- **Break History**: View all breaks taken during the day
- **Total Break Time**: Automatic calculation of total break duration

### ✅ Leave Request System
- **Request Types**:
  - 📅 Annual Leave
  - 🏖️ Holiday
  - 🤒 Sick Leave
  - 👤 Personal Leave
  - 🚨 Emergency
  - 📝 Excuse/Explanation
- **Approval Workflow**: CEO/Manager/Executive Assistant approval required
- **Request History**: Track all past requests and their status
- **Notifications**: Automatic notifications for submissions and decisions
- **Comments**: Managers can add comments when approving/rejecting

---

## 🚀 Quick Start

### Step 1: Run Database Setup

**IMPORTANT**: You must run this SQL script in Supabase before using the new features.

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Open the file: `ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql`
3. Copy all contents and paste into Supabase SQL Editor
4. Click **RUN** button
5. Wait for confirmation: `Setup Complete! ✅`

This will create:
- ✅ `breaks` table for break tracking
- ✅ `leave_requests` table for leave management
- ✅ Row Level Security policies
- ✅ Automatic triggers and functions
- ✅ Helpful database views
- ✅ Notification triggers

### Step 2: Verify Deployment

The code is already deployed to Vercel! Check it out:
- **Production**: https://universal-printing-press-management-l7j1at6rd.vercel.app

### Step 3: Test the Features

#### As Staff Member:
1. **Check In** for the day (daily attendance)
2. **Start Break** when you take a break
3. **End Break** when you return
4. Click **Leave Request** button to submit leave requests
5. View your request history and status

#### As CEO/Manager:
1. Check in for the day
2. View **all staff** breaks and attendance
3. Click **Leave Request** → **Pending** tab
4. Approve or reject leave requests with comments
5. Track team attendance patterns

---

## 📱 How to Use

### Daily Attendance (Unchanged)
```
1. Check In → Start your work day (location verified)
2. Work → Your work hours are tracked
3. Check Out → End your work day (location verified)
```

### Break Tracking (NEW!)
```
1. While Checked In, go to "Break Tracker" card
2. Select break type (Regular/Lunch/Personal)
3. Click "Start Break" → Break timer starts
4. When returning, click "End Break" → Break recorded
5. View all breaks in the break history
```

**Important**: 
- ✅ You can take multiple breaks per day
- ✅ Each break is tracked separately
- ✅ Breaks don't affect your daily check-in/out status
- ❌ You must be checked in to start a break

### Leave Request (NEW!)
```
1. Click "Leave Request" button in header
2. Fill in the form:
   - Request Type: Choose from dropdown
   - Start Date: When leave begins
   - End Date: When leave ends
   - Reason: Explain your request
3. Click "Submit Request"
4. Track status in "My Requests" tab
5. Receive notification when approved/rejected
```

**For Managers/CEO**:
```
1. Click "Leave Request" → "Pending" tab
2. Review each request:
   - Staff details
   - Leave type and dates
   - Reason provided
3. Click "Approve" or "Reject"
4. Add optional comments
5. Staff receives notification immediately
```

---

## 🎨 UI Layout

### Desktop View
```
┌─────────────────────────────────────────────────────┐
│  Smart Attendance                    [Leave] [Filters] │
├─────────────────────┬───────────────────────────────┤
│  Daily Attendance   │      Break Tracker            │
│  ├─ Check-In Time   │  ├─ Select Break Type         │
│  ├─ Check-Out Time  │  ├─ [Start Break]            │
│  ├─ Work Hours      │  ├─ Active Break Timer       │
│  └─ [Check In/Out]  │  └─ Break History            │
└─────────────────────┴───────────────────────────────┘
```

### Mobile View
```
┌───────────────────────────┐
│ Smart Attendance          │
│ [Leave Request] [Filters] │
├───────────────────────────┤
│ Daily Attendance          │
│ ├─ Times & Actions        │
│ └─ [Check In] [Check Out] │
├───────────────────────────┤
│ Break Tracker             │
│ ├─ Break Type             │
│ ├─ [Start/End Break]      │
│ └─ Today's Breaks         │
└───────────────────────────┘
```

---

## 📊 Database Structure

### Breaks Table
```sql
breaks
├─ id: UUID (primary key)
├─ attendance_id: UUID (foreign key to attendance)
├─ user_id: UUID (foreign key to users)
├─ break_start: TIMESTAMPTZ
├─ break_end: TIMESTAMPTZ (null while on break)
├─ break_duration: INTEGER (minutes, auto-calculated)
├─ break_type: VARCHAR (regular/lunch/personal)
└─ created_at: TIMESTAMPTZ
```

### Leave Requests Table
```sql
leave_requests
├─ id: UUID (primary key)
├─ user_id: UUID (foreign key to users)
├─ request_type: VARCHAR (leave/holiday/sick_leave/excuse/personal/emergency)
├─ start_date: DATE
├─ end_date: DATE
├─ reason: TEXT
├─ status: VARCHAR (pending/approved/rejected/cancelled)
├─ reviewed_by: UUID (foreign key to users)
├─ reviewed_at: TIMESTAMPTZ
├─ reviewer_comments: TEXT
└─ created_at: TIMESTAMPTZ
```

---

## 🔐 Security (Row Level Security)

### Breaks
- ✅ Staff can view/create/update their own breaks
- ✅ Managers/CEO can view all staff breaks
- ❌ Staff cannot view others' breaks
- ❌ Staff cannot delete breaks

### Leave Requests
- ✅ Staff can view/create/cancel their own pending requests
- ✅ Managers/CEO can view all requests
- ✅ Managers/CEO can approve/reject any request
- ❌ Staff cannot modify approved/rejected requests
- ❌ Staff cannot approve their own requests

---

## 🔔 Notifications

### Automatic Notifications Sent:

**When staff submits leave request**:
- 📨 Sent to: All CEO, Manager, Executive Assistant
- Message: "John Doe has requested sick_leave from 2025-11-01 to 2025-11-03"

**When manager approves/rejects**:
- 📨 Sent to: Request submitter
- Message: "Your holiday request from 2025-11-01 to 2025-11-05 has been approved"

---

## 📤 Export Features

### CSV Export
Includes:
- Daily check-in/out times
- Work hours
- Status
- Staff details (if manager view)

### PDF Export
Professional report with:
- Report header with date range
- Staff filter info (if applicable)
- Attendance table
- Page numbers

**Note**: Break data is tracked separately but not included in attendance exports (feature can be added if needed)

---

## 🎯 Use Cases

### Example 1: Coffee Break
```
8:30 AM  - Staff checks in (daily attendance)
10:00 AM - Staff starts "Regular Break" 
10:15 AM - Staff ends break (15 minutes tracked)
12:00 PM - Staff starts "Lunch Break"
12:45 PM - Staff ends break (45 minutes tracked)
5:00 PM  - Staff checks out (daily attendance)

Result: 8.5 hours worked, 1 hour breaks
```

### Example 2: Sick Leave Request
```
1. Staff submits sick leave request for tomorrow
2. Manager receives notification
3. Manager reviews and approves with comment: "Get well soon!"
4. Staff receives approval notification
5. Tomorrow, staff is not expected to check in
```

### Example 3: Emergency Leave
```
1. Staff submits "Emergency" leave for today
2. CEO receives urgent notification
3. CEO approves immediately
4. Staff is excused from attendance
```

---

## ⚙️ Configuration

### Break Types
Edit in: `src/components/attendance/BreakTracker.tsx`
```typescript
<option value="regular">☕ Regular Break</option>
<option value="lunch">🍽️ Lunch Break</option>
<option value="personal">🚻 Personal Break</option>
// Add more types here
```

### Leave Request Types
Edit in: `src/components/attendance/LeaveRequestModal.tsx`
```typescript
<option value="leave">📅 Annual Leave</option>
<option value="holiday">🏖️ Holiday</option>
<option value="sick_leave">🤒 Sick Leave</option>
// Add more types here
```

### Approval Roles
Edit in: `ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql`
```sql
-- Change who can approve requests
AND profiles.role IN ('ceo', 'manager', 'executive_assistant')
-- Add or remove roles as needed
```

---

## 🐛 Troubleshooting

### Issue: "Cannot start break"
**Solution**: Make sure you're checked in for the day first

### Issue: "Leave request not submitting"
**Solutions**:
1. Run `ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql` in Supabase
2. Check end date is after start date
3. Ensure reason field is filled

### Issue: "Break tracker not showing"
**Solution**: Check in for the day first - breaks only work during active attendance

### Issue: "Cannot see pending requests (as CEO)"
**Solutions**:
1. Verify your role is set to 'ceo', 'manager', or 'executive_assistant' in profiles table
2. Check RLS policies are enabled in Supabase

### Issue: "Notifications not received"
**Solution**: Ensure notification triggers were created by running the SQL setup script

---

## 📝 Best Practices

### For Staff:
- ✅ Always check in at start of day
- ✅ Start breaks when leaving work area
- ✅ End breaks immediately upon return
- ✅ Submit leave requests in advance when possible
- ✅ Provide clear reasons for leave requests

### For Managers:
- ✅ Review pending requests promptly
- ✅ Add comments when rejecting to explain
- ✅ Be consistent with approval criteria
- ✅ Monitor break patterns for insights
- ✅ Use export features for records

---

## 🚀 Future Enhancements (Optional)

Potential additions you could request:
1. Break time limits/restrictions
2. Automatic break reminders
3. Leave balance tracking
4. Holiday calendar integration
5. Break patterns analytics
6. Bulk leave approval
7. Leave conflicts detection
8. Mobile push notifications
9. Break export in PDF/CSV
10. Custom leave types per company

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Verify SQL setup is complete
3. Check browser console for errors (F12)
4. Verify Supabase connection
5. Ask for help with specific error messages

---

## ✅ Checklist

Before going live:
- [ ] Run `ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql` in Supabase
- [ ] Test break tracking as staff
- [ ] Test leave request submission
- [ ] Test leave approval as CEO/Manager
- [ ] Verify notifications are working
- [ ] Test on mobile devices
- [ ] Export attendance report (test)
- [ ] Check RLS policies (security)
- [ ] Brief staff on new features
- [ ] Set leave request guidelines

---

## 🎊 You're All Set!

The attendance system is now much more powerful with:
- ✅ Detailed break tracking
- ✅ Professional leave management
- ✅ Automated approvals workflow
- ✅ Clear separation of daily attendance and breaks

**Happy time tracking!** 🚀

---

*Last Updated: October 29, 2025*
*Version: 2.0 with Breaks & Leave Management*

