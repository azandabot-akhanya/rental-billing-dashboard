<?php
require_once 'EmailConfig.php';

class PDFReceiptGenerator {

    /**
     * Generate PDF receipt for deposit or expense
     */
    public function generateReceiptPDF($receiptData, $type = 'deposit') {
        $referenceNumber = $receiptData['reference_number'];
        $sanitizedRef = preg_replace('/[^a-zA-Z0-9_-]/', '_', $referenceNumber);
        $fileName = "{$type}-receipt-{$sanitizedRef}";
        $filePath = $this->getReceiptStoragePath() . "{$fileName}.pdf";

        // Check if wkhtmltopdf is available
        if ($this->isWkhtmltopdfAvailable()) {
            return $this->generateWithWkhtmltopdf($receiptData, $filePath, $type);
        }

        // Fallback: Generate HTML
        return $this->generateHTMLReceipt($receiptData, $type);
    }

    /**
     * Check if wkhtmltopdf is available on the system
     */
    private function isWkhtmltopdfAvailable() {
        $output = shell_exec('which wkhtmltopdf 2>&1');
        return !empty($output);
    }

    /**
     * Generate PDF using wkhtmltopdf
     */
    private function generateWithWkhtmltopdf($receiptData, $outputPath, $type) {
        // Create temporary HTML file
        $htmlContent = $this->getReceiptHTML($receiptData, $type);
        $tempHtml = $this->getReceiptStoragePath() . "temp-{$receiptData['reference_number']}.html";
        file_put_contents($tempHtml, $htmlContent);

        // Convert to PDF
        $command = "wkhtmltopdf --page-size A4 --margin-top 10mm --margin-right 10mm --margin-bottom 10mm --margin-left 10mm {$tempHtml} {$outputPath} 2>&1";
        exec($command, $output, $returnCode);

        // Clean up temp file
        @unlink($tempHtml);

        if ($returnCode === 0 && file_exists($outputPath)) {
            return [
                'success' => true,
                'path' => $outputPath,
                'url' => $this->getReceiptURL($receiptData['reference_number'], $type)
            ];
        }

        // If wkhtmltopdf failed, fall back to HTML
        return $this->generateHTMLReceipt($receiptData, $type);
    }

    /**
     * Generate HTML receipt (fallback or for direct viewing)
     */
    private function generateHTMLReceipt($receiptData, $type) {
        $htmlContent = $this->getReceiptHTML($receiptData, $type);
        $sanitizedRef = preg_replace('/[^a-zA-Z0-9_-]/', '_', $receiptData['reference_number']);
        $fileName = "{$type}-receipt-{$sanitizedRef}.html";
        $filePath = $this->getReceiptStoragePath() . $fileName;

        file_put_contents($filePath, $htmlContent);

        return [
            'success' => true,
            'path' => $filePath,
            'url' => $this->getReceiptURL($receiptData['reference_number'], $type, 'html'),
            'format' => 'html'
        ];
    }

    /**
     * Get receipt HTML template
     */
    private function getReceiptHTML($data, $type) {
        $receiptType = ucfirst($type);
        $colorClass = $type === 'deposit' ? '#10b981' : '#ef4444'; // Green for deposit, Red for expense

        $html = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>{$receiptType} Receipt - {$data['reference_number']}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .receipt-container {
            background: white;
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: #5B5BFF;
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header h2 {
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: normal;
            opacity: 0.95;
        }
        .header .receipt-number {
            background: rgba(255, 255, 255, 0.2);
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            margin-top: 10px;
        }
        .content {
            padding: 40px;
        }
        .info-section {
            margin-bottom: 30px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .info-box {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #5B5BFF;
        }
        .info-box h3 {
            margin: 0 0 12px 0;
            color: #5B5BFF;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-box p {
            margin: 6px 0;
            font-size: 14px;
            color: #4b5563;
        }
        .info-box p strong {
            color: #1f2937;
            display: inline-block;
            min-width: 120px;
        }
        .amount-section {
            background: linear-gradient(135deg, {$colorClass} 0%, " . ($type === 'deposit' ? '#059669' : '#dc2626') . " 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin: 30px 0;
        }
        .amount-section h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            opacity: 0.9;
            font-weight: normal;
        }
        .amount-section .amount {
            font-size: 48px;
            font-weight: bold;
            margin: 0;
        }
        .transaction-details {
            margin: 30px 0;
        }
        .transaction-details h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            color: #6b7280;
            font-weight: 500;
        }
        .detail-value {
            color: #1f2937;
            font-weight: 600;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
        }
        .footer p {
            margin: 8px 0;
            color: #6b7280;
            font-size: 12px;
        }
        .footer .company-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 14px;
        }
        .print-button {
            background: #5B5BFF;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(91, 91, 255, 0.3);
        }
        .print-button:hover {
            background: #4F46E5;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            background: " . ($type === 'deposit' ? '#d1fae5' : '#fee2e2') . ";
            color: " . ($type === 'deposit' ? '#065f46' : '#991b1b') . ";
        }
    </style>
</head>
<body>
    <button class='print-button no-print' onclick='window.print()'>Print Receipt</button>

    <div class='receipt-container'>
        <div class='header'>
            <h1>{$data['company_name']}</h1>
            <h2>{$receiptType} Receipt</h2>
            <div class='receipt-number'>Receipt #: {$data['reference_number']}</div>
        </div>

        <div class='content'>
            <div class='amount-section'>
                <h3>Amount " . ($type === 'deposit' ? 'Received' : 'Paid') . "</h3>
                <p class='amount'>R " . number_format($data['amount'], 2) . "</p>
            </div>

            <div class='info-grid'>
                <div class='info-box'>
                    <h3>" . ($type === 'deposit' ? 'Received From' : 'Paid To') . "</h3>
                    <p><strong>Name:</strong> " . (isset($data['tenant_name']) && $data['tenant_name'] ? $data['tenant_name'] : (isset($data['vendor_name']) && $data['vendor_name'] ? $data['vendor_name'] : 'N/A')) . "</p>
                    <p><strong>Property:</strong> " . (isset($data['property_name']) ? $data['property_name'] : 'N/A') . "</p>
                    <p><strong>Unit:</strong> " . (isset($data['unit_number']) ? $data['unit_number'] : 'N/A') . "</p>
                </div>

                <div class='info-box'>
                    <h3>Transaction Details</h3>
                    <p><strong>Date:</strong> " . date('F j, Y', strtotime($data['transaction_date'])) . "</p>
                    <p><strong>Time:</strong> " . date('g:i A', strtotime($data['transaction_date'])) . "</p>
                    <p><strong>Type:</strong> <span class='badge'>{$receiptType}</span></p>
                </div>
            </div>

            <div class='transaction-details'>
                <h3>Payment Information</h3>
                <div class='detail-row'>
                    <span class='detail-label'>Payment Method:</span>
                    <span class='detail-value'>" . (isset($data['payment_method']) && $data['payment_method'] ? $data['payment_method'] : 'N/A') . "</span>
                </div>
                <div class='detail-row'>
                    <span class='detail-label'>Account:</span>
                    <span class='detail-value'>" . (isset($data['account_name']) && $data['account_name'] ? $data['account_name'] : 'N/A') . "</span>
                </div>
                <div class='detail-row'>
                    <span class='detail-label'>Category:</span>
                    <span class='detail-value'>" . (isset($data['category_name']) && $data['category_name'] ? $data['category_name'] : 'N/A') . "</span>
                </div>
                <div class='detail-row'>
                    <span class='detail-label'>Reference Number:</span>
                    <span class='detail-value'>{$data['reference_number']}</span>
                </div>
                " . (!empty($data['description']) ? "
                <div class='detail-row'>
                    <span class='detail-label'>Description:</span>
                    <span class='detail-value'>{$data['description']}</span>
                </div>
                " : "") . "
            </div>

            <div class='footer'>
                <p class='company-name'>{$data['company_name']}</p>
                <p>Thank you for your business!</p>
                <p style='margin-top: 10px;'>This receipt was generated on " . date('F j, Y \a\t g:i A') . "</p>
                <p style='margin-top: 5px; font-style: italic;'>Generated with ThynkXPro</p>
            </div>
        </div>
    </div>
</body>
</html>
        ";

        return $html;
    }

    /**
     * Get receipt storage path
     */
    private function getReceiptStoragePath() {
        // Store in the main public folder (same level as invoices)
        $path = dirname(dirname(__DIR__)) . '/public/receipts/';
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
        }
        return $path;
    }

    /**
     * Get public URL for receipt
     */
    private function getReceiptURL($referenceNumber, $type, $extension = 'pdf') {
        $sanitizedRef = preg_replace('/[^a-zA-Z0-9_-]/', '_', $referenceNumber);
        return "/receipts/{$type}-receipt-{$sanitizedRef}.{$extension}";
    }
}
