# 🔧 Attendance Location Setup Guide

## ✅ Office Location Set!

### 🏢 Current Configuration

**Location:** Sampa, Ghana  
**Coordinates:** 7.952673, -2.698856  
**Google Maps:** [View Location](https://maps.app.goo.gl/6iTYHQdTsbey9jkm8)  
**Radius:** 500 meters  
**DEV_MODE:** `true` (location check bypassed for testing)

---

## 🎯 What's Been Done

### 1. **Office Coordinates Set** ✅
```tsx
latitude: 7.952673   // Sampa office
longitude: -2.698856 // Sampa office
```

### 2. **DEV_MODE Enabled** ✅
```tsx
const DEV_MODE = true  // Location check is now BYPASSED
```

**Result:** You can check in/out from anywhere for testing!

### 3. **Radius Set to 500m** ✅
```tsx
radius: 500  // ~5 minute walk from office
```

### 4. **Better Error Messages** ✅
- Shows actual distance from office
- Console logs distance in DEV_MODE
- Orange warning indicator when DEV_MODE is active

---

## 🎯 Next Steps

### For Testing (Current Setup)

**Current Status:**
- ✅ Office coordinates configured (Sampa)
- ✅ Location check is **disabled** (DEV_MODE)
- ✅ You can check in/out from anywhere
- ✅ Perfect for testing the system

**No action needed** - system is ready for testing!

---

### For Production (When Ready)

When you're ready to enforce location-based check-ins:

1. **Open** `src/components/rolebase/AttendanceBase.tsx`
2. **Find line 24:**
   ```tsx
   const DEV_MODE = true
   ```
3. **Change to:**
   ```tsx
   const DEV_MODE = false
   ```
4. **Save and deploy**

Now users must be within 500m of the Sampa office to check in!

---

## 🧪 Testing Your Location

To verify the coordinates are correct:

1. **Go to the office** (Sampa location)
2. **Open the attendance page**
3. **Open browser console** (F12)
4. **Click "Check In"**
5. **Look for this message:**
   ```
   [DEV MODE] Location check bypassed. Distance from office: 15m
   ```

**Expected Results:**
- **0-50m:** Perfect! You're right at the office ✅
- **50-200m:** Very close, coordinates are good ✅
- **200-500m:** Within range, acceptable ✅
- **500m+:** Coordinates might need adjustment ⚠️

---

## 📝 If You Need to Update Coordinates

### Option 1: Get New Coordinates from Google Maps

#### Method 1: Google Maps (Easiest)

1. **Open Google Maps** → https://maps.google.com
2. **Find your office location**
3. **Right-click on the exact office spot**
4. **Click the coordinates** at the top of the menu (they'll be copied)
5. **Example:** `6.6884, -1.6244` (Format: latitude, longitude)

#### Method 2: GPS Coordinate Sites

1. Visit https://www.gps-coordinates.net/
2. Enter your office address
3. Get latitude and longitude

#### Method 3: Use Your Phone

1. Open Google Maps on your phone
2. Long-press on your office location
3. Coordinates appear at the top
4. Share them to yourself

---

## 📝 Update the Code

Once you have your coordinates:

**File:** `src/components/rolebase/AttendanceBase.tsx`

**Lines 16-23:**

```tsx
// 📍 Set your office coordinates
const OFFICE_LOCATION = {
  latitude: 6.6884,    // ← Replace with YOUR latitude
  longitude: -1.6244,  // ← Replace with YOUR longitude
  radius: 500,         // ← Keep 500m for tolerance
}

// 🔧 Development mode
const DEV_MODE = false  // ← Set to false when coordinates are correct
```

---

## 🧪 Testing Your Coordinates

### Step 1: Update Coordinates
```tsx
latitude: YOUR_OFFICE_LATITUDE
longitude: YOUR_OFFICE_LONGITUDE
```

### Step 2: Test with DEV_MODE ON
```tsx
DEV_MODE = true
```

1. Go to attendance page
2. Click "Check In"
3. Check browser console (F12)
4. Look for: `[DEV MODE] Distance from office: XXXm`

### Step 3: Verify Distance

**If distance shows 0-500m:**
- ✅ Coordinates are correct!
- Set `DEV_MODE = false`

**If distance shows >1000m:**
- ❌ Coordinates might be wrong
- Double-check your coordinates
- Try getting them again

---

## 📍 Example Coordinates

Here are some example coordinates for reference:

| City | Latitude | Longitude |
|------|----------|-----------|
| Accra, Ghana | 5.6037 | -0.1870 |
| Kumasi, Ghana | 6.6884 | -1.6244 |
| Sunyani, Ghana | 7.3333 | -2.3333 |
| Tamale, Ghana | 9.4034 | -0.8424 |
| Cape Coast, Ghana | 5.1053 | -1.2466 |

**Note:** These are city centers. You need your **exact office location**.

---

## 🔍 How Distance Calculation Works

The system uses the **Haversine formula** to calculate distance:

```
1. Get your GPS coordinates
2. Get office coordinates
3. Calculate distance in meters
4. If distance ≤ 500m → Allow check-in
5. If distance > 500m → Block check-in
```

**Typical GPS Accuracy:**
- Good signal: ±5-10 meters
- Indoor: ±20-50 meters
- Poor signal: ±100+ meters

**That's why we use 500m radius** - to account for GPS errors!

---

## 🎯 Current Status

### What's Working Now:

✅ **DEV_MODE is ON**
- Location check bypassed
- You can check in/out from anywhere
- Orange warning shows "DEV MODE: Location verification disabled"

✅ **Radius increased to 500m**
- More forgiving when GPS is slightly off
- Better for large office buildings

✅ **Better error messages**
- Shows actual distance
- Helps you verify coordinates

### Next Steps:

1. **For Testing:** Keep DEV_MODE on, test the system
2. **For Production:** 
   - Get your office coordinates
   - Update lines 17-18 in `AttendanceBase.tsx`
   - Set `DEV_MODE = false`
   - Test check-in from office

---

## 🚨 Important Notes

### GPS Accuracy Issues:

**Indoors:**
- GPS signal weaker
- Accuracy: ±20-50m
- May need larger radius

**Tall Buildings:**
- Signal bounces off buildings
- Can add 50-100m error
- Increase radius if needed

**Weather:**
- Rain/clouds reduce accuracy
- Indoor areas more affected

**Solution:**
- Use 500m radius (current setting)
- Or increase to 1000m if needed

---

## 🔧 Troubleshooting

### "You must be within 500m of office"

**Even with correct coordinates?**

**Solutions:**

1. **Increase radius:**
```tsx
radius: 1000,  // Try 1km
```

2. **Check GPS accuracy:**
- Open Google Maps on your phone
- See how accurate your location is
- Blue dot size = accuracy range

3. **Use DEV_MODE for now:**
```tsx
DEV_MODE = true
```

### "Location permission denied"

**Solutions:**
- Browser settings → Allow location for this site
- If using HTTP → Switch to HTTPS (geolocation requires HTTPS)
- Check browser location settings

### Distance shows very large number (e.g., 50,000m)

**Problem:** Coordinates are wrong

**Solutions:**
1. Double-check latitude and longitude
2. Make sure latitude comes first
3. Verify you copied all decimal places
4. Try getting coordinates again

---

## 📱 Mobile vs Desktop

### Mobile:
- ✅ Better GPS accuracy
- ✅ Uses phone's GPS chip
- ✅ Works outdoor and indoor

### Desktop:
- ⚠️ Uses WiFi positioning
- ⚠️ Less accurate (±100m)
- ⚠️ May need larger radius

**Recommendation:**
- Staff use mobile devices for check-in
- Or increase radius for desktop users

---

## 🎉 Quick Start (Your Current Setup)

**Right now, you can:**

1. ✅ Go to `/attendance` page
2. ✅ Click "Check In"
3. ✅ Allow location permission
4. ✅ Check in successfully (DEV_MODE bypasses location)
5. ✅ Work your shift
6. ✅ Click "Check Out"
7. ✅ See work hours calculated

**No location restrictions until you set DEV_MODE = false!**

---

## 📞 Need Help?

### To verify your setup:

1. Open browser console (F12)
2. Go to attendance page
3. Click "Check In"
4. Look for console message:
```
[DEV MODE] Location check bypassed. Distance from office: XXXm
```

This tells you how far you are from the configured office location!

---

## ✅ Summary

**What I Fixed:**
- ✅ Added DEV_MODE toggle (currently ON)
- ✅ Increased radius to 500m
- ✅ Better error messages
- ✅ Console logging for debugging
- ✅ Visual indicator when DEV_MODE is active

**What You Need to Do:**
- 🔧 **For Testing:** Nothing! System works now
- 📍 **For Production:** Get office coordinates and update code
- 🎯 **When Ready:** Set `DEV_MODE = false`

**Current State:**
- 🟢 **Working:** Check-in/out works anywhere (DEV_MODE)
- 🟡 **To Do:** Set actual office coordinates for production

---

**Developer:** Frank Bediako  
**Email:** frankbediako38@gmail.com

**The attendance system now works! You can check in/out from anywhere while DEV_MODE is enabled! 🎉⏰**

