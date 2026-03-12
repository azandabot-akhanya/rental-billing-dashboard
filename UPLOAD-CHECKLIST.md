# Quick Upload Checklist for FileZilla

## Before You Start

### 1. Build the Application
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run build
```

Wait for build to complete successfully.

---

## FileZilla Connection

**Connection Details:**
- **Host:** `197.242.150.197` (or use `sftp://197.242.150.197` for SFTP)
- **Username:** `admin@thynkxpro-dpl.co.za`
- **Password:** `Wesley123@123`
- **Port:** `21` (FTP) or `22` (SFTP - recommended)

---

## Upload Order (IMPORTANT: Follow this exact order)

### Step 1: Upload PHP API Files ✅

**Local Path:** `/Users/siyandazama/Documents/rental-billing-dashboard/app/api/`
**Remote Path:** `/public_html/api/`

**Files to upload:**
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

**Action in FileZilla:**
1. Right-click on remote side → Create Directory → Name it "api"
2. Select all PHP files from local `app/api/` folder
3. Drag and drop to remote `/public_html/api/`

---

### Step 2: Create Database Connection File ✅

Create a new file in FileZilla:

**Remote Path:** `/public_html/api/db.php`

**Content:**
```php
<?php
// Database configuration for production
$host = 'localhost';
$dbname = 'thynkxv8r6h8_thynkxpro';
$username = 'YOUR_DB_USERNAME';  // ⚠️ CHANGE THIS
$password = 'YOUR_DB_PASSWORD';  // ⚠️ CHANGE THIS

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

**Action:**
1. Right-click in `/public_html/api/` → Create new file → Name it "db.php"
2. Right-click on db.php → Edit
3. Paste the content above
4. Replace `YOUR_DB_USERNAME` and `YOUR_DB_PASSWORD` with your actual database credentials
5. Save and close

---

### Step 3: Create Upload Directories ✅

**Remote Path:** `/public_html/uploads/tenant-documents/`

**Action in FileZilla:**
1. Navigate to `/public_html/`
2. Right-click → Create Directory → Name it "uploads"
3. Navigate into `/public_html/uploads/`
4. Right-click → Create Directory → Name it "tenant-documents"

**Set Permissions:**
1. Right-click on `uploads` folder → File permissions → Set to `755` or `775`
2. Right-click on `tenant-documents` folder → File permissions → Set to `775`
3. Check "Recurse into subdirectories" and "Apply to directories only"

---

### Step 4: Upload .htaccess File ✅

**Local File:** `/Users/siyandazama/Documents/rental-billing-dashboard/.htaccess.production`
**Remote Path:** `/public_html/.htaccess`

**Action:**
1. Rename `.htaccess.production` to `.htaccess` on your local machine first
2. Upload `.htaccess` to `/public_html/`
3. ⚠️ **IMPORTANT**: Enable "Show hidden files" in FileZilla (Server → Force showing hidden files)

---

### Step 5: Setup Database ✅

**Option A: Using phpMyAdmin (Recommended)**
1. Go to `http://thynkxpro-dpl.co.za/phpmyadmin` (or your cPanel URL)
2. Login with your database credentials
3. Select database: `thynkxv8r6h8_thynkxpro`
4. Click "Import" tab
5. Upload and execute in this order:
   - `database-setup.sql` (main schema)
   - `calendar-migration.sql` (calendar enhancements)

**Option B: Using SSH**
```bash
ssh admin@thynkxpro-dpl.co.za@197.242.150.197
mysql -u YOUR_DB_USERNAME -p thynkxv8r6h8_thynkxpro < database-setup.sql
mysql -u YOUR_DB_USERNAME -p thynkxv8r6h8_thynkxpro < calendar-migration.sql
```

---

### Step 6: Deploy Next.js (Choose One Method)

#### **Method A: Static Export (Simple but Limited)**
⚠️ Not recommended for this project due to server-side features

#### **Method B: Node.js Deployment (Recommended)**

**Check if your host supports Node.js:**
1. Check cPanel → Software → Setup Node.js App
2. OR SSH into server: `node --version`

**If Node.js is available:**

1. **Create Node.js application directory:**
   ```
   /home/admin@thynkxpro-dpl.co.za/nodejs/thynkxpro/
   ```

2. **Upload these files/folders via FileZilla:**
   - [ ] `.next/` (entire folder after build)
   - [ ] `public/` (entire folder)
   - [ ] `app/` (entire folder - for reference)
   - [ ] `components/` (entire folder)
   - [ ] `lib/` (entire folder)
   - [ ] `node_modules/` (optional - can npm install on server)
   - [ ] `package.json`
   - [ ] `package-lock.json`
   - [ ] `next.config.ts`
   - [ ] `tsconfig.json`

3. **Create environment file on server:**

   Create `/nodejs/thynkxpro/.env.production`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://thynkxpro-dpl.co.za/api
   NODE_ENV=production
   ```

4. **SSH into server and run:**
   ```bash
   ssh admin@thynkxpro-dpl.co.za@197.242.150.197
   cd /home/admin@thynkxpro-dpl.co.za/nodejs/thynkxpro/

   # Install dependencies
   npm install --production

   # Start with PM2 (recommended)
   npm install -g pm2
   pm2 start npm --name "thynkxpro" -- start
   pm2 save
   pm2 startup

   # OR start with Node.js directly
   node node_modules/next/dist/bin/next start -p 3000
   ```

5. **Setup reverse proxy in .htaccess:**

   Add to `/public_html/.htaccess` (at the bottom):
   ```apache
   # Proxy to Node.js app
   RewriteCond %{REQUEST_URI} !^/api/
   RewriteCond %{REQUEST_URI} !^/uploads/
   RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
   ```

#### **Method C: If No Node.js Support**

Contact your hosting provider to:
1. Enable Node.js support
2. OR deploy Next.js elsewhere (Vercel, DigitalOcean) and keep only PHP API on this server

Then update API URL in your Next.js app to point to `https://thynkxpro-dpl.co.za/api`

---

## Post-Upload Testing

### Test 1: API Endpoints ✅

Open in browser and check for JSON responses:

- [ ] https://thynkxpro-dpl.co.za/api/companies?company_id=1
- [ ] https://thynkxpro-dpl.co.za/api/properties?company_id=1
- [ ] https://thynkxpro-dpl.co.za/api/tenants?company_id=1

**Expected:** JSON data, not errors

**If you get errors:**
- Check database connection in `/public_html/api/db.php`
- Check error logs in cPanel or via SSH: `tail -f /var/log/apache2/error.log`

### Test 2: File Upload Directory ✅

Try accessing: `https://thynkxpro-dpl.co.za/uploads/tenant-documents/`

**Expected:** "Forbidden" or empty directory listing
**If 404:** Directory wasn't created properly

### Test 3: Application ✅

- [ ] Visit `https://thynkxpro-dpl.co.za`
- [ ] Login page should appear
- [ ] Try logging in
- [ ] Dashboard should load with data

---

## Common Issues & Fixes

### Issue: "500 Internal Server Error"
**Fix:**
1. Check `.htaccess` syntax
2. Verify PHP files uploaded correctly
3. Check database connection in `db.php`
4. View error logs in cPanel

### Issue: "API Endpoint Not Found"
**Fix:**
1. Verify `.htaccess` uploaded to `/public_html/`
2. Check that mod_rewrite is enabled
3. Verify API files are in `/public_html/api/` not `/public_html/app/api/`

### Issue: "Cannot upload files"
**Fix:**
1. Check `/public_html/uploads/tenant-documents/` exists
2. Set permissions to 775
3. Verify PHP has write permissions

### Issue: "CORS Error in Console"
**Fix:**
1. Check `.htaccess` has CORS headers
2. Verify API URL in Next.js app matches `https://thynkxpro-dpl.co.za/api`

### Issue: "Database Connection Failed"
**Fix:**
1. Double-check credentials in `/public_html/api/db.php`
2. Verify database exists: `thynkxv8r6h8_thynkxpro`
3. Check database user has permissions
4. Try connecting via phpMyAdmin first

---

## File Permissions Reference

Set these permissions via FileZilla (Right-click → File permissions):

| Path | Permission | Numeric |
|------|-----------|---------|
| `/public_html/` | Read/Execute | 755 |
| `/public_html/api/` | Read/Execute | 755 |
| `/public_html/api/*.php` | Read | 644 |
| `/public_html/uploads/` | Read/Write/Execute | 775 |
| `/public_html/uploads/tenant-documents/` | Read/Write/Execute | 775 |
| `/public_html/.htaccess` | Read | 644 |

---

## Final Verification

Once everything is uploaded:

✅ All PHP API files in `/public_html/api/`
✅ Database connection file created and configured
✅ Upload directories created with correct permissions
✅ `.htaccess` uploaded and configured
✅ Database schema imported
✅ Next.js app deployed (if using Node.js)
✅ All API endpoints returning JSON
✅ Application loads in browser
✅ Can login and navigate
✅ Can upload documents

---

## Need Help?

**Common Hosting Panel URLs:**
- cPanel: `https://thynkxpro-dpl.co.za:2083`
- phpMyAdmin: Usually in cPanel under "Databases"
- File Manager: In cPanel under "Files"

**Check Logs:**
- cPanel → Metrics → Errors
- Or via SSH: `tail -f /var/log/apache2/error.log`

**Contact Host:**
If Node.js issues or permission problems, contact your hosting provider.

---

**Last Updated:** 2025-11-19
