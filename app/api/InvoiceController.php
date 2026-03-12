<?php
require_once 'ApiController.php';
require_once 'PDFInvoiceGenerator.php';
require_once 'EmailService.php';

class InvoiceController extends ApiController {
    public $requestMethod;
    public $params = [];

    // Add setters to match your routing structure
    public function setRequestMethod($method) {
        $this->requestMethod = $method;
    }

    public function setParams($params) {
        $this->params = $params;
    }

    public function processRequest() {
        // Check if we have an invoice ID in the URL (e.g., /invoices/123)
        $invoiceId = null;

        // Improved parameter parsing
        if (count($this->params) > 0) {
            // Check if first parameter is numeric (ID)
            if (is_numeric($this->params[0])) {
                $invoiceId = $this->params[0];
            }
            // Check if we have /invoices/ID pattern
            else if ($this->params[0] === 'invoices' && count($this->params) > 1 && is_numeric($this->params[1])) {
                $invoiceId = $this->params[1];
            }
        }

        switch ($this->requestMethod) {
            case 'GET':
                // Check for /invoices/next-number endpoint
                if (isset($this->params[1]) && $this->params[1] === 'next-number') {
                    $this->getNextInvoiceNumber();
                } elseif ($invoiceId) {
                    // Check for action endpoints: /invoices/{id}/pdf or /invoices/{id}/send
                    if (isset($this->params[2])) {
                        $action = $this->params[2];
                        if ($action === 'pdf') {
                            $this->generateInvoicePDF($invoiceId);
                        } elseif ($action === 'send') {
                            $this->sendInvoiceEmail($invoiceId);
                        } else {
                            $this->getInvoiceById($invoiceId);
                        }
                    } else {
                        $this->getInvoiceById($invoiceId);
                    }
                } elseif (isset($this->params[1]) && $this->params[0] === 'invoices' && $this->params[1] === 'tenant' && isset($this->params[2])) {
                    $tenantId = $this->params[2];
                    $this->getTenantInvoices($tenantId);
                } elseif (in_array('invoices', $this->params)) {
                    $this->getInvoices();
                } else {
                    $this->sendResponse(["message" => "Invalid GET endpoint"], 404);
                }
                break;

            case 'POST':
                if (in_array('invoices', $this->params)) {
                    if (isset($data['is_recurring']) && $data['is_recurring']) {
                        $this->createRecurringInvoice();
                    } else {
                        $this->createInvoice();
                    }
                } else {
                    $this->sendResponse(["message" => "Invalid POST endpoint"], 404);
                }
                break;

            case 'PUT':
                if ($invoiceId) {
                    $this->updateInvoice($invoiceId);
                } else {
                    $this->sendResponse(["message" => "Invoice ID required for update"], 400);
                }
                break;

            case 'DELETE':
                if ($invoiceId) {
                    $this->deleteInvoice($invoiceId);
                } else {
                    $this->sendResponse(["message" => "Invoice ID required for deletion"], 400);
                }
                break;

            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
        }
    }

    

    private function getInvoices() {
        $companyId = $_GET['company_id'] ?? null;
    
        if (!$companyId) {
            $this->sendResponse(["success" => false, "message" => "Missing company_id"], 400);
            return;
        }
    
        try {
            // Step 1: Get all invoices by company_id
            $stmt = $this->db->prepare("SELECT * FROM invoices WHERE company_id = ?");
            $stmt->execute([$companyId]);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
    
            // Step 2: Attach items to each invoice
            foreach ($invoices as &$invoice) {
                $invoiceId = $invoice['invoice_id'];
                $itemStmt = $this->db->prepare("SELECT item_id, description, quantity, rate, amount, created_at FROM invoice_items WHERE invoice_id = ?");
                $itemStmt->execute([$invoiceId]);
                $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                $invoice['items'] = $items;
            }
    
            $this->sendResponse([
                "success" => true,
                "invoices" => $invoices,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch invoices",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function getTenantInvoices($tenantId) {
        if (!is_numeric($tenantId)) {
            $this->sendResponse(["success" => false, "message" => "Invalid tenant ID"], 400);
            return;
        }
    
        try {
            // Call the newly created procedure
            $stmt = $this->db->prepare("CALL sp_get_all_invoices_by_tenant(?)");
            $stmt->execute([$tenantId]);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
    
            // Build summary (optional)
            $totalDue = 0;
            $overdueInvoices = [];
            $currentDate = new DateTime();
    
            foreach ($invoices as &$invoice) {
                $dueDate = new DateTime($invoice['due_date']);
                $invoice['is_overdue'] = $dueDate < $currentDate && $invoice['status'] !== 'paid';
                $invoice['days_overdue'] = $invoice['is_overdue'] ? $currentDate->diff($dueDate)->days : 0;
    
                if ($invoice['is_overdue']) {
                    $totalDue += (float)$invoice['balance_due'];
                    $overdueInvoices[] = $invoice;
                }
            }
    
            $this->sendResponse([
                "success" => true,
                "invoices" => $invoices,
                "summary" => [
                    "total_due" => $totalDue,
                    "overdue_count" => count($overdueInvoices),
                    "payment_status" => $totalDue > 0 ? "overdue" : "current"
                ]
            ]);
    
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch tenant invoices",
                "error" => $e->getMessage()
            ], 500);
        }
    }
    
    

    private function getInvoiceById($invoiceId) {
        try {
            // Get complete invoice data with all related information
            $invoice = $this->getCompleteInvoiceData($invoiceId);

            if (!$invoice) {
                $this->sendResponse(["success" => false, "message" => "Invoice not found"], 404);
                return;
            }

            $this->sendResponse([
                "success" => true,
                "invoice" => $invoice,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch invoice",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function createInvoice() {
        $data = $this->getRequestBody();
    
        // Quick validation for required fields
        $required = ['company_id', 'invoice_number', 'tenant_id', 'invoice_date', 'due_date', 'subtotal', 'tax_amount', 'total_amount', 'status', 'items', 'include_banking_details'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }
    
        $itemsJson = json_encode($data['items']);
        
        // Handle unit_id - if property_id is provided instead, find the corresponding unit
        $unitId = $data['unit_id'] ?? null;
        
        // If property_id is provided but unit_id is not, try to find a default unit
        if (isset($data['property_id']) && !$unitId) {
            try {
                $stmt = $this->db->prepare("SELECT unit_id FROM units WHERE property_id = ? LIMIT 1");
                $stmt->execute([$data['property_id']]);
                $unit = $stmt->fetch(PDO::FETCH_ASSOC);
                $unitId = $unit ? $unit['unit_id'] : null;
            } catch (PDOException $e) {
                // If we can't find a unit, continue with null
                $unitId = null;
            }
        }
    
        try {
            // First call the stored procedure with the new parameter
            $stmt = $this->db->prepare("CALL sp_create_invoice(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_invoice_id)");
            $stmt->execute([
                $data['company_id'],
                $data['invoice_number'],
                $data['tenant_id'],
                $unitId, // Use the resolved unit_id
                $data['invoice_date'],
                $data['due_date'],
                $data['subtotal'],
                $data['tax_amount'],
                $data['total_amount'],
                $data['status'],
                $data['notes'] ?? '',
                $itemsJson,
                $data['include_banking_details'] ?? '' // Convert boolean to integer
            ]);
            $stmt->closeCursor();
    
            // Then get the OUT parameter
            $result = $this->db->query("SELECT @new_invoice_id AS invoice_id")->fetch(PDO::FETCH_ASSOC);
            $invoiceId = $result['invoice_id'] ?? null;
    
            if (!$invoiceId) {
                throw new PDOException("Failed to create invoice - no invoice ID returned");
            }
    
            $this->sendResponse([
                "success" => true,
                "message" => "Invoice created successfully",
                "invoice_id" => (int)$invoiceId
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create invoice",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function createRecurringInvoice() {
        $data = $this->getRequestBody();
        
        // Validate required fields
        $required = ['company_id', 'invoice_number', 'tenant_id', 'invoice_date', 'due_date', 
                    'subtotal', 'total_amount', 'frequency', 'start_date', 'items'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }
        
        $itemsJson = json_encode($data['items']);
        
        try {
            // First create the parent recurring invoice
            $stmt = $this->db->prepare("
                INSERT INTO invoices 
                (company_id, invoice_number, tenant_id, unit_id, invoice_date, due_date, 
                 subtotal, tax_amount, total_amount, status, notes, include_banking_details, 
                 items_json, is_recurring, recurrence_frequency, recurrence_start_date, 
                 recurrence_end_date, reminder_days_before)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['company_id'],
                $data['invoice_number'],
                $data['tenant_id'],
                $data['unit_id'] ?? null,
                $data['start_date'], // Use start_date as initial invoice_date
                $data['due_date'],
                $data['subtotal'],
                $data['tax_amount'] ?? 0,
                $data['total_amount'],
                'draft', // Start as draft for recurring invoices
                $data['notes'] ?? '',
                $data['include_banking_details'] ?? '',
                $itemsJson,
                $data['frequency'],
                $data['start_date'],
                $data['end_date'] ?? null,
                $data['reminder_days'] ?? 3
            ]);
            
            $invoiceId = $this->db->lastInsertId();
            
            $this->sendResponse([
                "success" => true,
                "message" => "Recurring invoice created successfully",
                "invoice_id" => (int)$invoiceId
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create recurring invoice",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    // Add this to your API controller or create a new endpoint
    public function getNextInvoiceNumber() {
        $companyId = $_GET['company_id'] ?? null;

        if (!$companyId) {
            $this->sendResponse(["message" => "Company ID required"], 400);
            return;
        }

        try {
            // Get the highest invoice number for this company
            $stmt = $this->db->prepare(
                "SELECT MAX(CAST(SUBSTRING(invoice_number, 5) AS UNSIGNED)) as last_number
                FROM invoices
                WHERE company_id = ? AND invoice_number LIKE 'INV-%'"
            );
            $stmt->execute([$companyId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            // Start from 501 instead of 1
            $nextNumber = 501;
            if ($result && isset($result['last_number']) && $result['last_number'] !== null) {
                $lastNumber = (int)$result['last_number'];
                // If there are existing invoices, increment from the last one
                // Otherwise start from 501
                $nextNumber = ($lastNumber >= 501) ? $lastNumber + 1 : 501;
            }

            $invoiceNumber = "INV-" . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
            $this->sendResponse(["invoice_number" => $invoiceNumber]);
        } catch (Exception $e) {
            $this->sendResponse(["message" => "Error generating invoice number", "error" => $e->getMessage()], 500);
        }
    }

    private function updateInvoice($invoiceId) {
        $data = $this->getRequestBody();

        try {
            $stmt = $this->db->prepare("CALL UpdateInvoice(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $invoiceId,
                $data['invoice_number'] ?? null,
                $data['tenant_id'] ?? null,
                $data['unit_id'] ?? null,
                $data['invoice_date'] ?? null,
                $data['due_date'] ?? null,
                $data['subtotal'] ?? null,
                $data['tax_amount'] ?? null,
                $data['total_amount'] ?? null,
                $data['amount_paid'] ?? null,
                $data['status'] ?? null,
                $data['notes'] ?? null,
                isset($data['include_banking_details']) ? ($data['include_banking_details'] ?? '') : '', // 👈 13th
                isset($data['items']) ? json_encode($data['items']) : null // 👈 14th
            ]);
            
            
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "message" => "Invoice updated successfully",
                "affected_rows" => $result['affected_rows'] ?? 1
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update invoice",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function deleteInvoice($invoiceId) {
        try {
            $stmt = $this->db->prepare("CALL DeleteInvoice(?)");
            $stmt->execute([$invoiceId]);

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "message" => $result['message'] ?? "Invoice deleted successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete invoice",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate PDF for an invoice
     * GET /invoices/{id}/pdf
     */
    public function generateInvoicePDF($invoiceId) {
        try {
            // Fetch complete invoice data with all related information
            $invoiceData = $this->getCompleteInvoiceData($invoiceId);

            if (!$invoiceData) {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Invoice not found"
                ], 404);
                return;
            }

            // Generate PDF
            $pdfGenerator = new PDFInvoiceGenerator();
            $result = $pdfGenerator->generateInvoicePDF($invoiceData);

            if ($result['success']) {
                // Update invoice record with PDF path
                $stmt = $this->db->prepare("UPDATE invoices SET pdf_path = ? WHERE invoice_id = ?");
                $stmt->execute([$result['path'], $invoiceId]);

                $this->sendResponse([
                    "success" => true,
                    "message" => "PDF generated successfully",
                    "pdf_path" => $result['path'],
                    "pdf_url" => $result['url'],
                    "format" => $result['format'] ?? 'pdf'
                ]);
            } else {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Failed to generate PDF"
                ], 500);
            }

        } catch (Exception $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Error generating PDF",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send invoice email to tenant
     * GET /invoices/{id}/send
     */
    public function sendInvoiceEmail($invoiceId) {
        try {
            // Fetch complete invoice data
            $invoiceData = $this->getCompleteInvoiceData($invoiceId);

            if (!$invoiceData) {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Invoice not found"
                ], 404);
                return;
            }

            // Check if tenant email exists
            if (empty($invoiceData['tenant_email'])) {
                $this->sendResponse([
                    "success" => false,
                    "message" => "Tenant email not found"
                ], 400);
                return;
            }

            // Generate PDF if it doesn't exist
            $pdfPath = $invoiceData['pdf_path'] ?? null;
            if (!$pdfPath || !file_exists($pdfPath)) {
                $pdfGenerator = new PDFInvoiceGenerator();
                $pdfResult = $pdfGenerator->generateInvoicePDF($invoiceData);

                if ($pdfResult['success']) {
                    $pdfPath = $pdfResult['path'];
                    // Update invoice record
                    $stmt = $this->db->prepare("UPDATE invoices SET pdf_path = ? WHERE invoice_id = ?");
                    $stmt->execute([$pdfPath, $invoiceId]);
                }
            }

            // Send email
            $emailService = new EmailService();
            $emailResult = $emailService->sendInvoiceEmail(
                $invoiceData,
                $invoiceData['tenant_email'],
                $pdfPath
            );

            if ($emailResult['success']) {
                // Update invoice email status
                $stmt = $this->db->prepare("
                    UPDATE invoices
                    SET email_sent = 1, email_sent_at = NOW()
                    WHERE invoice_id = ?
                ");
                $stmt->execute([$invoiceId]);

                // Log email
                $emailService->logEmail(
                    $this->db,
                    $invoiceId,
                    $invoiceData['tenant_email'],
                    "Invoice #{$invoiceData['invoice_number']} from {$invoiceData['company_name']}",
                    'sent',
                    null
                );

                $this->sendResponse([
                    "success" => true,
                    "message" => "Invoice email sent successfully",
                    "recipient" => $invoiceData['tenant_email']
                ]);
            } else {
                // Log failed email
                $emailService->logEmail(
                    $this->db,
                    $invoiceId,
                    $invoiceData['tenant_email'],
                    "Invoice #{$invoiceData['invoice_number']} from {$invoiceData['company_name']}",
                    'failed',
                    $emailResult['message']
                );

                $this->sendResponse([
                    "success" => false,
                    "message" => "Failed to send email: " . $emailResult['message']
                ], 500);
            }

        } catch (Exception $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Error sending email",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get complete invoice data for PDF/Email generation
     */
    private function getCompleteInvoiceData($invoiceId) {
        try {
            // Get invoice with company and tenant details
            $stmt = $this->db->prepare("
                SELECT
                    i.*,
                    c.company_name,
                    c.address as company_address,
                    c.contact_number as company_phone,
                    c.email as company_email,
                    c.banking_details as company_banking_details,
                    t.full_name as tenant_name,
                    t.email as tenant_email,
                    t.phone as tenant_phone,
                    p.property_name,
                    p.address as property_address,
                    u.unit_number
                FROM invoices i
                JOIN companies c ON i.company_id = c.company_id
                JOIN tenants t ON i.tenant_id = t.tenant_id
                LEFT JOIN units u ON i.unit_id = u.unit_id
                LEFT JOIN properties p ON u.property_id = p.property_id OR t.property_id = p.property_id
                WHERE i.invoice_id = ?
            ");
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor(); // Close the cursor after fetching

            if (!$invoice) {
                error_log("Invoice not found for ID: " . $invoiceId);
                return null;
            }

            // Get invoice items - check both invoice_items table and items_json
            $itemStmt = $this->db->prepare("
                SELECT description, quantity, rate, amount
                FROM invoice_items
                WHERE invoice_id = ?
                ORDER BY item_id
            ");
            $itemStmt->execute([$invoiceId]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            // If no items found in invoice_items table, try items_json
            if (empty($items) && !empty($invoice['items_json'])) {
                $items = json_decode($invoice['items_json'], true);
                // Ensure each item has an 'amount' field
                foreach ($items as &$item) {
                    if (!isset($item['amount'])) {
                        $item['amount'] = $item['quantity'] * $item['rate'];
                    }
                }
            }

            // Add items to invoice data
            $invoice['items'] = $items ?: [];

            // Use company banking details if invoice has include_banking_details
            if (!empty($invoice['include_banking_details'])) {
                $invoice['banking_details'] = $invoice['include_banking_details'];
            } elseif (!empty($invoice['company_banking_details'])) {
                $invoice['banking_details'] = $invoice['company_banking_details'];
            }

            // Add payment and view links (these can be customized)
            $invoice['payment_link'] = '#'; // Replace with actual payment gateway link
            $invoice['view_invoice_link'] = '/storage/invoices/invoice-' . $invoice['invoice_number'] . '.pdf';

            return $invoice;

        } catch (PDOException $e) {
            error_log("PDO Error fetching invoice data: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return null;
        } catch (Exception $e) {
            error_log("General Error fetching invoice data: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return null;
        }
    }
}