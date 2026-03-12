-- ===============================================
-- PROPERTY STORED PROCEDURES
-- Missing procedures for property management
-- ===============================================

USE thynkxv8r6h8_thynkxpro;

-- Drop existing property procedures if they exist
DROP PROCEDURE IF EXISTS GetPropertiesByCompany;
DROP PROCEDURE IF EXISTS GetPropertyById;
DROP PROCEDURE IF EXISTS CreateProperty;
DROP PROCEDURE IF EXISTS UpdateProperty;
DROP PROCEDURE IF EXISTS GetCompanyPropertySummary;

DELIMITER //

-- Get all properties for a company
CREATE PROCEDURE GetPropertiesByCompany(IN p_company_id INT)
BEGIN
    SELECT
        property_id,
        company_id,
        property_name,
        address,
        city,
        province,
        postal_code,
        total_units,
        description,
        created_at,
        updated_at
    FROM properties
    WHERE company_id = p_company_id
    ORDER BY property_name;
END //

-- Get a single property by ID
CREATE PROCEDURE GetPropertyById(IN p_property_id INT)
BEGIN
    SELECT
        property_id,
        company_id,
        property_name,
        address,
        city,
        province,
        postal_code,
        total_units,
        description,
        created_at,
        updated_at
    FROM properties
    WHERE property_id = p_property_id;
END //

-- Create a new property
CREATE PROCEDURE CreateProperty(
    IN p_company_id INT,
    IN p_property_name VARCHAR(255),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_province VARCHAR(100),
    IN p_postal_code VARCHAR(20),
    IN p_total_units INT,
    IN p_description TEXT
)
BEGIN
    INSERT INTO properties (
        company_id,
        property_name,
        address,
        city,
        province,
        postal_code,
        total_units,
        description
    )
    VALUES (
        p_company_id,
        p_property_name,
        p_address,
        p_city,
        p_province,
        p_postal_code,
        p_total_units,
        p_description
    );

    -- Return the newly created property
    SELECT LAST_INSERT_ID() as property_id;
END //

-- Update an existing property
CREATE PROCEDURE UpdateProperty(
    IN p_property_id INT,
    IN p_property_name VARCHAR(255),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_province VARCHAR(100),
    IN p_postal_code VARCHAR(20),
    IN p_total_units INT,
    IN p_description TEXT
)
BEGIN
    UPDATE properties
    SET property_name = COALESCE(p_property_name, property_name),
        address = COALESCE(p_address, address),
        city = COALESCE(p_city, city),
        province = COALESCE(p_province, province),
        postal_code = COALESCE(p_postal_code, postal_code),
        total_units = COALESCE(p_total_units, total_units),
        description = COALESCE(p_description, description),
        updated_at = CURRENT_TIMESTAMP
    WHERE property_id = p_property_id;
END //

-- Get property summary for a company (count and total units)
CREATE PROCEDURE GetCompanyPropertySummary(IN p_company_id INT)
BEGIN
    SELECT
        COUNT(*) as total_properties,
        COALESCE(SUM(total_units), 0) as total_units,
        COALESCE(SUM(CASE
            WHEN EXISTS (
                SELECT 1 FROM tenants t
                WHERE t.property_id = properties.property_id
                AND t.status = 'active'
            ) THEN 1
            ELSE 0
        END), 0) as occupied_properties
    FROM properties
    WHERE company_id = p_company_id;
END //

DELIMITER ;

SELECT 'Property procedures created successfully! ✓' as status;
