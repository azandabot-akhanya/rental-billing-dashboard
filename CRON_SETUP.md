# Recurring Invoice Cron Job Setup

## Overview
This document provides instructions for setting up the automated recurring invoice generation system.

## What the Cron Job Does
The cron job (`app/api/cron/generate-recurring-invoices.php`) runs daily and:
1. Checks for recurring invoices due for generation
2. Creates new invoice instances based on recurrence frequency
3. Generates PDF documents for each invoice
4. Sends email notifications to tenants with PDF attachments
5. Updates the next generation date for recurring invoices
6. Logs all operations for monitoring

## Prerequisites
- PHP CLI installed on the server
- Database connection working from command line
- SMTP credentials configured in `app/api/EmailConfig.php`
- Write permissions to `storage/invoices/` directory

## Setup Instructions

### 1. Test the Script Manually
Before setting up the cron job, test the script manually:

```bash
cd /path/to/rental-billing-dashboard
php app/api/cron/generate-recurring-invoices.php
```

You should see output like:
```
[2025-11-18 14:00:00] [INFO] === Starting Recurring Invoice Generation ===
[2025-11-18 14:00:00] [INFO] Found 2 recurring invoice(s) due for generation
[2025-11-18 14:00:00] [INFO] Processing recurring invoice: INV-0001 for tenant: John Doe
[2025-11-18 14:00:01] [INFO]   ✓ Created new invoice instance (ID: 123)
[2025-11-18 14:00:02] [INFO]   ✓ PDF generated: /path/to/storage/invoices/invoice-INV-0002.pdf
[2025-11-18 14:00:03] [INFO]   ✓ Email sent successfully
[2025-11-18 14:00:03] [INFO] === Generation Complete ===
[2025-11-18 14:00:03] [INFO] Total processed: 2
[2025-11-18 14:00:03] [INFO] Successful: 2
[2025-11-18 14:00:03] [INFO] Emails sent: 2
```

### 2. Create Log Directory
Create a directory for log files:

```bash
mkdir -p /path/to/rental-billing-dashboard/storage/logs
chmod 755 /path/to/rental-billing-dashboard/storage/logs
```

### 3. Add to Crontab
Edit your crontab:

```bash
crontab -e
```

Add the following line to run daily at 6:00 AM:

```
0 6 * * * /usr/bin/php /path/to/rental-billing-dashboard/app/api/cron/generate-recurring-invoices.php >> /path/to/rental-billing-dashboard/storage/logs/recurring-invoices.log 2>&1
```

**Alternative schedules:**
- Run every day at midnight: `0 0 * * *`
- Run twice daily (6am and 6pm): `0 6,18 * * *`
- Run every hour: `0 * * * *`
- Run every Monday at 9am: `0 9 * * 1`

### 4. Verify Cron Job
Check that your cron job is registered:

```bash
crontab -l
```

### 5. Monitor Logs
View the log file to monitor execution:

```bash
tail -f /path/to/rental-billing-dashboard/storage/logs/recurring-invoices.log
```

## Configuration Options

### Email Settings
Edit `app/api/EmailConfig.php` to configure email settings:
```php
const SMTP_HOST = 'mail.thynkxpro-dpl.co.za';
const SMTP_PORT = 26;
const SMTP_USERNAME = 'donotreply@thynkxpro-dpl.co.za';
const SMTP_PASSWORD = 'donotreply@thynkxpro-dpl.co.za';
```

### Recurrence Frequencies
The system supports the following frequencies:
- `daily` - Generate invoice every day
- `weekly` - Generate invoice every week
- `bi-weekly` - Generate invoice every 2 weeks
- `monthly` - Generate invoice every month (most common)
- `quarterly` - Generate invoice every 3 months
- `yearly` - Generate invoice every year

### Payment Terms
Default payment terms are 30 days from invoice date. To change this, edit the cron script:
```php
SET v_due_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY);
```

## Database Schema

### Tables Created
1. **email_logs** - Tracks all sent emails
2. **v_due_recurring_invoices** - View for invoices due for generation

### Columns Added to `invoices` table
- `pdf_path` - Path to generated PDF file
- `email_sent` - Whether email has been sent (0/1)
- `email_sent_at` - Timestamp when email was sent
- `next_generation_date` - Next date to generate recurring invoice
- `parent_invoice_id` - Links generated instances to parent recurring invoice

### Stored Procedures
1. **sp_update_next_generation_date** - Updates next generation date based on frequency
2. **sp_generate_recurring_invoice_instance** - Creates new invoice from recurring template

## API Endpoints

### Generate PDF for Invoice
```
GET /invoices/{id}/pdf
```
Response:
```json
{
  "success": true,
  "message": "PDF generated successfully",
  "pdf_path": "/path/to/storage/invoices/invoice-INV-0001.pdf",
  "pdf_url": "/storage/invoices/invoice-INV-0001.pdf",
  "format": "pdf"
}
```

### Send Invoice Email
```
GET /invoices/{id}/send
```
Response:
```json
{
  "success": true,
  "message": "Invoice email sent successfully",
  "recipient": "tenant@example.com"
}
```

## Troubleshooting

### Cron Job Not Running
1. Check crontab is registered: `crontab -l`
2. Check cron service is running: `systemctl status cron` (Linux) or `service cron status`
3. Verify PHP path: `which php`
4. Check file permissions: `ls -la app/api/cron/generate-recurring-invoices.php`

### Emails Not Sending
1. Check SMTP credentials in `app/api/EmailConfig.php`
2. Test SMTP connection manually
3. Check email logs: `SELECT * FROM email_logs WHERE status = 'failed'`
4. Verify tenant has valid email address
5. Check server firewall allows outbound SMTP (port 26)

### PDFs Not Generating
1. Check storage directory permissions: `chmod 755 storage/invoices/`
2. Check wkhtmltopdf installation: `which wkhtmltopdf`
3. If wkhtmltopdf not available, system will fallback to HTML
4. Check disk space: `df -h`

### Database Errors
1. Test database connection: `mysql -h 197.242.150.197 -u thynkxv8r6h8_admin -p --skip-ssl`
2. Verify stored procedures exist: `SHOW PROCEDURE STATUS WHERE Db = 'thynkxv8r6h8_thynkxpro'`
3. Check user permissions: `SHOW GRANTS FOR 'thynkxv8r6h8_admin'@'%'`

### View Email Logs
```sql
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
```

### View Recurring Invoices Due
```sql
SELECT * FROM v_due_recurring_invoices;
```

### Manually Trigger Generation for Specific Invoice
```sql
CALL sp_generate_recurring_invoice_instance(1, @new_id);
SELECT @new_id;
```

## Production Deployment Checklist

- [ ] Database schema updated (run `email-invoice-schema.sql`)
- [ ] Storage directories created with correct permissions
- [ ] SMTP credentials configured and tested
- [ ] Cron script tested manually
- [ ] Cron job added to crontab
- [ ] Log rotation configured (logrotate)
- [ ] Monitoring/alerting set up for failed emails
- [ ] Test recurring invoice created and verified
- [ ] Documentation shared with team
- [ ] Backup strategy includes new tables

## Support
For issues or questions, check:
1. Log files in `storage/logs/recurring-invoices.log`
2. Email logs in database: `SELECT * FROM email_logs`
3. Invoice generation history: `SELECT * FROM invoices WHERE parent_invoice_id IS NOT NULL`
