-- Add image URL support for combo cards/forms.
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Combo'
    AND COLUMN_NAME = 'img_url'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE Combo ADD COLUMN img_url VARCHAR(255) NULL AFTER category',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
