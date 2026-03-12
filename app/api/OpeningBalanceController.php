<?php
require_once 'ApiController.php';

/**
 * OpeningBalanceController
 * Manages Balance B/F (Brought Forward) functionality
 * Based on accounting best practices from Xero, QuickBooks, and Sage
 */
class OpeningBalanceController extends ApiController {
    public $requestMethod;
    public $params = [];

    public function setRequestMethod($method) {
        $this->requestMethod = $method;
    }

    public function setParams($params) {
        $this->params = $params;
    }

    public function processRequest() {
        $action = $this->params[0] ?? null;

        switch ($this->requestMethod) {
            case 'GET':
                if ($action === 'tenant' && isset($this->params[1])) {
                    // GET /opening-balances/tenant/{tenant_id}?company_id=X&as_of_date=Y
                    $this->getTenantOpeningBalance($this->params[1]);
                } elseif ($action === 'company') {
                    // GET /opening-balances/company?company_id=X
                    $this->getCompanyOpeningBalance();
                } elseif ($action === 'calculate' && isset($this->params[1])) {
                    // GET /opening-balances/calculate/{tenant_id}?company_id=X&as_of_date=Y
                    $this->calculateTenantBalance($this->params[1]);
                } elseif ($action === 'list') {
                    // GET /opening-balances/list?company_id=X
                    $this->listOpeningBalances();
                } else {
                    $this->sendResponse(["success" => false, "message" => "Invalid GET endpoint"], 400);
                }
                break;

            case 'POST':
                if ($action === 'tenant') {
                    // POST /opening-balances/tenant
                    $this->createTenantOpeningBalance();
                } elseif ($action === 'company') {
                    // POST /opening-balances/company
                    $this->createCompanyOpeningBalance();
                } elseif ($action === 'bulk') {
                    // POST /opening-balances/bulk
                    $this->bulkCreateOpeningBalances();
                } else {
                    $this->sendResponse(["success" => false, "message" => "Invalid POST endpoint"], 400);
                }
                break;

            case 'PUT':
                if ($action === 'tenant' && isset($this->params[1])) {
                    // PUT /opening-balances/tenant/{id}
                    $this->updateTenantOpeningBalance($this->params[1]);
                } else {
                    $this->sendResponse(["success" => false, "message" => "Invalid PUT endpoint"], 400);
                }
                break;

            case 'DELETE':
                if ($action === 'tenant' && isset($this->params[1])) {
                    // DELETE /opening-balances/tenant/{id}
                    $this->deleteOpeningBalance($this->params[1]);
                } else {
                    $this->sendResponse(["success" => false, "message" => "Invalid DELETE endpoint"], 400);
                }
                break;

            default:
                $this->sendResponse(["success" => false, "message" => "Method not allowed"], 405);
        }
    }

    /**
     * Get opening balance for a specific tenant
     * GET /opening-balances/tenant/{tenant_id}?company_id=X&as_of_date=Y
     */
    private function getTenantOpeningBalance($tenantId) {
        $companyId = $_GET['company_id'] ?? null;
        $asOfDate = $_GET['as_of_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("CALL sp_get_tenant_opening_balance(?, ?, ?)");
            $stmt->execute([$companyId, $tenantId, $asOfDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            if ($result) {
                $this->sendResponse([
                    "success" => true,
                    "opening_balance" => $result
                ]);
            } else {
                $this->sendResponse([
                    "success" => true,
                    "opening_balance" => null,
                    "message" => "No opening balance found for this tenant"
                ]);
            }
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate current balance including opening balance and transactions
     * GET /opening-balances/calculate/{tenant_id}?company_id=X&as_of_date=Y
     */
    private function calculateTenantBalance($tenantId) {
        $companyId = $_GET['company_id'] ?? null;
        $asOfDate = $_GET['as_of_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id required"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("CALL sp_calculate_tenant_current_balance(?, ?, ?)");
            $stmt->execute([$companyId, $tenantId, $asOfDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "balance_calculation" => $result
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to calculate balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * List all opening balances for a company
     * GET /opening-balances/list?company_id=X&conversion_date=Y
     */
    private function listOpeningBalances() {
        $companyId = $_GET['company_id'] ?? null;
        $conversionDate = $_GET['conversion_date'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id required"], 400);
            return;
        }

        try {
            $sql = "
                SELECT
                    ob.*,
                    t.full_name as tenant_name,
                    t.email as tenant_email,
                    p.property_name
                FROM opening_balances ob
                LEFT JOIN tenants t ON ob.tenant_id = t.tenant_id
                LEFT JOIN properties p ON ob.property_id = p.property_id
                WHERE ob.company_id = ? AND ob.is_active = 1
            ";

            if ($conversionDate) {
                $sql .= " AND ob.conversion_date = ?";
                $stmt = $this->db->prepare($sql . " ORDER BY ob.conversion_date DESC, t.full_name");
                $stmt->execute([$companyId, $conversionDate]);
            } else {
                $stmt = $this->db->prepare($sql . " ORDER BY ob.conversion_date DESC, t.full_name");
                $stmt->execute([$companyId]);
            }

            $balances = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "opening_balances" => $balances,
                "count" => count($balances)
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch opening balances",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create opening balance for a tenant
     * POST /opening-balances/tenant
     */
    private function createTenantOpeningBalance() {
        $data = $this->getRequestBody();

        $required = ['company_id', 'tenant_id', 'conversion_date', 'financial_year', 'opening_balance'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("CALL sp_upsert_opening_balance(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['property_id'] ?? null,
                $data['conversion_date'],
                $data['financial_year'],
                $data['opening_balance'],
                $data['outstanding_rent'] ?? 0.00,
                $data['outstanding_utilities'] ?? 0.00,
                $data['outstanding_other'] ?? 0.00,
                $data['advance_payments'] ?? 0.00,
                $data['notes'] ?? '',
                $data['created_by'] ?? 'system'
            ]);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "message" => "Opening balance created/updated successfully"
            ], 201);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk create opening balances (useful for migration)
     * POST /opening-balances/bulk
     */
    private function bulkCreateOpeningBalances() {
        $data = $this->getRequestBody();

        if (!isset($data['balances']) || !is_array($data['balances'])) {
            $this->sendResponse(["success" => false, "message" => "balances array required"], 400);
            return;
        }

        $companyId = $data['company_id'] ?? null;
        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id required"], 400);
            return;
        }

        try {
            $this->db->beginTransaction();

            $successCount = 0;
            $errors = [];

            foreach ($data['balances'] as $index => $balance) {
                try {
                    $stmt = $this->db->prepare("CALL sp_upsert_opening_balance(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $companyId,
                        $balance['tenant_id'],
                        $balance['property_id'] ?? null,
                        $balance['conversion_date'],
                        $balance['financial_year'],
                        $balance['opening_balance'],
                        $balance['outstanding_rent'] ?? 0.00,
                        $balance['outstanding_utilities'] ?? 0.00,
                        $balance['outstanding_other'] ?? 0.00,
                        $balance['advance_payments'] ?? 0.00,
                        $balance['notes'] ?? '',
                        $data['created_by'] ?? 'system'
                    ]);
                    $stmt->closeCursor();
                    $successCount++;
                } catch (PDOException $e) {
                    $errors[] = [
                        "index" => $index,
                        "tenant_id" => $balance['tenant_id'] ?? 'unknown',
                        "error" => $e->getMessage()
                    ];
                }
            }

            $this->db->commit();

            $this->sendResponse([
                "success" => true,
                "message" => "Bulk opening balances processed",
                "success_count" => $successCount,
                "total_count" => count($data['balances']),
                "errors" => $errors
            ], 201);
        } catch (Exception $e) {
            $this->db->rollBack();
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to process bulk opening balances",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get company-wide opening balance
     * GET /opening-balances/company?company_id=X&conversion_date=Y
     */
    private function getCompanyOpeningBalance() {
        $companyId = $_GET['company_id'] ?? null;
        $conversionDate = $_GET['conversion_date'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "company_id required"], 400);
            return;
        }

        try {
            $sql = "SELECT * FROM company_opening_balances WHERE company_id = ? AND is_active = 1";

            if ($conversionDate) {
                $sql .= " AND conversion_date = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$companyId, $conversionDate]);
            } else {
                $sql .= " ORDER BY conversion_date DESC LIMIT 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$companyId]);
            }

            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "company_opening_balance" => $result ?: null
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch company opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create company-wide opening balance
     * POST /opening-balances/company
     */
    private function createCompanyOpeningBalance() {
        $data = $this->getRequestBody();

        $required = ['company_id', 'conversion_date', 'financial_year'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO company_opening_balances (
                    company_id, conversion_date, financial_year, bank_balance, cash_on_hand,
                    accounts_receivable, accounts_payable, ytd_income, ytd_expenses,
                    retained_earnings, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    financial_year = VALUES(financial_year),
                    bank_balance = VALUES(bank_balance),
                    cash_on_hand = VALUES(cash_on_hand),
                    accounts_receivable = VALUES(accounts_receivable),
                    accounts_payable = VALUES(accounts_payable),
                    ytd_income = VALUES(ytd_income),
                    ytd_expenses = VALUES(ytd_expenses),
                    retained_earnings = VALUES(retained_earnings),
                    notes = VALUES(notes),
                    updated_at = CURRENT_TIMESTAMP
            ");

            $stmt->execute([
                $data['company_id'],
                $data['conversion_date'],
                $data['financial_year'],
                $data['bank_balance'] ?? 0.00,
                $data['cash_on_hand'] ?? 0.00,
                $data['accounts_receivable'] ?? 0.00,
                $data['accounts_payable'] ?? 0.00,
                $data['ytd_income'] ?? 0.00,
                $data['ytd_expenses'] ?? 0.00,
                $data['retained_earnings'] ?? 0.00,
                $data['notes'] ?? '',
                $data['created_by'] ?? 'system'
            ]);

            $this->sendResponse([
                "success" => true,
                "message" => "Company opening balance created/updated successfully"
            ], 201);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create company opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update tenant opening balance
     * PUT /opening-balances/tenant/{id}
     */
    private function updateTenantOpeningBalance($id) {
        $data = $this->getRequestBody();

        try {
            $stmt = $this->db->prepare("
                UPDATE opening_balances
                SET opening_balance = ?,
                    outstanding_rent = ?,
                    outstanding_utilities = ?,
                    outstanding_other = ?,
                    advance_payments = ?,
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE opening_balance_id = ?
            ");

            $stmt->execute([
                $data['opening_balance'] ?? 0.00,
                $data['outstanding_rent'] ?? 0.00,
                $data['outstanding_utilities'] ?? 0.00,
                $data['outstanding_other'] ?? 0.00,
                $data['advance_payments'] ?? 0.00,
                $data['notes'] ?? '',
                $id
            ]);

            $this->sendResponse([
                "success" => true,
                "message" => "Opening balance updated successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete opening balance (soft delete)
     * DELETE /opening-balances/tenant/{id}
     */
    private function deleteOpeningBalance($id) {
        try {
            $stmt = $this->db->prepare("UPDATE opening_balances SET is_active = 0 WHERE opening_balance_id = ?");
            $stmt->execute([$id]);

            $this->sendResponse([
                "success" => true,
                "message" => "Opening balance deleted successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete opening balance",
                "error" => $e->getMessage()
            ], 500);
        }
    }
}
