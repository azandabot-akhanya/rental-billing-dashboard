<?php
require_once 'config.php';

// CORS is already handled in index.php - no need to set headers here

class AuthController {
    private $db;
    public $params; // declare it if you use it anywhere


    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function login() {
        $json = file_get_contents('php://input');
        $data = json_decode($json);
        
        if ($data === null || !isset($data->email) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode([
                "message" => "Email and password required",
                "received_data" => $data
            ]);
            return;
        }

        $query = "SELECT * FROM users WHERE email = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$data->email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $data->password === $user['plain_password']) {
            echo json_encode([
                "message" => "Login successful",
                "user" => [
                    "user_id" => $user['user_id'],
                    "email" => $user['email']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Login failed"]);
        }
    }
}