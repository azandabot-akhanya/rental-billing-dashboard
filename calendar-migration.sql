-- ===============================================
-- Calendar Enhancement Migration
-- Run this AFTER your main database setup
-- Adds new columns for enhanced calendar functionality
-- ===============================================

USE thynkxv8r6h8_thynkxpro;

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

-- Add new columns if table already exists but columns are missing
-- These will fail silently if columns already exist
ALTER TABLE tenant_calendar_events
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '' AFTER description;

ALTER TABLE tenant_calendar_events
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'meeting' AFTER location;

-- Update existing records to have default event_type if NULL
UPDATE tenant_calendar_events
SET event_type = 'meeting'
WHERE event_type IS NULL OR event_type = '';

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_event_type ON tenant_calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_start_datetime ON tenant_calendar_events(start_datetime);

-- Verify the structure
SELECT 'Calendar table structure:' as status;
DESCRIBE tenant_calendar_events;

-- Show sample data (if any exists)
SELECT 'Sample calendar events:' as status;
SELECT * FROM tenant_calendar_events LIMIT 5;

SELECT '✅ Calendar migration completed successfully!' as status;
