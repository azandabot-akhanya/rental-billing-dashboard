#!/usr/bin/env php
<?php
/**
 * Test Email Functionality with Debug Output
 * Run this script to test if email sending works correctly
 *
 * Usage: php test-email-debug.php <test-email-address>
 * Example: php test-email-debug.php your-email@example.com
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/EmailConfig.php';
require_once __DIR__ . '/EmailService.php';

// Check if email address provided
if ($argc < 2) {
    echo "Usage: php test-email-debug.php <test-email-address>\n";
    echo "Example: php test-email-debug.php your-email@example.com\n";
    exit(1);
}

$testEmail = $argv[1];

// Validate email format
if (!filter_var($testEmail, FILTER_VALIDATE_EMAIL)) {
    echo "Error: Invalid email address format\n";
    exit(1);
}

echo "========================================\n";
echo "Email Configuration Test (Debug Mode)\n";
echo "========================================\n\n";

// Display configuration
echo "SMTP Configuration:\n";
echo "  Host: " . EmailConfig::SMTP_HOST . "\n";
echo "  Port: " . EmailConfig::SMTP_PORT . "\n";
echo "  Username: " . EmailConfig::SMTP_USERNAME . "\n";
echo "  From: " . EmailConfig::SMTP_FROM_NAME . " <" . EmailConfig::SMTP_FROM_EMAIL . ">\n";
echo "  Test Recipient: " . $testEmail . "\n\n";

// Test SMTP connection
echo "Testing SMTP connection...\n";
$socket = @fsockopen(EmailConfig::SMTP_HOST, EmailConfig::SMTP_PORT, $errno, $errstr, 10);
if ($socket) {
    echo "✓ Successfully connected to SMTP server\n";
    fclose($socket);
} else {
    echo "✗ Cannot connect to SMTP server: $errstr ($errno)\n";
    echo "  Please check:\n";
    echo "  - SMTP host and port are correct\n";
    echo "  - Firewall allows outbound connections on port " . EmailConfig::SMTP_PORT . "\n";
    echo "  - SMTP server is running\n\n";
}

// Create test email data
$testInvoiceData = [
    'company_name' => 'ThynkXPro DPL',
    'tenant_name' => 'Test Tenant',
    'invoice_number' => 'TEST-' . time(),
    'invoice_date' => date('Y-m-d'),
    'due_date' => date('Y-m-d', strtotime('+30 days')),
    'total_amount' => '1,500.00',
    'property_name' => 'Test Property',
    'unit_number' => '101',
    'payment_link' => '#',
    'view_invoice_link' => '#'
];

echo "\nGenerating email template...\n";

try {
    // Create email service
    $emailService = new EmailService();

    // Get HTML template
    $htmlBody = $emailService->getInvoiceEmailTemplate($testInvoiceData);
    echo "✓ Template generated (length: " . strlen($htmlBody) . " bytes)\n\n";

    // Send test email
    echo "Sending test email with PHPMailer...\n";
    echo "This may take a few seconds...\n\n";

    $result = $emailService->sendEmail(
        $testEmail,
        "Test Invoice Email - ThynkXPro DPL - " . date('H:i:s'),
        $htmlBody,
        [] // No attachments for test
    );

    echo "\n========================================\n";
    echo "Test Results\n";
    echo "========================================\n\n";

    if ($result['success']) {
        echo "✓ SUCCESS: Email sent successfully!\n";
        echo "  Recipient: {$testEmail}\n";
        echo "  Subject: Test Invoice Email - ThynkXPro DPL\n\n";
        echo "Please check your inbox (and spam/junk folder) for the test email.\n";
        echo "If you received it, the email system is working correctly!\n";
        exit(0);
    } else {
        echo "✗ FAILED: Email could not be sent\n";
        echo "  Error: {$result['message']}\n\n";
        printTroubleshootingSteps();
        exit(1);
    }

} catch (Exception $e) {
    echo "\n✗ EXCEPTION: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n\n";
    printTroubleshootingSteps();
    exit(1);
}

function printTroubleshootingSteps() {
    echo "Troubleshooting steps:\n";
    echo "1. Verify SMTP credentials in app/api/EmailConfig.php\n";
    echo "2. Check if SMTP server requires SSL/TLS:\n";
    echo "   - Try changing SMTPSecure to PHPMailer::ENCRYPTION_SMTPS\n";
    echo "   - Or try without encryption (SMTPSecure = '')\n";
    echo "3. Test SMTP connection manually:\n";
    echo "   telnet mail.thynkxpro-dpl.co.za 26\n";
    echo "4. Check server firewall allows port 26 outbound\n";
    echo "5. Verify SMTP username/password are correct\n";
    echo "6. Check PHP error logs for more details\n";
    echo "7. Try port 587 or 465 if port 26 doesn't work\n\n";
}
