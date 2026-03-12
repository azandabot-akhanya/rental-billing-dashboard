<?php
require_once 'ApiController.php';

class DocumentController extends ApiController {

    private $uploadDir = __DIR__ . "/uploads/tenant_documents/";

    public function processRequest() {
        switch($this->requestMethod) {
            case 'GET':
                // Check if it's a download request
                if (isset($_GET['download']) && isset($_GET['filename'])) {
                    $this->downloadDocument($_GET['filename']);
                } else {
                    $tenant_id = $_GET['tenant_id'] ?? null;
                    $company_id = $_GET['company_id'] ?? null;
                    $this->getDocuments($tenant_id, $company_id);
                }
                break;

            case 'POST':
                $this->uploadDocument();
                break;

            case 'PUT':
                $data = $this->getRequestBody();
                $this->updateDocument($data);
                break;

            case 'DELETE':
                $data = $this->getRequestBody();
                $this->deleteDocument($data);
                break;

            default:
                $this->sendResponse(["message"=>"Method not allowed"], 405);
        }
    }

    // 🔹 Get documents
    private function getDocuments($tenant_id = null, $company_id = null) {
        if(!$company_id) {
            $this->sendResponse(["success"=>false,"message"=>"company_id required"],400);
            return;
        }
        try {
            if ($tenant_id) {
                $stmt = $this->db->prepare("SELECT * FROM tenant_documents WHERE company_id = ? AND tenant_id = ?");
                $stmt->execute([$company_id, $tenant_id]);
            } else {
                $stmt = $this->db->prepare("SELECT * FROM tenant_documents WHERE company_id = ?");
                $stmt->execute([$company_id]);
            }
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
            $this->sendResponse(["success"=>true,"data"=>$data]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Upload document
    private function uploadDocument() {
        if(!isset($_POST['company_id'], $_POST['tenant_id'])) {
            $this->sendResponse(["success"=>false,"message"=>"tenant_id and company_id required"],400);
            return;
        }

        $tenant_id = $_POST['tenant_id'];
        $company_id = $_POST['company_id'];
        $doc_type = $_POST['doc_type'] ?? 'general';

        if (!isset($_FILES['file'])) {
            $this->sendResponse(["success"=>false,"message"=>"No file uploaded"],400);
            return;
        }

        $file = $_FILES['file'];
        $allowed = ['pdf','doc','docx','png','jpeg','jpg','webp'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowed)) {
            $this->sendResponse(["success"=>false,"message"=>"File type not allowed"],400);
            return;
        }

        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }

        $filename = time() . "_" . preg_replace('/[^a-zA-Z0-9_\-\.]/','', $file['name']);
        $filePath = $this->uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            try {
                $stmt = $this->db->prepare("INSERT INTO tenant_documents (company_id, tenant_id, doc_type, file_name, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, NOW())");
                $stmt->execute([$company_id, $tenant_id, $doc_type, $filename, $filePath]);
                $this->sendResponse(["success"=>true,"message"=>"Document uploaded successfully"]);
            } catch(PDOException $e) {
                $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
            }
        } else {
            $this->sendResponse(["success"=>false,"message"=>"Failed to move uploaded file"],500);
        }
    }

    // 🔹 Update document (replace file)
    private function updateDocument($data) {
        if(!isset($data['document_id'], $data['tenant_id'], $data['company_id'])) {
            $this->sendResponse(["success"=>false,"message"=>"document_id, tenant_id, company_id required"],400);
            return;
        }

        $doc_id = $data['document_id'];
        $tenant_id = $data['tenant_id'];
        $company_id = $data['company_id'];

        if (!isset($_FILES['file'])) {
            $this->sendResponse(["success"=>false,"message"=>"No file uploaded"],400);
            return;
        }

        $file = $_FILES['file'];
        $allowed = ['pdf','doc','docx','png','jpeg','jpg','webp'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowed)) {
            $this->sendResponse(["success"=>false,"message"=>"File type not allowed"],400);
            return;
        }

        try {
            // Get current file
            $stmt = $this->db->prepare("SELECT file_path FROM tenant_documents WHERE document_id = ? AND tenant_id = ? AND company_id = ?");
            $stmt->execute([$doc_id, $tenant_id, $company_id]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doc) { $this->sendResponse(["success"=>false,"message"=>"Document not found"],404); return; }

            // Remove old file
            if(file_exists($doc['file_path'])) unlink($doc['file_path']);

            // Upload new file
            $filename = time() . "_" . preg_replace('/[^a-zA-Z0-9_\-\.]/','', $file['name']);
            $filePath = $this->uploadDir . $filename;
            move_uploaded_file($file['tmp_name'], $filePath);

            $stmt = $this->db->prepare("UPDATE tenant_documents SET file_name = ?, file_path = ?, updated_at = NOW() WHERE document_id = ?");
            $stmt->execute([$filename, $filePath, $doc_id]);
            $this->sendResponse(["success"=>true,"message"=>"Document updated successfully"]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Delete document
    private function deleteDocument($data) {
        if(!isset($data['document_id'], $data['tenant_id'], $data['company_id'])) {
            $this->sendResponse(["success"=>false,"message"=>"document_id, tenant_id, company_id required"],400);
            return;
        }

        $doc_id = $data['document_id'];
        $tenant_id = $data['tenant_id'];
        $company_id = $data['company_id'];

        try {
            // Get current file
            $stmt = $this->db->prepare("SELECT file_path FROM tenant_documents WHERE document_id = ? AND tenant_id = ? AND company_id = ?");
            $stmt->execute([$doc_id, $tenant_id, $company_id]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doc) { $this->sendResponse(["success"=>false,"message"=>"Document not found"],404); return; }

            // Delete file
            if(file_exists($doc['file_path'])) unlink($doc['file_path']);

            // Delete DB record
            $stmt = $this->db->prepare("DELETE FROM tenant_documents WHERE document_id = ?");
            $stmt->execute([$doc_id]);

            $this->sendResponse(["success"=>true,"message"=>"Document deleted successfully"]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Download document
    private function downloadDocument($filename) {
        // Sanitize filename to prevent directory traversal
        $filename = basename($filename);
        $filePath = $this->uploadDir . $filename;

        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "File not found"]);
            return;
        }

        // Get file extension
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Set appropriate content type
        $contentTypes = [
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp'
        ];

        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';

        // Set headers for file download/display
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . filesize($filePath));
        header('Content-Disposition: inline; filename="' . $filename . '"');
        header('Cache-Control: public, max-age=3600');

        // Output file
        readfile($filePath);
        exit;
    }
}
