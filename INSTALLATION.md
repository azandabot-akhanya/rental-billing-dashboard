# Installation Guide

This guide provides step-by-step instructions for setting up the Rental Billing Dashboard on both macOS and Windows operating systems.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [macOS Installation](#macos-installation)
- [Windows Installation](#windows-installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## System Requirements

### Minimum Requirements
- **CPU**: Dual-core processor (2 GHz or higher)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free disk space
- **Internet**: Broadband connection for downloading dependencies

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **PHP**: v7.4 or higher (v8.0+ recommended)
- **MySQL/MariaDB**: v5.7 or higher (v8.0+ recommended)
- **Composer**: Latest version (optional, dependencies are vendored)

---

## macOS Installation

### Step 1: Install Homebrew (if not already installed)

Homebrew is the package manager for macOS that makes installing software easy.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Node.js

```bash
# Install Node.js (includes npm)
brew install node

# Verify installation
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher
```

**Alternative**: Download Node.js installer from [nodejs.org](https://nodejs.org/)

### Step 3: Install PHP

macOS comes with PHP, but it's recommended to install a newer version:

```bash
# Install PHP 8.2
brew install php@8.2

# Link PHP
brew link php@8.2

# Verify installation
php --version  # Should show PHP 8.2.x
```

**Check PHP extensions:**
```bash
php -m | grep -i pdo
php -m | grep -i mysql
```

If PDO or MySQL extensions are missing:
```bash
# Edit php.ini
brew info php@8.2  # Shows php.ini location
# Uncomment these lines in php.ini:
# extension=pdo_mysql
# extension=mysqli
```

### Step 4: Install MySQL

```bash
# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql

# Secure MySQL installation
mysql_secure_installation

# Log in to MySQL
mysql -u root -p
```

**Alternative**: Download MySQL installer from [mysql.com](https://dev.mysql.com/downloads/mysql/)

### Step 5: Install Composer (Optional)

```bash
brew install composer

# Verify installation
composer --version
```

### Step 6: Clone and Set Up the Project

```bash
# Navigate to your projects directory
cd ~/Documents/Projects

# Clone the repository
git clone https://github.com/siyanda-zama/rental-billing-dashboard.git
cd rental-billing-dashboard

# Install Node.js dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

---

## Windows Installation

### Step 1: Install Node.js

1. Download the Windows installer from [nodejs.org](https://nodejs.org/)
2. Run the installer (.msi file)
3. Follow the installation wizard (accept defaults)
4. Restart your computer if prompted

**Verify installation:**
```cmd
# Open Command Prompt or PowerShell
node --version
npm --version
```

### Step 2: Install PHP

**Option A: Using XAMPP (Recommended for beginners)**

1. Download XAMPP from [apachefriends.org](https://www.apachefriends.org/)
2. Run the installer
3. Select components: Apache, MySQL, PHP, phpMyAdmin
4. Install to `C:\xampp`
5. Launch XAMPP Control Panel
6. Start Apache and MySQL services

**Add PHP to PATH:**
```cmd
# Add to System Environment Variables:
C:\xampp\php
```

**Option B: Standalone PHP Installation**

1. Download PHP from [windows.php.net](https://windows.php.net/download/)
2. Extract to `C:\php`
3. Rename `php.ini-development` to `php.ini`
4. Edit `php.ini`:
   ```ini
   extension=pdo_mysql
   extension=mysqli
   extension=openssl
   extension=fileinfo
   ```
5. Add `C:\php` to System PATH

**Verify installation:**
```cmd
php --version
php -m | findstr pdo
```

### Step 3: Install MySQL

**If using XAMPP:** MySQL is already installed, skip to Step 4.

**Standalone MySQL:**

1. Download MySQL Installer from [mysql.com](https://dev.mysql.com/downloads/installer/)
2. Run the installer
3. Choose "Developer Default" setup
4. Set root password (remember this!)
5. Complete the installation
6. Start MySQL service

**Verify installation:**
```cmd
mysql --version

# Log in to MySQL
mysql -u root -p
```

### Step 4: Install Git (Optional)

1. Download Git from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer
3. Use recommended settings

### Step 5: Install Composer (Optional)

1. Download Composer from [getcomposer.org](https://getcomposer.org/download/)
2. Run the Windows installer
3. Follow the installation wizard

### Step 6: Clone and Set Up the Project

**Using Git:**
```cmd
# Navigate to your projects directory
cd C:\Users\YourUsername\Documents

# Clone the repository
git clone https://github.com/siyanda-zama/rental-billing-dashboard.git
cd rental-billing-dashboard

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local
```

**Without Git:** Download ZIP from GitHub, extract, and open in terminal

---

## Database Setup

### Step 1: Create Database

**On macOS:**
```bash
mysql -u root -p
```

**On Windows (XAMPP):**
- Open phpMyAdmin: `http://localhost/phpmyadmin`
- Or use command line: `mysql -u root -p`

**SQL Commands:**
```sql
-- Create database
CREATE DATABASE rental_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, recommended for production)
CREATE USER 'rental_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON rental_billing.* TO 'rental_user'@'localhost';
FLUSH PRIVILEGES;

-- Switch to database
USE rental_billing;
```

### Step 2: Import Database Schema

**Option A: Using command line (recommended)**

**macOS:**
```bash
mysql -u root -p rental_billing < database-setup.sql
```

**Windows:**
```cmd
# If using XAMPP
C:\xampp\mysql\bin\mysql -u root -p rental_billing < database-setup.sql

# Or
mysql -u root -p rental_billing < database-setup.sql
```

**Option B: Using phpMyAdmin**

1. Open phpMyAdmin
2. Select `rental_billing` database
3. Click "Import" tab
4. Choose `database-setup.sql`
5. Click "Go"

### Step 3: Verify Database Setup

```sql
-- Log in to MySQL
mysql -u root -p

-- Use database
USE rental_billing;

-- Show tables
SHOW TABLES;

-- Should see tables like:
-- tenants, properties, units, invoices, transactions, etc.
```

---

## Configuration

### Step 1: Configure Environment Variables

Edit `.env.local` in the project root:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**For production:** Update to your production API URL (e.g., `https://api.yourdomain.com`)

### Step 2: Configure Database Connection

Edit `app/api/config.php`:

```php
<?php
class Database {
    private $host = "localhost";           // or "127.0.0.1"
    private $db_name = "rental_billing";   // your database name
    private $username = "rental_user";     // your database user
    private $password = "your_password";   // your database password
    public $conn;

    public function getConnection() {
        // ... rest of the code
    }
}
?>
```

**Security Note:** In production, move these credentials to environment variables.

### Step 3: Verify PHP Extensions

Ensure required PHP extensions are enabled:

```bash
php -m
```

Required extensions:
- ✅ PDO
- ✅ pdo_mysql
- ✅ mysqli
- ✅ openssl
- ✅ fileinfo
- ✅ json

If any are missing, edit `php.ini` and uncomment the extension lines.

---

## Running the Application

### Development Mode

You need to run **TWO SERVERS** simultaneously:

**Terminal/Command Prompt 1 - PHP API Server:**

**macOS:**
```bash
cd rental-billing-dashboard
npm run api
```

**Windows:**
```cmd
cd rental-billing-dashboard
npm run api
```

You should see:
```
PHP 8.2.x Development Server (http://localhost:8000) started
```

**Terminal/Command Prompt 2 - Next.js Frontend:**

**macOS:**
```bash
cd rental-billing-dashboard
npm run dev
```

**Windows:**
```cmd
cd rental-billing-dashboard
npm run dev
```

You should see:
```
▲ Next.js 15.2.4
- Local: http://localhost:3000
✓ Ready in 2.5s
```

### Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

### Default Login Credentials

If you imported the database with sample data, use:

```
Email: admin@example.com
Password: (check your database seeding script)
```

**Note:** Create a new user account via the registration flow or database insert.

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s node_modules && del package-lock.json  # Windows

npm install
```

#### Issue: PHP server not starting

**Symptoms:**
```
bind: Address already in use
```

**Solution:**
```bash
# Find what's using port 8000
# macOS:
lsof -i :8000
kill -9 <PID>

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use a different port:
php -S localhost:8001 -t app/api
```

Then update `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

#### Issue: MySQL connection failed

**Symptoms:**
```
Database connection failed: SQLSTATE[HY000] [2002] Connection refused
```

**Solutions:**

**macOS:**
```bash
# Check if MySQL is running
brew services list

# Start MySQL
brew services start mysql
```

**Windows (XAMPP):**
- Open XAMPP Control Panel
- Click "Start" next to MySQL

**Check credentials:**
- Verify username, password, database name in `app/api/config.php`
- Try connecting manually: `mysql -u root -p`

#### Issue: PDO extension not found

**Symptoms:**
```
Fatal error: Class 'PDO' not found
```

**Solution:**

**macOS:**
```bash
# Find php.ini location
php --ini

# Edit php.ini (uncomment these lines):
extension=pdo_mysql
extension=mysqli
```

**Windows:**
Edit `php.ini`:
```ini
extension=pdo_mysql
extension=mysqli
```

Restart PHP server.

#### Issue: CORS errors in browser console

**Symptoms:**
```
Access to fetch at 'http://localhost:8000' blocked by CORS policy
```

**Solution:**

Check `app/api/index.php` has CORS headers:
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
```

#### Issue: Port 3000 already in use

**Solution:**

**macOS:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Windows:**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or use a different port:
```bash
PORT=3001 npm run dev
```

#### Issue: "module not found" after fresh install

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next  # macOS
rmdir /s .next  # Windows

npm run dev
```

---

## Production Build

To build the application for production:

### Step 1: Build Frontend

```bash
npm run build
```

This creates an `out/` directory with static files.

### Step 2: Deploy Frontend

Upload the `out/` directory to your static hosting provider:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any web server

### Step 3: Deploy Backend

1. Upload `app/api/` directory to your PHP hosting
2. Update `app/api/config.php` with production database credentials
3. Ensure your web server routes requests to `index.php`
4. Update CORS settings in `app/api/index.php` for your production domain

### Step 4: Update Environment Variables

Update `.env.local` (or rebuild with production env):
```
NEXT_PUBLIC_API_URL=https://your-production-api.com
```

---

## Next Steps

After successful installation:

1. **Review Security Settings**: See [Security Considerations](./README.md#security-considerations)
2. **Read Architecture Documentation**: Understand the system design in [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Explore API Endpoints**: Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. **Set Up Cron Jobs**: For recurring invoices, see [CRON_SETUP.md](./CRON_SETUP.md)
5. **Configure Email**: Set up SMTP for invoice delivery
6. **Customize**: Modify branding, add features as needed

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `api.log`, `next.log`, and `php.log`
3. Search existing [GitHub Issues](https://github.com/siyanda-zama/rental-billing-dashboard/issues)
4. Create a new issue with detailed error messages and steps to reproduce

---

## Developer Information

**Developed by:** [Siyanda Zama](https://github.com/siyanda-zama)

For questions or support, contact through GitHub.

---

**Happy property managing! 🏠**
