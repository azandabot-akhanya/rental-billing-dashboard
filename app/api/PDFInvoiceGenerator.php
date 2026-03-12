<?php
require_once 'EmailConfig.php';

class PDFInvoiceGenerator {

    /**
     * Generate PDF invoice using TCPDF (if available) or fallback to HTML2PDF
     * For now, we'll create a well-formatted HTML that can be converted to PDF
     */
    public function generateInvoicePDF($invoiceData) {
        $invoiceNumber = $invoiceData['invoice_number'];
        $filePath = EmailConfig::getInvoiceStoragePath() . "invoice-{$invoiceNumber}.pdf";

        // Check if wkhtmltopdf is available (common on servers)
        if ($this->isWkhtmltopdfAvailable()) {
            return $this->generateWithWkhtmltopdf($invoiceData, $filePath);
        }

        // Fallback: Generate HTML and save as .html (can be printed to PDF by user)
        return $this->generateHTMLInvoice($invoiceData);
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
    private function generateWithWkhtmltopdf($invoiceData, $outputPath) {
        // Create temporary HTML file
        $htmlContent = $this->getInvoiceHTML($invoiceData);
        $tempHtml = EmailConfig::getInvoiceStoragePath() . "temp-{$invoiceData['invoice_number']}.html";
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
                'url' => $this->getInvoiceURL($invoiceData['invoice_number'])
            ];
        }

        // If wkhtmltopdf failed, fall back to HTML
        return $this->generateHTMLInvoice($invoiceData);
    }

    /**
     * Generate HTML invoice (fallback or for direct viewing)
     */
    private function generateHTMLInvoice($invoiceData) {
        $htmlContent = $this->getInvoiceHTML($invoiceData);
        $fileName = "invoice-{$invoiceData['invoice_number']}.html";
        $filePath = EmailConfig::getInvoiceStoragePath() . $fileName;

        file_put_contents($filePath, $htmlContent);

        return [
            'success' => true,
            'path' => $filePath,
            'url' => $this->getInvoiceURL($invoiceData['invoice_number'], 'html'),
            'format' => 'html'
        ];
    }

    /**
     * Get invoice HTML template
     */
    private function getInvoiceHTML($data) {
        $items = $data['items'] ?? [];
        $itemsHTML = '';

        foreach ($items as $item) {
            $itemsHTML .= "
                <tr>
                    <td style='padding: 12px 8px; border-bottom: 1px solid #e5e7eb;'>{$item['description']}</td>
                    <td style='padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;'>{$item['quantity']}</td>
                    <td style='padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;'>R " . number_format($item['rate'], 2) . "</td>
                    <td style='padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;'>R " . number_format($item['quantity'] * $item['rate'], 2) . "</td>
                </tr>
            ";
        }

        $taxRow = '';
        if (!empty($data['tax_amount']) && $data['tax_amount'] > 0) {
            $taxRate = isset($data['tax_rate']) && $data['tax_rate'] > 0 ? $data['tax_rate'] : 15;
            $taxRow = "
                <tr>
                    <td colspan='3' style='padding: 12px 8px; text-align: right; font-weight: 600;'>Tax ({$taxRate}%):</td>
                    <td style='padding: 12px 8px; text-align: right; font-weight: 600;'>R " . number_format($data['tax_amount'], 2) . "</td>
                </tr>
            ";
        }

        $html = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Invoice #{$data['invoice_number']}</title>
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
        }
        .invoice-container {
            background: white;
            padding: 40px;
            border: 1px solid #e5e7eb;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4F46E5;
        }
        .company-details h1 {
            margin: 0 0 10px 0;
            color: #4F46E5;
            font-size: 28px;
        }
        .company-details p {
            margin: 4px 0;
            color: #666;
            font-size: 14px;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-meta h2 {
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-size: 24px;
        }
        .invoice-meta p {
            margin: 4px 0;
            font-size: 14px;
        }
        .billing-info {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
        }
        .billing-box {
            flex: 1;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-right: 20px;
        }
        .billing-box:last-child {
            margin-right: 0;
        }
        .billing-box h3 {
            margin: 0 0 10px 0;
            color: #4F46E5;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .billing-box p {
            margin: 4px 0;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        thead {
            background: #f8f9fa;
        }
        th {
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #4F46E5;
            border-bottom: 2px solid #4F46E5;
            font-size: 14px;
            text-transform: uppercase;
        }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) {
            text-align: right;
        }
        .totals {
            margin-top: 20px;
            text-align: right;
        }
        .totals table {
            margin-left: auto;
            width: 300px;
        }
        .totals td {
            padding: 8px;
            border: none;
        }
        .total-row {
            background: #4F46E5;
            color: white;
            font-size: 18px;
            font-weight: bold;
        }
        .payment-details {
            margin-top: 40px;
            padding: 20px;
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
        }
        .payment-details h3 {
            margin: 0 0 15px 0;
            color: #1e40af;
            font-size: 16px;
        }
        .payment-details p {
            margin: 6px 0;
            font-size: 14px;
            color: #1e3a8a;
        }
        .notes {
            margin-top: 30px;
            padding: 20px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .notes h3 {
            margin: 0 0 10px 0;
            color: #78350f;
            font-size: 14px;
        }
        .notes p {
            margin: 4px 0;
            font-size: 13px;
            color: #78350f;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .print-button {
            background: #4F46E5;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .print-button:hover {
            background: #4338CA;
        }
    </style>
</head>
<body>
    <button class='print-button no-print' onclick='window.print()'>Print Invoice</button>

    <div class='invoice-container'>
        <div class='header'>
            <div class='company-details'>
                <h1>{$data['company_name']}</h1>
                <p>{$data['company_address']}</p>
                <p>Tel: {$data['company_phone']}</p>
                <p>Email: {$data['company_email']}</p>
            </div>
            <div class='invoice-meta'>
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> {$data['invoice_number']}</p>
                <p><strong>Date:</strong> {$data['invoice_date']}</p>
                <p><strong>Due Date:</strong> {$data['due_date']}</p>
                <p><strong>Status:</strong> <span style='color: #dc2626; font-weight: 600;'>" . strtoupper($data['status']) . "</span></p>
            </div>
        </div>

        <div class='billing-info'>
            <div class='billing-box'>
                <h3>Bill To:</h3>
                <p><strong>{$data['tenant_name']}</strong></p>
                <p>{$data['tenant_email']}</p>
                <p>{$data['tenant_phone']}</p>
            </div>
            <div class='billing-box'>
                <h3>Property Details:</h3>
                <p><strong>{$data['property_name']}</strong></p>
                <p>Unit: {$data['unit_number']}</p>
                <p>{$data['property_address']}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style='text-align: center;'>Quantity</th>
                    <th style='text-align: right;'>Rate</th>
                    <th style='text-align: right;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {$itemsHTML}
            </tbody>
        </table>

        <div class='totals'>
            <table>
                <tr>
                    <td style='padding: 12px 8px; text-align: right; font-weight: 600;'>Subtotal:</td>
                    <td style='padding: 12px 8px; text-align: right; font-weight: 600;'>R " . number_format($data['subtotal'], 2) . "</td>
                </tr>
                {$taxRow}
                <tr class='total-row'>
                    <td style='padding: 16px 12px;'>TOTAL DUE:</td>
                    <td style='padding: 16px 12px;'>R " . number_format($data['total_amount'], 2) . "</td>
                </tr>
            </table>
        </div>

        " . (!empty($data['banking_details']) ? "
        <div class='payment-details'>
            <h3>Payment Details:</h3>
            <pre style='margin: 0; font-family: Arial; font-size: 14px; white-space: pre-wrap;'>{$data['banking_details']}</pre>
            <p style='margin-top: 15px;'><strong>Payment Reference:</strong> {$data['invoice_number']}</p>
        </div>
        " : "") . "

        " . (!empty($data['notes']) ? "
        <div class='notes'>
            <h3>Notes:</h3>
            <p>{$data['notes']}</p>
        </div>
        " : "") . "

        <div class='footer'>
            <p><strong>{$data['company_name']}</strong></p>
            <p>Thank you for your business!</p>
            <p style='margin-top: 10px;'>This invoice was generated on " . date('Y-m-d H:i:s') . "</p>
            <p style='margin-top: 5px; font-style: italic;'>Generated with ThynkXPro</p>
        </div>
    </div>
</body>
</html>
        ";

        return $html;
    }

    /**
     * Get public URL for invoice
     * Returns a path relative to the API that can be served by the storage route
     */
    private function getInvoiceURL($invoiceNumber, $extension = 'pdf') {
        return "/storage/invoices/invoice-{$invoiceNumber}.{$extension}";
    }
}
