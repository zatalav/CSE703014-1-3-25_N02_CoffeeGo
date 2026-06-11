-- Add image URL support for combo cards/forms.
ALTER TABLE Combo ADD COLUMN IF NOT EXISTS img_url VARCHAR(255);
