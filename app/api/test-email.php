#!/usr/bin/env php
<?php
/**
 * Test Email Functionality
 * Run this script to test if email sending works correctly
 *
 * Usage: php test-email.php <test-email-address>
 * Example: php test-email.php your-email@example.com
 */

require_once __DIR__ . '/EmailConfig.php';
require_once __DIR__ . '/EmailService.php';

// Check if email address provided
if ($argc < 2) {
    echo "Usage: php test-email.php <test-email-address>\n";
    echo "Example: php test-email.php your-email@example.com\n";
    exit(1);
}

$testEmail = $argv[1];

// Validate email format
if (!filter_var($testEmail, FILTER_VALIDATE_EMAIL)) {
    echo "Error: Invalid email address format\n";
    exit(1);
}

echo "========================================\n";
echo "Email Configuration Test\n";
echo "========================================\n\n";

// Display configuration
echo "SMTP Configuration:\n";
echo "  Host: " . EmailConfig::SMTP_HOST . "\n";
echo "  Port: " . EmailConfig::SMTP_PORT . "\n";
echo "  Username: " . EmailConfig::SMTP_USERNAME . "\n";
echo "  From: " . EmailConfig::SMTP_FROM_NAME . " <" . EmailConfig::SMTP_FROM_EMAIL . ">\n";
echo "  Test Recipient: " . $testEmail . "\n\n";

// Create test email data
$testInvoiceData = [
    'company_name' => 'ThynkXPro DPL',
    'tenant_name' => 'Test Tenant',
    'invoice_number' => 'TEST-001',
    'invoice_date' => date('Y-m-d'),
    'due_date' => date('Y-m-d', strtotime('+30 days')),
    'total_amount' => '1,500.00',
    'property_name' => 'Test Property',
    'unit_number' => '101',
    'payment_link' => '#',
    'view_invoice_link' => '#'
];

// Create email service
$emailService = new EmailService();

// Get HTML template
echo "Generating email template...\n";
$htmlBody = $emailService->getInvoiceEmailTemplate($testInvoiceData);
echo "✓ Template generated\n\n";

// Send test email
echo "Sending test email...\n";
$result = $emailService->sendEmail(
    $testEmail,
    "Test Invoice Email - ThynkXPro DPL",
    $htmlBody,
    [] // No attachments for test
);

echo "\n========================================\n";
echo "Test Results\n";
echo "========================================\n\n";

if ($result['success']) {
    echo "✓ SUCCESS: Email sent successfully!\n";
    echo "  Please check your inbox at: {$testEmail}\n";
    echo "  (Also check spam/junk folder)\n\n";
    echo "If you received the email, the email system is working correctly.\n";
    exit(0);
} else {
    echo "✗ FAILED: Email could not be sent\n";
    echo "  Error: {$result['message']}\n\n";
    echo "Troubleshooting steps:\n";
    echo "1. Verify SMTP credentials in app/api/EmailConfig.php\n";
    echo "2. Check if port 26 is open for outbound connections\n";
    echo "3. Test SMTP connection manually: telnet mail.thynkxpro-dpl.co.za 26\n";
    echo "4. Check server firewall settings\n";
    echo "5. Verify email server is accepting connections\n";
    exit(1);
}
