<?php
require_once 'ApiController.php';
require_once 'EmailService.php';

class CalendarController extends ApiController {
    private $emailService;

    public function __construct($db = null) {
        parent::__construct($db);
        $this->emailService = new EmailService();
    }

    public function processRequest() {
        switch($this->requestMethod) {
            case 'GET':
                $tenant_id = $_GET['tenant_id'] ?? null;
                $company_id = $_GET['company_id'] ?? null;
                $this->getEvents($tenant_id, $company_id);
                break;

            case 'POST':
                $this->createEvent();
                break;

            case 'PUT':
                $data = $this->getRequestBody();
                $this->updateEvent($data);
                break;

            case 'DELETE':
                $data = $this->getRequestBody();
                $this->deleteEvent($data);
                break;

            default:
                $this->sendResponse(["message"=>"Method not allowed"], 405);
        }
    }

    // 🔹 Get events
    private function getEvents($tenant_id = null, $company_id = null) {
        if (!$company_id) { $this->sendResponse(["success"=>false,"message"=>"company_id required"],400); return; }
        try {
            if ($tenant_id) {
                $stmt = $this->db->prepare("SELECT * FROM tenant_calendar_events WHERE company_id=? AND tenant_id=? ORDER BY start_datetime ASC");
                $stmt->execute([$company_id, $tenant_id]);
            } else {
                $stmt = $this->db->prepare("SELECT * FROM tenant_calendar_events WHERE company_id=? ORDER BY start_datetime ASC");
                $stmt->execute([$company_id]);
            }
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $stmt->closeCursor();
            $this->sendResponse(["success"=>true,"data"=>$data]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Create event
    private function createEvent() {
        $data = $_POST;
        if (!isset($data['tenant_id'], $data['company_id'], $data['title'], $data['start_datetime'], $data['end_datetime'])) {
            $this->sendResponse(["success"=>false,"message"=>"tenant_id, company_id, title, start_datetime and end_datetime required"],400);
            return;
        }

        try {
            // Insert event
            $stmt = $this->db->prepare("INSERT INTO tenant_calendar_events (company_id, tenant_id, title, description, location, event_type, start_datetime, end_datetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['company_id'],
                $data['tenant_id'],
                $data['title'],
                $data['description'] ?? '',
                $data['location'] ?? '',
                $data['event_type'] ?? 'meeting',
                $data['start_datetime'],
                $data['end_datetime']
            ]);

            $event_id = $this->db->lastInsertId();

            // Send email notification if requested
            if (isset($data['send_email']) && $data['send_email'] == '1') {
                $this->sendEventNotification($data['tenant_id'], $data['title'], $data['start_datetime'], $data['end_datetime'], $data['description'] ?? '', $data['location'] ?? '', $data['event_type'] ?? 'meeting');
            }

            $this->sendResponse(["success"=>true,"message"=>"Event created successfully","event_id"=>$event_id]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Update event
    private function updateEvent($data) {
        // Handle FormData from frontend
        if (isset($_POST['event_id'])) {
            $data = $_POST;
        }

        if (!isset($data['event_id'], $data['company_id'], $data['tenant_id'])) {
            $this->sendResponse(["success"=>false,"message"=>"event_id, company_id, tenant_id required"],400);
            return;
        }

        try {
            $stmt = $this->db->prepare("UPDATE tenant_calendar_events SET title=?, description=?, location=?, event_type=?, start_datetime=?, end_datetime=?, updated_at=NOW() WHERE event_id=? AND tenant_id=? AND company_id=?");
            $stmt->execute([
                $data['title'] ?? '',
                $data['description'] ?? '',
                $data['location'] ?? '',
                $data['event_type'] ?? 'meeting',
                $data['start_datetime'] ?? '',
                $data['end_datetime'] ?? '',
                $data['event_id'],
                $data['tenant_id'],
                $data['company_id']
            ]);

            // Send email notification if requested
            if (isset($data['send_email']) && $data['send_email'] == '1') {
                $this->sendEventNotification($data['tenant_id'], $data['title'], $data['start_datetime'], $data['end_datetime'], $data['description'] ?? '', $data['location'] ?? '', $data['event_type'] ?? 'meeting', true);
            }

            $this->sendResponse(["success"=>true,"message"=>"Event updated successfully"]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Delete event
    private function deleteEvent($data) {
        if (!isset($data['event_id'], $data['company_id'], $data['tenant_id'])) {
            $this->sendResponse(["success"=>false,"message"=>"event_id, company_id, tenant_id required"],400);
            return;
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM tenant_calendar_events WHERE event_id=? AND tenant_id=? AND company_id=?");
            $stmt->execute([$data['event_id'], $data['tenant_id'], $data['company_id']]);
            $this->sendResponse(["success"=>true,"message"=>"Event deleted successfully"]);
        } catch(PDOException $e) {
            $this->sendResponse(["success"=>false,"message"=>"DB Error","error"=>$e->getMessage()],500);
        }
    }

    // 🔹 Send event notification email
    private function sendEventNotification($tenant_id, $title, $start_datetime, $end_datetime, $description = '', $location = '', $event_type = 'meeting', $isUpdate = false) {
        try {
            // Get tenant details
            $stmt = $this->db->prepare("SELECT full_name, email FROM tenants WHERE tenant_id = ?");
            $stmt->execute([$tenant_id]);
            $tenant = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tenant || !$tenant['email']) {
                return; // No email to send to
            }

            // Format dates
            $start = date('F j, Y \a\t g:i A', strtotime($start_datetime));
            $end = date('F j, Y \a\t g:i A', strtotime($end_datetime));

            // Create email content
            $subject = $isUpdate ? "Event Updated: $title" : "New Event Scheduled: $title";

            $eventTypeLabels = [
                'meeting' => 'Meeting',
                'inspection' => 'Property Inspection',
                'maintenance' => 'Maintenance',
                'viewing' => 'Property Viewing',
                'other' => 'Event'
            ];
            $eventTypeLabel = $eventTypeLabels[$event_type] ?? 'Event';

            $message = "
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #5B5BFF 0%, #4040CC 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5B5BFF; }
                        .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .detail-label { font-weight: bold; color: #5B5BFF; min-width: 120px; display: inline-block; }
                        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h1>ThynkxPro</h1>
                            <p>" . ($isUpdate ? "Event Updated" : "New Event Scheduled") . "</p>
                        </div>
                        <div class='content'>
                            <p>Hello {$tenant['full_name']},</p>
                            <p>" . ($isUpdate ? "An event has been updated" : "A new event has been scheduled") . " for you.</p>

                            <div class='event-details'>
                                <h2 style='color: #5B5BFF; margin-top: 0;'>$title</h2>
                                <div class='detail-row'>
                                    <span class='detail-label'>Type:</span> $eventTypeLabel
                                </div>
                                <div class='detail-row'>
                                    <span class='detail-label'>Start:</span> $start
                                </div>
                                <div class='detail-row'>
                                    <span class='detail-label'>End:</span> $end
                                </div>
                                " . ($location ? "<div class='detail-row'><span class='detail-label'>Location:</span> $location</div>" : "") . "
                                " . ($description ? "<div class='detail-row'><span class='detail-label'>Details:</span> $description</div>" : "") . "
                            </div>

                            <p>Please make sure to be available at the scheduled time.</p>
                            <p>If you have any questions or need to reschedule, please contact us.</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message from ThynkxPro Calendar System</p>
                            <p>&copy; " . date('Y') . " ThynkxPro. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            ";

            // Send email
            $this->emailService->sendEmail($tenant['email'], $subject, $message);
        } catch (Exception $e) {
            // Log error but don't fail the event creation
            error_log("Failed to send calendar notification: " . $e->getMessage());
        }
    }
}
