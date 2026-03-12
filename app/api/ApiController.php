<?php
require_once 'config.php';

class ApiController {
    protected $db;
    public $requestMethod;
    protected $uri;
    public $params;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->getConnection();
            
            if ($this->db === null) {
                throw new Exception("Database connection failed");
            }
            
            $this->requestMethod = $_SERVER['REQUEST_METHOD'];
            $this->uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            $this->params = explode('/', trim($this->uri, '/'));
            
        } catch (Exception $e) {
            $this->sendResponse([
                "message" => "Database initialization failed",
                "error" => $e->getMessage()
            ], 500);
            exit;
        }
    }

    protected function getRequestBody() {
        $raw = file_get_contents("php://input");
        error_log("📩 Raw body: " . $raw); // log exactly what arrives
        $data = json_decode($raw, true);
    
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("❌ JSON decode error: " . json_last_error_msg());
        }
    
        return $data;
    }
    
    
    

    protected function executeProcedure($procedureName, $params = []) {
        try {
            $paramPlaceholders = implode(',', array_fill(0, count($params), '?'));
            $sql = "CALL $procedureName($paramPlaceholders)";
            
            $stmt = $this->db->prepare($sql);
    
            foreach ($params as $index => $value) {
                $stmt->bindValue($index + 1, $value);
            }
    
            $stmt->execute();
    
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
    
            return $result;
    
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Database error: " . $e->getMessage()
            ]);
            exit;
        }
    }
    
    
    
    

    protected function sendResponse($data, $statusCode = 200) {
        // Always JSON
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
    
        // Convert to JSON (pretty for debug)
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
        // Debug log
        error_log("Sending response: " . $json);
    
        // Clean output buffer (in case anything else wrote data)
        if (ob_get_length()) {
            ob_end_clean();
        }
    
        echo $json;
    
        // Force flush and exit
        flush();
        exit;
    }
    
}