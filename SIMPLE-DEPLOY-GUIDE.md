# Simple Deployment Guide - ThynkxPro

## Your Server Info
- **Host:** 197.242.150.197
- **Username:** admin@thynkxpro-dpl.co.za
- **Password:** Wesley123@123
- **Domain:** thynkxpro-dpl.co.za

## Server Structure
```
Server Root:
├── api/          ← Upload all PHP files here
└── /             ← Upload all static files (from 'out' folder) here
```

---

## Option 1: Automatic Deployment (Recommended)

### Step 1: Run the deployment script

```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
./deploy-ftp.sh
```

This will automatically:
- Build your application
- Upload PHP API files to `/api/`
- Upload static files to root `/`
- Set permissions

---

## Option 2: Manual FileZilla Upload

### Step 1: Connect to Server

**Open FileZilla and enter:**
- Host: `197.242.150.197`
- Username: `admin@thynkxpro-dpl.co.za`
- Password: `Wesley123@123`
- Port: `21` (FTP) or `22` (SFTP)

Click **Quickconnect**

---

### Step 2: Upload PHP API Files

**Local Side (Left):**
Navigate to: `/Users/siyandazama/Documents/rental-billing-dashboard/app/api/`

**Server Side (Right):**
Navigate to: `/api/`

**Upload these PHP files** (drag and drop from left to right):
- [ ] ApiController.php
- [ ] CalendarController.php
- [ ] CompanyController.php
- [ ] DashboardController.php
- [ ] DepositController.php
- [ ] DocumentController.php
- [ ] EmailService.php
- [ ] ExpenseController.php
- [ ] InvoiceController.php
- [ ] LeaseController.php
- [ ] PropertyController.php
- [ ] StockController.php
- [ ] SupplierController.php
- [ ] TenantController.php
- [ ] TransactionController.php
- [ ] UserController.php
- [ ] UtilityController.php

**If `/api/` folder doesn't exist:**
1. Right-click on server side → Create Directory → Name it "api"
2. Then upload all PHP files inside it

---

### Step 3: Upload Static Files

**Local Side:**
Navigate to: `/Users/siyandazama/Documents/rental-billing-dashboard/out/`

**Server Side:**
Navigate to: `/` (root directory)

**Select ALL files and folders** in the `out` folder and drag them to the root `/`

This includes:
- [ ] index.html
- [ ] _next/ folder
- [ ] All other HTML files
- [ ] All folders

⚠️ **IMPORTANT:** Upload the CONTENTS of the `out` folder, not the `out` folder itself!

---

### Step 4: Create Uploads Folder

**On Server Side:**
1. Navigate to root `/`
2. Right-click → Create Directory → Name it "uploads"
3. Navigate into `/uploads/`
4. Right-click → Create Directory → Name it "tenant-documents"

**Set Permissions:**
1. Right-click on `uploads` folder → File Permissions → Set to `775`
2. Right-click on `tenant-documents` folder → File Permissions → Set to `775`

---

### Step 5: Upload .htaccess

**Local Side:**
- File: `/Users/siyandazama/Documents/rental-billing-dashboard/.htaccess.production`

**First:** Rename `.htaccess.production` to `.htaccess` on your computer

**Server Side:**
- Upload to root: `/.htaccess`

⚠️ **Enable hidden files in FileZilla:**
- Server menu → "Force showing hidden files"

---

### Step 6: Create Database Connection File

**In FileZilla:**
1. Navigate to `/api/`
2. Right-click → Create File → Name it "db.php"
3. Right-click on db.php → View/Edit

**Paste this content:**

```php
<?php
// Database configuration
$host = 'localhost';
$dbname = 'thynkxv8r6h8_thynkxpro';
$username = 'YOUR_DB_USERNAME';  // ⚠️ GET FROM cPANEL
$password = 'YOUR_DB_PASSWORD';  // ⚠️ GET FROM cPANEL

try {
    $db = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    error_log("Database connection error: " . $e->getMessage());
    exit;
}
?>
```

4. Replace `YOUR_DB_USERNAME` and `YOUR_DB_PASSWORD` with your actual database credentials
5. Save and close

**Where to find database credentials:**
- Go to cPanel → MySQL Databases
- Or check your hosting control panel

---

## Step 7: Setup Database

### Option A: Using phpMyAdmin (Recommended)

1. **Login to phpMyAdmin:**
   - URL: Usually `http://thynkxpro-dpl.co.za/phpmyadmin` or via cPanel
   - Username/Password: Your database credentials

2. **Select Database:**
   - Click on `thynkxv8r6h8_thynkxpro` in left sidebar

3. **Import Schema:**
   - Click "Import" tab at the top
   - Click "Choose File"
   - Select `database-setup.sql` from your computer
   - Click "Go" at bottom
   - Wait for success message

4. **Import Calendar Migration:**
   - Click "Import" tab again
   - Choose `calendar-migration.sql`
   - Click "Go"
   - Wait for success message

### Option B: Using SSH

```bash
ssh admin@thynkxpro-dpl.co.za@197.242.150.197

# Upload SQL files first via FileZilla to a temp folder, then:
mysql -u YOUR_DB_USERNAME -p thynkxv8r6h8_thynkxpro < /path/to/database-setup.sql
mysql -u YOUR_DB_USERNAME -p thynkxv8r6h8_thynkxpro < /path/to/calendar-migration.sql
```

---

## Final Checklist ✅

After uploading everything, verify:

- [ ] All PHP files in `/api/` directory (17 files)
- [ ] All static files in root `/` directory
- [ ] `uploads/tenant-documents/` folder exists with 775 permissions
- [ ] `.htaccess` file uploaded to root
- [ ] `api/db.php` created with correct database credentials
- [ ] Database schema imported successfully

---

## Testing Your Deployment

### Test 1: Check if site loads
Visit: `http://thynkxpro-dpl.co.za`

**Expected:** Login page should appear

---

### Test 2: Check API endpoints
Open these URLs in your browser:

1. **Test Companies API:**
   ```
   http://thynkxpro-dpl.co.za/api/companies?company_id=1
   ```
   **Expected:** JSON response with company data or empty array

2. **Test Properties API:**
   ```
   http://thynkxpro-dpl.co.za/api/properties?company_id=1
   ```
   **Expected:** JSON response

3. **Test Tenants API:**
   ```
   http://thynkxpro-dpl.co.za/api/tenants?company_id=1
   ```
   **Expected:** JSON response

**If you get errors:**
- 404 Error → Check if PHP files are in `/api/` folder
- 500 Error → Check `api/db.php` database credentials
- CORS Error → Check `.htaccess` uploaded correctly

---

## Troubleshooting

### Problem: "Page not found" or 404 errors

**Solution:**
1. Verify static files are in ROOT `/` not in `/out/` folder
2. Make sure you uploaded CONTENTS of `out` folder, not the folder itself

---

### Problem: "API endpoint not found"

**Solution:**
1. Check PHP files are in `/api/` directory (not `/app/api/`)
2. Verify `.htaccess` is uploaded to root
3. Check if `mod_rewrite` is enabled (ask hosting support)

---

### Problem: "Database connection failed"

**Solution:**
1. Verify `/api/db.php` exists
2. Check database credentials are correct
3. Verify database name: `thynkxv8r6h8_thynkxpro` exists
4. Test connection via phpMyAdmin first

---

### Problem: "Cannot upload files" or "Permission denied"

**Solution:**
1. Check `uploads/tenant-documents/` folder exists
2. Set folder permissions to 775
3. Check PHP has write permissions (ask hosting support)

---

### Problem: Login page loads but can't login

**Solution:**
1. Check database is imported (check tables exist in phpMyAdmin)
2. Verify API endpoints return JSON (test URLs above)
3. Check browser console for errors (F12 → Console tab)

---

## File Permissions Reference

Set these via FileZilla (Right-click → File Permissions):

| Folder/File | Permission | Numeric |
|------------|-----------|---------|
| `/api/` | Read/Execute | 755 |
| `/api/*.php` | Read | 644 |
| `/uploads/` | Read/Write/Execute | 775 |
| `/uploads/tenant-documents/` | Read/Write/Execute | 775 |
| `/.htaccess` | Read | 644 |
| All HTML files | Read | 644 |

---

## Quick Links

- **Your Site:** http://thynkxpro-dpl.co.za
- **cPanel:** http://thynkxpro-dpl.co.za:2083
- **phpMyAdmin:** Via cPanel → Databases section

---

## Need Help?

**Check logs:**
- cPanel → Metrics → Errors (to see PHP errors)
- Browser Console (F12) for JavaScript errors

**Common Hosting Panel:**
- File Manager: cPanel → Files → File Manager
- Database Management: cPanel → Databases → phpMyAdmin

---

**Last Updated:** 2025-11-20
