# RUN THIS NOW - Step by Step Instructions

## IMMEDIATE TESTING (Do this right now)

### Terminal 1: Start PHP API
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run api
```
**Leave this terminal running!**

### Terminal 2: Start Next.js
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run dev
```
**Leave this terminal running!**

### Terminal 3: Test Everything

```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard

# Test the API
chmod +x test-api.sh
./test-api.sh
```

## MANUAL BROWSER TESTING

Open browser to: **http://localhost:3000**

Test this flow:

1. **Login Page**
   - Try logging in
   - If it fails, tell me the error message

2. **Company Selection**
   - Should show list of companies
   - Select a company
   - If it fails, tell me the error message

3. **Dashboard**
   - Should load with data/charts
   - If it fails, open browser console (F12) and tell me the error

4. **Test Each Module:**
   - Click "Properties" → Add Property
   - Click "Tenants" → Add Tenant
   - Click "Income" → Invoices
   - Click "Transactions" → New Deposit

For EACH page, if you get an error:
- Open browser console (F12)
- Copy the error message
- Tell me the error

## DATABASE TESTING

```bash
# Test database connection
mysql -h 197.242.150.197 -u thynkxv8r6h8_admin -p thynkxv8r6h8_thynkxpro

# Password: wesleyc@123

# Then run:
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM companies;
exit
```

## IF EVERYTHING WORKS - DEPLOY

### Step 1: Build the Frontend
```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard
npm run build
```

### Step 2: Upload to Server

#### Upload API (You need to do this via FTP or SSH):
- Upload folder: `app/api/`
- To server path: (your server's public_html/api/)

#### Upload Frontend:
- Upload folder contents: `out/*`
- To server path: (your server's public_html/)

### Step 3: Test Production
Open your production URL in browser and test the same flow

## COMMON ERRORS AND FIXES

### Error: "API not found" or "Failed to fetch"
**Fix:** Make sure both servers are running (Terminal 1 and 2)

### Error: "CORS policy"
**Fix:** The API is blocking the request. I need to update config.php

### Error: "Database connection failed"
**Fix:** Database credentials are wrong. Check app/api/config.php

### Error: "No data showing on dashboard"
**Fix:** Database is empty or queries are failing. Run test-database.sql

### Error: "Cannot login"
**Fix:** No user in database. Tell me and I'll create SQL to add a test user

## WHAT TO REPORT TO ME

For EACH error you encounter, give me:
1. **Which page** (Login, Dashboard, Properties, etc.)
2. **What you did** (Clicked button, entered data, etc.)
3. **Error message** (from browser console F12)
4. **Screenshot** if possible

Then I can fix the exact issue!

## CREATE TEST USER (If login fails)

Run this SQL:
```sql
INSERT INTO users (email, plain_password, created_at)
VALUES ('admin@test.com', 'password123', NOW());

INSERT INTO companies (company_name, created_at)
VALUES ('Test Company', NOW());
```
