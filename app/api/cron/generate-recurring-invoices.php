#!/usr/bin/env php
<?php
/**
 * Cron Job: Generate Recurring Invoices
 *
 * This script should be run daily to:
 * 1. Check for recurring invoices due for generation
 * 2. Generate new invoice instances
 * 3. Create PDFs for new invoices
 * 4. Send email notifications to tenants
 *
 * Add to crontab:
 * 0 6 * * * /usr/bin/php /path/to/generate-recurring-invoices.php >> /path/to/logs/recurring-invoices.log 2>&1
 *
 * This runs daily at 6:00 AM
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set script timeout to 5 minutes
set_time_limit(300);

// Get the directory of this script
$scriptDir = dirname(__FILE__);

// Include required files
require_once $scriptDir . '/../DbConnection.php';
require_once $scriptDir . '/../PDFInvoiceGenerator.php';
require_once $scriptDir . '/../EmailService.php';

// Log function
function logMessage($message, $type = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    echo "[{$timestamp}] [{$type}] {$message}\n";
}

// Main execution
try {
    logMessage("=== Starting Recurring Invoice Generation ===");

    // Get database connection
    $dbConnection = new DbConnection();
    $db = $dbConnection->getConnection();

    // Get all recurring invoices due for generation
    $stmt = $db->query("SELECT * FROM v_due_recurring_invoices");
    $dueInvoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalDue = count($dueInvoices);
    logMessage("Found {$totalDue} recurring invoice(s) due for generation");

    if ($totalDue === 0) {
        logMessage("No invoices to generate. Exiting.");
        exit(0);
    }

    $successCount = 0;
    $errorCount = 0;
    $emailsSent = 0;

    // Initialize services
    $pdfGenerator = new PDFInvoiceGenerator();
    $emailService = new EmailService();

    // Process each due invoice
    foreach ($dueInvoices as $recurringInvoice) {
        $invoiceNumber = $recurringInvoice['invoice_number'];
        $tenantName = $recurringInvoice['tenant_name'];

        logMessage("Processing recurring invoice: {$invoiceNumber} for tenant: {$tenantName}");

        try {
            // Generate new invoice instance
            $stmt = $db->prepare("CALL sp_generate_recurring_invoice_instance(?, @new_invoice_id)");
            $stmt->execute([$recurringInvoice['invoice_id']]);
            $stmt->closeCursor();

            // Get the new invoice ID
            $result = $db->query("SELECT @new_invoice_id AS new_invoice_id")->fetch(PDO::FETCH_ASSOC);
            $newInvoiceId = $result['new_invoice_id'];

            if (!$newInvoiceId) {
                throw new Exception("Failed to generate invoice instance - no ID returned");
            }

            logMessage("  ✓ Created new invoice instance (ID: {$newInvoiceId})");

            // Fetch complete invoice data for the new instance
            $invoiceStmt = $db->prepare("
                SELECT
                    i.*,
                    c.company_name,
                    c.address as company_address,
                    c.phone as company_phone,
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
            $invoiceStmt->execute([$newInvoiceId]);
            $invoiceData = $invoiceStmt->fetch(PDO::FETCH_ASSOC);

            // Get invoice items
            $itemStmt = $db->prepare("
                SELECT description, quantity, rate, amount
                FROM invoice_items
                WHERE invoice_id = ?
                ORDER BY item_id
            ");
            $itemStmt->execute([$newInvoiceId]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            $invoiceData['items'] = $items;

            // Handle banking details
            if (!empty($invoiceData['include_banking_details'])) {
                $invoiceData['banking_details'] = $invoiceData['include_banking_details'];
            } elseif (!empty($invoiceData['company_banking_details'])) {
                $invoiceData['banking_details'] = $invoiceData['company_banking_details'];
            }

            // Add links
            $invoiceData['payment_link'] = '#';
            $invoiceData['view_invoice_link'] = '/storage/invoices/invoice-' . $invoiceData['invoice_number'] . '.pdf';

            // Generate PDF
            logMessage("  → Generating PDF...");
            $pdfResult = $pdfGenerator->generateInvoicePDF($invoiceData);

            if ($pdfResult['success']) {
                logMessage("  ✓ PDF generated: {$pdfResult['path']}");

                // Update invoice with PDF path
                $updateStmt = $db->prepare("UPDATE invoices SET pdf_path = ? WHERE invoice_id = ?");
                $updateStmt->execute([$pdfResult['path'], $newInvoiceId]);

                // Send email if tenant has email
                if (!empty($invoiceData['tenant_email'])) {
                    logMessage("  → Sending email to: {$invoiceData['tenant_email']}");

                    $emailResult = $emailService->sendInvoiceEmail(
                        $invoiceData,
                        $invoiceData['tenant_email'],
                        $pdfResult['path']
                    );

                    if ($emailResult['success']) {
                        logMessage("  ✓ Email sent successfully");

                        // Update invoice email status
                        $emailUpdateStmt = $db->prepare("
                            UPDATE invoices
                            SET email_sent = 1, email_sent_at = NOW()
                            WHERE invoice_id = ?
                        ");
                        $emailUpdateStmt->execute([$newInvoiceId]);

                        // Log successful email
                        $emailService->logEmail(
                            $db,
                            $newInvoiceId,
                            $invoiceData['tenant_email'],
                            "Invoice #{$invoiceData['invoice_number']} from {$invoiceData['company_name']}",
                            'sent',
                            null
                        );

                        $emailsSent++;
                    } else {
                        logMessage("  ✗ Email failed: {$emailResult['message']}", 'WARNING');

                        // Log failed email
                        $emailService->logEmail(
                            $db,
                            $newInvoiceId,
                            $invoiceData['tenant_email'],
                            "Invoice #{$invoiceData['invoice_number']} from {$invoiceData['company_name']}",
                            'failed',
                            $emailResult['message']
                        );
                    }
                } else {
                    logMessage("  ! No email address for tenant", 'WARNING');
                }
            } else {
                logMessage("  ✗ PDF generation failed", 'WARNING');
            }

            $successCount++;
            logMessage("  ✓ Completed processing for invoice {$invoiceNumber}");

        } catch (Exception $e) {
            $errorCount++;
            logMessage("  ✗ Error processing invoice {$invoiceNumber}: " . $e->getMessage(), 'ERROR');
            continue;
        }
    }

    // Final summary
    logMessage("=== Generation Complete ===");
    logMessage("Total processed: {$totalDue}");
    logMessage("Successful: {$successCount}");
    logMessage("Errors: {$errorCount}");
    logMessage("Emails sent: {$emailsSent}");

    // Exit with appropriate code
    exit($errorCount > 0 ? 1 : 0);

} catch (Exception $e) {
    logMessage("FATAL ERROR: " . $e->getMessage(), 'ERROR');
    logMessage("Stack trace: " . $e->getTraceAsString(), 'ERROR');
    exit(1);
}
