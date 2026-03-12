<?php
require_once 'EmailConfig.php';

class EmailService {
    private $smtpHost;
    private $smtpPort;
    private $smtpUsername;
    private $smtpPassword;
    private $fromEmail;
    private $fromName;

    public function __construct() {
        $this->smtpHost = EmailConfig::SMTP_HOST;
        $this->smtpPort = EmailConfig::SMTP_PORT;
        $this->smtpUsername = EmailConfig::SMTP_USERNAME;
        $this->smtpPassword = EmailConfig::SMTP_PASSWORD;
        $this->fromEmail = EmailConfig::SMTP_FROM_EMAIL;
        $this->fromName = EmailConfig::SMTP_FROM_NAME;
    }

    /**
     * Send email using mail() function (PHPMailer disabled)
     */
    public function sendEmail($to, $subject, $htmlBody, $attachments = []) {
        // Email functionality temporarily disabled for demo
        error_log("Email would be sent to: {$to}, Subject: {$subject}");
        return [
            'success' => true,
            'message' => 'Email logged (email sending disabled for demo)'
        ];
    }

    /**
     * Try alternative SMTP configuration
     */
    private function sendEmailAlternative($to, $subject, $htmlBody, $attachments = []) {
        return $this->sendEmail($to, $subject, $htmlBody, $attachments);
    }

    /**
     * Get invoice email template
     */
    public function getInvoiceEmailTemplate($data) {
        // Simple template without file dependency
        $template = "
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <h2>Invoice #{INVOICE_NUMBER}</h2>
                <p>Dear {TENANT_NAME},</p>
                <p>Your invoice from {COMPANY_NAME} is ready.</p>
                <p><strong>Amount Due:</strong> R {TOTAL_AMOUNT}</p>
                <p><strong>Due Date:</strong> {DUE_DATE}</p>
                <p>Thank you for your business!</p>
            </body>
            </html>
        ";

        // Replace placeholders
        $replacements = [
            '{COMPANY_NAME}' => $data['company_name'] ?? 'ThynkXPro DPL',
            '{TENANT_NAME}' => $data['tenant_name'] ?? 'Valued Customer',
            '{INVOICE_NUMBER}' => $data['invoice_number'] ?? '',
            '{INVOICE_DATE}' => $data['invoice_date'] ?? date('Y-m-d'),
            '{DUE_DATE}' => $data['due_date'] ?? '',
            '{TOTAL_AMOUNT}' => $data['total_amount'] ?? '0.00',
            '{PROPERTY_NAME}' => $data['property_name'] ?? '',
            '{UNIT_NUMBER}' => $data['unit_number'] ?? '',
            '{PAYMENT_LINK}' => $data['payment_link'] ?? '#',
            '{VIEW_INVOICE_LINK}' => $data['view_invoice_link'] ?? '#',
        ];

        foreach ($replacements as $key => $value) {
            $template = str_replace($key, $value, $template);
        }

        return $template;
    }

    /**
     * Send invoice email to tenant
     */
    public function sendInvoiceEmail($invoiceData, $tenantEmail, $pdfPath) {
        $subject = "Invoice #{$invoiceData['invoice_number']} from {$invoiceData['company_name']}";
        $htmlBody = $this->getInvoiceEmailTemplate($invoiceData);

        return $this->sendEmail($tenantEmail, $subject, $htmlBody, []);
    }

    /**
     * Log email to database
     */
    public function logEmail($db, $invoiceId, $recipientEmail, $subject, $status, $errorMessage = null) {
        try {
            $stmt = $db->prepare("
                INSERT INTO email_logs (invoice_id, recipient_email, subject, status, error_message)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$invoiceId, $recipientEmail, $subject, $status, $errorMessage]);
            return true;
        } catch (Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
            return false;
        }
    }
}
