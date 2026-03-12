# Recurring Invoices - Complete Implementation Plan

## ✅ Completed Features

### 1. Cascading Property → Tenant Dropdown
- **Property dropdown** appears first
- **Tenant dropdown** is disabled until property is selected
- Only shows tenants belonging to the selected property
- Displays count of available tenants
- Auto-resets tenant selection when property changes

### 2. Auto-Populate Banking Details
- Fetches company banking details on page load
- Automatically fills the banking details textarea
- User can still modify if needed
- Stored in company table

## 🚧 Features To Implement

### 3. PDF Invoice Generation

**Requirements**:
- Generate professional PDF invoices
- Include company logo, details, banking info
- List all invoice items with quantities and prices
- Calculate subtotal, tax, and total
- Save PDF to server
- Return download link

**Implementation**:

#### Backend (PHP)
Create `app/api/InvoiceController.php` methods:

```php
public function generatePDF($invoiceId) {
    // Use TCPDF or FPDF library
    // Fetch invoice data
    // Generate PDF with template
    // Save to /storage/invoices/
    // Return file path
}
```

#### PDF Template Structure:
```
┌─────────────────────────────────────────┐
│  [Company Logo]        INVOICE          │
│  Company Name                           │
│  Company Address        Invoice #: XXX  │
│  Contact Details        Date: XX/XX/XX  │
│                         Due: XX/XX/XX   │
├─────────────────────────────────────────┤
│  BILL TO:                               │
│  Tenant Name                            │
│  Property Name - Unit XX                │
│  Tenant Email                           │
├─────────────────────────────────────────┤
│  DESCRIPTION    QTY    RATE    AMOUNT   │
│  ─────────────────────────────────────  │
│  Rent           1      R5000   R5000    │
│  Water          1      R200    R200     │
│  ─────────────────────────────────────  │
│                        SUBTOTAL: R5200  │
│                        TAX (15%): R780  │
│                        ─────────────    │
│                        TOTAL:   R5980   │
├─────────────────────────────────────────┤
│  PAYMENT DETAILS:                       │
│  Bank Name                              │
│  Account Number                         │
│  Reference: INV-XXXXX                   │
├─────────────────────────────────────────┤
│  NOTES:                                 │
│  Payment due within 7 days              │
└─────────────────────────────────────────┘
```

#### Required PHP Libraries:
```bash
composer require tecnickcom/tcpdf
# OR
composer require setasign/fpdf
```

### 4. Email Automation

**Requirements**:
- Send invoice PDFs to tenants via email
- Support HTML email templates
- Include PDF as attachment
- Track email sent status
- Handle email sending errors

**Implementation**:

#### Backend (PHP)
Use PHPMailer library:

```php
public function sendInvoiceEmail($invoiceId, $tenantEmail) {
    $mail = new PHPMailer(true);

    // SMTP Configuration
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = env('SMTP_USERNAME');
    $mail->Password = env('SMTP_PASSWORD');
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    // Email content
    $mail->setFrom('noreply@company.com', 'Company Name');
    $mail->addAddress($tenantEmail);
    $mail->Subject = 'Invoice #' . $invoiceNumber;
    $mail->isHTML(true);
    $mail->Body = $this->getEmailTemplate($invoiceData);

    // Attach PDF
    $mail->addAttachment($pdfPath, 'invoice.pdf');

    $mail->send();
}
```

#### Email Template (HTML):
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #4F46E5; color: white; padding: 20px; }
        .content { padding: 20px; }
        .button { background: #4F46E5; color: white; padding: 10px 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Invoice from {Company Name}</h1>
    </div>
    <div class="content">
        <p>Dear {Tenant Name},</p>
        <p>Your invoice for {Month} is now available.</p>

        <p><strong>Invoice Number:</strong> {Invoice #}</p>
        <p><strong>Amount Due:</strong> R{Total}</p>
        <p><strong>Due Date:</strong> {Due Date}</p>

        <p>Please find your invoice attached as a PDF.</p>

        <a href="{Payment Link}" class="button">Pay Now</a>

        <p>Thank you for your business!</p>
    </div>
</body>
</html>
```

#### Required PHP Libraries:
```bash
composer require phpmailer/phpmailer
```

### 5. Automated Recurring Invoice Generation

**Requirements**:
- Run daily cron job to check for due invoices
- Generate new invoices based on frequency
- Create invoice records in database
- Generate PDF automatically
- Send email to tenant if auto-send is enabled
- Update next invoice date

**Implementation**:

#### Cron Job Script (`app/api/cron/generate-recurring-invoices.php`):

```php
<?php
// This script should run daily via cron
// Cron: 0 0 * * * php /path/to/generate-recurring-invoices.php

require_once '../config.php';
require_once '../InvoiceController.php';

$controller = new InvoiceController();

// Get all active recurring invoices due today
$recurringInvoices = $controller->getDueRecurringInvoices(date('Y-m-d'));

foreach ($recurringInvoices as $recurring) {
    // Calculate new invoice date based on frequency
    $newDate = calculateNextDate($recurring['last_generated'], $recurring['frequency']);

    // Create new invoice
    $invoiceData = [
        'company_id' => $recurring['company_id'],
        'tenant_id' => $recurring['tenant_id'],
        'invoice_number' => generateInvoiceNumber(),
        'invoice_date' => $newDate,
        'due_date' => calculateDueDate($newDate, $recurring['frequency']),
        'subtotal' => $recurring['subtotal'],
        'tax_amount' => $recurring['tax_amount'],
        'total_amount' => $recurring['total_amount'],
        'items' => json_decode($recurring['items']),
        'status' => 'sent'
    ];

    $invoiceId = $controller->createInvoice($invoiceData);

    // Generate PDF
    $pdfPath = $controller->generatePDF($invoiceId);

    // Send email if auto-send is enabled
    if ($recurring['auto_send']) {
        $tenant = $controller->getTenantById($recurring['tenant_id']);
        $controller->sendInvoiceEmail($invoiceId, $tenant['email'], $pdfPath);
    }

    // Update last_generated date
    $controller->updateRecurringInvoiceDate($recurring['id'], $newDate);

    // Log success
    error_log("Generated invoice #{$invoiceData['invoice_number']} for tenant {$recurring['tenant_id']}");
}
```

#### Crontab Entry:
```bash
# Run every day at midnight
0 0 * * * cd /path/to/rental-billing-dashboard && php app/api/cron/generate-recurring-invoices.php >> /var/log/recurring-invoices.log 2>&1
```

### 6. Database Schema Updates

Add columns to track invoice generation:

```sql
-- Add to invoices table
ALTER TABLE invoices ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN recurring_parent_id INT NULL;
ALTER TABLE invoices ADD COLUMN pdf_path VARCHAR(255) NULL;
ALTER TABLE invoices ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN email_sent_at DATETIME NULL;

-- Create recurring_invoices table
CREATE TABLE recurring_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    tenant_id INT NOT NULL,
    invoice_template_id INT NULL,
    frequency ENUM('weekly', 'monthly', 'quarterly', 'semi-annually', 'annually') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    last_generated_date DATE NULL,
    next_generation_date DATE NOT NULL,
    auto_send BOOLEAN DEFAULT TRUE,
    reminder_days INT DEFAULT 3,
    status ENUM('active', 'paused', 'completed') DEFAULT 'active',
    items JSON NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_enabled BOOLEAN DEFAULT FALSE,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    banking_details TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Create email_logs table
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('sent', 'failed', 'bounced') DEFAULT 'sent',
    error_message TEXT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
);
```

## Implementation Timeline

### Phase 1: PDF Generation (2-3 hours)
1. Install TCPDF library
2. Create PDF template
3. Add generatePDF method to InvoiceController
4. Test PDF generation
5. Add download button to invoice view

### Phase 2: Email Sending (1-2 hours)
1. Install PHPMailer
2. Configure SMTP settings
3. Create email template
4. Add sendInvoiceEmail method
5. Test email sending
6. Add "Send Invoice" button to UI

### Phase 3: Recurring Automation (2-3 hours)
1. Create recurring_invoices table
2. Update invoice creation to support recurring
3. Create cron job script
4. Set up crontab
5. Test automated generation
6. Add monitoring/logging

### Phase 4: Testing & Polish (1 hour)
1. End-to-end testing
2. Error handling
3. UI improvements
4. Documentation

**Total Estimated Time: 6-9 hours**

## Environment Variables Required

Add to `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=Your Company Name

# File Storage
INVOICE_STORAGE_PATH=/storage/invoices
LOGO_PATH=/public/logo.png
```

## Testing Checklist

- [ ] Create recurring invoice with all fields
- [ ] Verify banking details auto-populate
- [ ] Verify tenant dropdown filters by property
- [ ] Generate PDF manually
- [ ] Download PDF and verify format
- [ ] Send test email to tenant
- [ ] Verify email received with PDF attachment
- [ ] Run cron job manually
- [ ] Verify new invoice created
- [ ] Verify PDF generated automatically
- [ ] Verify email sent if auto-send enabled
- [ ] Check logs for errors
- [ ] Test different frequencies (weekly, monthly, etc.)
- [ ] Test end date functionality
- [ ] Test pausing/resuming recurring invoices

## Next Steps

Choose implementation approach:
1. **Full Implementation** - Complete all phases (6-9 hours)
2. **Phased Approach** - Start with Phase 1 (PDF), then Phase 2 (Email), then Phase 3 (Automation)
3. **MVP** - Basic PDF generation + manual email sending (2-3 hours)

Would you like me to proceed with any specific phase?
