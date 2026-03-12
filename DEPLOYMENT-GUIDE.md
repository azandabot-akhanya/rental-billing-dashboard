# Deployment Guide for ThynkxPro Rental Billing Dashboard

## Server Details
- **Domain**: thynkxpro-dpl.co.za
- **Host**: 197.242.150.197
- **Server Type**: LAMP (Linux, Apache, MySQL, PHP)
- **FTP Tool**: FileZilla

---

## Pre-Deployment Checklist

### 1. Build the Next.js Application

Before uploading, you need to build the production version:

```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run build
```

This creates an optimized production build in the `.next` folder.

### 2. Check Required Files

Ensure these files/folders exist:
- `.next/` (after build)
- `public/`
- `app/`
- `components/`
- `lib/`
- `package.json`
- `next.config.ts`
- `.env.local` (for environment variables)

---

## Server Directory Structure

Your server should have this structure:

```
/home/admin@thynkxpro-dpl.co.za/
├── public_html/                    # Root web directory
│   ├── api/                        # PHP API files
│   │   ├── ApiController.php
│   │   ├── CalendarController.php
│   │   ├── CompanyController.php
│   │   ├── DocumentController.php
│   │   ├── EmailService.php
│   │   └── ... (all other PHP controllers)
│   ├── uploads/                    # Upload directory for documents
│   │   └── tenant-documents/
│   ├── .htaccess                   # Apache configuration
│   └── index.php                   # PHP entry point (optional)
├── nodejs/                         # Node.js application directory
│   ├── .next/                      # Built Next.js app
│   ├── public/
│   ├── node_modules/
│   ├── package.json
│   ├── next.config.ts
│   └── .env.production
```

---

## Step-by-Step Deployment

### Step 1: Upload PHP API Files

**Via FileZilla:**

1. Connect to server:
   - Host: `197.242.150.197`
   - Username: `admin@thynkxpro-dpl.co.za`
   - Password: `Wesley123@123`
   - Port: `21` (or `22` for SFTP)

2. Navigate to `/public_html/api/`

3. Upload all PHP files from your local `app/api/` folder:
   - `ApiController.php`
   - `CalendarController.php`
   - `CompanyController.php`
   - `DashboardController.php`
   - `DepositController.php`
   - `DocumentController.php`
   - `EmailService.php`
   - `ExpenseController.php`
   - `InvoiceController.php`
   - `LeaseController.php`
   - `PropertyController.php`
   - `StockController.php`
   - `SupplierController.php`
   - `TenantController.php`
   - `TransactionController.php`
   - `UserController.php`
   - `UtilityController.php`

### Step 2: Create Uploads Directory

1. In `/public_html/`, create `uploads` folder
2. Inside `uploads/`, create `tenant-documents/` folder
3. Set permissions:
   - `uploads/`: **755** or **775**
   - `tenant-documents/`: **755** or **775**

### Step 3: Configure Database Connection

Create or update `/public_html/api/db.php`:

```php
<?php
// Database configuration
$host = 'localhost'; // or your MySQL host
$dbname = 'thynkxv8r6h8_thynkxpro';
$username = 'your_db_username';
$password = 'your_db_password';

try {
    $db = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
?>
```

### Step 4: Setup Database

1. Access your MySQL database via **phpMyAdmin** or MySQL client
2. Import the database schema:

```sql
-- Run these files in order:
-- 1. database-setup.sql (main schema)
-- 2. property-procedures.sql (if exists)
-- 3. email-invoice-schema.sql (if exists)
```

3. **IMPORTANT**: Add calendar table columns if not exist:

```sql
USE thynkxv8r6h8_thynkxpro;

-- Check if columns exist, add if missing
ALTER TABLE tenant_calendar_events
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '' AFTER description,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'meeting' AFTER location;
```

### Step 5: Configure Apache with .htaccess

Create `/public_html/.htaccess`:

```apache
# Enable CORS for API requests
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
</IfModule>

# Handle OPTIONS requests
RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

# Redirect API requests to PHP files
RewriteEngine On
RewriteBase /

# API routing
RewriteRule ^api/companies/?$ api/CompanyController.php [L]
RewriteRule ^api/tenants/?$ api/TenantController.php [L]
RewriteRule ^api/properties/?$ api/PropertyController.php [L]
RewriteRule ^api/invoices/?$ api/InvoiceController.php [L]
RewriteRule ^api/dashboard/?$ api/DashboardController.php [L]
RewriteRule ^api/deposits/?$ api/DepositController.php [L]
RewriteRule ^api/expenses/?$ api/ExpenseController.php [L]
RewriteRule ^api/documents/?$ api/DocumentController.php [L]
RewriteRule ^api/calendar/?$ api/CalendarController.php [L]
RewriteRule ^api/stock/?$ api/StockController.php [L]
RewriteRule ^api/suppliers/?$ api/SupplierController.php [L]
RewriteRule ^api/utilities/?$ api/UtilityController.php [L]
RewriteRule ^api/leases/?$ api/LeaseController.php [L]
RewriteRule ^api/transactions/?$ api/TransactionController.php [L]

# Protect sensitive files
<FilesMatch "\.(env|sql|md|json|lock)$">
    Order allow,deny
    Deny from all
</FilesMatch>
```

### Step 6: Deploy Next.js Application

**Option A: Traditional Hosting (Serve as Static + API)**

If your server doesn't support Node.js runtime:

1. Build static export:
```bash
# Update next.config.ts to add:
# output: 'export'
npm run build
```

2. Upload the `out/` folder contents to `/public_html/`

3. This won't work well with this project due to server-side features.

**Option B: Node.js Hosting (Recommended)**

1. Upload entire project to `/home/admin@thynkxpro-dpl.co.za/nodejs/thynkxpro/`

2. Via SSH, install dependencies:
```bash
ssh admin@thynkxpro-dpl.co.za@197.242.150.197
cd /home/admin@thynkxpro-dpl.co.za/nodejs/thynkxpro/
npm install --production
npm run build
```

3. Setup Node.js process manager (PM2):
```bash
npm install -g pm2
pm2 start npm --name "thynkxpro" -- start
pm2 save
pm2 startup
```

4. Configure Apache reverse proxy in `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### Step 7: Environment Variables

Create `/nodejs/thynkxpro/.env.production`:

```env
# Next.js
NEXT_PUBLIC_API_BASE_URL=https://thynkxpro-dpl.co.za/api

# API Configuration
NODE_ENV=production

# Email Configuration (if using SMTP)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email@thynkxpro-dpl.co.za
SMTP_PASS=your_email_password
```

Update API URL in your application to use the production URL.

### Step 8: File Permissions

Set correct permissions via FileZilla or SSH:

```bash
# PHP files
chmod 644 /public_html/api/*.php

# Directories
chmod 755 /public_html/api
chmod 755 /public_html/uploads
chmod 755 /public_html/uploads/tenant-documents

# Make upload directories writable
chmod 775 /public_html/uploads/tenant-documents

# If using Node.js
chmod 755 /nodejs/thynkxpro
```

---

## Post-Deployment Testing

### 1. Test API Endpoints

Visit these URLs in your browser:

- `https://thynkxpro-dpl.co.za/api/companies?company_id=1`
- `https://thynkxpro-dpl.co.za/api/properties?company_id=1`
- `https://thynkxpro-dpl.co.za/api/tenants?company_id=1`

Expected: JSON responses with data

### 2. Test Application

- Visit `https://thynkxpro-dpl.co.za`
- Login with test credentials
- Check if dashboard loads
- Test creating a tenant
- Test uploading a document

### 3. Check Error Logs

```bash
# Apache error log
tail -f /var/log/apache2/error.log

# PHP error log
tail -f /var/log/php/error.log

# Node.js logs (if using PM2)
pm2 logs thynkxpro
```

---

## Troubleshooting

### Issue: "CORS Error"
**Solution**: Check `.htaccess` has CORS headers enabled

### Issue: "500 Internal Server Error"
**Solution**:
- Check PHP error logs
- Verify database connection in `db.php`
- Check file permissions

### Issue: "404 Not Found for API"
**Solution**:
- Verify `.htaccess` rewrite rules
- Enable `mod_rewrite` in Apache
- Check API files are in `/public_html/api/`

### Issue: "Cannot upload files"
**Solution**:
- Check `uploads/tenant-documents/` exists
- Verify directory permissions (775)
- Check PHP `upload_max_filesize` in `php.ini`

### Issue: "Email notifications not sending"
**Solution**:
- Verify SMTP credentials in `EmailService.php`
- Check PHP `mail()` function is enabled
- Test with PHPMailer if issues persist

---

## Quick Upload Checklist

- [ ] Build Next.js app (`npm run build`)
- [ ] Upload PHP files to `/public_html/api/`
- [ ] Create uploads directory with correct permissions
- [ ] Configure database connection
- [ ] Import database schema
- [ ] Add calendar table columns
- [ ] Create `.htaccess` file
- [ ] Upload Next.js build files
- [ ] Configure environment variables
- [ ] Set file permissions
- [ ] Test API endpoints
- [ ] Test application login
- [ ] Test file uploads
- [ ] Test email notifications

---

## Production Optimization

1. **Enable PHP OPcache** in `php.ini`
2. **Enable Gzip Compression** in `.htaccess`
3. **Setup SSL Certificate** (Let's Encrypt)
4. **Configure Caching Headers**
5. **Setup Database Backups**
6. **Monitor Server Resources**

---

## Support

For issues during deployment:
1. Check error logs first
2. Verify all files uploaded correctly
3. Test API endpoints individually
4. Check database connection
5. Review file permissions

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
