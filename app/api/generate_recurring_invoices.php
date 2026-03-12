<?php
require_once 'ApiController.php';

class RecurringInvoiceGenerator extends ApiController {
    
    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->getConnection();
            
            if ($this->db === null) {
                throw new Exception("Database connection failed");
            }
            
        } catch (Exception $e) {
            $this->logError("Database initialization failed: " . $e->getMessage());
            exit;
        }
    }

    public function generateRecurringInvoices() {
        try {
            $this->logMessage("Starting recurring invoice generation...");
            
            // Get all active recurring invoices
            $stmt = $this->db->prepare("
                SELECT * FROM invoices 
                WHERE is_recurring = TRUE 
                AND (recurrence_end_date IS NULL OR recurrence_end_date >= CURDATE())
                AND recurrence_start_date <= CURDATE()
                AND status != 'cancelled'
            ");
            $stmt->execute();
            $recurringInvoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->logMessage("Found " . count($recurringInvoices) . " active recurring invoices");
            
            $generatedCount = 0;
            
            foreach ($recurringInvoices as $invoice) {
                if ($this->shouldGenerateInvoice($invoice)) {
                    $this->generateNextInvoice($invoice);
                    $generatedCount++;
                }
            }
            
            $this->logMessage("Successfully generated $generatedCount recurring invoices");
            
            return [
                "success" => true,
                "message" => "Generated $generatedCount recurring invoices",
                "generated_count" => $generatedCount
            ];
            
        } catch (PDOException $e) {
            $errorMessage = "Database error in generateRecurringInvoices: " . $e->getMessage();
            $this->logError($errorMessage);
            return [
                "success" => false,
                "message" => $errorMessage,
                "error" => $e->getMessage()
            ];
        } catch (Exception $e) {
            $errorMessage = "Error in generateRecurringInvoices: " . $e->getMessage();
            $this->logError($errorMessage);
            return [
                "success" => false,
                "message" => $errorMessage,
                "error" => $e->getMessage()
            ];
        }
    }

    private function shouldGenerateInvoice($invoice) {
        // Get the most recent invoice for this recurring series
        $stmt = $this->db->prepare("
            SELECT MAX(invoice_date) as last_invoice_date 
            FROM invoices 
            WHERE (parent_invoice_id = :parent_id OR invoice_id = :parent_id)
            AND status != 'cancelled'
        ");
        $stmt->execute([':parent_id' => $invoice['invoice_id']]);
        $lastInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $lastDate = $lastInvoice['last_invoice_date'] ?: $invoice['recurrence_start_date'];
        $nextDate = $this->calculateNextDate($lastDate, $invoice['recurrence_frequency']);
        
        return $nextDate <= date('Y-m-d');
    }

    private function generateNextInvoice($parentInvoice) {
        $this->db->beginTransaction();
        
        try {
            // Calculate dates
            $lastInvoiceStmt = $this->db->prepare("
                SELECT MAX(invoice_date) as last_invoice_date 
                FROM invoices 
                WHERE (parent_invoice_id = :parent_id OR invoice_id = :parent_id)
                AND status != 'cancelled'
            ");
            $lastInvoiceStmt->execute([':parent_id' => $parentInvoice['invoice_id']]);
            $lastInvoice = $lastInvoiceStmt->fetch(PDO::FETCH_ASSOC);
            
            $lastDate = $lastInvoice['last_invoice_date'] ?: $parentInvoice['recurrence_start_date'];
            $invoiceDate = $this->calculateNextDate($lastDate, $parentInvoice['recurrence_frequency']);
            $dueDate = $this->calculateDueDate($invoiceDate, $parentInvoice['recurrence_frequency']);
            
            // Generate invoice number
            $invoiceNumber = $this->generateNextInvoiceNumber($parentInvoice['company_id']);
            
            // Create new invoice
            $stmt = $this->db->prepare("
                INSERT INTO invoices 
                (company_id, invoice_number, tenant_id, unit_id, invoice_date, due_date, 
                 subtotal, tax_amount, total_amount, status, notes, include_banking_details, 
                 items_json, is_recurring, parent_invoice_id, reminder_days_before,
                 recurrence_frequency, recurrence_start_date, recurrence_end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, FALSE, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $parentInvoice['company_id'],
                $invoiceNumber,
                $parentInvoice['tenant_id'],
                $parentInvoice['unit_id'],
                $invoiceDate,
                $dueDate,
                $parentInvoice['subtotal'],
                $parentInvoice['tax_amount'],
                $parentInvoice['total_amount'],
                $parentInvoice['notes'],
                $parentInvoice['include_banking_details'],
                $parentInvoice['items_json'],
                $parentInvoice['invoice_id'],
                $parentInvoice['reminder_days_before'],
                $parentInvoice['recurrence_frequency'],
                $parentInvoice['recurrence_start_date'],
                $parentInvoice['recurrence_end_date']
            ]);
            
            $newInvoiceId = $this->db->lastInsertId();
            
            // Copy invoice items
            $this->copyInvoiceItems($parentInvoice['invoice_id'], $newInvoiceId);
            
            $this->db->commit();
            
            $this->logMessage("Generated invoice #$invoiceNumber for tenant {$parentInvoice['tenant_id']}");
            
            // TODO: Send email notification if auto-send is enabled
            // $this->sendInvoiceNotification($newInvoiceId);
            
            return $newInvoiceId;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("Failed to generate next invoice: " . $e->getMessage());
        }
    }

    private function copyInvoiceItems($sourceInvoiceId, $targetInvoiceId) {
        $stmt = $this->db->prepare("
            INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
            SELECT :target_id, description, quantity, rate, amount
            FROM invoice_items 
            WHERE invoice_id = :source_id
        ");
        $stmt->execute([
            ':target_id' => $targetInvoiceId,
            ':source_id' => $sourceInvoiceId
        ]);
    }

    private function calculateNextDate($lastDate, $frequency) {
        $date = new DateTime($lastDate);
        switch ($frequency) {
            case 'weekly':
                $date->modify('+1 week');
                break;
            case 'monthly':
                $date->modify('+1 month');
                break;
            case 'quarterly':
                $date->modify('+3 months');
                break;
            case 'semi-annually':
                $date->modify('+6 months');
                break;
            case 'annually':
                $date->modify('+1 year');
                break;
            default:
                $date->modify('+1 month');
        }
        return $date->format('Y-m-d');
    }

    private function calculateDueDate($invoiceDate, $frequency) {
        $date = new DateTime($invoiceDate);
        // Set due date based on frequency (e.g., 15 days after invoice date)
        $date->modify('+15 days');
        return $date->format('Y-m-d');
    }

    private function generateNextInvoiceNumber($companyId) {
        $stmt = $this->db->prepare("
            SELECT MAX(CAST(SUBSTRING(invoice_number, 5) AS UNSIGNED)) as last_number 
            FROM invoices 
            WHERE company_id = ? AND invoice_number LIKE 'INV-%'
        ");
        $stmt->execute([$companyId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $nextNumber = 1;
        if (!empty($result) && isset($result['last_number'])) {
            $nextNumber = (int)$result['last_number'] + 1;
        }
        
        return "INV-" . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    private function logMessage($message) {
        error_log("[RecurringInvoiceGenerator] " . date('Y-m-d H:i:s') . " - " . $message);
        echo $message . "\n";
    }

    private function logError($message) {
        error_log("[RecurringInvoiceGenerator] ERROR: " . date('Y-m-d H:i:s') . " - " . $message);
        echo "ERROR: " . $message . "\n";
    }

    // For manual execution via web request
    public function processRequest() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $this->generateRecurringInvoices();
            $this->sendResponse($result, $result['success'] ? 200 : 500);
        } else {
            $this->sendResponse([
                "success" => false,
                "message" => "Method not allowed. Use POST to generate recurring invoices."
            ], 405);
        }
    }
}

// For command-line execution
if (php_sapi_name() === 'cli') {
    $generator = new RecurringInvoiceGenerator();
    $result = $generator->generateRecurringInvoices();
    
    if ($result['success']) {
        echo "Success: " . $result['message'] . "\n";
        exit(0);
    } else {
        echo "Error: " . $result['message'] . "\n";
        exit(1);
    }
} else {
    // Web request handling
    $generator = new RecurringInvoiceGenerator();
    $generator->processRequest();
}