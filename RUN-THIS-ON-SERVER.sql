-- ===============================================
-- EMERGENCY MIGRATION - Run this on server NOW
-- This adds all missing tables/columns
-- ===============================================

USE thynkxv8r6h8_thynkxpro;

-- ===============================================
-- 1. Calendar Table Migration
-- ===============================================

-- Check if tenant_calendar_events table exists, if not create it
CREATE TABLE IF NOT EXISTS tenant_calendar_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    tenant_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) DEFAULT '',
    event_type VARCHAR(50) DEFAULT 'meeting',
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_company_id (company_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_start_datetime (start_datetime),
    INDEX idx_event_type (event_type),

    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- 2. Email Logs Table (for invoice emails)
-- ===============================================

CREATE TABLE IF NOT EXISTS email_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_invoice_id (invoice_id),
    INDEX idx_recipient (recipient_email),
    INDEX idx_status (status),

    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================
-- 3. Add any missing columns to existing tables
-- ===============================================

-- Add location and event_type to calendar if missing
SET @dbname = DATABASE();
SET @tablename = 'tenant_calendar_events';
SET @columnname = 'location';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255) DEFAULT '' AFTER description")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add event_type column
SET @columnname = 'event_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(50) DEFAULT 'meeting' AFTER location")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ===============================================
-- 4. Check if tenants exist
-- ===============================================

SELECT '=== Checking Database Status ===' as status;
SELECT COUNT(*) as total_companies FROM companies;
SELECT COUNT(*) as total_properties FROM properties;
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT COUNT(*) as total_invoices FROM invoices;

-- Show tenants for company 4
SELECT '=== Tenants for Company 4 ===' as status;
SELECT t.tenant_id, t.full_name, p.property_name
FROM tenants t
LEFT JOIN properties p ON t.property_id = p.property_id
WHERE t.company_id = 4
ORDER BY t.full_name;

SELECT '✅ Migration completed successfully!' as status;
SELECT 'If you see "Lindokuhle Mfekayi" and "Siyanda Zama" above, your data is intact!' as note;
