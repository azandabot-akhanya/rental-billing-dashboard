<?php
require_once 'ApiController.php';

class SupplierController extends ApiController {
    public $requestMethod;
    public $params = [];

    public function setRequestMethod($method) {
        $this->requestMethod = $method;
    }

    public function setParams($params) {
        $this->params = $params;
    }

    public function processRequest() {
        $id = null;
        
        // Check if we have an ID in the URL (e.g., /Suppliers/123)
        if (count($this->params) > 0 && is_numeric($this->params[0])) {
            $id = $this->params[0];
        }
    
        switch ($this->requestMethod) {
            case 'GET':
                if ($id && isset($_GET['statement']) && $_GET['statement'] == 1) {
                    $this->getSupplierStatement($id); // supplier statement
                } elseif ($id) {
                    $this->getSupplierById($id);
                } elseif (isset($_GET['type'])) {
                    $this->getSuppliersByType();
                } else {
                    $this->getSuppliers();
                }
                break;
            
    
            case 'POST':
                $this->createSupplier(); // or createSupplier for supplier
                break;
    
            case 'PUT':
                if ($id) {
                    $this->updateSupplier($id); // or updateSupplier for supplier
                } else {
                    $this->sendResponse(["message" => "Supplier ID required for update"], 400);
                }
                break;
    
            case 'DELETE':
                if ($id) {
                    $this->deleteSupplier($id); // or deleteSupplier for supplier
                } else {
                    $this->sendResponse(["message" => "Supplier ID required for deletion"], 400);
                }
                break;
    
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
        }
    }

    private function getSuppliers() {
        // Suppliers are now GLOBAL - available to all companies
        $propertyId = $_GET['property_id'] ?? null;

        try {
            if ($propertyId) {
                // Get suppliers that have expenses for the specified property
                $stmt = $this->db->prepare("
                    SELECT DISTINCT s.*
                    FROM suppliers s
                    INNER JOIN expenses e ON s.supplier_id = e.vendor_id
                    WHERE e.property_id = ?
                    ORDER BY s.name
                ");
                $stmt->execute([$propertyId]);
            } else {
                // Get ALL suppliers globally (no company filter)
                $stmt = $this->db->prepare("
                    SELECT * FROM suppliers
                    ORDER BY name
                ");
                $stmt->execute();
            }

            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "suppliers" => $suppliers,
            ]);
        } catch (PDOException $e) {
            error_log("Error fetching suppliers: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch suppliers",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function getSupplierById($supplierId) {
        try {
            $stmt = $this->db->prepare("CALL GetSupplierById(?)");
            $stmt->execute([$supplierId]);
            $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$supplier) {
                $this->sendResponse(["success" => false, "message" => "Supplier not found"], 404);
                return;
            }

            $this->sendResponse([
                "success" => true,
                "supplier" => $supplier,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch supplier",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function createSupplier() {
        $data = $this->getRequestBody();
    
        $required = ['company_id', 'name'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }
    
        try {
            $stmt = $this->db->prepare("CALL CreateSupplier(?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['company_id'],
                $data['name'],
                $data['contact_person'] ?? '',
                $data['email'] ?? '',
                $data['phone'] ?? '',
                $data['address'] ?? '',
                $data['bank_details'] ?? ''
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "message" => "Supplier created successfully",
                "supplier_id" => (int)$result['supplier_id']
            ], 201);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create supplier",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getSupplierStatement($supplierId) {
        $companyId = $_GET['company_id'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing company_id"], 400);
            return;
        }

        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate   = $_GET['end_date'] ?? date('Y-m-t');

        try {
            // Get supplier details for the statement
            $supplierStmt = $this->db->prepare("
                SELECT name, contact_person, email, phone, address
                FROM suppliers
                WHERE supplier_id = ? AND company_id = ?
            ");
            $supplierStmt->execute([$supplierId, $companyId]);
            $supplier = $supplierStmt->fetch(PDO::FETCH_ASSOC);

            if (!$supplier) {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Supplier not found"
                ], 404);
                return;
            }

            // Get all expenses for this supplier within the date range
            $transStmt = $this->db->prepare("
                SELECT
                    e.expense_id,
                    DATE_FORMAT(e.transaction_date, '%Y-%m-%d') as transaction_date,
                    e.description,
                    COALESCE(e.reference_number, CONCAT('EXP-', e.expense_id)) as reference_number,
                    e.amount,
                    COALESCE(t.full_name, 'N/A') as tenant_name,
                    COALESCE(c.name, 'N/A') as category_name,
                    COALESCE(p.property_name, 'N/A') as property_name
                FROM expenses e
                LEFT JOIN tenants t ON e.tenant_id = t.tenant_id
                LEFT JOIN categories c ON e.category_id = c.category_id
                LEFT JOIN properties p ON e.property_id = p.property_id
                WHERE e.vendor_id = ?
                AND e.transaction_date BETWEEN ? AND ?
                ORDER BY e.transaction_date ASC
            ");
            $transStmt->execute([$supplierId, $startDate, $endDate]);
            $transactions = $transStmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals
            $totalAmount = 0;
            foreach ($transactions as $trans) {
                $totalAmount += floatval($trans['amount']);
            }

            $this->sendResponse([
                "success" => true,
                "supplier" => $supplier,
                "statement" => $transactions,
                "summary" => [
                    "total_amount" => $totalAmount,
                    "transaction_count" => count($transactions),
                    "start_date" => $startDate,
                    "end_date" => $endDate
                ]
            ]);
        } catch (PDOException $e) {
            error_log("Error fetching supplier statement: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch supplier statement",
                "error" => $e->getMessage()
            ], 500);
        }
    }
    

    private function updateSupplier($supplierId) {
        $data = $this->getRequestBody();

        try {
            $stmt = $this->db->prepare("CALL UpdateSupplier(?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $supplierId,
                $data['name'],
                $data['contact_person'] ?? '',
                $data['email'] ?? '',
                $data['phone'] ?? '',
                $data['address'] ?? '',
                $data['bank_details'] ?? '',
                $data['is_active'] ?? true
            ]);
            
            $this->sendResponse([
                "success" => true,
                "message" => "Supplier updated successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update supplier",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function deleteSupplier($supplierId) {
        try {
            $stmt = $this->db->prepare("CALL DeleteSupplier(?)");
            $stmt->execute([$supplierId]);
            
            $this->sendResponse([
                "success" => true,
                "message" => "Supplier deleted successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete supplier",
                "error" => $e->getMessage()
            ], 500);
        }
    }
}