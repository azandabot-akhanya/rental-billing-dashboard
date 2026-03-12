-- Opening Balances Table for Balance B/F (Brought Forward)
-- This table stores the opening balances for tenants at the start of a period
-- Inspired by Xero's Conversion Balances, QuickBooks Opening Balance, and Sage Opening Balances

CREATE TABLE IF NOT EXISTS opening_balances (
    opening_balance_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    tenant_id INT NOT NULL,
    property_id INT DEFAULT NULL,

    -- Financial Period Information
    conversion_date DATE NOT NULL COMMENT 'The date from which the system starts tracking (e.g., March 1, 2025)',
    financial_year INT NOT NULL COMMENT 'Financial year (e.g., 2025)',
    period_name VARCHAR(50) DEFAULT NULL COMMENT 'Optional period name (e.g., "Q1 2025", "March 2025")',

    -- Opening Balance Amounts
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total balance brought forward',
    outstanding_rent DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Rent arrears from previous period',
    outstanding_utilities DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Utilities arrears from previous period',
    outstanding_other DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Other charges from previous period',
    advance_payments DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Prepayments/credits brought forward',

    -- Metadata
    notes TEXT DEFAULT NULL COMMENT 'Additional notes about the opening balance',
    created_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,

    -- Constraints
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(property_id) ON DELETE SET NULL,

    -- Ensure only one opening balance per tenant per period
    UNIQUE KEY unique_tenant_period (company_id, tenant_id, conversion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Opening balances (Balance B/F) for tenants';

-- Company-wide opening balances for overall financial position
CREATE TABLE IF NOT EXISTS company_opening_balances (
    company_opening_balance_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,

    -- Financial Period
    conversion_date DATE NOT NULL COMMENT 'Conversion/start date',
    financial_year INT NOT NULL,

    -- Account Balances (Balance Sheet Accounts)
    bank_balance DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Bank account opening balance',
    cash_on_hand DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Cash opening balance',
    accounts_receivable DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total AR brought forward',
    accounts_payable DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Total AP brought forward',

    -- Income/Expense brought forward (usually zero at year-end, but useful for mid-year)
    ytd_income DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Year-to-date income if starting mid-year',
    ytd_expenses DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Year-to-date expenses if starting mid-year',
    retained_earnings DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Retained earnings from previous years',

    -- Metadata
    notes TEXT DEFAULT NULL,
    created_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,

    -- Constraints
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_period (company_id, conversion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Company-wide opening balances for financial periods';

-- Stored Procedure: Get Opening Balance for a Tenant
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS sp_get_tenant_opening_balance(
    IN p_company_id INT,
    IN p_tenant_id INT,
    IN p_as_of_date DATE
)
BEGIN
    -- Get the most recent opening balance on or before the specified date
    SELECT
        ob.*,
        t.full_name as tenant_name,
        p.property_name
    FROM opening_balances ob
    LEFT JOIN tenants t ON ob.tenant_id = t.tenant_id
    LEFT JOIN properties p ON ob.property_id = p.property_id
    WHERE ob.company_id = p_company_id
        AND ob.tenant_id = p_tenant_id
        AND ob.conversion_date <= p_as_of_date
        AND ob.is_active = 1
    ORDER BY ob.conversion_date DESC
    LIMIT 1;
END$$

DELIMITER ;

-- Stored Procedure: Calculate Current Balance (Opening Balance + Transactions)
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS sp_calculate_tenant_current_balance(
    IN p_company_id INT,
    IN p_tenant_id INT,
    IN p_as_of_date DATE
)
BEGIN
    DECLARE v_opening_balance DECIMAL(15, 2) DEFAULT 0.00;
    DECLARE v_conversion_date DATE DEFAULT NULL;

    -- Get opening balance
    SELECT
        COALESCE(opening_balance, 0.00),
        conversion_date
    INTO
        v_opening_balance,
        v_conversion_date
    FROM opening_balances
    WHERE company_id = p_company_id
        AND tenant_id = p_tenant_id
        AND conversion_date <= p_as_of_date
        AND is_active = 1
    ORDER BY conversion_date DESC
    LIMIT 1;

    -- If no opening balance found, use earliest transaction date or provided date
    IF v_conversion_date IS NULL THEN
        SET v_conversion_date = '2000-01-01'; -- Far past date to include all transactions
    END IF;

    -- Calculate current balance = Opening Balance + Invoices - Payments
    SELECT
        v_opening_balance as opening_balance,
        v_conversion_date as conversion_date,
        COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.total_amount ELSE 0 END), 0) as outstanding_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as paid_invoices,
        COALESCE((SELECT SUM(amount) FROM transactions
                  WHERE tenant_id = p_tenant_id
                    AND company_id = p_company_id
                    AND transaction_type = 'payment'
                    AND transaction_date BETWEEN v_conversion_date AND p_as_of_date), 0) as total_payments,
        v_opening_balance +
        COALESCE(SUM(i.total_amount), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions
                  WHERE tenant_id = p_tenant_id
                    AND company_id = p_company_id
                    AND transaction_type = 'payment'
                    AND transaction_date BETWEEN v_conversion_date AND p_as_of_date), 0) as current_balance
    FROM tenants t
    LEFT JOIN invoices i ON i.tenant_id = t.tenant_id
        AND i.company_id = p_company_id
        AND i.invoice_date BETWEEN v_conversion_date AND p_as_of_date
    WHERE t.tenant_id = p_tenant_id
        AND t.company_id = p_company_id
    GROUP BY t.tenant_id;
END$$

DELIMITER ;

-- Stored Procedure: Create/Update Opening Balance
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS sp_upsert_opening_balance(
    IN p_company_id INT,
    IN p_tenant_id INT,
    IN p_property_id INT,
    IN p_conversion_date DATE,
    IN p_financial_year INT,
    IN p_opening_balance DECIMAL(15, 2),
    IN p_outstanding_rent DECIMAL(15, 2),
    IN p_outstanding_utilities DECIMAL(15, 2),
    IN p_outstanding_other DECIMAL(15, 2),
    IN p_advance_payments DECIMAL(15, 2),
    IN p_notes TEXT,
    IN p_created_by VARCHAR(100)
)
BEGIN
    -- Insert or update opening balance
    INSERT INTO opening_balances (
        company_id, tenant_id, property_id, conversion_date, financial_year,
        opening_balance, outstanding_rent, outstanding_utilities,
        outstanding_other, advance_payments, notes, created_by
    ) VALUES (
        p_company_id, p_tenant_id, p_property_id, p_conversion_date, p_financial_year,
        p_opening_balance, p_outstanding_rent, p_outstanding_utilities,
        p_outstanding_other, p_advance_payments, p_notes, p_created_by
    )
    ON DUPLICATE KEY UPDATE
        property_id = p_property_id,
        financial_year = p_financial_year,
        opening_balance = p_opening_balance,
        outstanding_rent = p_outstanding_rent,
        outstanding_utilities = p_outstanding_utilities,
        outstanding_other = p_outstanding_other,
        advance_payments = p_advance_payments,
        notes = p_notes,
        updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;
