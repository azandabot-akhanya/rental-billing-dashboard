# Testing Instructions

## Server Status ✓

Both servers are confirmed running and responding:

- **Frontend (Next.js)**: http://localhost:3000 - Status: 200 OK
- **Backend (PHP API)**: http://localhost:8000 - Status: 200 OK

## Current Process IDs

- PHP API: PID 59939
- Next.js: PID 60217

## How to Access the Application

1. **Open your regular browser** (not incognito mode initially)
2. Navigate to: **http://localhost:3000**
3. You should be automatically redirected to: **http://localhost:3000/login**

## Test Credentials

```
Email: admin@test.com
Password: password123
```

## If You See "Refused to Connect" Error

The servers are verified running. If you see this error:

1. **Wait 10 seconds** - Next.js might still be compiling
2. **Hard refresh** - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Clear browser cache**:
   - Chrome: Settings > Privacy > Clear browsing data
   - Select "Cached images and files"
   - Time range: Last hour
4. **Try regular mode first** instead of incognito
5. **Check if any browser extensions** are blocking localhost access

## Verify Servers Are Running

Run this command to check:

```bash
lsof -i :3000 -i :8000 | grep LISTEN
```

You should see:
```
php    59939 ... localhost:8000 (LISTEN)
node   60217 ... *:3000 (LISTEN)
```

## Stop Servers

If you need to restart:

```bash
./stop-app.sh
```

## Start Servers

```bash
./start-app.sh
```

## Testing Flow

### 1. Login Page
- Navigate to http://localhost:3000
- Should redirect to /login
- Enter credentials: admin@test.com / password123
- Click "Login"

### 2. Company Selection
- After login, you should see company selection page
- Select "Test Company"
- Click "Continue" or "Select"

### 3. Dashboard
- Should display dashboard with:
  - Net Worth
  - Income Today
  - Expense Today
  - Income This Month
  - Expense This Month
  - Cash Flow chart
  - Income vs Expense pie chart
  - Recent invoices table

### 4. Test Each Module

**Properties** (http://localhost:3000/properties)
- View all properties
- Add new property
- Edit existing property
- Delete property (if allowed)

**Tenants** (http://localhost:3000/tenants)
- View all tenants
- Add new tenant
- Edit tenant details
- View tenant statement

**Income**
- Invoices: Create, view, edit invoices
- Recurring Invoices: Set up recurring billing
- Services: Manage billable services

**Expenses**
- Record expenses
- View expense history
- Categorize expenses

**Transactions**
- Deposits: Record payments
- View transaction history
- Check balances

**Reports**
- Tenant statements
- Income reports
- Expense reports
- Income vs Expenses comparison

**Stock Management**
- Received stock
- Issued stock
- Supplier reports
- Stock totals

**Prepaid Utilities**
- Electricity management
- Water management
- Utility reports

**Calendar**
- View scheduled events
- Add new events

**Documents**
- Upload documents
- View document library

## What to Report

If any feature doesn't work, please report:

1. **Exact URL** where the error occurred
2. **Action taken** (e.g., "clicked Add Property button")
3. **Error message** (if any shown on screen)
4. **Browser console errors** (F12 > Console tab)
5. **Network errors** (F12 > Network tab > look for red failed requests)

## Logs

To view real-time logs:

**Next.js logs:**
```bash
tail -f next.log
```

**API logs:**
```bash
tail -f api.log
```

## Current Server Verification

Both servers tested at 10:44 AM:
```bash
# API Test
curl http://localhost:8000/test
# Result: {"success":true,"message":"API is working",...}

# Frontend Test
curl http://localhost:3000/login
# Result: HTTP 200 OK (HTML page returned)
```

## Known Working State

- ✓ PHP API server responding on port 8000
- ✓ Next.js server responding on port 3000
- ✓ Database connection configured
- ✓ All stored procedures created
- ✓ Test user and company created
- ✓ CORS headers configured for localhost
- ✓ Environment variables set correctly
- ✓ API URL configuration working

You can now test the entire application. Start with the login page and work through each module systematically.
