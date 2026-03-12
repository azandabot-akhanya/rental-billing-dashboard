#!/usr/bin/env php
<?php
/**
 * Test multiple SMTP ports to find which one works
 */

$host = 'mail.thynkxpro-dpl.co.za';
$ports = [26, 25, 587, 465, 2525];
$timeout = 5;

echo "========================================\n";
echo "SMTP Port Connectivity Test\n";
echo "========================================\n\n";
echo "Testing connection to: {$host}\n\n";

foreach ($ports as $port) {
    echo "Port {$port}: ";

    $startTime = microtime(true);
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    $duration = round((microtime(true) - $startTime) * 1000);

    if ($socket) {
        echo "✓ OPEN (connected in {$duration}ms)\n";

        // Try to get SMTP banner
        $response = fgets($socket, 1024);
        if ($response) {
            echo "  Banner: " . trim($response) . "\n";
        }

        fclose($socket);
    } else {
        echo "✗ BLOCKED/CLOSED ({$duration}ms) - Error: {$errstr}\n";
    }
}

echo "\n========================================\n";
echo "Recommendations:\n";
echo "========================================\n";
echo "- Use the port that shows ✓ OPEN\n";
echo "- Port 26 is uncommon; most servers use 587 or 465\n";
echo "- If all ports are blocked, you may need to:\n";
echo "  1. Send from the production server (not localhost)\n";
echo "  2. Contact your hosting provider\n";
echo "  3. Use a third-party email service (SendGrid, Mailgun)\n\n";
