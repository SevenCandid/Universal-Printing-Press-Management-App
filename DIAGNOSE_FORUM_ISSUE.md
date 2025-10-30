# 🔍 Forum Diagnostic Tool

## Run This in Browser Console (F12)

Copy and paste this entire script into your browser console while on the forum page:

```javascript
console.log('🔍 ===== FORUM DIAGNOSTIC TOOL =====\n');

(async function diagnose() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Check if Supabase client exists
  console.log('1️⃣ Checking Supabase client...');
  if (typeof supabase === 'undefined') {
    results.failed.push('❌ Supabase client not found');
    console.error('❌ FAIL: Supabase is not defined');
  } else {
    results.passed.push('✅ Supabase client exists');
    console.log('✅ PASS: Supabase client found');
  }

  // Test 2: Check authentication
  console.log('\n2️⃣ Checking authentication...');
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data?.user) {
      results.passed.push(`✅ Authenticated as: ${data.user.email}`);
      console.log('✅ PASS: User authenticated');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
    } else {
      results.failed.push('❌ Not authenticated');
      console.error('❌ FAIL: No user found');
    }
  } catch (e) {
    results.failed.push('❌ Auth error: ' + e.message);
    console.error('❌ FAIL: Auth error:', e);
  }

  // Test 3: Check if forum_posts table exists
  console.log('\n3️⃣ Checking forum_posts table...');
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        results.failed.push('❌ forum_posts table does not exist');
        console.error('❌ FAIL: Table "forum_posts" does not exist');
        console.error('   FIX: Run CREATE_FORUM_TABLES.sql in Supabase');
      } else if (error.code === '42501') {
        results.warnings.push('⚠️  forum_posts exists but RLS may be blocking access');
        console.warn('⚠️  WARNING: Permission denied for forum_posts');
        console.warn('   FIX: Check RLS policies in Supabase');
      } else {
        results.failed.push(`❌ forum_posts error: ${error.message}`);
        console.error('❌ FAIL: Error accessing forum_posts:', error);
      }
    } else {
      results.passed.push('✅ forum_posts table accessible');
      console.log('✅ PASS: forum_posts table exists and accessible');
      console.log('   Posts found:', data?.length || 0);
    }
  } catch (e) {
    results.failed.push('❌ forum_posts check failed: ' + e.message);
    console.error('❌ FAIL: Unexpected error:', e);
  }

  // Test 4: Check if forum_comments table exists
  console.log('\n4️⃣ Checking forum_comments table...');
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        results.failed.push('❌ forum_comments table does not exist');
        console.error('❌ FAIL: Table "forum_comments" does not exist');
        console.error('   FIX: Run CREATE_FORUM_TABLES.sql in Supabase');
      } else if (error.code === '42501') {
        results.warnings.push('⚠️  forum_comments exists but RLS may be blocking');
        console.warn('⚠️  WARNING: Permission denied for forum_comments');
      } else {
        results.failed.push(`❌ forum_comments error: ${error.message}`);
        console.error('❌ FAIL: Error accessing forum_comments:', error);
      }
    } else {
      results.passed.push('✅ forum_comments table accessible');
      console.log('✅ PASS: forum_comments table exists and accessible');
    }
  } catch (e) {
    results.failed.push('❌ forum_comments check failed');
    console.error('❌ FAIL: Unexpected error:', e);
  }

  // Test 5: Check profiles table
  console.log('\n5️⃣ Checking profiles table...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .limit(1);
    
    if (error) {
      results.warnings.push('⚠️  profiles table issue: ' + error.message);
      console.warn('⚠️  WARNING: Cannot access profiles table:', error);
    } else {
      results.passed.push('✅ profiles table accessible');
      console.log('✅ PASS: profiles table accessible');
    }
  } catch (e) {
    results.warnings.push('⚠️  profiles check failed');
    console.warn('⚠️  WARNING: Unexpected error:', e);
  }

  // Test 6: Try to insert a test post
  console.log('\n6️⃣ Testing post creation...');
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      results.warnings.push('⚠️  Cannot test post creation - not authenticated');
      console.warn('⚠️  SKIP: Not authenticated, cannot test insert');
    } else {
      const testPost = {
        title: '[TEST] Diagnostic Test Post - IGNORE',
        content: 'This is a test post created by the diagnostic tool. You can delete this.',
        category: 'discussion',
        author_id: userData.user.id,
        is_announcement: false,
        is_pinned: false
      };

      const { data, error } = await supabase
        .from('forum_posts')
        .insert([testPost])
        .select();

      if (error) {
        results.failed.push('❌ Cannot create posts: ' + error.message);
        console.error('❌ FAIL: Cannot insert post');
        console.error('   Error:', error);
        console.error('   Code:', error.code);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
        
        if (error.code === '42501') {
          console.error('\n   🔧 FIX: RLS policy blocking insert');
          console.error('   Check if "Users can create posts" policy exists in Supabase');
        }
      } else {
        results.passed.push('✅ Can create posts');
        console.log('✅ PASS: Successfully created test post');
        console.log('   Post ID:', data[0]?.id);
        
        // Clean up test post
        await supabase
          .from('forum_posts')
          .delete()
          .eq('id', data[0]?.id);
        console.log('   (Test post deleted)');
      }
    }
  } catch (e) {
    results.failed.push('❌ Post creation test failed: ' + e.message);
    console.error('❌ FAIL: Unexpected error during insert test:', e);
  }

  // Test 7: Check browser notifications
  console.log('\n7️⃣ Checking browser notifications...');
  if (!('Notification' in window)) {
    results.failed.push('❌ Browser notifications not supported');
    console.error('❌ FAIL: Notifications not supported in this browser');
  } else {
    const permission = Notification.permission;
    if (permission === 'granted') {
      results.passed.push('✅ Browser notifications enabled');
      console.log('✅ PASS: Notification permission granted');
    } else if (permission === 'denied') {
      results.warnings.push('⚠️  Browser notifications blocked');
      console.warn('⚠️  WARNING: Notification permission denied');
      console.warn('   FIX: Click lock icon in address bar → Allow notifications');
    } else {
      results.warnings.push('⚠️  Browser notifications not requested yet');
      console.warn('⚠️  WARNING: Notification permission not requested');
      console.warn('   FIX: Click "Enable Notifications" on forum page');
    }
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  console.log('\n✅ PASSED (' + results.passed.length + '):');
  results.passed.forEach(item => console.log('  ' + item));
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (' + results.warnings.length + '):');
    results.warnings.forEach(item => console.log('  ' + item));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED (' + results.failed.length + '):');
    results.failed.forEach(item => console.log('  ' + item));
    
    console.log('\n\n🔧 RECOMMENDED FIXES:');
    
    if (results.failed.some(f => f.includes('does not exist'))) {
      console.log('\n1. RUN DATABASE MIGRATIONS:');
      console.log('   → Open Supabase Dashboard → SQL Editor');
      console.log('   → Run CLEANUP_FORUM_TABLES.sql');
      console.log('   → Run CREATE_FORUM_TABLES.sql');
      console.log('   → Run ADD_FORUM_NOTIFICATIONS.sql');
    }
    
    if (results.failed.some(f => f.includes('permission denied') || f.includes('42501'))) {
      console.log('\n2. CHECK RLS POLICIES:');
      console.log('   → Supabase Dashboard → Authentication → Policies');
      console.log('   → Make sure these policies exist for forum_posts:');
      console.log('     • Anyone can view forum posts');
      console.log('     • Users can create posts');
      console.log('     • Authors can update their own posts');
      console.log('     • Authors can delete their own posts');
    }
    
    if (results.failed.some(f => f.includes('Not authenticated'))) {
      console.log('\n3. AUTHENTICATION ISSUE:');
      console.log('   → Logout and login again');
      console.log('   → Clear browser cache');
      console.log('   → Check if session is valid');
    }
  } else if (results.warnings.length === 0) {
    console.log('\n\n🎉 ALL TESTS PASSED!');
    console.log('Your forum should be working correctly.');
    console.log('If you still have issues, check:');
    console.log('  • Browser console for other errors');
    console.log('  • Supabase Realtime is enabled');
    console.log('  • Network connectivity');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🔍 End of Diagnostic Report');
  console.log('='.repeat(50) + '\n');
})();
```

---

## What This Does:

This diagnostic script will:

1. ✅ Check if Supabase is configured
2. ✅ Check if you're logged in
3. ✅ Check if `forum_posts` table exists
4. ✅ Check if `forum_comments` table exists
5. ✅ Check if `profiles` table is accessible
6. ✅ Test creating a post (and delete it)
7. ✅ Check browser notification permission

---

## How to Use:

1. **Open your forum page** in the browser
2. **Press F12** to open Developer Console
3. **Copy the entire script** above (from ```javascript to ```)
4. **Paste into console** and press Enter
5. **Read the results**

---

## Understanding Results:

### ✅ If ALL tests pass:
Your database is set up correctly! The issue might be:
- Real-time not enabled in Supabase
- Network connectivity
- Browser cache

### ❌ If "table does not exist":
**FIX:** You need to run database migrations

1. Go to **Supabase → SQL Editor**
2. Run these files **in order**:
   - `CLEANUP_FORUM_TABLES.sql`
   - `CREATE_FORUM_TABLES.sql`
   - `ADD_FORUM_NOTIFICATIONS.sql`

### ❌ If "permission denied" or error code 42501:
**FIX:** RLS (Row Level Security) policies are blocking you

1. Go to **Supabase → Authentication → Policies**
2. Find `forum_posts` table
3. Make sure these policies exist:
   - "Anyone can view forum posts"
   - "Users can create posts"
   - "Authors can update their own posts"
   - "Authors can delete their own posts"

If missing, re-run `CREATE_FORUM_TABLES.sql`

### ❌ If "Not authenticated":
**FIX:** Authentication issue

1. Logout from the app
2. Clear browser cookies/cache
3. Login again
4. Try again

---

## After Running Diagnostic:

**Copy the results** and share them if you need help:
- The summary will show what passed/failed
- The errors will point to exactly what's wrong
- The recommended fixes will tell you what to do

---

## Common Error Codes:

| Code | Meaning | Fix |
|------|---------|-----|
| 42P01 | Table doesn't exist | Run CREATE_FORUM_TABLES.sql |
| 42501 | Permission denied | Check RLS policies |
| 08006 | Connection failure | Check network/Supabase status |
| PGRST116 | No rows found | Table is empty (OK) |

---

## Next Steps:

1. **Run the diagnostic** (copy script above)
2. **Read the summary**
3. **Follow the recommended fixes**
4. **Run diagnostic again** to verify fix
5. **Report results** if still not working

---

**The diagnostic will tell you EXACTLY what's wrong!** 🎯




