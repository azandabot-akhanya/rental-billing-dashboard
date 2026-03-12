<?php
require_once 'ApiController.php';

class CompanyController extends ApiController {
    public $params = []; // ✅ Declare this so you can access it later

    public function __construct($requestMethod = null) {
        parent::__construct(); // Initialize DB connection
        
        if ($requestMethod !== null) {
            $this->requestMethod = $requestMethod;
        }
    }

    public function processRequest() {
        $id = isset($this->params[0]) ? $this->params[0] : null;
    
        // GET /companies/tenants?company_id=XX
        if ($this->requestMethod === 'GET' && isset($this->params[1]) && $this->params[1] === 'tenants') {
            $companyId = $_GET['company_id'] ?? null;
            if (!$companyId) {
                $this->sendResponse(["message" => "Missing required parameter: company_id"], 400);
                return;
            }
            $this->getTenantsByCompany($companyId);
            return;
        }
    
        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    $this->getCompanyById($id);
                } else {
                    $this->getAllCompanies();
                }
                break;
            case 'POST':
                $this->createCompany();
                break;
            case 'PUT':
                if ($id) {
                    $this->updateCompany($id);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->deleteCompany($id);
                }
                break;
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }
    

    private function getCompanyById($id) {
        try {
            $result = $this->executeProcedure('GetCompanyById', [$id]);
            if (empty($result)) {
                $this->sendResponse(["message" => "Company not found"], 404);
            } else {
                $this->sendResponse($result[0]);
            }
        } catch (Exception $e) {
            $this->sendResponse(["message" => $e->getMessage()], 500);
        }
    }

    private function getAllCompanies() {
        try {
            $result = $this->executeProcedure('GetAllCompanies');
            $this->sendResponse($result);
        } catch (Exception $e) {
            $this->sendResponse(["message" => $e->getMessage()], 500);
        }
    }

    // NEW METHOD for fetching tenants by company
    private function getTenantsByCompany($companyId) {
        try {
            $result = $this->executeProcedure('GetTenantsByCompany', [$companyId]);
            $this->sendResponse($result);
        } catch (Exception $e) {
            $this->sendResponse(["message" => $e->getMessage()], 500);
        }
    }

    private function createCompany() {
        try {
            $data = $this->getRequestBody();

            if (empty($data['company_name'])) {
                $this->sendResponse(["message" => "Company name is required"], 400);
                return;
            }

            // Use direct INSERT instead of stored procedure for better compatibility
            $stmt = $this->db->prepare("
                INSERT INTO companies (company_name, address, contact_number, email, banking_details)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['company_name'],
                $data['address'] ?? '',
                $data['contact_number'] ?? '',
                $data['email'] ?? '',
                $data['banking_details'] ?? ''
            ]);

            $companyId = $this->db->lastInsertId();

            $this->sendResponse([
                "success" => true,
                "message" => "Company created successfully",
                "company_id" => (int)$companyId
            ], 201);
        } catch (Exception $e) {
            $this->sendResponse(["success" => false, "message" => $e->getMessage()], 500);
        }
    }

    private function updateCompany($id) {
        try {
            $data = $this->getRequestBody();

            if (empty($data['company_name'])) {
                $this->sendResponse(["message" => "Company name is required"], 400);
                return;
            }

            // Use direct UPDATE instead of stored procedure for better compatibility
            $stmt = $this->db->prepare("
                UPDATE companies
                SET company_name = ?, address = ?, contact_number = ?, email = ?, banking_details = ?
                WHERE company_id = ?
            ");
            $stmt->execute([
                $data['company_name'],
                $data['address'] ?? '',
                $data['contact_number'] ?? '',
                $data['email'] ?? '',
                $data['banking_details'] ?? '',
                $id
            ]);

            $this->sendResponse(["success" => true, "message" => "Company updated successfully"]);
        } catch (Exception $e) {
            error_log("Error in updateCompany: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => $e->getMessage()], 500);
        }
    }
    
    
    
    
    

    private function deleteCompany($id) {
        try {
            // Start a transaction to ensure all deletes happen together
            $this->db->beginTransaction();

            // Delete all related records in the correct order to avoid foreign key constraints
            // Order matters: delete child tables first, then parent tables
            // Using try-catch for each to handle tables that might not exist

            // Helper function to safely delete
            $safeDelete = function($sql, $params) {
                try {
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute($params);
                } catch (PDOException $e) {
                    // Log but continue - table might not exist
                    error_log("Delete warning: " . $e->getMessage());
                }
            };

            // 1. Delete calendar events
            $safeDelete("DELETE FROM tenant_calendar_events WHERE company_id = ?", [$id]);

            // 2. Delete tenant documents
            $safeDelete("DELETE FROM tenant_documents WHERE company_id = ?", [$id]);

            // 3. Delete prepaid utilities records
            $safeDelete("DELETE FROM prepaid_utilities WHERE company_id = ?", [$id]);

            // 4. Delete stock movements (before stock items)
            $safeDelete("DELETE FROM stock_movements WHERE company_id = ?", [$id]);

            // 5. Delete stock items
            $safeDelete("DELETE FROM stock WHERE company_id = ?", [$id]);

            // 6. Delete invoice items (before invoices) - try multiple approaches
            $safeDelete("DELETE ii FROM invoice_items ii INNER JOIN invoices i ON ii.invoice_id = i.invoice_id WHERE i.company_id = ?", [$id]);

            // 7. Delete invoices
            $safeDelete("DELETE FROM invoices WHERE company_id = ?", [$id]);

            // 8. Delete transactions (deposits, expenses, payments)
            $safeDelete("DELETE FROM transactions WHERE company_id = ?", [$id]);

            // 9. Delete tenant unit assignments (before tenants and units)
            $safeDelete("DELETE FROM tenant_units WHERE company_id = ?", [$id]);

            // 10. Delete units directly linked to company (if exists)
            $safeDelete("DELETE FROM units WHERE property_id IN (SELECT property_id FROM properties WHERE company_id = ?)", [$id]);

            // 11. Delete tenants
            $safeDelete("DELETE FROM tenants WHERE company_id = ?", [$id]);

            // 12. Delete property units (before properties)
            $safeDelete("DELETE pu FROM property_units pu INNER JOIN properties p ON pu.property_id = p.property_id WHERE p.company_id = ?", [$id]);

            // 13. Delete properties
            $safeDelete("DELETE FROM properties WHERE company_id = ?", [$id]);

            // 14. Delete suppliers
            $safeDelete("DELETE FROM suppliers WHERE company_id = ?", [$id]);

            // 15. Finally, delete the company - this one must succeed
            $stmt = $this->db->prepare("DELETE FROM companies WHERE company_id = ?");
            $stmt->execute([$id]);

            // Commit the transaction
            $this->db->commit();

            $this->sendResponse(["success" => true, "message" => "Company and all related records deleted successfully"]);
        } catch (Exception $e) {
            // Rollback on error
            $this->db->rollBack();
            error_log("Delete company error: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Failed to delete company: " . $e->getMessage()], 500);
        }
    }
}
