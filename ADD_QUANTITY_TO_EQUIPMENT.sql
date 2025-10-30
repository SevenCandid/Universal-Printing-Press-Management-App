-- ✅ Add quantity column to equipment_inventory table

-- Add quantity column (default to 0)
ALTER TABLE equipment_inventory
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Update existing records to have a default quantity of 1
UPDATE equipment_inventory
SET quantity = 1
WHERE quantity IS NULL OR quantity = 0;

-- Add a check constraint to ensure quantity is not negative
ALTER TABLE equipment_inventory
ADD CONSTRAINT equipment_quantity_check CHECK (quantity >= 0);

-- Add a comment to the column
COMMENT ON COLUMN equipment_inventory.quantity IS 'Number of units available for this equipment';



