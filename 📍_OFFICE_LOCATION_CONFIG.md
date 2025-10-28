# 📍 Office Location Configuration

## 🏢 Office Details

**Location:** Sampa, Ghana  
**Coordinates:**
- **Latitude:** 7.952673
- **Longitude:** -2.698856

**Google Maps:** [View Office Location](https://maps.app.goo.gl/6iTYHQdTsbey9jkm8)

---

## 🎯 Current Settings

### In `src/components/rolebase/AttendanceBase.tsx`:

```typescript
const OFFICE_LOCATION = {
  latitude: 7.952673,   // Sampa office location
  longitude: -2.698856, // Sampa office location
  radius: 500,          // meters (500m = ~5 minute walk)
}

const DEV_MODE = true // Currently in DEVELOPMENT mode
```

---

## 🔧 Development vs Production

### 🟡 Development Mode (Current)
**Status:** `DEV_MODE = true`

**Behavior:**
- ✅ Location check is **bypassed**
- ✅ You can check in from **anywhere** (perfect for testing)
- ✅ GPS coordinates are still recorded
- ✅ Console shows distance from office
- ⚠️ Warning message displayed in UI

**When to use:**
- Testing the attendance system
- Working remotely
- Debugging location issues

### 🟢 Production Mode (For Real Use)
**Status:** `DEV_MODE = false`

**Behavior:**
- 🔒 Location check is **enforced**
- 🔒 Users must be within **500 meters** of office
- 🔒 Check-in/out only allowed at office location
- ✅ No warning message in UI

**To enable:**
1. Open `src/components/rolebase/AttendanceBase.tsx`
2. Find line 24
3. Change: `const DEV_MODE = true` → `const DEV_MODE = false`
4. Save and deploy

---

## 📏 Radius Settings

### Current: 500 meters (recommended)

**Distance Reference:**
- 100m = ~1-2 minute walk
- 200m = ~2-3 minute walk
- 500m = ~5-7 minute walk
- 1000m = ~10-12 minute walk

### Adjust if needed:

```typescript
radius: 500, // Change this number
```

**Considerations:**
- **Too small** (50-100m): GPS accuracy issues may prevent valid check-ins
- **Recommended** (200-500m): Balances security and flexibility
- **Too large** (1000m+): Users could check in from far away

---

## 🧪 Testing the Location

### Test Distance Calculation:

1. **Open the app** while at the office
2. **Open Browser Console** (F12)
3. **Click "Check In"** button
4. **Look for this message:**
   ```
   [DEV MODE] Location check bypassed. Distance from office: 15m
   ```
5. **Verify distance:**
   - **0-50m:** You're at the office! ✅
   - **50-200m:** You're very close
   - **200-500m:** Within acceptable range
   - **500m+:** Outside office radius

### If Distance Seems Wrong:

**Possible causes:**
- GPS accuracy issues (especially indoors)
- Phone/laptop GPS not calibrated
- Browser location permission set to "approximate"

**Solutions:**
- Enable "precise location" in browser settings
- Try near a window for better GPS signal
- Check coordinates on Google Maps match your actual building

---

## 🗺️ Verifying Coordinates

### Current Office Location:
📍 [**View on Google Maps**](https://maps.app.goo.gl/6iTYHQdTsbey9jkm8)

### To Verify:
1. Click the Google Maps link above
2. Blue marker should be at your office
3. If incorrect, get new coordinates:
   - Right-click on your office building in Google Maps
   - Click the coordinates at the top
   - Update `AttendanceBase.tsx` lines 18-19

---

## 🔒 Security Considerations

### Why Location Tracking?

✅ **Prevents fraud** - Users can't check in from home  
✅ **Accurate records** - Verify employees are physically present  
✅ **Compliance** - Meets labor law requirements  
✅ **Audit trail** - GPS coordinates stored with each record

### Privacy:

- ⚠️ Location is **only recorded during check-in/out**
- ⚠️ Not continuously tracked
- ⚠️ Only stores latitude/longitude (not full address)
- ⚠️ Users must grant permission each time

---

## 📋 Quick Reference

| Setting | Value | Purpose |
|---------|-------|---------|
| Latitude | 7.952673 | Office north/south position |
| Longitude | -2.698856 | Office east/west position |
| Radius | 500m | Acceptable check-in distance |
| DEV_MODE | `true` | Bypass location check (testing) |

---

## 🚀 Deployment Checklist

Before going live with real attendance tracking:

- [ ] Verified office coordinates are accurate
- [ ] Tested check-in from office location
- [ ] Confirmed GPS distance shows 0-50m
- [ ] Adjusted radius if needed (200-500m recommended)
- [ ] Set `DEV_MODE = false` in production
- [ ] Informed staff about location requirements
- [ ] Tested on multiple devices (phones, laptops)
- [ ] Checked browser permission prompts work

---

## 🐛 Troubleshooting

### "You must be within 500m of the office to check in"

**When DEV_MODE is false:**
1. Check console for actual distance
2. Verify you're at the office
3. Try near a window for better GPS
4. Check browser location permissions
5. Temporarily increase radius for testing

### GPS shows wrong location

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Check system location services are enabled
4. Try a different browser
5. Verify office coordinates are correct

### Still having issues?

- Set `DEV_MODE = true` to bypass checks
- Check console for detailed error messages
- Verify attendance table exists in Supabase
- Check RLS policies allow your user

---

**Location Set:** October 27, 2025  
**Developer:** Frank Bediako  
**Email:** frankbediako38@gmail.com  
**Version:** 1.0

