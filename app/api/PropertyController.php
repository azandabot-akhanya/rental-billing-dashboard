<?php
require_once 'ApiController.php';

class PropertyController extends ApiController {
    private $customRoute;

    public function __construct($route = null) {
        parent::__construct();
        $this->customRoute = $route;
    }

    public function processRequest() {
        $id = isset($this->params[1]) ? $this->params[1] : null;

        // Handle summary route
        if ($this->customRoute === 'SUMMARY') {
            if (!isset($_GET['company_id'])) {
                $this->sendResponse(["message" => "company_id is required"], 400);
                return;
            }

            $this->getCompanyPropertySummary($_GET['company_id']);
            return;
        }

        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    if (isset($this->params[2]) && $this->params[2] === 'units') {
                        $this->getPropertyUnits($id);
                    } else {
                        $this->getPropertyById($id);
                    }
                } elseif (isset($_GET['company_id'])) {
                    $this->getPropertiesByCompany($_GET['company_id']);
                } else {
                    $this->sendResponse(["message" => "Company ID required"], 400);
                }
                break;

            case 'POST':
                $this->createProperty();
                break;

            case 'PUT':
                if ($id) {
                    $this->updateProperty($id);
                } else {
                    $this->sendResponse(["message" => "Property ID required"], 400);
                }
                break;

            case 'DELETE':
                if ($id) {
                    $this->deleteProperty($id);
                } else {
                    $this->sendResponse(["message" => "Property ID required"], 400);
                }
                break;

            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }

    private function getPropertyById($id) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM properties WHERE property_id = ?");
            $stmt->execute([$id]);
            $property = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($property) {
                $this->sendResponse($property);
            } else {
                $this->sendResponse(["message" => "Property not found"], 404);
            }
        } catch (PDOException $e) {
            error_log("Error in getPropertyById: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function getPropertiesByCompany($companyId) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM properties WHERE company_id = ? ORDER BY property_name");
            $stmt->execute([$companyId]);
            $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->sendResponse($properties);
        } catch (PDOException $e) {
            error_log("Error in getPropertiesByCompany: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function deleteProperty($id) {
        try {
            // Check if any deposits exist for this property
            $check = $this->db->prepare("SELECT COUNT(*) FROM deposits WHERE property_id = ?");
            $check->execute([$id]);
            $count = $check->fetchColumn();

            if ($count > 0) {
                $this->sendResponse(["message" => "Cannot delete property: existing deposit records found."], 409);
                return;
            }

            // Safe to delete
            $stmt = $this->db->prepare("DELETE FROM properties WHERE property_id = ?");
            $stmt->execute([$id]);

            $this->sendResponse(["message" => "Property deleted successfully"]);
        } catch (PDOException $e) {
            error_log("Error in deleteProperty: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function getCompanyPropertySummary($companyId) {
        try {
            // Get total properties count
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total_properties FROM properties WHERE company_id = ?
            ");
            $stmt->execute([$companyId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $summary = [
                'total_properties' => $result['total_properties'] ?? 0
            ];

            $this->sendResponse(['summary' => $summary]);
        } catch (PDOException $e) {
            error_log("Error in getCompanyPropertySummary: " . $e->getMessage());
            $this->sendResponse(["success" => false, "message" => "Database error: " . $e->getMessage()], 500);
        }
    }

    private function createProperty() {
        $data = $this->getRequestBody();

        error_log("Creating property with data: " . json_encode($data));

        $required = ['company_id', 'property_name', 'address', 'city', 'province'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendResponse(["message" => "Missing required field: $field"], 400);
                return;
            }
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO properties (company_id, property_name, address, city, province, postal_code, total_units, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $data['company_id'],
                $data['property_name'],
                $data['address'],
                $data['city'],
                $data['province'],
                $data['postal_code'] ?? null,
                !empty($data['total_units']) ? (int)$data['total_units'] : null,
                $data['description'] ?? null
            ]);

            $propertyId = $this->db->lastInsertId();

            $this->sendResponse([
                "message" => "Property created successfully",
                "property_id" => $propertyId
            ], 201);

        } catch (PDOException $e) {
            error_log("Error creating property: " . $e->getMessage());
            $this->sendResponse([
                "message" => "Database error: " . $e->getMessage()
            ], 500);
        }
    }

    private function updateProperty($id) {
        $data = $this->getRequestBody();

        try {
            $updates = [];
            $params = [];

            if (isset($data['property_name'])) {
                $updates[] = "property_name = ?";
                $params[] = $data['property_name'];
            }
            if (isset($data['address'])) {
                $updates[] = "address = ?";
                $params[] = $data['address'];
            }
            if (isset($data['city'])) {
                $updates[] = "city = ?";
                $params[] = $data['city'];
            }
            if (isset($data['province'])) {
                $updates[] = "province = ?";
                $params[] = $data['province'];
            }
            if (isset($data['postal_code'])) {
                $updates[] = "postal_code = ?";
                $params[] = $data['postal_code'];
            }
            if (isset($data['total_units'])) {
                $updates[] = "total_units = ?";
                $params[] = !empty($data['total_units']) ? (int)$data['total_units'] : null;
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }

            if (empty($updates)) {
                $this->sendResponse(["message" => "No fields to update"], 400);
                return;
            }

            $params[] = $id;
            $sql = "UPDATE properties SET " . implode(", ", $updates) . " WHERE property_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->sendResponse(["message" => "Property updated successfully"]);

        } catch (PDOException $e) {
            error_log("Error updating property: " . $e->getMessage());
            $this->sendResponse([
                "message" => "Database error: " . $e->getMessage()
            ], 500);
        }
    }

    private function getPropertyUnits($propertyId) {
        try {
            // Get property total units
            $propertyStmt = $this->db->prepare("SELECT total_units FROM properties WHERE property_id = ?");
            $propertyStmt->execute([$propertyId]);
            $property = $propertyStmt->fetch(PDO::FETCH_ASSOC);

            if (!$property) {
                $this->sendResponse(["message" => "Property not found"], 404);
                return;
            }

            $totalUnits = (int)$property['total_units'];

            // Get occupied units
            $tenantsStmt = $this->db->prepare(
                "SELECT unit_number, full_name FROM tenants WHERE property_id = ? AND status = 'active'"
            );
            $tenantsStmt->execute([$propertyId]);
            $occupiedUnits = $tenantsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Create a map of occupied units
            $occupiedMap = [];
            foreach ($occupiedUnits as $tenant) {
                $occupiedMap[$tenant['unit_number']] = $tenant['full_name'];
            }

            // Generate all units (1 to total_units)
            $units = [];
            for ($i = 1; $i <= $totalUnits; $i++) {
                $unitNumber = (string)$i;
                $isOccupied = isset($occupiedMap[$unitNumber]);

                $units[] = [
                    'unit_number' => $unitNumber,
                    'is_occupied' => $isOccupied,
                    'tenant_name' => $isOccupied ? $occupiedMap[$unitNumber] : null
                ];
            }

            $this->sendResponse([
                'total_units' => $totalUnits,
                'available_count' => $totalUnits - count($occupiedUnits),
                'occupied_count' => count($occupiedUnits),
                'units' => $units
            ]);

        } catch (PDOException $e) {
            error_log("Error in getPropertyUnits: " . $e->getMessage());
            $this->sendResponse([
                "message" => "Database error: " . $e->getMessage()
            ], 500);
        }
    }
}
