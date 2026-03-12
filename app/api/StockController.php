<?php
require_once 'ApiController.php';

class StockController extends ApiController {

    public function processRequest() {
        switch($this->requestMethod) {
            case 'GET':
                if (in_array('total', $this->params)) $this->getTotalStock();
                elseif (in_array('supplier', $this->params)) $this->getStockBySupplier();
                elseif (in_array('property', $this->params)) $this->getStockByPropertyTenant();
                elseif (in_array('all', $this->params)) $this->getAllStocks(); // Global stocks
                elseif (empty($this->params)) $this->getStocks();
                else $this->sendResponse(["message"=>"Invalid GET endpoint"],404);
                break;

            case 'POST':
                $data = $this->getRequestBody();
                if (in_array('received', $this->params)) $this->createStockReceived($data);
                elseif (in_array('issued', $this->params)) $this->createStockIssued($data);
                else $this->sendResponse(["message"=>"Invalid POST endpoint"],404);
                break;

            default:
                $this->sendResponse(["message"=>"Method not allowed"],405);
        }
    }

    // Get all global stocks (no company filter)
    private function getAllStocks() {
        try {
            $stmt = $this->db->prepare("
                SELECT s.stock_id, s.name, s.company_id,
                    COALESCE(SUM(sr.quantity), 0) as total_received,
                    COALESCE(SUM(si.quantity), 0) as total_issued,
                    COALESCE(SUM(sr.quantity), 0) - COALESCE(SUM(si.quantity), 0) as quantity
                FROM stock s
                LEFT JOIN stock_received sr ON s.stock_id = sr.stock_id
                LEFT JOIN stock_issued si ON s.stock_id = si.stock_id
                GROUP BY s.stock_id, s.name, s.company_id
                ORDER BY s.name
            ");
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->sendResponse(["success" => true, "data" => $data]);
        } catch(PDOException $e) {
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Get stocks for a company (or all if no company specified)
    private function getStocks() {
        $company_id = $_GET['company_id'] ?? null;
        try {
            // Get all stocks globally with their quantities
            $sql = "
                SELECT s.stock_id, s.name, s.company_id,
                    COALESCE((SELECT SUM(quantity) FROM stock_received WHERE stock_id = s.stock_id), 0) as total_received,
                    COALESCE((SELECT SUM(quantity) FROM stock_issued WHERE stock_id = s.stock_id), 0) as total_issued,
                    COALESCE((SELECT SUM(quantity) FROM stock_received WHERE stock_id = s.stock_id), 0) -
                    COALESCE((SELECT SUM(quantity) FROM stock_issued WHERE stock_id = s.stock_id), 0) as quantity
                FROM stock s
                ORDER BY s.name
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->sendResponse(["success" => true, "data" => $data]);
        } catch(PDOException $e) {
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Create stock received - supports multiple items
    private function createStockReceived($data) {
        $company_id = $data['company_id'] ?? null;
        $supplier_id = $data['supplier_id'] ?? null;
        $received_date = $data['received_date'] ?? date('Y-m-d');
        $received_by = $data['received_by'] ?? null;
        $items = $data['items'] ?? null;

        // Support single item (backward compatibility)
        if (!$items && isset($data['quantity'])) {
            $items = [[
                'stock_id' => $data['stock_id'] ?? null,
                'stock_name' => $data['stock_name'] ?? null,
                'quantity' => $data['quantity']
            ]];
        }

        if (!$supplier_id || !$items || count($items) === 0) {
            $this->sendResponse(["success" => false, "message" => "Missing supplier_id or items"], 400);
            return;
        }

        try {
            $this->db->beginTransaction();
            $created_ids = [];

            foreach ($items as $item) {
                $stock_id = $item['stock_id'] ?? null;
                $stock_name = $item['stock_name'] ?? null;
                $quantity = $item['quantity'] ?? 0;

                if (!$quantity || $quantity <= 0) continue;

                // Create new stock if needed
                if (!$stock_id && $stock_name) {
                    // Check if stock with this name already exists
                    $checkStmt = $this->db->prepare("SELECT stock_id FROM stock WHERE LOWER(name) = LOWER(?)");
                    $checkStmt->execute([$stock_name]);
                    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if ($existing) {
                        $stock_id = $existing['stock_id'];
                    } else {
                        $insertStmt = $this->db->prepare("INSERT INTO stock (company_id, name) VALUES (?, ?)");
                        $insertStmt->execute([$company_id, $stock_name]);
                        $stock_id = $this->db->lastInsertId();
                    }
                }

                if (!$stock_id) continue;

                // Insert stock received record
                $stmt = $this->db->prepare("
                    INSERT INTO stock_received (company_id, stock_id, supplier_id, quantity, received_date, received_by)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$company_id, $stock_id, $supplier_id, $quantity, $received_date, $received_by]);
                $created_ids[] = $this->db->lastInsertId();
            }

            $this->db->commit();
            $this->sendResponse([
                "success" => true,
                "message" => "Stock received recorded successfully",
                "ids" => $created_ids
            ]);
        } catch(PDOException $e) {
            $this->db->rollBack();
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Create stock issued - supports multiple items
    private function createStockIssued($data) {
        $company_id = $data['company_id'] ?? null;
        $property_id = $data['property_id'] ?? null;
        $tenant_id = $data['tenant_id'] ?? null; // Optional
        $issued_date = $data['issued_date'] ?? date('Y-m-d');
        $issued_to = $data['issued_to'] ?? null; // Who received it
        $items = $data['items'] ?? null;

        // Support single item (backward compatibility)
        if (!$items && isset($data['quantity'])) {
            $items = [[
                'stock_id' => $data['stock_id'] ?? null,
                'stock_name' => $data['stock_name'] ?? null,
                'quantity' => $data['quantity']
            ]];
        }

        if (!$items || count($items) === 0) {
            $this->sendResponse(["success" => false, "message" => "Missing items"], 400);
            return;
        }

        try {
            $this->db->beginTransaction();
            $created_ids = [];

            foreach ($items as $item) {
                $stock_id = $item['stock_id'] ?? null;
                $stock_name = $item['stock_name'] ?? null;
                $quantity = $item['quantity'] ?? 0;

                if (!$quantity || $quantity <= 0) continue;

                // Create new stock if needed
                if (!$stock_id && $stock_name) {
                    $checkStmt = $this->db->prepare("SELECT stock_id FROM stock WHERE LOWER(name) = LOWER(?)");
                    $checkStmt->execute([$stock_name]);
                    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if ($existing) {
                        $stock_id = $existing['stock_id'];
                    } else {
                        $insertStmt = $this->db->prepare("INSERT INTO stock (company_id, name) VALUES (?, ?)");
                        $insertStmt->execute([$company_id, $stock_name]);
                        $stock_id = $this->db->lastInsertId();
                    }
                }

                if (!$stock_id) continue;

                // Insert stock issued record
                $stmt = $this->db->prepare("
                    INSERT INTO stock_issued (company_id, stock_id, tenant_id, property_id, quantity, issued_date, issued_to)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$company_id, $stock_id, $tenant_id, $property_id, $quantity, $issued_date, $issued_to]);
                $created_ids[] = $this->db->lastInsertId();
            }

            $this->db->commit();
            $this->sendResponse([
                "success" => true,
                "message" => "Stock issued recorded successfully",
                "ids" => $created_ids
            ]);
        } catch(PDOException $e) {
            $this->db->rollBack();
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Get total stock report
    private function getTotalStock() {
        $company_id = $_GET['company_id'] ?? null;
        $start_date = $_GET['start_date'] ?? null;
        $end_date = $_GET['end_date'] ?? null;
        $stock_id = $_GET['stock_id'] ?? null;

        try {
            $sql = "
                SELECT
                    s.stock_id,
                    s.name,
                    COALESCE(received.total, 0) as total_received,
                    COALESCE(issued.total, 0) as total_issued,
                    COALESCE(received.total, 0) - COALESCE(issued.total, 0) as balance
                FROM stock s
                LEFT JOIN (
                    SELECT stock_id, SUM(quantity) as total
                    FROM stock_received
                    WHERE 1=1
                    " . ($start_date ? "AND received_date >= ?" : "") . "
                    " . ($end_date ? "AND received_date <= ?" : "") . "
                    GROUP BY stock_id
                ) received ON s.stock_id = received.stock_id
                LEFT JOIN (
                    SELECT stock_id, SUM(quantity) as total
                    FROM stock_issued
                    WHERE 1=1
                    " . ($start_date ? "AND issued_date >= ?" : "") . "
                    " . ($end_date ? "AND issued_date <= ?" : "") . "
                    GROUP BY stock_id
                ) issued ON s.stock_id = issued.stock_id
                WHERE 1=1
                " . ($stock_id ? "AND s.stock_id = ?" : "") . "
                ORDER BY s.name
            ";

            $params = [];
            if ($start_date) $params[] = $start_date;
            if ($end_date) $params[] = $end_date;
            if ($start_date) $params[] = $start_date;
            if ($end_date) $params[] = $end_date;
            if ($stock_id) $params[] = $stock_id;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals
            $total_received = array_sum(array_column($data, 'total_received'));
            $total_issued = array_sum(array_column($data, 'total_issued'));

            $this->sendResponse([
                "success" => true,
                "data" => $data,
                "summary" => [
                    "total_received" => $total_received,
                    "total_issued" => $total_issued,
                    "balance" => $total_received - $total_issued
                ]
            ]);
        } catch(PDOException $e) {
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Get stock by supplier
    private function getStockBySupplier() {
        $supplier_id = $_GET['supplier_id'] ?? null;
        $start_date = $_GET['start_date'] ?? null;
        $end_date = $_GET['end_date'] ?? null;

        if (!$supplier_id) {
            $this->sendResponse(["success" => false, "message" => "supplier_id required"], 400);
            return;
        }

        try {
            $sql = "
                SELECT
                    s.stock_id,
                    s.name,
                    COALESCE(SUM(sr.quantity), 0) as total_received,
                    COALESCE((
                        SELECT SUM(quantity) FROM stock_issued WHERE stock_id = s.stock_id
                        " . ($start_date ? "AND issued_date >= ?" : "") . "
                        " . ($end_date ? "AND issued_date <= ?" : "") . "
                    ), 0) as total_issued,
                    COALESCE(SUM(sr.quantity), 0) - COALESCE((
                        SELECT SUM(quantity) FROM stock_issued WHERE stock_id = s.stock_id
                        " . ($start_date ? "AND issued_date >= ?" : "") . "
                        " . ($end_date ? "AND issued_date <= ?" : "") . "
                    ), 0) as balance
                FROM stock s
                INNER JOIN stock_received sr ON s.stock_id = sr.stock_id
                WHERE sr.supplier_id = ?
                " . ($start_date ? "AND sr.received_date >= ?" : "") . "
                " . ($end_date ? "AND sr.received_date <= ?" : "") . "
                GROUP BY s.stock_id, s.name
                ORDER BY s.name
            ";

            $params = [];
            // For first subquery
            if ($start_date) $params[] = $start_date;
            if ($end_date) $params[] = $end_date;
            // For second subquery
            if ($start_date) $params[] = $start_date;
            if ($end_date) $params[] = $end_date;
            // Main query
            $params[] = $supplier_id;
            if ($start_date) $params[] = $start_date;
            if ($end_date) $params[] = $end_date;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(["success" => true, "data" => $data]);
        } catch(PDOException $e) {
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }

    // Get stock by property/tenant
    private function getStockByPropertyTenant() {
        $property_id = $_GET['property_id'] ?? null;
        $tenant_id = $_GET['tenant_id'] ?? null;
        $start_date = $_GET['start_date'] ?? null;
        $end_date = $_GET['end_date'] ?? null;

        try {
            $conditions = [];
            $params = [];

            if ($property_id) {
                $conditions[] = "si.property_id = ?";
                $params[] = $property_id;
            }
            if ($tenant_id) {
                $conditions[] = "si.tenant_id = ?";
                $params[] = $tenant_id;
            }
            if ($start_date) {
                $conditions[] = "si.issued_date >= ?";
                $params[] = $start_date;
            }
            if ($end_date) {
                $conditions[] = "si.issued_date <= ?";
                $params[] = $end_date;
            }

            $whereClause = count($conditions) > 0 ? "WHERE " . implode(" AND ", $conditions) : "";

            $sql = "
                SELECT
                    s.stock_id,
                    s.name,
                    COALESCE(SUM(si.quantity), 0) as total_issued,
                    COALESCE(p.property_name, 'N/A') as property_name,
                    COALESCE(t.full_name, 'N/A') as tenant_name,
                    si.issued_date,
                    si.issued_to
                FROM stock_issued si
                INNER JOIN stock s ON si.stock_id = s.stock_id
                LEFT JOIN properties p ON si.property_id = p.property_id
                LEFT JOIN tenants t ON si.tenant_id = t.tenant_id
                $whereClause
                GROUP BY s.stock_id, s.name, p.property_name, t.full_name, si.issued_date, si.issued_to
                ORDER BY si.issued_date DESC, s.name
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Also get summary
            $summaryParams = [];
            $summaryConditions = [];
            if ($property_id) {
                $summaryConditions[] = "si.property_id = ?";
                $summaryParams[] = $property_id;
            }
            if ($tenant_id) {
                $summaryConditions[] = "si.tenant_id = ?";
                $summaryParams[] = $tenant_id;
            }
            if ($start_date) {
                $summaryConditions[] = "si.issued_date >= ?";
                $summaryParams[] = $start_date;
            }
            if ($end_date) {
                $summaryConditions[] = "si.issued_date <= ?";
                $summaryParams[] = $end_date;
            }

            $summaryWhere = count($summaryConditions) > 0 ? "WHERE " . implode(" AND ", $summaryConditions) : "";

            $summarySql = "
                SELECT
                    s.stock_id,
                    s.name,
                    COALESCE(SUM(si.quantity), 0) as total_issued
                FROM stock_issued si
                INNER JOIN stock s ON si.stock_id = s.stock_id
                $summaryWhere
                GROUP BY s.stock_id, s.name
                ORDER BY s.name
            ";

            $summaryStmt = $this->db->prepare($summarySql);
            $summaryStmt->execute($summaryParams);
            $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "data" => $data,
                "summary" => $summary,
                "total_issued" => array_sum(array_column($summary, 'total_issued'))
            ]);
        } catch(PDOException $e) {
            $this->sendResponse(["success" => false, "message" => "DB Error", "error" => $e->getMessage()], 500);
        }
    }
}
