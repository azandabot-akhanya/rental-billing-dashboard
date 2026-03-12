<?php
// CORS is handled in index.php - do not duplicate headers here

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Database Configuration
 *
 * IMPORTANT: This is a template file. Copy this to config.php and update with your credentials.
 * Never commit config.php to version control - it's in .gitignore for security.
 */
class Database {
    // Database connection parameters
    private $host = "localhost";           // Database host (usually localhost or 127.0.0.1)
    private $db_name = "rental_billing";   // Database name
    private $username = "your_username";   // Database username
    private $password = "your_password";   // Database password
    public $conn;

    /**
     * Establish database connection
     *
     * @return PDO Database connection object
     */
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            http_response_code(500);
            echo json_encode([
                "message" => "Database connection failed: " . $exception->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }
}
?>
