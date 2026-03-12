# Balance B/F (Brought Forward) Implementation Guide

## Overview

The Balance B/F (Brought Forward) feature allows ThynkxPro to handle opening balances when backdating the system or migrating from another accounting platform. This is essential for maintaining accurate financial records from a specific conversion date.

## What is Balance B/F?

**Balance Brought Forward (B/F)** is a fundamental accounting concept where the closing balance from one period becomes the opening balance for the next period. It represents:

- Outstanding rent arrears
- Unpaid utility bills
- Other charges owed
- Advance payments/credits
- Total opening balance for each tenant

## Use Case: Backdating from March 2025

Your client wants to start using ThynkxPro from March 1, 2025, but needs to include all outstanding balances from before that date. Here's how:

### Step 1: Set Conversion Date
The **conversion date** is March 1, 2025 - the date when you start actively tracking transactions in ThynkxPro.

### Step 2: Calculate Opening Balances
For each tenant, calculate what they owed as of February 29, 2025:
- Outstanding rent: R5,000
- Unpaid utilities: R1,200
- Other charges: R500
- Less advance payments: -R1,000
- **Total Opening Balance: R5,700**

### Step 3: Enter in System
Navigate to **Transactions > Opening Balances (B/F)** and enter each tenant's opening balance with the conversion date of March 1, 2025.

## Database Schema

### Opening Balances Table
```sql
CREATE TABLE opening_balances (
    opening_balance_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    tenant_id INT NOT NULL,
    property_id INT DEFAULT NULL,

    conversion_date DATE NOT NULL, -- March 1, 2025
    financial_year INT NOT NULL,    -- 2025

    opening_balance DECIMAL(15, 2) NOT NULL,
    outstanding_rent DECIMAL(15, 2) DEFAULT 0.00,
    outstanding_utilities DECIMAL(15, 2) DEFAULT 0.00,
    outstanding_other DECIMAL(15, 2) DEFAULT 0.00,
    advance_payments DECIMAL(15, 2) DEFAULT 0.00,

    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1
);
```

### Company Opening Balances Table
```sql
CREATE TABLE company_opening_balances (
    company_opening_balance_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    conversion_date DATE NOT NULL,
    financial_year INT NOT NULL,

    bank_balance DECIMAL(15, 2) DEFAULT 0.00,
    cash_on_hand DECIMAL(15, 2) DEFAULT 0.00,
    accounts_receivable DECIMAL(15, 2) DEFAULT 0.00,
    accounts_payable DECIMAL(15, 2) DEFAULT 0.00,

    ytd_income DECIMAL(15, 2) DEFAULT 0.00,
    ytd_expenses DECIMAL(15, 2) DEFAULT 0.00,
    retained_earnings DECIMAL(15, 2) DEFAULT 0.00
);
```

## API Endpoints

### Tenant Opening Balances

#### Create Opening Balance
```http
POST /api/opening-balances/tenant
Content-Type: application/json

{
  "company_id": 1,
  "tenant_id": 5,
  "property_id": 2,
  "conversion_date": "2025-03-01",
  "financial_year": 2025,
  "opening_balance": 5700.00,
  "outstanding_rent": 5000.00,
  "outstanding_utilities": 1200.00,
  "outstanding_other": 500.00,
  "advance_payments": 1000.00,
  "notes": "Migrated from previous system"
}
```

#### Get Tenant Opening Balance
```http
GET /api/opening-balances/tenant/{tenant_id}?company_id=1&as_of_date=2025-03-01
```

#### Calculate Current Balance (including B/F)
```http
GET /api/opening-balances/calculate/{tenant_id}?company_id=1&as_of_date=2025-06-30
```

Response includes:
- Opening balance
- Invoices issued since conversion
- Payments received
- Current balance

#### List All Opening Balances
```http
GET /api/opening-balances/list?company_id=1&conversion_date=2025-03-01
```

#### Update Opening Balance
```http
PUT /api/opening-balances/tenant/{id}
Content-Type: application/json

{
  "opening_balance": 6000.00,
  "outstanding_rent": 5500.00,
  "notes": "Adjusted after verification"
}
```

#### Delete Opening Balance
```http
DELETE /api/opening-balances/tenant/{id}
```

### Bulk Operations

#### Bulk Create Opening Balances
```http
POST /api/opening-balances/bulk
Content-Type: application/json

{
  "company_id": 1,
  "created_by": "admin",
  "balances": [
    {
      "tenant_id": 5,
      "property_id": 2,
      "conversion_date": "2025-03-01",
      "financial_year": 2025,
      "opening_balance": 5700.00,
      "outstanding_rent": 5000.00,
      "outstanding_utilities": 1200.00
    },
    {
      "tenant_id": 6,
      "property_id": 2,
      "conversion_date": "2025-03-01",
      "financial_year": 2025,
      "opening_balance": 3200.00,
      "outstanding_rent": 3000.00,
      "outstanding_utilities": 200.00
    }
  ]
}
```

## Frontend Usage

### Navigation
1. Go to **Transactions > Opening Balances (B/F)**
2. Click **Add Opening Balance**
3. Select tenant and property
4. Set conversion date (e.g., March 1, 2025)
5. Enter breakdown:
   - Outstanding Rent
   - Outstanding Utilities
   - Other Charges
   - Advance Payments (credits)
6. System calculates total or you can override
7. Add notes if needed
8. Click **Create Opening Balance**

### Features
- Search and filter opening balances
- Edit existing balances
- Delete balances (soft delete)
- View breakdown of charges
- Auto-calculate total from components

## How Balance B/F Works with Reports

### Tenant Statements
When generating a tenant statement from March 1, 2025 onwards:
```
Opening Balance (B/F) as of March 1, 2025:  R5,700.00

+ Invoice #001 - March Rent:                 R4,500.00
+ Invoice #002 - Utilities:                  R  800.00
- Payment received March 15:                -R3,000.00
                                           -----------
Current Balance as of March 31, 2025:        R8,000.00
```

### General Ledger
The opening balance appears as the first entry for each tenant account, ensuring continuity from the previous system.

### Balance Sheet
- **Accounts Receivable** includes all opening balances plus subsequent invoices
- **Cash/Bank** reflects opening bank balance plus transactions

## Stored Procedures

### Get Tenant Opening Balance
```sql
CALL sp_get_tenant_opening_balance(company_id, tenant_id, as_of_date)
```

### Calculate Current Balance
```sql
CALL sp_calculate_tenant_current_balance(company_id, tenant_id, as_of_date)
```

Returns:
- Opening balance
- Conversion date
- Outstanding invoices
- Paid invoices
- Total payments
- Current balance

### Upsert Opening Balance
```sql
CALL sp_upsert_opening_balance(
    company_id, tenant_id, property_id, conversion_date, financial_year,
    opening_balance, outstanding_rent, outstanding_utilities,
    outstanding_other, advance_payments, notes, created_by
)
```

## Best Practices

### 1. Verify Before Entry
- Print tenant ledgers from previous system
- Reconcile all outstanding amounts
- Confirm with tenants if needed

### 2. Use Consistent Conversion Date
- All tenants should use the same conversion date
- Typically the 1st of a month
- Match your financial year start if possible

### 3. Breakdown vs. Total
- **Recommended**: Enter breakdown (rent, utilities, etc.)
- **Alternative**: Enter total opening balance directly
- Breakdown provides better audit trail

### 4. Document Everything
- Use the notes field for each entry
- Record source of information
- Note any adjustments made

### 5. Reconciliation
After entering opening balances:
- Generate tenant statements
- Verify totals match your records
- Check accounts receivable total

## Migration Checklist

- [ ] Determine conversion date (e.g., March 1, 2025)
- [ ] Export final balances from old system as of conversion date
- [ ] Create list of all tenants with outstanding amounts
- [ ] Break down each balance (rent, utilities, other, credits)
- [ ] Enter opening balances in ThynkxPro
- [ ] Verify each entry
- [ ] Generate test statements
- [ ] Reconcile total AR with old system
- [ ] Get sign-off from management
- [ ] Go live with new system

## Year-End Considerations

### Balance Sheet Accounts
- Opening balances carry forward indefinitely
- They accumulate with transactions
- Never reset to zero

### Income & Expense Accounts
- Reset to zero at year-end
- Net result goes to retained earnings
- Opening balances for P&L not needed (handled automatically)

### Year-End Close Process
1. System calculates profit/loss for the year
2. Income and expense accounts reset to zero
3. Net income transfers to retained earnings
4. Balance sheet accounts (including tenant balances) carry forward
5. New year starts with carried forward balances

## Troubleshooting

### "No opening balance found"
- Check conversion date is correct
- Verify tenant_id and company_id match
- Ensure opening balance is marked as active

### Balance doesn't match reports
- Verify no duplicate opening balances exist
- Check conversion date is before report start date
- Ensure payments aren't dated before conversion date

### Can't delete opening balance
- Check for dependencies (may need to adjust related records)
- Use soft delete (is_active = 0) instead of hard delete

## Support

For additional help with Balance B/F:
1. Review this documentation
2. Check the UI tooltips and help text
3. Consult accounting team for verification
4. Contact support for technical issues

## Comparison with Other Systems

### Xero: Conversion Balances
- Similar concept to our Opening Balances
- Uses conversion date as cutoff
- Supports both manual entry and CSV import
- **ThynkxPro advantage**: Better breakdown per tenant

### QuickBooks: Opening Balance Equity
- Uses special "Opening Balance Equity" account
- Requires journal entries
- More complex for non-accountants
- **ThynkxPro advantage**: Simpler tenant-focused interface

### Sage: Beginning Balances
- Enter balances during setup
- Trial balance must balance (debits = credits)
- More accounting knowledge required
- **ThynkxPro advantage**: Designed for property management workflow

## Technical Implementation

### Files Created
1. **Database**: `/app/api/sql/opening_balances.sql`
2. **API Controller**: `/app/api/OpeningBalanceController.php`
3. **Frontend Page**: `/app/(dashboard)/transactions/opening-balances/page.tsx`
4. **API Router**: Updated `/app/api/index.php`
5. **Sidebar Menu**: Updated `/components/app-sidebar.tsx`

### To Deploy
1. Run SQL script to create tables and stored procedures
2. Upload OpeningBalanceController.php to `/app/api/`
3. Upload updated index.php
4. Deploy frontend build
5. Test with sample data

---

**Note**: This implementation follows accounting best practices from Xero, QuickBooks, and Sage while being optimized for rental property management workflows.
