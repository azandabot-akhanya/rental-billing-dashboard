<?php
require_once 'ApiController.php';

class UtilitiesController extends ApiController {

    public function processRequest() {
        switch($this->requestMethod) {
            case 'GET':
                if (in_array('transactions', $this->params)) {
                    $this->getUtilityTransactions();
                } elseif (in_array('meter-readings', $this->params)) {
                    $this->getMeterReadings();
                } elseif (in_array('report', $this->params)) {
                    $this->getUtilityReport();
                } elseif (in_array('summary', $this->params)) {
                    $this->getUtilitySummary(); // 👈 NEW
                } else {
                    $this->sendResponse(["message" => "Invalid GET endpoint"], 404);
                }
                break;
    
            case 'POST':
                $data = $this->getRequestBody();
                if (in_array('save-transaction', $this->params)) {
                    $this->saveTransactionWithReading($data);
                } elseif (in_array('transactions', $this->params)) {
                    $this->createUtilityTransaction($data);
                } elseif (in_array('meter-readings', $this->params)) {
                    $this->createMeterReading($data);
                } else {
                    $this->sendResponse(["message" => "Invalid POST endpoint"], 404);
                }
                break;
    
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
        }
    }
    

    // SAVE TRANSACTION WITH METER READING (combined)
    private function saveTransactionWithReading($data) {
        $required = ['company_id','tenant_id','property_id','unit_id','utility_type','amount','reading'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $this->sendResponse(["success"=>false,"message"=>"Missing required field: $field"],400);
                return;
            }
        }

        try {
            // Start transaction
            $this->db->beginTransaction();

            // 1. Create utility transaction
            $transStmt = $this->db->prepare("CALL sp_create_utility_transaction(?, ?, ?, ?, ?, ?, ?, ?, @trans_id)");
            $transStmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['property_id'],
                $data['unit_id'],
                $data['utility_type'],
                $data['amount'],
                $data['voucher_number'] ?? '',
                $data['transaction_date'] ?? date('Y-m-d')
            ]);
            $transResult = $this->db->query("SELECT @trans_id AS id")->fetch(PDO::FETCH_ASSOC);
            $transStmt->closeCursor();

            // 2. Create meter reading
            $readingStmt = $this->db->prepare("CALL sp_create_meter_reading(?, ?, ?, ?, ?, ?, ?, @reading_id)");
            $readingStmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['property_id'],
                $data['unit_id'],
                $data['utility_type'],
                $data['reading'],
                $data['reading_date'] ?? date('Y-m-d')
            ]);
            $readingResult = $this->db->query("SELECT @reading_id AS id")->fetch(PDO::FETCH_ASSOC);
            $readingStmt->closeCursor();

            // Commit transaction
            $this->db->commit();

            $this->sendResponse([
                "success"=>true,
                "message"=>"Transaction and meter reading saved successfully",
                "transaction_id"=>$transResult['id'],
                "reading_id"=>$readingResult['id']
            ]);
        } catch (PDOException $e) {
            $this->db->rollBack();
            error_log("Error saving transaction with reading: " . $e->getMessage());
            $this->sendResponse([
                "success"=>false,
                "message"=>"Failed to save transaction and reading",
                "error"=>$e->getMessage()
            ],500);
        }
    }

    // CREATE TRANSACTION
    private function createUtilityTransaction($data) {
        $required = ['company_id','tenant_id','property_id','unit_id','utility_type','amount','voucher_number'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success"=>false,"message"=>"Missing $field"],400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("CALL sp_create_utility_transaction(?, ?, ?, ?, ?, ?, ?, ?, @new_id)");
            $stmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['property_id'],
                $data['unit_id'],
                $data['utility_type'],
                $data['amount'],
                $data['voucher_number'],
                $data['transaction_date'] ?? date('Y-m-d')
            ]);
            $id = $this->db->query("SELECT @new_id AS id")->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse(["success"=>true,"message"=>"Transaction created","id"=>$id['id']]);
        } catch (PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // GET SUMMARY (aggregated utility costs)
    private function getUtilitySummary() {
        $companyId = $_GET['company_id'] ?? null;
        $propertyId = $_GET['property_id'] ?? null;
        $startDate = $_GET['start_date'] ?? date('Y-01-01');
        $endDate   = $_GET['end_date'] ?? date('Y-m-d');

        if (!$companyId) {
            $this->sendResponse(["success"=>false,"message"=>"company_id is required"],400);
            return;
        }

        try {
            $stmt = $this->db->prepare("CALL sp_get_utility_summary(?, ?, ?, ?)");
            $stmt->execute([$companyId, $propertyId, $startDate, $endDate]);

            $propertyBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->nextRowset();
            $companyTotals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success"=>true,
                "propertyBreakdown"=>$propertyBreakdown,
                "companyTotals"=>$companyTotals
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success"=>false,
                "message"=>"DB Error",
                "error"=>$e->getMessage()
            ],500);
        }
    }


    // GET TRANSACTIONS
    private function getUtilityTransactions() {
        $companyId = $_GET['company_id'] ?? null;
        $utilityType = $_GET['utility_type'] ?? null;
        if (!$companyId || !$utilityType) {
            $this->sendResponse(["success"=>false,"message"=>"company_id & utility_type required"],400);
            return;
        }

        try {
            $stmt = $this->db->prepare("CALL sp_get_utility_transactions(?, ?)");
            $stmt->execute([$companyId, $utilityType]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
            $this->sendResponse(["success"=>true,"transactions"=>$transactions]);
        } catch (PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // CREATE METER READING
    private function createMeterReading($data) {
        $required = ['company_id','tenant_id','property_id','unit_id','utility_type','reading'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success"=>false,"message"=>"Missing $field"],400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("CALL sp_create_meter_reading(?, ?, ?, ?, ?, ?, ?, @new_id)");
            $stmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['property_id'],
                $data['unit_id'],
                $data['utility_type'],
                $data['reading'],
                $data['reading_date'] ?? date('Y-m-d')
            ]);
            $id = $this->db->query("SELECT @new_id AS id")->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
            $this->sendResponse(["success"=>true,"message"=>"Reading recorded","id"=>$id['id']]);
        } catch (PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // GET METER READINGS WITH VOUCHER AMOUNTS
    private function getMeterReadings() {
        $companyId = $_GET['company_id'] ?? null;
        $propertyId = $_GET['property_id'] ?? null;
        $tenantId = $_GET['tenant_id'] ?? null;
        $utilityType = $_GET['utility_type'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        if (!$propertyId || !$utilityType) {
            $this->sendResponse(["success"=>false,"message"=>"property_id & utility_type required"],400);
            return;
        }

        try {
            // Build query to get meter readings with voucher amounts from transactions
            $sql = "
                SELECT
                    mr.reading_id,
                    DATE_FORMAT(mr.reading_date, '%Y-%m-%d') as reading_date,
                    mr.reading,
                    mr.utility_type,
                    mr.tenant_id,
                    mr.property_id,
                    mr.unit_id,
                    COALESCE(t.full_name, 'N/A') as tenant_name,
                    COALESCE(p.property_name, 'N/A') as property_name,
                    COALESCE(u.unit_number, 'N/A') as unit_number,
                    COALESCE(ut.amount, 0) as voucher_amount,
                    COALESCE(ut.voucher_number, '') as voucher_number
                FROM meter_readings mr
                LEFT JOIN tenants t ON mr.tenant_id = t.tenant_id
                LEFT JOIN properties p ON mr.property_id = p.property_id
                LEFT JOIN units u ON mr.unit_id = u.unit_id
                LEFT JOIN utility_transactions ut ON (
                    mr.tenant_id = ut.tenant_id
                    AND mr.property_id = ut.property_id
                    AND mr.utility_type = ut.utility_type
                    AND DATE(mr.reading_date) = DATE(ut.transaction_date)
                )
                WHERE mr.property_id = ?
                AND mr.utility_type = ?
            ";

            $params = [$propertyId, $utilityType];

            if ($tenantId) {
                $sql .= " AND mr.tenant_id = ?";
                $params[] = $tenantId;
            }

            if ($startDate) {
                $sql .= " AND mr.reading_date >= ?";
                $params[] = $startDate;
            }

            if ($endDate) {
                $sql .= " AND mr.reading_date <= ?";
                $params[] = $endDate;
            }

            $sql .= " ORDER BY mr.reading_date ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $readings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Also get total voucher amount for the period
            $totalSql = "
                SELECT COALESCE(SUM(amount), 0) as total_voucher_amount
                FROM utility_transactions
                WHERE property_id = ?
                AND utility_type = ?
            ";
            $totalParams = [$propertyId, $utilityType];

            if ($tenantId) {
                $totalSql .= " AND tenant_id = ?";
                $totalParams[] = $tenantId;
            }

            if ($startDate) {
                $totalSql .= " AND transaction_date >= ?";
                $totalParams[] = $startDate;
            }

            if ($endDate) {
                $totalSql .= " AND transaction_date <= ?";
                $totalParams[] = $endDate;
            }

            $totalStmt = $this->db->prepare($totalSql);
            $totalStmt->execute($totalParams);
            $totals = $totalStmt->fetch(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "readings" => $readings,
                "total_voucher_amount" => floatval($totals['total_voucher_amount'] ?? 0)
            ]);
        } catch (PDOException $e) {
            error_log("Error in getMeterReadings: " . $e->getMessage());
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // GET REPORT (aggregated data for graphing)
    private function getUtilityReport() {
        $companyId = $_GET['company_id'] ?? null;
        $utilityType = $_GET['utility_type'] ?? null;
        if (!$companyId || !$utilityType) {
            $this->sendResponse(["success"=>false,"message"=>"company_id & utility_type required"],400);
            return;
        }

        try {
            $stmt = $this->db->prepare("CALL sp_get_utility_transactions(?, ?)");
            $stmt->execute([$companyId, $utilityType]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            // Aggregate by tenant or week for graphing
            $report = [];
            foreach ($transactions as $t) {
                $week = date('o-\WW', strtotime($t['transaction_date'])); // ISO week
                if (!isset($report[$week])) $report[$week] = 0;
                $report[$week] += $t['amount'];
            }

            $this->sendResponse(["success"=>true,"report"=>$report]);
        } catch (PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }
}
