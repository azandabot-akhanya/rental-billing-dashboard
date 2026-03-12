<?php
// Database configuration
$host = 'localhost';
$dbname = 'thynkxv8r6h8_thynkxpro';
$username = 'thynkxv8r6h8_admin';  // ⚠️ GET FROM cPANEL
$password = 'wesleyc@123';  // ⚠️ GET FROM cPANEL

try {
    $db = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    error_log("Database connection error: " . $e->getMessage());
    exit;
}
?>