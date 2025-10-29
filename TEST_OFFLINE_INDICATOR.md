# 🧪 Testing Offline Indicator

## ✅ Changes Made

1. **Added debugging logs** - Console will show why indicator is visible/hidden
2. **Fixed hydration issues** - Won't render until component is mounted  
3. **Added FORCE_SHOW flag** - Can force indicator to always show for testing
4. **Enhanced accessibility** - Added aria-labels

---

## 🔍 How to Debug

### Step 1: Open Browser Console (F12)

Look for these logs:
```
[OfflineIndicator] Component mounted
[OfflineIndicator] Initial online status: true
[OfflineIndicator] Pending sync count: 0
[OfflineIndicator] Render check: { 
  mounted: true,
  online: true, 
  pendingCount: 0, 
  shouldShow: false,
  FORCE_SHOW: false 
}
[OfflineIndicator] Hidden - all conditions false
```

---

## 🧪 Test Scenarios

### Test 1: Force Show (Quick Test)

**Edit:** `src/components/ui/OfflineIndicator.tsx`

Change line 10:
```typescript
// From:
const FORCE_SHOW = false;

// To:
const FORCE_SHOW = true;
```

**Result:** Indicator should ALWAYS show (even when online with no pending items)

---

### Test 2: Go Offline

**Method A: Browser DevTools**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Select **"Offline"** from throttling dropdown
4. Console should show:
   ```
   [OfflineIndicator] ⚠️ Connection lost - going offline
   [OfflineIndicator] Render check: { online: false, shouldShow: true }
   [OfflineIndicator] 🎯 SHOWING indicator!
   ```
5. **Red pulsing badge** should appear bottom-right

**Method B: WiFi Off**
1. Turn off WiFi on your device
2. Same console logs as above
3. Indicator appears

---

### Test 3: Pending Sync Items

**Add item to sync queue:**

Open browser console and run:
```javascript
// Import the function
import { addToSyncQueue } from '@/lib/offlineStorage';

// Add test item
addToSyncQueue({
  type: 'CREATE',
  table: 'orders',
  data: { test: 'data' }
});
```

**Or create offline data:**
1. Go offline
2. Try to create an order/expense
3. It will be queued
4. Go back online
5. **Blue badge** with "1 pending" should show

---

## 🐛 Troubleshooting

### Issue: Still Not Showing

**Check Console Logs:**

#### Scenario 1: Not Mounted
```
// No logs at all
```
**Fix:** Component not rendering. Check layout.tsx has `<OfflineIndicator />`

#### Scenario 2: Online + No Pending
```
[OfflineIndicator] Render check: { 
  online: true,     ← ONLINE
  pendingCount: 0,  ← NO PENDING
  shouldShow: false ← WON'T SHOW
}
```
**Expected:** This is normal! Indicator only shows when needed.

**To Test:** 
- Set `FORCE_SHOW = true`, OR
- Go offline, OR
- Create pending sync items

#### Scenario 3: Mounted but Hidden
```
[OfflineIndicator] Component mounted
[OfflineIndicator] Render check: { mounted: false }
// Returns null
```
**Fix:** Mounting state issue. Hard refresh (Ctrl+Shift+R)

---

### Issue: Shows But Disappears Immediately

**Console Shows:**
```
[OfflineIndicator] 🎯 SHOWING indicator!
// Then immediately:
[OfflineIndicator] Hidden - all conditions false
```

**Cause:** State changing rapidly

**Fix:** 
1. Check `isOnline()` function is stable
2. Check `getPendingSyncCount()` not erroring
3. Look for errors in console

---

## 📊 Expected Behavior

### When ONLINE + NO PENDING:
```
Indicator: HIDDEN ✅
Console: "Hidden - all conditions false"
```

### When OFFLINE:
```
Indicator: VISIBLE (Red Pulsing) 🔴
Text: "Offline Mode"
Console: "🎯 SHOWING indicator!"
```

### When ONLINE + PENDING ITEMS:
```
Indicator: VISIBLE (Blue Badge) 🔵
Text: "3 pending"
Console: "🎯 SHOWING indicator!"
```

### When FORCE_SHOW = true:
```
Indicator: ALWAYS VISIBLE
Console: "FORCE_SHOW: true, shouldShow: true"
```

---

## 🔧 Quick Fixes

### Fix 1: Force Show for Testing

```typescript
// src/components/ui/OfflineIndicator.tsx
const FORCE_SHOW = true; // ← Change to true
```

Refresh page → Indicator should appear

---

### Fix 2: Clear Service Worker Cache

```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});

// Then:
window.location.reload();
```

---

### Fix 3: Check Layout.tsx

```typescript
// Should have:
import OfflineIndicator from '@/components/ui/OfflineIndicator'

// Inside return:
<OfflineIndicator />
```

---

## 🎯 Manual Test Checklist

- [ ] Open app and check console
- [ ] See "Component mounted" log
- [ ] See "Initial online status" log  
- [ ] Set FORCE_SHOW = true
- [ ] Refresh → Should see indicator
- [ ] Set FORCE_SHOW = false
- [ ] Go offline (DevTools → Network → Offline)
- [ ] See red pulsing indicator
- [ ] Click indicator → See details panel
- [ ] Go back online
- [ ] Indicator disappears
- [ ] Console logs make sense

---

## 📝 Console Commands

### Check Current State:
```javascript
// Check if online
navigator.onLine

// Check OfflineIndicator is in DOM
document.querySelector('[aria-label*="Offline"]') || 
document.querySelector('[aria-label*="pending"]')
```

### Force Offline:
```javascript
// In console (simulates offline)
Object.defineProperty(navigator, 'onLine', {
  get: () => false
});
window.dispatchEvent(new Event('offline'));
```

### Force Online:
```javascript
Object.defineProperty(navigator, 'onLine', {
  get: () => true
});
window.dispatchEvent(new Event('online'));
```

---

## ✅ Success Criteria

Indicator working correctly when you see:

1. ✅ Console logs appear on page load
2. ✅ `FORCE_SHOW = true` makes it visible
3. ✅ Going offline makes it appear (red)
4. ✅ Going online makes it disappear
5. ✅ Pending items make it appear (blue)
6. ✅ Can click to see details
7. ✅ Can sync manually

---

## 🚀 Next Steps

1. **Check console logs** - What do they say?
2. **Try FORCE_SHOW = true** - Does it appear?
3. **Try going offline** - Does it appear?

**Report back what you see in the console!**

---

*Testing Guide for OfflineIndicator*  
*Last Updated: October 29, 2025*

