# Email and PDF Invoice System - Implementation Summary

## Overview
Complete implementation of automated PDF generation and email sending for invoices, with support for recurring invoice automation.

## 🎯 Features Implemented

### 1. PDF Invoice Generation
- Professional invoice PDF generation using wkhtmltopdf (with HTML fallback)
- Automatic storage in `storage/invoices/` directory
- Branded invoices with company logo and details
- Itemized billing with tax calculations
- Banking details integration
- Print-friendly formatting

### 2. Email System
- SMTP email sending with PHP's native mail() function
- Professional HTML email templates
- PDF invoice attachments
- Automatic email logging to database
- Failed email tracking and retry capability

### 3. Recurring Invoice Automation
- Automatic invoice generation based on frequency (daily, weekly, monthly, etc.)
- PDF generation for new invoices
- Automatic email sending to tenants
- Smart scheduling with next generation date tracking
- Parent-child invoice relationship tracking

### 4. API Endpoints
- `GET /invoices/{id}/pdf` - Generate PDF for specific invoice
- `GET /invoices/{id}/send` - Send invoice email to tenant
- Both endpoints integrate with existing invoice controller

## 📁 Files Created

### Core System Files
```
app/api/
├── EmailConfig.php              # SMTP configuration
├── EmailService.php             # Email sending service
├── PDFInvoiceGenerator.php      # PDF generation service
├── email-templates/
│   └── invoice.html            # Professional email template
├── cron/
│   └── generate-recurring-invoices.php  # Daily cron job
└── test-email.php              # Email testing utility

storage/
├── invoices/                    # Generated PDF storage
└── logs/                        # Cron job logs

Root directory:
├── email-invoice-schema.sql    # Database schema updates
├── CRON_SETUP.md              # Cron job setup guide
└── EMAIL_PDF_IMPLEMENTATION.md # This file
```

### Modified Files
```
app/api/InvoiceController.php   # Added PDF/email methods and routing
```

## 🗄️ Database Changes

### New Tables
1. **email_logs** - Tracks all sent emails
   - `log_id` (PK)
   - `invoice_id` (FK to invoices)
   - `recipient_email`
   - `subject`
   - `status` (sent/failed/pending)
   - `error_message`
   - `sent_at`

### New Columns in `invoices`
- `pdf_path` - Path to generated PDF
- `email_sent` - Email sent flag (0/1)
- `email_sent_at` - Email sent timestamp
- `next_generation_date` - Next recurring generation date
- `parent_invoice_id` - Links to parent recurring invoice

### New Stored Procedures
1. **sp_update_next_generation_date** - Updates next generation date
2. **sp_generate_recurring_invoice_instance** - Generates new invoice from template

### New View
- **v_due_recurring_invoices** - Lists all recurring invoices due for generation

## 🔧 Configuration

### SMTP Settings (EmailConfig.php)
```php
SMTP_HOST: mail.thynkxpro-dpl.co.za
SMTP_PORT: 26
SMTP_USERNAME: donotreply@thynkxpro-dpl.co.za
SMTP_PASSWORD: donotreply@thynkxpro-dpl.co.za
SMTP_FROM_EMAIL: donotreply@thynkxpro-dpl.co.za
SMTP_FROM_NAME: ThynkXPro DPL
SMTP_USE_SSL: false (Port 26 doesn't use SSL)
```

### Storage Paths
```php
INVOICE_STORAGE_PATH: app/api/../../storage/invoices/
TEMPLATES_PATH: app/api/email-templates/
LOGO_PATH: app/api/../../public/logo.png
```

## 🚀 Usage

### Generate PDF for Invoice
```bash
# Via API
curl http://localhost:8000/invoices/123/pdf

# Response
{
  "success": true,
  "message": "PDF generated successfully",
  "pdf_path": "/path/to/storage/invoices/invoice-INV-0001.pdf",
  "pdf_url": "/storage/invoices/invoice-INV-0001.pdf",
  "format": "pdf"
}
```

### Send Invoice Email
```bash
# Via API
curl http://localhost:8000/invoices/123/send

# Response
{
  "success": true,
  "message": "Invoice email sent successfully",
  "recipient": "tenant@example.com"
}
```

### Frontend Integration (Next.js)
```typescript
// Generate PDF
const generatePDF = async (invoiceId: number) => {
  const response = await fetch(getApiUrl(`invoices/${invoiceId}/pdf`))
  const data = await response.json()

  if (data.success) {
    // Download or display PDF
    window.open(data.pdf_url, '_blank')
  }
}

// Send Email
const sendInvoiceEmail = async (invoiceId: number) => {
  const response = await fetch(getApiUrl(`invoices/${invoiceId}/send`))
  const data = await response.json()

  if (data.success) {
    toast.success(`Email sent to ${data.recipient}`)
  }
}
```

## 🧪 Testing

### Test Email System
```bash
# Run test script with your email
cd app/api
php test-email.php your-email@example.com

# Expected output:
# ========================================
# Email Configuration Test
# ========================================
#
# SMTP Configuration:
#   Host: mail.thynkxpro-dpl.co.za
#   Port: 26
#   ...
#
# Sending test email...
# ✓ SUCCESS: Email sent successfully!
```

### Test Cron Job Manually
```bash
# Run recurring invoice generation
php app/api/cron/generate-recurring-invoices.php

# View output:
# [2025-11-18 14:00:00] [INFO] === Starting Recurring Invoice Generation ===
# [2025-11-18 14:00:00] [INFO] Found 2 recurring invoice(s) due for generation
# [2025-11-18 14:00:01] [INFO]   ✓ Created new invoice instance (ID: 123)
# [2025-11-18 14:00:02] [INFO]   ✓ PDF generated
# [2025-11-18 14:00:03] [INFO]   ✓ Email sent successfully
# [2025-11-18 14:00:03] [INFO] === Generation Complete ===
```

### Test PDF Generation
```bash
# Test via API (requires running PHP server)
curl -s "http://localhost:8000/invoices/1/pdf" | jq

# Or test directly via browser
# http://localhost:8000/invoices/1/pdf
```

## 📋 Setup Checklist

### Initial Setup
- [x] Create database tables (run `email-invoice-schema.sql`)
- [x] Configure SMTP settings in `EmailConfig.php`
- [x] Create storage directories with permissions
- [x] Test email sending with `test-email.php`
- [ ] Set up cron job on production server
- [ ] Configure log rotation for cron logs
- [ ] Test complete workflow end-to-end

### Production Deployment
- [ ] Update SMTP credentials for production
- [ ] Set correct file paths in EmailConfig.php
- [ ] Ensure storage directories are writable
- [ ] Add cron job to server crontab
- [ ] Set up monitoring for failed emails
- [ ] Test with real tenant email addresses
- [ ] Configure backup for storage/invoices
- [ ] Set up alerts for cron job failures

## 🔍 Monitoring

### Check Email Logs
```sql
-- View recent emails
SELECT
    el.log_id,
    i.invoice_number,
    el.recipient_email,
    el.status,
    el.sent_at,
    el.error_message
FROM email_logs el
JOIN invoices i ON el.invoice_id = i.invoice_id
ORDER BY el.sent_at DESC
LIMIT 50;

-- Count emails by status
SELECT status, COUNT(*) as count
FROM email_logs
GROUP BY status;

-- Find failed emails
SELECT * FROM email_logs
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

### Check Recurring Invoice Status
```sql
-- View all recurring invoices
SELECT
    invoice_id,
    invoice_number,
    recurrence_frequency,
    next_generation_date,
    DATEDIFF(next_generation_date, CURDATE()) as days_until_next
FROM invoices
WHERE is_recurring = 1
ORDER BY next_generation_date;

-- View generated instances
SELECT
    i.invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.status,
    i.email_sent,
    parent.invoice_number as parent_invoice
FROM invoices i
LEFT JOIN invoices parent ON i.parent_invoice_id = parent.invoice_id
WHERE i.parent_invoice_id IS NOT NULL
ORDER BY i.invoice_date DESC;

-- Check due recurring invoices
SELECT * FROM v_due_recurring_invoices;
```

### Monitor Cron Job
```bash
# View recent cron job logs
tail -n 100 storage/logs/recurring-invoices.log

# Follow logs in real-time
tail -f storage/logs/recurring-invoices.log

# Search for errors
grep -i "error\|failed" storage/logs/recurring-invoices.log

# Count successful generations
grep -c "✓ Completed processing" storage/logs/recurring-invoices.log
```

## 🐛 Troubleshooting

### Email Not Sending
**Problem:** Emails fail to send with SMTP error

**Solutions:**
1. Verify SMTP credentials in EmailConfig.php
2. Test SMTP connection: `telnet mail.thynkxpro-dpl.co.za 26`
3. Check firewall allows port 26 outbound
4. Verify email server is accepting connections
5. Check error logs in `email_logs` table
6. Try sending test email: `php test-email.php your@email.com`

### PDF Not Generating
**Problem:** PDF generation fails or produces empty file

**Solutions:**
1. Check wkhtmltopdf installation: `which wkhtmltopdf`
2. Verify storage directory permissions: `ls -la storage/invoices/`
3. Check disk space: `df -h`
4. Review invoice data completeness in database
5. Test HTML generation (fallback should still work)
6. Check error logs in PHP error log

### Cron Job Not Running
**Problem:** Recurring invoices not being generated automatically

**Solutions:**
1. Verify cron job is registered: `crontab -l`
2. Check cron service status: `systemctl status cron`
3. Test script manually: `php app/api/cron/generate-recurring-invoices.php`
4. Check script permissions: `ls -la app/api/cron/`
5. Review cron logs: `tail storage/logs/recurring-invoices.log`
6. Check system mail for cron errors: `mail` or `tail /var/mail/$USER`

### Missing Invoice Data
**Problem:** Invoices missing tenant or property information

**Solutions:**
1. Verify tenant has property assigned
2. Check unit_id is set on invoice
3. Review LEFT JOIN in getCompleteInvoiceData()
4. Test query directly in MySQL
5. Check tenant email address is set

## 📊 Performance Considerations

### Optimization Tips
1. **Batch Email Sending:** For large tenant lists, implement rate limiting
2. **PDF Caching:** Store generated PDFs and reuse if invoice unchanged
3. **Async Processing:** Consider queue system for email sending
4. **Database Indexing:** Indexes already added for common queries
5. **Log Cleanup:** Implement log rotation and archival

### Scaling Recommendations
- Use dedicated email service (SendGrid, Mailgun) for high volume
- Implement Redis queue for email jobs
- Add retry logic for failed emails
- Monitor email bounce rates and update tenant records
- Consider CDN for PDF storage if serving publicly

## 🔐 Security Notes

1. **Email Credentials:** Stored in EmailConfig.php - keep secure
2. **PDF Access:** Implement authentication for invoice URLs
3. **Storage Directory:** Not directly web-accessible (above public/)
4. **SQL Injection:** Using prepared statements throughout
5. **Email Headers:** Properly sanitized to prevent header injection

## 📈 Future Enhancements

### Possible Improvements
- [ ] Add email templates for payment confirmations
- [ ] Implement email open tracking
- [ ] Add invoice preview before sending
- [ ] Support for multiple email recipients (CC, BCC)
- [ ] Custom email templates per company
- [ ] SMS notifications integration
- [ ] Payment gateway integration
- [ ] Invoice reminder emails (before due date)
- [ ] Overdue invoice notifications
- [ ] Batch invoice sending interface

## 📞 Support

### Resources
- [Cron Setup Guide](./CRON_SETUP.md)
- [Database Schema](./email-invoice-schema.sql)
- [Email Config](./app/api/EmailConfig.php)

### Testing Commands
```bash
# Test email
php app/api/test-email.php your-email@example.com

# Test cron job
php app/api/cron/generate-recurring-invoices.php

# Test PDF generation (via browser)
http://localhost:8000/invoices/1/pdf

# Test email sending (via browser)
http://localhost:8000/invoices/1/send
```

## ✅ Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Email Configuration | ✅ Complete | SMTP settings configured |
| Email Service | ✅ Complete | PHP mail() with attachments |
| PDF Generator | ✅ Complete | wkhtmltopdf with HTML fallback |
| Email Templates | ✅ Complete | Professional HTML design |
| Database Schema | ✅ Complete | Tables and procedures created |
| Invoice Controller Integration | ✅ Complete | API endpoints added |
| Cron Job Script | ✅ Complete | Daily generation script |
| Documentation | ✅ Complete | Setup guides created |
| Testing Utilities | ✅ Complete | Test scripts available |
| Production Deployment | ⏳ Pending | Requires server setup |

---

**Last Updated:** 2025-11-18
**Implementation Complete:** Core system ready for deployment
**Next Step:** Deploy to production server and configure cron job
