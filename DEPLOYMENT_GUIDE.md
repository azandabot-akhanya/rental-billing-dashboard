# Deployment Guide

## Prerequisites

1. Server access (FTP/SSH credentials)
2. PHP 7.4+ installed on server
3. MySQL database access
4. Node.js for building the frontend

## Step 1: Test Locally First

### Start PHP API Server
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run api
```

### Start Next.js Dev Server (in another terminal)
```bash
npm run dev
```

### Test the API
```bash
chmod +x test-api.sh
./test-api.sh
```

### Test Database Connection
```bash
mysql -h 197.242.150.197 -u thynkxv8r6h8_admin -p thynkxv8r6h8_thynkxpro < test-database.sql
```
Password: `wesleyc@123`

## Step 2: Build Frontend

```bash
# Build the Next.js application
npm run build

# This creates the 'out' directory with static files
```

## Step 3: Deploy to Server

### Option A: Using FTP/SFTP

1. **Upload PHP API files:**
   - Upload entire `app/api/` directory to server
   - Typical location: `/public_html/api/` or `/var/www/html/api/`

2. **Upload Frontend files:**
   - Upload contents of `out/` directory to server
   - Typical location: `/public_html/` or `/var/www/html/`

### Option B: Using SSH/SCP

```bash
# Upload API files
scp -r app/api user@197.242.150.197:/path/to/public_html/api/

# Upload frontend files
scp -r out/* user@197.242.150.197:/path/to/public_html/
```

## Step 4: Configure Server

### Update API Configuration

Connect to server and edit `/path/to/public_html/api/config.php`:

```php
<?php
// Update CORS to allow your production domain
$allowed_origins = ['https://yourdomain.com', 'http://yourdomain.com'];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// ... rest of config
```

### Create .htaccess for API

Create `/path/to/public_html/api/.htaccess`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

### Create .htaccess for Frontend

Create `/path/to/public_html/.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Step 5: Update Frontend Configuration

Before building, update `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

Then rebuild:
```bash
npm run build
```

## Step 6: Test Production

### Test API Endpoints
```bash
curl https://yourdomain.com/api/test
curl https://yourdomain.com/api/companies
```

### Test Frontend
Open browser to `https://yourdomain.com`

## Troubleshooting

### API Returns 500 Error
- Check PHP error logs on server
- Verify database credentials in `api/config.php`
- Ensure PHP extensions are installed (PDO, PDO_MySQL)

### CORS Errors
- Check `api/config.php` and `api/index.php` have correct allowed origins
- Ensure your domain is in the `$allowed_origins` array

### Frontend Shows Blank Page
- Check browser console for errors
- Verify API URL in environment variables
- Check that all files uploaded correctly

### Database Connection Fails
- Verify credentials in `api/config.php`
- Check if server can connect to database host
- Ensure database user has correct permissions

## Manual Testing Checklist

Once deployed:

- [ ] Login page loads
- [ ] Can login with credentials
- [ ] Company selection page works
- [ ] Dashboard loads with data
- [ ] Can view properties list
- [ ] Can add new property
- [ ] Can edit property
- [ ] Can delete property
- [ ] Can view tenants list
- [ ] Can add new tenant
- [ ] Can edit tenant
- [ ] Can delete tenant
- [ ] Can create invoice
- [ ] Can view invoices list
- [ ] Can create recurring invoice
- [ ] Can add deposit transaction
- [ ] Can add expense transaction
- [ ] Can view transactions list
- [ ] Reports generate correctly
- [ ] Stock management works
- [ ] Prepaid utilities work
- [ ] Calendar functions
- [ ] Document upload works

## Post-Deployment

1. Test all functionality thoroughly
2. Set up regular database backups
3. Monitor error logs
4. Set up SSL certificate if not already done
5. Configure cron job for recurring invoices:
   ```bash
   0 0 * * * php /path/to/public_html/api/generate_recurring_invoices.php
   ```
