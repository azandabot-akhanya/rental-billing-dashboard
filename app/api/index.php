<?php
// Enable error reporting FIRST before any other code
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Try to include config.php and catch any errors
try {
    require_once 'config.php';
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'error' => 'Config file error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
}

// CORS headers - MUST be set before anything else
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:8000',
    'https://thynkxpro-dpl.co.za',
    'http://thynkxpro-dpl.co.za'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // For production, allow the main domain
    header("Access-Control-Allow-Origin: https://thynkxpro-dpl.co.za");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Detect if running on localhost
$isLocalhost = in_array($_SERVER['HTTP_HOST'], ['localhost:8000', 'localhost', '127.0.0.1', '127.0.0.1:8000']);

// Start session with environment-specific settings
if (session_status() === PHP_SESSION_NONE) {
    if ($isLocalhost) {
        // Localhost settings - simple and permissive
        session_set_cookie_params([
            'lifetime' => 86400,
            'path' => '/',
            'httponly' => true,
            'secure' => false,
            'samesite' => 'Lax'
        ]);
    } else {
        // Production settings
        session_set_cookie_params([
            'lifetime' => 86400,
            'path' => '/',
            'domain' => '.thynkxpro-dpl.co.za',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None'
        ]);
    }
    session_start();
}

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove base path
$basePath = '/api';
if (strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}

// Helper function to require controller and execute
function handleController($controllerFile, $controllerClass, $method = 'processRequest', $params = [], $requestMethod = null) {
    require_once $controllerFile;
    $controller = new $controllerClass();
    if ($requestMethod) $controller->requestMethod = $requestMethod;
    $controller->params = $params;
    $controller->$method();
    exit;
}

// Routing
try {
    switch ($requestUri) {
        case '/':
        case '':
            echo json_encode([
                "message" => "Welcome to ThynkXPro API",
                "endpoints" => [
                    "POST /login" => "User login",
                    "GET /users" => "List users",
                    "POST /users" => "Create user",
                    // Add more endpoints here
                ]
            ]);
            break;

        case '/login':
            if ($requestMethod === 'POST') handleController('AuthController.php', 'AuthController', 'login');
            http_response_code(405);
            echo json_encode(["message" => "Method not allowed"]);
            break;

        case '/users':
            handleController('UserController.php', 'UserController', 'processRequest', [], $requestMethod);
            break;

        case '/test':
            echo json_encode([
                "success" => true,
                "message" => "API is working",
                "https" => isset($_SERVER['HTTPS']),
                "session" => session_id(),
                "timestamp" => date('Y-m-d H:i:s')
            ]);
            break;

        default:
            // Dynamic routes
            $pathParts = explode('/', trim($requestUri, '/'));

            // Serve static files from /storage (PDF invoices, etc.)
            if ($pathParts[0] === 'storage') {
                $filePath = __DIR__ . '/' . implode('/', $pathParts);

                if (file_exists($filePath) && is_file($filePath)) {
                    $mimeType = mime_content_type($filePath);
                    header("Content-Type: $mimeType");
                    header("Content-Disposition: inline; filename=\"" . basename($filePath) . "\"");
                    header("Content-Length: " . filesize($filePath));
                    readfile($filePath);
                    exit;
                } else {
                    http_response_code(404);
                    echo json_encode(["message" => "File not found"]);
                    exit;
                }
            }

            // Stock
            if ($pathParts[0] === 'stock') {
                array_shift($pathParts);
                handleController('StockController.php', 'StockController', 'processRequest', $pathParts, $requestMethod);
            }

            // Companies
            if ($pathParts[0] === 'companies') {
                
                array_shift($pathParts);
                handleController('CompanyController.php', 'CompanyController', 'processRequest', $pathParts, $requestMethod);
            }

            // Properties
            if ($pathParts[0] === 'properties') {
                require_once 'PropertyController.php';

                // Check if this is a summary request
                if (isset($pathParts[1]) && $pathParts[1] === 'summary') {
                    $controller = new PropertyController('SUMMARY');
                } else {
                    $controller = new PropertyController();
                }

                $controller->params = $pathParts;
                $controller->processRequest();
                exit;
            }

            // Tenant Documents
            if ($pathParts[0] === 'documents') {
                array_shift($pathParts); // remove 'documents' from path
                handleController('DocumentController.php', 'DocumentController', 'processRequest', $pathParts, $requestMethod);
            }

            // Calendar events
            if ($pathParts[0] === 'calendar') {
                array_shift($pathParts);
                handleController('CalendarController.php', 'CalendarController', 'processRequest', $pathParts, $requestMethod);
            }

            // Tenants
            if ($pathParts[0] === 'tenants') {
                handleController('TenantController.php', 'TenantController', 'processRequest', $pathParts, $requestMethod);
            }

            // Leases
            if ($pathParts[0] === 'leases') {
                handleController('LeaseController.php', 'LeaseController', 'processRequest', $pathParts, $requestMethod);
            }

            // Dashboard
            if ($pathParts[0] === 'dashboard') {
                handleController('DashboardController.php', 'DashboardController', 'getDashboardData');
            }

            // Invoices
            if ($pathParts[0] === 'invoices') {
                handleController('InvoiceController.php', 'InvoiceController', 'processRequest', $pathParts, $requestMethod);
            }

            // Transactions
            if (in_array($pathParts[0], ['transactions', 'deposits', 'expenses', 'balance-sheet', 'profit-loss', 'profit-loss-statement'])) {
                handleController('TransactionController.php', 'TransactionController', 'processRequest', $pathParts, $requestMethod);
            }

            // Categories
            if ($pathParts[0] === 'categories') {
                array_shift($pathParts); // remove 'categories' from path
                handleController('CategoryController.php', 'CategoryController', 'processRequest', $pathParts, $requestMethod);
            }

            // Suppliers
            if ($pathParts[0] === 'suppliers') {
                array_shift($pathParts); // remove 'suppliers' from path
                handleController('SupplierController.php', 'SupplierController', 'processRequest', $pathParts, $requestMethod);
            }

            // Utilities
            if ($pathParts[0] === 'utilities') {
                array_shift($pathParts);
                handleController('UtilitiesController.php', 'UtilitiesController', 'processRequest', $pathParts, $requestMethod);
            }

            // Opening Balances (Balance B/F)
            if ($pathParts[0] === 'opening-balances') {
                array_shift($pathParts); // remove 'opening-balances' from path
                handleController('OpeningBalanceController.php', 'OpeningBalanceController', 'processRequest', $pathParts, $requestMethod);
            }

            // Not found
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Server error",
        "error" => $e->getMessage()
    ]);
}
