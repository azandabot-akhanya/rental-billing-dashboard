# 🚀 ThynkxPro Deployment Checklist

## ✅ Pre-Deployment (DONE)

- [x] Next.js application built successfully
- [x] Static export created in `/out/` folder
- [x] API configuration updated for production
- [x] All deployment files created

---

## 📦 Files Ready to Upload

### Your Project Structure:
```
rental-billing-dashboard/
├── out/                          ← Upload contents to server root /
│   ├── _next/
│   ├── index.html
│   └── ... (all HTML files)
├── app/api/                      ← Upload all *.php to server /api/
│   ├── ApiController.php
│   ├── CalendarController.php
│   ├── CompanyController.php
│   └── ... (14 more PHP files)
├── .htaccess.production          ← Rename & upload to /.htaccess
├── database-setup.sql            ← Import via phpMyAdmin
└── calendar-migration.sql        ← Import via phpMyAdmin
```

---

## 🎯 Deployment Methods (Choose One)

### Method 1: Automatic Script ⚡ (Recommended)
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
./deploy-ftp.sh
```

### Method 2: Manual FileZilla 📁
Follow: `SIMPLE-DEPLOY-GUIDE.md`

---

## 📋 Manual Deployment Steps (FileZilla)

### 1️⃣ Connect to Server
```
Host: 197.242.150.197
User: admin@thynkxpro-dpl.co.za
Pass: Wesley123@123
Port: 21
```

### 2️⃣ Upload PHP Files
- **Local:** `/app/api/*.php` (17 files)
- **Remote:** `/api/`
- **Action:** Drag all PHP files to `/api/` folder

### 3️⃣ Upload Static Files
- **Local:** `/out/*` (ALL contents)
- **Remote:** `/` (root)
- **Action:** Drag all files/folders from `out` to root

### 4️⃣ Upload .htaccess
- **Local:** `.htaccess.production`
- **Remote:** `/.htaccess` (rename during upload)
- **Action:** Rename file to `.htaccess` and upload to root

### 5️⃣ Create Folders
Create these folders on server:
- `/uploads/` (permission: 775)
- `/uploads/tenant-documents/` (permission: 775)

### 6️⃣ Create db.php
Create file: `/api/db.php` with database credentials

### 7️⃣ Import Database
Use phpMyAdmin to import:
1. `database-setup.sql`
2. `calendar-migration.sql`

---

## 🔑 Database Credentials Needed

You need to fill these in `/api/db.php`:

```php
$host = 'localhost';
$dbname = 'thynkxv8r6h8_thynkxpro';
$username = 'GET_FROM_CPANEL';  // ← Find this
$password = 'GET_FROM_CPANEL';  // ← Find this
```

**Where to find:**
- cPanel → MySQL Databases
- Or contact your hosting provider

---

## 🧪 Testing After Upload

### Test 1: Website Loads
Visit: http://thynkxpro-dpl.co.za
**Expected:** Login page appears

### Test 2: API Works
Visit: http://thynkxpro-dpl.co.za/api/companies?company_id=1
**Expected:** JSON response (not 404)

### Test 3: Database Connection
Check if API returns data from database
**Expected:** JSON with actual data

### Test 4: File Uploads
Try uploading a tenant document
**Expected:** Upload succeeds without errors

---

## 🐛 Common Issues & Fixes

| Problem | Solution |
|---------|----------|
| 404 on homepage | Check static files in root `/`, not `/out/` |
| API 404 errors | Check PHP files in `/api/`, verify `.htaccess` uploaded |
| Database errors | Check `/api/db.php` credentials, import SQL files |
| Can't upload files | Set `/uploads/tenant-documents/` to 775 |
| CORS errors | Verify `.htaccess` uploaded with CORS headers |

---

## 📁 Server File Structure (Final)

```
Server Root (/)
├── .htaccess                     ← Rewrite rules & CORS
├── index.html                    ← Main page
├── _next/                        ← Next.js assets
│   ├── static/
│   └── ...
├── api/                          ← PHP backend
│   ├── db.php                    ← Database config (CREATE THIS)
│   ├── ApiController.php
│   ├── CalendarController.php
│   ├── CompanyController.php
│   └── ... (14 more PHP files)
├── uploads/                      ← File uploads
│   └── tenant-documents/         ← Tenant docs (775 permission)
├── calendar.html
├── company-select.html
├── dashboard.html
└── ... (all other HTML files)
```

---

## 📞 Support Resources

**Documentation:**
- Full Guide: `DEPLOYMENT-GUIDE.md`
- Simple Guide: `SIMPLE-DEPLOY-GUIDE.md`
- Upload Checklist: `UPLOAD-CHECKLIST.md`

**Your Hosting:**
- cPanel: http://thynkxpro-dpl.co.za:2083
- Domain: http://thynkxpro-dpl.co.za

**Database Files:**
- `database-setup.sql` - Main database schema
- `calendar-migration.sql` - Calendar enhancements

**Template Files:**
- `app/api/db.php.template` - Database config template

---

## ✨ Post-Deployment

After successful deployment:

1. **Test Login:**
   - Use existing credentials or create admin user
   - Default email: admin@test.com
   - Default password: password123

2. **Create Company:**
   - Go to company select page
   - Click "Create Your First Company"

3. **Test Features:**
   - Add a property
   - Add a tenant
   - Upload a document
   - Create a calendar event

4. **Setup SSL:**
   - Request SSL certificate (Let's Encrypt via cPanel)
   - Update to HTTPS in production

---

## 🎉 Deployment Complete!

Your application should now be live at:
**http://thynkxpro-dpl.co.za**

If you encounter any issues:
1. Check the troubleshooting section above
2. Review error logs in cPanel
3. Check browser console (F12) for errors

---

**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Status:** Ready for Deployment ✅
