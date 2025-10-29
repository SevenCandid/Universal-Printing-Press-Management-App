# 🔍 Forum Notifications - Debug Guide

## Quick Checklist

Run through these steps to find the issue:

### ✅ Step 1: Check Database Setup

**Run this in Supabase SQL Editor:**
```sql
-- Check if notification triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_notify_new_forum_post', 'trigger_notify_new_forum_comment');
```

**Expected Result:**
- Should show 2 triggers
- If empty → Database migration not run

**Fix:** Run `ADD_FORUM_NOTIFICATIONS.sql` in Supabase

---

### ✅ Step 2: Check Browser Permission

**Open Browser Console (F12) and run:**
```javascript
console.log('Notification Permission:', Notification.permission);
console.log('Notifications Supported:', 'Notification' in window);
```

**Expected Result:**
```
Notification Permission: "granted"
Notifications Supported: true
```

**If permission is "default":**
- Click "Enable Notifications" button on forum page
- Allow when browser prompts

**If permission is "denied":**
- Click the lock/info icon in address bar
- Find "Notifications" 
- Change from "Block" to "Allow"
- Refresh page

---

### ✅ Step 3: Check Real-time Connection

**Open Browser Console and look for:**
```
[ForumNotificationProvider] Initializing...
[ForumNotificationProvider] Listening to forum_posts
[ForumNotificationProvider] Listening to forum_comments
```

**If you DON'T see these:**
- ForumNotificationProvider may not be loaded
- Check browser console for errors

---

### ✅ Step 4: Test Notification System

**In Browser Console, run this test:**
```javascript
new Notification('Test', { 
  body: 'If you see this, notifications work!',
  icon: '/icon-192x192.png'
});
```

**If notification appears:**
- Browser notifications work ✅
- Issue is with the app logic

**If notification doesn't appear:**
- Check browser/system notification settings
- Check "Do Not Disturb" mode
- Check notification volume/sound

---

### ✅ Step 5: Test Forum Notifications

1. **Open forum in TWO browser tabs/windows:**
   - Tab 1: Your main account
   - Tab 2: Incognito window with different account (or same account)

2. **In Tab 2:**
   - Create a new post
   - Watch Tab 1

3. **In Tab 1 (should see):**
   - Browser notification popup (if Tab 1 is in background)
   - In-app notification (bell icon)

4. **If Tab 1 shows nothing:**
   - Check Step 6 below

---

### ✅ Step 6: Check Console for Errors

**Open Browser Console (F12) on both tabs**

**Look for errors like:**
```
❌ Error: relation "forum_posts" does not exist
   → Run CREATE_FORUM_TABLES.sql

❌ Error: permission denied for table forum_posts
   → RLS policies not set up correctly

❌ Error: Cannot read property 'on' of undefined
   → Supabase client issue

❌ Notification permission denied
   → User blocked notifications
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "Database migration not run"

**Symptoms:**
- Console error: `relation "forum_posts" does not exist`
- No posts show up

**Fix:**
1. Open Supabase SQL Editor
2. Run `CLEANUP_FORUM_TABLES.sql` first
3. Then run `CREATE_FORUM_TABLES.sql`
4. Then run `ADD_FORUM_NOTIFICATIONS.sql`
5. Refresh browser

---

### Issue 2: "Notifications blocked"

**Symptoms:**
- Red "Notifications Blocked" banner on forum
- No browser notifications appear

**Fix:**
1. Click lock/info icon in browser address bar
2. Find "Notifications" setting
3. Change from "Block" to "Allow"
4. Refresh page
5. Click "Enable Notifications" again

---

### Issue 3: "No in-app notifications"

**Symptoms:**
- No notifications in bell icon (🔔)
- But database shows notifications exist

**Fix:**
1. Check if `notifications` table exists in Supabase
2. Check if triggers are creating records:
   ```sql
   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
   ```
3. If no records → Triggers not working
4. Re-run `ADD_FORUM_NOTIFICATIONS.sql`

---

### Issue 4: "Browser notifications not showing"

**Symptoms:**
- In-app notifications work (bell icon shows)
- But no browser popup appears

**Fix:**

**For Desktop:**
1. Check system notification settings (Windows/Mac)
2. Check "Do Not Disturb" mode is OFF
3. Check browser has permission to show notifications
4. Try: Chrome → Settings → Privacy → Site Settings → Notifications

**For Mobile:**
1. Check phone notification settings
2. Allow notifications for browser app
3. Check "Do Not Disturb" is OFF
4. On iOS: Install as PWA for better support

---

### Issue 5: "Real-time not working"

**Symptoms:**
- Need to refresh to see new posts
- Notifications only appear after refresh

**Fix:**
1. Check Supabase Realtime is enabled:
   - Go to Supabase → Database → Replication
   - Make sure `forum_posts` and `forum_comments` are enabled
   
2. Check browser console for websocket errors

3. Test real-time:
   ```javascript
   // In browser console
   const channel = supabase.channel('test');
   channel.subscribe((status) => {
     console.log('Realtime status:', status);
   });
   ```

---

### Issue 6: "Only seeing own notifications"

**Symptoms:**
- You get notified of your own posts
- Or you DON'T get notified at all

**Current Logic:**
- You should NOT be notified of your own posts
- You SHOULD be notified of others' posts

**Debug:**
Check in browser console:
```javascript
// This should be your user ID
supabase.auth.getUser().then(d => console.log('My ID:', d.data.user?.id));

// Check if post author matches
console.log('Post author ID:', post.author_id);

// Should NOT match for you to get notification
```

---

## 🧪 Manual Testing Steps

### Test 1: New Post Notification

1. Open forum in Browser Window A (logged in as User A)
2. Open forum in Incognito Window B (logged in as User B)
3. In Window B: Create a new post
4. In Window A: Should see notification popup (if in background)
5. Check Window A console for logs

### Test 2: Comment Notification

1. User A creates a post
2. User B comments on that post
3. User A should get notification
4. User B should NOT get notification (their own comment)

### Test 3: Multiple Users

1. User A creates post
2. User B comments
3. User C comments
4. Both User A and User B should get notified
5. User C should NOT get notified (their own comment)

---

## 📝 Debugging Checklist

Copy this and check off each item:

```
Database Setup:
[ ] CREATE_FORUM_TABLES.sql run successfully
[ ] ADD_FORUM_NOTIFICATIONS.sql run successfully
[ ] forum_posts table exists
[ ] forum_comments table exists
[ ] Triggers exist (check with SQL query)
[ ] notifications table has data (when posts created)

Browser Setup:
[ ] Notifications supported (Notification in window)
[ ] Permission is "granted" (not "default" or "denied")
[ ] No console errors
[ ] ForumNotificationProvider logs visible
[ ] Can create manual test notification

Real-time Setup:
[ ] Supabase Realtime enabled for forum_posts
[ ] Supabase Realtime enabled for forum_comments
[ ] WebSocket connection working
[ ] Channel subscriptions successful

Testing:
[ ] Two browser tabs/windows open
[ ] Different users in each
[ ] Post created in one tab
[ ] Notification appears in other tab
[ ] In-app notification (bell) works
[ ] Browser notification popup works
```

---

## 🆘 Still Not Working?

### Collect Debug Info

Run this in browser console and send results:

```javascript
console.log('=== NOTIFICATION DEBUG INFO ===');
console.log('1. Browser Support:', 'Notification' in window);
console.log('2. Permission:', Notification.permission);
console.log('3. Current User:', await supabase.auth.getUser());
console.log('4. Supabase Client:', !!supabase);
console.log('5. User Agent:', navigator.userAgent);

// Check database
const { data: posts } = await supabase.from('forum_posts').select('id').limit(1);
console.log('6. Can read posts:', !!posts);

const { data: comments } = await supabase.from('forum_comments').select('id').limit(1);
console.log('7. Can read comments:', !!comments);

// Check triggers
const { data: triggers } = await supabase.rpc('pg_trigger').select();
console.log('8. Triggers data:', triggers);

console.log('=== END DEBUG INFO ===');
```

### Send This Info:
1. Console output from above
2. Browser name and version
3. Operating system
4. Screenshots of any errors
5. What you've tried so far

---

## ✅ Success Indicators

You'll know it's working when:

1. **Forum page shows:**
   - Green "✅ Notifications Enabled" banner at top

2. **Browser console shows:**
   ```
   [ForumNotificationProvider] Initializing...
   Notification Status: {supported: true, permission: "granted", enabled: true}
   ```

3. **Creating a post in another tab triggers:**
   - Browser notification popup (if tab is in background)
   - Sound/vibration (if enabled)
   - Notification in bell icon

4. **Database has records:**
   ```sql
   SELECT COUNT(*) FROM notifications WHERE type IN ('forum_post', 'forum_comment');
   -- Should show > 0
   ```

---

## 📞 Get Help

If still not working after trying all steps:

**Email:** frankbediako38@gmail.com
**Subject:** Forum Notifications Not Working

**Include:**
- Debug info output (from above)
- Screenshots of errors
- What you've tried
- Browser/OS info

