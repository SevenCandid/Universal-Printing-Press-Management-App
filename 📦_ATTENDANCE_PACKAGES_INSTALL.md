# 📦 Attendance Export Packages Installation

## Required Packages

To enable PDF and CSV export functionality in the attendance system, you need to install the following packages:

---

## 📥 Installation

Run this command in your project root:

```bash
npm install jspdf jspdf-autotable
```

Or if you're using yarn:

```bash
yarn add jspdf jspdf-autotable
```

Or if you're using pnpm:

```bash
pnpm add jspdf jspdf-autotable
```

---

## 📦 Package Details

### 1. **jsPDF**
- **Version:** Latest (^2.5.x)
- **Purpose:** Generate PDF documents in the browser
- **Documentation:** https://github.com/parallax/jsPDF
- **License:** MIT

### 2. **jspdf-autotable**
- **Version:** Latest (^3.8.x)
- **Purpose:** Generate tables in PDF documents
- **Documentation:** https://github.com/simonbengtsson/jsPDF-AutoTable
- **License:** MIT

---

## ✅ Verification

After installation, verify the packages are installed:

```bash
npm list jspdf jspdf-autotable
```

You should see:
```
├── jspdf@2.5.x
└── jspdf-autotable@3.8.x
```

---

## 🔧 TypeScript Types

The packages come with TypeScript definitions. If you encounter type errors, you may need to add type declarations:

Create `src/types/jspdf-autotable.d.ts`:

```typescript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'jspdf'"

**Solution:**
1. Delete `node_modules` folder
2. Delete `package-lock.json` (or `yarn.lock`)
3. Run `npm install` again
4. Restart your dev server

### Error: "autoTable is not a function"

**Solution:**
Make sure you imported both packages:
```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable' // ✅ This is required!
```

### Build Error in Production

**Solution:**
Add to `next.config.js`:
```javascript
module.exports = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  }
}
```

---

## 🎯 Features Enabled

After installing these packages, the attendance system will have:

✅ **CSV Export**
- Export attendance records to CSV format
- Includes all columns: Date, Staff Name, Email, Check-In, Check-Out, Work Hours, Status
- Filename format: `attendance_YYYY-MM-DD_to_YYYY-MM-DD.csv`

✅ **PDF Export**
- Professional PDF reports with tables
- Includes report title and period information
- Shows staff filter if applied
- Multi-page support with page numbers
- Filename format: `attendance_YYYY-MM-DD_to_YYYY-MM-DD.pdf`

---

## 🚀 Usage

Once installed, the export buttons will appear in the attendance page:

1. **Click "Filters" button** to open filters panel
2. **Select your period** (Today, This Week, This Month, etc.)
3. **Select staff member** (Managers/CEO only)
4. **Click "CSV" or "PDF"** in the export section
5. **File downloads automatically** to your downloads folder

---

## 📊 Export Examples

### CSV Export Sample:
```csv
"Date","Staff Name","Email","Check-In","Check-Out","Work Hours","Status"
"10/27/2025","John Doe","john@example.com","8:00:00 AM","5:00:00 PM","9h 0m","CHECKED OUT"
"10/27/2025","Jane Smith","jane@example.com","9:00:00 AM","6:00:00 PM","9h 0m","CHECKED OUT"
```

### PDF Export Sample:
- Header: "Attendance Report"
- Period: "2025-10-01 to 2025-10-31"
- Staff: (if filtered)
- Table with all records
- Footer: Page numbers

---

## 🔒 Browser Compatibility

Both packages work in all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

---

## 💾 File Size

After installation:
- **jspdf**: ~160 KB
- **jspdf-autotable**: ~25 KB
- **Total**: ~185 KB added to your bundle

This is acceptable for the functionality provided.

---

## 📝 Alternative Export Methods

If you don't want to use jsPDF, you can:

1. **CSV only** - Remove jsPDF, keep CSV export (no dependencies needed)
2. **Server-side PDF** - Use Node.js libraries like `pdfkit` or `puppeteer`
3. **Print to PDF** - Use `window.print()` and browser's "Save as PDF" feature

---

## ✅ Installation Complete!

After running the install command:

- [ ] Packages installed successfully
- [ ] No errors in terminal
- [ ] Dev server restarted
- [ ] Attendance page loads without errors
- [ ] Export buttons are visible
- [ ] CSV export works
- [ ] PDF export works

---

**Developer:** Frank Bediako  
**Email:** frankbediako38@gmail.com  
**Last Updated:** October 27, 2025

