<?php

class EmailConfig {
    // SMTP Settings from email config
    const SMTP_HOST = 'mail.thynkxpro-dpl.co.za';
    const SMTP_PORT = 587; // Port 587 for STARTTLS (Port 26 is blocked, use 587 or 465)
    const SMTP_USERNAME = 'donotreply@thynkxpro-dpl.co.za';
    const SMTP_PASSWORD = 'donotreply@thynkxpro-dpl.co.za';
    const SMTP_FROM_EMAIL = 'donotreply@thynkxpro-dpl.co.za';
    const SMTP_FROM_NAME = 'ThynkXPro DPL';
    const SMTP_USE_SSL = false; // Use STARTTLS for port 587
    const SMTP_AUTH = true;

    // Email Templates
    const TEMPLATES_PATH = __DIR__ . '/email-templates/';

    // Invoice Settings - Store in API folder's storage directory
    const INVOICE_STORAGE_PATH = __DIR__ . '/storage/invoices/';
    const LOGO_PATH = __DIR__ . '/../../public/logo.png';

    public static function getInvoiceStoragePath() {
        $path = self::INVOICE_STORAGE_PATH;
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
        }
        return $path;
    }

    public static function getLogoPath() {
        return self::LOGO_PATH;
    }
}
