<?php
require_once 'ApiController.php';

class TenantController extends ApiController {
    public function processRequest() {
        error_log("TenantController params: " . print_r($this->params, true));
        error_log("Request method: " . $this->requestMethod);

        $id = null;

        if (isset($this->params[0]) && $this->params[0] === 'tenants') {
            $id = isset($this->params[1]) ? $this->params[1] : null;
        } elseif (isset($this->params[0]) && is_numeric($this->params[0])) {
            $id = $this->params[0];
        }

        error_log("Extracted ID: " . ($id ? $id : 'null'));

        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    if (isset($this->params[2]) && $this->params[2] === 'statement') {
                        $companyId = $_GET['company_id'] ?? null;
                        $this->getTenantStatement($id, $companyId);
                    } else {
                        $this->getTenantById($id);
                    }
                } elseif (isset($_GET['company_id'])) {
                    $this->getTenantsByCompany($_GET['company_id']);
                } else {
                    $this->sendResponse(["message" => "Company ID required or provide tenant ID"], 400);
                }
                break;
            case 'POST':
                $this->createTenant();
                break;
            case 'PUT':
                if ($id) {
                    $this->updateTenant($id);
                } else {
                    $this->sendResponse(["message" => "Tenant ID required for update"], 400);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->deleteTenant($id);
                } else {
                    $this->sendResponse(["message" => "Tenant ID required for deletion"], 400);
                }
                break;
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }

    private function getTenantById($id) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM tenants WHERE tenant_id = ?");
            $stmt->execute([$id]);
            $tenant = $stmt->fetch(PDO::FETCH_ASSOC);

            if (empty($tenant)) {
                $this->sendResponse(["message" => "Tenant not found"], 404);
            } else {
                $this->sendResponse($tenant);
            }
        } catch (PDOException $e) {
            error_log("Error in getTenantById: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function getTenantsByCompany($companyId) {
        error_log("Getting tenants for company: " . $companyId);

        $propertyId = $_GET['property_id'] ?? null;

        try {
            if ($propertyId) {
                $stmt = $this->db->prepare("
                    SELECT * FROM tenants
                    WHERE company_id = ? AND property_id = ?
                    ORDER BY full_name
                ");
                $stmt->execute([$companyId, $propertyId]);
            } else {
                $stmt = $this->db->prepare("
                    SELECT * FROM tenants
                    WHERE company_id = ?
                    ORDER BY full_name
                ");
                $stmt->execute([$companyId]);
            }

            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("Tenants fetched: " . count($result));
            $this->sendResponse($result);
        } catch (PDOException $e) {
            error_log("Error fetching tenants: " . $e->getMessage());
            $this->sendResponse(["message" => "Failed to fetch tenants", "error" => $e->getMessage()], 500);
        }
    }

    private function createTenant() {
        $data = $this->getRequestBody();

        $required = ['company_id', 'property_id', 'full_name', 'email'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendResponse(["message" => "Missing required field: $field"], 400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO tenants (company_id, property_id, unit_number, full_name, email, phone, id_number, emergency_contact_name, emergency_contact_phone, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $data['company_id'],
                $data['property_id'],
                $data['unit_number'] ?? null,
                $data['full_name'],
                $data['email'],
                $data['phone'] ?? null,
                $data['id_number'] ?? null,
                $data['emergency_contact_name'] ?? null,
                $data['emergency_contact_phone'] ?? null,
                $data['notes'] ?? null,
                $data['status'] ?? 'active'
            ]);

            $tenantId = $this->db->lastInsertId();

            $this->sendResponse([
                "message" => "Tenant created successfully",
                "tenant_id" => $tenantId
            ], 201);
        } catch (PDOException $e) {
            error_log("Error creating tenant: " . $e->getMessage());
            $this->sendResponse(["message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function getTenantStatement($tenantId, $companyId = null) {
        if (!$companyId) {
            $this->sendResponse(["message" => "Company ID required"], 400);
            return;
        }

        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate   = $_GET['end_date'] ?? date('Y-m-t');

        try {
            // Calculate opening balance (invoices - deposits before start date)
            // Positive = tenant owes money, Negative = tenant has credit
            $openingInvoicesStmt = $this->db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM invoices
                WHERE tenant_id = ? AND invoice_date < ?
            ");
            $openingInvoicesStmt->execute([$tenantId, $startDate]);
            $openingInvoices = $openingInvoicesStmt->fetch(PDO::FETCH_ASSOC)['total'];

            $openingDepositsStmt = $this->db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total
                FROM deposits
                WHERE tenant_id = ? AND transaction_date < ?
            ");
            $openingDepositsStmt->execute([$tenantId, $startDate]);
            $openingDeposits = $openingDepositsStmt->fetch(PDO::FETCH_ASSOC)['total'];

            $openingBalance = floatval($openingInvoices) - floatval($openingDeposits);

            // Calculate total debits (invoices in period - amounts owed by tenant)
            $debitsStmt = $this->db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as total_debits
                FROM invoices
                WHERE tenant_id = ? AND invoice_date BETWEEN ? AND ?
            ");
            $debitsStmt->execute([$tenantId, $startDate, $endDate]);
            $debits = $debitsStmt->fetch(PDO::FETCH_ASSOC);
            $totalDebits = floatval($debits['total_debits']);

            // Calculate total credits (deposits/payments in period - payments from tenant)
            $creditsStmt = $this->db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_credits
                FROM deposits
                WHERE tenant_id = ? AND transaction_date BETWEEN ? AND ?
            ");
            $creditsStmt->execute([$tenantId, $startDate, $endDate]);
            $credits = $creditsStmt->fetch(PDO::FETCH_ASSOC);
            $totalCredits = floatval($credits['total_credits']);

            // Get detailed transactions - Invoices as debits
            $invoiceTransStmt = $this->db->prepare("
                SELECT
                    DATE_FORMAT(invoice_date, '%Y-%m-%d') as date,
                    CONCAT(
                        COALESCE((SELECT description FROM invoice_items WHERE invoice_id = invoices.invoice_id LIMIT 1), 'Invoice'),
                        ' - ', invoice_number
                    ) as description,
                    invoice_number as reference,
                    total_amount as debit,
                    0 as credit,
                    'invoice' as type
                FROM invoices
                WHERE tenant_id = ? AND invoice_date BETWEEN ? AND ?
            ");
            $invoiceTransStmt->execute([$tenantId, $startDate, $endDate]);
            $invoiceTransactions = $invoiceTransStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get detailed transactions - Deposits/Payments as credits
            $depositTransStmt = $this->db->prepare("
                SELECT
                    DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
                    COALESCE(description, 'Payment received') as description,
                    COALESCE(reference_number, CONCAT('DEP-', deposit_id)) as reference,
                    0 as debit,
                    amount as credit,
                    'payment' as type
                FROM deposits
                WHERE tenant_id = ? AND transaction_date BETWEEN ? AND ?
            ");
            $depositTransStmt->execute([$tenantId, $startDate, $endDate]);
            $depositTransactions = $depositTransStmt->fetchAll(PDO::FETCH_ASSOC);

            // Merge and sort by date
            $transactions = array_merge($invoiceTransactions, $depositTransactions);
            usort($transactions, function($a, $b) {
                return strcmp($a['date'], $b['date']);
            });

            $this->sendResponse([
                'success' => true,
                'summary' => [
                    'opening_balance' => $openingBalance,
                    'total_credits' => $totalCredits,
                    'total_debits' => $totalDebits,
                    'closing_balance' => $openingBalance + $totalDebits - $totalCredits
                ],
                'transactions' => $transactions
            ]);

        } catch (PDOException $e) {
            error_log("Error fetching tenant statement: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch tenant statement",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function updateTenant($id) {
        $data = $this->getRequestBody();

        try {
            $updates = [];
            $params = [];

            if (isset($data['property_id'])) {
                $updates[] = "property_id = ?";
                $params[] = $data['property_id'];
            }
            if (isset($data['unit_number'])) {
                $updates[] = "unit_number = ?";
                $params[] = $data['unit_number'];
            }
            if (isset($data['full_name'])) {
                $updates[] = "full_name = ?";
                $params[] = $data['full_name'];
            }
            if (isset($data['email'])) {
                $updates[] = "email = ?";
                $params[] = $data['email'];
            }
            if (isset($data['phone'])) {
                $updates[] = "phone = ?";
                $params[] = $data['phone'];
            }
            if (isset($data['id_number'])) {
                $updates[] = "id_number = ?";
                $params[] = $data['id_number'];
            }
            if (isset($data['emergency_contact_name'])) {
                $updates[] = "emergency_contact_name = ?";
                $params[] = $data['emergency_contact_name'];
            }
            if (isset($data['emergency_contact_phone'])) {
                $updates[] = "emergency_contact_phone = ?";
                $params[] = $data['emergency_contact_phone'];
            }
            if (isset($data['notes'])) {
                $updates[] = "notes = ?";
                $params[] = $data['notes'];
            }
            if (isset($data['status'])) {
                $updates[] = "status = ?";
                $params[] = $data['status'];
            }

            if (empty($updates)) {
                $this->sendResponse(["message" => "No fields to update"], 400);
                return;
            }

            $params[] = $id;
            $sql = "UPDATE tenants SET " . implode(", ", $updates) . " WHERE tenant_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->sendResponse(["message" => "Tenant updated successfully"]);
        } catch (PDOException $e) {
            error_log("Error updating tenant: " . $e->getMessage());
            $this->sendResponse(["message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function deleteTenant($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM tenants WHERE tenant_id = ?");
            $stmt->execute([$id]);

            if ($stmt->rowCount() > 0) {
                $this->sendResponse(["message" => "Tenant deleted successfully"]);
            } else {
                $this->sendResponse(["message" => "Tenant not found"], 404);
            }
        } catch (PDOException $e) {
            error_log("Error deleting tenant: " . $e->getMessage());
            $this->sendResponse(["message" => "Database error: " . $e->getMessage()], 500);
        }
    }
}
