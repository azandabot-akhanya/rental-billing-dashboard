-- Database Testing Queries
-- Run these queries to verify database structure

-- Test 1: Check if all required tables exist
SELECT 'Checking tables...' as status;
SHOW TABLES;

-- Test 2: Check users table
SELECT 'Users table:' as status;
SELECT * FROM users LIMIT 5;

-- Test 3: Check companies table
SELECT 'Companies table:' as status;
SELECT * FROM companies LIMIT 5;

-- Test 4: Check properties table
SELECT 'Properties table:' as status;
SELECT * FROM properties LIMIT 5;

-- Test 5: Check tenants table
SELECT 'Tenants table:' as status;
SELECT * FROM tenants LIMIT 5;

-- Test 6: Check invoices table
SELECT 'Invoices table:' as status;
SELECT * FROM invoices LIMIT 5;

-- Test 7: Check transactions/deposits table
SELECT 'Checking deposits table:' as status;
SELECT * FROM deposits LIMIT 5;

-- Test 8: Check expenses table
SELECT 'Expenses table:' as status;
SELECT * FROM expenses LIMIT 5;

-- Test 9: Check categories table
SELECT 'Categories table:' as status;
SELECT * FROM categories LIMIT 5;

-- Test 10: Check suppliers table
SELECT 'Suppliers table:' as status;
SELECT * FROM suppliers LIMIT 5;

-- Test 11: Count records in each table
SELECT 'Record counts:' as status;
SELECT
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM companies) as companies_count,
    (SELECT COUNT(*) FROM properties) as properties_count,
    (SELECT COUNT(*) FROM tenants) as tenants_count,
    (SELECT COUNT(*) FROM invoices) as invoices_count;
