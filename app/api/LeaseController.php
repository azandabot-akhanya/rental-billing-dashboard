<?php
require_once 'ApiController.php';

class LeaseController extends ApiController {
    public function processRequest() {
        // $this->validateToken();
        
        $id = isset($this->params[2]) ? $this->params[2] : null;
        
        switch ($this->requestMethod) {
            case 'GET':
                if ($id) {
                    $this->getLeaseById($id);
                } elseif (isset($_GET['tenant_id'])) {
                    $this->getLeasesByTenant($_GET['tenant_id']);
                } elseif (isset($_GET['unit_id'])) {
                    $this->getLeasesByUnit($_GET['unit_id']);
                } elseif (isset($_GET['property_id'])) {
                    $this->getActiveLeasesByProperty($_GET['property_id']);
                } else {
                    $this->sendResponse(["message" => "Filter parameter required"], 400);
                }
                break;
            case 'POST':
                $this->createLease();
                break;
            default:
                $this->sendResponse(["message" => "Method not allowed"], 405);
                break;
        }
    }

    private function getLeaseById($id) {
        $result = $this->executeProcedure('GetLeaseById', [$id]);
        $this->sendResponse($result[0] ?? null);
    }

    private function getLeasesByTenant($tenantId) {
        $result = $this->executeProcedure('GetLeasesByTenant', [$tenantId]);
        $this->sendResponse($result);
    }

    private function getLeasesByUnit($unitId) {
        $result = $this->executeProcedure('GetLeasesByUnit', [$unitId]);
        $this->sendResponse($result);
    }

    private function getActiveLeasesByProperty($propertyId) {
        $result = $this->executeProcedure('GetActiveLeasesByProperty', [$propertyId]);
        $this->sendResponse($result);
    }

    private function createLease() {
        $data = $this->getRequestBody();
        
        $required = ['tenant_id', 'unit_id', 'start_date', 'end_date', 'monthly_rent', 'security_deposit'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendResponse(["message" => "Missing required field: $field"], 400);
                return;
            }
        }
        
        $this->executeProcedure('CreateLease', [
            $data['tenant_id'],
            $data['unit_id'],
            $data['start_date'],
            $data['end_date'],
            $data['monthly_rent'],
            $data['security_deposit'],
            $data['status'] ?? 'active',
            $data['notes'] ?? null
        ]);
        
        $this->sendResponse(["message" => "Lease created successfully"], 201);
    }
}
?>