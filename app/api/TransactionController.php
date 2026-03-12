<?php
require_once 'ApiController.php';

class TransactionController extends ApiController {
    public function processRequest() {
        switch ($this->requestMethod) {
            case 'GET':
                // Check for transactions/details endpoint first
                if (in_array('transactions', $this->params) && in_array('details', $this->params)) {
                    $this->getTransactionDetails();
                } elseif (in_array('transactions', $this->params) && count($this->params) === 1) {
                    $this->getTransactions();
                } elseif (in_array('balance-sheet', $this->params)) {
                    $this->getBalanceSheet();
                } elseif (in_array('account-statement', $this->params)) {
                    $this->getAccountStatement();
                } elseif (in_array('profit-loss', $this->params) || in_array('profit-loss-statement', $this->params)) {
                    $this->getProfitLossStatement();
                } elseif (in_array('deposits', $this->params) && in_array('receipt', $this->params)) {
                    $this->generateDepositReceipt();
                } elseif (in_array('expenses', $this->params) && in_array('receipt', $this->params)) {
                    $this->generateExpenseReceipt();
                } elseif (in_array('deposits', $this->params) && !in_array('receipt', $this->params)) {
                    $this->getDeposits();
                } else {
                    $this->sendResponse(["message" => "Invalid GET endpoint"], 404);
                }
                break;

            case 'PUT':
                $data = $this->getRequestBody();

                if (in_array('deposits', $this->params) && isset($this->params[1])) {
                    $this->updateDeposit($data);
                } elseif (in_array('expenses', $this->params) && isset($this->params[1])) {
                    $this->updateExpense($data);
                } else {
                    $this->sendResponse(["message" => "Invalid PUT endpoint"], 404);
                }
                break;

            case 'DELETE':
                if (in_array('deposits', $this->params) && isset($this->params[1])) {
                    $this->deleteDeposit();
                } elseif (in_array('expenses', $this->params) && isset($this->params[1])) {
                    $this->deleteExpense();
                } else {
                    $this->sendResponse(["message" => "Invalid DELETE endpoint"], 404);
                }
                break;

            case 'POST':
                $data = $this->getRequestBody();

                if (in_array('deposits', $this->params)) {
                    $this->createDeposit($data);
                } elseif (in_array('expenses', $this->params)) {
                    $this->createExpense($data);
                } else {
                    $this->sendResponse(["message" => "Invalid POST endpoint"], 404);
                }
                break;

            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
        }
    }

    private function getBalanceSheet() {
        $companyId = $_GET['company_id'] ?? null;
        $fromDate = $_GET['from_date'] ?? date('Y-m-01');
        $toDate = $_GET['to_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing required parameter: company_id"], 400);
            return;
        }

        try {
            // Get deposits with related data
            $depositStmt = $this->db->prepare("
                SELECT
                    d.deposit_id as transaction_id,
                    DATE_FORMAT(d.transaction_date, '%Y-%m-%d') as transaction_date,
                    'deposit' as transaction_type,
                    d.description,
                    d.reference_number,
                    d.amount as this_month_amount,
                    d.amount as total_amount,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number
                FROM deposits d
                LEFT JOIN accounts a ON d.account_id = a.account_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN units u ON d.unit_id = u.unit_id
                WHERE d.company_id = ? AND d.transaction_date BETWEEN ? AND ?
            ");
            $depositStmt->execute([$companyId, $fromDate, $toDate]);
            $deposits = $depositStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get expenses with related data
            $expenseStmt = $this->db->prepare("
                SELECT
                    e.expense_id as transaction_id,
                    DATE_FORMAT(e.transaction_date, '%Y-%m-%d') as transaction_date,
                    'expense' as transaction_type,
                    e.description,
                    e.reference_number,
                    -e.amount as this_month_amount,
                    e.amount as total_amount,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number
                FROM expenses e
                LEFT JOIN accounts a ON e.account_id = a.account_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                LEFT JOIN units u ON e.unit_id = u.unit_id
                WHERE e.company_id = ? AND e.transaction_date BETWEEN ? AND ?
            ");
            $expenseStmt->execute([$companyId, $fromDate, $toDate]);
            $expenses = $expenseStmt->fetchAll(PDO::FETCH_ASSOC);

            // Merge and sort by date
            $transactions = array_merge($deposits, $expenses);
            usort($transactions, function($a, $b) {
                return strcmp($a['transaction_date'], $b['transaction_date']);
            });

            // Calculate totals
            $totalDeposits = 0;
            $totalExpenses = 0;
            $depositCount = count($deposits);
            $expenseCount = count($expenses);

            foreach ($deposits as $d) {
                $totalDeposits += floatval($d['this_month_amount']);
            }
            foreach ($expenses as $e) {
                $totalExpenses += abs(floatval($e['this_month_amount']));
            }

            $totals = [
                'total_deposits' => $totalDeposits,
                'total_expenses' => $totalExpenses,
                'net_cash_flow' => $totalDeposits - $totalExpenses,
                'total_deposit_count' => $depositCount,
                'total_expense_count' => $expenseCount
            ];

            $this->sendResponse([
                "success" => true,
                "transactions" => $transactions,
                "totals" => $totals
            ]);
        } catch (PDOException $e) {
            error_log("Error in getBalanceSheet: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch balance sheet",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getTransactionDetails() {
        $companyId = $_GET['company_id'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing company_id"], 400);
            return;
        }

        try {
            error_log("Fetching all transactions for company_id: " . $companyId);

            // Get deposits with related names
            $depositStmt = $this->db->prepare("
                SELECT
                    d.deposit_id as transaction_id,
                    'deposit' as transaction_type,
                    d.transaction_date,
                    d.description,
                    d.amount,
                    d.reference_number,
                    d.account_id,
                    d.property_id,
                    d.unit_id,
                    d.tenant_id,
                    d.category_id,
                    d.payment_method_id,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    COALESCE(t.full_name, '') AS tenant_name,
                    '' AS vendor_name,
                    COALESCE(pm.method_name, '') AS payment_method_name,
                    'paid' AS status,
                    d.created_at,
                    d.updated_at
                FROM deposits d
                LEFT JOIN accounts a ON d.account_id = a.account_id
                LEFT JOIN categories cat ON d.category_id = cat.category_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN units u ON d.unit_id = u.unit_id
                LEFT JOIN tenants t ON d.tenant_id = t.tenant_id
                LEFT JOIN payment_methods pm ON d.payment_method_id = pm.payment_method_id
                WHERE d.company_id = ?
                ORDER BY d.transaction_date DESC
            ");
            $depositStmt->execute([$companyId]);
            $deposits = $depositStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get expenses with related names
            $expenseStmt = $this->db->prepare("
                SELECT
                    e.expense_id as transaction_id,
                    'expense' as transaction_type,
                    e.transaction_date,
                    e.description,
                    e.amount,
                    e.reference_number,
                    e.account_id,
                    e.property_id,
                    e.unit_id,
                    e.vendor_id,
                    e.category_id,
                    e.payment_method_id,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    '' AS tenant_name,
                    COALESCE(v.name, '') AS vendor_name,
                    COALESCE(pm.method_name, '') AS payment_method_name,
                    'paid' AS status,
                    e.created_at,
                    e.updated_at
                FROM expenses e
                LEFT JOIN accounts a ON e.account_id = a.account_id
                LEFT JOIN categories cat ON e.category_id = cat.category_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                LEFT JOIN units u ON e.unit_id = u.unit_id
                LEFT JOIN suppliers v ON e.vendor_id = v.supplier_id
                LEFT JOIN payment_methods pm ON e.payment_method_id = pm.payment_method_id
                WHERE e.company_id = ?
                ORDER BY e.transaction_date DESC
            ");
            $expenseStmt->execute([$companyId]);
            $expenses = $expenseStmt->fetchAll(PDO::FETCH_ASSOC);

            // Merge and sort
            $transactions = array_merge($deposits, $expenses);
            usort($transactions, function($a, $b) {
                return strcmp($b['transaction_date'], $a['transaction_date']);
            });

            error_log("Fetched " . count($transactions) . " transactions");

            $this->sendResponse([
                "success" => true,
                "transactions" => $transactions
            ]);
        } catch (PDOException $e) {
            error_log("Database error in getTransactionDetails: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch transactions",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function updateDeposit($data) {
        $depositId = $this->params[1] ?? null;

        if (!$depositId) {
            $this->sendResponse(["success" => false, "message" => "Deposit ID required"], 400);
            return;
        }

        if (empty($data['amount']) || empty($data['account_id'])) {
            $this->sendResponse(["success" => false, "message" => "Amount and account ID are required"], 400);
            return;
        }

        try {
            $updates = [];
            $params = [];

            if (isset($data['amount'])) {
                $updates[] = "amount = ?";
                $params[] = $data['amount'];
            }
            if (isset($data['account_id'])) {
                $updates[] = "account_id = ?";
                $params[] = $data['account_id'];
            }
            if (isset($data['property_id'])) {
                $updates[] = "property_id = ?";
                $params[] = $data['property_id'];
            }
            if (isset($data['unit_id'])) {
                $updates[] = "unit_id = ?";
                $params[] = $data['unit_id'];
            }
            if (isset($data['tenant_id'])) {
                $updates[] = "tenant_id = ?";
                $params[] = $data['tenant_id'];
            }
            if (isset($data['category_id'])) {
                $updates[] = "category_id = ?";
                $params[] = $data['category_id'];
            }
            if (isset($data['payment_method_id'])) {
                $updates[] = "payment_method_id = ?";
                $params[] = $data['payment_method_id'];
            }
            if (isset($data['reference_number'])) {
                $updates[] = "reference_number = ?";
                $params[] = $data['reference_number'];
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            if (isset($data['transaction_date'])) {
                $updates[] = "transaction_date = ?";
                $params[] = $data['transaction_date'];
            }

            $params[] = $depositId;
            $sql = "UPDATE deposits SET " . implode(", ", $updates) . " WHERE deposit_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->sendResponse([
                "success" => true,
                "message" => "Deposit updated successfully"
            ]);
        } catch (PDOException $e) {
            error_log("Error updating deposit: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update deposit",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function updateExpense($data) {
        $expenseId = $this->params[1] ?? null;

        if (!$expenseId) {
            $this->sendResponse(["success" => false, "message" => "Expense ID required"], 400);
            return;
        }

        if (empty($data['amount']) || empty($data['account_id'])) {
            $this->sendResponse(["success" => false, "message" => "Amount and account ID are required"], 400);
            return;
        }

        try {
            $updates = [];
            $params = [];

            if (isset($data['amount'])) {
                $updates[] = "amount = ?";
                $params[] = $data['amount'];
            }
            if (isset($data['account_id'])) {
                $updates[] = "account_id = ?";
                $params[] = $data['account_id'];
            }
            if (isset($data['property_id'])) {
                $updates[] = "property_id = ?";
                $params[] = $data['property_id'];
            }
            if (isset($data['unit_id'])) {
                $updates[] = "unit_id = ?";
                $params[] = $data['unit_id'];
            }
            if (isset($data['vendor_id'])) {
                $updates[] = "vendor_id = ?";
                $params[] = $data['vendor_id'];
            }
            if (isset($data['category_id'])) {
                $updates[] = "category_id = ?";
                $params[] = $data['category_id'];
            }
            if (isset($data['payment_method_id'])) {
                $updates[] = "payment_method_id = ?";
                $params[] = $data['payment_method_id'];
            }
            if (isset($data['reference_number'])) {
                $updates[] = "reference_number = ?";
                $params[] = $data['reference_number'];
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            if (isset($data['transaction_date'])) {
                $updates[] = "transaction_date = ?";
                $params[] = $data['transaction_date'];
            }

            $params[] = $expenseId;
            $sql = "UPDATE expenses SET " . implode(", ", $updates) . " WHERE expense_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->sendResponse([
                "success" => true,
                "message" => "Expense updated successfully"
            ]);
        } catch (PDOException $e) {
            error_log("Error updating expense: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update expense",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function deleteDeposit() {
        $depositId = $this->params[1] ?? null;

        if (!$depositId) {
            $this->sendResponse(["success" => false, "message" => "Deposit ID required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM deposits WHERE deposit_id = ?");
            $stmt->execute([$depositId]);

            $this->sendResponse([
                "success" => true,
                "message" => "Deposit deleted successfully"
            ]);
        } catch (PDOException $e) {
            error_log("Error deleting deposit: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete deposit",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function deleteExpense() {
        $expenseId = $this->params[1] ?? null;

        if (!$expenseId) {
            $this->sendResponse(["success" => false, "message" => "Expense ID required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM expenses WHERE expense_id = ?");
            $stmt->execute([$expenseId]);

            $this->sendResponse([
                "success" => true,
                "message" => "Expense deleted successfully"
            ]);
        } catch (PDOException $e) {
            error_log("Error deleting expense: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete expense",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getAccountStatement() {
        $companyId = $_GET['company_id'] ?? null;
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse([
                "success" => false,
                "message" => "Missing required parameter: company_id"
            ], 400);
            return;
        }

        try {
            // Calculate opening balance
            $openingStmt = $this->db->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_date < ? THEN amount ELSE 0 END), 0) as deposits,
                    COALESCE(SUM(CASE WHEN transaction_date < ? THEN amount ELSE 0 END), 0) as expenses
                FROM (
                    SELECT transaction_date, amount FROM deposits WHERE company_id = ?
                    UNION ALL
                    SELECT transaction_date, -amount FROM expenses WHERE company_id = ?
                ) combined
            ");
            $openingStmt->execute([$startDate, $startDate, $companyId, $companyId]);
            $opening = $openingStmt->fetch(PDO::FETCH_ASSOC);
            $openingBalance = floatval($opening['deposits']) - floatval($opening['expenses']);

            // Get transactions in period
            $transStmt = $this->db->prepare("
                SELECT
                    DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
                    description,
                    reference_number as reference,
                    0 as debit,
                    amount as credit,
                    'deposit' as type
                FROM deposits
                WHERE company_id = ? AND transaction_date BETWEEN ? AND ?
                UNION ALL
                SELECT
                    DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
                    description,
                    reference_number as reference,
                    amount as debit,
                    0 as credit,
                    'expense' as type
                FROM expenses
                WHERE company_id = ? AND transaction_date BETWEEN ? AND ?
                ORDER BY date ASC
            ");
            $transStmt->execute([$companyId, $startDate, $endDate, $companyId, $startDate, $endDate]);
            $transactions = $transStmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals
            $totalCredits = 0;
            $totalDebits = 0;
            foreach ($transactions as $t) {
                $totalCredits += floatval($t['credit']);
                $totalDebits += floatval($t['debit']);
            }

            $closingBalance = $openingBalance + $totalCredits - $totalDebits;

            // Add running balance to each transaction
            $runningBalance = $openingBalance;
            foreach ($transactions as &$t) {
                $runningBalance += floatval($t['credit']) - floatval($t['debit']);
                $t['balance'] = 'R ' . number_format($runningBalance, 2);
            }

            $summary = [
                'opening_balance' => $openingBalance,
                'total_credits' => $totalCredits,
                'total_debits' => $totalDebits,
                'closing_balance' => $closingBalance
            ];

            $this->sendResponse([
                "success" => true,
                "transactions" => $transactions,
                "summary" => $summary
            ]);
        } catch (PDOException $e) {
            error_log("Error in getAccountStatement: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch account statement",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getTransactions() {
        $companyId = $_GET['company_id'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing company_id"], 400);
            return;
        }

        try {
            error_log("Fetching transactions for company_id: $companyId");

            // Get deposits with related names
            $depositStmt = $this->db->prepare("
                SELECT
                    d.deposit_id as id,
                    'deposit' as type,
                    d.transaction_date as date,
                    d.description,
                    d.amount,
                    d.reference_number as reference,
                    d.account_id,
                    d.property_id,
                    d.unit_id,
                    d.tenant_id,
                    d.category_id,
                    d.payment_method_id,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    COALESCE(t.full_name, '') AS tenant_name,
                    '' AS vendor_name,
                    COALESCE(pm.method_name, '') AS payment_method,
                    d.created_at,
                    d.updated_at
                FROM deposits d
                LEFT JOIN accounts a ON d.account_id = a.account_id
                LEFT JOIN categories cat ON d.category_id = cat.category_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN units u ON d.unit_id = u.unit_id
                LEFT JOIN tenants t ON d.tenant_id = t.tenant_id
                LEFT JOIN payment_methods pm ON d.payment_method_id = pm.payment_method_id
                WHERE d.company_id = ?
                ORDER BY d.transaction_date DESC
            ");
            $depositStmt->execute([$companyId]);
            $deposits = $depositStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get expenses with related names
            $expenseStmt = $this->db->prepare("
                SELECT
                    e.expense_id as id,
                    'expense' as type,
                    e.transaction_date as date,
                    e.description,
                    e.amount,
                    e.reference_number as reference,
                    e.account_id,
                    e.property_id,
                    e.unit_id,
                    e.vendor_id,
                    e.category_id,
                    e.payment_method_id,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    '' AS tenant_name,
                    COALESCE(v.name, '') AS vendor_name,
                    COALESCE(pm.method_name, '') AS payment_method,
                    e.created_at,
                    e.updated_at
                FROM expenses e
                LEFT JOIN accounts a ON e.account_id = a.account_id
                LEFT JOIN categories cat ON e.category_id = cat.category_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                LEFT JOIN units u ON e.unit_id = u.unit_id
                LEFT JOIN suppliers v ON e.vendor_id = v.supplier_id
                LEFT JOIN payment_methods pm ON e.payment_method_id = pm.payment_method_id
                WHERE e.company_id = ?
                ORDER BY e.transaction_date DESC
            ");
            $expenseStmt->execute([$companyId]);
            $expenses = $expenseStmt->fetchAll(PDO::FETCH_ASSOC);

            $transactions = array_merge($deposits, $expenses);

            // Sort by date descending
            usort($transactions, function($a, $b) {
                return strcmp($b['date'], $a['date']);
            });

            error_log("Fetched " . count($transactions) . " transactions");

            $this->sendResponse([
                "success" => true,
                "transactions" => $transactions
            ]);
        } catch (PDOException $e) {
            error_log("DB Error: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch transactions",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getDeposits() {
        $companyId = $_GET['company_id'] ?? null;
        $tenantId = $_GET['tenant_id'] ?? null;
        $propertyId = $_GET['property_id'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing company_id"], 400);
            return;
        }

        try {
            $sql = "
                SELECT
                    d.deposit_id,
                    d.transaction_date,
                    d.amount,
                    d.description,
                    d.reference_number,
                    d.company_id,
                    d.tenant_id,
                    d.property_id,
                    d.unit_id,
                    d.account_id,
                    d.category_id,
                    d.payment_method_id,
                    COALESCE(t.full_name, '') as tenant_name,
                    COALESCE(p.property_name, '') as property_name,
                    COALESCE(u.unit_number, '') as unit_number,
                    COALESCE(a.account_name, '') as account_name,
                    COALESCE(cat.name, '') as category_name,
                    COALESCE(pm.method_name, '') as payment_method
                FROM deposits d
                LEFT JOIN tenants t ON d.tenant_id = t.tenant_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN units u ON d.unit_id = u.unit_id
                LEFT JOIN accounts a ON d.account_id = a.account_id
                LEFT JOIN categories cat ON d.category_id = cat.category_id
                LEFT JOIN payment_methods pm ON d.payment_method_id = pm.payment_method_id
                WHERE d.company_id = ?
            ";

            $params = [$companyId];

            if ($tenantId) {
                $sql .= " AND d.tenant_id = ?";
                $params[] = $tenantId;
            }

            if ($propertyId) {
                $sql .= " AND d.property_id = ?";
                $params[] = $propertyId;
            }

            $sql .= " ORDER BY d.transaction_date DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $deposits = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "deposits" => $deposits
            ]);
        } catch (PDOException $e) {
            error_log("Error fetching deposits: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch deposits",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function createDeposit($data) {
        if (empty($data['amount']) || empty($data['account_id']) || empty($data['company_id'])) {
            $this->sendResponse(["success" => false, "message" => "Amount, account ID, and company ID are required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO deposits (company_id, amount, account_id, property_id, unit_id, tenant_id, category_id, payment_method_id, reference_number, description, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $data['company_id'],
                $data['amount'],
                $data['account_id'],
                $data['property_id'] ?? null,
                $data['unit_id'] ?? null,
                $data['tenant_id'] ?? null,
                $data['category_id'] ?? null,
                $data['payment_method_id'] ?? null,
                $data['reference_number'] ?? '',
                $data['description'] ?? '',
                $data['transaction_date'] ?? date('Y-m-d')
            ]);

            $depositId = $this->db->lastInsertId();

            $this->sendResponse([
                "success" => true,
                "message" => "Deposit created successfully",
                "deposit_id" => $depositId
            ]);
        } catch (PDOException $e) {
            error_log("Error creating deposit: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create deposit",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function createExpense($data) {
        $required = ['company_id', 'amount', 'account_id', 'category_id'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Missing required field: $field"
                ], 400);
                return;
            }
        }

        if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
            $this->sendResponse([
                "success" => false,
                "message" => "Amount must be a positive number"
            ], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO expenses (company_id, tenant_id, amount, account_id, property_id, unit_id, category_id, vendor_id, payment_method_id, reference_number, description, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $data['company_id'],
                $data['tenant_id'] ?? null,
                $data['amount'],
                $data['account_id'],
                $data['property_id'] ?? null,
                $data['unit_id'] ?? null,
                $data['category_id'],
                $data['vendor_id'] ?? null,
                $data['payment_method_id'] ?? null,
                $data['reference_number'] ?? '',
                $data['description'] ?? '',
                $data['transaction_date'] ?? date('Y-m-d')
            ]);

            $expenseId = $this->db->lastInsertId();

            $this->sendResponse([
                "success" => true,
                "message" => "Expense created successfully",
                "expense_id" => $expenseId
            ], 201);

        } catch (PDOException $e) {
            error_log("Error creating expense: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create expense",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    public function getProfitLossStatement() {
        $companyId = $_GET['company_id'] ?? null;
        $propertyId = $_GET['property_id'] ?? null;
        $startDate = $_GET['start_date'] ?? date('Y-01-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id is required"], 400);
            return;
        }

        try {
            // Monthly data query
            $monthlyStmt = $this->db->prepare("
                SELECT
                    DATE_FORMAT(month_date, '%b %Y') as month,
                    COALESCE(SUM(income), 0) as income,
                    COALESCE(SUM(expenses), 0) as expenses,
                    COALESCE(SUM(income) - SUM(expenses), 0) as profit
                FROM (
                    SELECT
                        DATE_FORMAT(transaction_date, '%Y-%m-01') as month_date,
                        SUM(amount) as income,
                        0 as expenses
                    FROM deposits
                    WHERE company_id = ?
                    AND transaction_date BETWEEN ? AND ?
                    " . ($propertyId ? "AND property_id = ?" : "") . "
                    GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')

                    UNION ALL

                    SELECT
                        DATE_FORMAT(transaction_date, '%Y-%m-01') as month_date,
                        0 as income,
                        SUM(amount) as expenses
                    FROM expenses
                    WHERE company_id = ?
                    AND transaction_date BETWEEN ? AND ?
                    " . ($propertyId ? "AND property_id = ?" : "") . "
                    GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
                ) combined
                GROUP BY month_date
                ORDER BY month_date ASC
            ");

            $params = [$companyId, $startDate, $endDate];
            if ($propertyId) $params[] = $propertyId;
            $params = array_merge($params, [$companyId, $startDate, $endDate]);
            if ($propertyId) $params[] = $propertyId;

            $monthlyStmt->execute($params);
            $monthlyData = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get totals
            $incomeStmt = $this->db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_income
                FROM deposits
                WHERE company_id = ?
                AND transaction_date BETWEEN ? AND ?
                " . ($propertyId ? "AND property_id = ?" : "")
            );
            $incomeParams = [$companyId, $startDate, $endDate];
            if ($propertyId) $incomeParams[] = $propertyId;
            $incomeStmt->execute($incomeParams);
            $income = $incomeStmt->fetch(PDO::FETCH_ASSOC);

            $expenseStmt = $this->db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_expenses
                FROM expenses
                WHERE company_id = ?
                AND transaction_date BETWEEN ? AND ?
                " . ($propertyId ? "AND property_id = ?" : "")
            );
            $expenseStmt->execute($incomeParams);
            $expense = $expenseStmt->fetch(PDO::FETCH_ASSOC);

            $totalIncome = floatval($income['total_income']);
            $totalExpenses = floatval($expense['total_expenses']);
            $totalProfit = $totalIncome - $totalExpenses;
            $profitMargin = $totalIncome > 0 ? round(($totalProfit / $totalIncome) * 100) : 0;

            $summary = [
                'total_income' => number_format($totalIncome, 2, '.', ''),
                'total_expenses' => number_format($totalExpenses, 2, '.', ''),
                'total_profit' => number_format($totalProfit, 2, '.', ''),
                'profit_margin' => $profitMargin
            ];

            // Get detailed income transactions
            $incomeDetailsStmt = $this->db->prepare("
                SELECT
                    d.deposit_id as id,
                    DATE_FORMAT(d.transaction_date, '%Y-%m-%d') as date,
                    d.description,
                    d.reference_number as reference,
                    d.amount,
                    COALESCE(cat.name, 'Uncategorized') as category,
                    COALESCE(p.property_name, 'N/A') as property,
                    COALESCE(t.full_name, 'N/A') as tenant_name
                FROM deposits d
                LEFT JOIN categories cat ON d.category_id = cat.category_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN tenants t ON d.tenant_id = t.tenant_id
                WHERE d.company_id = ?
                AND d.transaction_date BETWEEN ? AND ?
                " . ($propertyId ? "AND d.property_id = ?" : "") . "
                ORDER BY d.transaction_date DESC
            ");
            $incomeDetailsStmt->execute($incomeParams);
            $incomeDetails = $incomeDetailsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get detailed expense transactions
            $expenseDetailsStmt = $this->db->prepare("
                SELECT
                    e.expense_id as id,
                    DATE_FORMAT(e.transaction_date, '%Y-%m-%d') as date,
                    e.description,
                    e.reference_number as reference,
                    e.amount,
                    COALESCE(cat.name, 'Uncategorized') as category,
                    COALESCE(p.property_name, 'N/A') as property,
                    COALESCE(v.name, 'N/A') as vendor_name
                FROM expenses e
                LEFT JOIN categories cat ON e.category_id = cat.category_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                LEFT JOIN suppliers v ON e.vendor_id = v.supplier_id
                WHERE e.company_id = ?
                AND e.transaction_date BETWEEN ? AND ?
                " . ($propertyId ? "AND e.property_id = ?" : "") . "
                ORDER BY e.transaction_date DESC
            ");
            $expenseDetailsStmt->execute($incomeParams);
            $expenseDetails = $expenseDetailsStmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "monthlyData" => $monthlyData,
                "summary" => $summary,
                "incomeDetails" => $incomeDetails,
                "expenseDetails" => $expenseDetails,
                "propertyPerformance" => []
            ]);
        } catch (PDOException $e) {
            error_log("Error in getProfitLossStatement: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch profit & loss statement",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function generateDepositReceipt() {
        require_once 'PDFReceiptGenerator.php';

        $depositId = null;
        foreach ($this->params as $i => $param) {
            if ($param === 'deposits' && isset($this->params[$i + 1]) && is_numeric($this->params[$i + 1])) {
                $depositId = $this->params[$i + 1];
                break;
            }
        }

        if (!$depositId) {
            $this->sendResponse(["success" => false, "message" => "Deposit ID required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT
                    d.*,
                    c.company_name,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    COALESCE(t.full_name, '') AS tenant_name,
                    COALESCE(pm.method_name, '') AS payment_method
                FROM deposits d
                LEFT JOIN companies c ON d.company_id = c.company_id
                LEFT JOIN accounts a ON d.account_id = a.account_id
                LEFT JOIN categories cat ON d.category_id = cat.category_id
                LEFT JOIN properties p ON d.property_id = p.property_id
                LEFT JOIN units u ON d.unit_id = u.unit_id
                LEFT JOIN tenants t ON d.tenant_id = t.tenant_id
                LEFT JOIN payment_methods pm ON d.payment_method_id = pm.payment_method_id
                WHERE d.deposit_id = ?
            ");
            $stmt->execute([$depositId]);
            $deposit = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$deposit) {
                $this->sendResponse(["success" => false, "message" => "Deposit not found"], 404);
                return;
            }

            $generator = new PDFReceiptGenerator();
            $result = $generator->generateReceiptPDF($deposit, 'deposit');

            $this->sendResponse([
                "success" => true,
                "pdf_url" => $result['url'],
                "format" => $result['format'] ?? 'pdf'
            ]);
        } catch (PDOException $e) {
            error_log("Error in generateDepositReceipt: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to generate deposit receipt",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function generateExpenseReceipt() {
        require_once 'PDFReceiptGenerator.php';

        $expenseId = null;
        foreach ($this->params as $i => $param) {
            if ($param === 'expenses' && isset($this->params[$i + 1]) && is_numeric($this->params[$i + 1])) {
                $expenseId = $this->params[$i + 1];
                break;
            }
        }

        if (!$expenseId) {
            $this->sendResponse(["success" => false, "message" => "Expense ID required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT
                    e.*,
                    c.company_name,
                    COALESCE(a.account_name, '') AS account_name,
                    COALESCE(cat.name, '') AS category_name,
                    COALESCE(p.property_name, '') AS property_name,
                    COALESCE(u.unit_number, '') AS unit_number,
                    COALESCE(v.name, '') AS vendor_name,
                    COALESCE(pm.method_name, '') AS payment_method
                FROM expenses e
                LEFT JOIN companies c ON e.company_id = c.company_id
                LEFT JOIN accounts a ON e.account_id = a.account_id
                LEFT JOIN categories cat ON e.category_id = cat.category_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                LEFT JOIN units u ON e.unit_id = u.unit_id
                LEFT JOIN suppliers v ON e.vendor_id = v.supplier_id
                LEFT JOIN payment_methods pm ON e.payment_method_id = pm.payment_method_id
                WHERE e.expense_id = ?
            ");
            $stmt->execute([$expenseId]);
            $expense = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$expense) {
                $this->sendResponse(["success" => false, "message" => "Expense not found"], 404);
                return;
            }

            $generator = new PDFReceiptGenerator();
            $result = $generator->generateReceiptPDF($expense, 'expense');

            $this->sendResponse([
                "success" => true,
                "pdf_url" => $result['url'],
                "format" => $result['format'] ?? 'pdf'
            ]);
        } catch (PDOException $e) {
            error_log("Error in generateExpenseReceipt: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to generate expense receipt",
                "error" => $e->getMessage()
            ], 500);
        }
    }
}
