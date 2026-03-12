-- ==========================================
-- Email and Invoice Schema Updates
-- ==========================================

USE thynkxv8r6h8_thynkxpro;

-- Create email_logs table for tracking sent emails
DROP TABLE IF EXISTS email_logs;
CREATE TABLE email_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add columns to invoices table for PDF and email tracking
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500) DEFAULT NULL COMMENT 'Path to generated PDF file',
ADD COLUMN IF NOT EXISTS email_sent TINYINT(1) DEFAULT 0 COMMENT 'Whether email has been sent',
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When email was sent',
ADD COLUMN IF NOT EXISTS next_generation_date DATE NULL DEFAULT NULL COMMENT 'Next date to generate recurring invoice';

-- Add indexes for better performance
ALTER TABLE invoices
ADD INDEX IF NOT EXISTS idx_email_sent (email_sent),
ADD INDEX IF NOT EXISTS idx_next_generation_date (next_generation_date),
ADD INDEX IF NOT EXISTS idx_recurring_active (is_recurring, next_generation_date);

-- Create a view for recurring invoices that are due for generation
DROP VIEW IF EXISTS v_due_recurring_invoices;
CREATE VIEW v_due_recurring_invoices AS
SELECT
    i.invoice_id,
    i.company_id,
    i.invoice_number,
    i.tenant_id,
    i.unit_id,
    i.subtotal,
    i.tax_amount,
    i.total_amount,
    i.notes,
    i.include_banking_details,
    i.items_json,
    i.recurrence_frequency,
    i.recurrence_start_date,
    i.recurrence_end_date,
    i.next_generation_date,
    i.reminder_days_before,
    c.company_name,
    t.full_name as tenant_name,
    t.email as tenant_email,
    p.property_name
FROM invoices i
JOIN companies c ON i.company_id = c.company_id
JOIN tenants t ON i.tenant_id = t.tenant_id
LEFT JOIN units u ON i.unit_id = u.unit_id
LEFT JOIN properties p ON u.property_id = p.property_id
WHERE i.is_recurring = 1
    AND i.next_generation_date <= CURDATE()
    AND (i.recurrence_end_date IS NULL OR i.recurrence_end_date >= CURDATE())
ORDER BY i.next_generation_date ASC;

-- Create stored procedure to update next generation date
DROP PROCEDURE IF EXISTS sp_update_next_generation_date;

DELIMITER //

CREATE PROCEDURE sp_update_next_generation_date(
    IN p_invoice_id INT,
    IN p_frequency VARCHAR(20)
)
BEGIN
    DECLARE v_next_date DATE;
    DECLARE v_current_date DATE;

    -- Get current next_generation_date or use today
    SELECT COALESCE(next_generation_date, CURDATE()) INTO v_current_date
    FROM invoices
    WHERE invoice_id = p_invoice_id;

    -- Calculate next generation date based on frequency
    CASE p_frequency
        WHEN 'daily' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 1 DAY);
        WHEN 'weekly' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 1 WEEK);
        WHEN 'bi-weekly' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 2 WEEK);
        WHEN 'monthly' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 1 MONTH);
        WHEN 'quarterly' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 3 MONTH);
        WHEN 'yearly' THEN
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 1 YEAR);
        ELSE
            SET v_next_date = DATE_ADD(v_current_date, INTERVAL 1 MONTH); -- Default to monthly
    END CASE;

    -- Update the invoice
    UPDATE invoices
    SET next_generation_date = v_next_date
    WHERE invoice_id = p_invoice_id;

    SELECT v_next_date as next_generation_date;
END //

DELIMITER ;

-- Create stored procedure to generate recurring invoice instance
DROP PROCEDURE IF EXISTS sp_generate_recurring_invoice_instance;

DELIMITER //

CREATE PROCEDURE sp_generate_recurring_invoice_instance(
    IN p_parent_invoice_id INT,
    OUT p_new_invoice_id INT
)
BEGIN
    DECLARE v_company_id INT;
    DECLARE v_tenant_id INT;
    DECLARE v_unit_id INT;
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_notes TEXT;
    DECLARE v_banking_details TEXT;
    DECLARE v_items_json TEXT;
    DECLARE v_frequency VARCHAR(20);
    DECLARE v_invoice_number VARCHAR(50);
    DECLARE v_invoice_date DATE;
    DECLARE v_due_date DATE;
    DECLARE v_next_number INT;

    -- Get parent invoice details
    SELECT
        company_id,
        tenant_id,
        unit_id,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        include_banking_details,
        items_json,
        recurrence_frequency
    INTO
        v_company_id,
        v_tenant_id,
        v_unit_id,
        v_subtotal,
        v_tax_amount,
        v_total_amount,
        v_notes,
        v_banking_details,
        v_items_json,
        v_frequency
    FROM invoices
    WHERE invoice_id = p_parent_invoice_id;

    -- Generate new invoice number
    SELECT MAX(CAST(SUBSTRING(invoice_number, 5) AS UNSIGNED)) INTO v_next_number
    FROM invoices
    WHERE company_id = v_company_id AND invoice_number LIKE 'INV-%';

    SET v_next_number = COALESCE(v_next_number, 0) + 1;
    SET v_invoice_number = CONCAT('INV-', LPAD(v_next_number, 4, '0'));

    -- Set dates
    SET v_invoice_date = CURDATE();
    SET v_due_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY); -- 30 days payment term

    -- Create new invoice instance
    INSERT INTO invoices (
        company_id,
        invoice_number,
        tenant_id,
        unit_id,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        notes,
        include_banking_details,
        items_json,
        is_recurring,
        parent_invoice_id
    ) VALUES (
        v_company_id,
        v_invoice_number,
        v_tenant_id,
        v_unit_id,
        v_invoice_date,
        v_due_date,
        v_subtotal,
        v_tax_amount,
        v_total_amount,
        0,
        v_total_amount,
        'pending',
        v_notes,
        v_banking_details,
        v_items_json,
        0, -- Generated instances are not recurring themselves
        p_parent_invoice_id
    );

    SET p_new_invoice_id = LAST_INSERT_ID();

    -- Insert invoice items from JSON
    IF v_items_json IS NOT NULL AND v_items_json != '' THEN
        INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
        SELECT
            p_new_invoice_id,
            JSON_UNQUOTE(JSON_EXTRACT(item, '$.description')),
            JSON_UNQUOTE(JSON_EXTRACT(item, '$.quantity')),
            JSON_UNQUOTE(JSON_EXTRACT(item, '$.rate')),
            JSON_UNQUOTE(JSON_EXTRACT(item, '$.amount'))
        FROM JSON_TABLE(
            v_items_json,
            '$[*]' COLUMNS(
                item JSON PATH '$'
            )
        ) AS items;
    END IF;

    -- Update parent invoice's next generation date
    CALL sp_update_next_generation_date(p_parent_invoice_id, v_frequency);

    SELECT p_new_invoice_id as new_invoice_id, v_invoice_number as invoice_number;
END //

DELIMITER ;

-- Add parent_invoice_id column to track recurring invoice instances
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS parent_invoice_id INT NULL DEFAULT NULL COMMENT 'Parent recurring invoice ID',
ADD INDEX IF NOT EXISTS idx_parent_invoice (parent_invoice_id);

-- Initialize next_generation_date for existing recurring invoices
UPDATE invoices
SET next_generation_date = DATE_ADD(recurrence_start_date, INTERVAL 1 MONTH)
WHERE is_recurring = 1
    AND next_generation_date IS NULL
    AND recurrence_start_date IS NOT NULL;

-- Grant necessary permissions (if needed)
-- GRANT EXECUTE ON PROCEDURE sp_update_next_generation_date TO 'thynkxv8r6h8_admin'@'%';
-- GRANT EXECUTE ON PROCEDURE sp_generate_recurring_invoice_instance TO 'thynkxv8r6h8_admin'@'%';

SELECT 'Email and invoice schema updates completed successfully!' as message;
