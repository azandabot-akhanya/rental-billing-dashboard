<?php
require_once 'EmailConfig.php';
// Temporarily disabled - PHPMailer not installed
// require_once __DIR__ . '/../../vendor/autoload.php';

// use PHPMailer\PHPMailer\PHPMailer;
// use PHPMailer\PHPMailer\Exception;

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
     * Send email using PHPMailer with SMTP
     */
    public function sendEmail($to, $subject, $htmlBody, $attachments = []) {
        // Email functionality temporarily disabled
        error_log("Email would be sent to: {$to}, Subject: {$subject}");
        return [
            'success' => true,
            'message' => 'Email feature temporarily disabled'
        ];

        /* PHPMailer code - requires vendor/autoload.php
        try {
            $mail = new PHPMailer(true);

            // Server settings
            $mail->isSMTP();
            $mail->Host       = $this->smtpHost;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtpUsername;
            $mail->Password   = $this->smtpPassword;

            // Use STARTTLS for port 587 (standard for authenticated SMTP)
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->SMTPAutoTLS = true;
            $mail->Port       = $this->smtpPort;

            // Enable verbose debug output (for testing)
            $mail->SMTPDebug  = 0; // Set to 2 for detailed debugging, 0 for production
            $mail->Debugoutput = function($str, $level) {
                error_log("SMTP Debug [$level]: $str");
            };

            // Set timeout
            $mail->Timeout = 30;
            $mail->SMTPKeepAlive = false;

            // Recipients
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($to);
            $mail->addReplyTo($this->fromEmail, $this->fromName);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = strip_tags($htmlBody); // Plain text version
            $mail->CharSet = 'UTF-8';

            // Add attachments
            foreach ($attachments as $attachment) {
                if (file_exists($attachment['path'])) {
                    $fileName = $attachment['name'] ?? basename($attachment['path']);
                    $mail->addAttachment($attachment['path'], $fileName);
                }
            }

            // Send email
            $mail->send();

            error_log("Email sent successfully to: {$to}");
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];

        } catch (Exception $e) {
            error_log("Email error: {$mail->ErrorInfo}");

            // Try alternative configuration if first attempt fails
            if (strpos($mail->ErrorInfo, 'connect') !== false || strpos($mail->ErrorInfo, 'timed out') !== false) {
                return $this->sendEmailAlternative($to, $subject, $htmlBody, $attachments);
            }

            return [
                'success' => false,
                'message' => "Email could not be sent. Error: {$mail->ErrorInfo}"
            ];
        }
        */
    }

    /**
     * Try alternative SMTP configuration (with STARTTLS)
     */
    private function sendEmailAlternative($to, $subject, $htmlBody, $attachments = []) {
        try {
            $mail = new PHPMailer(true);

            // Server settings with STARTTLS
            $mail->isSMTP();
            $mail->Host       = $this->smtpHost;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtpUsername;
            $mail->Password   = $this->smtpPassword;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $this->smtpPort;

            // Enable verbose debug output
            $mail->SMTPDebug  = 0;
            $mail->Debugoutput = function($str, $level) {
                error_log("SMTP Debug (Alt) [$level]: $str");
            };

            // Set timeout
            $mail->Timeout = 30;

            // Recipients
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($to);
            $mail->addReplyTo($this->fromEmail, $this->fromName);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = strip_tags($htmlBody);
            $mail->CharSet = 'UTF-8';

            // Add attachments
            foreach ($attachments as $attachment) {
                if (file_exists($attachment['path'])) {
                    $fileName = $attachment['name'] ?? basename($attachment['path']);
                    $mail->addAttachment($attachment['path'], $fileName);
                }
            }

            // Send email
            $mail->send();

            error_log("Email sent successfully (alternative config) to: {$to}");
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];

        } catch (Exception $e) {
            error_log("Email error (alternative): {$mail->ErrorInfo}");
            return [
                'success' => false,
                'message' => "Email could not be sent (both attempts failed). Error: {$mail->ErrorInfo}"
            ];
        }
    }

    /**
     * Get invoice email template
     */
    public function getInvoiceEmailTemplate($data) {
        $template = file_get_contents(__DIR__ . '/email-templates/invoice.html');

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

        $attachments = [];
        if ($pdfPath && file_exists($pdfPath)) {
            $attachments[] = [
                'path' => $pdfPath,
                'name' => "Invoice-{$invoiceData['invoice_number']}.pdf"
            ];
        }

        return $this->sendEmail($tenantEmail, $subject, $htmlBody, $attachments);
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
