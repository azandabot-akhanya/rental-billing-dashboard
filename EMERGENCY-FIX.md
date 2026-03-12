# 🚨 EMERGENCY FIX - 10 Minutes

## Problem: 404 Errors
The issue is that files are NOT in the correct location on your server.

---

## ⚡ QUICK FIX (Use FileZilla RIGHT NOW)

### Step 1: Delete Everything on Server (1 min)
1. Open FileZilla
2. Connect: `197.242.150.197` / `admin@thynkxpro-dpl.co.za` / `Wesley123@123`
3. **DELETE these if they exist:**
   - Any `out` folder
   - Any `app` folder
   - Old HTML files

### Step 2: Upload ONLY These Files (3 mins)

**A. Upload PHP Files to `/api/`**

Go to local: `/Users/siyandazama/Documents/rental-billing-dashboard/app/api/`

Select ALL `.php` files and drag to server `/api/` folder:
- ApiController.php
- CalendarController.php
- CompanyController.php
- DashboardController.php
- DepositController.php
- DocumentController.php
- EmailService.php
- ExpenseController.php
- InvoiceController.php
- LeaseController.php
- PropertyController.php
- StockController.php
- SupplierController.php
- TenantController.php
- TransactionController.php
- UserController.php
- UtilityController.php
- **db.php** (already has credentials)

**B. Upload Static Files to ROOT `/`**

Go to local: `/Users/siyandazama/Documents/rental-billing-dashboard/out/`

**SELECT EVERYTHING INSIDE `out` folder** (NOT the out folder itself!)
- index.html
- _next/ folder
- All other .html files
- All folders

**Drag to server ROOT `/`** (or `/public_html/` if that's your root)

### Step 3: Upload .htaccess (1 min)

Local: `/Users/siyandazama/Documents/rental-billing-dashboard/.htaccess.production`

1. Rename to `.htaccess` (remove .production)
2. Upload to server ROOT `/`

Enable hidden files: Server menu → "Force showing hidden files"

### Step 4: Create folders (1 min)

On server:
1. Create `/uploads/` folder
2. Inside uploads, create `/tenant-documents/` folder
3. Right-click each → File Permissions → Set to `775`

---

## ✅ Your Server Should Look Like This:

```
/ (root)
├── .htaccess                 ← From .htaccess.production
├── index.html               ← From out/index.html
├── dashboard.html           ← From out/dashboard.html
├── _next/                   ← From out/_next/
│   ├── static/
│   └── ...
├── api/                     ← PHP files here
│   ├── db.php
│   ├── ApiController.php
│   ├── CalendarController.php
│   └── ... (all 17 PHP files)
└── uploads/
    └── tenant-documents/
```

---

## 🧪 Test IMMEDIATELY

### Test 1: Homepage
http://thynkxpro-dpl.co.za

**Should show:** Login page

### Test 2: API
http://thynkxpro-dpl.co.za/api/companies?company_id=1

**Should show:** JSON response (not 404)

---

## 🐛 Still 404? Check This:

### FileZilla Check:
1. Are you in the RIGHT root folder?
   - Try `/public_html/` if `/` doesn't work
   - Your host might use a different root

2. Are files REALLY there?
   - Navigate to `/` in FileZilla
   - You should see `index.html` directly in root
   - You should see `api/` folder in root

### Wrong Structure (CAUSES 404):
```
❌ WRONG:
/out/
  └── index.html

❌ WRONG:
/app/
  └── api/
```

### Correct Structure:
```
✅ CORRECT:
/index.html        ← Directly in root
/api/              ← Directly in root
  └── *.php
```

---

## 🔥 If Still Failing - Alternative URLs

Your server might be using `/public_html/` as root. Try:

1. Upload everything to `/public_html/` instead of `/`
2. Test: http://thynkxpro-dpl.co.za

---

## ⏰ 2-Minute Nuclear Option

If FileZilla is failing, use SSH:

```bash
ssh admin@thynkxpro-dpl.co.za@197.242.150.197
cd /public_html  # or / or /home/admin@thynkxpro-dpl.co.za/public_html
ls -la
```

See what's actually there, then:

```bash
# Clear everything
rm -rf *
rm -f .htaccess

# Then use FileZilla to upload fresh
```

---

## 📱 During Presentation

If it's still not working:

**Plan B:** Use localhost

1. Run your local server:
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
php -S localhost:8000 -t app/api &
npm run dev
```

2. Share your screen with `http://localhost:3000`
3. Tell client "this is the development environment, production deployment in progress"

---

**The KEY issue:** Files must be in ROOT, not in subfolders!
