-- Fix tenant statement stored procedure to properly retrieve transactions
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_tenant_statement//

CREATE PROCEDURE sp_get_tenant_statement(
    IN p_company_id INT,
    IN p_tenant_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Summary: Calculate opening balance, credits, and debits
    SELECT
        COALESCE((
            SELECT SUM(d.amount)
            FROM deposits d
            WHERE d.tenant_id = p_tenant_id
            AND d.transaction_date < p_start_date
        ), 0) as opening_balance,
        COALESCE((
            SELECT SUM(d.amount)
            FROM deposits d
            WHERE d.tenant_id = p_tenant_id
            AND d.transaction_date BETWEEN p_start_date AND p_end_date
        ), 0) as total_credits,
        COALESCE((
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.tenant_id = p_tenant_id
            AND e.transaction_date BETWEEN p_start_date AND p_end_date
        ), 0) as total_debits;

    -- Transactions: Get detailed transactions with proper fields
    SELECT
        DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
        description,
        reference_number as reference,
        CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END as debit,
        CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END as credit
    FROM (
        SELECT
            transaction_date,
            CONCAT('Deposit - ', COALESCE(description, 'Payment received')) as description,
            COALESCE(reference_number, CONCAT('DEP-', deposit_id)) as reference_number,
            amount,
            'income' as transaction_type
        FROM deposits
        WHERE tenant_id = p_tenant_id
        AND transaction_date BETWEEN p_start_date AND p_end_date

        UNION ALL

        SELECT
            transaction_date,
            CONCAT('Expense - ', COALESCE(description, 'Charge applied')) as description,
            COALESCE(reference_number, CONCAT('EXP-', expense_id)) as reference_number,
            amount,
            'expense' as transaction_type
        FROM expenses
        WHERE tenant_id = p_tenant_id
        AND transaction_date BETWEEN p_start_date AND p_end_date
    ) combined
    ORDER BY transaction_date ASC, transaction_type DESC;
END//

DELIMITER ;
