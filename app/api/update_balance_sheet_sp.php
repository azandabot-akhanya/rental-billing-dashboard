<?php
// Bypass REQUEST_METHOD check
$_SERVER['REQUEST_METHOD'] = 'GET';

require_once 'config.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    echo "Connected to database successfully\n";

    // Drop existing procedure
    $db->exec("DROP PROCEDURE IF EXISTS sp_get_balance_sheet");
    echo "Dropped existing sp_get_balance_sheet procedure\n";

    // Create new procedure with 3 parameters (company_id, from_date, to_date)
    $sql = "
    CREATE PROCEDURE sp_get_balance_sheet(
        IN p_company_id INT,
        IN p_from_date DATE,
        IN p_to_date DATE
    )
    BEGIN
        -- Return all transactions within the date range
        SELECT
            t.transaction_id,
            t.transaction_date,
            t.transaction_type,
            t.description,
            t.reference_number,
            t.amount AS this_month_amount,
            t.amount AS total_amount,
            a.account_name,
            COALESCE(p.property_name, '') AS property_name,
            COALESCE(u.unit_number, '') AS unit_number
        FROM (
            -- Deposits
            SELECT
                d.deposit_id AS transaction_id,
                d.transaction_date,
                'deposit' AS transaction_type,
                d.description,
                d.reference_number,
                d.amount,
                d.account_id,
                d.property_id,
                d.unit_id
            FROM deposits d
            WHERE d.company_id = p_company_id
                AND d.transaction_date BETWEEN p_from_date AND p_to_date

            UNION ALL

            -- Expenses
            SELECT
                e.expense_id AS transaction_id,
                e.transaction_date,
                'expense' AS transaction_type,
                e.description,
                e.reference_number,
                -e.amount AS amount,
                e.account_id,
                e.property_id,
                e.unit_id
            FROM expenses e
            WHERE e.company_id = p_company_id
                AND e.transaction_date BETWEEN p_from_date AND p_to_date
        ) t
        LEFT JOIN accounts a ON t.account_id = a.account_id
        LEFT JOIN properties p ON t.property_id = p.property_id
        LEFT JOIN units u ON t.unit_id = u.unit_id
        ORDER BY t.transaction_date DESC, t.transaction_id DESC;

        -- Return summary totals
        SELECT
            COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposits,
            COALESCE(COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END), 0) AS total_deposit_count,
            COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN ABS(amount) ELSE 0 END), 0) AS total_expenses,
            COALESCE(COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END), 0) AS total_expense_count,
            COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE -ABS(amount) END), 0) AS net_cash_flow
        FROM (
            SELECT
                'deposit' AS transaction_type,
                d.amount
            FROM deposits d
            WHERE d.company_id = p_company_id
                AND d.transaction_date BETWEEN p_from_date AND p_to_date

            UNION ALL

            SELECT
                'expense' AS transaction_type,
                e.amount
            FROM expenses e
            WHERE e.company_id = p_company_id
                AND e.transaction_date BETWEEN p_from_date AND p_to_date
        ) summary;
    END
    ";

    $db->exec($sql);
    echo "Created new sp_get_balance_sheet procedure with 3 parameters (company_id, from_date, to_date)\n";

    // Test the procedure
    echo "\nTesting the procedure...\n";
    $stmt = $db->prepare("CALL sp_get_balance_sheet(1, '2025-11-01', '2025-11-18')");
    $stmt->execute();

    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Transactions returned: " . count($transactions) . "\n";

    $stmt->nextRowset();
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Totals: \n";
    print_r($totals);

    $stmt->closeCursor();

    echo "\n✅ Success! The stored procedure has been updated and tested.\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
}
