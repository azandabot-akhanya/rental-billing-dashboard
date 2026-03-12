-- ===============================================
-- COMPLETE DATABASE SETUP FOR RENTAL BILLING SYSTEM
-- Run this on your database: thynkxv8r6h8_thynkxpro
-- ===============================================

USE thynkxv8r6h8_thynkxpro;

-- ===============================================
-- STORED PROCEDURES
-- ===============================================

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS GetAllCompanies;
DROP PROCEDURE IF EXISTS GetCompanyById;
DROP PROCEDURE IF EXISTS CreateCompany;
DROP PROCEDURE IF EXISTS UpdateCompany;
DROP PROCEDURE IF EXISTS DeleteCompany;
DROP PROCEDURE IF EXISTS GetTenantsByCompany;
DROP PROCEDURE IF EXISTS GetTenantById;
DROP PROCEDURE IF EXISTS CreateTenant;
DROP PROCEDURE IF EXISTS UpdateTenant;
DROP PROCEDURE IF EXISTS DeleteTenant;
DROP PROCEDURE IF EXISTS GetCashFlowData;
DROP PROCEDURE IF EXISTS GetIncomeExpenseRatio;
DROP PROCEDURE IF EXISTS GetRecentInvoices;
DROP PROCEDURE IF EXISTS GetLatestIncome;
DROP PROCEDURE IF EXISTS GetLatestExpenses;
DROP PROCEDURE IF EXISTS GetDashboardStats;
DROP PROCEDURE IF EXISTS sp_get_tenant_statement;

-- ===============================================
-- COMPANY PROCEDURES
-- ===============================================

DELIMITER //

CREATE PROCEDURE GetAllCompanies()
BEGIN
    SELECT company_id, company_name, address, contact_number, email, banking_details, created_at
    FROM companies
    WHERE is_active = 1
    ORDER BY company_name;
END //

CREATE PROCEDURE GetCompanyById(IN p_company_id INT)
BEGIN
    SELECT company_id, company_name, address, contact_number, email, banking_details, created_at
    FROM companies
    WHERE company_id = p_company_id AND is_active = 1;
END //

CREATE PROCEDURE CreateCompany(
    IN p_company_name VARCHAR(255),
    IN p_address TEXT,
    IN p_contact_number VARCHAR(50),
    IN p_email VARCHAR(255),
    IN p_banking_details TEXT
)
BEGIN
    INSERT INTO companies (company_name, address, contact_number, email, banking_details, created_at, is_active)
    VALUES (p_company_name, p_address, p_contact_number, p_email, p_banking_details, NOW(), 1);
END //

CREATE PROCEDURE UpdateCompany(
    IN p_company_id INT,
    IN p_company_name VARCHAR(255),
    IN p_address TEXT,
    IN p_contact_number VARCHAR(50),
    IN p_email VARCHAR(255),
    IN p_banking_details TEXT
)
BEGIN
    UPDATE companies
    SET company_name = p_company_name,
        address = p_address,
        contact_number = p_contact_number,
        email = p_email,
        banking_details = p_banking_details
    WHERE company_id = p_company_id;
END //

CREATE PROCEDURE DeleteCompany(IN p_company_id INT)
BEGIN
    UPDATE companies SET is_active = 0 WHERE company_id = p_company_id;
END //

-- ===============================================
-- TENANT PROCEDURES
-- ===============================================

CREATE PROCEDURE GetTenantsByCompany(IN p_company_id INT)
BEGIN
    SELECT t.*, p.property_name
    FROM tenants t
    LEFT JOIN properties p ON t.property_id = p.property_id
    WHERE t.company_id = p_company_id
    AND t.is_active = 1
    ORDER BY t.full_name;
END //

CREATE PROCEDURE GetTenantById(IN p_tenant_id INT)
BEGIN
    SELECT t.*, p.property_name
    FROM tenants t
    LEFT JOIN properties p ON t.property_id = p.property_id
    WHERE t.tenant_id = p_tenant_id;
END //

CREATE PROCEDURE CreateTenant(
    IN p_company_id INT,
    IN p_property_id INT,
    IN p_unit_number VARCHAR(50),
    IN p_full_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_phone VARCHAR(50),
    IN p_id_number VARCHAR(50),
    IN p_emergency_contact_name VARCHAR(255),
    IN p_emergency_contact_phone VARCHAR(50),
    IN p_notes TEXT,
    IN p_status VARCHAR(50)
)
BEGIN
    INSERT INTO tenants (
        company_id, property_id, unit_number, full_name, email, phone,
        id_number, emergency_contact_name, emergency_contact_phone,
        notes, status, created_at, is_active
    )
    VALUES (
        p_company_id, p_property_id, p_unit_number, p_full_name, p_email, p_phone,
        p_id_number, p_emergency_contact_name, p_emergency_contact_phone,
        p_notes, COALESCE(p_status, 'active'), NOW(), 1
    );
END //

CREATE PROCEDURE UpdateTenant(
    IN p_tenant_id INT,
    IN p_property_id INT,
    IN p_unit_number VARCHAR(50),
    IN p_full_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_phone VARCHAR(50),
    IN p_id_number VARCHAR(50),
    IN p_emergency_contact_name VARCHAR(255),
    IN p_emergency_contact_phone VARCHAR(50),
    IN p_notes TEXT,
    IN p_status VARCHAR(50)
)
BEGIN
    UPDATE tenants
    SET property_id = COALESCE(p_property_id, property_id),
        unit_number = COALESCE(p_unit_number, unit_number),
        full_name = COALESCE(p_full_name, full_name),
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        id_number = COALESCE(p_id_number, id_number),
        emergency_contact_name = COALESCE(p_emergency_contact_name, emergency_contact_name),
        emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
        notes = COALESCE(p_notes, notes),
        status = COALESCE(p_status, status)
    WHERE tenant_id = p_tenant_id;
END //

CREATE PROCEDURE DeleteTenant(IN p_tenant_id INT)
BEGIN
    UPDATE tenants SET is_active = 0 WHERE tenant_id = p_tenant_id;
END //

-- ===============================================
-- DASHBOARD PROCEDURES
-- ===============================================

CREATE PROCEDURE GetCashFlowData(IN p_company_id INT)
BEGIN
    SELECT
        DATE_FORMAT(transaction_date, '%b') as month,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
    FROM (
        SELECT transaction_date, amount, 'income' as transaction_type
        FROM deposits
        WHERE company_id = p_company_id
          AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        UNION ALL
        SELECT transaction_date, amount, 'expense' as transaction_type
        FROM expenses
        WHERE company_id = p_company_id
          AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    ) combined
    GROUP BY DATE_FORMAT(transaction_date, '%Y-%m'), DATE_FORMAT(transaction_date, '%b')
    ORDER BY DATE_FORMAT(transaction_date, '%Y-%m');
END //

CREATE PROCEDURE GetIncomeExpenseRatio(IN p_company_id INT)
BEGIN
    SELECT
        'Income' as name,
        COALESCE(SUM(amount), 0) as value,
        '#22c55e' as color
    FROM deposits
    WHERE company_id = p_company_id
      AND YEAR(transaction_date) = YEAR(CURDATE())

    UNION ALL

    SELECT
        'Expenses' as name,
        COALESCE(SUM(amount), 0) as value,
        '#ef4444' as color
    FROM expenses
    WHERE company_id = p_company_id
      AND YEAR(transaction_date) = YEAR(CURDATE());
END //

CREATE PROCEDURE GetRecentInvoices(IN p_company_id INT)
BEGIN
    SELECT
        i.invoice_id,
        t.full_name as account,
        i.total_amount,
        i.invoice_date as date,
        i.status
    FROM invoices i
    LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
    WHERE i.company_id = p_company_id
    ORDER BY i.invoice_date DESC
    LIMIT 5;
END //

CREATE PROCEDURE GetLatestIncome(IN p_company_id INT)
BEGIN
    SELECT
        d.transaction_date as date,
        c.name as description,
        d.amount
    FROM deposits d
    LEFT JOIN categories c ON d.account_id = c.category_id
    WHERE d.company_id = p_company_id
    ORDER BY d.transaction_date DESC
    LIMIT 5;
END //

CREATE PROCEDURE GetLatestExpenses(IN p_company_id INT)
BEGIN
    SELECT
        e.transaction_date as date,
        c.name as description,
        e.amount
    FROM expenses e
    LEFT JOIN categories c ON e.account_id = c.category_id
    WHERE e.company_id = p_company_id
    ORDER BY e.transaction_date DESC
    LIMIT 5;
END //

CREATE PROCEDURE GetDashboardStats(IN p_company_id INT)
BEGIN
    SELECT
        CONCAT('R ', FORMAT(
            COALESCE((SELECT SUM(amount) FROM deposits WHERE company_id = p_company_id), 0) -
            COALESCE((SELECT SUM(amount) FROM expenses WHERE company_id = p_company_id), 0),
            2
        )) as netWorth,
        CONCAT('R ', FORMAT(
            COALESCE((SELECT SUM(amount) FROM deposits
                      WHERE company_id = p_company_id
                      AND DATE(transaction_date) = CURDATE()), 0),
            2
        )) as incomeToday,
        CONCAT('R ', FORMAT(
            COALESCE((SELECT SUM(amount) FROM expenses
                      WHERE company_id = p_company_id
                      AND DATE(transaction_date) = CURDATE()), 0),
            2
        )) as expenseToday,
        CONCAT('R ', FORMAT(
            COALESCE((SELECT SUM(amount) FROM deposits
                      WHERE company_id = p_company_id
                      AND MONTH(transaction_date) = MONTH(CURDATE())
                      AND YEAR(transaction_date) = YEAR(CURDATE())), 0),
            2
        )) as incomeThisMonth,
        CONCAT('R ', FORMAT(
            COALESCE((SELECT SUM(amount) FROM expenses
                      WHERE company_id = p_company_id
                      AND MONTH(transaction_date) = MONTH(CURDATE())
                      AND YEAR(transaction_date) = YEAR(CURDATE())), 0),
            2
        )) as expenseThisMonth;
END //

CREATE PROCEDURE sp_get_tenant_statement(
    IN p_company_id INT,
    IN p_tenant_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Summary
    SELECT
        COALESCE((SELECT SUM(amount)
                  FROM deposits
                  WHERE tenant_id = p_tenant_id
                  AND transaction_date < p_start_date), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_debits
    FROM (
        SELECT amount, 'income' as transaction_type
        FROM deposits
        WHERE tenant_id = p_tenant_id
          AND transaction_date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT amount, 'expense' as transaction_type
        FROM expenses
        WHERE tenant_id = p_tenant_id
          AND transaction_date BETWEEN p_start_date AND p_end_date
    ) combined;

    -- Transactions
    SELECT
        transaction_date as date,
        description,
        CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END as credit,
        CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END as debit
    FROM (
        SELECT transaction_date, CONCAT('Deposit - ', COALESCE(description, 'Payment')) as description, amount, 'income' as transaction_type
        FROM deposits
        WHERE tenant_id = p_tenant_id
          AND transaction_date BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT transaction_date, CONCAT('Expense - ', COALESCE(description, 'Charge')) as description, amount, 'expense' as transaction_type
        FROM expenses
        WHERE tenant_id = p_tenant_id
          AND transaction_date BETWEEN p_start_date AND p_end_date
    ) combined
    ORDER BY transaction_date;
END //

DELIMITER ;

-- ===============================================
-- TEST DATA (Optional - remove if you have data)
-- ===============================================

-- Create test user if not exists
INSERT IGNORE INTO users (user_id, email, plain_password, created_at)
VALUES (1, 'admin@test.com', 'password123', NOW());

-- Create test company if not exists
INSERT IGNORE INTO companies (company_id, company_name, address, contact_number, email, is_active, created_at)
VALUES (1, 'Test Company', '123 Main St', '0123456789', 'info@testcompany.com', 1, NOW());

SELECT 'Database setup complete!' as status;
