<?php
require_once 'ApiController.php';

class CategoryController extends ApiController {
    public $requestMethod;
    public $params = [];

    public function setRequestMethod($method) {
        $this->requestMethod = $method;
    }

    

    public function setParams($params) {
        $this->params = $params;
    }

    public function processRequest() {
        $id = null;
        
        // Check if we have an ID in the URL (e.g., /categories/123)
        if (count($this->params) > 0 && is_numeric($this->params[0])) {
            $id = $this->params[0];
        }
    
        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    $this->getCategoryById($id); // or getSupplierById for supplier
                } elseif (isset($_GET['type'])) {
                    $this->getCategoriesByType(); // Only for categories
                } else {
                    $this->getCategories(); // or getSuppliers for supplier
                }
                break;
    
            case 'POST':
                $this->createCategory(); // or createSupplier for supplier
                break;
    
            case 'PUT':
                if ($id) {
                    $this->updateCategory($id); // or updateSupplier for supplier
                } else {
                    $this->sendResponse(["message" => "Category ID required for update"], 400);
                }
                break;
    
            case 'DELETE':
                if ($id) {
                    $this->deleteCategory($id); // or deleteSupplier for supplier
                } else {
                    $this->sendResponse(["message" => "Category ID required for deletion"], 400);
                }
                break;
    
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
        }
    }

    private function getCategories() {
        // Categories are now GLOBAL - available to all companies
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM categories
                WHERE is_active = 1
                ORDER BY type, name
            ");
            $stmt->execute();
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "categories" => $categories,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch categories",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function getCategoriesByType() {
        // Categories are now GLOBAL - available to all companies
        $type = $_GET['type'] ?? null;

        if (!$type) {
            $this->sendResponse(["success" => false, "message" => "Missing type parameter"], 400);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT * FROM categories
                WHERE type = ? AND is_active = 1
                ORDER BY name
            ");
            $stmt->execute([$type]);
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse([
                "success" => true,
                "categories" => $categories,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch categories",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function getCategoryById($categoryId) {
        try {
            $stmt = $this->db->prepare("CALL GetCategoryById(?)");
            $stmt->execute([$categoryId]);
            $category = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$category) {
                $this->sendResponse(["success" => false, "message" => "Category not found"], 404);
                return;
            }

            $this->sendResponse([
                "success" => true,
                "category" => $category,
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch category",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    private function createCategory() {
        $data = $this->getRequestBody();
    
        $required = ['company_id', 'name', 'type'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendResponse(["success" => false, "message" => "Missing required field: $field"], 400);
                return;
            }
        }
    
        try {
            $stmt = $this->db->prepare("CALL CreateCategory(?, ?, ?, ?)");
            $stmt->execute([
                $data['company_id'],
                $data['name'],
                $data['type'],
                $data['description'] ?? ''
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->closeCursor();

            $this->sendResponse([
                "success" => true,
                "message" => "Category created successfully",
                "category_id" => (int)$result['category_id']
            ], 201);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to create category",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function updateCategory($categoryId) {
        $data = $this->getRequestBody();

        try {
            $stmt = $this->db->prepare("CALL UpdateCategory(?, ?, ?, ?, ?)");
            $stmt->execute([
                $categoryId,
                $data['name'],
                $data['type'],
                $data['description'] ?? '',
                $data['is_active'] ?? true
            ]);
            
            $this->sendResponse([
                "success" => true,
                "message" => "Category updated successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to update category",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function deleteCategory($categoryId) {
        try {
            $stmt = $this->db->prepare("CALL DeleteCategory(?)");
            $stmt->execute([$categoryId]);
            
            $this->sendResponse([
                "success" => true,
                "message" => "Category deleted successfully"
            ]);
        } catch (PDOException $e) {
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to delete category",
                "error" => $e->getMessage()
            ], 500);
        }
    }
}