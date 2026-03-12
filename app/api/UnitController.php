<?php
require_once 'ApiController.php';

class UnitController extends ApiController {
    public function processRequest() {
        // $this->validateToken();
        
        $id = isset($this->params[2]) ? $this->params[2] : null;
        
        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    $this->getUnitById($id);
                } elseif (isset($_GET['property_id'])) {
                    if (isset($_GET['vacant']) && $_GET['vacant'] === 'true') {
                        $this->getVacantUnits($_GET['property_id']);
                    } else {
                        $this->getUnitsByProperty($_GET['property_id']);
                    }
                } else {
                    $this->sendResponse(["message" => "Property ID required"], 400);
                }
                break;
            case 'POST':
                $this->createUnit();
                break;
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }

    private function getUnitById($id) {
        $result = $this->executeProcedure('GetUnitById', [$id]);
        $this->sendResponse($result[0] ?? null);
    }

    private function getUnitsByProperty($propertyId) {
        $result = $this->executeProcedure('GetUnitsByProperty', [$propertyId]);
        $this->sendResponse($result);
    }

    private function getVacantUnits($propertyId) {
        $result = $this->executeProcedure('GetVacantUnits', [$propertyId]);
        $this->sendResponse($result);
    }

    private function createUnit() {
        $data = $this->getRequestBody();
        
        $required = ['property_id', 'unit_number', 'monthly_rent'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendResponse(["message" => "Missing required field: $field"], 400);
                return;
            }
        }
        
        $this->executeProcedure('CreateUnit', [
            $data['property_id'],
            $data['unit_number'],
            $data['bedrooms'] ?? null,
            $data['bathrooms'] ?? null,
            $data['square_meters'] ?? null,
            $data['monthly_rent'],
            $data['is_occupied'] ?? false,
            $data['description'] ?? null
        ]);
        
        $this->sendResponse(["message" => "Unit created successfully"], 201);
    }
}
?>