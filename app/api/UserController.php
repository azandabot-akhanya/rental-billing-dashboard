<?php
require_once 'ApiController.php';

class UserController extends ApiController {
    public function processRequest() {
        // $this->validateToken();
        
        $id = isset($this->params[2]) ? $this->params[2] : null;
        
        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    $this->getUserById($id);
                } else {
                    $this->getAllUsers();
                }
                break;
            case 'POST':
                $this->createUser();
                break;
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }

    private function getUserById($id) {
        $result = $this->executeProcedure('GetUserById', [$id]);
        $this->sendResponse($result[0] ?? null);
    }

    private function getAllUsers() {
        $result = $this->executeProcedure('GetAllUsers');
        $this->sendResponse($result);
    }

    private function createUser() {
        $data = $this->getRequestBody();
        
        $required = ['email', 'password_hash', 'first_name', 'last_name'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendResponse(["message" => "Missing required field: $field"], 400);
                return;
            }
        }
        
        $this->executeProcedure('CreateUser', [
            $data['email'],
            password_hash($data['password_hash'], PASSWORD_BCRYPT),
            $data['first_name'],
            $data['last_name'],
            $data['is_active'] ?? true
        ]);
        
        $this->sendResponse(["message" => "User created successfully"], 201);
    }
}
?>