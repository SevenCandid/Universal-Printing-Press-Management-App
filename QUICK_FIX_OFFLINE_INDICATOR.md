# 🔧 Quick Fix: Offline Indicator Not Showing

## ✅ What I Just Did

Changed `FORCE_SHOW` from `false` to `true` in:
- **File:** `src/components/ui/OfflineIndicator.tsx`
- **Line:** 10

This will make the offline indicator **ALWAYS VISIBLE** so you can see it working.

---

## 🎯 Now It Will Show:

The floating badge (bottom-right corner) will appear with:
- **When Online:** Blue badge showing "0 pending" or pending count
- **When Offline:** Red pulsing badge showing "Offline Mode"

---

## 📋 Next Steps

### Step 1: Refresh Your App
Just refresh the page (F5) and you should see the indicator appear in the bottom-right corner.

### Step 2: Test Offline Mode
1. **Open DevTools** (F12)
2. Go to **Network** tab
3. Change from "No throttling" to **"Offline"**
4. Badge should turn **RED** and pulse
5. Click it to see details

### Step 3: Test Online Mode  
1. Change back to **"No throttling"**
2. Badge should turn **BLUE** (or disappear if no pending items)

---

## 🔧 If You Want Auto-Show (Production Mode)

When you're ready for production, change it back to:

```typescript
// In src/components/ui/OfflineIndicator.tsx line 10
const FORCE_SHOW = false;  // Only show when offline or pending items
```

This way:
- ✅ Shows automatically when offline
- ✅ Shows when there are pending sync items
- ✅ Hides when online with nothing pending (clean UI)

---

## ✅ Current Settings

```typescript
FORCE_SHOW = true   → Always visible (for testing)
FORCE_SHOW = false  → Auto-show when needed (for production)
```

---

**Just refresh your page now and it should appear!** 🎉

